import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// REMOTE GAME - SERVER-SIDE GAME INFRASTRUCTURE DEMONSTRATION
// ============================================================================
// This game demonstrates the remote game architecture:
// - All game logic runs on the server
// - Client only renders draw commands and sends input
// - Physics formulas are PROTECTED and never sent to client
// - State is managed server-side with save/restore capabilities
//
// Topic: Pendulum Physics (T = 2pi*sqrt(L/g))
// ============================================================================

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion {
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number; // PROTECTED: Never sent to client
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  tagline: string;
  description: string;
  connection: string;
}

// Physics constants (PROTECTED - never sent to client)
const GRAVITY = 9.81; // m/s^2
const PI = Math.PI;

export class RemoteGame extends BaseGame {
  readonly gameType = 'remote_game';
  readonly gameTitle = 'Remote Game: Pendulum Physics';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private pendulumLength = 1; // meters
  private pendulumAngle = 0.5; // radians (initial)
  private animationTime = 0;

  // Play phase state
  private isSwinging = false;
  private swingStartTime = 0;
  private currentAngle = 0;
  private measuredPeriod = 0;
  private swingCount = 0;

  // Twist phase (gravity comparison)
  private selectedGravity = 'earth'; // 'earth', 'moon', 'mars'

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "A pendulum has length L = 1 meter on Earth (g = 9.8 m/s^2).",
      question: "What is its period approximately?",
      options: ["0.5 seconds", "1 second", "2 seconds", "4 seconds"],
      correctIndex: 2,
      explanation: "T = 2*pi*sqrt(L/g) = 2*pi*sqrt(1/9.8) = 2*pi*0.32 ≈ 2 seconds"
    },
    {
      scenario: "A grandfather clock pendulum has period T = 2 seconds.",
      question: "If you double the pendulum length, what happens to the period?",
      options: ["It doubles", "It increases by sqrt(2)", "It halves", "It stays the same"],
      correctIndex: 1,
      explanation: "T is proportional to sqrt(L). Double L means T multiplied by sqrt(2) = 1.414"
    },
    {
      scenario: "A pendulum swings with small amplitude on Earth.",
      question: "If you take it to the Moon (g = 1.6 m/s^2), how does the period change?",
      options: ["Decreases", "Increases by about 2.5x", "Stays the same", "Increases slightly"],
      correctIndex: 1,
      explanation: "T is proportional to 1/sqrt(g). Lower g means longer period. sqrt(9.8/1.6) ≈ 2.5"
    },
    {
      scenario: "A child swings higher on a playground swing.",
      question: "Does increasing the swing amplitude significantly change the period?",
      options: ["Yes, period increases", "Yes, period decreases", "No, for small angles", "Only affects speed"],
      correctIndex: 2,
      explanation: "For small angles (<15°), amplitude doesn't significantly affect period. This is simple harmonic motion."
    },
    {
      scenario: "A scientist measures a pendulum's period to calculate local gravity.",
      question: "Which formula would they use?",
      options: ["g = 4*pi^2*L/T^2", "g = 2*pi*L/T", "g = L*T^2", "g = L/T"],
      correctIndex: 0,
      explanation: "From T = 2*pi*sqrt(L/g), solving for g: g = 4*pi^2*L/T^2"
    },
    {
      scenario: "A pendulum clock runs slow (loses time).",
      question: "How should the pendulum be adjusted?",
      options: ["Make it longer", "Make it shorter", "Add more mass", "Reduce the swing amplitude"],
      correctIndex: 1,
      explanation: "Running slow means period is too long. T is proportional to sqrt(L), so shorten the pendulum."
    },
    {
      scenario: "Two pendulums: one with 10kg mass, one with 1kg mass, same length.",
      question: "How do their periods compare?",
      options: ["Heavier is slower", "Lighter is slower", "They have the same period", "Cannot determine"],
      correctIndex: 2,
      explanation: "Period T = 2*pi*sqrt(L/g) does not depend on mass! Both have the same period."
    },
    {
      scenario: "An engineer designs a metronome for musicians.",
      question: "What determines the beat frequency?",
      options: ["Weight of the pendulum", "Length/position of the weight", "Material of the pendulum", "Color of the metronome"],
      correctIndex: 1,
      explanation: "The effective length determines period. Moving the weight up/down changes the beat rate."
    },
    {
      scenario: "A Foucault pendulum demonstrates Earth's rotation.",
      question: "Why are these pendulums typically very long (60+ meters)?",
      options: ["To swing faster", "Longer period shows rotation more clearly", "For visual effect only", "They need more mass"],
      correctIndex: 1,
      explanation: "Longer pendulums have longer periods, allowing the rotation effect to be observed more clearly."
    },
    {
      scenario: "You want a pendulum with exactly 1 second period.",
      question: "What length should it be? (g = 9.8 m/s^2)",
      options: ["0.25 meters", "0.5 meters", "1 meter", "2 meters"],
      correctIndex: 0,
      explanation: "T = 2*pi*sqrt(L/g). 1 = 2*pi*sqrt(L/9.8). L = (1/(2*pi))^2 * 9.8 ≈ 0.25 m"
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🕰️",
      title: "Grandfather Clocks",
      tagline: "Precision timekeeping since the 1600s",
      description: "Pendulum clocks use the consistent period of a swinging pendulum to keep accurate time.",
      connection: "The 2-second period of a 1-meter pendulum was the basis for the original definition of the second."
    },
    {
      icon: "🌍",
      title: "Foucault Pendulum",
      tagline: "Proving Earth's rotation",
      description: "A freely swinging pendulum appears to slowly rotate, but it's actually the Earth rotating beneath it.",
      connection: "Long pendulums with periods of 15+ seconds make the rotation visible over hours of observation."
    },
    {
      icon: "🎼",
      title: "Metronomes",
      tagline: "Musical timing devices",
      description: "Musicians use adjustable pendulums to practice at consistent tempos from 40 to 208 beats per minute.",
      connection: "Moving the weight up the pendulum shortens effective length, increasing beat frequency."
    },
    {
      icon: "🔬",
      title: "Measuring Gravity",
      tagline: "Scientific instrumentation",
      description: "Precise pendulum measurements can determine local gravitational acceleration and find underground structures.",
      connection: "From T = 2*pi*sqrt(L/g), measuring T and L precisely gives g to many decimal places."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate pendulum period using T = 2*pi*sqrt(L/g)
  private calculatePeriod(length: number, gravity: number = GRAVITY): number {
    return 2 * PI * Math.sqrt(length / gravity);
  }

  // PROTECTED: Get gravity for different locations
  private getGravity(location: string): number {
    switch (location) {
      case 'moon': return 1.62;
      case 'mars': return 3.72;
      case 'earth':
      default: return 9.81;
    }
  }

  // PROTECTED: Calculate pendulum angle at time t
  private getPendulumAngle(time: number, length: number, initialAngle: number, gravity: number = GRAVITY): number {
    const period = this.calculatePeriod(length, gravity);
    const omega = (2 * PI) / period;
    return initialAngle * Math.cos(omega * time);
  }

  // PROTECTED: Check test answer
  private checkAnswer(questionIndex: number, answerIndex: number): boolean {
    return this.testQuestions[questionIndex].correctIndex === answerIndex;
  }

  // Calculate test score
  private calculateScore(): number {
    return this.testAnswers.reduce((score, answer, index) => {
      return score + (this.checkAnswer(index, answer) ? 1 : 0);
    }, 0);
  }

  getCurrentPhase(): string {
    return this.phase;
  }

  handleInput(input: UserInput): void {
    if (input.type === 'button_click') {
      this.handleButtonClick(input.id);
    } else if (input.type === 'slider_change') {
      if (input.id === 'pendulum_length') {
        this.pendulumLength = Math.max(0.2, Math.min(3, input.value));
        this.resetSwing();
      } else if (input.id === 'initial_angle') {
        this.pendulumAngle = Math.max(0.1, Math.min(0.8, input.value));
        this.resetSwing();
      }
    }
  }

  private handleButtonClick(buttonId: string): void {
    switch (this.phase) {
      case 'hook':
        if (buttonId === 'discover') {
          this.phase = 'predict';
        }
        break;

      case 'predict':
        if (!this.showPredictionFeedback) {
          if (buttonId.startsWith('option_')) {
            this.prediction = buttonId.split('_')[1];
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
          this.resetSwing();
        }
        break;

      case 'play':
        if (buttonId === 'start_swing' && !this.isSwinging) {
          this.startSwing();
        } else if (buttonId === 'reset') {
          this.resetSwing();
        } else if (buttonId === 'continue' && this.swingCount >= 3) {
          this.phase = 'review';
        }
        break;

      case 'review':
        if (buttonId === 'continue') {
          this.phase = 'twist_predict';
        }
        break;

      case 'twist_predict':
        if (!this.showTwistFeedback) {
          if (buttonId.startsWith('option_')) {
            this.twistPrediction = buttonId.split('_')[1];
            this.showTwistFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'twist_play';
          this.showTwistFeedback = false;
          this.selectedGravity = 'earth';
        }
        break;

      case 'twist_play':
        if (buttonId === 'gravity_earth') {
          this.selectedGravity = 'earth';
          this.resetSwing();
        } else if (buttonId === 'gravity_moon') {
          this.selectedGravity = 'moon';
          this.resetSwing();
        } else if (buttonId === 'gravity_mars') {
          this.selectedGravity = 'mars';
          this.resetSwing();
        } else if (buttonId === 'start_swing' && !this.isSwinging) {
          this.startSwing();
        } else if (buttonId === 'continue') {
          this.phase = 'twist_review';
        }
        break;

      case 'twist_review':
        if (buttonId === 'continue') {
          this.phase = 'transfer';
        }
        break;

      case 'transfer':
        if (buttonId.startsWith('app_')) {
          this.activeAppIndex = parseInt(buttonId.split('_')[1]);
        } else if (buttonId === 'mark_understood') {
          this.completedApps.add(this.activeAppIndex);
        } else if (buttonId === 'continue' && this.completedApps.size >= 4) {
          this.phase = 'test';
        }
        break;

      case 'test':
        if (!this.showTestResults) {
          if (buttonId.startsWith('answer_')) {
            const answerIndex = parseInt(buttonId.split('_')[1]);
            this.testAnswers[this.currentQuestionIndex] = answerIndex;
          } else if (buttonId === 'next_question' && this.currentQuestionIndex < 9) {
            this.currentQuestionIndex++;
          } else if (buttonId === 'prev_question' && this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
          } else if (buttonId === 'submit' && !this.testAnswers.includes(-1)) {
            this.showTestResults = true;
          }
        } else {
          if (buttonId === 'continue') {
            if (this.calculateScore() >= 7) {
              this.phase = 'mastery';
            } else {
              this.showTestResults = false;
              this.testAnswers = Array(10).fill(-1);
              this.currentQuestionIndex = 0;
              this.phase = 'review';
            }
          }
        }
        break;

      case 'mastery':
        if (buttonId === 'restart') {
          this.resetGame();
        }
        break;
    }
  }

  private startSwing(): void {
    this.isSwinging = true;
    this.swingStartTime = this.animationTime;
    this.swingCount = 0;
    this.measuredPeriod = 0;
  }

  private resetSwing(): void {
    this.isSwinging = false;
    this.currentAngle = 0;
    this.swingCount = 0;
    this.measuredPeriod = 0;
  }

  processInput(input: UserInput, config: SessionConfig): void {
    this.handleInput(input);
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.pendulumLength = 1;
    this.pendulumAngle = 0.5;
    this.resetSwing();
    this.selectedGravity = 'earth';
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Animate pendulum swing
    if (this.isSwinging) {
      const elapsed = this.animationTime - this.swingStartTime;
      const gravity = this.getGravity(this.selectedGravity);
      const period = this.calculatePeriod(this.pendulumLength, gravity);

      this.currentAngle = this.getPendulumAngle(elapsed, this.pendulumLength, this.pendulumAngle, gravity);
      this.measuredPeriod = period;
      this.swingCount = Math.floor(elapsed / period);
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(6, 182, 212, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(168, 85, 247, 0.05)' });

    // Render phase-specific content
    switch (this.phase) {
      case 'hook':
        this.renderHook(r);
        break;
      case 'predict':
        this.renderPredict(r);
        break;
      case 'play':
        this.renderPlay(r);
        break;
      case 'review':
        this.renderReview(r);
        break;
      case 'twist_predict':
        this.renderTwistPredict(r);
        break;
      case 'twist_play':
        this.renderTwistPlay(r);
        break;
      case 'twist_review':
        this.renderTwistReview(r);
        break;
      case 'transfer':
        this.renderTransfer(r);
        break;
      case 'test':
        this.renderTest(r);
        break;
      case 'mastery':
        this.renderMastery(r);
        break;
    }

    // Progress indicator
    this.renderProgress(r);

    return r.toFrame(Math.floor(this.animationTime * 60));
  }

  private renderProgress(r: CommandRenderer): void {
    const phases: GamePhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phases.indexOf(this.phase);

    r.setProgress({
      id: 'phase_progress',
      current: currentIndex + 1,
      total: phases.length,
      labels: phases
    });
  }

  private renderHook(r: CommandRenderer): void {
    // Architecture badge
    r.roundRect(110, 55, 180, 30, 8, { fill: 'rgba(168, 85, 247, 0.1)' });
    r.text(200, 75, 'SERVER-SIDE PHYSICS', { fill: '#a855f7', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 125, 'The Pendulum Clock', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 155, 'What determines how fast it swings?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Pendulum icon
    r.text(200, 250, '🕰️', { fontSize: 64, textAnchor: 'middle' });

    // Info card
    r.roundRect(40, 300, 320, 140, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 335, 'For 400 years, pendulums were the', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 360, 'most accurate timekeepers on Earth!', { fill: '#22d3ee', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 400, 'Galileo discovered the secret...', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 425, 'T = 2*pi*sqrt(L/g)', { fill: '#a855f7', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'discover', label: 'Discover the Secret', variant: 'primary' });

    r.setCoachMessage('This game runs entirely on the server - physics is protected!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Make Your Prediction', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 95, 'What Affects the Period?', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 120, 340, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 145, 'You have two pendulums: same length,', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 168, 'but one has 2x heavier weight.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });

    const options = [
      { id: 'heavier', label: 'Heavier swings slower', desc: 'More mass = more time' },
      { id: 'lighter', label: 'Lighter swings slower', desc: 'Less mass = less momentum' },
      { id: 'same', label: 'Both swing at same rate!', desc: 'Mass does not affect period' }
    ];

    options.forEach((opt, i) => {
      const y = 205 + i * 70;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (opt.id === 'same') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (opt.id === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (opt.id === this.prediction) {
        bgColor = 'rgba(6, 182, 212, 0.3)';
      }

      r.roundRect(30, y, 340, 60, 12, { fill: bgColor });
      r.text(50, y + 28, opt.label, { fill: textColor, fontSize: 14, fontWeight: 'bold' });
      r.text(50, y + 48, opt.desc, { fill: '#94a3b8', fontSize: 11 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${opt.id}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 440, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 'same' ? 'Exactly right!' : 'Surprising: Mass does NOT matter!';
      r.text(200, 470, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 495, 'Only LENGTH and GRAVITY affect period', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See the Experiment', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 45, 'Pendulum Laboratory', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const period = this.calculatePeriod(this.pendulumLength);

    // Pendulum visualization
    r.roundRect(20, 70, 360, 200, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Pivot point
    r.circle(200, 90, 8, { fill: '#4b5563' });

    // String and bob
    const stringLength = this.pendulumLength * 80; // scale for display
    const angle = this.isSwinging ? this.currentAngle : this.pendulumAngle;
    const bobX = 200 + Math.sin(angle) * stringLength;
    const bobY = 90 + Math.cos(angle) * stringLength;

    r.line(200, 90, bobX, bobY, { stroke: '#94a3b8', strokeWidth: 2 });
    r.circle(bobX, bobY, 15, { fill: '#22d3ee' });
    r.circle(bobX, bobY, 8, { fill: '#0891b2' });

    // Arc path indicator
    const arcRadius = stringLength;
    const arcLeft = 200 + Math.sin(-this.pendulumAngle) * arcRadius;
    const arcRight = 200 + Math.sin(this.pendulumAngle) * arcRadius;
    r.line(arcLeft, 90 + Math.cos(-this.pendulumAngle) * arcRadius, arcRight, 90 + Math.cos(this.pendulumAngle) * arcRadius, { stroke: '#334155', strokeWidth: 1, strokeDasharray: '4,2' });

    // Length label
    r.text(230, 140, `L = ${this.pendulumLength.toFixed(2)} m`, { fill: '#94a3b8', fontSize: 11 });

    // Stats
    r.roundRect(30, 285, 160, 70, 12, { fill: 'rgba(6, 182, 212, 0.1)' });
    r.text(110, 310, 'Period', { fill: '#22d3ee', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 340, `${period.toFixed(3)} s`, { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(210, 285, 160, 70, 12, { fill: 'rgba(168, 85, 247, 0.1)' });
    r.text(290, 310, 'Swings', { fill: '#a855f7', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 340, `${this.swingCount}`, { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Slider
    r.addSlider({
      id: 'pendulum_length',
      label: `Length: ${this.pendulumLength.toFixed(2)} m`,
      min: 0.2,
      max: 3,
      step: 0.1,
      value: this.pendulumLength
    });

    // Buttons
    if (!this.isSwinging) {
      r.addButton({ id: 'start_swing', label: '🕰️ Start Swinging', variant: 'primary' });
    } else {
      r.addButton({ id: 'reset', label: '⏹️ Stop', variant: 'secondary' });
    }

    if (this.swingCount >= 3) {
      r.addButton({ id: 'continue', label: 'Learn the Formula', variant: 'primary' });
    }

    r.setCoachMessage('Adjust the length and observe the period!');
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 50, 'The Pendulum Formula', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Main formula card
    r.roundRect(30, 80, 340, 130, 16, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 110, 'PERIOD OF A PENDULUM', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(70, 130, 260, 50, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 163, 'T = 2*pi*sqrt(L/g)', { fill: '#ffffff', fontSize: 20, textAnchor: 'middle' });

    r.text(80, 200, 'T = period (seconds)', { fill: '#94a3b8', fontSize: 11 });
    r.text(240, 200, 'L = length (meters)', { fill: '#94a3b8', fontSize: 11 });

    // Key insights
    r.roundRect(30, 220, 340, 100, 16, { fill: 'rgba(16, 185, 129, 0.15)' });
    r.text(200, 245, 'KEY INSIGHTS', { fill: '#10b981', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 275, '1. Mass does NOT affect period!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 298, '2. Longer pendulum = longer period', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Application
    r.roundRect(30, 335, 340, 80, 16, { fill: 'rgba(251, 191, 36, 0.15)' });
    r.text(200, 365, 'WHY CLOCKS WORK', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 393, 'A 1-meter pendulum swings once every 2 seconds!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Gravity Effect', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Pendulum on Other Worlds', { fill: '#a855f7', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 95, 'What About Gravity?', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 120, 340, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 145, 'You bring a pendulum to the Moon,', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 168, 'where gravity is 1/6 of Earth.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });

    const options = [
      { id: 'faster', label: 'Swings FASTER on Moon', desc: 'Less gravity = less resistance' },
      { id: 'same', label: 'Same speed on both', desc: 'Period only depends on length' },
      { id: 'slower', label: 'Swings SLOWER on Moon', desc: 'Less gravity = longer period' }
    ];

    options.forEach((opt, i) => {
      const y = 205 + i * 70;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (opt.id === 'slower') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (opt.id === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (opt.id === this.twistPrediction) {
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 60, 12, { fill: bgColor });
      r.text(50, y + 28, opt.label, { fill: textColor, fontSize: 14, fontWeight: 'bold' });
      r.text(50, y + 48, opt.desc, { fill: '#94a3b8', fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${opt.id}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 440, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 'slower' ? 'Correct!' : 'Swings SLOWER on the Moon!';
      r.text(200, 470, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 495, 'T is proportional to 1/sqrt(g)', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Compare Planets', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 45, 'Planetary Pendulum Lab', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Planet selection
    const planets = [
      { id: 'earth', icon: '🌍', name: 'Earth', g: 9.81 },
      { id: 'moon', icon: '🌙', name: 'Moon', g: 1.62 },
      { id: 'mars', icon: '🔴', name: 'Mars', g: 3.72 }
    ];

    planets.forEach((planet, i) => {
      const x = 35 + i * 115;
      const isActive = this.selectedGravity === planet.id;

      r.roundRect(x, 70, 105, 50, 10, { fill: isActive ? 'rgba(168, 85, 247, 0.3)' : 'rgba(51, 65, 85, 0.5)' });
      r.text(x + 25, 100, planet.icon, { fontSize: 20 });
      r.text(x + 65, 92, planet.name, { fill: isActive ? '#a855f7' : '#94a3b8', fontSize: 11, fontWeight: 'bold' });
      r.text(x + 65, 108, `g=${planet.g}`, { fill: '#64748b', fontSize: 9 });

      r.addButton({ id: `gravity_${planet.id}`, label: '', variant: 'secondary' });
    });

    // Pendulum visualization
    r.roundRect(20, 130, 360, 160, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    const gravity = this.getGravity(this.selectedGravity);
    const period = this.calculatePeriod(this.pendulumLength, gravity);

    // Pivot
    r.circle(200, 150, 6, { fill: '#4b5563' });

    // String and bob
    const stringLength = this.pendulumLength * 60;
    const angle = this.isSwinging ? this.currentAngle : this.pendulumAngle;
    const bobX = 200 + Math.sin(angle) * stringLength;
    const bobY = 150 + Math.cos(angle) * stringLength;

    r.line(200, 150, bobX, bobY, { stroke: '#94a3b8', strokeWidth: 2 });
    r.circle(bobX, bobY, 12, { fill: '#a855f7' });

    // Period display
    r.roundRect(50, 305, 300, 60, 12, { fill: 'rgba(168, 85, 247, 0.1)' });
    r.text(200, 328, 'Period on ' + planets.find(p => p.id === this.selectedGravity)?.name, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 355, `T = ${period.toFixed(3)} seconds`, { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Buttons
    if (!this.isSwinging) {
      r.addButton({ id: 'start_swing', label: '🌍 Start', variant: 'primary' });
    }
    r.addButton({ id: 'continue', label: 'Understanding', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 50, 'Gravity and Period', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Comparison table
    r.roundRect(30, 85, 340, 150, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(90, 115, 'Planet', { fill: '#94a3b8', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(180, 115, 'Gravity', { fill: '#94a3b8', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 115, 'Period (1m)', { fill: '#94a3b8', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    const data = [
      { icon: '🌍', name: 'Earth', g: 9.81, T: this.calculatePeriod(1, 9.81) },
      { icon: '🔴', name: 'Mars', g: 3.72, T: this.calculatePeriod(1, 3.72) },
      { icon: '🌙', name: 'Moon', g: 1.62, T: this.calculatePeriod(1, 1.62) }
    ];

    data.forEach((row, i) => {
      const y = 145 + i * 30;
      r.text(90, y, `${row.icon} ${row.name}`, { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(180, y, `${row.g} m/s^2`, { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(290, y, `${row.T.toFixed(2)} s`, { fill: '#22d3ee', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    });

    // Key insight
    r.roundRect(30, 250, 340, 90, 16, { fill: 'rgba(16, 185, 129, 0.15)' });
    r.text(200, 280, 'KEY INSIGHT', { fill: '#10b981', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 305, 'Lower gravity = Longer period', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 328, 'T is proportional to 1/sqrt(g)', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 50, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#22d3ee';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.tagline, { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });

    // Description
    const words = app.description.split(' ');
    let line = '';
    let lineY = 230;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 48) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Physics connection
    r.roundRect(40, 310, 320, 70, 10, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 335, 'Physics Connection', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 360, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: '✓ Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 420, '✓ Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 460, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 50, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 75, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Scenario
      r.roundRect(25, 95, 350, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      const scenarioWords = question.scenario.split(' ');
      let scenarioLine = '';
      let scenarioY = 115;
      scenarioWords.forEach(word => {
        if ((scenarioLine + word).length > 50) {
          r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
          scenarioLine = word + ' ';
          scenarioY += 16;
        } else {
          scenarioLine += word + ' ';
        }
      });
      if (scenarioLine) r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      // Question
      r.text(200, 195, question.question.substring(0, 50), { fill: '#22d3ee', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 220 + i * 52;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(6, 182, 212, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 45, 8, { fill: bgColor });
        r.text(40, y + 27, `${String.fromCharCode(65 + i)}. ${option.substring(0, 42)}${option.length > 42 ? '...' : ''}`, { fill: isSelected ? '#22d3ee' : '#e2e8f0', fontSize: 11 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      // Navigation
      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: '← Previous', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next →', variant: 'secondary' });
      }

      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      } else {
        r.text(200, 475, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "You've mastered pendulum physics!" : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.roundRect(30, 280, 340, 160, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = ['T = 2*pi*sqrt(L/g)', 'Mass independence', 'Length effect', 'Gravity effect'];
      concepts.forEach((concept, i) => {
        r.text(200, 340 + i * 22, concept, { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 120, '🕰️', { fontSize: 72, textAnchor: 'middle' });

    r.text(200, 200, 'Pendulum Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, "You've mastered the physics of pendulums!", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'T = 2*pi*sqrt(L/g)', { fill: '#22d3ee', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    const concepts = [
      { icon: '📐', label: 'T = 2*pi*sqrt(L/g)' },
      { icon: '⚖️', label: 'Mass Independence' },
      { icon: '📏', label: 'Length Effect' },
      { icon: '🌍', label: 'Gravity Effect' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 295 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    r.roundRect(50, 460, 300, 70, 12, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 488, 'Server-Side Physics', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 515, 'All formulas protected on server!', { fill: '#a855f7', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering pendulum physics!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      pendulumLength: this.pendulumLength,
      pendulumAngle: this.pendulumAngle,
      animationTime: this.animationTime,
      isSwinging: this.isSwinging,
      currentAngle: this.currentAngle,
      swingCount: this.swingCount,
      selectedGravity: this.selectedGravity,
      testAnswers: this.testAnswers,
      currentQuestionIndex: this.currentQuestionIndex,
      showTestResults: this.showTestResults,
      activeAppIndex: this.activeAppIndex,
      completedApps: Array.from(this.completedApps)
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.prediction !== undefined) this.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.showPredictionFeedback !== undefined) this.showPredictionFeedback = state.showPredictionFeedback as boolean;
    if (state.showTwistFeedback !== undefined) this.showTwistFeedback = state.showTwistFeedback as boolean;
    if (state.pendulumLength !== undefined) this.pendulumLength = state.pendulumLength as number;
    if (state.pendulumAngle !== undefined) this.pendulumAngle = state.pendulumAngle as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.isSwinging !== undefined) this.isSwinging = state.isSwinging as boolean;
    if (state.currentAngle !== undefined) this.currentAngle = state.currentAngle as number;
    if (state.swingCount !== undefined) this.swingCount = state.swingCount as number;
    if (state.selectedGravity !== undefined) this.selectedGravity = state.selectedGravity as string;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createRemoteGame(sessionId: string): RemoteGame {
  return new RemoteGame(sessionId);
}
