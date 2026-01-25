import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// HAND WARMER GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Latent Heat of Fusion and Supercooling
// Sodium acetate crystallization releases latent heat (264 kJ/kg)
// Supercooling allows liquid to exist below freezing point
// Nucleation triggers rapid crystallization and heat release
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
}

// Physics constants (PROTECTED - never sent to client)
const LATENT_HEAT_FUSION = 264; // kJ/kg for sodium acetate
const MELTING_POINT = 54; // Celsius
const ROOM_TEMPERATURE = 20; // Celsius
const MAX_TEMP = 54; // Reaches melting point during crystallization

export class HandWarmerGame extends BaseGame {
  readonly gameType = 'hand_warmer';
  readonly gameTitle = 'Hand Warmer: Phase Change Energy';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private warmerState: 'liquid' | 'crystallizing' | 'solid' = 'liquid';
  private temperature = ROOM_TEMPERATURE;
  private crystalProgress = 0;
  private animationTime = 0;
  private discClicked = false;

  // Twist simulation - comparing warmer types
  private warmerType: 'phase' | 'chemical' = 'phase';
  private twistTemperature = ROOM_TEMPERATURE;
  private twistState: 'inactive' | 'active' | 'depleted' = 'inactive';
  private energyRemaining = 100;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      question: "What is 'latent heat of fusion'?",
      options: [
        "Heat needed to change temperature",
        "Energy released or absorbed during phase change (solid-liquid)",
        "Heat from nuclear fusion",
        "Temperature of melting"
      ],
      correctIndex: 1,
      explanation: "Latent heat of fusion is the energy released (freezing) or absorbed (melting) during the solid-liquid phase transition, without changing temperature."
    },
    {
      question: "Why can sodium acetate stay liquid below its freezing point (54C)?",
      options: [
        "It's not real sodium acetate",
        "The container keeps it warm",
        "Without nucleation sites, crystals can't form (supercooling)",
        "It has no freezing point"
      ],
      correctIndex: 2,
      explanation: "Supersaturated/supercooled solutions need a 'seed' or nucleation site to start crystallization. Without disturbance, they remain liquid below freezing point."
    },
    {
      question: "When the metal disc is clicked, what happens?",
      options: [
        "It heats the solution electrically",
        "It creates a nucleation site that triggers crystallization",
        "It mixes chemicals together",
        "It releases stored heat directly"
      ],
      correctIndex: 1,
      explanation: "The disc's deformation creates a tiny crystal that acts as a nucleation site. Crystallization spreads rapidly from this point, releasing latent heat."
    },
    {
      question: "During crystallization, the hand warmer's temperature:",
      options: [
        "Drops to freezing",
        "Rises to the melting/freezing point and stays there",
        "Fluctuates randomly",
        "Stays at room temperature"
      ],
      correctIndex: 1,
      explanation: "As crystals form, latent heat is released, heating the solution to its melting point (54C). It stays there until crystallization completes."
    },
    {
      question: "How do you 'recharge' a reusable hand warmer?",
      options: [
        "Plug it into electricity",
        "Add more chemicals",
        "Boil it in water to re-dissolve the crystals",
        "Let it sit overnight"
      ],
      correctIndex: 2,
      explanation: "Heating the crystallized sodium acetate above 54C re-dissolves the crystals. When cooled carefully, it becomes supercooled liquid again, ready to reuse."
    },
    {
      question: "Chemical (iron oxidation) hand warmers differ from phase-change ones because:",
      options: [
        "They're reusable",
        "They produce heat through irreversible chemical reaction",
        "They work faster",
        "They get hotter"
      ],
      correctIndex: 1,
      explanation: "Chemical warmers use iron oxidation (rusting), which is irreversible. Once the iron is oxidized, the warmer is depleted and must be discarded."
    },
    {
      question: "The latent heat of fusion for sodium acetate is about 264 kJ/kg. This means:",
      options: [
        "It heats up 264C",
        "264 kJ is released when 1 kg crystallizes",
        "It takes 264 kg to heat it",
        "264 is its melting point"
      ],
      correctIndex: 1,
      explanation: "Latent heat is energy per unit mass. When 1 kg of liquid sodium acetate crystallizes, it releases 264 kJ of heat energy."
    },
    {
      question: "Why does the crystallization spread so rapidly after the disc is clicked?",
      options: [
        "The disc is very hot",
        "Each new crystal triggers neighbors to crystallize (chain reaction)",
        "The solution is compressed",
        "Air rushes in"
      ],
      correctIndex: 1,
      explanation: "Once crystallization starts, each new crystal surface acts as a nucleation site for more crystallization. This creates a rapid chain reaction."
    },
    {
      question: "A supercooled liquid is:",
      options: [
        "Colder than absolute zero",
        "A liquid below its normal freezing point",
        "A very cold solid",
        "Liquid nitrogen"
      ],
      correctIndex: 1,
      explanation: "Supercooled liquids remain liquid below their freezing point due to lack of nucleation sites. They're metastable and can crystallize suddenly when disturbed."
    },
    {
      question: "Ice packs that stay cold for hours work by:",
      options: [
        "Being very well insulated",
        "Absorbing latent heat during melting (opposite of hand warmers)",
        "Chemical reactions that make cold",
        "Containing supercold liquid"
      ],
      correctIndex: 1,
      explanation: "Melting absorbs latent heat from surroundings. Ice packs stay at 0C while melting because the absorbed heat goes into phase change, not temperature rise."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "glove",
      title: "Reusable Hand Warmers",
      description: "Sodium acetate hand warmers can be reused hundreds of times. Click to crystallize and release heat (54C for up to an hour). Boil in water for 10 minutes to reset. More economical and eco-friendly than disposables."
    },
    {
      icon: "building",
      title: "Thermal Energy Storage",
      description: "Phase change materials (PCMs) store energy in buildings. Melting during hot days and solidifying at night, they reduce heating/cooling costs by 20-30%. Paraffin wax and salt hydrates are common PCMs."
    },
    {
      icon: "package",
      title: "Food Transport",
      description: "Phase change gel packs keep vaccines, organs, and temperature-sensitive foods within precise ranges during shipping. They absorb/release heat while staying at constant temperature during phase change."
    },
    {
      icon: "satellite",
      title: "Spacecraft Thermal Control",
      description: "Satellites use PCMs to handle extreme temperature swings between sun and shadow. The PCM absorbs excess heat (melting) and releases it when cold (solidifying), maintaining stable equipment temperatures."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate energy released during crystallization
  private calculateEnergyReleased(mass: number): number {
    return mass * LATENT_HEAT_FUSION; // kJ
  }

  // PROTECTED: Get temperature color
  private getTempColor(temp: number): string {
    if (temp < 25) return '#3b82f6'; // blue
    if (temp < 35) return '#22c55e'; // green
    if (temp < 45) return '#eab308'; // yellow
    if (temp < 52) return '#f97316'; // orange
    return '#ef4444'; // red
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
        if (buttonId === 'activate' && this.warmerState === 'liquid') {
          this.discClicked = true;
          this.warmerState = 'crystallizing';
        } else if (buttonId === 'reset') {
          this.resetWarmer();
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
        if (buttonId === 'select_phase') {
          this.warmerType = 'phase';
          this.resetTwist();
        } else if (buttonId === 'select_chemical') {
          this.warmerType = 'chemical';
          this.resetTwist();
        } else if (buttonId === 'activate_twist' && this.twistState === 'inactive') {
          this.twistState = 'active';
        } else if (buttonId === 'reset_twist') {
          this.resetTwist();
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
          // Auto-advance to next app
          if (this.activeAppIndex < this.transferApps.length - 1) {
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

  private resetWarmer(): void {
    this.warmerState = 'liquid';
    this.temperature = ROOM_TEMPERATURE;
    this.crystalProgress = 0;
    this.discClicked = false;
  }

  private resetTwist(): void {
    this.twistState = 'inactive';
    this.twistTemperature = ROOM_TEMPERATURE;
    this.energyRemaining = 100;
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
    this.resetWarmer();
    this.resetTwist();
    this.warmerType = 'phase';
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Update crystallization simulation
    if (this.phase === 'play' && this.warmerState === 'crystallizing') {
      this.crystalProgress += 2 * deltaTime * 60;
      this.temperature = Math.min(MAX_TEMP, this.temperature + deltaTime * 60);

      if (this.crystalProgress >= 100) {
        this.warmerState = 'solid';
      }
    }

    // Cooling after crystallization
    if (this.phase === 'play' && this.warmerState === 'solid' && this.temperature > 25) {
      this.temperature = Math.max(25, this.temperature - 0.3 * deltaTime * 60);
    }

    // Twist simulation
    if ((this.phase === 'twist_play') && this.twistState === 'active') {
      if (this.warmerType === 'chemical') {
        // Chemical warmers heat up slowly and deplete
        if (this.energyRemaining > 80) {
          this.twistTemperature = Math.min(50, this.twistTemperature + 2 * deltaTime * 60);
        } else if (this.energyRemaining > 20) {
          this.twistTemperature = Math.max(35, Math.min(50, this.twistTemperature));
        } else {
          this.twistTemperature = Math.max(20, this.twistTemperature - 0.5 * deltaTime * 60);
        }
        this.energyRemaining = Math.max(0, this.energyRemaining - 0.5 * deltaTime * 60);
        if (this.energyRemaining <= 0) {
          this.twistState = 'depleted';
        }
      } else {
        // Phase change warmers heat quickly, stay at melting point
        if (this.energyRemaining > 10) {
          this.twistTemperature = Math.min(54, this.twistTemperature + 3 * deltaTime * 60);
        } else {
          this.twistTemperature = Math.max(20, this.twistTemperature - 0.5 * deltaTime * 60);
        }
        this.energyRemaining = Math.max(0, this.energyRemaining - 0.8 * deltaTime * 60);
        if (this.energyRemaining <= 0) {
          this.twistState = 'depleted';
        }
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(249, 115, 22, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(234, 179, 8, 0.05)' });

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
    r.roundRect(120, 60, 160, 30, 8, { fill: 'rgba(249, 115, 22, 0.1)' });
    r.text(200, 80, 'THERMAL PHYSICS', { fill: '#f97316', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Magic Hand Warmer', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Discover how a simple click unleashes heat', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Visual representation
    r.text(200, 250, '[warmer] -> [crystal] -> [heat]', { fill: '#f97316', fontSize: 36, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 300, 320, 160, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 335, "It's just a pouch of clear liquid - but", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 360, 'click a tiny metal disc inside, and', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 390, 'INSTANT HEAT!', { fill: '#f97316', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 425, 'Within seconds, the liquid turns solid', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 445, 'and stays hot for an hour.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Feature hints
    r.roundRect(50, 480, 90, 50, 8, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(95, 510, 'Lab', { fill: '#f97316', fontSize: 12, textAnchor: 'middle' });

    r.roundRect(155, 480, 90, 50, 8, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 510, 'Examples', { fill: '#f97316', fontSize: 12, textAnchor: 'middle' });

    r.roundRect(260, 480, 90, 50, 8, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(305, 510, 'Test', { fill: '#f97316', fontSize: 12, textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Discover Phase Change Energy', variant: 'primary' });

    r.setCoachMessage('Explore the physics of latent heat and phase changes!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 95, 340, 110, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'A reusable hand warmer contains sodium', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 148, 'acetate solution at room temperature (20C).', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 175, 'When you flex the disc, it heats to 54C.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 198, 'Where does the heat come from?', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'A hidden battery inside the pouch',
      'A chemical reaction that consumes liquid',
      'Energy released when liquid crystallizes',
      'Friction from flexing the disc'
    ];

    options.forEach((option, i) => {
      const y = 220 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (i === 2) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.prediction) {
        bgColor = 'rgba(249, 115, 22, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 480, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const isCorrect = this.prediction === 2;
      r.text(200, 510, isCorrect ? 'Correct!' : 'The answer: Phase change energy!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 540, 'This is latent heat of fusion - energy stored', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 558, 'in the liquid phase!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test Your Prediction', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Activate the Hand Warmer', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 75, 'Click the disc to trigger crystallization!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Hand warmer visualization
    this.renderHandWarmer(r);

    // State explanation
    r.roundRect(30, 400, 340, 80, 12, { fill: this.warmerState === 'liquid' ? 'rgba(59, 130, 246, 0.2)' : this.warmerState === 'crystallizing' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(16, 185, 129, 0.2)' });

    if (this.warmerState === 'liquid') {
      r.text(200, 425, 'Supercooled State', { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 450, 'The sodium acetate is stable at 20C even though', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 468, "it 'wants' to be solid below 54C!", { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    } else if (this.warmerState === 'crystallizing') {
      r.text(200, 425, 'Crystallization!', { fill: '#eab308', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 450, 'Crystals form rapidly, releasing', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 468, `${LATENT_HEAT_FUSION} kJ/kg of latent heat!`, { fill: '#eab308', fontSize: 12, textAnchor: 'middle' });
    } else {
      r.text(200, 425, 'Fully Crystallized', { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 450, 'All latent heat released. Slowly cooling...', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 468, `Heat above ${MELTING_POINT}C to reset.`, { fill: '#22c55e', fontSize: 11, textAnchor: 'middle' });
    }

    // Control buttons
    if (this.warmerState === 'liquid') {
      r.addButton({ id: 'activate', label: 'Click Disc to Activate', variant: 'primary' });
    } else if (this.warmerState === 'solid') {
      r.addButton({ id: 'reset', label: 'Reset (Simulates Boiling)', variant: 'secondary' });
    }

    r.addButton({ id: 'continue', label: 'Learn the Science', variant: 'primary' });
  }

  private renderHandWarmer(r: CommandRenderer): void {
    // Warmer pouch
    const pouchColor = this.warmerState === 'liquid' ? '#0ea5e9' : this.warmerState === 'crystallizing' ? '#38bdf8' : '#64748b';
    r.ellipse(200, 240, 130, 100, { fill: pouchColor, stroke: '#475569', strokeWidth: 3 });

    // Shimmer effect for liquid
    if (this.warmerState === 'liquid') {
      const shimmerX = 180 + Math.sin(this.animationTime * 2) * 10;
      r.ellipse(shimmerX, 220, 80, 50, { fill: 'rgba(255,255,255,0.2)' });
    }

    // Crystal formations
    if (this.warmerState === 'crystallizing' || this.warmerState === 'solid') {
      const numCrystals = this.warmerState === 'solid' ? 20 : Math.floor(this.crystalProgress / 5);
      for (let i = 0; i < numCrystals; i++) {
        const cx = 100 + Math.random() * 200;
        const cy = 180 + Math.random() * 120;
        const size = 3 + Math.random() * 8;
        r.polygon([
          { x: cx, y: cy - size },
          { x: cx + size * 0.866, y: cy - size / 2 },
          { x: cx + size * 0.866, y: cy + size / 2 },
          { x: cx, y: cy + size },
          { x: cx - size * 0.866, y: cy + size / 2 },
          { x: cx - size * 0.866, y: cy - size / 2 }
        ], { fill: 'rgba(255,255,255,0.8)' });
      }
    }

    // Metal disc
    r.circle(200, 200, 20, { fill: this.discClicked ? '#475569' : '#64748b', stroke: '#334155', strokeWidth: 2 });
    r.circle(200, 200, 15, { fill: 'none', stroke: '#94a3b8', strokeWidth: 1 });
    r.circle(200, 200, 8, { fill: '#94a3b8' });

    if (!this.discClicked && this.warmerState === 'liquid') {
      r.text(200, 250, 'Click disc to activate', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    }

    // Heat waves if warming
    if (this.temperature > 30) {
      for (let i = 0; i < 3; i++) {
        const offset = (this.animationTime * 50 + i * 30) % 60;
        r.arc(150 + i * 50, 140 - offset, 10, Math.PI, 0, { fill: 'none', stroke: this.getTempColor(this.temperature), strokeWidth: 2 });
      }
    }

    // Temperature display
    r.roundRect(320, 170, 60, 130, 8, { fill: '#1f2937', stroke: '#374151' });
    const tempHeight = ((this.temperature - 15) / 45) * 100;
    r.rect(330, 290 - tempHeight, 40, tempHeight, { fill: this.getTempColor(this.temperature) });
    r.text(350, 160, `${this.temperature.toFixed(1)}C`, { fill: '#e2e8f0', fontSize: 12, textAnchor: 'middle' });

    // State label
    r.text(200, 360, this.warmerState === 'liquid' ? 'Supercooled Liquid (Ready)' : this.warmerState === 'crystallizing' ? `Crystallizing... ${this.crystalProgress.toFixed(0)}%` : 'Crystallized (Releasing Heat)', { fill: '#e2e8f0', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 385, `Latent Heat: ${LATENT_HEAT_FUSION} kJ/kg | Melting Point: ${MELTING_POINT}C`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Science of Phase Change', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Latent heat card
    r.roundRect(30, 90, 340, 130, 16, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(200, 120, 'Latent Heat of Fusion', { fill: '#f97316', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(100, 135, 200, 35, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 158, `Lf = ${LATENT_HEAT_FUSION} kJ/kg`, { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });
    r.text(200, 195, 'Energy released during liquid-to-solid change', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 212, 'WITHOUT changing temperature!', { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Supercooling card
    r.roundRect(30, 235, 340, 100, 16, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 265, 'Supercooling', { fill: '#3b82f6', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 295, 'Solution stays liquid below freezing point', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 315, 'because crystals need a "seed" to start!', { fill: '#3b82f6', fontSize: 12, textAnchor: 'middle' });

    // Reusability card
    r.roundRect(30, 350, 340, 100, 16, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 380, 'Reusability', { fill: '#a855f7', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 410, 'Boiling re-dissolves crystals. When cooled', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 430, 'carefully, it becomes supercooled again!', { fill: '#a855f7', fontSize: 12, textAnchor: 'middle' });

    if (this.prediction === 2) {
      r.roundRect(40, 465, 320, 40, 10, { fill: 'rgba(16, 185, 129, 0.2)' });
      r.text(200, 490, 'Your prediction was correct!', { fill: '#22c55e', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    }

    r.addButton({ id: 'continue', label: 'Ready for a Twist?', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'The Comparison Twist', { fill: '#fbbf24', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 90, 340, 110, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 120, 'There are two types of hand warmers:', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 145, 'Phase-change: Sodium acetate (reusable)', { fill: '#3b82f6', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 168, 'Chemical: Iron oxidation (disposable)', { fill: '#f97316', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 195, 'Which lasts LONGER?', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Phase-change - crystals release heat slowly',
      'Chemical - slow oxidation lasts hours',
      'Both last about the same time',
      'Depends entirely on size'
    ];

    options.forEach((option, i) => {
      const y = 215 + i * 55;
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
        bgColor = 'rgba(251, 191, 36, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 460, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const isCorrect = this.twistPrediction === 1;
      r.text(200, 490, isCorrect ? 'Correct!' : 'Chemical warmers last much longer!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 520, 'Chemical: 6-12 hours vs Phase: 30-60 min', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 540, 'Slow oxidation provides sustained heat.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Compare Both Types', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Phase-Change vs Chemical', { fill: '#fbbf24', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 75, 'Compare how the two types behave!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Type selector buttons
    r.roundRect(60, 100, 130, 40, 8, { fill: this.warmerType === 'phase' ? '#3b82f6' : 'rgba(51, 65, 85, 0.5)' });
    r.text(125, 125, 'Phase-Change', { fill: this.warmerType === 'phase' ? '#ffffff' : '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.addButton({ id: 'select_phase', label: '', variant: 'secondary' });

    r.roundRect(210, 100, 130, 40, 8, { fill: this.warmerType === 'chemical' ? '#f97316' : 'rgba(51, 65, 85, 0.5)' });
    r.text(275, 125, 'Chemical', { fill: this.warmerType === 'chemical' ? '#ffffff' : '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.addButton({ id: 'select_chemical', label: '', variant: 'secondary' });

    // Visualization
    this.renderTwistWarmer(r);

    // Comparison info
    r.roundRect(30, 400, 165, 100, 10, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(112, 420, 'Phase-Change', { fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(112, 445, 'Heats quickly (54C)', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(112, 462, 'Lasts ~30-60 min', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(112, 479, 'Reusable (boil to reset)', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(205, 400, 165, 100, 10, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(287, 420, 'Chemical', { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(287, 445, 'Heats slowly (~50C)', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(287, 462, 'Lasts 6-12 hours', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(287, 479, 'Single-use (disposable)', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Control buttons
    if (this.twistState === 'inactive') {
      r.addButton({ id: 'activate_twist', label: 'Activate', variant: 'primary' });
    } else {
      r.addButton({ id: 'reset_twist', label: 'Reset', variant: 'secondary' });
    }

    r.addButton({ id: 'continue', label: 'See Explanation', variant: 'primary' });
  }

  private renderTwistWarmer(r: CommandRenderer): void {
    // Warmer pouch
    const pouchColor = this.warmerType === 'phase'
      ? (this.twistState === 'inactive' ? '#0ea5e9' : this.twistState === 'active' ? '#fbbf24' : '#64748b')
      : (this.twistState === 'inactive' ? '#f97316' : this.twistState === 'active' ? '#ef4444' : '#64748b');

    r.ellipse(200, 240, 100, 70, { fill: pouchColor, stroke: '#475569', strokeWidth: 2 });

    // Heat waves if active
    if (this.twistState === 'active') {
      for (let i = 0; i < 3; i++) {
        const offset = (this.animationTime * 50 + i * 25) % 50;
        r.arc(140 + i * 40, 170 - offset, 8, Math.PI, 0, { fill: 'none', stroke: this.getTempColor(this.twistTemperature), strokeWidth: 2 });
      }
    }

    // Temperature display
    r.text(200, 245, `${this.twistTemperature.toFixed(1)}C`, { fill: '#e2e8f0', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Energy bar
    r.text(200, 295, `Energy Remaining: ${this.energyRemaining.toFixed(0)}%`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.roundRect(100, 305, 200, 20, 5, { fill: '#1f2937' });
    const energyColor = this.energyRemaining > 50 ? '#22c55e' : this.energyRemaining > 20 ? '#f97316' : '#ef4444';
    r.rect(100, 305, this.energyRemaining * 2, 20, { fill: energyColor });

    // Type label
    r.text(200, 350, this.warmerType === 'phase' ? 'Phase-Change (Reusable)' : 'Chemical (Disposable)', { fill: '#e2e8f0', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 372, this.warmerType === 'phase' ? 'Sodium acetate crystallization' : 'Iron + oxygen -> rust + heat', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // State indicator
    const stateColor = this.twistState === 'inactive' ? '#0ea5e9' : this.twistState === 'active' ? '#f97316' : '#64748b';
    r.text(200, 392, this.twistState === 'inactive' ? 'Ready' : this.twistState === 'active' ? 'Heating...' : 'Depleted', { fill: stateColor, fontSize: 11 });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Two Types of Hand Warmers', { fill: '#fbbf24', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Phase-change card
    r.roundRect(30, 85, 340, 140, 16, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 110, 'Phase-Change (Reusable)', { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 135, '* Uses sodium acetate supercooling', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 155, '* Releases heat through crystallization', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 175, '* Reaches 54C quickly, lasts 30-60 min', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 195, '* Can be recharged by boiling', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 215, '* Eco-friendly (hundreds of uses)', { fill: '#3b82f6', fontSize: 11, textAnchor: 'middle' });

    // Chemical card
    r.roundRect(30, 240, 340, 140, 16, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(200, 265, 'Chemical (Disposable)', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 290, '* Uses iron oxidation: 4Fe + 3O2 -> 2Fe2O3', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 310, '* Slow, sustained reaction', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 330, '* Lower temp (~50C) but lasts 6-12 hours', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 350, '* Irreversible (single use)', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 370, '* Better for long outdoor activities', { fill: '#f97316', fontSize: 11, textAnchor: 'middle' });

    // Choice guide
    r.roundRect(30, 395, 340, 70, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 420, 'Choose the Right One', { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 445, 'Quick warmth, short trips: Phase-change', { fill: '#3b82f6', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 462, 'All-day outdoor activity: Chemical', { fill: '#f97316', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 50, 'Phase Change in the Real World', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#f97316';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 50, 8, { fill: bgColor });
      r.text(x + 40, 110, app.icon === 'glove' ? 'Warmer' : app.icon === 'building' ? 'Building' : app.icon === 'package' ? 'Transport' : 'Space', { fontSize: 11, textAnchor: 'middle', fill: isActive ? '#ffffff' : '#94a3b8' });

      if (isCompleted && !isActive) {
        r.text(x + 70, 90, '!', { fill: '#22c55e', fontSize: 12 });
      }

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 145, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 180, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Description (multi-line)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 215;
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

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Got It!', variant: 'secondary' });
    } else {
      r.text(200, 400, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 430, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Continue button
    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take the Quiz', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 50, 'Test Your Knowledge', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 75, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Question
      r.roundRect(25, 95, 350, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 135, question.question, { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 180 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(249, 115, 22, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${option.substring(0, 48)}${option.length > 48 ? '...' : ''}`, { fill: isSelected ? '#f97316' : '#e2e8f0', fontSize: 11 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      // Navigation
      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: '< Prev', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next >', variant: 'secondary' });
      }

      // Submit button
      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      } else {
        r.text(200, 430, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? 'trophy' : 'book', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "Excellent! You understand phase change energy!" : 'Review the concepts and try again!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Your Mastery!', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review and Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Trophy
    r.text(200, 120, 'trophy', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Phase Change Master!', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, "You've mastered latent heat and", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'phase change energy!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { label: 'Latent Heat' },
      { label: 'Supercooling' },
      { label: 'Nucleation' },
      { label: 'Reusability' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 295 + Math.floor(i / 2) * 65;
      r.roundRect(x, y, 140, 50, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 30, concept.label, { fill: '#f97316', fontSize: 12, textAnchor: 'middle' });
    });

    // Final message
    r.roundRect(40, 440, 320, 60, 12, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(200, 475, 'Next time you use a hand warmer, you\'ll', { fill: '#f97316', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 495, 'understand the amazing physics inside!', { fill: '#f97316', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Play Again', variant: 'secondary' });
    r.setCoachMessage('Congratulations on mastering phase change energy!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      warmerState: this.warmerState,
      temperature: this.temperature,
      crystalProgress: this.crystalProgress,
      discClicked: this.discClicked,
      warmerType: this.warmerType,
      twistTemperature: this.twistTemperature,
      twistState: this.twistState,
      energyRemaining: this.energyRemaining,
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
    if (state.warmerState) this.warmerState = state.warmerState as 'liquid' | 'crystallizing' | 'solid';
    if (state.temperature !== undefined) this.temperature = state.temperature as number;
    if (state.crystalProgress !== undefined) this.crystalProgress = state.crystalProgress as number;
    if (state.discClicked !== undefined) this.discClicked = state.discClicked as boolean;
    if (state.warmerType) this.warmerType = state.warmerType as 'phase' | 'chemical';
    if (state.twistTemperature !== undefined) this.twistTemperature = state.twistTemperature as number;
    if (state.twistState) this.twistState = state.twistState as 'inactive' | 'active' | 'depleted';
    if (state.energyRemaining !== undefined) this.energyRemaining = state.energyRemaining as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createHandWarmerGame(sessionId: string): HandWarmerGame {
  return new HandWarmerGame(sessionId);
}
