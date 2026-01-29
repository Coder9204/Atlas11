import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// SERVER AIRFLOW AND PRESSURE GAME - GAME 162
// ============================================================================
// Physics: Cold aisle/hot aisle separation, static pressure, CFM requirements
// Blanking panels prevent hot air recirculation
// Q = m_dot * Cp * deltaT for heat removal
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

export class ServerAirflowGame extends BaseGame {
  readonly gameType = 'server_airflow';
  readonly gameTitle = 'Server Airflow and Pressure: Hot/Cold Aisle Design';

  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private serverLoad = 70;
  private fanSpeed = 50;
  private blankingPanels = true;
  private raisedFloorOpen = 50;
  private hotAisleContainment = false;
  private animationTime = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  private readonly testQuestions: TestQuestion[] = [
    { question: "Why do data centers use raised floors?", options: ["To store cables", "To create a pressurized plenum for cold air", "To make cleaning easier", "For earthquake protection"], correctIndex: 1, explanation: "The plenum distributes cold air through perforated tiles." },
    { question: "What is the purpose of hot aisle/cold aisle layout?", options: ["To look organized", "To separate cold inlet from hot exhaust", "To save floor space", "To reduce noise"], correctIndex: 1, explanation: "Separation prevents wasteful mixing of hot and cold air." },
    { question: "Blanking panels prevent:", options: ["Dust from entering", "Hot air from recirculating to cold aisle", "Theft of equipment", "EMI"], correctIndex: 1, explanation: "Without blanking panels, hot exhaust shortcuts back to cold aisle." },
    { question: "CFM stands for:", options: ["Cold Flow Measurement", "Cubic Feet per Minute", "Cooling Factor Metric", "Central Fan Motor"], correctIndex: 1, explanation: "CFM measures volumetric airflow rate." },
    { question: "Static pressure is measured in:", options: ["PSI", "Inches of water column (WC)", "Degrees Celsius", "Watts"], correctIndex: 1, explanation: "Inches WC is standard for HVAC static pressure." },
    { question: "Hot aisle containment helps by:", options: ["Looking better", "Preventing hot/cold air mixing, improving CRAC efficiency", "Reducing noise", "Saving floor space"], correctIndex: 1, explanation: "Containment ensures hot return air goes directly to CRAC." },
    { question: "Ideal cold aisle temperature is typically:", options: ["5-10C (very cold)", "18-27C per ASHRAE guidelines", "30-35C (warm)", "0C (freezing)"], correctIndex: 1, explanation: "ASHRAE A1 allows 18-27C inlet temperature." },
    { question: "Bypass airflow refers to:", options: ["Air going through servers too fast", "Conditioned air returning to CRAC without cooling equipment", "Emergency ventilation", "Air through cable holes"], correctIndex: 1, explanation: "Bypass air wastes cooling energy." },
    { question: "Removing a server without blanking panels:", options: ["Nothing changes", "Hot air shortcuts through gap, raising cold aisle temp", "Rack cools better", "Static pressure increases"], correctIndex: 1, explanation: "Gaps allow hot air recirculation." },
    { question: "Delta T across a server depends on:", options: ["Server color", "Heat load and airflow rate (Q = m_dot * Cp * deltaT)", "Rack height only", "Room lighting"], correctIndex: 1, explanation: "Temperature rise = Heat / (flow * specific heat)." }
  ];

