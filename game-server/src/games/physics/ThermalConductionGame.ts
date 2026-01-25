/**
 * Thermal Conduction Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Fourier's Law: Q = -kA(dT/dx)
 * - Thermal conductivity values for various materials
 * - Heat flux calculations
 * - Temperature gradient visualization
 * - Steady-state heat transfer
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
  k: number; // W/(m*K)
  color: string;
}

const materials: Record<string, Material> = {
  copper: { name: 'Copper', k: 385, color: '#f97316' },
  aluminum: { name: 'Aluminum', k: 205, color: '#94a3b8' },
  steel: { name: 'Steel', k: 50, color: '#64748b' },
  glass: { name: 'Glass', k: 1.0, color: '#7dd3fc' },
  wood: { name: 'Wood', k: 0.15, color: '#92400e' },
  air: { name: 'Air', k: 0.024, color: '#dbeafe' },
};

// === TEST QUESTIONS (PROTECTED - never sent to client) ===
const testQuestions: TestQuestion[] = [
  {
    question: 'Fourier\'s Law of heat conduction states Q = -kA(dT/dx). What does k represent?',
    options: ['Temperature', 'Thermal conductivity', 'Heat capacity', 'Area'],
    correctIndex: 1,
  },
  {
    question: 'Which material has the highest thermal conductivity?',
    options: ['Glass', 'Wood', 'Copper', 'Air'],
    correctIndex: 2,
  },
  {
    question: 'A metal spoon feels cold because:',
    options: ['It is colder than air', 'It conducts heat away from your hand quickly', 'It absorbs heat from the air', 'Metal has no heat'],
    correctIndex: 1,
  },
  {
    question: 'Why does a wooden handle stay cool on a hot pan?',
    options: ['Wood is colder', 'Wood has low thermal conductivity', 'Wood absorbs all heat', 'Wood reflects heat'],
    correctIndex: 1,
  },
  {
    question: 'Heat flows from:',
    options: ['Low to high temperature', 'High to low temperature', 'High to high temperature', 'It doesn\'t flow'],
    correctIndex: 1,
  },
  {
    question: 'Doubling the temperature difference across a material:',
    options: ['Halves the heat flow', 'Doubles the heat flow', 'No effect', 'Stops heat flow'],
    correctIndex: 1,
  },
  {
    question: 'An igloo keeps you warm because:',
    options: ['Ice generates heat', 'Trapped air is an excellent insulator', 'Ice reflects body heat', 'Igloos are heated'],
    correctIndex: 1,
  },
  {
    question: 'In steady-state conduction, the temperature profile is:',
    options: ['Exponential', 'Linear', 'Quadratic', 'Random'],
    correctIndex: 1,
  },
  {
    question: 'Fiberglass insulation works by:',
    options: ['Reflecting heat', 'Trapping air pockets', 'Absorbing heat', 'Generating cold'],
    correctIndex: 1,
  },
  {
    question: 'The unit of thermal conductivity is:',
    options: ['Joules', 'Watts per meter-Kelvin', 'Celsius', 'Kilograms'],
    correctIndex: 1,
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
    title: 'CPU Heat Sinks',
    icon: 'chip',
    description: 'Computer processors generate intense heat that must be conducted away to prevent damage.',
    details: 'Copper or aluminum heat sinks with high thermal conductivity transfer heat to fins where air carries it away. Without this, CPUs would overheat in seconds!',
  },
  {
    title: 'Building Insulation',
    icon: 'home',
    description: 'Home insulation uses materials with very low thermal conductivity to reduce heating costs.',
    details: 'Fiberglass (k=0.04) and foam insulation trap air pockets. Air has very low conductivity (k=0.024), making it an excellent insulator.',
  },
  {
    title: 'Cookware Design',
    icon: 'pan',
    description: 'Pots and pans balance heat distribution with handle safety through material choice.',
    details: 'Copper bottoms for even heating, stainless steel for durability, plastic or wood handles to prevent burns. Multi-layer construction optimizes performance.',
  },
  {
    title: 'Thermos Bottles',
    icon: 'bottle',
    description: 'Vacuum flasks minimize all three heat transfer modes to keep drinks hot or cold.',
    details: 'Double-walled with vacuum between (eliminates conduction), silvered surfaces (reduce radiation), sealed cap (stops convection).',
  },
];

// === MAIN GAME CLASS ===

export class ThermalConductionGame extends BaseGame {
  readonly gameType = 'thermal_conduction';
  readonly gameTitle = 'Thermal Conduction';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private selectedMaterial: string = 'copper';
  private hotTemp = 100; // Celsius
  private coldTemp = 0;
  private barLength = 0.1; // meters
  private time = 0;
  private isAnimating = true;
  private showHeatFlow = true;
  private temperatureProfile: number[] = [];

  // Twist state (Igloo paradox)
  private iglooMode = false;
  private insideTempIgloo = -5;
  private outsideTempIgloo = -40;

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
    hook: 'Why does a metal spoon feel colder than a wooden one at the same temperature?',
    predict: 'Which material will conduct heat the fastest?',
    play: 'Experiment with different materials and temperatures. Watch heat flow!',
    review: 'Fourier\'s Law: Q = -kA(dT/dx). Higher k means faster heat transfer!',
    twist_predict: 'Can ice actually keep you warm? Think about igloos...',
    twist_play: 'Explore how trapped air in snow creates an effective insulator!',
    twist_review: 'Igloos work because snow traps air - the best insulator!',
    transfer: 'Thermal conduction is everywhere: from computers to coffee cups.',
    test: 'Test your understanding of heat conduction!',
    mastery: 'You understand thermal conduction and Fourier\'s Law!',
  };

  constructor(sessionId: string) {
    super(sessionId);
    this.updateTemperatureProfile();
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
      message: 'Thermal Conduction lesson started',
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

    // Predictions - correct answer is A (copper)
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }

    // Twist predictions - correct answer is B (trapped air)
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

    // Material selection
    if (id.startsWith('material_')) {
      this.selectedMaterial = id.replace('material_', '');
      this.updateTemperatureProfile();
      return;
    }

    // Simulation controls
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
    if (id === 'heat_flow') {
      this.showHeatFlow = value;
      return;
    }
    if (id === 'animation') {
      this.isAnimating = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'hot_temp') {
      this.hotTemp = value;
      this.updateTemperatureProfile();
      return;
    }
    if (id === 'cold_temp') {
      this.coldTemp = value;
      this.updateTemperatureProfile();
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
   * PROTECTED: Fourier's Law heat transfer rate
   * Q = -kA(dT/dx)
   */
  private calculateHeatFlux(): number {
    const material = materials[this.selectedMaterial];
    const dT = this.hotTemp - this.coldTemp;
    const area = 0.01; // 1 cm^2
    return material.k * area * (dT / this.barLength);
  }

  /**
   * PROTECTED: Calculate temperature at any point along the bar
   * In steady state: linear profile
   */
  private updateTemperatureProfile(): void {
    this.temperatureProfile = [];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const fraction = i / steps;
      const temp = this.hotTemp - (this.hotTemp - this.coldTemp) * fraction;
      this.temperatureProfile.push(temp);
    }
  }

  /**
   * PROTECTED: Get thermal resistance
   * R = L / (kA)
   */
  private calculateThermalResistance(): number {
    const material = materials[this.selectedMaterial];
    const area = 0.01;
    return this.barLength / (material.k * area);
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;

    this.time += deltaTime / 1000;
  }

  private resetSimulation(): void {
    this.time = 0;
    this.isAnimating = true;
    this.updateTemperatureProfile();
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

  // --- HEAT BAR RENDERER ---

  private renderHeatBar(r: CommandRenderer, x: number, y: number, width: number, height: number): void {
    const material = materials[this.selectedMaterial];

    // Temperature gradient
    r.linearGradient('tempGrad', [
      { offset: '0%', color: colors.hot },
      { offset: '100%', color: colors.cold },
    ]);

    // Bar background
    r.rect(x, y, width, height, { fill: material.color, stroke: colors.border, strokeWidth: 2, rx: 4 });

    // Temperature overlay
    r.rect(x, y, width, height, { fill: 'url(#tempGrad)', opacity: 0.5, rx: 4 });

    // Heat source (left)
    r.rect(x - 30, y - 10, 30, height + 20, { fill: colors.hot, rx: 4 });
    r.text(x - 15, y + height / 2 + 5, `${this.hotTemp}°C`, { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });

    // Cold sink (right)
    r.rect(x + width, y - 10, 30, height + 20, { fill: colors.cold, rx: 4 });
    r.text(x + width + 15, y + height / 2 + 5, `${this.coldTemp}°C`, { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });

    // Heat flow arrows
    if (this.showHeatFlow) {
      const heatFlux = this.calculateHeatFlux();
      const arrowCount = Math.min(Math.floor(heatFlux / 10) + 1, 5);

      for (let i = 0; i < arrowCount; i++) {
        const arrowX = x + 30 + i * (width - 60) / arrowCount;
        const offset = (Math.sin(this.time * 3 + i) * 5);
        r.text(arrowX + offset, y + height / 2, '→', {
          fill: colors.warning,
          fontSize: 16,
          textAnchor: 'middle',
        });
      }
    }

    // Temperature markers
    for (let i = 0; i <= 10; i++) {
      const markerX = x + (i / 10) * width;
      const temp = this.temperatureProfile[i];
      if (i % 2 === 0) {
        r.line(markerX, y + height, markerX, y + height + 8, { stroke: colors.textMuted, strokeWidth: 1 });
        r.text(markerX, y + height + 20, `${temp.toFixed(0)}°`, {
          fill: colors.textMuted,
          fontSize: 9,
          textAnchor: 'middle',
        });
      }
    }
  }

  // --- PHASE RENDERERS ---

  private renderHookPhase(r: CommandRenderer): void {
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.circle(295, 44, 4, { fill: colors.primary });
    r.text(350, 49, 'HEAT TRANSFER', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, 'The Hot Spoon Mystery', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'Why does metal feel colder than wood at the same temperature?', {
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

    // Hand touching spoons illustration
    r.ellipse(350, 260, 80, 50, { fill: '#fcd9b6' }); // Hand

    // Metal spoon
    r.rect(200, 250, 80, 15, { fill: '#94a3b8', rx: 4 });
    r.text(240, 290, 'Metal', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
    r.text(240, 305, '"Feels cold"', { fill: colors.cold, fontSize: 10, textAnchor: 'middle' });

    // Wooden spoon
    r.rect(420, 250, 80, 15, { fill: '#92400e', rx: 4 });
    r.text(460, 290, 'Wood', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
    r.text(460, 305, '"Feels warm"', { fill: colors.hot, fontSize: 10, textAnchor: 'middle' });

    r.text(350, 350, 'Both are at room temperature!', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 375, 'So why do they feel different?', {
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
    r.text(350, 115, 'If you place these materials between a hot and cold source,', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'which will transfer heat the FASTEST?', {
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
        ? 'Correct! Copper has the highest thermal conductivity (k = 385 W/m·K)!'
        : 'Not quite. Copper is the best conductor among these choices.',
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
    r.text(350, 30, 'Thermal Conduction Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 50, 500, 180, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    this.renderHeatBar(r, 150, 100, 400, 50);

    // Material info
    const material = materials[this.selectedMaterial];
    r.text(350, 200, `Material: ${material.name}`, {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 220, `Thermal Conductivity: k = ${material.k} W/(m·K)`, {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Stats panel
    r.rect(100, 250, 500, 100, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });

    const heatFlux = this.calculateHeatFlux();
    const resistance = this.calculateThermalResistance();

    r.text(200, 280, 'Heat Flow Rate:', { fill: colors.textSecondary, fontSize: 12 });
    r.text(200, 305, `${heatFlux.toFixed(1)} W`, { fill: colors.warning, fontSize: 18, fontWeight: 'bold' });

    r.text(400, 280, 'Thermal Resistance:', { fill: colors.textSecondary, fontSize: 12 });
    r.text(400, 305, `${resistance.toFixed(2)} K/W`, { fill: colors.accent, fontSize: 18, fontWeight: 'bold' });

    r.text(350, 340, 'Higher k = faster heat transfer = lower thermal resistance', {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Fourier\'s Law of Heat Conduction', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Main formula card
    r.rect(150, 70, 400, 80, { fill: '#7f1d1d40', stroke: colors.hot, rx: 16 });
    r.text(350, 100, 'Q = -kA(dT/dx)', {
      fill: colors.hot,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 130, 'Heat Flow = Conductivity × Area × Temperature Gradient', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });

    // Variable explanations
    const variables = [
      { symbol: 'Q', meaning: 'Heat flow rate (Watts)', color: colors.warning },
      { symbol: 'k', meaning: 'Thermal conductivity (W/m·K)', color: colors.primary },
      { symbol: 'A', meaning: 'Cross-sectional area (m²)', color: colors.accent },
      { symbol: 'dT/dx', meaning: 'Temperature gradient (K/m)', color: colors.success },
    ];

    variables.forEach((v, i) => {
      const y = 170 + i * 40;
      r.rect(150, y, 400, 35, { fill: colors.bgCard, rx: 8 });
      r.text(180, y + 22, v.symbol, { fill: v.color, fontSize: 14, fontWeight: 'bold' });
      r.text(230, y + 22, v.meaning, { fill: colors.textSecondary, fontSize: 12 });
    });

    r.text(350, 350, 'Metal conducts heat away from your hand quickly - feeling "cold"!', {
      fill: colors.textPrimary,
      fontSize: 13,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Igloo Paradox', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 120, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'In the Arctic, people build shelters from ice and snow.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 150, 'Outside: -40°C | Inside igloo: -5°C', {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 180, 'How does ice keep people WARM?', {
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
        ? 'Exactly! Snow traps tiny air pockets - air is an excellent insulator!'
        : 'Think about what makes snow different from solid ice.',
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
    r.text(350, 30, 'Igloo Insulation', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 50, 500, 240, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    // Igloo cross-section
    r.arc(350, 240, 120, 0, Math.PI, { fill: '#dbeafe', stroke: '#93c5fd', strokeWidth: 3 });

    // Snow structure with air pockets
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI;
      const radius = 80 + Math.random() * 35;
      const x = 350 + Math.cos(angle) * radius;
      const y = 240 - Math.sin(angle) * radius;
      r.circle(x, y, 3 + Math.random() * 4, { fill: '#ffffff', opacity: 0.6 });
    }

    // Temperature labels
    r.text(180, 150, '-40°C', { fill: colors.cold, fontSize: 14, fontWeight: 'bold' });
    r.text(520, 150, '-40°C', { fill: colors.cold, fontSize: 14, fontWeight: 'bold' });
    r.text(350, 200, '-5°C', { fill: colors.warning, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Person inside
    r.circle(350, 220, 15, { fill: '#fcd9b6' });
    r.rect(340, 235, 20, 30, { fill: '#3b82f6', rx: 4 });

    // Explanation
    r.rect(100, 310, 500, 90, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(350, 340, 'Snow is 95% air by volume!', { fill: colors.warning, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 365, 'Air (k = 0.024) is one of the best insulators', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 385, 'Trapped air pockets prevent heat conduction', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 250, { fill: '#0c4a6e40', stroke: colors.accent, rx: 16 });
    r.text(350, 110, 'Air: Nature\'s Best Insulator', {
      fill: colors.accent,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const facts = [
      'Air has very low thermal conductivity (k = 0.024 W/m·K)',
      'This is why we use air gaps in double-pane windows',
      'Fiberglass insulation works by trapping air',
      'Down jackets trap air in feathers',
      'Foam insulation is full of tiny air bubbles',
    ];

    facts.forEach((fact, i) => {
      r.text(130, 145 + i * 30, '* ' + fact, { fill: colors.textSecondary, fontSize: 12 });
    });

    r.text(350, 310, 'The best insulator is often just trapped air!', {
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

    r.text(350, 200, passed ? "Excellent! You've mastered thermal conduction!" : 'Keep studying! Review and try again.', {
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

    r.text(350, 130, 'Heat Transfer Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, "You understand thermal conduction and Fourier's Law!", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'Q', label: 'Fourier\'s Law' },
      { icon: 'k', label: 'Conductivity' },
      { icon: 'ins', label: 'Insulation' },
      { icon: 'app', label: 'Applications' },
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
        r.addButton({ id: 'predict_A', label: 'A. Copper (metal)', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Glass', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Wood', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. Air', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Explore the Physics', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'hot_temp', label: 'Hot Side (°C)', value: this.hotTemp, min: 50, max: 200 });
        r.addSlider({ id: 'cold_temp', label: 'Cold Side (°C)', value: this.coldTemp, min: -20, max: 30 });
        r.addButton({ id: 'material_copper', label: 'Copper', variant: this.selectedMaterial === 'copper' ? 'primary' : 'ghost' });
        r.addButton({ id: 'material_steel', label: 'Steel', variant: this.selectedMaterial === 'steel' ? 'primary' : 'ghost' });
        r.addButton({ id: 'material_glass', label: 'Glass', variant: this.selectedMaterial === 'glass' ? 'primary' : 'ghost' });
        r.addButton({ id: 'material_wood', label: 'Wood', variant: this.selectedMaterial === 'wood' ? 'primary' : 'ghost' });
        r.addToggle({ id: 'heat_flow', label: 'Heat Flow', value: this.showHeatFlow, onLabel: 'ON', offLabel: 'OFF' });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Discover the Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Ice reflects heat', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Trapped air insulates', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Body heat melts ice', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D. Snow generates heat', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See the Igloo', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addButton({ id: 'next', label: 'Review Discovery', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real-World Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'CPU', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Insulation', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Cookware', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Thermos', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
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
      hotTemp: this.hotTemp,
      coldTemp: this.coldTemp,
      showHeatFlow: this.showHeatFlow,
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
    this.selectedMaterial = (state.selectedMaterial as string) || 'copper';
    this.hotTemp = (state.hotTemp as number) || 100;
    this.coldTemp = (state.coldTemp as number) || 0;
    this.showHeatFlow = (state.showHeatFlow as boolean) ?? true;
    this.isAnimating = (state.isAnimating as boolean) ?? true;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
    this.updateTemperatureProfile();
  }
}

// === FACTORY FUNCTION ===

export function createThermalConductionGame(sessionId: string): ThermalConductionGame {
  return new ThermalConductionGame(sessionId);
}
