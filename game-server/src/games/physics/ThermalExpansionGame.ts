/**
 * Thermal Expansion Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Linear expansion: dL = alpha * L0 * dT
 * - Volumetric expansion: dV = beta * V0 * dT (beta ≈ 3*alpha)
 * - Thermal stress: sigma = E * alpha * dT
 * - Material coefficients of expansion
 * - Bimetallic strip calculations
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

// === PROTECTED MATERIAL DATA ===
interface Material {
  name: string;
  alpha: number; // ×10^-6 /°C
  color: string;
}

const materials: Record<string, Material> = {
  aluminum: { name: 'Aluminum', alpha: 23.1, color: '#94a3b8' },
  steel: { name: 'Steel', alpha: 12.0, color: '#64748b' },
  copper: { name: 'Copper', alpha: 16.5, color: '#f97316' },
  glass: { name: 'Glass', alpha: 8.5, color: '#7dd3fc' },
  invar: { name: 'Invar', alpha: 1.2, color: '#a78bfa' },
  brass: { name: 'Brass', alpha: 19.0, color: '#fbbf24' },
};

// === TEST QUESTIONS (PROTECTED - never sent to client) ===
const testQuestions: TestQuestion[] = [
  {
    question: 'The formula for linear thermal expansion is:',
    options: ['dL = L0 * dT', 'dL = alpha * L0 * dT', 'dL = alpha * dT', 'dL = L0 / dT'],
    correctIndex: 1,
  },
  {
    question: 'Which material has the highest coefficient of expansion?',
    options: ['Steel', 'Invar', 'Aluminum', 'Glass'],
    correctIndex: 2,
  },
  {
    question: 'Why do bridges have expansion joints?',
    options: ['For decoration', 'To allow thermal expansion without cracking', 'To save material', 'For drainage'],
    correctIndex: 1,
  },
  {
    question: 'A bimetallic strip bends when heated because:',
    options: ['One metal is heavier', 'Metals have different expansion rates', 'Heat softens the strip', 'Air pushes it'],
    correctIndex: 1,
  },
  {
    question: 'What is the unit of the coefficient of linear expansion?',
    options: ['Meters', '1/°C or 1/K', 'Joules', 'Watts'],
    correctIndex: 1,
  },
  {
    question: 'Invar is used in precision instruments because:',
    options: ['It is very hard', 'It has very low thermal expansion', 'It is cheap', 'It is magnetic'],
    correctIndex: 1,
  },
  {
    question: 'Volumetric expansion coefficient (beta) is approximately:',
    options: ['Equal to alpha', 'Three times alpha', 'Half of alpha', 'Unrelated to alpha'],
    correctIndex: 1,
  },
  {
    question: 'Thermal stress occurs when:',
    options: ['Material is free to expand', 'Expansion is constrained', 'Material is cooled slowly', 'In vacuum only'],
    correctIndex: 1,
  },
  {
    question: 'Railroad tracks have gaps because:',
    options: ['Installation error', 'They allow for heat expansion', 'Reduce noise', 'Save metal'],
    correctIndex: 1,
  },
  {
    question: 'A jar lid becomes easier to open when heated because:',
    options: ['Metal lid expands more than glass', 'Glass contracts', 'Heat makes metal softer', 'Air pressure changes'],
    correctIndex: 0,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#f97316',
  primaryDark: '#ea580c',
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
  hot: '#ef4444',
  cold: '#3b82f6',
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
    title: 'Bridge Expansion Joints',
    icon: 'bridge',
    description: 'Long bridges can expand by several feet between winter and summer.',
    details: 'The Golden Gate Bridge changes length by about 1 meter between extreme temperatures. Expansion joints with steel "teeth" allow movement while maintaining a smooth road surface.',
  },
  {
    title: 'Bimetallic Thermostats',
    icon: 'thermostat',
    description: 'Two metals bonded together bend when heated, creating an automatic switch.',
    details: 'Brass and steel strips bonded together bend toward the steel (lower alpha) when heated. This simple mechanism controls heating systems, fire alarms, and circuit breakers.',
  },
  {
    title: 'Shrink Fitting',
    icon: 'gear',
    description: 'Parts are heated to expand, assembled, then cooled for an extremely tight fit.',
    details: 'Train wheel rims are heated until they slip over the wheel hub, then cooled to create a permanent bond. This technique is used in bearing installations and engine construction.',
  },
  {
    title: 'Precision Instruments',
    icon: 'microscope',
    description: 'Scientific instruments use Invar to minimize measurement errors from temperature.',
    details: 'Invar (iron-nickel alloy, alpha = 1.2) is used in pendulum clocks, measuring tapes, and telescope mirrors. It was invented in 1896 by Charles Guillaume, who won the Nobel Prize for it.',
  },
];

// === MAIN GAME CLASS ===

export class ThermalExpansionGame extends BaseGame {
  readonly gameType = 'thermal_expansion';
  readonly gameTitle = 'Thermal Expansion';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private selectedMaterial: string = 'steel';
  private initialLength = 1.0; // meters
  private initialTemp = 20; // Celsius
  private finalTemp = 100; // Celsius
  private isAnimating = true;
  private time = 0;

  // Bimetallic strip state (twist)
  private bimetallicTemp = 20;
  private topMaterial = 'brass';
  private bottomMaterial = 'steel';

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
    hook: 'Why do bridges have gaps? Why do train tracks buckle in heat waves?',
    predict: 'What happens to a metal bar when heated?',
    play: 'Experiment with different materials and temperatures. Watch them expand!',
    review: 'dL = alpha * L0 * dT. Higher alpha = more expansion for the same temperature change.',
    twist_predict: 'What happens when two different metals are bonded together and heated?',
    twist_play: 'Watch the bimetallic strip bend! Which way will it curve?',
    twist_review: 'Bimetallic strips: different expansion rates create bending!',
    transfer: 'Thermal expansion is engineered into bridges, thermostats, and precision tools.',
    test: 'Test your understanding of thermal expansion!',
    mastery: 'You understand thermal expansion and its applications!',
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
      message: 'Thermal Expansion lesson started',
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

    if (id.startsWith('material_')) {
      this.selectedMaterial = id.replace('material_', '');
      return;
    }

    if (id === 'toggle_animation') {
      this.isAnimating = !this.isAnimating;
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
    if (id === 'temperature') {
      this.finalTemp = value;
      return;
    }
    if (id === 'initial_length') {
      this.initialLength = value;
      return;
    }
    if (id === 'bimetallic_temp') {
      this.bimetallicTemp = value;
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
   * PROTECTED: Linear expansion calculation
   * dL = alpha * L0 * dT
   */
  private calculateLinearExpansion(): number {
    const material = materials[this.selectedMaterial];
    const dT = this.finalTemp - this.initialTemp;
    const alpha = material.alpha * 1e-6; // Convert from 10^-6
    return alpha * this.initialLength * dT;
  }

  /**
   * PROTECTED: Final length after expansion
   */
  private calculateFinalLength(): number {
    return this.initialLength + this.calculateLinearExpansion();
  }

  /**
   * PROTECTED: Percentage expansion
   */
  private calculatePercentExpansion(): number {
    const dL = this.calculateLinearExpansion();
    return (dL / this.initialLength) * 100;
  }

  /**
   * PROTECTED: Thermal stress if expansion is constrained
   * sigma = E * alpha * dT
   * Using typical steel E = 200 GPa
   */
  private calculateThermalStress(): number {
    const material = materials[this.selectedMaterial];
    const E = 200e9; // Pa (steel approximation)
    const alpha = material.alpha * 1e-6;
    const dT = this.finalTemp - this.initialTemp;
    return E * alpha * dT / 1e6; // Convert to MPa
  }

  /**
   * PROTECTED: Bimetallic strip curvature
   * Higher alpha on top = curves downward when heated
   */
  private calculateBimetallicCurvature(): number {
    const topAlpha = materials[this.topMaterial].alpha;
    const bottomAlpha = materials[this.bottomMaterial].alpha;
    const dT = this.bimetallicTemp - 20;
    // Simplified curvature formula
    return (topAlpha - bottomAlpha) * dT * 0.01;
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;

    this.time += deltaTime / 1000;
  }

  private resetSimulation(): void {
    this.time = 0;
    this.isAnimating = true;
    this.finalTemp = 100;
    this.bimetallicTemp = 20;
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
      { offset: '0%', color: '#1a0a0a' },
      { offset: '50%', color: '#0a0f1a' },
      { offset: '100%', color: '#0a1a1a' },
    ]);

    r.circle(175, 0, 200, { fill: colors.hot, opacity: 0.03 });
    r.circle(525, 500, 200, { fill: colors.cold, opacity: 0.03 });
  }

  // --- EXPANDING BAR RENDERER ---

  private renderExpandingBar(r: CommandRenderer, x: number, y: number, baseWidth: number): void {
    const material = materials[this.selectedMaterial];
    const dL = this.calculateLinearExpansion();
    const expansion = (dL / this.initialLength) * baseWidth;

    // Original bar (dashed outline)
    r.rect(x, y, baseWidth, 40, {
      fill: 'none',
      stroke: colors.textMuted,
      strokeWidth: 2,
      strokeDasharray: '5 3',
      rx: 4,
    });

    // Expanded bar
    r.rect(x, y, baseWidth + expansion * 100, 40, {
      fill: material.color,
      stroke: colors.border,
      strokeWidth: 2,
      rx: 4,
    });

    // Temperature color overlay
    const tempRatio = (this.finalTemp - this.initialTemp) / 180;
    r.rect(x, y, baseWidth + expansion * 100, 40, {
      fill: colors.hot,
      opacity: tempRatio * 0.4,
      rx: 4,
    });

    // Expansion arrows
    if (expansion > 0.5) {
      r.text(x + baseWidth + expansion * 50, y + 20, '←→', {
        fill: colors.warning,
        fontSize: 16,
        textAnchor: 'middle',
      });
    }

    // Labels
    r.text(x + baseWidth / 2, y + 60, `Original: ${this.initialLength.toFixed(2)} m`, {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });
    r.text(x + baseWidth / 2, y + 78, `Final: ${this.calculateFinalLength().toFixed(5)} m`, {
      fill: colors.textPrimary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  // --- BIMETALLIC STRIP RENDERER ---

  private renderBimetallicStrip(r: CommandRenderer, x: number, y: number): void {
    const curvature = this.calculateBimetallicCurvature();
    const topMat = materials[this.topMaterial];
    const bottomMat = materials[this.bottomMaterial];

    // Calculate bend angle based on curvature
    const bendAngle = Math.min(Math.abs(curvature), 45);
    const bendDirection = curvature >= 0 ? 1 : -1;

    if (Math.abs(curvature) < 0.1) {
      // Flat strip
      r.rect(x, y, 200, 10, { fill: topMat.color, rx: 2 });
      r.rect(x, y + 10, 200, 10, { fill: bottomMat.color, rx: 2 });
    } else {
      // Curved strip (simplified as rotated rectangle)
      r.group(`translate(${x}, ${y + 10}) rotate(${bendAngle * bendDirection})`, (g) => {
        g.rect(0, -10, 200, 10, { fill: topMat.color, rx: 2 });
        g.rect(0, 0, 200, 10, { fill: bottomMat.color, rx: 2 });
      });
    }

    // Labels
    r.text(x + 220, y + 5, topMat.name, { fill: topMat.color, fontSize: 10 });
    r.text(x + 220, y + 17, bottomMat.name, { fill: bottomMat.color, fontSize: 10 });
  }

  // --- PHASE RENDERERS ---

  private renderHookPhase(r: CommandRenderer): void {
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.circle(295, 44, 4, { fill: colors.primary });
    r.text(350, 49, 'HEAT & MATTER', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, 'Why Bridges Have Gaps', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'Discover what happens to materials when temperature changes', {
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

    // Bridge illustration with gap
    r.rect(180, 260, 140, 30, { fill: '#64748b', rx: 4 });
    r.rect(380, 260, 140, 30, { fill: '#64748b', rx: 4 });
    r.rect(320, 260, 60, 30, { fill: 'none', stroke: colors.warning, strokeWidth: 2, strokeDasharray: '4 2' });

    // Expansion arrows
    r.text(350, 255, '↔', { fill: colors.warning, fontSize: 24, textAnchor: 'middle' });

    // Pillars
    r.rect(200, 290, 20, 60, { fill: '#475569' });
    r.rect(300, 290, 20, 60, { fill: '#475569' });
    r.rect(400, 290, 20, 60, { fill: '#475569' });
    r.rect(480, 290, 20, 60, { fill: '#475569' });

    r.text(350, 380, 'Steel bridges can grow several feet in summer heat!', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 400, 'What happens to solid materials when heated?', {
      fill: colors.primary,
      fontSize: 14,
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
    r.text(350, 115, 'A 1-meter steel bar is heated from 20°C to 100°C.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'What happens to its length?', {
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
        ? 'Correct! Materials expand when heated due to increased molecular vibration!'
        : 'Not quite. Most materials expand when heated.',
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
    r.text(350, 30, 'Thermal Expansion Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 50, 500, 180, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    // Render expanding bar
    this.renderExpandingBar(r, 150, 100, 300);

    // Temperature display
    r.text(550, 100, `${this.finalTemp}°C`, {
      fill: this.finalTemp > 50 ? colors.hot : colors.cold,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Stats panel
    r.rect(100, 250, 500, 120, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });

    const material = materials[this.selectedMaterial];
    const dL = this.calculateLinearExpansion();
    const percentExp = this.calculatePercentExpansion();

    r.text(180, 280, 'Material:', { fill: colors.textSecondary, fontSize: 12 });
    r.text(180, 305, material.name, { fill: material.color, fontSize: 16, fontWeight: 'bold' });
    r.text(180, 325, `alpha = ${material.alpha}×10⁻⁶/°C`, { fill: colors.textMuted, fontSize: 10 });

    r.text(350, 280, 'Expansion:', { fill: colors.textSecondary, fontSize: 12 });
    r.text(350, 305, `${(dL * 1000).toFixed(3)} mm`, { fill: colors.warning, fontSize: 16, fontWeight: 'bold' });
    r.text(350, 325, `(${percentExp.toFixed(4)}%)`, { fill: colors.textMuted, fontSize: 10 });

    r.text(520, 280, 'Temp Change:', { fill: colors.textSecondary, fontSize: 12 });
    r.text(520, 305, `${this.finalTemp - this.initialTemp}°C`, { fill: colors.primary, fontSize: 16, fontWeight: 'bold' });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Thermal Expansion Formula', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Main formula card
    r.rect(150, 70, 400, 80, { fill: '#7f1d1d40', stroke: colors.hot, rx: 16 });
    r.text(350, 100, 'ΔL = α × L₀ × ΔT', {
      fill: colors.hot,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 130, 'Change in Length = Coefficient × Original Length × Temp Change', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });

    // Variable explanations
    const variables = [
      { symbol: 'ΔL', meaning: 'Change in length (meters)', color: colors.warning },
      { symbol: 'α', meaning: 'Coefficient of linear expansion (1/°C)', color: colors.primary },
      { symbol: 'L₀', meaning: 'Original length (meters)', color: colors.accent },
      { symbol: 'ΔT', meaning: 'Temperature change (°C or K)', color: colors.success },
    ];

    variables.forEach((v, i) => {
      const y = 170 + i * 40;
      r.rect(150, y, 400, 35, { fill: colors.bgCard, rx: 8 });
      r.text(180, y + 22, v.symbol, { fill: v.color, fontSize: 14, fontWeight: 'bold' });
      r.text(230, y + 22, v.meaning, { fill: colors.textSecondary, fontSize: 12 });
    });

    r.text(350, 350, 'Higher α = more expansion per degree of temperature change', {
      fill: colors.textPrimary,
      fontSize: 13,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Bimetallic Twist', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 120, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'Two different metals are bonded together into one strip.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 155, 'Brass (α=19) on top, Steel (α=12) on bottom.', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 185, 'When heated, which way will the strip bend?', {
      fill: colors.warning,
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
        ? 'Correct! Brass expands more, so the strip bends toward the steel (downward)!'
        : 'Think about which metal expands more and what that does to the shape.',
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
    r.text(350, 30, 'Bimetallic Strip Lab', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 50, 500, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    // Render bimetallic strip
    this.renderBimetallicStrip(r, 200, 130);

    // Temperature display
    r.text(550, 130, `${this.bimetallicTemp}°C`, {
      fill: this.bimetallicTemp > 50 ? colors.hot : colors.cold,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Explanation
    r.rect(100, 270, 500, 120, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(350, 300, 'How Bimetallic Strips Work:', { fill: colors.warning, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 325, '1. Two metals with different α are bonded together', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 345, '2. When heated, one expands more than the other', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 365, '3. This differential expansion causes bending!', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 250, { fill: '#78350f40', stroke: colors.warning, rx: 16 });
    r.text(350, 110, 'Bimetallic Strips: Engineering Thermal Expansion', {
      fill: colors.warning,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const facts = [
      'Two metals bonded = differential expansion = bending',
      'Used in thermostats to control heating/cooling systems',
      'Fire alarm triggers when heat bends the strip',
      'Circuit breakers disconnect when overheating',
      'Old clock mechanisms used them for temperature compensation',
    ];

    facts.forEach((fact, i) => {
      r.text(130, 145 + i * 30, '• ' + fact, { fill: colors.textSecondary, fontSize: 12 });
    });

    r.text(350, 310, 'A simple strip becomes a temperature-sensitive switch!', {
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
        fill: isSelected ? colors.textPrimary : colors.textSecondary,
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

    r.text(350, 200, passed ? "Excellent! You've mastered thermal expansion!" : 'Keep studying! Review and try again.', {
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

    r.text(350, 130, 'Thermal Expansion Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, "You understand thermal expansion and its engineering!", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'ΔL', label: 'Linear Expansion' },
      { icon: 'α', label: 'Coefficients' },
      { icon: '↗↙', label: 'Bimetallic' },
      { icon: '🌉', label: 'Applications' },
    ];

    badges.forEach((badge, i) => {
      const x = 180 + (i % 2) * 170;
      const y = 200 + Math.floor(i / 2) * 80;
      r.rect(x, y, 150, 60, { fill: colors.bgCardLight, rx: 12 });
      r.text(x + 75, y + 25, badge.icon, { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x + 75, y + 45, badge.label, { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    });
  }

  // --- UI STATE ---

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
        r.addButton({ id: 'next', label: 'Discover Why', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. It contracts', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. It expands', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. No change', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. It melts', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Explore the Physics', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'temperature', label: 'Temperature (°C)', value: this.finalTemp, min: -20, max: 200 });
        r.addButton({ id: 'material_aluminum', label: 'Aluminum', variant: this.selectedMaterial === 'aluminum' ? 'primary' : 'ghost' });
        r.addButton({ id: 'material_steel', label: 'Steel', variant: this.selectedMaterial === 'steel' ? 'primary' : 'ghost' });
        r.addButton({ id: 'material_copper', label: 'Copper', variant: this.selectedMaterial === 'copper' ? 'primary' : 'ghost' });
        r.addButton({ id: 'material_invar', label: 'Invar', variant: this.selectedMaterial === 'invar' ? 'primary' : 'ghost' });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Discover the Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Upward (toward brass)', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Downward (toward steel)', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. No bending', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D. It twists sideways', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See the Bending', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({ id: 'bimetallic_temp', label: 'Temperature (°C)', value: this.bimetallicTemp, min: 0, max: 150 });
        r.addButton({ id: 'next', label: 'Review Discovery', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real-World Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Bridges', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Thermostats', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Shrink Fit', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Precision', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every((c) => c)) {
          r.addButton({ id: 'next', label: 'Take Knowledge Test', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= testQuestions.length - 1 });
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
      selectedMaterial: this.selectedMaterial,
      initialLength: this.initialLength,
      finalTemp: this.finalTemp,
      bimetallicTemp: this.bimetallicTemp,
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
    this.selectedMaterial = (state.selectedMaterial as string) || 'steel';
    this.initialLength = (state.initialLength as number) || 1.0;
    this.finalTemp = (state.finalTemp as number) || 100;
    this.bimetallicTemp = (state.bimetallicTemp as number) || 20;
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

export function createThermalExpansionGame(sessionId: string): ThermalExpansionGame {
  return new ThermalExpansionGame(sessionId);
}
