import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// STATIC ELECTRICITY GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Electron transfer, Coulomb's Law: F = kq1q2/r^2
// Triboelectric effect - rubbing transfers electrons between materials
// Like charges repel, opposite charges attract
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

interface ChargedObject {
  id: number;
  x: number;
  y: number;
  charge: number;
  vx: number;
  vy: number;
}

// Physics constants (PROTECTED - never sent to client)
const COULOMB_CONSTANT = 8.99e9; // N*m^2/C^2
const ELECTRON_CHARGE = 1.6e-19; // Coulombs

export class StaticElectricityGame extends BaseGame {
  readonly gameType = 'static_electricity';
  readonly gameTitle = 'Static Electricity: The Invisible Force';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters - balloon experiment
  private balloonCharge = 0;
  private rubCount = 0;
  private isSimulating = false;
  private hairAngles: number[] = [];
  private paperPositions: { x: number; y: number; attracted: boolean }[] = [];

  // Twist simulation - Coulomb's law
  private chargedObjects: ChargedObject[] = [];
  private isTwistSimulating = false;
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
      scenario: "You walk across a carpet and reach for a doorknob.",
      question: "What happens when you rub a balloon on your hair?",
      options: [
        "Nothing happens",
        "Electrons transfer from hair to balloon",
        "Protons transfer",
        "The balloon heats up"
      ],
      correctIndex: 1,
      explanation: "Rubbing transfers electrons from your hair to the balloon. Hair loses electrons (becomes positive), balloon gains electrons (becomes negative)."
    },
    {
      scenario: "A physicist is studying electric forces between charged particles.",
      question: "What does Coulomb's Law tell us about electric force?",
      options: [
        "Force increases with distance",
        "Force depends on charge amount and distance",
        "Only positive charges create force",
        "Force is always attractive"
      ],
      correctIndex: 1,
      explanation: "Coulomb's Law states that electric force is proportional to the product of charges and inversely proportional to the square of the distance between them."
    },
    {
      scenario: "Two charged objects are brought near each other.",
      question: "Two negatively charged objects will:",
      options: [
        "Attract each other",
        "Repel each other",
        "Have no interaction",
        "Create a spark"
      ],
      correctIndex: 1,
      explanation: "Like charges repel! Two negative charges push away from each other, just as two positive charges would."
    },
    {
      scenario: "A charged balloon is brought near small paper pieces.",
      question: "Why does a charged balloon attract neutral paper pieces?",
      options: [
        "Paper has hidden charges",
        "Induction creates temporary charge separation",
        "Paper is always attracted to plastic",
        "Magic"
      ],
      correctIndex: 1,
      explanation: "The balloon's negative charge induces (causes) a temporary charge separation in the paper - positive charges move closer to the balloon, creating attraction."
    },
    {
      scenario: "A student is learning about electrical units.",
      question: "What is the unit of electric charge?",
      options: [
        "Volt",
        "Coulomb",
        "Ampere",
        "Watt"
      ],
      correctIndex: 1,
      explanation: "Electric charge is measured in Coulombs (C), named after Charles-Augustin de Coulomb who discovered the force law for charges."
    },
    {
      scenario: "Two charges are separated by a distance r.",
      question: "In the equation F = kq1q2/r^2, what happens if you double the distance?",
      options: [
        "Force doubles",
        "Force halves",
        "Force becomes 1/4",
        "Force stays the same"
      ],
      correctIndex: 2,
      explanation: "Since force depends on 1/r^2, doubling the distance makes the force 1/(2)^2 = 1/4 of the original force."
    },
    {
      scenario: "A scientist compares electrons and protons.",
      question: "Which statement about electrons and protons is correct?",
      options: [
        "They have the same mass",
        "Electrons are positive, protons negative",
        "They have opposite charges of equal magnitude",
        "Protons can move freely in solids"
      ],
      correctIndex: 2,
      explanation: "Electrons (negative) and protons (positive) have exactly equal but opposite charges. However, electrons are much lighter and more mobile."
    },
    {
      scenario: "A teacher explains why it's called 'static' electricity.",
      question: "Static electricity is called 'static' because:",
      options: [
        "It doesn't exist",
        "Charges stay in place rather than flowing",
        "It only works with plastic",
        "It was discovered at a static location"
      ],
      correctIndex: 1,
      explanation: "Static electricity involves charges that accumulate and stay in place on objects, unlike current electricity where charges flow continuously."
    },
    {
      scenario: "A storm is building with dark clouds.",
      question: "Lightning is an example of:",
      options: [
        "Magnetic force",
        "Static discharge",
        "Nuclear reaction",
        "Chemical reaction"
      ],
      correctIndex: 1,
      explanation: "Lightning is a massive static discharge - charges built up in clouds suddenly flow to the ground, neutralizing the charge difference."
    },
    {
      scenario: "A materials engineer is selecting materials for an experiment.",
      question: "The triboelectric series tells us:",
      options: [
        "How much objects weigh",
        "Which materials gain or lose electrons when rubbed",
        "The speed of electricity",
        "Color of charged objects"
      ],
      correctIndex: 1,
      explanation: "The triboelectric series ranks materials by their tendency to gain or lose electrons when rubbed against each other."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "zap",
      title: "Lightning",
      tagline: "Nature's most dramatic static discharge",
      description: "Lightning is nature's most dramatic static discharge! Charges build up in clouds through ice crystal collisions. When the potential difference becomes enormous, electrons jump through the air in a massive spark.",
      connection: "A single lightning bolt can heat the air to 30,000C (5x hotter than the sun's surface) and carry 300 million volts!"
    },
    {
      icon: "printer",
      title: "Photocopiers & Laser Printers",
      tagline: "Static electricity creates perfect copies",
      description: "These machines use static electricity to create images! A photosensitive drum gets charged, then exposed to light. Toner (charged powder) sticks to the charged areas, then transfers to paper.",
      connection: "Chester Carlson invented xerography (photocopying) in 1938 - it took him 20 years to find a company willing to develop it!"
    },
    {
      icon: "paint",
      title: "Electrostatic Painting",
      tagline: "Charge-based coating technology",
      description: "Car factories use static electricity to paint cars! Paint droplets are given a charge, while the car body is grounded. The charged paint is attracted to the car, creating an even coating.",
      connection: "Electrostatic painting can reduce paint waste by up to 95% compared to conventional spraying!"
    },
    {
      icon: "wind",
      title: "Air Purifiers",
      tagline: "Cleaning air with electric charge",
      description: "Electrostatic precipitators clean air by charging dust particles, then collecting them on oppositely charged plates. This technology removes smoke, pollen, and pollutants.",
      connection: "Large power plants use electrostatic precipitators to remove 99%+ of particulate matter from exhaust gases!"
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
    this.initializeHair();
    this.initializePaper();
    this.initializeChargedObjects();
  }

  private initializeHair(): void {
    this.hairAngles = [];
    for (let i = 0; i < 20; i++) {
      this.hairAngles.push(90 + (Math.random() - 0.5) * 30);
    }
  }

  private initializePaper(): void {
    this.paperPositions = [];
    for (let i = 0; i < 8; i++) {
      this.paperPositions.push({
        x: 60 + Math.random() * 180,
        y: 220 + Math.random() * 40,
        attracted: false
      });
    }
  }

  private initializeChargedObjects(): void {
    this.chargedObjects = [
      { id: 0, x: 100, y: 150, charge: 1, vx: 0, vy: 0 },
      { id: 1, x: 200, y: 150, charge: -1, vx: 0, vy: 0 }
    ];
  }

  // PROTECTED: Calculate Coulomb force between charges
  private calculateCoulombForce(q1: number, q2: number, distance: number): number {
    // F = k * q1 * q2 / r^2
    // Simplified for simulation purposes
    if (distance < 20) distance = 20;
    const forceMag = (q1 * q2 * 1000) / (distance * distance);
    return forceMag;
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
      // Handle slider changes if needed
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
        }
        break;

      case 'play':
        if (buttonId === 'rub_balloon') {
          this.rubCount++;
          this.balloonCharge = Math.min(10, this.balloonCharge + 1);
          this.updateHairFromCharge();
        } else if (buttonId === 'toggle_simulate') {
          this.isSimulating = !this.isSimulating;
        } else if (buttonId === 'reset') {
          this.balloonCharge = 0;
          this.rubCount = 0;
          this.isSimulating = false;
          this.initializeHair();
          this.initializePaper();
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
            this.twistPrediction = buttonId.split('_')[1];
            this.showTwistFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'twist_play';
          this.showTwistFeedback = false;
        }
        break;

      case 'twist_play':
        if (buttonId === 'toggle_simulation') {
          this.isTwistSimulating = !this.isTwistSimulating;
        } else if (buttonId === 'add_positive') {
          this.chargedObjects.push({
            id: this.chargedObjects.length,
            x: 100 + Math.random() * 100,
            y: 100 + Math.random() * 100,
            charge: 1,
            vx: 0,
            vy: 0
          });
        } else if (buttonId === 'add_negative') {
          this.chargedObjects.push({
            id: this.chargedObjects.length,
            x: 100 + Math.random() * 100,
            y: 100 + Math.random() * 100,
            charge: -1,
            vx: 0,
            vy: 0
          });
        } else if (buttonId === 'reset_charges') {
          this.initializeChargedObjects();
          this.isTwistSimulating = false;
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

  private updateHairFromCharge(): void {
    if (this.balloonCharge !== 0) {
      for (let i = 0; i < this.hairAngles.length; i++) {
        const spreadAngle = Math.abs(this.balloonCharge) * 15;
        const baseAngle = 90 + ((i / this.hairAngles.length) - 0.5) * spreadAngle * 2;
        this.hairAngles[i] = baseAngle + (Math.random() - 0.5) * 10;
      }
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
    this.balloonCharge = 0;
    this.rubCount = 0;
    this.isSimulating = false;
    this.isTwistSimulating = false;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
    this.initializeHair();
    this.initializePaper();
    this.initializeChargedObjects();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Update paper attraction
    if (this.isSimulating && Math.abs(this.balloonCharge) > 3) {
      for (let i = 0; i < this.paperPositions.length; i++) {
        const piece = this.paperPositions[i];
        const dx = 150 - piece.x;
        const dy = 80 - piece.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 100 + Math.abs(this.balloonCharge) * 10) {
          piece.attracted = true;
          piece.x += dx * 0.02;
          piece.y += dy * 0.02;
        }
      }
    }

    // Update Coulomb simulation
    if (this.isTwistSimulating) {
      for (let i = 0; i < this.chargedObjects.length; i++) {
        const obj = this.chargedObjects[i];
        let fx = 0, fy = 0;

        for (let j = 0; j < this.chargedObjects.length; j++) {
          if (i === j) continue;
          const other = this.chargedObjects[j];
          const dx = other.x - obj.x;
          const dy = other.y - obj.y;
          const dist = Math.max(20, Math.sqrt(dx * dx + dy * dy));

          const forceMag = this.calculateCoulombForce(obj.charge, other.charge, dist);
          fx -= (dx / dist) * forceMag;
          fy -= (dy / dist) * forceMag;
        }

        obj.vx = (obj.vx + fx * 0.1) * 0.95;
        obj.vy = (obj.vy + fy * 0.1) * 0.95;
        obj.x += obj.vx;
        obj.y += obj.vy;

        // Boundaries
        if (obj.x < 40) { obj.x = 40; obj.vx = -obj.vx * 0.5; }
        if (obj.x > 260) { obj.x = 260; obj.vx = -obj.vx * 0.5; }
        if (obj.y < 40) { obj.y = 40; obj.vy = -obj.vy * 0.5; }
        if (obj.y > 260) { obj.y = 260; obj.vy = -obj.vy * 0.5; }
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(99, 102, 241, 0.05)' });
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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(99, 102, 241, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#818cf8', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Shocking Truth', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'What causes that spark from a doorknob?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Lightning bolt illustration
    r.text(200, 250, '(lightning)', { fill: '#fbbf24', fontSize: 64, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 300, 320, 160, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 335, 'You walk across a carpet, reach for', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 355, 'a doorknob, and ZAP!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 390, 'What mysterious force', { fill: '#22d3ee', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 415, 'caused that shock?', { fill: '#22d3ee', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 450, 'The same force that makes lightning!', { fill: '#fbbf24', fontSize: 13, textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Discover Static Electricity', variant: 'primary' });

    r.setCoachMessage('Explore how charges transfer and create invisible forces!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'What happens when you rub', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'a balloon on your hair?', { fill: '#22d3ee', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Electrons transfer from hair to balloon',
      'Friction creates heat that makes things sticky',
      'Rubbing magnetizes the objects',
      'Air pressure changes around rubbed objects'
    ];

    options.forEach((option, i) => {
      const y = 200 + i * 65;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (i === 0) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (this.prediction === String(i)) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (this.prediction === String(i)) {
        bgColor = 'rgba(99, 102, 241, 0.3)';
      }

      r.roundRect(30, y, 340, 55, 10, { fill: bgColor });
      r.text(50, y + 32, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 480, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === '0' ? 'Excellent prediction!' : 'Electrons transfer between materials!';
      r.text(200, 510, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 540, 'This is the triboelectric effect!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Experiment', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Balloon & Hair Experiment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 80, 'Rub the balloon to build charge', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Visualization area
    r.roundRect(20, 100, 360, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Head
    r.ellipse(150, 250, 50, 60, { fill: '#ffd7b5' });

    // Hair strands
    for (let i = 0; i < this.hairAngles.length; i++) {
      const startX = 100 + (i / this.hairAngles.length) * 100;
      const startY = 195;
      const angle = this.hairAngles[i] * Math.PI / 180;
      const length = 30 + Math.random() * 20;
      const endX = startX + Math.cos(angle) * length;
      const endY = startY - Math.sin(angle) * length;

      r.line(startX, startY, endX, endY, { stroke: '#8b4513', strokeWidth: 2 });
    }

    // Balloon
    const balloonColor = this.balloonCharge < 0 ? '#ef4444' : '#ff6b6b';
    r.ellipse(150, 130, 35, 45, { fill: balloonColor });

    // Charge indicators on balloon
    if (this.balloonCharge < 0) {
      for (let i = 0; i < Math.min(Math.abs(this.balloonCharge), 6); i++) {
        const cx = 135 + (i % 3) * 15;
        const cy = 120 + Math.floor(i / 3) * 20;
        r.text(cx, cy, '-', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold' });
      }
    }

    // Hair charge indicators
    if (this.balloonCharge < 0) {
      for (let i = 0; i < Math.min(Math.abs(this.balloonCharge), 4); i++) {
        r.text(120 + i * 20, 185, '+', { fill: '#ef4444', fontSize: 12, fontWeight: 'bold' });
      }
    }

    // Paper pieces
    for (const piece of this.paperPositions) {
      r.rect(piece.x, piece.y, 12, 8, { fill: '#f5f5dc' });
    }

    // Table
    r.rect(40, 320, 220, 20, { fill: '#8b4513' });
    r.text(150, 355, 'Paper pieces on table', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Charge status panel
    r.roundRect(20, 400, 170, 80, 10, { fill: 'rgba(30, 41, 59, 0.7)' });
    r.text(105, 425, 'Charge Status', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(40, 448, 'Balloon:', { fill: '#94a3b8', fontSize: 10 });
    r.text(140, 448, this.balloonCharge < 0 ? `${this.balloonCharge} (-)` : 'Neutral', { fill: this.balloonCharge < 0 ? '#3b82f6' : '#64748b', fontSize: 10, textAnchor: 'end' });
    r.text(40, 468, 'Hair:', { fill: '#94a3b8', fontSize: 10 });
    r.text(140, 468, this.balloonCharge < 0 ? `+${Math.abs(this.balloonCharge)} (+)` : 'Neutral', { fill: this.balloonCharge < 0 ? '#ef4444' : '#64748b', fontSize: 10, textAnchor: 'end' });

    // Controls
    r.addButton({ id: 'rub_balloon', label: 'Rub Balloon on Hair', variant: 'primary' });
    r.addButton({ id: 'toggle_simulate', label: this.isSimulating ? 'Stop Simulation' : 'Bring Near Paper', variant: 'secondary' });
    r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });

    if (this.rubCount >= 3) {
      r.addButton({ id: 'continue', label: 'Learn the Science', variant: 'primary' });
    }

    r.setCoachMessage('Rub several times to build charge! Watch hair stand up.');
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'Understanding Static Electricity', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Electron transfer card
    r.roundRect(30, 90, 340, 130, 16, { fill: 'rgba(239, 68, 68, 0.1)' });
    r.text(200, 115, 'Electron Transfer', { fill: '#f87171', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 145, 'Hair loses e- -> Hair+', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 165, 'Balloon gains e- -> Balloon-', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 195, 'This is the Triboelectric Effect!', { fill: '#fbbf24', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Like charges repel card
    r.roundRect(30, 235, 340, 100, 16, { fill: 'rgba(59, 130, 246, 0.1)' });
    r.text(200, 260, 'Like Charges Repel', { fill: '#60a5fa', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 290, 'Hair strands all become positive (+)', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 310, 'They push each other away -> hair stands up!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Opposites attract card
    r.roundRect(30, 350, 340, 100, 16, { fill: 'rgba(16, 185, 129, 0.1)' });
    r.text(200, 375, 'Opposites Attract & Induction', { fill: '#34d399', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 405, 'Negative balloon attracts + charges in paper', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 425, 'This is called induction!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Try Coulombs Law', variant: 'primary' });

    r.setCoachMessage('Now let\'s see how charges interact with each other!');
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist: Coulombs Law', { fill: '#a855f7', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'If you place a positive charge', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'near a negative charge...', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 180, 'What will happen?', { fill: '#a855f7', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Opposite charges attract and move toward each other',
      'All charges repel each other regardless of sign',
      'Charges dont affect each others motion',
      'Charges will orbit around each other'
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (i === 0) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (this.twistPrediction === String(i)) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (this.twistPrediction === String(i)) {
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === '0' ? 'Exactly right!' : 'Opposite charges attract!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 530, 'This is Coulombs Law in action!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Simulation', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Coulombs Law Simulator', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 80, 'F = k * q1 * q2 / r^2', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Simulation area
    r.roundRect(30, 100, 340, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.rect(40, 110, 320, 260, { fill: 'rgba(99, 102, 241, 0.05)' });

    // Force lines between charges
    for (let i = 0; i < this.chargedObjects.length; i++) {
      for (let j = i + 1; j < this.chargedObjects.length; j++) {
        const obj1 = this.chargedObjects[i];
        const obj2 = this.chargedObjects[j];
        const isAttracting = obj1.charge * obj2.charge < 0;

        r.line(obj1.x + 30, obj1.y + 100, obj2.x + 30, obj2.y + 100, {
          stroke: isAttracting ? '#10b981' : '#ef4444',
          strokeWidth: 1,
          strokeDasharray: isAttracting ? undefined : '5,5'
        });
      }
    }

    // Charged objects
    for (const obj of this.chargedObjects) {
      const color = obj.charge > 0 ? '#ef4444' : '#3b82f6';
      r.circle(obj.x + 30, obj.y + 100, 18, { fill: color });
      r.text(obj.x + 30, obj.y + 106, obj.charge > 0 ? '+' : '-', {
        fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle'
      });
    }

    // Legend
    r.circle(50, 360, 8, { fill: '#ef4444' });
    r.text(65, 364, 'Positive', { fill: '#ffffff', fontSize: 10 });
    r.circle(130, 360, 8, { fill: '#3b82f6' });
    r.text(145, 364, 'Negative', { fill: '#ffffff', fontSize: 10 });

    // Controls
    r.addButton({ id: 'add_positive', label: '+ Add Positive', variant: 'secondary' });
    r.addButton({ id: 'add_negative', label: '- Add Negative', variant: 'secondary' });
    r.addButton({ id: 'toggle_simulation', label: this.isTwistSimulating ? 'Pause' : 'Start Simulation', variant: 'primary' });
    r.addButton({ id: 'reset_charges', label: 'Reset', variant: 'secondary' });

    r.addButton({ id: 'continue', label: 'Review Results', variant: 'primary' });

    r.setCoachMessage('Opposite charges attract, like charges repel!');
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Coulombs Law Analysis', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Coulombs Law explained
    r.roundRect(30, 90, 340, 140, 16, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 120, 'Coulombs Law', { fill: '#c4b5fd', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(60, 140, 280, 40, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 166, 'F = k * q1 * q2 / r^2', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.text(200, 210, 'Force proportional to charges', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Inverse square law
    r.roundRect(30, 250, 340, 100, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 280, 'The Inverse Square Law', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 310, 'Double the distance -> Force drops to 1/4', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 335, 'Just like gravity!', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 370, 340, 80, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 400, 'Key Insight', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 430, 'Like charges repel, opposites attract!', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Real-World Uses', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#6366f1';
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

    // Description (wrapped)
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
    r.roundRect(40, 340, 320, 60, 10, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 365, 'Fun Fact', { fill: '#818cf8', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 385, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

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
      r.roundRect(25, 100, 350, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 140, question.scenario.substring(0, 50) + '...', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      // Question
      r.text(200, 190, question.question, { fill: '#22d3ee', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 220 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${option.substring(0, 45)}${option.length > 45 ? '...' : ''}`, { fill: isSelected ? '#818cf8' : '#e2e8f0', fontSize: 11 });

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
      r.text(200, 130, score >= 7 ? '(trophy)' : '(book)', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? 'Excellent! You\'ve mastered static electricity!' : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Trophy
    r.text(200, 120, '(trophy)', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Static Electricity Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand how charges transfer,', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'attract, repel, and create sparks!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: 'e-', label: 'Electron Transfer' },
      { icon: '+/-', label: 'Charge Attraction' },
      { icon: 'F', label: 'Coulombs Law' },
      { icon: 'zap', label: 'Lightning' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 295 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 16, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 460, 300, 70, 12, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 488, 'Key Formula', { fill: '#818cf8', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 515, 'F = k * q1 * q2 / r^2', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering static electricity!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      balloonCharge: this.balloonCharge,
      rubCount: this.rubCount,
      isSimulating: this.isSimulating,
      isTwistSimulating: this.isTwistSimulating,
      animationTime: this.animationTime,
      testAnswers: this.testAnswers,
      currentQuestionIndex: this.currentQuestionIndex,
      showTestResults: this.showTestResults,
      activeAppIndex: this.activeAppIndex,
      completedApps: Array.from(this.completedApps),
      chargedObjects: this.chargedObjects
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.prediction !== undefined) this.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.showPredictionFeedback !== undefined) this.showPredictionFeedback = state.showPredictionFeedback as boolean;
    if (state.showTwistFeedback !== undefined) this.showTwistFeedback = state.showTwistFeedback as boolean;
    if (state.balloonCharge !== undefined) this.balloonCharge = state.balloonCharge as number;
    if (state.rubCount !== undefined) this.rubCount = state.rubCount as number;
    if (state.isSimulating !== undefined) this.isSimulating = state.isSimulating as boolean;
    if (state.isTwistSimulating !== undefined) this.isTwistSimulating = state.isTwistSimulating as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
    if (state.chargedObjects) this.chargedObjects = state.chargedObjects as ChargedObject[];
  }
}

export function createStaticElectricityGame(sessionId: string): StaticElectricityGame {
  return new StaticElectricityGame(sessionId);
}
