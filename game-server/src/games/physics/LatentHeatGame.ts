/**
 * Latent Heat Game - Server-side Implementation
 *
 * Physics: Q = mL (Heat = mass × latent heat)
 * Phase changes occur at constant temperature while absorbing/releasing heat
 *
 * Latent heat of fusion (ice): 334 J/g
 * Latent heat of vaporization (water): 2,260 J/g
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
type PhaseState = 'solid' | 'melting' | 'liquid' | 'boiling' | 'gas';

interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  stats: { value: string; label: string }[];
  color: string;
}

// Comprehensive test questions
const testQuestions: TestQuestion[] = [
  {
    scenario: "You're making ice cubes for a party. You put water in the freezer and check on it periodically.",
    question: "Why does the temperature stay at 0°C even though the freezer keeps removing heat?",
    options: [
      { text: "The thermometer is broken", correct: false },
      { text: "Energy is being used to change molecular bonds, not temperature", correct: true },
      { text: "The freezer isn't cold enough", correct: false },
      { text: "Water can't get colder than 0°C", correct: false }
    ],
    explanation: "During a phase change, all added or removed energy goes into breaking or forming molecular bonds rather than changing temperature. This is latent heat - the 'hidden' heat that changes state, not temperature."
  },
  {
    scenario: "A chef notices that a pot of boiling water stays at exactly 100°C no matter how high they turn up the burner.",
    question: "What happens to all that extra heat energy?",
    options: [
      { text: "It escapes through the pot walls", correct: false },
      { text: "It converts water molecules from liquid to gas", correct: true },
      { text: "It heats the air above the pot", correct: false },
      { text: "It's wasted as sound energy", correct: false }
    ],
    explanation: "The extra heat energy is absorbed as latent heat of vaporization (2,260 J/g for water), converting liquid water molecules into steam. This is why boiling water remains at 100°C regardless of heat input."
  },
  {
    scenario: "An engineer is designing a thermal storage system and needs to store maximum heat in minimum space.",
    question: "Why would using phase-change materials be more efficient than just heating water?",
    options: [
      { text: "Phase-change materials are cheaper", correct: false },
      { text: "Water takes too long to heat up", correct: false },
      { text: "Latent heat stores much more energy per gram than temperature change", correct: true },
      { text: "Phase-change materials never melt", correct: false }
    ],
    explanation: "Latent heat of fusion for water (334 J/g) is equivalent to heating water by 80°C! Phase-change materials store enormous amounts of energy during melting/solidifying at constant temperature."
  },
  {
    scenario: "You spill some rubbing alcohol on your skin and it feels cold even though the bottle was at room temperature.",
    question: "What causes the cooling sensation?",
    options: [
      { text: "Alcohol is naturally colder than water", correct: false },
      { text: "The alcohol absorbs heat from your skin to evaporate", correct: true },
      { text: "Chemical reaction with your skin", correct: false },
      { text: "The alcohol creates tiny ice crystals", correct: false }
    ],
    explanation: "Evaporation requires latent heat of vaporization. The alcohol absorbs this heat energy from your skin to change from liquid to gas, cooling your skin in the process - evaporative cooling."
  },
  {
    scenario: "A paramedic warns that steam burns at 100°C are far more dangerous than boiling water burns at the same temperature.",
    question: "Why does steam cause more severe burns?",
    options: [
      { text: "Steam is actually hotter than 100°C", correct: false },
      { text: "Steam releases latent heat when it condenses on skin", correct: true },
      { text: "Steam contains more oxygen", correct: false },
      { text: "Steam penetrates deeper into skin", correct: false }
    ],
    explanation: "When steam condenses on your skin, it releases 2,260 J/g of latent heat of vaporization IN ADDITION to the heat from cooling. This is over 5 times more energy than just the heat content of 100°C water."
  },
  {
    scenario: "During a spring thaw, a lake's ice slowly melts over several days even though air temperatures are consistently above freezing.",
    question: "Why does it take so long for the ice to melt?",
    options: [
      { text: "The air isn't warm enough", correct: false },
      { text: "Water insulates the ice from warm air", correct: false },
      { text: "Melting requires absorbing large amounts of latent heat", correct: true },
      { text: "The lake water is too cold", correct: false }
    ],
    explanation: "Melting ice requires 334 J/g of latent heat - the same energy needed to heat water from 0°C to 80°C! This enormous energy requirement means lakes take days to melt even in warm weather."
  },
  {
    scenario: "A food scientist is developing instant cold packs for athletic injuries without refrigeration.",
    question: "Which principle should they use?",
    options: [
      { text: "Compress air to make it cold", correct: false },
      { text: "Use chemicals that absorb heat when dissolving (endothermic)", correct: true },
      { text: "Use metal plates that conduct heat away", correct: false },
      { text: "Create a vacuum to remove heat", correct: false }
    ],
    explanation: "Cold packs use endothermic dissolution - similar to latent heat absorption. When ammonium nitrate dissolves in water, it absorbs energy from surroundings, creating instant cold without refrigeration."
  },
  {
    scenario: "An HVAC engineer is explaining why air conditioners can cool rooms even when it's hotter outside than inside.",
    question: "What role does the refrigerant's phase change play?",
    options: [
      { text: "It creates cold air directly", correct: false },
      { text: "It absorbs indoor heat by evaporating, releases it outside by condensing", correct: true },
      { text: "It filters out hot air molecules", correct: false },
      { text: "It generates electricity that powers cooling fans", correct: false }
    ],
    explanation: "Refrigerants exploit latent heat: they evaporate (absorbing latent heat) inside where you want cooling, then condense (releasing latent heat) outside. This 'heat pump' moves thermal energy against the temperature gradient."
  },
  {
    scenario: "Mountain climbers notice that water boils at 70°C at high altitude instead of 100°C.",
    question: "What happens to the latent heat of vaporization at lower pressure?",
    options: [
      { text: "It stays exactly the same", correct: false },
      { text: "It increases dramatically", correct: false },
      { text: "It decreases slightly, but still dominates the energy transfer", correct: true },
      { text: "It becomes zero", correct: false }
    ],
    explanation: "At lower pressure, boiling point decreases and latent heat of vaporization decreases slightly. However, phase change still requires substantial energy - food cooks slower at altitude because water boils at lower temperature."
  },
  {
    scenario: "A materials scientist is comparing ice at 0°C with water at 0°C for a cooling application.",
    question: "Which provides more cooling capacity and why?",
    options: [
      { text: "They're equivalent since both are at 0°C", correct: false },
      { text: "Water, because liquid flows better", correct: false },
      { text: "Ice, because melting absorbs latent heat while staying at 0°C", correct: true },
      { text: "Ice, because it's denser than water", correct: false }
    ],
    explanation: "Ice at 0°C has far more cooling capacity because as it melts, it absorbs 334 J/g of latent heat while remaining at 0°C. Water at 0°C can only absorb heat by warming up!"
  }
];

// Transfer applications
const transferApps: TransferApp[] = [
  {
    icon: "snowflake",
    title: "Air Conditioning & Refrigeration",
    short: "HVAC Systems",
    tagline: "Cooling through phase change cycles",
    description: "Modern cooling systems exploit latent heat by cycling refrigerants through evaporation and condensation.",
    connection: "Latent heat of vaporization allows refrigerants to absorb massive amounts of heat at constant temperature.",
    stats: [
      { value: "1.5B", label: "AC units globally" },
      { value: "2,000%", label: "Efficiency gain" },
      { value: "~200 kJ/kg", label: "Heat per cycle" },
      { value: "10%", label: "Global electricity" }
    ],
    color: "#3b82f6"
  },
  {
    icon: "building",
    title: "Thermal Energy Storage",
    short: "PCM Buildings",
    tagline: "Storing heat in phase changes",
    description: "Phase Change Materials (PCMs) embedded in building materials absorb excess heat by melting during the day.",
    connection: "Latent heat stores 5-14x more energy per mass than sensible heating.",
    stats: [
      { value: "200 kJ/kg", label: "Energy density" },
      { value: "30%", label: "HVAC savings" },
      { value: "5-14x", label: "vs concrete" },
      { value: "20-30°C", label: "Melt range" }
    ],
    color: "#10b981"
  },
  {
    icon: "droplet",
    title: "Sweating & Evaporative Cooling",
    short: "Biological Cooling",
    tagline: "Nature's air conditioning",
    description: "When sweat evaporates from skin, it absorbs 2,400 kJ/kg of latent heat, providing powerful cooling.",
    connection: "The enormous latent heat of vaporization of water makes sweating incredibly efficient.",
    stats: [
      { value: "2,260 J/g", label: "Latent heat" },
      { value: "600 W", label: "Max cooling" },
      { value: "2-4 L/hr", label: "Peak sweat" },
      { value: "98.6°F", label: "Body temp" }
    ],
    color: "#f59e0b"
  },
  {
    icon: "flame",
    title: "Steam Power Generation",
    short: "Power Plants",
    tagline: "Harnessing vaporization energy",
    description: "Most electricity worldwide comes from boiling water into steam to spin turbines.",
    connection: "Converting water to steam at 100°C absorbs 2,260 J/g - concentrated energy drives turbines.",
    stats: [
      { value: "80%", label: "Global power" },
      { value: "2,260 J/g", label: "Steam energy" },
      { value: "600°C", label: "Superheated" },
      { value: "45%", label: "Efficiency" }
    ],
    color: "#8b5cf6"
  }
];

export class LatentHeatGame extends BaseGame {
  readonly gameType = 'latent_heat';
  readonly gameTitle = 'Latent Heat';

  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private selectedApp = 0;
  private testIndex = 0;
  private testScore = 0;
  private testAnswers: (number | null)[] = new Array(10).fill(null);
  private showExplanation = false;

  // Simulation state
  private isSimulating = false;
  private temperature = -20;
  private heatAdded = 0;
  private phaseState: PhaseState = 'solid';
  private heatingPower = 50;
  private meltProgress = 0;
  private boilProgress = 0;
  private lastSimTime = 0;

  // Twist simulation
  private twistSimulating = false;
  private steamEnergy = 0;
  private waterEnergy = 0;

  constructor(sessionId: string) {
    super(sessionId);
  }

  initialize(config: SessionConfig): void {
    super.initialize(config);
    if (config.resumePhase) {
      this.phase = config.resumePhase as GamePhase;
    }
  }

  handleInput(input: UserInput): void {
    if (input.type === 'button_click') {
      this.handleButtonClick(input.id);
    } else if (input.type === 'slider_change') {
      this.handleSliderChange(input.id, input.value ?? 0);
    }
  }

  private handleButtonClick(id: string): void {
    // Navigation
    if (id === 'nav_predict') {
      this.phase = 'predict';
      this.emitCoachEvent('phase_started', { phase: 'predict' });
    } else if (id === 'nav_play') {
      this.phase = 'play';
    } else if (id === 'nav_review') {
      this.phase = 'review';
    } else if (id === 'nav_twist_predict') {
      this.phase = 'twist_predict';
    } else if (id === 'nav_twist_play') {
      this.phase = 'twist_play';
    } else if (id === 'nav_twist_review') {
      this.phase = 'twist_review';
    } else if (id === 'nav_transfer') {
      this.phase = 'transfer';
    } else if (id === 'nav_test') {
      this.phase = 'test';
    } else if (id === 'nav_mastery') {
      this.phase = 'mastery';
    }

    // Predictions
    else if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
    } else if (id.startsWith('twist_predict_')) {
      this.twistPrediction = id.replace('twist_predict_', '');
    }

    // Simulation controls
    else if (id === 'start_heat') {
      this.isSimulating = true;
      this.lastSimTime = Date.now();
    } else if (id === 'pause_heat') {
      this.isSimulating = false;
    } else if (id === 'reset_sim') {
      this.resetSimulation();
    }

    // Twist simulation
    else if (id === 'start_twist_sim') {
      this.twistSimulating = true;
      this.steamEnergy = 0;
      this.waterEnergy = 0;
    }

    // Transfer apps
    else if (id.startsWith('app_')) {
      this.selectedApp = parseInt(id.replace('app_', ''));
    }

    // Test answers
    else if (id.startsWith('answer_')) {
      const answerIndex = parseInt(id.replace('answer_', ''));
      this.handleTestAnswer(answerIndex);
    } else if (id === 'next_question') {
      if (this.testIndex < testQuestions.length - 1) {
        this.testIndex++;
        this.showExplanation = false;
      } else {
        this.phase = 'mastery';
      }
    } else if (id === 'retry_test') {
      this.testIndex = 0;
      this.testScore = 0;
      this.testAnswers = new Array(10).fill(null);
      this.showExplanation = false;
      this.phase = 'test';
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'heating_power') {
      this.heatingPower = value;
    }
  }

  private resetSimulation(): void {
    this.temperature = -20;
    this.heatAdded = 0;
    this.phaseState = 'solid';
    this.meltProgress = 0;
    this.boilProgress = 0;
    this.isSimulating = false;
  }

  private handleTestAnswer(optionIndex: number): void {
    if (this.testAnswers[this.testIndex] !== null) return;

    this.testAnswers[this.testIndex] = optionIndex;
    const isCorrect = testQuestions[this.testIndex].options[optionIndex].correct;

    if (isCorrect) {
      this.testScore++;
    }

    this.showExplanation = true;
    this.emitCoachEvent('test_answer_submitted', {
      questionIndex: this.testIndex,
      correct: isCorrect,
      score: this.testScore
    });
  }

  update(_deltaTime: number): void {
    // Run heating simulation
    if (this.isSimulating) {
      const now = Date.now();
      const dt = (now - this.lastSimTime) / 1000;
      this.lastSimTime = now;

      // Constants for water (100g sample)
      const mass = 100;
      const specificHeatIce = 2.09;
      const specificHeatWater = 4.18;
      const latentHeatFusion = 334;
      const latentHeatVaporization = 2260;

      const heatRate = this.heatingPower * 10;
      const heatThisFrame = heatRate * dt;
      this.heatAdded += heatThisFrame;

      // Heating ice
      if (this.temperature < 0) {
        this.phaseState = 'solid';
        const dT = heatThisFrame / (mass * specificHeatIce);
        this.temperature = Math.min(this.temperature + dT, 0);
      }
      // Melting
      else if (this.temperature >= 0 && this.meltProgress < 1) {
        this.phaseState = 'melting';
        const energyToMelt = mass * latentHeatFusion;
        this.meltProgress += heatThisFrame / energyToMelt;
        if (this.meltProgress >= 1) {
          this.temperature = 0.1;
          this.emitCoachEvent('phase_change_occurred', { from: 'solid', to: 'liquid' });
        }
      }
      // Heating water
      else if (this.temperature >= 0 && this.temperature < 100 && this.meltProgress >= 1) {
        this.phaseState = 'liquid';
        const dT = heatThisFrame / (mass * specificHeatWater);
        this.temperature = Math.min(this.temperature + dT, 100);
      }
      // Boiling
      else if (this.temperature >= 100 && this.boilProgress < 1) {
        this.phaseState = 'boiling';
        const energyToBoil = mass * latentHeatVaporization;
        this.boilProgress += heatThisFrame / energyToBoil;
        if (this.boilProgress >= 1) {
          this.phaseState = 'gas';
          this.isSimulating = false;
          this.emitCoachEvent('phase_change_occurred', { from: 'liquid', to: 'gas' });
        }
      }
    }

    // Twist simulation
    if (this.twistSimulating) {
      this.steamEnergy = Math.min(this.steamEnergy + 2.5, 100);
      this.waterEnergy = Math.min(this.waterEnergy + 0.4, 100);

      if (this.steamEnergy >= 100) {
        this.twistSimulating = false;
      }
    }
  }

  getCurrentPhase(): string {
    return this.phase;
  }

  render(): GameFrame {
    const r = new CommandRenderer(700, 350);

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

    r.setProgress({ id: 'phase', current: this.getPhaseIndex() + 1, total: 10 });

    return r.toFrame(this.nextFrame());
  }

  private getPhaseIndex(): number {
    const phases: GamePhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    return phases.indexOf(this.phase);
  }

  private renderHook(r: CommandRenderer): void {
    // Background
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    // Title
    r.text(350, 40, 'THE MYSTERY OF THE WATCHED POT', {
      fill: '#f59e0b',
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 70, 'Where does all that energy go?', {
      fill: '#94a3b8',
      fontSize: 14,
      textAnchor: 'middle'
    });

    // Pot illustration
    r.rect(280, 100, 140, 80, { fill: '#374151', rx: 10 });
    r.rect(290, 110, 120, 60, { fill: '#22d3ee', rx: 5 }); // Water

    // Bubbles
    for (let i = 0; i < 5; i++) {
      const bx = 310 + i * 20;
      r.circle(bx, 140, 4, { fill: '#ffffff', opacity: 0.6 });
    }

    // Flame
    r.ellipse(350, 200, 40, 20, { fill: '#f59e0b' });
    r.ellipse(350, 195, 25, 15, { fill: '#ef4444' });

    // Temperature display
    r.rect(480, 100, 60, 80, { fill: '#1e293b', rx: 5 });
    r.text(510, 140, '100°C', {
      fill: '#22d3ee',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(510, 160, 'CONSTANT', {
      fill: '#f59e0b',
      fontSize: 10,
      textAnchor: 'middle'
    });

    // Hook text
    r.text(350, 240, 'No matter how high you turn the flame, the water', {
      fill: '#e2e8f0',
      fontSize: 14,
      textAnchor: 'middle'
    });
    r.text(350, 260, 'refuses to get hotter than 100°C!', {
      fill: '#f59e0b',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 290, 'The burner is pumping in massive amounts of heat energy...', {
      fill: '#94a3b8',
      fontSize: 12,
      textAnchor: 'middle'
    });

    r.addButton({ id: 'nav_predict', label: 'Discover the Hidden Heat', variant: 'primary' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 30, 'MAKE YOUR PREDICTION', {
      fill: '#ffffff',
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 55, "We're heating ice from -20°C continuously.", {
      fill: '#94a3b8',
      fontSize: 14,
      textAnchor: 'middle'
    });
    r.text(350, 75, 'What will the temperature graph look like?', {
      fill: '#94a3b8',
      fontSize: 14,
      textAnchor: 'middle'
    });

    const options = [
      { id: 'A', text: 'Temperature rises steadily in a straight line' },
      { id: 'B', text: 'Temperature rises, then has flat plateaus' },
      { id: 'C', text: 'Temperature rises faster and faster' },
      { id: 'D', text: 'Temperature oscillates up and down' }
    ];

    options.forEach((opt, i) => {
      const y = 110 + i * 50;
      const isSelected = this.prediction === opt.id;

      r.rect(100, y, 500, 40, {
        fill: isSelected ? '#1e40af' : '#1e293b',
        rx: 8,
        stroke: isSelected ? '#3b82f6' : '#334155',
        strokeWidth: 2
      });

      r.circle(130, y + 20, 12, {
        fill: isSelected ? '#3b82f6' : '#374151'
      });
      r.text(130, y + 20, opt.id, {
        fill: '#ffffff',
        fontSize: 12,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });

      r.text(155, y + 20, opt.text, {
        fill: '#e2e8f0',
        fontSize: 13
      });

      r.addButton({ id: `predict_${opt.id}`, label: opt.id, variant: 'secondary' });
    });

    if (this.prediction) {
      r.addButton({ id: 'nav_play', label: 'Test Your Prediction', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 25, 'HEAT THE ICE', {
      fill: '#ffffff',
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Container
    r.rect(50, 60, 200, 130, { fill: '#374151', rx: 5 });

    // Phase visualization
    if (this.phaseState === 'solid') {
      // Ice cubes
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          r.rect(60 + col * 45, 75 + row * 35, 35, 28, {
            fill: '#bae6fd',
            rx: 3
          });
        }
      }
    } else if (this.phaseState === 'melting') {
      // Partial ice with water
      const waterLevel = 120 + this.meltProgress * 40;
      r.rect(55, waterLevel, 190, 190 - waterLevel, {
        fill: '#22d3ee',
        opacity: 0.8
      });
      // Remaining ice
      for (let i = 0; i < 3; i++) {
        r.rect(70 + i * 55, 80, 40, 30, {
          fill: '#bae6fd',
          opacity: 0.8 - this.meltProgress * 0.5,
          rx: 3
        });
      }
    } else if (this.phaseState === 'liquid' || this.phaseState === 'boiling') {
      r.rect(55, 80, 190, 100, { fill: '#22d3ee', opacity: 0.85 });
      if (this.phaseState === 'boiling') {
        // Bubbles
        for (let i = 0; i < 6; i++) {
          r.circle(80 + i * 25, 130 - (Date.now() % 1000) / 20, 4 + i % 3, {
            fill: '#ffffff',
            opacity: 0.6
          });
        }
      }
    } else if (this.phaseState === 'gas') {
      // Steam clouds
      for (let i = 0; i < 4; i++) {
        r.ellipse(100 + i * 40, 100, 25, 15, {
          fill: '#ffffff',
          opacity: 0.4
        });
      }
    }

    // Flame when simulating
    if (this.isSimulating) {
      r.ellipse(100, 210, 25, 15, { fill: '#f59e0b' });
      r.ellipse(150, 210, 25, 15, { fill: '#f59e0b' });
      r.ellipse(200, 210, 25, 15, { fill: '#f59e0b' });
    }

    // Heating curve (right side)
    this.renderHeatingCurve(r, 300, 50, 350, 160);

    // Stats
    r.rect(300, 220, 100, 45, { fill: '#1e3a5f', rx: 5 });
    r.text(350, 235, 'PHASE', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(350, 255, this.phaseState.toUpperCase(), {
      fill: '#3b82f6',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.rect(410, 220, 100, 45, { fill: '#3d1f0d', rx: 5 });
    r.text(460, 235, 'TEMP', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(460, 255, `${this.temperature.toFixed(1)}°C`, {
      fill: '#f59e0b',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.rect(520, 220, 100, 45, { fill: '#2e1065', rx: 5 });
    r.text(570, 235, 'HEAT', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(570, 255, `${(this.heatAdded / 1000).toFixed(1)} kJ`, {
      fill: '#a855f7',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Controls
    r.addSlider({
      id: 'heating_power',
      label: `Heating Power: ${this.heatingPower}W`,
      value: this.heatingPower,
      min: 20,
      max: 100,
      step: 5
    });

    if (this.isSimulating) {
      r.addButton({ id: 'pause_heat', label: 'Pause', variant: 'secondary' });
    } else {
      r.addButton({ id: 'start_heat', label: 'Start Heating', variant: 'primary' });
    }
    r.addButton({ id: 'reset_sim', label: 'Reset', variant: 'secondary' });

    if (this.phaseState === 'gas') {
      r.addButton({ id: 'nav_review', label: 'See What Happened', variant: 'primary' });
    }
  }

  private renderHeatingCurve(r: CommandRenderer, x: number, y: number, width: number, height: number): void {
    // Background
    r.rect(x, y, width, height, { fill: '#1e293b', rx: 5 });

    // Axes
    r.line(x + 30, y + height - 20, x + width - 10, y + height - 20, {
      stroke: '#64748b',
      strokeWidth: 1
    });
    r.line(x + 30, y + 10, x + 30, y + height - 20, {
      stroke: '#64748b',
      strokeWidth: 1
    });

    // Labels
    r.text(x + width / 2, y + height - 5, 'Heat Added (Q)', {
      fill: '#94a3b8',
      fontSize: 9,
      textAnchor: 'middle'
    });

    // Curve (simplified)
    const curveX = x + 35;
    const curveW = width - 50;
    const curveY = y + 15;
    const curveH = height - 45;

    // Draw heating curve
    const path = [
      `M${curveX} ${curveY + curveH}`,           // Start at ice
      `L${curveX + curveW * 0.1} ${curveY + curveH * 0.8}`, // Heat ice
      `L${curveX + curveW * 0.3} ${curveY + curveH * 0.8}`, // Melting plateau
      `L${curveX + curveW * 0.5} ${curveY + curveH * 0.2}`, // Heat water
      `L${curveX + curveW * 0.85} ${curveY + curveH * 0.2}`, // Boiling plateau
      `L${curveX + curveW} ${curveY}`             // Steam
    ].join(' ');

    r.path(path, { stroke: '#22d3ee', strokeWidth: 2, fill: 'none' });

    // Phase labels
    r.text(curveX + curveW * 0.05, curveY + curveH * 0.9, 'Ice', {
      fill: '#3b82f6',
      fontSize: 8
    });
    r.text(curveX + curveW * 0.2, curveY + curveH * 0.7, 'Melt', {
      fill: '#22d3ee',
      fontSize: 8
    });
    r.text(curveX + curveW * 0.4, curveY + curveH * 0.5, 'Water', {
      fill: '#06b6d4',
      fontSize: 8
    });
    r.text(curveX + curveW * 0.7, curveY + curveH * 0.3, 'Boil', {
      fill: '#f59e0b',
      fontSize: 8
    });
    r.text(curveX + curveW * 0.95, curveY + curveH * 0.1, 'Steam', {
      fill: '#ef4444',
      fontSize: 8
    });

    // Current position indicator
    const posX = this.getCurrentCurveX(curveX, curveW);
    const posY = this.getCurrentCurveY(curveY, curveH);
    r.circle(posX, posY, 5, { fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 });
  }

  private getCurrentCurveX(baseX: number, width: number): number {
    if (this.temperature < 0) return baseX + (this.temperature + 20) / 20 * width * 0.1;
    if (this.phaseState === 'melting') return baseX + width * 0.1 + this.meltProgress * width * 0.2;
    if (this.temperature <= 100 && this.phaseState === 'liquid') return baseX + width * 0.3 + (this.temperature / 100) * width * 0.2;
    if (this.phaseState === 'boiling') return baseX + width * 0.5 + this.boilProgress * width * 0.35;
    return baseX + width * 0.95;
  }

  private getCurrentCurveY(baseY: number, height: number): number {
    if (this.temperature < 0) return baseY + height - (this.temperature + 20) / 20 * height * 0.2;
    if (this.phaseState === 'melting') return baseY + height * 0.8;
    if (this.temperature <= 100 && this.phaseState === 'liquid') return baseY + height * 0.8 - (this.temperature / 100) * height * 0.6;
    if (this.phaseState === 'boiling') return baseY + height * 0.2;
    return baseY;
  }

  private renderReview(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 30, 'THE HEATING CURVE EXPLAINED', {
      fill: '#ffffff',
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const correctPrediction = this.prediction === 'B';
    r.text(350, 55, correctPrediction
      ? 'Your prediction was correct! Temperature plateaus during phase changes.'
      : 'The answer was B - temperature pauses at phase changes!', {
      fill: correctPrediction ? '#22c55e' : '#f59e0b',
      fontSize: 13,
      textAnchor: 'middle'
    });

    // Latent Heat box
    r.rect(50, 75, 300, 110, { fill: '#1e1b4b', rx: 8 });
    r.text(200, 95, 'LATENT HEAT: The "Hidden" Heat', {
      fill: '#a78bfa',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(200, 120, 'During phase changes, heat energy is', {
      fill: '#e2e8f0',
      fontSize: 12,
      textAnchor: 'middle'
    });
    r.text(200, 138, 'absorbed but doesn\'t raise temperature.', {
      fill: '#e2e8f0',
      fontSize: 12,
      textAnchor: 'middle'
    });

    r.rect(80, 150, 240, 25, { fill: '#312e81', rx: 4 });
    r.text(200, 167, 'Q = m × L', {
      fill: '#c4b5fd',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Values
    r.rect(370, 75, 145, 50, { fill: '#1e3a5f', rx: 6 });
    r.text(442, 93, 'Heat of Fusion', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(442, 115, '334 J/g', { fill: '#3b82f6', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(525, 75, 145, 50, { fill: '#3d1f0d', rx: 6 });
    r.text(597, 93, 'Heat of Vaporization', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(597, 115, '2,260 J/g', { fill: '#f59e0b', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Key insight
    r.rect(50, 200, 600, 70, { fill: '#052e16', rx: 8 });
    r.text(350, 220, 'KEY INSIGHT', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 240, 'Breaking molecular bonds requires energy but doesn\'t change temperature.', {
      fill: '#e2e8f0',
      fontSize: 12,
      textAnchor: 'middle'
    });
    r.text(350, 258, 'Ice crystals must break apart; water molecules must separate completely.', {
      fill: '#94a3b8',
      fontSize: 11,
      textAnchor: 'middle'
    });

    r.addButton({ id: 'nav_twist_predict', label: 'Ready for a Twist?', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 30, 'THE BURN PARADOX', {
      fill: '#ef4444',
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 60, 'A paramedic says: "Steam burns at 100°C are far more', {
      fill: '#e2e8f0',
      fontSize: 13,
      textAnchor: 'middle'
    });
    r.text(350, 80, 'dangerous than boiling water burns at 100°C."', {
      fill: '#e2e8f0',
      fontSize: 13,
      textAnchor: 'middle'
    });

    r.text(350, 110, 'Both are at exactly 100°C. Why would steam be worse?', {
      fill: '#f59e0b',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const options = [
      { id: 'A', text: 'Steam is actually hotter than 100°C' },
      { id: 'B', text: 'Steam releases latent heat when it condenses on skin' },
      { id: 'C', text: 'Steam covers more skin area' },
      { id: 'D', text: 'Steam moves faster than water' }
    ];

    options.forEach((opt, i) => {
      const y = 135 + i * 45;
      const isSelected = this.twistPrediction === opt.id;

      r.rect(100, y, 500, 38, {
        fill: isSelected ? '#581c87' : '#1e293b',
        rx: 6,
        stroke: isSelected ? '#a855f7' : '#334155',
        strokeWidth: 2
      });

      r.circle(125, y + 19, 10, { fill: isSelected ? '#a855f7' : '#374151' });
      r.text(125, y + 19, opt.id, {
        fill: '#ffffff',
        fontSize: 11,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });

      r.text(145, y + 19, opt.text, {
        fill: '#e2e8f0',
        fontSize: 12
      });

      r.addButton({ id: `twist_predict_${opt.id}`, label: opt.id, variant: 'secondary' });
    });

    if (this.twistPrediction) {
      r.addButton({ id: 'nav_twist_play', label: 'See the Energy Comparison', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 25, 'ENERGY RELEASED TO SKIN', {
      fill: '#ffffff',
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Steam side
    r.rect(50, 55, 280, 180, { fill: '#1e293b', rx: 8 });
    r.text(190, 75, 'STEAM (100°C)', {
      fill: '#ef4444',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Steam energy bar
    r.rect(70, 95, 240, 100, { fill: '#374151', rx: 4 });
    r.rect(70, 195 - this.steamEnergy, 240, this.steamEnergy, {
      fill: '#ef4444',
      rx: 4
    });

    r.text(190, 210, 'Latent + Sensible', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(190, 228, `${(this.steamEnergy * 26.78).toFixed(0)} J/g`, {
      fill: '#ef4444',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Water side
    r.rect(370, 55, 280, 180, { fill: '#1e293b', rx: 8 });
    r.text(510, 75, 'WATER (100°C)', {
      fill: '#3b82f6',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Water energy bar
    r.rect(390, 95, 240, 100, { fill: '#374151', rx: 4 });
    r.rect(390, 195 - this.waterEnergy, 240, this.waterEnergy, {
      fill: '#3b82f6',
      rx: 4
    });

    r.text(510, 210, 'Sensible Only', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(510, 228, `${(this.waterEnergy * 4.18).toFixed(0)} J/g`, {
      fill: '#3b82f6',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Comparison
    if (this.steamEnergy > 50) {
      const ratio = ((this.steamEnergy * 26.78) / (this.waterEnergy * 4.18 || 1)).toFixed(1);
      r.text(350, 150, `${ratio}x more!`, {
        fill: '#10b981',
        fontSize: 18,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });
    }

    // Explanation
    r.rect(50, 250, 600, 50, { fill: '#450a0a', rx: 6 });
    r.text(350, 270, 'When 1g steam condenses: 2,260 J (latent) + 418 J (sensible) = 2,678 J!', {
      fill: '#fca5a5',
      fontSize: 12,
      textAnchor: 'middle'
    });
    r.text(350, 288, 'That\'s 6.4x more energy than water at the same temperature.', {
      fill: '#ef4444',
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    if (!this.twistSimulating && this.steamEnergy < 100) {
      r.addButton({ id: 'start_twist_sim', label: 'Compare Energy Transfer', variant: 'primary' });
    }

    if (this.steamEnergy >= 100) {
      r.addButton({ id: 'nav_twist_review', label: 'Understand the Danger', variant: 'primary' });
    }
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 30, 'THE LATENT HEAT DANGER', {
      fill: '#ef4444',
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const correctTwist = this.twistPrediction === 'B';
    r.text(350, 55, correctTwist
      ? 'You got it! Steam releases latent heat when condensing.'
      : 'The answer was B - condensation releases latent heat!', {
      fill: correctTwist ? '#22c55e' : '#f59e0b',
      fontSize: 13,
      textAnchor: 'middle'
    });

    // Math breakdown
    r.rect(50, 75, 300, 90, { fill: '#450a0a', rx: 8 });
    r.text(200, 95, 'Steam at 100°C to Skin:', {
      fill: '#fca5a5',
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(200, 120, '2,260 J/g (latent) + 418 J/g (sensible)', {
      fill: '#ef4444',
      fontSize: 11,
      textAnchor: 'middle'
    });
    r.text(200, 145, '= 2,678 J/g', {
      fill: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.rect(370, 75, 280, 90, { fill: '#1e3a5f', rx: 8 });
    r.text(510, 95, 'Water at 100°C to Skin:', {
      fill: '#93c5fd',
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(510, 120, '418 J/g (sensible only)', {
      fill: '#3b82f6',
      fontSize: 11,
      textAnchor: 'middle'
    });
    r.text(510, 145, '= 418 J/g', {
      fill: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Result
    r.rect(200, 180, 300, 50, { fill: '#581c87', rx: 8 });
    r.text(350, 210, '6.4x more energy from steam!', {
      fill: '#ffffff',
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Applications
    r.rect(50, 245, 600, 60, { fill: '#052e16', rx: 8 });
    r.text(350, 265, 'REAL-WORLD APPLICATIONS', { fill: '#22c55e', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 285, 'Autoclaves use steam for sterilization • Steam engines harness condensation • Industrial burns worst from steam', {
      fill: '#94a3b8',
      fontSize: 10,
      textAnchor: 'middle'
    });

    r.addButton({ id: 'nav_transfer', label: 'See Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 25, 'LATENT HEAT IN ACTION', {
      fill: '#ffffff',
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // App selector tabs
    transferApps.forEach((app, i) => {
      const tx = 90 + i * 140;
      const isSelected = this.selectedApp === i;

      r.rect(tx - 60, 45, 120, 30, {
        fill: isSelected ? app.color : '#1e293b',
        rx: 15
      });
      r.text(tx, 63, app.short, {
        fill: '#ffffff',
        fontSize: 11,
        fontWeight: isSelected ? 'bold' : 'normal',
        textAnchor: 'middle'
      });

      r.addButton({ id: `app_${i}`, label: app.short, variant: 'secondary' });
    });

    const app = transferApps[this.selectedApp];

    // App content
    r.rect(50, 85, 600, 175, { fill: '#1e293b', rx: 10 });

    r.text(350, 110, app.title, {
      fill: app.color,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(350, 130, app.tagline, {
      fill: '#94a3b8',
      fontSize: 12,
      textAnchor: 'middle'
    });

    r.text(350, 155, app.description, {
      fill: '#e2e8f0',
      fontSize: 11,
      textAnchor: 'middle'
    });

    // Connection
    r.rect(70, 170, 560, 35, { fill: '#374151', rx: 5 });
    r.text(350, 192, app.connection, {
      fill: '#94a3b8',
      fontSize: 10,
      textAnchor: 'middle'
    });

    // Stats
    app.stats.forEach((stat, i) => {
      const sx = 120 + i * 130;
      r.rect(sx - 50, 215, 100, 35, { fill: '#0f172a', rx: 5 });
      r.text(sx, 230, stat.value, {
        fill: app.color,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });
      r.text(sx, 245, stat.label, {
        fill: '#64748b',
        fontSize: 8,
        textAnchor: 'middle'
      });
    });

    r.addButton({ id: 'nav_test', label: 'Test Your Knowledge', variant: 'primary' });
  }

  private renderTest(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    const question = testQuestions[this.testIndex];
    const answered = this.testAnswers[this.testIndex] !== null;

    // Header
    r.text(100, 20, 'KNOWLEDGE CHECK', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold' });
    r.text(600, 20, `${this.testIndex + 1}/${testQuestions.length}`, {
      fill: '#94a3b8',
      fontSize: 12,
      textAnchor: 'end'
    });

    // Progress bar
    r.rect(50, 35, 600, 6, { fill: '#374151', rx: 3 });
    r.rect(50, 35, 600 * ((this.testIndex + (answered ? 1 : 0)) / testQuestions.length), 6, {
      fill: '#a855f7',
      rx: 3
    });

    // Scenario
    r.rect(50, 50, 600, 40, { fill: '#1e3a5f', rx: 6 });
    r.text(350, 75, question.scenario, {
      fill: '#93c5fd',
      fontSize: 11,
      textAnchor: 'middle'
    });

    // Question
    r.text(350, 110, question.question, {
      fill: '#ffffff',
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Options
    question.options.forEach((opt, i) => {
      const y = 130 + i * 38;
      const isSelected = this.testAnswers[this.testIndex] === i;
      const isCorrect = opt.correct;

      let bgColor = '#1e293b';
      let borderColor = '#334155';

      if (answered) {
        if (isCorrect) {
          bgColor = '#052e16';
          borderColor = '#22c55e';
        } else if (isSelected) {
          bgColor = '#450a0a';
          borderColor = '#ef4444';
        }
      } else if (isSelected) {
        bgColor = '#1e1b4b';
        borderColor = '#a855f7';
      }

      r.rect(80, y, 540, 32, { fill: bgColor, rx: 6, stroke: borderColor, strokeWidth: 2 });

      const letter = String.fromCharCode(65 + i);
      r.circle(100, y + 16, 10, {
        fill: answered && isCorrect ? '#22c55e' : answered && isSelected ? '#ef4444' : '#374151'
      });
      r.text(100, y + 16, answered ? (isCorrect ? '✓' : isSelected ? '✗' : letter) : letter, {
        fill: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });

      r.text(120, y + 16, opt.text, {
        fill: '#e2e8f0',
        fontSize: 11
      });

      if (!answered) {
        r.addButton({ id: `answer_${i}`, label: letter, variant: 'secondary' });
      }
    });

    // Explanation
    if (this.showExplanation) {
      r.rect(50, 285, 600, 40, { fill: '#581c87', rx: 6 });
      r.text(350, 308, question.explanation.slice(0, 100) + '...', {
        fill: '#e9d5ff',
        fontSize: 10,
        textAnchor: 'middle'
      });

      r.addButton({
        id: 'next_question',
        label: this.testIndex < testQuestions.length - 1 ? 'Next Question' : 'See Results',
        variant: 'primary'
      });
    }

    // Score
    r.text(350, 340, `Score: ${this.testScore}/${this.testIndex + (answered ? 1 : 0)}`, {
      fill: '#64748b',
      fontSize: 11,
      textAnchor: 'middle'
    });
  }

  private renderMastery(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    const percentage = Math.round((this.testScore / testQuestions.length) * 100);
    const passed = percentage >= 70;

    r.text(350, 40, passed ? 'LATENT HEAT MASTERED!' : 'KEEP LEARNING!', {
      fill: passed ? '#22c55e' : '#f59e0b',
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Score display
    r.rect(250, 60, 200, 60, { fill: '#1e293b', rx: 10 });
    r.text(350, 95, `${this.testScore}/${testQuestions.length} (${percentage}%)`, {
      fill: '#ffffff',
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Key concepts
    r.rect(50, 135, 600, 130, { fill: '#1e1b4b', rx: 10 });
    r.text(350, 155, 'KEY CONCEPTS MASTERED', {
      fill: '#a78bfa',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const concepts = [
      'Latent heat changes phase without changing temperature',
      'Heat of fusion (334 J/g) for melting/freezing',
      'Heat of vaporization (2,260 J/g) for boiling/condensing',
      'Why steam burns are more dangerous than water burns'
    ];

    concepts.forEach((concept, i) => {
      r.text(100, 180 + i * 20, `✓ ${concept}`, {
        fill: '#e2e8f0',
        fontSize: 11
      });
    });

    // Formula
    r.rect(200, 275, 300, 50, { fill: '#1e293b', rx: 8 });
    r.text(350, 295, 'Q = m × L', {
      fill: '#a78bfa',
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(350, 315, 'Heat = mass × latent heat', {
      fill: '#94a3b8',
      fontSize: 10,
      textAnchor: 'middle'
    });

    if (!passed) {
      r.addButton({ id: 'retry_test', label: 'Try Again', variant: 'primary' });
    }
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      selectedApp: this.selectedApp,
      testIndex: this.testIndex,
      testScore: this.testScore,
      testAnswers: this.testAnswers,
      showExplanation: this.showExplanation,
      isSimulating: this.isSimulating,
      temperature: this.temperature,
      heatAdded: this.heatAdded,
      phaseState: this.phaseState,
      heatingPower: this.heatingPower,
      meltProgress: this.meltProgress,
      boilProgress: this.boilProgress,
      twistSimulating: this.twistSimulating,
      steamEnergy: this.steamEnergy,
      waterEnergy: this.waterEnergy
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.prediction !== undefined) this.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.selectedApp !== undefined) this.selectedApp = state.selectedApp as number;
    if (state.testIndex !== undefined) this.testIndex = state.testIndex as number;
    if (state.testScore !== undefined) this.testScore = state.testScore as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as (number | null)[];
    if (state.showExplanation !== undefined) this.showExplanation = state.showExplanation as boolean;
    if (state.isSimulating !== undefined) this.isSimulating = state.isSimulating as boolean;
    if (state.temperature !== undefined) this.temperature = state.temperature as number;
    if (state.heatAdded !== undefined) this.heatAdded = state.heatAdded as number;
    if (state.phaseState !== undefined) this.phaseState = state.phaseState as PhaseState;
    if (state.heatingPower !== undefined) this.heatingPower = state.heatingPower as number;
    if (state.meltProgress !== undefined) this.meltProgress = state.meltProgress as number;
    if (state.boilProgress !== undefined) this.boilProgress = state.boilProgress as number;
    if (state.twistSimulating !== undefined) this.twistSimulating = state.twistSimulating as boolean;
    if (state.steamEnergy !== undefined) this.steamEnergy = state.steamEnergy as number;
    if (state.waterEnergy !== undefined) this.waterEnergy = state.waterEnergy as number;
  }
}

export function createLatentHeatGame(sessionId: string): LatentHeatGame {
  return new LatentHeatGame(sessionId);
}
