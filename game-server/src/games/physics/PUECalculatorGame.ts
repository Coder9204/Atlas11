import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// PUE (POWER USAGE EFFECTIVENESS) GAME - GAME 163
// ============================================================================
// Physics: PUE = Total Facility Power / IT Equipment Power
// Cooling overhead, UPS losses, lighting contribute to PUE > 1.0
// Free cooling can dramatically reduce mechanical cooling overhead
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

export class PUECalculatorGame extends BaseGame {
  readonly gameType = 'pue_calculator';
  readonly gameTitle = 'PUE: Power Usage Effectiveness';

  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private itLoad = 1000;
  private coolingEfficiency = 50;
  private upsEfficiency = 92;
  private lightingPower = 20;
  private outdoorTemp = 25;
  private useFreeCooling = false;
  private animationTime = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  private readonly testQuestions: TestQuestion[] = [
    { question: "PUE stands for:", options: ["Power Usage Effectiveness", "Power Unit Efficiency", "Primary Usage Energy", "Processor Utilization Efficiency"], correctIndex: 0, explanation: "Power Usage Effectiveness is the industry standard metric." },
    { question: "A PUE of 1.5 means:", options: ["50% of power goes to IT", "For every 1W of IT, 0.5W is overhead", "150% efficient", "15% wasted"], correctIndex: 1, explanation: "PUE 1.5 = 1.5W total / 1W IT = 0.5W overhead per 1W IT." },
    { question: "The theoretical minimum PUE is:", options: ["0.0", "1.0 (all power goes to IT)", "0.5", "2.0"], correctIndex: 1, explanation: "Perfect efficiency means all power goes to IT equipment." },
    { question: "What is typically the largest overhead?", options: ["Lighting", "Cooling (HVAC)", "Security", "Network equipment"], correctIndex: 1, explanation: "Cooling typically accounts for 30-50% of non-IT power." },
    { question: "Free cooling refers to:", options: ["Government subsidies", "Using cold outside air", "Cooling requiring no fans", "Liquid cooling"], correctIndex: 1, explanation: "Free cooling uses ambient air when it's cold enough." },
    { question: "UPS at 95% efficiency with 1000kW IT load wastes:", options: ["50 kW", "950 kW", "5 kW", "500 kW"], correctIndex: 0, explanation: "5% of 1000kW = 50kW lost as heat." },
    { question: "Improving PUE from 2.0 to 1.5 with 1MW IT saves annually:", options: ["$50,000", "$250,000", "$438,000 (500kW x 8760h x $0.10)", "$1,000,000"], correctIndex: 2, explanation: "Saving 500kW continuously adds up to significant savings." },
    { question: "Google's best data centers achieve PUE of:", options: ["Around 1.10", "Around 1.50", "Around 2.00", "Around 0.80"], correctIndex: 0, explanation: "Google reports fleet-wide PUE of 1.10." },
    { question: "Higher cooling setpoints (warmer cold aisles):", options: ["Increase PUE", "Decrease PUE (less cooling needed)", "No effect on PUE", "Increase IT power"], correctIndex: 1, explanation: "Warmer setpoints require less mechanical cooling." },
    { question: "Which climate is best for free cooling?", options: ["Tropical", "Cold/temperate (like Nordic)", "Desert", "Doesn't matter"], correctIndex: 1, explanation: "Cold climates allow year-round free cooling." }
  ];

