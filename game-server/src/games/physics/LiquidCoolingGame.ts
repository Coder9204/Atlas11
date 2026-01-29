import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// LIQUID COOLING HEAT TRANSFER GAME - GAME 164
// ============================================================================
// Physics: Specific heat capacity, thermal conductivity, convection
// Q = m_dot * Cp * deltaT for heat removal
// Water's Cp is 4.2 J/(g*K) vs air at 1.0 - that's why it's 25x better
// Two-phase cooling uses latent heat for even better performance
// ============================================================================

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  description: string;
  connection: string;
}

interface CoolantProps {
  cp: number;
  k: number;
  name: string;
  hMultiplier: number;
}

export class LiquidCoolingGame extends BaseGame {
  readonly gameType = 'liquid_cooling';
  readonly gameTitle = 'Liquid Cooling Heat Transfer: Why Water Beats Air';

  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private coolantType: 'air' | 'water' | 'oil' | 'twophase' = 'water';
  private flowRate = 5;
  private heatLoad = 500;
  private inletTemp = 25;
  private flowMode: 'laminar' | 'turbulent' = 'turbulent';
  private animationTime = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  private readonly coolantProps: Record<string, CoolantProps> = {
    air: { cp: 1.005, k: 0.026, name: 'Air', hMultiplier: 1 },
    water: { cp: 4.186, k: 0.60, name: 'Water', hMultiplier: 25 },
    oil: { cp: 2.0, k: 0.15, name: 'Mineral Oil', hMultiplier: 8 },
    twophase: { cp: 100, k: 0.80, name: 'Two-Phase (3M Novec)', hMultiplier: 100 }
  };

  private readonly testQuestions: TestQuestion[] = [
    { question: "Water's specific heat capacity is approximately:", options: ["1.0 J/(g*K)", "4.2 J/(g*K)", "0.24 J/(g*K)", "10 J/(g*K)"], correctIndex: 1, explanation: "Water's high Cp of 4.18 J/(g*K) makes it excellent for cooling." },
    { question: "Why is water ~25x better than air for cooling?", options: ["Water is colder", "Higher specific heat and thermal conductivity", "Water is blue", "Water flows faster"], correctIndex: 1, explanation: "Water has 4x higher Cp and 23x higher thermal conductivity." },
    { question: "Q = m_dot * Cp * deltaT shows that:", options: ["Higher flow allows lower deltaT for same heat removal", "Temperature doesn't matter", "Mass flow doesn't matter", "Only Cp matters"], correctIndex: 0, explanation: "More flow means less temperature rise needed." },
    { question: "Thermal conductivity (k) measures:", options: ["How fast fluid flows", "How well heat conducts through material", "Coolant color", "Pressure drop"], correctIndex: 1, explanation: "k in W/(m*K) indicates conduction ability." },
    { question: "Turbulent flow is better for heat transfer because:", options: ["It's quieter", "It mixes fluid, breaking up thermal boundary layers", "It uses less energy", "It's more predictable"], correctIndex: 1, explanation: "Turbulence disrupts insulating boundary layers." },
    { question: "Two-phase cooling (boiling) is superior because:", options: ["It looks cool", "Latent heat absorbs massive energy at constant temp", "It's cheaper", "It's simpler"], correctIndex: 1, explanation: "Water's latent heat is 2260 J/g vs 4.2 J/(g*C) for sensible heat." },
    { question: "Direct-to-chip liquid cooling involves:", options: ["Submerging whole server", "Cold plates on CPUs/GPUs with liquid flowing through", "Spraying liquid on motherboard", "Liquid-filled heatsinks with no flow"], correctIndex: 1, explanation: "Cold plates provide direct thermal contact." },
    { question: "Immersion cooling uses:", options: ["Water sprayed on servers", "Servers submerged in dielectric (non-conductive) fluid", "Ice blocks in data center", "Liquid nitrogen"], correctIndex: 1, explanation: "Dielectric fluids like 3M Novec don't conduct electricity." },
    { question: "The Reynolds number determines:", options: ["Fluid color", "Whether flow is laminar or turbulent", "Fluid temperature", "Cooling cost"], correctIndex: 1, explanation: "Re > 2300 typically indicates turbulent flow." },
    { question: "Heat pipes work by:", options: ["Pumping water through tubes", "Using capillary action and phase change with no pump", "Using fans inside the pipe", "Conducting through solid copper"], correctIndex: 1, explanation: "Heat pipes use evaporation/condensation passively." }
  ];

