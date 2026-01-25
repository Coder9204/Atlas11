import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// BUCKLING GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Euler's Critical Buckling Load P_cr = π²EI/(KL)²
// Buckling is sudden lateral failure under compressive axial load
// Long slender columns buckle before material yields
// Critical load depends on: stiffness (EI), length (L), and end conditions (K)
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
const STEEL_MODULUS = 200e9; // Pa (200 GPa)
const ALUMINUM_MODULUS = 70e9; // Pa (70 GPa)
const WOOD_MODULUS = 12e9; // Pa (12 GPa)

// End condition factors (PROTECTED)
const END_FACTORS = {
  'pinned-pinned': 1.0,
  'fixed-fixed': 0.5,
  'fixed-pinned': 0.7,
  'fixed-free': 2.0
};

export class BucklingGame extends BaseGame {
  readonly gameType = 'buckling';
  readonly gameTitle = "Euler's Buckling: Why Columns Fail Sideways";

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private columnLength = 1.0; // meters
  private columnRadius = 0.02; // meters (2 cm)
  private material: 'steel' | 'aluminum' | 'wood' = 'steel';
  private endCondition: keyof typeof END_FACTORS = 'pinned-pinned';
  private appliedLoad = 0; // Newtons
  private isBuckled = false;
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
      scenario: "A structural engineer is designing columns for a parking garage. She has two options: a tall thin column or a short thick one with the same cross-sectional area.",
      question: "Which column is more likely to fail by buckling?",
      options: [
        "The short thick column",
        "The tall thin column - slenderness ratio matters",
        "Both have equal buckling resistance",
        "Neither will buckle under normal loads"
      ],
      correctIndex: 1,
      explanation: "Euler's formula: P_cr = π²EI/(KL)². Longer column (larger L) means lower critical load. Also, thin means lower moment of inertia (I), further reducing capacity."
    },
    {
      scenario: "A furniture designer wants to make very thin table legs that won't buckle. She's considering different end connections.",
      question: "Which end condition gives the highest buckling resistance?",
      options: [
        "Both ends pinned (free to rotate)",
        "Both ends fixed (fully clamped)",
        "One fixed, one free",
        "End conditions don't affect buckling"
      ],
      correctIndex: 1,
      explanation: "Fixed-fixed has K=0.5, giving effective length 0.5L. This quadruples the critical load compared to pinned-pinned (K=1). Fixed-free (K=2) is worst."
    },
    {
      scenario: "An architect wants to use aluminum columns instead of steel for a canopy structure. Aluminum has E=70 GPa, steel has E=200 GPa.",
      question: "If all dimensions stay the same, how does the buckling load change?",
      options: [
        "Aluminum has ~3x higher buckling load (lighter material)",
        "Buckling load stays the same (shape is what matters)",
        "Aluminum has ~3x lower buckling load (lower E)",
        "Aluminum cannot buckle"
      ],
      correctIndex: 2,
      explanation: "P_cr ∝ E (Young's modulus). Aluminum's E (70 GPa) is about 1/3 of steel's (200 GPa), so buckling load is proportionally lower. Must use larger cross-section."
    },
    {
      scenario: "A skyscraper's steel column has a circular cross-section with radius r. Engineers consider doubling the radius.",
      question: "How does doubling the radius affect the critical buckling load?",
      options: [
        "Doubles the buckling load (2× more material)",
        "Quadruples the buckling load (4× cross-sectional area)",
        "Increases by 16× (I ∝ r⁴)",
        "No change (length is what matters)"
      ],
      correctIndex: 2,
      explanation: "For a circular cross-section, I = πr⁴/4. Doubling r gives I_new = π(2r)⁴/4 = 16 × original I. Since P_cr ∝ I, buckling load increases 16-fold!"
    },
    {
      scenario: "A bridge engineer is analyzing I-beam columns. She needs to check buckling about both the strong axis and weak axis.",
      question: "About which axis will the column buckle?",
      options: [
        "The strong axis (larger moment of inertia)",
        "The weak axis (smaller moment of inertia)",
        "It buckles equally about both axes",
        "I-beams never buckle, only solid columns do"
      ],
      correctIndex: 1,
      explanation: "Columns buckle about the axis with minimum moment of inertia (weak axis). P_cr = π²EI_min/(KL)². Bracing the weak axis can force buckling about the strong axis."
    },
    {
      scenario: "A column has a critical buckling load of 100 kN when both ends are pinned. The designer wants to increase capacity by fixing both ends.",
      question: "What is the new critical buckling load with fixed-fixed ends?",
      options: [
        "200 kN (doubles)",
        "400 kN (quadruples)",
        "100 kN (no change)",
        "50 kN (decreases)"
      ],
      correctIndex: 1,
      explanation: "Pinned-pinned: K=1. Fixed-fixed: K=0.5. P_cr ∝ 1/(KL)² = 1/K². Ratio = (1/0.5)² = 4. Critical load quadruples to 400 kN."
    },
    {
      scenario: "An aerospace engineer is comparing solid and hollow circular tubes of the same weight per unit length.",
      question: "Which design has higher buckling resistance?",
      options: [
        "Solid rod (continuous material)",
        "Hollow tube (material pushed to outer radius)",
        "Both have equal resistance (same mass)",
        "Neither - weight doesn't determine buckling"
      ],
      correctIndex: 1,
      explanation: "For same cross-sectional area, a hollow tube has larger outer radius, giving much higher moment of inertia (I ∝ r⁴). Hollow tubes are more efficient for buckling resistance."
    },
    {
      scenario: "A column's critical load is calculated to be 500 kN. The actual working load will be 100 kN.",
      question: "Why do engineers typically use a factor of safety of 2-3 for buckling?",
      options: [
        "To account for material fatigue",
        "Because buckling is sudden, catastrophic, and sensitive to imperfections",
        "It's a legal requirement",
        "To handle temperature changes"
      ],
      correctIndex: 1,
      explanation: "Buckling failure is sudden (no warning), catastrophic (complete collapse), and very sensitive to initial imperfections, load eccentricity, and material variations. High safety factors protect against these unknowns."
    },
    {
      scenario: "A 2-meter long column with pinned ends has critical load 200 kN. The same column cut to 1-meter length.",
      question: "What is the new critical buckling load?",
      options: [
        "400 kN (inverse linear)",
        "800 kN (inverse square)",
        "200 kN (no change)",
        "100 kN (linear decrease)"
      ],
      correctIndex: 1,
      explanation: "P_cr ∝ 1/L². Halving length: P_cr_new = P_cr_old × (L_old/L_new)² = 200 × (2/1)² = 800 kN. Critical load quadruples when length halves!"
    },
    {
      scenario: "A tower crane mast has multiple horizontal braces at regular intervals along its length.",
      question: "What is the primary purpose of these braces?",
      options: [
        "To add weight for stability",
        "To reduce effective column length and prevent buckling",
        "For workers to climb",
        "To connect electrical cables"
      ],
      correctIndex: 1,
      explanation: "Braces divide the column into shorter segments, dramatically reducing effective length. Since P_cr ∝ 1/L², each brace can multiply buckling capacity by reducing unbraced length."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🏛️",
      title: "Building Columns",
      tagline: "From ancient temples to modern skyscrapers",
      description: "Steel and concrete columns in buildings are designed using Euler's formula. Engineers add bracing, increase cross-section, or use composite materials to prevent buckling failure.",
      connection: "P_cr = π²EI/(KL)² guides column sizing. Safety factors of 2-3 account for imperfections and load uncertainties."
    },
    {
      icon: "✈️",
      title: "Aircraft Wing Spars",
      tagline: "Lightweight structure under compression",
      description: "Aircraft wing skins and spars experience compression during flight. Thin skin panels can buckle, so stiffeners are added. The goal: maximum strength with minimum weight.",
      connection: "Hollow tubes and I-beams maximize I/A ratio. Riveted stiffeners create shorter buckling wavelengths in panels."
    },
    {
      icon: "🌉",
      title: "Bridge Compression Members",
      tagline: "Truss members and arch ribs",
      description: "Bridge trusses have members in compression. These are checked for buckling based on unbraced length and cross-section. Lateral bracing prevents out-of-plane buckling.",
      connection: "Truss member design balances tension (governed by area) and compression (governed by buckling). Box sections are common."
    },
    {
      icon: "🗼",
      title: "Tower & Lattice Structures",
      tagline: "Transmission towers and crane booms",
      description: "Lattice structures use triangulated frames where each member carries axial load. Compression members are sized for buckling, often using angle or channel sections.",
      connection: "Cross-bracing reduces effective length. Members oriented so buckling occurs about stronger axis."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate moment of inertia for circular cross-section
  private calculateMomentOfInertia(radius: number): number {
    // I = πr⁴/4 for solid circular section
    return (Math.PI * Math.pow(radius, 4)) / 4;
  }

  // PROTECTED: Calculate critical buckling load using Euler's formula
  private calculateCriticalLoad(): number {
    const E = this.getMaterialModulus(this.material);
    const I = this.calculateMomentOfInertia(this.columnRadius);
    const K = END_FACTORS[this.endCondition];
    const effectiveLength = K * this.columnLength;

    // P_cr = π²EI/(KL)²
    return (Math.PI * Math.PI * E * I) / (effectiveLength * effectiveLength);
  }

  // PROTECTED: Get Young's modulus for material
  private getMaterialModulus(material: 'steel' | 'aluminum' | 'wood'): number {
    switch (material) {
      case 'steel': return STEEL_MODULUS;
      case 'aluminum': return ALUMINUM_MODULUS;
      case 'wood': return WOOD_MODULUS;
    }
  }

  // PROTECTED: Calculate slenderness ratio
  private calculateSlendernessRatio(): number {
    // λ = KL/r where r = radius of gyration = sqrt(I/A)
    const K = END_FACTORS[this.endCondition];
    const radiusOfGyration = this.columnRadius / 2; // For solid circle, r = R/2
    return (K * this.columnLength) / radiusOfGyration;
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
      if (input.id === 'length') {
        this.columnLength = Math.max(0.5, Math.min(3.0, input.value));
      } else if (input.id === 'radius') {
        this.columnRadius = Math.max(0.01, Math.min(0.05, input.value));
      } else if (input.id === 'load') {
        const criticalLoad = this.calculateCriticalLoad();
        this.appliedLoad = Math.max(0, Math.min(criticalLoad * 1.5, input.value));
        this.isBuckled = this.appliedLoad >= criticalLoad;
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
        if (buttonId === 'mat_steel') this.material = 'steel';
        else if (buttonId === 'mat_aluminum') this.material = 'aluminum';
        else if (buttonId === 'mat_wood') this.material = 'wood';
        else if (buttonId.startsWith('end_')) {
          const endType = buttonId.replace('end_', '');
          if (endType in END_FACTORS) {
            this.endCondition = endType as keyof typeof END_FACTORS;
          }
        } else if (buttonId === 'reset') {
          this.appliedLoad = 0;
          this.isBuckled = false;
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
        if (buttonId.startsWith('end_')) {
          const endType = buttonId.replace('end_', '');
          if (endType in END_FACTORS) {
            this.endCondition = endType as keyof typeof END_FACTORS;
          }
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
    this.columnLength = 1.0;
    this.columnRadius = 0.02;
    this.material = 'steel';
    this.endCondition = 'pinned-pinned';
    this.appliedLoad = 0;
    this.isBuckled = false;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Check buckling state
    const criticalLoad = this.calculateCriticalLoad();
    this.isBuckled = this.appliedLoad >= criticalLoad;
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(251, 146, 60, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(220, 38, 38, 0.05)' });

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
    r.roundRect(120, 60, 160, 30, 8, { fill: 'rgba(251, 146, 60, 0.1)' });
    r.text(200, 80, 'STRUCTURAL MECHANICS', { fill: '#fb923c', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 125, 'Why Columns Fail', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 155, 'SIDEWAYS', { fill: '#fb923c', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 185, 'The sudden, catastrophic nature of buckling', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    // Column illustration (bending sideways)
    r.line(200, 230, 200, 310, { stroke: '#64748b', strokeWidth: 8 }); // Straight
    r.line(230, 230, 250, 270, { stroke: '#ef4444', strokeWidth: 8 }); // Buckled
    r.line(250, 270, 230, 310, { stroke: '#ef4444', strokeWidth: 8 }); // Buckled

    // Labels
    r.text(200, 325, 'OK', { fill: '#10b981', fontSize: 12, textAnchor: 'middle' });
    r.text(240, 325, 'FAILED!', { fill: '#ef4444', fontSize: 12, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 350, 320, 110, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 385, 'A perfectly straight steel column can', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 405, 'suddenly buckle sideways under load!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 438, "What makes slender columns so vulnerable?", { fill: '#fb923c', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'discover', label: 'Discover Buckling', variant: 'primary' });

    r.setCoachMessage("Learn why long thin columns fail before the material breaks!");
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 95, 340, 85, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'Two steel columns have the same diameter.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 145, 'One is 1 meter tall, the other is 2 meters.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 165, 'Which can support more compressive load?', { fill: '#fb923c', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'The 2m column (more material)',
      'The 1m column (less slender)',
      'Both support the same load',
      'Neither will buckle - steel is strong'
    ];

    options.forEach((option, i) => {
      const y = 195 + i * 55;
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
        bgColor = 'rgba(251, 146, 60, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 430, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Correct!' : 'The shorter column wins!';
      r.text(200, 460, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 485, 'Buckling load ∝ 1/L². Doubling length', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 505, 'reduces capacity by 4×!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Explore the Physics', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 40, 'Column Buckling Lab', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const criticalLoad = this.calculateCriticalLoad();
    const slenderness = this.calculateSlendernessRatio();

    // Column visualization
    r.roundRect(30, 65, 170, 200, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    const colCenterX = 115;
    const colTopY = 90;
    const colHeight = 150;
    const colWidth = Math.max(4, this.columnRadius * 200);

    // Draw column
    if (this.isBuckled) {
      // Buckled shape (sine wave)
      const amplitude = 15 + (this.appliedLoad / criticalLoad - 1) * 20;
      for (let i = 0; i < colHeight; i += 3) {
        const t = i / colHeight;
        const x = colCenterX + amplitude * Math.sin(Math.PI * t);
        r.rect(x - colWidth / 2, colTopY + i, colWidth, 4, { fill: '#ef4444' });
      }
      r.text(115, 250, 'BUCKLED!', { fill: '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    } else {
      // Straight column
      r.rect(colCenterX - colWidth / 2, colTopY, colWidth, colHeight, {
        fill: this.material === 'steel' ? '#94a3b8' : this.material === 'aluminum' ? '#cbd5e1' : '#92400e'
      });
      r.text(115, 250, 'STABLE', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Load arrow
    r.line(115, 60, 115, 85, { stroke: '#ef4444', strokeWidth: 3 });
    r.text(135, 75, 'P', { fill: '#ef4444', fontSize: 12 });

    // End conditions visual
    const topEnd = this.endCondition.split('-')[0];
    const bottomEnd = this.endCondition.split('-')[1];
    r.rect(90, colTopY - 5, 50, 5, { fill: topEnd === 'fixed' ? '#f59e0b' : '#94a3b8' });
    r.rect(90, colTopY + colHeight, 50, 5, { fill: bottomEnd === 'fixed' ? '#f59e0b' : '#94a3b8' });

    // Data panels
    r.roundRect(210, 65, 160, 200, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(290, 85, 'Critical Load', { fill: '#fb923c', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 108, `${(criticalLoad / 1000).toFixed(1)} kN`, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(290, 135, 'Applied Load', { fill: '#60a5fa', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 155, `${(this.appliedLoad / 1000).toFixed(1)} kN`, { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(290, 180, 'Load Ratio', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    const ratio = this.appliedLoad / criticalLoad;
    const ratioColor = ratio >= 1 ? '#ef4444' : ratio > 0.8 ? '#f59e0b' : '#10b981';
    r.text(290, 200, `${(ratio * 100).toFixed(0)}%`, { fill: ratioColor, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(290, 225, 'Slenderness', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 245, `λ = ${slenderness.toFixed(0)}`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Material buttons
    r.text(120, 285, 'Material:', { fill: '#94a3b8', fontSize: 11 });
    r.addButton({ id: 'mat_steel', label: 'Steel', variant: this.material === 'steel' ? 'primary' : 'secondary' });
    r.addButton({ id: 'mat_aluminum', label: 'Aluminum', variant: this.material === 'aluminum' ? 'primary' : 'secondary' });
    r.addButton({ id: 'mat_wood', label: 'Wood', variant: this.material === 'wood' ? 'primary' : 'secondary' });

    // End condition buttons
    r.text(120, 330, 'Ends:', { fill: '#94a3b8', fontSize: 11 });
    r.addButton({ id: 'end_pinned-pinned', label: 'Pin-Pin', variant: this.endCondition === 'pinned-pinned' ? 'primary' : 'secondary' });
    r.addButton({ id: 'end_fixed-fixed', label: 'Fix-Fix', variant: this.endCondition === 'fixed-fixed' ? 'primary' : 'secondary' });
    r.addButton({ id: 'end_fixed-free', label: 'Fix-Free', variant: this.endCondition === 'fixed-free' ? 'primary' : 'secondary' });

    // Sliders
    r.addSlider({ id: 'length', label: 'Length (m)', min: 0.5, max: 3.0, step: 0.1, value: this.columnLength });
    r.addSlider({ id: 'radius', label: 'Radius (cm)', min: 1, max: 5, step: 0.5, value: this.columnRadius * 100 });
    r.addSlider({ id: 'load', label: 'Load (kN)', min: 0, max: criticalLoad * 1.5 / 1000, step: 1, value: this.appliedLoad / 1000 });

    r.addButton({ id: 'reset', label: '↺ Reset', variant: 'secondary' });
    r.addButton({ id: 'continue', label: 'See the Formula', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 50, "Euler's Buckling Formula", { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Main formula
    r.roundRect(30, 80, 340, 100, 16, { fill: 'rgba(251, 146, 60, 0.2)' });
    r.text(200, 110, 'Critical Buckling Load', { fill: '#fb923c', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(60, 125, 280, 40, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 150, 'P_cr = π²EI / (KL)²', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    // Variable explanations
    r.roundRect(30, 195, 340, 120, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(75, 220, 'E', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold' });
    r.text(95, 220, "= Young's modulus (material)", { fill: '#cbd5e1', fontSize: 11 });
    r.text(75, 245, 'I', { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold' });
    r.text(95, 245, '= Moment of inertia (shape)', { fill: '#cbd5e1', fontSize: 11 });
    r.text(75, 270, 'K', { fill: '#10b981', fontSize: 14, fontWeight: 'bold' });
    r.text(95, 270, '= End condition factor', { fill: '#cbd5e1', fontSize: 11 });
    r.text(75, 295, 'L', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold' });
    r.text(95, 295, '= Column length', { fill: '#cbd5e1', fontSize: 11 });

    // Key insight
    r.roundRect(30, 330, 340, 70, 12, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(200, 355, '⚠️ Key Insight', { fill: '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 380, 'P_cr ∝ 1/L² → Halving length quadruples capacity!', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore End Conditions', variant: 'secondary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'The End Condition Mystery', { fill: '#f59e0b', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 90, 340, 95, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 118, 'A column with pinned (hinged) ends has', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 138, 'a critical load of 100 kN.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 165, 'If both ends are welded solid (fixed),', { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(200, 200, 'What happens to the critical load?', { fill: '#f59e0b', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Increases to 200 kN (doubles)',
      'Increases to 400 kN (quadruples)',
      'Stays at 100 kN (same column)',
      'Decreases to 50 kN'
    ];

    options.forEach((option, i) => {
      const y = 225 + i * 55;
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
        bgColor = 'rgba(245, 158, 11, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 455, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 1 ? 'Excellent!' : 'It quadruples!';
      r.text(200, 485, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 510, 'Fixed ends reduce effective length by half!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Why', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 45, 'End Condition Effects', { fill: '#f59e0b', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // End condition comparisons
    const conditions = [
      { type: 'fixed-fixed' as const, K: 0.5, label: 'Fixed-Fixed', multiplier: '4×' },
      { type: 'fixed-pinned' as const, K: 0.7, label: 'Fixed-Pinned', multiplier: '2×' },
      { type: 'pinned-pinned' as const, K: 1.0, label: 'Pinned-Pinned', multiplier: '1× (base)' },
      { type: 'fixed-free' as const, K: 2.0, label: 'Fixed-Free', multiplier: '0.25×' }
    ];

    conditions.forEach((cond, i) => {
      const x = 30;
      const y = 75 + i * 75;
      const isActive = this.endCondition === cond.type;

      r.roundRect(x, y, 340, 68, 12, { fill: isActive ? 'rgba(245, 158, 11, 0.3)' : 'rgba(30, 41, 59, 0.5)' });

      // Visual of end condition
      const colX = x + 50;
      const colTop = y + 15;
      const colH = 40;

      // Column line
      r.line(colX, colTop, colX, colTop + colH, { stroke: '#94a3b8', strokeWidth: 3 });

      // Top support
      if (cond.type.split('-')[0] === 'fixed') {
        r.rect(colX - 12, colTop - 5, 24, 5, { fill: '#f59e0b' });
      } else {
        r.circle(colX, colTop, 4, { fill: '#94a3b8' });
      }

      // Bottom support
      if (cond.type.split('-')[1] === 'fixed') {
        r.rect(colX - 12, colTop + colH, 24, 5, { fill: '#f59e0b' });
      } else if (cond.type.split('-')[1] === 'pinned') {
        r.circle(colX, colTop + colH, 4, { fill: '#94a3b8' });
      } else {
        // Free end - no support
      }

      r.text(x + 120, y + 25, cond.label, { fill: '#ffffff', fontSize: 12, fontWeight: 'bold' });
      r.text(x + 120, y + 45, `K = ${cond.K}`, { fill: '#94a3b8', fontSize: 11 });
      r.text(x + 280, y + 35, cond.multiplier, {
        fill: cond.K < 1 ? '#10b981' : cond.K > 1 ? '#ef4444' : '#f59e0b',
        fontSize: 14, fontWeight: 'bold', textAnchor: 'middle'
      });

      r.addButton({ id: `end_${cond.type}`, label: '', variant: 'secondary' });
    });

    // Explanation
    r.roundRect(30, 385, 340, 70, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
    r.text(200, 410, 'Effective Length: L_eff = K × L', { fill: '#f59e0b', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 435, 'Smaller K = shorter effective length = stronger!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Summary', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 50, 'End Conditions Explained', { fill: '#f59e0b', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Physical explanation
    r.roundRect(30, 80, 340, 100, 16, { fill: 'rgba(245, 158, 11, 0.2)' });
    r.text(200, 105, 'Why Fixed Ends Are Stronger', { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 130, 'Fixed ends resist rotation, forcing the', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 150, 'column to buckle in a shorter wave pattern.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 170, 'Shorter wave = higher critical load!', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // K factor table
    r.roundRect(30, 195, 340, 130, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 220, 'K Factor Summary', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const kData = [
      { condition: 'Fixed-Fixed', k: '0.5', load: '4× base' },
      { condition: 'Fixed-Pinned', k: '0.7', load: '2× base' },
      { condition: 'Pinned-Pinned', k: '1.0', load: '1× (base)' },
      { condition: 'Fixed-Free', k: '2.0', load: '0.25× base' }
    ];

    kData.forEach((row, i) => {
      const y = 245 + i * 18;
      r.text(80, y, row.condition, { fill: '#94a3b8', fontSize: 10 });
      r.text(200, y, row.k, { fill: '#22d3ee', fontSize: 10, textAnchor: 'middle' });
      r.text(300, y, row.load, { fill: '#10b981', fontSize: 10, textAnchor: 'middle' });
    });

    // Design tip
    r.roundRect(30, 340, 340, 60, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 365, '💡 Design Tip', { fill: '#10b981', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 385, 'Weld or bolt connections at both ends!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 50, 'Buckling in the Real World', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#f59e0b';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 75, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 103, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 135, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 165, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 188, app.tagline, { fill: '#fb923c', fontSize: 11, textAnchor: 'middle' });

    // Description (wrapped)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 218;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 48) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 16;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Physics connection
    r.roundRect(40, 320, 320, 55, 10, { fill: 'rgba(251, 146, 60, 0.2)' });
    r.text(200, 343, 'Physics Connection', { fill: '#fb923c', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 363, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: '✓ Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 410, '✓ Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 455, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take the Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 50, 'Buckling Knowledge Test', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 75, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Scenario
      r.roundRect(25, 95, 350, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      const scenarioWords = question.scenario.split(' ');
      let scenarioLine = '';
      let scenarioY = 115;
      scenarioWords.forEach(word => {
        if ((scenarioLine + word).length > 52) {
          r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
          scenarioLine = word + ' ';
          scenarioY += 14;
        } else {
          scenarioLine += word + ' ';
        }
      });
      if (scenarioLine) r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

      // Question
      r.text(200, 185, question.question, { fill: '#fb923c', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 210 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(251, 146, 60, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 44, 8, { fill: bgColor });
        r.text(40, y + 26, `${String.fromCharCode(65 + i)}. ${option.substring(0, 48)}${option.length > 48 ? '...' : ''}`,
          { fill: isSelected ? '#fb923c' : '#e2e8f0', fontSize: 10 });

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
        r.text(200, 450, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      const score = this.calculateScore();

      r.roundRect(60, 100, 280, 200, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 150, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 210, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 250, score >= 7 ? "You've mastered buckling!" : 'Keep studying.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Complete Lesson', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Retry', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 120, '🏛️', { fontSize: 72, textAnchor: 'middle' });
    r.text(200, 195, 'Buckling Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 225, "You understand Euler's buckling formula!", { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });

    // Achievement badges
    const achievements = [
      { icon: '📐', label: "Euler's Formula" },
      { icon: '📏', label: 'Length Effects' },
      { icon: '🔧', label: 'End Conditions' },
      { icon: '🏗️', label: 'Structural Design' }
    ];

    achievements.forEach((ach, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 260 + Math.floor(i / 2) * 70;
      r.roundRect(x, y, 140, 55, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 22, ach.icon, { fontSize: 18, textAnchor: 'middle' });
      r.text(x + 70, y + 42, ach.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 420, 300, 60, 12, { fill: 'rgba(251, 146, 60, 0.2)' });
    r.text(200, 445, 'Key Formula', { fill: '#fb923c', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 468, 'P_cr = π²EI / (KL)²', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering structural buckling!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      columnLength: this.columnLength,
      columnRadius: this.columnRadius,
      material: this.material,
      endCondition: this.endCondition,
      appliedLoad: this.appliedLoad,
      isBuckled: this.isBuckled,
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
    if (state.columnLength !== undefined) this.columnLength = state.columnLength as number;
    if (state.columnRadius !== undefined) this.columnRadius = state.columnRadius as number;
    if (state.material !== undefined) this.material = state.material as 'steel' | 'aluminum' | 'wood';
    if (state.endCondition !== undefined) this.endCondition = state.endCondition as keyof typeof END_FACTORS;
    if (state.appliedLoad !== undefined) this.appliedLoad = state.appliedLoad as number;
    if (state.isBuckled !== undefined) this.isBuckled = state.isBuckled as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createBucklingGame(sessionId: string): BucklingGame {
  return new BucklingGame(sessionId);
}
