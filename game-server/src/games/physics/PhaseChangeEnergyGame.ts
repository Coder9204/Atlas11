import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// PHASE CHANGE ENERGY GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Latent heat during phase transitions
// During melting: Q = mLf (Latent heat of fusion)
// During vaporization: Q = mLv (Latent heat of vaporization)
// Temperature remains CONSTANT during phase changes
// All energy goes into breaking molecular bonds, not kinetic energy
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
const LATENT_FUSION = 334; // J/g for water
const LATENT_VAPORIZATION = 2260; // J/g for water
const SPECIFIC_HEAT_ICE = 2.09; // J/g·°C
const SPECIFIC_HEAT_WATER = 4.18; // J/g·°C
const SPECIFIC_HEAT_STEAM = 2.01; // J/g·°C

export class PhaseChangeEnergyGame extends BaseGame {
  readonly gameType = 'phase_change_energy';
  readonly gameTitle = 'Phase Changes & Latent Heat';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private temperature = -20; // Starting temperature in °C
  private energyAdded = 0;
  private matterPhase: 'solid' | 'melting' | 'liquid' | 'boiling' | 'gas' = 'solid';
  private isHeating = false;
  private animationTime = 0;

  // Twist: Cooling simulation
  private coolingTemp = 120;
  private coolingPhase: 'gas' | 'condensing' | 'liquid' | 'freezing' | 'solid' = 'gas';
  private isCooling = false;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "You put an ice cube at exactly 0°C into a drink at room temperature. The ice starts melting.",
      question: "During the entire melting process, what happens to the ice's temperature?",
      options: [
        "It gradually increases from 0°C toward room temperature",
        "It stays at exactly 0°C until all the ice has melted",
        "It fluctuates as heat is absorbed and released",
        "It decreases below 0°C due to evaporative cooling"
      ],
      correctIndex: 1,
      explanation: "During a phase change, temperature remains constant! All absorbed energy goes into breaking molecular bonds (latent heat), not increasing kinetic energy (temperature)."
    },
    {
      scenario: "Water requires 334 J/g to melt (Lf) and only 4.18 J/g to raise its temperature by 1°C.",
      question: "How much energy does it take to melt 100g of ice at 0°C compared to heating 100g of water from 0°C to 80°C?",
      options: [
        "Melting requires less energy (about half)",
        "They require approximately the same energy",
        "Melting requires about the same as heating 80°C",
        "Melting requires 10× more energy"
      ],
      correctIndex: 2,
      explanation: "Melting: Q = mLf = 100g × 334 J/g = 33,400 J. Heating water: Q = mcΔT = 100g × 4.18 × 80 = 33,440 J. Nearly identical!"
    },
    {
      scenario: "A pot of water is boiling vigorously on a stove at sea level. You turn the heat up even higher.",
      question: "What happens to the water's temperature and the rate of boiling?",
      options: [
        "Both temperature and boiling rate increase",
        "Temperature increases but boiling rate stays the same",
        "Temperature stays at 100°C but boiling rate increases",
        "Neither changes — there's a maximum boiling rate"
      ],
      correctIndex: 2,
      explanation: "At sea level, water cannot exceed 100°C while boiling — extra energy goes into vaporization, not temperature increase."
    },
    {
      scenario: "Water's latent heat of vaporization (2260 J/g) is about 7× higher than its latent heat of fusion (334 J/g).",
      question: "Why does vaporization require so much more energy than melting?",
      options: [
        "Because boiling occurs at a higher temperature",
        "Vaporization must completely separate molecules that melting only loosens",
        "Because gas takes up more volume than liquid",
        "Because of atmospheric pressure pushing down on the liquid"
      ],
      correctIndex: 1,
      explanation: "Melting only loosens the rigid crystal structure. Vaporization must completely overcome ALL intermolecular attractions."
    },
    {
      scenario: "On a hot day, you're sweating. As sweat evaporates from your skin, you feel cooler.",
      question: "Explain the physics of why evaporation cools you down.",
      options: [
        "Sweat is colder than your body temperature",
        "Evaporation requires latent heat, which is drawn from your skin",
        "Air movement from evaporation creates a cooling breeze",
        "Water on skin reflects heat radiation"
      ],
      correctIndex: 1,
      explanation: "Evaporation requires latent heat (2260 J/g for water). This energy is drawn from your skin's surface, cooling it down."
    },
    {
      scenario: "A refrigerator uses a refrigerant that evaporates inside the fridge and condenses outside.",
      question: "How does this phase-change cycle move heat from a cold space to a warm space?",
      options: [
        "Compressing gas raises its temperature above room temperature, allowing heat release",
        "Direct heat conduction through metal pipes",
        "Fans blow hot air out of the fridge",
        "Chemical reactions generate and absorb heat"
      ],
      correctIndex: 0,
      explanation: "The refrigerant evaporates at low pressure (inside fridge) absorbing heat, then is compressed raising temperature above room temp to release heat outside."
    },
    {
      scenario: "You're making ice cream by mixing cream with salt and ice. The mixture gets much colder than 0°C.",
      question: "Why does adding salt to ice lower the temperature below freezing?",
      options: [
        "Salt reacts with ice in an endothermic reaction",
        "Salt dissolving absorbs heat and lowers the melting point, causing more melting which absorbs more heat",
        "Salt acts as an insulator, preventing heat from entering",
        "Salt increases thermal conductivity of the mixture"
      ],
      correctIndex: 1,
      explanation: "Salt lowers ice's melting point (colligative property). At 0°C, salty ice wants to melt, drawing latent heat from surroundings."
    },
    {
      scenario: "Clouds form when water vapor in rising air condenses into tiny droplets, releasing latent heat.",
      question: "How does the release of latent heat affect cloud formation and weather?",
      options: [
        "It stops cloud formation by warming the air",
        "Released heat makes air more buoyant, causing it to rise faster and condense more",
        "It has no significant effect on weather",
        "It cools the surrounding air, creating downdrafts"
      ],
      correctIndex: 1,
      explanation: "When water vapor condenses, it releases latent heat (2260 J/g), warming the air. This creates a positive feedback loop driving thunderstorms."
    },
    {
      scenario: "In the heating curve for water, there are two flat plateaus where temperature doesn't increase.",
      question: "What is physically happening during these plateaus?",
      options: [
        "The system is in thermal equilibrium with surroundings",
        "Energy breaks molecular bonds (phase change) instead of increasing kinetic energy",
        "The substance has reached its maximum heat capacity",
        "Heat is being lost to the environment at the same rate it's added"
      ],
      correctIndex: 1,
      explanation: "During phase changes, energy goes into breaking intermolecular bonds (potential energy), not increasing molecular speed (kinetic energy)."
    },
    {
      scenario: "Consider the complete energy budget to convert 1g of ice at -20°C to steam at 120°C.",
      question: "Which statement correctly orders the energy requirements from smallest to largest?",
      options: [
        "Heating ice < Melting < Heating water < Boiling < Heating steam",
        "Heating steam < Heating ice < Melting < Heating water < Boiling",
        "Heating ice ≈ Heating steam < Melting << Heating water < Boiling",
        "All stages require approximately equal energy"
      ],
      correctIndex: 2,
      explanation: "Ice: 42J. Melting: 334J. Water: 418J. Boiling: 2260J. Steam: 40J. Boiling dominates with 5× more than heating water!"
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🧊",
      title: "Ice Cooling Drinks",
      tagline: "Why ice works better than cold water",
      description: "Ice at 0°C absorbs 334 J/g while melting without changing temperature. This latent heat absorption is why ice cools drinks far more effectively than the same mass of cold water.",
      connection: "The phase change absorbs enormous energy (latent heat of fusion) while maintaining 0°C, providing extended cooling."
    },
    {
      icon: "❄️",
      title: "Refrigeration Cycles",
      tagline: "Phase changes power your fridge",
      description: "Refrigerators use phase change cycles: refrigerant evaporates inside (absorbing heat) and condenses outside (releasing heat), effectively pumping heat from cold to warm.",
      connection: "Evaporation absorbs Lv, condensation releases it. Compression raises temperature for outdoor heat release."
    },
    {
      icon: "💨",
      title: "Sweating & Evaporative Cooling",
      tagline: "Your body's cooling system",
      description: "Sweat evaporation removes 2260 J/g from your skin. This massive latent heat of vaporization is why sweating is such an effective cooling mechanism.",
      connection: "Each gram of sweat that evaporates removes 2260 J of heat from your body - much more than just heating water!"
    },
    {
      icon: "🌩️",
      title: "Thunderstorm Energy",
      tagline: "Latent heat drives severe weather",
      description: "When water vapor condenses in rising air, it releases latent heat that warms the air, making it rise faster and condense more water - a powerful positive feedback loop.",
      connection: "Hurricanes and thunderstorms are heat engines powered by the enormous latent heat of vaporization released during condensation."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate energy required for phase changes
  private calculateEnergyForPhase(mass: number, startTemp: number, endTemp: number): number {
    let totalEnergy = 0;
    let currentTemp = startTemp;

    // Heat ice from startTemp to 0°C
    if (currentTemp < 0 && endTemp > currentTemp) {
      const tempChange = Math.min(0, endTemp) - currentTemp;
      totalEnergy += mass * SPECIFIC_HEAT_ICE * tempChange;
      currentTemp = Math.min(0, endTemp);
    }

    // Melt ice at 0°C
    if (currentTemp === 0 && endTemp > 0) {
      totalEnergy += mass * LATENT_FUSION;
    }

    // Heat water from 0°C to 100°C
    if (currentTemp <= 0 && endTemp > 0) {
      currentTemp = 0;
    }
    if (currentTemp >= 0 && currentTemp < 100 && endTemp > currentTemp) {
      const tempChange = Math.min(100, endTemp) - Math.max(0, currentTemp);
      totalEnergy += mass * SPECIFIC_HEAT_WATER * tempChange;
    }

    // Vaporize water at 100°C
    if (endTemp > 100) {
      totalEnergy += mass * LATENT_VAPORIZATION;
    }

    // Heat steam above 100°C
    if (endTemp > 100) {
      totalEnergy += mass * SPECIFIC_HEAT_STEAM * (endTemp - 100);
    }

    return totalEnergy;
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
      if (input.id === 'heat_control') {
        this.isHeating = input.value > 50;
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
          this.resetHeatingSimulation();
        }
        break;

      case 'play':
        if (buttonId === 'toggle_heat') {
          this.isHeating = !this.isHeating;
        } else if (buttonId === 'reset_sim') {
          this.resetHeatingSimulation();
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
          this.resetCoolingSimulation();
        }
        break;

      case 'twist_play':
        if (buttonId === 'toggle_cool') {
          this.isCooling = !this.isCooling;
        } else if (buttonId === 'reset_sim') {
          this.resetCoolingSimulation();
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

  private resetHeatingSimulation(): void {
    this.temperature = -20;
    this.energyAdded = 0;
    this.matterPhase = 'solid';
    this.isHeating = false;
  }

  private resetCoolingSimulation(): void {
    this.coolingTemp = 120;
    this.coolingPhase = 'gas';
    this.isCooling = false;
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
    this.resetHeatingSimulation();
    this.resetCoolingSimulation();
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Update heating simulation
    if (this.phase === 'play' && this.isHeating) {
      this.energyAdded += 5;

      if (this.energyAdded < 42) {
        this.matterPhase = 'solid';
        this.temperature = -20 + (this.energyAdded / 42) * 20;
      } else if (this.energyAdded < 42 + LATENT_FUSION) {
        this.matterPhase = 'melting';
        this.temperature = 0;
      } else if (this.energyAdded < 42 + LATENT_FUSION + 418) {
        this.matterPhase = 'liquid';
        this.temperature = ((this.energyAdded - 42 - LATENT_FUSION) / 418) * 100;
      } else if (this.energyAdded < 42 + LATENT_FUSION + 418 + LATENT_VAPORIZATION) {
        this.matterPhase = 'boiling';
        this.temperature = 100;
      } else {
        this.matterPhase = 'gas';
        this.temperature = 100 + ((this.energyAdded - 42 - LATENT_FUSION - 418 - LATENT_VAPORIZATION) / 40) * 20;
        if (this.energyAdded > 3200) this.isHeating = false;
      }
    }

    // Update cooling simulation
    if (this.phase === 'twist_play' && this.isCooling) {
      this.coolingTemp -= 0.5;

      if (this.coolingTemp > 100) {
        this.coolingPhase = 'gas';
      } else if (this.coolingTemp >= 99.5) {
        this.coolingPhase = 'condensing';
        this.coolingTemp = 100; // Hold during condensation
      } else if (this.coolingTemp > 0) {
        this.coolingPhase = 'liquid';
      } else if (this.coolingTemp >= -0.5) {
        this.coolingPhase = 'freezing';
        this.coolingTemp = 0; // Hold during freezing
      } else {
        this.coolingPhase = 'solid';
        if (this.coolingTemp < -20) this.isCooling = false;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(59, 130, 246, 0.05)' });
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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(59, 130, 246, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#60a5fa', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'Phase Changes & Latent Heat', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Why does ice cool better than cold water?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Ice cube icon
    r.text(200, 250, '🧊', { fontSize: 64, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 300, 320, 160, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 335, 'Ice at 0°C cools your drink FAR more', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 360, 'effectively than water at 0°C!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 400, 'Where does all that extra', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 420, 'cooling power come from?', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 450, 'The answer: LATENT HEAT', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Explore Phase Changes', variant: 'primary' });

    r.setCoachMessage('Discover why temperature stays constant during melting and boiling!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'You add heat to ice at exactly 0°C.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'The ice starts to melt...', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 185, 'What happens to the temperature?', { fill: '#60a5fa', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Temperature gradually rises as ice melts',
      'Temperature stays at 0°C until fully melted',
      'Temperature drops below 0°C briefly',
      'Temperature jumps immediately to water temp'
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
        bgColor = 'rgba(59, 130, 246, 0.3)';
      }

      r.roundRect(30, y, 340, 55, 10, { fill: bgColor });
      r.text(50, y + 32, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 500, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Exactly right!' : 'Temperature stays constant during phase changes!';
      r.text(200, 530, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 560, "All energy goes into breaking bonds, not raising temp!", { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See It Happen', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Heating Water Through Phases', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Phase visualization
    r.roundRect(20, 70, 360, 200, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Container
    r.roundRect(50, 100, 200, 140, 8, { fill: 'rgba(15, 23, 42, 0.8)' });

    // Matter state visualization
    const phaseColor = this.matterPhase === 'solid' ? '#06b6d4' :
                       this.matterPhase === 'melting' ? '#22d3ee' :
                       this.matterPhase === 'liquid' ? '#3b82f6' :
                       this.matterPhase === 'boiling' ? '#a855f7' : '#f472b6';

    // Draw molecules based on phase
    for (let i = 0; i < 20; i++) {
      const baseX = 80 + (i % 5) * 35;
      const baseY = 130 + Math.floor(i / 5) * 25;
      let x = baseX;
      let y = baseY;

      if (this.matterPhase === 'solid') {
        x += Math.sin(this.animationTime * 10 + i) * 2;
        y += Math.cos(this.animationTime * 10 + i) * 2;
      } else if (this.matterPhase === 'melting' || this.matterPhase === 'liquid') {
        x += Math.sin(this.animationTime * 5 + i) * 8;
        y += Math.cos(this.animationTime * 5 + i) * 8;
      } else {
        x += Math.sin(this.animationTime * 3 + i) * 20;
        y += Math.cos(this.animationTime * 3 + i) * 20 - 30;
      }

      r.circle(x, y, 6, { fill: phaseColor });
    }

    // Heat source when heating
    if (this.isHeating) {
      r.roundRect(60, 245, 180, 15, 4, { fill: '#f97316' });
      r.text(150, 258, '🔥', { fontSize: 20, textAnchor: 'middle' });
    }

    // Temperature and phase display
    r.roundRect(270, 100, 100, 140, 8, { fill: 'rgba(15, 23, 42, 0.8)' });
    r.text(320, 125, 'Temperature', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(320, 155, `${this.temperature.toFixed(1)}°C`, { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(320, 185, 'Phase', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(320, 210, this.matterPhase.toUpperCase(), { fill: phaseColor, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Heating curve
    r.roundRect(20, 280, 360, 160, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 305, 'Heating Curve', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Draw heating curve axes
    r.line(50, 420, 350, 420, { stroke: '#475569', strokeWidth: 1 });
    r.line(50, 320, 50, 420, { stroke: '#475569', strokeWidth: 1 });
    r.text(200, 435, 'Energy Added', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });

    // Ideal curve (dashed)
    r.path('M 50 420 L 80 380 L 140 380 L 180 340 L 290 340 L 330 320', { stroke: '#475569', strokeWidth: 1, fill: 'none' });

    // Progress curve
    const progress = Math.min(1, this.energyAdded / 3100);
    const progressX = 50 + progress * 280;
    r.line(50, 420, progressX, this.temperature < 0 ? 420 - (this.temperature + 20) * 2 :
           this.temperature === 0 ? 380 :
           this.temperature < 100 ? 380 - this.temperature * 0.4 : 340,
           { stroke: '#3b82f6', strokeWidth: 3 });

    // Phase labels on curve
    r.text(65, 395, 'Ice', { fill: '#06b6d4', fontSize: 8 });
    r.text(110, 370, 'Melting', { fill: '#22d3ee', fontSize: 8 });
    r.text(160, 355, 'Water', { fill: '#3b82f6', fontSize: 8 });
    r.text(240, 330, 'Boiling', { fill: '#a855f7', fontSize: 8 });

    // Controls
    r.addButton({ id: 'toggle_heat', label: this.isHeating ? 'Stop Heating' : 'Add Heat', variant: 'primary' });
    r.addButton({ id: 'reset_sim', label: 'Reset', variant: 'secondary' });

    if (this.energyAdded > 500) {
      r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'primary' });
    }

    r.setCoachMessage('Notice how temperature stays FLAT during melting and boiling - all energy breaks bonds!');
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Science of Latent Heat', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Latent heat card
    r.roundRect(30, 85, 340, 150, 16, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 115, 'Latent Heat', { fill: '#60a5fa', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Formula boxes
    r.roundRect(50, 135, 130, 40, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(115, 160, 'Q = mLf', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(115, 175, 'Fusion', { fill: '#06b6d4', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(220, 135, 130, 40, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(285, 160, 'Q = mLv', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(285, 175, 'Vaporization', { fill: '#a855f7', fontSize: 10, textAnchor: 'middle' });

    // Values
    r.text(200, 215, 'Water: Lf = 334 J/g | Lv = 2260 J/g', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Key insight card
    r.roundRect(30, 250, 340, 100, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 280, 'Key Insight', { fill: '#34d399', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 310, 'During phase changes, ALL energy goes into', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 330, 'breaking bonds, NOT increasing temperature!', { fill: '#34d399', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Why it matters
    r.roundRect(30, 365, 340, 120, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 395, 'Why Ice Cools So Well', { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 425, '1g of ice absorbs 334 J while melting', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 445, 'at CONSTANT 0°C temperature.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 470, "That's 80x more than warming water 1°C!", { fill: '#fbbf24', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Cooling', variant: 'secondary' });

    r.setCoachMessage("Now let's see what happens when we REMOVE heat...");
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist: Cooling', { fill: '#a855f7', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'Steam at 120°C starts cooling down.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'It reaches 100°C and begins condensing...', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 180, 'What happens to the temperature?', { fill: '#a855f7', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Temperature continues dropping smoothly',
      'Temperature stays at 100°C during condensation',
      'Temperature drops faster during condensation',
      'Temperature rises briefly from released heat'
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 60;
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
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 1 ? 'Exactly right!' : 'Temperature stays constant during condensation too!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 530, 'Condensation RELEASES latent heat,', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 550, 'keeping temperature constant at 100°C.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Cooling', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Cooling: Steam to Ice', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Phase visualization
    r.roundRect(20, 70, 360, 180, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Temperature display
    r.text(200, 100, `${this.coolingTemp.toFixed(1)}°C`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });

    const phaseColor = this.coolingPhase === 'gas' ? '#f472b6' :
                       this.coolingPhase === 'condensing' ? '#a855f7' :
                       this.coolingPhase === 'liquid' ? '#3b82f6' :
                       this.coolingPhase === 'freezing' ? '#22d3ee' : '#06b6d4';
    r.text(200, 130, this.coolingPhase.toUpperCase(), { fill: phaseColor, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Phase indicator bar
    r.roundRect(50, 160, 300, 20, 4, { fill: 'rgba(15, 23, 42, 0.6)' });
    const progress = (120 - this.coolingTemp) / 145; // 120 to -25
    r.roundRect(50, 160, Math.max(10, progress * 300), 20, 4, { fill: phaseColor });

    // Labels
    r.text(50, 195, '120°C', { fill: '#64748b', fontSize: 10 });
    r.text(200, 195, '0°C', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });
    r.text(350, 195, '-25°C', { fill: '#64748b', fontSize: 10, textAnchor: 'end' });

    // Phase change indicators
    if (this.coolingPhase === 'condensing') {
      r.roundRect(50, 210, 300, 30, 8, { fill: 'rgba(168, 85, 247, 0.3)' });
      r.text(200, 230, 'CONDENSING: Releasing latent heat at 100°C', { fill: '#a855f7', fontSize: 11, textAnchor: 'middle' });
    } else if (this.coolingPhase === 'freezing') {
      r.roundRect(50, 210, 300, 30, 8, { fill: 'rgba(34, 211, 238, 0.3)' });
      r.text(200, 230, 'FREEZING: Releasing latent heat at 0°C', { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });
    }

    // Cooling curve
    r.roundRect(20, 260, 360, 150, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 285, 'Cooling Curve (Reverse of Heating)', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Key insight
    r.roundRect(40, 310, 320, 80, 10, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 335, 'Phase changes work BOTH ways!', { fill: '#a855f7', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 360, 'Heating: absorb latent heat', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 380, 'Cooling: release latent heat', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Controls
    r.addButton({ id: 'toggle_cool', label: this.isCooling ? 'Stop Cooling' : 'Remove Heat', variant: 'secondary' });
    r.addButton({ id: 'reset_sim', label: 'Reset', variant: 'secondary' });

    if (this.coolingTemp < 50) {
      r.addButton({ id: 'continue', label: 'See Applications', variant: 'primary' });
    }
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Latent Heat: Both Directions', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Heating card
    r.roundRect(25, 85, 170, 140, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(110, 110, '🔥 Heating', { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 135, 'ABSORBS', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 155, 'latent heat', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 185, 'Solid → Liquid', { fill: '#3b82f6', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 205, 'Liquid → Gas', { fill: '#a855f7', fontSize: 10, textAnchor: 'middle' });

    // Cooling card
    r.roundRect(205, 85, 170, 140, 12, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(290, 110, '❄️ Cooling', { fill: '#06b6d4', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 135, 'RELEASES', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 155, 'latent heat', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 185, 'Gas → Liquid', { fill: '#a855f7', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 205, 'Liquid → Solid', { fill: '#3b82f6', fontSize: 10, textAnchor: 'middle' });

    // Energy conservation
    r.roundRect(25, 240, 350, 100, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 270, 'Energy Conservation', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 300, 'The energy released during freezing/condensing', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 320, 'equals energy absorbed during melting/boiling!', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Key takeaway
    r.roundRect(40, 355, 320, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 385, 'This is how refrigerators work!', { fill: '#ffffff', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 408, 'Evaporate inside (absorb heat) → Condense outside (release heat)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

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
      if (isActive) bgColor = '#3b82f6';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.tagline, { fill: '#60a5fa', fontSize: 11, textAnchor: 'middle' });

    // Description (multi-line)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 230;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Physics connection
    r.roundRect(40, 320, 320, 70, 10, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 345, 'Physics Connection', { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 370, app.connection.substring(0, 50) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

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
      r.roundRect(25, 100, 350, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
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
      r.text(200, 200, question.question.substring(0, 50), { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 230 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${option.substring(0, 42)}${option.length > 42 ? '...' : ''}`, { fill: isSelected ? '#60a5fa' : '#e2e8f0', fontSize: 10 });

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
        r.text(200, 485, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "Excellent! You've mastered latent heat!" : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 160, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'Latent heat: Q = mL',
        'Temperature constant during phase changes',
        'Lf = 334 J/g, Lv = 2260 J/g for water',
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
    r.text(200, 120, '🏆', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Latent Heat Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand phase changes', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'and energy transformations!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '🧊', label: 'Latent Heat Fusion' },
      { icon: '💨', label: 'Latent Heat Vaporization' },
      { icon: '📊', label: 'Heating Curves' },
      { icon: '❄️', label: 'Refrigeration' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 295 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 460, 300, 70, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 488, 'Key Formulas', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 515, 'Q = mL (phase change) | Q = mcΔT (heating)', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering phase changes and latent heat!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      temperature: this.temperature,
      energyAdded: this.energyAdded,
      matterPhase: this.matterPhase,
      isHeating: this.isHeating,
      coolingTemp: this.coolingTemp,
      coolingPhase: this.coolingPhase,
      isCooling: this.isCooling,
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
    if (state.temperature !== undefined) this.temperature = state.temperature as number;
    if (state.energyAdded !== undefined) this.energyAdded = state.energyAdded as number;
    if (state.matterPhase !== undefined) this.matterPhase = state.matterPhase as typeof this.matterPhase;
    if (state.isHeating !== undefined) this.isHeating = state.isHeating as boolean;
    if (state.coolingTemp !== undefined) this.coolingTemp = state.coolingTemp as number;
    if (state.coolingPhase !== undefined) this.coolingPhase = state.coolingPhase as typeof this.coolingPhase;
    if (state.isCooling !== undefined) this.isCooling = state.isCooling as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createPhaseChangeEnergyGame(sessionId: string): PhaseChangeEnergyGame {
  return new PhaseChangeEnergyGame(sessionId);
}
