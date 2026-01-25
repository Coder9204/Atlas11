import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// KIRCHHOFF'S LAWS GAME - SERVER-SIDE CIRCUIT ANALYSIS
// ============================================================================
// Physics: KCL - Sum of currents at node = 0 (conservation of charge)
//          KVL - Sum of voltages around loop = 0 (conservation of energy)
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

export class KirchhoffsLawsGame extends BaseGame {
  readonly gameType = 'kirchhoffs_laws';
  readonly gameTitle = "Kirchhoff's Laws: Circuit Fundamentals";

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private voltage1 = 12; // V
  private resistance1 = 200; // Ohms
  private resistance2 = 300; // Ohms
  private resistance3 = 400; // Ohms
  private showCurrentFlow = false;
  private selectedNode: 'A' | 'B' | 'C' | null = null;
  private selectedLoop: 1 | 2 | 3 | null = null;
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
      scenario: "You're designing a circuit board for a new smartphone. At a junction where the main power line splits to feed three components (display, processor, WiFi), the incoming current measures 2.5A.",
      question: "If the display draws 0.8A and the processor draws 1.2A, how much current flows to the WiFi module?",
      options: [
        "0.5A - The sum of currents entering must equal currents leaving",
        "1.0A - The current splits equally",
        "2.5A - All current goes to each branch",
        "Cannot be determined without voltage"
      ],
      correctIndex: 0,
      explanation: "By Kirchhoff's Current Law (KCL), sum of currents at any node = 0. If 2.5A enters and 0.8A + 1.2A = 2.0A leaves through two branches, the third branch must carry 2.5A - 2.0A = 0.5A."
    },
    {
      scenario: "An electrician is troubleshooting a series circuit with a 12V battery and three resistors. Measurements show 4V across the first resistor and 5V across the second.",
      question: "What voltage should appear across the third resistor?",
      options: [
        "3V - The voltages around the loop must sum to zero",
        "12V - Each resistor sees full battery voltage",
        "4V - Voltage divides equally",
        "9V - The remaining voltage after the first drop"
      ],
      correctIndex: 0,
      explanation: "By Kirchhoff's Voltage Law (KVL), the sum of voltages around any closed loop equals zero: +12V - 4V - 5V - V3 = 0, therefore V3 = 3V."
    },
    {
      scenario: "A solar panel array has four panels connected with a complex network. You measure currents at various points and find 3A from panel 1, 2.5A from panel 2, and 4A from panel 3 all meeting at junction A.",
      question: "What total current leaves junction A toward the inverter?",
      options: [
        "9.5A - Total current in equals total current out",
        "3.17A - Average of the three inputs",
        "4A - Only the largest current passes through",
        "Depends on the wire resistance"
      ],
      correctIndex: 0,
      explanation: "KCL states that charge is conserved at every node. If 3A + 2.5A + 4A = 9.5A enters junction A, exactly 9.5A must leave. This is independent of resistance."
    },
    {
      scenario: "You're analyzing a circuit with two parallel branches connected to a 9V source. One branch has a 30 ohm resistor, the other has a 45 ohm resistor.",
      question: "Applying KVL to each parallel branch, what can you conclude?",
      options: [
        "Each branch has exactly 9V across it since they share the same two nodes",
        "The 30 ohm branch has more voltage since it has less resistance",
        "The voltages add up to 9V split between branches",
        "Voltage distribution depends on current flow"
      ],
      correctIndex: 0,
      explanation: "In a parallel circuit, both branches connect to the same two nodes. By KVL, any path between the same two points must have the same voltage difference. Therefore, both branches have exactly 9V across them."
    },
    {
      scenario: "A car's electrical system has the battery connected to multiple circuits. The headlights draw 8A, the radio draws 2A, and the dashboard draws 1.5A. The alternator supplies charging current.",
      question: "If the battery is neither charging nor discharging, what current must the alternator supply?",
      options: [
        "11.5A - Must equal total load current for equilibrium",
        "13.5A - Battery needs extra current for charging",
        "8A - Only needs to match the largest load",
        "Cannot determine without voltage information"
      ],
      correctIndex: 0,
      explanation: "For the battery to maintain constant charge, KCL requires that current in equals current out. Total load is 8A + 2A + 1.5A = 11.5A, so the alternator must supply exactly 11.5A."
    },
    {
      scenario: "In a resistor network, you trace a loop that goes through: +24V source, -6V drop across R1, +3V from a second source, -15V across R2, and back to start.",
      question: "What voltage appears across the remaining element in this loop?",
      options: [
        "-6V (a 6V drop in the direction of travel)",
        "+6V (element adds energy to the circuit)",
        "0V (loop must have no missing elements)",
        "24V (returns to battery voltage)"
      ],
      correctIndex: 0,
      explanation: "By KVL: +24V - 6V + 3V - 15V + V_remaining = 0. Solving: 24 - 6 + 3 - 15 = 6V, so V_remaining = -6V (a drop of 6V)."
    },
    {
      scenario: "A technician connects an ammeter at three different points in a series circuit with a 10V source and two 100 ohm resistors.",
      question: "What will the ammeter read at each of the three points?",
      options: [
        "50mA at all three points - current is constant in series",
        "100mA, 50mA, 25mA - current decreases through circuit",
        "50mA before first resistor, 0mA after second resistor",
        "Different values depending on where measured"
      ],
      correctIndex: 0,
      explanation: "In a series circuit, there's only one path for current. By KCL, the same current (I = V/R_total = 10V/200 ohms = 50mA) must flow through every point to conserve charge."
    },
    {
      scenario: "A complex circuit has three loops sharing some common branches. An engineer applies KVL to analyze it.",
      question: "How many independent KVL equations can be written for a circuit with 3 loops that share components?",
      options: [
        "3 equations - one for each independent loop",
        "1 equation - all loops give the same result",
        "6 equations - KVL in both directions for each loop",
        "Depends on the number of components"
      ],
      correctIndex: 0,
      explanation: "Each independent loop provides one unique KVL equation. While you can trace multiple paths, only as many equations as independent loops (fundamental cycles) provide new information."
    },
    {
      scenario: "In a Wheatstone bridge used for precise measurements, current flows from node A through two parallel paths (R1-R3 and R2-R4) to node B, with a galvanometer connecting the midpoints.",
      question: "When the bridge is balanced and the galvanometer shows zero current, what does KCL tell us?",
      options: [
        "Current through R1 equals current through R3, and current through R2 equals current through R4",
        "All four resistors carry equal current",
        "No current flows in the entire circuit",
        "Current through R1 equals current through R2"
      ],
      correctIndex: 0,
      explanation: "At balance, zero current through the galvanometer means the current entering each midpoint equals the current leaving (excluding the galvanometer path). So I through R1 must continue through R3, and I through R2 must continue through R4."
    },
    {
      scenario: "An electrical engineer is debugging a circuit where the calculated and measured currents don't match. The circuit has 5 nodes and 8 branches.",
      question: "How many independent KCL equations should the engineer write?",
      options: [
        "4 equations (nodes - 1)",
        "5 equations (one per node)",
        "8 equations (one per branch)",
        "3 equations (8 - 5)"
      ],
      correctIndex: 0,
      explanation: "For N nodes, only (N-1) KCL equations are independent. The Nth equation is always a combination of the others because total current entering the circuit equals total current leaving. Here: 5 - 1 = 4 independent equations."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "lightning",
      title: "Power Grid Management",
      tagline: "Balancing electricity flow across continents",
      description: "Power utilities use Kirchhoff's Laws every second to balance generation and consumption across massive electrical grids spanning thousands of miles.",
      connection: "KCL ensures that power generated equals power consumed plus losses at every substation. KVL helps calculate voltage drops across transmission lines to maintain stable delivery."
    },
    {
      icon: "smartphone",
      title: "Smartphone Power Systems",
      tagline: "Managing milliamps in your pocket",
      description: "Every smartphone contains sophisticated power management ICs that apply Kirchhoff's Laws to route current from the battery to dozens of components simultaneously.",
      connection: "KCL determines how battery current splits between display, processor, radios, and sensors. KVL ensures voltage regulators provide correct power levels to each component."
    },
    {
      icon: "car",
      title: "Electric Vehicle Battery Management",
      tagline: "Orchestrating thousands of cells",
      description: "EV battery packs contain thousands of individual cells that must be balanced and monitored using Kirchhoff's Laws to ensure safety, longevity, and performance.",
      connection: "KCL monitors current distribution across parallel cell groups. KVL ensures voltage balance across series-connected cells, critical for preventing overcharge and maximizing range."
    },
    {
      icon: "chip",
      title: "Computer Motherboard Design",
      tagline: "Precision current paths on silicon",
      description: "Modern motherboards route power to dozens of components through complex multi-layer PCBs designed entirely using Kirchhoff's Laws to prevent hot spots and ensure reliability.",
      connection: "KCL ensures adequate current delivery to high-power components like CPUs and GPUs. KVL calculates voltage drops across traces to maintain signal integrity and power quality."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate currents using mesh analysis
  private calculateCurrents(): { i1: number; i23: number; totalCurrent: number } {
    // For a simple series-parallel circuit:
    // R2 and R3 in series, then parallel with R1 from source
    const r23 = this.resistance2 + this.resistance3;
    const rParallel = (this.resistance1 * r23) / (this.resistance1 + r23);

    // Current through R1
    const i1 = this.voltage1 / this.resistance1;

    // Current through R2 and R3 (series)
    const i23 = this.voltage1 / r23;

    // For node analysis, total current = i1 + i23
    return { i1, i23, totalCurrent: i1 + i23 };
  }

  // PROTECTED: Calculate voltages across resistors
  private calculateVoltages(): { v1: number; v2: number; v3: number } {
    const currents = this.calculateCurrents();
    const v1 = currents.i1 * this.resistance1; // Should equal voltage1 for parallel
    const v2 = currents.i23 * this.resistance2;
    const v3 = currents.i23 * this.resistance3;
    return { v1, v2, v3 };
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
      if (input.id === 'voltage') {
        this.voltage1 = Math.max(5, Math.min(24, input.value));
      } else if (input.id === 'resistance1') {
        this.resistance1 = Math.max(100, Math.min(1000, input.value));
      } else if (input.id === 'resistance2') {
        this.resistance2 = Math.max(100, Math.min(1000, input.value));
      } else if (input.id === 'resistance3') {
        this.resistance3 = Math.max(100, Math.min(1000, input.value));
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
        if (buttonId === 'toggle_flow') {
          this.showCurrentFlow = !this.showCurrentFlow;
        } else if (buttonId === 'continue') {
          this.phase = 'review';
        }
        break;

      case 'review':
        if (buttonId.startsWith('node_')) {
          this.selectedNode = buttonId.split('_')[1] as 'A' | 'B' | 'C';
        } else if (buttonId === 'continue') {
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
        if (buttonId.startsWith('loop_')) {
          this.selectedLoop = parseInt(buttonId.split('_')[1]) as 1 | 2 | 3;
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
    this.voltage1 = 12;
    this.resistance1 = 200;
    this.resistance2 = 300;
    this.resistance3 = 400;
    this.showCurrentFlow = false;
    this.selectedNode = null;
    this.selectedLoop = null;
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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(6, 182, 212, 0.1)' });
    r.text(200, 80, 'ELECTRICAL CIRCUITS', { fill: '#22d3ee', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, "Kirchhoff's Laws", { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'The fundamental rules governing every circuit', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Visual card
    r.roundRect(40, 190, 320, 200, 16, { fill: 'rgba(30, 41, 59, 0.8)' });

    // KCL and KVL icons
    r.roundRect(60, 220, 130, 70, 12, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.text(125, 250, 'KCL', { fill: '#22d3ee', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(125, 275, 'Current at nodes', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.roundRect(210, 220, 130, 70, 12, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.text(275, 250, 'KVL', { fill: '#fbbf24', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(275, 275, 'Voltage around loops', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Circuit hint
    r.text(200, 330, 'Conservation of charge & energy', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 355, 'in electrical circuits', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 420, 320, 100, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 455, 'These two laws form the basis of', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 480, 'ALL circuit analysis!', { fill: '#22d3ee', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Discover the Laws', variant: 'primary' });

    r.setCoachMessage("Learn how current and voltage obey these universal rules!");
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Make Your Prediction', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'At a junction in a circuit where three wires', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 145, 'meet, 5A flows in through wire 1 and 2A', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 165, 'flows in through wire 2.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 190, 'How much current flows out through wire 3?', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      '3A - The difference between inputs',
      '7A - The sum of the inputs',
      '5A - Only the largest current continues',
      '2.5A - The average of the inputs'
    ];

    options.forEach((option, i) => {
      const y = 215 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (i === 1) { // Correct answer: sum = 7A
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.prediction) {
        bgColor = 'rgba(6, 182, 212, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 480, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Correct! Current is conserved at every junction.' : 'Not quite. Charge cannot be created or destroyed!';
      r.text(200, 510, message, { fill: this.prediction === 1 ? '#34d399' : '#fbbf24', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 540, 'By KCL: 5A + 2A = 7A must flow out', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Explore the Circuit', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Interactive Circuit Lab', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const currents = this.calculateCurrents();
    const voltages = this.calculateVoltages();

    // Circuit visualization area
    r.roundRect(20, 75, 360, 220, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Battery
    r.rect(40, 140, 20, 80, { fill: 'rgba(100, 116, 139, 0.5)' });
    r.text(50, 130, '+', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(50, 235, '-', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(50, 260, `${this.voltage1}V`, { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Node A (top junction)
    r.circle(130, 120, 10, { fill: '#22c55e', stroke: '#4ade80', strokeWidth: 2 });
    r.text(130, 105, 'A', { fill: '#4ade80', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    // R1 branch (vertical from A to B)
    r.roundRect(120, 145, 20, 50, 3, { fill: '#3b82f6' });
    r.text(130, 175, 'R1', { fill: '#ffffff', fontSize: 9, textAnchor: 'middle' });
    r.text(155, 175, `${this.resistance1}ohm`, { fill: '#60a5fa', fontSize: 9 });

    // Node B (bottom junction)
    r.circle(130, 210, 10, { fill: '#22c55e', stroke: '#4ade80', strokeWidth: 2 });
    r.text(130, 235, 'B', { fill: '#4ade80', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    // R2-R3 branch
    r.roundRect(240, 130, 20, 40, 3, { fill: '#f59e0b' });
    r.text(250, 155, 'R2', { fill: '#ffffff', fontSize: 9, textAnchor: 'middle' });
    r.text(275, 155, `${this.resistance2}ohm`, { fill: '#fbbf24', fontSize: 9 });

    r.roundRect(240, 185, 20, 40, 3, { fill: '#a855f7' });
    r.text(250, 210, 'R3', { fill: '#ffffff', fontSize: 9, textAnchor: 'middle' });
    r.text(275, 210, `${this.resistance3}ohm`, { fill: '#c084fc', fontSize: 9 });

    // Node C (between R2 and R3)
    r.circle(250, 175, 6, { fill: '#22c55e', stroke: '#4ade80', strokeWidth: 2 });
    r.text(265, 175, 'C', { fill: '#4ade80', fontSize: 9 });

    // Connection lines
    r.line(60, 120, 120, 120, { stroke: '#64748b', strokeWidth: 2 });
    r.line(140, 120, 240, 120, { stroke: '#64748b', strokeWidth: 2 });
    r.line(250, 120, 250, 130, { stroke: '#64748b', strokeWidth: 2 });
    r.line(250, 225, 250, 240, { stroke: '#64748b', strokeWidth: 2 });
    r.line(250, 240, 130, 240, { stroke: '#64748b', strokeWidth: 2 });
    r.line(130, 220, 130, 240, { stroke: '#64748b', strokeWidth: 2 });
    r.line(130, 240, 60, 240, { stroke: '#64748b', strokeWidth: 2 });
    r.line(60, 120, 60, 140, { stroke: '#64748b', strokeWidth: 2 });
    r.line(60, 220, 60, 240, { stroke: '#64748b', strokeWidth: 2 });

    // Current labels
    r.text(90, 150, `I1=${currents.i1.toFixed(3)}A`, { fill: '#fbbf24', fontSize: 10 });
    r.text(295, 190, `I23=${currents.i23.toFixed(3)}A`, { fill: '#fbbf24', fontSize: 10 });

    // KCL equation
    r.text(200, 280, `KCL @ Node A: I_total = I1 + I23 = ${(currents.i1 + currents.i23).toFixed(3)}A`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Controls
    r.addSlider({ id: 'voltage', label: 'Voltage (V)', min: 5, max: 24, step: 1, value: this.voltage1 });
    r.addSlider({ id: 'resistance1', label: 'R1 (ohm)', min: 100, max: 1000, step: 50, value: this.resistance1 });
    r.addSlider({ id: 'resistance2', label: 'R2 (ohm)', min: 100, max: 1000, step: 50, value: this.resistance2 });
    r.addSlider({ id: 'resistance3', label: 'R3 (ohm)', min: 100, max: 1000, step: 50, value: this.resistance3 });

    r.addButton({ id: 'toggle_flow', label: this.showCurrentFlow ? 'Pause Flow' : 'Show Current Flow', variant: 'secondary' });
    r.addButton({ id: 'continue', label: 'Analyze the Nodes', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 50, "Kirchhoff's Current Law (KCL)", { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // KCL equation box
    r.roundRect(50, 75, 300, 70, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 105, 'Sum of currents = 0', { fill: '#22d3ee', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 130, 'Current entering = Current leaving', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Node selection
    r.text(200, 170, 'Click a node to analyze:', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    const nodes = ['A', 'B', 'C'] as const;
    nodes.forEach((node, i) => {
      const x = 100 + i * 100;
      const isSelected = this.selectedNode === node;
      r.circle(x, 210, 25, {
        fill: isSelected ? '#22c55e' : 'rgba(51, 65, 85, 0.5)',
        stroke: '#4ade80',
        strokeWidth: 2
      });
      r.text(x, 218, node, { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
      r.addButton({ id: `node_${node}`, label: '', variant: 'secondary' });
    });

    // Node analysis
    if (this.selectedNode) {
      const currents = this.calculateCurrents();
      r.roundRect(30, 250, 340, 180, 12, { fill: 'rgba(30, 41, 59, 0.7)' });

      let title = '';
      let currentsIn: string[] = [];
      let currentsOut: string[] = [];
      let equation = '';

      if (this.selectedNode === 'A') {
        title = 'Node A (Top Junction)';
        currentsIn = [`I_total = ${(currents.i1 + currents.i23).toFixed(4)}A`];
        currentsOut = [`I1 = ${currents.i1.toFixed(4)}A`, `I23 = ${currents.i23.toFixed(4)}A`];
        equation = 'sum_I = 0: I_in - I1 - I23 = 0';
      } else if (this.selectedNode === 'B') {
        title = 'Node B (Bottom Junction)';
        currentsIn = [`I1 = ${currents.i1.toFixed(4)}A`, `I23 = ${currents.i23.toFixed(4)}A`];
        currentsOut = [`I_return = ${(currents.i1 + currents.i23).toFixed(4)}A`];
        equation = 'sum_I = 0: I1 + I23 - I_return = 0';
      } else if (this.selectedNode === 'C') {
        title = 'Node C (R2-R3 Junction)';
        currentsIn = [`I2 = ${currents.i23.toFixed(4)}A (through R2)`];
        currentsOut = [`I3 = ${currents.i23.toFixed(4)}A (through R3)`];
        equation = 'sum_I = 0: I2 - I3 = 0 (Series: same current)';
      }

      r.text(200, 275, title, { fill: '#4ade80', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(80, 305, 'IN:', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold' });
      currentsIn.forEach((c, i) => {
        r.text(80, 325 + i * 18, c, { fill: '#ffffff', fontSize: 11 });
      });
      r.text(250, 305, 'OUT:', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold' });
      currentsOut.forEach((c, i) => {
        r.text(250, 325 + i * 18, c, { fill: '#ffffff', fontSize: 11 });
      });
      r.roundRect(40, 370, 320, 45, 8, { fill: 'rgba(16, 185, 129, 0.2)' });
      r.text(200, 398, equation, { fill: '#34d399', fontSize: 11, textAnchor: 'middle' });
    }

    r.addButton({ id: 'continue', label: 'Explore Voltage Law', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'Challenge: Complex Circuit', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 85, 340, 130, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 110, 'In a circuit with multiple loops and nodes,', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 130, 'an engineer measures these values:', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 155, 'Total current from supply: 500mA', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 172, 'Current through branch A: 200mA', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 189, 'Current through branch B: 150mA', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 210, 'What current flows through branch C?', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      '50mA - The difference (200 - 150)',
      '350mA - The difference (500 - 150)',
      '150mA - Balance: 500 - 200 - 150 = 150mA',
      '500mA - All current goes through each branch'
    ];

    options.forEach((option, i) => {
      const y = 230 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (i === 2) { // Correct answer: 150mA
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
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 465, 340, 95, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 2 ? 'Excellent! You applied KCL correctly!' : 'Remember: Current in = Current out at every node.';
      r.text(200, 495, message, { fill: this.twistPrediction === 2 ? '#34d399' : '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 525, 'I_total = I_A + I_B + I_C', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 545, '500mA = 200mA + 150mA + I_C => I_C = 150mA', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Explore Voltage Loops', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, "Kirchhoff's Voltage Law (KVL)", { fill: '#fbbf24', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // KVL equation box
    r.roundRect(50, 75, 300, 70, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 105, 'Sum of voltages = 0', { fill: '#fbbf24', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 130, 'Around any closed loop', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Loop selection
    r.text(200, 165, 'Select a loop to analyze:', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    const loops = [1, 2, 3] as const;
    loops.forEach((loop, i) => {
      const x = 100 + i * 100;
      const isSelected = this.selectedLoop === loop;
      r.roundRect(x - 35, 185, 70, 40, 10, {
        fill: isSelected ? '#f59e0b' : 'rgba(51, 65, 85, 0.5)'
      });
      r.text(x, 210, `Loop ${loop}`, { fill: '#ffffff', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
      r.addButton({ id: `loop_${loop}`, label: '', variant: 'secondary' });
    });

    // Loop analysis
    if (this.selectedLoop) {
      const voltages = this.calculateVoltages();
      r.roundRect(30, 240, 340, 200, 12, { fill: 'rgba(30, 41, 59, 0.7)' });

      let title = '';
      let elements: { name: string; value: string; type: 'source' | 'drop' | 'rise' }[] = [];
      let sum = 0;

      if (this.selectedLoop === 1) {
        title = 'Loop 1: Battery -> R1 -> Back';
        elements = [
          { name: 'Battery', value: `+${this.voltage1}V`, type: 'source' },
          { name: 'R1', value: `-${voltages.v1.toFixed(2)}V`, type: 'drop' }
        ];
        sum = this.voltage1 - voltages.v1;
      } else if (this.selectedLoop === 2) {
        title = 'Loop 2: Battery -> R2 -> R3 -> Back';
        elements = [
          { name: 'Battery', value: `+${this.voltage1}V`, type: 'source' },
          { name: 'R2', value: `-${voltages.v2.toFixed(2)}V`, type: 'drop' },
          { name: 'R3', value: `-${voltages.v3.toFixed(2)}V`, type: 'drop' }
        ];
        sum = this.voltage1 - voltages.v2 - voltages.v3;
      } else if (this.selectedLoop === 3) {
        title = 'Loop 3: R1 -> R2 -> R3 (Internal)';
        elements = [
          { name: 'R1 (up)', value: `+${voltages.v1.toFixed(2)}V`, type: 'rise' },
          { name: 'R2', value: `-${voltages.v2.toFixed(2)}V`, type: 'drop' },
          { name: 'R3', value: `-${voltages.v3.toFixed(2)}V`, type: 'drop' }
        ];
        sum = voltages.v1 - voltages.v2 - voltages.v3;
      }

      r.text(200, 265, title, { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      elements.forEach((el, i) => {
        const y = 295 + i * 35;
        r.roundRect(50, y - 10, 300, 30, 6, { fill: 'rgba(51, 65, 85, 0.5)' });
        r.text(70, y + 5, el.name, { fill: '#cbd5e1', fontSize: 12 });
        r.text(320, y + 5, el.value, {
          fill: el.type === 'source' || el.type === 'rise' ? '#34d399' : '#f87171',
          fontSize: 12,
          textAnchor: 'end'
        });
      });

      r.roundRect(50, 405, 300, 30, 8, { fill: 'rgba(251, 191, 36, 0.2)' });
      r.text(200, 425, `Sum: ${sum.toFixed(4)}V ~= 0V`, { fill: '#fbbf24', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    }

    r.addButton({ id: 'continue', label: 'Review Summary', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 50, "Summary: Kirchhoff's Laws", { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // KCL card
    r.roundRect(25, 80, 170, 180, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(110, 105, 'KCL', { fill: '#22d3ee', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 135, 'sum_I = 0', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });
    r.text(110, 165, 'Current at nodes', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 185, 'Current in = out', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 205, 'Conservation of', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 220, 'charge', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // KVL card
    r.roundRect(205, 80, 170, 180, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(290, 105, 'KVL', { fill: '#fbbf24', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 135, 'sum_V = 0', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });
    r.text(290, 165, 'Voltage in loops', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 185, 'Rises = drops', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 205, 'Conservation of', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 220, 'energy', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Applications
    r.roundRect(25, 280, 350, 140, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 305, 'Key Applications', { fill: '#34d399', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    const apps = [
      { icon: 'lightning', label: 'Power Grids' },
      { icon: 'smartphone', label: 'Electronics' },
      { icon: 'car', label: 'EV Batteries' },
      { icon: 'chip', label: 'PCB Design' }
    ];

    apps.forEach((app, i) => {
      const x = 65 + i * 85;
      r.text(x, 345, app.icon === 'lightning' ? '>' : app.icon === 'smartphone' ? '#' : app.icon === 'car' ? 'O' : '[]', { fill: '#ffffff', fontSize: 20, textAnchor: 'middle' });
      r.text(x, 375, app.label, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    });

    r.addButton({ id: 'continue', label: 'See Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 50, 'Real-World Applications', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#0891b2';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 75, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 103, app.icon === 'lightning' ? '>' : app.icon === 'smartphone' ? '#' : app.icon === 'car' ? 'O' : '[]', { fontSize: 18, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 135, 350, 310, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 165, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 188, app.tagline, { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });

    // Description (multi-line)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 218;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 50) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Physics connection
    r.roundRect(40, 310, 320, 80, 10, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 335, 'Physics Connection', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 360, app.connection.substring(0, 60) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

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
      r.text(200, 50, 'Knowledge Test', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 75, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Scenario
      r.roundRect(25, 95, 350, 85, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      const scenarioWords = question.scenario.split(' ');
      let scenarioLine = '';
      let scenarioY = 115;
      scenarioWords.forEach(word => {
        if ((scenarioLine + word).length > 55) {
          r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
          scenarioLine = word + ' ';
          scenarioY += 15;
        } else {
          scenarioLine += word + ' ';
        }
      });
      if (scenarioLine) r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

      // Question
      r.text(200, 200, question.question.substring(0, 50) + (question.question.length > 50 ? '...' : ''), { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 225 + i * 52;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(6, 182, 212, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 45, 8, { fill: bgColor });
        r.text(40, y + 27, `${String.fromCharCode(65 + i)}. ${option.substring(0, 48)}${option.length > 48 ? '...' : ''}`, { fill: isSelected ? '#22d3ee' : '#e2e8f0', fontSize: 10 });

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
        r.text(200, 455, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? 'trophy' : 'book', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? 'Circuit Analysis Master!' : 'Review the concepts and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 150, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'KCL: Current conservation at nodes',
        'KVL: Voltage conservation in loops',
        'Series and parallel circuit analysis',
        'Real-world applications'
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
    r.text(200, 120, 'lightning', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Circuit Analysis Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, "You understand how current and voltage", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'behave in complex circuits!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: 'refresh', label: 'KCL Mastery' },
      { icon: 'loop', label: 'KVL Mastery' },
      { icon: 'plug', label: 'Node Analysis' },
      { icon: 'battery', label: 'Loop Analysis' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 295 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 18, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formulas
    r.roundRect(50, 460, 300, 80, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 488, 'Key Formulas', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 515, 'KCL: sum_I = 0  |  KVL: sum_V = 0', { fill: '#ffffff', fontSize: 13, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage("Congratulations on mastering Kirchhoff's Laws!");
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      voltage1: this.voltage1,
      resistance1: this.resistance1,
      resistance2: this.resistance2,
      resistance3: this.resistance3,
      showCurrentFlow: this.showCurrentFlow,
      selectedNode: this.selectedNode,
      selectedLoop: this.selectedLoop,
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
    if (state.voltage1 !== undefined) this.voltage1 = state.voltage1 as number;
    if (state.resistance1 !== undefined) this.resistance1 = state.resistance1 as number;
    if (state.resistance2 !== undefined) this.resistance2 = state.resistance2 as number;
    if (state.resistance3 !== undefined) this.resistance3 = state.resistance3 as number;
    if (state.showCurrentFlow !== undefined) this.showCurrentFlow = state.showCurrentFlow as boolean;
    if (state.selectedNode !== undefined) this.selectedNode = state.selectedNode as 'A' | 'B' | 'C' | null;
    if (state.selectedLoop !== undefined) this.selectedLoop = state.selectedLoop as 1 | 2 | 3 | null;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createKirchhoffsLawsGame(sessionId: string): KirchhoffsLawsGame {
  return new KirchhoffsLawsGame(sessionId);
}
