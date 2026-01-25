import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// HEAT TRANSFER CAPACITY GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Fourier's Law of Heat Conduction: Q/t = -kA(dT/dx)
// Specific Heat Capacity: Q = mc*deltaT
// Thermal conductivity (k) determines heat flow rate
// Specific heat (c) determines energy needed per degree change
// ============================================================================

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number; // PROTECTED: Never sent to client
}

interface TransferApp {
  id: string;
  title: string;
  icon: string;
  subtitle: string;
  description: string;
  formula: string;
  realExample: string;
}

interface Material {
  k: number;
  name: string;
  color: string;
  description: string;
}

interface SpecificHeat {
  c: number;
  name: string;
  color: string;
}

// Physics constants (PROTECTED - never sent to client)
const MATERIALS: Record<string, Material> = {
  copper: { k: 401, name: 'Copper', color: '#f97316', description: 'Excellent conductor - used in cookware, electronics' },
  aluminum: { k: 237, name: 'Aluminum', color: '#94a3b8', description: 'Good conductor - lightweight, used in heat sinks' },
  steel: { k: 50, name: 'Steel', color: '#64748b', description: 'Moderate conductor - durable, used in construction' },
  glass: { k: 1.05, name: 'Glass', color: '#22d3ee', description: 'Poor conductor - used for insulation, windows' },
  wood: { k: 0.12, name: 'Wood', color: '#a3e635', description: 'Excellent insulator - why wooden spoons stay cool' }
};

const SPECIFIC_HEATS: Record<string, SpecificHeat> = {
  water: { c: 4.18, name: 'Water', color: '#3b82f6' },
  oil: { c: 2.0, name: 'Cooking Oil', color: '#eab308' },
  aluminum: { c: 0.90, name: 'Aluminum', color: '#94a3b8' },
  iron: { c: 0.45, name: 'Iron', color: '#64748b' }
};

export class HeatTransferCapacityGame extends BaseGame {
  readonly gameType = 'heat_transfer_capacity';
  readonly gameTitle = 'Heat Transfer & Capacity';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Heat conduction simulation
  private selectedMaterial: keyof typeof MATERIALS = 'copper';
  private heatSource = 100; // Celsius
  private barTemperatures: number[] = Array(20).fill(25);
  private isHeating = false;
  private elapsedTime = 0;

  // Heat capacity simulation
  private substanceTemps: Record<string, number> = { water: 25, oil: 25, aluminum: 25, iron: 25 };
  private heatingStarted = false;

