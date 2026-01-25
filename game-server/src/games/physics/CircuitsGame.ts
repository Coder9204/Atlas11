import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// CIRCUITS GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Ohm's Law (V = IR), Series and Parallel circuits
// Series: R_total = R1 + R2, same current through all
// Parallel: 1/R_total = 1/R1 + 1/R2, same voltage across all
// Power: P = VI = I^2*R = V^2/R
// ============================================================================

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number; // PROTECTED: Never sent to client
  explanation: string;
}

interface TransferApp {
  title: string;
  description: string;
  fact: string;
}

// Physics colors
const VOLTAGE_COLOR = '#FBBF24';
const CURRENT_COLOR = '#3B82F6';
const RESISTANCE_COLOR = '#EF4444';

export class CircuitsGame extends BaseGame {
  readonly gameType = 'circuits';
  readonly gameTitle = 'Circuits & Ohm\'s Law';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Ohm's Law simulation
  private voltage = 12;
  private resistance = 4;
  private isCircuitOn = false;
  private animationTime = 0;

  // Series vs Parallel simulation
  private circuitType: 'series' | 'parallel' = 'series';
  private r1 = 4;
  private r2 = 4;
  private twistVoltage = 12;

  // Review steps
  private reviewStep = 0;
  private twistReviewStep = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      question: "According to Ohm's Law, if you double the voltage across a resistor, the current will:",
      options: ["Stay the same", "Double", "Halve", "Quadruple"],
      correctIndex: 1,
      explanation: "Ohm's Law: V = IR. If R is constant and V doubles, then I must also double to maintain the equation."
    },
    {
      question: "What is the unit of electrical resistance?",
      options: ["Volt", "Ampere", "Ohm", "Watt"],
      correctIndex: 2,
      explanation: "Resistance is measured in Ohms (Omega), named after Georg Ohm who discovered the relationship V = IR."
    },
    {
      question: "In a series circuit, if one bulb burns out, what happens?",
      options: ["Other bulbs get brighter", "Other bulbs go out too", "Other bulbs stay the same", "The battery overheats"],
      correctIndex: 1,
      explanation: "In a series circuit, there's only one path for current. If one component breaks, the circuit is broken and all components stop working."
    },
    {
      question: "The total resistance in a parallel circuit is:",
      options: ["Equal to the sum of all resistances", "Greater than the largest resistance", "Less than the smallest resistance", "Always zero"],
      correctIndex: 2,
      explanation: "In parallel, 1/R_total = 1/R1 + 1/R2 + ... This always results in a total resistance LESS than any individual resistance."
    },
    {
      question: "Current in a series circuit:",
      options: ["Is different through each component", "Is the same through all components", "Only flows through the battery", "Flows backwards"],
      correctIndex: 1,
      explanation: "In a series circuit, there's only one path, so all components must carry the same current. Current is conserved!"
    },
    {
      question: "Power in an electrical circuit is calculated as:",
      options: ["P = V + I", "P = V - I", "P = V x I", "P = V / I"],
      correctIndex: 2,
      explanation: "Electrical power P = VI (voltage times current). This can also be written as P = I^2*R or P = V^2/R."
    },
    {
      question: "In a parallel circuit, what stays the same across all branches?",
      options: ["Current", "Resistance", "Voltage", "Power"],
      correctIndex: 2,
      explanation: "In parallel, all branches connect directly to the power source, so they all have the same voltage across them."
    },
    {
      question: "What happens to circuit current if you increase resistance (keeping voltage constant)?",
      options: ["Current increases", "Current decreases", "Current stays the same", "Current reverses direction"],
      correctIndex: 1,
      explanation: "From V = IR, if V is constant and R increases, I must decrease. Higher resistance means less current flows."
    },
    {
      question: "A 12V battery pushes current through a 6 ohm resistor. The current is:",
      options: ["2 A", "6 A", "72 A", "0.5 A"],
      correctIndex: 0,
      explanation: "Using Ohm's Law: I = V/R = 12V / 6 ohm = 2 Amperes."
    },
    {
      question: "Why do household circuits use parallel wiring instead of series?",
      options: ["It's cheaper", "Each device can operate independently", "It uses less wire", "It's more dangerous"],
      correctIndex: 1,
      explanation: "Parallel wiring lets each device operate independently - turning off a lamp doesn't affect your TV. Each gets full voltage!"
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      title: "Home Electrical Systems",
      description: "Your home uses parallel circuits so each outlet operates independently at 120V (or 240V). If one light burns out, others stay on. Circuit breakers protect against too much current.",
      fact: "A typical US home has 100-200 amp service - enough to power everything from lights to air conditioners simultaneously!"
    },
    {
      title: "Electric Vehicles",
      description: "EV batteries combine thousands of cells in series and parallel. Series increases voltage (for power), parallel increases capacity (for range). Battery management systems monitor each cell using Ohm's Law principles.",
      fact: "A Tesla Model S battery has over 7,000 individual cells arranged in a complex series-parallel configuration!"
    },
    {
      title: "Computer Processors",
      description: "Computer chips contain billions of tiny transistors (essentially switches). Each transistor's behavior follows Ohm's Law. Engineers must carefully manage current flow to prevent overheating.",
      fact: "A modern CPU can have over 50 billion transistors, each switching billions of times per second!"
    },
    {
      title: "USB & Charging",
      description: "USB chargers must provide specific voltages and currents. Fast charging works by increasing current (more amps) or voltage. Ohm's Law determines how quickly energy transfers to your device.",
      fact: "USB-C Power Delivery can supply up to 240W - enough to charge laptops at 48V x 5A!"
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate current using Ohm's Law
  private calculateCurrent(): number {
    return this.voltage / this.resistance;
  }

  // PROTECTED: Calculate series circuit values
  private getSeriesValues(): { totalR: number; i: number; v1: number; v2: number } {
    const totalR = this.r1 + this.r2;
    const i = this.twistVoltage / totalR;
    const v1 = i * this.r1;
    const v2 = i * this.r2;
    return { totalR, i, v1, v2 };
  }

  // PROTECTED: Calculate parallel circuit values
  private getParallelValues(): { totalR: number; i: number; i1: number; i2: number } {
    const totalR = (this.r1 * this.r2) / (this.r1 + this.r2);
    const i = this.twistVoltage / totalR;
    const i1 = this.twistVoltage / this.r1;
    const i2 = this.twistVoltage / this.r2;
    return { totalR, i, i1, i2 };
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
      switch (input.id) {
        case 'voltage':
          this.voltage = Math.max(1, Math.min(24, input.value));
          break;
        case 'resistance':
          this.resistance = Math.max(1, Math.min(20, input.value));
          break;
        case 'r1':
          this.r1 = Math.max(1, Math.min(10, input.value));
          break;
        case 'r2':
          this.r2 = Math.max(1, Math.min(10, input.value));
          break;
      }
    }
  }

  private handleButtonClick(buttonId: string): void {
    switch (this.phase) {
      case 'hook':
        if (buttonId === 'explore') {
          this.phase = 'predict';
        }
        break;

      case 'predict':
        if (buttonId.startsWith('pred_')) {
          this.prediction = buttonId.replace('pred_', '');
        } else if (buttonId === 'continue' && this.prediction) {
          this.phase = 'play';
        }
        break;

      case 'play':
        if (buttonId === 'toggle_circuit') {
          this.isCircuitOn = !this.isCircuitOn;
        } else if (buttonId === 'continue') {
          this.phase = 'review';
        }
        break;

      case 'review':
        if (buttonId === 'next_step' && this.reviewStep < 3) {
          this.reviewStep++;
        } else if (buttonId === 'prev_step' && this.reviewStep > 0) {
          this.reviewStep--;
        } else if (buttonId === 'continue' && this.reviewStep === 3) {
          this.phase = 'twist_predict';
        }
        break;

      case 'twist_predict':
        if (buttonId.startsWith('twist_')) {
          this.twistPrediction = buttonId.replace('twist_', '');
        } else if (buttonId === 'continue' && this.twistPrediction) {
          this.phase = 'twist_play';
        }
        break;

      case 'twist_play':
        if (buttonId === 'circuit_series') {
          this.circuitType = 'series';
        } else if (buttonId === 'circuit_parallel') {
          this.circuitType = 'parallel';
        } else if (buttonId === 'continue') {
          this.phase = 'twist_review';
        }
        break;

      case 'twist_review':
        if (buttonId === 'next_step' && this.twistReviewStep < 2) {
          this.twistReviewStep++;
        } else if (buttonId === 'prev_step' && this.twistReviewStep > 0) {
          this.twistReviewStep--;
        } else if (buttonId === 'continue' && this.twistReviewStep === 2) {
          this.phase = 'transfer';
        }
        break;

      case 'transfer':
        if (buttonId.startsWith('app_')) {
          this.activeAppIndex = parseInt(buttonId.split('_')[1]);
        } else if (buttonId === 'mark_read') {
          this.completedApps.add(this.activeAppIndex);
          if (this.activeAppIndex < 3) {
            this.activeAppIndex++;
          }
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
    this.voltage = 12;
    this.resistance = 4;
    this.isCircuitOn = false;
    this.circuitType = 'series';
    this.r1 = 4;
    this.r2 = 4;
    this.reviewStep = 0;
    this.twistReviewStep = 0;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    r.clear('#0f0f1a');

    // Background orbs
    r.circle(100, 100, 150, { fill: 'rgba(251, 191, 36, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(245, 158, 11, 0.05)' });

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
    r.roundRect(120, 50, 160, 30, 8, { fill: 'rgba(251, 191, 36, 0.1)' });
    r.text(200, 70, 'PHYSICS EXPLORATION', { fill: VOLTAGE_COLOR, fontSize: 10, textAnchor: 'middle' });

    r.text(200, 120, "Circuits & Ohm's Law", { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 155, 'Discover the fundamental relationship', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 175, 'between voltage, current, and resistance', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    r.text(200, 260, '...', { fill: VOLTAGE_COLOR, fontSize: 64, textAnchor: 'middle' });

    r.roundRect(40, 320, 320, 130, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 355, 'Every time you flip a light switch,', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 380, 'electricity flows through circuits.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 420, 'What controls how much electricity flows?', { fill: VOLTAGE_COLOR, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'explore', label: "Explore Ohm's Law", variant: 'primary' });

    r.setCoachMessage('Learn the law that governs all electronics!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 95, 'How does increasing voltage affect', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 115, 'the current flowing through a resistor?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    const options = [
      { id: 'direct', text: 'Current increases (V and I are directly proportional)' },
      { id: 'inverse', text: 'Current decreases (V and I are inversely proportional)' },
      { id: 'none', text: "Voltage doesn't affect current at all" },
      { id: 'complex', text: 'The relationship is complex and unpredictable' }
    ];

    options.forEach((opt, i) => {
      const y = 150 + i * 60;
      const isSelected = this.prediction === opt.id;
      const bgColor = isSelected ? 'rgba(251, 191, 36, 0.3)' : 'rgba(51, 65, 85, 0.5)';

      r.roundRect(25, y, 350, 52, 10, { fill: bgColor });
      if (isSelected) {
        r.roundRect(25, y, 350, 52, 10, { fill: 'none', stroke: VOLTAGE_COLOR, strokeWidth: 2 });
      }
      const displayText = opt.text.length > 50 ? opt.text.substring(0, 47) + '...' : opt.text;
      r.text(40, y + 30, displayText, { fill: '#e2e8f0', fontSize: 11 });

      r.addButton({ id: `pred_${opt.id}`, label: '', variant: 'secondary' });
    });

    if (this.prediction) {
      r.addButton({ id: 'continue', label: 'Test My Prediction', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 50, "Ohm's Law Simulator", { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    const current = this.calculateCurrent();

    // Circuit visualization
    r.roundRect(25, 80, 200, 200, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Circuit wires
    const wireColor = this.isCircuitOn ? VOLTAGE_COLOR : '#666666';
    r.roundRect(50, 100, 150, 120, 8, { fill: 'none', stroke: wireColor, strokeWidth: 3 });

    // Battery
    r.rect(30, 140, 20, 40, { fill: 'rgba(37, 37, 66, 1)', stroke: VOLTAGE_COLOR, strokeWidth: 2 });
    r.text(40, 200, `${this.voltage}V`, { fill: VOLTAGE_COLOR, fontSize: 11, textAnchor: 'middle' });

    // Resistor
    r.rect(100, 88, 50, 20, { fill: 'rgba(37, 37, 66, 1)', stroke: RESISTANCE_COLOR, strokeWidth: 2 });
    r.text(125, 122, `${this.resistance}ohm`, { fill: RESISTANCE_COLOR, fontSize: 10, textAnchor: 'middle' });

    // Light bulb indicator
    const bulbBrightness = this.isCircuitOn ? Math.min(1, current / 5) : 0;
    r.circle(125, 180, 15, { fill: this.isCircuitOn ? `rgba(251, 191, 36, ${bulbBrightness})` : 'rgba(100, 100, 100, 0.3)', stroke: '#888888', strokeWidth: 2 });

    // Electron dots (animated positions)
    if (this.isCircuitOn) {
      for (let i = 0; i < 8; i++) {
        const pathPos = ((this.animationTime * current * 30) + i * 12.5) % 100;
        let ex, ey;
        if (pathPos < 25) {
          ex = 60 + (pathPos / 25) * 130;
          ey = 205;
        } else if (pathPos < 50) {
          ex = 190;
          ey = 205 - ((pathPos - 25) / 25) * 100;
        } else if (pathPos < 75) {
          ex = 190 - ((pathPos - 50) / 25) * 130;
          ey = 105;
        } else {
          ex = 60;
          ey = 105 + ((pathPos - 75) / 25) * 100;
        }
        r.circle(ex, ey, 4, { fill: CURRENT_COLOR });
      }
    }

    // Controls panel
    r.roundRect(240, 80, 145, 200, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(312, 105, 'Voltage', { fill: VOLTAGE_COLOR, fontSize: 12, textAnchor: 'middle' });
    r.text(312, 125, `${this.voltage}V`, { fill: VOLTAGE_COLOR, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(312, 160, 'Resistance', { fill: RESISTANCE_COLOR, fontSize: 12, textAnchor: 'middle' });
    r.text(312, 180, `${this.resistance} ohm`, { fill: RESISTANCE_COLOR, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(312, 215, 'Current', { fill: CURRENT_COLOR, fontSize: 12, textAnchor: 'middle' });
    r.text(312, 240, `${current.toFixed(2)}A`, { fill: CURRENT_COLOR, fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Ohm's Law formula
    r.roundRect(30, 295, 340, 45, 10, { fill: 'rgba(251, 191, 36, 0.1)' });
    r.text(200, 322, `V = I x R -> ${this.voltage}V = ${current.toFixed(2)}A x ${this.resistance} ohm`, { fill: '#ffffff', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Sliders
    r.addSlider({ id: 'voltage', label: 'Voltage (V)', min: 1, max: 24, step: 1, value: this.voltage });
    r.addSlider({ id: 'resistance', label: 'Resistance (ohm)', min: 1, max: 20, step: 1, value: this.resistance });

    r.addButton({ id: 'toggle_circuit', label: this.isCircuitOn ? 'Turn Off' : 'Turn On', variant: this.isCircuitOn ? 'secondary' : 'primary' });

    // Insight
    r.roundRect(30, 420, 340, 60, 12, { fill: 'rgba(251, 191, 36, 0.1)' });
    r.text(200, 445, 'When V goes up, current goes up.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 465, "When R goes up, current goes down. That's Ohm's Law!", { fill: VOLTAGE_COLOR, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review Results', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, "Understanding Ohm's Law", { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const reviewContent = [
      { title: "Ohm's Law: V = IR", content: "Voltage equals Current times Resistance. This simple equation governs all electrical circuits!", formula: "V = I x R, or I = V/R" },
      { title: "Direct Proportionality", content: "Current is directly proportional to voltage. Double the voltage = double the current!", formula: "I is proportional to V (when R constant)" },
      { title: "Inverse Proportionality", content: "Current is inversely proportional to resistance. Double the resistance = half the current!", formula: "I is proportional to 1/R (when V constant)" },
      { title: "Your Prediction", content: this.prediction === 'direct' ? "Correct! V and I are directly proportional." : "The correct answer is: V and I are directly proportional.", formula: "More V = More I" }
    ];

    const content = reviewContent[this.reviewStep];

    r.roundRect(30, 90, 340, 250, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 125, content.title, { fill: VOLTAGE_COLOR, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Word wrap content
    const words = content.content.split(' ');
    let line = '';
    let lineY = 165;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 22;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });

    // Formula box
    r.roundRect(70, 260, 260, 40, 8, { fill: 'rgba(251, 191, 36, 0.1)' });
    r.text(200, 285, content.formula, { fill: VOLTAGE_COLOR, fontSize: 14, textAnchor: 'middle' });

    // Step indicators
    for (let i = 0; i < 4; i++) {
      const color = i === this.reviewStep ? VOLTAGE_COLOR : '#334155';
      r.roundRect(140 + i * 30, 320, 20, 6, 3, { fill: color });
    }

    // Navigation
    if (this.reviewStep > 0) {
      r.addButton({ id: 'prev_step', label: 'Previous', variant: 'secondary' });
    }
    if (this.reviewStep < 3) {
      r.addButton({ id: 'next_step', label: 'Continue', variant: 'primary' });
    } else {
      r.addButton({ id: 'continue', label: 'Try a Twist', variant: 'primary' });
    }
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'The Twist: Series vs Parallel', { fill: '#8b5cf6', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 90, 'What happens when you connect two', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 110, 'resistors in series vs parallel?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    const options = [
      { id: 'series', text: 'Series: total resistance is the sum' },
      { id: 'parallel_sum', text: 'Parallel: total resistance is the sum' },
      { id: 'parallel_less', text: 'Parallel: total resistance is LESS than any individual' },
      { id: 'same', text: 'Both give the same total resistance' }
    ];

    options.forEach((opt, i) => {
      const y = 145 + i * 60;
      const isSelected = this.twistPrediction === opt.id;
      const bgColor = isSelected ? 'rgba(139, 92, 246, 0.3)' : 'rgba(51, 65, 85, 0.5)';

      r.roundRect(25, y, 350, 52, 10, { fill: bgColor });
      if (isSelected) {
        r.roundRect(25, y, 350, 52, 10, { fill: 'none', stroke: '#8b5cf6', strokeWidth: 2 });
      }
      r.text(40, y + 30, opt.text, { fill: '#e2e8f0', fontSize: 12 });

      r.addButton({ id: `twist_${opt.id}`, label: '', variant: 'secondary' });
    });

    if (this.twistPrediction) {
      r.addButton({ id: 'continue', label: 'Test My Prediction', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Series vs Parallel Circuits', { fill: '#8b5cf6', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const seriesVals = this.getSeriesValues();
    const parallelVals = this.getParallelValues();
    const vals = this.circuitType === 'series' ? seriesVals : parallelVals;

    // Circuit visualization
    r.roundRect(25, 80, 220, 200, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    if (this.circuitType === 'series') {
      // Series circuit
      r.roundRect(45, 100, 180, 120, 8, { fill: 'none', stroke: VOLTAGE_COLOR, strokeWidth: 3 });

      // Battery
      r.rect(25, 140, 20, 40, { fill: 'rgba(37, 37, 66, 1)', stroke: VOLTAGE_COLOR, strokeWidth: 2 });
      r.text(35, 195, `${this.twistVoltage}V`, { fill: VOLTAGE_COLOR, fontSize: 10, textAnchor: 'middle' });

      // Resistor 1
      r.rect(80, 88, 40, 16, { fill: 'rgba(37, 37, 66, 1)', stroke: RESISTANCE_COLOR, strokeWidth: 2 });
      r.text(100, 120, `R1=${this.r1}ohm`, { fill: RESISTANCE_COLOR, fontSize: 9, textAnchor: 'middle' });

      // Resistor 2
      r.rect(145, 88, 40, 16, { fill: 'rgba(37, 37, 66, 1)', stroke: RESISTANCE_COLOR, strokeWidth: 2 });
      r.text(165, 120, `R2=${this.r2}ohm`, { fill: RESISTANCE_COLOR, fontSize: 9, textAnchor: 'middle' });

      r.text(135, 165, 'SERIES', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(135, 185, `R_total = ${seriesVals.totalR} ohm`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
      r.text(135, 200, `I = ${seriesVals.i.toFixed(2)}A`, { fill: CURRENT_COLOR, fontSize: 10, textAnchor: 'middle' });
    } else {
      // Parallel circuit
      r.line(45, 100, 45, 200, { stroke: VOLTAGE_COLOR, strokeWidth: 3 });
      r.line(210, 100, 210, 200, { stroke: VOLTAGE_COLOR, strokeWidth: 3 });
      r.line(45, 100, 210, 100, { stroke: VOLTAGE_COLOR, strokeWidth: 3 });
      r.line(45, 200, 210, 200, { stroke: VOLTAGE_COLOR, strokeWidth: 3 });

      // Battery
      r.rect(25, 130, 20, 40, { fill: 'rgba(37, 37, 66, 1)', stroke: VOLTAGE_COLOR, strokeWidth: 2 });
      r.text(35, 185, `${this.twistVoltage}V`, { fill: VOLTAGE_COLOR, fontSize: 10, textAnchor: 'middle' });

      // Branch lines
      r.line(90, 100, 90, 125, { stroke: VOLTAGE_COLOR, strokeWidth: 2 });
      r.line(90, 160, 90, 200, { stroke: VOLTAGE_COLOR, strokeWidth: 2 });
      r.line(165, 100, 165, 125, { stroke: VOLTAGE_COLOR, strokeWidth: 2 });
      r.line(165, 160, 165, 200, { stroke: VOLTAGE_COLOR, strokeWidth: 2 });

      // Resistor 1
      r.rect(70, 125, 40, 16, { fill: 'rgba(37, 37, 66, 1)', stroke: RESISTANCE_COLOR, strokeWidth: 2 });
      r.text(90, 155, `R1=${this.r1}ohm`, { fill: RESISTANCE_COLOR, fontSize: 9, textAnchor: 'middle' });

      // Resistor 2
      r.rect(145, 125, 40, 16, { fill: 'rgba(37, 37, 66, 1)', stroke: RESISTANCE_COLOR, strokeWidth: 2 });
      r.text(165, 155, `R2=${this.r2}ohm`, { fill: RESISTANCE_COLOR, fontSize: 9, textAnchor: 'middle' });

      r.text(135, 220, 'PARALLEL', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(135, 238, `R_total = ${parallelVals.totalR.toFixed(2)} ohm`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
      r.text(135, 253, `V = ${this.twistVoltage}V across both`, { fill: VOLTAGE_COLOR, fontSize: 10, textAnchor: 'middle' });
    }

    // Controls
    r.roundRect(255, 80, 130, 200, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(320, 100, 'Circuit Type', { fill: '#ffffff', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'circuit_series', label: 'Series', variant: this.circuitType === 'series' ? 'primary' : 'secondary' });
    r.addButton({ id: 'circuit_parallel', label: 'Parallel', variant: this.circuitType === 'parallel' ? 'primary' : 'secondary' });

    r.text(320, 195, `R1: ${this.r1} ohm`, { fill: RESISTANCE_COLOR, fontSize: 11, textAnchor: 'middle' });
    r.text(320, 230, `R2: ${this.r2} ohm`, { fill: RESISTANCE_COLOR, fontSize: 11, textAnchor: 'middle' });

    // Sliders
    r.addSlider({ id: 'r1', label: 'R1 (ohm)', min: 1, max: 10, step: 1, value: this.r1 });
    r.addSlider({ id: 'r2', label: 'R2 (ohm)', min: 1, max: 10, step: 1, value: this.r2 });

    // Insight box
    r.roundRect(30, 360, 340, 70, 12, { fill: 'rgba(139, 92, 246, 0.1)' });
    r.text(200, 385, `Parallel R (${parallelVals.totalR.toFixed(2)} ohm) is LESS than`, { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 405, `the smallest resistor (${Math.min(this.r1, this.r2)} ohm)!`, { fill: '#8b5cf6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review Results', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Circuit Analysis', { fill: '#8b5cf6', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const reviewContent = [
      { title: 'Series: Resistances Add Up', content: 'In series, current has only ONE path and must flow through BOTH resistors. Total resistance = R1 + R2. Same current through everything!', correct: this.twistPrediction === 'series' },
      { title: 'Parallel: Less Than the Smallest!', content: 'In parallel, current has MULTIPLE paths. More paths = easier flow = LESS total resistance! Always less than the smallest resistor.', correct: this.twistPrediction === 'parallel_less' },
      { title: 'Why It Matters', content: 'Series: components share current (like string lights). Parallel: components operate independently and get full voltage (like home outlets).', correct: true }
    ];

    const content = reviewContent[this.twistReviewStep];

    r.roundRect(30, 90, 340, 220, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 125, content.title, { fill: '#8b5cf6', fontSize: 17, fontWeight: 'bold', textAnchor: 'middle' });

    // Word wrap content
    const words = content.content.split(' ');
    let line = '';
    let lineY = 165;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 42) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 20;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Feedback if applicable
    if (this.twistReviewStep < 2 && content.correct) {
      r.roundRect(50, 260, 300, 35, 8, { fill: 'rgba(16, 185, 129, 0.2)' });
      r.text(200, 282, 'You predicted correctly!', { fill: '#10b981', fontSize: 12, textAnchor: 'middle' });
    }

    // Step indicators
    for (let i = 0; i < 3; i++) {
      const color = i === this.twistReviewStep ? '#8b5cf6' : '#334155';
      r.roundRect(155 + i * 30, 320, 20, 6, 3, { fill: color });
    }

    // Navigation
    if (this.twistReviewStep > 0) {
      r.addButton({ id: 'prev_step', label: 'Previous', variant: 'secondary' });
    }
    if (this.twistReviewStep < 2) {
      r.addButton({ id: 'next_step', label: 'Continue', variant: 'primary' });
    } else {
      r.addButton({ id: 'continue', label: 'Real-World Examples', variant: 'primary' });
    }
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Circuits in the Real World', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Progress dots
    this.transferApps.forEach((_, i) => {
      const x = 140 + i * 40;
      const color = this.completedApps.has(i) ? '#10b981' : (i === this.activeAppIndex ? VOLTAGE_COLOR : '#334155');
      r.circle(x, 85, 6, { fill: color });
    });

    // Tab buttons
    this.transferApps.forEach((app, i) => {
      const x = 45 + i * 90;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = 'rgba(251, 191, 36, 0.3)';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.15)';

      r.roundRect(x, 100, 80, 35, 8, { fill: bgColor });
      const label = app.title.split(' ')[0];
      r.text(x + 40, 122, label, { fill: isActive || isCompleted ? VOLTAGE_COLOR : '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(30, 150, 340, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 185, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Description
    const words = app.description.split(' ');
    let line = '';
    let lineY = 220;
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

    // Fact box
    r.roundRect(45, 330, 310, 70, 10, { fill: 'rgba(251, 191, 36, 0.1)' });
    r.text(200, 355, 'Fun Fact:', { fill: VOLTAGE_COLOR, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    const factText = app.fact.length > 60 ? app.fact.substring(0, 57) + '...' : app.fact;
    r.text(200, 380, factText, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark as read button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_read', label: 'Mark as Read', variant: 'secondary' });
    } else {
      r.text(200, 420, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Continue button
    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take the Quiz', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Knowledge Check', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Question
      const qText = question.question.length > 55 ? question.question.substring(0, 52) + '...' : question.question;
      r.text(200, 125, qText, { fill: VOLTAGE_COLOR, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 155 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(251, 191, 36, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        const optionText = option.length > 45 ? option.substring(0, 42) + '...' : option;
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${optionText}`, { fill: isSelected ? VOLTAGE_COLOR : '#e2e8f0', fontSize: 11 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      // Navigation
      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: 'Previous', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next', variant: 'secondary' });
      }

      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      } else {
        r.text(200, 425, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      const score = this.calculateScore();
      const percentage = Math.round((score / 10) * 100);

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '' : '', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, `${percentage}%`, { fill: VOLTAGE_COLOR, fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 140, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts:', { fill: VOLTAGE_COLOR, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        "Ohm's Law: V = IR",
        'Series: R_total = R1 + R2',
        'Parallel: R_total < smallest R',
        'Power: P = V x I'
      ];
      concepts.forEach((concept, i) => {
        r.text(200, 340 + i * 22, concept, { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Complete Journey', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 120, '', { fontSize: 72, textAnchor: 'middle' });

    r.text(200, 200, 'Circuit Master!', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });

    const score = this.calculateScore();
    r.text(200, 240, `${Math.round((score / 10) * 100)}%`, { fill: VOLTAGE_COLOR, fontSize: 36, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 270, `${score}/10 correct answers`, { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: 'V', label: "Ohm's Law" },
      { icon: '-', label: 'Series' },
      { icon: '||', label: 'Parallel' },
      { icon: 'P', label: 'Power' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 300 + Math.floor(i / 2) * 70;
      r.roundRect(x, y, 135, 55, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 67, y + 25, concept.icon, { fill: VOLTAGE_COLOR, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x + 67, y + 45, concept.label, { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    });

    r.addButton({ id: 'restart', label: 'Play Again', variant: 'secondary' });

    r.setCoachMessage("You now understand the fundamentals of electrical circuits!");
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      voltage: this.voltage,
      resistance: this.resistance,
      isCircuitOn: this.isCircuitOn,
      circuitType: this.circuitType,
      r1: this.r1,
      r2: this.r2,
      reviewStep: this.reviewStep,
      twistReviewStep: this.twistReviewStep,
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
    if (state.prediction !== undefined) this.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.voltage !== undefined) this.voltage = state.voltage as number;
    if (state.resistance !== undefined) this.resistance = state.resistance as number;
    if (state.isCircuitOn !== undefined) this.isCircuitOn = state.isCircuitOn as boolean;
    if (state.circuitType !== undefined) this.circuitType = state.circuitType as 'series' | 'parallel';
    if (state.r1 !== undefined) this.r1 = state.r1 as number;
    if (state.r2 !== undefined) this.r2 = state.r2 as number;
    if (state.reviewStep !== undefined) this.reviewStep = state.reviewStep as number;
    if (state.twistReviewStep !== undefined) this.twistReviewStep = state.twistReviewStep as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createCircuitsGame(sessionId: string): CircuitsGame {
  return new CircuitsGame(sessionId);
}
