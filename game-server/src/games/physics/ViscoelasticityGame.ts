/**
 * Viscoelasticity Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP - Physics Formulas:
 * - Deborah number: De = tau / t (relaxation time / observation time)
 * - High De (De >> 1) -> solid-like behavior
 * - Low De (De << 1) -> liquid-like behavior
 * - De ~ 1 -> viscoelastic behavior
 * - Maxwell model: stress relaxation sigma(t) = sigma_0 * exp(-t/tau)
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
    question: 'What does the Deborah number measure?',
    options: [
      'The viscosity of a material',
      'The ratio of relaxation time to observation time',
      'The elasticity modulus',
      'The temperature of the material',
    ],
    correctIndex: 1,
  },
  {
    question: 'A material with De >> 1 (high Deborah number) behaves like:',
    options: [
      'A liquid',
      'A solid',
      'A gas',
      'A plasma',
    ],
    correctIndex: 1,
  },
  {
    question: 'A material with De << 1 (low Deborah number) behaves like:',
    options: [
      'A solid',
      'A liquid',
      'An elastic solid',
      'A brittle material',
    ],
    correctIndex: 1,
  },
  {
    question: 'Silly Putty bounces when thrown quickly because:',
    options: [
      'It is purely elastic',
      'It has a short observation time making De high (solid-like)',
      'It is purely viscous',
      'It melts on impact',
    ],
    correctIndex: 1,
  },
  {
    question: 'The same Silly Putty flows slowly under gravity because:',
    options: [
      'It is purely elastic',
      'Long observation time makes De low (liquid-like)',
      'It is purely viscous',
      'It heats up',
    ],
    correctIndex: 1,
  },
  {
    question: 'What is the relaxation time (tau) of a material?',
    options: [
      'The time for stress to decay to 1/e of its initial value',
      'The time to reach equilibrium temperature',
      'The time to completely melt',
      'The time between molecular collisions',
    ],
    correctIndex: 0,
  },
  {
    question: 'Which everyday material exhibits viscoelastic behavior?',
    options: [
      'Steel',
      'Water',
      'Memory foam',
      'Glass (at room temperature)',
    ],
    correctIndex: 2,
  },
  {
    question: 'In the Maxwell model, stress relaxation follows what pattern?',
    options: [
      'Linear decay',
      'Exponential decay',
      'Constant stress',
      'Oscillating stress',
    ],
    correctIndex: 1,
  },
  {
    question: 'The Deborah number is named after:',
    options: [
      'A physicist named Dr. Deborah',
      'A biblical prophetess who said "the mountains flowed"',
      'The inventor of Silly Putty',
      'A unit of viscosity',
    ],
    correctIndex: 1,
  },
  {
    question: 'Glaciers flow like liquids over centuries because:',
    options: [
      'Ice melts at the bottom',
      'The observation time is very long, making De low',
      'Glaciers are made of water',
      'Pressure reduces viscosity',
    ],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#a855f7', // Purple
  primaryDark: '#9333ea',
  accent: '#22d3ee', // Cyan
  accentDark: '#06b6d4',
  solid: '#ef4444', // Red for solid behavior
  liquid: '#3b82f6', // Blue for liquid behavior
  viscoelastic: '#10b981', // Green for viscoelastic
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

export class ViscoelasticityGame extends BaseGame {
  readonly gameType = 'viscoelasticity';
  readonly gameTitle = 'Viscoelasticity & Deborah Number';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state (PROTECTED - server only)
  private time = 0;
  private isSimulating = false;

  // Material parameters
  private relaxationTime = 1.0; // tau in seconds
  private observationTime = 1.0; // t in seconds
  private impactSpeed: 'slow' | 'medium' | 'fast' = 'medium';

  // Calculated values (PROTECTED - computed on server)
  private deborahNumber = 1.0;
  private behaviorType: 'solid' | 'liquid' | 'viscoelastic' = 'viscoelastic';
  private stressLevel = 100;

  // Animation state
  private animationTime = 0;
  private ballY = 100;
  private ballVelocity = 0;
  private deformation = 0;
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
    twist_play: 'Time Scales',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Is Silly Putty a solid or a liquid? The answer is... it depends!',
    predict: 'What happens when you throw Silly Putty at a wall vs let it sit?',
    play: 'Adjust the time scale and watch the material behavior change!',
    review: 'The Deborah number reveals: time scale matters more than material.',
    twist_predict: 'Can mountains flow like rivers?',
    twist_play: 'Explore extreme time scales - from milliseconds to millions of years!',
    twist_review: '"Everything flows if you wait long enough" - Heraclitus',
    transfer: 'Viscoelasticity shapes memory foam, glaciers, and shock absorbers.',
    test: 'Test your understanding of the Deborah number!',
    mastery: 'You understand that solid vs liquid depends on time scale!',
  };

  constructor(sessionId: string) {
    super(sessionId);
    this.calculateDeborahNumber();
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
      message: 'Viscoelasticity lesson started',
    });
  }

  // === PROTECTED PHYSICS CALCULATIONS ===

  /**
   * PROTECTED: Calculate Deborah number
   * De = tau / t (relaxation time / observation time)
   */
  private calculateDeborahNumber(): void {
    // Deborah number: De = tau / t
    this.deborahNumber = this.relaxationTime / this.observationTime;

    // Determine behavior type
    if (this.deborahNumber > 10) {
      this.behaviorType = 'solid';
    } else if (this.deborahNumber < 0.1) {
      this.behaviorType = 'liquid';
    } else {
      this.behaviorType = 'viscoelastic';
    }
  }

  /**
   * PROTECTED: Calculate stress relaxation using Maxwell model
   * sigma(t) = sigma_0 * exp(-t/tau)
   */
  private calculateStressRelaxation(t: number): number {
    const sigma0 = 100; // initial stress
    return sigma0 * Math.exp(-t / this.relaxationTime);
  }

  /**
   * PROTECTED: Get behavior description based on De
   */
  private getBehaviorDescription(): string {
    if (this.deborahNumber > 10) {
      return 'Solid-like: Material stores energy elastically';
    } else if (this.deborahNumber < 0.1) {
      return 'Liquid-like: Material flows and dissipates energy';
    } else {
      return 'Viscoelastic: Both elastic and viscous behavior';
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

    // Impact speed
    if (id === 'speed_slow') {
      this.impactSpeed = 'slow';
      this.observationTime = 10;
      this.calculateDeborahNumber();
      return;
    }
    if (id === 'speed_medium') {
      this.impactSpeed = 'medium';
      this.observationTime = 1;
      this.calculateDeborahNumber();
      return;
    }
    if (id === 'speed_fast') {
      this.impactSpeed = 'fast';
      this.observationTime = 0.01;
      this.calculateDeborahNumber();
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
    if (id === 'drop') {
      this.dropBall();
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
    if (id === 'relaxation_time') {
      this.relaxationTime = clamp(value, 0.001, 1000);
      this.calculateDeborahNumber();
      this.emitCoachEvent('value_changed', { relaxationTime: this.relaxationTime, De: this.deborahNumber });
      return;
    }
    if (id === 'observation_time') {
      this.observationTime = clamp(value, 0.001, 1000);
      this.calculateDeborahNumber();
      this.emitCoachEvent('value_changed', { observationTime: this.observationTime, De: this.deborahNumber });
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
      hook: 'Viscoelastic materials behave as both solid AND liquid!',
      predict: 'Think about what happens on different time scales.',
      play: 'Fast events = high De = solid. Slow events = low De = liquid.',
      review: 'The Deborah number is the key to understanding this behavior.',
      twist_predict: 'Even mountains can flow if you wait long enough!',
      twist_play: 'Try extreme time scales to see dramatic behavior changes.',
      twist_review: 'Glass windows in old cathedrals are thicker at the bottom.',
      transfer: 'Memory foam, shock absorbers, and even Earth\'s mantle show this.',
      test: 'Remember: De = relaxation time / observation time.',
      mastery: 'You now understand time-dependent material behavior!',
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

  private dropBall(): void {
    this.ballY = 50;
    this.ballVelocity = 0;
    this.isSimulating = true;
  }

  update(deltaTime: number): void {
    if (!this.isSimulating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play') return;

    this.time += deltaTime / 1000;
    this.animationTime += deltaTime;

    // Update stress relaxation
    this.stressLevel = this.calculateStressRelaxation(this.time);

    // Ball drop animation
    const gravity = 500;
    const surfaceY = 200;

    this.ballVelocity += gravity * (deltaTime / 1000);
    this.ballY += this.ballVelocity * (deltaTime / 1000);

    // Collision with surface
    if (this.ballY >= surfaceY) {
      this.ballY = surfaceY;

      // Behavior depends on Deborah number
      if (this.deborahNumber > 5) {
        // Solid-like: bounces
        this.ballVelocity = -this.ballVelocity * 0.8;
        this.deformation = Math.min(20, Math.abs(this.ballVelocity) * 0.05);
      } else if (this.deborahNumber < 0.2) {
        // Liquid-like: splats and flows
        this.ballVelocity = 0;
        this.deformation = lerp(this.deformation, 40, 0.1);
      } else {
        // Viscoelastic: partial bounce, gradual recovery
        this.ballVelocity = -this.ballVelocity * 0.4;
        this.deformation = lerp(this.deformation, 15, 0.05);
      }
    }

    // Recovery of deformation
    if (this.ballY < surfaceY) {
      this.deformation = lerp(this.deformation, 0, 0.1);
    }
  }

  private resetSimulation(): void {
    this.time = 0;
    this.animationTime = 0;
    this.isSimulating = false;
    this.ballY = 50;
    this.ballVelocity = 0;
    this.deformation = 0;
    this.stressLevel = 100;
    this.calculateDeborahNumber();
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
    r.text(350, 60, 'Viscoelasticity', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 95, 'Is Silly Putty a solid or a liquid?', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    // Illustration
    this.renderSillyPuttyDemo(r, 350, 200);

    r.text(350, 320, 'The answer depends on HOW you interact with it!', {
      fill: colors.primary,
      fontSize: 14,
      textAnchor: 'middle',
    });
  }

  private renderSillyPuttyDemo(r: CommandRenderer, cx: number, cy: number): void {
    // Fast impact - bounces
    r.rect(cx - 180, cy - 50, 120, 100, {
      fill: colors.bgCard,
      stroke: colors.solid,
      rx: 10,
    });
    r.text(cx - 120, cy - 30, 'FAST', {
      fill: colors.solid,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.circle(cx - 120, cy + 10, 20, {
      fill: colors.primary,
    });
    r.text(cx - 120, cy + 45, 'Bounces!', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Slow observation - flows
    r.rect(cx + 60, cy - 50, 120, 100, {
      fill: colors.bgCard,
      stroke: colors.liquid,
      rx: 10,
    });
    r.text(cx + 120, cy - 30, 'SLOW', {
      fill: colors.liquid,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.ellipse(cx + 120, cy + 20, 35, 15, {
      fill: colors.primary,
    });
    r.text(cx + 120, cy + 45, 'Flows!', {
      fill: colors.textMuted,
      fontSize: 12,
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

    r.text(350, 90, 'You throw Silly Putty at a wall. What happens?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 115, 'Then you leave it on a table overnight. What happens?', {
      fill: colors.accent,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Visual options
    r.rect(100, 150, 200, 120, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });
    r.text(200, 180, 'Throw at wall:', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.circle(200, 220, 20, { fill: colors.primary });
    r.text(200, 255, '-> Bounces back', {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });

    r.rect(400, 150, 200, 120, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });
    r.text(500, 180, 'Leave overnight:', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.ellipse(500, 225, 40, 15, { fill: colors.primary });
    r.text(500, 255, '-> Flattens out', {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderPlay(r: CommandRenderer): void {
    const isTwist = this.phase === 'twist_play';

    // Ball drop visualization
    this.renderBallDrop(r, 250, 50);

    // Stats panel
    r.rect(400, 40, 280, 140, {
      fill: colors.bgCard + 'cc',
      stroke: colors.border,
      rx: 8,
    });

    const deColor = this.deborahNumber > 5 ? colors.solid : this.deborahNumber < 0.2 ? colors.liquid : colors.viscoelastic;

    r.text(410, 65, `Deborah Number: ${this.deborahNumber.toFixed(2)}`, {
      fill: deColor,
      fontSize: 16,
      fontWeight: 'bold',
    });

    r.text(410, 90, `Relaxation Time: ${this.relaxationTime.toFixed(3)} s`, {
      fill: colors.textSecondary,
      fontSize: 12,
    });

    r.text(410, 110, `Observation Time: ${this.observationTime.toFixed(3)} s`, {
      fill: colors.textSecondary,
      fontSize: 12,
    });

    r.text(410, 135, `Behavior: ${this.behaviorType.toUpperCase()}`, {
      fill: deColor,
      fontSize: 14,
      fontWeight: 'bold',
    });

    r.text(410, 160, this.getBehaviorDescription(), {
      fill: colors.textMuted,
      fontSize: 10,
    });

    // De scale visualization
    this.renderDeborahScale(r, 540, 250);

    if (this.showLabels) {
      r.text(250, 300, `Stress: ${this.stressLevel.toFixed(0)}%`, {
        fill: colors.textMuted,
        fontSize: 12,
        textAnchor: 'middle',
      });
    }
  }

  private renderBallDrop(r: CommandRenderer, x: number, startY: number): void {
    // Surface
    const surfaceY = startY + 150;
    r.rect(x - 80, surfaceY, 160, 40, {
      fill: colors.bgCardLight,
      stroke: colors.border,
      rx: 5,
    });

    // Material on surface with deformation
    const materialWidth = 60 + this.deformation * 2;
    const materialHeight = 30 - this.deformation * 0.5;
    r.ellipse(x, surfaceY - materialHeight / 2, materialWidth / 2, materialHeight / 2, {
      fill: colors.primary + '80',
      stroke: colors.primary,
    });

    // Falling/bouncing ball
    if (this.ballY < surfaceY - 20) {
      const ballDeform = Math.min(5, this.ballVelocity * 0.01);
      r.ellipse(x, this.ballY, 20 - ballDeform, 20 + ballDeform, {
        fill: colors.primary,
        stroke: colors.primaryDark,
        strokeWidth: 2,
      });
    }

    // Behavior indicator
    const behaviorColor = this.deborahNumber > 5 ? colors.solid : this.deborahNumber < 0.2 ? colors.liquid : colors.viscoelastic;
    r.text(x, surfaceY + 60, this.behaviorType.toUpperCase(), {
      fill: behaviorColor,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderDeborahScale(r: CommandRenderer, x: number, y: number): void {
    // Deborah number scale
    r.rect(x - 100, y - 15, 200, 50, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 8,
    });

    r.text(x, y - 5, 'De Scale', {
      fill: colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle',
    });

    // Scale bar
    r.rect(x - 80, y + 10, 160, 8, {
      fill: colors.bgCardLight,
      rx: 4,
    });

    // Gradient from liquid to solid
    r.linearGradient('deScale', [
      { offset: '0%', color: colors.liquid },
      { offset: '50%', color: colors.viscoelastic },
      { offset: '100%', color: colors.solid },
    ]);

    // Indicator position (log scale)
    const logDe = Math.log10(clamp(this.deborahNumber, 0.01, 100));
    const indicatorX = x - 80 + ((logDe + 2) / 4) * 160;
    r.circle(indicatorX, y + 14, 6, {
      fill: colors.textPrimary,
      stroke: colors.bgDark,
      strokeWidth: 2,
    });

    r.text(x - 80, y + 30, 'Liquid', { fill: colors.liquid, fontSize: 9 });
    r.text(x + 80, y + 30, 'Solid', { fill: colors.solid, fontSize: 9, textAnchor: 'end' });
  }

  private renderReview(r: CommandRenderer): void {
    const isMainReview = this.phase === 'review';

    r.text(350, 50, isMainReview ? 'The Deborah Number' : 'Time Scale Matters', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (isMainReview) {
      const concepts = [
        { title: 'De = tau / t', desc: 'Relaxation time divided by observation time', color: colors.primary },
        { title: 'De >> 1: Solid', desc: 'Material responds faster than it relaxes', color: colors.solid },
        { title: 'De << 1: Liquid', desc: 'Material has time to flow and relax', color: colors.liquid },
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
        { title: 'Mountains Flow', desc: 'Over millions of years, even rock flows like liquid', color: colors.liquid },
        { title: 'Glass Flows?', desc: 'Cathedral windows - thicker at bottom after centuries', color: colors.primary },
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

      r.text(350, 290, '"Everything flows if you wait long enough"', {
        fill: colors.accent,
        fontSize: 14,
        fontStyle: 'italic',
        textAnchor: 'middle',
      });
    }
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 50, 'Extreme Time Scales', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 90, 'Mountains are solid rock. Can they ever flow like rivers?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.rect(200, 130, 300, 120, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });

    r.text(350, 160, 'Consider:', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 190, 'Observation time = millions of years', {
      fill: colors.accent,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 220, 'Even rock has a relaxation time...', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTransfer(r: CommandRenderer): void {
    const apps = [
      { name: 'Memory Foam', desc: 'Slowly recovers shape - viscoelastic response' },
      { name: 'Shock Absorbers', desc: 'Damping depends on impact speed' },
      { name: 'Glaciers', desc: 'Flow like rivers over centuries' },
      { name: 'Earth\'s Mantle', desc: 'Solid on short scales, flows over millions of years' },
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
        fontSize: 11,
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

      r.text(350, 200, passed ? 'You understand viscoelasticity!' : 'Review the Deborah number concept.', {
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

    r.text(350, 150, 'Viscoelasticity Master!', {
      fill: colors.primary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 190, 'You understand that solid vs liquid depends on time scale.', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: '(De)', label: 'Deborah Number' },
      { icon: '(tau)', label: 'Relaxation Time' },
      { icon: '(flow)', label: 'Time Scales' },
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
          id: 'predict_both',
          label: 'Both behaviors',
          variant: this.prediction === 'both' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_solid',
          label: 'Always solid',
          variant: this.prediction === 'solid' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_liquid',
          label: 'Always liquid',
          variant: this.prediction === 'liquid' ? 'primary' : 'secondary',
        });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'See Result', variant: 'success' });
        }
        break;

      case 'play':
      case 'twist_play':
        r.addButton({
          id: 'speed_slow',
          label: 'Slow (10s)',
          variant: this.impactSpeed === 'slow' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'speed_medium',
          label: 'Medium (1s)',
          variant: this.impactSpeed === 'medium' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'speed_fast',
          label: 'Fast (0.01s)',
          variant: this.impactSpeed === 'fast' ? 'primary' : 'secondary',
        });
        r.addButton({ id: 'drop', label: 'Drop Ball', variant: 'primary' });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
        r.addToggle({ id: 'labels', label: 'Labels', value: this.showLabels });
        if (this.time > 2) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'twist_predict':
        r.addButton({
          id: 'twist_yes',
          label: 'Yes, they can flow',
          variant: this.twistPrediction === 'yes' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_no',
          label: 'No, rock is solid',
          variant: this.twistPrediction === 'no' ? 'primary' : 'secondary',
        });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Foam', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Shocks', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Glaciers', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Mantle', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
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
      relaxationTime: this.relaxationTime,
      observationTime: this.observationTime,
      impactSpeed: this.impactSpeed,
      deborahNumber: this.deborahNumber,
      behaviorType: this.behaviorType,
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
    this.relaxationTime = state.relaxationTime || 1.0;
    this.observationTime = state.observationTime || 1.0;
    this.impactSpeed = state.impactSpeed || 'medium';
    this.time = state.time || 0;
    this.isSimulating = state.isSimulating || false;
    this.showLabels = state.showLabels ?? true;
    this.testQuestion = state.testQuestion || 0;
    this.testAnswers = state.testAnswers || Array(10).fill(null);
    this.testSubmitted = state.testSubmitted || false;
    this.selectedApp = state.selectedApp || 0;
    this.completedApps = state.completedApps || [false, false, false, false];
    this.guidedMode = state.guidedMode ?? true;
    this.calculateDeborahNumber();
  }
}

// === FACTORY FUNCTION ===
export function createViscoelasticityGame(sessionId: string): ViscoelasticityGame {
  return new ViscoelasticityGame(sessionId);
}