  // Animation
  private animationTime = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    { question: "Why does metal feel colder than wood at the same temperature?", options: ["Metal is actually colder", "Metal conducts heat away from your hand faster", "Wood absorbs more heat", "Metal reflects body heat"], correctIndex: 1 },
    { question: "What does thermal conductivity (k) measure?", options: ["How hot something can get", "How fast heat flows through a material", "How much heat something stores", "How well something insulates"], correctIndex: 1 },
    { question: "Which has the highest specific heat capacity?", options: ["Iron (0.45 J/gC)", "Aluminum (0.90 J/gC)", "Water (4.18 J/gC)", "Copper (0.39 J/gC)"], correctIndex: 2 },
    { question: "Why do coastal cities have milder climates?", options: ["Ocean breezes", "Less pollution", "Water's high heat capacity buffers temperature changes", "Lower elevation"], correctIndex: 2 },
    { question: "What is Fourier's Law of heat conduction?", options: ["E = mc^2", "Q/t = -kA(dT/dx)", "PV = nRT", "F = ma"], correctIndex: 1 },
    { question: "Why does doubling wall thickness halve heat loss?", options: ["More material blocks heat", "Temperature gradient (dT/dx) is halved", "Air gets trapped", "Insulation absorbs heat"], correctIndex: 1 },
    { question: "What makes copper better than aluminum for cookware bottoms?", options: ["Copper is cheaper", "Copper has higher thermal conductivity (401 vs 237 W/mK)", "Copper is lighter", "Copper stores more heat"], correctIndex: 1 },
    { question: "Why does water take so long to boil compared to metals?", options: ["Water is a liquid", "Water has high specific heat - needs more energy per degree", "Water evaporates", "Water conducts heat poorly"], correctIndex: 1 },
    { question: "What fills the gap between CPU and heat sink?", options: ["Air", "Thermal paste - fills air gaps that would insulate", "Water", "Vacuum"], correctIndex: 1 },
    { question: "Q = mc*deltaT: if c doubles, what happens to deltaT for same Q?", options: ["Doubles", "Halves", "Stays same", "Quadruples"], correctIndex: 1 }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      id: 'cooking',
      title: 'Cooking & Cookware',
      icon: 'pan',
      subtitle: 'Heat distribution in the kitchen',
      description: 'High-quality cookware uses copper or aluminum bottoms for even heat distribution. Cast iron maintains temperature when food is added. Wooden handles stay cool due to low thermal conductivity.',
      formula: "Fourier's Law: Q/t = -kA(dT/dx)",
      realExample: 'Copper-clad pans cook more evenly: higher k means heat spreads faster laterally, eliminating hot spots.'
    },
    {
      id: 'building',
      title: 'Building Insulation',
      icon: 'building',
      subtitle: 'Energy efficiency',
      description: 'Buildings use low-conductivity materials (fiberglass, foam, aerogel) to minimize heat transfer. Double-pane windows trap air - an excellent insulator with k = 0.025 W/mK.',
      formula: 'R-value = thickness / k',
      realExample: 'Doubling wall thickness halves heat loss. Air gaps work because still air is 1,600x less conductive than concrete.'
    },
    {
      id: 'electronics',
      title: 'Electronics Cooling',
      icon: 'computer',
      subtitle: 'Heat sink design',
      description: 'Computer processors generate intense heat in tiny areas. Heat sinks use high-k metals (copper, aluminum) to spread heat, while thermal paste fills microscopic air gaps.',
      formula: 'Heat flows: CPU -> thermal paste -> heat sink -> fins -> air',
      realExample: 'A high-end CPU generates 150W of heat. Copper heat sinks spread this across large surface areas for dissipation.'
    },
    {
      id: 'climate',
      title: 'Climate & Weather',
      icon: 'ocean',
      subtitle: 'Ocean heat capacity',
      description: "Oceans absorb 90% of global warming's excess heat. Water's high specific heat capacity (4.18 J/gC) moderates temperature swings, making coastal cities milder.",
      formula: 'Q = mc*deltaT - large m and c mean small deltaT',
      realExample: 'San Francisco has mild weather year-round while inland Sacramento has extreme temps - same latitude, different heat capacity effects.'
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Simulate heat conduction through bar
  private updateHeatConduction(deltaTime: number): void {
    const k = MATERIALS[this.selectedMaterial].k;
    const alpha = k * 0.0001; // Thermal diffusivity factor

    const newTemps = [...this.barTemperatures];
    newTemps[0] = this.heatSource;

    for (let i = 1; i < newTemps.length - 1; i++) {
      const heatFlow = alpha * (newTemps[i - 1] - 2 * newTemps[i] + newTemps[i + 1]);
      newTemps[i] = Math.min(this.heatSource, Math.max(25, newTemps[i] + heatFlow * deltaTime * 60));
    }

    // End loses heat to environment
    newTemps[newTemps.length - 1] = Math.max(25, newTemps[newTemps.length - 1] + alpha * (newTemps[newTemps.length - 2] - newTemps[newTemps.length - 1]) * deltaTime * 60 - 0.1 * deltaTime * 60);

    this.barTemperatures = newTemps;
    this.elapsedTime += deltaTime;
  }

  // PROTECTED: Simulate heat capacity race
  private updateHeatCapacityRace(deltaTime: number): void {
    const heatInput = 50; // J/s
    const mass = 100; // grams

    Object.keys(SPECIFIC_HEATS).forEach(sub => {
      if (this.substanceTemps[sub] < 100) {
        const c = SPECIFIC_HEATS[sub].c;
        const deltaT = (heatInput / (mass * c)) * deltaTime * 6; // Scale for visible effect
        this.substanceTemps[sub] = Math.min(100, this.substanceTemps[sub] + deltaT);
      }
    });
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
      if (input.id === 'heat_source') {
        this.heatSource = Math.max(50, Math.min(200, input.value));
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
            this.prediction = buttonId.split('_')[1];
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
        }
        break;

      case 'play':
        if (buttonId.startsWith('material_')) {
          const mat = buttonId.split('_')[1] as keyof typeof MATERIALS;
          this.selectedMaterial = mat;
          this.barTemperatures = Array(20).fill(25);
          this.isHeating = false;
          this.elapsedTime = 0;
        } else if (buttonId === 'toggle_heat') {
          this.isHeating = !this.isHeating;
        } else if (buttonId === 'reset') {
          this.barTemperatures = Array(20).fill(25);
          this.isHeating = false;
          this.elapsedTime = 0;
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
            this.twistPrediction = buttonId.split('_')[1];
            this.showTwistFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'twist_play';
          this.showTwistFeedback = false;
          this.substanceTemps = { water: 25, oil: 25, aluminum: 25, iron: 25 };
          this.heatingStarted = false;
        }
        break;

      case 'twist_play':
        if (buttonId === 'toggle_burners') {
          this.heatingStarted = !this.heatingStarted;
        } else if (buttonId === 'reset') {
          this.substanceTemps = { water: 25, oil: 25, aluminum: 25, iron: 25 };
          this.heatingStarted = false;
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
    this.selectedMaterial = 'copper';
    this.heatSource = 100;
    this.barTemperatures = Array(20).fill(25);
    this.isHeating = false;
    this.elapsedTime = 0;
    this.substanceTemps = { water: 25, oil: 25, aluminum: 25, iron: 25 };
    this.heatingStarted = false;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Update heat conduction simulation
    if (this.phase === 'play' && this.isHeating) {
      this.updateHeatConduction(deltaTime);
    }

    // Update heat capacity race
    if (this.phase === 'twist_play' && this.heatingStarted) {
      this.updateHeatCapacityRace(deltaTime);
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(249, 115, 22, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(239, 68, 68, 0.05)' });

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
    r.text(200, 130, 'Heat Transfer & Capacity', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Why does metal feel cold and wood warm?', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    // Heat icon
    r.text(200, 250, '[fire]', { fill: '#f97316', fontSize: 64, textAnchor: 'middle' });

    // Feature cards
    r.roundRect(50, 300, 90, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(95, 325, 'Temp', { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(95, 345, 'erature', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.roundRect(155, 300, 90, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 325, 'Conduct', { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 345, 'ion', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.roundRect(260, 300, 90, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(305, 325, 'Capacity', { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(305, 345, '', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 380, 320, 100, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 415, 'Discover the two key properties', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 440, 'that govern thermal physics.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 470, "Fourier's Law & Specific Heat", { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Start Exploring', variant: 'primary' });

    r.setCoachMessage('Explore thermal conductivity and heat capacity!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'A metal spoon and wooden spoon have been', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 148, 'sitting at room temperature (20C) all day.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 175, 'Which feels colder when you touch them?', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'A', text: 'Metal - conducts heat from hand faster' },
      { id: 'B', text: 'Wood - absorbs heat from room' },
      { id: 'C', text: 'Both same - same temperature' },
      { id: 'D', text: "Metal warmer - it's denser" }
    ];

    options.forEach((option, i) => {
      const y = 215 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (option.id === 'A') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (option.id === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (option.id === this.prediction) {
        bgColor = 'rgba(249, 115, 22, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${option.id}. ${option.text}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${option.id}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const isCorrect = this.prediction === 'A';
      r.text(200, 500, isCorrect ? 'Correct!' : 'Metal feels colder!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 525, 'Metal has high thermal conductivity (k), so it', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 545, 'rapidly draws heat from your 37C hand.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 565, 'Your nerves sense heat FLOW, not temperature!', { fill: '#f97316', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Explore the Physics', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 45, 'Heat Conduction Lab', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 68, 'Watch how different materials conduct heat', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Heat conduction visualization
    this.renderHeatConductionViz(r);

    // Material selector
    const materialKeys = Object.keys(MATERIALS) as (keyof typeof MATERIALS)[];
    materialKeys.forEach((key, i) => {
      const x = 30 + i * 74;
      const mat = MATERIALS[key];
      const isSelected = this.selectedMaterial === key;

      r.roundRect(x, 335, 68, 40, 6, { fill: isSelected ? 'rgba(249, 115, 22, 0.3)' : 'rgba(51, 65, 85, 0.5)' });
      r.text(x + 34, 360, mat.name.substring(0, 6), { fill: isSelected ? '#f97316' : '#94a3b8', fontSize: 10, textAnchor: 'middle' });
      r.addButton({ id: `material_${key}`, label: '', variant: 'secondary' });
    });

    // Heat source slider
    r.addSlider({
      id: 'heat_source',
      label: `Heat Source: ${this.heatSource}C`,
      min: 50,
      max: 200,
      step: 10,
      value: this.heatSource
    });

    // Control buttons
    r.addButton({
      id: 'toggle_heat',
      label: this.isHeating ? 'Pause' : 'Start Heating',
      variant: this.isHeating ? 'secondary' : 'primary'
    });

    r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
    r.addButton({ id: 'continue', label: 'Review the Concepts', variant: 'primary' });
  }

  private renderHeatConductionViz(r: CommandRenderer): void {
    const vizWidth = 340;
    const vizHeight = 200;
    const barWidth = 280;

    r.roundRect(30, 90, vizWidth, vizHeight, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Flame when heating
    if (this.isHeating) {
      const flameY = 180 + Math.sin(this.animationTime * 10) * 5;
      r.ellipse(60, flameY, 15, 25 + Math.sin(this.animationTime * 15) * 5, { fill: '#fef08a' });
      r.ellipse(60, flameY + 10, 12, 18, { fill: '#f97316' });
    }

    // Heat source label
    r.text(60, 220, `${this.heatSource}C`, { fill: '#f97316', fontSize: 11, textAnchor: 'middle' });

    // Metal bar with temperature gradient
    const segWidth = barWidth / this.barTemperatures.length;
    this.barTemperatures.forEach((temp, i) => {
      const t = Math.min(1, Math.max(0, (temp - 25) / 75));
      const red = Math.round(59 + t * 180);
      const green = Math.round(130 - t * 80);
      const blue = Math.round(246 - t * 200);

      r.rect(80 + i * segWidth, 175, segWidth + 1, 30, { fill: `rgb(${red},${green},${blue})` });
    });

    // Bar outline
    r.rect(80, 175, barWidth, 30, { fill: 'none', stroke: '#334155', strokeWidth: 2 });

    // Material label
    const mat = MATERIALS[this.selectedMaterial];
    r.text(220, 192, `${mat.name} (k=${mat.k})`, { fill: '#ffffff', fontSize: 11, textAnchor: 'middle' });

    // Temperature labels
    r.text(85, 230, `Hot: ${Math.round(this.barTemperatures[0])}C`, { fill: '#94a3b8', fontSize: 10 });
    r.text(355, 230, `Cold: ${Math.round(this.barTemperatures[this.barTemperatures.length - 1])}C`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'end' });

    // Time and equation
    r.text(355, 110, `Time: ${this.elapsedTime.toFixed(1)}s`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'end' });
    r.roundRect(120, 250, 160, 30, 8, { fill: '#0f172a' });
    r.text(200, 270, 'Q/t = -kA(dT/dx)', { fill: '#f97316', fontSize: 11, textAnchor: 'middle' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'Thermal Conductivity', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Fourier's Law card
    r.roundRect(30, 85, 340, 130, 16, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(200, 115, "Fourier's Law", { fill: '#f97316', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(80, 130, 240, 35, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 152, 'Q/t = -kA(dT/dx)', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });
    r.text(100, 185, 'k = thermal conductivity', { fill: '#cbd5e1', fontSize: 10 });
    r.text(260, 185, 'A = cross-section area', { fill: '#cbd5e1', fontSize: 10 });
    r.text(100, 202, 'dT/dx = temp gradient', { fill: '#cbd5e1', fontSize: 10 });

    // Why metal feels cold card
    r.roundRect(30, 230, 340, 140, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 260, 'Why Metal Feels Cold', { fill: '#22c55e', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(50, 280, 80, 50, 8, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(90, 300, 'Metal', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(90, 320, 'High k=Cold', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.roundRect(180, 280, 80, 50, 8, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(220, 300, 'Wood', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(220, 320, 'Low k=Warm', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.text(200, 355, 'Your nerves sense heat FLOW, not temperature.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 372, 'Metal draws heat away faster!', { fill: '#22c55e', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Discover Heat Capacity', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'Heat Capacity Challenge', { fill: '#3b82f6', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 90, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 120, 'You put equal masses of water, oil,', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 143, 'aluminum, and iron on identical burners.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 175, 'Which reaches 100C first?', { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'A', text: 'Water heats fastest - absorbs heat well' },
      { id: 'B', text: 'Oil heats fastest - used for frying' },
      { id: 'C', text: 'Metals heat fastest - low specific heat' },
      { id: 'D', text: 'All same rate - same heat input' }
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (option.id === 'C') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (option.id === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (option.id === this.twistPrediction) {
        bgColor = 'rgba(59, 130, 246, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${option.id}. ${option.text}`, { fill: textColor, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${option.id}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 445, 340, 110, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const isCorrect = this.twistPrediction === 'C';
      r.text(200, 475, isCorrect ? 'Excellent!' : 'Metals win the race!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 500, 'Specific heat capacity (c) is energy needed to', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 518, 'raise 1g by 1C. Metals have low c, so they', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 536, 'need less energy per degree!', { fill: '#3b82f6', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See the Heating Race', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 45, 'Heat Capacity Race', { fill: '#3b82f6', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 68, 'Watch different substances race to 100C!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Heat capacity visualization
    this.renderHeatCapacityViz(r);

    // Temperature readouts
    const substances = Object.keys(SPECIFIC_HEATS) as (keyof typeof SPECIFIC_HEATS)[];
    substances.forEach((sub, i) => {
      const x = 45 + i * 90;
      const data = SPECIFIC_HEATS[sub];
      const temp = this.substanceTemps[sub];
      const isWinner = temp >= 100;

      r.roundRect(x, 330, 80, 55, 8, { fill: isWinner ? 'rgba(16, 185, 129, 0.3)' : 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 40, 350, data.name.substring(0, 8), { fill: data.color, fontSize: 10, textAnchor: 'middle' });
      r.text(x + 40, 372, `${Math.round(temp)}C`, { fill: isWinner ? '#22c55e' : '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      if (isWinner) {
        r.text(x + 40, 385, 'Winner!', { fill: '#22c55e', fontSize: 9, textAnchor: 'middle' });
      }
    });

    // Control buttons
    r.addButton({
      id: 'toggle_burners',
      label: this.heatingStarted ? 'Pause' : 'Start All Burners',
      variant: this.heatingStarted ? 'secondary' : 'primary'
    });

    r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });

    // Key insight
    r.roundRect(40, 450, 320, 60, 10, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 475, 'Q = mc*deltaT', { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 498, 'Same Q, same m - higher c = smaller deltaT!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review the Discovery', variant: 'primary' });
  }

  private renderHeatCapacityViz(r: CommandRenderer): void {
    r.roundRect(30, 90, 340, 220, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Four beakers
    const substances = Object.keys(SPECIFIC_HEATS) as (keyof typeof SPECIFIC_HEATS)[];
    substances.forEach((sub, i) => {
      const x = 55 + i * 82;
      const data = SPECIFIC_HEATS[sub];
      const temp = this.substanceTemps[sub];
      const fillHeight = ((temp - 25) / 75) * 80;
      const isWinner = temp >= 100;

      // Beaker
      r.roundRect(x, 120, 65, 120, 4, { fill: '#0f172a', stroke: '#334155', strokeWidth: 2 });

      // Liquid fill
      r.rect(x + 3, 235 - fillHeight, 59, fillHeight, { fill: data.color });

      // Bubbles when heating
      if (this.heatingStarted && temp > 50) {
        for (let b = 0; b < 3; b++) {
          const bubbleY = 220 - (temp - 50) * 0.5 - Math.sin(this.animationTime * 5 + b) * 10;
          r.circle(x + 15 + b * 15, bubbleY, 3, { fill: data.color });
        }
      }

      // Temperature
      r.roundRect(x + 8, 160, 50, 22, 4, { fill: 'rgba(0,0,0,0.6)' });
      r.text(x + 33, 175, `${Math.round(temp)}C`, { fill: isWinner ? '#22c55e' : '#ffffff', fontSize: 11, textAnchor: 'middle' });

      if (isWinner) {
        r.text(x + 33, 145, 'Winner!', { fill: '#22c55e', fontSize: 10, textAnchor: 'middle' });
      }

      // Label
      r.text(x + 33, 255, data.name.substring(0, 6), { fill: data.color, fontSize: 10, textAnchor: 'middle' });
      r.text(x + 33, 270, `c=${data.c}`, { fill: '#64748b', fontSize: 8, textAnchor: 'middle' });

      // Flame
      if (this.heatingStarted) {
        const flameHeight = 12 + Math.sin(this.animationTime * 15 + i) * 4;
        r.ellipse(x + 33, 280, 10, flameHeight, { fill: '#fbbf24' });
      }
    });

    // Equation
    r.roundRect(120, 295, 160, 30, 8, { fill: '#0f172a' });
    r.text(200, 315, 'Q = mc*deltaT', { fill: '#3b82f6', fontSize: 12, textAnchor: 'middle' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Specific Heat Capacity', { fill: '#3b82f6', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Two properties comparison
    r.roundRect(30, 85, 340, 180, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 115, 'Two Properties, Two Roles', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Thermal conductivity
    r.roundRect(40, 135, 155, 110, 10, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(117, 155, 'Conductivity (k)', { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(117, 180, 'How fast heat spreads', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(117, 200, 'Metal feels cold (high k)', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(117, 220, 'Wood feels warm (low k)', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Specific heat
    r.roundRect(205, 135, 155, 110, 10, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(282, 155, 'Specific Heat (c)', { fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(282, 180, 'Energy needed/degree', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(282, 200, 'Water buffers temp', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(282, 220, 'Metals heat up fast', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Equations
    r.roundRect(40, 280, 320, 50, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 310, 'Q = mc*deltaT    |    Q/t = -kA(dT/dx)', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Real-World Apps', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 50, 'Thermal Physics Everywhere', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#f97316';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 50, 8, { fill: bgColor });
      r.text(x + 40, 110, app.title.split(' ')[0], { fontSize: 10, textAnchor: 'middle', fill: isActive ? '#ffffff' : '#94a3b8' });

      if (isCompleted && !isActive) {
        r.text(x + 70, 90, '!', { fill: '#22c55e', fontSize: 12 });
      }

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 145, 350, 310, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 195, app.subtitle, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Description (multi-line)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 225;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 50) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Formula
    r.roundRect(40, 320, 320, 35, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 342, app.formula, { fill: '#f97316', fontSize: 11, textAnchor: 'middle' });

    // Real example
    r.roundRect(40, 365, 320, 50, 8, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 395, app.realExample.substring(0, 55) + '...', { fill: '#22c55e', fontSize: 10, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 435, 'Completed!', { fill: '#10b981', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 465, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

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

      // Question
      r.roundRect(25, 95, 350, 60, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 130, question.question.substring(0, 50) + (question.question.length > 50 ? '...' : ''), { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 170 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(249, 115, 22, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        r.text(40, y + 28, option.substring(0, 50) + (option.length > 50 ? '...' : ''), { fill: isSelected ? '#f97316' : '#e2e8f0', fontSize: 11 });

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
        r.text(200, 420, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? 'trophy' : 'book', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "Excellent! You've mastered thermal physics!" : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Trophy
    r.text(200, 120, 'fire', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Thermal Physics Master!', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, "You've mastered heat transfer and", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'thermal capacity!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { label: "Fourier's Law" },
      { label: 'Heat Capacity' },
      { label: 'Cookware' },
      { label: 'Climate' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 295 + Math.floor(i / 2) * 65;
      r.roundRect(x, y, 140, 50, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 30, concept.label, { fill: '#f97316', fontSize: 12, textAnchor: 'middle' });
    });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });
    r.setCoachMessage('Congratulations on mastering thermal physics!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      selectedMaterial: this.selectedMaterial,
      heatSource: this.heatSource,
      barTemperatures: this.barTemperatures,
      isHeating: this.isHeating,
      elapsedTime: this.elapsedTime,
      substanceTemps: this.substanceTemps,
      heatingStarted: this.heatingStarted,
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
    if (state.prediction !== undefined) this.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.showPredictionFeedback !== undefined) this.showPredictionFeedback = state.showPredictionFeedback as boolean;
    if (state.showTwistFeedback !== undefined) this.showTwistFeedback = state.showTwistFeedback as boolean;
    if (state.selectedMaterial) this.selectedMaterial = state.selectedMaterial as keyof typeof MATERIALS;
    if (state.heatSource !== undefined) this.heatSource = state.heatSource as number;
    if (state.barTemperatures) this.barTemperatures = state.barTemperatures as number[];
    if (state.isHeating !== undefined) this.isHeating = state.isHeating as boolean;
    if (state.elapsedTime !== undefined) this.elapsedTime = state.elapsedTime as number;
    if (state.substanceTemps) this.substanceTemps = state.substanceTemps as Record<string, number>;
    if (state.heatingStarted !== undefined) this.heatingStarted = state.heatingStarted as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createHeatTransferCapacityGame(sessionId: string): HeatTransferCapacityGame {
  return new HeatTransferCapacityGame(sessionId);
}
