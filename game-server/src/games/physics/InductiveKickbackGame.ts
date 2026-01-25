import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// INDUCTIVE KICKBACK GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: V = -L × (di/dt) - Faraday's Law applied to inductors
// When current through an inductor is interrupted suddenly, di/dt is huge
// This produces massive voltage spikes (kickback)
// Flyback diodes clamp the spike by providing a current path
// ============================================================================

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number; // PROTECTED: Never sent to client
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  description: string;
}

// Physics constants (PROTECTED - never sent to client)
const SUPPLY_VOLTAGE = 12; // volts
const INDUCTANCE = 0.1; // Henrys
const KICKBACK_MULTIPLIER = 30; // Typical kickback is 10-100x supply voltage

export class InductiveKickbackGame extends BaseGame {
  readonly gameType = 'inductive_kickback';
  readonly gameTitle = 'Inductive Kickback: The Voltage Spike';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private switchOn = true;
  private hasFlybackDiode = false;
  private kickbackVoltage = 0;
  private showSpark = false;
  private experimentCount = 0;
  private animationTime = 0;

  // Twist phase: Boost converter
  private boostActive = false;
  private boostOutput = 5;
  private hasExploredTwist = false;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showExplanation = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      question: "What causes inductive kickback when a switch opens?",
      options: [
        "Capacitor discharge creates voltage",
        "The collapsing magnetic field induces voltage (V = -L·di/dt)",
        "Static electricity from the switch contacts",
        "Heat from resistance generates voltage"
      ],
      correctIndex: 1,
      explanation: "When current stops, the magnetic field collapses rapidly. This fast change in flux induces a voltage according to Faraday's Law."
    },
    {
      question: "Why can kickback voltage be MUCH higher than the supply voltage?",
      options: [
        "The battery releases extra stored energy",
        "Wire resistance amplifies the voltage",
        "The rate of current change (di/dt) is extremely fast when interrupted",
        "Magnetic fields naturally create higher voltages"
      ],
      correctIndex: 2,
      explanation: "V = -L × (di/dt). When a switch opens, di/dt approaches infinity (instant change), producing enormous voltage."
    },
    {
      question: "What is the purpose of a flyback diode?",
      options: [
        "To increase the kickback voltage",
        "To convert AC to DC power",
        "To provide a safe path for current, clamping the voltage spike",
        "To store energy in the magnetic field"
      ],
      correctIndex: 2,
      explanation: "The flyback diode provides a path for the inductor current to continue flowing, limiting the voltage spike to one diode drop."
    },
    {
      question: "In a car ignition system, what voltage does the coil produce from 12V?",
      options: [
        "About 24V (doubled)",
        "About 120V (10x)",
        "About 1,000V (100x)",
        "About 40,000V (over 3,000x)"
      ],
      correctIndex: 3,
      explanation: "Ignition coils use transformer action plus kickback to step up 12V to 40,000V for spark plugs!"
    },
    {
      question: "How does a boost converter use inductive kickback?",
      options: [
        "It eliminates kickback to save energy",
        "Controlled switching captures kickback energy to raise output voltage",
        "It converts the kickback to heat",
        "It only works by filtering out the kickback"
      ],
      correctIndex: 1,
      explanation: "Boost converters rapidly switch to create controlled kickback, adding the inductor voltage to the supply voltage."
    },
    {
      question: "What happens if you control a relay from an Arduino WITHOUT a flyback diode?",
      options: [
        "The relay works perfectly fine",
        "The Arduino runs faster",
        "The kickback spike can damage or destroy the Arduino",
        "The relay becomes more efficient"
      ],
      correctIndex: 2,
      explanation: "The voltage spike can exceed the Arduino's voltage ratings, potentially destroying the microcontroller's I/O pins."
    },
    {
      question: "Which formula describes the induced voltage from an inductor?",
      options: [
        "V = IR (Ohm's law)",
        "P = IV (Power equation)",
        "V = -L × (di/dt) (Inductor equation)",
        "V = Q/C (Capacitor equation)"
      ],
      correctIndex: 2,
      explanation: "The inductor voltage is proportional to the rate of change of current times inductance."
    },
    {
      question: "What type of switching frequency do boost converters typically use?",
      options: [
        "50-60 Hz (like household AC)",
        "100 Hz - 1 kHz (low frequency)",
        "10 kHz - 1 MHz (high frequency switching)",
        "They don't switch at all"
      ],
      correctIndex: 2,
      explanation: "High frequency switching (often 100kHz-1MHz) allows smaller inductors and faster response times."
    },
    {
      question: "Why is inductance measured in Henrys (H)?",
      options: [
        "Named after the Henry battery company",
        "Represents how much energy the magnetic field can store",
        "Measures the resistance of the coil",
        "Indicates the coil's temperature rating"
      ],
      correctIndex: 1,
      explanation: "A Henry represents the inductance that produces 1V when current changes at 1A/second. Energy stored = ½LI²."
    },
    {
      question: "What makes inductive loads (motors, relays, solenoids) different from resistive loads?",
      options: [
        "They use more electricity",
        "They store energy in magnetic fields that must be dissipated",
        "They work on AC only",
        "They generate heat immediately"
      ],
      correctIndex: 1,
      explanation: "Inductive loads store energy magnetically. This energy must go somewhere when current stops - causing kickback!"
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🚗",
      title: "Automotive Ignition Systems",
      description: "Car ignition coils use kickback to generate 40,000V from 12V battery to create spark plug arcs."
    },
    {
      icon: "🔋",
      title: "Boost Converters",
      description: "DC-DC converters use controlled kickback to step up voltage efficiently - powering LED drivers, phone chargers."
    },
    {
      icon: "🛡️",
      title: "Microcontroller Protection",
      description: "Flyback diodes protect Arduino/Raspberry Pi when controlling relays, motors, and solenoids."
    },
    {
      icon: "⚡",
      title: "Switch Mode Power Supplies",
      description: "SMPS use high-frequency switching and kickback for efficient, compact power conversion."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate kickback voltage
  private calculateKickback(withDiode: boolean): number {
    if (withDiode) {
      return SUPPLY_VOLTAGE + 0.7; // Supply + one diode drop
    }
    return SUPPLY_VOLTAGE * KICKBACK_MULTIPLIER; // Massive spike without protection
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
    }
  }

  private handleButtonClick(buttonId: string): void {
    switch (this.phase) {
      case 'hook':
        if (buttonId === 'investigate') {
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
        }
        break;

      case 'play':
        if (buttonId === 'toggle_switch') {
          this.handleSwitchToggle();
        } else if (buttonId === 'toggle_diode') {
          this.hasFlybackDiode = !this.hasFlybackDiode;
        } else if (buttonId === 'continue' && this.experimentCount >= 3) {
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
        }
        break;

      case 'twist_play':
        if (buttonId === 'toggle_boost') {
          this.handleBoostToggle();
        } else if (buttonId === 'continue' && this.hasExploredTwist) {
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
          this.completedApps.add(this.activeAppIndex);
        } else if (buttonId === 'continue' && this.completedApps.size >= 4) {
          this.phase = 'test';
        }
        break;

      case 'test':
        if (buttonId.startsWith('answer_')) {
          const answerIndex = parseInt(buttonId.split('_')[1]);
          if (this.testAnswers[this.currentQuestionIndex] === -1) {
            this.testAnswers[this.currentQuestionIndex] = answerIndex;
            this.showExplanation = true;
          }
        } else if (buttonId === 'next_question') {
          if (this.currentQuestionIndex < 9) {
            this.currentQuestionIndex++;
            this.showExplanation = this.testAnswers[this.currentQuestionIndex] !== -1;
          }
        } else if (buttonId === 'prev_question') {
          if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.showExplanation = this.testAnswers[this.currentQuestionIndex] !== -1;
          }
        } else if (buttonId === 'complete') {
          const allAnswered = !this.testAnswers.includes(-1);
          if (allAnswered) {
            this.phase = 'mastery';
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

  private handleSwitchToggle(): void {
    if (this.switchOn) {
      // Opening switch - kickback occurs!
      this.kickbackVoltage = this.calculateKickback(this.hasFlybackDiode);
      if (!this.hasFlybackDiode) {
        this.showSpark = true;
      }
    }
    this.switchOn = !this.switchOn;
    this.experimentCount++;
  }

  private handleBoostToggle(): void {
    this.boostActive = !this.boostActive;
    this.hasExploredTwist = true;
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.switchOn = true;
    this.hasFlybackDiode = false;
    this.kickbackVoltage = 0;
    this.showSpark = false;
    this.experimentCount = 0;
    this.boostActive = false;
    this.boostOutput = 5;
    this.hasExploredTwist = false;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showExplanation = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  processInput(input: UserInput, config: SessionConfig): void {
    this.handleInput(input);
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Decay kickback voltage
    if (this.kickbackVoltage > 0) {
      this.kickbackVoltage = Math.max(0, this.kickbackVoltage - deltaTime * 150);
    }

    // Decay spark
    if (this.showSpark && this.kickbackVoltage < 100) {
      this.showSpark = false;
    }

    // Boost converter animation
    if (this.boostActive && this.boostOutput < 12) {
      this.boostOutput = Math.min(12, this.boostOutput + deltaTime * 20);
    } else if (!this.boostActive && this.boostOutput > 5) {
      this.boostOutput = Math.max(5, this.boostOutput - deltaTime * 30);
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(245, 158, 11, 0.03)' });
    r.circle(300, 600, 150, { fill: 'rgba(249, 115, 22, 0.03)' });

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

  private renderRelayCircuit(r: CommandRenderer, startY: number): void {
    // Background panel
    r.roundRect(20, startY, 360, 180, 12, { fill: 'rgba(30, 41, 59, 0.8)' });

    // Battery
    r.rect(35, startY + 60, 35, 50, { fill: '#374151' });
    r.text(52, startY + 90, '12V', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Wire from battery
    r.line(70, startY + 85, 110, startY + 85, { stroke: this.switchOn ? '#22c55e' : '#4b5563', strokeWidth: 3 });

    // Switch
    r.circle(125, startY + 85, 6, { fill: '#f3f4f6' });
    if (this.switchOn) {
      r.line(125, startY + 85, 155, startY + 85, { stroke: '#374151', strokeWidth: 3 });
    } else {
      r.line(125, startY + 85, 145, startY + 60, { stroke: '#374151', strokeWidth: 3 });
    }
    r.circle(155, startY + 85, 5, { fill: '#f3f4f6' });

    // Spark effect
    if (this.showSpark) {
      r.circle(140, startY + 70, 15, { fill: 'rgba(254, 240, 138, 0.8)' });
      r.text(140, startY + 50, 'SPARK!', { fill: '#dc2626', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Wire to inductor
    r.line(165, startY + 85, 200, startY + 85, { stroke: this.switchOn ? '#22c55e' : '#4b5563', strokeWidth: 3 });

    // Inductor coil
    r.roundRect(200, startY + 55, 70, 60, 8, { fill: 'transparent', stroke: '#6366f1', strokeWidth: 3 });
    // Coil windings representation
    r.path(`M 210 ${startY + 85} C 215 ${startY + 70}, 225 ${startY + 70}, 230 ${startY + 85} C 235 ${startY + 100}, 245 ${startY + 100}, 250 ${startY + 85} C 255 ${startY + 70}, 265 ${startY + 70}, 270 ${startY + 85}`,
      { stroke: '#a5b4fc', strokeWidth: 3, fill: 'transparent' });
    r.text(235, startY + 130, 'Relay Coil', { fill: '#a5b4fc', fontSize: 10, textAnchor: 'middle' });

    // Flyback diode (if enabled)
    if (this.hasFlybackDiode) {
      r.polygon([
        { x: 290, y: startY + 65 },
        { x: 310, y: startY + 85 },
        { x: 290, y: startY + 105 }
      ], { fill: '#22c55e' });
      r.line(310, startY + 65, 310, startY + 105, { stroke: '#22c55e', strokeWidth: 3 });
      r.text(300, startY + 125, 'Flyback', { fill: '#22c55e', fontSize: 9, textAnchor: 'middle' });
    } else {
      r.text(300, startY + 90, '(No diode)', { fill: '#ef4444', fontSize: 9, textAnchor: 'middle' });
    }

    // Voltage display
    r.roundRect(310, startY + 30, 60, 40, 6, { fill: '#1f2937' });
    r.text(340, startY + 48, 'Kickback', { fill: '#64748b', fontSize: 8, textAnchor: 'middle' });
    const voltageColor = this.kickbackVoltage > 50 ? '#ef4444' : '#22c55e';
    r.text(340, startY + 65, `${Math.round(this.kickbackVoltage)}V`, {
      fill: voltageColor,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
  }

  private renderHook(r: CommandRenderer): void {
    // Badge
    r.roundRect(130, 50, 140, 30, 8, { fill: 'rgba(245, 158, 11, 0.1)' });
    r.text(200, 70, 'PHYSICS EXPLORATION', { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle' });

    // Icon
    r.circle(200, 140, 40, { fill: 'linear-gradient(135deg, #f59e0b, #ea580c)' });
    r.text(200, 150, '⚡', { fontSize: 36, textAnchor: 'middle' });

    // Title
    r.text(200, 210, 'The Mysterious Voltage Spike', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 245, 'Ever unplugged something with a motor', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 265, 'and seen a spark?', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    // Info card
    r.roundRect(40, 295, 320, 120, 16, { fill: 'rgba(245, 158, 11, 0.1)' });
    r.text(70, 330, '🧲', { fontSize: 24 });
    r.text(100, 340, 'The Hidden Danger', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold' });
    r.text(200, 370, 'When current through a coil stops,', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 390, 'the magnetic field creates a massive', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 410, 'voltage spike - often 10-100× supply!', { fill: '#f59e0b', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    // Application icons
    r.roundRect(55, 440, 80, 60, 10, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.text(95, 465, '🔌', { fontSize: 18, textAnchor: 'middle' });
    r.text(95, 490, 'Relays', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(160, 440, 80, 60, 10, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.text(200, 465, '🚗', { fontSize: 18, textAnchor: 'middle' });
    r.text(200, 490, 'Ignition', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(265, 440, 80, 60, 10, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.text(305, 465, '🔋', { fontSize: 18, textAnchor: 'middle' });
    r.text(305, 490, 'Converters', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'investigate', label: 'Investigate the Spike', variant: 'primary' });

    r.setCoachMessage('Discover the physics of inductive kickback!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 50, '🤔', { fontSize: 40, textAnchor: 'middle' });
    r.text(200, 95, 'Make Your Prediction', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 115, 340, 70, 12, { fill: 'rgba(59, 130, 246, 0.15)' });
    r.text(200, 145, 'A relay coil is powered by 12V.', { fill: '#93c5fd', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 168, 'When you flip the switch OFF, what happens?', { fill: '#93c5fd', fontSize: 12, textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'zero', text: 'Drops to 0V immediately', icon: '📉' },
      { id: 'gradual', text: 'Gradually decreases from 12V to 0V', icon: '📊' },
      { id: 'spike', text: 'Spikes to hundreds of volts briefly', icon: '⚡' }
    ];

    options.forEach((option, i) => {
      const y = 200 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (option.id === 'spike') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (option.id === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (option.id === this.prediction) {
        bgColor = 'rgba(59, 130, 246, 0.3)';
      }

      r.roundRect(30, y, 340, 52, 12, { fill: bgColor });
      r.text(55, y + 32, option.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(80, y + 32, option.text, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${option.id}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 390, 340, 100, 12, {
        fill: this.prediction === 'spike' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)'
      });

      if (this.prediction === 'spike') {
        r.text(200, 425, 'Exactly right!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(200, 450, 'The collapsing magnetic field induces', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
        r.text(200, 470, 'a huge voltage spike - inductive kickback!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      } else {
        r.text(200, 425, 'Surprising result!', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(200, 450, 'The voltage actually spikes to hundreds of', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
        r.text(200, 470, 'volts! The inductor "kicks back"!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }

      r.addButton({ id: 'continue', label: 'See It Happen', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 35, '🔬', { fontSize: 28, textAnchor: 'middle' });
    r.text(200, 65, 'Relay Circuit Simulator', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 88, 'Toggle switch and observe kickback', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Circuit visualization
    this.renderRelayCircuit(r, 105);

    // Controls
    r.roundRect(20, 300, 175, 60, 12, {
      fill: this.switchOn ? 'rgba(34, 197, 94, 0.3)' : 'rgba(51, 65, 85, 0.5)'
    });
    r.text(107, 338, this.switchOn ? '🔌 Switch ON' : '🔌 Switch OFF', {
      fill: '#ffffff',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.addButton({ id: 'toggle_switch', label: '', variant: 'secondary' });

    r.roundRect(205, 300, 175, 60, 12, {
      fill: this.hasFlybackDiode ? 'rgba(34, 197, 94, 0.3)' : 'rgba(251, 191, 36, 0.2)'
    });
    r.text(292, 338, this.hasFlybackDiode ? '✓ Diode Added' : '+ Add Diode', {
      fill: this.hasFlybackDiode ? '#22c55e' : '#fbbf24',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.addButton({ id: 'toggle_diode', label: '', variant: 'secondary' });

    // Instructions
    r.roundRect(20, 375, 360, 60, 12, { fill: 'rgba(251, 191, 36, 0.1)' });
    r.text(200, 400, 'Try: Toggle OFF without diode to see the spark!', { fill: '#fbbf24', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 420, 'Then add the diode and notice the clamped voltage.', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Progress
    r.text(200, 465, `Experiments: ${this.experimentCount}/3`, { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    if (this.experimentCount >= 3) {
      r.addButton({ id: 'continue', label: 'Continue to Review', variant: 'primary' });
    } else {
      r.text(200, 500, `Toggle switch ${3 - this.experimentCount} more times...`, { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });
    }
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 45, '📖', { fontSize: 36, textAnchor: 'middle' });
    r.text(200, 90, 'Understanding Inductive Kickback', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Main formula
    r.roundRect(40, 115, 320, 80, 16, { fill: 'linear-gradient(135deg, #6366f1, #8b5cf6)' });
    r.text(200, 145, 'The Inductor Equation', { fill: 'rgba(255,255,255,0.7)', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 175, 'V = -L × (di/dt)', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Key concepts
    const concepts = [
      { icon: '🧲', title: 'Magnetic Field Energy', desc: 'Current creates a field that stores energy' },
      { icon: '⚡', title: 'Rapid Change = High V', desc: 'Fast di/dt produces massive voltage spike' },
      { icon: '🛡️', title: 'Flyback Protection', desc: 'Diode provides path, clamps voltage' }
    ];

    concepts.forEach((concept, i) => {
      const y = 210 + i * 80;
      r.roundRect(30, y, 340, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(55, y + 40, concept.icon, { fontSize: 24, textAnchor: 'middle' });
      r.text(80, y + 30, concept.title, { fill: '#ffffff', fontSize: 13, fontWeight: 'bold' });
      r.text(80, y + 52, concept.desc, { fill: '#94a3b8', fontSize: 11 });
    });

    r.addButton({ id: 'continue', label: 'Now for a Twist...', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 50, '🔄', { fontSize: 36, textAnchor: 'middle' });
    r.text(200, 90, 'The Useful Side of Kickback', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 115, 340, 70, 12, { fill: 'rgba(168, 85, 247, 0.15)' });
    r.text(200, 145, 'Inductive kickback seems destructive.', { fill: '#c4b5fd', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 168, 'But engineers have found ways to harness it!', { fill: '#c4b5fd', fontSize: 12, textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'nothing', text: "It's only a problem to be prevented", icon: '🚫' },
      { id: 'spark', text: 'To create sparks in spark plugs', icon: '🔥' },
      { id: 'both', text: 'Both spark plugs AND voltage boosting', icon: '⚡' }
    ];

    options.forEach((option, i) => {
      const y = 200 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (option.id === 'both') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (option.id === this.twistPrediction) {
          bgColor = 'rgba(251, 191, 36, 0.3)';
          textColor = '#fbbf24';
        }
      } else if (option.id === this.twistPrediction) {
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 52, 12, { fill: bgColor });
      r.text(55, y + 32, option.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(80, y + 32, option.text, { fill: textColor, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${option.id}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 390, 340, 100, 12, {
        fill: this.twistPrediction === 'both' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)'
      });

      if (this.twistPrediction === 'both') {
        r.text(200, 425, 'Perfect!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      } else {
        r.text(200, 425, "There's more!", { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      }
      r.text(200, 450, 'Ignition coils: 12V → 40,000V for sparks!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 470, 'Boost converters: Efficiently increase voltage', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Explore Boost Converters', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 35, '🔋', { fontSize: 28, textAnchor: 'middle' });
    r.text(200, 65, 'Boost Converter Demo', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 88, 'See how kickback steps up voltage', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Boost converter visualization
    r.roundRect(20, 105, 360, 200, 12, { fill: 'rgba(30, 41, 59, 0.8)' });

    // Input
    r.roundRect(35, 160, 55, 50, 8, { fill: '#374151' });
    r.text(62, 180, '5V', { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(62, 198, 'INPUT', { fill: '#64748b', fontSize: 8, textAnchor: 'middle' });

    // Inductor
    r.roundRect(105, 145, 60, 70, 8, { fill: 'rgba(139, 92, 246, 0.3)' });
    r.text(135, 190, 'L', { fill: '#a5b4fc', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(135, 230, 'Inductor', { fill: '#a5b4fc', fontSize: 9, textAnchor: 'middle' });

    // Switch indicator
    r.roundRect(135, 220, 45, 20, 4, { fill: '#1f2937' });
    r.text(157, 234, this.boostActive ? 'ON' : 'OFF', {
      fill: this.boostActive ? '#22c55e' : '#64748b',
      fontSize: 9,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Kickback arrow
    if (this.boostActive) {
      r.text(135, 130, '↑ KICKBACK', { fill: '#fbbf24', fontSize: 9, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Diode
    r.polygon([{ x: 185, y: 160 }, { x: 205, y: 180 }, { x: 185, y: 200 }], { fill: '#6366f1' });
    r.line(205, 160, 205, 200, { stroke: '#6366f1', strokeWidth: 3 });

    // Capacitor
    r.line(225, 155, 225, 205, { stroke: '#64748b', strokeWidth: 4 });
    r.line(240, 155, 240, 205, { stroke: '#64748b', strokeWidth: 4 });
    r.text(232, 225, 'Cap', { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });

    // Output
    r.roundRect(270, 140, 90, 80, 10, { fill: '#1f2937', stroke: '#22c55e', strokeWidth: 2 });
    r.text(315, 165, 'OUTPUT', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });
    r.text(315, 200, `${Math.round(this.boostOutput)}V`, {
      fill: '#22c55e',
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Toggle button
    r.addButton({
      id: 'toggle_boost',
      label: this.boostActive ? 'Stop Boost' : 'Activate Boost',
      variant: this.boostActive ? 'secondary' : 'primary'
    });

    // Explanation
    r.roundRect(20, 375, 360, 70, 12, { fill: 'rgba(59, 130, 246, 0.1)' });
    r.text(200, 400, 'How it works: Rapid switching (100kHz) creates', { fill: '#93c5fd', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 420, 'controlled kickback that adds to input voltage!', { fill: '#93c5fd', fontSize: 11, textAnchor: 'middle' });

    if (this.hasExploredTwist) {
      r.addButton({ id: 'continue', label: 'Continue', variant: 'primary' });
    } else {
      r.text(200, 475, 'Try the boost converter...', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });
    }
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 45, '💡', { fontSize: 36, textAnchor: 'middle' });
    r.text(200, 90, 'Harnessing Kickback', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Two applications side by side
    r.roundRect(20, 120, 175, 180, 12, { fill: 'rgba(239, 68, 68, 0.1)' });
    r.text(107, 150, '🚗', { fontSize: 28, textAnchor: 'middle' });
    r.text(107, 180, 'Ignition Coil', { fill: '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(107, 205, '12V → 40,000V', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });
    r.text(107, 230, 'Spark plug arc', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(107, 250, 'from battery!', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(107, 280, '3,000× amplification', { fill: '#ef4444', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(205, 120, 175, 180, 12, { fill: 'rgba(34, 197, 94, 0.1)' });
    r.text(292, 150, '⚡', { fontSize: 28, textAnchor: 'middle' });
    r.text(292, 180, 'Boost Converter', { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(292, 205, '5V → 12V', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });
    r.text(292, 230, 'Efficient voltage', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(292, 250, 'step-up', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(292, 280, '90%+ efficiency', { fill: '#22c55e', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 320, 340, 70, 12, { fill: 'rgba(251, 191, 36, 0.15)' });
    r.text(200, 350, 'Same physics, different goals:', { fill: '#fbbf24', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 375, 'V = -L × (di/dt) - control the change, control the voltage!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Real Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 45, 'Real-World Applications', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 70, 'Explore how kickback is used in industry', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#f59e0b';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 95, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 123, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 155, 350, 220, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 195, app.icon, { fontSize: 40, textAnchor: 'middle' });
    r.text(200, 240, app.title, { fill: '#f59e0b', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Description wrapped
    const words = app.description.split(' ');
    let line = '';
    let lineY = 275;
    words.forEach(word => {
      if ((line + word).length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else {
        line += word + ' ';
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Completion indicator
    if (this.completedApps.has(this.activeAppIndex)) {
      r.text(200, 355, '✓ Explored', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 400, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    // Progress dots
    this.transferApps.forEach((_, i) => {
      const dotX = 175 + i * 18;
      r.circle(dotX, 420, 5, { fill: this.completedApps.has(i) ? '#22c55e' : '#374151' });
    });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take the Test', variant: 'primary' });
    } else {
      r.text(200, 460, `Explore all applications to continue (${this.completedApps.size}/4)`, { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    const question = this.testQuestions[this.currentQuestionIndex];
    const selectedAnswer = this.testAnswers[this.currentQuestionIndex];
    const correctCount = this.testAnswers.filter((a, i) => this.checkAnswer(i, a)).length;

    // Header
    r.text(200, 35, `Question ${this.currentQuestionIndex + 1}/10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(350, 35, `Score: ${correctCount}/${this.testAnswers.filter(a => a !== -1).length}`, { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Progress bar
    r.roundRect(30, 50, 340, 6, 3, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.roundRect(30, 50, 340 * ((this.currentQuestionIndex + 1) / 10), 6, 3, { fill: '#f59e0b' });

    // Question
    r.roundRect(20, 70, 360, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    const qWords = question.question.split(' ');
    let qLine = '';
    let qY = 95;
    qWords.forEach(word => {
      if ((qLine + word).length > 48) {
        r.text(200, qY, qLine.trim(), { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
        qLine = word + ' ';
        qY += 18;
      } else {
        qLine += word + ' ';
      }
    });
    if (qLine) r.text(200, qY, qLine.trim(), { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    question.options.forEach((option, i) => {
      const y = 165 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showExplanation) {
        if (i === question.correctIndex) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === selectedAnswer) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === selectedAnswer) {
        bgColor = 'rgba(245, 158, 11, 0.3)';
      }

      r.roundRect(20, y, 360, 48, 8, { fill: bgColor });
      r.text(35, y + 28, option.substring(0, 52) + (option.length > 52 ? '...' : ''), { fill: textColor, fontSize: 11 });

      if (!this.showExplanation) {
        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      }
    });

    // Explanation
    if (this.showExplanation) {
      r.roundRect(20, 390, 360, 70, 12, { fill: 'rgba(245, 158, 11, 0.1)' });
      const expText = question.explanation.substring(0, 100);
      r.text(200, 415, expText.substring(0, 55), { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle' });
      if (expText.length > 55) {
        r.text(200, 435, expText.substring(55), { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle' });
      }
    }

    // Navigation
    if (this.currentQuestionIndex > 0) {
      r.addButton({ id: 'prev_question', label: '← Back', variant: 'secondary' });
    }

    if (this.currentQuestionIndex < 9) {
      r.addButton({ id: 'next_question', label: 'Next →', variant: 'secondary' });
    } else {
      const allAnswered = !this.testAnswers.includes(-1);
      if (allAnswered) {
        r.addButton({ id: 'complete', label: 'Complete!', variant: 'primary' });
      } else {
        r.text(200, 510, 'Answer all questions', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    const score = this.calculateScore();
    const percentage = Math.round((score / 10) * 100);

    // Trophy badge
    r.circle(200, 100, 50, { fill: 'linear-gradient(135deg, #f59e0b, #ea580c)' });
    r.text(200, 110, '⚡', { fontSize: 40, textAnchor: 'middle' });

    // Title
    r.text(200, 175, 'Inductive Kickback Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Score
    r.text(200, 220, `${percentage}%`, { fill: '#22c55e', fontSize: 42, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 250, `${score}/10 correct answers`, { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    // Key concepts
    r.roundRect(40, 280, 320, 180, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 310, 'Key Concepts Mastered:', { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const concepts = [
      'V = -L × (di/dt) equation',
      'Flyback diode protection',
      'Ignition coil amplification',
      'Boost converter operation'
    ];

    concepts.forEach((concept, i) => {
      r.text(70, 345 + i * 28, `✓ ${concept}`, { fill: '#ffffff', fontSize: 11 });
    });

    // Key insight
    r.roundRect(40, 480, 320, 60, 12, { fill: 'rgba(245, 158, 11, 0.15)' });
    r.text(200, 505, 'Key Insight: Rapid di/dt = Massive voltage!', { fill: '#f59e0b', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 525, 'Control the change, harness the energy.', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering inductive kickback!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      switchOn: this.switchOn,
      hasFlybackDiode: this.hasFlybackDiode,
      kickbackVoltage: this.kickbackVoltage,
      showSpark: this.showSpark,
      experimentCount: this.experimentCount,
      animationTime: this.animationTime,
      boostActive: this.boostActive,
      boostOutput: this.boostOutput,
      hasExploredTwist: this.hasExploredTwist,
      testAnswers: this.testAnswers,
      currentQuestionIndex: this.currentQuestionIndex,
      showExplanation: this.showExplanation,
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
    if (state.switchOn !== undefined) this.switchOn = state.switchOn as boolean;
    if (state.hasFlybackDiode !== undefined) this.hasFlybackDiode = state.hasFlybackDiode as boolean;
    if (state.kickbackVoltage !== undefined) this.kickbackVoltage = state.kickbackVoltage as number;
    if (state.showSpark !== undefined) this.showSpark = state.showSpark as boolean;
    if (state.experimentCount !== undefined) this.experimentCount = state.experimentCount as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.boostActive !== undefined) this.boostActive = state.boostActive as boolean;
    if (state.boostOutput !== undefined) this.boostOutput = state.boostOutput as number;
    if (state.hasExploredTwist !== undefined) this.hasExploredTwist = state.hasExploredTwist as boolean;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showExplanation !== undefined) this.showExplanation = state.showExplanation as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createInductiveKickbackGame(sessionId: string): InductiveKickbackGame {
  return new InductiveKickbackGame(sessionId);
}
