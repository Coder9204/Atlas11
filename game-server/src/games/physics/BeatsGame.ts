/**
 * Beats (Beat Frequency) Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Beat frequency formula: f_beat = |f1 - f2|
 * - Wave superposition: y = y1 + y2
 * - Amplitude modulation via interference
 * - Application to tuning, Doppler radar, ultrasound
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer, clamp } from '../../renderer/CommandRenderer.js';

// === GAME PHASES ===
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

// === TEST QUESTIONS (PROTECTED) ===
interface TestQuestion {
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const testQuestions: TestQuestion[] = [
  {
    scenario: 'Two tuning forks are struck together. One produces 256 Hz and the other produces 260 Hz.',
    question: 'What is the beat frequency you will hear?',
    options: ['2 Hz', '4 Hz', '258 Hz', '516 Hz'],
    correctIndex: 1,
    explanation: 'Beat frequency = |f2 - f1| = |260 - 256| = 4 Hz.',
  },
  {
    scenario: 'You hear a pulsating wah-wah sound when two similar notes play together.',
    question: 'What causes this characteristic beat sound?',
    options: ['Echo effects', 'Constructive and destructive interference cycling', 'Speaker distortion', 'Room acoustics'],
    correctIndex: 1,
    explanation: 'Beats occur when two slightly different frequencies alternately reinforce and cancel each other.',
  },
  {
    scenario: 'A piano tuner hears 3 beats per second against a reference tuning fork.',
    question: 'What is the frequency difference between the piano string and tuning fork?',
    options: ['1.5 Hz', '3 Hz', '6 Hz', '9 Hz'],
    correctIndex: 1,
    explanation: 'Beat frequency equals the frequency difference directly. 3 beats/second means 3 Hz difference.',
  },
  {
    scenario: 'A tuner hears 5 beats/second. After tightening the string, beats slow to 2/second.',
    question: 'What does this tell the tuner?',
    options: ['String got farther from target', 'String got closer to target', 'String stayed the same', 'Impossible to determine'],
    correctIndex: 1,
    explanation: 'Slower beats mean smaller frequency difference. The tuner is approaching the reference.',
  },
  {
    scenario: 'Two tones of 440 Hz and 444 Hz are played simultaneously.',
    question: 'What pitch do you perceive?',
    options: ['444 Hz', '440 Hz', '442 Hz (the average)', '4 Hz (the beat frequency)'],
    correctIndex: 2,
    explanation: 'The perceived pitch is the average: (440 + 444)/2 = 442 Hz.',
  },
  {
    scenario: 'Two violin strings produce 440 Hz and 443 Hz.',
    question: 'The beat frequency will be:',
    options: ['3 Hz', '441.5 Hz', '883 Hz', '0 Hz'],
    correctIndex: 0,
    explanation: 'Beat frequency = |443 - 440| = 3 Hz, creating 3 pulsations per second.',
  },
  {
    scenario: 'A musician is tuning their guitar against a reference.',
    question: 'Why are beats useful for precise tuning?',
    options: ['They make sound louder', 'Zero beats means frequencies match exactly', 'They create harmony', 'They add resonance'],
    correctIndex: 1,
    explanation: 'When beats disappear (beat frequency = 0), the two frequencies are identical.',
  },
  {
    scenario: 'Two oscillators start at different frequencies. You adjust one toward the other.',
    question: 'As frequencies get closer, what happens to beats?',
    options: ['Get faster', 'Get slower until they disappear', 'Stay constant', 'Become irregular'],
    correctIndex: 1,
    explanation: 'Beat frequency = |f2 - f1|. As difference decreases, beats slow down.',
  },
  {
    scenario: 'Someone suggests playing 200 Hz and 400 Hz together to create beats.',
    question: 'Can you hear beats with these frequencies?',
    options: ['Yes, 200 Hz beats', 'Yes, 600 Hz beats', 'No, difference is too large', 'Yes, 300 Hz beats'],
    correctIndex: 2,
    explanation: 'Beats only audible when difference is small (< 20 Hz). 200 Hz difference is too large.',
  },
  {
    scenario: 'A physics student is asked to write the beat frequency formula.',
    question: 'What is the correct expression?',
    options: ['f1 + f2', 'f1 × f2', '|f1 - f2|', '(f1 + f2) / 2'],
    correctIndex: 2,
    explanation: 'Beat frequency = |f1 - f2|, the absolute difference between frequencies.',
  },
];

// === TRANSFER APPLICATIONS ===
interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  stats: { value: string; label: string }[];
}

const transferApps: TransferApp[] = [
  {
    icon: 'P',
    title: 'Instrument Tuning',
    short: 'Piano',
    tagline: 'Zero beats means perfect pitch',
    description: 'Professional tuners use beats to achieve precise tuning.',
    connection: 'Beat frequency tells tuners how close they are to reference pitch.',
    stats: [
      { value: '0.1 Hz', label: 'Pro accuracy' },
      { value: '88', label: 'Piano keys' },
      { value: '200+', label: 'Years used' },
    ],
  },
  {
    icon: 'R',
    title: 'Doppler Radar',
    short: 'Radar',
    tagline: 'Beats reveal velocity',
    description: 'Radar guns measure beat frequency between transmitted and reflected waves.',
    connection: 'Beat frequency proportional to target speed.',
    stats: [
      { value: '10 GHz', label: 'Frequency' },
      { value: '0.1 mph', label: 'Resolution' },
      { value: '1000 ft', label: 'Range' },
    ],
  },
  {
    icon: 'M',
    title: 'Music Production',
    short: 'Synths',
    tagline: 'Creating texture with detuning',
    description: 'Detuned oscillators create pulsating, rich sounds.',
    connection: 'Beat frequency becomes the tremolo rate.',
    stats: [
      { value: '1-10 Hz', label: 'LFO rate' },
      { value: '2+', label: 'Oscillators' },
      { value: 'Infinite', label: 'Possibilities' },
    ],
  },
  {
    icon: 'U',
    title: 'Medical Ultrasound',
    short: 'Blood Flow',
    tagline: 'Doppler measures life',
    description: 'Measures blood flow via beat frequency from moving blood cells.',
    connection: 'Beat frequency proportional to blood velocity.',
    stats: [
      { value: '2-18 MHz', label: 'Frequency' },
      { value: '< 1mm', label: 'Resolution' },
      { value: 'Real-time', label: 'Imaging' },
    ],
  },
];

// === COLORS ===
const colors = {
  primary: '#14b8a6',
  primaryDark: '#0d9488',
  accent: '#06b6d4',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  bgDark: '#021210',
  bgCard: '#0c2822',
  bgCardLight: '#123830',
  border: '#1e4d44',
  textPrimary: '#f0fdfa',
  textSecondary: '#99f6e4',
  textMuted: '#5eead4',
};

// === MAIN GAME CLASS ===
export class BeatsGame extends BaseGame {
  readonly gameType = 'beats';
  readonly gameTitle = 'Beat Frequency';

  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  private freq1 = 440;
  private freq2 = 444;
  private time = 0;
  private isPlaying = true;
  private hasExperimented = false;

  private testQuestion = 0;
  private testAnswers: (number | null)[] = Array(10).fill(null);
  private testSubmitted = false;

  private selectedApp = 0;
  private completedApps = [false, false, false, false];

  private lastNavTime = 0;
  private isNavigating = false;
  private guidedMode = true;

  private readonly phaseOrder: GamePhase[] = [
    'hook', 'predict', 'play', 'review',
    'twist_predict', 'twist_play', 'twist_review',
    'transfer', 'test', 'mastery',
  ];

  private readonly phaseLabels: Record<GamePhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Wave Lab',
    review: 'Understanding',
    twist_predict: 'Frequency Match',
    twist_play: 'Precision Tuning',
    twist_review: 'Discovery',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Have you ever heard a pulsating wah-wah sound when two similar tones play together?',
    predict: 'What do you think causes that rhythmic pulsing?',
    play: 'Experiment with two frequencies. Watch how their waves combine!',
    review: 'The pulsing rate equals the frequency difference.',
    twist_predict: 'What happens as frequencies get closer together?',
    twist_play: 'Try to match the frequencies exactly. Can you make beats disappear?',
    twist_review: "You've discovered how musicians tune instruments by ear!",
    transfer: 'From piano tuning to medical ultrasound, beats are everywhere!',
    test: 'Time to test your understanding of beat frequency!',
    mastery: 'Congratulations! You understand wave interference and beats!',
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

    this.emitCoachEvent('game_started', {
      phase: this.phase,
      phaseLabel: this.phaseLabels[this.phase],
      message: 'Beat Frequency lesson started',
    });
  }

  // === INPUT HANDLING ===
  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click':
        this.handleButtonClick(input.id);
        break;
      case 'slider_change':
        this.handleSliderChange(input.id, input.value);
        break;
      case 'select_change':
        this.handleSelectChange(input.id, input.value);
        break;
      case 'toggle_change':
        this.handleToggleChange(input.id, input.value);
        break;
      case 'hint_request':
        this.handleHintRequest();
        break;
    }
  }

  private handleButtonClick(id: string): void {
    if (id === 'next') { this.goNext(); return; }
    if (id === 'back') { this.goBack(); return; }
    if (id === 'start') { this.goToPhase('predict'); return; }

    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }
    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
      this.emitCoachEvent('twist_prediction_made', { prediction: this.twistPrediction });
      return;
    }
    if (id.startsWith('answer_')) {
      this.testAnswers[this.testQuestion] = parseInt(id.replace('answer_', ''), 10);
      return;
    }
    if (id === 'test_next' && this.testQuestion < 9) { this.testQuestion++; return; }
    if (id === 'test_prev' && this.testQuestion > 0) { this.testQuestion--; return; }
    if (id === 'test_submit') {
      this.testSubmitted = true;
      this.emitCoachEvent('test_completed', { score: this.calculateTestScore() });
      return;
    }
    if (id.startsWith('app_')) {
      const appIndex = parseInt(id.replace('app_', ''), 10);
      this.selectedApp = appIndex;
      this.completedApps[appIndex] = true;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'freq1') {
      this.freq1 = clamp(value, 200, 600);
      this.hasExperimented = true;
    }
    if (id === 'freq2') {
      this.freq2 = clamp(value, 200, 600);
      this.hasExperimented = true;
    }
  }

  private handleSelectChange(id: string, value: string): void {
    // Handle select changes if needed
  }

  private handleToggleChange(id: string, value: boolean): void {
    // Handle toggle changes if needed
  }

  private handleHintRequest(): void {
    this.emitCoachEvent('hint_provided', {
      phase: this.phase,
      hint: this.coachMessages[this.phase],
    });
  }

  private goToPhase(phase: GamePhase): void {
    if (this.isNavigating) return;
    this.isNavigating = true;
    this.lastNavTime = Date.now();

    this.phase = phase;
    this.emitCoachEvent('phase_changed', {
      phase,
      phaseLabel: this.phaseLabels[phase],
      coachMessage: this.coachMessages[phase],
    });

    setTimeout(() => { this.isNavigating = false; }, 400);
  }

  private goNext(): void {
    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx < this.phaseOrder.length - 1) {
      this.goToPhase(this.phaseOrder[idx + 1]);
    }
  }

  private goBack(): void {
    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx > 0) {
      this.goToPhase(this.phaseOrder[idx - 1]);
    }
  }

  // === PHYSICS (PROTECTED) ===
  update(deltaTime: number): void {
    if (!this.isPlaying) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;
    this.time += deltaTime / 1000;
  }

  private getBeatFrequency(): number {
    return Math.abs(this.freq1 - this.freq2);
  }

  private calculateTestScore(): number {
    let correct = 0;
    for (let i = 0; i < testQuestions.length; i++) {
      if (this.testAnswers[i] === testQuestions[i].correctIndex) {
        correct++;
      }
    }
    return correct;
  }

  private allAppsCompleted(): boolean {
    return this.completedApps.every(c => c);
  }

  // === RENDERING ===
  render(): GameFrame {
    const r = new CommandRenderer(this.viewport.width, this.viewport.height);
    r.reset();
    r.setViewport(700, 400);
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

    this.renderProgressBar(r);

    return r.toFrame(this.nextFrame());
  }

  private renderProgressBar(r: CommandRenderer): void {
    const currentIdx = this.phaseOrder.indexOf(this.phase);
    r.rect(0, 0, 700, 25, { fill: colors.bgCard });

    for (let i = 0; i < this.phaseOrder.length; i++) {
      const dotX = 70 + i * 60;
      const isComplete = i < currentIdx;
      const isCurrent = i === currentIdx;
      r.circle(dotX, 12, isCurrent ? 6 : 4, {
        fill: isComplete ? colors.success : isCurrent ? colors.primary : colors.bgCardLight,
      });
    }
  }

  private renderWaves(r: CommandRenderer, x: number, y: number, w: number, h: number): void {
    r.rect(x, y, w, h, { fill: colors.bgCard, stroke: colors.border, rx: 8 });

    const amp = 20;
    const timeScale = 0.01;

    // Wave 1
    r.text(x + 10, y + 20, `f1 = ${this.freq1} Hz`, { fill: colors.primary, fontSize: 11 });
    for (let px = 0; px < w - 20; px += 4) {
      const t = px * timeScale + this.time;
      const py = y + 45 + amp * Math.sin(2 * Math.PI * this.freq1 * t * 0.005);
      r.circle(x + 10 + px, py, 1.5, { fill: colors.primary });
    }

    // Wave 2
    r.text(x + 10, y + 80, `f2 = ${this.freq2} Hz`, { fill: colors.accent, fontSize: 11 });
    for (let px = 0; px < w - 20; px += 4) {
      const t = px * timeScale + this.time;
      const py = y + 105 + amp * Math.sin(2 * Math.PI * this.freq2 * t * 0.005);
      r.circle(x + 10 + px, py, 1.5, { fill: colors.accent });
    }

    // Combined
    const beatFreq = this.getBeatFrequency();
    r.text(x + 10, y + 140, `Beat = ${beatFreq} Hz`, { fill: colors.success, fontSize: 11 });
    for (let px = 0; px < w - 20; px += 4) {
      const t = px * timeScale + this.time;
      const y1 = amp * Math.sin(2 * Math.PI * this.freq1 * t * 0.005);
      const y2 = amp * Math.sin(2 * Math.PI * this.freq2 * t * 0.005);
      const py = y + 165 + (y1 + y2) / 2;
      r.circle(x + 10 + px, py, 1.5, { fill: colors.success });
    }
  }

  private renderHook(r: CommandRenderer): void {
    r.text(350, 60, 'Beat Frequency', { fill: colors.textPrimary, fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 90, 'The Science of Musical Interference', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });

    this.renderWaves(r, 100, 110, 500, 190);

    r.rect(250, 320, 200, 45, { fill: colors.primary, rx: 12, id: 'start' });
    r.text(350, 348, 'Start Experiment', { fill: colors.textPrimary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(350, 50, 'What Creates the Pulsing Sound?', { fill: colors.textPrimary, fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      { id: 'echo', label: 'Echo and reflection effects' },
      { id: 'interference', label: 'Waves reinforcing and canceling each other' },
      { id: 'speaker', label: 'Speaker distortion' },
    ];

    options.forEach((opt, i) => {
      const selected = this.prediction === opt.id;
      r.rect(100, 100 + i * 55, 500, 45, {
        fill: selected ? colors.primaryDark : colors.bgCard,
        stroke: selected ? colors.primary : colors.border,
        rx: 10,
        id: `predict_${opt.id}`,
      });
      r.text(350, 128 + i * 55, opt.label, {
        fill: selected ? colors.textPrimary : colors.textSecondary,
        fontSize: 13,
        textAnchor: 'middle',
      });
    });

    if (this.prediction) {
      r.rect(500, 300, 140, 38, { fill: colors.primary, rx: 8, id: 'next' });
      r.text(570, 324, 'Run Experiment', { fill: colors.textPrimary, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(350, 45, 'Wave Lab', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    this.renderWaves(r, 20, 60, 420, 190);

    // Controls
    r.rect(460, 60, 220, 190, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
    r.text(570, 85, 'Controls', { fill: colors.textPrimary, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(570, 115, `f1: ${this.freq1} Hz`, { fill: colors.primary, fontSize: 11, textAnchor: 'middle' });
    r.rect(480, 125, 180, 8, { fill: colors.bgCardLight, rx: 4 });
    const s1 = 480 + ((this.freq1 - 200) / 400) * 180;
    r.circle(s1, 129, 8, { fill: colors.primary, id: 'slider_freq1' });

    r.text(570, 160, `f2: ${this.freq2} Hz`, { fill: colors.accent, fontSize: 11, textAnchor: 'middle' });
    r.rect(480, 170, 180, 8, { fill: colors.bgCardLight, rx: 4 });
    const s2 = 480 + ((this.freq2 - 200) / 400) * 180;
    r.circle(s2, 174, 8, { fill: colors.accent, id: 'slider_freq2' });

    const beat = this.getBeatFrequency();
    r.text(570, 210, 'Beat Frequency:', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(570, 235, `${beat} Hz`, { fill: colors.success, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Formula
    r.rect(20, 265, 660, 40, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
    r.text(350, 290, `Beat frequency = |f1 - f2| = |${this.freq1} - ${this.freq2}| = ${beat} Hz`, {
      fill: colors.warning, fontSize: 12, textAnchor: 'middle',
    });

    r.rect(550, 320, 120, 35, { fill: this.hasExperimented ? colors.primary : colors.bgCardLight, rx: 8, id: 'next' });
    r.text(610, 342, 'Continue', { fill: this.hasExperimented ? colors.textPrimary : colors.textMuted, fontSize: 12, textAnchor: 'middle' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(350, 50, 'The Physics of Beats', { fill: colors.textPrimary, fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const takeaways = [
      { title: 'Superposition', desc: 'Waves add together at each point in space' },
      { title: 'Interference', desc: 'Constructive (loud) and destructive (soft) alternate' },
      { title: 'Beat Frequency', desc: 'f_beat = |f1 - f2| gives pulsations per second' },
    ];

    takeaways.forEach((t, i) => {
      r.rect(60, 85 + i * 70, 580, 60, { fill: colors.bgCard, stroke: colors.border, rx: 10 });
      r.text(90, 110 + i * 70, t.title, { fill: colors.primary, fontSize: 14, fontWeight: 'bold' });
      r.text(90, 132 + i * 70, t.desc, { fill: colors.textSecondary, fontSize: 12 });
    });

    r.rect(550, 320, 120, 35, { fill: colors.primary, rx: 8, id: 'next' });
    r.text(610, 342, 'Next', { fill: colors.textPrimary, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 50, 'What If Frequencies Get Closer?', { fill: colors.textPrimary, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 80, 'As frequencies approach each other, what happens to beats?', { fill: colors.textSecondary, fontSize: 13, textAnchor: 'middle' });

    const options = [
      { id: 'faster', label: 'Beats get faster' },
      { id: 'slower', label: 'Beats get slower and disappear at unison' },
      { id: 'same', label: 'Beats stay the same' },
    ];

    options.forEach((opt, i) => {
      const selected = this.twistPrediction === opt.id;
      r.rect(100, 110 + i * 55, 500, 45, {
        fill: selected ? '#4a2810' : colors.bgCard,
        stroke: selected ? colors.warning : colors.border,
        rx: 10,
        id: `twist_${opt.id}`,
      });
      r.text(350, 138 + i * 55, opt.label, {
        fill: selected ? colors.textPrimary : colors.textSecondary,
        fontSize: 13,
        textAnchor: 'middle',
      });
    });

    if (this.twistPrediction) {
      r.rect(500, 300, 140, 38, { fill: colors.warning, rx: 8, id: 'next' });
      r.text(570, 324, 'Try It Out', { fill: colors.textPrimary, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(350, 45, 'Precision Tuning', { fill: colors.warning, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 70, 'Match the frequencies exactly!', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });

    this.renderWaves(r, 20, 85, 420, 180);

    // Tuning panel
    r.rect(460, 85, 220, 180, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
    r.text(570, 110, 'Fine Tuning', { fill: colors.warning, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(570, 140, `Target: ${this.freq1} Hz`, { fill: colors.primary, fontSize: 11, textAnchor: 'middle' });
    r.text(570, 165, `f2: ${this.freq2} Hz`, { fill: colors.accent, fontSize: 11, textAnchor: 'middle' });

    r.rect(480, 175, 180, 8, { fill: colors.bgCardLight, rx: 4 });
    const s2 = 480 + ((this.freq2 - 200) / 400) * 180;
    r.circle(s2, 179, 10, { fill: colors.warning, id: 'slider_freq2' });

    const beat = this.getBeatFrequency();
    const matched = beat === 0;
    r.text(570, 210, 'Beat:', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(570, 240, `${beat} Hz`, { fill: matched ? colors.success : colors.warning, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    if (matched) {
      r.text(570, 260, 'MATCHED!', { fill: colors.success, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    }

    r.rect(550, 320, 120, 35, { fill: colors.primary, rx: 8, id: 'next' });
    r.text(610, 342, 'Continue', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(350, 55, 'Zero Beats = Perfect Tuning!', { fill: colors.textPrimary, fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 85, 'This is exactly how musicians tune instruments by ear.', { fill: colors.textSecondary, fontSize: 13, textAnchor: 'middle' });

    r.rect(80, 110, 540, 70, { fill: '#0d3320', stroke: colors.success, rx: 12 });
    r.text(350, 140, 'Key Insight', { fill: colors.success, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 165, 'When beat frequency = 0, frequencies are identical.', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });

    r.text(350, 220, 'This principle powers many technologies:', { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });

    const apps = ['Tuning', 'Radar', 'Ultrasound', 'Synths'];
    apps.forEach((a, i) => {
      r.rect(90 + i * 135, 240, 120, 35, { fill: colors.bgCard, stroke: colors.border, rx: 6 });
      r.text(150 + i * 135, 262, a, { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    });

    r.rect(550, 320, 120, 35, { fill: colors.success, rx: 8, id: 'next' });
    r.text(610, 342, 'Applications', { fill: colors.textPrimary, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
  }

  private renderTransfer(r: CommandRenderer): void {
    const app = transferApps[this.selectedApp];
    const completed = this.completedApps.filter(c => c).length;
    const allDone = this.allAppsCompleted();

    r.text(350, 35, 'Real World Applications', { fill: colors.success, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(620, 35, `${completed}/4`, { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });

    // Tabs
    transferApps.forEach((a, i) => {
      const sel = this.selectedApp === i;
      const done = this.completedApps[i];
      r.rect(30 + i * 165, 55, 155, 38, {
        fill: sel ? colors.bgCardLight : colors.bgCard,
        stroke: sel ? colors.primary : colors.border,
        rx: 8,
        id: `app_${i}`,
      });
      r.text(107 + i * 165, 78, a.short, {
        fill: sel ? colors.textPrimary : colors.textSecondary,
        fontSize: 12,
        textAnchor: 'middle',
      });
      if (done) r.text(160 + i * 165, 78, '✓', { fill: colors.success, fontSize: 12 });
    });

    // App content
    r.rect(30, 105, 640, 200, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(60, 135, app.title, { fill: colors.textPrimary, fontSize: 18, fontWeight: 'bold' });
    r.text(60, 160, app.tagline, { fill: colors.primary, fontSize: 12 });
    r.text(60, 190, app.description, { fill: colors.textSecondary, fontSize: 11 });
    r.text(60, 220, 'Connection:', { fill: colors.warning, fontSize: 10, fontWeight: 'bold' });
    r.text(60, 240, app.connection, { fill: colors.textMuted, fontSize: 10 });

    app.stats.forEach((s, i) => {
      r.rect(60 + i * 200, 260, 180, 35, { fill: colors.bgCardLight, rx: 6 });
      r.text(150 + i * 200, 275, s.value, { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(150 + i * 200, 290, s.label, { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
    });

    if (allDone) {
      r.rect(550, 320, 120, 35, { fill: colors.success, rx: 8, id: 'next' });
      r.text(610, 342, 'Take Quiz', { fill: colors.textPrimary, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (this.testSubmitted) {
      this.renderTestResults(r);
      return;
    }

    const q = testQuestions[this.testQuestion];

    r.text(350, 40, `Question ${this.testQuestion + 1} of 10`, { fill: colors.textPrimary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Dots
    for (let i = 0; i < 10; i++) {
      const color = this.testAnswers[i] !== null ? colors.primary : i === this.testQuestion ? colors.warning : colors.bgCardLight;
      r.circle(260 + i * 20, 60, 5, { fill: color });
    }

    r.rect(50, 80, 600, 45, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
    r.text(70, 108, q.scenario, { fill: colors.textSecondary, fontSize: 11 });

    r.text(350, 150, q.question, { fill: colors.textPrimary, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    q.options.forEach((opt, i) => {
      const sel = this.testAnswers[this.testQuestion] === i;
      r.rect(80, 170 + i * 42, 540, 36, {
        fill: sel ? colors.primaryDark : colors.bgCard,
        stroke: sel ? colors.primary : colors.border,
        rx: 8,
        id: `answer_${i}`,
      });
      r.text(110, 193 + i * 42, `${String.fromCharCode(65 + i)}. ${opt}`, {
        fill: sel ? colors.textPrimary : colors.textSecondary,
        fontSize: 11,
      });
    });

    if (this.testQuestion > 0) {
      r.rect(80, 350, 90, 30, { fill: colors.bgCardLight, rx: 6, id: 'test_prev' });
      r.text(125, 369, 'Previous', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    }

    const canProceed = this.testAnswers[this.testQuestion] !== null;
    r.rect(530, 350, 90, 30, {
      fill: canProceed ? colors.primary : colors.bgCardLight,
      rx: 6,
      id: this.testQuestion < 9 ? 'test_next' : 'test_submit',
    });
    r.text(575, 369, this.testQuestion < 9 ? 'Next' : 'Submit', {
      fill: canProceed ? colors.textPrimary : colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle',
    });
  }

  private renderTestResults(r: CommandRenderer): void {
    const score = this.calculateTestScore();
    const passed = score >= 7;

    r.text(350, 80, 'Test Complete!', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 140, `${score} / 10`, { fill: passed ? colors.success : colors.danger, fontSize: 40, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 180, passed ? 'You passed!' : 'Keep studying.', { fill: passed ? colors.success : colors.textSecondary, fontSize: 14, textAnchor: 'middle' });

    if (passed) {
      r.rect(275, 220, 150, 40, { fill: colors.success, rx: 10, id: 'next' });
      r.text(350, 245, 'Claim Mastery', { fill: colors.textPrimary, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Confetti
    const confettiColors = [colors.primary, colors.accent, colors.success, colors.warning];
    for (let i = 0; i < 30; i++) {
      r.circle(50 + Math.random() * 600, 50 + Math.random() * 300, 3 + Math.random() * 5, {
        fill: confettiColors[i % confettiColors.length],
        opacity: 0.4,
      });
    }

    r.text(350, 80, 'Mastery Achieved!', { fill: colors.textPrimary, fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 110, 'Beat Frequency Expert', { fill: colors.primary, fontSize: 16, textAnchor: 'middle' });

    r.rect(100, 140, 500, 160, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(350, 170, 'What You Mastered:', { fill: colors.success, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const learnings = [
      'Beat frequency = |f1 - f2|',
      'Wave superposition and interference',
      'Zero beats indicates frequency match',
      'Applications in tuning, radar, medicine',
    ];
    learnings.forEach((l, i) => {
      r.text(140, 200 + i * 25, `✓ ${l}`, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.text(350, 330, 'You can now explain and apply beat frequency phenomena!', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
  }

  // === STATE MANAGEMENT ===
  getCurrentPhase(): string {
    return this.phase;
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      freq1: this.freq1,
      freq2: this.freq2,
      time: this.time,
      hasExperimented: this.hasExperimented,
      testQuestion: this.testQuestion,
      testAnswers: this.testAnswers,
      testSubmitted: this.testSubmitted,
      selectedApp: this.selectedApp,
      completedApps: this.completedApps,
      guidedMode: this.guidedMode,
    };
  }

  restoreState(state: Record<string, unknown>): void {
    this.phase = (state.phase as GamePhase) || 'hook';
    this.prediction = (state.prediction as string) || null;
    this.twistPrediction = (state.twistPrediction as string) || null;
    this.freq1 = (state.freq1 as number) || 440;
    this.freq2 = (state.freq2 as number) || 444;
    this.time = (state.time as number) || 0;
    this.hasExperimented = (state.hasExperimented as boolean) || false;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY ===
export function createBeatsGame(sessionId: string): BeatsGame {
  return new BeatsGame(sessionId);
}
