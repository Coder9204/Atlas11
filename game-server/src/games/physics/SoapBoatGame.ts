import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// SOAP BOAT GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Surface tension propulsion via Marangoni effect
// Water surface tension: gamma = 0.072 N/m
// Soap reduces surface tension to ~0.025 N/m
// Force = delta_gamma * boat_width (tension difference creates net force)
// Marangoni effect: Flow from low to high surface tension regions
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
const SURFACE_TENSIONS = {
  water: 0.072, // N/m
  soapyWater: 0.025,
  oil: 0.032
};

export class SoapBoatGame extends BaseGame {
  readonly gameType = 'soap_boat';
  readonly gameTitle = 'Soap Boat: Surface Tension Propulsion';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private boatPosition = 50;
  private boatVelocity = 0;
  private soapAdded = false;
  private soapSpread = 0;
  private waterContaminated = false;
  private animationTime = 0;

  // Twist simulation
  private liquidType: 'water' | 'soapyWater' | 'oil' = 'water';
  private twistBoatPosition = 50;
  private twistSoapAdded = false;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "A physics teacher asks students to define surface tension in their own words.",
      question: "What is surface tension?",
      options: [
        "Pressure inside a liquid",
        "Cohesive forces at the liquid surface",
        "Temperature of the surface layer",
        "Density variation at the surface"
      ],
      correctIndex: 1,
      explanation: "Surface tension results from cohesive forces between liquid molecules at the surface, where molecules lack neighbors above and are pulled inward/sideways."
    },
    {
      scenario: "A student observes a paper boat accelerate forward when soap is added behind it.",
      question: "Why does a soap boat move forward when soap is added behind it?",
      options: [
        "Soap pushes the boat physically",
        "Chemical reaction propels it",
        "Surface tension imbalance creates net force",
        "Soap is lighter than water"
      ],
      correctIndex: 2,
      explanation: "Soap reduces surface tension behind the boat. The higher surface tension at the front pulls the boat forward while the weakened tension behind provides less opposing pull."
    },
    {
      scenario: "A child tries the soap boat experiment again in the same water dish.",
      question: "What happens if you try the soap boat experiment a second time in the same water?",
      options: [
        "It works faster than before",
        "It doesn't work well - water is contaminated",
        "The boat sinks to the bottom",
        "It works exactly the same"
      ],
      correctIndex: 1,
      explanation: "The first soap release contaminates the entire water surface with surfactant, equalizing surface tension everywhere. No imbalance means no propulsion."
    },
    {
      scenario: "A researcher explains the physics behind wine climbing up a glass.",
      question: "What is the Marangoni effect?",
      options: [
        "Soap dissolving in water",
        "Flow caused by surface tension gradients",
        "Evaporation from liquid surfaces",
        "Density-driven convection"
      ],
      correctIndex: 1,
      explanation: "The Marangoni effect describes fluid flow from regions of low surface tension to high surface tension. This drives the soap boat and many other phenomena."
    },
    {
      scenario: "A student looks up the surface tension value of water at room temperature.",
      question: "What is the approximate surface tension of water at room temperature?",
      options: [
        "0.0072 N/m",
        "0.072 N/m",
        "0.72 N/m",
        "7.2 N/m"
      ],
      correctIndex: 1,
      explanation: "Water has a surface tension of about 0.072 N/m (72 mN/m) at room temperature, which is relatively high compared to most liquids."
    },
    {
      scenario: "A chemist explains how surfactants work at the molecular level.",
      question: "How do surfactants (soaps) reduce surface tension?",
      options: [
        "By increasing water temperature",
        "By breaking hydrogen bonds between water molecules",
        "By making water denser",
        "By adding pressure to the surface"
      ],
      correctIndex: 1,
      explanation: "Surfactant molecules have a water-loving head and water-fearing tail. They insert between water molecules at the surface, disrupting the hydrogen bonds that create surface tension."
    },
    {
      scenario: "A student wonders why dish soap works but cooking oil doesn't propel the boat.",
      question: "Why does the soap boat work better with dish soap than with oil?",
      options: [
        "Dish soap is heavier than oil",
        "Dish soap is a surfactant that drastically lowers water's surface tension",
        "Oil floats on water",
        "Dish soap creates more bubbles"
      ],
      correctIndex: 1,
      explanation: "Dish soap is specifically designed to be a powerful surfactant, reducing water's surface tension from ~0.072 to ~0.025 N/m. Oil doesn't have this property."
    },
    {
      scenario: "A scientist considers whether the soap boat would work on mercury.",
      question: "What would happen if you tried the soap boat on mercury instead of water?",
      options: [
        "Work the same way",
        "Work much better due to mercury's high surface tension",
        "Not work well - soap doesn't reduce mercury's surface tension",
        "The boat would sink immediately"
      ],
      correctIndex: 2,
      explanation: "Mercury's surface tension (~0.48 N/m) comes from metallic bonding, not hydrogen bonds. Soap molecules can't disrupt these bonds, so the experiment wouldn't work."
    },
    {
      scenario: "A wine enthusiast notices 'tears' forming and running down the inside of their wine glass.",
      question: "In the 'tears of wine' phenomenon, what causes the wine to climb the glass?",
      options: [
        "Wine evaporates from the glass edge",
        "Alcohol evaporation creates surface tension gradients (Marangoni effect)",
        "Glass absorbs wine",
        "Wine is attracted to glass by static electricity"
      ],
      correctIndex: 1,
      explanation: "Alcohol evaporates faster at the thin film edge, leaving water-rich regions with higher surface tension. The Marangoni effect pulls wine upward toward these regions."
    },
    {
      scenario: "A child blows soap bubbles and wonders why they're always round.",
      question: "What shape does a soap film naturally form and why?",
      options: [
        "Flat, due to gravity pulling down",
        "Spherical, because surface tension minimizes surface area",
        "Cubic, due to molecular structure",
        "Random irregular shapes"
      ],
      correctIndex: 1,
      explanation: "Surface tension acts to minimize surface area. For a given volume, a sphere has the minimum surface area, which is why free soap bubbles are spherical."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🦟",
      title: "Insect Locomotion",
      tagline: "Water striders walking on water",
      description: "Water striders can walk because their legs are coated with hydrophobic hairs. They use asymmetric leg movements to create surface tension gradients for propulsion.",
      connection: "Like the soap boat, water striders manipulate surface tension to move - they create gradients with their leg movements rather than soap."
    },
    {
      icon: "🫁",
      title: "Lung Surfactant",
      tagline: "Breathing made possible",
      description: "Pulmonary surfactant reduces surface tension in lung alveoli, preventing collapse. Premature babies lacking this surfactant develop respiratory distress syndrome.",
      connection: "Without surfactant, the high surface tension would collapse tiny air sacs. Surfactant lowers tension, allowing lungs to expand easily."
    },
    {
      icon: "🍷",
      title: "Tears of Wine",
      tagline: "Wine climbing the glass",
      description: "Alcohol evaporating from wine creates surface tension gradients (Marangoni flow). Higher surface tension at the top pulls wine upward, forming 'tears' that roll back down.",
      connection: "Pure Marangoni effect! Alcohol evaporation creates low-tension regions, and wine flows toward higher-tension water-rich areas."
    },
    {
      icon: "🌿",
      title: "Self-Cleaning Surfaces",
      tagline: "Lotus leaf effect applications",
      description: "Superhydrophobic surfaces manipulate surface tension to make water bead up and roll off, carrying dirt away. Used in self-cleaning glass and fabrics.",
      connection: "These surfaces maximize surface tension effects, causing water to minimize contact area and roll off with any contaminants."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate force from surface tension difference
  private calculatePropulsionForce(frontTension: number, backTension: number, boatWidth: number): number {
    // F = (gamma_front - gamma_back) * width
    return (frontTension - backTension) * boatWidth;
  }

  // PROTECTED: Calculate surface tension after soap addition
  private getTensionAfterSoap(liquid: string, soapSpreadPercent: number): number {
    const baseTension = SURFACE_TENSIONS[liquid as keyof typeof SURFACE_TENSIONS] || SURFACE_TENSIONS.water;
    if (liquid === 'soapyWater') return baseTension; // Already low
    if (liquid === 'oil') return baseTension * 0.95; // Minimal effect

    // Water: soap reduces tension based on spread
    const reduction = (baseTension - SURFACE_TENSIONS.soapyWater) * (soapSpreadPercent / 100);
    return baseTension - reduction;
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
        if (buttonId === 'discover') {
          this.phase = 'predict';
        }
        break;

      case 'predict':
        if (!this.showPredictionFeedback) {
          if (buttonId.startsWith('predict_')) {
            this.prediction = buttonId.replace('predict_', '');
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
        }
        break;

      case 'play':
        if (buttonId === 'add_soap' && !this.soapAdded && !this.waterContaminated) {
          this.soapAdded = true;
        } else if (buttonId === 'reset_water') {
          this.resetSimulation();
        } else if (buttonId === 'continue' && this.waterContaminated) {
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
          if (buttonId.startsWith('twist_')) {
            this.twistPrediction = buttonId.replace('twist_', '');
            this.showTwistFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'twist_play';
          this.showTwistFeedback = false;
        }
        break;

      case 'twist_play':
        if (buttonId === 'select_water') {
          this.liquidType = 'water';
          this.resetTwistSimulation();
        } else if (buttonId === 'select_soapy') {
          this.liquidType = 'soapyWater';
          this.resetTwistSimulation();
        } else if (buttonId === 'select_oil') {
          this.liquidType = 'oil';
          this.resetTwistSimulation();
        } else if (buttonId === 'twist_add_soap' && !this.twistSoapAdded) {
          this.twistSoapAdded = true;
        } else if (buttonId === 'twist_reset') {
          this.resetTwistSimulation();
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
    this.boatPosition = 50;
    this.boatVelocity = 0;
    this.soapAdded = false;
    this.soapSpread = 0;
    this.waterContaminated = false;
  }

  private resetTwistSimulation(): void {
    this.twistBoatPosition = 50;
    this.twistSoapAdded = false;
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.resetSimulation();
    this.resetTwistSimulation();
    this.liquidType = 'water';
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Soap boat simulation
    if (this.soapAdded && !this.waterContaminated) {
      // Spread soap
      this.soapSpread = Math.min(100, this.soapSpread + deltaTime * 60);

      // Calculate force and acceleration
      if (this.soapSpread < 80) {
        const tensionFront = SURFACE_TENSIONS.water;
        const tensionBack = this.getTensionAfterSoap('water', this.soapSpread);
        const force = this.calculatePropulsionForce(tensionFront, tensionBack, 0.01);
        this.boatVelocity += force * 500 * deltaTime;
      }

      // Apply drag
      this.boatVelocity *= 0.98;
      this.boatPosition = Math.min(350, Math.max(10, this.boatPosition + this.boatVelocity));

      if (this.soapSpread >= 100) {
        this.waterContaminated = true;
      }
    }

    // Twist simulation
    if (this.twistSoapAdded) {
      const speed = deltaTime * 60;
      if (this.liquidType === 'water') {
        this.twistBoatPosition = Math.min(350, this.twistBoatPosition + speed * 3);
      } else if (this.liquidType === 'soapyWater') {
        this.twistBoatPosition = Math.min(60, this.twistBoatPosition + speed * 0.1);
      } else if (this.liquidType === 'oil') {
        this.twistBoatPosition = Math.min(70, this.twistBoatPosition + speed * 0.3);
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(59, 130, 246, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(99, 102, 241, 0.05)' });

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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(59, 130, 246, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#3b82f6', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Soap-Powered Boat', { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Can a tiny soap drop propel a boat?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Water container
    r.roundRect(40, 200, 320, 150, 12, { fill: '#1d4ed8' });

    // Water surface ripples
    r.ellipse(200, 210, 140, 8, { fill: '#60a5fa' });

    // Boat
    r.path('M 150,220 L 160,245 L 220,245 L 230,220 L 150,220', { fill: '#854d0e', stroke: '#713f12', strokeWidth: 2 });
    r.rect(155, 210, 60, 12, { fill: '#a16207' });

    // Motion lines
    const animOffset = Math.sin(this.animationTime * 5) * 5;
    r.line(235, 230, 260 + animOffset, 230, { stroke: '#22c55e', strokeWidth: 3 });
    r.line(235, 220, 255 + animOffset, 215, { stroke: '#22c55e', strokeWidth: 2 });
    r.line(235, 240, 255 + animOffset, 245, { stroke: '#22c55e', strokeWidth: 2 });

    // Soap drop
    r.circle(130, 235, 12, { fill: '#a855f7' });
    r.text(130, 238, 'soap', { fill: '#ffffff', fontSize: 7, textAnchor: 'middle' });

    // Labels
    r.text(200, 380, 'No motor, no wind, no paddle...', { fill: '#ffffff', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 400, 'Just surface tension!', { fill: '#bfdbfe', fontSize: 13, textAnchor: 'middle' });

    r.addButton({ id: 'discover', label: 'Discover the Secret', variant: 'primary' });

    r.setCoachMessage('Surface tension can propel objects across water!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 100, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'A small paper boat floats on water.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'When you add a drop of dish soap behind it...', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Simple diagram
    r.roundRect(60, 190, 280, 60, 8, { fill: '#3b82f6' });
    r.path('M 180,195 L 188,215 L 222,215 L 230,195 L 180,195', { fill: '#854d0e' });
    r.circle(140, 210, 10, { fill: '#a855f7' });
    r.text(140, 213, 'SOAP', { fill: '#ffffff', fontSize: 6, textAnchor: 'middle' });
    r.text(290, 210, '?', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(200, 275, 'What happens to the boat?', { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'backward', label: 'Moves backward (toward soap)' },
      { id: 'forward', label: 'Moves forward (away from soap)', correct: true },
      { id: 'still', label: 'Stays still (no effect)' }
    ];

    options.forEach((option, i) => {
      const y = 300 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (option.correct) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (option.id === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (option.id === this.prediction) {
        bgColor = 'rgba(59, 130, 246, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 30, option.label, { fill: textColor, fontSize: 13 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `predict_${option.id}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 470, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const isCorrect = this.prediction === 'forward';
      r.text(200, 495, isCorrect ? 'Correct!' : 'Not quite!', {
        fill: isCorrect ? '#34d399' : '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle'
      });
      r.text(200, 520, 'The boat moves forward! Soap reduces', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 540, 'surface tension, creating an imbalance.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Try the Experiment', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Soap Boat Experiment', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Water container
    r.roundRect(20, 90, 360, 200, 12, { fill: '#1e40af' });
    r.roundRect(25, 95, 350, 190, 8, { fill: '#3b82f6' });

    // Surface effect
    r.ellipse(200, 100, 170, 6, { fill: '#60a5fa' });

    // Soap spread visualization
    if (this.soapAdded) {
      r.ellipse(this.boatPosition - 10, 110, this.soapSpread * 1.5, this.soapSpread * 0.3, { fill: 'rgba(168, 85, 247, 0.3)' });
    }

    // Boat
    r.path(`M ${this.boatPosition},100 L ${this.boatPosition + 10},130 L ${this.boatPosition + 60},130 L ${this.boatPosition + 70},100 L ${this.boatPosition},100`,
      { fill: '#854d0e', stroke: '#713f12', strokeWidth: 2 });
    r.rect(this.boatPosition + 5, 90, 60, 12, { fill: '#a16207' });

    // Flag
    r.line(this.boatPosition + 35, 90, this.boatPosition + 35, 70, { stroke: '#713f12', strokeWidth: 2 });
    r.path(`M ${this.boatPosition + 35},70 L ${this.boatPosition + 50},77 L ${this.boatPosition + 35},84`, { fill: '#ef4444' });

    // Surface tension arrows before soap
    if (!this.soapAdded) {
      r.text(200, 160, 'Equal surface tension on all sides', { fill: '#ffffff', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 180, '= No movement', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    }

    // After soap - force arrows
    if (this.soapAdded && this.soapSpread > 20) {
      // Strong front pull
      r.line(this.boatPosition + 75, 110, this.boatPosition + 110, 110, { stroke: '#22c55e', strokeWidth: 4 });
      r.text(this.boatPosition + 90, 95, 'HIGH', { fill: '#22c55e', fontSize: 9, fontWeight: 'bold', textAnchor: 'middle' });

      // Weak back pull
      r.line(this.boatPosition - 5, 110, this.boatPosition - 25, 110, { stroke: '#fbbf24', strokeWidth: 2, strokeDasharray: '3,2' });
      r.text(this.boatPosition - 20, 95, 'LOW', { fill: '#fbbf24', fontSize: 9, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Status
    const statusText = this.waterContaminated
      ? 'Water contaminated - soap spread everywhere!'
      : this.soapAdded
        ? `Soap spreading... ${Math.round(this.soapSpread)}%`
        : 'Click to add soap behind the boat';
    r.text(200, 305, statusText, { fill: this.waterContaminated ? '#fbbf24' : '#ffffff', fontSize: 12, textAnchor: 'middle' });

    // Velocity display
    if (this.soapAdded && Math.abs(this.boatVelocity) > 0.1) {
      r.text(200, 260, `Speed: ${(Math.abs(this.boatVelocity) * 10).toFixed(1)} cm/s`, {
        fill: '#ffffff', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle'
      });
    }

    // Soap bottle
    if (!this.waterContaminated) {
      r.roundRect(30, 330, 60, 70, 8, { fill: '#a855f7' });
      r.roundRect(40, 315, 40, 20, 5, { fill: '#7c3aed' });
      r.text(60, 375, 'SOAP', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

      if (!this.soapAdded) {
        r.text(60, 410, 'Click me!', { fill: '#ffffff', fontSize: 10, textAnchor: 'middle' });
        r.addButton({ id: 'add_soap', label: '', variant: 'secondary' });
      }
    }

    // Buttons
    if (this.waterContaminated) {
      r.addButton({ id: 'reset_water', label: 'Fresh Water', variant: 'secondary' });
      r.addButton({ id: 'continue', label: 'Learn the Physics', variant: 'primary' });
    }
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Physics of Surface Tension', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // What is surface tension
    r.roundRect(30, 85, 340, 150, 12, { fill: 'rgba(59, 130, 246, 0.15)' });
    r.text(200, 110, 'What is Surface Tension?', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Molecule diagram - bulk vs surface
    r.circle(100, 160, 12, { fill: '#3b82f6' });
    r.text(100, 200, 'Bulk: Pulled equally', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(100, 215, 'in all directions', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.circle(280, 160, 12, { fill: '#ef4444' });
    r.line(280, 125, 280, 135, { stroke: '#64748b', strokeWidth: 1, strokeDasharray: '2,2' });
    r.text(280, 120, 'Surface', { fill: '#64748b', fontSize: 8, textAnchor: 'middle' });
    r.text(280, 200, 'Surface: No pull', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(280, 215, 'from above!', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Surface tension value
    r.roundRect(100, 240, 200, 35, 8, { fill: 'rgba(255, 255, 255, 0.1)' });
    r.text(200, 262, 'Water: γ ≈ 0.072 N/m', { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // How soap propels
    r.roundRect(30, 290, 340, 160, 12, { fill: 'rgba(168, 85, 247, 0.15)' });
    r.text(200, 315, 'How Soap Propels the Boat', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const steps = [
      '1. Soap breaks hydrogen bonds',
      '2. Back tension drops to ~0.025 N/m',
      '3. Front still has 0.072 N/m',
      '4. Net force: F = Δγ × width',
      '5. Boat accelerates forward!'
    ];
    steps.forEach((step, i) => {
      r.text(60, 340 + i * 18, step, { fill: '#cbd5e1', fontSize: 11 });
    });

    // Marangoni effect note
    r.roundRect(40, 460, 320, 40, 8, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 485, 'Marangoni Effect: Flow from low to high γ', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Try Different Liquids', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'The Liquid Challenge', { fill: '#f59e0b', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 90, 340, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 120, 'What if we try on already soapy water?', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 145, 'Or on cooking oil?', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Three liquid containers
    r.roundRect(40, 175, 90, 60, 8, { fill: '#3b82f6' });
    r.text(85, 250, 'Clean Water', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(85, 265, 'γ = 0.072 N/m', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.roundRect(155, 175, 90, 60, 8, { fill: '#a855f7' });
    r.text(200, 250, 'Soapy Water', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 265, 'γ = 0.025 N/m', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.roundRect(270, 175, 90, 60, 8, { fill: '#fbbf24' });
    r.text(315, 250, 'Cooking Oil', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(315, 265, 'γ = 0.032 N/m', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.text(200, 300, 'Where will soap boat work best?', { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'same', label: 'Works the same on all three' },
      { id: 'soapy', label: 'Works best on soapy water (lowest tension)' },
      { id: 'clean', label: 'Only works well on clean water', correct: true }
    ];

    options.forEach((option, i) => {
      const y = 325 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (option.correct) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (option.id === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (option.id === this.twistPrediction) {
        bgColor = 'rgba(245, 158, 11, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 30, option.label, { fill: textColor, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `twist_${option.id}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 495, 340, 70, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const isCorrect = this.twistPrediction === 'clean';
      r.text(200, 520, isCorrect ? 'Correct!' : 'Only clean water works!', {
        fill: isCorrect ? '#34d399' : '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle'
      });
      r.text(200, 545, 'You need a tension gradient - a difference!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test Each Liquid', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Compare Different Liquids', { fill: '#f59e0b', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Liquid selector
    const liquidColors = { water: '#3b82f6', soapyWater: '#a855f7', oil: '#fbbf24' };
    const liquidLabels = { water: 'Clean Water', soapyWater: 'Soapy Water', oil: 'Cooking Oil' };

    (['water', 'soapyWater', 'oil'] as const).forEach((liquid, i) => {
      const x = 45 + i * 115;
      const isActive = this.liquidType === liquid;
      r.roundRect(x, 80, 100, 35, 8, { fill: isActive ? liquidColors[liquid] : 'rgba(51, 65, 85, 0.5)' });
      r.text(x + 50, 103, liquidLabels[liquid], {
        fill: isActive ? '#ffffff' : '#94a3b8', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle'
      });
      r.addButton({ id: `select_${liquid === 'soapyWater' ? 'soapy' : liquid}`, label: '', variant: 'secondary' });
    });

    // Container
    r.roundRect(30, 130, 340, 160, 12, { fill: '#1e293b' });
    r.roundRect(35, 135, 330, 150, 8, { fill: liquidColors[this.liquidType] });

    // Boat
    r.path(`M ${this.twistBoatPosition},145 L ${this.twistBoatPosition + 8},170 L ${this.twistBoatPosition + 52},170 L ${this.twistBoatPosition + 60},145 L ${this.twistBoatPosition},145`,
      { fill: '#854d0e', stroke: '#713f12', strokeWidth: 2 });
    r.rect(this.twistBoatPosition + 5, 137, 50, 10, { fill: '#a16207' });

    // Flag
    r.line(this.twistBoatPosition + 30, 137, this.twistBoatPosition + 30, 120, { stroke: '#713f12', strokeWidth: 2 });
    r.path(`M ${this.twistBoatPosition + 30},120 L ${this.twistBoatPosition + 45},127 L ${this.twistBoatPosition + 30},134`, { fill: '#ef4444' });

    // Result indicator
    if (this.twistSoapAdded) {
      let resultText = '';
      let resultColor = '#ffffff';
      if (this.liquidType === 'water') {
        resultText = 'Moved significantly!';
        resultColor = '#22c55e';
      } else if (this.liquidType === 'soapyWater') {
        resultText = 'Barely moved - already low tension!';
        resultColor = '#ef4444';
      } else {
        resultText = 'Minimal effect - wrong chemistry!';
        resultColor = '#ef4444';
      }
      r.text(200, 250, resultText, { fill: resultColor, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Liquid info
    r.text(200, 310, `Surface tension: ${SURFACE_TENSIONS[this.liquidType]} N/m`, {
      fill: '#94a3b8', fontSize: 11, textAnchor: 'middle'
    });

    // Buttons
    if (!this.twistSoapAdded) {
      r.addButton({ id: 'twist_add_soap', label: 'Add Soap', variant: 'primary' });
    }
    r.addButton({ id: 'twist_reset', label: 'Reset', variant: 'secondary' });

    if (this.twistSoapAdded) {
      r.addButton({ id: 'continue', label: 'Understand Why', variant: 'primary' });
    }
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, "It's About the Gradient!", { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 90, 340, 100, 12, { fill: 'rgba(251, 191, 36, 0.15)' });
    r.text(200, 120, 'The Key Insight', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 150, 'The boat needs a surface tension GRADIENT.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 175, "It's the DIFFERENCE that matters!", { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Formula
    r.roundRect(100, 200, 200, 40, 8, { fill: 'rgba(255, 255, 255, 0.1)' });
    r.text(200, 226, 'Force ∝ Δγ = γ_front - γ_back', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });

    // Comparison table
    r.roundRect(30, 260, 340, 140, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Table header
    r.text(90, 285, 'Liquid', { fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' });
    r.text(170, 285, 'Before', { fill: '#94a3b8', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(240, 285, 'After', { fill: '#94a3b8', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(320, 285, 'Δγ', { fill: '#94a3b8', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    // Table rows
    r.text(50, 315, 'Clean Water', { fill: '#cbd5e1', fontSize: 10 });
    r.text(170, 315, '0.072', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(240, 315, '0.025', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(320, 315, '0.047', { fill: '#22c55e', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(50, 345, 'Soapy Water', { fill: '#cbd5e1', fontSize: 10 });
    r.text(170, 345, '0.025', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(240, 345, '0.025', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(320, 345, '0', { fill: '#ef4444', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(50, 375, 'Cooking Oil', { fill: '#cbd5e1', fontSize: 10 });
    r.text(170, 375, '0.032', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(240, 375, '~0.030', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(320, 375, '~0.002', { fill: '#fbbf24', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    // Why oil doesn't work
    r.roundRect(30, 415, 340, 70, 12, { fill: 'rgba(16, 185, 129, 0.15)' });
    r.text(200, 440, 'Why Oil Doesn\'t Work', { fill: '#10b981', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 465, 'Soap works by disrupting hydrogen bonds.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 483, 'Oil has no hydrogen bonds to disrupt!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 50, 'Surface Tension in the Real World', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#3b82f6';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 75, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 103, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 135, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 170, app.title, { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 195, app.tagline, { fill: '#60a5fa', fontSize: 12, textAnchor: 'middle' });

    // Description (wrapped)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 225;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Physics connection
    r.roundRect(40, 320, 320, 70, 10, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 345, 'Physics Connection', { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 370, app.connection.substring(0, 50) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 420, '✓ Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 455, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take the Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 50, 'Surface Tension Mastery Test', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 75, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Scenario
      r.roundRect(25, 95, 350, 75, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      const scenarioWords = question.scenario.split(' ');
      let scenarioLine = '';
      let scenarioY = 115;
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
      r.text(200, 195, question.question, { fill: '#60a5fa', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 220 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${option.substring(0, 42)}${option.length > 42 ? '...' : ''}`,
          { fill: isSelected ? '#60a5fa' : '#e2e8f0', fontSize: 11 });

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
        r.addButton({ id: 'submit', label: 'Submit Test', variant: 'primary' });
      } else {
        r.text(200, 480, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? 'Excellent! Surface tension master!' : 'Keep studying! Review and try again.',
        { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 160, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts:', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'Surface tension from cohesive forces',
        'Surfactants break hydrogen bonds',
        'Marangoni effect: flow toward high γ',
        'Gradient matters, not absolute value!'
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
    // Trophy
    r.text(200, 120, '🚤💧🎉', { fontSize: 56, textAnchor: 'middle' });

    // Title
    r.text(200, 195, 'Surface Tension Master!', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 230, 'You understand the invisible force that', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 253, 'lets insects walk on water!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Achievements
    r.roundRect(60, 280, 280, 120, 16, { fill: 'rgba(59, 130, 246, 0.15)' });
    r.text(200, 310, 'Your Achievements', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const score = this.calculateScore();
    r.text(140, 355, `${score}/10`, { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(140, 380, 'Test Score', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.text(260, 355, '4', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(260, 380, 'Applications', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Key takeaways
    r.roundRect(40, 420, 320, 100, 12, { fill: 'rgba(255, 255, 255, 0.1)' });
    r.text(200, 445, 'Key Takeaways:', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 470, '• Surface tension from cohesive forces', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 488, '• Marangoni: flow from low to high γ', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 506, '• Gradient matters, not absolute value!', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Play Again', variant: 'secondary' });

    r.setCoachMessage('You now understand the physics behind soap-powered boats!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      boatPosition: this.boatPosition,
      boatVelocity: this.boatVelocity,
      soapAdded: this.soapAdded,
      soapSpread: this.soapSpread,
      waterContaminated: this.waterContaminated,
      animationTime: this.animationTime,
      liquidType: this.liquidType,
      twistBoatPosition: this.twistBoatPosition,
      twistSoapAdded: this.twistSoapAdded,
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
    if (state.showPredictionFeedback !== undefined) this.showPredictionFeedback = state.showPredictionFeedback as boolean;
    if (state.showTwistFeedback !== undefined) this.showTwistFeedback = state.showTwistFeedback as boolean;
    if (state.boatPosition !== undefined) this.boatPosition = state.boatPosition as number;
    if (state.boatVelocity !== undefined) this.boatVelocity = state.boatVelocity as number;
    if (state.soapAdded !== undefined) this.soapAdded = state.soapAdded as boolean;
    if (state.soapSpread !== undefined) this.soapSpread = state.soapSpread as number;
    if (state.waterContaminated !== undefined) this.waterContaminated = state.waterContaminated as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.liquidType !== undefined) this.liquidType = state.liquidType as 'water' | 'soapyWater' | 'oil';
    if (state.twistBoatPosition !== undefined) this.twistBoatPosition = state.twistBoatPosition as number;
    if (state.twistSoapAdded !== undefined) this.twistSoapAdded = state.twistSoapAdded as boolean;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createSoapBoatGame(sessionId: string): SoapBoatGame {
  return new SoapBoatGame(sessionId);
}
