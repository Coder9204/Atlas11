/**
 * Viscosity vs Temperature Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP - Physics Formulas:
 * - Arrhenius viscosity model: eta = A * exp(Ea / RT)
 * - Simplified: viscosity = baseVisc * exp(-activationFactor * T)
 * - Multi-grade oil behavior: reduced temperature sensitivity
 * - Flow rate inversely proportional to viscosity
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
    question: 'How does viscosity typically change when temperature increases?',
    options: [
      'Viscosity increases linearly',
      'Viscosity decreases exponentially',
      'Viscosity stays constant',
      'Viscosity oscillates',
    ],
    correctIndex: 1,
  },
  {
    question: 'What physical property does viscosity measure?',
    options: [
      'How fast a fluid evaporates',
      'How much a fluid resists flowing',
      'The density of a fluid',
      'The temperature of a fluid',
    ],
    correctIndex: 1,
  },
  {
    question: 'Why do car engines use different oil viscosities for summer and winter?',
    options: [
      'Summer oil is cheaper',
      'Cold temperatures make oil thicker, requiring lower viscosity grades',
      'Hot temperatures make oil evaporate faster',
      'It makes no difference',
    ],
    correctIndex: 1,
  },
  {
    question: 'The Arrhenius equation for viscosity involves what mathematical function?',
    options: [
      'Linear function',
      'Exponential function',
      'Logarithmic function',
      'Quadratic function',
    ],
    correctIndex: 1,
  },
  {
    question: 'What is the main advantage of multi-grade motor oil (e.g., 10W-40)?',
    options: [
      'It costs less than single-grade oil',
      'It maintains more consistent viscosity across temperatures',
      'It lasts longer before needing changes',
      'It is better for racing engines only',
    ],
    correctIndex: 1,
  },
  {
    question: 'At molecular level, why does heating reduce viscosity?',
    options: [
      'Molecules evaporate faster',
      'Molecules move faster and overcome intermolecular forces more easily',
      'Molecules become smaller',
      'Molecules bond more tightly',
    ],
    correctIndex: 1,
  },
  {
    question: 'Honey flows slowly because it has:',
    options: [
      'Low viscosity',
      'High viscosity',
      'High density only',
      'Low temperature only',
    ],
    correctIndex: 1,
  },
  {
    question: 'What happens to engine wear if oil viscosity is too low at operating temperature?',
    options: [
      'Wear decreases because oil flows better',
      'Wear increases because oil film is too thin',
      'No effect on wear',
      'Engine runs cooler',
    ],
    correctIndex: 1,
  },
  {
    question: 'The "W" in oil ratings like 5W-30 stands for:',
    options: [
      'Weight',
      'Winter (cold viscosity rating)',
      'Water resistance',
      'Warranty',
    ],
    correctIndex: 1,
  },
  {
    question: 'Which fluid would have the steepest viscosity-temperature curve?',
    options: [
      'Water',
      'A heavy oil with high activation energy',
      'A multi-grade synthetic oil',
      'Mercury',
    ],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#8b5cf6', // Purple
  primaryDark: '#7c3aed',
  accent: '#06b6d4', // Cyan
  accentDark: '#0891b2',
  hot: '#ef4444', // Red for hot
  cold: '#3b82f6', // Blue for cold
  oil: '#f59e0b', // Amber for oil
  oilDark: '#d97706',
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

export class ViscosityTemperatureGame extends BaseGame {
  readonly gameType = 'viscosity_temperature';
  readonly gameTitle = 'Viscosity vs Temperature';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state (PROTECTED - server only)
  private time = 0;
  private isSimulating = false;

  // Temperature control
  private temperature = 20; // Celsius
  private oilType: 'regular' | 'multigrade' = 'regular';

  // Calculated values (PROTECTED - computed on server)
  private viscosity = 0;
  private flowRate = 0;
  private dropY = 50;

  // Animation state
  private animationTime = 0;
  private showLabels = true;
  private flowParticles: { x: number; y: number; speed: number }[] = [];

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
    twist_play: 'Multi-Grade Oil',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Ever wonder why honey flows slowly but water flows easily?',
    predict: 'What happens to oil viscosity when we heat it up?',
    play: 'Adjust the temperature and watch how viscosity changes!',
    review: 'The Arrhenius equation explains this exponential relationship.',
    twist_predict: 'Can we make oil that works well at all temperatures?',
    twist_play: 'Compare regular oil to multi-grade synthetic oil!',
    twist_review: 'Multi-grade oils use polymer additives to reduce temperature sensitivity.',
    transfer: 'Viscosity matters in engines, cooking, and manufacturing.',
    test: 'Test your understanding of viscosity and temperature!',
    mastery: 'You now understand the molecular physics of fluid flow!',
  };

  constructor(sessionId: string) {
    super(sessionId);
    this.calculateViscosity();
    this.initFlowParticles();
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
      message: 'Viscosity Temperature lesson started',
    });
  }

  // === PROTECTED PHYSICS CALCULATIONS ===

  /**
   * PROTECTED: Calculate viscosity using Arrhenius-like model
   * These formulas are the core IP - never sent to client
   */
  private calculateViscosity(): void {
    // Arrhenius viscosity model (simplified)
    // eta = A * exp(Ea / RT) -> simplified to baseVisc * exp(-activationFactor * T)
    if (this.oilType === 'regular') {
      // Regular oil: strong temperature dependence
      const baseVisc = 1000; // centipoise at 0C
      const activationFactor = 0.03;
      this.viscosity = baseVisc * Math.exp(-activationFactor * this.temperature);
    } else {
      // Multi-grade oil: reduced temperature sensitivity
      const baseVisc = 300;
      const activationFactor = 0.015; // Half the sensitivity
      this.viscosity = baseVisc * Math.exp(-activationFactor * this.temperature);
    }

    // Clamp to reasonable range
    this.viscosity = clamp(this.viscosity, 5, 2000);

    // Flow rate inversely proportional to viscosity
    this.flowRate = 1000 / this.viscosity;
  }

  /**
   * PROTECTED: Calculate viscosity for a given temperature
   */
  private getViscosityAt(tempC: number, type: 'regular' | 'multigrade'): number {
    if (type === 'regular') {
      return 1000 * Math.exp(-0.03 * tempC);
    } else {
      return 300 * Math.exp(-0.015 * tempC);
    }
  }

  private initFlowParticles(): void {
    this.flowParticles = [];
    for (let i = 0; i < 20; i++) {
      this.flowParticles.push({
        x: Math.random() * 40 + 10,
        y: Math.random() * 100,
        speed: 0.5 + Math.random() * 0.5,
      });
    }
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

    // Oil type toggle
    if (id === 'oil_regular') {
      this.oilType = 'regular';
      this.calculateViscosity();
      return;
    }
    if (id === 'oil_multigrade') {
      this.oilType = 'multigrade';
      this.calculateViscosity();
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
    if (id === 'temperature') {
      this.temperature = clamp(value, -20, 120);
      this.calculateViscosity();
      this.emitCoachEvent('value_changed', { temperature: this.temperature, viscosity: this.viscosity });
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
      hook: 'Viscosity is the internal friction in a fluid.',
      predict: 'Think about honey - is it easier to pour when cold or warm?',
      play: 'Watch how the flow rate changes with temperature.',
      review: 'The exponential relationship comes from molecular energy barriers.',
      twist_predict: 'Multi-grade oils are engineered with special additives.',
      twist_play: 'Compare how the two oil types respond to temperature.',
      twist_review: 'Polymers expand when heated, maintaining viscosity.',
      transfer: 'Consider how temperature affects oil in your car engine.',
      test: 'Remember: higher temperature = lower viscosity for most fluids.',
      mastery: 'You understand the physics of viscosity and temperature!',
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

  // === PHYSICS SIMULATION (PROTECTED - runs on server only) ===

  update(deltaTime: number): void {
    if (!this.isSimulating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play') return;

    this.time += deltaTime / 1000;
    this.animationTime += deltaTime;

    // Update flow particles based on viscosity
    const particleSpeed = this.flowRate * 0.02;
    for (const particle of this.flowParticles) {
      particle.y += particleSpeed * particle.speed * (deltaTime / 16);
      if (particle.y > 100) {
        particle.y = 0;
        particle.x = Math.random() * 40 + 10;
      }
    }

    // Animate oil drop
    this.dropY += particleSpeed * (deltaTime / 16) * 0.5;
    if (this.dropY > 250) {
      this.dropY = 50;
    }
  }

  private resetSimulation(): void {
    this.time = 0;
    this.animationTime = 0;
    this.isSimulating = false;
    this.dropY = 50;
    this.calculateViscosity();
    this.initFlowParticles();
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
    r.text(350, 60, 'Viscosity & Temperature', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 95, 'Why does honey flow slowly but water flows easily?', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    // Illustration: thick vs thin fluid
    this.renderFluidComparison(r, 350, 200);

    r.text(350, 320, 'How does temperature change the flow?', {
      fill: colors.primary,
      fontSize: 14,
      textAnchor: 'middle',
    });
  }

  private renderFluidComparison(r: CommandRenderer, cx: number, cy: number): void {
    // Honey (high viscosity)
    r.rect(cx - 150, cy - 60, 80, 120, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 8,
    });
    r.text(cx - 110, cy - 40, 'Honey', {
      fill: colors.oil,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.ellipse(cx - 110, cy + 10, 25, 35, {
      fill: colors.oil + '80',
    });
    r.text(cx - 110, cy + 50, 'High Viscosity', {
      fill: colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle',
    });

    // Water (low viscosity)
    r.rect(cx + 70, cy - 60, 80, 120, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 8,
    });
    r.text(cx + 110, cy - 40, 'Water', {
      fill: colors.accent,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.ellipse(cx + 110, cy + 10, 25, 15, {
      fill: colors.accent + '80',
    });
    r.text(cx + 110, cy + 50, 'Low Viscosity', {
      fill: colors.textMuted,
      fontSize: 10,
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

    r.text(350, 90, 'You have a bottle of motor oil at room temperature (20C).', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 115, 'What happens to its viscosity when you heat it to 100C?', {
      fill: colors.accent,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Visual diagram
    this.renderOilBottle(r, 250, 220, 20, 'Cold');
    r.text(350, 220, '->', { fill: colors.textMuted, fontSize: 30, textAnchor: 'middle' });
    this.renderOilBottle(r, 450, 220, 100, 'Hot');
  }

  private renderOilBottle(r: CommandRenderer, x: number, y: number, temp: number, label: string): void {
    const isHot = temp > 50;
    r.rect(x - 30, y - 50, 60, 100, {
      fill: colors.bgCard,
      stroke: isHot ? colors.hot : colors.cold,
      rx: 10,
    });
    r.ellipse(x, y, 20, 30, {
      fill: colors.oil + (isHot ? '60' : 'a0'),
    });
    r.text(x, y + 60, `${temp}C`, {
      fill: isHot ? colors.hot : colors.cold,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(x, y - 60, label, {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderPlay(r: CommandRenderer): void {
    const isTwist = this.phase === 'twist_play';

    // Temperature gauge
    this.renderTemperatureGauge(r, 80, 175);

    // Viscosity visualization
    this.renderViscosityTube(r, 350, 175);

    // Stats panel
    r.rect(500, 40, 180, 120, {
      fill: colors.bgCard + 'cc',
      stroke: colors.border,
      rx: 8,
    });

    r.text(510, 65, `Temperature: ${this.temperature.toFixed(0)}C`, {
      fill: this.temperature > 50 ? colors.hot : colors.cold,
      fontSize: 14,
      fontWeight: 'bold',
    });

    r.text(510, 90, `Viscosity: ${this.viscosity.toFixed(0)} cP`, {
      fill: colors.oil,
      fontSize: 14,
      fontWeight: 'bold',
    });

    r.text(510, 115, `Flow Rate: ${this.flowRate.toFixed(2)}`, {
      fill: colors.success,
      fontSize: 12,
    });

    if (isTwist) {
      r.text(510, 140, `Oil Type: ${this.oilType === 'regular' ? 'Regular' : 'Multi-Grade'}`, {
        fill: colors.primary,
        fontSize: 12,
      });
    }

    // Flow visualization
    if (this.showLabels) {
      r.text(350, 310, this.viscosity > 200 ? 'Thick - Slow Flow' : 'Thin - Fast Flow', {
        fill: colors.textMuted,
        fontSize: 12,
        textAnchor: 'middle',
      });
    }
  }

  private renderTemperatureGauge(r: CommandRenderer, x: number, y: number): void {
    // Thermometer
    r.rect(x - 15, y - 100, 30, 200, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 15,
    });

    // Mercury/fill level based on temperature
    const fillHeight = lerp(10, 180, (this.temperature + 20) / 140);
    const fillColor = this.temperature > 50 ? colors.hot : colors.cold;

    r.rect(x - 10, y + 100 - fillHeight, 20, fillHeight, {
      fill: fillColor,
      rx: 10,
    });

    // Temperature marks
    for (let t = -20; t <= 120; t += 20) {
      const markY = y + 100 - lerp(10, 180, (t + 20) / 140);
      r.line(x + 15, markY, x + 25, markY, {
        stroke: colors.textMuted,
        strokeWidth: 1,
      });
      r.text(x + 35, markY + 4, `${t}`, {
        fill: colors.textMuted,
        fontSize: 10,
      });
    }
  }

  private renderViscosityTube(r: CommandRenderer, x: number, y: number): void {
    // Funnel/tube for viscosity demonstration
    r.rect(x - 40, y - 100, 80, 200, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 10,
    });

    // Oil inside with flow particles
    const oilOpacity = clamp(this.viscosity / 500, 0.3, 0.9);
    r.rect(x - 35, y - 95, 70, 190, {
      fill: colors.oil + Math.floor(oilOpacity * 255).toString(16).padStart(2, '0'),
      rx: 8,
    });

    // Flow particles
    for (const particle of this.flowParticles) {
      const py = y - 95 + particle.y * 1.9;
      const px = x - 35 + particle.x;
      r.circle(px, py, 3, {
        fill: colors.oilDark,
        opacity: 0.8,
      });
    }

    // Oil drop below tube
    const dropSize = lerp(8, 3, this.flowRate / 2);
    r.ellipse(x, this.dropY + y, dropSize, dropSize * 1.3, {
      fill: colors.oil,
    });
  }

  private renderReview(r: CommandRenderer): void {
    const isMainReview = this.phase === 'review';

    r.text(350, 50, isMainReview ? 'The Arrhenius Relationship' : 'Multi-Grade Oil Technology', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (isMainReview) {
      const concepts = [
        { title: 'Exponential Decay', desc: 'Viscosity decreases exponentially with temperature', color: colors.primary },
        { title: 'Molecular Motion', desc: 'Higher temp = faster molecules = easier flow', color: colors.success },
        { title: 'Arrhenius Equation', desc: 'eta = A * exp(Ea/RT) describes this behavior', color: colors.accent },
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
      const insights = [
        { title: 'Polymer Additives', desc: 'Long-chain polymers expand when heated, thickening the oil', color: colors.primary },
        { title: 'Viscosity Index', desc: 'Multi-grade oils have higher VI - more stable viscosity', color: colors.success },
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

      // Comparison chart
      this.renderViscosityCurves(r, 350, 280);
    }
  }

  private renderViscosityCurves(r: CommandRenderer, cx: number, cy: number): void {
    // Mini graph comparing regular vs multi-grade
    r.rect(cx - 120, cy - 40, 240, 80, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 8,
    });

    r.text(cx, cy - 25, 'Viscosity vs Temperature', {
      fill: colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle',
    });

    // Regular oil curve (steep)
    r.line(cx - 100, cy - 10, cx + 100, cy + 25, {
      stroke: colors.danger,
      strokeWidth: 2,
    });

    // Multi-grade curve (flatter)
    r.line(cx - 100, cy, cx + 100, cy + 10, {
      stroke: colors.success,
      strokeWidth: 2,
    });

    r.text(cx - 80, cy + 35, 'Regular', { fill: colors.danger, fontSize: 9 });
    r.text(cx + 60, cy + 35, 'Multi-Grade', { fill: colors.success, fontSize: 9 });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 50, 'The Engineering Challenge', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 90, 'Car engines operate from cold starts (-20C) to hot running (120C).', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 120, 'Can we design oil that works well at ALL temperatures?', {
      fill: colors.accent,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(200, 150, 300, 100, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });

    r.text(350, 185, 'The Problem:', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 210, 'Cold: need thin oil to start', {
      fill: colors.cold,
      fontSize: 12,
      textAnchor: 'middle',
    });

    r.text(350, 230, 'Hot: need thick oil to protect', {
      fill: colors.hot,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTransfer(r: CommandRenderer): void {
    const apps = [
      { name: 'Engines', desc: 'Oil viscosity protects moving parts' },
      { name: 'Cooking', desc: 'Hot oil flows better for frying' },
      { name: 'Hydraulics', desc: 'Viscosity affects power transmission' },
      { name: 'Printing', desc: 'Ink viscosity affects print quality' },
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
        fontSize: 12,
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

      r.text(350, 200, passed ? 'You understand viscosity and temperature!' : 'Review the concepts and try again.', {
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

    r.text(350, 150, 'Viscosity Master!', {
      fill: colors.primary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 190, 'You understand the molecular physics of fluid flow.', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: '(temp)', label: 'Temperature Effects' },
      { icon: '(flow)', label: 'Flow Dynamics' },
      { icon: '(oil)', label: 'Multi-Grade Tech' },
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
          id: 'predict_decrease',
          label: 'Decreases',
          variant: this.prediction === 'decrease' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_same',
          label: 'Stays Same',
          variant: this.prediction === 'same' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_increase',
          label: 'Increases',
          variant: this.prediction === 'increase' ? 'primary' : 'secondary',
        });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'See Result', variant: 'success' });
        }
        break;

      case 'play':
      case 'twist_play':
        r.addSlider({
          id: 'temperature',
          label: 'Temperature (C)',
          value: this.temperature,
          min: -20,
          max: 120,
        });
        if (this.phase === 'twist_play') {
          r.addButton({
            id: 'oil_regular',
            label: 'Regular',
            variant: this.oilType === 'regular' ? 'primary' : 'secondary',
          });
          r.addButton({
            id: 'oil_multigrade',
            label: 'Multi-Grade',
            variant: this.oilType === 'multigrade' ? 'primary' : 'secondary',
          });
        }
        r.addButton({
          id: this.isSimulating ? 'stop' : 'start',
          label: this.isSimulating ? 'Stop' : 'Start',
          variant: 'primary',
        });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
        r.addToggle({ id: 'labels', label: 'Labels', value: this.showLabels });
        if (this.time > 3) {
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
        r.addButton({ id: 'app_0', label: 'Engines', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Cooking', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Hydraulics', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Printing', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
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
      temperature: this.temperature,
      oilType: this.oilType,
      viscosity: this.viscosity,
      flowRate: this.flowRate,
      time: this.time,
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
    this.temperature = state.temperature || 20;
    this.oilType = state.oilType || 'regular';
    this.time = state.time || 0;
    this.isSimulating = state.isSimulating || false;
    this.showLabels = state.showLabels ?? true;
    this.testQuestion = state.testQuestion || 0;
    this.testAnswers = state.testAnswers || Array(10).fill(null);
    this.testSubmitted = state.testSubmitted || false;
    this.selectedApp = state.selectedApp || 0;
    this.completedApps = state.completedApps || [false, false, false, false];
    this.guidedMode = state.guidedMode ?? true;
    this.calculateViscosity();
  }
}

// === FACTORY FUNCTION ===
export function createViscosityTemperatureGame(sessionId: string): ViscosityTemperatureGame {
  return new ViscosityTemperatureGame(sessionId);
}
