/**
 * Shear Thinning Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Shear-thinning (pseudoplastic) fluid behavior
 * - Power-law viscosity model: eta = K * (shear_rate)^(n-1) where n < 1
 * - Apparent viscosity decreases with increasing shear rate
 * - Thixotropic vs shear-thinning distinction
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
    question: 'What happens to a shear-thinning fluid when you apply more force?',
    options: ['It gets thicker', 'It gets thinner (flows more easily)', 'It stays the same', 'It becomes solid'],
    correctIndex: 1,
  },
  {
    question: 'In the power-law model eta = K * gamma^(n-1), what value of n indicates shear thinning?',
    options: ['n > 1', 'n < 1', 'n = 1', 'n = 0'],
    correctIndex: 1,
  },
  {
    question: 'Why does ketchup flow easily when shaken but not when at rest?',
    options: [
      'It heats up when shaken',
      'The polymer chains align under shear stress',
      'Gravity affects it differently',
      'The bottle changes shape',
    ],
    correctIndex: 1,
  },
  {
    question: 'Which of these is a shear-thinning fluid?',
    options: ['Water', 'Honey', 'Blood', 'Olive oil'],
    correctIndex: 2,
  },
  {
    question: 'What is the main difference between shear-thinning and thixotropic fluids?',
    options: [
      'Thixotropic fluids are time-dependent',
      'Shear-thinning fluids are time-dependent',
      'They are the same thing',
      'Thixotropic fluids get thicker under shear',
    ],
    correctIndex: 0,
  },
  {
    question: 'Why is shear-thinning behavior beneficial for paint?',
    options: [
      'Makes it dry faster',
      'Flows smoothly when brushed but stays put on walls',
      'Makes colors brighter',
      'Prevents rust',
    ],
    correctIndex: 1,
  },
  {
    question: 'At the molecular level, shear thinning occurs because:',
    options: [
      'Molecules heat up',
      'Long polymer chains align in the flow direction',
      'Molecules break apart',
      'New bonds form',
    ],
    correctIndex: 1,
  },
  {
    question: 'A Newtonian fluid has a flow index (n) of:',
    options: ['n = 0', 'n < 1', 'n = 1', 'n > 1'],
    correctIndex: 2,
  },
  {
    question: 'Which biological fluid exhibits shear-thinning behavior?',
    options: ['Sweat', 'Tears', 'Blood', 'Urine'],
    correctIndex: 2,
  },
  {
    question: 'Toothpaste is designed to be shear-thinning so that:',
    options: [
      'It tastes better',
      'It comes out of the tube easily but stays on the brush',
      'It kills more bacteria',
      'It foams more',
    ],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#8b5cf6',
  primaryDark: '#7c3aed',
  accent: '#f59e0b',
  accentDark: '#d97706',
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
  fluid: '#a855f7',
  fluidHighShear: '#22d3ee',
  polymer: '#f472b6',
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
    title: 'Paint Technology',
    icon: 'paint',
    description: 'Modern paints are engineered to be shear-thinning: they flow smoothly under brush strokes but resist dripping on vertical surfaces.',
    details: 'Latex paints contain polymer particles that align during brushing (high shear) but tangle at rest, providing excellent coverage without runs.',
  },
  {
    title: 'Blood Circulation',
    icon: 'heart',
    description: 'Blood is a natural shear-thinning fluid. It flows easily through narrow capillaries where shear rates are high.',
    details: 'Red blood cells deform and align in capillaries, reducing viscosity by up to 50%. This is essential for efficient oxygen delivery.',
  },
  {
    title: 'Toothpaste',
    icon: 'tooth',
    description: 'Toothpaste must squeeze out easily but stay on your brush. Shear-thinning makes this possible.',
    details: 'The gel contains silica particles in a polymer matrix. Squeezing creates high shear (flows), but on the brush (low shear) it holds its shape.',
  },
  {
    title: '3D Printing Inks',
    icon: 'printer',
    description: 'Specialized 3D printing inks use shear-thinning to flow through tiny nozzles but solidify once deposited.',
    details: 'Bioinks for tissue engineering exploit this: they flow through needles but maintain shape for scaffolds. Shear thinning enables precise layer-by-layer construction.',
  },
];

// === MAIN GAME CLASS ===

export class ShearThinningGame extends BaseGame {
  readonly gameType = 'shear_thinning';
  readonly gameTitle = 'Shear Thinning';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private shearRate = 0;
  private appliedForce = 0;
  private isStirring = false;
  private viscosity = 100;
  private time = 0;
  private polymerAlignment = 0;

  // PROTECTED: Physics constants
  private readonly K = 100; // consistency index
  private readonly n = 0.5; // flow behavior index (n < 1 = shear thinning)

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
    hook: 'Have you ever noticed how ketchup refuses to flow, then suddenly rushes out? That\'s shear thinning!',
    predict: 'Think about what happens to thick fluids when you stir them vigorously...',
    play: 'Experiment with different stirring speeds. Watch how viscosity changes!',
    review: 'The power-law model explains shear thinning: eta = K * gamma^(n-1) where n < 1.',
    twist_predict: 'Some fluids recover their thickness slowly over time. Is this the same as shear thinning?',
    twist_play: 'Compare immediate shear-thinning with time-dependent thixotropic behavior.',
    twist_review: 'Shear-thinning is instantaneous; thixotropy depends on time history.',
    transfer: 'From blood to 3D printing, shear-thinning fluids are everywhere in technology.',
    test: 'Test your understanding of non-Newtonian fluid behavior!',
    mastery: 'You now understand why some fluids get thinner when you work them!',
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
      message: 'Shear Thinning lesson started',
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

    if (id === 'start_stir') {
      this.isStirring = true;
      return;
    }
    if (id === 'stop_stir') {
      this.isStirring = false;
      return;
    }
    if (id === 'reset') {
      this.resetSimulation();
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'stirring') {
      this.isStirring = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'force') {
      this.appliedForce = value;
      this.updateViscosity();
      return;
    }
    if (id === 'shear_rate') {
      this.shearRate = value;
      this.updateViscosity();
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
   * PROTECTED: Power-law viscosity calculation
   * eta = K * (shear_rate)^(n-1) where n < 1 for shear thinning
   */
  private calculateViscosity(shearRate: number): number {
    if (shearRate <= 0.1) return this.K; // At rest, maximum viscosity
    return this.K * Math.pow(shearRate, this.n - 1);
  }

  /**
   * PROTECTED: Polymer chain alignment calculation
   * Higher shear = more alignment = lower viscosity
   */
  private calculatePolymerAlignment(shearRate: number): number {
    // Alignment increases with shear rate, asymptotically approaching 1
    return 1 - Math.exp(-shearRate / 50);
  }

  private updateViscosity(): void {
    this.shearRate = this.appliedForce * 10; // Scale force to shear rate
    this.viscosity = this.calculateViscosity(this.shearRate);
    this.polymerAlignment = this.calculatePolymerAlignment(this.shearRate);
  }

  update(deltaTime: number): void {
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;

    this.time += deltaTime / 1000;

    if (this.isStirring) {
      // Gradually increase shear rate when stirring
      this.appliedForce = Math.min(this.appliedForce + deltaTime / 500, 10);
    } else {
      // Gradually decrease when not stirring
      this.appliedForce = Math.max(this.appliedForce - deltaTime / 1000, 0);
    }

    this.updateViscosity();
  }

  private resetSimulation(): void {
    this.appliedForce = 0;
    this.shearRate = 0;
    this.viscosity = this.K;
    this.polymerAlignment = 0;
    this.isStirring = false;
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
    r.circle(175, 0, 200, { fill: colors.primary, opacity: 0.03 });
    r.circle(525, 500, 200, { fill: colors.accent, opacity: 0.03 });
  }

  private renderFluidContainer(r: CommandRenderer, centerX: number, centerY: number, size: number = 200): void {
    const viscosityRatio = this.viscosity / this.K;
    const fluidColor = this.interpolateColor(colors.fluidHighShear, colors.fluid, viscosityRatio);

    // Container
    r.rect(centerX - size / 2, centerY - size / 2, size, size * 1.2, {
      fill: 'none',
      stroke: colors.border,
      strokeWidth: 3,
      rx: 10,
    });

    // Fluid
    r.rect(centerX - size / 2 + 5, centerY - size / 2 + 5, size - 10, size * 1.1, {
      fill: fluidColor,
      rx: 8,
    });

    // Polymer chains visualization
    const numChains = 8;
    for (let i = 0; i < numChains; i++) {
      const chainY = centerY - size / 2 + 30 + i * (size * 1.1 / numChains);
      this.renderPolymerChain(r, centerX, chainY, size - 40, this.polymerAlignment);
    }

    // Stirrer
    if (this.isStirring || this.appliedForce > 0) {
      const stirAngle = this.time * 360 * (this.appliedForce / 5);
      r.group(`translate(${centerX}, ${centerY}) rotate(${stirAngle})`, (g) => {
        g.line(0, -40, 0, 40, { stroke: colors.textPrimary, strokeWidth: 4 });
        g.rect(-20, -5, 40, 10, { fill: colors.textPrimary, rx: 5 });
      });
    }
  }

  private renderPolymerChain(r: CommandRenderer, centerX: number, y: number, width: number, alignment: number): void {
    const numSegments = 10;
    const segmentWidth = width / numSegments;
    const waveAmplitude = 15 * (1 - alignment);

    let path = `M ${centerX - width / 2} ${y}`;
    for (let i = 1; i <= numSegments; i++) {
      const x = centerX - width / 2 + i * segmentWidth;
      const yOffset = Math.sin(i * Math.PI + this.time * 2) * waveAmplitude;
      path += ` L ${x} ${y + yOffset}`;
    }

    r.path(path, {
      fill: 'none',
      stroke: colors.polymer,
      strokeWidth: 2,
      opacity: 0.7,
    });
  }

  private interpolateColor(color1: string, color2: string, ratio: number): string {
    // Simple interpolation - just return based on threshold
    return ratio > 0.5 ? color2 : color1;
  }

  private renderHookPhase(r: CommandRenderer): void {
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.circle(295, 44, 4, { fill: colors.primary });
    r.text(350, 49, 'NON-NEWTONIAN FLUIDS', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, 'The Ketchup Paradox', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'Why does ketchup refuse to flow... then suddenly rush out?', {
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

    this.renderFluidContainer(r, 350, 280, 160);

    r.text(350, 400, 'Some fluids get THINNER when you work them harder!', {
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
    r.text(350, 115, 'You vigorously stir a thick, goopy substance.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'What happens to its viscosity (thickness)?', {
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
        ? 'Correct! Shear-thinning fluids become less viscous under stress!'
        : 'Not quite. These special fluids actually get thinner when you work them.',
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
    r.text(350, 30, 'Shear Thinning Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 50, 280, 300, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderFluidContainer(r, 240, 190, 180);

    // Stats panel
    r.rect(400, 50, 250, 300, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    r.text(525, 80, 'Fluid Properties', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Shear rate
    r.rect(420, 100, 210, 50, { fill: '#4c1d9530', rx: 8 });
    r.text(525, 120, 'Shear Rate', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(525, 140, this.shearRate.toFixed(1) + ' /s', {
      fill: colors.primary,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Viscosity
    r.rect(420, 160, 210, 50, { fill: '#78350f30', rx: 8 });
    r.text(525, 180, 'Viscosity', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(525, 200, this.viscosity.toFixed(1) + ' Pa·s', {
      fill: colors.accent,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Polymer alignment
    r.rect(420, 220, 210, 50, { fill: '#06533930', rx: 8 });
    r.text(525, 240, 'Chain Alignment', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(525, 260, (this.polymerAlignment * 100).toFixed(0) + '%', {
      fill: colors.success,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Formula box
    r.rect(100, 370, 550, 50, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(375, 400, 'Power Law: eta = K * gamma^(n-1)  |  n < 1 means shear thinning!', {
      fill: colors.primary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Shear Thinning', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 290, 160, { fill: '#4c1d9540', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'The Physics', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const physicsInfo = [
      'Polymer chains are tangled at rest',
      'Under shear, chains align with flow',
      'Aligned chains slide past each other easily',
      'Result: viscosity decreases with shear',
    ];
    physicsInfo.forEach((line, i) => {
      r.text(70, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 160, { fill: '#78350f40', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Power Law Model', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const modelInfo = [
      'eta = K * gamma^(n-1)',
      'K = consistency index',
      'n = flow behavior index',
      'n < 1: shear thinning (pseudoplastic)',
    ];
    modelInfo.forEach((line, i) => {
      r.text(380, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(50, 250, 600, 80, { fill: '#06533940', stroke: colors.success, rx: 16 });
    r.text(350, 275, 'Key Insight', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 300, 'The more you stir, the easier it flows. Stop stirring, and it thickens again!', {
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
    r.text(350, 125, 'Some fluids take TIME to recover their thickness after shearing.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 150, 'This is called thixotropy.', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 180, 'Is thixotropy the same as shear thinning?', {
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
        ? 'Correct! Thixotropy is TIME-dependent, shear thinning is instantaneous!'
        : 'Not quite. The key difference is time dependence.',
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
    r.text(350, 30, 'Shear Thinning vs Thixotropy', {
      fill: colors.accent,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Left: shear thinning
    r.rect(50, 60, 280, 200, { fill: colors.bgCard, stroke: colors.primary, rx: 16 });
    r.text(190, 90, 'Shear Thinning', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(190, 115, 'Instantaneous response', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(190, 140, 'Viscosity depends only on', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(190, 160, 'current shear rate', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(190, 200, 'eta = f(shear rate)', { fill: colors.primary, fontSize: 13, textAnchor: 'middle' });

    // Right: thixotropy
    r.rect(370, 60, 280, 200, { fill: colors.bgCard, stroke: colors.accent, rx: 16 });
    r.text(510, 90, 'Thixotropy', { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(510, 115, 'Time-dependent response', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(510, 140, 'Viscosity depends on shear', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(510, 160, 'history and duration', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(510, 200, 'eta = f(shear rate, time)', { fill: colors.accent, fontSize: 13, textAnchor: 'middle' });

    r.rect(50, 280, 600, 80, { fill: '#78350f30', stroke: colors.accent, rx: 16 });
    r.text(350, 305, 'Thixotropic fluids rebuild structure over time at rest', { fill: colors.accent, fontSize: 13, textAnchor: 'middle' });
    r.text(350, 330, 'Examples: Yogurt, some paints, drilling muds', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', {
      fill: colors.accent,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 250, { fill: '#78350f30', stroke: colors.accent, rx: 16 });
    r.text(350, 110, 'Two Different Phenomena!', {
      fill: colors.accent,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const comparisons = [
      { label: 'Shear Thinning:', value: 'Rate-dependent, instantaneous' },
      { label: 'Thixotropy:', value: 'Time-dependent, history matters' },
      { label: 'Recovery:', value: 'Instant vs gradual' },
      { label: 'Ketchup:', value: 'Shear thinning (mostly)' },
      { label: 'Yogurt:', value: 'Thixotropic' },
    ];

    comparisons.forEach((item, i) => {
      r.text(200, 145 + i * 30, item.label, { fill: colors.textSecondary, fontSize: 13, fontWeight: 'bold' });
      r.text(370, 145 + i * 30, item.value, { fill: colors.textPrimary, fontSize: 13 });
    });

    r.text(350, 310, 'Both make fluids easier to work with!', {
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

    r.text(350, 200, passed ? "You've mastered shear thinning!" : 'Review the material and try again.', {
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

    r.text(350, 130, 'Non-Newtonian Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, "You've mastered shear-thinning fluids!", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'eta', label: 'Viscosity Expert' },
      { icon: 'n<1', label: 'Power Law' },
      { icon: 'chain', label: 'Polymer Alignment' },
      { icon: 'app', label: 'Real Applications' },
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
        r.addButton({ id: 'next', label: 'Explore the Physics', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. It gets thicker', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. It gets thinner', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. It stays the same', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. It solidifies', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'See the Physics', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'force', label: 'Applied Force', value: this.appliedForce, min: 0, max: 10, step: 0.5 });
        r.addButton({ id: this.isStirring ? 'stop_stir' : 'start_stir', label: this.isStirring ? 'Stop Stirring' : 'Start Stirring', variant: this.isStirring ? 'danger' : 'success' });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Discover a Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Yes, same thing', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. No, thixotropy is time-dependent', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Opposite effects', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Compare Them', variant: 'success' });
        }
        break;

      case 'twist_play':
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
          q.options.forEach((_, i) => {
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
      appliedForce: this.appliedForce,
      shearRate: this.shearRate,
      viscosity: this.viscosity,
      polymerAlignment: this.polymerAlignment,
      isStirring: this.isStirring,
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
    this.appliedForce = (state.appliedForce as number) || 0;
    this.shearRate = (state.shearRate as number) || 0;
    this.viscosity = (state.viscosity as number) || this.K;
    this.polymerAlignment = (state.polymerAlignment as number) || 0;
    this.isStirring = (state.isStirring as boolean) || false;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===

export function createShearThinningGame(sessionId: string): ShearThinningGame {
  return new ShearThinningGame(sessionId);
}
