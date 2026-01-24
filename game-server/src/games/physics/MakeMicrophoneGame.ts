/**
 * Make Microphone Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Electromagnetic induction: V = -N dΦ/dt (Faraday's Law)
 * - Voice coil force: F = BIL (force on current-carrying wire)
 * - Capacitance relationship: C = εA/d (condenser mic principle)
 * - Transducer reciprocity principle
 * - Dynamic vs condenser mic physics
 * - Speaker-as-microphone reversibility
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
    question: 'How does a dynamic microphone generate electricity from sound?',
    options: [
      'Chemical reaction in the diaphragm',
      'A coil attached to the diaphragm moves in a magnetic field, inducing voltage',
      'Static electricity from compressed air',
      'Heat from sound friction generates current',
    ],
    correctIndex: 1,
  },
  {
    question: 'Why can a speaker actually work as a microphone?',
    options: [
      'It has a hidden microphone inside',
      'The magnet can store and replay sound',
      'Electromagnetic induction is reversible - motion creates current',
      'Speakers have special reverse circuits',
    ],
    correctIndex: 2,
  },
  {
    question: 'Which type of microphone needs phantom power (48V)?',
    options: ['Dynamic microphone', 'Ribbon microphone', 'Condenser microphone', 'Carbon microphone'],
    correctIndex: 2,
  },
  {
    question: 'What physical principle do condenser microphones use?',
    options: [
      'Changing capacitance as diaphragm-to-backplate distance varies',
      'Piezoelectric crystal compression',
      'Coil movement in magnetic field',
      'Carbon granule resistance changes',
    ],
    correctIndex: 0,
  },
  {
    question: 'Why are dynamic microphones preferred for live performances?',
    options: [
      'They have better frequency response',
      'They are more sensitive to quiet sounds',
      'They are rugged and need no external power',
      'They produce louder output signals',
    ],
    correctIndex: 2,
  },
  {
    question: 'What is a transducer?',
    options: [
      'A device that amplifies sound',
      'A device that converts one form of energy to another',
      'A type of audio cable connector',
      'A frequency filter for audio signals',
    ],
    correctIndex: 1,
  },
  {
    question: 'What are MEMS microphones commonly found in?',
    options: [
      'Professional recording studios only',
      'Vintage radios and telephones',
      'Smartphones and wireless earbuds',
      'Large concert PA systems',
    ],
    correctIndex: 2,
  },
  {
    question: 'What happens when you increase sound amplitude (loudness) hitting a dynamic mic?',
    options: [
      'The frequency changes',
      'The diaphragm moves more, producing stronger signal',
      'The magnet becomes stronger',
      'The resistance decreases',
    ],
    correctIndex: 1,
  },
  {
    question: 'How do bone conduction headphones deliver sound?',
    options: [
      'Through tiny speakers in the ear canal',
      'By vibrating transducers against your skull bones',
      'Using ultrasonic waves through air',
      'Through electromagnetic brain stimulation',
    ],
    correctIndex: 1,
  },
  {
    question: 'What is the piezoelectric effect used for in audio?',
    options: [
      'Only for producing sound, not capturing it',
      'Bidirectional conversion - both pickups and buzzers use it',
      'Only in microphones, not speakers',
      'Filtering out unwanted frequencies',
    ],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#14b8a6',
  primaryDark: '#0d9488',
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
  coilYellow: '#f59e0b',
  magnetRed: '#dc2626',
  signalTeal: '#14b8a6',
  waveBlue: '#3b82f6',
  capacitorBlue: '#3b82f6',
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
    title: 'Bone Conduction Headphones',
    icon: 'bone',
    description: 'Transducers vibrate against your skull bones, bypassing the eardrum.',
    details: 'Sound travels through bone directly to inner ear, keeping ears open for situational awareness.',
  },
  {
    title: 'Ultrasonic Distance Sensors',
    icon: 'ultrasonic',
    description: 'The same piezoelectric element emits ultrasound pulses AND receives echoes.',
    details: 'Measures distance by timing the round-trip: d = v × t / 2. Used in parking sensors and robotics.',
  },
  {
    title: 'Guitar Pickups',
    icon: 'guitar',
    description: 'Magnets under strings create a field. Vibrating steel strings disturb it.',
    details: 'Induces voltage in the coil wrapped around the magnets. 8,000+ turns of wire per pickup!',
  },
  {
    title: 'MEMS Microphones',
    icon: 'mems',
    description: 'Micro-electro-mechanical systems pack a tiny condenser mic with integrated amplifier.',
    details: 'Found in every smartphone. Typical size: 3mm × 4mm. Combines sensor + amplifier on one chip.',
  },
];

// === MAIN GAME CLASS ===

export class MakeMicrophoneGame extends BaseGame {
  readonly gameType = 'make_microphone';
  readonly gameTitle = 'Make a Microphone';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private soundWavePhase = 0;
  private soundFrequency = 2;
  private soundAmplitude = 0.5;
  private micType: 'dynamic' | 'condenser' = 'dynamic';
  private speakerMode: 'speaker' | 'microphone' = 'speaker';
  private experimentCount = 0;
  private hasExperimented = false;
  private hasExploredTwist = false;

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
    'hook',
    'predict',
    'play',
    'review',
    'twist_predict',
    'twist_play',
    'twist_review',
    'transfer',
    'test',
    'mastery',
  ];

  private readonly phaseLabels: Record<GamePhase, string> = {
    hook: 'Hook',
    predict: 'Predict',
    play: 'Lab',
    review: 'Review',
    twist_predict: 'Twist Predict',
    twist_play: 'Twist Lab',
    twist_review: 'Twist Review',
    transfer: 'Transfer',
    test: 'Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'When you speak into a microphone, sound waves become electricity. How?',
    predict: 'A dynamic mic has a coil in a magnetic field. What principle generates voltage?',
    play: 'Adjust frequency and amplitude. Watch how the diaphragm and signal respond!',
    review: 'Microphones are transducers: Sound → Motion → Electricity. Simple but brilliant!',
    twist_predict: 'A speaker has the same parts as a mic. What if you speak INTO it?',
    twist_play: 'The physics is completely reversible! Speakers CAN work as microphones.',
    twist_review: 'Electromagnetic induction works both ways. This is transducer reciprocity!',
    transfer: 'From guitar pickups to bone conduction, transducers are everywhere.',
    test: 'Apply your understanding of transducers and microphone physics!',
    mastery: 'You understand how sound becomes electricity and vice versa!',
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
      message: 'Make a Microphone lesson started',
    });
  }

  // === INPUT HANDLING ===

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click':
        this.handleButtonClick(input.id!);
        break;
      case 'toggle_change':
        this.handleToggleChange(input.id!, input.value);
        break;
      case 'slider_change':
        this.handleSliderChange(input.id!, input.value);
        break;
      case 'progress_click':
        this.handleProgressClick(input.index!);
        break;
      case 'hint_request':
        this.handleHintRequest();
        break;
    }
  }

  private handleButtonClick(id: string): void {
    // Navigation
    if (id === 'next') {
      this.goNext();
      return;
    }
    if (id === 'back') {
      this.goBack();
      return;
    }

    // Predictions - correct answer is 'induction'
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction, correct: this.prediction === 'induction' });
      return;
    }

    // Twist predictions - correct answer is 'works'
    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
      this.emitCoachEvent('prediction_made', { twistPrediction: this.twistPrediction, correct: this.twistPrediction === 'works' });
      return;
    }

    // Mic type
    if (id === 'mic_dynamic') {
      this.micType = 'dynamic';
      this.handleExperiment();
      return;
    }
    if (id === 'mic_condenser') {
      this.micType = 'condenser';
      this.handleExperiment();
      return;
    }

    // Speaker mode
    if (id === 'mode_speaker') {
      this.speakerMode = 'speaker';
      this.hasExploredTwist = true;
      return;
    }
    if (id === 'mode_microphone') {
      this.speakerMode = 'microphone';
      this.hasExploredTwist = true;
      return;
    }

    // Test answers
    if (id.startsWith('answer_')) {
      this.testAnswers[this.testQuestion] = parseInt(id.replace('answer_', ''), 10);
      return;
    }

    // Test navigation
    if (id === 'test_next' && this.testQuestion < testQuestions.length - 1) {
      this.testQuestion++;
      return;
    }
    if (id === 'test_prev' && this.testQuestion > 0) {
      this.testQuestion--;
      return;
    }
    if (id === 'test_submit') {
      this.testSubmitted = true;
      this.emitCoachEvent('test_completed', { score: this.calculateTestScore() });
      return;
    }

    // App tabs
    if (id.startsWith('app_')) {
      const appIndex = parseInt(id.replace('app_', ''), 10);
      this.selectedApp = appIndex;
      this.completedApps[appIndex] = true;
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    // No toggles in this game
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'frequency') {
      this.soundFrequency = value;
      this.handleExperiment();
      return;
    }
    if (id === 'amplitude') {
      this.soundAmplitude = value;
      this.handleExperiment();
      return;
    }
  }

  private handleProgressClick(index: number): void {
    const currentIdx = this.phaseOrder.indexOf(this.phase);
    if (index < currentIdx) {
      this.goToPhase(this.phaseOrder[index]);
    }
  }

  private handleHintRequest(): void {
    this.emitCoachEvent('hint_requested', { phase: this.phase });
  }

  private handleExperiment(): void {
    this.experimentCount++;
    if (this.experimentCount >= 3) {
      this.hasExperimented = true;
    }
  }

  // === NAVIGATION ===

  private goToPhase(newPhase: GamePhase): void {
    const now = Date.now();
    if (now - this.lastNavTime < 200 || this.isNavigating) return;

    this.lastNavTime = now;
    this.isNavigating = true;
    this.phase = newPhase;

    if (newPhase === 'play' || newPhase === 'twist_play') {
      this.resetSimulation();
    }

    this.emitCoachEvent('phase_changed', {
      phase: newPhase,
      phaseLabel: this.phaseLabels[newPhase],
    });

    setTimeout(() => {
      this.isNavigating = false;
    }, 400);
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

  // === PHYSICS CALCULATIONS (PROTECTED - server only) ===

  /**
   * PROTECTED: Calculate diaphragm position based on sound wave
   */
  private getDiaphragmPosition(): number {
    return Math.sin(this.soundWavePhase * this.soundFrequency) * this.soundAmplitude * 15;
  }

  /**
   * PROTECTED: Calculate output voltage based on mic type and motion
   * V = -N dΦ/dt (Faraday's Law for dynamic)
   * V = V_bias × ΔC/C (for condenser)
   */
  private getOutputVoltage(): number {
    const position = this.getDiaphragmPosition();
    const sensitivity = this.micType === 'dynamic' ? 0.8 : 1.2;
    return (position / 15) * sensitivity;
  }

  update(deltaTime: number): void {
    if (this.phase === 'play' || this.phase === 'twist_play' || this.phase === 'hook') {
      this.soundWavePhase += deltaTime / 1000 * 10;
      if (this.soundWavePhase > Math.PI * 2) {
        this.soundWavePhase -= Math.PI * 2;
      }
    }
  }

  private resetSimulation(): void {
    this.soundWavePhase = 0;
    this.soundFrequency = 2;
    this.soundAmplitude = 0.5;
    this.micType = 'dynamic';
    this.speakerMode = 'speaker';
  }

  // === TEST SCORING (PROTECTED) ===

  private calculateTestScore(): number {
    let correct = 0;
    for (let i = 0; i < testQuestions.length; i++) {
      if (this.testAnswers[i] === testQuestions[i].correctIndex) {
        correct++;
      }
    }
    return correct;
  }

  // === RENDERING ===

  render(): GameFrame {
    const r = new CommandRenderer(this.viewport.width, this.viewport.height);
    r.reset();
    r.setViewport(700, 500);

    this.renderBackground(r);

    switch (this.phase) {
      case 'hook':
        this.renderHookPhase(r);
        break;
      case 'predict':
        this.renderPredictPhase(r);
        break;
      case 'play':
        this.renderPlayPhase(r);
        break;
      case 'review':
        this.renderReviewPhase(r);
        break;
      case 'twist_predict':
        this.renderTwistPredictPhase(r);
        break;
      case 'twist_play':
        this.renderTwistPlayPhase(r);
        break;
      case 'twist_review':
        this.renderTwistReviewPhase(r);
        break;
      case 'transfer':
        this.renderTransferPhase(r);
        break;
      case 'test':
        this.renderTestPhase(r);
        break;
      case 'mastery':
        this.renderMasteryPhase(r);
        break;
    }

    this.renderUIState(r);

    return r.toFrame(this.nextFrame());
  }

  private renderBackground(r: CommandRenderer): void {
    r.clear(colors.bgDark);
    r.linearGradient('labBg', [
      { offset: '0%', color: '#0a1628' },
      { offset: '50%', color: '#0a0f1a' },
      { offset: '100%', color: '#0a1628' },
    ]);
    r.circle(175, 0, 200, { fill: colors.primary, opacity: 0.03 });
    r.circle(525, 500, 200, { fill: colors.accent, opacity: 0.03 });
  }

  // --- MICROPHONE VISUALIZATION ---

  private renderMicrophoneSimulator(r: CommandRenderer, centerX: number, centerY: number, width: number, height: number): void {
    const diaphragmOffset = this.getDiaphragmPosition();
    const voltage = this.getOutputVoltage();

    // Background
    r.rect(centerX - width / 2, centerY - height / 2, width, height, { fill: colors.bgCard, rx: 12, stroke: colors.border });

    // Sound waves incoming
    for (let i = 0; i < 4; i++) {
      const waveX = centerX - width / 2 + 30 + i * 25;
      const waveY = centerY + Math.sin(this.soundWavePhase + i * 0.5) * 20 * this.soundAmplitude;
      r.path(`M ${waveX - 10} ${centerY} Q ${waveX} ${waveY - 20} ${waveX + 10} ${centerY} Q ${waveX + 20} ${waveY + 20} ${waveX + 30} ${centerY}`, {
        fill: 'none',
        stroke: colors.primary,
        strokeWidth: 2,
        opacity: 0.4 + i * 0.15,
      });
    }
    r.text(centerX - width / 2 + 60, centerY + 50, 'Sound Waves', { fill: colors.primary, fontSize: 10, textAnchor: 'middle' });

    // Microphone housing
    r.rect(centerX - 60, centerY - 50, 100, 100, { fill: colors.bgCardLight, rx: 10 });

    // Diaphragm
    r.ellipse(centerX - 45 + diaphragmOffset, centerY, 8, 30, { fill: '#9CA3AF', stroke: '#6B7280', strokeWidth: 2 });
    r.text(centerX - 45, centerY + 45, 'Diaphragm', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });

    if (this.micType === 'dynamic') {
      // Voice coil
      r.rect(centerX - 30 + diaphragmOffset, centerY - 15, 15, 30, { fill: colors.coilYellow, rx: 3 });
      r.text(centerX - 23, centerY + 25, 'Coil', { fill: colors.coilYellow, fontSize: 8, textAnchor: 'middle' });

      // Magnet
      r.rect(centerX - 5, centerY - 30, 30, 60, { fill: colors.magnetRed, rx: 4 });
      r.text(centerX + 10, centerY + 5, 'N S', { fill: colors.textPrimary, fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(centerX + 10, centerY + 45, 'Magnet', { fill: colors.magnetRed, fontSize: 8, textAnchor: 'middle' });

      // Field lines (dashed)
      r.path(`M ${centerX - 5} ${centerY - 20} C ${centerX - 25} ${centerY - 25} ${centerX - 25} ${centerY + 25} ${centerX - 5} ${centerY + 20}`, {
        fill: 'none',
        stroke: '#FCA5A5',
        strokeWidth: 1,
        strokeDasharray: '3 3',
      });
    } else {
      // Backplate (condenser)
      r.rect(centerX - 25, centerY - 25, 8, 50, { fill: colors.capacitorBlue });
      r.text(centerX - 21, centerY + 45, 'Backplate', { fill: colors.capacitorBlue, fontSize: 8, textAnchor: 'middle' });

      // Capacitor symbol
      r.line(centerX - 35, centerY - 10, centerX - 35, centerY + 10, { stroke: colors.textMuted, strokeWidth: 2 });
      r.line(centerX - 28, centerY - 10, centerX - 28, centerY + 10, { stroke: colors.textMuted, strokeWidth: 2 });

      // Bias voltage label
      r.text(centerX + 10, centerY, '48V bias', { fill: colors.capacitorBlue, fontSize: 9 });
    }

    // Output signal panel
    r.rect(centerX + 60, centerY - 50, 120, 100, { fill: '#1f2937', rx: 8 });
    r.text(centerX + 120, centerY - 30, 'OUTPUT SIGNAL', { fill: colors.textMuted, fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    // Waveform display
    let wavePath = `M ${centerX + 70} ${centerY}`;
    for (let i = 0; i < 20; i++) {
      const x = centerX + 70 + i * 5;
      const y = centerY - Math.sin((this.soundWavePhase + i * 0.5) * this.soundFrequency) * voltage * 25;
      wavePath += ` L ${x} ${y}`;
    }
    r.path(wavePath, { fill: 'none', stroke: colors.signalTeal, strokeWidth: 2 });

    // Voltage readout
    r.text(centerX + 120, centerY + 35, `${(Math.abs(voltage) * 10).toFixed(1)} mV`, {
      fill: colors.signalTeal,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  // --- SPEAKER/MIC DEMO ---

  private renderSpeakerMicDemo(r: CommandRenderer, centerX: number, centerY: number, width: number, height: number): void {
    r.rect(centerX - width / 2, centerY - height / 2, width, height, { fill: colors.bgCard, rx: 12, stroke: colors.border });

    if (this.speakerMode === 'speaker') {
      // Audio input
      r.rect(centerX - width / 2 + 20, centerY - 30, 80, 60, { fill: colors.bgCardLight, rx: 8 });
      r.text(centerX - width / 2 + 60, centerY - 10, 'AUDIO IN', { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });

      // Signal wave in box
      let wavePath = `M ${centerX - width / 2 + 35} ${centerY + 10}`;
      for (let i = 0; i < 10; i++) {
        const x = centerX - width / 2 + 35 + i * 5;
        const y = centerY + 10 - Math.sin(this.soundWavePhase + i * 0.5) * 10;
        wavePath += ` L ${x} ${y}`;
      }
      r.path(wavePath, { fill: 'none', stroke: colors.success, strokeWidth: 2 });

      // Arrow
      r.line(centerX - width / 2 + 100, centerY, centerX - width / 2 + 130, centerY, { stroke: colors.success, strokeWidth: 2 });
      r.polygon([
        { x: centerX - width / 2 + 130, y: centerY },
        { x: centerX - width / 2 + 125, y: centerY - 5 },
        { x: centerX - width / 2 + 125, y: centerY + 5 },
      ], { fill: colors.success });
      r.text(centerX - width / 2 + 115, centerY + 15, 'Electric', { fill: colors.success, fontSize: 9, textAnchor: 'middle' });

      // Speaker cone
      const coneOffset = Math.sin(this.soundWavePhase) * 10;
      r.polygon([
        { x: centerX - 20, y: centerY },
        { x: centerX + 40 + coneOffset, y: centerY - 20 },
        { x: centerX + 40 + coneOffset, y: centerY + 20 },
      ], { fill: '#9CA3AF', stroke: '#6B7280', strokeWidth: 2 });
      r.rect(centerX + 40, centerY - 10, 30, 20, { fill: colors.coilYellow, rx: 3 });
      r.rect(centerX + 70, centerY - 15, 20, 30, { fill: colors.magnetRed, rx: 3 });
      r.text(centerX + 20, centerY + 40, 'Speaker Cone', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

      // Sound waves out
      for (let i = 0; i < 3; i++) {
        r.ellipse(centerX + 120 + i * 20, centerY, 10 + i * 8, 20 + i * 10, {
          fill: 'none',
          stroke: colors.primary,
          strokeWidth: 2,
          opacity: 0.7 - i * 0.2,
        });
      }
      r.text(centerX + 140, centerY + 40, 'Sound Out', { fill: colors.primary, fontSize: 10, textAnchor: 'middle' });

    } else {
      // Sound waves in
      for (let i = 0; i < 3; i++) {
        r.ellipse(centerX - 100 + i * 20, centerY, 10 + i * 8, 20 + i * 10, {
          fill: 'none',
          stroke: colors.primary,
          strokeWidth: 2,
          opacity: 0.3 + i * 0.2,
        });
      }
      r.text(centerX - 100, centerY + 40, 'Sound In', { fill: colors.primary, fontSize: 10, textAnchor: 'middle' });

      // Speaker cone (as mic)
      const coneOffset = Math.sin(this.soundWavePhase) * 5;
      r.polygon([
        { x: centerX - 40 + coneOffset, y: centerY },
        { x: centerX, y: centerY - 20 },
        { x: centerX, y: centerY + 20 },
      ], { fill: '#9CA3AF', stroke: '#6B7280', strokeWidth: 2 });
      r.rect(centerX, centerY - 10, 30, 20, { fill: colors.coilYellow, rx: 3 });
      r.rect(centerX - 20, centerY - 15, 20, 30, { fill: colors.magnetRed, rx: 3 });
      r.text(centerX, centerY + 40, 'Same Speaker!', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

      // Arrow
      r.line(centerX + 50, centerY, centerX + 80, centerY, { stroke: colors.success, strokeWidth: 2 });
      r.polygon([
        { x: centerX + 80, y: centerY },
        { x: centerX + 75, y: centerY - 5 },
        { x: centerX + 75, y: centerY + 5 },
      ], { fill: colors.success });
      r.text(centerX + 65, centerY + 15, 'Electric', { fill: colors.success, fontSize: 9, textAnchor: 'middle' });

      // Audio output
      r.rect(centerX + 100, centerY - 30, 100, 60, { fill: colors.bgCardLight, rx: 8 });
      r.text(centerX + 150, centerY - 10, 'AUDIO OUT', { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });

      // Weaker signal
      let wavePath = `M ${centerX + 115} ${centerY + 5}`;
      for (let i = 0; i < 12; i++) {
        const x = centerX + 115 + i * 5;
        const y = centerY + 5 - Math.sin(this.soundWavePhase + i * 0.5) * 6;
        wavePath += ` L ${x} ${y}`;
      }
      r.path(wavePath, { fill: 'none', stroke: colors.success, strokeWidth: 2 });
      r.text(centerX + 150, centerY + 25, '(weaker signal)', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
    }

    // Mode label
    r.rect(centerX - 50, centerY + 55, 100, 30, {
      fill: this.speakerMode === 'speaker' ? colors.waveBlue : '#8B5CF6',
      rx: 15,
    });
    r.text(centerX, centerY + 75, this.speakerMode === 'speaker' ? 'Speaker Mode' : 'Microphone Mode', {
      fill: colors.textPrimary,
      fontSize: 11,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  // --- PHASE RENDERERS ---

  private renderHookPhase(r: CommandRenderer): void {
    // Premium badge
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.circle(295, 44, 4, { fill: colors.primary });
    r.text(350, 49, 'PHYSICS EXPLORATION', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Main title
    r.text(350, 100, 'How Does Your Voice', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 135, 'Become Electricity?', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 175, 'Sound waves transform into electrical signals', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Card with visualization
    r.rect(130, 200, 440, 200, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 20,
      opacity: 0.8,
    });

    // Transducer chain
    r.text(350, 230, 'The Transduction Chain', { fill: colors.primary, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 265, 'Sound → Motion → Electricity', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Three icons
    const icons = [
      { x: 220, icon: '🎤', label: 'Microphones' },
      { x: 350, icon: '🔊', label: 'Speakers' },
      { x: 480, icon: '🎸', label: 'Pickups' },
    ];
    icons.forEach(item => {
      r.rect(item.x - 40, 300, 80, 70, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
      r.text(item.x, 330, item.icon, { fill: colors.textPrimary, fontSize: 24, textAnchor: 'middle' });
      r.text(item.x, 355, item.label, { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    });

    r.text(350, 430, 'The amazing part: the physics works BOTH WAYS!', {
      fill: colors.accent,
      fontSize: 13,
      textAnchor: 'middle',
    });
  }

  private renderPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 110, 'A dynamic microphone uses a coil attached to a diaphragm,', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 130, 'placed in a magnetic field.', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 160, 'What principle allows it to generate electricity from sound?', {
      fill: colors.primary,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Show feedback if prediction made
    if (this.prediction) {
      const isCorrect = this.prediction === 'induction';
      r.rect(100, 340, 500, 70, {
        fill: isCorrect ? '#065f4620' : '#78350f20',
        stroke: isCorrect ? colors.success : colors.warning,
        rx: 12,
      });
      r.text(350, 365, isCorrect
        ? 'Exactly right! Electromagnetic induction - Faraday\'s law at work!'
        : 'Good thinking! The actual mechanism is electromagnetic induction.',
        {
          fill: isCorrect ? colors.success : colors.warning,
          fontSize: 13,
          fontWeight: 'bold',
          textAnchor: 'middle',
        }
      );
      r.text(350, 390, 'Sound moves diaphragm → coil moves in magnetic field → voltage induced.', {
        fill: colors.textMuted,
        fontSize: 11,
        textAnchor: 'middle',
      });
    }
  }

  private renderPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Microphone Simulator', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 50, 'Watch sound become electricity', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    this.renderMicrophoneSimulator(r, 350, 170, 500, 200);

    // Notice box
    r.rect(100, 290, 500, 60, { fill: '#78350f30', stroke: colors.warning, rx: 12 });
    r.text(350, 310, 'Notice: Louder sounds → bigger diaphragm movement → stronger signal.', {
      fill: colors.warning,
      fontSize: 11,
      textAnchor: 'middle',
    });
    r.text(350, 330, 'Condenser mics are more sensitive but need phantom power (48V).', {
      fill: colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle',
    });

    // Experiment counter
    if (!this.hasExperimented) {
      r.text(350, 380, `Experiment ${Math.max(0, 3 - this.experimentCount)} more times...`, {
        fill: colors.textMuted,
        fontSize: 12,
        textAnchor: 'middle',
      });
    }
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'How Microphones Work', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Transduction chain header
    r.rect(100, 70, 500, 60, { fill: colors.primary, rx: 16 });
    r.text(350, 95, 'Sound → Motion → Electricity', {
      fill: colors.textPrimary,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 115, 'Microphones convert acoustic energy to electrical energy', {
      fill: '#99f6e4',
      fontSize: 11,
      textAnchor: 'middle',
    });

    // Three types
    const types = [
      { title: 'Dynamic Microphones', desc: 'Coil in magnetic field. Rugged, no power needed. Great for live performances.', icon: '🎤' },
      { title: 'Condenser Microphones', desc: 'Diaphragm as capacitor plate. More sensitive, needs phantom power.', icon: '🎙️' },
      { title: 'MEMS Microphones', desc: 'Tiny silicon diaphragms in phones. Miniature condenser with built-in amp.', icon: '📱' },
    ];

    types.forEach((type, i) => {
      const y = 150 + i * 75;
      r.rect(100, y, 500, 65, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
      r.text(130, y + 28, type.icon, { fill: colors.textPrimary, fontSize: 24 });
      r.text(165, y + 25, type.title, { fill: colors.textPrimary, fontSize: 13, fontWeight: 'bold' });
      r.text(165, y + 45, type.desc, { fill: colors.textSecondary, fontSize: 10 });
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Reversibility Puzzle', {
      fill: '#a855f7',
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 100, { fill: '#6b21a830', stroke: '#a855f7', rx: 16 });
    r.text(350, 120, 'A speaker has a coil, magnet, and cone - the same basic parts', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 145, 'as a dynamic microphone.', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 175, 'What happens if you speak INTO a speaker?', {
      fill: '#a855f7',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Feedback
    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'works';
      r.rect(100, 340, 500, 70, {
        fill: isCorrect ? '#065f4620' : '#78350f20',
        stroke: isCorrect ? colors.success : colors.warning,
        rx: 12,
      });
      r.text(350, 365, isCorrect
        ? 'Amazing but true! The physics is completely reversible!'
        : 'Surprising fact: Speakers CAN work as microphones!',
        {
          fill: isCorrect ? colors.success : colors.warning,
          fontSize: 13,
          fontWeight: 'bold',
          textAnchor: 'middle',
        }
      );
      r.text(350, 390, 'Sound moves cone → coil moves in magnetic field → voltage generated!', {
        fill: colors.textMuted,
        fontSize: 11,
        textAnchor: 'middle',
      });
    }
  }

  private renderTwistPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Speaker ↔ Microphone', {
      fill: '#a855f7',
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 50, 'Same device, both directions!', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    this.renderSpeakerMicDemo(r, 350, 180, 500, 200);

    // Fun fact
    r.rect(100, 310, 500, 60, { fill: '#0c4a6e30', stroke: colors.accent, rx: 12 });
    r.text(350, 330, 'Fun fact: Early intercoms used the same speaker for talking AND listening!', {
      fill: colors.accent,
      fontSize: 11,
      textAnchor: 'middle',
    });
    r.text(350, 350, 'The Green Bullet harmonica mic is actually a repurposed speaker element.', {
      fill: colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle',
    });

    if (!this.hasExploredTwist) {
      r.text(350, 390, 'Try both modes...', {
        fill: colors.textMuted,
        fontSize: 12,
        textAnchor: 'middle',
      });
    }
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Transducer Reciprocity', {
      fill: '#a855f7',
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 120, { fill: '#6b21a830', stroke: '#a855f7', rx: 16 });
    r.text(350, 105, 'The Same Physics, Both Directions', {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Two-way arrows
    r.rect(180, 130, 100, 55, { fill: colors.bgCard, rx: 12 });
    r.text(230, 150, '🔊', { fill: colors.textPrimary, fontSize: 24, textAnchor: 'middle' });
    r.text(230, 175, 'Electric → Motion', { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });

    r.text(350, 158, '⟷', { fill: colors.textMuted, fontSize: 24, textAnchor: 'middle' });

    r.rect(420, 130, 100, 55, { fill: colors.bgCard, rx: 12 });
    r.text(470, 150, '🎤', { fill: colors.textPrimary, fontSize: 24, textAnchor: 'middle' });
    r.text(470, 175, 'Motion → Electric', { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });

    // Two principles
    r.rect(100, 220, 245, 100, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(222, 245, 'Electromagnetic Induction', { fill: colors.textPrimary, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(222, 270, 'Current in coil creates motion OR', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(222, 290, 'motion in coil creates current', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });

    r.rect(355, 220, 245, 100, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(477, 245, 'Piezoelectric Effect', { fill: colors.textPrimary, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(477, 270, 'Squeezing crystal makes voltage OR', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(477, 290, 'voltage bends crystal', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
  }

  private renderTransferPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Real-World Applications', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // App tabs
    const tabWidth = 140;
    applications.forEach((app, i) => {
      const isSelected = i === this.selectedApp;
      const isCompleted = this.completedApps[i];
      const x = 80 + i * (tabWidth + 15);

      r.rect(x, 70, tabWidth, 40, {
        fill: isSelected ? colors.primary : colors.bgCard,
        stroke: isCompleted ? colors.success : colors.border,
        rx: 8,
      });
      r.text(x + tabWidth / 2, 95, app.title.split(' ')[0], {
        fill: isSelected ? colors.textPrimary : colors.textSecondary,
        fontSize: 11,
        textAnchor: 'middle',
      });
    });

    // Selected app content
    const app = applications[this.selectedApp];
    r.rect(80, 130, 540, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    r.text(350, 160, app.title, {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 200, app.description, {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    r.rect(100, 230, 500, 60, { fill: colors.bgCardLight, rx: 8 });
    r.text(350, 265, app.details, {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });

    // Progress
    r.text(350, 360, `Progress: ${this.completedApps.filter(c => c).length}/4`, {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    applications.forEach((_, i) => {
      r.circle(310 + i * 25, 385, 6, {
        fill: this.completedApps[i] ? colors.success : colors.bgCardLight,
      });
    });
  }

  private renderTestPhase(r: CommandRenderer): void {
    if (this.testSubmitted) {
      this.renderTestResults(r);
      return;
    }

    const q = testQuestions[this.testQuestion];

    r.text(350, 40, `Question ${this.testQuestion + 1} of ${testQuestions.length}`, {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });

    r.text(350, 80, q.question, {
      fill: colors.textPrimary,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    q.options.forEach((option, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;

      r.rect(100, 110 + i * 55, 500, 45, {
        fill: isSelected ? colors.primary + '40' : colors.bgCard,
        stroke: isSelected ? colors.primary : colors.border,
        rx: 8,
      });
      r.text(350, 138 + i * 55, option, {
        fill: isSelected ? colors.primary : colors.textSecondary,
        fontSize: 11,
        textAnchor: 'middle',
      });
    });
  }

  private renderTestResults(r: CommandRenderer): void {
    const score = this.calculateTestScore();
    const passed = score >= 7;

    r.text(350, 100, passed ? 'Congratulations!' : 'Keep Learning!', {
      fill: passed ? colors.success : colors.warning,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 160, `Score: ${score} / ${testQuestions.length}`, {
      fill: colors.textPrimary,
      fontSize: 24,
      textAnchor: 'middle',
    });

    r.text(350, 200, passed
      ? "Excellent! You understand transducers!"
      : 'Review the concepts and try again.',
      {
        fill: colors.textSecondary,
        fontSize: 16,
        textAnchor: 'middle',
      }
    );
  }

  private renderMasteryPhase(r: CommandRenderer): void {
    r.rect(150, 80, 400, 340, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 24,
    });

    r.text(350, 130, 'Transducer Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, 'You understand how sound becomes electricity!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const takeaways = [
      'Microphones convert sound to electricity (transduction)',
      'Dynamic mics use coils in magnetic fields',
      'Condenser mics use changing capacitance',
      'Transduction is often reversible!',
    ];

    takeaways.forEach((item, i) => {
      r.circle(180, 210 + i * 35, 10, { fill: colors.primary });
      r.text(185, 214 + i * 35, '✓', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
      r.text(205, 215 + i * 35, item, { fill: colors.textSecondary, fontSize: 11 });
    });
  }

  // --- UI STATE ---

  private renderUIState(r: CommandRenderer): void {
    r.setHeader(this.gameTitle, this.phaseLabels[this.phase]);

    r.setProgress({
      id: 'phase_progress',
      current: this.phaseOrder.indexOf(this.phase) + 1,
      total: this.phaseOrder.length,
      labels: this.phaseOrder.map(p => this.phaseLabels[p]),
      color: colors.primary,
    });

    if (this.guidedMode) {
      r.setCoachMessage(this.coachMessages[this.phase]);
    }

    const idx = this.phaseOrder.indexOf(this.phase);

    if (idx > 0) {
      r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });
    }

    switch (this.phase) {
      case 'hook':
        r.addButton({ id: 'next', label: 'Explore Transducers', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_heat', label: 'Sound heats the coil', variant: this.prediction === 'heat' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_induction', label: 'Coil moves in magnetic field', variant: this.prediction === 'induction' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_pressure', label: 'Air pressure creates static', variant: this.prediction === 'pressure' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'See How It Works', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'frequency', label: 'Frequency', value: this.soundFrequency, min: 1, max: 4, step: 0.5 });
        r.addSlider({ id: 'amplitude', label: 'Amplitude', value: this.soundAmplitude, min: 0.2, max: 1, step: 0.1 });
        r.addButton({ id: 'mic_dynamic', label: 'Dynamic (Coil)', variant: this.micType === 'dynamic' ? 'primary' : 'secondary' });
        r.addButton({ id: 'mic_condenser', label: 'Condenser', variant: this.micType === 'condenser' ? 'primary' : 'secondary' });
        if (this.hasExperimented) {
          r.addButton({ id: 'next', label: 'Continue to Review', variant: 'primary' });
        }
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Now for a Twist...', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_nothing', label: 'Nothing - speakers only output', variant: this.twistPrediction === 'nothing' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_damage', label: 'You\'ll damage the speaker', variant: this.twistPrediction === 'damage' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_works', label: 'It works as a microphone!', variant: this.twistPrediction === 'works' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See It In Action', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addButton({ id: 'mode_speaker', label: 'As Speaker', variant: this.speakerMode === 'speaker' ? 'primary' : 'secondary' });
        r.addButton({ id: 'mode_microphone', label: 'As Microphone', variant: this.speakerMode === 'microphone' ? 'primary' : 'secondary' });
        if (this.hasExploredTwist) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'primary' });
        }
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Apply This Knowledge', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Bone Conduction', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Ultrasonic', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Guitar', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'MEMS', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every(c => c)) {
          r.addButton({ id: 'next', label: 'Take the Assessment', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= testQuestions.length - 1 });
          if (this.testAnswers.every(a => a !== null)) {
            r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
          }
        } else {
          const score = this.calculateTestScore();
          if (score >= 7) {
            r.addButton({ id: 'next', label: 'Complete Lesson', variant: 'success' });
          } else {
            r.addButton({ id: 'back', label: 'Review & Try Again', variant: 'secondary' });
          }
        }
        break;

      case 'mastery':
        r.addButton({ id: 'back', label: 'Review Again', variant: 'secondary' });
        break;
    }
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
      soundWavePhase: this.soundWavePhase,
      soundFrequency: this.soundFrequency,
      soundAmplitude: this.soundAmplitude,
      micType: this.micType,
      speakerMode: this.speakerMode,
      experimentCount: this.experimentCount,
      hasExperimented: this.hasExperimented,
      hasExploredTwist: this.hasExploredTwist,
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
    this.soundWavePhase = (state.soundWavePhase as number) || 0;
    this.soundFrequency = (state.soundFrequency as number) || 2;
    this.soundAmplitude = (state.soundAmplitude as number) || 0.5;
    this.micType = (state.micType as 'dynamic' | 'condenser') || 'dynamic';
    this.speakerMode = (state.speakerMode as 'speaker' | 'microphone') || 'speaker';
    this.experimentCount = (state.experimentCount as number) || 0;
    this.hasExperimented = (state.hasExperimented as boolean) || false;
    this.hasExploredTwist = (state.hasExploredTwist as boolean) || false;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===
export function createMakeMicrophoneGame(sessionId: string): MakeMicrophoneGame {
  return new MakeMicrophoneGame(sessionId);
}
