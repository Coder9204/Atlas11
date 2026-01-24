/**
 * Specific Heat Game - Server-Side Implementation
 *
 * PROTECTED IP:
 * - Heat equation: Q = m * c * delta_T
 * - Specific heat values for materials
 * - Thermal equilibrium calculations
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion { question: string; options: string[]; correctIndex: number; }

const testQuestions: TestQuestion[] = [
  { question: 'Specific heat capacity is defined as:', options: ['Total heat in an object', 'Heat needed to raise 1 kg by 1 K', 'Temperature of a substance', 'Mass times temperature'], correctIndex: 1 },
  { question: 'Water has specific heat of 4.18 J/g K. This means:', options: ['Water is cold', 'Water resists temperature change well', 'Water heats quickly', 'Water is heavy'], correctIndex: 1 },
  { question: 'The formula Q = mc*delta_T calculates:', options: ['Mass', 'Specific heat', 'Heat transferred', 'Temperature'], correctIndex: 2 },
  { question: 'Which material heats fastest for same energy input?', options: ['Water (c=4.18)', 'Iron (c=0.45)', 'Aluminum (c=0.90)', 'All same'], correctIndex: 1 },
  { question: 'Why do coastal areas have milder climates?', options: ['Less sun', 'Water high c buffers temperature', 'Mountains block wind', 'More rain'], correctIndex: 1 },
  { question: 'Car engines use water-based coolant because:', options: ['Water is cheap', 'Water c value absorbs lots of heat', 'Water is blue', 'Water evaporates'], correctIndex: 1 },
  { question: 'In Q = mc*delta_T, if c doubles:', options: ['Q halves', 'Q doubles for same delta_T', 'Q stays same', 'delta_T doubles'], correctIndex: 1 },
  { question: 'Thermal mass in buildings refers to:', options: ['Building weight', 'Materials with high c that stabilize temperature', 'Insulation thickness', 'Window size'], correctIndex: 1 },
  { question: 'Sand heats faster than water at the beach because:', options: ['Sand is darker', 'Sand has lower specific heat', 'Sand is drier', 'Wind cools water'], correctIndex: 1 },
  { question: 'To double the temperature rise with same Q:', options: ['Double the mass', 'Halve the mass', 'Double the specific heat', 'Cannot be done'], correctIndex: 1 },
];

const MATERIALS: Record<string, { c: number; name: string; color: string }> = {
  water: { c: 4.18, name: 'Water', color: '#3b82f6' },
  iron: { c: 0.45, name: 'Iron', color: '#6b7280' },
  aluminum: { c: 0.90, name: 'Aluminum', color: '#d1d5db' },
  sand: { c: 0.84, name: 'Sand', color: '#fbbf24' },
};

const colors = { primary: '#f59e0b', accent: '#06b6d4', success: '#10b981', danger: '#ef4444', bgDark: '#0a0f1a', bgCard: '#0f172a', bgCardLight: '#1e293b', border: '#334155', textPrimary: '#f8fafc', textSecondary: '#94a3b8', textMuted: '#64748b', heat: '#ef4444', cold: '#3b82f6' };

const applications = [
  { title: 'Climate Regulation', description: 'Oceans with high specific heat moderate coastal temperatures.', details: 'San Francisco stays mild year-round while inland areas have extreme temperature swings.' },
  { title: 'Engine Cooling Systems', description: 'Water-based coolant absorbs engine heat efficiently.', details: 'Water can absorb 4x more heat than equal mass of oil before reaching same temperature.' },
  { title: 'Thermal Mass in Buildings', description: 'Concrete and stone stabilize indoor temperatures.', details: 'Passivhaus buildings use thermal mass to reduce heating/cooling energy by 90%.' },
  { title: 'Industrial Heat Transfer', description: 'Process engineers choose fluids based on specific heat.', details: 'Chemical plants use water, oil, or molten salt depending on temperature range and c value.' },
];

export class SpecificHeatGame extends BaseGame {
  readonly gameType = 'specific_heat';
  readonly gameTitle = 'Specific Heat';

  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private selectedMaterial = 'water';
  private mass = 100;
  private heatAdded = 1000;
  private initialTemp = 20;
  private time = 0;
  private testQuestion = 0;
  private testAnswers: (number | null)[] = Array(10).fill(null);
  private testSubmitted = false;
  private selectedApp = 0;
  private completedApps = [false, false, false, false];
  private guidedMode = true;

  private readonly phaseOrder: GamePhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
  private readonly phaseLabels: Record<GamePhase, string> = { hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review', twist_predict: 'Twist Predict', twist_play: 'Twist Lab', twist_review: 'Twist Review', transfer: 'Transfer', test: 'Test', mastery: 'Mastery' };
  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Why does sand at the beach burn your feet while the water stays cool? Specific heat!',
    predict: 'Same heat added to different materials. Which gets hotter?',
    play: 'Add heat to different materials. Watch how temperature changes!',
    review: 'Q = mc*delta_T. Higher c means more heat needed for same temperature rise!',
    twist_predict: 'What if you mix hot and cold water?',
    twist_play: 'Explore thermal equilibrium calculations.',
    twist_review: 'Energy conservation: Q_lost = Q_gained at equilibrium.',
    transfer: 'From oceans to engines, specific heat shapes our world!',
    test: 'Test your understanding of specific heat!',
    mastery: 'You now understand thermal properties of matter!',
  };

  constructor(sessionId: string) { super(sessionId); }

  initialize(config: SessionConfig): void {
    super.initialize(config);
    this.guidedMode = config.guidedMode ?? true;
    if (config.resumePhase && this.phaseOrder.includes(config.resumePhase as GamePhase)) this.phase = config.resumePhase as GamePhase;
  }

  handleInput(input: UserInput): void {
    if (input.type === 'button_click') this.handleButtonClick(input.id!);
    else if (input.type === 'slider_change') this.handleSliderChange(input.id!, input.value);
  }

  private handleButtonClick(id: string): void {
    if (id === 'next') this.goNext();
    else if (id === 'back') this.goBack();
    else if (id.startsWith('predict_')) this.prediction = id.replace('predict_', '');
    else if (id.startsWith('twist_')) this.twistPrediction = id.replace('twist_', '');
    else if (id.startsWith('material_')) this.selectedMaterial = id.replace('material_', '');
    else if (id.startsWith('answer_')) this.testAnswers[this.testQuestion] = parseInt(id.replace('answer_', ''), 10);
    else if (id === 'test_next' && this.testQuestion < 9) this.testQuestion++;
    else if (id === 'test_prev' && this.testQuestion > 0) this.testQuestion--;
    else if (id === 'test_submit') { this.testSubmitted = true; this.emitCoachEvent('test_completed', { score: this.calculateTestScore() }); }
    else if (id.startsWith('app_')) { const i = parseInt(id.replace('app_', ''), 10); this.selectedApp = i; this.completedApps[i] = true; }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'mass') this.mass = value;
    else if (id === 'heat') this.heatAdded = value;
  }

  private goNext(): void { const idx = this.phaseOrder.indexOf(this.phase); if (idx < 9) this.phase = this.phaseOrder[idx + 1]; }
  private goBack(): void { const idx = this.phaseOrder.indexOf(this.phase); if (idx > 0) this.phase = this.phaseOrder[idx - 1]; }

  private calculateTempChange(): number {
    const material = MATERIALS[this.selectedMaterial];
    return this.heatAdded / (this.mass * material.c);
  }

  private calculateFinalTemp(): number {
    return this.initialTemp + this.calculateTempChange();
  }

  update(deltaTime: number): void { this.time += deltaTime / 1000; }
  private calculateTestScore(): number { return testQuestions.filter((q, i) => this.testAnswers[i] === q.correctIndex).length; }

  render(): GameFrame {
    const r = new CommandRenderer(this.viewport.width, this.viewport.height);
    r.reset();
    r.setViewport(700, 500);
    r.clear(colors.bgDark);

    switch (this.phase) {
      case 'hook': this.renderHook(r); break;
      case 'predict': this.renderPredict(r); break;
      case 'play': this.renderPlay(r); break;
      case 'review': this.renderReview(r); break;
      case 'twist_predict': this.renderTwistPredict(r); break;
      case 'twist_play': this.renderTwistPlay(r); break;
      case 'twist_review': this.renderTwistReview(r); break;
      case 'transfer': this.renderTransfer(r); break;
      case 'test': this.renderTest(r); break;
      case 'mastery': this.renderMastery(r); break;
    }
    this.renderUI(r);
    return r.toFrame(this.nextFrame());
  }

  private renderHook(r: CommandRenderer): void {
    r.text(350, 100, 'Why Does Sand Burn Your Feet?', { fill: colors.textPrimary, fontSize: 32, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 140, 'The water stays cool while sand is scorching hot!', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.rect(160, 180, 380, 220, { fill: colors.bgCard, stroke: colors.border, rx: 20 });
    this.renderBeaker(r, 270, 290, 'water');
    this.renderBeaker(r, 430, 290, 'sand');
    r.text(350, 410, 'Materials need different amounts of heat to warm up!', { fill: colors.primary, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
  }

  private renderBeaker(r: CommandRenderer, cx: number, cy: number, material: string): void {
    const mat = MATERIALS[material];
    const tempChange = this.heatAdded / (this.mass * mat.c);
    const fillHeight = 80;
    r.rect(cx - 30, cy - 50, 60, 100, { fill: colors.bgCardLight, stroke: colors.border, rx: 4 });
    r.rect(cx - 25, cy + 50 - fillHeight, 50, fillHeight, { fill: mat.color, rx: 2 });
    r.text(cx, cy + 70, mat.name, { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(cx, cy - 60, `c = ${mat.c}`, { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', { fill: colors.textPrimary, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(100, 80, 500, 80, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'Same heat added to equal masses of water and iron.', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    if (this.prediction) {
      const isCorrect = this.prediction === 'B';
      r.rect(100, 340, 500, 60, { fill: isCorrect ? '#065f4620' : '#7f1d1d20', stroke: isCorrect ? colors.success : colors.danger, rx: 12 });
      r.text(350, 375, isCorrect ? 'Correct! Iron has lower specific heat, so it heats up more!' : 'Not quite. Lower c means less heat needed for same temp rise.', { fill: isCorrect ? colors.success : colors.danger, fontSize: 13, textAnchor: 'middle' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(350, 30, 'Specific Heat Lab', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(80, 50, 350, 300, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderBeaker(r, 255, 200, this.selectedMaterial);

    const material = MATERIALS[this.selectedMaterial];
    const deltaT = this.calculateTempChange();
    const finalT = this.calculateFinalTemp();

    r.rect(450, 50, 200, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(550, 80, 'Calculations', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(470, 110, 'Material:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 110, material.name, { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });
    r.text(470, 140, 'c:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 140, `${material.c} J/g K`, { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });
    r.text(470, 170, 'delta_T:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 170, `${deltaT.toFixed(1)} K`, { fill: colors.heat, fontSize: 16, fontWeight: 'bold', textAnchor: 'end' });
    r.text(470, 200, 'Final T:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 200, `${finalT.toFixed(1)} C`, { fill: colors.success, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });

    r.rect(80, 370, 570, 50, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(365, 400, 'Q = m * c * delta_T  |  Higher c = harder to heat', { fill: colors.primary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Specific Heat', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(50, 70, 290, 160, { fill: '#f59e0b40', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'The Formula', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    ['Q = m * c * delta_T', 'Q = heat energy (J)', 'm = mass (g or kg)', 'c = specific heat (J/g K)'].forEach((l, i) => r.text(70, 120 + i * 22, '* ' + l, { fill: colors.textSecondary, fontSize: 11 }));

    r.rect(360, 70, 290, 160, { fill: '#06b6d440', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Key Insight', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    ['High c: resists temperature change', 'Low c: heats/cools quickly', 'Water c = 4.18 (very high!)', 'Metals c = 0.1-1.0 (low)'].forEach((l, i) => r.text(380, 120 + i * 22, '* ' + l, { fill: colors.textSecondary, fontSize: 11 }));
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist Challenge', { fill: colors.accent, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 140, 'You mix 100g of hot water (80C) with 100g of cold water (20C).', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 165, 'What is the final temperature?', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'B';
      r.rect(100, 340, 500, 60, { fill: isCorrect ? '#065f4620' : '#7f1d1d20', stroke: isCorrect ? colors.success : colors.danger, rx: 12 });
      r.text(350, 375, isCorrect ? 'Correct! Energy conserved: (80+20)/2 = 50C for equal masses!' : 'Not quite. Energy from hot = energy to cold: final T is the average.', { fill: isCorrect ? colors.success : colors.danger, fontSize: 13, textAnchor: 'middle' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(350, 30, 'Thermal Equilibrium', { fill: colors.accent, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(80, 50, 540, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 100, 'When two substances mix:', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 140, 'Q_lost by hot = Q_gained by cold', { fill: colors.primary, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 180, 'm1*c1*(T1-Tf) = m2*c2*(Tf-T2)', { fill: colors.accent, fontSize: 16, textAnchor: 'middle' });
    r.text(350, 220, 'Energy is conserved!', { fill: colors.success, fontSize: 14, textAnchor: 'middle' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', { fill: colors.accent, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(100, 80, 500, 200, { fill: '#78350f30', stroke: colors.accent, rx: 16 });
    r.text(350, 110, 'Thermal Equilibrium', { fill: colors.accent, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    [{ l: 'Conservation:', v: 'Total energy unchanged' }, { l: 'Equal masses, same c:', v: 'T_final = average' }, { l: 'Different c values:', v: 'High-c substance dominates' }, { l: 'Different masses:', v: 'Larger mass dominates' }].forEach((item, i) => {
      r.text(150, 145 + i * 30, item.l, { fill: colors.textSecondary, fontSize: 13, fontWeight: 'bold' });
      r.text(350, 145 + i * 30, item.v, { fill: colors.textPrimary, fontSize: 13 });
    });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(350, 40, 'Real-World Applications', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    applications.forEach((app, i) => {
      r.rect(80 + i * 155, 70, 140, 40, { fill: i === this.selectedApp ? colors.primary : colors.bgCard, stroke: this.completedApps[i] ? colors.success : colors.border, rx: 8 });
      r.text(150 + i * 155, 95, app.title.split(' ')[0], { fill: i === this.selectedApp ? colors.bgDark : colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    });
    const app = applications[this.selectedApp];
    r.rect(80, 130, 540, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 165, app.title, { fill: colors.textPrimary, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 200, app.description, { fill: colors.textSecondary, fontSize: 13, textAnchor: 'middle' });
    r.text(350, 260, app.details, { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
  }

  private renderTest(r: CommandRenderer): void {
    if (this.testSubmitted) { this.renderTestResults(r); return; }
    const q = testQuestions[this.testQuestion];
    r.text(350, 40, `Question ${this.testQuestion + 1}/10`, { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 80, q.question, { fill: colors.textPrimary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    q.options.forEach((opt, i) => {
      const selected = this.testAnswers[this.testQuestion] === i;
      r.rect(100, 110 + i * 55, 500, 45, { fill: selected ? colors.primary + '40' : colors.bgCard, stroke: selected ? colors.primary : colors.border, rx: 8 });
      r.text(350, 138 + i * 55, opt, { fill: selected ? colors.primary : colors.textSecondary, fontSize: 13, textAnchor: 'middle' });
    });
  }

  private renderTestResults(r: CommandRenderer): void {
    const score = this.calculateTestScore();
    r.text(350, 100, score >= 7 ? 'Excellent!' : 'Keep Learning!', { fill: score >= 7 ? colors.success : colors.accent, fontSize: 32, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 160, `Score: ${score}/10`, { fill: colors.textPrimary, fontSize: 24, textAnchor: 'middle' });
  }

  private renderMastery(r: CommandRenderer): void {
    r.rect(150, 80, 400, 340, { fill: colors.bgCard, stroke: colors.border, rx: 24 });
    r.text(350, 130, 'Thermal Physics Master!', { fill: colors.textPrimary, fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 165, "You've mastered specific heat!", { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
  }

  private renderUI(r: CommandRenderer): void {
    r.setHeader(this.gameTitle, this.phaseLabels[this.phase]);
    r.setProgress({ id: 'p', current: this.phaseOrder.indexOf(this.phase) + 1, total: 10, labels: this.phaseOrder.map(p => this.phaseLabels[p]), color: colors.primary });
    if (this.guidedMode) r.setCoachMessage(this.coachMessages[this.phase]);
    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx > 0) r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });

    switch (this.phase) {
      case 'hook': r.addButton({ id: 'next', label: 'Explore', variant: 'primary' }); break;
      case 'predict':
        ['A. Water heats more', 'B. Iron heats more', 'C. Same'].forEach((l, i) => r.addButton({ id: `predict_${String.fromCharCode(65 + i)}`, label: l, variant: this.prediction === String.fromCharCode(65 + i) ? 'primary' : 'secondary' }));
        if (this.prediction) r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        break;
      case 'play':
        Object.keys(MATERIALS).forEach(m => r.addButton({ id: `material_${m}`, label: MATERIALS[m].name, variant: this.selectedMaterial === m ? 'primary' : 'secondary' }));
        r.addSlider({ id: 'heat', label: 'Heat (J)', value: this.heatAdded, min: 100, max: 5000, step: 100 });
        r.addButton({ id: 'next', label: 'Review', variant: 'primary' });
        break;
      case 'review': r.addButton({ id: 'next', label: 'Twist', variant: 'warning' }); break;
      case 'twist_predict':
        ['A. 80C', 'B. 50C', 'C. 20C'].forEach((l, i) => r.addButton({ id: `twist_${String.fromCharCode(65 + i)}`, label: l, variant: this.twistPrediction === String.fromCharCode(65 + i) ? 'primary' : 'secondary' }));
        if (this.twistPrediction) r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        break;
      case 'twist_play': r.addButton({ id: 'next', label: 'Review', variant: 'primary' }); break;
      case 'twist_review': r.addButton({ id: 'next', label: 'Applications', variant: 'primary' }); break;
      case 'transfer':
        applications.forEach((_, i) => r.addButton({ id: `app_${i}`, label: applications[i].title.split(' ')[0], variant: this.selectedApp === i ? 'primary' : 'ghost' }));
        if (this.completedApps.every(c => c)) r.addButton({ id: 'next', label: 'Test', variant: 'success' });
        break;
      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= 9 });
          testQuestions[this.testQuestion].options.forEach((_, i) => r.addButton({ id: `answer_${i}`, label: String.fromCharCode(65 + i), variant: this.testAnswers[this.testQuestion] === i ? 'primary' : 'secondary' }));
          if (this.testAnswers.every(a => a !== null)) r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
        } else { r.addButton({ id: this.calculateTestScore() >= 7 ? 'next' : 'back', label: this.calculateTestScore() >= 7 ? 'Claim Badge' : 'Review', variant: this.calculateTestScore() >= 7 ? 'success' : 'secondary' }); }
        break;
      case 'mastery': r.addButton({ id: 'back', label: 'Explore Again', variant: 'secondary' }); break;
    }
  }

  getCurrentPhase(): string { return this.phase; }
  getState(): Record<string, unknown> { return { phase: this.phase, prediction: this.prediction, twistPrediction: this.twistPrediction, selectedMaterial: this.selectedMaterial, mass: this.mass, heatAdded: this.heatAdded, testQuestion: this.testQuestion, testAnswers: this.testAnswers, testSubmitted: this.testSubmitted, selectedApp: this.selectedApp, completedApps: this.completedApps }; }
  restoreState(s: Record<string, unknown>): void { this.phase = (s.phase as GamePhase) || 'hook'; this.prediction = (s.prediction as string) || null; this.twistPrediction = (s.twistPrediction as string) || null; this.selectedMaterial = (s.selectedMaterial as string) || 'water'; this.mass = (s.mass as number) || 100; this.heatAdded = (s.heatAdded as number) || 1000; this.testQuestion = (s.testQuestion as number) || 0; this.testAnswers = (s.testAnswers as (number | null)[]) || Array(10).fill(null); this.testSubmitted = (s.testSubmitted as boolean) || false; this.selectedApp = (s.selectedApp as number) || 0; this.completedApps = (s.completedApps as boolean[]) || [false, false, false, false]; }
}

export function createSpecificHeatGame(sessionId: string): SpecificHeatGame { return new SpecificHeatGame(sessionId); }
