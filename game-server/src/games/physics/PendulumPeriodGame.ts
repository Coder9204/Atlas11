import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// PENDULUM PERIOD GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: T = 2*pi*sqrt(L/g) - Period of a simple pendulum
// Key insight: Period depends ONLY on length and gravity, NOT on mass!
// This is because mass cancels: F = mg*sin(theta), a = g*sin(theta)
// For small angles, sin(theta) ≈ theta, giving simple harmonic motion
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
  stats: { value: string; label: string; icon: string }[];
  color: string;
}

// Physics constants (PROTECTED - never sent to client)
const GRAVITY = 9.81; // m/s^2
const PIXELS_PER_METER = 200;

export class PendulumPeriodGame extends BaseGame {
  readonly gameType = 'pendulum_period';
  readonly gameTitle = 'Pendulum Period: The Mass Mystery';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Pendulum simulation state
  private pendulumLength = 200; // pixels (1 meter)
  private bobMass = 1; // kg
  private amplitude = 15; // degrees
  private pendulumAngle = 15; // current angle in degrees
  private angularVelocity = 0; // rad/s
  private isSwinging = false;
  private measuredPeriod: number | null = null;
  private lastCrossing: number | null = null;
  private swingStartTime: number | null = null;
  private recordedPeriods: { length: number; mass: number; period: number }[] = [];
  private animationTime = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "You're timing a grandfather clock pendulum. The brass bob feels heavy.",
      question: "If you replaced the brass bob with a lighter aluminum one, what happens to the period?",
      options: [
        "Period increases - lighter swings slower",
        "Period decreases - lighter swings faster",
        "Period stays the same - mass cancels out",
        "Period becomes erratic"
      ],
      correctIndex: 2,
      explanation: "In T = 2*pi*sqrt(L/g), mass doesn't appear! When deriving the equation, mass appears in both gravitational force (mg) and inertia (ma), canceling completely."
    },
    {
      scenario: "Two identical pendulums: one with a 1kg bob, one with a 5kg bob.",
      question: "Released from the same angle simultaneously, which reaches the bottom first?",
      options: [
        "The 5kg bob - heavier falls faster",
        "The 1kg bob - lighter accelerates easier",
        "They arrive at the same time",
        "Depends on release technique"
      ],
      correctIndex: 2,
      explanation: "Both arrive simultaneously! The restoring force is proportional to mass (F = mg*sin(theta)), but so is inertia (ma). They cancel, so all masses swing identically."
    },
    {
      scenario: "Design a pendulum clock with a 2-second period (1 second each way).",
      question: "What length should the pendulum be? (Use g = 10 m/s^2, pi^2 = 10)",
      options: [
        "About 25 cm",
        "About 50 cm",
        "About 100 cm (1 meter)",
        "About 200 cm (2 meters)"
      ],
      correctIndex: 2,
      explanation: "Using T = 2*pi*sqrt(L/g): 2 = 2*pi*sqrt(L/10). Solving gives L = 1 meter. A 'seconds pendulum' is indeed about 1 meter long."
    },
    {
      scenario: "A Foucault pendulum at a museum swings with a 16-second period.",
      question: "To double the period to 32 seconds, how should the length change?",
      options: [
        "Double the length (2x)",
        "Quadruple the length (4x)",
        "Increase by sqrt(2) (1.41x)",
        "Period cannot be changed by length"
      ],
      correctIndex: 1,
      explanation: "Since T is proportional to sqrt(L), doubling T requires quadrupling L. If T2 = 2*T1, then sqrt(L2) = 2*sqrt(L1), so L2 = 4*L1."
    },
    {
      scenario: "On the Moon, gravity is about 1/6 of Earth's gravity.",
      question: "A 1-meter pendulum has a 2-second period on Earth. What's its period on the Moon?",
      options: [
        "About 2 seconds (same as Earth)",
        "About 5 seconds (sqrt(6) times longer)",
        "About 12 seconds (6 times longer)",
        "About 0.8 seconds (shorter)"
      ],
      correctIndex: 1,
      explanation: "Since T = 2*pi*sqrt(L/g) and Moon's g is 1/6 of Earth's, T_moon = sqrt(6) * T_earth = 2.45 * 2s = about 5 seconds."
    },
    {
      scenario: "A child on a playground swing is pushed to a small angle.",
      question: "If a parent (3x heavier) sits on the same swing, how does their period compare?",
      options: [
        "Parent swings 3x slower",
        "Parent swings sqrt(3) times slower",
        "Both have the same period",
        "Parent swings faster"
      ],
      correctIndex: 2,
      explanation: "The period is identical! A swing acts as a pendulum, and since mass cancels out, the parent and child swing at the same rate if released from the same angle."
    },
    {
      scenario: "In a cave, you find a 2.5-meter pendulum. You time 10 swings at 32 seconds.",
      question: "What can you conclude about the cave's gravity?",
      options: [
        "Gravity is normal (~10 m/s^2)",
        "Gravity is weaker than normal",
        "Gravity is stronger than normal",
        "Cannot determine from this"
      ],
      correctIndex: 0,
      explanation: "Period = 3.2 seconds. Using T = 2*pi*sqrt(L/g): g = 4*pi^2*L/T^2 = 4*10*2.5/10 = 10 m/s^2. Normal Earth gravity!"
    },
    {
      scenario: "An engineer designs a tuned mass damper for a building that sways with a 10-second period.",
      question: "What pendulum length is needed to match this frequency?",
      options: [
        "About 2.5 meters",
        "About 10 meters",
        "About 25 meters",
        "About 100 meters"
      ],
      correctIndex: 2,
      explanation: "Using T = 2*pi*sqrt(L/g) with T = 10s: L = g*T^2/(4*pi^2) = 10*100/40 = 25 meters. Building dampers need significant height!"
    },
    {
      scenario: "A student claims that swinging higher (larger amplitude) makes the period longer.",
      question: "Is the student correct for small to moderate angles?",
      options: [
        "Yes, amplitude strongly affects period",
        "No, period is completely independent of amplitude",
        "Partially - nearly constant for small angles, slightly longer at large angles",
        "Opposite - larger amplitude means shorter period"
      ],
      correctIndex: 2,
      explanation: "For small angles (<15 deg), period is essentially constant (isochronism). At large angles, sin(theta) != theta, causing slightly longer periods. At 90 deg, period is ~18% longer."
    },
    {
      scenario: "Two pendulums have the same length: one swings in oil, one in air.",
      question: "Ignoring damping, how do their natural periods compare?",
      options: [
        "Oil pendulum is much slower",
        "Oil pendulum is faster",
        "Periods are nearly identical",
        "Cannot determine without oil density"
      ],
      correctIndex: 2,
      explanation: "The natural period depends only on length and gravity, not the surrounding medium. Oil causes faster damping (energy loss), but each swing still takes the same time."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🕰️",
      title: "Grandfather Clocks",
      tagline: "Precision Timekeeping",
      description: "Grandfather clocks use the pendulum's consistent period. Since mass doesn't affect period, clockmakers can use decorative brass bobs or simple lead weights.",
      connection: "Adjusting the bob height fine-tunes the clock - a small length change adjusts the period.",
      stats: [
        { value: '1s', label: 'standard period', icon: '⏱️' },
        { value: '99.4cm', label: 'for 1-second period', icon: '📏' },
        { value: '±0.5s', label: 'daily accuracy', icon: '🎯' }
      ],
      color: '#10b981'
    },
    {
      icon: "🌍",
      title: "Foucault's Pendulum",
      tagline: "Earth's Rotation Visible",
      description: "Foucault pendulums demonstrate Earth's rotation. The swing plane appears to rotate because Earth turns underneath while the pendulum maintains its original plane.",
      connection: "The predictable period allows precise tracking of the apparent rotation rate, which varies with latitude.",
      stats: [
        { value: '67m', label: 'Pantheon pendulum', icon: '📐' },
        { value: '28kg', label: 'typical bob mass', icon: '⚖️' },
        { value: '11.3°', label: 'rotation per hour at 45°N', icon: '🔄' }
      ],
      color: '#8b5cf6'
    },
    {
      icon: "📐",
      title: "Measuring Gravity",
      tagline: "Precision g Determination",
      description: "Since T = 2*pi*sqrt(L/g), measuring period and length precisely allows calculating local gravitational acceleration.",
      connection: "Mass independence is crucial: the same pendulum gives identical results regardless of bob material.",
      stats: [
        { value: '9.81', label: 'm/s^2 at sea level', icon: '⬇️' },
        { value: '0.5%', label: 'variation across Earth', icon: '🌐' },
        { value: '1672', label: 'first g measurement', icon: '📜' }
      ],
      color: '#f59e0b'
    },
    {
      icon: "🏗️",
      title: "Vibration Isolation",
      tagline: "Earthquake-Proof Buildings",
      description: "Tuned mass dampers in skyscrapers work like pendulums. Their period is tuned to match building sway frequency, reducing dangerous oscillations.",
      connection: "Engineers choose damper mass for structural capacity, not period. Period is set by suspension length.",
      stats: [
        { value: '730t', label: 'Taipei 101 damper', icon: '🏗️' },
        { value: '40%', label: 'sway reduction', icon: '📉' },
        { value: '87', label: 'floors in Taipei 101', icon: '🏢' }
      ],
      color: '#ec4899'
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate theoretical period
  private calculateTheoreticalPeriod(lengthPixels: number): number {
    const lengthMeters = lengthPixels / PIXELS_PER_METER;
    return 2 * Math.PI * Math.sqrt(lengthMeters / GRAVITY);
  }

  // PROTECTED: Pendulum physics simulation
  private updatePendulumPhysics(deltaTime: number): void {
    if (!this.isSwinging) return;

    const lengthMeters = this.pendulumLength / PIXELS_PER_METER;
    const angleRad = (this.pendulumAngle * Math.PI) / 180;

    // Angular acceleration: a = -(g/L) * sin(theta)
    const angularAccel = -(GRAVITY / lengthMeters) * Math.sin(angleRad);

    // Update angular velocity and angle
    this.angularVelocity += angularAccel * deltaTime;
    this.pendulumAngle += this.angularVelocity * deltaTime * (180 / Math.PI);

    // Small damping to simulate air resistance
    this.angularVelocity *= 0.999;

    // Detect zero crossing for period measurement
    const wasPositive = this.pendulumAngle > 0;
    const isNowNegative = this.pendulumAngle <= 0;

    if (wasPositive && isNowNegative && this.lastCrossing !== null) {
      const now = this.animationTime * 1000;
      this.measuredPeriod = (now - this.lastCrossing) / 1000 * 2; // Full period
      this.lastCrossing = now;
    } else if (wasPositive && isNowNegative) {
      this.lastCrossing = this.animationTime * 1000;
    }

    // Stop if nearly at rest
    if (Math.abs(this.pendulumAngle) < 0.1 && Math.abs(this.angularVelocity) < 0.01) {
      this.isSwinging = false;
    }
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
      this.handleSliderChange(input.id, input.value as number);
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
            this.prediction = parseInt(buttonId.split('_')[1]);
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
        }
        break;

      case 'play':
        if (buttonId === 'start_swing') {
          this.startSwing();
        } else if (buttonId === 'stop_swing') {
          this.stopSwing();
        } else if (buttonId === 'record') {
          this.recordMeasurement();
        } else if (buttonId === 'continue') {
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
            this.twistPrediction = parseInt(buttonId.split('_')[1]);
            this.showTwistFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'twist_play';
          this.showTwistFeedback = false;
        }
        break;

      case 'twist_play':
        if (buttonId === 'start_swing') {
          this.startSwing();
        } else if (buttonId === 'stop_swing') {
          this.stopSwing();
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

  private handleSliderChange(sliderId: string, value: number): void {
    if (sliderId === 'length') {
      this.pendulumLength = value;
      this.stopSwing();
    } else if (sliderId === 'mass') {
      this.bobMass = value;
      this.stopSwing();
    } else if (sliderId === 'amplitude') {
      this.amplitude = value;
      this.pendulumAngle = value;
    }
  }

  private startSwing(): void {
    this.pendulumAngle = this.amplitude;
    this.angularVelocity = 0;
    this.swingStartTime = this.animationTime;
    this.lastCrossing = null;
    this.measuredPeriod = null;
    this.isSwinging = true;
  }

  private stopSwing(): void {
    this.isSwinging = false;
    this.pendulumAngle = this.amplitude;
    this.angularVelocity = 0;
  }

  private recordMeasurement(): void {
    if (this.measuredPeriod !== null) {
      this.recordedPeriods.push({
        length: this.pendulumLength,
        mass: this.bobMass,
        period: this.measuredPeriod
      });
    }
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
    this.pendulumLength = 200;
    this.bobMass = 1;
    this.amplitude = 15;
    this.pendulumAngle = 15;
    this.angularVelocity = 0;
    this.isSwinging = false;
    this.measuredPeriod = null;
    this.lastCrossing = null;
    this.swingStartTime = null;
    this.recordedPeriods = [];
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;
    this.updatePendulumPhysics(deltaTime);
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0a0f');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(16, 185, 129, 0.03)' });
    r.circle(300, 600, 150, { fill: 'rgba(245, 158, 11, 0.03)' });

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

  private renderPendulum(r: CommandRenderer, pivotX: number, pivotY: number, compact: boolean = false): void {
    const scale = compact ? 0.6 : 1;
    const length = this.pendulumLength * scale;
    const bobRadius = 8 + this.bobMass * 4;

    // Calculate bob position
    const angleRad = (this.pendulumAngle * Math.PI) / 180;
    const bobX = pivotX + Math.sin(angleRad) * length;
    const bobY = pivotY + Math.cos(angleRad) * length;

    // Pivot mount
    r.roundRect(pivotX - 15, pivotY - 8, 30, 12, 4, { fill: '#4b5563' });

    // String/rod
    r.line(pivotX, pivotY, bobX, bobY, { stroke: '#9ca3af', strokeWidth: 2 });

    // Bob
    const bobColor = `hsl(${120 + this.bobMass * 30}, 70%, 50%)`;
    r.circle(bobX, bobY, bobRadius * scale, { fill: bobColor });
    r.text(bobX, bobY + 4, `${this.bobMass}kg`, { fill: '#ffffff', fontSize: 9, fontWeight: 'bold', textAnchor: 'middle' });

    // Period display
    if (this.measuredPeriod !== null) {
      r.text(pivotX, pivotY + length + 30, `T = ${this.measuredPeriod.toFixed(2)}s`, { fill: '#10b981', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Theoretical period
    const theoretical = this.calculateTheoreticalPeriod(this.pendulumLength);
    r.text(pivotX, pivotY + length + 50, `Theory: ${theoretical.toFixed(2)}s`, { fill: '#6b7280', fontSize: 10, textAnchor: 'middle' });
  }

  private renderHook(r: CommandRenderer): void {
    // Badge
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(16, 185, 129, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#10b981', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Pendulum Mystery', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'What determines how fast it swings?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Pendulum icon
    r.text(200, 260, '⏱️', { fontSize: 72, textAnchor: 'middle' });

    // Question card
    r.roundRect(40, 320, 320, 130, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 355, 'Galileo noticed that a chandelier', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 380, 'always swings at the same rate,', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 405, 'regardless of how far it swings!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 435, 'Does mass matter?', { fill: '#f59e0b', fontSize: 12, textAnchor: 'middle' });

    // CTA Button
    r.addButton({ id: 'discover', label: "Discover the Secret", variant: 'primary' });

    r.setCoachMessage('Explore the physics of pendulum motion!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 100, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'Two pendulums have the same length.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 155, 'One has a heavy bob, one has a light bob.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });

    // Options
    const options = [
      'Heavy bob swings slower',
      'Light bob swings slower',
      'Both swing at the same rate',
      'Depends on starting angle'
    ];

    options.forEach((option, i) => {
      const y = 200 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (i === 2) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.prediction) {
        bgColor = 'rgba(16, 185, 129, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 430, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const isCorrect = this.prediction === 2;
      r.text(200, 460, isCorrect ? 'Excellent intuition!' : 'Surprising, right?', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 490, 'Mass cancels out! Only length and gravity matter.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 510, 'T = 2*pi*sqrt(L/g)', { fill: '#10b981', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test It Yourself', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Pendulum Lab', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Pendulum visualization
    r.roundRect(100, 80, 200, 220, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    this.renderPendulum(r, 200, 100, false);

    // Controls
    r.addSlider({ id: 'length', label: 'Length (cm)', min: 50, max: 300, step: 10, value: this.pendulumLength });
    r.addSlider({ id: 'mass', label: 'Mass (kg)', min: 1, max: 5, step: 1, value: this.bobMass });

    // Control buttons
    if (this.isSwinging) {
      r.addButton({ id: 'stop_swing', label: 'Stop', variant: 'secondary' });
    } else {
      r.addButton({ id: 'start_swing', label: 'Start Swing', variant: 'primary' });
    }

    if (this.measuredPeriod !== null) {
      r.addButton({ id: 'record', label: 'Record Measurement', variant: 'secondary' });
    }

    // Recorded measurements
    if (this.recordedPeriods.length > 0) {
      r.roundRect(30, 410, 340, 80, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 430, 'Recorded Measurements', { fill: '#94a3b8', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
      this.recordedPeriods.slice(-3).forEach((m, i) => {
        r.text(200, 450 + i * 15, `L=${m.length}px, m=${m.mass}kg: T=${m.period.toFixed(2)}s`, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
      });
    }

    // Key insight
    r.roundRect(30, 510, 340, 50, 10, { fill: 'rgba(16, 185, 129, 0.15)' });
    r.text(200, 540, 'Notice: Changing mass does NOT change the period!', { fill: '#10b981', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review the Physics', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'Why Mass Cancels Out', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // The physics
    r.roundRect(25, 85, 350, 120, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 110, 'The Formula', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 140, 'T = 2*pi*sqrt(L/g)', { fill: '#ffffff', fontSize: 20, textAnchor: 'middle' });
    r.text(200, 170, 'Period depends ONLY on length and gravity!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 190, 'Mass appears in F = mg AND a = F/m... it cancels!', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Galileo's insight
    r.roundRect(25, 220, 350, 80, 12, { fill: 'rgba(245, 158, 11, 0.15)' });
    r.text(200, 245, "Galileo's Insight (1583)", { fill: '#f59e0b', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 270, 'Watching a swinging chandelier in the cathedral,', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 288, 'he timed it with his pulse - same rate always!', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Why it works
    r.roundRect(25, 315, 350, 70, 12, { fill: 'rgba(59, 130, 246, 0.15)' });
    r.text(200, 340, 'Why It Works', { fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 365, 'Heavier bobs have more force, but also more inertia.', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 380, 'These effects exactly cancel each other!', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore the Twist', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist Challenge', { fill: '#a855f7', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'If mass does not affect the period,', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 150, 'what happens if we change the LENGTH?', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Longer pendulum swings faster',
      'Longer pendulum swings slower',
      'Length has no effect either',
      'Only affects maximum speed'
    ];

    options.forEach((option, i) => {
      const y = 200 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (i === 1) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.twistPrediction) {
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 430, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const isCorrect = this.twistPrediction === 1;
      r.text(200, 460, isCorrect ? 'Correct!' : 'Think about it...', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 490, 'T = 2*pi*sqrt(L/g) - longer L means longer T!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 510, "That's why grandfather clocks have long pendulums.", { fill: '#f59e0b', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Experiment with Length', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Length Experiment', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Pendulum visualization
    r.roundRect(100, 80, 200, 220, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    this.renderPendulum(r, 200, 100, false);

    // Controls - focus on length
    r.addSlider({ id: 'length', label: 'Length (cm)', min: 50, max: 300, step: 25, value: this.pendulumLength });

    // Control buttons
    if (this.isSwinging) {
      r.addButton({ id: 'stop_swing', label: 'Stop', variant: 'secondary' });
    } else {
      r.addButton({ id: 'start_swing', label: 'Start Swing', variant: 'primary' });
    }

    // Length-period relationship
    r.roundRect(30, 400, 340, 80, 10, { fill: 'rgba(168, 85, 247, 0.15)' });
    r.text(200, 425, 'Notice the Pattern', { fill: '#a855f7', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 450, '4x the length = 2x the period', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 470, 'Because T is proportional to sqrt(L)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review Discovery', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Complete Picture', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Summary
    r.roundRect(25, 85, 350, 130, 16, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 110, 'Pendulum Period Depends On:', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 140, 'LENGTH: Longer = Slower (sqrt relationship)', { fill: '#22c55e', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 165, 'GRAVITY: Less gravity = Slower', { fill: '#22c55e', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 195, 'MASS: Does NOT affect period!', { fill: '#ef4444', fontSize: 11, textAnchor: 'middle' });

    // Applications preview
    r.roundRect(25, 230, 350, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 255, 'This principle is used everywhere!', { fill: '#10b981', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 280, 'Clocks, seismometers, building dampers...', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Real Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = app.color;
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 260, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 170, app.title, { fill: app.color, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 190, app.tagline, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Description
    const words = app.description.split(' ');
    let line = '';
    let lineY = 215;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 50) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 15;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Stats
    app.stats.forEach((stat, i) => {
      const x = 60 + i * 100;
      r.text(x, 320, stat.icon, { fontSize: 14, textAnchor: 'middle' });
      r.text(x, 340, stat.value, { fill: app.color, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x, 355, stat.label, { fill: '#6b7280', fontSize: 8, textAnchor: 'middle' });
    });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 385, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 420, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Continue button
    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Scenario
      r.roundRect(25, 100, 350, 55, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 130, question.scenario.substring(0, 60) + (question.scenario.length > 60 ? '...' : ''), { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

      // Question
      r.text(200, 175, question.question, { fill: '#10b981', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 195 + i * 45;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 40, 8, { fill: bgColor });
        r.text(40, y + 25, `${String.fromCharCode(65 + i)}. ${option.substring(0, 45)}${option.length > 45 ? '...' : ''}`, { fill: isSelected ? '#10b981' : '#e2e8f0', fontSize: 10 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      // Navigation
      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: 'Previous', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next', variant: 'secondary' });
      }

      // Submit button
      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      } else {
        r.text(200, 420, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? 'Pendulum Master!' : 'Keep studying and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Trophy
    r.text(200, 120, '⏱️', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Pendulum Period Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, "You've mastered pendulum physics!", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Key concepts
    const concepts = [
      { icon: '📏', label: 'T = 2*pi*sqrt(L/g)' },
      { icon: '⚖️', label: 'Mass cancels out!' },
      { icon: '🕰️', label: 'Clock timekeeping' },
      { icon: '🌍', label: 'Gravity measurement' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 275 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 440, 300, 70, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 465, 'Key Formula', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 492, 'T = 2*pi*sqrt(L/g) - Mass independent!', { fill: '#ffffff', fontSize: 13, textAnchor: 'middle' });

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
      bobMass: this.bobMass,
      amplitude: this.amplitude,
      pendulumAngle: this.pendulumAngle,
      angularVelocity: this.angularVelocity,
      isSwinging: this.isSwinging,
      measuredPeriod: this.measuredPeriod,
      recordedPeriods: this.recordedPeriods,
      animationTime: this.animationTime,
      testAnswers: this.testAnswers,
      currentQuestionIndex: this.currentQuestionIndex,
      showTestResults: this.showTestResults,
      activeAppIndex: this.activeAppIndex,
      completedApps: Array.from(this.completedApps)
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.prediction !== undefined) this.prediction = state.prediction as number | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as number | null;
    if (state.showPredictionFeedback !== undefined) this.showPredictionFeedback = state.showPredictionFeedback as boolean;
    if (state.showTwistFeedback !== undefined) this.showTwistFeedback = state.showTwistFeedback as boolean;
    if (state.pendulumLength !== undefined) this.pendulumLength = state.pendulumLength as number;
    if (state.bobMass !== undefined) this.bobMass = state.bobMass as number;
    if (state.amplitude !== undefined) this.amplitude = state.amplitude as number;
    if (state.pendulumAngle !== undefined) this.pendulumAngle = state.pendulumAngle as number;
    if (state.angularVelocity !== undefined) this.angularVelocity = state.angularVelocity as number;
    if (state.isSwinging !== undefined) this.isSwinging = state.isSwinging as boolean;
    if (state.measuredPeriod !== undefined) this.measuredPeriod = state.measuredPeriod as number | null;
    if (state.recordedPeriods) this.recordedPeriods = state.recordedPeriods as { length: number; mass: number; period: number }[];
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createPendulumPeriodGame(sessionId: string): PendulumPeriodGame {
  return new PendulumPeriodGame(sessionId);
}