  private readonly transferApps: TransferApp[] = [
    { icon: "🏢", title: "Hyperscale Data Centers", description: "Google, Amazon, Microsoft run 100,000+ server facilities.", connection: "Hot aisle containment improves PUE by 0.1-0.2 points." },
    { icon: "🔌", title: "Colocation Facilities", description: "Colo providers cool diverse equipment from many customers.", connection: "Empty U-spaces without blanking panels raise intake temps 5-10C." },
    { icon: "📡", title: "Edge Computing", description: "Small edge sites (5-10 racks) still need proper airflow.", connection: "Self-contained pods maintain airflow in non-ideal locations." },
    { icon: "📞", title: "Telecom Central Offices", description: "Legacy telecom buildings often have poor airflow.", connection: "80% of cooling issues are airflow-related." }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  private calcAirflowMetrics() {
    const heatGenerated = this.serverLoad * 10;
    const effectiveCFM = this.fanSpeed * 20;
    const recirculationFactor = this.blankingPanels ? 0.1 : 0.5;
    const pressureDrop = (100 - this.raisedFloorOpen) * 0.02;
    const containmentBonus = this.hotAisleContainment ? 0.3 : 0;
    const coolingEfficiency = (effectiveCFM / 1000) * (1 - recirculationFactor - pressureDrop + containmentBonus);
    const coldAisleTemp = 18 + (1 - coolingEfficiency) * 5;
    const hotAisleTemp = coldAisleTemp + (heatGenerated / Math.max(1, effectiveCFM)) * 50;
    return {
      heatGenerated,
      effectiveCFM,
      coldAisleTemp: Math.max(18, Math.min(30, coldAisleTemp)),
      hotAisleTemp: Math.max(25, Math.min(50, hotAisleTemp)),
      recirculationPercent: recirculationFactor * 100,
      staticPressure: 0.05 + this.raisedFloorOpen * 0.001
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
      if (input.id === 'server_load') this.serverLoad = input.value;
      else if (input.id === 'fan_speed') this.fanSpeed = input.value;
      else if (input.id === 'floor_open') this.raisedFloorOpen = input.value;
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
        else if (buttonId === 'toggle_blanking') this.blankingPanels = !this.blankingPanels;
        else if (buttonId === 'toggle_containment') this.hotAisleContainment = !this.hotAisleContainment;
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
        else if (buttonId === 'toggle_blanking') this.blankingPanels = !this.blankingPanels;
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
    this.serverLoad = 70;
    this.fanSpeed = 50;
    this.blankingPanels = true;
    this.raisedFloorOpen = 50;
    this.hotAisleContainment = false;
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

    const metrics = this.calcAirflowMetrics();

    switch (this.phase) {
      case 'hook':
        r.text(200, 60, 'Server Airflow & Pressure', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(200, 100, 'Why do data centers have', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
        r.text(200, 120, 'raised floors with holes?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
        r.text(200, 200, '🏢 💨 ❄️', { fontSize: 48, textAnchor: 'middle' });
        r.roundRect(40, 250, 320, 120, 12, { fill: 'rgba(30, 41, 59, 0.8)' });
        r.text(200, 285, 'Hot and cold air mixing wastes energy.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
        r.text(200, 305, 'Pressurized plenums and containment help!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
        r.text(200, 340, 'A missing blanking panel raises temps 10C!', { fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
        r.addButton({ id: 'continue', label: 'Explore Data Center Cooling', variant: 'primary' });
        break;

      case 'play':
        r.text(200, 40, 'Data Center Airflow Lab', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(50, 80, `Cold Aisle: ${metrics.coldAisleTemp.toFixed(1)}C`, { fill: '#60a5fa', fontSize: 12 });
        r.text(50, 100, `Hot Aisle: ${metrics.hotAisleTemp.toFixed(1)}C`, { fill: '#f97316', fontSize: 12 });
        r.text(50, 120, `Recirculation: ${metrics.recirculationPercent.toFixed(0)}%`, { fill: this.blankingPanels ? '#22c55e' : '#ef4444', fontSize: 11 });
        r.text(50, 140, `CFM: ${metrics.effectiveCFM.toFixed(0)}`, { fill: '#9ca3af', fontSize: 11 });
        r.addSlider({ id: 'server_load', label: 'Server Load (%)', min: 20, max: 100, step: 5, value: this.serverLoad });
        r.addSlider({ id: 'fan_speed', label: 'CRAC Fan Speed (%)', min: 20, max: 100, step: 5, value: this.fanSpeed });
        r.addSlider({ id: 'floor_open', label: 'Floor Tile Openness (%)', min: 10, max: 100, step: 5, value: this.raisedFloorOpen });
        r.addButton({ id: 'toggle_blanking', label: `Blanking Panels: ${this.blankingPanels ? 'ON' : 'OFF'}`, variant: this.blankingPanels ? 'primary' : 'secondary' });
        r.addButton({ id: 'toggle_containment', label: `Containment: ${this.hotAisleContainment ? 'ON' : 'OFF'}`, variant: this.hotAisleContainment ? 'primary' : 'secondary' });
        r.addButton({ id: 'continue', label: 'Learn the Science', variant: 'primary' });
        break;

      case 'mastery':
        r.text(200, 100, '💨', { fontSize: 64, textAnchor: 'middle' });
        r.text(200, 170, 'Airflow Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(200, 210, 'You\'ve mastered data center airflow!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
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
      serverLoad: this.serverLoad,
      fanSpeed: this.fanSpeed,
      blankingPanels: this.blankingPanels,
      raisedFloorOpen: this.raisedFloorOpen,
      hotAisleContainment: this.hotAisleContainment,
      testAnswers: this.testAnswers,
      completedApps: Array.from(this.completedApps)
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.serverLoad) this.serverLoad = state.serverLoad as number;
    if (state.fanSpeed) this.fanSpeed = state.fanSpeed as number;
    if (state.blankingPanels !== undefined) this.blankingPanels = state.blankingPanels as boolean;
    if (state.raisedFloorOpen) this.raisedFloorOpen = state.raisedFloorOpen as number;
    if (state.hotAisleContainment !== undefined) this.hotAisleContainment = state.hotAisleContainment as boolean;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createServerAirflowGame(sessionId: string): ServerAirflowGame {
  return new ServerAirflowGame(sessionId);
}
