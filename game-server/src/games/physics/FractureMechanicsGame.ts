import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// FRACTURE MECHANICS GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Stress concentration factor Kt = sigma_max / sigma_avg
// Sharp corners create stress concentration points that initiate cracks
// Crack-stop holes reduce Kt by blunting sharp crack tips
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

// PROTECTED physics constants
const BASE_FRACTURE_STRESS = 100; // MPa

export class FractureMechanicsGame extends BaseGame {
  readonly gameType = 'fracture_mechanics';
  readonly gameTitle = 'Fracture Mechanics: Why Sharp Corners Fail';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private notchType: 'none' | 'round' | 'vsharp' | 'crack' = 'none';
  private appliedStress = 0;
  private isFractured = false;
  private animationTime = 0;

  // Twist: crack stop hole
  private hasCrackStopHole = false;
  private crackLength = 20;
  private twistStress = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // PROTECTED: Stress concentration factors
  private getStressConcentration(type: string): number {
    switch (type) {
      case 'none': return 1;
      case 'round': return 2.5; // Circular hole
      case 'vsharp': return 5; // Sharp V-notch
      case 'crack': return 10; // Crack tip (limited, approaches infinity)
      default: return 1;
    }
  }

  // PROTECTED: Calculate fracture stress threshold
  private getFractureStress(type: string): number {
    const kt = this.getStressConcentration(type);
    return BASE_FRACTURE_STRESS / kt;
  }

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "The de Havilland Comet was the world's first commercial jet airliner in the 1950s.",
      question: "Why did three Comet jets break apart mid-flight?",
      options: [
        "Engine failures caused vibrations",
        "Square window corners created stress concentrations that grew into cracks",
        "Metal fatigue from extreme temperatures",
        "Poor welding at the wing joints"
      ],
      correctIndex: 1,
      explanation: "The square corners of the Comet's windows created stress concentration points. Under repeated pressurization cycles, cracks initiated at these corners and propagated, causing catastrophic failure."
    },
    {
      scenario: "An engineer is designing a bracket that will experience cyclic loading.",
      question: "What is the stress concentration factor (Kt)?",
      options: [
        "The total stress applied to a part",
        "The ratio of local maximum stress to average stress",
        "The temperature coefficient of the material",
        "The factor of safety in the design"
      ],
      correctIndex: 1,
      explanation: "Kt = sigma_max / sigma_avg. It quantifies how much stress is amplified at geometric features like holes, notches, or corners."
    },
    {
      scenario: "A crack is discovered in a ship hull during routine inspection.",
      question: "How can a crack-stop hole arrest crack propagation?",
      options: [
        "It removes the cracked material entirely",
        "It converts the sharp crack tip to a rounded edge, reducing Kt",
        "It fills with water that freezes and seals the crack",
        "It redirects stress away from the hull"
      ],
      correctIndex: 1,
      explanation: "A crack tip has Kt approaching infinity. Drilling a hole blunts this to a circular geometry with Kt of about 2-3, dramatically reducing stress concentration."
    },
    {
      scenario: "You have three plates with identical holes: circular, elliptical (long axis perpendicular to load), and sharp V-notch.",
      question: "Which has the HIGHEST stress concentration?",
      options: [
        "Circular hole (Kt ~ 2-3)",
        "Elliptical hole perpendicular to load",
        "Sharp V-notch (Kt ~ 5+)",
        "All have equal stress concentration"
      ],
      correctIndex: 2,
      explanation: "The sharper the feature, the higher the stress concentration. Sharp V-notches can have Kt of 5 or higher, while circular holes are about 2-3."
    },
    {
      scenario: "A bicycle frame has rounded transitions (fillets) at all tube junctions.",
      question: "Why do engineers add fillet radii at corners?",
      options: [
        "For aesthetic appeal",
        "To reduce stress concentration and prevent crack initiation",
        "To add more material and weight",
        "To make welding easier"
      ],
      correctIndex: 1,
      explanation: "Fillets provide smooth transitions that reduce stress concentration. A fillet radius of just 1-2mm can reduce Kt by 50% or more."
    },
    {
      scenario: "Perforation lines on paper products create intentional weak points.",
      question: "How do perforations utilize stress concentration?",
      options: [
        "They remove material making the paper thinner overall",
        "Sharp-edged holes concentrate stress, making tearing easy along the line",
        "The holes align paper fibers",
        "Heat from friction melts the paper"
      ],
      correctIndex: 1,
      explanation: "Perforations are intentional stress concentrators. When you apply force, stress concentrates at each hole, causing controlled tearing along the perforation line."
    },
    {
      scenario: "An aerospace engineer is analyzing a wing spar under fatigue loading.",
      question: "Why does fatigue crack growth accelerate as cracks get longer?",
      options: [
        "The material weakens with time",
        "Stress intensity increases with crack length (K proportional to sqrt(a))",
        "Temperature rises at the crack tip",
        "Oxygen corrodes the crack surfaces"
      ],
      correctIndex: 1,
      explanation: "Stress intensity factor K is proportional to sqrt(crack length). As cracks grow, K increases, accelerating growth rate until critical failure."
    },
    {
      scenario: "A pressure vessel has a small surface scratch.",
      question: "Why can even small scratches be dangerous in pressurized systems?",
      options: [
        "Scratches indicate manufacturing defects",
        "They act as stress concentrators and potential crack initiation sites",
        "They allow gas to leak slowly",
        "They collect corrosive materials"
      ],
      correctIndex: 1,
      explanation: "Small scratches create sharp geometric features that concentrate stress. Under cyclic pressure, these can grow into through-wall cracks."
    },
    {
      scenario: "Modern aircraft undergo regular non-destructive inspection (NDI).",
      question: "Why is finding small cracks early critical in aircraft maintenance?",
      options: [
        "Small cracks are easier to repair",
        "Cracks grow exponentially - detecting them early prevents catastrophic failure",
        "Insurance requires documentation",
        "Passengers prefer knowing their plane was inspected"
      ],
      correctIndex: 1,
      explanation: "Crack growth follows Paris Law: da/dN = C(Delta K)^m. Growth accelerates as cracks lengthen. Early detection allows repair before critical size."
    },
    {
      scenario: "A bolt hole is reamed (smoothly finished) rather than left with rough drill marks.",
      question: "Why does surface finish matter for fatigue life?",
      options: [
        "Smooth surfaces look better",
        "Rough surfaces have micro-notches that act as stress concentrators",
        "Oil adheres better to smooth surfaces",
        "Rough surfaces corrode faster"
      ],
      correctIndex: 1,
      explanation: "Machining marks and rough surfaces create micro-stress concentrators. Polished surfaces can have 2-3x better fatigue life than rough machined surfaces."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "✈️",
      title: "Aircraft Design",
      tagline: "From tragedy came understanding",
      description: "The de Havilland Comet crashes in 1954 revolutionized aircraft design. Square windows were replaced with rounded ones, and aircraft now use damage-tolerant design with multiple load paths.",
      connection: "Rounded window corners reduce Kt from ~4 (square) to ~2 (round), dramatically reducing crack initiation probability."
    },
    {
      icon: "🕳️",
      title: "Crack-Stop Holes",
      tagline: "Fight cracks with holes",
      description: "When cracks are found in ships, bridges, or aircraft, drilling a hole at the crack tip is a common emergency repair. The hole blunts the crack, reducing Kt from near-infinity to about 2-3.",
      connection: "This counter-intuitive technique converts a sharp crack (Kt -> infinity) into a circular hole (Kt ~ 2-3), often stopping crack growth entirely."
    },
    {
      icon: "⚙️",
      title: "Fillet Radii in Design",
      tagline: "Round it to strengthen it",
      description: "Engineers add rounded transitions (fillets) at all corners and changes in cross-section. This is why bolts have fillets at the head-shank junction and shafts have fillets at steps.",
      connection: "Adding a fillet with radius just 10% of the smaller dimension can reduce Kt by 40-50%."
    },
    {
      icon: "🧻",
      title: "Perforation Lines",
      tagline: "Intentional weakness",
      description: "Toilet paper, stamps, and tear-off coupons use perforations - a series of small holes that create stress concentration points along a desired tear line.",
      connection: "Each perforation hole is a stress concentrator. When you pull, stress focuses at these points, causing controlled tearing along the line."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // Check if material has fractured
  private checkFracture(): void {
    const threshold = this.getFractureStress(this.notchType);
    if (this.appliedStress > threshold && !this.isFractured) {
      this.isFractured = true;
    }
  }

  // Check test answer
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
      if (input.id === 'applied_stress') {
        this.appliedStress = Math.max(0, Math.min(100, input.value));
        this.checkFracture();
      } else if (input.id === 'twist_stress') {
        this.twistStress = Math.max(0, Math.min(50, input.value));
        // Crack propagation if no stop hole
        if (!this.hasCrackStopHole && this.twistStress > 12) {
          this.crackLength = Math.min(150, 20 + (this.twistStress - 12) * 3);
        }
      }
    }
  }

  private handleButtonClick(buttonId: string): void {
    switch (this.phase) {
      case 'hook':
        if (buttonId === 'start') {
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
        if (buttonId === 'notch_none') {
          this.notchType = 'none';
          this.resetSimulation();
        } else if (buttonId === 'notch_round') {
          this.notchType = 'round';
          this.resetSimulation();
        } else if (buttonId === 'notch_vsharp') {
          this.notchType = 'vsharp';
          this.resetSimulation();
        } else if (buttonId === 'notch_crack') {
          this.notchType = 'crack';
          this.resetSimulation();
        } else if (buttonId === 'reset') {
          this.resetSimulation();
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
        if (buttonId === 'toggle_hole') {
          this.hasCrackStopHole = !this.hasCrackStopHole;
          this.crackLength = 20;
        } else if (buttonId === 'reset') {
          this.hasCrackStopHole = false;
          this.crackLength = 20;
          this.twistStress = 0;
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

  private resetSimulation(): void {
    this.appliedStress = 0;
    this.isFractured = false;
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.notchType = 'none';
    this.appliedStress = 0;
    this.isFractured = false;
    this.hasCrackStopHole = false;
    this.crackLength = 20;
    this.twistStress = 0;
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
    r.circle(100, 100, 150, { fill: 'rgba(239, 68, 68, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(249, 115, 22, 0.05)' });

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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(239, 68, 68, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#f87171', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'Why Sharp Corners Fail', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'The Comet Jet Disaster & Stress Concentration', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    // Airplane icon
    r.text(200, 230, '✈️', { fontSize: 56, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 280, 320, 180, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 310, 'In 1954, three de Havilland Comet jets', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 330, 'broke apart mid-flight.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 365, 'The cause? Square windows.', { fill: '#f87171', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 400, 'Sharp corners created stress points', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 420, 'that grew into catastrophic cracks.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 450, 'Why are sharp corners so dangerous?', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'start', label: 'Investigate the Physics', variant: 'primary' });

    r.setCoachMessage('Explore how stress concentration causes fracture!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Make Your Prediction', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 90, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 120, 'Two identical metal plates under load:', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 145, 'One has a circular hole, one has a sharp V-notch.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 175, 'Which breaks first under the same force?', { fill: '#f87171', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Sharp V-notch - stress concentrates at sharp corners',
      'Circular hole - removes more material',
      'Both break at the same stress',
      "Neither - small defects don't matter"
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 60;
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
        bgColor = 'rgba(239, 68, 68, 0.3)';
      }

      r.roundRect(30, y, 340, 52, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option.substring(0, 45)}`, { fill: textColor, fontSize: 11 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 460, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 0 ? 'Excellent prediction!' : 'Sharp corners concentrate stress the most!';
      r.text(200, 490, message, { fill: '#34d399', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 520, 'The sharper the feature, the higher the Kt factor.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 540, "Let's explore this in the lab!", { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test Different Defects', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Stress Concentration Lab', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization area
    r.roundRect(20, 75, 360, 220, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    const kt = this.getStressConcentration(this.notchType);
    const localStress = this.appliedStress * kt;
    const stretch = this.appliedStress / 15;

    // Stress arrows
    for (let i = 0; i < 5; i++) {
      const x = 80 + i * 60;
      r.line(x, 90, x, 100 + stretch, { stroke: '#ef4444', strokeWidth: 2 });
      r.line(x, 275 - stretch, x, 285, { stroke: '#ef4444', strokeWidth: 2 });
    }

    // Material specimen
    const specColor = this.isFractured ? '#7f1d1d' : '#4b5563';
    r.rect(70, 105 - stretch, 200, 160 + stretch * 2, { fill: specColor });

    // Defect visualization
    if (this.notchType === 'round') {
      r.circle(170, 185, 15, { fill: '#0a0f1a' });
    } else if (this.notchType === 'vsharp') {
      r.polygon([[170, 170], [155, 185], [170, 200], [185, 185]], { fill: '#0a0f1a' });
    } else if (this.notchType === 'crack') {
      r.line(120, 185, 170, 185, { stroke: '#0a0f1a', strokeWidth: 3 });
    }

    // Fracture line
    if (this.isFractured) {
      r.line(70, 185, 270, 185, { stroke: '#ef4444', strokeWidth: 3, strokeDasharray: '8 4' });
      r.text(170, 220, 'FRACTURED!', { fill: '#f87171', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Info box
    r.roundRect(285, 100, 85, 90, 8, { fill: 'rgba(15, 23, 42, 0.8)' });
    r.text(328, 120, 'Applied', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(328, 138, `${this.appliedStress.toFixed(0)} MPa`, { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(328, 155, 'Kt', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(328, 173, `x${kt}`, { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Defect type buttons
    r.text(200, 310, 'Select Defect Type:', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    const notchTypes = [
      { id: 'notch_none', label: 'None', active: this.notchType === 'none' },
      { id: 'notch_round', label: 'Round', active: this.notchType === 'round' },
      { id: 'notch_vsharp', label: 'V-Notch', active: this.notchType === 'vsharp' },
      { id: 'notch_crack', label: 'Crack', active: this.notchType === 'crack' }
    ];

    notchTypes.forEach((nt, i) => {
      const x = 50 + i * 80;
      r.roundRect(x, 325, 70, 30, 6, { fill: nt.active ? '#ef4444' : 'rgba(51, 65, 85, 0.5)' });
      r.text(x + 35, 345, nt.label, { fill: '#ffffff', fontSize: 11, textAnchor: 'middle' });
      r.addButton({ id: nt.id, label: '', variant: 'secondary' });
    });

    // Stress slider
    r.addSlider({
      id: 'applied_stress',
      label: 'Applied Stress (MPa)',
      min: 0,
      max: 100,
      step: 1,
      value: this.appliedStress
    });

    // Fracture threshold info
    r.roundRect(40, 420, 320, 50, 10, { fill: 'rgba(239, 68, 68, 0.1)' });
    const threshold = this.getFractureStress(this.notchType);
    r.text(200, 445, `Fracture at: ${threshold.toFixed(0)} MPa | Local stress: ${localStress.toFixed(0)} MPa`, { fill: '#f87171', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 462, `Kt = ${kt} means stress is ${kt}x higher at the defect!`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    if (this.isFractured) {
      r.addButton({ id: 'reset', label: 'Reset Specimen', variant: 'secondary' });
    }

    r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'Why Sharp Corners Fail', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Stress flow explanation
    r.roundRect(30, 80, 340, 130, 16, { fill: 'rgba(239, 68, 68, 0.15)' });
    r.text(200, 105, 'Stress Concentration Factor (Kt)', { fill: '#f87171', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(70, 120, 260, 35, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 143, 'Kt = sigma_max / sigma_avg', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.text(200, 180, 'Sharper features = Higher Kt = Earlier failure', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 198, 'Circular hole: Kt ~ 2-3 | Sharp notch: Kt ~ 5+', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Step by step
    const steps = [
      { num: 1, title: 'Stress Flow', desc: 'Stress flows around defects like water' },
      { num: 2, title: 'Concentration', desc: 'Sharp corners squeeze stress into tiny areas' },
      { num: 3, title: 'Crack Initiation', desc: 'When local stress exceeds strength, cracks form' }
    ];

    steps.forEach((step, i) => {
      const y = 230 + i * 65;
      r.roundRect(30, y, 340, 55, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.circle(60, y + 28, 15, { fill: i === 0 ? '#ef4444' : i === 1 ? '#f97316' : '#fbbf24' });
      r.text(60, y + 33, String(step.num), { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(85, y + 22, step.title, { fill: '#ffffff', fontSize: 12, fontWeight: 'bold' });
      r.text(85, y + 42, step.desc, { fill: '#94a3b8', fontSize: 11 });
    });

    // Engineering rule
    r.roundRect(30, 430, 340, 60, 12, { fill: 'rgba(16, 185, 129, 0.15)' });
    r.text(200, 455, 'Engineering Rule', { fill: '#34d399', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 475, 'Add fillets at all corners. A 1-2mm radius can reduce Kt by 50%!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Discover the Twist', variant: 'secondary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'The Twist: Crack-Stop Holes', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 85, 340, 110, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 115, 'A crack is discovered in a ship hull.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 140, 'Surprisingly, the repair involves drilling', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 160, 'a HOLE at the crack tip!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 185, 'Why would making the defect bigger help?', { fill: '#a855f7', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Hole blunts sharp tip, reducing Kt dramatically',
      'Hole lets water drain out of the crack',
      'Makes it easier to weld the crack closed',
      "It's a bad idea and will make things worse"
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 55;
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

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option.substring(0, 48)}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 440, 340, 95, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 0 ? 'Exactly right!' : 'Counter-intuitive but true!';
      r.text(200, 465, message, { fill: '#34d399', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 490, 'A crack tip has Kt approaching infinity.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 510, 'A hole converts this to Kt ~ 2-3, stopping crack growth!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Try It Yourself', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Crack-Stop Hole Lab', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization area
    r.roundRect(20, 75, 360, 200, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Metal plate
    r.rect(50, 110, 300, 130, { fill: '#4b5563' });

    // Crack
    const crackTipX = 100 + this.crackLength;
    r.line(50, 175, crackTipX, 175, { stroke: '#0a0f1a', strokeWidth: 4 });

    // Crack-stop hole if added
    if (this.hasCrackStopHole) {
      r.circle(crackTipX + 15, 175, 12, { fill: '#0a0f1a' });
      r.circle(crackTipX + 15, 175, 12, { fill: 'none', stroke: '#22c55e', strokeWidth: 2 });
      r.text(crackTipX + 15, 150, 'Stop hole', { fill: '#22c55e', fontSize: 10, textAnchor: 'middle' });
    }

    // Stress field at crack tip
    if (this.twistStress > 10 && !this.hasCrackStopHole && this.crackLength < 150) {
      for (let i = 1; i <= 3; i++) {
        r.circle(crackTipX, 175, i * 8, { fill: 'none', stroke: '#ef4444', strokeWidth: 1 });
      }
    }

    // Complete fracture indicator
    if (this.crackLength >= 150) {
      r.text(200, 100, 'Complete Fracture!', { fill: '#f87171', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    if (this.hasCrackStopHole && this.twistStress > 20) {
      r.text(200, 100, 'Crack Arrested!', { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Info box
    r.roundRect(285, 110, 70, 55, 8, { fill: 'rgba(15, 23, 42, 0.8)' });
    r.text(320, 128, 'Kt at tip', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    const ktValue = this.hasCrackStopHole ? '~2' : '~8+';
    const ktColor = this.hasCrackStopHole ? '#22c55e' : '#ef4444';
    r.text(320, 150, ktValue, { fill: ktColor, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Controls
    r.text(200, 295, this.hasCrackStopHole ? 'Hole blunts crack tip -> lower Kt' : 'Sharp crack tip has extreme Kt', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'toggle_hole', label: this.hasCrackStopHole ? 'Remove Stop Hole' : 'Add Stop Hole', variant: this.hasCrackStopHole ? 'secondary' : 'primary' });

    r.addSlider({
      id: 'twist_stress',
      label: 'Applied Stress (MPa)',
      min: 0,
      max: 50,
      step: 1,
      value: this.twistStress
    });

    r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
    r.addButton({ id: 'continue', label: 'Understand the Solution', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Fighting Cracks with Holes', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(200, 85, 'Counter-intuitive but effective!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Before/after comparison
    r.roundRect(30, 105, 160, 100, 12, { fill: 'rgba(239, 68, 68, 0.15)' });
    r.text(110, 130, 'Sharp Crack Tip', { fill: '#f87171', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 155, 'Kt approaches infinity', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 175, 'Crack grows under any stress', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });

    r.roundRect(210, 105, 160, 100, 12, { fill: 'rgba(16, 185, 129, 0.15)' });
    r.text(290, 130, 'After Stop Hole', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 155, 'Kt drops to ~2-3', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 175, 'Crack arrested!', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });

    // Applications
    r.roundRect(30, 220, 340, 120, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 245, 'Used In Practice:', { fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    const apps = [
      { icon: '🚢', text: 'Ship hull repairs' },
      { icon: '✈️', text: 'Aircraft maintenance' },
      { icon: '🌉', text: 'Bridge crack arrest' }
    ];

    apps.forEach((app, i) => {
      const y = 270 + i * 22;
      r.text(100, y, app.icon, { fontSize: 14, textAnchor: 'middle' });
      r.text(130, y, app.text, { fill: '#cbd5e1', fontSize: 11 });
    });

    // Key insight
    r.roundRect(30, 355, 340, 60, 12, { fill: 'rgba(168, 85, 247, 0.15)' });
    r.text(200, 380, 'Key Insight', { fill: '#a855f7', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 400, 'Convert sharp crack (Kt -> infinity) to round hole (Kt ~ 2-3)', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 50, 'Real-World Applications', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#ef4444';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 75, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 103, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 135, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 165, app.title, { fill: '#ffffff', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 188, app.tagline, { fill: '#f87171', fontSize: 11, textAnchor: 'middle' });

    // Description (multi-line)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 215;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 50) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 16;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Physics connection
    r.roundRect(40, 310, 320, 70, 10, { fill: 'rgba(239, 68, 68, 0.1)' });
    r.text(200, 330, 'Physics Connection', { fill: '#f87171', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 355, app.connection.substring(0, 58) + '...', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 410, 'Completed!', { fill: '#10b981', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 450, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 50, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 75, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Scenario
      r.roundRect(25, 90, 350, 75, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      const scenarioWords = question.scenario.split(' ');
      let scenarioLine = '';
      let scenarioY = 110;
      scenarioWords.forEach(word => {
        if ((scenarioLine + word).length > 55) {
          r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
          scenarioLine = word + ' ';
          scenarioY += 14;
        } else {
          scenarioLine += word + ' ';
        }
      });
      if (scenarioLine) r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

      // Question
      r.text(200, 185, question.question.substring(0, 55), { fill: '#f87171', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 210 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(239, 68, 68, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 45, 8, { fill: bgColor });
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${option.substring(0, 50)}${option.length > 50 ? '...' : ''}`, { fill: isSelected ? '#f87171' : '#e2e8f0', fontSize: 10 });

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
        r.text(200, 430, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 185, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 215, score >= 7 ? "You've mastered fracture mechanics!" : 'Review and try again.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 130, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 305, 'Key Concepts:', { fill: '#f87171', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'Stress concentration factor Kt',
        'Sharp corners vs rounded features',
        'Crack-stop holes',
        'Fillet radii in design'
      ];
      concepts.forEach((concept, i) => {
        r.text(200, 330 + i * 20, concept, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
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
    r.text(200, 110, '🏆', { fontSize: 64, textAnchor: 'middle' });

    // Title
    r.text(200, 180, 'Fracture Mechanics Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 210, 'You understand why sharp corners fail', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 230, 'and how to prevent catastrophic failure!', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '📐', label: 'Stress Concentration Kt' },
      { icon: '🕳️', label: 'Crack-Stop Holes' },
      { icon: '⚙️', label: 'Fillet Radii' },
      { icon: '✈️', label: 'Aircraft Design' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 270 + Math.floor(i / 2) * 70;
      r.roundRect(x, y, 140, 55, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 22, concept.icon, { fontSize: 18, textAnchor: 'middle' });
      r.text(x + 70, y + 44, concept.label, { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 430, 300, 60, 12, { fill: 'rgba(239, 68, 68, 0.15)' });
    r.text(200, 455, 'Key Concept', { fill: '#f87171', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 478, 'Kt = sigma_max / sigma_avg', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering fracture mechanics!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      notchType: this.notchType,
      appliedStress: this.appliedStress,
      isFractured: this.isFractured,
      hasCrackStopHole: this.hasCrackStopHole,
      crackLength: this.crackLength,
      twistStress: this.twistStress,
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
    if (state.notchType !== undefined) this.notchType = state.notchType as 'none' | 'round' | 'vsharp' | 'crack';
    if (state.appliedStress !== undefined) this.appliedStress = state.appliedStress as number;
    if (state.isFractured !== undefined) this.isFractured = state.isFractured as boolean;
    if (state.hasCrackStopHole !== undefined) this.hasCrackStopHole = state.hasCrackStopHole as boolean;
    if (state.crackLength !== undefined) this.crackLength = state.crackLength as number;
    if (state.twistStress !== undefined) this.twistStress = state.twistStress as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createFractureMechanicsGame(sessionId: string): FractureMechanicsGame {
  return new FractureMechanicsGame(sessionId);
}
