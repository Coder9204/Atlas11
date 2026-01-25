import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// RC TIME CONSTANT GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: V(t) = V0(1 - e^(-t/RC)) charging, V(t) = V0*e^(-t/RC) discharging
// Time constant tau = RC determines how fast capacitor charges/discharges
// After 1 tau: 63% charged. After 5 tau: ~99% charged
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

// PROTECTED Physics constants (never sent to client)
const E = Math.E;

export class RCTimeConstantGame extends BaseGame {
  readonly gameType = 'rc_time_constant';
  readonly gameTitle = 'RC Time Constant: The Charging Curve';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private resistance = 10; // kOhm
  private capacitance = 100; // microF
  private supplyVoltage = 12; // V
  private capacitorVoltage = 0;
  private isCharging = false;
  private isDischarging = false;
  private chargeHistory: { time: number; voltage: number }[] = [];
  private dischargeHistory: { time: number; voltage: number }[] = [];
  private elapsedTime = 0;
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
      scenario: "An engineer is designing a timing circuit using a capacitor.",
      question: "The time constant (tau) of an RC circuit equals:",
      options: ["R + C", "R - C", "R x C", "R / C"],
      correctIndex: 2,
      explanation: "The time constant tau = R x C (resistance times capacitance). It has units of time (seconds when R is in ohms and C is in farads)."
    },
    {
      scenario: "A technician is testing a capacitor charging through a resistor.",
      question: "After one time constant (1 tau), a charging capacitor reaches approximately:",
      options: ["50% of final voltage", "63% of final voltage", "86% of final voltage", "100% of final voltage"],
      correctIndex: 1,
      explanation: "After 1 tau, the capacitor charges to (1 - e^-1) = 63.2% of the supply voltage. This is a fundamental property of exponential charging."
    },
    {
      scenario: "A designer needs to know when a capacitor is 'fully charged' for practical purposes.",
      question: "A capacitor is considered 'fully charged' after approximately:",
      options: ["1 time constant", "2 time constants", "5 time constants", "10 time constants"],
      correctIndex: 2,
      explanation: "After 5 tau, the capacitor reaches about 99.3% of its final value. For practical purposes, this is considered fully charged."
    },
    {
      scenario: "An engineer wants to slow down a charging circuit.",
      question: "What happens if you increase the resistance in an RC circuit?",
      options: ["Charging gets faster", "Charging gets slower", "Maximum voltage increases", "Nothing changes"],
      correctIndex: 1,
      explanation: "Higher resistance means less current can flow, so it takes longer to charge the capacitor. tau = RC, so larger R means larger tau."
    },
    {
      scenario: "A physics student is graphing capacitor voltage over time.",
      question: "The charging curve of a capacitor is:",
      options: ["Linear", "Exponential", "Parabolic", "Sinusoidal"],
      correctIndex: 1,
      explanation: "Capacitor charging follows an exponential curve: V(t) = V0(1 - e^(-t/tau)). It rises quickly at first, then slows as it approaches the supply voltage."
    },
    {
      scenario: "A capacitor is being discharged through a resistor.",
      question: "During discharge, capacitor voltage:",
      options: ["Decreases linearly", "Decreases exponentially", "Increases exponentially", "Stays constant"],
      correctIndex: 1,
      explanation: "Discharging follows exponential decay: V(t) = V0*e^(-t/tau). The voltage drops quickly at first, then more slowly."
    },
    {
      scenario: "An electronics hobbyist is calculating a time constant.",
      question: "If R = 10k ohms and C = 100 microF, what is the time constant?",
      options: ["1 millisecond", "10 milliseconds", "100 milliseconds", "1 second"],
      correctIndex: 3,
      explanation: "tau = RC = 10,000 ohms x 0.0001F = 1 second. Remember to convert units: 100 microF = 100 x 10^-6 F = 0.0001F."
    },
    {
      scenario: "A student asks why capacitors don't charge instantly.",
      question: "Why can't a capacitor charge instantly to the supply voltage?",
      options: ["The battery is too weak", "Resistance limits current flow", "Capacitors are defective", "It's a software limitation"],
      correctIndex: 1,
      explanation: "The resistor limits current flow. Initially, current is high but decreases as the capacitor charges. The gradual current flow causes gradual charging."
    },
    {
      scenario: "A photographer is examining their camera flash circuit.",
      question: "In a camera flash, a large capacitor is used to:",
      options: ["Store and quickly release energy", "Filter noise", "Regulate voltage", "Convert AC to DC"],
      correctIndex: 0,
      explanation: "Camera flash capacitors slowly charge from the battery, then rapidly discharge to produce an intense flash of light in milliseconds."
    },
    {
      scenario: "A student is analyzing capacitor voltage at different time points.",
      question: "After 2 time constants, a charging capacitor reaches approximately:",
      options: ["63%", "75%", "86%", "95%"],
      correctIndex: 2,
      explanation: "After 2 tau: V = V0(1 - e^-2) = 86.5%. The percentages at each tau: 63% (1 tau), 86% (2 tau), 95% (3 tau), 98% (4 tau), 99% (5 tau)."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "camera",
      title: "Camera Flash",
      tagline: "Store slowly, release quickly",
      description: "Camera flash capacitors slowly charge from a small battery, storing energy. When triggered, they discharge in milliseconds for an intense flash.",
      connection: "Large capacitors (100-1000 microF) with high voltage (300V+) store energy (E = 1/2 CV^2) for rapid release."
    },
    {
      icon: "heart",
      title: "Defibrillators",
      tagline: "Saving lives with stored energy",
      description: "Medical defibrillators charge large capacitors to high voltage, then discharge through the patient's chest to restart the heart.",
      connection: "Capacitors store 200-400J of energy. The RC time constant determines safe energy delivery rate to the heart."
    },
    {
      icon: "clock",
      title: "Timer Circuits",
      tagline: "555 timers and beyond",
      description: "RC circuits create precise time delays. The 555 timer IC uses RC charging/discharging to generate clock pulses and delays.",
      connection: "By selecting R and C values, engineers create specific timing delays. tau = RC gives predictable, repeatable timing."
    },
    {
      icon: "wave",
      title: "Audio Filters",
      tagline: "Shaping sound frequencies",
      description: "RC circuits in audio equipment filter frequencies. Low-pass filters remove high frequencies, high-pass filters remove low frequencies.",
      connection: "Cutoff frequency = 1/(2*pi*RC). This determines which frequencies pass through and which are attenuated."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate time constant in seconds
  private getTimeConstant(): number {
    // tau = R * C (R in ohms, C in farads)
    return (this.resistance * 1000) * (this.capacitance / 1000000);
  }

  // PROTECTED: Calculate charging voltage at time t
  private calculateChargingVoltage(t: number): number {
    // V(t) = V0 * (1 - e^(-t/tau))
    const tau = this.getTimeConstant();
    return this.supplyVoltage * (1 - Math.pow(E, -t / tau));
  }

  // PROTECTED: Calculate discharging voltage at time t
  private calculateDischargingVoltage(initialVoltage: number, t: number): number {
    // V(t) = V0 * e^(-t/tau)
    const tau = this.getTimeConstant();
    return initialVoltage * Math.pow(E, -t / tau);
  }

  // PROTECTED: Get percentage charged at n time constants
  private getPercentageAtTau(n: number): number {
    return (1 - Math.pow(E, -n)) * 100;
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
      if (input.id === 'resistance') {
        this.resistance = Math.max(1, Math.min(100, input.value));
      } else if (input.id === 'capacitance') {
        this.capacitance = Math.max(10, Math.min(1000, input.value));
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
        if (buttonId === 'start_charging') {
          this.isCharging = true;
          this.capacitorVoltage = 0;
          this.chargeHistory = [];
          this.elapsedTime = 0;
        } else if (buttonId === 'reset') {
          this.isCharging = false;
          this.capacitorVoltage = 0;
          this.chargeHistory = [];
          this.elapsedTime = 0;
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
          this.capacitorVoltage = this.supplyVoltage;
        }
        break;

      case 'twist_play':
        if (buttonId === 'start_discharging') {
          this.isDischarging = true;
          this.dischargeHistory = [];
          this.elapsedTime = 0;
        } else if (buttonId === 'reset') {
          this.isDischarging = false;
          this.capacitorVoltage = this.supplyVoltage;
          this.dischargeHistory = [];
          this.elapsedTime = 0;
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

  processInput(input: UserInput, config: SessionConfig): void {
    this.handleInput(input);
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.resistance = 10;
    this.capacitance = 100;
    this.capacitorVoltage = 0;
    this.isCharging = false;
    this.isDischarging = false;
    this.chargeHistory = [];
    this.dischargeHistory = [];
    this.elapsedTime = 0;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    if (this.isCharging && this.phase === 'play') {
      this.elapsedTime += deltaTime;
      this.capacitorVoltage = this.calculateChargingVoltage(this.elapsedTime);
      this.chargeHistory.push({ time: this.elapsedTime, voltage: this.capacitorVoltage });
      if (this.chargeHistory.length > 100) this.chargeHistory.shift();

      if (this.capacitorVoltage >= this.supplyVoltage * 0.995) {
        this.isCharging = false;
        this.capacitorVoltage = this.supplyVoltage;
      }
    }

    if (this.isDischarging && this.phase === 'twist_play') {
      this.elapsedTime += deltaTime;
      const initialV = this.supplyVoltage;
      this.capacitorVoltage = this.calculateDischargingVoltage(initialV, this.elapsedTime);
      this.dischargeHistory.push({ time: this.elapsedTime, voltage: this.capacitorVoltage });
      if (this.dischargeHistory.length > 100) this.dischargeHistory.shift();

      if (this.capacitorVoltage < 0.01) {
        this.isDischarging = false;
        this.capacitorVoltage = 0;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(6, 182, 212, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(139, 92, 246, 0.05)' });

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
    r.roundRect(110, 60, 180, 30, 8, { fill: 'rgba(6, 182, 212, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#22d3ee', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Camera Flash Mystery', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Why does it take seconds to charge?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Camera illustration
    r.roundRect(130, 190, 140, 100, 12, { fill: '#1e293b' });
    r.circle(200, 235, 30, { fill: '#0f172a' });
    r.circle(200, 235, 22, { fill: '#1e293b' });

    // Flash indicator
    r.roundRect(150, 300, 100, 20, 4, { fill: 'rgba(6, 182, 212, 0.3)' });
    const flashWidth = Math.min(100, (Math.sin(this.animationTime * 2) + 1) * 50);
    r.roundRect(150, 300, flashWidth, 20, 4, { fill: '#22d3ee' });
    r.text(200, 335, 'Charging...', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Question card
    r.roundRect(40, 370, 320, 120, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 400, 'Have you noticed...', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 430, 'A camera flash takes seconds to charge', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 455, 'but releases energy instantly?', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 480, 'How does this work?', { fill: '#22d3ee', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Discover How', variant: 'primary' });

    r.setCoachMessage('Capacitors are like tiny rechargeable energy tanks!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'You connect a capacitor to a battery', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'through a resistor. How does it charge?', { fill: '#22d3ee', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Instantly to full voltage',
      'Linearly (same rate throughout)',
      'Exponentially (fast then slow)',
      'Randomly depending on resistor'
    ];

    options.forEach((option, i) => {
      const y = 200 + i * 65;
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
        bgColor = 'rgba(6, 182, 212, 0.3)';
      }

      r.roundRect(30, y, 340, 55, 10, { fill: bgColor });
      r.text(50, y + 32, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 13 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 2 ? 'Correct!' : 'The answer: Exponentially!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 530, 'Capacitors charge quickly at first,', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 550, 'then slower as they approach full voltage.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See It In Action', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'RC Charging Lab', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Circuit diagram
    r.roundRect(30, 80, 340, 120, 12, { fill: 'rgba(15, 23, 42, 0.8)' });

    // Battery
    r.rect(50, 110, 10, 50, { fill: '#fbbf24' });
    r.rect(45, 120, 20, 3, { fill: '#fbbf24' });
    r.rect(48, 145, 14, 3, { fill: '#fbbf24' });
    r.text(55, 180, `${this.supplyVoltage}V`, { fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' });

    // Wires
    r.line(60, 115, 120, 115, { stroke: '#64748b', strokeWidth: 2 });
    r.line(180, 115, 320, 115, { stroke: '#64748b', strokeWidth: 2 });
    r.line(320, 115, 320, 165, { stroke: '#64748b', strokeWidth: 2 });
    r.line(60, 165, 320, 165, { stroke: '#64748b', strokeWidth: 2 });
    r.line(60, 115, 60, 165, { stroke: '#64748b', strokeWidth: 2 });

    // Resistor
    r.roundRect(120, 105, 60, 20, 4, { fill: '#ef4444' });
    r.text(150, 140, `${this.resistance}k ohm`, { fill: '#fca5a5', fontSize: 9, textAnchor: 'middle' });

    // Capacitor
    r.rect(255, 125, 3, 30, { fill: '#22d3ee' });
    r.rect(268, 125, 3, 30, { fill: '#22d3ee' });
    r.text(263, 175, `${this.capacitance} microF`, { fill: '#67e8f9', fontSize: 9, textAnchor: 'middle' });

    // Voltage display
    r.roundRect(100, 210, 200, 60, 10, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 235, 'Capacitor Voltage', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 260, `${this.capacitorVoltage.toFixed(2)}V`, { fill: '#22d3ee', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Charge percentage bar
    const chargePercent = (this.capacitorVoltage / this.supplyVoltage) * 100;
    r.roundRect(50, 285, 300, 20, 4, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.roundRect(50, 285, chargePercent * 3, 20, 4, { fill: '#22d3ee' });
    r.text(200, 320, `${chargePercent.toFixed(1)}% charged`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Time constant info
    const tau = this.getTimeConstant();
    r.roundRect(40, 340, 320, 50, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 358, 'Time Constant (tau)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 378, `tau = R x C = ${tau.toFixed(2)} seconds`, { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Sliders
    r.addSlider({
      id: 'resistance',
      label: 'Resistance (k ohm)',
      min: 1,
      max: 100,
      step: 1,
      value: this.resistance
    });

    r.addSlider({
      id: 'capacitance',
      label: 'Capacitance (microF)',
      min: 10,
      max: 1000,
      step: 10,
      value: this.capacitance
    });

    // Buttons
    if (!this.isCharging && this.capacitorVoltage < this.supplyVoltage * 0.99) {
      r.addButton({ id: 'start_charging', label: 'Start Charging', variant: 'primary' });
    }
    if (this.capacitorVoltage > 0.1) {
      r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
    }
    if (this.capacitorVoltage >= this.supplyVoltage * 0.95) {
      r.addButton({ id: 'continue', label: 'Understand the Math', variant: 'primary' });
    }

    r.setCoachMessage(this.isCharging ? 'Watch how charging slows as voltage increases!' : 'Adjust R and C to change charging speed.');
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Science of RC Circuits', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Charging formula card
    r.roundRect(30, 85, 340, 120, 16, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 115, 'Charging Equation', { fill: '#22d3ee', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(70, 130, 260, 35, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 155, 'V(t) = V0(1 - e^(-t/tau))', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.text(200, 190, 'tau = R x C (time constant)', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Percentage milestones
    r.roundRect(30, 220, 340, 140, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 250, 'Key Milestones', { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    const milestones = [
      { tau: 1, pct: 63.2 },
      { tau: 2, pct: 86.5 },
      { tau: 3, pct: 95.0 },
      { tau: 5, pct: 99.3 }
    ];

    milestones.forEach((m, i) => {
      const x = 60 + (i % 2) * 150;
      const y = 275 + Math.floor(i / 2) * 40;
      r.text(x + 60, y, `${m.tau} tau = ${m.pct}%`, { fill: '#fef08a', fontSize: 12, textAnchor: 'middle' });
    });

    // Key insight
    r.roundRect(30, 375, 340, 100, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 405, 'Key Insight', { fill: '#34d399', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 435, 'After 5 time constants, capacitor is', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 458, 'effectively fully charged (99.3%)!', { fill: '#34d399', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Discharging', variant: 'secondary' });

    r.setCoachMessage('Now see what happens when we disconnect the battery...');
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist: Discharging', { fill: '#a855f7', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'A fully charged capacitor is disconnected', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'from the battery and allowed to discharge.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 180, 'How does the voltage drop?', { fill: '#a855f7', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Instantly to zero',
      'Linearly at constant rate',
      'Exponentially (fast then slow)',
      'Stays the same (holds charge)'
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
      const message = this.twistPrediction === 2 ? 'Exactly right!' : 'Exponentially - mirror of charging!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 530, 'Discharge is the reverse exponential:', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 550, 'fast at first, then slower.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Discharging', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Discharge Lab', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Circuit diagram (discharge)
    r.roundRect(30, 80, 340, 100, 12, { fill: 'rgba(15, 23, 42, 0.8)' });

    // Capacitor
    r.rect(155, 100, 3, 50, { fill: '#22d3ee' });
    r.rect(168, 100, 3, 50, { fill: '#22d3ee' });

    // Resistor
    r.roundRect(220, 115, 60, 20, 4, { fill: '#ef4444' });

    // Wires (discharge path)
    r.line(171, 110, 220, 110, { stroke: '#64748b', strokeWidth: 2 });
    r.line(280, 110, 320, 110, { stroke: '#64748b', strokeWidth: 2 });
    r.line(320, 110, 320, 150, { stroke: '#64748b', strokeWidth: 2 });
    r.line(171, 150, 320, 150, { stroke: '#64748b', strokeWidth: 2 });

    r.text(200, 170, 'Discharging through resistor', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Voltage display
    r.roundRect(100, 195, 200, 60, 10, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 220, 'Capacitor Voltage', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 248, `${this.capacitorVoltage.toFixed(2)}V`, { fill: '#a855f7', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Discharge percentage bar
    const dischargePercent = (this.capacitorVoltage / this.supplyVoltage) * 100;
    r.roundRect(50, 270, 300, 20, 4, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.roundRect(50, 270, dischargePercent * 3, 20, 4, { fill: '#a855f7' });
    r.text(200, 305, `${dischargePercent.toFixed(1)}% remaining`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Comparison
    r.roundRect(40, 330, 150, 80, 10, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(115, 355, 'Charging', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(115, 380, 'V0(1-e^(-t/tau))', { fill: '#67e8f9', fontSize: 10, textAnchor: 'middle' });
    r.text(115, 400, 'Rises to V0', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.roundRect(210, 330, 150, 80, 10, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(285, 355, 'Discharging', { fill: '#a855f7', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(285, 380, 'V0 * e^(-t/tau)', { fill: '#c4b5fd', fontSize: 10, textAnchor: 'middle' });
    r.text(285, 400, 'Falls to 0', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Buttons
    if (!this.isDischarging && this.capacitorVoltage > 0.1) {
      r.addButton({ id: 'start_discharging', label: 'Start Discharge', variant: 'primary' });
    }
    if (this.capacitorVoltage < this.supplyVoltage * 0.5) {
      r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
    }
    if (this.capacitorVoltage < 0.5) {
      r.addButton({ id: 'continue', label: 'Complete Review', variant: 'primary' });
    }
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Symmetry of RC Circuits', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Charging vs Discharging
    r.roundRect(25, 85, 170, 180, 12, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(110, 115, 'Charging', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 145, 'V = V0(1-e^(-t/tau))', { fill: '#67e8f9', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 175, 'At 1 tau: 63%', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 200, 'At 5 tau: 99%', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 240, '0 -> V0', { fill: '#22d3ee', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(205, 85, 170, 180, 12, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(290, 115, 'Discharging', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 145, 'V = V0 * e^(-t/tau)', { fill: '#c4b5fd', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 175, 'At 1 tau: 37%', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 200, 'At 5 tau: 1%', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 240, 'V0 -> 0', { fill: '#a855f7', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Key insight
    r.roundRect(25, 280, 350, 90, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 310, 'The Magic of tau = RC', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 340, 'Same time constant governs both!', { fill: '#fef08a', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 360, 'tau determines how fast energy flows.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Applications teaser
    r.roundRect(40, 390, 320, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 420, 'Applications Everywhere!', { fill: '#ffffff', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 448, 'Camera flash, defibrillators, timers, filters...', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    const appIcons = ['camera', 'heart', 'clock', 'wave'];
    const appLabels = ['Flash', 'Defib', 'Timer', 'Filter'];

    appIcons.forEach((icon, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#0891b2';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 50, 8, { fill: bgColor });
      r.text(x + 40, 100, appLabels[i], { fill: '#ffffff', fontSize: 10, textAnchor: 'middle' });
      if (isCompleted) r.text(x + 40, 118, '(done)', { fill: '#34d399', fontSize: 8, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 145, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 180, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 205, app.tagline, { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });

    // Description (multi-line)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 235;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Physics connection
    r.roundRect(40, 330, 320, 70, 10, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 355, 'Physics Connection', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 380, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 420, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 460, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

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
      const scenarioWords = question.scenario.split(' ');
      let scenarioLine = '';
      let scenarioY = 120;
      scenarioWords.forEach(word => {
        if ((scenarioLine + word).length > 48) {
          r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
          scenarioLine = word + ' ';
          scenarioY += 16;
        } else {
          scenarioLine += word + ' ';
        }
      });
      if (scenarioLine) r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      // Question
      r.text(200, 195, question.question, { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 220 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(6, 182, 212, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        const displayOption = option.length > 42 ? option.substring(0, 42) + '...' : option;
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${displayOption}`, { fill: isSelected ? '#22d3ee' : '#e2e8f0', fontSize: 11 });

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
      r.text(200, 130, score >= 7 ? 'Excellent!' : 'Keep Learning!', { fill: score >= 7 ? '#34d399' : '#fbbf24', fontSize: 24, textAnchor: 'middle' });
      r.text(200, 180, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "You've mastered RC circuits!" : 'Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 160, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'tau = R x C (time constant)',
        '1 tau = 63% charged/37% discharged',
        '5 tau = fully charged/discharged',
        'Exponential curves govern RC behavior'
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
    r.text(200, 120, 'MASTERY', { fill: '#fbbf24', fontSize: 48, fontWeight: 'bold', textAnchor: 'middle' });

    // Title
    r.text(200, 180, 'RC Circuit Expert!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 210, 'You understand exponential charging', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 232, 'and discharging in RC circuits!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { label: 'tau = R x C', color: '#22d3ee' },
      { label: 'Exponential Curves', color: '#a855f7' },
      { label: '5 tau Rule', color: '#fbbf24' },
      { label: 'Energy Storage', color: '#10b981' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 270 + Math.floor(i / 2) * 70;
      r.roundRect(x, y, 140, 55, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 35, concept.label, { fill: concept.color, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 430, 300, 80, 12, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 458, 'Key Formulas', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 485, 'Charge: V = V0(1-e^(-t/tau))', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 502, 'Discharge: V = V0*e^(-t/tau)', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering RC circuits!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      resistance: this.resistance,
      capacitance: this.capacitance,
      supplyVoltage: this.supplyVoltage,
      capacitorVoltage: this.capacitorVoltage,
      isCharging: this.isCharging,
      isDischarging: this.isDischarging,
      elapsedTime: this.elapsedTime,
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
    if (state.resistance !== undefined) this.resistance = state.resistance as number;
    if (state.capacitance !== undefined) this.capacitance = state.capacitance as number;
    if (state.supplyVoltage !== undefined) this.supplyVoltage = state.supplyVoltage as number;
    if (state.capacitorVoltage !== undefined) this.capacitorVoltage = state.capacitorVoltage as number;
    if (state.isCharging !== undefined) this.isCharging = state.isCharging as boolean;
    if (state.isDischarging !== undefined) this.isDischarging = state.isDischarging as boolean;
    if (state.elapsedTime !== undefined) this.elapsedTime = state.elapsedTime as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createRCTimeConstantGame(sessionId: string): RCTimeConstantGame {
  return new RCTimeConstantGame(sessionId);
}
