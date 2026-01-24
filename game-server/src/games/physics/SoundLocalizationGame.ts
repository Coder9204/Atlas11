/**
 * Sound Localization Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - ITD (Interaural Time Difference): delta_t = d * sin(theta) / v
 * - ILD (Interaural Level Difference): varies with frequency
 * - Head shadow effect for high frequencies
 * - Max ITD approximately 0.7ms for human head
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion { question: string; options: string[]; correctIndex: number; }

const testQuestions: TestQuestion[] = [
  { question: 'ITD stands for:', options: ['Internal Time Delay', 'Interaural Time Difference', 'Intensity Time Deviation', 'Input Time Duration'], correctIndex: 1 },
  { question: 'Maximum ITD for human head is approximately:', options: ['0.07 ms', '0.7 ms', '7 ms', '70 ms'], correctIndex: 1 },
  { question: 'ILD is most effective for:', options: ['Low frequencies', 'High frequencies', 'All frequencies equally', 'Only ultrasound'], correctIndex: 1 },
  { question: 'The head shadow effect:', options: ['Makes sound louder', 'Blocks high frequencies to far ear', 'Speeds up sound', 'Only affects bass'], correctIndex: 1 },
  { question: 'Sound directly in front has ITD of:', options: ['Maximum', 'Zero', 'Negative', 'Variable'], correctIndex: 1 },
  { question: 'Owls localize prey using:', options: ['Only vision', 'Asymmetric ears for vertical localization', 'Echolocation', 'Smell'], correctIndex: 1 },
  { question: 'Binaural recording uses:', options: ['One microphone', 'Two microphones in dummy head ears', 'Surround speakers', 'Bone conduction'], correctIndex: 1 },
  { question: 'Hearing aids use localization cues by:', options: ['Ignoring them', 'Preserving ITD and ILD', 'Making both ears identical', 'Only amplifying one ear'], correctIndex: 1 },
  { question: 'Surround sound systems create spatial audio by:', options: ['Louder speakers', 'Multiple speakers with delay/level control', 'Higher frequencies', 'Bass boost'], correctIndex: 1 },
  { question: 'Low frequencies are hard to localize because:', options: ['They are quiet', 'Wavelengths longer than head - minimal shadow', 'They are too fast', 'Ears cannot hear them'], correctIndex: 1 },
];

const SPEED_OF_SOUND = 343;
const HEAD_DIAMETER = 0.17;

const colors = { primary: '#06b6d4', accent: '#f59e0b', success: '#10b981', danger: '#ef4444', bgDark: '#0a0f1a', bgCard: '#0f172a', bgCardLight: '#1e293b', border: '#334155', textPrimary: '#f8fafc', textSecondary: '#94a3b8', textMuted: '#64748b', leftEar: '#22c55e', rightEar: '#3b82f6' };

const applications = [
  { title: 'Surround Sound Systems', description: 'Multiple speakers positioned around the listener create spatial audio by controlling ITD and ILD.', details: 'Dolby Atmos uses up to 128 audio tracks and object-based audio to create immersive 3D sound.' },
  { title: 'Binaural Audio for VR', description: 'Head-related transfer functions (HRTFs) simulate how your ears and head shape perceive sound.', details: 'VR headsets use personalized HRTFs for convincing spatial audio that moves with your head.' },
  { title: 'Hearing Aid Design', description: 'Modern hearing aids preserve ITD and ILD cues for natural sound localization.', details: 'Bilateral hearing aids communicate wirelessly to maintain proper timing differences between ears.' },
  { title: 'Owl Hunting at Night', description: 'Owls have asymmetric ears - one higher than the other - for precise 3D sound localization.', details: 'Barn owls can catch prey in complete darkness using sound localization alone with < 1 degree accuracy!' },
];

export class SoundLocalizationGame extends BaseGame {
  readonly gameType = 'sound_localization';
  readonly gameTitle = 'Sound Localization';

  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private soundAngle = 0;
  private frequency = 1000;
  private showWaves = true;
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
    hook: 'How do you know where a sound is coming from with your eyes closed? Your brain compares timing!',
    predict: 'Think about what happens when sound reaches one ear before the other...',
    play: 'Move the sound source. Watch how ITD and ILD change!',
    review: 'ITD works for low frequencies, ILD for high frequencies. Your brain uses both!',
    twist_predict: 'What if you only had ITD? Could you localize sounds vertically?',
    twist_play: 'Explore how head shadow affects high vs low frequencies differently.',
    twist_review: 'Vertical localization uses the shape of your outer ear (pinna) to filter sounds.',
    transfer: 'From VR audio to owl hunting, sound localization is everywhere!',
    test: 'Test your understanding of how we locate sounds!',
    mastery: 'You now understand the physics of spatial hearing!',
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
    if (id === 'angle') this.soundAngle = value;
    else if (id === 'frequency') this.frequency = value;
  }

  private goNext(): void { const idx = this.phaseOrder.indexOf(this.phase); if (idx < 9) this.phase = this.phaseOrder[idx + 1]; }
  private goBack(): void { const idx = this.phaseOrder.indexOf(this.phase); if (idx > 0) this.phase = this.phaseOrder[idx - 1]; }

  private calculateITD(): number {
    const angleRad = (this.soundAngle * Math.PI) / 180;
    return (HEAD_DIAMETER * Math.sin(angleRad)) / SPEED_OF_SOUND * 1000;
  }

  private calculateILD(): number {
    const angleRad = Math.abs(this.soundAngle * Math.PI / 180);
    const shadowFactor = this.frequency > 1500 ? 1.5 : this.frequency > 500 ? 1.0 : 0.3;
    return Math.sin(angleRad) * 10 * shadowFactor;
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
    r.text(350, 100, 'How Do You Locate Sounds?', { fill: colors.textPrimary, fontSize: 32, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 140, 'Your brain is a spatial audio processor!', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.rect(160, 180, 380, 220, { fill: colors.bgCard, stroke: colors.border, rx: 20 });
    this.renderHeadDiagram(r, 350, 290);
    r.text(350, 410, 'Time and level differences between ears reveal direction!', { fill: colors.primary, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
  }

  private renderHeadDiagram(r: CommandRenderer, cx: number, cy: number): void {
    const angleRad = (this.soundAngle * Math.PI) / 180;
    const sourceX = cx + Math.sin(angleRad) * 100;
    const sourceY = cy - Math.cos(angleRad) * 100;

    r.circle(cx, cy, 40, { fill: colors.bgCardLight, stroke: colors.border });
    r.circle(cx - 45, cy, 8, { fill: colors.leftEar });
    r.circle(cx + 45, cy, 8, { fill: colors.rightEar });
    r.text(cx - 45, cy - 15, 'L', { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });
    r.text(cx + 45, cy - 15, 'R', { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });

    r.circle(sourceX, sourceY, 15, { fill: colors.accent });
    r.text(sourceX, sourceY, 'S', { fill: colors.bgDark, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    if (this.showWaves) {
      r.line(sourceX, sourceY, cx - 45, cy, { stroke: colors.leftEar, strokeWidth: 2, opacity: 0.5 });
      r.line(sourceX, sourceY, cx + 45, cy, { stroke: colors.rightEar, strokeWidth: 2, opacity: 0.5 });
    }
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', { fill: colors.textPrimary, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(100, 80, 500, 80, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'A sound comes from your left. What reaches your left ear first?', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    if (this.prediction) {
      const isCorrect = this.prediction === 'A';
      r.rect(100, 340, 500, 60, { fill: isCorrect ? '#065f4620' : '#7f1d1d20', stroke: isCorrect ? colors.success : colors.danger, rx: 12 });
      r.text(350, 375, isCorrect ? 'Correct! Sound reaches the nearer ear first - this is ITD!' : 'Not quite. Sound travels to the closer ear faster.', { fill: isCorrect ? colors.success : colors.danger, fontSize: 13, textAnchor: 'middle' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(350, 30, 'Sound Localization Lab', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(80, 50, 350, 300, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderHeadDiagram(r, 255, 200);

    const itd = this.calculateITD();
    const ild = this.calculateILD();

    r.rect(450, 50, 200, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(550, 80, 'Cues', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(470, 110, 'Angle:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 110, `${this.soundAngle} deg`, { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });
    r.text(470, 140, 'ITD:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 140, `${itd.toFixed(2)} ms`, { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'end' });
    r.text(470, 170, 'ILD:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 170, `${ild.toFixed(1)} dB`, { fill: colors.success, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });
    r.text(470, 200, 'First ear:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 200, this.soundAngle < 0 ? 'Left' : this.soundAngle > 0 ? 'Right' : 'Both', { fill: colors.textPrimary, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });

    r.rect(80, 370, 570, 50, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(365, 400, 'ITD = d * sin(theta) / v | Max ITD ~ 0.7 ms', { fill: colors.primary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Sound Localization', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(50, 70, 290, 160, { fill: '#0891b240', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'ITD (Time)', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    ['Sound arrives at closer ear first', 'Max ITD ~ 0.7 ms', 'Works best for low frequencies', 'Brain detects microsecond differences!'].forEach((l, i) => r.text(70, 120 + i * 22, '* ' + l, { fill: colors.textSecondary, fontSize: 11 }));

    r.rect(360, 70, 290, 160, { fill: '#f59e0b40', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'ILD (Level)', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    ['Far ear is quieter (head shadow)', 'Strongest for high frequencies', 'Can be 20+ dB difference', 'Head blocks short wavelengths'].forEach((l, i) => r.text(380, 120 + i * 22, '* ' + l, { fill: colors.textSecondary, fontSize: 11 }));
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist Challenge', { fill: colors.accent, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 140, 'A low-frequency sound (bass) is harder to localize than high frequencies.', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 165, 'Why?', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'B';
      r.rect(100, 340, 500, 60, { fill: isCorrect ? '#065f4620' : '#7f1d1d20', stroke: isCorrect ? colors.success : colors.danger, rx: 12 });
      r.text(350, 375, isCorrect ? 'Correct! Long wavelengths diffract around the head - minimal shadow!' : 'Not quite. Low frequencies have long wavelengths that bend around the head.', { fill: isCorrect ? colors.success : colors.danger, fontSize: 13, textAnchor: 'middle' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(350, 30, 'Frequency & Localization', { fill: colors.accent, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(80, 50, 350, 300, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderHeadDiagram(r, 255, 200);

    const ild = this.calculateILD();
    r.rect(450, 50, 200, 150, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(550, 80, 'Frequency Effect', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(470, 110, 'Frequency:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 110, `${this.frequency} Hz`, { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });
    r.text(470, 140, 'ILD effect:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 140, `${ild.toFixed(1)} dB`, { fill: this.frequency > 1000 ? colors.success : colors.danger, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });
    r.text(470, 170, 'Shadow:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 170, this.frequency > 1000 ? 'Strong' : 'Weak', { fill: this.frequency > 1000 ? colors.success : colors.danger, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', { fill: colors.accent, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(100, 80, 500, 200, { fill: '#78350f30', stroke: colors.accent, rx: 16 });
    r.text(350, 110, 'Frequency & Localization Cues', { fill: colors.accent, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    [{ l: 'Low frequencies (<500 Hz):', v: 'ITD only, weak ILD' }, { l: 'High frequencies (>1500 Hz):', v: 'Strong ILD, ITD ambiguous' }, { l: 'Mid frequencies:', v: 'Both cues work together' }, { l: 'Vertical localization:', v: 'Uses pinna (outer ear) filtering' }].forEach((item, i) => {
      r.text(150, 145 + i * 30, item.l, { fill: colors.textSecondary, fontSize: 13, fontWeight: 'bold' });
      r.text(370, 145 + i * 30, item.v, { fill: colors.textPrimary, fontSize: 13 });
    });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(350, 40, 'Real-World Applications', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    applications.forEach((app, i) => {
      r.rect(80 + i * 155, 70, 140, 40, { fill: i === this.selectedApp ? colors.primary : colors.bgCard, stroke: this.completedApps[i] ? colors.success : colors.border, rx: 8 });
      r.text(150 + i * 155, 95, app.title.split(' ')[0], { fill: i === this.selectedApp ? colors.textPrimary : colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
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
    r.text(350, 130, 'Spatial Hearing Master!', { fill: colors.textPrimary, fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 165, "You've mastered sound localization!", { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
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
        ['A. The sound itself', 'B. Nothing', 'C. Echo'].forEach((l, i) => r.addButton({ id: `predict_${String.fromCharCode(65 + i)}`, label: l, variant: this.prediction === String.fromCharCode(65 + i) ? 'primary' : 'secondary' }));
        if (this.prediction) r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        break;
      case 'play':
        r.addSlider({ id: 'angle', label: 'Sound Angle', value: this.soundAngle, min: -90, max: 90 });
        r.addButton({ id: 'next', label: 'Review', variant: 'primary' });
        break;
      case 'review': r.addButton({ id: 'next', label: 'Twist', variant: 'warning' }); break;
      case 'twist_predict':
        ['A. Ears are different sizes', 'B. Long wavelengths bend around head', 'C. Brain ignores bass'].forEach((l, i) => r.addButton({ id: `twist_${String.fromCharCode(65 + i)}`, label: l, variant: this.twistPrediction === String.fromCharCode(65 + i) ? 'primary' : 'secondary' }));
        if (this.twistPrediction) r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        break;
      case 'twist_play':
        r.addSlider({ id: 'frequency', label: 'Frequency', value: this.frequency, min: 100, max: 5000, step: 100 });
        r.addSlider({ id: 'angle', label: 'Angle', value: this.soundAngle, min: -90, max: 90 });
        r.addButton({ id: 'next', label: 'Review', variant: 'primary' });
        break;
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
  getState(): Record<string, unknown> { return { phase: this.phase, prediction: this.prediction, twistPrediction: this.twistPrediction, soundAngle: this.soundAngle, frequency: this.frequency, testQuestion: this.testQuestion, testAnswers: this.testAnswers, testSubmitted: this.testSubmitted, selectedApp: this.selectedApp, completedApps: this.completedApps }; }
  restoreState(s: Record<string, unknown>): void { this.phase = (s.phase as GamePhase) || 'hook'; this.prediction = (s.prediction as string) || null; this.twistPrediction = (s.twistPrediction as string) || null; this.soundAngle = (s.soundAngle as number) || 0; this.frequency = (s.frequency as number) || 1000; this.testQuestion = (s.testQuestion as number) || 0; this.testAnswers = (s.testAnswers as (number | null)[]) || Array(10).fill(null); this.testSubmitted = (s.testSubmitted as boolean) || false; this.selectedApp = (s.selectedApp as number) || 0; this.completedApps = (s.completedApps as boolean[]) || [false, false, false, false]; }
}

export function createSoundLocalizationGame(sessionId: string): SoundLocalizationGame { return new SoundLocalizationGame(sessionId); }