  private readonly transferApps: TransferApp[] = [
    { icon: "💧", title: "Direct-to-Chip Cooling", description: "Cold plates on CPUs/GPUs handle 300-1000W per chip.", connection: "Water carries 25x more heat than air per volume." },
    { icon: "🛁", title: "Immersion Cooling", description: "Servers fully submerged in dielectric fluid.", connection: "Enables PUE below 1.05 and can handle 100kW+ per rack." },
    { icon: "🚪", title: "Rear-Door Heat Exchangers", description: "Liquid-cooled doors capture heat before it enters room.", connection: "Can capture 50-100% of rack heat without modifying servers." },
    { icon: "🔥", title: "Two-Phase Immersion", description: "Dielectric fluid boils at chip surface, vapor condenses.", connection: "Boiling provides incredibly high heat transfer coefficients." }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  private calcCoolingMetrics() {
    const props = this.coolantProps[this.coolantType];
    const massFlowRate = this.flowRate * 0.001 / 60;
    const densityFactor = this.coolantType === 'air' ? 0.001 : 1;
    const effectiveMassFlow = massFlowRate * densityFactor * 1000;
    const deltaT = this.heatLoad / (effectiveMassFlow * props.cp * 1000);
    const outletTemp = this.inletTemp + deltaT;
    const flowFactor = this.flowMode === 'turbulent' ? 3 : 1;
    const heatTransferCoeff = props.hMultiplier * flowFactor * 100;
    const coolingCapacity = effectiveMassFlow * props.cp;
    const maxCoolingCapacity = 10 * 4.186;
    const relativeCapacity = (coolingCapacity / maxCoolingCapacity) * 100;
    return {
      deltaT: Math.min(deltaT, 100),
      outletTemp: Math.min(outletTemp, 125),
      heatTransferCoeff,
      relativeCapacity: Math.min(relativeCapacity, 200),
      coolantName: props.name,
      specificHeat: props.cp
    };
  }

  private checkAnswer(questionIndex: number, answerIndex: number): boolean {
    return this.testQuestions[questionIndex].correctIndex === answerIndex;
  }

  private calculateScore(): number {
    return this.testAnswers.reduce((score, answer, index) => score + (this.checkAnswer(index, answer) ? 1 : 0), 0);
  }

  getCurrentPhase(): string {
    return this.phase;
  }

  handleInput(input: UserInput): void {
    if (input.type === 'button_click') {
      this.handleButtonClick(input.id);
    } else if (input.type === 'slider_change') {
      if (input.id === 'flow_rate') this.flowRate = input.value;
      else if (input.id === 'heat_load') this.heatLoad = input.value;
      else if (input.id === 'inlet_temp') this.inletTemp = input.value;
    }
  }

  private handleButtonClick(buttonId: string): void {
    switch (this.phase) {
      case 'hook':
        if (buttonId === 'continue') this.phase = 'predict';
        break;
      case 'predict':
        if (!this.showPredictionFeedback && buttonId.startsWith('option_')) {
          this.prediction = parseInt(buttonId.split('_')[1]);
          this.showPredictionFeedback = true;
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
        }
        break;
      case 'play':
        if (buttonId === 'continue') this.phase = 'review';
        else if (buttonId.startsWith('coolant_')) {
          this.coolantType = buttonId.split('_')[1] as 'air' | 'water' | 'oil' | 'twophase';
        } else if (buttonId === 'toggle_flow') {
          this.flowMode = this.flowMode === 'laminar' ? 'turbulent' : 'laminar';
        }
        break;
      case 'review':
        if (buttonId === 'continue') this.phase = 'twist_predict';
        break;
      case 'twist_predict':
        if (!this.showTwistFeedback && buttonId.startsWith('option_')) {
          this.twistPrediction = parseInt(buttonId.split('_')[1]);
          this.showTwistFeedback = true;
        } else if (buttonId === 'continue') {
          this.phase = 'twist_play';
          this.showTwistFeedback = false;
        }
        break;
      case 'twist_play':
        if (buttonId === 'continue') this.phase = 'twist_review';
        else if (buttonId === 'coolant_water') this.coolantType = 'water';
        else if (buttonId === 'coolant_twophase') this.coolantType = 'twophase';
        break;
      case 'twist_review':
        if (buttonId === 'continue') this.phase = 'transfer';
        break;
      case 'transfer':
        if (buttonId.startsWith('app_')) this.activeAppIndex = parseInt(buttonId.split('_')[1]);
        else if (buttonId === 'mark_understood') this.completedApps.add(this.activeAppIndex);
        else if (buttonId === 'continue' && this.completedApps.size >= 4) this.phase = 'test';
        break;
      case 'test':
        if (!this.showTestResults) {
          if (buttonId.startsWith('answer_')) this.testAnswers[this.currentQuestionIndex] = parseInt(buttonId.split('_')[1]);
          else if (buttonId === 'next_question' && this.currentQuestionIndex < 9) this.currentQuestionIndex++;
          else if (buttonId === 'prev_question' && this.currentQuestionIndex > 0) this.currentQuestionIndex--;
          else if (buttonId === 'submit' && !this.testAnswers.includes(-1)) this.showTestResults = true;
        } else if (buttonId === 'continue') {
          this.phase = this.calculateScore() >= 7 ? 'mastery' : 'review';
          if (this.phase === 'review') { this.showTestResults = false; this.testAnswers = Array(10).fill(-1); this.currentQuestionIndex = 0; }
        }
        break;
      case 'mastery':
        if (buttonId === 'restart') this.resetGame();
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
    this.coolantType = 'water';
    this.flowRate = 5;
    this.heatLoad = 500;
    this.inletTemp = 25;
    this.flowMode = 'turbulent';
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
    r.clear('#0a0f1a');

    const metrics = this.calcCoolingMetrics();

    switch (this.phase) {
      case 'hook':
        r.text(200, 60, 'Liquid Cooling Heat Transfer', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(200, 100, 'Why is water 25x better at', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
        r.text(200, 120, 'cooling than air?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
        r.text(200, 200, '💧 🔥 ❄️', { fontSize: 48, textAnchor: 'middle' });
        r.roundRect(40, 250, 320, 120, 12, { fill: 'rgba(30, 41, 59, 0.8)' });
        r.text(200, 285, 'A 500W GPU generates as much heat', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
        r.text(200, 305, 'as a small space heater!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
        r.text(200, 340, 'Specific heat capacity is the key.', { fill: '#a855f7', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
        r.addButton({ id: 'continue', label: 'Explore Liquid Cooling', variant: 'primary' });
        break;

      case 'play':
        r.text(200, 40, 'Liquid Cooling Lab', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(200, 65, `Coolant: ${metrics.coolantName}`, { fill: '#a855f7', fontSize: 14, textAnchor: 'middle' });
        r.text(50, 95, `Inlet: ${this.inletTemp}C`, { fill: '#3b82f6', fontSize: 11 });
        r.text(50, 110, `Outlet: ${metrics.outletTemp.toFixed(1)}C`, { fill: metrics.outletTemp > 60 ? '#ef4444' : '#22c55e', fontSize: 11 });
        r.text(50, 125, `Delta T: ${metrics.deltaT.toFixed(1)}C`, { fill: '#fbbf24', fontSize: 11 });
        r.text(50, 140, `Cp: ${metrics.specificHeat.toFixed(2)} J/(g*K)`, { fill: '#9ca3af', fontSize: 10 });
        r.text(50, 155, `Relative Capacity: ${metrics.relativeCapacity.toFixed(0)}%`, { fill: metrics.relativeCapacity > 100 ? '#22c55e' : '#ef4444', fontSize: 10 });
        r.addSlider({ id: 'flow_rate', label: 'Flow Rate (L/min)', min: 1, max: 20, step: 1, value: this.flowRate });
        r.addSlider({ id: 'heat_load', label: 'Heat Load (W)', min: 100, max: 1000, step: 50, value: this.heatLoad });
        r.addButton({ id: 'coolant_air', label: 'Air', variant: this.coolantType === 'air' ? 'primary' : 'secondary' });
        r.addButton({ id: 'coolant_water', label: 'Water', variant: this.coolantType === 'water' ? 'primary' : 'secondary' });
        r.addButton({ id: 'coolant_twophase', label: 'Two-Phase', variant: this.coolantType === 'twophase' ? 'primary' : 'secondary' });
        r.addButton({ id: 'toggle_flow', label: `Flow: ${this.flowMode}`, variant: 'secondary' });
        r.addButton({ id: 'continue', label: 'Learn the Science', variant: 'primary' });
        break;

      case 'twist_play':
        r.text(200, 40, 'Two-Phase Cooling Demo', { fill: '#f97316', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(200, 70, `Delta T: ${metrics.deltaT.toFixed(1)}C`, { fill: metrics.deltaT < 10 ? '#22c55e' : '#ef4444', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(200, 100, `Heat Transfer Coeff: ${metrics.heatTransferCoeff.toFixed(0)}`, { fill: '#a855f7', fontSize: 12, textAnchor: 'middle' });
        r.addButton({ id: 'coolant_water', label: 'Water (Single Phase)', variant: this.coolantType === 'water' ? 'primary' : 'secondary' });
        r.addButton({ id: 'coolant_twophase', label: 'Two-Phase (Boiling)', variant: this.coolantType === 'twophase' ? 'primary' : 'secondary' });
        r.addSlider({ id: 'heat_load', label: 'Heat Load (W)', min: 100, max: 1000, step: 50, value: this.heatLoad });
        r.text(200, 220, this.coolantType === 'twophase' ? 'Boiling provides massive heat transfer!' : 'Single-phase: temp rises with heat', { fill: this.coolantType === 'twophase' ? '#22c55e' : '#9ca3af', fontSize: 11, textAnchor: 'middle' });
        r.addButton({ id: 'continue', label: 'See Explanation', variant: 'primary' });
        break;

      case 'mastery':
        r.text(200, 100, '💧', { fontSize: 64, textAnchor: 'middle' });
        r.text(200, 170, 'Liquid Cooling Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(200, 210, 'You\'ve mastered liquid cooling heat transfer!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
        r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });
        break;

      default:
        r.text(200, 200, `Phase: ${this.phase}`, { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
        r.addButton({ id: 'continue', label: 'Continue', variant: 'primary' });
    }

    return r.toFrame(Math.floor(this.animationTime * 60));
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      coolantType: this.coolantType,
      flowRate: this.flowRate,
      heatLoad: this.heatLoad,
      inletTemp: this.inletTemp,
      flowMode: this.flowMode,
      testAnswers: this.testAnswers,
      completedApps: Array.from(this.completedApps)
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.coolantType) this.coolantType = state.coolantType as 'air' | 'water' | 'oil' | 'twophase';
    if (state.flowRate) this.flowRate = state.flowRate as number;
    if (state.heatLoad) this.heatLoad = state.heatLoad as number;
    if (state.inletTemp) this.inletTemp = state.inletTemp as number;
    if (state.flowMode) this.flowMode = state.flowMode as 'laminar' | 'turbulent';
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createLiquidCoolingGame(sessionId: string): LiquidCoolingGame {
  return new LiquidCoolingGame(sessionId);
}
