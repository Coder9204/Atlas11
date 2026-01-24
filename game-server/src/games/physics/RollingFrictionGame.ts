/**
 * Rolling Friction Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Rolling friction coefficient: μr
 * - Rolling resistance: f = μr × N
 * - Comparison with sliding friction
 * - Energy loss in rolling
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
    question: 'Rolling friction is typically:',
    options: ['Greater than sliding friction', 'Less than sliding friction', 'Equal to sliding friction', 'Zero'],
    correctIndex: 1,
  },
  {
    question: 'The rolling friction force is:',
    options: ['f = μr × m', 'f = μr × N', 'f = μr × v', 'f = μr × a'],
    correctIndex: 1,
  },
  {
    question: 'Inflating a bicycle tire more will:',
    options: ['Increase rolling friction', 'Decrease rolling friction', 'Have no effect', 'Stop the wheel'],
    correctIndex: 1,
  },
  {
    question: 'Rolling friction coefficient for rubber on concrete is about:',
    options: ['0.001', '0.01', '0.1', '1.0'],
    correctIndex: 1,
  },
  {
    question: 'Energy lost in rolling friction is mostly converted to:',
    options: ['Sound', 'Light', 'Heat (deformation)', 'Kinetic energy'],
    correctIndex: 2,
  },
  {
    question: 'Ball bearings reduce friction by:',
    options: ['Eliminating contact', 'Replacing sliding with rolling', 'Lubricating surfaces', 'Magnetic levitation'],
    correctIndex: 1,
  },
  {
    question: 'Wider tires on a car typically have:',
    options: ['Less rolling friction', 'More rolling friction', 'Same rolling friction', 'No rolling friction'],
    correctIndex: 1,
  },
  {
    question: 'Rolling friction increases with:',
    options: ['Higher speed only', 'Softer surfaces', 'Lighter loads', 'Smoother surfaces'],
    correctIndex: 1,
  },
  {
    question: 'Train wheels have low rolling friction because:',
    options: ['They are large', 'Steel on steel is hard', 'They use lubricant', 'They are hollow'],
    correctIndex: 1,
  },
  {
    question: 'The invention of the wheel was significant because:',
    options: ['It looked nice', 'It converted sliding to rolling friction', 'It was made of wood', 'It was perfectly round'],
    correctIndex: 1,
  },
];

// === PROTECTED: Friction coefficients ===
const frictionCoefficients = {
  rolling: {
    steel_steel: 0.001,
    rubber_concrete: 0.01,
    rubber_grass: 0.08,
    wood_wood: 0.02,
    soft_tire: 0.03,
  },
  sliding: {
    steel_steel: 0.6,
    rubber_concrete: 0.8,
    rubber_grass: 0.5,
    wood_wood: 0.4,
    soft_tire: 0.7,
  },
};

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#f97316',
  primaryDark: '#ea580c',
  accent: '#22c55e',
  accentDark: '#16a34a',
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
  wheel: '#f97316',
  block: '#3b82f6',
  ground: '#44403c',
  friction: '#ef4444',
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
    title: 'Tire Design',
    icon: 'tire',
    description: 'Tire engineers balance grip with rolling resistance for fuel efficiency.',
    details: 'Low rolling resistance tires can improve fuel economy by 3-5%.',
  },
  {
    title: 'Ball Bearings',
    icon: 'bearing',
    description: 'Replace sliding with rolling to dramatically reduce friction.',
    details: 'Bearings can reduce friction by 100x or more compared to sliding.',
  },
  {
    title: 'Skateboard Wheels',
    icon: 'skateboard',
    description: 'Hard wheels roll faster but provide less grip.',
    details: 'Durometer (hardness) rating determines the balance of speed vs. grip.',
  },
  {
    title: 'Train Transport',
    icon: 'train',
    description: 'Steel wheels on steel rails have extremely low rolling friction.',
    details: 'μr ≈ 0.001 - one of the most efficient forms of ground transport.',
  },
];

// === MAIN GAME CLASS ===

export class RollingFrictionGame extends BaseGame {
  readonly gameType = 'rolling_friction';
  readonly gameTitle = 'Rolling vs Sliding Friction';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private surfaceType = 'rubber_concrete';
  private objectMass = 10; // kg
  private appliedForce = 50; // N
  private wheelPosition = 100;
  private blockPosition = 100;
  private wheelVelocity = 0;
  private blockVelocity = 0;
  private isSimulating = false;
  private time = 0;
  private showForces = true;

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
    hook: 'Why was the wheel one of humanity\'s greatest inventions? It\'s all about friction!',
    predict: 'Pushing a box vs. rolling it on wheels - which requires less force?',
    play: 'Compare rolling and sliding friction directly. Watch the huge difference!',
    review: 'Rolling friction is typically 10-100x LESS than sliding friction!',
    twist_predict: 'What happens to rolling friction on softer surfaces?',
    twist_play: 'Try different surfaces - see how softness affects rolling resistance.',
    twist_review: 'Deformation is the key - more deformation = more energy loss!',
    transfer: 'From tires to trains - understanding rolling friction saves energy!',
    test: 'Time to test your understanding of rolling friction!',
    mastery: 'Congratulations! You\'ve mastered rolling vs sliding friction!',
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
      message: 'Rolling Friction lesson started',
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

    if (id === 'start_sim') {
      this.startSimulation();
      return;
    }
    if (id === 'reset_sim') {
      this.resetSimulation();
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
      this.surfaceType = id.replace('surface_', '');
      this.resetSimulation();
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'forces') {
      this.showForces = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'mass') {
      this.objectMass = value;
      return;
    }
    if (id === 'force') {
      this.appliedForce = value;
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
   * PROTECTED: Get rolling friction coefficient
   */
  private getRollingFriction(): number {
    return frictionCoefficients.rolling[this.surfaceType as keyof typeof frictionCoefficients.rolling] || 0.01;
  }

  /**
   * PROTECTED: Get sliding friction coefficient
   */
  private getSlidingFriction(): number {
    return frictionCoefficients.sliding[this.surfaceType as keyof typeof frictionCoefficients.sliding] || 0.5;
  }

  /**
   * PROTECTED: Calculate rolling friction force
   * f = μr × N = μr × mg
   */
  private calculateRollingFrictionForce(): number {
    const g = 9.81;
    const normalForce = this.objectMass * g;
    return this.getRollingFriction() * normalForce;
  }

  /**
   * PROTECTED: Calculate sliding friction force
   * f = μs × N = μs × mg
   */
  private calculateSlidingFrictionForce(): number {
    const g = 9.81;
    const normalForce = this.objectMass * g;
    return this.getSlidingFriction() * normalForce;
  }

  /**
   * PROTECTED: Calculate friction ratio (sliding/rolling)
   */
  private calculateFrictionRatio(): number {
    return this.getSlidingFriction() / this.getRollingFriction();
  }

  private startSimulation(): void {
    this.isSimulating = true;
    this.wheelPosition = 100;
    this.blockPosition = 100;
    this.wheelVelocity = 0;
    this.blockVelocity = 0;
    this.time = 0;
  }

  private resetSimulation(): void {
    this.isSimulating = false;
    this.wheelPosition = 100;
    this.blockPosition = 100;
    this.wheelVelocity = 0;
    this.blockVelocity = 0;
    this.time = 0;
  }

  update(deltaTime: number): void {
    if (!this.isSimulating) return;

    const dt = Math.min(deltaTime / 1000, 0.05);
    this.time += dt;

    const g = 9.81;
    const normalForce = this.objectMass * g;

    // Wheel (rolling friction)
    const rollingFriction = this.getRollingFriction() * normalForce;
    const wheelNetForce = this.appliedForce - rollingFriction;
    const wheelAccel = wheelNetForce / this.objectMass;
    this.wheelVelocity += wheelAccel * dt;
    this.wheelPosition += this.wheelVelocity * dt * 10; // Scale for visualization

    // Block (sliding friction - needs to overcome static first)
    const slidingFriction = this.getSlidingFriction() * normalForce;
    let blockNetForce = this.appliedForce - slidingFriction;
    if (blockNetForce < 0 && this.blockVelocity <= 0) {
      blockNetForce = 0; // Can't overcome static friction
      this.blockVelocity = 0;
    }
    const blockAccel = blockNetForce / this.objectMass;
    this.blockVelocity = Math.max(0, this.blockVelocity + blockAccel * dt);
    this.blockPosition += this.blockVelocity * dt * 10;

    // Stop simulation at edge
    if (this.wheelPosition > 550 || this.time > 10) {
      this.isSimulating = false;
    }
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

  private renderComparisonVisualization(r: CommandRenderer, centerX: number, centerY: number, scale: number = 1): void {
    // Ground
    r.rect(50, centerY + 50, 600, 30, {
      fill: colors.ground,
      rx: 4,
    });

    // Wheel (top track)
    const wheelRadius = 25 * scale;
    const wheelY = centerY - 30;
    r.circle(this.wheelPosition, wheelY, wheelRadius, {
      fill: colors.wheel,
      stroke: colors.textPrimary,
      strokeWidth: 2,
    });
    // Spoke to show rotation
    const rotation = this.wheelPosition / 10;
    r.line(
      this.wheelPosition, wheelY,
      this.wheelPosition + wheelRadius * 0.8 * Math.cos(rotation),
      wheelY + wheelRadius * 0.8 * Math.sin(rotation),
      { stroke: colors.textPrimary, strokeWidth: 2 }
    );
    r.text(this.wheelPosition, wheelY - wheelRadius - 15, 'Rolling', {
      fill: colors.wheel,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Block (bottom track)
    const blockWidth = 50 * scale;
    const blockHeight = 30 * scale;
    const blockY = centerY + 20;
    r.rect(this.blockPosition - blockWidth / 2, blockY, blockWidth, blockHeight, {
      fill: colors.block,
      stroke: colors.textPrimary,
      strokeWidth: 2,
      rx: 4,
    });
    r.text(this.blockPosition, blockY + blockHeight + 20, 'Sliding', {
      fill: colors.block,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Force arrows
    if (this.showForces) {
      // Applied forces
      r.line(this.wheelPosition - 50, wheelY, this.wheelPosition - 20, wheelY, {
        stroke: colors.success,
        strokeWidth: 3,
      });
      r.text(this.wheelPosition - 60, wheelY - 10, `F=${this.appliedForce}N`, {
        fill: colors.success,
        fontSize: 10,
      });

      r.line(this.blockPosition - 50, blockY + blockHeight / 2, this.blockPosition - blockWidth / 2 - 5, blockY + blockHeight / 2, {
        stroke: colors.success,
        strokeWidth: 3,
      });

      // Friction forces
      const rollingF = this.calculateRollingFrictionForce();
      const slidingF = this.calculateSlidingFrictionForce();

      r.line(this.wheelPosition + 20, wheelY, this.wheelPosition + 20 + Math.min(50, rollingF / 2), wheelY, {
        stroke: colors.friction,
        strokeWidth: 2,
        strokeDasharray: '4,2',
      });
      r.text(this.wheelPosition + 50, wheelY + 15, `f=${rollingF.toFixed(1)}N`, {
        fill: colors.friction,
        fontSize: 9,
      });

      r.line(this.blockPosition + blockWidth / 2 + 5, blockY + blockHeight / 2, this.blockPosition + blockWidth / 2 + 5 + Math.min(50, slidingF / 5), blockY + blockHeight / 2, {
        stroke: colors.friction,
        strokeWidth: 2,
        strokeDasharray: '4,2',
      });
      r.text(this.blockPosition + 80, blockY + blockHeight / 2 - 10, `f=${slidingF.toFixed(1)}N`, {
        fill: colors.friction,
        fontSize: 9,
      });
    }

    // Position labels
    r.text(50, centerY + 100, `Wheel traveled: ${(this.wheelPosition - 100).toFixed(0)} units`, {
      fill: colors.wheel,
      fontSize: 11,
    });
    r.text(50, centerY + 120, `Block traveled: ${(this.blockPosition - 100).toFixed(0)} units`, {
      fill: colors.block,
      fontSize: 11,
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

    r.text(350, 100, 'The Wheel Revolution', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'Why was the wheel such a game-changer?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.rect(100, 160, 500, 220, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 20,
      opacity: 0.8,
    });

    this.renderComparisonVisualization(r, 350, 280, 1);

    r.text(350, 400, 'Rolling beats sliding - but by how much?', {
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
    r.text(350, 115, 'Compare pushing a heavy box vs. rolling it on wheels.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'How much easier is rolling?', {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (this.prediction) {
      const isCorrect = this.prediction === 'C';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 375, isCorrect
        ? 'Correct! Rolling friction is typically 10-100x LESS than sliding!'
        : 'Think bigger! Rolling friction can be 10-100x less than sliding.',
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
    r.text(350, 30, 'Friction Comparison Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 540, 260, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderComparisonVisualization(r, 350, 180, 1.2);

    // Stats panel
    const rollingF = this.calculateRollingFrictionForce();
    const slidingF = this.calculateSlidingFrictionForce();
    const ratio = this.calculateFrictionRatio();

    r.rect(80, 330, 540, 80, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });

    r.text(200, 355, `Rolling: μr = ${this.getRollingFriction().toFixed(3)}`, {
      fill: colors.wheel,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(200, 375, `f = ${rollingF.toFixed(1)} N`, {
      fill: colors.wheel,
      fontSize: 12,
      textAnchor: 'middle',
    });

    r.text(350, 355, `Ratio: ${ratio.toFixed(0)}x`, {
      fill: colors.warning,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 375, 'easier to roll!', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });

    r.text(500, 355, `Sliding: μs = ${this.getSlidingFriction().toFixed(2)}`, {
      fill: colors.block,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(500, 375, `f = ${slidingF.toFixed(1)} N`, {
      fill: colors.block,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Why Rolling Beats Sliding', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 290, 150, { fill: '#f9731640', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'Rolling Friction', { fill: colors.primary, fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });
    const rollInfo = [
      'f = μr × N',
      'μr typically 0.001 - 0.1',
      'No relative sliding at contact',
      'Energy lost to deformation only',
    ];
    rollInfo.forEach((line, i) => {
      r.text(70, 120 + i * 25, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 150, { fill: '#3b82f640', stroke: colors.block, rx: 16 });
    r.text(505, 95, 'Sliding Friction', { fill: colors.block, fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });
    const slideInfo = [
      'f = μs × N',
      'μs typically 0.3 - 1.0',
      'Surfaces rub and wear',
      'Energy lost to heat and abrasion',
    ];
    slideInfo.forEach((line, i) => {
      r.text(380, 120 + i * 25, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(50, 240, 600, 80, { fill: '#22c55e40', stroke: colors.success, rx: 16 });
    r.text(350, 265, 'The Key Insight', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 290, 'Rolling replaces macro-sliding with micro-deformation. The contact point is momentarily stationary!', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Surface Twist', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'Rolling on hard concrete vs. soft grass.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 145, 'Which has MORE rolling friction?', {
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
        ? 'Correct! Soft surfaces deform more, causing more energy loss!'
        : 'Soft surfaces require more deformation energy - that\'s friction!',
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
    r.text(350, 30, 'Surface Effects Lab', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 540, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderComparisonVisualization(r, 350, 190, 1.3);

    const rollingF = this.calculateRollingFrictionForce();

    r.rect(80, 350, 540, 60, { fill: '#eab30830', stroke: colors.warning, rx: 12 });
    r.text(350, 375, `Surface: ${this.surfaceType.replace('_', ' ')} | μr = ${this.getRollingFriction().toFixed(3)} | f = ${rollingF.toFixed(1)}N`, {
      fill: colors.warning,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Deformation = Energy Loss', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'What Causes Rolling Friction?', {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const explanation = [
      '• Wheel and surface deform at contact point',
      '• Deformation takes energy (hysteresis)',
      '• Not all energy returns when contact releases',
      '• Softer materials = more deformation = more friction',
      '• Hard steel on steel (trains) is most efficient!',
    ];

    explanation.forEach((line, i) => {
      r.text(120, 150 + i * 28, line, { fill: colors.textSecondary, fontSize: 12 });
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

    r.text(350, 200, passed ? 'You\'ve mastered rolling friction!' : 'Review the concepts and try again.', {
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

    r.text(350, 130, 'Friction Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, 'You\'ve mastered rolling vs sliding friction!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'μr', label: 'Rolling Friction' },
      { icon: 'μs', label: 'Sliding Friction' },
      { icon: '100x', label: 'Advantage' },
      { icon: '()', label: 'Bearings' },
    ];

    badges.forEach((badge, i) => {
      const x = 180 + (i % 2) * 170;
      const y = 200 + Math.floor(i / 2) * 80;
      r.rect(x, y, 150, 60, { fill: colors.bgCardLight, rx: 12 });
      r.text(x + 75, y + 25, badge.icon, { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
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
        r.addButton({ id: 'next', label: 'Compare Friction', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. 2x easier', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. 5x easier', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. 10-100x easier', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Test It', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'mass', label: 'Mass (kg)', value: this.objectMass, min: 5, max: 50 });
        r.addSlider({ id: 'force', label: 'Applied Force (N)', value: this.appliedForce, min: 10, max: 100 });
        r.addToggle({ id: 'forces', label: 'Forces', value: this.showForces, onLabel: 'ON', offLabel: 'OFF' });
        if (!this.isSimulating) {
          r.addButton({ id: 'start_sim', label: 'Push Both', variant: 'success' });
        } else {
          r.addButton({ id: 'reset_sim', label: 'Reset', variant: 'secondary' });
        }
        r.addButton({ id: 'next', label: 'Review', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Surface Effects', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Concrete (more)', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Grass (more)', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Same', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Test Surfaces', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addButton({ id: 'surface_rubber_concrete', label: 'Concrete', variant: this.surfaceType === 'rubber_concrete' ? 'primary' : 'ghost' });
        r.addButton({ id: 'surface_rubber_grass', label: 'Grass', variant: this.surfaceType === 'rubber_grass' ? 'primary' : 'ghost' });
        r.addButton({ id: 'surface_steel_steel', label: 'Steel', variant: this.surfaceType === 'steel_steel' ? 'primary' : 'ghost' });
        if (!this.isSimulating) {
          r.addButton({ id: 'start_sim', label: 'Push Both', variant: 'success' });
        }
        r.addButton({ id: 'next', label: 'Why This Matters', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Tires', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Bearings', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Skate', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Trains', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
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
      surfaceType: this.surfaceType,
      objectMass: this.objectMass,
      appliedForce: this.appliedForce,
      showForces: this.showForces,
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
    this.surfaceType = (state.surfaceType as string) || 'rubber_concrete';
    this.objectMass = (state.objectMass as number) || 10;
    this.appliedForce = (state.appliedForce as number) || 50;
    this.showForces = (state.showForces as boolean) ?? true;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
    this.resetSimulation();
  }
}

// === FACTORY FUNCTION ===

export function createRollingFrictionGame(sessionId: string): RollingFrictionGame {
  return new RollingFrictionGame(sessionId);
}
