import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// DAMPED OSCILLATIONS GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: m(d²x/dt²) + c(dx/dt) + kx = 0
// Damping ratio: ζ = c / (2√(mk))
// Underdamped (ζ<1): oscillates with decay
// Critically damped (ζ=1): fastest return without oscillation
// Overdamped (ζ>1): slow return without oscillation
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
const NATURAL_FREQUENCY = 2; // rad/s

export class DampingGame extends BaseGame {
  readonly gameType = 'damping';
  readonly gameTitle = 'Damped Oscillations: Taming the Bounce';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private dampingRatio = 0.2; // ζ
  private displacement = 100; // Current displacement
  private time = 0;
  private isAnimating = false;
  private animationTime = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // PROTECTED: Test questions with correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "A car drives over a speed bump, compressing its suspension springs.",
      question: "What type of damping do car suspensions typically use?",
      options: [
        "No damping - to feel every bump",
        "Underdamped - for a slightly bouncy ride",
        "Critically damped - to return quickly without bouncing",
        "Overdamped - for maximum stability"
      ],
      correctIndex: 2,
      explanation: "Car suspensions are designed to be critically damped (or slightly underdamped for sportier feel). Critical damping returns the car to equilibrium fastest without oscillating."
    },
    {
      scenario: "You pull down on a mass attached to a spring and release it in a system with ζ = 0.3.",
      question: "How will the mass behave after release?",
      options: [
        "Return directly to equilibrium without oscillating",
        "Oscillate with decreasing amplitude until it stops",
        "Oscillate forever with constant amplitude",
        "Move extremely slowly toward equilibrium"
      ],
      correctIndex: 1,
      explanation: "With ζ = 0.3 (less than 1), the system is underdamped. The mass oscillates back and forth with exponentially decreasing amplitude."
    },
    {
      scenario: "An engineer designs a door closer with a very high damping coefficient.",
      question: "With ζ = 3, how will the door behave?",
      options: [
        "Slam shut quickly",
        "Oscillate back and forth before closing",
        "Close very slowly without oscillating",
        "Stay exactly where you leave it"
      ],
      correctIndex: 2,
      explanation: "With ζ = 3 (overdamped), the door returns to closed position without oscillating, but very slowly due to high damping resistance."
    },
    {
      scenario: "A seismometer must stop oscillating quickly after detecting an earthquake.",
      question: "Which damping ratio allows the instrument to settle fastest?",
      options: [
        "ζ = 0.1 (very underdamped)",
        "ζ = 0.5 (moderately underdamped)",
        "ζ = 1.0 (critically damped)",
        "ζ = 5.0 (heavily overdamped)"
      ],
      correctIndex: 2,
      explanation: "Critical damping (ζ = 1) is the 'sweet spot' that returns to equilibrium in minimum time without any overshoot."
    },
    {
      scenario: "In the equation m(d²x/dt²) + c(dx/dt) + kx = 0, you increase the damping coefficient c.",
      question: "What happens to the damping ratio ζ?",
      options: [
        "It decreases",
        "It stays the same",
        "It increases",
        "It becomes negative"
      ],
      correctIndex: 2,
      explanation: "The damping ratio ζ = c / (2√(mk)). Since c is in the numerator, increasing c directly increases ζ."
    },
    {
      scenario: "A grandfather clock pendulum swings in air with very light damping.",
      question: "Why does the pendulum eventually stop if not wound?",
      options: [
        "Air resistance removes energy each swing (underdamped decay)",
        "Gravity pulls it to rest",
        "The spring wears out",
        "It runs out of momentum"
      ],
      correctIndex: 0,
      explanation: "Air resistance acts as light damping (ζ << 1), slowly removing energy each oscillation until the pendulum stops."
    },
    {
      scenario: "A diving board vibrates after a diver jumps off.",
      question: "The board oscillates several times before stopping. This indicates:",
      options: [
        "The board is critically damped",
        "The board is overdamped",
        "The board is underdamped",
        "The board has no damping"
      ],
      correctIndex: 2,
      explanation: "Multiple oscillations with decreasing amplitude is the signature of an underdamped system (ζ < 1)."
    },
    {
      scenario: "An analog meter needle moves to show a new reading.",
      question: "Why do quality meters often have ζ ≈ 0.7 rather than exactly ζ = 1?",
      options: [
        "To make readings more dramatic",
        "One small overshoot helps the eye track the final position",
        "Critical damping is too expensive",
        "They couldn't achieve critical damping"
      ],
      correctIndex: 1,
      explanation: "Slightly underdamped response (ζ ≈ 0.7) creates one small overshoot that helps users see exactly where the needle settles."
    },
    {
      scenario: "You're designing a building's earthquake dampers in a seismic zone.",
      question: "What happens if you accidentally make them overdamped?",
      options: [
        "The building responds too slowly to ground motion",
        "The building oscillates dangerously",
        "The dampers work perfectly",
        "The building becomes more rigid"
      ],
      correctIndex: 0,
      explanation: "Overdamped systems respond slowly. During an earthquake, if dampers are overdamped, the building can't dissipate energy fast enough."
    },
    {
      scenario: "A smartphone screen protector absorbs impact when you drop your phone.",
      question: "The protector works by providing:",
      options: [
        "More mass to slow the fall",
        "Damping to absorb and dissipate impact energy",
        "Spring force to bounce the phone",
        "Friction against your hand"
      ],
      correctIndex: 1,
      explanation: "Screen protectors with shock-absorbing layers provide damping that converts impact kinetic energy into heat, reducing peak force on the screen."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🚗",
      title: "Automotive Suspension",
      tagline: "Turning bumpy roads into smooth rides",
      description: "Car shock absorbers are carefully tuned dampers that work with springs to dissipate road vibration energy. Near-critical damping provides comfort and control.",
      connection: "Damping ratio ~0.7-1.0, settling time 1-2 seconds, absorbing 85% of energy per cycle."
    },
    {
      icon: "🏢",
      title: "Building Earthquake Dampers",
      tagline: "Protecting skyscrapers from seismic destruction",
      description: "Tall buildings use massive damping systems like Tuned Mass Dampers (hundreds of tons) to absorb earthquake energy and prevent structural damage.",
      connection: "Taipei 101's 730-ton pendulum damper reduces sway by 30-40% during earthquakes."
    },
    {
      icon: "📱",
      title: "MEMS Accelerometers",
      tagline: "Sensing motion in microscopic springs",
      description: "Smartphone accelerometers use microscopic mass-spring-damper systems. Squeeze-film air damping provides near-critical response for fast, accurate measurements.",
      connection: "Proof mass ~100μm, damping ratio 0.5-0.8, bandwidth 1-10 kHz."
    },
    {
      icon: "🎛️",
      title: "Precision Instrument Movements",
      tagline: "Making needles settle where you need them",
      description: "Analog meters use air, fluid, or eddy-current damping tuned to ζ ≈ 0.7 for optimal visual response - fast enough to track changes, with slight overshoot for visibility.",
      connection: "Optimal damping ratio 0.6-0.8, settling time 0.5-2 seconds, allowing 1-5% overshoot."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate displacement based on damping regime
  private calculateDisplacement(t: number, zeta: number, x0: number): number {
    const omega_n = NATURAL_FREQUENCY;

    if (zeta < 1) {
      // Underdamped: x(t) = A * e^(-ζω_n*t) * cos(ω_d*t)
      const omega_d = omega_n * Math.sqrt(1 - zeta * zeta);
      return x0 * Math.exp(-zeta * omega_n * t) * Math.cos(omega_d * t);
    } else if (Math.abs(zeta - 1) < 0.05) {
      // Critically damped: x(t) = (A + Bt) * e^(-ω_n*t)
      return x0 * (1 + omega_n * t) * Math.exp(-omega_n * t);
    } else {
      // Overdamped: x(t) = A*e^(s1*t) + B*e^(s2*t)
      const s1 = -omega_n * (zeta - Math.sqrt(zeta * zeta - 1));
      const s2 = -omega_n * (zeta + Math.sqrt(zeta * zeta - 1));
      const A = x0 * s2 / (s2 - s1);
      const B = -x0 * s1 / (s2 - s1);
      return A * Math.exp(s1 * t) + B * Math.exp(s2 * t);
    }
  }

  // Get damping regime label
  private getRegimeLabel(zeta: number): string {
    if (zeta < 0.95) return 'Underdamped';
    if (zeta > 1.05) return 'Overdamped';
    return 'Critically Damped';
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
      if (input.id === 'damping_ratio') {
        this.dampingRatio = Math.max(0.05, Math.min(2.0, input.value));
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
            this.prediction = parseInt(buttonId.split('_')[1]);
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
        }
        break;

      case 'play':
        if (buttonId === 'release') {
          this.time = 0;
          this.displacement = 100;
          this.isAnimating = true;
        } else if (buttonId === 'continue') {
          this.phase = 'review';
          this.isAnimating = false;
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
        if (buttonId === 'continue') {
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

  processInput(input: UserInput, config: SessionConfig): void {
    this.handleInput(input);
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.dampingRatio = 0.2;
    this.displacement = 100;
    this.time = 0;
    this.isAnimating = false;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    if (this.isAnimating) {
      this.time += deltaTime;
      this.displacement = this.calculateDisplacement(this.time, this.dampingRatio, 100);

      // Stop animation when settled
      if (Math.abs(this.displacement) < 1 && this.time > 2) {
        this.isAnimating = false;
      }
      if (this.time > 15) {
        this.isAnimating = false;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(6, 182, 212, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(59, 130, 246, 0.05)' });

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
    // Badge
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(6, 182, 212, 0.1)' });
    r.text(200, 80, 'MECHANICS', { fill: '#22d3ee', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, "Why Don't Car Rides", { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Feel Like Trampolines?', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 195, 'The hidden physics of smooth suspension', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Car illustration
    r.roundRect(100, 230, 200, 120, 16, { fill: 'rgba(30, 41, 59, 0.8)' });

    // Simple car shape
    r.roundRect(140, 270, 120, 40, 8, { fill: '#3b82f6' });
    r.roundRect(160, 250, 80, 30, 6, { fill: '#60a5fa' });

    // Wheels
    r.circle(165, 310, 15, { fill: '#1f2937' });
    r.circle(165, 310, 8, { fill: '#64748b' });
    r.circle(235, 310, 15, { fill: '#1f2937' });
    r.circle(235, 310, 8, { fill: '#64748b' });

    // Bump
    r.arc(200, 330, 30, Math.PI, 0, { fill: '#4b5563' });

    // Fact card
    r.roundRect(40, 370, 320, 120, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 400, 'Springs compress when you hit bumps,', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 420, "but why doesn't your car keep bouncing", { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 440, 'up and down for minutes?', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 470, 'What invisible force stops the oscillation?', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Discover the Physics', variant: 'primary' });

    r.setCoachMessage('Explore how damping controls oscillations!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'You pull a mass down on a spring', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'and release it. After a few bounces, it stops.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 185, 'What removes energy from the system?', { fill: '#22d3ee', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Gravity eventually overcomes spring force',
      'Damping forces convert kinetic energy to heat',
      'The spring loses its elasticity over time',
      'Air pressure pushes the mass to equilibrium'
    ];

    options.forEach((option, i) => {
      const y = 220 + i * 65;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (i === 1) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.prediction) {
        bgColor = 'rgba(6, 182, 212, 0.3)';
      }

      r.roundRect(30, y, 340, 55, 10, { fill: bgColor });
      r.text(50, y + 32, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 500, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Excellent prediction!' : 'The answer: Damping converts kinetic energy to heat!';
      r.text(200, 530, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 560, "Let's explore how damping works!", { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Explore the Physics', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Damped Oscillation Lab', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization area
    r.roundRect(20, 80, 360, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Ceiling
    r.rect(40, 95, 180, 15, { fill: '#374151' });

    // Spring visualization (simplified zigzag)
    const springTop = 110;
    const springBottom = 180 - this.displacement * 0.3;
    const springMid = (springTop + springBottom) / 2;

    r.line(130, springTop, 130, springMid - 10, { stroke: '#f59e0b', strokeWidth: 3 });
    r.line(130, springMid - 10, 120, springMid, { stroke: '#f59e0b', strokeWidth: 3 });
    r.line(120, springMid, 140, springMid + 5, { stroke: '#f59e0b', strokeWidth: 3 });
    r.line(140, springMid + 5, 120, springMid + 10, { stroke: '#f59e0b', strokeWidth: 3 });
    r.line(120, springMid + 10, 130, springBottom, { stroke: '#f59e0b', strokeWidth: 3 });

    // Damper visualization
    r.rect(155, 110, 20, springBottom - 110, { fill: '#64748b' });
    r.rect(150, springBottom - 15, 30, 20, { fill: '#94a3b8' });

    // Mass
    const massY = 200 - this.displacement * 0.4;
    const regime = this.getRegimeLabel(this.dampingRatio);
    const massColor = regime === 'Underdamped' ? '#06b6d4' : regime === 'Critically Damped' ? '#22c55e' : '#f59e0b';
    r.roundRect(100, massY, 60, 40, 5, { fill: massColor });
    r.text(130, massY + 25, Math.round(this.displacement).toString(), { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Equilibrium line
    r.line(80, 200, 180, 200, { stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4' });
    r.text(190, 205, 'Eq', { fill: '#64748b', fontSize: 10 });

    // Graph
    r.rect(240, 110, 120, 100, { fill: '#0f172a' });
    r.line(250, 160, 350, 160, { stroke: '#374151', strokeWidth: 1 });
    r.text(300, 220, 'Time', { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });

    // Graph curve based on regime
    if (regime === 'Underdamped') {
      r.text(300, 135, 'Oscillating', { fill: '#06b6d4', fontSize: 10, textAnchor: 'middle' });
    } else if (regime === 'Critically Damped') {
      r.text(300, 135, 'Fastest Return', { fill: '#22c55e', fontSize: 10, textAnchor: 'middle' });
    } else {
      r.text(300, 135, 'Slow Return', { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle' });
    }

    // Slider for damping ratio
    r.addSlider({
      id: 'damping_ratio',
      label: `Damping Ratio (ζ): ${this.dampingRatio.toFixed(2)} - ${regime}`,
      min: 0.05,
      max: 2.0,
      step: 0.05,
      value: this.dampingRatio
    });

    // Time display
    r.roundRect(240, 235, 120, 50, 10, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.text(300, 258, `${this.time.toFixed(1)}s`, { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(300, 278, 'Elapsed Time', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Control buttons
    if (!this.isAnimating) {
      r.addButton({ id: 'release', label: 'Release Mass', variant: 'primary' });
    }
    r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'secondary' });

    // Regime explanation
    r.roundRect(30, 380, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
    r.text(200, 405, 'The Three Damping Regimes:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(50, 430, 'ζ < 1: Underdamped - oscillates with decay', { fill: '#06b6d4', fontSize: 11 });
    r.text(50, 450, 'ζ = 1: Critical - fastest return, no overshoot', { fill: '#22c55e', fontSize: 11 });
    r.text(50, 470, 'ζ > 1: Overdamped - slow return, no oscillation', { fill: '#f59e0b', fontSize: 11 });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'Understanding Damped Oscillations', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Governing equation
    r.roundRect(30, 80, 340, 130, 16, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 110, 'The Governing Equation', { fill: '#22d3ee', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(60, 125, 280, 35, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 150, 'm(d²x/dt²) + c(dx/dt) + kx = 0', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(80, 185, 'm = mass', { fill: '#cbd5e1', fontSize: 11 });
    r.text(180, 185, 'c = damping', { fill: '#cbd5e1', fontSize: 11 });
    r.text(280, 185, 'k = stiffness', { fill: '#cbd5e1', fontSize: 11 });

    // Damping ratio
    r.roundRect(30, 220, 340, 110, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 250, 'The Damping Ratio', { fill: '#34d399', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(100, 265, 200, 35, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 290, 'ζ = c / (2√(mk))', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });
    r.text(200, 320, 'Determines oscillation behavior!', { fill: '#34d399', fontSize: 12, textAnchor: 'middle' });

    // Energy dissipation
    r.roundRect(30, 345, 340, 120, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 375, 'Energy Dissipation', { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 405, 'Without damping: energy oscillates forever', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 425, 'With damping: Power = c × v²', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 450, 'Energy converts to heat in shock absorbers!', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore a Twist', variant: 'secondary' });

    r.setCoachMessage('Now discover why engineers sometimes prefer ζ ≠ 1...');
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist Challenge', { fill: '#a855f7', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, "You're designing a voltmeter needle.", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'It must show readings clearly to humans.', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 180, 'Why use ζ ≈ 0.7 instead of ζ = 1?', { fill: '#a855f7', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Critical damping is too expensive',
      'Underdamping makes the needle move faster',
      'A slight overshoot helps track the final position',
      'Overdamping looks more professional'
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (i === 2) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.twistPrediction) {
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 2 ? 'Exactly right!' : 'The slight overshoot helps humans!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 530, 'Human perception benefits from one small', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 550, 'overshoot to identify where the needle settles.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See the Difference', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Optimal vs Critical Damping', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Critical damping side
    r.roundRect(25, 85, 170, 180, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(110, 110, 'Critical (ζ = 1)', { fill: '#22c55e', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(45, 125, 130, 80, { fill: '#0f172a' });
    r.line(55, 165, 165, 165, { stroke: '#374151', strokeWidth: 1 });
    r.line(55, 145, 165, 145, { stroke: '#22c55e', strokeWidth: 1, strokeDasharray: '4' });
    // Smooth approach curve
    r.text(110, 220, 'Smooth approach', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 240, 'Hard to see when it stops', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Optimal damping side
    r.roundRect(205, 85, 170, 180, 12, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(290, 110, 'Optimal (ζ ≈ 0.7)', { fill: '#06b6d4', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(225, 125, 130, 80, { fill: '#0f172a' });
    r.line(235, 165, 345, 165, { stroke: '#374151', strokeWidth: 1 });
    r.line(235, 145, 345, 145, { stroke: '#06b6d4', strokeWidth: 1, strokeDasharray: '4' });
    // Overshoot indicator
    r.circle(290, 140, 4, { fill: '#f59e0b' });
    r.text(290, 130, 'Overshoot!', { fill: '#f59e0b', fontSize: 8, textAnchor: 'middle' });
    r.text(290, 220, 'Slight overshoot', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 240, 'Eye tracks final position', { fill: '#06b6d4', fontSize: 10, textAnchor: 'middle' });

    // The 4% rule
    r.roundRect(30, 280, 340, 130, 16, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 310, 'The 4% Overshoot Rule:', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 340, 'At ζ ≈ 0.7, overshoot is about 4-5%', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 360, 'Small enough not to mislead', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 380, 'Visible enough to help tracking', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 400, 'Rise time is actually faster than critical!', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review This Discovery', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Key Discovery', { fill: '#a855f7', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 85, 340, 200, 16, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 115, 'Context Determines "Optimal" Damping!', { fill: '#a855f7', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Use Critical
    r.roundRect(40, 135, 150, 130, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(115, 158, 'Use Critical (ζ = 1):', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(50, 180, '• Automated systems', { fill: '#cbd5e1', fontSize: 10 });
    r.text(50, 198, '• Digital sensors', { fill: '#cbd5e1', fontSize: 10 });
    r.text(50, 216, '• Robotic positioning', { fill: '#cbd5e1', fontSize: 10 });
    r.text(50, 234, '• Emergency shutoffs', { fill: '#cbd5e1', fontSize: 10 });

    // Use Slight Under
    r.roundRect(210, 135, 150, 130, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(285, 158, 'Use ζ ≈ 0.7:', { fill: '#06b6d4', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(220, 180, '• Analog meters', { fill: '#cbd5e1', fontSize: 10 });
    r.text(220, 198, '• UI animations', { fill: '#cbd5e1', fontSize: 10 });
    r.text(220, 216, '• Vehicle suspension feel', { fill: '#cbd5e1', fontSize: 10 });
    r.text(220, 234, '• Audio speakers', { fill: '#cbd5e1', fontSize: 10 });

    r.roundRect(30, 300, 340, 60, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 335, 'Engineering is about choosing the right trade-off!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#0891b2';
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

    // Description (multi-line)
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
    r.roundRect(40, 320, 320, 70, 10, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 345, 'Physics Connection', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 370, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 420, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 460, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

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
      r.roundRect(25, 100, 350, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      const scenarioShort = question.scenario.substring(0, 80) + (question.scenario.length > 80 ? '...' : '');
      r.text(200, 130, scenarioShort.substring(0, 45), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      if (scenarioShort.length > 45) {
        r.text(200, 148, scenarioShort.substring(45), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      }

      // Question
      r.text(200, 200, question.question.substring(0, 50), { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 230 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(6, 182, 212, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 42, 8, { fill: bgColor });
        r.text(40, y + 26, `${String.fromCharCode(65 + i)}. ${option.substring(0, 45)}${option.length > 45 ? '...' : ''}`, { fill: isSelected ? '#22d3ee' : '#e2e8f0', fontSize: 10 });

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
        r.text(200, 480, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "Excellent! You've mastered damping!" : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 140, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 340, 'Damping ratio: ζ = c / (2√(mk))', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 360, 'Three regimes: under, critical, over', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 380, 'Energy dissipation through damping', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 400, 'Real-world applications', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Trophy
    r.text(200, 120, '🎛️', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Damped Oscillations Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand how damping controls motion!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '📉', label: 'Damping Ratio' },
      { icon: '⚡', label: 'Energy Dissipation' },
      { icon: '🚗', label: 'Suspension Design' },
      { icon: '🏗️', label: 'Seismic Protection' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 280 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 450, 300, 70, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 478, 'Key Formula', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 505, 'ζ = c / (2√(mk))', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering damped oscillations!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      dampingRatio: this.dampingRatio,
      displacement: this.displacement,
      time: this.time,
      isAnimating: this.isAnimating,
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
    if (state.dampingRatio !== undefined) this.dampingRatio = state.dampingRatio as number;
    if (state.displacement !== undefined) this.displacement = state.displacement as number;
    if (state.time !== undefined) this.time = state.time as number;
    if (state.isAnimating !== undefined) this.isAnimating = state.isAnimating as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createDampingGame(sessionId: string): DampingGame {
  return new DampingGame(sessionId);
}
