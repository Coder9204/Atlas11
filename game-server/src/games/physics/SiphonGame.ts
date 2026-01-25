import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// SIPHON GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Atmospheric pressure and gravity-driven flow
// P_atm pushes water up into primed tube
// Gravity pulls water down the exit side
// Flow rate: v = sqrt(2gh) - Torricelli's law
// Max height: h_max = P_atm / (rho * g) ≈ 10.3m for water
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
const ATMOSPHERIC_PRESSURE = 101325; // Pa
const WATER_DENSITY = 1000; // kg/m³
const GRAVITY = 9.81; // m/s²
const MAX_SIPHON_HEIGHT = ATMOSPHERIC_PRESSURE / (WATER_DENSITY * GRAVITY); // ~10.3m

export class SiphonGame extends BaseGame {
  readonly gameType = 'siphon';
  readonly gameTitle = 'Siphon Physics: Water Uphill';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private upperTankHeight = 80;
  private lowerTankHeight = 30;
  private siphonPrimed = false;
  private waterLevel = 100;
  private flowRate = 0;
  private apexHeight = 5;
  private vacuumMode = false;
  private animationTime = 0;
  private hookStep = 0;
  private showSiphonFlow = false;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "A student observes water flowing through a siphon tube without any visible pump or motor.",
      question: "What drives water flow through a siphon?",
      options: [
        "Suction from the tube",
        "Gravity pulling the water chain",
        "Atmospheric pressure difference",
        "Capillary action"
      ],
      correctIndex: 2,
      explanation: "Atmospheric pressure pushes on the source water surface, creating a pressure difference that drives flow through the primed tube."
    },
    {
      scenario: "You want to start a siphon to drain your fish tank into a bucket.",
      question: "To start a siphon, you must first:",
      options: [
        "Create a vacuum in the tube",
        "Fill the tube with liquid (prime it)",
        "Heat the water",
        "Seal both ends"
      ],
      correctIndex: 1,
      explanation: "Priming fills the tube with liquid, creating the continuous 'liquid chain' needed for siphon action."
    },
    {
      scenario: "An engineer is designing a siphon system to transfer water between tanks.",
      question: "Where does the water exit need to be relative to the source?",
      options: [
        "Above the source",
        "At the same level",
        "Below the source surface",
        "Position doesn't matter"
      ],
      correctIndex: 2,
      explanation: "The outlet must be below the source water surface for the siphon to work - gravity provides the driving force."
    },
    {
      scenario: "A physicist explains why siphons have a height limit at sea level.",
      question: "What is the maximum height water can be siphoned over at sea level?",
      options: [
        "Any height",
        "About 10 meters",
        "About 1 meter",
        "About 100 meters"
      ],
      correctIndex: 1,
      explanation: "P_atm = ρgh gives h = 101,325/(1000×9.81) ≈ 10.3 meters maximum."
    },
    {
      scenario: "A researcher tests a siphon in a vacuum chamber with no atmospheric pressure.",
      question: "Why does a siphon FAIL in a perfect vacuum?",
      options: [
        "Water freezes in vacuum",
        "No atmospheric pressure to push water up",
        "Gravity doesn't work in vacuum",
        "Water evaporates instantly"
      ],
      correctIndex: 1,
      explanation: "Without atmospheric pressure to push on the source, there's no pressure difference to drive flow. The siphon needs P_atm."
    },
    {
      scenario: "While draining a pool, an air bubble enters the working siphon tube.",
      question: "If an air bubble enters a working siphon, what happens?",
      options: [
        "Flow increases due to buoyancy",
        "Nothing changes significantly",
        "Flow stops (siphon breaks)",
        "The bubble dissolves"
      ],
      correctIndex: 2,
      explanation: "An air bubble breaks the continuous liquid chain, destroying the pressure transmission and stopping the siphon."
    },
    {
      scenario: "A student experiments with siphons at different height configurations.",
      question: "Why does siphon flow rate increase with greater height difference?",
      options: [
        "More suction is created",
        "Greater pressure differential (P = ρgh)",
        "The tube becomes wider",
        "Water becomes less viscous"
      ],
      correctIndex: 1,
      explanation: "Flow velocity follows Torricelli's law: v = √(2gh). Greater height difference = greater pressure difference = faster flow."
    },
    {
      scenario: "An archaeologist studies ancient Roman water supply systems.",
      question: "Ancient Romans used siphons for:",
      options: [
        "Making wine only",
        "Aqueducts crossing valleys",
        "Heating baths",
        "Military weapons"
      ],
      correctIndex: 1,
      explanation: "Romans built 'inverted siphons' to carry aqueduct water across valleys - down one side and up the other."
    },
    {
      scenario: "Someone is siphoning gasoline from a vehicle's tank to a container.",
      question: "A gasoline siphon stops working when:",
      options: [
        "Gas runs out or outlet rises above inlet",
        "Temperature drops below freezing",
        "The flow becomes too fast",
        "The tube becomes too long horizontally"
      ],
      correctIndex: 0,
      explanation: "Siphon requires outlet below source surface AND liquid available. Either condition failing stops flow."
    },
    {
      scenario: "A physics teacher explains the complete theory behind siphon operation.",
      question: "The scientific principle behind siphons is best explained by:",
      options: [
        "Bernoulli's equation only",
        "Atmospheric pressure pushing, gravity pulling",
        "Surface tension alone",
        "Molecular cohesion only"
      ],
      correctIndex: 1,
      explanation: "Siphons work by the combination: atmospheric pressure pushes water into the tube, gravity pulls it out the other side."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🏛️",
      title: "Roman Aqueducts",
      tagline: "Crossing valleys without pumps",
      description: "Romans used inverted siphons to carry water across valleys, allowing aqueducts to maintain flow without continuous downhill slope.",
      connection: "Water entering the high side creates pressure that pushes water up the other side. The inlet must be higher than the outlet."
    },
    {
      icon: "⛽",
      title: "Fuel Transfer",
      tagline: "Moving liquids without pumps",
      description: "Siphons enable gravity-powered fuel transfer between tanks, useful in emergencies, agriculture, and marine applications.",
      connection: "A primed tube connects a higher tank to a lower container. Atmospheric pressure pushes fuel through while gravity pulls it down."
    },
    {
      icon: "🐟",
      title: "Aquarium Maintenance",
      tagline: "Cleaning without disturbance",
      description: "Aquarium siphons (gravel vacuums) use the siphon principle to remove debris and perform water changes without stressing fish.",
      connection: "The siphon creates gentle suction at the gravel level while draining water to a bucket below the tank."
    },
    {
      icon: "🏥",
      title: "Medical Drainage",
      tagline: "Gravity-assisted healing",
      description: "Medical siphon drains use gravity and pressure differentials to remove fluid from wounds, cavities, and surgical sites.",
      connection: "A tube from the wound connects to a collection bag placed lower than the patient. Gravity and tissue pressure drive drainage."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate flow velocity using Torricelli's law
  private calculateFlowVelocity(heightDiff: number): number {
    // v = sqrt(2gh)
    if (heightDiff <= 0) return 0;
    return Math.sqrt(2 * GRAVITY * (heightDiff / 100)); // Convert cm to m
  }

  // PROTECTED: Calculate if siphon can work at given apex height
  private siphonCanWork(apexHeightMeters: number, inVacuum: boolean): boolean {
    if (inVacuum) return false; // No atmospheric pressure
    return apexHeightMeters <= MAX_SIPHON_HEIGHT;
  }

  // PROTECTED: Calculate pressure at apex
  private calculateApexPressure(apexHeight: number): number {
    // P_apex = P_atm - ρgh
    return ATMOSPHERIC_PRESSURE - (WATER_DENSITY * GRAVITY * apexHeight);
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
      if (input.id === 'upper_tank_height') {
        this.upperTankHeight = Math.max(20, Math.min(100, input.value));
        this.updateFlowRate();
      } else if (input.id === 'lower_tank_height') {
        this.lowerTankHeight = Math.max(10, Math.min(90, input.value));
        this.updateFlowRate();
      } else if (input.id === 'apex_height') {
        this.apexHeight = Math.max(1, Math.min(15, input.value));
      }
    }
  }

  private updateFlowRate(): void {
    const heightDiff = this.upperTankHeight - this.lowerTankHeight;
    if (this.siphonPrimed && heightDiff > 0 && this.waterLevel > 0) {
      this.flowRate = Math.sqrt(heightDiff) * 0.5;
    } else {
      this.flowRate = 0;
    }
  }

  private handleButtonClick(buttonId: string): void {
    switch (this.phase) {
      case 'hook':
        if (buttonId === 'start_siphon') {
          this.showSiphonFlow = true;
        } else if (buttonId === 'hook_continue') {
          this.hookStep = 1;
        } else if (buttonId === 'discover') {
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
        if (buttonId === 'prime_siphon') {
          const heightDiff = this.upperTankHeight - this.lowerTankHeight;
          if (this.waterLevel > 0 && heightDiff > 0) {
            this.siphonPrimed = true;
            this.updateFlowRate();
          }
        } else if (buttonId === 'reset_siphon') {
          this.siphonPrimed = false;
          this.waterLevel = 100;
          this.flowRate = 0;
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
        if (buttonId === 'toggle_vacuum') {
          this.vacuumMode = !this.vacuumMode;
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
    this.upperTankHeight = 80;
    this.lowerTankHeight = 30;
    this.siphonPrimed = false;
    this.waterLevel = 100;
    this.flowRate = 0;
    this.apexHeight = 5;
    this.vacuumMode = false;
    this.hookStep = 0;
    this.showSiphonFlow = false;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Update water level if siphon is running
    if (this.siphonPrimed && this.flowRate > 0 && this.waterLevel > 0) {
      this.waterLevel = Math.max(0, this.waterLevel - this.flowRate * deltaTime * 5);
      if (this.waterLevel <= 0) {
        this.siphonPrimed = false;
        this.flowRate = 0;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(0, 212, 255, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(59, 130, 246, 0.05)' });

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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(0, 212, 255, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#00d4ff', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'Water Uphill?', { fill: '#ffffff', fontSize: 32, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'The magic of siphons', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    if (this.hookStep === 0) {
      // Siphon visualization
      r.roundRect(40, 195, 320, 200, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

      // Upper tank
      r.rect(60, 250, 80, 80, { fill: '#333333' });
      const waterHeight = this.showSiphonFlow ? 50 : 65;
      r.rect(65, 260 + (65 - waterHeight), 70, waterHeight, { fill: '#3b82f6' });
      r.text(100, 240, 'Source', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      // Lower tank
      r.rect(260, 310, 80, 60, { fill: '#333333' });
      const destWaterHeight = this.showSiphonFlow ? 35 : 10;
      r.rect(265, 360 - destWaterHeight, 70, destWaterHeight, { fill: '#3b82f6' });
      r.text(300, 300, 'Destination', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      // Siphon tube
      r.path('M 130 270 Q 130 220 190 220 Q 250 220 250 270 L 250 320',
        { fill: 'none', stroke: '#666666', strokeWidth: 8 });
      r.path('M 130 270 Q 130 220 190 220 Q 250 220 250 270 L 250 320',
        { fill: 'none', stroke: '#888888', strokeWidth: 4 });

      // Water in tube and flow animation
      if (this.showSiphonFlow) {
        r.path('M 130 270 Q 130 220 190 220 Q 250 220 250 270 L 250 320',
          { fill: 'none', stroke: '#3b82f6', strokeWidth: 3 });

        // Flow drops
        const dropY1 = 320 + (this.animationTime * 100) % 30;
        const dropY2 = 320 + ((this.animationTime * 100) + 15) % 30;
        r.circle(250, dropY1, 4, { fill: '#3b82f6' });
        r.circle(250, dropY2, 3, { fill: '#3b82f6' });
      }

      // Apex label
      r.text(190, 210, 'Apex (highest point)', { fill: '#00d4ff', fontSize: 10, textAnchor: 'middle' });

      // Height difference indicator
      r.line(330, 270, 330, 330, { stroke: '#fbbf24', strokeWidth: 2 });
      r.text(350, 305, 'Δh', { fill: '#fbbf24', fontSize: 11 });

      r.addButton({ id: 'start_siphon', label: 'Start Siphon', variant: 'primary' });

      if (this.showSiphonFlow) {
        r.addButton({ id: 'hook_continue', label: 'Continue', variant: 'secondary' });
      }
    } else {
      // Hook step 1 - explanation
      r.roundRect(40, 200, 320, 220, 16, { fill: 'rgba(30, 41, 59, 0.8)' });

      r.text(200, 240, 'How does water flow UP that tube?', { fill: '#00d4ff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 280, "There's no pump. No motor.", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
      r.text(200, 300, 'Just a tube full of water connecting', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
      r.text(200, 320, 'two containers at different heights.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

      r.roundRect(50, 340, 300, 60, 10, { fill: 'rgba(59, 130, 246, 0.1)' });
      r.text(200, 365, 'The atmosphere is doing the pushing!', { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 385, '101,325 Pa - enough to push water 10m high!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'discover', label: 'Learn How It Works', variant: 'primary' });
    }

    r.setCoachMessage('Siphons move water uphill using only atmospheric pressure and gravity!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 100, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'A siphon is flowing steadily. You raise', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'the outlet end so it\'s now HIGHER than', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 170, 'the water surface in the source tank.', { fill: '#ff6b6b', fontSize: 14, textAnchor: 'middle' });

    r.text(200, 210, 'What happens to the siphon?', { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'stops', label: 'Flow stops - outlet must be below source', correct: true },
      { id: 'reverse', label: 'Flow reverses - water goes back', color: '#00d4ff' },
      { id: 'continues', label: 'Flow continues - momentum keeps it going', color: '#fbbf24' },
      { id: 'faster', label: 'Flow increases - suction pulls harder', color: '#ff6b6b' }
    ];

    options.forEach((option, i) => {
      const y = 235 + i * 55;
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
        bgColor = 'rgba(0, 212, 255, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 30, option.label, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `predict_${option.id}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 470, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const isCorrect = this.prediction === 'stops';
      const message = isCorrect ? 'Correct! Flow stops!' : 'The siphon actually stops!';
      r.text(200, 500, message, { fill: isCorrect ? '#34d399' : '#00d4ff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 525, 'Outlet must be below source surface', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 545, 'for siphon to maintain flow.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Try the Simulator', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Siphon Simulator', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    const heightDiff = this.upperTankHeight - this.lowerTankHeight;
    const canFlow = heightDiff > 0 && this.siphonPrimed && this.waterLevel > 0;

    // Visualization area
    r.roundRect(20, 80, 360, 250, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Height scale
    r.line(35, 100, 35, 310, { stroke: '#444444', strokeWidth: 1 });
    for (let h = 0; h <= 100; h += 25) {
      const y = 310 - h * 2;
      r.line(30, y, 40, y, { stroke: '#444444', strokeWidth: 1 });
      r.text(25, y + 4, `${h}`, { fill: '#94a3b8', fontSize: 8, textAnchor: 'end' });
    }

    // Upper tank
    const upperY = 310 - this.upperTankHeight * 2 - 50;
    r.rect(80, upperY, 70, 50, { fill: '#333333' });
    const waterH = this.waterLevel * 0.45;
    r.rect(83, upperY + 50 - waterH, 64, waterH, { fill: '#3b82f6' });
    r.text(115, upperY - 10, 'Source', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(115, upperY + 25, `${this.waterLevel.toFixed(0)}%`, { fill: '#ffffff', fontSize: 9, textAnchor: 'middle' });

    // Lower tank
    const lowerY = 310 - this.lowerTankHeight * 2 - 40;
    r.rect(250, lowerY, 70, 40, { fill: '#333333' });
    const destH = (100 - this.waterLevel) * 0.35;
    r.rect(253, lowerY + 40 - Math.max(0, destH), 64, Math.max(0, destH), { fill: '#3b82f6' });
    r.text(285, lowerY - 10, 'Destination', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Siphon tube
    const sourceY = upperY + 25;
    const destY = lowerY + 20;
    const apexY = Math.min(sourceY, destY) - 40;

    const tubeColor = canFlow ? '#3b82f6' : '#444444';
    r.path(`M 145 ${sourceY} Q 145 ${apexY} 200 ${apexY} Q 255 ${apexY} 255 ${destY}`,
      { fill: 'none', stroke: '#666666', strokeWidth: 10 });
    r.path(`M 145 ${sourceY} Q 145 ${apexY} 200 ${apexY} Q 255 ${apexY} 255 ${destY}`,
      { fill: 'none', stroke: tubeColor, strokeWidth: 6 });

    // Flow animation
    if (canFlow) {
      const flowY = destY + (this.animationTime * 50) % 20;
      r.circle(255, flowY, 4, { fill: '#3b82f6' });
    }

    // Height difference indicator
    r.text(340, 200, `Δh = ${heightDiff > 0 ? '+' : ''}${heightDiff}`, {
      fill: heightDiff > 0 ? '#10b981' : '#ff6b6b',
      fontSize: 12,
      fontWeight: 'bold'
    });
    r.text(340, 218, heightDiff > 0 ? 'Will flow' : 'No flow', {
      fill: heightDiff > 0 ? '#10b981' : '#ff6b6b',
      fontSize: 10
    });

    // Flow rate display
    if (canFlow) {
      r.text(200, 320, `Flow rate: ${this.flowRate.toFixed(1)} units/s`, {
        fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle'
      });
    }

    // Sliders
    r.addSlider({
      id: 'upper_tank_height',
      label: 'Source Height',
      min: 20,
      max: 100,
      step: 5,
      value: this.upperTankHeight
    });

    r.addSlider({
      id: 'lower_tank_height',
      label: 'Destination Height',
      min: 10,
      max: 90,
      step: 5,
      value: this.lowerTankHeight
    });

    // Action buttons
    const canPrime = this.waterLevel > 0 && heightDiff > 0 && !this.siphonPrimed;
    r.addButton({
      id: 'prime_siphon',
      label: this.siphonPrimed ? 'Flowing...' : 'Prime Siphon',
      variant: canPrime ? 'primary' : 'secondary',
      disabled: !canPrime
    });
    r.addButton({ id: 'reset_siphon', label: 'Reset', variant: 'secondary' });

    // Warning if height diff is wrong
    if (heightDiff <= 0) {
      r.roundRect(30, 460, 340, 40, 10, { fill: 'rgba(255, 107, 107, 0.15)' });
      r.text(200, 485, 'Destination must be lower than source!', { fill: '#ff6b6b', fontSize: 13, textAnchor: 'middle' });
    }

    // Key insight
    r.roundRect(30, 510, 340, 50, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 530, 'Flow rate ∝ √(height difference)', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 548, 'Greater Δh = higher pressure differential = faster flow', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'How Siphons Work', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Physics concepts
    const concepts = [
      { title: 'Atmospheric Pressure', text: '101 kPa pushes water up into tube', color: '#00d4ff', icon: '⬇️' },
      { title: 'Gravity Pull', text: 'Water falling creates pressure drop at apex', color: '#10b981', icon: '⬇️' },
      { title: 'Continuous Chain', text: 'Liquid column acts as connected chain', color: '#3b82f6', icon: '🔗' },
      { title: 'Height Requirement', text: 'Outlet must be below source surface', color: '#fbbf24', icon: '📏' }
    ];

    concepts.forEach((concept, i) => {
      const y = 85 + i * 80;
      r.roundRect(30, y, 340, 70, 12, { fill: `${concept.color}15` });
      r.text(55, y + 25, concept.icon, { fill: concept.color, fontSize: 18 });
      r.text(85, y + 28, concept.title, { fill: concept.color, fontSize: 14, fontWeight: 'bold' });
      r.text(85, y + 50, concept.text, { fill: '#94a3b8', fontSize: 12 });
    });

    // Flow equation
    r.roundRect(30, 415, 340, 80, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 440, "Torricelli's Law", { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 470, 'v = √(2gh)', { fill: '#ffffff', fontSize: 18, textAnchor: 'middle' });

    // Key takeaway
    r.roundRect(30, 510, 340, 60, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(55, 535, '💡', { fontSize: 18 });
    r.text(200, 535, 'Atmospheric pressure pushes UP,', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 555, 'gravity pulls DOWN - no pump needed!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Height Limits', variant: 'primary' });

    r.setCoachMessage('Now let\'s discover why siphons have a maximum height...');
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'The Height Limit', { fill: '#a855f7', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 90, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 120, 'You want to siphon water over', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 140, 'a very tall wall. If the apex gets', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 160, 'too high, what happens?', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(200, 200, 'Is there a maximum height?', { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'unlimited', label: 'No limit - siphons work at any height', color: '#00d4ff' },
      { id: '10m', label: 'About 10 meters - then water "breaks"', correct: true },
      { id: '100m', label: 'About 100 meters - very high', color: '#7b68ee' },
      { id: '1m', label: 'Only about 1 meter - very limited', color: '#fbbf24' }
    ];

    options.forEach((option, i) => {
      const y = 225 + i * 55;
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
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 30, option.label, { fill: textColor, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `twist_${option.id}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 460, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const isCorrect = this.twistPrediction === '10m';
      const message = isCorrect ? 'Exactly right! ~10 meters!' : 'The limit is about 10 meters!';
      r.text(200, 490, message, { fill: isCorrect ? '#34d399' : '#ff6b6b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 520, 'At 10.3m, atmospheric pressure equals', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 540, 'the water column weight. Above this,', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 560, 'a vacuum forms and the siphon breaks!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test Height Limits', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Height Limit Lab', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const siphonWorks = this.siphonCanWork(this.apexHeight, this.vacuumMode);

    // Visualization
    r.roundRect(20, 80, 360, 220, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Height scale
    r.line(45, 100, 45, 280, { stroke: '#444444', strokeWidth: 1 });
    for (let h = 0; h <= 20; h += 5) {
      const y = 280 - h * 9;
      r.line(40, y, 50, y, { stroke: '#444444', strokeWidth: 1 });
      r.text(35, y + 4, `${h}m`, { fill: '#94a3b8', fontSize: 8, textAnchor: 'end' });
    }

    // Critical line at 10m
    r.line(50, 280 - 10 * 9, 370, 280 - 10 * 9, { stroke: '#ff6b6b', strokeWidth: 1, strokeDasharray: '5,3' });
    r.text(375, 280 - 10 * 9 + 4, 'Max ~10.3m', { fill: '#ff6b6b', fontSize: 9 });

    // Source tank at ground level
    r.rect(70, 250, 80, 30, { fill: '#333333' });
    r.rect(75, 255, 70, 20, { fill: '#3b82f6' });
    r.text(110, 245, 'Source', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Siphon tube with variable apex
    const apexY = 280 - this.apexHeight * 9;
    const tubeColor = siphonWorks ? '#3b82f6' : '#ff6b6b';
    r.path(`M 145 260 Q 145 ${apexY} 200 ${apexY} Q 255 ${apexY} 255 270`,
      { fill: 'none', stroke: tubeColor, strokeWidth: 6 });

    // Destination
    r.rect(250, 265, 80, 25, { fill: '#333333' });

    // Status indicator at apex
    r.circle(200, apexY, 12, { fill: siphonWorks ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 107, 107, 0.3)' });
    r.text(200, apexY + 5, siphonWorks ? '✓' : '✗', { fill: siphonWorks ? '#10b981' : '#ff6b6b', fontSize: 14, textAnchor: 'middle' });

    // Apex height label
    r.text(200, apexY - 20, `${this.apexHeight}m apex`, { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Vacuum indicator
    if (this.vacuumMode) {
      r.roundRect(280, 100, 80, 30, 5, { fill: 'rgba(168, 85, 247, 0.3)' });
      r.text(320, 120, 'VACUUM', { fill: '#a855f7', fontSize: 11, textAnchor: 'middle' });
    }

    // Bubble if broken (not in vacuum)
    if (!siphonWorks && !this.vacuumMode) {
      r.circle(200, apexY, 8, { fill: 'rgba(255, 255, 255, 0.5)' });
      r.text(200, apexY + 25, 'Vapor bubble!', { fill: '#ff6b6b', fontSize: 9, textAnchor: 'middle' });
    }

    // Slider for apex height
    r.addSlider({
      id: 'apex_height',
      label: 'Siphon Apex Height (m)',
      min: 1,
      max: 15,
      step: 1,
      value: this.apexHeight
    });

    // Vacuum toggle
    r.addButton({
      id: 'toggle_vacuum',
      label: this.vacuumMode ? '✓ In Vacuum' : '○ In Vacuum',
      variant: this.vacuumMode ? 'primary' : 'secondary'
    });

    // Explanation
    r.roundRect(30, 430, 340, 80, 12, { fill: siphonWorks ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 107, 107, 0.15)' });
    if (this.vacuumMode) {
      r.text(200, 455, 'In vacuum: No atmospheric pressure!', { fill: '#a855f7', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 480, 'Siphons CANNOT work without P_atm', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 498, 'to push water into the tube.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    } else if (siphonWorks) {
      r.text(200, 455, 'Siphon works!', { fill: '#10b981', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 480, `${this.apexHeight}m is within the ~10.3m limit`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 498, 'Atmospheric pressure can support this column.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    } else {
      r.text(200, 455, 'Siphon breaks!', { fill: '#ff6b6b', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 480, `At ${this.apexHeight}m, pressure at apex drops`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 498, 'below vapor pressure. Water boils!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    }

    r.addButton({ id: 'continue', label: 'Understand the Limit', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'The 10-Meter Limit', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Calculation box
    r.roundRect(30, 90, 340, 120, 12, { fill: 'rgba(0, 212, 255, 0.1)' });
    r.text(200, 115, 'The Calculation', { fill: '#00d4ff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 145, 'P_atm = ρ × g × h', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 170, '101,325 Pa = 1000 kg/m³ × 9.8 m/s² × h', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 195, 'h = 10.33 meters', { fill: '#10b981', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // What happens above limit
    r.roundRect(30, 225, 340, 90, 12, { fill: 'rgba(255, 107, 107, 0.1)' });
    r.text(200, 250, 'Above the Limit', { fill: '#ff6b6b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 280, 'Pressure at apex drops to near zero.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 300, 'Water vaporizes, forming a bubble that', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 320, 'breaks the liquid chain (cavitation).', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Real-world implications
    r.roundRect(30, 330, 340, 90, 12, { fill: 'rgba(16, 185, 129, 0.1)' });
    r.text(200, 355, 'Real-World Implications', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 385, 'Suction pumps can\'t lift water > 10m.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 405, 'Deep wells need submersible pumps', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 425, 'that push from below, not suck from above!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Key takeaway
    r.roundRect(30, 440, 340, 60, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(55, 465, '💡', { fontSize: 18 });
    r.text(200, 465, 'The 10m limit comes directly from', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 485, 'atmospheric pressure: P = ρgh', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 50, 'Siphons in Action', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#0891b2';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 75, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 103, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 135, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 170, app.title, { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 195, app.tagline, { fill: '#22d3ee', fontSize: 12, textAnchor: 'middle' });

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
    r.roundRect(40, 320, 320, 70, 10, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 345, 'Physics Connection', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 370, app.connection.substring(0, 50) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 420, '✓ Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 455, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Continue button
    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 50, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
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
      r.text(200, 195, question.question, { fill: '#22d3ee', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 220 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(6, 182, 212, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${option.substring(0, 42)}${option.length > 42 ? '...' : ''}`,
          { fill: isSelected ? '#22d3ee' : '#e2e8f0', fontSize: 11 });

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
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? 'Excellent! You understand siphons!' : 'Keep studying! Review and try again.',
        { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 160, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'Atmospheric pressure driving flow',
        'Height requirements and limits',
        '10-meter maximum (P = ρgh)',
        'Priming and continuous liquid chain'
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
    r.text(200, 120, '🪣🎓', { fontSize: 64, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Siphon Master!', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand how to move water', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'uphill without any pump!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '⬇️', label: 'Atmospheric Push' },
      { icon: '📏', label: '10m Height Limit' },
      { icon: '🔗', label: 'Liquid Chain' },
      { icon: '⚡', label: "Torricelli's Law" }
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
    r.text(200, 515, 'h_max = P_atm / (ρg) ≈ 10.3m', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('You now understand the ancient physics that still moves water around the world!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      upperTankHeight: this.upperTankHeight,
      lowerTankHeight: this.lowerTankHeight,
      siphonPrimed: this.siphonPrimed,
      waterLevel: this.waterLevel,
      flowRate: this.flowRate,
      apexHeight: this.apexHeight,
      vacuumMode: this.vacuumMode,
      animationTime: this.animationTime,
      hookStep: this.hookStep,
      showSiphonFlow: this.showSiphonFlow,
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
    if (state.upperTankHeight !== undefined) this.upperTankHeight = state.upperTankHeight as number;
    if (state.lowerTankHeight !== undefined) this.lowerTankHeight = state.lowerTankHeight as number;
    if (state.siphonPrimed !== undefined) this.siphonPrimed = state.siphonPrimed as boolean;
    if (state.waterLevel !== undefined) this.waterLevel = state.waterLevel as number;
    if (state.flowRate !== undefined) this.flowRate = state.flowRate as number;
    if (state.apexHeight !== undefined) this.apexHeight = state.apexHeight as number;
    if (state.vacuumMode !== undefined) this.vacuumMode = state.vacuumMode as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.hookStep !== undefined) this.hookStep = state.hookStep as number;
    if (state.showSiphonFlow !== undefined) this.showSiphonFlow = state.showSiphonFlow as boolean;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createSiphonGame(sessionId: string): SiphonGame {
  return new SiphonGame(sessionId);
}
