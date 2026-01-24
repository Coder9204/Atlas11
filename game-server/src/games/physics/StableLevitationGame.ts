/**
 * Stable Levitation Game - Server-Side Implementation
 *
 * PROTECTED IP:
 * - Earnshaw's theorem: no stable levitation with static fields alone
 * - Bernoulli principle for aerodynamic levitation
 * - Diamagnetic levitation physics
 * - Superconductor Meissner effect
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion { question: string; options: string[]; correctIndex: number; }

const testQuestions: TestQuestion[] = [
  { question: 'What type of equilibrium keeps a ball floating in an airstream?', options: ['Unstable', 'Neutral', 'Stable', 'No equilibrium'], correctIndex: 2 },
  { question: 'Why does a ping pong ball stay centered in an airstream?', options: ['Static electricity', 'Fast air = lower pressure traps ball', 'Ball spins', 'Heavier than air'], correctIndex: 1 },
  { question: "Earnshaw's theorem states:", options: ['Levitation is impossible', 'Stable levitation with static fields only is impossible', 'Only superconductors levitate', 'Magnets attract'], correctIndex: 1 },
  { question: 'German maglev trains achieve levitation using:', options: ['Superconductors', 'Permanent magnets only', 'Electromagnetic feedback control', 'Compressed air'], correctIndex: 2 },
  { question: 'Superconductor levitation works due to:', options: ['They are cold', 'Meissner effect (perfect diamagnetism)', 'Infinite strength', 'Lighter than air'], correctIndex: 1 },
  { question: 'Acoustic levitation uses:', options: ['Loud music', 'Standing wave pressure at nodes', 'Echoes', 'Vibrating magnets'], correctIndex: 1 },
  { question: 'Why can a frog levitate in a strong magnetic field?', options: ['Frogs are magnetic', 'Water in tissues is diamagnetic', 'Frogs can fly', 'Hoax'], correctIndex: 1 },
  { question: 'The Coanda effect describes:', options: ['Cold air falling', 'Fluid following curved surfaces', 'Sound in water', 'Magnet attraction'], correctIndex: 1 },
  { question: 'For stable equilibrium, when displaced:', options: ['Keeps moving', 'Stays in new position', 'Restoring force returns it', 'Oscillates forever'], correctIndex: 2 },
  { question: 'Fastest maglev speed achieved:', options: ['200 mph', '375 mph (603 km/h)', '500 mph', '1000 mph'], correctIndex: 1 },
];

const colors = { primary: '#60a5fa', accent: '#f472b6', success: '#34d399', danger: '#ef4444', bgDark: '#0a0f1a', bgCard: '#141e2c', bgCardLight: '#1e3a5f', border: '#1e3a5f', textPrimary: '#f1f5f9', textSecondary: '#94a3b8', textMuted: '#64748b', ball: '#fbbf24', airstream: '#38bdf8' };

const applications = [
  { title: 'Maglev Trains', description: 'Magnetic levitation enables frictionless 375 mph travel.', details: 'Japanese SCMaglev uses superconducting magnets at -269C. German Transrapid uses electromagnetic feedback.' },
  { title: 'Acoustic Levitation', description: 'Sound waves create pressure nodes that trap small objects.', details: 'Researchers levitate water droplets, insects, and small fish using 40kHz ultrasound!' },
  { title: 'Diamagnetic Levitation', description: 'Even frogs can float in powerful magnetic fields!', details: 'All materials weakly repel fields. In 16+ Tesla, even water-based objects levitate. Won 2000 Ig Nobel Prize.' },
  { title: 'Coanda Effect', description: 'Airflow following curved surfaces enables tilted levitation.', details: 'Hair dryer can levitate a ball at an angle! Used in aircraft for thrust vectoring and STOL.' },
];

export class StableLevitationGame extends BaseGame {
  readonly gameType = 'stable_levitation';
  readonly gameTitle = 'Stable Levitation';

  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private airSpeed = 80;
  private tiltAngle = 0;
  private ballX = 0;
  private ballY = 0;
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
    hook: 'A ball floats in mid-air! Is it magic? No, it\'s physics!',
    predict: 'What happens when you tilt the air stream?',
    play: 'Adjust air speed and tilt. Watch the ball stay levitated!',
    review: 'Bernoulli\'s principle creates a pressure well that traps the ball!',
    twist_predict: 'Can you levitate a magnet stably using only other magnets?',
    twist_play: 'Explore how Earnshaw\'s theorem limits static magnetic levitation.',
    twist_review: 'Loopholes: diamagnetism, superconductors, feedback control!',
    transfer: 'From maglev to acoustic levitation, floating is everywhere!',
    test: 'Test your understanding of levitation physics!',
    mastery: 'You now understand the physics of stable levitation!',
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
    else if (id.startsWith('answer_')) this.testAnswers[this.testQuestion] = parseInt(id.replace('answer_', ''), 10);
    else if (id === 'test_next' && this.testQuestion < 9) this.testQuestion++;
    else if (id === 'test_prev' && this.testQuestion > 0) this.testQuestion--;
    else if (id === 'test_submit') { this.testSubmitted = true; this.emitCoachEvent('test_completed', { score: this.calculateTestScore() }); }
    else if (id.startsWith('app_')) { const i = parseInt(id.replace('app_', ''), 10); this.selectedApp = i; this.completedApps[i] = true; }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'airSpeed') this.airSpeed = value;
    else if (id === 'tilt') this.tiltAngle = value;
  }

  private goNext(): void { const idx = this.phaseOrder.indexOf(this.phase); if (idx < 9) this.phase = this.phaseOrder[idx + 1]; }
  private goBack(): void { const idx = this.phaseOrder.indexOf(this.phase); if (idx > 0) this.phase = this.phaseOrder[idx - 1]; }

  update(deltaTime: number): void {
    this.time += deltaTime / 1000;
    if (this.airSpeed > 30) {
      const tiltRad = (this.tiltAngle * Math.PI) / 180;
      const targetX = Math.sin(tiltRad) * 20;
      const targetY = -Math.cos(tiltRad) * 20;
      this.ballX += (targetX - this.ballX) * 0.1;
      this.ballY += (targetY - this.ballY) * 0.1;
    } else {
      this.ballY += 2;
    }
    this.ballX = Math.max(-50, Math.min(50, this.ballX));
    this.ballY = Math.max(-50, Math.min(80, this.ballY));
  }

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
    r.text(350, 100, 'Defying Gravity!', { fill: colors.textPrimary, fontSize: 32, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 140, 'A ball floats in thin air. How?', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.rect(160, 180, 380, 220, { fill: colors.bgCard, stroke: colors.border, rx: 20 });
    this.renderLevitation(r, 350, 290);
    r.text(350, 410, 'Fast-moving air creates low pressure that traps the ball!', { fill: colors.primary, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
  }

  private renderLevitation(r: CommandRenderer, cx: number, cy: number): void {
    const tiltRad = (this.tiltAngle * Math.PI) / 180;
    r.group(`translate(${cx}, ${cy + 50}) rotate(${this.tiltAngle})`, (g) => {
      g.rect(-20, 0, 40, 60, { fill: '#4b5563', rx: 8 });
      g.rect(-15, 5, 30, 10, { fill: '#374151', rx: 4 });
      for (let i = 0; i < 5; i++) {
        const yOffset = Math.sin(this.time * 5 + i) * 2;
        g.line(-8 + i * 4, -20 + yOffset, -8 + i * 4, 0, { stroke: colors.airstream, strokeWidth: 2, opacity: 0.6 });
      }
    });
    const ballPosX = cx + this.ballX;
    const ballPosY = cy - 30 + this.ballY;
    r.circle(ballPosX, ballPosY, 15, { fill: colors.ball });
    r.circle(ballPosX - 5, ballPosY - 5, 4, { fill: 'white', opacity: 0.6 });
    if (this.airSpeed > 30) {
      r.text(ballPosX, ballPosY - 25, 'Stable!', { fill: colors.success, fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    } else {
      r.text(ballPosX, ballPosY - 25, 'Falling!', { fill: colors.danger, fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    }
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', { fill: colors.textPrimary, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(100, 80, 500, 80, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'A ball floats in an upward airstream. You tilt the dryer sideways.', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    if (this.prediction) {
      const isCorrect = this.prediction === 'B';
      r.rect(100, 340, 500, 60, { fill: isCorrect ? '#065f4620' : '#7f1d1d20', stroke: isCorrect ? colors.success : colors.danger, rx: 12 });
      r.text(350, 375, isCorrect ? 'Correct! The ball stays levitating, tilting with the dryer!' : 'The ball actually stays floating! Pressure well traps it.', { fill: isCorrect ? colors.success : colors.danger, fontSize: 13, textAnchor: 'middle' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(350, 30, 'Levitation Lab', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(80, 50, 380, 300, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderLevitation(r, 270, 200);

    r.rect(480, 50, 170, 150, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(565, 80, 'Parameters', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(500, 110, 'Air Speed:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 110, `${this.airSpeed}%`, { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });
    r.text(500, 140, 'Tilt:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 140, `${this.tiltAngle} deg`, { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });
    r.text(500, 170, 'Status:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 170, this.airSpeed > 30 ? 'Levitating' : 'Falling', { fill: this.airSpeed > 30 ? colors.success : colors.danger, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });

    r.rect(80, 370, 570, 50, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(365, 400, 'Bernoulli: Fast air = Low pressure = Ball trapped!', { fill: colors.primary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Stable Levitation', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(50, 70, 290, 160, { fill: '#60a5fa40', stroke: colors.primary, rx: 16 });
    r.text(195, 95, "Bernoulli's Principle", { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    ['Fast air = Low pressure', 'Center of stream is fastest', 'Ball drifts out = higher P pushes back', 'Creates stable "pressure well"'].forEach((l, i) => r.text(70, 120 + i * 22, '* ' + l, { fill: colors.textSecondary, fontSize: 11 }));

    r.rect(360, 70, 290, 160, { fill: '#f472b640', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Stable Equilibrium', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    ['Restoring force if displaced', 'Ball auto-returns to center', 'Works even when tilted!', 'Coanda effect helps at angles'].forEach((l, i) => r.text(380, 120 + i * 22, '* ' + l, { fill: colors.textSecondary, fontSize: 11 }));
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist Challenge', { fill: colors.accent, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 130, "Earnshaw's theorem: Can you levitate a magnet stably", { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 155, 'using only static magnetic fields?', { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle' });
    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'B';
      r.rect(100, 340, 500, 60, { fill: isCorrect ? '#065f4620' : '#7f1d1d20', stroke: isCorrect ? colors.success : colors.danger, rx: 12 });
      r.text(350, 375, isCorrect ? "Correct! Earnshaw proved it's impossible - but loopholes exist!" : "Actually, Earnshaw's theorem proves static fields can't achieve stable levitation.", { fill: isCorrect ? colors.success : colors.danger, fontSize: 13, textAnchor: 'middle' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(350, 30, "Earnshaw's Theorem Loopholes", { fill: colors.accent, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(80, 60, 540, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    [{ title: 'Diamagnetism', desc: 'All materials weakly repel fields. Strong enough fields levitate frogs!' }, { title: 'Superconductors', desc: 'Meissner effect: perfect diamagnetism, expels all fields!' }, { title: 'Feedback Control', desc: 'Sensors + electronics actively stabilize the gap.' }, { title: 'Rotation', desc: 'Spinning tops (Levitron) stabilize with gyroscopic effect.' }].forEach((item, i) => {
      r.text(120, 100 + i * 60, item.title, { fill: colors.accent, fontSize: 14, fontWeight: 'bold' });
      r.text(120, 120 + i * 60, item.desc, { fill: colors.textSecondary, fontSize: 12 });
    });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', { fill: colors.accent, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(100, 80, 500, 200, { fill: '#78350f30', stroke: colors.accent, rx: 16 });
    r.text(350, 110, 'Bypassing Earnshaw', { fill: colors.accent, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    [{ l: "Earnshaw's limit:", v: 'No stable levitation with static fields' }, { l: 'Loophole 1:', v: 'Diamagnetism (quantum effect)' }, { l: 'Loophole 2:', v: 'Active feedback control' }, { l: 'Loophole 3:', v: 'Superconductivity (Meissner)' }].forEach((item, i) => {
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
    r.text(350, 130, 'Levitation Master!', { fill: colors.textPrimary, fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 165, "You've mastered stable levitation!", { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
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
        ['A. Ball falls immediately', 'B. Ball stays floating, tilts with dryer', 'C. Ball flies away'].forEach((l, i) => r.addButton({ id: `predict_${String.fromCharCode(65 + i)}`, label: l, variant: this.prediction === String.fromCharCode(65 + i) ? 'primary' : 'secondary' }));
        if (this.prediction) r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        break;
      case 'play':
        r.addSlider({ id: 'airSpeed', label: 'Air Speed', value: this.airSpeed, min: 0, max: 100 });
        r.addSlider({ id: 'tilt', label: 'Tilt Angle', value: this.tiltAngle, min: -45, max: 45 });
        r.addButton({ id: 'next', label: 'Review', variant: 'primary' });
        break;
      case 'review': r.addButton({ id: 'next', label: 'Twist', variant: 'warning' }); break;
      case 'twist_predict':
        ['A. Yes, with careful arrangement', 'B. No, Earnshaw proves impossible', 'C. Only with superconductors'].forEach((l, i) => r.addButton({ id: `twist_${String.fromCharCode(65 + i)}`, label: l, variant: this.twistPrediction === String.fromCharCode(65 + i) ? 'primary' : 'secondary' }));
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
  getState(): Record<string, unknown> { return { phase: this.phase, prediction: this.prediction, twistPrediction: this.twistPrediction, airSpeed: this.airSpeed, tiltAngle: this.tiltAngle, testQuestion: this.testQuestion, testAnswers: this.testAnswers, testSubmitted: this.testSubmitted, selectedApp: this.selectedApp, completedApps: this.completedApps }; }
  restoreState(s: Record<string, unknown>): void { this.phase = (s.phase as GamePhase) || 'hook'; this.prediction = (s.prediction as string) || null; this.twistPrediction = (s.twistPrediction as string) || null; this.airSpeed = (s.airSpeed as number) || 80; this.tiltAngle = (s.tiltAngle as number) || 0; this.testQuestion = (s.testQuestion as number) || 0; this.testAnswers = (s.testAnswers as (number | null)[]) || Array(10).fill(null); this.testSubmitted = (s.testSubmitted as boolean) || false; this.selectedApp = (s.selectedApp as number) || 0; this.completedApps = (s.completedApps as boolean[]) || [false, false, false, false]; }
}

export function createStableLevitationGame(sessionId: string): StableLevitationGame { return new StableLevitationGame(sessionId); }
