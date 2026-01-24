import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// CAPILLARY ACTION GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: h = 2*gamma*cos(theta)/(rho*g*r) - Jurin's Law
// Surface tension (gamma) and adhesion drive liquid up narrow tubes
// Height inversely proportional to radius (narrower = higher)
// Contact angle (theta) determines rise (hydrophilic) or depression (hydrophobic)
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
const WATER_DENSITY = 1000; // kg/m^3
const GRAVITY = 9.81; // m/s^2
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
  private showMercury = false;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
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
      explanation: "Trees use capillary action in their narrow xylem vessels (10-200 um) plus transpiration-driven negative pressure. The cohesion of water molecules creates a continuous column pulled up as water evaporates from leaves."
    },
    {
      scenario: "A materials scientist is testing paper towels by dipping strips into water and measuring how high the water climbs in 30 seconds.",
      question: "Why does water rise higher in paper towels with finer (smaller) fiber structures?",
      options: [
        "Finer fibers absorb more water chemically",
        "Smaller gaps between fibers create narrower capillary channels where h is proportional to 1/r",
        "Finer fibers are more hydrophobic, pushing water up",
        "Air pressure is higher in smaller spaces"
      ],
      correctIndex: 1,
      explanation: "Jurin's Law states h = 2*gamma*cos(theta)/(rho*g*r). Height is inversely proportional to radius. Finer fibers create smaller channels (lower r), resulting in greater capillary rise."
    },
    {
      scenario: "A microfluidics engineer is designing a lab-on-a-chip device for blood testing that must move samples through channels without any pumps.",
      question: "What channel width would maximize capillary-driven flow rate?",
      options: [
        "1 mm - larger channels flow faster",
        "100 um - balance between height and flow resistance",
        "1 um - smallest possible for maximum rise",
        "Channel width doesn't affect capillary flow"
      ],
      correctIndex: 1,
      explanation: "While narrower channels have higher capillary rise, extremely narrow channels have high flow resistance. Microfluidic devices typically use 10-200 um channels to balance capillary pressure with practical flow rates."
    },
    {
      scenario: "A chemist observes that when a glass capillary tube is dipped into liquid mercury, the mercury level inside the tube drops below the surrounding mercury level.",
      question: "What causes mercury to be depressed rather than elevated in glass tubes?",
      options: [
        "Mercury is too heavy for surface tension to lift",
        "Glass absorbs mercury preventing it from rising",
        "Mercury's contact angle with glass is >90 degrees, making cos(theta) negative",
        "Mercury is a metal and metals don't experience capillary action"
      ],
      correctIndex: 2,
      explanation: "Mercury has a contact angle of ~140 degrees with glass (hydrophobic interaction). Since cos(140 degrees) is approximately -0.77, the capillary rise equation gives a negative height, meaning depression rather than elevation."
    },
    {
      scenario: "An athlete chooses between a cotton t-shirt and a polyester wicking shirt for a marathon. The polyester shirt keeps them drier during the race.",
      question: "How does the wicking fabric move sweat away from skin more effectively than cotton?",
      options: [
        "Polyester is waterproof and doesn't absorb any sweat",
        "Engineered fiber structures create capillary channels that transport sweat to the outer surface",
        "Cotton is naturally hydrophobic and repels sweat",
        "Polyester is chemically attracted to salt in sweat"
      ],
      correctIndex: 1,
      explanation: "Wicking fabrics use specially engineered hydrophilic fibers with micro-channels that draw sweat outward via capillary action. Once at the outer surface, sweat evaporates. Cotton absorbs and holds water, staying wet."
    },
    {
      scenario: "A paint manufacturer is developing a new primer that must penetrate deeply into porous concrete. They test different viscosity formulations.",
      question: "How does reducing the primer's viscosity affect its capillary penetration into concrete?",
      options: [
        "Lower viscosity reduces surface tension, decreasing penetration",
        "Viscosity has no effect on capillary rise height",
        "Lower viscosity increases flow speed but doesn't change final penetration depth (determined by surface tension and pore size)",
        "Higher viscosity always means deeper penetration"
      ],
      correctIndex: 2,
      explanation: "Viscosity affects the rate of capillary rise, not the final height. The equilibrium height h = 2*gamma*cos(theta)/(rho*g*r) doesn't include viscosity. Lower viscosity primers penetrate faster but reach the same final depth."
    },
    {
      scenario: "A candle maker notices that wax rises up the wick even when the candle isn't lit. When lit, molten wax continuously feeds the flame.",
      question: "What principle allows the solid wick to continuously draw liquid wax upward to the flame?",
      options: [
        "Heat from the flame creates suction that pulls wax up",
        "Capillary action in the fibrous wick structure lifts molten wax against gravity",
        "Wax vapor condenses at the top of the wick",
        "The wick acts as a pump powered by the flame"
      ],
      correctIndex: 1,
      explanation: "Candle wicks are made of braided cotton fibers creating many tiny capillary channels. These continuously draw molten wax upward to the flame, where it vaporizes and combusts. The same principle makes oil lamps work."
    },
    {
      scenario: "A soil scientist studies water movement in different soil types. Clay soil has much smaller pore spaces than sandy soil.",
      question: "How does pore size affect water movement and retention in soil?",
      options: [
        "Sandy soil retains more water due to larger pores",
        "Clay's smaller pores create stronger capillary forces, holding water more tightly against gravity",
        "Pore size only affects drainage speed, not water retention",
        "Both soil types retain equal amounts of water"
      ],
      correctIndex: 1,
      explanation: "Clay soil's tiny pores (< 2 um) create strong capillary forces that hold water tightly. Sandy soil's large pores (50-2000 um) have weak capillary forces, so water drains quickly. This is why clay soils stay moist longer but may become waterlogged."
    },
    {
      scenario: "An astronaut on the ISS notices that water behaves differently in microgravity. When dipping a tube into water, the water doesn't stop rising at any particular height.",
      question: "Why does water fill an entire capillary tube in microgravity?",
      options: [
        "Surface tension is stronger in space",
        "Without gravity opposing capillary forces, surface tension pulls water until the tube is full",
        "Air pressure is different in spacecraft",
        "Water molecules move faster in microgravity"
      ],
      correctIndex: 1,
      explanation: "On Earth, capillary rise stops when surface tension force balances gravitational weight (h = 2*gamma*cos(theta)/(rho*g*r)). In microgravity, g is approximately 0, so there's no opposing force. Surface tension pulls water to fill any wetting container completely."
    },
    {
      scenario: "A forensic scientist is analyzing a blood spatter pattern on a cotton fabric. The blood has spread outward from the point of impact in an irregular pattern.",
      question: "What determines the final spread pattern of blood on fabric?",
      options: [
        "Only the velocity of blood impact",
        "Capillary wicking through fabric fibers, affected by fiber orientation and fabric structure",
        "Blood always spreads in circular patterns on fabric",
        "The color of the fabric determines spread"
      ],
      correctIndex: 1,
      explanation: "Blood spreads through fabric via capillary action along fiber pathways. The pattern depends on fabric weave, fiber orientation, thread count, and fabric treatments. Forensic analysts use these patterns to determine impact angle and blood source."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "tree",
      title: "Plant Vascular Systems",
      tagline: "Nature's water delivery system reaches 100+ meters",
      description: "Trees and plants use capillary action in narrow xylem vessels, combined with transpiration pull, to transport water and dissolved nutrients from roots to leaves.",
      connection: "Xylem vessels are typically 10-200 micrometers in diameter. At this scale, capillary forces are strong enough to initiate water rise, while transpiration creates additional pulling force."
    },
    {
      icon: "paper",
      title: "Absorbent Materials",
      tagline: "Millions of micro-channels working in parallel",
      description: "Paper towels, tissues, diapers, and sponges all rely on capillary action to rapidly absorb and hold liquids through countless tiny channels.",
      connection: "Cellulose fibers in paper are naturally hydrophilic with contact angles near 0 degrees. The spaces between fibers act as capillary channels."
    },
    {
      icon: "shirt",
      title: "Performance Athletic Fabrics",
      tagline: "Engineered to keep athletes dry and comfortable",
      description: "Modern athletic wear uses specially designed fiber structures to transport sweat away from skin to the outer fabric surface for evaporation.",
      connection: "Moisture-wicking fabrics have hydrophilic inner surfaces and channels that create capillary pathways to pull sweat outward."
    },
    {
      icon: "chip",
      title: "Microfluidic Lab-on-a-Chip",
      tagline: "Capillary-powered diagnostics in your pocket",
      description: "Lab-on-a-chip devices use capillary action to move tiny fluid samples through micro-scale channels for medical diagnostics without pumps.",
      connection: "At the micro-scale (10-200 um channels), capillary forces dominate over gravity, enabling precise fluid control using only surface tension."
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
    // h = 2*gamma*cos(theta)/(rho*g*r)
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

  processInput(input: UserInput, config: SessionConfig): void {
    if (input.type === 'tap') {
      this.handleTap(input.x, input.y);
    } else if (input.type === 'slider') {
      if (input.id === 'tube_radius') {
        this.tubeRadius = Math.max(0.5, Math.min(5, input.value));
      }
    }
  }

  private handleTap(x: number, y: number): void {
    const width = 400;
    const height = 700;

    switch (this.phase) {
      case 'hook':
        // Check for "Discover" button
        if (y > 550 && y < 620) {
          this.phase = 'predict';
        }
        break;

      case 'predict':
        if (!this.showPredictionFeedback) {
          // Check prediction options
          const optionStartY = 280;
          const optionHeight = 60;
          for (let i = 0; i < 4; i++) {
            if (y >= optionStartY + i * optionHeight && y < optionStartY + (i + 1) * optionHeight) {
              this.prediction = i;
              this.showPredictionFeedback = true;
              break;
            }
          }
        } else {
          // Continue button
          if (y > 580 && y < 640) {
            this.phase = 'play';
            this.showPredictionFeedback = false;
          }
        }
        break;

      case 'play':
        // Continue button
        if (y > 620 && y < 680) {
          this.phase = 'review';
        }
        break;

      case 'review':
        // Continue button
        if (y > 620 && y < 680) {
          this.phase = 'twist_predict';
        }
        break;

      case 'twist_predict':
        if (!this.showTwistFeedback) {
          // Check twist prediction options
          const optionStartY = 280;
          const optionHeight = 60;
          for (let i = 0; i < 4; i++) {
            if (y >= optionStartY + i * optionHeight && y < optionStartY + (i + 1) * optionHeight) {
              this.twistPrediction = i;
              this.showTwistFeedback = true;
              break;
            }
          }
        } else {
          // Continue button
          if (y > 580 && y < 640) {
            this.phase = 'twist_play';
            this.showTwistFeedback = false;
          }
        }
        break;

      case 'twist_play':
        // Continue button
        if (y > 620 && y < 680) {
          this.phase = 'twist_review';
        }
        break;

      case 'twist_review':
        // Continue button
        if (y > 620 && y < 680) {
          this.phase = 'transfer';
        }
        break;

      case 'transfer':
        // App tabs
        if (y >= 120 && y < 170) {
          const tabWidth = 90;
          const tabIndex = Math.floor(x / tabWidth);
          if (tabIndex >= 0 && tabIndex < 4) {
            this.activeAppIndex = tabIndex;
          }
        }
        // Mark as understood button
        if (y >= 480 && y < 530) {
          this.completedApps.add(this.activeAppIndex);
        }
        // Continue to test
        if (this.completedApps.size >= 4 && y >= 580 && y < 640) {
          this.phase = 'test';
        }
        break;

      case 'test':
        if (!this.showTestResults) {
          // Answer options or submit button
          // This would require more complex hit detection for scrolled content
          // Simplified: check for submit button
          if (y > 620 && y < 680 && !this.testAnswers.includes(-1)) {
            this.showTestResults = true;
          }
        } else {
          // Continue to mastery or review
          if (y > 620 && y < 680) {
            if (this.calculateScore() >= 7) {
              this.phase = 'mastery';
            } else {
              this.showTestResults = false;
              this.testAnswers = Array(10).fill(-1);
              this.phase = 'review';
            }
          }
        }
        break;

      case 'mastery':
        // Restart button
        if (y > 580 && y < 640) {
          this.phase = 'hook';
          this.resetGame();
        }
        break;
    }
  }

  private resetGame(): void {
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.tubeRadius = 2;
    this.testAnswers = Array(10).fill(-1);
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;
  }

  render(): GameFrame {
    const renderer = new CommandRenderer(400, 700);

    // Background
    renderer.rect(0, 0, 400, 700, '#0a0f1a');

    // Background gradients
    renderer.circle(100, 100, 150, 'rgba(6, 182, 212, 0.05)');
    renderer.circle(300, 600, 150, 'rgba(20, 184, 166, 0.05)');

    // Render phase-specific content
    switch (this.phase) {
      case 'hook':
        this.renderHook(renderer);
        break;
      case 'predict':
        this.renderPredict(renderer);
        break;
      case 'play':
        this.renderPlay(renderer);
        break;
      case 'review':
        this.renderReview(renderer);
        break;
      case 'twist_predict':
        this.renderTwistPredict(renderer);
        break;
      case 'twist_play':
        this.renderTwistPlay(renderer);
        break;
      case 'twist_review':
        this.renderTwistReview(renderer);
        break;
      case 'transfer':
        this.renderTransfer(renderer);
        break;
      case 'test':
        this.renderTest(renderer);
        break;
      case 'mastery':
        this.renderMastery(renderer);
        break;
    }

    // Progress bar
    this.renderProgressBar(renderer);

    return renderer.toFrame(this.animationTime);
  }

  private renderProgressBar(renderer: CommandRenderer): void {
    const phases: GamePhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phases.indexOf(this.phase);

    // Background bar
    renderer.rect(0, 0, 400, 40, 'rgba(15, 23, 42, 0.9)');

    // Phase indicators
    const startX = 120;
    phases.forEach((_, i) => {
      const dotX = startX + i * 18;
      const color = i === currentIndex ? '#22d3ee' : i < currentIndex ? '#10b981' : '#475569';
      renderer.circle(dotX, 20, i === currentIndex ? 6 : 4, color);
    });

    // Phase name
    const phaseNames: Record<GamePhase, string> = {
      hook: 'Hook', predict: 'Predict', play: 'Explore', review: 'Review',
      twist_predict: 'Twist', twist_play: 'Twist Explore', twist_review: 'Twist Review',
      transfer: 'Transfer', test: 'Test', mastery: 'Mastery'
    };
    renderer.text(350, 25, phaseNames[this.phase], '#94a3b8', 12);
    renderer.text(50, 25, 'Capillary Action', '#22d3ee', 12);
  }

  private renderHook(renderer: CommandRenderer): void {
    // Badge
    renderer.roundRect(130, 60, 140, 30, 8, 'rgba(6, 182, 212, 0.1)');
    renderer.text(200, 80, 'PHYSICS EXPLORATION', '#22d3ee', 10, 'center');

    // Title
    renderer.text(200, 130, 'The Giant Redwood Mystery', '#ffffff', 28, 'center', 'bold');
    renderer.text(200, 160, 'How does water defy gravity in towering trees?', '#94a3b8', 14, 'center');

    // Tree illustration
    renderer.text(200, 240, '[TREE ICON]', '#22c55e', 48, 'center');

    // Fact card
    renderer.roundRect(40, 290, 320, 150, 16, 'rgba(30, 41, 59, 0.8)');
    renderer.text(200, 320, 'A Coast Redwood tree can grow over', '#cbd5e1', 14, 'center');
    renderer.text(200, 345, '100 meters tall', '#22d3ee', 20, 'center', 'bold');
    renderer.text(200, 380, 'How does water travel from roots to top', '#94a3b8', 13, 'center');
    renderer.text(200, 400, 'without any mechanical pump?', '#94a3b8', 13, 'center');
    renderer.text(200, 430, 'What invisible force defies gravity?', '#fbbf24', 14, 'center', 'bold');

    // CTA button
    renderer.roundRect(100, 550, 200, 50, 25, '#0891b2');
    renderer.text(200, 580, 'Discover the Secret', '#ffffff', 16, 'center', 'bold');
    renderer.text(200, 620, 'Explore capillary action and surface tension', '#64748b', 11, 'center');
  }

  private renderPredict(renderer: CommandRenderer): void {
    renderer.text(200, 80, 'Make Your Prediction', '#ffffff', 24, 'center', 'bold');

    // Scenario
    renderer.roundRect(30, 110, 340, 100, 12, 'rgba(30, 41, 59, 0.5)');
    renderer.text(200, 140, 'You dip three glass tubes of', '#cbd5e1', 14, 'center');
    renderer.text(200, 165, 'different widths into water.', '#cbd5e1', 14, 'center');
    renderer.text(200, 195, 'What do you predict will happen?', '#22d3ee', 15, 'center', 'bold');

    // Options
    const options = [
      'A. Water rises highest in the widest tube',
      'B. Water rises highest in the narrowest tube',
      'C. Water rises to the same height in all tubes',
      'D. Water drops below the surface in all tubes'
    ];

    options.forEach((option, i) => {
      const y = 240 + i * 65;
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

      renderer.roundRect(30, y, 340, 55, 10, bgColor);
      renderer.text(200, y + 32, option, textColor, 13, 'center');
    });

    if (this.showPredictionFeedback) {
      renderer.roundRect(30, 510, 340, 80, 12, 'rgba(30, 41, 59, 0.7)');
      const message = this.prediction === 1 ? 'Excellent prediction!' : 'The answer: Water rises highest in the narrowest tube!';
      renderer.text(200, 540, message, '#34d399', 14, 'center', 'bold');
      renderer.text(200, 565, 'This is capillary action - let\'s see it!', '#94a3b8', 12, 'center');

      renderer.roundRect(120, 595, 160, 40, 20, '#0891b2');
      renderer.text(200, 620, 'See Experiment', '#ffffff', 14, 'center', 'bold');
    }
  }

  private renderPlay(renderer: CommandRenderer): void {
    renderer.text(200, 70, 'Capillary Tubes Experiment', '#ffffff', 22, 'center', 'bold');

    // Visualization area
    renderer.roundRect(30, 100, 340, 280, 16, 'rgba(30, 41, 59, 0.5)');

    // Title
    renderer.text(200, 125, 'Narrower = Higher!', '#22d3ee', 14, 'center', 'bold');

    // Water reservoir
    renderer.rect(50, 300, 300, 60, 'rgba(3, 105, 161, 0.4)');
    renderer.rect(50, 295, 300, 8, '#0ea5e9');

    // Tubes with different radii
    const tubes = [
      { radius: 0.5, x: 100 },
      { radius: 1, x: 170 },
      { radius: 2, x: 240 },
      { radius: 4, x: 310 }
    ];

    tubes.forEach(tube => {
      const height = this.calculateCapillaryHeight(tube.radius);
      const displayHeight = Math.min(height * 4, 150);
      const tubeWidth = tube.radius * 8;
      const animProgress = Math.min((this.animationTime * 50) % 100, 100);
      const animatedHeight = Math.min(animProgress * 2, displayHeight);

      // Tube outline
      renderer.rect(tube.x - tubeWidth / 2, 150, tubeWidth, 155, 'transparent');
      renderer.roundRect(tube.x - tubeWidth / 2, 150, tubeWidth, 155, 2, 'transparent');
      renderer.rect(tube.x - tubeWidth / 2, 150, 2, 155, '#94a3b8');
      renderer.rect(tube.x + tubeWidth / 2 - 2, 150, 2, 155, '#94a3b8');

      // Water column
      renderer.rect(tube.x - tubeWidth / 2 + 2, 303 - animatedHeight, tubeWidth - 4, animatedHeight, '#0ea5e9');

      // Labels
      renderer.text(tube.x, 145, `r=${tube.radius}mm`, '#94a3b8', 9, 'center');
      renderer.text(tube.x, 375, `h=${height.toFixed(1)}mm`, '#22d3ee', 10, 'center', 'bold');
    });

    // Key insight
    renderer.roundRect(40, 400, 320, 60, 12, 'rgba(8, 145, 178, 0.2)');
    renderer.text(200, 425, 'The 0.5mm tube rises ~8x higher than the 4mm tube!', '#22d3ee', 12, 'center', 'bold');
    renderer.text(200, 448, 'Surface tension pulls water up narrow tubes', '#94a3b8', 11, 'center');

    // Explanation cards
    renderer.roundRect(40, 480, 150, 70, 10, 'rgba(51, 65, 85, 0.5)');
    renderer.text(115, 505, 'Adhesion', '#22d3ee', 13, 'center', 'bold');
    renderer.text(115, 525, 'Water sticks to glass', '#cbd5e1', 10, 'center');
    renderer.text(115, 540, 'walls, climbing up', '#cbd5e1', 10, 'center');

    renderer.roundRect(210, 480, 150, 70, 10, 'rgba(51, 65, 85, 0.5)');
    renderer.text(285, 505, 'Surface Tension', '#3b82f6', 13, 'center', 'bold');
    renderer.text(285, 525, 'Water molecules pull', '#cbd5e1', 10, 'center');
    renderer.text(285, 540, 'each other up', '#cbd5e1', 10, 'center');

    // Continue button
    renderer.roundRect(100, 570, 200, 45, 22, '#0891b2');
    renderer.text(200, 598, 'Understand Physics', '#ffffff', 14, 'center', 'bold');
  }

  private renderReview(renderer: CommandRenderer): void {
    renderer.text(200, 70, 'The Science of Capillary Action', '#ffffff', 20, 'center', 'bold');

    // Jurin's Law card
    renderer.roundRect(30, 100, 340, 150, 16, 'rgba(8, 145, 178, 0.2)');
    renderer.text(200, 130, 'Jurin\'s Law', '#22d3ee', 18, 'center', 'bold');
    renderer.roundRect(80, 145, 240, 40, 8, 'rgba(15, 23, 42, 0.5)');
    renderer.text(200, 172, 'h = 2*gamma*cos(theta)/(rho*g*r)', '#ffffff', 14, 'center');

    // Variables
    renderer.text(100, 210, 'gamma = surface tension', '#cbd5e1', 11, 'left');
    renderer.text(250, 210, 'theta = contact angle', '#cbd5e1', 11, 'left');
    renderer.text(100, 228, 'rho = liquid density', '#cbd5e1', 11, 'left');
    renderer.text(250, 228, 'r = tube radius', '#cbd5e1', 11, 'left');

    // Key insight card
    renderer.roundRect(30, 260, 340, 100, 16, 'rgba(16, 185, 129, 0.2)');
    renderer.text(200, 290, 'Key Insight', '#34d399', 18, 'center', 'bold');
    renderer.text(200, 320, 'h is proportional to 1/r', '#ffffff', 16, 'center');
    renderer.text(200, 345, 'Half the radius = Double the height!', '#34d399', 14, 'center', 'bold');

    // Tree application
    renderer.roundRect(30, 380, 340, 130, 16, 'rgba(251, 191, 36, 0.2)');
    renderer.text(200, 410, 'Why Trees Need Narrow Tubes', '#fbbf24', 16, 'center', 'bold');
    renderer.text(200, 440, 'Tree xylem vessels are incredibly narrow', '#cbd5e1', 12, 'center');
    renderer.text(200, 460, '(10-200 micrometers). At this scale,', '#cbd5e1', 12, 'center');
    renderer.text(200, 480, 'capillary forces help lift water over', '#cbd5e1', 12, 'center');
    renderer.text(200, 500, '100 meters against gravity!', '#fbbf24', 13, 'center', 'bold');

    // Continue button
    renderer.roundRect(100, 530, 200, 45, 22, 'linear-gradient(to right, #9333ea, #ec4899)');
    renderer.roundRect(100, 530, 200, 45, 22, '#9333ea');
    renderer.text(200, 558, 'Explore a Twist', '#ffffff', 14, 'center', 'bold');
  }

  private renderTwistPredict(renderer: CommandRenderer): void {
    renderer.text(200, 70, 'The Twist: Mercury', '#a855f7', 24, 'center', 'bold');

    // Scenario
    renderer.roundRect(30, 100, 340, 100, 12, 'rgba(30, 41, 59, 0.5)');
    renderer.text(200, 130, 'What if we use mercury instead of water?', '#cbd5e1', 14, 'center');
    renderer.text(200, 155, 'Mercury doesn\'t "wet" glass like water does...', '#94a3b8', 13, 'center');
    renderer.text(200, 185, 'What do you predict will happen?', '#a855f7', 15, 'center', 'bold');

    // Options
    const options = [
      'A. Mercury rises even higher than water',
      'B. Mercury rises to the same height as water',
      'C. Mercury rises, but less than water',
      'D. Mercury drops BELOW the surrounding level!'
    ];

    options.forEach((option, i) => {
      const y = 220 + i * 60;
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

      renderer.roundRect(30, y, 340, 50, 10, bgColor);
      renderer.text(200, y + 30, option, textColor, 12, 'center');
    });

    if (this.showTwistFeedback) {
      renderer.roundRect(30, 480, 340, 90, 12, 'rgba(30, 41, 59, 0.7)');
      const message = this.twistPrediction === 3 ? 'Exactly right!' : 'Mercury drops BELOW the surface!';
      renderer.text(200, 510, message, '#34d399', 14, 'center', 'bold');
      renderer.text(200, 535, 'Mercury atoms bond strongly to each other', '#94a3b8', 12, 'center');
      renderer.text(200, 555, 'but barely interact with glass.', '#94a3b8', 12, 'center');

      renderer.roundRect(120, 580, 160, 40, 20, '#9333ea');
      renderer.text(200, 605, 'See Comparison', '#ffffff', 14, 'center', 'bold');
    }
  }

  private renderTwistPlay(renderer: CommandRenderer): void {
    renderer.text(200, 70, 'Water vs Mercury', '#a855f7', 22, 'center', 'bold');

    const waterHeight = this.calculateCapillaryHeight(this.tubeRadius);
    const mercuryHeight = this.calculateCapillaryHeight(this.tubeRadius, MERCURY_SURFACE_TENSION, MERCURY_CONTACT_ANGLE);

    // Water side
    renderer.roundRect(30, 100, 165, 250, 12, 'rgba(8, 145, 178, 0.2)');
    renderer.text(112, 125, 'Water (theta < 90)', '#22d3ee', 12, 'center', 'bold');

    // Water container
    renderer.rect(60, 250, 100, 60, 'rgba(3, 105, 161, 0.3)');
    renderer.rect(60, 245, 100, 8, '#0ea5e9');

    // Water tube and column
    renderer.rect(100, 150, 20, 105, 'transparent');
    renderer.rect(100, 150, 2, 105, '#94a3b8');
    renderer.rect(118, 150, 2, 105, '#94a3b8');
    const waterDisplayHeight = Math.min(waterHeight * 3, 90);
    renderer.rect(102, 253 - waterDisplayHeight, 16, waterDisplayHeight, '#0ea5e9');

    renderer.text(112, 320, 'RISES', '#22d3ee', 12, 'center', 'bold');
    renderer.text(112, 338, '(adhesion wins)', '#94a3b8', 10, 'center');

    // Mercury side
    renderer.roundRect(205, 100, 165, 250, 12, 'rgba(71, 85, 105, 0.2)');
    renderer.text(287, 125, 'Mercury (theta > 90)', '#94a3b8', 12, 'center', 'bold');

    // Mercury container
    renderer.rect(235, 250, 100, 60, 'rgba(71, 85, 105, 0.3)');
    renderer.rect(235, 245, 100, 8, '#64748b');

    // Mercury tube and depression
    renderer.rect(275, 150, 20, 105, 'transparent');
    renderer.rect(275, 150, 2, 105, '#94a3b8');
    renderer.rect(293, 150, 2, 105, '#94a3b8');
    const mercuryDisplayDrop = Math.min(Math.abs(mercuryHeight) * 2, 35);
    renderer.rect(277, 253, 16, mercuryDisplayDrop, '#64748b');

    renderer.text(287, 320, 'DROPS', '#f87171', 12, 'center', 'bold');
    renderer.text(287, 338, '(cohesion wins)', '#94a3b8', 10, 'center');

    // Slider
    renderer.text(200, 380, `Tube Radius: ${this.tubeRadius} mm`, '#cbd5e1', 13, 'center');
    renderer.roundRect(80, 395, 240, 8, 4, '#334155');
    const sliderPos = 80 + ((this.tubeRadius - 0.5) / 4.5) * 240;
    renderer.circle(sliderPos, 399, 10, '#a855f7');

    // Results
    renderer.roundRect(50, 430, 140, 60, 10, 'rgba(6, 182, 212, 0.1)');
    renderer.text(120, 455, 'Water Rise', '#22d3ee', 12, 'center', 'bold');
    renderer.text(120, 478, `+${waterHeight.toFixed(1)} mm`, '#22d3ee', 16, 'center', 'bold');

    renderer.roundRect(210, 430, 140, 60, 10, 'rgba(71, 85, 105, 0.1)');
    renderer.text(280, 455, 'Mercury Drop', '#94a3b8', 12, 'center', 'bold');
    renderer.text(280, 478, `${mercuryHeight.toFixed(1)} mm`, '#94a3b8', 16, 'center', 'bold');

    // Continue button
    renderer.roundRect(100, 510, 200, 45, 22, '#9333ea');
    renderer.text(200, 538, 'Understand Difference', '#ffffff', 14, 'center', 'bold');
  }

  private renderTwistReview(renderer: CommandRenderer): void {
    renderer.text(200, 70, 'Contact Angle: The Key Factor', '#a855f7', 18, 'center', 'bold');

    // Hydrophilic card
    renderer.roundRect(30, 100, 165, 130, 12, 'rgba(8, 145, 178, 0.2)');
    renderer.text(112, 125, 'Hydrophilic (theta<90)', '#22d3ee', 11, 'center', 'bold');
    renderer.text(112, 150, 'Adhesion stronger', '#cbd5e1', 10, 'center');
    renderer.text(112, 168, 'than cohesion', '#cbd5e1', 10, 'center');
    renderer.text(112, 200, 'Liquid RISES', '#22d3ee', 13, 'center', 'bold');

    // Hydrophobic card
    renderer.roundRect(205, 100, 165, 130, 12, 'rgba(71, 85, 105, 0.2)');
    renderer.text(287, 125, 'Hydrophobic (theta>90)', '#94a3b8', 11, 'center', 'bold');
    renderer.text(287, 150, 'Cohesion stronger', '#cbd5e1', 10, 'center');
    renderer.text(287, 168, 'than adhesion', '#cbd5e1', 10, 'center');
    renderer.text(287, 200, 'Liquid DROPS', '#f87171', 13, 'center', 'bold');

    // The math
    renderer.roundRect(30, 250, 340, 140, 16, 'rgba(251, 191, 36, 0.2)');
    renderer.text(200, 280, 'The Math: cos(theta) Makes the Difference', '#fbbf24', 14, 'center', 'bold');

    // Water column
    renderer.text(120, 315, 'Water: theta = 0', '#94a3b8', 11, 'center');
    renderer.text(120, 335, 'cos(0) = +1', '#22d3ee', 13, 'center');
    renderer.text(120, 355, 'Positive height = rise', '#22d3ee', 10, 'center');

    // Mercury column
    renderer.text(280, 315, 'Mercury: theta = 140', '#94a3b8', 11, 'center');
    renderer.text(280, 335, 'cos(140) = -0.77', '#94a3b8', 13, 'center');
    renderer.text(280, 355, 'Negative height = drop', '#f87171', 10, 'center');

    // Continue button
    renderer.roundRect(100, 420, 200, 45, 22, '#0891b2');
    renderer.text(200, 448, 'Real-World Applications', '#ffffff', 14, 'center', 'bold');
  }

  private renderTransfer(renderer: CommandRenderer): void {
    renderer.text(200, 70, 'Real-World Applications', '#ffffff', 20, 'center', 'bold');

    // App tabs
    const tabIcons = ['[Tree]', '[Paper]', '[Shirt]', '[Chip]'];
    this.transferApps.forEach((app, i) => {
      const x = 50 + i * 85;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#0891b2';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      renderer.roundRect(x, 100, 75, 40, 8, bgColor);
      renderer.text(x + 37, 125, tabIcons[i], isActive ? '#ffffff' : '#94a3b8', 11, 'center');
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    renderer.roundRect(30, 160, 340, 280, 16, 'rgba(30, 41, 59, 0.5)');

    renderer.text(200, 190, app.title, '#ffffff', 16, 'center', 'bold');
    renderer.text(200, 215, app.tagline, '#22d3ee', 11, 'center');

    // Description (wrapped)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 245;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 45) {
        renderer.text(200, lineY, line.trim(), '#cbd5e1', 11, 'center');
        line = word + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    });
    if (line) renderer.text(200, lineY, line.trim(), '#cbd5e1', 11, 'center');

    // Physics connection
    renderer.roundRect(45, 340, 310, 60, 10, 'rgba(8, 145, 178, 0.2)');
    renderer.text(200, 360, 'Physics Connection', '#22d3ee', 12, 'center', 'bold');
    renderer.text(200, 382, app.connection.substring(0, 50) + '...', '#cbd5e1', 10, 'center');

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      renderer.roundRect(100, 420, 200, 40, 20, '#10b981');
      renderer.text(200, 445, 'Mark as Understood', '#ffffff', 13, 'center', 'bold');
    } else {
      renderer.text(200, 445, 'Completed!', '#10b981', 14, 'center', 'bold');
    }

    // Progress
    renderer.text(200, 500, `Progress: ${this.completedApps.size}/4`, '#94a3b8', 12, 'center');

    // Continue button
    if (this.completedApps.size >= 4) {
      renderer.roundRect(100, 530, 200, 45, 22, '#0891b2');
      renderer.text(200, 558, 'Take Knowledge Test', '#ffffff', 14, 'center', 'bold');
    }
  }

  private renderTest(renderer: CommandRenderer): void {
    renderer.text(200, 70, 'Knowledge Assessment', '#ffffff', 20, 'center', 'bold');

    if (!this.showTestResults) {
      // Show question count
      const answered = this.testAnswers.filter(a => a !== -1).length;
      renderer.text(200, 100, `Questions answered: ${answered}/10`, '#94a3b8', 12, 'center');

      // Instructions
      renderer.roundRect(30, 120, 340, 80, 12, 'rgba(30, 41, 59, 0.5)');
      renderer.text(200, 150, 'Answer all 10 scenario-based questions', '#cbd5e1', 13, 'center');
      renderer.text(200, 175, 'to test your understanding of capillary action.', '#94a3b8', 11, 'center');

      // Submit button
      const canSubmit = !this.testAnswers.includes(-1);
      renderer.roundRect(100, 550, 200, 50, 25, canSubmit ? '#0891b2' : '#475569');
      renderer.text(200, 580, 'Submit Answers', canSubmit ? '#ffffff' : '#94a3b8', 15, 'center', 'bold');
    } else {
      const score = this.calculateScore();

      // Score display
      renderer.roundRect(80, 100, 240, 150, 20, 'rgba(30, 41, 59, 0.8)');
      renderer.text(200, 140, score >= 7 ? '[Trophy]' : '[Book]', score >= 7 ? '#fbbf24' : '#60a5fa', 48, 'center');
      renderer.text(200, 200, `Score: ${score}/10`, '#ffffff', 24, 'center', 'bold');
      renderer.text(200, 230, score >= 7 ? 'Excellent! You\'ve mastered capillary action!' : 'Keep studying! Review and try again.', '#94a3b8', 11, 'center');

      // Result summary
      renderer.roundRect(30, 270, 340, 200, 12, 'rgba(30, 41, 59, 0.5)');
      renderer.text(200, 300, 'Key Concepts Tested:', '#22d3ee', 14, 'center', 'bold');

      const concepts = [
        'Jurin\'s Law: h = 2*gamma*cos(theta)/(rho*g*r)',
        'Contact angles and wetting behavior',
        'Real-world applications',
        'Effect of tube radius on height'
      ];
      concepts.forEach((concept, i) => {
        renderer.text(200, 330 + i * 25, concept, '#cbd5e1', 11, 'center');
      });

      // Continue button
      if (score >= 7) {
        renderer.roundRect(100, 500, 200, 50, 25, '#10b981');
        renderer.text(200, 530, 'Claim Mastery Badge', '#ffffff', 14, 'center', 'bold');
      } else {
        renderer.roundRect(100, 500, 200, 50, 25, '#0891b2');
        renderer.text(200, 530, 'Review & Try Again', '#ffffff', 14, 'center', 'bold');
      }
    }
  }

  private renderMastery(renderer: CommandRenderer): void {
    // Trophy
    renderer.text(200, 120, '[Trophy]', '#fbbf24', 72, 'center');

    // Title
    renderer.text(200, 200, 'Capillary Action Master!', '#ffffff', 24, 'center', 'bold');
    renderer.text(200, 235, 'You understand how liquids defy gravity', '#cbd5e1', 14, 'center');
    renderer.text(200, 258, 'through surface tension and adhesion!', '#cbd5e1', 14, 'center');

    // Concept badges
    const concepts = [
      { icon: '[Formula]', label: 'Jurin\'s Law: h ~ 1/r' },
      { icon: '[Drop]', label: 'Surface Tension' },
      { icon: '[Angle]', label: 'Contact Angles' },
      { icon: '[Tree]', label: 'Nature\'s Plumbing' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 150;
      const y = 300 + Math.floor(i / 2) * 70;
      renderer.roundRect(x, y, 140, 55, 10, 'rgba(30, 41, 59, 0.5)');
      renderer.text(x + 70, y + 25, concept.icon, '#22d3ee', 18, 'center');
      renderer.text(x + 70, y + 45, concept.label, '#cbd5e1', 10, 'center');
    });

    // Key formula
    renderer.roundRect(60, 460, 280, 70, 12, 'rgba(30, 41, 59, 0.3)');
    renderer.text(200, 485, 'Key Formula', '#22d3ee', 14, 'center', 'bold');
    renderer.text(200, 510, 'h = 2*gamma*cos(theta)/(rho*g*r)', '#ffffff', 14, 'center');

    // Restart button
    renderer.roundRect(120, 560, 160, 45, 22, '#475569');
    renderer.text(200, 588, 'Explore Again', '#ffffff', 14, 'center', 'bold');
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
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createCapillaryActionGame(sessionId: string): CapillaryActionGame {
  return new CapillaryActionGame(sessionId);
}
