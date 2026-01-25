import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// CAPILLARY ACTION GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: h = 2γcosθ/(ρgr) - Jurin's Law
// Surface tension (γ) and adhesion drive liquid up narrow tubes
// Height inversely proportional to radius (narrower = higher)
// Contact angle (θ) determines rise (hydrophilic) or depression (hydrophobic)
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
const WATER_SURFACE_TENSION = 0.073; // N/m
const WATER_DENSITY = 1000; // kg/m³
const GRAVITY = 9.81; // m/s²
const WATER_CONTACT_ANGLE = 0; // degrees (perfectly wetting)
const MERCURY_CONTACT_ANGLE = 140; // degrees (non-wetting)
const MERCURY_SURFACE_TENSION = 0.486; // N/m

export class CapillaryActionGame extends BaseGame {
  readonly gameType = 'capillary_action';
  readonly gameTitle = 'Capillary Action: Defying Gravity';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private tubeRadius = 2; // mm
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
      scenario: "A botanist is studying how a 100-meter tall Coast Redwood tree transports water from its roots to its crown without any mechanical pump.",
      question: "What combination of forces allows water to reach the top of such a tall tree?",
      options: [
        "Root pressure alone pushes water up",
        "Capillary action in narrow xylem vessels combined with transpiration pull",
        "Osmosis between cells creates sufficient pressure",
        "Gravity pulls water down from rain on the leaves"
      ],
      correctIndex: 1,
      explanation: "Trees use capillary action in their narrow xylem vessels (10-200 μm) plus transpiration-driven negative pressure."
    },
    {
      scenario: "A materials scientist is testing paper towels by dipping strips into water and measuring how high the water climbs.",
      question: "Why does water rise higher in paper towels with finer fiber structures?",
      options: [
        "Finer fibers absorb more water chemically",
        "Smaller gaps create narrower capillary channels where h ∝ 1/r",
        "Finer fibers are more hydrophobic, pushing water up",
        "Air pressure is higher in smaller spaces"
      ],
      correctIndex: 1,
      explanation: "Jurin's Law: h = 2γcosθ/(ρgr). Height is inversely proportional to radius."
    },
    {
      scenario: "A microfluidics engineer is designing a lab-on-a-chip device for blood testing that must move samples without pumps.",
      question: "What channel width would maximize capillary-driven flow rate?",
      options: [
        "1 mm - larger channels flow faster",
        "100 μm - balance between height and flow resistance",
        "1 μm - smallest possible for maximum rise",
        "Channel width doesn't affect capillary flow"
      ],
      correctIndex: 1,
      explanation: "Microfluidic devices typically use 10-200 μm channels to balance capillary pressure with practical flow rates."
    },
    {
      scenario: "A chemist observes that when a glass capillary tube is dipped into liquid mercury, the mercury level drops below the surrounding level.",
      question: "What causes mercury to be depressed rather than elevated in glass tubes?",
      options: [
        "Mercury is too heavy for surface tension to lift",
        "Glass absorbs mercury preventing it from rising",
        "Mercury's contact angle with glass is >90°, making cos(θ) negative",
        "Mercury is a metal and metals don't experience capillary action"
      ],
      correctIndex: 2,
      explanation: "Mercury has a contact angle of ~140° with glass. Since cos(140°) ≈ -0.77, the height is negative (depression)."
    },
    {
      scenario: "An athlete chooses between a cotton t-shirt and a polyester wicking shirt for a marathon.",
      question: "How does the wicking fabric move sweat away from skin more effectively?",
      options: [
        "Polyester is waterproof and doesn't absorb any sweat",
        "Engineered fiber structures create capillary channels that transport sweat outward",
        "Cotton is naturally hydrophobic and repels sweat",
        "Polyester is chemically attracted to salt in sweat"
      ],
      correctIndex: 1,
      explanation: "Wicking fabrics use specially engineered hydrophilic fibers with micro-channels for capillary transport."
    },
    {
      scenario: "A paint manufacturer is developing a primer that must penetrate deeply into porous concrete.",
      question: "How does reducing the primer's viscosity affect capillary penetration?",
      options: [
        "Lower viscosity reduces surface tension, decreasing penetration",
        "Viscosity has no effect on capillary rise height",
        "Lower viscosity increases flow speed but not final depth",
        "Higher viscosity always means deeper penetration"
      ],
      correctIndex: 2,
      explanation: "Viscosity affects rate of rise, not final height. The equilibrium h = 2γcosθ/(ρgr) doesn't include viscosity."
    },
    {
      scenario: "A candle maker notices that wax rises up the wick even when the candle isn't lit.",
      question: "What principle allows the wick to continuously draw liquid wax upward?",
      options: [
        "Heat from the flame creates suction that pulls wax up",
        "Capillary action in the fibrous wick structure lifts molten wax",
        "Wax vapor condenses at the top of the wick",
        "The wick acts as a pump powered by the flame"
      ],
      correctIndex: 1,
      explanation: "Candle wicks are braided fibers creating capillary channels that draw molten wax to the flame."
    },
    {
      scenario: "A soil scientist studies water movement in different soil types. Clay has much smaller pores than sandy soil.",
      question: "How does pore size affect water retention in soil?",
      options: [
        "Sandy soil retains more water due to larger pores",
        "Clay's smaller pores create stronger capillary forces, holding water tightly",
        "Pore size only affects drainage speed, not retention",
        "Both soil types retain equal amounts of water"
      ],
      correctIndex: 1,
      explanation: "Clay's tiny pores (<2 μm) create strong capillary forces. Sandy soil's large pores drain quickly."
    },
    {
      scenario: "An astronaut on the ISS notices water behaves differently in microgravity when dipping a tube into water.",
      question: "Why does water fill an entire capillary tube in microgravity?",
      options: [
        "Surface tension is stronger in space",
        "Without gravity opposing, surface tension pulls water until the tube is full",
        "Air pressure is different in spacecraft",
        "Water molecules move faster in microgravity"
      ],
      correctIndex: 1,
      explanation: "On Earth, rise stops when surface tension balances gravity. In microgravity (g≈0), no opposing force exists."
    },
    {
      scenario: "A forensic scientist analyzes a blood spatter pattern on cotton fabric.",
      question: "What determines the final spread pattern of blood on fabric?",
      options: [
        "Only the velocity of blood impact",
        "Capillary wicking through fibers, affected by fabric structure",
        "Blood always spreads in circular patterns on fabric",
        "The color of the fabric determines spread"
      ],
      correctIndex: 1,
      explanation: "Blood spreads via capillary action along fiber pathways. Pattern depends on weave and fiber orientation."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🌳",
      title: "Plant Vascular Systems",
      tagline: "Nature's water delivery reaches 100+ meters",
      description: "Trees use capillary action in narrow xylem vessels, combined with transpiration pull, to transport water and nutrients from roots to leaves.",
      connection: "Xylem vessels are 10-200 μm in diameter. At this scale, capillary forces initiate water rise."
    },
    {
      icon: "📄",
      title: "Absorbent Materials",
      tagline: "Millions of micro-channels working in parallel",
      description: "Paper towels, tissues, diapers, and sponges rely on capillary action to rapidly absorb liquids through tiny channels.",
      connection: "Cellulose fibers are hydrophilic with contact angles near 0°. Spaces between fibers act as capillaries."
    },
    {
      icon: "👕",
      title: "Performance Athletic Fabrics",
      tagline: "Engineered to keep athletes dry",
      description: "Modern athletic wear uses specially designed fiber structures to transport sweat away from skin for evaporation.",
      connection: "Moisture-wicking fabrics have hydrophilic surfaces and channels that pull sweat outward via capillary action."
    },
    {
      icon: "🔬",
      title: "Microfluidic Lab-on-a-Chip",
      tagline: "Capillary-powered diagnostics in your pocket",
      description: "Lab-on-a-chip devices use capillary action to move tiny fluid samples through micro-scale channels without pumps.",
      connection: "At 10-200 μm channels, capillary forces dominate over gravity, enabling pump-free fluid control."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate capillary height using Jurin's Law
  private calculateCapillaryHeight(
    radiusMm: number,
    surfaceTension: number = WATER_SURFACE_TENSION,
    contactAngle: number = WATER_CONTACT_ANGLE
  ): number {
    // h = 2γcosθ/(ρgr)
    // For water at room temperature: h (mm) ≈ 14.9 / r (mm)
    const cosTheta = Math.cos((contactAngle * Math.PI) / 180);
    return ((14.9 * surfaceTension) / WATER_SURFACE_TENSION) * cosTheta / radiusMm;
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
      if (input.id === 'tube_radius') {
        this.tubeRadius = Math.max(0.5, Math.min(5, input.value));
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
        if (buttonId === 'continue') {
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
    this.tubeRadius = 2;
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
    r.circle(300, 600, 150, { fill: 'rgba(20, 184, 166, 0.05)' });

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
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#22d3ee', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Giant Redwood Mystery', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'How does water defy gravity in towering trees?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Tree illustration
    r.text(200, 250, '🌲', { fill: '#22c55e', fontSize: 64, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 300, 320, 160, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 335, 'A Coast Redwood tree can grow over', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 365, '100 meters tall', { fill: '#22d3ee', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 400, 'How does water travel from roots to top', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 420, 'without any mechanical pump?', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 450, 'What invisible force defies gravity?', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Discover the Secret', variant: 'primary' });

    r.setCoachMessage('Explore how capillary action and surface tension work together!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'You dip three glass tubes of', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'different widths into water.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 185, 'What do you predict will happen?', { fill: '#22d3ee', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Water rises highest in the widest tube',
      'Water rises highest in the narrowest tube',
      'Water rises to the same height in all tubes',
      'Water drops below the surface in all tubes'
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
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 500, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Excellent prediction!' : 'The answer: Water rises highest in the narrowest tube!';
      r.text(200, 530, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 560, "This is capillary action - let's see it!", { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Experiment', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 60, 'Capillary Tubes Experiment', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization area
    r.roundRect(20, 90, 360, 320, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Title
    r.text(200, 115, 'Narrower = Higher!', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Water reservoir
    r.rect(50, 330, 300, 60, { fill: 'rgba(3, 105, 161, 0.4)' });
    r.rect(50, 325, 300, 8, { fill: '#0ea5e9' });

    // Tubes with different radii
    const tubes = [
      { radius: 0.5, x: 100 },
      { radius: 1, x: 170 },
      { radius: 2, x: 240 },
      { radius: 4, x: 310 }
    ];

    tubes.forEach(tube => {
      const height = this.calculateCapillaryHeight(tube.radius);
      const displayHeight = Math.min(height * 4, 160);
      const tubeWidth = Math.max(tube.radius * 8, 4);
      const animProgress = Math.min((this.animationTime * 50) % 100, 100);
      const animatedHeight = Math.min(animProgress * 2, displayHeight);

      // Tube outline
      r.rect(tube.x - tubeWidth / 2, 160, 2, 170, { fill: '#94a3b8' });
      r.rect(tube.x + tubeWidth / 2 - 2, 160, 2, 170, { fill: '#94a3b8' });

      // Water column (animated rise)
      r.rect(tube.x - tubeWidth / 2 + 2, 328 - animatedHeight, tubeWidth - 4, animatedHeight, { fill: '#0ea5e9' });

      // Meniscus curve at top (using arc)
      if (animatedHeight > 5) {
        r.arc(tube.x, 328 - animatedHeight, tubeWidth / 2 - 2, Math.PI, 0, { fill: '#0ea5e9' });
      }

      // Labels
      r.text(tube.x, 150, `r=${tube.radius}mm`, { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
      r.text(tube.x, 400, `h=${height.toFixed(1)}mm`, { fill: '#22d3ee', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    });

    // Key insight
    r.roundRect(40, 420, 320, 60, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 445, 'The 0.5mm tube rises 8× higher than the 4mm tube!', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 468, 'Surface tension pulls water up narrow tubes', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Explanation cards
    r.roundRect(40, 495, 150, 70, 10, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.text(115, 520, 'Adhesion', { fill: '#22d3ee', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(115, 540, 'Water sticks to glass', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(115, 555, 'walls, climbing up', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(210, 495, 150, 70, 10, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.text(285, 520, 'Surface Tension', { fill: '#3b82f6', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(285, 540, 'Water molecules pull', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(285, 555, 'each other up', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 60, 'The Science of Capillary Action', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Jurin's Law card
    r.roundRect(30, 90, 340, 160, 16, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 120, "Jurin's Law", { fill: '#22d3ee', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Formula box
    r.roundRect(70, 140, 260, 45, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 170, 'h = 2γcosθ / (ρgr)', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    // Variables
    r.text(80, 210, 'γ = surface tension', { fill: '#cbd5e1', fontSize: 11 });
    r.text(230, 210, 'θ = contact angle', { fill: '#cbd5e1', fontSize: 11 });
    r.text(80, 228, 'ρ = liquid density', { fill: '#cbd5e1', fontSize: 11 });
    r.text(230, 228, 'r = tube radius', { fill: '#cbd5e1', fontSize: 11 });

    // Key insight card
    r.roundRect(30, 260, 340, 100, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 290, 'Key Insight', { fill: '#34d399', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 320, 'h ∝ 1/r', { fill: '#ffffff', fontSize: 18, textAnchor: 'middle' });
    r.text(200, 345, 'Half the radius = Double the height!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Tree application
    r.roundRect(30, 375, 340, 140, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 405, 'Why Trees Need Narrow Tubes', { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 435, 'Tree xylem vessels are incredibly narrow', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 455, '(10-200 micrometers). At this scale,', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 475, 'capillary forces help lift water over', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 495, '100 meters against gravity!', { fill: '#fbbf24', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore a Twist', variant: 'secondary' });

    r.setCoachMessage("Now let's see what happens with a different liquid...");
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist: Mercury', { fill: '#a855f7', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'What if we use mercury instead of water?', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, "Mercury doesn't 'wet' glass like water does...", { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 180, 'What do you predict will happen?', { fill: '#a855f7', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Mercury rises even higher than water',
      'Mercury rises to the same height as water',
      'Mercury rises, but less than water',
      'Mercury drops BELOW the surrounding level!'
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (i === 3) {
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
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 3 ? 'Exactly right!' : 'Mercury drops BELOW the surface!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 530, 'Mercury atoms bond strongly to each other', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 550, 'but barely interact with glass.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Comparison', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Water vs Mercury', { fill: '#a855f7', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    const waterHeight = this.calculateCapillaryHeight(this.tubeRadius);
    const mercuryHeight = this.calculateCapillaryHeight(this.tubeRadius, MERCURY_SURFACE_TENSION, MERCURY_CONTACT_ANGLE);

    // Water side
    r.roundRect(25, 85, 170, 260, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(110, 110, 'Water (θ < 90°)', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Water container
    r.rect(55, 250, 110, 70, { fill: 'rgba(3, 105, 161, 0.3)' });
    r.rect(55, 245, 110, 8, { fill: '#0ea5e9' });

    // Water tube and column
    r.rect(98, 135, 2, 115, { fill: '#94a3b8' });
    r.rect(120, 135, 2, 115, { fill: '#94a3b8' });
    const waterDisplayHeight = Math.min(waterHeight * 3, 100);
    r.rect(100, 248 - waterDisplayHeight, 20, waterDisplayHeight, { fill: '#0ea5e9' });

    r.text(110, 330, 'RISES', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 348, '(adhesion wins)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Mercury side
    r.roundRect(205, 85, 170, 260, 12, { fill: 'rgba(71, 85, 105, 0.2)' });
    r.text(290, 110, 'Mercury (θ > 90°)', { fill: '#94a3b8', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Mercury container
    r.rect(235, 250, 110, 70, { fill: 'rgba(71, 85, 105, 0.3)' });
    r.rect(235, 245, 110, 8, { fill: '#64748b' });

    // Mercury tube and depression
    r.rect(278, 135, 2, 115, { fill: '#94a3b8' });
    r.rect(300, 135, 2, 115, { fill: '#94a3b8' });
    const mercuryDisplayDrop = Math.min(Math.abs(mercuryHeight) * 2, 40);
    r.rect(280, 253, 20, mercuryDisplayDrop, { fill: '#64748b' });

    r.text(290, 330, 'DROPS', { fill: '#f87171', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 348, '(cohesion wins)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Slider for tube radius
    r.addSlider({
      id: 'tube_radius',
      label: 'Tube Radius (mm)',
      min: 0.5,
      max: 5,
      step: 0.5,
      value: this.tubeRadius
    });

    // Results
    r.roundRect(40, 420, 150, 65, 10, { fill: 'rgba(6, 182, 212, 0.1)' });
    r.text(115, 445, 'Water Rise', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(115, 472, `+${waterHeight.toFixed(1)} mm`, { fill: '#22d3ee', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(210, 420, 150, 65, 10, { fill: 'rgba(71, 85, 105, 0.1)' });
    r.text(285, 445, 'Mercury Drop', { fill: '#94a3b8', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(285, 472, `${mercuryHeight.toFixed(1)} mm`, { fill: '#f87171', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Understand the Difference', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Contact Angle: The Key Factor', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Hydrophilic card
    r.roundRect(25, 85, 170, 140, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(110, 110, 'Hydrophilic (θ<90°)', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 140, 'Adhesion stronger', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 158, 'than cohesion', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 195, 'Liquid RISES', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Hydrophobic card
    r.roundRect(205, 85, 170, 140, 12, { fill: 'rgba(71, 85, 105, 0.2)' });
    r.text(290, 110, 'Hydrophobic (θ>90°)', { fill: '#94a3b8', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 140, 'Cohesion stronger', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 158, 'than adhesion', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 195, 'Liquid DROPS', { fill: '#f87171', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // The math
    r.roundRect(25, 240, 350, 150, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 270, 'The Math: cos(θ) Makes the Difference', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Water column
    r.text(110, 305, 'Water: θ = 0°', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 328, 'cos(0°) = +1', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 350, 'Positive height = rise', { fill: '#22d3ee', fontSize: 10, textAnchor: 'middle' });

    // Mercury column
    r.text(290, 305, 'Mercury: θ = 140°', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 328, 'cos(140°) = -0.77', { fill: '#94a3b8', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 350, 'Negative height = drop', { fill: '#f87171', fontSize: 10, textAnchor: 'middle' });

    // Key takeaway
    r.roundRect(40, 410, 320, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 438, 'The sign of cos(θ) determines rise or fall!', { fill: '#ffffff', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 462, 'θ < 90° → rise | θ > 90° → depression', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

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
      r.text(200, 55, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Scenario
      r.roundRect(25, 100, 350, 90, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      const scenarioWords = question.scenario.split(' ');
      let scenarioLine = '';
      let scenarioY = 120;
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
      r.text(200, 210, question.question, { fill: '#22d3ee', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 240 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(6, 182, 212, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${option.substring(0, 45)}${option.length > 45 ? '...' : ''}`, { fill: isSelected ? '#22d3ee' : '#e2e8f0', fontSize: 11 });

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
        r.text(200, 485, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "Excellent! You've mastered capillary action!" : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 160, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        "Jurin's Law: h = 2γcosθ/(ρgr)",
        'Contact angles and wetting behavior',
        'Real-world applications',
        'Effect of tube radius on height'
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
    r.text(200, 120, '🏆', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Capillary Action Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand how liquids defy gravity', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'through surface tension and adhesion!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '📐', label: "Jurin's Law: h ∝ 1/r" },
      { icon: '💧', label: 'Surface Tension' },
      { icon: '📏', label: 'Contact Angles' },
      { icon: '🌳', label: "Nature's Plumbing" }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 295 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 460, 300, 70, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 488, 'Key Formula', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 515, 'h = 2γcosθ / (ρgr)', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering capillary action!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      tubeRadius: this.tubeRadius,
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
    if (state.tubeRadius !== undefined) this.tubeRadius = state.tubeRadius as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createCapillaryActionGame(sessionId: string): CapillaryActionGame {
  return new CapillaryActionGame(sessionId);
}
