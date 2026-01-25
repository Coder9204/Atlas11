import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// POISSON'S RATIO GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Material deformation under stress
// nu = -epsilon_lateral / epsilon_axial
// When stretched axially, materials contract laterally
// nu ranges from 0 (cork) to ~0.5 (rubber - incompressible)
// Auxetic materials have negative nu - they expand when stretched!
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
  connection: string;
}

interface Material {
  name: string;
  poissonRatio: number;
  color: string;
}

export class PoissonRatioGame extends BaseGame {
  readonly gameType = 'poisson_ratio';
  readonly gameTitle = "Poisson's Ratio";

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private materialIndex = 0; // index into materials array
  private stretch = 0; // 0-50%
  private auxeticStretch = 0; // for twist phase
  private animationTime = 0;

  // Materials
  private readonly materials: Material[] = [
    { name: 'Steel', poissonRatio: 0.3, color: '#6b7280' },
    { name: 'Rubber', poissonRatio: 0.49, color: '#ec4899' },
    { name: 'Cork', poissonRatio: 0.0, color: '#d97706' }
  ];

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // PROTECTED: Test questions with correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      question: "What is Poisson's ratio?",
      options: [
        "The ratio of stress to strain",
        "The ratio of lateral contraction to axial extension",
        "The maximum stretch before breaking",
        "The speed of sound in the material"
      ],
      correctIndex: 1,
      explanation: "Poisson's ratio (nu) = -epsilon_lateral/epsilon_axial. It describes how much a material contracts sideways when stretched lengthwise."
    },
    {
      question: "Why does rubber have a Poisson's ratio close to 0.5?",
      options: [
        "It's very stiff and rigid",
        "It's nearly incompressible - volume stays constant, so it must thin when stretched",
        "It contains air bubbles that compress",
        "It's made of carbon chains"
      ],
      correctIndex: 1,
      explanation: "Rubber is nearly incompressible. When stretched, its volume must stay constant, so it contracts significantly in the lateral direction (nu approaches 0.5)."
    },
    {
      question: "What's special about auxetic materials?",
      options: [
        "They're extremely strong and lightweight",
        "They have negative Poisson's ratio - they get WIDER when stretched",
        "They conduct electricity when stretched",
        "They become transparent under stress"
      ],
      correctIndex: 1,
      explanation: "Auxetic materials have negative Poisson's ratio due to their re-entrant geometry. They expand laterally when stretched axially."
    },
    {
      question: "Why are cork stoppers good for wine bottles?",
      options: [
        "Cork is completely waterproof",
        "Cork has nu = 0, so it doesn't bulge when compressed into the bottle",
        "Cork is naturally antibacterial",
        "Cork is the cheapest available material"
      ],
      correctIndex: 1,
      explanation: "Cork has Poisson's ratio near zero, so it doesn't bulge outward when compressed. This makes it easy to push into a bottle neck."
    },
    {
      question: "What is the theoretical maximum Poisson's ratio for isotropic materials?",
      options: [
        "1.0 (materials can double in width)",
        "0.5 (volume conservation limit)",
        "0.3 (typical metal value)",
        "There is no upper limit"
      ],
      correctIndex: 1,
      explanation: "For isotropic materials, thermodynamics limits Poisson's ratio to 0.5. At this value, volume is conserved during deformation."
    },
    {
      question: "What happens to the volume of rubber when stretched (nu = 0.5)?",
      options: [
        "Volume increases significantly",
        "Volume stays approximately constant",
        "Volume decreases by half",
        "Volume oscillates as it stretches"
      ],
      correctIndex: 1,
      explanation: "At nu = 0.5, the material is incompressible. The volume remains constant - what it gains in length, it loses in cross-section."
    },
    {
      question: "How do auxetic materials achieve negative Poisson's ratio?",
      options: [
        "By using magnetic particles",
        "Through re-entrant (inward-pointing) structural geometry",
        "By mixing two incompatible materials",
        "Through chemical treatment of normal materials"
      ],
      correctIndex: 1,
      explanation: "Auxetic materials use re-entrant honeycomb structures. When pulled, the inward-pointing cells unfold and expand outward."
    },
    {
      question: "What is a typical Poisson's ratio for steel?",
      options: [
        "Close to 0 (like cork)",
        "Around 0.3",
        "Close to 0.5 (like rubber)",
        "Negative (like auxetics)"
      ],
      correctIndex: 1,
      explanation: "Steel and most metals have Poisson's ratio around 0.3. They contract laterally when stretched, but not as much as rubber."
    },
    {
      question: "Why are auxetic materials useful in body armor?",
      options: [
        "They're lighter than regular materials",
        "They expand under impact, spreading force over a larger area",
        "They're completely bulletproof",
        "They generate heat to warn the wearer"
      ],
      correctIndex: 1,
      explanation: "Auxetic materials expand when compressed (impact). This spreads the impact force over a larger area, reducing peak pressure."
    },
    {
      question: "In the formula nu = -epsilon_lateral/epsilon_axial, what does a positive nu indicate?",
      options: [
        "The material expands in all directions",
        "The material contracts laterally when stretched axially (normal behavior)",
        "The material is incompressible",
        "The material has no elasticity"
      ],
      correctIndex: 1,
      explanation: "Positive nu means epsilon_lateral is opposite sign to epsilon_axial. When you stretch (positive axial), it contracts (negative lateral)."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🍾",
      title: "Cork Stoppers",
      description: "Cork has Poisson's ratio near 0, so it compresses without bulging outward. This makes it perfect for sliding into and sealing bottle necks.",
      connection: "Cork's cellular structure collapses inward rather than bulging out when compressed."
    },
    {
      icon: "🛡️",
      title: "Auxetic Body Armor",
      description: "Auxetic foam expands when impacted, spreading force over a larger area. Some designs even expand to fill wound gaps.",
      connection: "Negative Poisson's ratio means impact compression causes lateral expansion, distributing force."
    },
    {
      icon: "🔗",
      title: "Rubber Bands",
      description: "Rubber bands have nu = 0.5 (incompressible). Watch them get noticeably thinner as you stretch them - volume stays constant!",
      connection: "Volume conservation: what rubber gains in length, it must lose in cross-sectional area."
    },
    {
      icon: "🏭",
      title: "Metal Forming",
      description: "Engineers must account for Poisson contraction when designing stamped metal parts. Steel with nu = 0.3 spreads when compressed.",
      connection: "Die design must compensate for the lateral expansion that occurs during metal stamping."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate lateral strain from axial strain
  private calculateLateralStrain(axialStrain: number, poissonRatio: number): number {
    return -poissonRatio * axialStrain;
  }

  // PROTECTED: Calculate new dimensions
  private calculateDeformedDimensions(
    originalWidth: number,
    originalHeight: number,
    axialStrainPercent: number,
    poissonRatio: number
  ): { width: number; height: number } {
    const axialStrain = axialStrainPercent / 100;
    const lateralStrain = this.calculateLateralStrain(axialStrain, poissonRatio);

    return {
      width: originalWidth * (1 + lateralStrain),
      height: originalHeight * (1 + axialStrain)
    };
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
      if (input.id === 'stretch') {
        this.stretch = Math.floor(input.value);
      } else if (input.id === 'auxetic_stretch') {
        this.auxeticStretch = Math.floor(input.value);
      }
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
            this.prediction = parseInt(buttonId.split('_')[1]);
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
          this.resetSimulation();
        }
        break;

      case 'play':
        if (buttonId.startsWith('material_')) {
          this.materialIndex = parseInt(buttonId.split('_')[1]);
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
          this.auxeticStretch = 0;
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

  private resetSimulation(): void {
    this.materialIndex = 0;
    this.stretch = 0;
    this.auxeticStretch = 0;
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
    this.resetSimulation();
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
    r.circle(100, 100, 150, { fill: 'rgba(99, 102, 241, 0.05)' });
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
    // Badge
    r.roundRect(125, 60, 150, 30, 8, { fill: 'rgba(99, 102, 241, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#818cf8', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Rubber Band Mystery', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Why do materials change shape when stretched?', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Rubber band icon
    r.text(200, 260, '🔗↔️', { fontSize: 48, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 300, 320, 150, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 335, 'Stretch a rubber band and watch closely:', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 365, 'It gets LONGER but also THINNER!', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 405, 'All materials do this (to varying degrees).', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 435, 'Why?', { fill: '#818cf8', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'investigate', label: 'Investigate!', variant: 'primary' });

    r.setCoachMessage("Discover Poisson's ratio - why materials thin when stretched!");
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 100, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'You stretch a rubber band to twice its length.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 160, 'What happens to its width?', { fill: '#818cf8', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      "It gets thinner - volume is conserved",
      "Stays the same - only length changes",
      "It gets wider - stretching pulls atoms apart",
      "Depends on the color of the rubber"
    ];

    options.forEach((option, i) => {
      const y = 195 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (i === 0) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.prediction) {
        bgColor = 'rgba(99, 102, 241, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 460, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 0 ? 'Exactly right!' : 'It gets thinner due to volume conservation!';
      r.text(200, 490, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 520, "Rubber is nearly incompressible (nu ≈ 0.5).", { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test It', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    const material = this.materials[this.materialIndex];
    const dims = this.calculateDeformedDimensions(80, 120, this.stretch, material.poissonRatio);
    const lateralContraction = (material.poissonRatio * this.stretch);

    r.text(200, 45, "Poisson's Ratio", { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization area
    r.roundRect(30, 70, 340, 200, 12, { fill: 'rgba(15, 23, 42, 0.8)' });

    // Force arrows (top and bottom)
    if (this.stretch > 0) {
      // Top arrow
      r.line(200, 90, 200, 75, { stroke: '#ef4444', strokeWidth: 3 });
      // Bottom arrow
      r.line(200, 270 - 20, 200, 285 - 20, { stroke: '#ef4444', strokeWidth: 3 });
    }

    // Material specimen
    const centerX = 200;
    const centerY = 170;
    r.roundRect(
      centerX - dims.width / 2,
      centerY - dims.height / 2,
      dims.width,
      dims.height,
      3,
      { fill: material.color }
    );

    // Grid lines on material
    for (let i = 1; i < 5; i++) {
      const y = centerY - dims.height / 2 + (i * dims.height / 5);
      r.line(centerX - dims.width / 2, y, centerX + dims.width / 2, y, { stroke: '#1f2937', strokeWidth: 1 });
    }
    for (let i = 1; i < 3; i++) {
      const x = centerX - dims.width / 2 + (i * dims.width / 3);
      r.line(x, centerY - dims.height / 2, x, centerY + dims.height / 2, { stroke: '#1f2937', strokeWidth: 1 });
    }

    // Lateral contraction arrows
    if (this.stretch > 5 && material.poissonRatio > 0) {
      r.line(centerX - dims.width / 2 - 20, centerY, centerX - dims.width / 2 - 5, centerY, { stroke: '#3b82f6', strokeWidth: 2 });
      r.line(centerX + dims.width / 2 + 20, centerY, centerX + dims.width / 2 + 5, centerY, { stroke: '#3b82f6', strokeWidth: 2 });
    }

    // Dimension display
    r.roundRect(290, 90, 70, 70, 8, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(325, 110, 'Original:', { fill: '#64748b', fontSize: 8, textAnchor: 'middle' });
    r.text(325, 125, '80 x 120', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(325, 145, 'Current:', { fill: '#64748b', fontSize: 8, textAnchor: 'middle' });
    r.text(325, 160, `${dims.width.toFixed(0)} x ${dims.height.toFixed(0)}`, { fill: '#818cf8', fontSize: 9, textAnchor: 'middle' });

    // Material info
    r.text(200, 290, `${material.name} (nu = ${material.poissonRatio})`, { fill: material.color, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Material selector
    r.text(200, 320, 'Select Material:', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    this.materials.forEach((mat, i) => {
      const x = 60 + i * 110;
      const active = i === this.materialIndex;
      r.roundRect(x, 335, 100, 40, 8, { fill: active ? mat.color : 'rgba(51, 65, 85, 0.5)' });
      r.text(x + 50, 355, `${mat.name}`, { fill: active ? '#ffffff' : '#94a3b8', fontSize: 10, textAnchor: 'middle' });
      r.text(x + 50, 370, `nu = ${mat.poissonRatio}`, { fill: active ? '#ffffff' : '#64748b', fontSize: 8, textAnchor: 'middle' });
      r.addButton({ id: `material_${i}`, label: '', variant: 'secondary' });
    });

    // Stretch slider
    r.text(200, 405, `Axial Stretch: ${this.stretch}%`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.addSlider({ id: 'stretch', label: 'Stretch', min: 0, max: 50, step: 1, value: this.stretch });

    // Lateral contraction readout
    r.roundRect(30, 450, 340, 50, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 475, `Lateral Contraction: ${lateralContraction.toFixed(1)}%`, { fill: '#3b82f6', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    if (this.stretch > 10) {
      r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'primary' });
    }

    r.setCoachMessage('Compare materials with different Poisson ratios. Notice rubber thins more than steel!');
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, "Understanding Poisson's Ratio", { fill: '#ffffff', fontSize: 17, fontWeight: 'bold', textAnchor: 'middle' });

    // Definition
    r.roundRect(30, 85, 340, 70, 12, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 110, 'nu = -(lateral strain) / (axial strain)', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 135, 'How much a material contracts sideways when stretched', { fill: '#818cf8', fontSize: 10, textAnchor: 'middle' });

    // Material values
    const materials = [
      { name: 'Rubber', nu: '~0.5', desc: 'Incompressible - max lateral contraction', color: '#ec4899' },
      { name: 'Steel', nu: '~0.3', desc: 'Moderate contraction', color: '#6b7280' },
      { name: 'Cork', nu: '~0', desc: 'No lateral change when compressed', color: '#d97706' }
    ];

    materials.forEach((mat, i) => {
      const y = 175 + i * 70;
      r.roundRect(30, y, 340, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.circle(60, y + 30, 18, { fill: mat.color });
      r.text(60, y + 35, mat.nu, { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(90, y + 25, mat.name, { fill: '#ffffff', fontSize: 12, fontWeight: 'bold' });
      r.text(90, y + 45, mat.desc, { fill: '#94a3b8', fontSize: 9 });
    });

    // Key insight
    r.roundRect(30, 395, 340, 70, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 420, 'Key Insight', { fill: '#34d399', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 445, 'Most materials: 0 < nu < 0.5 (they thin when stretched)', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    r.text(200, 490, `Your prediction: ${this.prediction === 0 ? 'Correct!' : 'Not quite'}`, { fill: this.prediction === 0 ? '#34d399' : '#f87171', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'But wait...', variant: 'secondary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist!', { fill: '#a855f7', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 95, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 120, "What if a material had a NEGATIVE", { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 145, "Poisson's ratio?", { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 170, 'It would get WIDER when stretched!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    const options = [
      "Yes! 'Auxetic' materials expand when pulled",
      "No, negative nu violates physics",
      "Only in theory - impossible to make",
      "Only liquids can have negative nu"
    ];

    options.forEach((option, i) => {
      const y = 200 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (i === 0) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.twistPrediction) {
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 45, 10, { fill: bgColor });
      r.text(50, y + 27, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 10 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 430, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 0 ? 'Exactly right!' : 'Auxetic materials are real!';
      r.text(200, 460, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 490, 'Re-entrant (inward-pointing) structures unfold', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
      r.text(200, 510, 'and expand when stretched!', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Auxetics', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    const axialStrain = this.auxeticStretch / 100;
    const auxeticNu = -0.5;
    const lateralExpansion = -auxeticNu * axialStrain;

    const normalWidth = 80 * (1 - 0.3 * axialStrain);
    const normalHeight = 100 * (1 + axialStrain);
    const auxeticWidth = 80 * (1 + lateralExpansion);
    const auxeticHeight = 100 * (1 + axialStrain);

    r.text(200, 45, 'Auxetic Materials', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Comparison visualization
    r.roundRect(30, 70, 340, 200, 12, { fill: 'rgba(15, 23, 42, 0.8)' });

    // Normal material (left)
    r.text(105, 95, 'Normal (nu = 0.3)', { fill: '#6b7280', fontSize: 10, textAnchor: 'middle' });
    r.roundRect(105 - normalWidth / 2, 130, normalWidth, normalHeight, 3, { fill: '#6b7280' });
    r.text(105, 250, 'Gets thinner', { fill: '#6b7280', fontSize: 9, textAnchor: 'middle' });

    // Auxetic material (right)
    r.text(295, 95, 'Auxetic (nu = -0.5)', { fill: '#a855f7', fontSize: 10, textAnchor: 'middle' });
    r.roundRect(295 - auxeticWidth / 2, 130, auxeticWidth, auxeticHeight, 3, { fill: '#7c3aed' });
    r.text(295, 250, 'Gets WIDER!', { fill: '#a855f7', fontSize: 9, textAnchor: 'middle' });

    // Stretch slider
    r.text(200, 295, `Stretch Amount: ${this.auxeticStretch}%`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.addSlider({ id: 'auxetic_stretch', label: 'Stretch', min: 0, max: 50, step: 1, value: this.auxeticStretch });

    // Explanation
    r.roundRect(30, 340, 340, 100, 12, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 365, 'Auxetic Materials', { fill: '#a855f7', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 390, 'Have re-entrant (inward-pointing) structures.', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 410, 'When pulled, the structure unfolds and', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 430, 'expands outward!', { fill: '#a855f7', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Applications', variant: 'secondary' });

    r.setCoachMessage('Watch how the auxetic material gets WIDER when stretched - the opposite of normal materials!');
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Materials That Defy Intuition', { fill: '#a855f7', fontSize: 17, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 85, 340, 80, 12, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 115, 'Auxetic materials are REAL and USEFUL!', { fill: '#a855f7', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 145, 'Applications in body armor, medical devices, sports gear', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Key properties
    const properties = [
      { title: 'Re-entrant Structures', desc: 'Honeycomb with inward-pointing cells', color: '#a855f7' },
      { title: 'Impact Resistance', desc: 'Expands to spread impact force', color: '#ec4899' },
      { title: 'Natural Examples', desc: 'Some cat skin, cancellous bone', color: '#8b5cf6' }
    ];

    properties.forEach((prop, i) => {
      const y = 180 + i * 70;
      r.roundRect(30, y, 340, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(50, y + 25, prop.title, { fill: prop.color, fontSize: 12, fontWeight: 'bold' });
      r.text(50, y + 45, prop.desc, { fill: '#94a3b8', fontSize: 10 });
    });

    // Prediction result
    r.text(200, 415, `Your prediction: ${this.twistPrediction === 0 ? 'Correct!' : 'Not quite'}`, { fill: this.twistPrediction === 0 ? '#34d399' : '#f87171', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#818cf8';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Description
    const words = app.description.split(' ');
    let line = '';
    let lineY = 210;
    words.forEach(word => {
      if ((line + word).length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 16;
      } else {
        line += word + ' ';
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Physics connection
    r.roundRect(40, 310, 320, 55, 10, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 330, 'Physics Connection', { fill: '#818cf8', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 350, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });

    // Mark understood
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 400, 'Completed!', { fill: '#10b981', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 440, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 17, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 80, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Question
      r.roundRect(25, 95, 350, 60, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 130, question.question.substring(0, 50) + (question.question.length > 50 ? '...' : ''), { fill: '#e2e8f0', fontSize: 10, textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 170 + i * 52;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 45, 8, { fill: bgColor });
        r.text(40, y + 27, `${String.fromCharCode(65 + i)}. ${option.substring(0, 45)}${option.length > 45 ? '...' : ''}`, { fill: isSelected ? '#818cf8' : '#e2e8f0', fontSize: 9 });

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
        r.text(200, 410, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
      }
    } else {
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 160, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 125, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 175, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 210, score >= 7 ? "Excellent! You've mastered Poisson's ratio!" : 'Review the concepts and try again.', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: score >= 7 ? 'Claim Mastery Badge' : 'Review & Try Again', variant: 'primary' });
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 100, '🏆', { fontSize: 64, textAnchor: 'middle' });

    r.text(200, 175, "Poisson's Ratio Master!", { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 205, 'You understand material deformation!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Achievements
    r.roundRect(40, 240, 320, 200, 16, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 270, 'You now understand:', { fill: '#818cf8', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    const achievements = [
      'nu = lateral strain / axial strain',
      'Most materials: 0 < nu < 0.5',
      'Rubber ~ 0.5 (incompressible), Cork ~ 0',
      'Auxetic materials have nu < 0',
      'Applications from bottles to body armor'
    ];

    achievements.forEach((achievement, i) => {
      r.text(60, 300 + i * 25, `✓ ${achievement}`, { fill: '#cbd5e1', fontSize: 10 });
    });

    r.text(200, 470, 'Now you know why rubber bands get skinny!', { fill: '#818cf8', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage("Congratulations on mastering Poisson's ratio!");
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      materialIndex: this.materialIndex,
      stretch: this.stretch,
      auxeticStretch: this.auxeticStretch,
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
    if (state.materialIndex !== undefined) this.materialIndex = state.materialIndex as number;
    if (state.stretch !== undefined) this.stretch = state.stretch as number;
    if (state.auxeticStretch !== undefined) this.auxeticStretch = state.auxeticStretch as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createPoissonRatioGame(sessionId: string): PoissonRatioGame {
  return new PoissonRatioGame(sessionId);
}
