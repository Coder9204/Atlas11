/**
 * Wave Interference Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP - Physics Formulas:
 * - Path difference: delta = |d1 - d2|
 * - Constructive: delta = n * lambda (n = 0, 1, 2, ...)
 * - Destructive: delta = (n + 0.5) * lambda
 * - Amplitude: A = A0 * cos(pi * delta / lambda)
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer, lerp, clamp } from '../../renderer/CommandRenderer.js';

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
    question: 'Constructive interference occurs when path difference equals:',
    options: [
      'Half a wavelength',
      'A whole number of wavelengths',
      'Any random distance',
      'One quarter wavelength',
    ],
    correctIndex: 1,
  },
  {
    question: 'Destructive interference occurs when path difference equals:',
    options: [
      'A whole number of wavelengths',
      'An odd multiple of half wavelengths',
      'Zero',
      'Twice the wavelength',
    ],
    correctIndex: 1,
  },
  {
    question: 'At a point equidistant from two in-phase sources, you get:',
    options: [
      'Destructive interference',
      'Constructive interference (path difference = 0)',
      'No interference',
      'Random fluctuations',
    ],
    correctIndex: 1,
  },
  {
    question: 'What happens when two waves of equal amplitude interfere destructively?',
    options: [
      'Amplitude doubles',
      'Amplitude becomes zero',
      'Frequency changes',
      'Wavelength changes',
    ],
    correctIndex: 1,
  },
  {
    question: 'The interference pattern depends on:',
    options: [
      'Only the amplitude',
      'The path difference relative to wavelength',
      'Only the frequency',
      'The color of the light',
    ],
    correctIndex: 1,
  },
  {
    question: 'What is required for waves to interfere?',
    options: [
      'Different frequencies',
      'Same frequency (coherent sources)',
      'Different amplitudes',
      'Different phases that change randomly',
    ],
    correctIndex: 1,
  },
  {
    question: 'In a double-slit experiment, bright fringes occur where:',
    options: [
      'Waves are out of phase',
      'Waves arrive in phase (constructive interference)',
      'One wave is blocked',
      'Waves have different frequencies',
    ],
    correctIndex: 1,
  },
  {
    question: 'If the wavelength is increased, the interference pattern:',
    options: [
      'Spacing between fringes decreases',
      'Spacing between fringes increases',
      'Pattern disappears',
      'Pattern stays the same',
    ],
    correctIndex: 1,
  },
  {
    question: 'Noise-canceling headphones work by:',
    options: [
      'Blocking all sound',
      'Creating destructive interference with unwanted sound',
      'Amplifying music',
      'Changing sound frequency',
    ],
    correctIndex: 1,
  },
  {
    question: 'The formula for interference amplitude A = A0 * cos(pi * delta / lambda) shows:',
    options: [
      'Linear relationship with path difference',
      'Periodic (oscillating) dependence on path difference',
      'Exponential decay',
      'No dependence on wavelength',
    ],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#3b82f6', // Blue
  primaryDark: '#2563eb',
  accent: '#f59e0b', // Amber
  accentDark: '#d97706',
  constructive: '#22c55e', // Green for constructive
  destructive: '#ef4444', // Red for destructive
  wave1: '#06b6d4', // Cyan
  wave2: '#8b5cf6', // Purple
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
};

// === MAIN GAME CLASS ===

export class WaveInterferenceGame extends BaseGame {
  readonly gameType = 'wave_interference';
  readonly gameTitle = 'Wave Interference';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state (PROTECTED - server only)
  private time = 0;
  private isSimulating = false;

  // Wave sources
  private source1 = { x: 200, y: 175 };
  private source2 = { x: 500, y: 175 };
  private wavelength = 50;
  private frequency = 1;

  // Probe point
  private probeX = 350;
  private probeY = 175;

  // Calculated values (PROTECTED - computed on server)
  private d1 = 0;
  private d2 = 0;
  private pathDifference = 0;
  private pathDiffInWavelengths = 0;
  private interferenceAmplitude = 0;
  private interferenceType: 'constructive' | 'destructive' | 'partial' = 'partial';

  // Animation state
  private animationPhase = 0;
  private showLabels = true;
  private showWavePattern = true;

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
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Challenge',
    twist_play: 'Wavelength Effects',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'When waves meet, they can amplify or cancel each other!',
    predict: 'What happens when two waves arrive at the same point?',
    play: 'Move the probe and discover the interference pattern!',
    review: 'Path difference determines constructive or destructive interference.',
    twist_predict: 'What happens if we change the wavelength?',
    twist_play: 'Explore how wavelength affects the interference pattern!',
    twist_review: 'The pattern depends on path difference IN WAVELENGTHS.',
    transfer: 'Interference is used in noise canceling, WiFi, and more.',
    test: 'Test your understanding of wave interference!',
    mastery: 'You understand how waves interfere!',
  };

  constructor(sessionId: string) {
    super(sessionId);
    this.calculateInterference();
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
      message: 'Wave Interference lesson started',
    });
  }

  // === PROTECTED PHYSICS CALCULATIONS ===

  /**
   * PROTECTED: Calculate interference at probe position
   * Path difference determines constructive or destructive interference
   */
  private calculateInterference(): void {
    // Calculate distances from sources to probe
    this.d1 = Math.sqrt(
      Math.pow(this.probeX - this.source1.x, 2) + Math.pow(this.probeY - this.source1.y, 2)
    );
    this.d2 = Math.sqrt(
      Math.pow(this.probeX - this.source2.x, 2) + Math.pow(this.probeY - this.source2.y, 2)
    );

    // Path difference
    this.pathDifference = Math.abs(this.d1 - this.d2);
    this.pathDiffInWavelengths = this.pathDifference / this.wavelength;

    // Interference amplitude: A = A0 * cos(pi * pathDiff / wavelength)
    // This gives +1 for constructive, -1 for destructive
    this.interferenceAmplitude = Math.cos(Math.PI * this.pathDiffInWavelengths);

    // Determine interference type
    const fractionalPart = this.pathDiffInWavelengths % 1;
    if (fractionalPart < 0.15 || fractionalPart > 0.85) {
      this.interferenceType = 'constructive';
    } else if (Math.abs(fractionalPart - 0.5) < 0.15) {
      this.interferenceType = 'destructive';
    } else {
      this.interferenceType = 'partial';
    }
  }

  /**
   * PROTECTED: Get interference amplitude at any point
   */
  private getAmplitudeAt(x: number, y: number): number {
    const dist1 = Math.sqrt(Math.pow(x - this.source1.x, 2) + Math.pow(y - this.source1.y, 2));
    const dist2 = Math.sqrt(Math.pow(x - this.source2.x, 2) + Math.pow(y - this.source2.y, 2));
    const pathDiff = Math.abs(dist1 - dist2);
    return Math.cos(Math.PI * pathDiff / this.wavelength);
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
      case 'drag':
        this.handleDrag(input.id!, input.x!, input.y!);
        break;
    }
  }

  private handleButtonClick(id: string): void {
    if (id === 'next') {
      this.goNext();
      return;
    }
    if (id === 'back') {
      this.goBack();
      return;
    }

    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }
    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
      this.emitCoachEvent('prediction_made', { twistPrediction: this.twistPrediction });
      return;
    }

    // Test answers
    if (id.startsWith('answer_')) {
      this.testAnswers[this.testQuestion] = parseInt(id.replace('answer_', ''), 10);
      return;
    }

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

    if (id.startsWith('app_')) {
      const appIndex = parseInt(id.replace('app_', ''), 10);
      this.selectedApp = appIndex;
      this.completedApps[appIndex] = true;
      return;
    }

    if (id === 'start') {
      this.isSimulating = true;
      return;
    }
    if (id === 'stop') {
      this.isSimulating = false;
      return;
    }
    if (id === 'reset') {
      this.resetSimulation();
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'labels') {
      this.showLabels = value;
      return;
    }
    if (id === 'wave_pattern') {
      this.showWavePattern = value;
      return;
    }
    if (id === 'guided_mode') {
      this.guidedMode = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'wavelength') {
      this.wavelength = clamp(value, 20, 100);
      this.calculateInterference();
      this.emitCoachEvent('value_changed', { wavelength: this.wavelength });
      return;
    }
    if (id === 'probe_x') {
      this.probeX = clamp(value, 50, 650);
      this.calculateInterference();
      return;
    }
    if (id === 'probe_y') {
      this.probeY = clamp(value, 50, 300);
      this.calculateInterference();
      return;
    }
  }

  private handleDrag(id: string, x: number, y: number): void {
    if (id === 'probe') {
      this.probeX = clamp(x, 50, 650);
      this.probeY = clamp(y, 50, 300);
      this.calculateInterference();
    }
  }

  private handleProgressClick(index: number): void {
    const currentIdx = this.phaseOrder.indexOf(this.phase);
    if (index < currentIdx) {
      this.goToPhase(this.phaseOrder[index]);
    }
  }

  private handleHintRequest(): void {
    const hints: Record<GamePhase, string> = {
      hook: 'Waves from two sources overlap and combine.',
      predict: 'Think about what happens when crests meet crests vs crests meet troughs.',
      play: 'Move the probe to see different interference conditions.',
      review: 'Constructive when path difference = n * wavelength.',
      twist_predict: 'The interference pattern spacing depends on wavelength.',
      twist_play: 'Longer wavelength = wider pattern spacing.',
      twist_review: 'Its the path difference IN WAVELENGTHS that matters.',
      transfer: 'Many technologies exploit wave interference.',
      test: 'Remember the conditions for constructive and destructive interference.',
      mastery: 'You understand wave interference!',
    };
    this.emitCoachEvent('hint_requested', { hint: hints[this.phase] });
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

  // === PHYSICS SIMULATION (PROTECTED) ===

  update(deltaTime: number): void {
    if (!this.isSimulating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play') return;

    this.time += deltaTime / 1000;
    this.animationPhase += deltaTime * 0.01 * this.frequency;
    if (this.animationPhase > 2 * Math.PI) {
      this.animationPhase -= 2 * Math.PI;
    }
  }

  private resetSimulation(): void {
    this.time = 0;
    this.animationPhase = 0;
    this.isSimulating = false;
    this.probeX = 350;
    this.probeY = 175;
    this.calculateInterference();
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

    r.setViewport(700, 350);

    this.renderBackground(r);

    switch (this.phase) {
      case 'hook':
        this.renderHook(r);
        break;
      case 'predict':
        this.renderPredict(r);
        break;
      case 'play':
      case 'twist_play':
        this.renderPlay(r);
        break;
      case 'review':
      case 'twist_review':
        this.renderReview(r);
        break;
      case 'twist_predict':
        this.renderTwistPredict(r);
        break;
      case 'transfer':
        this.renderTransfer(r);
        break;
      case 'test':
        this.renderTest(r);
        break;
      case 'mastery':
        this.renderMastery(r);
        break;
    }

    this.renderUI(r);

    return r.toFrame(this.nextFrame());
  }

  private renderBackground(r: CommandRenderer): void {
    r.clear(colors.bgDark);

    r.linearGradient('bgGrad', [
      { offset: '0%', color: '#0a0f1a' },
      { offset: '50%', color: '#0f172a' },
      { offset: '100%', color: '#0a0f1a' },
    ]);
  }

  private renderHook(r: CommandRenderer): void {
    r.text(350, 60, 'Wave Interference', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 95, 'When waves meet: amplify or cancel?', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    // Wave illustration
    this.renderWaveDemo(r, 350, 200);

    r.text(350, 320, 'What determines constructive vs destructive?', {
      fill: colors.primary,
      fontSize: 14,
      textAnchor: 'middle',
    });
  }

  private renderWaveDemo(r: CommandRenderer, cx: number, cy: number): void {
    // Constructive example
    r.rect(cx - 180, cy - 60, 150, 120, {
      fill: colors.bgCard,
      stroke: colors.constructive,
      rx: 10,
    });
    r.text(cx - 105, cy - 40, 'Constructive', {
      fill: colors.constructive,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    // Two waves in phase
    this.drawWaveSegment(r, cx - 170, cy - 10, 60, 15, 0, colors.wave1);
    this.drawWaveSegment(r, cx - 100, cy - 10, 60, 15, 0, colors.wave2);
    r.text(cx - 105, cy + 10, '=', { fill: colors.textMuted, fontSize: 16, textAnchor: 'middle' });
    this.drawWaveSegment(r, cx - 135, cy + 30, 60, 30, 0, colors.constructive);

    // Destructive example
    r.rect(cx + 30, cy - 60, 150, 120, {
      fill: colors.bgCard,
      stroke: colors.destructive,
      rx: 10,
    });
    r.text(cx + 105, cy - 40, 'Destructive', {
      fill: colors.destructive,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    // Two waves out of phase
    this.drawWaveSegment(r, cx + 40, cy - 10, 60, 15, 0, colors.wave1);
    this.drawWaveSegment(r, cx + 110, cy - 10, 60, 15, Math.PI, colors.wave2);
    r.text(cx + 105, cy + 10, '=', { fill: colors.textMuted, fontSize: 16, textAnchor: 'middle' });
    r.line(cx + 75, cy + 30, cx + 135, cy + 30, { stroke: colors.destructive, strokeWidth: 2 });
  }

  private drawWaveSegment(r: CommandRenderer, x: number, y: number, width: number, amplitude: number, phase: number, color: string): void {
    const points: string[] = [];
    for (let i = 0; i <= width; i += 2) {
      const px = x + i;
      const py = y + Math.sin((i / width) * 2 * Math.PI + phase) * amplitude;
      points.push(`${px},${py}`);
    }
    r.polyline(points.join(' '), { stroke: color, strokeWidth: 2, fill: 'none' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 90, 'Two wave sources emit identical waves.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 115, 'What determines the interference at a point?', {
      fill: colors.accent,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Diagram
    r.rect(150, 150, 400, 130, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });

    // Sources
    r.circle(220, 215, 12, { fill: colors.wave1, stroke: colors.wave1 });
    r.text(220, 250, 'Source 1', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    r.circle(480, 215, 12, { fill: colors.wave2, stroke: colors.wave2 });
    r.text(480, 250, 'Source 2', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Probe point
    r.circle(350, 215, 8, { fill: colors.accent, stroke: colors.accentDark });
    r.text(350, 195, '?', { fill: colors.accent, fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Distance lines
    r.line(220, 215, 350, 215, { stroke: colors.wave1, strokeWidth: 1, strokeDasharray: '4,4' });
    r.line(480, 215, 350, 215, { stroke: colors.wave2, strokeWidth: 1, strokeDasharray: '4,4' });
  }

  private renderPlay(r: CommandRenderer): void {
    const isTwist = this.phase === 'twist_play';

    // Wave pattern visualization
    if (this.showWavePattern) {
      this.renderInterferencePattern(r);
    }

    // Sources
    r.circle(this.source1.x, this.source1.y, 15, {
      fill: colors.wave1,
      stroke: colors.wave1,
    });
    r.text(this.source1.x, this.source1.y + 35, 'S1', {
      fill: colors.wave1,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.circle(this.source2.x, this.source2.y, 15, {
      fill: colors.wave2,
      stroke: colors.wave2,
    });
    r.text(this.source2.x, this.source2.y + 35, 'S2', {
      fill: colors.wave2,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Animated wave fronts
    if (this.isSimulating) {
      this.renderWaveFronts(r, this.source1.x, this.source1.y, colors.wave1);
      this.renderWaveFronts(r, this.source2.x, this.source2.y, colors.wave2);
    }

    // Probe point
    const probeColor = this.interferenceType === 'constructive' ? colors.constructive :
                       this.interferenceType === 'destructive' ? colors.destructive : colors.accent;
    r.circle(this.probeX, this.probeY, 10, {
      fill: probeColor,
      stroke: colors.textPrimary,
      strokeWidth: 2,
    });

    // Distance lines
    if (this.showLabels) {
      r.line(this.source1.x, this.source1.y, this.probeX, this.probeY, {
        stroke: colors.wave1,
        strokeWidth: 1,
        strokeDasharray: '4,4',
      });
      r.line(this.source2.x, this.source2.y, this.probeX, this.probeY, {
        stroke: colors.wave2,
        strokeWidth: 1,
        strokeDasharray: '4,4',
      });
    }

    // Stats panel
    r.rect(20, 20, 200, 130, {
      fill: colors.bgCard + 'dd',
      stroke: colors.border,
      rx: 8,
    });

    r.text(30, 45, `d1: ${this.d1.toFixed(1)} px`, {
      fill: colors.wave1,
      fontSize: 12,
    });
    r.text(30, 65, `d2: ${this.d2.toFixed(1)} px`, {
      fill: colors.wave2,
      fontSize: 12,
    });
    r.text(30, 85, `Path diff: ${this.pathDifference.toFixed(1)} px`, {
      fill: colors.textSecondary,
      fontSize: 12,
    });
    r.text(30, 105, `In wavelengths: ${this.pathDiffInWavelengths.toFixed(2)} lambda`, {
      fill: colors.accent,
      fontSize: 12,
    });
    r.text(30, 130, `Type: ${this.interferenceType.toUpperCase()}`, {
      fill: probeColor,
      fontSize: 14,
      fontWeight: 'bold',
    });

    // Wavelength display
    r.text(600, 30, `lambda = ${this.wavelength}`, {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderInterferencePattern(r: CommandRenderer): void {
    // Draw a grid of interference values
    const step = 15;
    for (let x = 50; x < 650; x += step) {
      for (let y = 50; y < 300; y += step) {
        const amp = this.getAmplitudeAt(x, y);
        const intensity = (amp + 1) / 2; // 0 to 1
        const color = intensity > 0.5 ?
          `rgba(34, 197, 94, ${(intensity - 0.5) * 0.4})` :
          `rgba(239, 68, 68, ${(0.5 - intensity) * 0.4})`;
        r.rect(x - step / 2, y - step / 2, step, step, {
          fill: color,
        });
      }
    }
  }

  private renderWaveFronts(r: CommandRenderer, sx: number, sy: number, color: string): void {
    const maxRadius = 200;
    const numWaves = 5;
    for (let i = 0; i < numWaves; i++) {
      const baseRadius = ((this.animationPhase / (2 * Math.PI) + i / numWaves) % 1) * maxRadius;
      if (baseRadius > 0) {
        const opacity = 1 - baseRadius / maxRadius;
        r.circle(sx, sy, baseRadius, {
          fill: 'transparent',
          stroke: color,
          strokeWidth: 2,
          opacity: opacity * 0.5,
        });
      }
    }
  }

  private renderReview(r: CommandRenderer): void {
    const isMainReview = this.phase === 'review';

    r.text(350, 50, isMainReview ? 'Path Difference & Interference' : 'Wavelength Matters', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (isMainReview) {
      const concepts = [
        { title: 'Constructive: delta = n * lambda', desc: 'Waves arrive in phase, amplitudes add', color: colors.constructive },
        { title: 'Destructive: delta = (n+0.5) * lambda', desc: 'Waves arrive out of phase, cancel out', color: colors.destructive },
        { title: 'Amplitude: A = A0 * cos(pi*delta/lambda)', desc: 'Smooth variation between conditions', color: colors.primary },
      ];

      concepts.forEach((c, i) => {
        r.rect(100, 90 + i * 75, 500, 60, {
          fill: colors.bgCard,
          stroke: c.color,
          rx: 12,
        });
        r.text(120, 115 + i * 75, c.title, {
          fill: c.color,
          fontSize: 14,
          fontWeight: 'bold',
        });
        r.text(120, 135 + i * 75, c.desc, {
          fill: colors.textSecondary,
          fontSize: 12,
        });
      });
    } else {
      const insights = [
        { title: 'Relative Path Difference', desc: 'It is delta/lambda that matters, not delta alone', color: colors.primary },
        { title: 'Pattern Scaling', desc: 'Longer wavelength = wider spacing in the pattern', color: colors.accent },
      ];

      insights.forEach((c, i) => {
        r.rect(100, 100 + i * 90, 500, 70, {
          fill: colors.bgCard,
          stroke: c.color,
          rx: 12,
        });
        r.text(120, 130 + i * 90, c.title, {
          fill: c.color,
          fontSize: 16,
          fontWeight: 'bold',
        });
        r.text(120, 155 + i * 90, c.desc, {
          fill: colors.textSecondary,
          fontSize: 13,
        });
      });
    }
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 50, 'Wavelength Challenge', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 90, 'If we double the wavelength, how does the pattern change?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.rect(200, 130, 300, 100, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });

    r.text(350, 165, 'Original wavelength -> New pattern?', {
      fill: colors.accent,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 200, 'Hint: Think about delta/lambda', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTransfer(r: CommandRenderer): void {
    const apps = [
      { name: 'Noise Canceling', desc: 'Headphones create destructive interference' },
      { name: 'WiFi Dead Spots', desc: 'Multipath interference creates weak zones' },
      { name: 'Thin Films', desc: 'Oil rainbows from light wave interference' },
      { name: 'Telescopes', desc: 'Interferometry for ultra-high resolution' },
    ];

    r.text(350, 40, 'Real-World Applications', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    apps.forEach((app, i) => {
      const isSelected = i === this.selectedApp;
      const isCompleted = this.completedApps[i];

      r.rect(40 + i * 165, 75, 155, 40, {
        fill: isSelected ? colors.primary : colors.bgCard,
        stroke: isCompleted ? colors.success : colors.border,
        rx: 8,
      });
      r.text(118 + i * 165, 100, app.name, {
        fill: isSelected ? colors.textPrimary : colors.textSecondary,
        fontSize: 10,
        textAnchor: 'middle',
      });
    });

    const selected = apps[this.selectedApp];
    r.rect(50, 135, 600, 160, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });

    r.text(350, 180, selected.name, {
      fill: colors.primary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 220, selected.desc, {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    const completed = this.completedApps.filter((c) => c).length;
    r.text(350, 320, `Progress: ${completed}/4 applications explored`, {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTest(r: CommandRenderer): void {
    if (this.testSubmitted) {
      const score = this.calculateTestScore();
      const passed = score >= 7;

      r.text(350, 100, passed ? 'Excellent!' : 'Keep Learning!', {
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

      r.text(350, 200, passed ? 'You understand wave interference!' : 'Review constructive and destructive conditions.', {
        fill: colors.textSecondary,
        fontSize: 14,
        textAnchor: 'middle',
      });
      return;
    }

    const q = testQuestions[this.testQuestion];

    r.text(350, 35, `Question ${this.testQuestion + 1} of ${testQuestions.length}`, {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });

    r.text(350, 70, q.question, {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    q.options.forEach((option, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;

      r.rect(80, 100 + i * 55, 540, 45, {
        fill: isSelected ? colors.primary + '40' : colors.bgCard,
        stroke: isSelected ? colors.primary : colors.border,
        rx: 8,
      });
      r.text(350, 128 + i * 55, option, {
        fill: isSelected ? colors.primary : colors.textSecondary,
        fontSize: 13,
        textAnchor: 'middle',
      });
    });
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(350, 80, '(trophy)', { fontSize: 50, textAnchor: 'middle', fill: colors.warning });

    r.text(350, 150, 'Wave Interference Master!', {
      fill: colors.primary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 190, 'You understand how waves interfere!', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: '(+)', label: 'Constructive' },
      { icon: '(-)', label: 'Destructive' },
      { icon: '(lambda)', label: 'Wavelength' },
      { icon: '(app)', label: 'Applications' },
    ];

    badges.forEach((badge, i) => {
      r.rect(90 + i * 135, 230, 120, 70, {
        fill: colors.bgCard,
        stroke: colors.success,
        rx: 10,
      });
      r.text(150 + i * 135, 255, badge.icon, {
        fontSize: 20,
        textAnchor: 'middle',
        fill: colors.success,
      });
      r.text(150 + i * 135, 285, badge.label, {
        fill: colors.textSecondary,
        fontSize: 10,
        textAnchor: 'middle',
      });
    });
  }

  private renderUI(r: CommandRenderer): void {
    r.setHeader(this.gameTitle, this.phaseLabels[this.phase]);

    r.setProgress({
      id: 'phase_progress',
      current: this.phaseOrder.indexOf(this.phase) + 1,
      total: this.phaseOrder.length,
      labels: this.phaseOrder.map((p) => this.phaseLabels[p]),
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
      case 'predict':
        r.addButton({
          id: 'predict_path',
          label: 'Path difference',
          variant: this.prediction === 'path' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_amplitude',
          label: 'Wave amplitude',
          variant: this.prediction === 'amplitude' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_frequency',
          label: 'Wave frequency',
          variant: this.prediction === 'frequency' ? 'primary' : 'secondary',
        });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'See Result', variant: 'success' });
        }
        break;

      case 'play':
      case 'twist_play':
        r.addSlider({
          id: 'probe_x',
          label: 'Probe X',
          value: this.probeX,
          min: 50,
          max: 650,
        });
        r.addSlider({
          id: 'probe_y',
          label: 'Probe Y',
          value: this.probeY,
          min: 50,
          max: 300,
        });
        if (this.phase === 'twist_play') {
          r.addSlider({
            id: 'wavelength',
            label: 'Wavelength',
            value: this.wavelength,
            min: 20,
            max: 100,
          });
        }
        r.addButton({
          id: this.isSimulating ? 'stop' : 'start',
          label: this.isSimulating ? 'Stop' : 'Animate',
          variant: 'primary',
        });
        r.addToggle({ id: 'labels', label: 'Labels', value: this.showLabels });
        r.addToggle({ id: 'wave_pattern', label: 'Pattern', value: this.showWavePattern });
        if (this.time > 2) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'twist_predict':
        r.addButton({
          id: 'twist_wider',
          label: 'Pattern wider',
          variant: this.twistPrediction === 'wider' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_narrower',
          label: 'Pattern narrower',
          variant: this.twistPrediction === 'narrower' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_same',
          label: 'No change',
          variant: this.twistPrediction === 'same' ? 'primary' : 'secondary',
        });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Audio', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'WiFi', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Films', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Telescopes', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every((c) => c)) {
          r.addButton({ id: 'next', label: 'Take Test', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({
            id: 'test_prev',
            label: 'Prev',
            variant: 'ghost',
            disabled: this.testQuestion === 0,
          });
          r.addButton({
            id: 'test_next',
            label: 'Next',
            variant: 'ghost',
            disabled: this.testQuestion >= testQuestions.length - 1,
          });
          for (let i = 0; i < 4; i++) {
            r.addButton({
              id: `answer_${i}`,
              label: String.fromCharCode(65 + i),
              variant: this.testAnswers[this.testQuestion] === i ? 'primary' : 'secondary',
            });
          }
          if (this.testAnswers.every((a) => a !== null)) {
            r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
          }
        } else {
          const score = this.calculateTestScore();
          r.addButton({
            id: score >= 7 ? 'next' : 'back',
            label: score >= 7 ? 'Complete!' : 'Review',
            variant: score >= 7 ? 'success' : 'secondary',
          });
        }
        break;

      case 'mastery':
        r.addButton({ id: 'back', label: 'Explore Again', variant: 'secondary' });
        break;

      default:
        r.addButton({ id: 'next', label: 'Continue', variant: 'primary' });
    }
  }

  // === STATE MANAGEMENT ===

  getCurrentPhase(): string {
    return this.phase;
  }

  getState(): Record<string, any> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      source1: this.source1,
      source2: this.source2,
      wavelength: this.wavelength,
      probeX: this.probeX,
      probeY: this.probeY,
      time: this.time,
      isSimulating: this.isSimulating,
      showLabels: this.showLabels,
      showWavePattern: this.showWavePattern,
      testQuestion: this.testQuestion,
      testAnswers: this.testAnswers,
      testSubmitted: this.testSubmitted,
      selectedApp: this.selectedApp,
      completedApps: this.completedApps,
      guidedMode: this.guidedMode,
    };
  }

  restoreState(state: Record<string, any>): void {
    this.phase = state.phase || 'hook';
    this.prediction = state.prediction || null;
    this.twistPrediction = state.twistPrediction || null;
    this.source1 = state.source1 || { x: 200, y: 175 };
    this.source2 = state.source2 || { x: 500, y: 175 };
    this.wavelength = state.wavelength || 50;
    this.probeX = state.probeX || 350;
    this.probeY = state.probeY || 175;
    this.time = state.time || 0;
    this.isSimulating = state.isSimulating || false;
    this.showLabels = state.showLabels ?? true;
    this.showWavePattern = state.showWavePattern ?? true;
    this.testQuestion = state.testQuestion || 0;
    this.testAnswers = state.testAnswers || Array(10).fill(null);
    this.testSubmitted = state.testSubmitted || false;
    this.selectedApp = state.selectedApp || 0;
    this.completedApps = state.completedApps || [false, false, false, false];
    this.guidedMode = state.guidedMode ?? true;
    this.calculateInterference();
  }
}

// === FACTORY FUNCTION ===
export function createWaveInterferenceGame(sessionId: string): WaveInterferenceGame {
  return new WaveInterferenceGame(sessionId);
}
