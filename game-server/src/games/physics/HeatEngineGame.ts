/**
 * Heat Engine Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP - Physics Formulas:
 * - Carnot efficiency: eta = 1 - T_cold / T_hot
 * - Work output: W = Q_hot - Q_cold
 * - First law: delta_U = Q - W
 * - Heat engine efficiency: eta = W / Q_hot
 * - Coefficient of performance (refrigerator): COP = Q_cold / W
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
    question: 'What determines the maximum theoretical efficiency of a heat engine?',
    options: [
      'The amount of fuel used',
      'The temperature difference between hot and cold reservoirs',
      'The size of the engine',
      'The type of working fluid',
    ],
    correctIndex: 1,
  },
  {
    question: 'The Carnot efficiency formula (eta = 1 - T_cold/T_hot) requires temperatures in:',
    options: ['Celsius', 'Fahrenheit', 'Kelvin (absolute temperature)', 'Any unit works'],
    correctIndex: 2,
  },
  {
    question: 'If a heat engine absorbs 1000 J from the hot reservoir and rejects 600 J to the cold reservoir, the work output is:',
    options: ['1600 J', '400 J', '600 J', '1000 J'],
    correctIndex: 1,
  },
  {
    question: 'Why can no real heat engine achieve Carnot efficiency?',
    options: [
      'The formula is wrong',
      'Friction and irreversible processes always exist',
      'Carnot efficiency is only for refrigerators',
      'Real engines produce more work than Carnot predicts',
    ],
    correctIndex: 1,
  },
  {
    question: 'In a heat engine cycle, what happens to the internal energy after one complete cycle?',
    options: [
      'It increases',
      'It decreases',
      'It returns to the same value (no net change)',
      'It becomes zero',
    ],
    correctIndex: 2,
  },
  {
    question: 'A Carnot engine operating between 600 K and 300 K has an efficiency of:',
    options: ['25%', '50%', '75%', '100%'],
    correctIndex: 1,
  },
  {
    question: 'The First Law of Thermodynamics for a heat engine states:',
    options: [
      'Heat flows from cold to hot spontaneously',
      'Energy input equals energy output (Q_hot = W + Q_cold)',
      'All heat can be converted to work',
      'Entropy always decreases',
    ],
    correctIndex: 1,
  },
  {
    question: 'To increase heat engine efficiency, you should:',
    options: [
      'Decrease the hot reservoir temperature',
      'Increase the cold reservoir temperature',
      'Increase T_hot and/or decrease T_cold',
      'Use a larger engine',
    ],
    correctIndex: 2,
  },
  {
    question: 'A refrigerator is essentially:',
    options: [
      'A heat engine running in reverse',
      'A device that destroys heat',
      'A device that creates cold',
      'Independent of thermodynamic laws',
    ],
    correctIndex: 0,
  },
  {
    question: 'The Second Law of Thermodynamics implies that:',
    options: [
      'Perfect 100% efficiency is impossible for heat engines',
      'Energy is always created',
      'Heat flows spontaneously from cold to hot',
      'Engines can exceed Carnot efficiency with good design',
    ],
    correctIndex: 0,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#f97316', // Orange
  primaryDark: '#ea580c',
  accent: '#06b6d4', // Cyan
  accentDark: '#0891b2',
  hot: '#ef4444', // Red for hot reservoir
  cold: '#3b82f6', // Blue for cold reservoir
  work: '#22c55e', // Green for work output
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

export class HeatEngineGame extends BaseGame {
  readonly gameType = 'heat_engine';
  readonly gameTitle = 'Heat Engines & Thermodynamics';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Heat engine simulation state (PROTECTED - server only)
  private time = 0;
  private isSimulating = false;
  private cyclePhase = 0; // 0-100 for animation cycle
  private cycleCount = 0;

  // Temperature controls (user adjustable)
  private tempHot = 600; // Kelvin
  private tempCold = 300; // Kelvin
  private heatInput = 1000; // Joules

  // Calculated values (PROTECTED - computed on server)
  private efficiency = 0;
  private workOutput = 0;
  private heatRejected = 0;

  // Animation state
  private pistonPosition = 0;
  private gasVolume = 50; // percentage
  private showLabels = true;

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
    twist_play: 'Explore Limits',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Welcome! Heat engines power our world - from cars to power plants.',
    predict: 'What happens when we try to convert heat into useful work?',
    play: 'Adjust the temperatures and watch how efficiency changes!',
    review: 'The Carnot limit reveals a fundamental truth about nature.',
    twist_predict: 'What if we try to achieve 100% efficiency?',
    twist_play: 'Explore the limits - can any engine beat the Carnot efficiency?',
    twist_review: "You've discovered why perpetual motion machines are impossible!",
    transfer: 'See how thermodynamics shapes technology all around us.',
    test: 'Time to test your understanding of heat engines!',
    mastery: 'Congratulations! You understand the fundamental limits of energy conversion!',
  };

  constructor(sessionId: string) {
    super(sessionId);
    this.calculateThermodynamics();
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
      message: 'Heat Engine lesson started',
    });
  }

  // === PROTECTED PHYSICS CALCULATIONS ===

  /**
   * PROTECTED: Calculate thermodynamic values
   * These formulas are the core IP - never sent to client
   */
  private calculateThermodynamics(): void {
    // Carnot efficiency: eta = 1 - T_cold / T_hot
    this.efficiency = 1 - this.tempCold / this.tempHot;

    // Work output: W = eta * Q_hot
    this.workOutput = this.efficiency * this.heatInput;

    // Heat rejected: Q_cold = Q_hot - W (First Law)
    this.heatRejected = this.heatInput - this.workOutput;
  }

  /**
   * PROTECTED: Calculate actual efficiency for given temperatures
   * Client sees only the result, not the formula
   */
  private calculateCarnotEfficiency(tHot: number, tCold: number): number {
    if (tHot <= 0 || tCold <= 0 || tHot <= tCold) return 0;
    return clamp(1 - tCold / tHot, 0, 1);
  }

  /**
   * PROTECTED: Calculate work and heat transfer
   */
  private calculateEnergyFlows(qHot: number, efficiency: number): { work: number; qCold: number } {
    const work = qHot * efficiency;
    const qCold = qHot - work;
    return { work, qCold };
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

    // Predictions
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

    // Simulation controls
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
    if (id === 'guided_mode') {
      this.guidedMode = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'temp_hot') {
      this.tempHot = clamp(value, this.tempCold + 50, 1500);
      this.calculateThermodynamics();
      this.emitCoachEvent('value_changed', { tempHot: this.tempHot, efficiency: this.efficiency });
      return;
    }
    if (id === 'temp_cold') {
      this.tempCold = clamp(value, 200, this.tempHot - 50);
      this.calculateThermodynamics();
      this.emitCoachEvent('value_changed', { tempCold: this.tempCold, efficiency: this.efficiency });
      return;
    }
    if (id === 'heat_input') {
      this.heatInput = clamp(value, 100, 5000);
      this.calculateThermodynamics();
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
    const hints: Record<GamePhase, string> = {
      hook: 'Heat engines convert thermal energy into mechanical work.',
      predict: 'Think about energy conservation - can all heat become work?',
      play: 'Notice how efficiency depends on the temperature RATIO.',
      review: 'The Carnot efficiency is the theoretical maximum - no engine can exceed it.',
      twist_predict: 'What would happen if T_cold could reach absolute zero?',
      twist_play: "Try extreme values - why can't efficiency reach 100%?",
      twist_review: 'The Second Law forbids complete conversion of heat to work.',
      transfer: "From car engines to power plants, they're all bounded by Carnot.",
      test: 'Remember: efficiency = 1 - T_cold/T_hot (in Kelvin!).',
      mastery: 'You now understand the fundamental limits of thermodynamics!',
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

    // Reset simulation when entering play phases
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

  update(deltaTime: number): void {
    if (!this.isSimulating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play') return;

    this.time += deltaTime / 1000;

    // Animate the heat engine cycle
    this.cyclePhase += deltaTime * 0.05; // Adjust speed as needed
    if (this.cyclePhase >= 100) {
      this.cyclePhase = 0;
      this.cycleCount++;
    }

    // Update piston position based on cycle phase (Carnot cycle simulation)
    // Phase 0-25: Isothermal expansion (absorb heat from hot reservoir)
    // Phase 25-50: Adiabatic expansion (temperature drops)
    // Phase 50-75: Isothermal compression (reject heat to cold reservoir)
    // Phase 75-100: Adiabatic compression (temperature rises)
    this.updateCycleAnimation();
  }

  /**
   * PROTECTED: Update animation based on thermodynamic cycle
   */
  private updateCycleAnimation(): void {
    const phase = this.cyclePhase;

    if (phase < 25) {
      // Isothermal expansion - gas expands while absorbing heat
      this.pistonPosition = lerp(20, 60, phase / 25);
      this.gasVolume = lerp(30, 70, phase / 25);
    } else if (phase < 50) {
      // Adiabatic expansion - continues expanding, cooling
      this.pistonPosition = lerp(60, 80, (phase - 25) / 25);
      this.gasVolume = lerp(70, 90, (phase - 25) / 25);
    } else if (phase < 75) {
      // Isothermal compression - compress while rejecting heat
      this.pistonPosition = lerp(80, 40, (phase - 50) / 25);
      this.gasVolume = lerp(90, 50, (phase - 50) / 25);
    } else {
      // Adiabatic compression - compress and heat up
      this.pistonPosition = lerp(40, 20, (phase - 75) / 25);
      this.gasVolume = lerp(50, 30, (phase - 75) / 25);
    }
  }

  private resetSimulation(): void {
    this.time = 0;
    this.cyclePhase = 0;
    this.cycleCount = 0;
    this.isSimulating = false;
    this.pistonPosition = 20;
    this.gasVolume = 30;
    this.calculateThermodynamics();
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

    // Set viewport
    r.setViewport(700, 350);

    // Background
    this.renderBackground(r);

    // Phase-specific content
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

    // UI state
    this.renderUI(r);

    return r.toFrame(this.nextFrame());
  }

  private renderBackground(r: CommandRenderer): void {
    r.clear(colors.bgDark);

    // Gradient overlay for premium look
    r.linearGradient('bgGrad', [
      { offset: '0%', color: '#0a0f1a' },
      { offset: '50%', color: '#0f172a' },
      { offset: '100%', color: '#0a0f1a' },
    ]);

    // Subtle radial glow
    r.radialGradient('hotGlow', [
      { offset: '0%', color: colors.hot + '20' },
      { offset: '100%', color: 'transparent' },
    ]);
  }

  private renderHook(r: CommandRenderer): void {
    r.text(350, 60, 'Heat Engines', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 95, 'Converting Heat into Useful Work', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    // Simple heat engine diagram
    this.renderSimpleEngineDiagram(r, 350, 200, 200);

    r.text(350, 320, 'Why can engines never be 100% efficient?', {
      fill: colors.primary,
      fontSize: 14,
      textAnchor: 'middle',
    });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 85, 'A heat engine takes 1000 J from a hot reservoir at 600 K', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 105, 'and rejects heat to a cold reservoir at 300 K.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 135, 'How much work can the engine produce?', {
      fill: colors.accent,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Show setup diagram
    this.renderSimpleEngineDiagram(r, 350, 230, 150);
  }

  private renderPlay(r: CommandRenderer): void {
    // Heat engine visualization
    this.renderEngineVisualization(r);

    // Stats display
    const statsY = 30;
    r.rect(20, statsY - 15, 200, 85, {
      fill: colors.bgCard + 'cc',
      stroke: colors.border,
      rx: 8,
    });

    r.text(30, statsY + 5, `Efficiency: ${(this.efficiency * 100).toFixed(1)}%`, {
      fill: colors.success,
      fontSize: 14,
      fontWeight: 'bold',
    });

    r.text(30, statsY + 25, `Work Output: ${this.workOutput.toFixed(0)} J`, {
      fill: colors.work,
      fontSize: 12,
    });

    r.text(30, statsY + 45, `Heat Rejected: ${this.heatRejected.toFixed(0)} J`, {
      fill: colors.cold,
      fontSize: 12,
    });

    r.text(30, statsY + 65, `Cycles: ${this.cycleCount}`, {
      fill: colors.textMuted,
      fontSize: 12,
    });

    // Temperature display
    r.rect(480, statsY - 15, 200, 65, {
      fill: colors.bgCard + 'cc',
      stroke: colors.border,
      rx: 8,
    });

    r.text(490, statsY + 5, `T_hot: ${this.tempHot} K`, {
      fill: colors.hot,
      fontSize: 14,
      fontWeight: 'bold',
    });

    r.text(490, statsY + 25, `T_cold: ${this.tempCold} K`, {
      fill: colors.cold,
      fontSize: 14,
      fontWeight: 'bold',
    });

    r.text(490, statsY + 45, `Q_in: ${this.heatInput} J`, {
      fill: colors.textSecondary,
      fontSize: 12,
    });
  }

  private renderSimpleEngineDiagram(r: CommandRenderer, cx: number, cy: number, size: number): void {
    const scale = size / 200;

    // Hot reservoir (top)
    r.rect(cx - 60 * scale, cy - 80 * scale, 120 * scale, 40 * scale, {
      fill: colors.hot + '40',
      stroke: colors.hot,
      rx: 8,
    });
    r.text(cx, cy - 55 * scale, 'HOT', {
      fill: colors.hot,
      fontSize: 14 * scale,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Engine (center)
    r.circle(cx, cy, 35 * scale, {
      fill: colors.bgCardLight,
      stroke: colors.primary,
      strokeWidth: 3,
    });
    r.text(cx, cy + 5 * scale, 'ENGINE', {
      fill: colors.textPrimary,
      fontSize: 10 * scale,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Cold reservoir (bottom)
    r.rect(cx - 60 * scale, cy + 40 * scale, 120 * scale, 40 * scale, {
      fill: colors.cold + '40',
      stroke: colors.cold,
      rx: 8,
    });
    r.text(cx, cy + 65 * scale, 'COLD', {
      fill: colors.cold,
      fontSize: 14 * scale,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Work output arrow
    r.line(cx + 40 * scale, cy, cx + 80 * scale, cy, {
      stroke: colors.work,
      strokeWidth: 3,
    });
    r.text(cx + 90 * scale, cy + 5 * scale, 'W', {
      fill: colors.work,
      fontSize: 14 * scale,
      fontWeight: 'bold',
    });

    // Heat flow arrows
    r.line(cx, cy - 35 * scale, cx, cy - 50 * scale, {
      stroke: colors.hot,
      strokeWidth: 3,
    });
    r.text(cx + 25 * scale, cy - 45 * scale, 'Q_h', {
      fill: colors.hot,
      fontSize: 12 * scale,
    });

    r.line(cx, cy + 35 * scale, cx, cy + 50 * scale, {
      stroke: colors.cold,
      strokeWidth: 3,
    });
    r.text(cx + 25 * scale, cy + 50 * scale, 'Q_c', {
      fill: colors.cold,
      fontSize: 12 * scale,
    });
  }

  private renderEngineVisualization(r: CommandRenderer): void {
    const cx = 350;
    const cy = 175;

    // Hot reservoir
    r.rect(cx - 80, 80, 160, 50, {
      fill: colors.hot + '30',
      stroke: colors.hot,
      rx: 10,
    });
    r.text(cx, 110, `HOT: ${this.tempHot} K`, {
      fill: colors.hot,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Animated heat flow from hot reservoir
    if (this.isSimulating && this.cyclePhase < 25) {
      const flowIntensity = Math.sin((this.cyclePhase / 25) * Math.PI);
      r.circle(cx, 140 + flowIntensity * 10, 8, {
        fill: colors.hot,
        opacity: 0.8,
      });
    }

    // Engine cylinder
    r.rect(cx - 50, cy - 40, 100, 120, {
      fill: colors.bgCardLight,
      stroke: colors.border,
      rx: 5,
    });

    // Piston
    const pistonY = cy - 30 + this.pistonPosition;
    r.rect(cx - 45, pistonY, 90, 20, {
      fill: colors.textMuted,
      stroke: colors.textPrimary,
      rx: 3,
    });

    // Gas visualization (below piston)
    const gasHeight = (cy + 70) - (pistonY + 20);
    if (gasHeight > 0) {
      r.rect(cx - 45, pistonY + 20, 90, gasHeight, {
        fill: colors.primary + '40',
        stroke: colors.primary,
      });
    }

    // Connecting rod to work output
    r.line(cx, pistonY, cx + 80, cy, {
      stroke: colors.textMuted,
      strokeWidth: 4,
    });

    // Work output wheel
    r.circle(cx + 110, cy, 25, {
      fill: colors.bgCard,
      stroke: colors.work,
      strokeWidth: 3,
    });
    r.text(cx + 110, cy + 5, 'W', {
      fill: colors.work,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Cold reservoir
    r.rect(cx - 80, cy + 80, 160, 50, {
      fill: colors.cold + '30',
      stroke: colors.cold,
      rx: 10,
    });
    r.text(cx, cy + 110, `COLD: ${this.tempCold} K`, {
      fill: colors.cold,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Animated heat flow to cold reservoir
    if (this.isSimulating && this.cyclePhase >= 50 && this.cyclePhase < 75) {
      const flowIntensity = Math.sin(((this.cyclePhase - 50) / 25) * Math.PI);
      r.circle(cx, cy + 65 + flowIntensity * 10, 8, {
        fill: colors.cold,
        opacity: 0.8,
      });
    }

    // Labels if enabled
    if (this.showLabels) {
      r.text(cx - 100, cy, 'Gas Volume:', {
        fill: colors.textMuted,
        fontSize: 10,
        textAnchor: 'end',
      });
      r.text(cx - 100, cy + 15, `${this.gasVolume.toFixed(0)}%`, {
        fill: colors.primary,
        fontSize: 12,
        fontWeight: 'bold',
        textAnchor: 'end',
      });
    }
  }

  private renderReview(r: CommandRenderer): void {
    const isMainReview = this.phase === 'review';

    r.text(350, 50, isMainReview ? 'The Carnot Limit' : 'The Second Law', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (isMainReview) {
      // Main review content
      const concepts = [
        { title: 'Carnot Efficiency', desc: 'Maximum possible: eta = 1 - T_cold/T_hot', color: colors.primary },
        { title: 'Energy Conservation', desc: 'Q_hot = W + Q_cold (First Law)', color: colors.success },
        { title: 'Temperature Matters', desc: 'Greater temperature difference = higher efficiency', color: colors.accent },
      ];

      concepts.forEach((c, i) => {
        r.rect(100, 90 + i * 75, 500, 60, {
          fill: colors.bgCard,
          stroke: c.color,
          rx: 12,
        });
        r.text(120, 115 + i * 75, c.title, {
          fill: c.color,
          fontSize: 16,
          fontWeight: 'bold',
        });
        r.text(120, 135 + i * 75, c.desc, {
          fill: colors.textSecondary,
          fontSize: 12,
        });
      });
    } else {
      // Twist review
      const insights = [
        { title: 'No Perfect Engine', desc: 'Entropy always increases - some heat must be rejected', color: colors.danger },
        { title: 'Absolute Zero Limit', desc: 'T_cold can never reach 0 K (Third Law)', color: colors.cold },
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
    r.text(350, 50, 'The Efficiency Challenge', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 90, 'Can we design an engine that converts ALL heat to work?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 115, '(100% efficiency - no waste heat)', {
      fill: colors.accent,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Illustrate the challenge
    r.rect(200, 150, 300, 120, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });

    r.text(350, 180, 'For eta = 100%:', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 210, '1 - T_cold/T_hot = 1', {
      fill: colors.primary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 240, 'T_cold must equal 0 K!', {
      fill: colors.danger,
      fontSize: 14,
      textAnchor: 'middle',
    });
  }

  private renderTransfer(r: CommandRenderer): void {
    const apps = [
      { name: 'Car Engines', icon: '(car)', desc: 'Internal combustion: ~25-30% efficient' },
      { name: 'Power Plants', icon: '(plant)', desc: 'Steam turbines: ~35-45% efficient' },
      { name: 'Refrigerators', icon: '(fridge)', desc: 'Heat pumps run the cycle in reverse' },
      { name: 'Jet Engines', icon: '(jet)', desc: 'Gas turbines: ~35-40% efficient' },
    ];

    r.text(350, 40, 'Real-World Applications', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // App tabs
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
        fontSize: 12,
        textAnchor: 'middle',
      });
    });

    // Selected app content
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

    r.text(350, 260, 'All bounded by Carnot efficiency!', {
      fill: colors.accent,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Progress indicator
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

      r.text(
        350,
        200,
        passed
          ? "You've mastered heat engine thermodynamics!"
          : 'Review the concepts and try again.',
        {
          fill: colors.textSecondary,
          fontSize: 14,
          textAnchor: 'middle',
        }
      );
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

    // Answer options
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

    r.text(350, 150, 'Thermodynamics Master!', {
      fill: colors.primary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 190, "You've mastered the fundamentals of heat engines.", {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    // Achievement badges
    const badges = [
      { icon: '(heat)', label: 'Carnot Efficiency' },
      { icon: '(law)', label: 'First Law' },
      { icon: '(limit)', label: 'Second Law' },
      { icon: '(app)', label: 'Real Applications' },
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

    // Back button
    if (idx > 0) {
      r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });
    }

    // Phase-specific controls
    switch (this.phase) {
      case 'predict':
        r.addButton({
          id: 'predict_500j',
          label: '500 J (50%)',
          variant: this.prediction === '500j' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_250j',
          label: '250 J (25%)',
          variant: this.prediction === '250j' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_1000j',
          label: '1000 J (100%)',
          variant: this.prediction === '1000j' ? 'primary' : 'secondary',
        });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'See Result', variant: 'success' });
        }
        break;

      case 'play':
      case 'twist_play':
        r.addSlider({
          id: 'temp_hot',
          label: 'Hot Temp (K)',
          value: this.tempHot,
          min: 400,
          max: 1500,
        });
        r.addSlider({
          id: 'temp_cold',
          label: 'Cold Temp (K)',
          value: this.tempCold,
          min: 200,
          max: 500,
        });
        r.addButton({
          id: this.isSimulating ? 'stop' : 'start',
          label: this.isSimulating ? 'Stop' : 'Start',
          variant: 'primary',
        });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
        r.addToggle({
          id: 'labels',
          label: 'Labels',
          value: this.showLabels,
        });
        if (this.cycleCount >= 3 || this.time > 5) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'twist_predict':
        r.addButton({
          id: 'twist_yes',
          label: 'Yes, possible',
          variant: this.twistPrediction === 'yes' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_no',
          label: 'No, impossible',
          variant: this.twistPrediction === 'no' ? 'primary' : 'secondary',
        });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Cars', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Power', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Fridge', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Jets', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
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
          // Answer buttons
          for (let i = 0; i < 4; i++) {
            r.addButton({
              id: `answer_${i}`,
              label: String.fromCharCode(65 + i), // A, B, C, D
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
      tempHot: this.tempHot,
      tempCold: this.tempCold,
      heatInput: this.heatInput,
      efficiency: this.efficiency,
      time: this.time,
      cycleCount: this.cycleCount,
      isSimulating: this.isSimulating,
      showLabels: this.showLabels,
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
    this.tempHot = state.tempHot || 600;
    this.tempCold = state.tempCold || 300;
    this.heatInput = state.heatInput || 1000;
    this.time = state.time || 0;
    this.cycleCount = state.cycleCount || 0;
    this.isSimulating = state.isSimulating || false;
    this.showLabels = state.showLabels ?? true;
    this.testQuestion = state.testQuestion || 0;
    this.testAnswers = state.testAnswers || Array(10).fill(null);
    this.testSubmitted = state.testSubmitted || false;
    this.selectedApp = state.selectedApp || 0;
    this.completedApps = state.completedApps || [false, false, false, false];
    this.guidedMode = state.guidedMode ?? true;
    this.calculateThermodynamics();
  }
}

// === FACTORY FUNCTION ===
// Register this in server.ts: registry.register('heat_engine', createHeatEngineGame);
export function createHeatEngineGame(sessionId: string): HeatEngineGame {
  return new HeatEngineGame(sessionId);
}
