import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// HEAT SINK THERMAL RESISTANCE GAME - GAME 161
// ============================================================================
// Physics: Thermal resistance chain, Ohm's law analogy (deltaT = P x R)
// Thermal resistance adds in series just like electrical resistance
// Diminishing returns on fins due to boundary layer interference
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

export class HeatSinkThermalGame extends BaseGame {
  readonly gameType = 'heat_sink_thermal';
  readonly gameTitle = 'Heat Sink Thermal Resistance: Why CPUs Need Massive Coolers';

  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private cpuPower = 100;
  private finCount = 20;
  private finHeight = 40;
  private fanSpeed = 50;
  private thermalPaste: 'none' | 'cheap' | 'premium' = 'cheap';
  private animationTime = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  private readonly testQuestions: TestQuestion[] = [
    { question: "What is thermal resistance measured in?", options: ["Watts per meter", "Kelvin per Watt (K/W)", "Joules per second", "Celsius per meter"], correctIndex: 1, explanation: "Thermal resistance is measured in K/W or C/W." },
    { question: "In a thermal chain, total resistance is calculated by:", options: ["Taking the average", "Adding all resistances in series", "Multiplying all resistances", "Using only the largest"], correctIndex: 1, explanation: "Thermal resistances in series add up." },
    { question: "Why do CPUs need heatsinks but LEDs often don't?", options: ["LEDs don't produce heat", "CPUs produce much more power", "LEDs are always cooler", "Heatsinks only work on silicon"], correctIndex: 1, explanation: "CPUs dissipate 65-250W vs LEDs at 1-10W." },
    { question: "What is the purpose of thermal interface material (TIM)?", options: ["Electrical insulation", "Fill air gaps and reduce contact resistance", "Make heatsink stick better", "Increase thermal resistance"], correctIndex: 1, explanation: "TIM fills microscopic gaps that would otherwise trap insulating air." },
    { question: "If R_total = 0.5 K/W and power = 100W, temperature rise is:", options: ["200 degrees C", "50 degrees C", "0.005 degrees C", "5000 degrees C"], correctIndex: 1, explanation: "deltaT = P x R = 100 x 0.5 = 50C." },
    { question: "Why does increasing fin count have diminishing returns?", options: ["More fins weigh more", "Air can't flow well between tightly packed fins", "Fins block the CPU", "It doesn't - more fins always help"], correctIndex: 1, explanation: "Tightly packed fins restrict airflow and boundary layers merge." },
    { question: "What primarily limits heat transfer to air from fins?", options: ["Fin material conductivity", "Convective heat transfer coefficient", "Fin color", "CPU voltage"], correctIndex: 1, explanation: "The air-side convection is typically the limiting factor." },
    { question: "A vapor chamber improves cooling by:", options: ["Using fans internally", "Spreading heat quickly via phase change", "Adding more thermal paste", "Increasing thermal resistance"], correctIndex: 1, explanation: "Vapor chambers use evaporation/condensation to spread heat." },
    { question: "Which thermal paste property matters most?", options: ["Color", "Thermal conductivity (W/mK)", "Viscosity only", "Brand name"], correctIndex: 1, explanation: "Higher thermal conductivity means lower thermal resistance." },
    { question: "The junction-to-ambient thermal resistance includes:", options: ["Only the heatsink", "Die, TIM, heatsink base, fins, and convection", "Only the thermal paste", "Only the CPU die"], correctIndex: 1, explanation: "It's the sum of all resistances from chip junction to ambient air." }
  ];

