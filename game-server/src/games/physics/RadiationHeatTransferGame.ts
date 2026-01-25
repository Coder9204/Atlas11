/**
 * Radiation Heat Transfer Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Stefan-Boltzmann Law: P = εσAT⁴
 * - Wien's Displacement Law: λmax = b/T
 * - Emissivity calculations
 * - Black body radiation curves
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
    question: 'The Stefan-Boltzmann law states that radiated power is proportional to:',
    options: ['T', 'T²', 'T³', 'T⁴'],
    correctIndex: 3,
  },
  {
    question: 'If you double the absolute temperature, radiated power increases by:',
    options: ['2x', '4x', '8x', '16x'],
    correctIndex: 3,
  },
  {
    question: 'A perfect black body has emissivity (ε) of:',
    options: ['0', '0.5', '1', 'Infinity'],
    correctIndex: 2,
  },
  {
    question: 'Wien\'s Displacement Law relates temperature to:',
    options: ['Total power', 'Peak wavelength', 'Emissivity', 'Surface area'],
    correctIndex: 1,
  },
  {
    question: 'As an object heats up, its peak emission wavelength:',
    options: ['Increases', 'Decreases', 'Stays the same', 'Becomes random'],
    correctIndex: 1,
  },
  {
    question: 'The Sun appears yellow because its surface temperature is about:',
    options: ['2000 K', '4000 K', '5800 K', '10000 K'],
    correctIndex: 2,
  },
  {
    question: 'Infrared cameras detect:',
    options: ['Visible light', 'Thermal radiation from warm objects', 'Radio waves', 'X-rays'],
    correctIndex: 1,
  },
  {
    question: 'The Stefan-Boltzmann constant σ has units of:',
    options: ['W/m²', 'W/m²·K⁴', 'J/K', 'W/K'],
    correctIndex: 1,
  },
  {
    question: 'A shiny metal surface compared to a dark surface at the same temperature:',
    options: ['Radiates more', 'Radiates less', 'Radiates the same', 'Doesn\'t radiate'],
    correctIndex: 1,
  },
  {
    question: 'Earth\'s energy balance involves:',
    options: ['Only conduction', 'Only convection', 'Radiation to and from space', 'No radiation'],
    correctIndex: 2,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#ef4444',
  primaryDark: '#dc2626',
  accent: '#f97316',
  accentDark: '#ea580c',
  warning: '#eab308',
  success: '#22c55e',
  danger: '#ef4444',
  bgDark: '#0a0a0f',
  bgCard: '#12121a',
  bgCardLight: '#1e1e2e',
  border: '#2a2a3e',
  textPrimary: '#fafafa',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  hot: '#ef4444',
  warm: '#f97316',
  cool: '#3b82f6',
  infrared: '#7c2d12',
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
    title: 'Thermal Imaging',
    icon: 'camera',
    description: 'Infrared cameras detect heat radiation from objects.',
    details: 'All warm objects emit infrared radiation. Thermal cameras convert this invisible radiation into visible images.',
  },
  {
    title: 'Sun\'s Energy',
    icon: 'sun',
    description: 'The Sun radiates energy according to Stefan-Boltzmann law.',
    details: 'At 5800 K, the Sun emits 3.8×10²⁶ W. Earth receives about 1361 W/m² (solar constant).',
  },
  {
    title: 'Climate Science',
    icon: 'earth',
    description: 'Earth\'s temperature is determined by radiation balance.',
    details: 'Earth absorbs solar radiation and emits infrared. Greenhouse gases trap some outgoing radiation, warming the planet.',
  },
  {
    title: 'Industrial Heating',
    icon: 'factory',
    description: 'Furnaces use radiation for efficient heat transfer.',
    details: 'At high temperatures, radiation dominates. Industrial processes exploit T⁴ dependence for efficient heating.',
  },
];

// === MAIN GAME CLASS ===

export class RadiationHeatTransferGame extends BaseGame {
  readonly gameType = 'radiation_heat_transfer';
  readonly gameTitle = 'Radiation Heat Transfer';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private temperature = 1000; // Kelvin
  private emissivity = 0.9;
  private surfaceArea = 1; // m²
  private showSpectrum = true;
  private isAnimating = true;
  private time = 0;

  // PROTECTED: Physical constants
  private readonly stefanBoltzmann = 5.67e-8; // W/m²·K⁴
  private readonly wienConstant = 2.898e-3; // m·K

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
    'hook', 'predict', 'play', 'review',
    'twist_predict', 'twist_play', 'twist_review',
    'transfer', 'test', 'mastery',
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
    hook: 'Why does a red-hot piece of metal glow? The answer involves temperature and radiation!',
    predict: 'If you double the temperature, how much more energy does an object radiate?',
    play: 'Adjust the temperature and watch how radiated power changes - it\'s not linear!',
    review: 'Stefan-Boltzmann Law: P = εσAT⁴. The T⁴ is what makes radiation so powerful at high temperatures!',
    twist_predict: 'What color would a star hotter than our Sun appear?',
    twist_play: 'Explore Wien\'s Law: hotter objects emit at shorter (bluer) wavelengths!',
    twist_review: 'Temperature determines both total power AND the color of thermal radiation!',
    transfer: 'From thermal cameras to climate science - radiation is everywhere!',
    test: 'Time to test your understanding of thermal radiation!',
    mastery: 'Congratulations! You\'ve mastered radiation heat transfer!',
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
      message: 'Radiation Heat Transfer lesson started',
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

    if (id === 'reset') {
      this.resetSimulation();
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'spectrum') {
      this.showSpectrum = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'temperature') {
      this.temperature = value;
      return;
    }
    if (id === 'emissivity') {
      this.emissivity = value;
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

  // === PHYSICS SIMULATION (PROTECTED - runs on server only) ===

  /**
   * PROTECTED: Stefan-Boltzmann Law
   * P = εσAT⁴
   */
  private calculateRadiatedPower(): number {
    return this.emissivity * this.stefanBoltzmann * this.surfaceArea * Math.pow(this.temperature, 4);
  }

  /**
   * PROTECTED: Wien's Displacement Law
   * λmax = b/T
   */
  private calculatePeakWavelength(): number {
    return this.wienConstant / this.temperature;
  }

  /**
   * PROTECTED: Get color from temperature (simplified black body)
   */
  private getColorFromTemperature(): string {
    if (this.temperature < 1000) return '#330000'; // Deep red/infrared
    if (this.temperature < 2000) return '#ff3300'; // Red
    if (this.temperature < 3000) return '#ff6600'; // Orange
    if (this.temperature < 4000) return '#ff9900'; // Yellow-orange
    if (this.temperature < 5000) return '#ffcc00'; // Yellow
    if (this.temperature < 6000) return '#ffffff'; // White
    if (this.temperature < 8000) return '#ccccff'; // Blue-white
    return '#9999ff'; // Blue
  }

  /**
   * PROTECTED: Get wavelength type description
   */
  private getWavelengthType(): string {
    const wavelength = this.calculatePeakWavelength() * 1e9; // Convert to nm
    if (wavelength > 700) return 'Infrared';
    if (wavelength > 620) return 'Red';
    if (wavelength > 590) return 'Orange';
    if (wavelength > 570) return 'Yellow';
    if (wavelength > 495) return 'Green';
    if (wavelength > 450) return 'Blue';
    if (wavelength > 380) return 'Violet';
    return 'Ultraviolet';
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;

    this.time += deltaTime / 1000;
  }

  private resetSimulation(): void {
    this.temperature = 3000;
    this.emissivity = 0.9;
    this.time = 0;
    this.isAnimating = true;
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
    r.circle(175, 0, 200, { fill: colors.primary, opacity: 0.03 });
    r.circle(525, 500, 200, { fill: colors.accent, opacity: 0.03 });
  }

  private renderRadiatingObject(r: CommandRenderer, centerX: number, centerY: number, scale: number = 1): void {
    const glowColor = this.getColorFromTemperature();
    const power = this.calculateRadiatedPower();
    const glowIntensity = Math.min(1, power / 100000);

    // Glow effect
    for (let i = 3; i >= 0; i--) {
      r.circle(centerX, centerY, (60 + i * 20) * scale, {
        fill: glowColor,
        opacity: glowIntensity * (0.15 - i * 0.03),
      });
    }

    // Main object
    r.circle(centerX, centerY, 50 * scale, {
      fill: glowColor,
      stroke: colors.textPrimary,
      strokeWidth: 2,
    });

    // Radiation waves
    const waveCount = 8;
    for (let i = 0; i < waveCount; i++) {
      const angle = (i / waveCount) * Math.PI * 2 + this.time;
      const waveDistance = 70 + 20 * Math.sin(this.time * 3 + i);
      const x = centerX + Math.cos(angle) * waveDistance * scale;
      const y = centerY + Math.sin(angle) * waveDistance * scale;
      r.line(centerX + Math.cos(angle) * 55 * scale, centerY + Math.sin(angle) * 55 * scale, x, y, {
        stroke: glowColor,
        strokeWidth: 2,
        opacity: 0.6,
      });
    }

    // Temperature label
    r.text(centerX, centerY + 90 * scale, `${this.temperature} K`, {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderHookPhase(r: CommandRenderer): void {
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.text(350, 49, 'PHYSICS EXPLORATION', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, 'Glowing Hot', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'Why do hot objects glow different colors?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.rect(160, 160, 380, 220, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 20,
      opacity: 0.8,
    });

    this.renderRadiatingObject(r, 350, 280, 1);

    r.text(350, 400, 'Temperature determines both brightness AND color...', {
      fill: colors.textPrimary,
      fontSize: 14,
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

    r.rect(100, 80, 500, 80, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 115, 'An object\'s temperature doubles (e.g., 500 K to 1000 K).', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'By how much does the radiated power increase?', {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (this.prediction) {
      const isCorrect = this.prediction === 'D';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 375, isCorrect
        ? 'Correct! P ∝ T⁴, so doubling T increases power by 2⁴ = 16 times!'
        : 'Think about P ∝ T⁴. If T doubles, P increases by 2⁴ = 16!',
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
    r.text(350, 30, 'Thermal Radiation Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 340, 260, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderRadiatingObject(r, 250, 180, 1.2);

    // Stats panel
    r.rect(440, 50, 210, 260, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    const power = this.calculateRadiatedPower();
    const wavelength = this.calculatePeakWavelength() * 1e6; // Convert to micrometers

    r.text(545, 80, 'Radiation Data', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });

    r.rect(460, 100, 170, 50, { fill: '#dc262630', rx: 8 });
    r.text(545, 120, 'Radiated Power', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(545, 140, `${power.toExponential(2)} W`, {
      fill: colors.hot,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(460, 160, 170, 50, { fill: '#f9731630', rx: 8 });
    r.text(545, 180, 'Peak Wavelength', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(545, 200, `${wavelength.toFixed(2)} μm`, {
      fill: colors.warm,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(460, 220, 170, 50, { fill: colors.bgCardLight, rx: 8 });
    r.text(545, 240, 'Emission Type', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(545, 260, this.getWavelengthType(), {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 330, 570, 60, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(365, 355, 'Stefan-Boltzmann Law: P = εσAT⁴', {
      fill: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(365, 375, 'Temperature has a HUGE effect - raised to the 4th power!', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Thermal Radiation', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 290, 150, { fill: '#dc262640', stroke: colors.hot, rx: 16 });
    r.text(195, 95, 'Stefan-Boltzmann Law', { fill: colors.hot, fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });
    const sbInfo = [
      'P = εσAT⁴',
      'ε = emissivity (0 to 1)',
      'σ = 5.67×10⁻⁸ W/m²·K⁴',
      'T in Kelvin (absolute!)',
    ];
    sbInfo.forEach((line, i) => {
      r.text(70, 120 + i * 25, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 150, { fill: '#f9731640', stroke: colors.warm, rx: 16 });
    r.text(505, 95, 'Wien\'s Displacement', { fill: colors.warm, fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });
    const wienInfo = [
      'λmax = b/T',
      'b = 2.898×10⁻³ m·K',
      'Hotter → shorter wavelength',
      'Determines perceived color',
    ];
    wienInfo.forEach((line, i) => {
      r.text(380, 120 + i * 25, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(50, 240, 600, 80, { fill: '#15803d40', stroke: colors.success, rx: 16 });
    r.text(350, 265, 'The T⁴ Power', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 290, 'Double temperature → 16x power! This is why high-temp processes are so energy-intensive.', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Color Twist', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'Our Sun\'s surface is about 5800 K (appears yellow-white).', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 145, 'What color would a 10,000 K star appear?', {
      fill: colors.textPrimary,
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
        ? 'Correct! Hotter stars emit shorter wavelengths - appearing blue!'
        : 'Think about Wien\'s Law: hotter → shorter wavelength → bluer!',
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
    r.text(350, 30, 'Color vs Temperature Lab', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 540, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderRadiatingObject(r, 350, 180, 1.5);

    const wavelength = this.calculatePeakWavelength() * 1e9; // nm

    r.rect(80, 350, 540, 60, { fill: '#eab30830', stroke: colors.warning, rx: 12 });
    r.text(350, 375, `Peak wavelength: ${wavelength.toFixed(0)} nm (${this.getWavelengthType()})`, {
      fill: colors.warning,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 395, 'Wien\'s Law: λmax = b/T - hotter objects emit shorter wavelengths!', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Color Temperature', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'Temperature Determines Color', {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const colorScale = [
      { temp: '1000 K', color: 'Deep Red', hex: '#ff3300' },
      { temp: '3000 K', color: 'Orange', hex: '#ff9900' },
      { temp: '5800 K', color: 'Yellow-White', hex: '#ffff99' },
      { temp: '10000 K', color: 'Blue-White', hex: '#ccccff' },
      { temp: '20000 K', color: 'Blue', hex: '#6666ff' },
    ];

    colorScale.forEach((item, i) => {
      r.rect(120, 145 + i * 28, 20, 20, { fill: item.hex, rx: 4 });
      r.text(150, 160 + i * 28, `${item.temp} → ${item.color}`, {
        fill: colors.textSecondary,
        fontSize: 12,
      });
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
        fill: isSelected ? colors.textPrimary : colors.textSecondary,
        fontSize: 11,
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
      fontSize: 15,
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

    r.text(350, 200, passed ? 'You\'ve mastered thermal radiation!' : 'Review the concepts and try again.', {
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

    r.text(350, 130, 'Radiation Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, 'You\'ve mastered thermal radiation physics!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'T⁴', label: 'Stefan-Boltzmann' },
      { icon: 'λ', label: 'Wien\'s Law' },
      { icon: 'ε', label: 'Emissivity' },
      { icon: '☀️', label: 'Black Body' },
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
        r.addButton({ id: 'next', label: 'Explore Radiation', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. 2x', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. 4x', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. 8x', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. 16x', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Test It', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'temperature', label: 'Temperature (K)', value: this.temperature, min: 500, max: 10000, step: 100 });
        r.addSlider({ id: 'emissivity', label: 'Emissivity', value: this.emissivity, min: 0.1, max: 1, step: 0.05 });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Color Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. More yellow', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Blue-white', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Red', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Explore Colors', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({ id: 'temperature', label: 'Temperature (K)', value: this.temperature, min: 1000, max: 20000, step: 500 });
        r.addButton({ id: 'next', label: 'Understand Why', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Thermal', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Sun', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Climate', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Industry', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every((c) => c)) {
          r.addButton({ id: 'next', label: 'Take Test', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= testQuestions.length - 1 });
          testQuestions[this.testQuestion].options.forEach((_, i) => {
            r.addButton({ id: `answer_${i}`, label: `Option ${String.fromCharCode(65 + i)}`, variant: this.testAnswers[this.testQuestion] === i ? 'primary' : 'secondary' });
          });
          if (this.testAnswers.every((a) => a !== null)) {
            r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
          }
        } else {
          const score = this.calculateTestScore();
          if (score >= 7) {
            r.addButton({ id: 'next', label: 'Claim Badge', variant: 'success' });
          } else {
            r.addButton({ id: 'back', label: 'Review Again', variant: 'secondary' });
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
      temperature: this.temperature,
      emissivity: this.emissivity,
      showSpectrum: this.showSpectrum,
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
    this.temperature = (state.temperature as number) || 3000;
    this.emissivity = (state.emissivity as number) || 0.9;
    this.showSpectrum = (state.showSpectrum as boolean) ?? true;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===

export function createRadiationHeatTransferGame(sessionId: string): RadiationHeatTransferGame {
  return new RadiationHeatTransferGame(sessionId);
}