  private readonly transferApps: TransferApp[] = [
    { icon: "☁️", title: "Hyperscale Giants", description: "Google, Facebook, Microsoft achieve PUE of 1.1-1.2.", connection: "Google's average PUE is 1.10 - saving billions in electricity." },
    { icon: "🏢", title: "Enterprise Data Centers", description: "Typical enterprise PUE is 1.5-2.0.", connection: "Upgrading from PUE 2.0 to 1.5 saves 25% of total facility power." },
    { icon: "❄️", title: "Nordic Data Centers", description: "Countries like Iceland, Norway leverage cold climates.", connection: "Some Nordic facilities achieve PUE below 1.1." },
    { icon: "📦", title: "Modular/Edge Computing", description: "Pre-fabricated modular data centers optimize from factory.", connection: "Containerized designs can achieve PUE of 1.2-1.3." }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  private calcPUEMetrics() {
    const itPower = this.itLoad;
    let coolingMultiplier = (100 - this.coolingEfficiency) / 100 + 0.3;
    if (this.useFreeCooling && this.outdoorTemp < 18) coolingMultiplier *= 0.3;
    else if (this.useFreeCooling && this.outdoorTemp < 25) coolingMultiplier *= 0.6;
    const coolingPower = itPower * coolingMultiplier;
    const upsLossPower = itPower * ((100 - this.upsEfficiency) / 100);
    const miscPower = this.lightingPower;
    const totalPower = itPower + coolingPower + upsLossPower + miscPower;
    const pue = totalPower / itPower;
    const annualKWh = totalPower * 24 * 365;
    const annualCost = annualKWh * 0.10;
    const wastedEnergy = (totalPower - itPower) * 24 * 365;
    const wastedCost = wastedEnergy * 0.10;
    return { itPower, coolingPower, upsLossPower, miscPower, totalPower, pue, annualKWh, annualCost, wastedEnergy, wastedCost };
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
      if (input.id === 'it_load') this.itLoad = input.value;
      else if (input.id === 'cooling_eff') this.coolingEfficiency = input.value;
      else if (input.id === 'ups_eff') this.upsEfficiency = input.value;
      else if (input.id === 'lighting') this.lightingPower = input.value;
      else if (input.id === 'outdoor_temp') this.outdoorTemp = input.value;
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
        else if (buttonId === 'toggle_free_cooling') this.useFreeCooling = !this.useFreeCooling;
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
    this.itLoad = 1000;
    this.coolingEfficiency = 50;
    this.upsEfficiency = 92;
    this.lightingPower = 20;
    this.outdoorTemp = 25;
    this.useFreeCooling = false;
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

    const metrics = this.calcPUEMetrics();

    switch (this.phase) {
      case 'hook':
        r.text(200, 60, 'PUE: Power Usage Effectiveness', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(200, 100, 'If servers use 1MW, why does', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
        r.text(200, 120, 'the building need 1.5MW?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
        r.text(200, 200, '⚡ 🏢 📊', { fontSize: 48, textAnchor: 'middle' });
        r.roundRect(40, 250, 320, 120, 12, { fill: 'rgba(30, 41, 59, 0.8)' });
        r.text(200, 285, 'Where does the extra 500kW go?', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
        r.text(200, 305, 'Cooling, UPS losses, lighting, and more.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
        r.text(200, 340, 'PUE measures this overhead!', { fill: '#10b981', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
        r.addButton({ id: 'continue', label: 'Explore PUE', variant: 'primary' });
        break;

      case 'play':
        r.text(200, 40, 'PUE Calculator Lab', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(200, 70, `PUE: ${metrics.pue.toFixed(2)}`, { fill: metrics.pue < 1.3 ? '#22c55e' : metrics.pue < 1.7 ? '#eab308' : '#ef4444', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(50, 100, `IT Power: ${metrics.itPower} kW`, { fill: '#22c55e', fontSize: 11 });
        r.text(50, 115, `Cooling: ${metrics.coolingPower.toFixed(0)} kW`, { fill: '#3b82f6', fontSize: 11 });
        r.text(50, 130, `UPS Loss: ${metrics.upsLossPower.toFixed(0)} kW`, { fill: '#f97316', fontSize: 11 });
        r.text(50, 145, `Total: ${metrics.totalPower.toFixed(0)} kW`, { fill: '#fbbf24', fontSize: 11 });
        r.text(50, 165, `Annual Cost: $${(metrics.annualCost / 1000000).toFixed(2)}M`, { fill: '#9ca3af', fontSize: 10 });
        r.addSlider({ id: 'it_load', label: 'IT Load (kW)', min: 100, max: 5000, step: 100, value: this.itLoad });
        r.addSlider({ id: 'cooling_eff', label: 'Cooling Efficiency (%)', min: 20, max: 90, step: 5, value: this.coolingEfficiency });
        r.addSlider({ id: 'ups_eff', label: 'UPS Efficiency (%)', min: 80, max: 99, step: 1, value: this.upsEfficiency });
        r.addButton({ id: 'continue', label: 'Learn the Science', variant: 'primary' });
        break;

      case 'twist_play':
        r.text(200, 40, 'Free Cooling Demo', { fill: '#f97316', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(200, 70, `PUE: ${metrics.pue.toFixed(2)}`, { fill: metrics.pue < 1.3 ? '#22c55e' : metrics.pue < 1.7 ? '#eab308' : '#ef4444', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
        r.addSlider({ id: 'outdoor_temp', label: 'Outdoor Temp (C)', min: -10, max: 40, step: 1, value: this.outdoorTemp });
        r.addButton({ id: 'toggle_free_cooling', label: `Free Cooling: ${this.useFreeCooling ? 'ON' : 'OFF'}`, variant: this.useFreeCooling ? 'primary' : 'secondary' });
        r.text(200, 200, this.useFreeCooling && this.outdoorTemp < 18 ? 'Maximum free cooling active!' : this.useFreeCooling && this.outdoorTemp < 25 ? 'Partial free cooling' : 'Standard mechanical cooling', { fill: this.useFreeCooling && this.outdoorTemp < 25 ? '#22c55e' : '#9ca3af', fontSize: 11, textAnchor: 'middle' });
        r.addButton({ id: 'continue', label: 'See Explanation', variant: 'primary' });
        break;

      case 'mastery':
        r.text(200, 100, '⚡', { fontSize: 64, textAnchor: 'middle' });
        r.text(200, 170, 'PUE Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(200, 210, 'You\'ve mastered Power Usage Effectiveness!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
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
      itLoad: this.itLoad,
      coolingEfficiency: this.coolingEfficiency,
      upsEfficiency: this.upsEfficiency,
      lightingPower: this.lightingPower,
      outdoorTemp: this.outdoorTemp,
      useFreeCooling: this.useFreeCooling,
      testAnswers: this.testAnswers,
      completedApps: Array.from(this.completedApps)
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.itLoad) this.itLoad = state.itLoad as number;
    if (state.coolingEfficiency) this.coolingEfficiency = state.coolingEfficiency as number;
    if (state.upsEfficiency) this.upsEfficiency = state.upsEfficiency as number;
    if (state.lightingPower) this.lightingPower = state.lightingPower as number;
    if (state.outdoorTemp) this.outdoorTemp = state.outdoorTemp as number;
    if (state.useFreeCooling !== undefined) this.useFreeCooling = state.useFreeCooling as boolean;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createPUECalculatorGame(sessionId: string): PUECalculatorGame {
  return new PUECalculatorGame(sessionId);
}
