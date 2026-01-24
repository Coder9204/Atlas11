/**
 * Capacitance Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Capacitance formula: C = epsilon_0 * epsilon_r * A / d
 * - Stored charge: Q = C * V
 * - Stored energy: U = 0.5 * C * V^2
 * - Electric field in capacitor: E = V / d
 * - Dielectric effects on capacitance
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

type GamePhase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

const testQuestions: TestQuestion[] = [
  { question: 'What does capacitance measure?', options: ['Resistance to current', 'Charge stored per volt', 'Energy dissipation', 'Magnetic field strength'], correctIndex: 1 },
  { question: 'If you increase plate area, capacitance:', options: ['Decreases', 'Stays same', 'Increases', 'Becomes zero'], correctIndex: 2 },
  { question: 'If you increase plate separation, capacitance:', options: ['Increases', 'Decreases', 'Stays same', 'Doubles'], correctIndex: 1 },
  { question: 'What does a dielectric do?', options: ['Conducts electricity', 'Increases capacitance', 'Reduces voltage', 'Creates resistance'], correctIndex: 1 },
  { question: 'Energy stored in a capacitor:', options: ['U = CV', 'U = 0.5*C*V^2', 'U = V/C', 'U = Q*V^2'], correctIndex: 1 },
  { question: 'SI unit of capacitance:', options: ['Ohm', 'Henry', 'Farad', 'Coulomb'], correctIndex: 2 },
  { question: 'Electric field in a parallel plate capacitor:', options: ['E = C*V', 'E = V/d', 'E = Q/A', 'E = epsilon*A'], correctIndex: 1 },
  { question: 'Why do capacitors block DC but pass AC?', options: ['They conduct DC', 'Charge/discharge cycles allow AC current', 'AC is faster', 'DC is too weak'], correctIndex: 1 },
  { question: 'A 10uF capacitor at 5V stores:', options: ['50 uC', '2 uC', '25 uC', '0.5 uC'], correctIndex: 0 },
  { question: 'Capacitors are used in flash cameras because:', options: ['They glow', 'They store and release energy quickly', 'They are cheap', 'They are small'], correctIndex: 1 },
];

const colors = {
  primary: '#f59e0b',
  primaryDark: '#d97706',
  accent: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  bgDark: '#0f172a',
  bgCard: '#1e293b',
  bgCardLight: '#334155',
  border: '#475569',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  positiveCharge: '#ef4444',
  negativeCharge: '#3b82f6',
  fieldLine: '#fbbf24',
};

const applications = [
  { title: 'Camera Flash', icon: 'flash', description: 'Capacitors store energy slowly, then release it in a bright burst for photography.', details: 'A camera flash capacitor stores ~50J and discharges in milliseconds.' },
  { title: 'Power Smoothing', icon: 'power', description: 'Capacitors filter voltage ripples in power supplies, creating stable DC.', details: 'Every computer power supply uses large capacitors for smoothing.' },
  { title: 'Touchscreens', icon: 'touch', description: 'Your finger changes capacitance at touch points, detected by the screen.', details: 'Capacitive touchscreens measure tiny capacitance changes (~pF).' },
  { title: 'Energy Storage', icon: 'battery', description: 'Supercapacitors store energy for quick release in hybrid vehicles.', details: 'Supercapacitors can charge/discharge millions of times without degrading.' },
];

const epsilon0 = 8.854e-12;

export class CapacitanceGame extends BaseGame {
  readonly gameType = 'capacitance';
  readonly gameTitle = 'Capacitance';

  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  private plateArea = 50;
  private plateSeparation = 5;
  private appliedVoltage = 12;
  private dielectricConstant = 1;
  private isCharging = false;
  private chargeProgress = 0;
  private showCharges = true;
  private showFieldLines = true;
  private time = 0;

  private testQuestion = 0;
  private testAnswers: (number | null)[] = Array(10).fill(null);
  private testSubmitted = false;

  private selectedApp = 0;
  private completedApps = [false, false, false, false];

  private lastNavTime = 0;
  private isNavigating = false;
  private guidedMode = true;

  private readonly phaseOrder: GamePhase[] = [
    'hook', 'predict', 'play', 'review', 'twist_predict',
    'twist_play', 'twist_review', 'transfer', 'test', 'mastery',
  ];

  private readonly phaseLabels: Record<GamePhase, string> = {
    hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review',
    twist_predict: 'Twist', twist_play: 'Demo', twist_review: 'Discovery',
    transfer: 'Apply', test: 'Test', mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'A capacitor is like a tiny rechargeable energy bucket. How much can it hold?',
    predict: 'Think about how plate size and distance might affect charge storage...',
    play: 'Adjust plate area and separation. Watch capacitance change!',
    review: 'C = epsilon * A / d. Larger area and smaller gap = more capacitance!',
    twist_predict: 'What if we put an insulator (dielectric) between the plates?',
    twist_play: 'Add different dielectrics and see capacitance multiply!',
    twist_review: 'Dielectrics polarize, reducing the effective field and increasing capacitance.',
    transfer: 'From camera flashes to touchscreens - capacitors are everywhere!',
    test: 'Test your understanding of capacitance!',
    mastery: 'You understand capacitors!',
  };

  constructor(sessionId: string) {
    super(sessionId);
  }

  initialize(config: SessionConfig): void {
    super.initialize(config);
    this.guidedMode = config.guidedMode ?? true;
    if (config.resumePhase && this.phaseOrder.includes(config.resumePhase as GamePhase)) {
      this.phase = config.resumePhase as GamePhase;
    }
    this.emitCoachEvent('game_started', { phase: this.phase });
  }

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click': this.handleButtonClick(input.id!); break;
      case 'slider_change': this.handleSliderChange(input.id!, input.value); break;
      case 'toggle_change': this.handleToggleChange(input.id!, input.value); break;
      case 'progress_click': this.handleProgressClick(input.index!); break;
    }
  }

  private handleButtonClick(id: string): void {
    if (id === 'next') { this.goNext(); return; }
    if (id === 'back') { this.goBack(); return; }

    if (id.startsWith('predict_')) { this.prediction = id.replace('predict_', ''); return; }
    if (id.startsWith('twist_')) { this.twistPrediction = id.replace('twist_', ''); return; }
    if (id.startsWith('answer_')) { this.testAnswers[this.testQuestion] = parseInt(id.replace('answer_', ''), 10); return; }
    if (id === 'test_next' && this.testQuestion < 9) { this.testQuestion++; return; }
    if (id === 'test_prev' && this.testQuestion > 0) { this.testQuestion--; return; }
    if (id === 'test_submit') { this.testSubmitted = true; return; }
    if (id.startsWith('app_')) { const idx = parseInt(id.replace('app_', ''), 10); this.selectedApp = idx; this.completedApps[idx] = true; return; }
    if (id === 'charge') { this.isCharging = true; this.chargeProgress = 0; return; }
    if (id === 'discharge') { this.chargeProgress = 0; this.isCharging = false; return; }
    if (id.startsWith('dielectric_')) {
      const vals: Record<string, number> = { air: 1, glass: 5, ceramic: 100, water: 80 };
      this.dielectricConstant = vals[id.replace('dielectric_', '')] || 1;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'plate_area') { this.plateArea = value; }
    if (id === 'plate_separation') { this.plateSeparation = value; }
    if (id === 'voltage') { this.appliedVoltage = value; }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'show_charges') { this.showCharges = value; }
    if (id === 'show_field') { this.showFieldLines = value; }
  }

  private handleProgressClick(index: number): void {
    const currentIdx = this.phaseOrder.indexOf(this.phase);
    if (index < currentIdx) { this.goToPhase(this.phaseOrder[index]); }
  }

  private goToPhase(newPhase: GamePhase): void {
    const now = Date.now();
    if (now - this.lastNavTime < 200 || this.isNavigating) return;
    this.lastNavTime = now;
    this.isNavigating = true;
    this.phase = newPhase;
    this.emitCoachEvent('phase_changed', { phase: newPhase });
    setTimeout(() => { this.isNavigating = false; }, 400);
  }

  private goNext(): void {
    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx < this.phaseOrder.length - 1) this.goToPhase(this.phaseOrder[idx + 1]);
  }

  private goBack(): void {
    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx > 0) this.goToPhase(this.phaseOrder[idx - 1]);
  }

  /** PROTECTED: Calculate capacitance in pF */
  private calculateCapacitance(): number {
    const areaM2 = this.plateArea * 1e-4;
    const separationM = this.plateSeparation * 1e-3;
    return (epsilon0 * this.dielectricConstant * areaM2) / separationM * 1e12;
  }

  /** PROTECTED: Calculate stored charge in pC */
  private calculateCharge(): number {
    return this.calculateCapacitance() * this.appliedVoltage * (this.chargeProgress / 100);
  }

  /** PROTECTED: Calculate stored energy in uJ */
  private calculateEnergy(): number {
    const C = this.calculateCapacitance() * 1e-12;
    return 0.5 * C * this.appliedVoltage * this.appliedVoltage * 1e6 * (this.chargeProgress / 100);
  }

  /** PROTECTED: Calculate electric field in V/m */
  private calculateElectricField(): number {
    const separationM = this.plateSeparation * 1e-3;
    return this.appliedVoltage / separationM * (this.chargeProgress / 100);
  }

  update(deltaTime: number): void {
    this.time += deltaTime / 1000;
    if (this.isCharging && this.chargeProgress < 100) {
      this.chargeProgress = Math.min(100, this.chargeProgress + 3);
      if (this.chargeProgress >= 100) this.isCharging = false;
    }
  }

  private calculateTestScore(): number {
    let correct = 0;
    for (let i = 0; i < testQuestions.length; i++) {
      if (this.testAnswers[i] === testQuestions[i].correctIndex) correct++;
    }
    return correct;
  }

  render(): GameFrame {
    const r = new CommandRenderer(this.viewport.width, this.viewport.height);
    r.reset();
    r.setViewport(700, 500);
    r.clear(colors.bgDark);

    switch (this.phase) {
      case 'hook': this.renderHookPhase(r); break;
      case 'predict': this.renderPredictPhase(r); break;
      case 'play': this.renderPlayPhase(r); break;
      case 'review': this.renderReviewPhase(r); break;
      case 'twist_predict': this.renderTwistPredictPhase(r); break;
      case 'twist_play': this.renderTwistPlayPhase(r); break;
      case 'twist_review': this.renderTwistReviewPhase(r); break;
      case 'transfer': this.renderTransferPhase(r); break;
      case 'test': this.renderTestPhase(r); break;
      case 'mastery': this.renderMasteryPhase(r); break;
    }

    this.renderUIState(r);
    return r.toFrame(this.nextFrame());
  }

  private renderCapacitor(r: CommandRenderer, centerX: number, centerY: number, w: number, h: number): void {
    r.rect(centerX - w/2, centerY - h/2, w, h, { fill: colors.bgCard, stroke: colors.border, rx: 12 });

    const plateWidth = Math.min(150, this.plateArea * 2);
    const gap = Math.min(100, this.plateSeparation * 8);
    const plateHeight = 150;

    // Plates
    r.rect(centerX - gap/2 - 15, centerY - plateHeight/2, 15, plateHeight, { fill: colors.textSecondary, stroke: colors.textPrimary });
    r.rect(centerX + gap/2, centerY - plateHeight/2, 15, plateHeight, { fill: colors.textSecondary, stroke: colors.textPrimary });

    // Charges
    if (this.showCharges && this.chargeProgress > 0) {
      const numCharges = Math.floor(this.chargeProgress / 10);
      for (let i = 0; i < numCharges; i++) {
        const y = centerY - 60 + i * 15;
        r.text(centerX - gap/2 - 8, y, '+', { fill: colors.positiveCharge, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(centerX + gap/2 + 8, y, '-', { fill: colors.negativeCharge, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      }
    }

    // Field lines
    if (this.showFieldLines && this.chargeProgress > 0) {
      const numLines = 5;
      for (let i = 0; i < numLines; i++) {
        const y = centerY - 50 + i * 25;
        r.line(centerX - gap/2 + 5, y, centerX + gap/2 - 5, y, {
          stroke: colors.fieldLine,
          strokeWidth: 1,
          opacity: this.chargeProgress / 100,
        });
        // Arrow
        r.polygon([
          { x: centerX + gap/2 - 15, y: y - 4 },
          { x: centerX + gap/2 - 5, y },
          { x: centerX + gap/2 - 15, y: y + 4 },
        ], { fill: colors.fieldLine, opacity: this.chargeProgress / 100 });
      }
    }

    // Dielectric indicator
    if (this.dielectricConstant > 1) {
      r.rect(centerX - gap/2 + 20, centerY - 50, gap - 40, 100, {
        fill: '#4ade8040',
        stroke: colors.success,
        rx: 4,
      });
      r.text(centerX, centerY, `er=${this.dielectricConstant}`, { fill: colors.success, fontSize: 12, textAnchor: 'middle' });
    }

    // Stats
    const C = this.calculateCapacitance();
    const Q = this.calculateCharge();
    const U = this.calculateEnergy();

    r.rect(centerX + 110, centerY - 80, 130, 160, { fill: colors.bgCardLight, rx: 8 });
    r.text(centerX + 175, centerY - 60, 'Capacitance', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(centerX + 175, centerY - 40, `${C.toFixed(1)} pF`, { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(centerX + 175, centerY - 10, 'Charge', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(centerX + 175, centerY + 10, `${Q.toFixed(1)} pC`, { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(centerX + 175, centerY + 40, 'Energy', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(centerX + 175, centerY + 60, `${U.toFixed(2)} uJ`, { fill: colors.success, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
  }

  private renderHookPhase(r: CommandRenderer): void {
    r.text(350, 100, 'Capacitance', { fill: colors.textPrimary, fontSize: 32, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 135, 'The ability to store electric charge', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });

    r.rect(160, 160, 380, 200, { fill: colors.bgCard, stroke: colors.border, rx: 20 });
    r.text(350, 200, 'Two metal plates separated by a gap.', { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 230, 'Connect them to a battery...', { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 270, 'How much charge can they store?', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
  }

  private renderPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', { fill: colors.textPrimary, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(100, 80, 500, 80, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 115, 'You want to store more charge in a capacitor.', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 140, 'What should you do to the plate area and separation?', { fill: colors.textPrimary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    if (this.prediction) {
      const isCorrect = this.prediction === 'B';
      r.rect(100, 340, 500, 60, { fill: isCorrect ? '#065f4620' : '#7f1d1d20', stroke: isCorrect ? colors.success : colors.danger, rx: 12 });
      r.text(350, 375, isCorrect ? 'Correct! Larger area and smaller gap increase capacitance!' : 'Think about how charge distributes on plates and field strength.', {
        fill: isCorrect ? colors.success : colors.danger, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle',
      });
    }
  }

  private renderPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Capacitor Lab', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    this.renderCapacitor(r, 280, 200, 400, 280);

    r.rect(100, 370, 500, 60, { fill: colors.bgCardLight, rx: 12 });
    r.text(350, 395, 'C = epsilon_0 * epsilon_r * A / d', { fill: colors.primary, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 415, 'Larger area and smaller separation = more capacitance!', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Capacitance', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(50, 70, 290, 130, { fill: '#f59e0b40', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'The Formula', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    ['C = epsilon * A / d', 'A = plate area (larger = more C)', 'd = separation (smaller = more C)'].forEach((line, i) => {
      r.text(70, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 130, { fill: '#3b82f640', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Energy Storage', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    ['Q = C * V (charge)', 'U = 0.5 * C * V^2 (energy)', 'Double voltage = 4x energy!'].forEach((line, i) => {
      r.text(380, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(50, 220, 600, 70, { fill: '#10b98140', stroke: colors.success, rx: 16 });
    r.text(350, 245, 'Key Insight', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 270, 'Capacitors store energy in the electric field between the plates!', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Dielectric Challenge', { fill: colors.accent, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'You insert an insulating material between the plates.', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 155, 'What happens to the capacitance?', { fill: colors.textPrimary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'C';
      r.rect(100, 340, 500, 60, { fill: isCorrect ? '#065f4620' : '#7f1d1d20', stroke: isCorrect ? colors.success : colors.danger, rx: 12 });
      r.text(350, 375, isCorrect ? 'Yes! Dielectrics multiply capacitance by their constant!' : 'Think about how the insulator affects the electric field.', {
        fill: isCorrect ? colors.success : colors.danger, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle',
      });
    }
  }

  private renderTwistPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Dielectric Lab', { fill: colors.accent, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    this.renderCapacitor(r, 280, 200, 400, 280);

    r.rect(100, 370, 500, 60, { fill: colors.bgCardLight, rx: 12 });
    r.text(350, 395, `Dielectric Constant (epsilon_r) = ${this.dielectricConstant}`, { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 415, 'Dielectrics polarize to reduce the effective field, allowing more charge!', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Dielectric Physics', { fill: colors.accent, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(100, 90, 500, 150, { fill: '#3b82f630', stroke: colors.accent, rx: 16 });
    r.text(350, 120, 'How Dielectrics Work', { fill: colors.accent, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 155, 'Molecules in the dielectric POLARIZE', { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 180, 'They create an opposing field that reduces E_net', { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 215, 'Lower field for same voltage = MORE charge can be stored!', { fill: colors.success, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
  }

  private renderTransferPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Real-World Applications', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    applications.forEach((app, i) => {
      const x = 80 + i * 155;
      r.rect(x, 70, 140, 40, {
        fill: i === this.selectedApp ? colors.primary : colors.bgCard,
        stroke: this.completedApps[i] ? colors.success : colors.border, rx: 8,
      });
      r.text(x + 70, 95, app.title.split(' ')[0], {
        fill: i === this.selectedApp ? colors.textPrimary : colors.textSecondary, fontSize: 11, textAnchor: 'middle',
      });
    });

    const app = applications[this.selectedApp];
    r.rect(80, 130, 540, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 165, app.title, { fill: colors.textPrimary, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 200, app.description, { fill: colors.textSecondary, fontSize: 13, textAnchor: 'middle' });
    r.text(350, 260, app.details, { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });

    r.text(350, 360, `Progress: ${this.completedApps.filter(c => c).length}/4`, { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    applications.forEach((_, i) => { r.circle(310 + i * 25, 385, 6, { fill: this.completedApps[i] ? colors.success : colors.bgCardLight }); });
  }

  private renderTestPhase(r: CommandRenderer): void {
    if (this.testSubmitted) {
      const score = this.calculateTestScore();
      const passed = score >= 7;
      r.text(350, 100, passed ? 'Congratulations!' : 'Keep Learning!', { fill: passed ? colors.success : colors.warning, fontSize: 32, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(350, 160, `Score: ${score} / 10`, { fill: colors.textPrimary, fontSize: 24, textAnchor: 'middle' });
      return;
    }

    const q = testQuestions[this.testQuestion];
    r.text(350, 40, `Question ${this.testQuestion + 1} of 10`, { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 80, q.question, { fill: colors.textPrimary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    q.options.forEach((opt, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;
      r.rect(100, 110 + i * 55, 500, 45, { fill: isSelected ? colors.primary + '40' : colors.bgCard, stroke: isSelected ? colors.primary : colors.border, rx: 8 });
      r.text(350, 138 + i * 55, opt, { fill: isSelected ? colors.primary : colors.textSecondary, fontSize: 13, textAnchor: 'middle' });
    });
  }

  private renderMasteryPhase(r: CommandRenderer): void {
    r.rect(150, 80, 400, 340, { fill: colors.bgCard, stroke: colors.border, rx: 24 });
    r.text(350, 130, 'Capacitance Master!', { fill: colors.textPrimary, fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 165, 'You understand capacitors!', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });

    const badges = [{ icon: 'C=eA/d', label: 'Formula' }, { icon: 'U', label: 'Energy' }, { icon: 'er', label: 'Dielectrics' }, { icon: 'flash', label: 'Applications' }];
    badges.forEach((badge, i) => {
      const x = 180 + (i % 2) * 170;
      const y = 200 + Math.floor(i / 2) * 80;
      r.rect(x, y, 150, 60, { fill: colors.bgCardLight, rx: 12 });
      r.text(x + 75, y + 25, badge.icon, { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x + 75, y + 45, badge.label, { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    });
  }

  private renderUIState(r: CommandRenderer): void {
    r.setHeader(this.gameTitle, this.phaseLabels[this.phase]);
    r.setProgress({ id: 'progress', current: this.phaseOrder.indexOf(this.phase) + 1, total: 10, labels: this.phaseOrder.map(p => this.phaseLabels[p]), color: colors.primary });
    if (this.guidedMode) r.setCoachMessage(this.coachMessages[this.phase]);

    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx > 0) r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });

    switch (this.phase) {
      case 'hook': r.addButton({ id: 'next', label: 'Make a Prediction', variant: 'primary' }); break;
      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Smaller area, larger gap', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Larger area, smaller gap', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Doesn\'t matter', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        if (this.prediction) r.addButton({ id: 'next', label: 'See the Lab', variant: 'success' });
        break;
      case 'play':
        r.addSlider({ id: 'plate_area', label: 'Plate Area (cm^2)', value: this.plateArea, min: 10, max: 100, step: 5 });
        r.addSlider({ id: 'plate_separation', label: 'Separation (mm)', value: this.plateSeparation, min: 1, max: 20, step: 1 });
        r.addSlider({ id: 'voltage', label: 'Voltage (V)', value: this.appliedVoltage, min: 1, max: 24, step: 1 });
        r.addButton({ id: 'charge', label: 'Charge', variant: 'success' });
        r.addButton({ id: 'discharge', label: 'Discharge', variant: 'danger' });
        r.addButton({ id: 'next', label: 'Review', variant: 'primary' });
        break;
      case 'review': r.addButton({ id: 'next', label: 'Try Dielectrics', variant: 'warning' }); break;
      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Decreases', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Stays same', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Increases', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        if (this.twistPrediction) r.addButton({ id: 'next', label: 'See It', variant: 'success' });
        break;
      case 'twist_play':
        r.addButton({ id: 'dielectric_air', label: 'Air (1)', variant: this.dielectricConstant === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'dielectric_glass', label: 'Glass (5)', variant: this.dielectricConstant === 5 ? 'primary' : 'ghost' });
        r.addButton({ id: 'dielectric_water', label: 'Water (80)', variant: this.dielectricConstant === 80 ? 'primary' : 'ghost' });
        r.addButton({ id: 'dielectric_ceramic', label: 'Ceramic (100)', variant: this.dielectricConstant === 100 ? 'primary' : 'ghost' });
        r.addButton({ id: 'charge', label: 'Charge', variant: 'success' });
        r.addButton({ id: 'next', label: 'See Why', variant: 'primary' });
        break;
      case 'twist_review': r.addButton({ id: 'next', label: 'Applications', variant: 'primary' }); break;
      case 'transfer':
        applications.forEach((_, i) => r.addButton({ id: `app_${i}`, label: applications[i].title.split(' ')[0], variant: i === this.selectedApp ? 'primary' : 'ghost' }));
        if (this.completedApps.every(c => c)) r.addButton({ id: 'next', label: 'Take Test', variant: 'success' });
        break;
      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= 9 });
          if (this.testAnswers.every(a => a !== null)) r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
        } else {
          if (this.calculateTestScore() >= 7) r.addButton({ id: 'next', label: 'Claim Badge', variant: 'success' });
          else r.addButton({ id: 'back', label: 'Review', variant: 'secondary' });
        }
        break;
      case 'mastery': r.addButton({ id: 'back', label: 'Explore Again', variant: 'secondary' }); break;
    }
  }

  getCurrentPhase(): string { return this.phase; }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase, prediction: this.prediction, twistPrediction: this.twistPrediction,
      plateArea: this.plateArea, plateSeparation: this.plateSeparation, appliedVoltage: this.appliedVoltage,
      dielectricConstant: this.dielectricConstant, chargeProgress: this.chargeProgress,
      testQuestion: this.testQuestion, testAnswers: this.testAnswers, testSubmitted: this.testSubmitted,
      selectedApp: this.selectedApp, completedApps: this.completedApps, guidedMode: this.guidedMode,
    };
  }

  restoreState(state: Record<string, unknown>): void {
    this.phase = (state.phase as GamePhase) || 'hook';
    this.prediction = (state.prediction as string) || null;
    this.twistPrediction = (state.twistPrediction as string) || null;
    this.plateArea = (state.plateArea as number) || 50;
    this.plateSeparation = (state.plateSeparation as number) || 5;
    this.appliedVoltage = (state.appliedVoltage as number) || 12;
    this.dielectricConstant = (state.dielectricConstant as number) || 1;
    this.chargeProgress = (state.chargeProgress as number) || 0;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

export function createCapacitanceGame(sessionId: string): CapacitanceGame {
  return new CapacitanceGame(sessionId);
}
