import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// WATER HAMMER GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: ΔP = ρ × c × Δv (Joukowsky equation)
// Water hammer occurs when fluid momentum is suddenly arrested
// Pressure wave travels at speed of sound in fluid (~1400 m/s for water)
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
const WATER_DENSITY = 1000; // kg/m³
const SOUND_SPEED_WATER = 1400; // m/s
const GRAVITY = 9.81; // m/s²

export class WaterHammerGame extends BaseGame {
  readonly gameType = 'water_hammer';
  readonly gameTitle = 'Water Hammer: The Pipe Destroyer';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private flowVelocity = 3; // m/s
  private pipeLength = 100; // meters
  private closureTime = 0.01; // seconds (for twist)
  private animationTime = 0;

  // Play phase state
  private valveOpen = true;
  private wavePosition = 0;
  private maxPressure = 0;
  private pressureWave: number[] = [];
  private hasClosedValve = false;
  private animating = false;

  // Twist phase state
  private twistAnimating = false;
  private twistPressureHistory: number[] = [];

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "A plumber notices loud banging noises in pipes when faucets are quickly shut off.",
      question: "What is water hammer?",
      options: [
        "A tool for plumbing",
        "A pressure surge when flow suddenly stops",
        "Water freezing in pipes",
        "A type of water pump"
      ],
      correctIndex: 1,
      explanation: "Water hammer is the pressure surge caused when fluid in motion is suddenly stopped or redirected, creating a shockwave in the pipe."
    },
    {
      scenario: "You quickly close a faucet and hear a loud bang in the pipes.",
      question: "What causes this loud bang?",
      options: [
        "Air bubbles collapsing",
        "Pipe expansion",
        "Kinetic energy converting to pressure energy",
        "Vibrating water molecules"
      ],
      correctIndex: 2,
      explanation: "The flowing water's kinetic energy converts to pressure energy when suddenly stopped, creating a pressure wave that makes pipes vibrate and bang."
    },
    {
      scenario: "An engineer is analyzing water hammer risk in a pipeline system.",
      question: "According to the Joukowsky equation, what happens if you double the water velocity?",
      options: [
        "Pressure rise halves",
        "Pressure rise doubles",
        "Pressure rise quadruples",
        "No change in pressure"
      ],
      correctIndex: 1,
      explanation: "The Joukowsky equation (ΔP = ρcΔv) shows pressure rise is directly proportional to velocity change - double velocity means double pressure."
    },
    {
      scenario: "A technician is measuring pressure wave propagation in a water pipe.",
      question: "At what speed does the pressure wave travel in water pipes?",
      options: [
        "Speed of the water flow",
        "Speed of sound in water (~1400 m/s)",
        "Speed of light",
        "Much slower than water flow"
      ],
      correctIndex: 1,
      explanation: "The pressure wave travels at the speed of sound in the fluid, which is about 1400 m/s for water in pipes."
    },
    {
      scenario: "An engineer calculates the critical time for a 100m pipe with water (c = 1400 m/s).",
      question: "What is the critical time (Tc) in water hammer analysis?",
      options: [
        "Time before pipe bursts",
        "Time for wave to travel pipe length and back (2L/c)",
        "Time to close the valve",
        "Time for water to stop flowing"
      ],
      correctIndex: 1,
      explanation: "Critical time Tc = 2L/c is the time for the pressure wave to travel the pipe length and reflect back. It determines if closure is 'fast' or 'slow'."
    },
    {
      scenario: "A facility manager wants to reduce water hammer damage in their building.",
      question: "How can water hammer damage be reduced?",
      options: [
        "Using smaller pipes",
        "Increasing water pressure",
        "Closing valves slowly",
        "Using hotter water"
      ],
      correctIndex: 2,
      explanation: "Closing valves slowly over a time greater than the critical time allows the pressure wave to dissipate gradually, reducing peak pressure."
    },
    {
      scenario: "A plumber recommends installing a water hammer arrestor near the washing machine.",
      question: "What is a water hammer arrestor?",
      options: [
        "A device that stops water flow",
        "A cushioning device with air or gas",
        "A type of water filter",
        "A pipe insulation"
      ],
      correctIndex: 1,
      explanation: "Water hammer arrestors contain a compressible cushion (air or gas) that absorbs the shock wave, preventing pipe damage and noise."
    },
    {
      scenario: "An engineer compares water hammer risk in a 50m vs 500m pipeline.",
      question: "Why is water hammer worse in long pipes?",
      options: [
        "More water means more momentum",
        "Pipes are weaker when longer",
        "Sound travels slower in long pipes",
        "Long pipes have more friction"
      ],
      correctIndex: 0,
      explanation: "Longer pipes contain more water in motion, meaning more total momentum that converts to pressure when flow is stopped."
    },
    {
      scenario: "A student is analyzing the Joukowsky equation ΔP = ρcΔv.",
      question: "In this equation, what does 'c' represent?",
      options: [
        "Water temperature",
        "Pipe circumference",
        "Speed of sound in fluid",
        "Closure time"
      ],
      correctIndex: 2,
      explanation: "In the Joukowsky equation, 'c' is the speed of sound in the fluid (about 1400 m/s for water), which determines wave propagation speed."
    },
    {
      scenario: "An engineer calculates pressure rise for water flowing at 3 m/s that suddenly stops.",
      question: "What pressure rise occurs when water flowing at 3 m/s suddenly stops? (ρ=1000 kg/m³, c=1400 m/s)",
      options: [
        "4,200 Pa",
        "42,000 Pa (0.42 bar)",
        "420,000 Pa (4.2 bar)",
        "4,200,000 Pa (42 bar)"
      ],
      correctIndex: 3,
      explanation: "Using ΔP = ρcΔv = 1000 × 1400 × 3 = 4,200,000 Pa ≈ 42 bar. This is why water hammer can burst pipes!"
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🚰",
      title: "Household Plumbing",
      tagline: "Banging pipes when faucets close quickly",
      description: "The annoying banging in home pipes is water hammer. Hammer arrestors are installed near washing machines and dishwashers to absorb shocks.",
      connection: "When you quickly close a faucet, the sudden stop creates a pressure wave that travels at 1400 m/s through your pipes."
    },
    {
      icon: "🏭",
      title: "Hydroelectric Dams",
      tagline: "Emergency valve closure protection",
      description: "Surge tanks and slow-closing valves protect turbines. The Hoover Dam uses massive surge chambers to handle 500+ m³/s flow changes.",
      connection: "Turbine shutdowns must happen slowly to avoid water hammer that could damage the massive penstocks."
    },
    {
      icon: "❤️",
      title: "Heart & Blood Vessels",
      tagline: "Aortic valve closure creates pulse",
      description: "The 'lub-dub' heartbeat partially comes from valve closure. The dicrotic notch in pulse waves is a mini water hammer from aortic valve closing.",
      connection: "Your cardiovascular system experiences water hammer effects every heartbeat!"
    },
    {
      icon: "⛽",
      title: "Oil & Gas Pipelines",
      tagline: "Pump shutdown protection",
      description: "Thousand-kilometer pipelines need careful transient analysis. The Alaska Pipeline uses multiple surge control systems to prevent catastrophic pressure waves.",
      connection: "Pipeline operators use slow valve actuators and surge tanks to manage the massive momentum of oil flow."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate pressure rise using Joukowsky equation
  private calculatePressureRise(velocity: number): number {
    // ΔP = ρ × c × Δv
    return WATER_DENSITY * SOUND_SPEED_WATER * velocity;
  }

  // PROTECTED: Convert Pascals to bars
  private pressureInBars(pascals: number): number {
    return pascals / 100000;
  }

  // PROTECTED: Calculate critical time
  private calculateCriticalTime(): number {
    return (2 * this.pipeLength) / SOUND_SPEED_WATER;
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
      if (input.id === 'flow_velocity') {
        this.flowVelocity = Math.max(1, Math.min(6, input.value));
        if (!this.valveOpen) this.resetSimulation();
      } else if (input.id === 'closure_time') {
        this.closureTime = Math.max(0.01, Math.min(0.3, input.value));
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
          this.resetSimulation();
        }
        break;

      case 'play':
        if (buttonId === 'close_valve' && this.valveOpen && !this.animating) {
          this.closeValve();
        } else if (buttonId === 'reset') {
          this.resetSimulation();
        } else if (buttonId === 'continue' && this.hasClosedValve && !this.animating) {
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
          this.twistPressureHistory = [];
        }
        break;

      case 'twist_play':
        if (buttonId === 'simulate' && !this.twistAnimating) {
          this.simulateSlowClosure();
        } else if (buttonId === 'continue' && this.twistPressureHistory.length > 0 && !this.twistAnimating) {
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

  private closeValve(): void {
    this.animating = true;
    this.valveOpen = false;
    this.hasClosedValve = true;

    const peakPressure = this.calculatePressureRise(this.flowVelocity);
    this.maxPressure = peakPressure;

    // Generate pressure wave
    const steps = 60;
    const wave: number[] = [];

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const damping = Math.exp(-t * 3);
      const oscillation = Math.cos(t * Math.PI * 6);
      wave.push(peakPressure * damping * oscillation);
    }

    this.pressureWave = wave;
    this.wavePosition = 0;
  }

  private simulateSlowClosure(): void {
    this.twistAnimating = true;
    this.twistPressureHistory = [];

    const criticalTime = this.calculateCriticalTime();
    const effectiveVelocityChange = this.closureTime < criticalTime
      ? this.flowVelocity
      : this.flowVelocity * (criticalTime / this.closureTime);

    const peakPressure = this.calculatePressureRise(effectiveVelocityChange);
    const steps = 100;
    const history: number[] = [];

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const riseTime = Math.min(this.closureTime / criticalTime, 1);

      if (t < riseTime) {
        history.push(peakPressure * (t / riseTime));
      } else {
        const decay = Math.exp(-(t - riseTime) * 5);
        const oscillation = Math.cos((t - riseTime) * Math.PI * 8) * 0.3 + 0.7;
        history.push(peakPressure * decay * oscillation);
      }
    }

    this.twistPressureHistory = history;
  }

  private resetSimulation(): void {
    this.valveOpen = true;
    this.pressureWave = [];
    this.wavePosition = 0;
    this.maxPressure = 0;
    this.animating = false;
    this.hasClosedValve = false;
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
    this.flowVelocity = 3;
    this.pipeLength = 100;
    this.closureTime = 0.01;
    this.resetSimulation();
    this.twistPressureHistory = [];
    this.twistAnimating = false;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Animate valve closure
    if (this.animating && this.wavePosition < 100) {
      this.wavePosition += deltaTime * 40;
      if (this.wavePosition >= 100) {
        this.wavePosition = 100;
        this.animating = false;
      }
    }

    // Animate twist simulation
    if (this.twistAnimating) {
      // The twist pressure history is already calculated, just mark as complete
      this.twistAnimating = false;
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(59, 130, 246, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(239, 68, 68, 0.05)' });

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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(59, 130, 246, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#60a5fa', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Pipe Destroyer', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'What happens when water suddenly stops?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Pipe illustration
    r.roundRect(50, 220, 300, 60, 5, { fill: '#334155' });
    r.rect(55, 230, 240, 40, { fill: '#3b82f6' });

    // Valve
    r.rect(300, 200, 30, 100, { fill: '#ef4444' });
    r.rect(290, 190, 50, 15, { fill: '#ef4444' });

    // BANG text
    r.text(200, 360, '💥 BANG! 💥', { fill: '#f87171', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 390, 320, 120, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 420, 'Water hammer can generate pressures', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 450, 'over 40 bar!', { fill: '#ef4444', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 485, 'Enough to burst pipes and damage equipment', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Investigate the Pressure Wave', variant: 'primary' });

    r.setCoachMessage('Have you heard pipes BANG when someone quickly shuts off a faucet?');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'Water is flowing through a pipe at 3 m/s.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'If you instantly close a valve,', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 185, 'what happens to the pressure?', { fill: '#60a5fa', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Pressure drops as water slows down',
      'Pressure stays the same',
      'Pressure rises dramatically'
    ];

    options.forEach((option, i) => {
      const y = 220 + i * 70;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (i === 2) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (String.fromCharCode(97 + i) === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (String.fromCharCode(97 + i) === this.prediction) {
        bgColor = 'rgba(59, 130, 246, 0.3)';
      }

      r.roundRect(30, y, 340, 55, 10, { fill: bgColor });
      r.text(50, y + 32, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 13 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${String.fromCharCode(97 + i)}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 450, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 'c' ? 'Correct!' : 'The answer: Pressure rises dramatically!';
      r.text(200, 480, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 510, "This is water hammer - let's see it!", { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Experiment', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Water Hammer Simulator', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization area
    r.roundRect(20, 80, 360, 220, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Pipe
    r.rect(40, 140, 260, 50, { fill: '#475569' });
    r.rect(45, 145, 250, 40, { fill: this.valveOpen ? 'rgba(59, 130, 246, 0.5)' : 'rgba(30, 64, 175, 0.5)' });

    // Pressure wave visualization
    if (!this.valveOpen && this.wavePosition > 0) {
      const waveX = 295 - this.wavePosition * 2.5;
      r.rect(waveX, 145, 20, 40, { fill: 'rgba(239, 68, 68, 0.8)' });
    }

    // Flow particles (when valve is open)
    if (this.valveOpen) {
      for (let i = 0; i < 5; i++) {
        const baseX = 60 + i * 45;
        const animOffset = (this.animationTime * 50 + i * 45) % 225;
        r.circle(baseX + animOffset - 45, 165, 8, { fill: '#60a5fa' });
      }
    }

    // Valve
    const valveHeight = this.valveOpen ? 70 : 40;
    const valveY = this.valveOpen ? 130 : 145;
    r.rect(300, valveY, 25, valveHeight, { fill: this.valveOpen ? '#22c55e' : '#ef4444' });
    r.rect(295, 120, 35, 15, { fill: '#94a3b8' });

    // Valve status
    r.text(312, 220, this.valveOpen ? 'OPEN' : 'CLOSED', { fill: this.valveOpen ? '#22c55e' : '#ef4444', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    // Pressure gauge
    r.circle(200, 260, 40, { fill: '#1e293b' });
    r.circle(200, 260, 35, { fill: '#0f172a' });

    // Gauge needle
    const currentPressure = this.pressureWave.length > 0
      ? Math.abs(this.pressureWave[Math.min(Math.floor(this.wavePosition / 100 * this.pressureWave.length), this.pressureWave.length - 1)])
      : 0;
    const pressureBars = this.pressureInBars(currentPressure);
    const needleAngle = -135 + Math.min(pressureBars, 50) * 5.4;
    const needleRad = needleAngle * Math.PI / 180;
    r.line(200, 260, 200 + Math.cos(needleRad) * 25, 260 + Math.sin(needleRad) * 25, { stroke: '#ef4444', strokeWidth: 3 });
    r.circle(200, 260, 5, { fill: '#ef4444' });

    // Labels
    r.text(200, 85, `Flow velocity: ${this.flowVelocity} m/s | Pipe: ${this.pipeLength}m`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    if (this.maxPressure > 0) {
      r.text(200, 100, `Peak pressure: ${this.pressureInBars(this.maxPressure).toFixed(1)} bar!`, { fill: '#ef4444', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Slider
    r.addSlider({
      id: 'flow_velocity',
      label: 'Flow Velocity (m/s)',
      min: 1,
      max: 6,
      step: 0.5,
      value: this.flowVelocity
    });

    // Buttons
    if (this.valveOpen) {
      r.addButton({ id: 'close_valve', label: '⚡ CLOSE VALVE INSTANTLY', variant: 'danger' });
    } else {
      r.addButton({ id: 'reset', label: '🔄 Reset & Try Again', variant: 'secondary' });
    }

    if (this.hasClosedValve && !this.animating) {
      r.addButton({ id: 'continue', label: 'Learn the Physics', variant: 'primary' });
    }

    r.setCoachMessage('Close the valve to see what happens!');
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 50, 'The Physics of Water Hammer', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Joukowsky equation card
    r.roundRect(30, 80, 340, 160, 16, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 110, 'Joukowsky Equation', { fill: '#60a5fa', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Formula box
    r.roundRect(70, 130, 260, 45, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 160, 'ΔP = ρ × c × Δv', { fill: '#ffffff', fontSize: 18, textAnchor: 'middle' });

    // Variables
    r.text(80, 200, 'ρ = density (1000 kg/m³)', { fill: '#cbd5e1', fontSize: 11 });
    r.text(230, 200, 'c = sound speed (1400 m/s)', { fill: '#cbd5e1', fontSize: 11 });
    r.text(150, 220, 'Δv = velocity change', { fill: '#cbd5e1', fontSize: 11 });

    // Key insight card
    r.roundRect(30, 250, 340, 100, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 280, 'Key Insight', { fill: '#34d399', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 310, 'ΔP ∝ Δv', { fill: '#ffffff', fontSize: 18, textAnchor: 'middle' });
    r.text(200, 335, 'Double velocity = Double pressure!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Example calculation
    r.roundRect(30, 365, 340, 120, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 395, 'Example: Water at 3 m/s suddenly stopped', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 425, 'ΔP = 1000 × 1400 × 3', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 455, '= 4,200,000 Pa = 42 bar!', { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Try a Twist! 🔧', variant: 'secondary' });

    r.setCoachMessage("Now let's see what happens with slow valve closure...");
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Critical Time Challenge', { fill: '#a855f7', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 120, 'What if instead of closing the valve instantly,', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 145, 'you close it SLOWLY?', { fill: '#a855f7', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 180, 'What do you predict will happen?', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    // Options
    const options = [
      'Same pressure regardless of closure speed',
      'Slow closure causes HIGHER pressure',
      'Slow closure REDUCES peak pressure'
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 65;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (i === 2) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (String.fromCharCode(97 + i) === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (String.fromCharCode(97 + i) === this.twistPrediction) {
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 55, 10, { fill: bgColor });
      r.text(50, y + 32, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${String.fromCharCode(97 + i)}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 420, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 'c' ? 'Exactly right!' : 'Slow closure REDUCES peak pressure!';
      r.text(200, 450, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 480, 'The key is the critical time (2L/c)', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 500, 'for wave reflection.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Comparison', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Closure Speed Comparison', { fill: '#a855f7', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    const criticalTime = this.calculateCriticalTime();
    const effectiveVelocity = this.closureTime < criticalTime
      ? this.flowVelocity
      : this.flowVelocity * (criticalTime / this.closureTime);
    const peakPressure = this.pressureInBars(this.calculatePressureRise(effectiveVelocity));

    // Graph area
    r.roundRect(30, 80, 340, 180, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Graph axes
    r.line(60, 240, 350, 240, { stroke: '#64748b', strokeWidth: 1 });
    r.line(60, 100, 60, 240, { stroke: '#64748b', strokeWidth: 1 });

    // Y-axis label
    r.text(45, 170, 'P', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // X-axis label
    r.text(205, 255, 'Time', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Critical time marker
    const tcX = 60 + (criticalTime / 0.3) * 290;
    r.line(tcX, 100, tcX, 240, { stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5,5' });
    r.text(tcX, 265, `Tc = ${(criticalTime * 1000).toFixed(0)}ms`, { fill: '#3b82f6', fontSize: 9, textAnchor: 'middle' });

    // Pressure curve (simplified)
    if (this.twistPressureHistory.length > 0) {
      const maxP = Math.max(...this.twistPressureHistory);
      for (let i = 1; i < Math.min(this.twistPressureHistory.length, 50); i++) {
        const x1 = 60 + (i - 1) * 5.8;
        const x2 = 60 + i * 5.8;
        const y1 = 240 - (this.twistPressureHistory[i - 1] / maxP) * 120;
        const y2 = 240 - (this.twistPressureHistory[i] / maxP) * 120;
        r.line(x1, y1, x2, y2, { stroke: '#ef4444', strokeWidth: 2 });
      }
    }

    // Info panels
    r.roundRect(30, 290, 110, 60, 8, { fill: 'rgba(59, 130, 246, 0.1)' });
    r.text(85, 310, 'Critical Time', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(85, 335, `${(criticalTime * 1000).toFixed(0)} ms`, { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(145, 290, 110, 60, 8, { fill: 'rgba(251, 191, 36, 0.1)' });
    r.text(200, 310, 'Closure Time', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 335, `${(this.closureTime * 1000).toFixed(0)} ms`, { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const safeColor = this.closureTime > criticalTime ? '#22c55e' : '#ef4444';
    r.roundRect(260, 290, 110, 60, 8, { fill: this.closureTime > criticalTime ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' });
    r.text(315, 310, 'Peak Pressure', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(315, 335, `${peakPressure.toFixed(1)} bar`, { fill: safeColor, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Slider
    r.addSlider({
      id: 'closure_time',
      label: `Closure Time: ${(this.closureTime * 1000).toFixed(0)} ms ${this.closureTime < criticalTime ? '(FAST - danger!)' : '(SLOW - safe)'}`,
      min: 0.01,
      max: 0.3,
      step: 0.01,
      value: this.closureTime
    });

    // Buttons
    r.addButton({ id: 'simulate', label: 'Run Simulation', variant: 'secondary' });

    if (this.twistPressureHistory.length > 0) {
      r.addButton({ id: 'continue', label: 'Understand Why', variant: 'primary' });
    }
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 50, 'Critical Time: The Key to Safety', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Formula card
    r.roundRect(30, 80, 340, 140, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 110, 'The Critical Time', { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(70, 125, 260, 40, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 152, 'Tc = 2L / c', { fill: '#ffffff', fontSize: 18, textAnchor: 'middle' });

    r.text(200, 190, 'Time for wave to travel pipe and back', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // What happens card
    r.roundRect(30, 235, 340, 130, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 260, 'What happens:', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(50, 290, '• Fast closure (t < Tc): Full pressure spike', { fill: '#f87171', fontSize: 12 });
    r.text(50, 315, '• Slow closure (t > Tc): Reduced pressure', { fill: '#34d399', fontSize: 12 });
    r.text(50, 340, '• Pressure ∝ Tc / t (when t > Tc)', { fill: '#94a3b8', fontSize: 12 });

    // Example
    r.roundRect(30, 380, 340, 100, 16, { fill: 'rgba(34, 197, 94, 0.2)' });
    r.text(200, 410, 'Example: 100m pipe, c = 1400 m/s', { fill: '#34d399', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 440, 'Tc = 2 × 100 / 1400 = 143 ms', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 465, 'Close over 286 ms → pressure halved!', { fill: '#34d399', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

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
      if (isActive) bgColor = '#3b82f6';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.tagline, { fill: '#60a5fa', fontSize: 11, textAnchor: 'middle' });

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
    r.roundRect(40, 320, 320, 70, 10, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 345, 'Physics Connection', { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 370, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: '✓ Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 420, '✓ Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
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
      r.text(200, 195, question.question.substring(0, 50), { fill: '#60a5fa', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
      if (question.question.length > 50) {
        r.text(200, 215, question.question.substring(50), { fill: '#60a5fa', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
      }

      // Options
      question.options.forEach((option, i) => {
        const y = 235 + i * 52;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 45, 8, { fill: bgColor });
        r.text(40, y + 27, `${String.fromCharCode(65 + i)}. ${option.substring(0, 42)}${option.length > 42 ? '...' : ''}`, { fill: isSelected ? '#60a5fa' : '#e2e8f0', fontSize: 11 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      // Navigation
      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: '← Previous', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next →', variant: 'secondary' });
      }

      // Submit button
      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      } else {
        r.text(200, 475, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "Excellent! You've mastered water hammer!" : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 160, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'Joukowsky equation: ΔP = ρcΔv',
        'Critical time: Tc = 2L/c',
        'Slow closure reduces pressure',
        'Wave travels at speed of sound'
      ];
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
    // Trophy
    r.text(200, 120, '🔧💧🎉', { fontSize: 48, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Water Hammer Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand why pipes bang and how', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'engineers prevent catastrophic failures!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '📐', label: 'Joukowsky: ΔP=ρcΔv' },
      { icon: '⏱️', label: 'Critical Time' },
      { icon: '🔧', label: 'Slow Closure' },
      { icon: '🏭', label: 'Applications' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 295 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 460, 300, 70, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 488, 'Key Formula', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 515, 'ΔP = ρ × c × Δv', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering water hammer physics!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      flowVelocity: this.flowVelocity,
      pipeLength: this.pipeLength,
      closureTime: this.closureTime,
      animationTime: this.animationTime,
      valveOpen: this.valveOpen,
      wavePosition: this.wavePosition,
      maxPressure: this.maxPressure,
      hasClosedValve: this.hasClosedValve,
      twistPressureHistory: this.twistPressureHistory,
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
    if (state.flowVelocity !== undefined) this.flowVelocity = state.flowVelocity as number;
    if (state.pipeLength !== undefined) this.pipeLength = state.pipeLength as number;
    if (state.closureTime !== undefined) this.closureTime = state.closureTime as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.valveOpen !== undefined) this.valveOpen = state.valveOpen as boolean;
    if (state.wavePosition !== undefined) this.wavePosition = state.wavePosition as number;
    if (state.maxPressure !== undefined) this.maxPressure = state.maxPressure as number;
    if (state.hasClosedValve !== undefined) this.hasClosedValve = state.hasClosedValve as boolean;
    if (state.twistPressureHistory) this.twistPressureHistory = state.twistPressureHistory as number[];
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createWaterHammerGame(sessionId: string): WaterHammerGame {
  return new WaterHammerGame(sessionId);
}