  private readonly transferApps: TransferApp[] = [
    { icon: "💻", title: "CPU Cooling", description: "Modern CPUs dissipate 65-250W. Tower coolers use thermal resistance principles.", connection: "The chain: die -> IHS -> TIM -> heatsink base -> fins -> air" },
    { icon: "🎮", title: "GPU Cooling", description: "High-end GPUs can exceed 400W! Vapor chambers spread heat effectively.", connection: "Vapor chambers act like heat pipes but spread heat in 2D." },
    { icon: "🖥️", title: "Server Cooling", description: "Data centers cool thousands of servers. Each thermal solution matters for PUE.", connection: "Hot spots from bad TIM can reduce server lifespan." },
    { icon: "⚡", title: "Power Electronics", description: "IGBTs and MOSFETs need careful thermal management.", connection: "Thermal resistance from junction to case is a key datasheet spec." }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  private calcThermalResistance() {
    const R_jc = 0.3;
    const R_tim = this.thermalPaste === 'none' ? 2.0 : this.thermalPaste === 'cheap' ? 0.5 : 0.2;
    const R_base = 0.1;
    const finArea = this.finCount * this.finHeight * 0.05;
    const airflowFactor = 0.5 + (this.fanSpeed / 100) * 1.5;
    const R_fins = 1.0 / (finArea * airflowFactor * 0.1);
    const finEfficiency = Math.min(1, 15 / this.finCount);
    const R_fins_effective = R_fins / finEfficiency;
    return { R_jc, R_tim, R_base, R_fins: R_fins_effective, total: R_jc + R_tim + R_base + R_fins_effective };
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
      if (input.id === 'cpu_power') this.cpuPower = input.value;
      else if (input.id === 'fin_count') this.finCount = input.value;
      else if (input.id === 'fin_height') this.finHeight = input.value;
      else if (input.id === 'fan_speed') this.fanSpeed = input.value;
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
        else if (buttonId.startsWith('paste_')) {
          this.thermalPaste = buttonId.split('_')[1] as 'none' | 'cheap' | 'premium';
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
    this.cpuPower = 100;
    this.finCount = 20;
    this.finHeight = 40;
    this.fanSpeed = 50;
    this.thermalPaste = 'cheap';
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

    const thermalR = this.calcThermalResistance();
    const cpuTemp = 25 + this.cpuPower * thermalR.total;

    switch (this.phase) {
      case 'hook':
        r.text(200, 60, 'Heat Sink Thermal Resistance', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(200, 100, 'Why do CPUs need massive heat sinks', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
        r.text(200, 120, 'but LEDs don\'t?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
        r.text(200, 200, '🔥 💻 ❄️', { fontSize: 48, textAnchor: 'middle' });
        r.roundRect(40, 250, 320, 120, 12, { fill: 'rgba(30, 41, 59, 0.8)' });
        r.text(200, 285, 'A CPU generates 150W in a chip', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
        r.text(200, 305, 'smaller than your fingernail!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
        r.text(200, 340, 'Every layer in the cooling chain matters.', { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
        r.addButton({ id: 'continue', label: 'Explore Thermal Resistance', variant: 'primary' });
        break;

      case 'play':
        r.text(200, 40, 'Thermal Resistance Lab', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(200, 65, `CPU Temp: ${cpuTemp.toFixed(1)}C`, { fill: cpuTemp > 80 ? '#ef4444' : cpuTemp > 60 ? '#fbbf24' : '#22c55e', fontSize: 16, textAnchor: 'middle' });
        r.text(50, 100, `R_total: ${thermalR.total.toFixed(2)} K/W`, { fill: '#22d3ee', fontSize: 11 });
        r.text(50, 120, `R_jc: ${thermalR.R_jc.toFixed(2)}`, { fill: '#9ca3af', fontSize: 10 });
        r.text(50, 135, `R_tim: ${thermalR.R_tim.toFixed(2)}`, { fill: '#9ca3af', fontSize: 10 });
        r.text(50, 150, `R_base: ${thermalR.R_base.toFixed(2)}`, { fill: '#9ca3af', fontSize: 10 });
        r.text(50, 165, `R_fins: ${thermalR.R_fins.toFixed(2)}`, { fill: '#9ca3af', fontSize: 10 });
        r.addSlider({ id: 'cpu_power', label: 'CPU Power (W)', min: 50, max: 300, step: 10, value: this.cpuPower });
        r.addSlider({ id: 'fin_count', label: 'Fin Count', min: 5, max: 60, step: 1, value: this.finCount });
        r.addSlider({ id: 'fan_speed', label: 'Fan Speed (%)', min: 0, max: 100, step: 5, value: this.fanSpeed });
        r.addButton({ id: 'continue', label: 'Learn the Science', variant: 'primary' });
        break;

      case 'mastery':
        r.text(200, 100, '🔥', { fontSize: 64, textAnchor: 'middle' });
        r.text(200, 170, 'Thermal Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(200, 210, 'You\'ve mastered heat sink thermal resistance!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
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
      cpuPower: this.cpuPower,
      finCount: this.finCount,
      finHeight: this.finHeight,
      fanSpeed: this.fanSpeed,
      thermalPaste: this.thermalPaste,
      testAnswers: this.testAnswers,
      completedApps: Array.from(this.completedApps)
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.cpuPower) this.cpuPower = state.cpuPower as number;
    if (state.finCount) this.finCount = state.finCount as number;
    if (state.finHeight) this.finHeight = state.finHeight as number;
    if (state.fanSpeed) this.fanSpeed = state.fanSpeed as number;
    if (state.thermalPaste) this.thermalPaste = state.thermalPaste as 'none' | 'cheap' | 'premium';
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createHeatSinkThermalGame(sessionId: string): HeatSinkThermalGame {
  return new HeatSinkThermalGame(sessionId);
}
