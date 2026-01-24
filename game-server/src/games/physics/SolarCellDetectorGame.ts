/**
 * Solar Cell Detector Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Photovoltaic effect: photons generate electron-hole pairs
 * - Photocurrent proportional to light intensity
 * - Cosine law: I = I0 * cos(theta) for tilted panels
 * - Wavelength efficiency: visible > IR > UV
 * - Fill factor and maximum power point
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
    question: 'What is the photovoltaic effect?',
    options: [
      'Light heating up a surface',
      'Light generating an electric current in a material',
      'Light reflecting off a surface',
      'Light being absorbed by plants',
    ],
    correctIndex: 1,
  },
  {
    question: 'How does photocurrent relate to light intensity?',
    options: ['Inversely proportional', 'Directly proportional', 'Logarithmic relationship', 'No relationship'],
    correctIndex: 1,
  },
  {
    question: 'What happens to power output when a solar cell is tilted away from the sun?',
    options: ['It increases', 'It decreases following cos(theta)', 'It stays the same', 'It becomes negative'],
    correctIndex: 1,
  },
  {
    question: 'Which wavelength range is most efficiently converted by silicon solar cells?',
    options: ['Ultraviolet (UV)', 'Visible light', 'Infrared (IR)', 'X-rays'],
    correctIndex: 1,
  },
  {
    question: 'Why do solar tracking systems increase energy collection?',
    options: [
      'They cool the panels',
      'They keep panels perpendicular to sunlight',
      'They increase panel size',
      'They filter out harmful rays',
    ],
    correctIndex: 1,
  },
  {
    question: 'The bandgap of a semiconductor determines:',
    options: [
      'The physical size of the cell',
      'Which photon energies can generate electricity',
      'The color of the cell',
      'The weight of the cell',
    ],
    correctIndex: 1,
  },
  {
    question: 'A photodiode in a barcode scanner uses:',
    options: [
      'The photovoltaic effect to detect reflected light',
      'Sound waves to read codes',
      'Magnetic fields to decode',
      'Temperature changes to read',
    ],
    correctIndex: 0,
  },
  {
    question: 'What limits the efficiency of single-junction solar cells?',
    options: [
      'They can only use photons above the bandgap energy',
      'They are too small',
      'They only work in summer',
      'They require batteries',
    ],
    correctIndex: 0,
  },
  {
    question: 'In a pulse oximeter, what do the photodetectors measure?',
    options: [
      'Blood temperature',
      'Light absorption by oxygenated vs deoxygenated blood',
      'Blood pressure',
      'Heart muscle contractions',
    ],
    correctIndex: 1,
  },
  {
    question: 'Why does shading a small part of a solar panel drastically reduce output?',
    options: [
      'The shaded cells become resistors',
      'The panel becomes heavier',
      'The color changes',
      'The wiring melts',
    ],
    correctIndex: 0,
  },
];

// === PHYSICS CONSTANTS (PROTECTED) ===
const WAVELENGTH_EFFICIENCY: Record<string, number> = {
  visible: 0.85,
  infrared: 0.5,
  uv: 0.3,
};

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#eab308',
  primaryDark: '#ca8a04',
  accent: '#3b82f6',
  accentDark: '#2563eb',
  warning: '#ef4444',
  success: '#10b981',
  danger: '#ef4444',
  bgDark: '#0a0f1a',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  solar: '#fbbf24',
  solarGlow: 'rgba(251, 191, 36, 0.3)',
  cell: '#1e3a5f',
  current: '#22c55e',
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
    title: 'Screen Brightness',
    icon: 'screen',
    description: 'Smartphones use ambient light sensors (tiny solar cells) to automatically adjust screen brightness.',
    details: 'The photodetector measures incoming light and signals the processor. Your phone dims in dark rooms and brightens in sunlight!',
  },
  {
    title: 'Barcode Scanners',
    icon: 'barcode',
    description: 'Laser light reflects off black and white bars; photodetectors convert the pattern to digital data.',
    details: 'The scanner measures reflected light intensity. Black bars absorb light (low signal), white spaces reflect (high signal).',
  },
  {
    title: 'Solar Tracking',
    icon: 'tracking',
    description: 'Large solar installations use photodetector pairs to track the sun and maximize energy collection.',
    details: 'When sensors detect unequal light, motors tilt the panels. This can increase energy collection by 25-40% compared to fixed panels.',
  },
  {
    title: 'Pulse Oximeters',
    icon: 'medical',
    description: 'Those finger clips use LEDs and photodetectors to measure blood oxygen by detecting light absorption.',
    details: 'Oxygenated blood absorbs more infrared; deoxygenated absorbs more red light. The ratio reveals oxygen saturation!',
  },
];

// === MAIN GAME CLASS ===

export class SolarCellDetectorGame extends BaseGame {
  readonly gameType = 'solar_cell_detector';
  readonly gameTitle = 'Solar Cell Detector';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private lightIntensity = 1000; // W/m^2
  private panelTilt = 0; // degrees from perpendicular
  private wavelength: 'visible' | 'infrared' | 'uv' = 'visible';
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
    hook: 'How does light become electricity? The photovoltaic effect is everywhere!',
    predict: 'Think about what happens when light intensity changes...',
    play: 'Adjust light intensity and panel angle. Watch the current change!',
    review: 'Photocurrent is proportional to light intensity. Tilt follows the cosine law.',
    twist_predict: 'Different colors of light have different energies. How might this affect solar cells?',
    twist_play: 'Compare visible, infrared, and UV light. Which generates the most current?',
    twist_review: 'Solar cells have a bandgap - only photons with enough energy can generate electricity.',
    transfer: 'From phone screens to medical devices, photodetectors are everywhere!',
    test: 'Test your understanding of the photovoltaic effect!',
    mastery: 'You now understand how light detection and solar cells work!',
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
      message: 'Solar Cell Detector lesson started',
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

    if (id.startsWith('wavelength_')) {
      this.wavelength = id.replace('wavelength_', '') as typeof this.wavelength;
      return;
    }

    if (id === 'reset') {
      this.resetSimulation();
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'animation') {
      this.isAnimating = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'intensity') {
      this.lightIntensity = value;
      return;
    }
    if (id === 'tilt') {
      this.panelTilt = value;
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

  // === PHYSICS CALCULATIONS (PROTECTED - runs on server only) ===

  /**
   * PROTECTED: Effective intensity calculation with cosine law
   * I_eff = I0 * cos(theta)
   */
  private calculateEffectiveIntensity(): number {
    const tiltRad = (this.panelTilt * Math.PI) / 180;
    return this.lightIntensity * Math.cos(tiltRad);
  }

  /**
   * PROTECTED: Photocurrent calculation
   * Current proportional to effective intensity and wavelength efficiency
   */
  private calculatePhotocurrent(): number {
    const effectiveIntensity = this.calculateEffectiveIntensity();
    const efficiency = WAVELENGTH_EFFICIENCY[this.wavelength];
    // Base conversion: 0.5 mA per 100 W/m^2 at peak efficiency
    return (effectiveIntensity / 100) * 0.5 * efficiency;
  }

  /**
   * PROTECTED: Power output calculation
   * P = V * I (simplified model)
   */
  private calculatePower(): number {
    const current = this.calculatePhotocurrent();
    const voltage = 0.6; // Typical silicon cell voltage
    return current * voltage;
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;
    this.time += deltaTime / 1000;
  }

  private resetSimulation(): void {
    this.lightIntensity = 1000;
    this.panelTilt = 0;
    this.wavelength = 'visible';
    this.time = 0;
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
    r.circle(175, 0, 200, { fill: colors.solar, opacity: 0.05 });
    r.circle(525, 500, 200, { fill: colors.accent, opacity: 0.03 });
  }

  private renderSolarPanel(r: CommandRenderer, centerX: number, centerY: number, size: number = 200): void {
    const current = this.calculatePhotocurrent();
    const maxCurrent = 5; // mA for visualization scaling

    // Sun rays
    const rayIntensity = this.lightIntensity / 1000;
    for (let i = 0; i < 5; i++) {
      const startX = centerX - 80 + i * 40;
      const startY = centerY - 100;
      const tiltRad = (this.panelTilt * Math.PI) / 180;
      r.line(startX, startY, startX + Math.sin(tiltRad) * 60, centerY - 20, {
        stroke: colors.solar,
        strokeWidth: 3 * rayIntensity,
        opacity: 0.6 * rayIntensity,
      });
    }

    // Solar panel (tilted)
    r.group(`translate(${centerX}, ${centerY}) rotate(${this.panelTilt})`, (g) => {
      // Panel frame
      g.rect(-80, -30, 160, 60, { fill: colors.cell, stroke: colors.border, strokeWidth: 2, rx: 4 });

      // Grid lines
      for (let i = 1; i < 4; i++) {
        g.line(-80 + i * 40, -30, -80 + i * 40, 30, { stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 });
      }
      for (let j = 1; j < 3; j++) {
        g.line(-80, -30 + j * 20, 80, -30 + j * 20, { stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 });
      }

      // Active glow based on current
      const glowOpacity = Math.min(current / maxCurrent, 1) * 0.5;
      g.rect(-80, -30, 160, 60, { fill: colors.solarGlow, opacity: glowOpacity, rx: 4 });
    });

    // Current meter
    const meterX = centerX + 120;
    const meterY = centerY;

    r.rect(meterX - 30, meterY - 50, 60, 100, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
    r.text(meterX, meterY - 35, 'Current', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Meter bar
    const barHeight = 60;
    const fillHeight = Math.min(current / maxCurrent, 1) * barHeight;
    r.rect(meterX - 15, meterY - 20, 30, barHeight, { fill: colors.bgCardLight, rx: 4 });
    r.rect(meterX - 15, meterY - 20 + (barHeight - fillHeight), 30, fillHeight, { fill: colors.current, rx: 4 });

    r.text(meterX, meterY + 50, `${current.toFixed(2)} mA`, {
      fill: colors.current,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderHookPhase(r: CommandRenderer): void {
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.circle(295, 44, 4, { fill: colors.primary });
    r.text(350, 49, 'PHOTOVOLTAIC EFFECT', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, 'Light to Electricity', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'How do solar cells convert sunlight into electric current?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.rect(160, 160, 380, 260, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 20,
      opacity: 0.8,
    });

    this.renderSolarPanel(r, 320, 290, 180);

    r.text(350, 420, 'Photons knock electrons free, creating electric current!', {
      fill: colors.primary,
      fontSize: 13,
      fontWeight: 'bold',
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
    r.text(350, 115, 'You double the light intensity hitting a solar cell.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'What happens to the photocurrent?', {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (this.prediction) {
      const isCorrect = this.prediction === 'B';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 375, isCorrect
        ? 'Correct! Photocurrent is directly proportional to light intensity!'
        : 'Not quite. More photons = more electrons freed = more current.',
        {
          fill: isCorrect ? colors.success : colors.danger,
          fontSize: 13,
          fontWeight: 'bold',
          textAnchor: 'middle',
        }
      );
    }
  }

  private renderPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Solar Cell Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Main visualization
    r.rect(80, 50, 380, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderSolarPanel(r, 250, 190, 220);

    // Stats panel
    r.rect(480, 50, 170, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    const effectiveIntensity = this.calculateEffectiveIntensity();
    const current = this.calculatePhotocurrent();
    const power = this.calculatePower();

    r.text(565, 80, 'Measurements', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });

    r.text(500, 110, 'Intensity:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 110, `${this.lightIntensity} W/m²`, { fill: colors.solar, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });

    r.text(500, 135, 'Effective:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 135, `${effectiveIntensity.toFixed(0)} W/m²`, { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });

    r.text(500, 160, 'Tilt:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 160, `${this.panelTilt} deg`, { fill: colors.textSecondary, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });

    r.text(500, 185, 'Current:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 185, `${current.toFixed(2)} mA`, { fill: colors.current, fontSize: 16, fontWeight: 'bold', textAnchor: 'end' });

    r.text(500, 215, 'Power:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 215, `${(power * 1000).toFixed(1)} uW`, { fill: colors.success, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });

    // Formula box
    r.rect(80, 350, 570, 60, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(365, 375, 'I_photocurrent is proportional to Light Intensity', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(365, 395, 'Cosine law: I_eff = I_0 * cos(tilt angle)', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding the Photovoltaic Effect', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 290, 160, { fill: '#ca8a0440', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'How It Works', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const howInfo = [
      'Photons hit semiconductor material',
      'Electrons absorb photon energy',
      'Electrons freed from atoms',
      'Electric field separates charges = current!',
    ];
    howInfo.forEach((line, i) => {
      r.text(70, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 160, { fill: '#1e40af40', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Cosine Law', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const cosineInfo = [
      'Tilted panels receive less light',
      'Effective intensity = I * cos(theta)',
      'At 60 deg tilt, only 50% intensity!',
      'Solar trackers maximize collection',
    ];
    cosineInfo.forEach((line, i) => {
      r.text(380, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(50, 250, 600, 80, { fill: '#06533940', stroke: colors.success, rx: 16 });
    r.text(350, 275, 'Key Insight', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 300, 'More light = more current. Tilt away from sun = less effective light = less current!', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist Challenge', {
      fill: colors.accent,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 120, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'You can change the COLOR of light hitting the solar cell.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 150, 'Same intensity, different wavelength.', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 180, 'Which wavelength generates the most current?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'B';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 375, isCorrect
        ? 'Correct! Silicon cells are optimized for visible light wavelengths!'
        : 'Not quite. Each cell material has optimal wavelengths based on its bandgap.',
        {
          fill: isCorrect ? colors.success : colors.danger,
          fontSize: 13,
          fontWeight: 'bold',
          textAnchor: 'middle',
        }
      );
    }
  }

  private renderTwistPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Wavelength Effects', {
      fill: colors.accent,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 380, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderSolarPanel(r, 250, 190, 220);

    // Wavelength indicator
    const wavelengthColors: Record<string, string> = {
      visible: '#fbbf24',
      infrared: '#ef4444',
      uv: '#8b5cf6',
    };
    r.text(250, 80, `Light: ${this.wavelength.toUpperCase()}`, {
      fill: wavelengthColors[this.wavelength],
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Stats panel
    const current = this.calculatePhotocurrent();
    const efficiency = WAVELENGTH_EFFICIENCY[this.wavelength];

    r.rect(480, 50, 170, 180, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    r.text(565, 80, 'Wavelength Analysis', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });

    r.text(500, 110, 'Wavelength:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 110, this.wavelength, { fill: wavelengthColors[this.wavelength], fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });

    r.text(500, 140, 'Efficiency:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 140, `${(efficiency * 100).toFixed(0)}%`, { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });

    r.text(500, 170, 'Current:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 170, `${current.toFixed(2)} mA`, { fill: colors.current, fontSize: 16, fontWeight: 'bold', textAnchor: 'end' });

    // Comparison table
    r.rect(480, 250, 170, 100, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(565, 275, 'Efficiency Comparison', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(500, 300, 'Visible:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(620, 300, '85%', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'end' });
    r.text(500, 320, 'Infrared:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(620, 320, '50%', { fill: '#ef4444', fontSize: 12, fontWeight: 'bold', textAnchor: 'end' });
    r.text(500, 340, 'UV:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(620, 340, '30%', { fill: '#8b5cf6', fontSize: 12, fontWeight: 'bold', textAnchor: 'end' });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', {
      fill: colors.accent,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 250, { fill: '#78350f30', stroke: colors.accent, rx: 16 });
    r.text(350, 110, 'Bandgap & Wavelength Efficiency', {
      fill: colors.accent,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const bandgapInfo = [
      { label: 'Bandgap:', value: 'Minimum photon energy needed' },
      { label: 'Too low energy:', value: 'Passes through (IR)' },
      { label: 'Too high energy:', value: 'Excess wasted as heat (UV)' },
      { label: 'Just right:', value: 'Visible light is optimal for Si' },
      { label: 'Multi-junction:', value: 'Stacked cells capture more spectrum' },
    ];

    bandgapInfo.forEach((item, i) => {
      r.text(180, 145 + i * 30, item.label, { fill: colors.textSecondary, fontSize: 13, fontWeight: 'bold' });
      r.text(350, 145 + i * 30, item.value, { fill: colors.textPrimary, fontSize: 13 });
    });

    r.text(350, 310, 'Solar cells are tuned for specific wavelengths!', {
      fill: colors.success,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderTransferPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Real-World Applications', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

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
        fill: isSelected ? colors.bgDark : colors.textSecondary,
        fontSize: 12,
        textAnchor: 'middle',
      });
    });

    const app = applications[this.selectedApp];
    r.rect(80, 130, 540, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    r.text(350, 165, app.title, {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 200, app.description, {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });

    r.text(350, 260, app.details, {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });

    r.text(350, 360, `Progress: ${this.completedApps.filter((c) => c).length}/4`, {
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
      fontSize: 16,
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
        fontSize: 13,
        textAnchor: 'middle',
      });
    });
  }

  private renderTestResults(r: CommandRenderer): void {
    const score = this.calculateTestScore();
    const passed = score >= 7;

    r.text(350, 100, passed ? 'Excellent Work!' : 'Keep Learning!', {
      fill: passed ? colors.success : colors.accent,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 160, `Score: ${score} / ${testQuestions.length}`, {
      fill: colors.textPrimary,
      fontSize: 24,
      textAnchor: 'middle',
    });

    r.text(350, 200, passed ? "You've mastered the photovoltaic effect!" : 'Review the material and try again.', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });
  }

  private renderMasteryPhase(r: CommandRenderer): void {
    r.rect(150, 80, 400, 340, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 24,
    });

    r.text(350, 130, 'Photovoltaics Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, "You've mastered solar cells and light detection!", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'PV', label: 'Photovoltaic Effect' },
      { icon: 'cos', label: 'Cosine Law' },
      { icon: 'lambda', label: 'Wavelength Response' },
      { icon: 'app', label: 'Real Detectors' },
    ];

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
      case 'hook':
        r.addButton({ id: 'next', label: 'Explore Photovoltaics', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. It halves', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. It doubles', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. It stays the same', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. It quadruples', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Test It', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'intensity', label: 'Light Intensity', value: this.lightIntensity, min: 100, max: 1500, step: 100 });
        r.addSlider({ id: 'tilt', label: 'Panel Tilt', value: this.panelTilt, min: 0, max: 80 });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Discover a Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Infrared (heat)', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Visible light', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Ultraviolet', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Compare Wavelengths', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addButton({ id: 'wavelength_visible', label: 'Visible', variant: this.wavelength === 'visible' ? 'primary' : 'secondary' });
        r.addButton({ id: 'wavelength_infrared', label: 'Infrared', variant: this.wavelength === 'infrared' ? 'primary' : 'secondary' });
        r.addButton({ id: 'wavelength_uv', label: 'UV', variant: this.wavelength === 'uv' ? 'primary' : 'secondary' });
        r.addButton({ id: 'next', label: 'Review Discovery', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real-World Applications', variant: 'primary' });
        break;

      case 'transfer':
        applications.forEach((_, i) => {
          r.addButton({ id: `app_${i}`, label: applications[i].title.split(' ')[0], variant: this.selectedApp === i ? 'primary' : 'ghost' });
        });
        if (this.completedApps.every((c) => c)) {
          r.addButton({ id: 'next', label: 'Take Knowledge Test', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= testQuestions.length - 1 });
          testQuestions[this.testQuestion].options.forEach((_, i) => {
            r.addButton({ id: `answer_${i}`, label: String.fromCharCode(65 + i), variant: this.testAnswers[this.testQuestion] === i ? 'primary' : 'secondary' });
          });
          if (this.testAnswers.every((a) => a !== null)) {
            r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
          }
        } else {
          const score = this.calculateTestScore();
          if (score >= 7) {
            r.addButton({ id: 'next', label: 'Claim Your Badge', variant: 'success' });
          } else {
            r.addButton({ id: 'back', label: 'Review & Try Again', variant: 'secondary' });
          }
        }
        break;

      case 'mastery':
        r.addButton({ id: 'back', label: 'Explore Again', variant: 'secondary' });
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
      lightIntensity: this.lightIntensity,
      panelTilt: this.panelTilt,
      wavelength: this.wavelength,
      isAnimating: this.isAnimating,
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
    this.lightIntensity = (state.lightIntensity as number) || 1000;
    this.panelTilt = (state.panelTilt as number) || 0;
    this.wavelength = (state.wavelength as typeof this.wavelength) || 'visible';
    this.isAnimating = (state.isAnimating as boolean) ?? true;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===

export function createSolarCellDetectorGame(sessionId: string): SolarCellDetectorGame {
  return new SolarCellDetectorGame(sessionId);
}
