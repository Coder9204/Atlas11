/**
 * Sound Dead Spots Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Wave interference: constructive and destructive
 * - Path difference calculations
 * - Dead spot formula: path difference = (n + 0.5) * lambda
 * - Constructive: path difference = n * lambda
 * - Wavelength calculation: lambda = v / f
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// === PROTECTED GAME STATE (never sent to client) ===

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

// === TEST QUESTIONS (PROTECTED - never sent to client) ===
const testQuestions: TestQuestion[] = [
  {
    question: 'What causes a "dead spot" in sound?',
    options: ['Sound absorption by walls', 'Destructive interference from path difference', 'Speaker malfunction', 'Air pressure changes'],
    correctIndex: 1,
  },
  {
    question: 'For destructive interference, path difference must equal:',
    options: ['n * lambda', '(n + 0.5) * lambda', 'Zero', 'Any value'],
    correctIndex: 1,
  },
  {
    question: 'Two speakers 3m apart play 340 Hz. Wavelength is (v = 340 m/s):',
    options: ['0.5 m', '1 m', '3 m', '340 m'],
    correctIndex: 1,
  },
  {
    question: 'At a point equidistant from two in-phase speakers, you get:',
    options: ['Dead spot', 'Maximum loudness', 'Random volume', 'Echo'],
    correctIndex: 1,
  },
  {
    question: 'Moving 0.5 wavelength closer to one speaker causes:',
    options: ['Louder sound', 'Quieter sound (destructive)', 'Same volume', 'Higher pitch'],
    correctIndex: 1,
  },
  {
    question: 'Why do bass frequencies have fewer dead spots?',
    options: ['They are louder', 'Longer wavelengths = wider spacing', 'They reflect less', 'Ears are less sensitive'],
    correctIndex: 1,
  },
  {
    question: 'In noise-canceling headphones, destructive interference is:',
    options: ['A problem to avoid', 'Intentionally created to cancel noise', 'Caused by battery failure', 'From external speakers'],
    correctIndex: 1,
  },
  {
    question: 'Path difference of 1.5 wavelengths produces:',
    options: ['Constructive interference', 'Destructive interference', 'No interference', 'Resonance'],
    correctIndex: 1,
  },
  {
    question: 'Concert halls are designed to:',
    options: ['Maximize dead spots', 'Minimize dead spots through diffusion', 'Amplify bass only', 'Reduce all reflections'],
    correctIndex: 1,
  },
  {
    question: 'Two waves in phase means their peaks:',
    options: ['Never align', 'Always cancel', 'Align to reinforce each other', 'Create standing waves'],
    correctIndex: 2,
  },
];

// === PHYSICS CONSTANTS (PROTECTED) ===
const SPEED_OF_SOUND = 340; // m/s

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#8b5cf6',
  primaryDark: '#7c3aed',
  accent: '#06b6d4',
  accentDark: '#0891b2',
  warning: '#f59e0b',
  success: '#10b981',
  danger: '#ef4444',
  bgDark: '#0a0f1a',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  wave1: '#22c55e',
  wave2: '#3b82f6',
  combined: '#a855f7',
  deadSpot: '#ef4444',
  hotSpot: '#10b981',
};

// === APPLICATION DATA ===
interface Application {
  title: string;
  icon: string;
  description: string;
  details: string;
}

const applications: Application[] = [
  {
    title: 'Concert Hall Acoustics',
    icon: 'hall',
    description: 'Acoustic engineers design concert halls with diffusers and varied surfaces to break up interference patterns.',
    details: 'Famous halls like Boston Symphony Hall use mathematical modeling to minimize dead spots. Diffusers scatter sound, preventing consistent destructive interference.',
  },
  {
    title: 'Noise-Canceling Headphones',
    icon: 'headphones',
    description: 'These headphones intentionally create destructive interference to cancel external noise.',
    details: 'Microphones pick up ambient sound, electronics generate an inverted wave, and speakers play it back. The result: silence through interference!',
  },
  {
    title: 'Car Audio Systems',
    icon: 'car',
    description: 'Multiple speakers in a car create complex interference patterns. Subwoofer placement is critical.',
    details: 'Bass frequencies can reinforce or cancel depending on position. Many car audio systems use DSP to adjust timing and phase for even coverage.',
  },
  {
    title: 'Stadium PA Systems',
    icon: 'stadium',
    description: 'Stadium sound systems use delay towers and distributed speakers to create uniform coverage.',
    details: 'Without careful design, some seats would have excellent sound while others hear nothing. Time delays ensure waves arrive in phase.',
  },
];

// === MAIN GAME CLASS ===

export class SoundDeadSpotsGame extends BaseGame {
  readonly gameType = 'sound_dead_spots';
  readonly gameTitle = 'Sound Dead Spots';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private frequency = 340; // Hz
  private speakerSeparation = 3; // meters
  private listenerX = 0; // relative position
  private listenerY = 5; // meters from speakers
  private showWaves = true;
  private isAnimating = true;
  private time = 0;

  // Test state
  private testQuestion = 0;
  private testAnswers: (number | null)[] = Array(10).fill(null);
  private testSubmitted = false;

  // Transfer phase state
  private selectedApp = 0;
  private completedApps = [false, false, false, false];

  // Navigation
  private lastNavTime = 0;
  private isNavigating = false;
  private guidedMode = true;

  // Phase configuration
  private readonly phaseOrder: GamePhase[] = [
    'hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery',
  ];

  private readonly phaseLabels: Record<GamePhase, string> = {
    hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review', twist_predict: 'Twist Predict',
    twist_play: 'Twist Lab', twist_review: 'Twist Review', transfer: 'Transfer', test: 'Test', mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Ever noticed spots in a room where music sounds muted? That\'s wave interference!',
    predict: 'What happens when two identical sound waves meet out of phase?',
    play: 'Move around between the speakers. Find the quiet and loud spots!',
    review: 'Destructive interference: path difference = (n + 0.5) * wavelength. The waves cancel!',
    twist_predict: 'What if we change the frequency? How does wavelength affect dead spot locations?',
    twist_play: 'Change frequency and watch the dead spots move!',
    twist_review: 'Higher frequencies = shorter wavelengths = more closely spaced dead spots.',
    transfer: 'From concert halls to noise-canceling headphones, interference is everywhere!',
    test: 'Test your understanding of sound wave interference!',
    mastery: 'You now understand why some spots sound dead!',
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
    this.emitCoachEvent('game_started', { phase: this.phase, phaseLabel: this.phaseLabels[this.phase] });
  }

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click': this.handleButtonClick(input.id!); break;
      case 'toggle_change': this.handleToggleChange(input.id!, input.value); break;
      case 'slider_change': this.handleSliderChange(input.id!, input.value); break;
      case 'progress_click': this.handleProgressClick(input.index!); break;
    }
  }

  private handleButtonClick(id: string): void {
    if (id === 'next') { this.goNext(); return; }
    if (id === 'back') { this.goBack(); return; }
    if (id.startsWith('predict_')) { this.prediction = id.replace('predict_', ''); return; }
    if (id.startsWith('twist_')) { this.twistPrediction = id.replace('twist_', ''); return; }
    if (id.startsWith('answer_')) { this.testAnswers[this.testQuestion] = parseInt(id.replace('answer_', ''), 10); return; }
    if (id === 'test_next' && this.testQuestion < testQuestions.length - 1) { this.testQuestion++; return; }
    if (id === 'test_prev' && this.testQuestion > 0) { this.testQuestion--; return; }
    if (id === 'test_submit') { this.testSubmitted = true; this.emitCoachEvent('test_completed', { score: this.calculateTestScore() }); return; }
    if (id.startsWith('app_')) { const i = parseInt(id.replace('app_', ''), 10); this.selectedApp = i; this.completedApps[i] = true; return; }
    if (id === 'reset') { this.resetSimulation(); return; }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'waves') this.showWaves = value;
    if (id === 'animation') this.isAnimating = value;
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'frequency') this.frequency = value;
    if (id === 'separation') this.speakerSeparation = value;
    if (id === 'listenerX') this.listenerX = value;
  }

  private handleProgressClick(index: number): void {
    const currentIdx = this.phaseOrder.indexOf(this.phase);
    if (index < currentIdx) this.goToPhase(this.phaseOrder[index]);
  }

  private goToPhase(newPhase: GamePhase): void {
    const now = Date.now();
    if (now - this.lastNavTime < 200 || this.isNavigating) return;
    this.lastNavTime = now;
    this.isNavigating = true;
    this.phase = newPhase;
    if (newPhase === 'play' || newPhase === 'twist_play') this.resetSimulation();
    this.emitCoachEvent('phase_changed', { phase: newPhase, phaseLabel: this.phaseLabels[newPhase] });
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

  // === PHYSICS CALCULATIONS (PROTECTED) ===

  private calculateWavelength(): number {
    return SPEED_OF_SOUND / this.frequency;
  }

  private calculatePathDifference(): number {
    const speaker1X = -this.speakerSeparation / 2;
    const speaker2X = this.speakerSeparation / 2;
    const d1 = Math.sqrt(Math.pow(this.listenerX - speaker1X, 2) + Math.pow(this.listenerY, 2));
    const d2 = Math.sqrt(Math.pow(this.listenerX - speaker2X, 2) + Math.pow(this.listenerY, 2));
    return Math.abs(d1 - d2);
  }

  private calculateInterference(): { intensity: number; type: 'constructive' | 'destructive' | 'partial' } {
    const pathDiff = this.calculatePathDifference();
    const wavelength = this.calculateWavelength();
    const phaseRatio = (pathDiff % wavelength) / wavelength;

    if (phaseRatio < 0.1 || phaseRatio > 0.9) {
      return { intensity: 1.0, type: 'constructive' };
    } else if (phaseRatio > 0.4 && phaseRatio < 0.6) {
      return { intensity: 0.0, type: 'destructive' };
    } else {
      const intensity = Math.pow(Math.cos(phaseRatio * Math.PI), 2);
      return { intensity, type: 'partial' };
    }
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;
    this.time += deltaTime / 1000;
  }

  private resetSimulation(): void {
    this.frequency = 340;
    this.speakerSeparation = 3;
    this.listenerX = 0;
    this.listenerY = 5;
    this.time = 0;
    this.isAnimating = true;
  }

  private calculateTestScore(): number {
    let correct = 0;
    for (let i = 0; i < testQuestions.length; i++) {
      if (this.testAnswers[i] === testQuestions[i].correctIndex) correct++;
    }
    return correct;
  }

  // === RENDERING ===

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

  private renderHookPhase(r: CommandRenderer): void {
    r.text(350, 100, 'The Mystery of Dead Spots', { fill: colors.textPrimary, fontSize: 32, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 140, 'Why do some spots in a room sound muted?', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.rect(160, 180, 380, 220, { fill: colors.bgCard, stroke: colors.border, rx: 20 });
    this.renderInterferenceDiagram(r, 350, 290, 300);
    r.text(350, 410, 'Sound waves from two speakers can cancel each other!', { fill: colors.primary, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
  }

  private renderInterferenceDiagram(r: CommandRenderer, cx: number, cy: number, size: number): void {
    const wavelength = this.calculateWavelength();
    const interference = this.calculateInterference();

    // Speakers
    r.rect(cx - size / 3, cy + 60, 20, 30, { fill: colors.wave1, rx: 4 });
    r.rect(cx + size / 3 - 20, cy + 60, 20, 30, { fill: colors.wave2, rx: 4 });
    r.text(cx - size / 3 + 10, cy + 100, 'L', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
    r.text(cx + size / 3 - 10, cy + 100, 'R', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });

    // Concentric circles for waves
    if (this.showWaves) {
      for (let i = 1; i <= 4; i++) {
        const radius = i * 25 + Math.sin(this.time * 5) * 5;
        r.circle(cx - size / 3 + 10, cy + 75, radius, { fill: 'none', stroke: colors.wave1, strokeWidth: 1, opacity: 0.5 - i * 0.1 });
        r.circle(cx + size / 3 - 10, cy + 75, radius, { fill: 'none', stroke: colors.wave2, strokeWidth: 1, opacity: 0.5 - i * 0.1 });
      }
    }

    // Listener position
    const listenerPosX = cx + this.listenerX * 30;
    r.circle(listenerPosX, cy - 30, 10, { fill: interference.type === 'destructive' ? colors.deadSpot : interference.type === 'constructive' ? colors.hotSpot : colors.warning });
    r.text(listenerPosX, cy - 50, interference.type === 'destructive' ? 'QUIET' : interference.type === 'constructive' ? 'LOUD' : 'PARTIAL', {
      fill: colors.textPrimary, fontSize: 10, fontWeight: 'bold', textAnchor: 'middle',
    });
  }

  private renderPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', { fill: colors.textPrimary, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(100, 80, 500, 80, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'Two identical waves meet. One traveled half a wavelength farther.', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });

    if (this.prediction) {
      const isCorrect = this.prediction === 'B';
      r.rect(100, 340, 500, 60, { fill: isCorrect ? '#065f4620' : '#7f1d1d20', stroke: isCorrect ? colors.success : colors.danger, rx: 12 });
      r.text(350, 375, isCorrect ? 'Correct! They cancel out - destructive interference!' : 'Not quite. Half-wavelength difference means peaks meet troughs.', { fill: isCorrect ? colors.success : colors.danger, fontSize: 13, textAnchor: 'middle' });
    }
  }

  private renderPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Sound Interference Lab', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(80, 50, 380, 300, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderInterferenceDiagram(r, 270, 200, 320);

    const interference = this.calculateInterference();
    const pathDiff = this.calculatePathDifference();
    const wavelength = this.calculateWavelength();

    r.rect(480, 50, 170, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(565, 80, 'Analysis', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(500, 110, 'Wavelength:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 110, wavelength.toFixed(2) + ' m', { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });
    r.text(500, 140, 'Path diff:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 140, pathDiff.toFixed(2) + ' m', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });
    r.text(500, 170, 'Intensity:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 170, (interference.intensity * 100).toFixed(0) + '%', { fill: interference.type === 'destructive' ? colors.danger : colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'end' });
    r.text(500, 200, 'Type:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 200, interference.type, { fill: interference.type === 'destructive' ? colors.danger : colors.success, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });

    r.rect(80, 370, 570, 50, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(365, 400, 'Destructive: path diff = (n+0.5)*lambda | Constructive: path diff = n*lambda', { fill: colors.primary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Interference', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(50, 70, 290, 160, { fill: '#22c55e40', stroke: colors.wave1, rx: 16 });
    r.text(195, 95, 'Constructive', { fill: colors.wave1, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    ['Waves in phase (peaks align)', 'Path diff = 0, lambda, 2*lambda...', 'Result: LOUDER sound', 'Amplitude doubles!'].forEach((line, i) => {
      r.text(70, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 160, { fill: '#ef444440', stroke: colors.danger, rx: 16 });
    r.text(505, 95, 'Destructive', { fill: colors.danger, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    ['Waves out of phase (peak meets trough)', 'Path diff = 0.5*lambda, 1.5*lambda...', 'Result: SILENCE (dead spot)', 'Waves cancel completely!'].forEach((line, i) => {
      r.text(380, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist Challenge', { fill: colors.accent, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 140, 'You increase the frequency (higher pitch).', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 165, 'What happens to the dead spot locations?', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'A';
      r.rect(100, 340, 500, 60, { fill: isCorrect ? '#065f4620' : '#7f1d1d20', stroke: isCorrect ? colors.success : colors.danger, rx: 12 });
      r.text(350, 375, isCorrect ? 'Correct! Higher frequency = shorter wavelength = more closely spaced dead spots!' : 'Not quite. Remember: wavelength = v/f. Higher f means shorter wavelength.', { fill: isCorrect ? colors.success : colors.danger, fontSize: 13, textAnchor: 'middle' });
    }
  }

  private renderTwistPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Frequency & Wavelength', { fill: colors.accent, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(80, 50, 380, 300, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderInterferenceDiagram(r, 270, 200, 320);

    const wavelength = this.calculateWavelength();
    r.rect(480, 50, 170, 150, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(565, 80, 'Wavelength Effect', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(500, 110, 'Frequency:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 110, this.frequency + ' Hz', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });
    r.text(500, 140, 'Wavelength:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 140, wavelength.toFixed(2) + ' m', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'end' });
    r.text(500, 170, 'Dead spot spacing:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 170, (wavelength / 2).toFixed(2) + ' m', { fill: colors.danger, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', { fill: colors.accent, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(100, 80, 500, 200, { fill: '#78350f30', stroke: colors.accent, rx: 16 });
    r.text(350, 110, 'Frequency, Wavelength & Dead Spots', { fill: colors.accent, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    [{ l: 'Low frequency (bass):', v: 'Long wavelength, widely spaced spots' }, { l: 'High frequency (treble):', v: 'Short wavelength, closely spaced spots' }, { l: 'Formula:', v: 'lambda = v / f' }, { l: 'Practical:', v: 'Bass is hard to localize; treble has complex patterns' }].forEach((item, i) => {
      r.text(150, 145 + i * 30, item.l, { fill: colors.textSecondary, fontSize: 13, fontWeight: 'bold' });
      r.text(350, 145 + i * 30, item.v, { fill: colors.textPrimary, fontSize: 13 });
    });
  }

  private renderTransferPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Real-World Applications', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    applications.forEach((app, i) => {
      const isSelected = i === this.selectedApp;
      r.rect(80 + i * 155, 70, 140, 40, { fill: isSelected ? colors.primary : colors.bgCard, stroke: this.completedApps[i] ? colors.success : colors.border, rx: 8 });
      r.text(150 + i * 155, 95, app.title.split(' ')[0], { fill: isSelected ? colors.textPrimary : colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    });
    const app = applications[this.selectedApp];
    r.rect(80, 130, 540, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 165, app.title, { fill: colors.textPrimary, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 200, app.description, { fill: colors.textSecondary, fontSize: 13, textAnchor: 'middle' });
    r.text(350, 260, app.details, { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
  }

  private renderTestPhase(r: CommandRenderer): void {
    if (this.testSubmitted) { this.renderTestResults(r); return; }
    const q = testQuestions[this.testQuestion];
    r.text(350, 40, `Question ${this.testQuestion + 1} of ${testQuestions.length}`, { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 80, q.question, { fill: colors.textPrimary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    q.options.forEach((option, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;
      r.rect(100, 110 + i * 55, 500, 45, { fill: isSelected ? colors.primary + '40' : colors.bgCard, stroke: isSelected ? colors.primary : colors.border, rx: 8 });
      r.text(350, 138 + i * 55, option, { fill: isSelected ? colors.primary : colors.textSecondary, fontSize: 13, textAnchor: 'middle' });
    });
  }

  private renderTestResults(r: CommandRenderer): void {
    const score = this.calculateTestScore();
    const passed = score >= 7;
    r.text(350, 100, passed ? 'Excellent Work!' : 'Keep Learning!', { fill: passed ? colors.success : colors.accent, fontSize: 32, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 160, `Score: ${score} / ${testQuestions.length}`, { fill: colors.textPrimary, fontSize: 24, textAnchor: 'middle' });
  }

  private renderMasteryPhase(r: CommandRenderer): void {
    r.rect(150, 80, 400, 340, { fill: colors.bgCard, stroke: colors.border, rx: 24 });
    r.text(350, 130, 'Sound Interference Master!', { fill: colors.textPrimary, fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 165, "You've mastered wave interference and dead spots!", { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    [{ icon: 'wave', label: 'Interference' }, { icon: 'lambda', label: 'Wavelength' }, { icon: 'cancel', label: 'Destructive' }, { icon: 'app', label: 'Applications' }].forEach((badge, i) => {
      const x = 180 + (i % 2) * 170;
      const y = 200 + Math.floor(i / 2) * 80;
      r.rect(x, y, 150, 60, { fill: colors.bgCardLight, rx: 12 });
      r.text(x + 75, y + 25, badge.icon, { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x + 75, y + 45, badge.label, { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    });
  }

  private renderUIState(r: CommandRenderer): void {
    r.setHeader(this.gameTitle, this.phaseLabels[this.phase]);
    r.setProgress({ id: 'phase_progress', current: this.phaseOrder.indexOf(this.phase) + 1, total: this.phaseOrder.length, labels: this.phaseOrder.map((p) => this.phaseLabels[p]), color: colors.primary });
    if (this.guidedMode) r.setCoachMessage(this.coachMessages[this.phase]);
    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx > 0) r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });

    switch (this.phase) {
      case 'hook': r.addButton({ id: 'next', label: 'Explore Interference', variant: 'primary' }); break;
      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. They get louder', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. They cancel (silence)', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. No change', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        if (this.prediction) r.addButton({ id: 'next', label: 'See the Lab', variant: 'success' });
        break;
      case 'play':
        r.addSlider({ id: 'frequency', label: 'Frequency (Hz)', value: this.frequency, min: 100, max: 1000, step: 50 });
        r.addSlider({ id: 'listenerX', label: 'Listener Position', value: this.listenerX, min: -3, max: 3, step: 0.1 });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;
      case 'review': r.addButton({ id: 'next', label: 'Discover a Twist', variant: 'warning' }); break;
      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Closer together', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Farther apart', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. No change', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        if (this.twistPrediction) r.addButton({ id: 'next', label: 'Test It', variant: 'success' });
        break;
      case 'twist_play':
        r.addSlider({ id: 'frequency', label: 'Frequency (Hz)', value: this.frequency, min: 100, max: 1000, step: 50 });
        r.addButton({ id: 'next', label: 'Review Discovery', variant: 'primary' });
        break;
      case 'twist_review': r.addButton({ id: 'next', label: 'Applications', variant: 'primary' }); break;
      case 'transfer':
        applications.forEach((_, i) => r.addButton({ id: `app_${i}`, label: applications[i].title.split(' ')[0], variant: this.selectedApp === i ? 'primary' : 'ghost' }));
        if (this.completedApps.every((c) => c)) r.addButton({ id: 'next', label: 'Take Test', variant: 'success' });
        break;
      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= testQuestions.length - 1 });
          testQuestions[this.testQuestion].options.forEach((_, i) => r.addButton({ id: `answer_${i}`, label: String.fromCharCode(65 + i), variant: this.testAnswers[this.testQuestion] === i ? 'primary' : 'secondary' }));
          if (this.testAnswers.every((a) => a !== null)) r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
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
    return { phase: this.phase, prediction: this.prediction, twistPrediction: this.twistPrediction, frequency: this.frequency, speakerSeparation: this.speakerSeparation, listenerX: this.listenerX, testQuestion: this.testQuestion, testAnswers: this.testAnswers, testSubmitted: this.testSubmitted, selectedApp: this.selectedApp, completedApps: this.completedApps, guidedMode: this.guidedMode };
  }

  restoreState(state: Record<string, unknown>): void {
    this.phase = (state.phase as GamePhase) || 'hook';
    this.prediction = (state.prediction as string) || null;
    this.twistPrediction = (state.twistPrediction as string) || null;
    this.frequency = (state.frequency as number) || 340;
    this.speakerSeparation = (state.speakerSeparation as number) || 3;
    this.listenerX = (state.listenerX as number) || 0;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

export function createSoundDeadSpotsGame(sessionId: string): SoundDeadSpotsGame {
  return new SoundDeadSpotsGame(sessionId);
}
