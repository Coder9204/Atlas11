/**
 * Solar Heating Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Absorptivity (alpha): fraction of incident radiation absorbed
 * - Emissivity (epsilon): ratio of emission to blackbody at same temperature
 * - Kirchhoff's Law: alpha = epsilon at thermal equilibrium
 * - Stefan-Boltzmann Law: P = epsilon * sigma * A * T^4
 * - Selective surfaces: high alpha + low epsilon for collectors
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
    question: 'Absorptivity (alpha) measures:',
    options: [
      'How much light is reflected',
      'What fraction of incident radiation is absorbed',
      'The temperature of a surface',
      'The color of a surface',
    ],
    correctIndex: 1,
  },
  {
    question: 'A surface with alpha = 0.95 absorbs:',
    options: ['5% of incident radiation', '95% of incident radiation', 'All radiation', 'No radiation'],
    correctIndex: 1,
  },
  {
    question: "Kirchhoff's Law states that at thermal equilibrium:",
    options: ['alpha > epsilon always', 'alpha < epsilon always', 'alpha = epsilon', 'alpha * epsilon = 1'],
    correctIndex: 2,
  },
  {
    question: 'Why do white surfaces stay cooler in sunlight?',
    options: ['They absorb more heat', 'They reflect most visible light', 'They emit less heat', 'They are thinner'],
    correctIndex: 1,
  },
  {
    question: 'A "cool roof" with high reflectivity and high emissivity:',
    options: [
      'Absorbs heat and traps it',
      'Reflects sunlight and radiates heat away',
      'Gets hotter than a dark roof',
      'Does not affect building temperature',
    ],
    correctIndex: 1,
  },
  {
    question: 'Solar thermal collectors typically have:',
    options: ['Low alpha, high epsilon', 'High alpha, low epsilon', 'Low alpha, low epsilon', 'High alpha, high epsilon'],
    correctIndex: 1,
  },
  {
    question: 'Black surfaces are good absorbers AND good emitters because:',
    options: [
      'They are hot',
      'Kirchhoff\'s Law: alpha = epsilon',
      'They reflect nothing',
      'They are heavy',
    ],
    correctIndex: 1,
  },
  {
    question: 'Spacecraft thermal control uses surfaces that are:',
    options: [
      'All black',
      'All white',
      'Strategically placed absorbers and emitters',
      'Made of glass',
    ],
    correctIndex: 2,
  },
  {
    question: 'In desert survival, white clothing is better because:',
    options: [
      'It absorbs sweat',
      'It reflects solar radiation',
      'It is lighter weight',
      'It is more durable',
    ],
    correctIndex: 1,
  },
  {
    question: 'A surface with alpha = 0.2 and epsilon = 0.9 will:',
    options: [
      'Heat up quickly',
      'Stay relatively cool (reflects sun, emits heat)',
      'Never reach equilibrium',
      'Behave like a blackbody',
    ],
    correctIndex: 1,
  },
];

// === SURFACE DATA (PROTECTED) ===
interface SurfaceProperties {
  name: string;
  absorptivity: number;
  emissivity: number;
  color: string;
}

const SURFACES: SurfaceProperties[] = [
  { name: 'Matte Black', absorptivity: 0.95, emissivity: 0.95, color: '#1a1a1a' },
  { name: 'White', absorptivity: 0.20, emissivity: 0.90, color: '#f5f5f5' },
  { name: 'Mirror/Shiny', absorptivity: 0.05, emissivity: 0.05, color: '#c0c0c0' },
  { name: 'Selective', absorptivity: 0.90, emissivity: 0.10, color: '#1e3a5f' },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#f97316',
  primaryDark: '#ea580c',
  accent: '#06b6d4',
  accentDark: '#0891b2',
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
  sun: '#fbbf24',
  heat: '#ef4444',
  cool: '#3b82f6',
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
    title: 'Cool Roofs',
    icon: 'roof',
    description: 'White or reflective roofs reduce building cooling costs by reflecting sunlight and emitting thermal radiation.',
    details: 'Cool roofs can reduce peak cooling demand by 10-15%. Cities with cool roof mandates see reduced urban heat island effects.',
  },
  {
    title: 'Solar Thermal Collectors',
    icon: 'collector',
    description: 'Selective surfaces (high alpha, low epsilon) maximize heat absorption while minimizing radiation losses.',
    details: 'These coatings can achieve alpha > 0.9 and epsilon < 0.1. Used in solar water heaters and concentrated solar power plants.',
  },
  {
    title: 'Spacecraft Thermal Control',
    icon: 'spacecraft',
    description: 'Satellites use carefully designed surfaces to manage temperature in the extreme conditions of space.',
    details: 'Multi-layer insulation, radiator panels, and heaters maintain equipment within operating temperature ranges.',
  },
  {
    title: 'Desert Survival Clothing',
    icon: 'clothing',
    description: 'Bedouin robes are white to reflect sunlight. The loose fit allows convective cooling.',
    details: 'Traditional wisdom meets physics: high reflectivity reduces solar gain while allowing body heat to escape.',
  },
];

// === MAIN GAME CLASS ===

export class SolarHeatingGame extends BaseGame {
  readonly gameType = 'solar_heating';
  readonly gameTitle = 'Solar Heating';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private selectedSurface = 0;
  private solarIntensity = 1000; // W/m^2
  private ambientTemp = 25; // Celsius
  private surfaceTemp = 25;
  private time = 0;
  private isAnimating = true;

  // PROTECTED: Physics constants
  private readonly stefanBoltzmann = 5.67e-8;
  private readonly surfaceArea = 0.01; // m^2

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
    hook: 'Why does a black car get hotter than a white car in the sun? It\'s all about absorptivity!',
    predict: 'Think about which surface will reach the highest temperature...',
    play: 'Compare different surfaces. Watch how they heat up under solar radiation!',
    review: 'Absorptivity determines heat gain. Emissivity determines heat loss. Kirchhoff\'s Law connects them!',
    twist_predict: 'Can we design a surface that absorbs heat but doesn\'t lose it?',
    twist_play: 'Explore selective surfaces - engineered for specific thermal behavior!',
    twist_review: 'Selective surfaces break the alpha = epsilon rule at different wavelengths.',
    transfer: 'From cool roofs to spacecraft, surface properties control temperature everywhere.',
    test: 'Test your understanding of solar heating and surface properties!',
    mastery: 'You now understand how surfaces interact with radiation!',
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
      message: 'Solar Heating lesson started',
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

    if (id.startsWith('surface_')) {
      this.selectedSurface = parseInt(id.replace('surface_', ''), 10);
      this.surfaceTemp = this.ambientTemp;
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
      this.solarIntensity = value;
      return;
    }
    if (id === 'ambient') {
      this.ambientTemp = value;
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
   * PROTECTED: Heat absorbed from solar radiation
   * Q_in = alpha * I * A
   */
  private calculateHeatAbsorbed(): number {
    const surface = SURFACES[this.selectedSurface];
    return surface.absorptivity * this.solarIntensity * this.surfaceArea;
  }

  /**
   * PROTECTED: Heat emitted via radiation (Stefan-Boltzmann)
   * Q_out = epsilon * sigma * A * T^4
   */
  private calculateHeatEmitted(): number {
    const surface = SURFACES[this.selectedSurface];
    const tempK = this.surfaceTemp + 273.15;
    return surface.emissivity * this.stefanBoltzmann * this.surfaceArea * Math.pow(tempK, 4);
  }

  /**
   * PROTECTED: Equilibrium temperature calculation
   */
  private calculateEquilibriumTemp(): number {
    const surface = SURFACES[this.selectedSurface];
    // Simplified: alpha * I = epsilon * sigma * T^4
    // T = (alpha * I / (epsilon * sigma))^0.25
    if (surface.emissivity < 0.01) return 200; // Avoid division by zero
    const tempK = Math.pow((surface.absorptivity * this.solarIntensity) / (surface.emissivity * this.stefanBoltzmann), 0.25);
    return Math.min(tempK - 273.15, 200); // Cap at 200C for display
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;

    this.time += deltaTime / 1000;

    // Simplified thermal dynamics
    const equilibriumTemp = this.calculateEquilibriumTemp();
    const heatCapacity = 100; // Simplified
    const tempDiff = equilibriumTemp - this.surfaceTemp;
    this.surfaceTemp += tempDiff * deltaTime / 1000 / 2;
  }

  private resetSimulation(): void {
    this.surfaceTemp = this.ambientTemp;
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
    r.linearGradient('labBg', [
      { offset: '0%', color: '#0a1628' },
      { offset: '50%', color: '#0a0f1a' },
      { offset: '100%', color: '#0a1628' },
    ]);
    r.circle(175, 0, 200, { fill: colors.sun, opacity: 0.05 });
    r.circle(525, 500, 200, { fill: colors.cool, opacity: 0.03 });
  }

  private renderSurfacePanel(r: CommandRenderer, centerX: number, centerY: number, size: number = 200): void {
    const surface = SURFACES[this.selectedSurface];

    // Sun rays
    for (let i = 0; i < 5; i++) {
      const startX = centerX - 60 + i * 30;
      r.line(startX, centerY - 100, startX, centerY - 30, {
        stroke: colors.sun,
        strokeWidth: 3,
        opacity: 0.7,
      });
    }

    // Surface panel
    r.rect(centerX - 80, centerY - 30, 160, 80, {
      fill: surface.color,
      stroke: colors.border,
      strokeWidth: 2,
      rx: 4,
    });

    // Temperature indicator
    const tempRatio = Math.min((this.surfaceTemp - this.ambientTemp) / 100, 1);
    const heatGlowOpacity = Math.max(0, tempRatio) * 0.5;

    r.rect(centerX - 80, centerY - 30, 160, 80, {
      fill: colors.heat,
      opacity: heatGlowOpacity,
      rx: 4,
    });

    // Reflected rays (for reflective surfaces)
    if (surface.absorptivity < 0.5) {
      for (let i = 0; i < 3; i++) {
        const startX = centerX - 30 + i * 30;
        r.line(startX, centerY - 30, startX - 20, centerY - 80, {
          stroke: colors.sun,
          strokeWidth: 2,
          opacity: 0.4 * (1 - surface.absorptivity),
        });
      }
    }

    // Emitted radiation (heat waves)
    if (surface.emissivity > 0.3) {
      for (let i = 0; i < 3; i++) {
        const waveY = centerY + 60 + Math.sin(this.time * 3 + i) * 10;
        r.path(`M ${centerX - 40 + i * 40} ${waveY} Q ${centerX - 20 + i * 40} ${waveY - 10} ${centerX + i * 40} ${waveY}`, {
          fill: 'none',
          stroke: colors.heat,
          strokeWidth: 2,
          opacity: surface.emissivity * 0.5,
        });
      }
    }

    // Temperature display
    r.text(centerX, centerY + 100, `${this.surfaceTemp.toFixed(1)} deg C`, {
      fill: this.surfaceTemp > 50 ? colors.heat : colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Surface name
    r.text(centerX, centerY + 130, surface.name, {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
  }

  private renderHookPhase(r: CommandRenderer): void {
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.circle(295, 44, 4, { fill: colors.primary });
    r.text(350, 49, 'THERMAL RADIATION', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, 'Why Black Cars Get Hot', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'Surface color affects temperature. But why?', {
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

    this.renderSurfacePanel(r, 350, 280, 180);

    r.text(350, 420, 'It\'s all about absorptivity and emissivity!', {
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
    r.text(350, 115, 'Three surfaces in sunlight: black, white, and mirror.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'Which will reach the highest equilibrium temperature?', {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (this.prediction) {
      const isCorrect = this.prediction === 'A';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 375, isCorrect
        ? 'Correct! Black surfaces absorb the most radiation and heat up the most!'
        : 'Not quite. Higher absorptivity means more heat absorption.',
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
    r.text(350, 30, 'Solar Heating Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Main visualization
    r.rect(80, 50, 350, 300, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderSurfacePanel(r, 255, 180, 220);

    // Stats panel
    const surface = SURFACES[this.selectedSurface];
    const equilibriumTemp = this.calculateEquilibriumTemp();

    r.rect(450, 50, 200, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    r.text(550, 80, 'Surface Properties', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });

    r.text(470, 110, 'alpha:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 110, surface.absorptivity.toFixed(2), { fill: colors.heat, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });

    r.text(470, 135, 'epsilon:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 135, surface.emissivity.toFixed(2), { fill: colors.cool, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });

    r.text(470, 165, 'T_equilibrium:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 165, `${equilibriumTemp.toFixed(0)} deg C`, { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'end' });

    r.text(470, 195, 'T_current:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(630, 195, `${this.surfaceTemp.toFixed(1)} deg C`, {
      fill: this.surfaceTemp > 50 ? colors.heat : colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'end',
    });

    // Surface selector buttons rendered in stats
    r.text(550, 235, 'Select Surface:', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });

    // Formula box
    r.rect(80, 370, 570, 50, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(365, 400, 'Equilibrium: alpha * I_solar = epsilon * sigma * T^4', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Surface Properties', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 290, 160, { fill: '#ea580c40', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'Absorptivity (alpha)', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const alphaInfo = [
      'Fraction of radiation absorbed',
      'Range: 0 (perfect mirror) to 1 (blackbody)',
      'Black surfaces: alpha ~ 0.95',
      'White surfaces: alpha ~ 0.20',
    ];
    alphaInfo.forEach((line, i) => {
      r.text(70, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 160, { fill: '#0891b240', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Emissivity (epsilon)', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const epsilonInfo = [
      'Ratio of emission to blackbody',
      'Range: 0 (perfect reflector) to 1',
      'Kirchhoff: alpha = epsilon',
      'Stefan-Boltzmann: P = epsilon*sigma*A*T^4',
    ];
    epsilonInfo.forEach((line, i) => {
      r.text(380, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(50, 250, 600, 80, { fill: '#06533940', stroke: colors.success, rx: 16 });
    r.text(350, 275, 'Key Insight', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 300, 'High absorptivity = heats up fast. High emissivity = cools down fast. Balance determines temperature!', {
      fill: colors.textSecondary,
      fontSize: 12,
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
    r.text(350, 125, 'Engineers want a surface that absorbs solar heat well', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 150, 'but doesn\'t radiate it away.', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 180, 'Is this possible given Kirchhoff\'s Law (alpha = epsilon)?', {
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
        ? 'Correct! Selective surfaces have different alpha/epsilon at different wavelengths!'
        : 'Not quite. Kirchhoff\'s Law applies per wavelength, not overall.',
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
    r.text(350, 30, 'Selective Surfaces', {
      fill: colors.accent,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 350, 300, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderSurfacePanel(r, 255, 180, 220);

    // Comparison table
    r.rect(450, 50, 200, 250, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    r.text(550, 80, 'Surface Comparison', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });

    SURFACES.forEach((s, i) => {
      const y = 110 + i * 40;
      const isSelected = i === this.selectedSurface;
      r.rect(460, y - 15, 180, 35, {
        fill: isSelected ? colors.bgCardLight : 'transparent',
        stroke: isSelected ? colors.accent : colors.border,
        rx: 4,
      });
      r.rect(470, y - 5, 15, 15, { fill: s.color, rx: 2 });
      r.text(490, y + 5, s.name, { fill: colors.textSecondary, fontSize: 11 });
      r.text(620, y - 2, `a=${s.absorptivity.toFixed(2)}`, { fill: colors.heat, fontSize: 10, textAnchor: 'end' });
      r.text(620, y + 10, `e=${s.emissivity.toFixed(2)}`, { fill: colors.cool, fontSize: 10, textAnchor: 'end' });
    });

    // Key insight
    r.rect(450, 270, 200, 80, { fill: '#78350f30', stroke: colors.accent, rx: 12 });
    r.text(550, 295, 'Selective Surface', { fill: colors.accent, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(550, 315, 'High alpha (0.90)', { fill: colors.heat, fontSize: 11, textAnchor: 'middle' });
    r.text(550, 335, 'Low epsilon (0.10)', { fill: colors.cool, fontSize: 11, textAnchor: 'middle' });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', {
      fill: colors.accent,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 250, { fill: '#78350f30', stroke: colors.accent, rx: 16 });
    r.text(350, 110, 'Selective Surfaces', {
      fill: colors.accent,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const selectiveInfo = [
      { label: 'Kirchhoff applies at:', value: 'Each wavelength separately' },
      { label: 'Solar (visible):', value: 'High absorptivity wanted' },
      { label: 'Thermal (IR):', value: 'Low emissivity wanted' },
      { label: 'Result:', value: 'Hot surfaces that stay hot!' },
      { label: 'Application:', value: 'Solar thermal collectors' },
    ];

    selectiveInfo.forEach((item, i) => {
      r.text(180, 145 + i * 30, item.label, { fill: colors.textSecondary, fontSize: 13, fontWeight: 'bold' });
      r.text(370, 145 + i * 30, item.value, { fill: colors.textPrimary, fontSize: 13 });
    });

    r.text(350, 310, 'Wavelength-selective coatings enable efficient solar collectors!', {
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

    r.text(350, 200, passed ? "You've mastered solar heating!" : 'Review the material and try again.', {
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

    r.text(350, 130, 'Thermal Radiation Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, "You've mastered solar heating and surface properties!", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'alpha', label: 'Absorptivity' },
      { icon: 'epsilon', label: 'Emissivity' },
      { icon: 'K', label: 'Kirchhoff Law' },
      { icon: 'S', label: 'Selective Surfaces' },
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
        r.addButton({ id: 'next', label: 'Explore Thermal Radiation', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Black (highest alpha)', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. White (reflects heat)', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Mirror (shiny)', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Test It', variant: 'success' });
        }
        break;

      case 'play':
        SURFACES.forEach((s, i) => {
          r.addButton({ id: `surface_${i}`, label: s.name, variant: this.selectedSurface === i ? 'primary' : 'secondary' });
        });
        r.addSlider({ id: 'intensity', label: 'Solar Intensity', value: this.solarIntensity, min: 200, max: 1500, step: 100 });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Discover a Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. No, Kirchhoff forbids it', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Yes, at different wavelengths', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Only in space', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Explore Selective Surfaces', variant: 'success' });
        }
        break;

      case 'twist_play':
        SURFACES.forEach((s, i) => {
          r.addButton({ id: `surface_${i}`, label: s.name, variant: this.selectedSurface === i ? 'primary' : 'secondary' });
        });
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
      selectedSurface: this.selectedSurface,
      solarIntensity: this.solarIntensity,
      ambientTemp: this.ambientTemp,
      surfaceTemp: this.surfaceTemp,
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
    this.selectedSurface = (state.selectedSurface as number) || 0;
    this.solarIntensity = (state.solarIntensity as number) || 1000;
    this.ambientTemp = (state.ambientTemp as number) || 25;
    this.surfaceTemp = (state.surfaceTemp as number) || 25;
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

export function createSolarHeatingGame(sessionId: string): SolarHeatingGame {
  return new SolarHeatingGame(sessionId);
}
