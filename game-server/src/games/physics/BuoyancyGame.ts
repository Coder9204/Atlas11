import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// BUOYANCY GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Archimedes' Principle - Buoyant Force = ρ_fluid × V_displaced × g
// Objects sink if density > fluid density, float if density < fluid density
// Partially submerged objects: V_submerged/V_total = ρ_object/ρ_fluid
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
const WATER_DENSITY = 1000; // kg/m³
const SEAWATER_DENSITY = 1025; // kg/m³
const OIL_DENSITY = 800; // kg/m³
const MERCURY_DENSITY = 13600; // kg/m³
const GRAVITY = 9.81; // m/s²

// Object densities (PROTECTED)
const OBJECT_DENSITIES = {
  wood: 600,
  ice: 917,
  steel: 7800,
  aluminum: 2700,
  cork: 200,
  rubber: 1100,
  human: 985
};

export class BuoyancyGame extends BaseGame {
  readonly gameType = 'buoyancy';
  readonly gameTitle = "Archimedes' Principle: Why Things Float";

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private objectMaterial: keyof typeof OBJECT_DENSITIES = 'wood';
  private objectVolume = 0.001; // m³ (1 liter)
  private fluidDensity = WATER_DENSITY;
  private fluidType: 'water' | 'seawater' | 'oil' | 'mercury' = 'water';
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
      scenario: "A ship made of steel floats on water. The same steel in a solid block sinks.",
      question: "Why does the hollow steel ship float while solid steel sinks?",
      options: [
        "Ship steel is lighter than block steel",
        "The ship's shape displaces more water than its weight, creating net upward force",
        "Salt water makes steel float",
        "Ships have special floating steel"
      ],
      correctIndex: 1,
      explanation: "The hollow ship has lower average density (steel + air) than water. It displaces a volume of water weighing more than the ship, so buoyancy exceeds weight."
    },
    {
      scenario: "An ice cube floats in a glass of water with 10% of its volume above the surface.",
      question: "What is the density of ice compared to water?",
      options: [
        "Ice density = 0.1 × water density (90 kg/m³)",
        "Ice density = 0.9 × water density (900 kg/m³)",
        "Ice density = 1.0 × water density (equal)",
        "Ice density = 1.1 × water density (higher)"
      ],
      correctIndex: 1,
      explanation: "Fraction submerged = ρ_object/ρ_fluid. If 90% is submerged, ρ_ice/ρ_water = 0.90. Ice density ≈ 917 kg/m³ vs water at 1000 kg/m³."
    },
    {
      scenario: "A swimmer finds it easier to float in the Dead Sea (very salty) than in a freshwater pool.",
      question: "Why does higher salt content make floating easier?",
      options: [
        "Salt makes the human body lighter",
        "Saltwater is denser, so buoyancy force is greater for the same displaced volume",
        "Salt reduces friction between body and water",
        "Dead Sea has more oxygen dissolved"
      ],
      correctIndex: 1,
      explanation: "Dead Sea water is ~1.24 g/cm³ (vs 1.0 for fresh water). Since F_buoyancy = ρ_fluid × V × g, higher fluid density means more buoyancy for same volume displaced."
    },
    {
      scenario: "A helium balloon rises in air but would sink in a vacuum chamber.",
      question: "What provides the buoyant force on the balloon?",
      options: [
        "The helium pushing outward",
        "The string pulling it up",
        "The surrounding air's weight displaced by the balloon",
        "Electromagnetic levitation"
      ],
      correctIndex: 2,
      explanation: "Buoyancy requires a fluid. The balloon displaces air weighing more than (helium + balloon). In vacuum, there's no surrounding fluid to provide buoyancy."
    },
    {
      scenario: "A submarine wants to descend from the surface to a depth of 200 meters.",
      question: "How does a submarine control its buoyancy to dive?",
      options: [
        "It tilts its nose down and uses propellers",
        "It takes on water ballast to increase average density above seawater density",
        "It releases helium from storage tanks",
        "It turns off its engines and gravity pulls it down"
      ],
      correctIndex: 1,
      explanation: "Submarines have ballast tanks. To dive: flood tanks with seawater → average density increases above seawater → net downward force. To surface: blow water out with compressed air."
    },
    {
      scenario: "A block of aluminum (density 2700 kg/m³) is placed in a container of mercury (density 13600 kg/m³).",
      question: "What happens to the aluminum block?",
      options: [
        "It sinks to the bottom",
        "It floats with about 20% submerged",
        "It floats with about 80% submerged",
        "It dissolves in mercury"
      ],
      correctIndex: 1,
      explanation: "Fraction submerged = ρ_object/ρ_fluid = 2700/13600 ≈ 0.20 = 20%. Even aluminum floats on mercury because mercury is so dense!"
    },
    {
      scenario: "When a floating ice cube melts in a glass of water, the water level...",
      question: "What happens to the water level when the ice melts?",
      options: [
        "Rises because melted water takes more volume",
        "Drops because ice expanded when it froze",
        "Stays exactly the same",
        "Rises then falls as temperature equalizes"
      ],
      correctIndex: 2,
      explanation: "The floating ice displaces exactly its weight in water. When it melts, that water fills exactly the volume it was displacing. No level change!"
    },
    {
      scenario: "A fish wants to rise from deep water to the surface.",
      question: "How does a fish adjust its buoyancy?",
      options: [
        "By swimming faster upward",
        "By expanding its swim bladder with gas, lowering average density",
        "By releasing scales",
        "By drinking less water"
      ],
      correctIndex: 1,
      explanation: "Fish have swim bladders filled with gas. To rise: add gas → fish volume increases → average density decreases → positive buoyancy. Opposite to descend."
    },
    {
      scenario: "A rubber duck floats with half its volume submerged in water.",
      question: "What is the duck's average density?",
      options: [
        "250 kg/m³",
        "500 kg/m³",
        "750 kg/m³",
        "1000 kg/m³"
      ],
      correctIndex: 1,
      explanation: "Fraction submerged = ρ_object/ρ_water. If 50% submerged: ρ_duck/1000 = 0.50 → ρ_duck = 500 kg/m³."
    },
    {
      scenario: "Hot air balloons float because the air inside is heated.",
      question: "Why does heating the air make the balloon rise?",
      options: [
        "Hot air is lighter than the balloon material",
        "Heating expands the air, lowering its density below surrounding cool air",
        "Heat creates upward convection currents",
        "Hot air has more energy to push upward"
      ],
      correctIndex: 1,
      explanation: "Heating air at constant pressure makes it expand (PV=nRT). Less mass per volume = lower density. The balloon displaces cool heavy air with hot light air → net buoyancy."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🚢",
      title: "Ship Design",
      tagline: "Steel ships weighing thousands of tons float",
      description: "Ships are hollow to maximize volume while minimizing weight. The displaced water weighs more than the ship. Naval architects calculate 'displacement' in tons as the key design parameter.",
      connection: "A ship floats when: Weight of displaced water = Weight of ship. Hollow shapes maximize V_displaced/Weight ratio."
    },
    {
      icon: "🤿",
      title: "SCUBA Diving",
      tagline: "Neutral buoyancy for effortless diving",
      description: "Divers use buoyancy compensator devices (BCDs) to add or release air, matching their buoyancy to neutral. Proper weighting lets divers hover motionless at any depth.",
      connection: "BCD inflated: ρ_average < ρ_water → rise. BCD deflated: ρ_average > ρ_water → sink. Neutral: hover at any depth."
    },
    {
      icon: "🎈",
      title: "Hot Air Balloons",
      tagline: "Floating on a sea of air",
      description: "The balloon envelope contains hot air (lower density than cool outside air). The total weight (envelope + basket + passengers) is less than the weight of displaced cool air.",
      connection: "Hot air (~0.95 kg/m³ at 100°C) vs cool air (~1.2 kg/m³). Temperature difference creates ~25% density reduction."
    },
    {
      icon: "🐟",
      title: "Fish Swim Bladders",
      tagline: "Adjustable buoyancy at any depth",
      description: "Fish control depth by adjusting gas in their swim bladders. Adding gas increases volume (decreases average density) for rising. Releasing gas does the opposite.",
      connection: "Volume control = density control. By changing V_gas, fish change their average density relative to water."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate buoyant force
  private calculateBuoyantForce(fluidDensity: number, displacedVolume: number): number {
    // F_b = ρ_fluid × V_displaced × g
    return fluidDensity * displacedVolume * GRAVITY;
  }

  // PROTECTED: Calculate object weight
  private calculateWeight(objectDensity: number, volume: number): number {
    return objectDensity * volume * GRAVITY;
  }

  // PROTECTED: Calculate fraction submerged for floating object
  private calculateFractionSubmerged(objectDensity: number, fluidDensity: number): number {
    // For floating: fraction = ρ_object / ρ_fluid
    return Math.min(1, objectDensity / fluidDensity);
  }

  // PROTECTED: Determine float/sink state
  private willFloat(objectDensity: number, fluidDensity: number): boolean {
    return objectDensity < fluidDensity;
  }

  // Get fluid density by type
  private getFluidDensity(type: 'water' | 'seawater' | 'oil' | 'mercury'): number {
    switch (type) {
      case 'water': return WATER_DENSITY;
      case 'seawater': return SEAWATER_DENSITY;
      case 'oil': return OIL_DENSITY;
      case 'mercury': return MERCURY_DENSITY;
    }
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
      if (input.id === 'volume') {
        this.objectVolume = Math.max(0.0001, Math.min(0.01, input.value));
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
        if (buttonId.startsWith('obj_')) {
          const material = buttonId.replace('obj_', '') as keyof typeof OBJECT_DENSITIES;
          if (material in OBJECT_DENSITIES) {
            this.objectMaterial = material;
          }
        } else if (buttonId.startsWith('fluid_')) {
          const fluid = buttonId.replace('fluid_', '') as 'water' | 'seawater' | 'oil' | 'mercury';
          this.fluidType = fluid;
          this.fluidDensity = this.getFluidDensity(fluid);
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
        if (buttonId.startsWith('fluid_')) {
          const fluid = buttonId.replace('fluid_', '') as 'water' | 'seawater' | 'oil' | 'mercury';
          this.fluidType = fluid;
          this.fluidDensity = this.getFluidDensity(fluid);
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
    this.objectMaterial = 'wood';
    this.objectVolume = 0.001;
    this.fluidType = 'water';
    this.fluidDensity = WATER_DENSITY;
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

    // Subtle background orbs (ocean blue theme)
    r.circle(100, 100, 150, { fill: 'rgba(6, 182, 212, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(14, 165, 233, 0.05)' });

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
    r.text(200, 80, 'FLUID MECHANICS', { fill: '#22d3ee', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 125, 'Why Do Ships Float?', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 155, 'Steel sinks, but steel ships float...', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Ship + water illustration
    r.text(200, 240, '🚢', { fontSize: 64, textAnchor: 'middle' });

    // Waves below ship
    r.text(150, 280, '〰️', { fill: '#0ea5e9', fontSize: 24, textAnchor: 'middle' });
    r.text(200, 285, '〰️', { fill: '#0ea5e9', fontSize: 24, textAnchor: 'middle' });
    r.text(250, 280, '〰️', { fill: '#0ea5e9', fontSize: 24, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 310, 320, 130, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 345, 'An aircraft carrier weighs', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 375, '100,000 tons of steel!', { fill: '#22d3ee', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 410, 'How does all that steel float?', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    r.addButton({ id: 'discover', label: "Discover Archimedes' Secret", variant: 'primary' });

    r.setCoachMessage('Eureka! Discover the ancient principle that explains floating!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 95, 340, 85, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'You drop a block of solid steel and', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 145, 'a hollow steel boat into water.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 168, 'What happens to each?', { fill: '#22d3ee', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Both sink - steel is steel',
      'Both float - steel ships always float',
      'Block sinks, boat floats',
      "Block floats, boat sinks (it's hollow)"
    ];

    options.forEach((option, i) => {
      const y = 195 + i * 58;
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
        bgColor = 'rgba(6, 182, 212, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 440, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 2 ? 'Correct!' : 'It depends on average density!';
      r.text(200, 470, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 495, 'Hollow boat has lower average density', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 515, 'than water - so it floats!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Explore Buoyancy', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 40, 'Buoyancy Lab', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const objectDensity = OBJECT_DENSITIES[this.objectMaterial];
    const floats = this.willFloat(objectDensity, this.fluidDensity);
    const fractionSubmerged = this.calculateFractionSubmerged(objectDensity, this.fluidDensity);
    const weight = this.calculateWeight(objectDensity, this.objectVolume);
    const buoyancy = this.calculateBuoyantForce(this.fluidDensity, this.objectVolume * (floats ? fractionSubmerged : 1));

    // Tank visualization
    r.roundRect(50, 65, 300, 200, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Fluid
    const fluidColor = this.fluidType === 'water' ? '#0ea5e9' :
                       this.fluidType === 'seawater' ? '#0284c7' :
                       this.fluidType === 'oil' ? '#fbbf24' : '#94a3b8';
    r.rect(60, 130, 280, 125, { fill: fluidColor });
    r.rect(60, 125, 280, 8, { fill: fluidColor }); // Surface

    // Object
    const objSize = 40;
    const objX = 200 - objSize / 2;
    let objY: number;

    if (floats) {
      // Floating: position based on fraction submerged
      objY = 125 - objSize * (1 - fractionSubmerged);
    } else {
      // Sunk at bottom (with slight bob animation)
      objY = 240 + Math.sin(this.animationTime * 2) * 2;
    }

    const objColor = this.objectMaterial === 'wood' ? '#92400e' :
                     this.objectMaterial === 'ice' ? '#bfdbfe' :
                     this.objectMaterial === 'steel' ? '#64748b' :
                     this.objectMaterial === 'aluminum' ? '#94a3b8' :
                     this.objectMaterial === 'cork' ? '#d4a574' :
                     this.objectMaterial === 'rubber' ? '#1f2937' : '#fcd34d';
    r.rect(objX, objY, objSize, objSize, { fill: objColor });

    // State label
    r.text(200, 280, floats ? 'FLOATING' : 'SUNK', {
      fill: floats ? '#10b981' : '#ef4444',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Data panels
    r.roundRect(30, 295, 165, 55, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(112, 315, 'Object Density', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(112, 335, `${objectDensity} kg/m³`, { fill: '#ffffff', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(205, 295, 165, 55, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(287, 315, 'Fluid Density', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(287, 335, `${this.fluidDensity} kg/m³`, { fill: '#22d3ee', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Force comparison
    r.roundRect(30, 360, 340, 45, 8, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(100, 385, `Weight: ${weight.toFixed(1)} N ↓`, { fill: '#f87171', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 385, floats ? '>' : '<', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(300, 385, `Buoyancy: ${buoyancy.toFixed(1)} N ↑`, { fill: '#10b981', fontSize: 11, textAnchor: 'middle' });

    // Object material buttons
    r.text(50, 420, 'Object:', { fill: '#94a3b8', fontSize: 11 });
    const materials: (keyof typeof OBJECT_DENSITIES)[] = ['cork', 'wood', 'ice', 'human', 'rubber', 'aluminum', 'steel'];
    materials.forEach((mat, i) => {
      const x = 100 + i * 43;
      const isActive = this.objectMaterial === mat;
      r.roundRect(x, 412, 40, 25, 4, { fill: isActive ? '#0891b2' : 'rgba(51, 65, 85, 0.5)' });
      r.text(x + 20, 428, mat.slice(0, 4), { fill: isActive ? '#ffffff' : '#94a3b8', fontSize: 8, textAnchor: 'middle' });
      r.addButton({ id: `obj_${mat}`, label: '', variant: 'secondary' });
    });

    // Fluid buttons
    r.text(50, 455, 'Fluid:', { fill: '#94a3b8', fontSize: 11 });
    const fluids: ('water' | 'seawater' | 'oil' | 'mercury')[] = ['water', 'seawater', 'oil', 'mercury'];
    fluids.forEach((fluid, i) => {
      const x = 100 + i * 75;
      const isActive = this.fluidType === fluid;
      r.roundRect(x, 447, 65, 25, 4, { fill: isActive ? '#0891b2' : 'rgba(51, 65, 85, 0.5)' });
      r.text(x + 32, 463, fluid, { fill: isActive ? '#ffffff' : '#94a3b8', fontSize: 9, textAnchor: 'middle' });
      r.addButton({ id: `fluid_${fluid}`, label: '', variant: 'secondary' });
    });

    r.addButton({ id: 'continue', label: "See Archimedes' Principle", variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 50, "Archimedes' Principle", { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Main formula
    r.roundRect(30, 80, 340, 90, 16, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 105, 'Buoyant Force', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(60, 120, 280, 35, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 142, 'F_b = ρ_fluid × V_displaced × g', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    // Float or sink rule
    r.roundRect(30, 185, 340, 100, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 210, 'Float or Sink?', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(50, 225, 130, 50, 8, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(115, 245, 'ρ_obj < ρ_fluid', { fill: '#10b981', fontSize: 11, textAnchor: 'middle' });
    r.text(115, 265, 'FLOATS!', { fill: '#10b981', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(220, 225, 130, 50, 8, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(285, 245, 'ρ_obj > ρ_fluid', { fill: '#ef4444', fontSize: 11, textAnchor: 'middle' });
    r.text(285, 265, 'SINKS!', { fill: '#ef4444', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Fraction submerged
    r.roundRect(30, 300, 340, 75, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 325, 'For Floating Objects:', { fill: '#fbbf24', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 350, 'Fraction Submerged = ρ_object / ρ_fluid', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 390, 340, 55, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 415, '💡 Ships float because their hollow shape', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 435, 'gives them average density < water!', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Different Fluids', variant: 'secondary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'The Mercury Mystery', { fill: '#94a3b8', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 90, 340, 95, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 118, 'You drop an aluminum block into mercury.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 140, 'Aluminum: 2,700 kg/m³', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 160, 'Mercury: 13,600 kg/m³', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.text(200, 200, 'What happens to the aluminum?', { fill: '#fbbf24', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'It sinks - metal always sinks in liquid',
      'It floats with ~20% submerged',
      'It floats with ~80% submerged',
      'It dissolves in mercury'
    ];

    options.forEach((option, i) => {
      const y = 220 + i * 55;
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
        bgColor = 'rgba(148, 163, 184, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 455, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 1 ? 'Excellent!' : 'Aluminum floats on mercury!';
      r.text(200, 485, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 510, '2700/13600 = 0.20 = 20% submerged!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See It Happen', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 45, 'Density Determines Everything', { fill: '#94a3b8', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Set to aluminum for this demo
    const objectDensity = OBJECT_DENSITIES.aluminum;
    const floats = objectDensity < this.fluidDensity;
    const fractionSubmerged = Math.min(1, objectDensity / this.fluidDensity);

    // Tank visualization
    r.roundRect(50, 70, 300, 180, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Fluid
    const fluidColor = this.fluidType === 'water' ? '#0ea5e9' :
                       this.fluidType === 'seawater' ? '#0284c7' :
                       this.fluidType === 'oil' ? '#fbbf24' : '#9ca3af';
    r.rect(60, 120, 280, 120, { fill: fluidColor });

    // Aluminum block
    const objSize = 35;
    const objX = 200 - objSize / 2;
    let objY: number;

    if (floats) {
      objY = 115 - objSize * (1 - fractionSubmerged);
    } else {
      objY = 200 + Math.sin(this.animationTime * 2) * 2;
    }

    r.rect(objX, objY, objSize, objSize, { fill: '#94a3b8' });
    r.text(200, objY + objSize / 2 + 5, 'Al', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Status
    r.text(200, 265, floats ? `FLOATING (${(fractionSubmerged * 100).toFixed(0)}% submerged)` : 'SUNK', {
      fill: floats ? '#10b981' : '#ef4444',
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Fluid density comparison
    r.roundRect(30, 290, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 315, 'Aluminum density: 2,700 kg/m³', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 340, `${this.fluidType.charAt(0).toUpperCase() + this.fluidType.slice(1)} density: ${this.fluidDensity.toLocaleString()} kg/m³`, { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 360, floats ? '✓ Object floats!' : '✗ Object sinks!', { fill: floats ? '#10b981' : '#ef4444', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Fluid buttons
    r.text(50, 390, 'Try different fluids:', { fill: '#94a3b8', fontSize: 11 });
    const fluids: ('water' | 'seawater' | 'oil' | 'mercury')[] = ['water', 'seawater', 'oil', 'mercury'];
    fluids.forEach((fluid, i) => {
      const x = 50 + i * 85;
      const isActive = this.fluidType === fluid;
      r.roundRect(x, 405, 75, 30, 6, { fill: isActive ? '#0891b2' : 'rgba(51, 65, 85, 0.5)' });
      r.text(x + 37, 423, fluid, { fill: isActive ? '#ffffff' : '#94a3b8', fontSize: 10, textAnchor: 'middle' });
      r.addButton({ id: `fluid_${fluid}`, label: '', variant: 'secondary' });
    });

    r.addButton({ id: 'continue', label: 'Understand the Principle', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 50, 'Fluid Density Matters!', { fill: '#94a3b8', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Comparison table
    r.roundRect(30, 80, 340, 140, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 105, 'Same Object, Different Fluids', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const comparisons = [
      { fluid: 'Oil (800)', result: 'SINKS', color: '#ef4444' },
      { fluid: 'Water (1000)', result: 'SINKS', color: '#ef4444' },
      { fluid: 'Mercury (13600)', result: 'FLOATS (20%)', color: '#10b981' }
    ];

    comparisons.forEach((comp, i) => {
      const y = 125 + i * 28;
      r.text(100, y, comp.fluid, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(280, y, comp.result, { fill: comp.color, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    });

    r.text(200, 210, 'Aluminum (ρ = 2700 kg/m³)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 235, 340, 75, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 260, '💡 Key Insight', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 285, "It's NOT about weight - it's about DENSITY!", { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });

    // Dead Sea example
    r.roundRect(30, 325, 340, 75, 12, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 350, '🌊 Real Example: Dead Sea', { fill: '#22d3ee', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 375, 'Salt makes water denser (1.24 g/cm³)', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 392, "→ Humans float effortlessly!", { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 50, 'Buoyancy in Action', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

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

    r.text(200, 165, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 188, app.tagline, { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });

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
    r.roundRect(40, 320, 320, 55, 10, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 343, 'Physics Connection', { fill: '#22d3ee', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
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
      r.text(200, 50, 'Buoyancy Knowledge Test', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
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
      r.text(200, 185, question.question, { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 210 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(6, 182, 212, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 44, 8, { fill: bgColor });
        r.text(40, y + 26, `${String.fromCharCode(65 + i)}. ${option.substring(0, 48)}${option.length > 48 ? '...' : ''}`,
          { fill: isSelected ? '#22d3ee' : '#e2e8f0', fontSize: 10 });

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
      r.text(200, 250, score >= 7 ? 'Buoyancy expert!' : 'Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Complete Lesson', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Retry', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 120, '🚢', { fontSize: 72, textAnchor: 'middle' });
    r.text(200, 195, 'Buoyancy Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 225, "You've mastered Archimedes' Principle!", { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });

    // Achievement badges
    const achievements = [
      { icon: '⚓', label: "Archimedes'" },
      { icon: '🏊', label: 'Float vs Sink' },
      { icon: '🤿', label: 'Neutral Buoyancy' },
      { icon: '🎈', label: 'Gas Buoyancy' }
    ];

    achievements.forEach((ach, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 260 + Math.floor(i / 2) * 70;
      r.roundRect(x, y, 140, 55, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 22, ach.icon, { fontSize: 18, textAnchor: 'middle' });
      r.text(x + 70, y + 42, ach.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 420, 300, 60, 12, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 445, 'Key Formula', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 468, 'F_b = ρ_fluid × V_displaced × g', { fill: '#ffffff', fontSize: 13, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Eureka! You now understand buoyancy!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      objectMaterial: this.objectMaterial,
      objectVolume: this.objectVolume,
      fluidType: this.fluidType,
      fluidDensity: this.fluidDensity,
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
    if (state.objectMaterial !== undefined) this.objectMaterial = state.objectMaterial as keyof typeof OBJECT_DENSITIES;
    if (state.objectVolume !== undefined) this.objectVolume = state.objectVolume as number;
    if (state.fluidType !== undefined) this.fluidType = state.fluidType as 'water' | 'seawater' | 'oil' | 'mercury';
    if (state.fluidDensity !== undefined) this.fluidDensity = state.fluidDensity as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createBuoyancyGame(sessionId: string): BuoyancyGame {
  return new BuoyancyGame(sessionId);
}
