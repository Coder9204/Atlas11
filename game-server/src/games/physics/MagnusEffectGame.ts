/**
 * Magnus Effect Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Magnus force formula: F = CL × ½ρv²A
 * - Lift coefficient depends on spin ratio: CL = f(ωr/v)
 * - Pressure difference from Bernoulli: ΔP = ½ρ(v₁² - v₂²)
 * - Boundary layer physics and turbulent transition
 * - Reverse Magnus effect conditions
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
    question: 'What causes the Magnus effect?',
    options: ['Gravity acting on spin', 'Pressure difference from air speed variation', 'Magnetic forces', 'Wind resistance only'],
    correctIndex: 1,
  },
  {
    question: 'A ball with topspin will curve:',
    options: ['Upward', 'Downward', 'Left only', 'It won\'t curve'],
    correctIndex: 1,
  },
  {
    question: 'On which side of a spinning ball is air pressure lower?',
    options: ['The side spinning into the airflow', 'The side spinning with the airflow', 'Both sides equal', 'Pressure doesn\'t change'],
    correctIndex: 1,
  },
  {
    question: 'The Magnus force is perpendicular to:',
    options: ['Gravity only', 'Both velocity and spin axis', 'The ground', 'Nothing - it acts in all directions'],
    correctIndex: 1,
  },
  {
    question: 'Why do golf balls have dimples?',
    options: ['Decoration only', 'To increase drag', 'To enhance the Magnus effect and reduce drag', 'To make them heavier'],
    correctIndex: 2,
  },
  {
    question: 'A curveball in baseball uses:',
    options: ['Only gravity', 'The Magnus effect from spin', 'Air temperature changes', 'The weight of the ball'],
    correctIndex: 1,
  },
  {
    question: 'Increasing spin rate will:',
    options: ['Decrease the curve', 'Have no effect', 'Increase the curve', 'Make the ball go straight'],
    correctIndex: 2,
  },
  {
    question: 'The Magnus force equation F = CL × ½ρv²A shows force depends on:',
    options: ['Only ball size', 'Velocity squared', 'Temperature only', 'Color of ball'],
    correctIndex: 1,
  },
  {
    question: 'Backspin on a tennis ball causes it to:',
    options: ['Drop faster', 'Stay in the air longer', 'Curve left', 'Stop spinning'],
    correctIndex: 1,
  },
  {
    question: 'The Magnus effect also works:',
    options: ['Only in air', 'Only in water', 'In any fluid (air, water, etc.)', 'Only in a vacuum'],
    correctIndex: 2,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#ef4444',
  primaryDark: '#dc2626',
  accent: '#f97316',
  accentDark: '#ea580c',
  warning: '#fbbf24',
  success: '#10b981',
  danger: '#ef4444',
  bgDark: '#0a0f1a',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  ballRed: '#dc2626',
  trajectoryYellow: '#fbbf24',
  airflowBlue: '#3b82f6',
  pressureRed: '#ef4444',
  forceGreen: '#22c55e',
  skyBlue: '#1e3a5f',
  skyDark: '#0c1929',
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
    title: 'Baseball Pitching',
    icon: 'baseball',
    description: 'Curveballs, sliders, and cutters all use the Magnus effect to fool batters.',
    details: 'A curveball can drop up to 17 inches from expected path. Pitchers grip to maximize spin, creating dramatic movement.',
  },
  {
    title: 'Soccer Free Kicks',
    icon: 'soccer',
    description: 'The "banana kick" curves around defensive walls using sidespin.',
    details: 'Players like Roberto Carlos mastered kicks that curve over 10 feet, going around walls into the goal.',
  },
  {
    title: 'Golf Drives',
    icon: 'golf',
    description: 'Backspin keeps the ball airborne longer, dramatically increasing distance.',
    details: 'A well-struck drive has 2,500-3,000 RPM of backspin, keeping the ball airborne 2-3x longer.',
  },
  {
    title: 'Table Tennis',
    icon: 'tabletennis',
    description: 'Heavy topspin makes the ball dip sharply, keeping aggressive shots on the table.',
    details: 'Professional players generate over 9,000 RPM of spin! The ball curves so sharply that impossible shots stay in play.',
  },
];

// === MAIN GAME CLASS ===

export class MagnusEffectGame extends BaseGame {
  readonly gameType = 'magnus_effect';
  readonly gameTitle = 'Magnus Effect';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private ballX = 50;
  private ballY = 150;
  private spinRate = 50; // percentage
  private ballSpeed = 50; // percentage
  private spinDirection: 'topspin' | 'backspin' | 'sidespin' = 'topspin';
  private isAnimating = false;
  private ballRotation = 0;
  private trajectory: { x: number; y: number }[] = [];
  private showAirflow = true;

  // PROTECTED: Physics constants
  private readonly AIR_DENSITY = 1.225; // kg/m³
  private readonly BALL_RADIUS = 0.037; // meters (baseball)

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
    hook: 'A pitcher throws a spinning ball that curves dramatically. What makes it bend?',
    predict: 'Think about what happens to air as it flows around a spinning ball.',
    play: 'Adjust spin rate and direction. Watch how the ball curves differently!',
    review: 'Faster air = lower pressure. The ball is pushed toward the low pressure side!',
    twist_predict: 'At extreme speeds and spin, something unexpected happens...',
    twist_play: 'The boundary layer transitions from laminar to turbulent, reversing the effect!',
    twist_review: 'The Magnus effect depends on spin ratio, ball surface, and Reynolds number.',
    transfer: 'From curveballs to banana kicks, spinning balls shape sports!',
    test: 'Apply your understanding of the Magnus effect!',
    mastery: 'You\'ve mastered the physics of spinning balls and curved trajectories!',
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
      message: 'Magnus Effect lesson started',
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

    // Predictions - correct answer is B (pressure difference)
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction, correct: this.prediction === 'B' });
      return;
    }

    // Twist predictions - correct answer is C (reverse direction)
    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
      this.emitCoachEvent('prediction_made', { twistPrediction: this.twistPrediction, correct: this.twistPrediction === 'C' });
      return;
    }

    // Spin direction
    if (id === 'spin_topspin') {
      this.spinDirection = 'topspin';
      return;
    }
    if (id === 'spin_backspin') {
      this.spinDirection = 'backspin';
      return;
    }
    if (id === 'spin_sidespin') {
      this.spinDirection = 'sidespin';
      return;
    }

    // Animation control
    if (id === 'throw_ball') {
      this.startAnimation();
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
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'airflow') {
      this.showAirflow = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'spin_rate') {
      this.spinRate = value;
      return;
    }
    if (id === 'ball_speed') {
      this.ballSpeed = value;
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

    if (newPhase === 'play' || newPhase === 'twist_play' || newPhase === 'hook') {
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

  // === PHYSICS CALCULATIONS (PROTECTED - server only) ===

  /**
   * PROTECTED: Magnus force calculation
   * F = CL × ½ρv²A
   * CL depends on spin ratio ωr/v
   */
  private calculateMagnusForce(velocity: number, spinRPM: number): number {
    const omega = (spinRPM * 2 * Math.PI) / 60; // rad/s
    const spinRatio = (omega * this.BALL_RADIUS) / velocity;
    const CL = 0.5 * spinRatio; // Simplified lift coefficient
    const area = Math.PI * this.BALL_RADIUS * this.BALL_RADIUS;
    return CL * 0.5 * this.AIR_DENSITY * velocity * velocity * area;
  }

  /**
   * PROTECTED: Calculate ball trajectory with Magnus effect
   */
  private calculateTrajectoryPoint(): { magnusY: number; gravity: number } {
    const magnusForce = (this.spinRate / 100) * (this.spinDirection === 'topspin' ? 0.8 : this.spinDirection === 'backspin' ? -0.8 : 0);
    const gravity = 0.15;
    return { magnusY: magnusForce, gravity };
  }

  private startAnimation(): void {
    this.ballX = 50;
    this.ballY = 150;
    this.trajectory = [];
    this.isAnimating = true;
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;

    // Update ball position
    this.ballX += this.ballSpeed / 10;

    // Apply Magnus effect
    const { magnusY, gravity } = this.calculateTrajectoryPoint();
    this.ballY += magnusY + gravity;
    this.ballY = Math.max(30, Math.min(280, this.ballY));

    // Update rotation for visual effect
    this.ballRotation += this.spinRate / 5;

    // Record trajectory
    this.trajectory.push({ x: this.ballX, y: this.ballY });
    if (this.trajectory.length > 50) {
      this.trajectory.shift();
    }

    // Stop at edge
    if (this.ballX > 380) {
      this.isAnimating = false;
      this.ballX = 50;
    }
  }

  private resetSimulation(): void {
    this.ballX = 50;
    this.ballY = 150;
    this.spinRate = 50;
    this.ballSpeed = 50;
    this.spinDirection = 'topspin';
    this.isAnimating = false;
    this.ballRotation = 0;
    this.trajectory = [];
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

  // --- BALL VISUALIZATION ---

  private renderBallSimulation(r: CommandRenderer, centerX: number, centerY: number, width: number, height: number): void {
    // Sky background
    r.rect(centerX - width / 2, centerY - height / 2, width, height, {
      fill: colors.skyBlue,
      rx: 12,
    });
    r.rect(centerX - width / 2, centerY - height / 2, width, height, {
      fill: colors.skyDark,
      opacity: 0.5,
      rx: 12,
    });

    // Trajectory trail
    if (this.trajectory.length > 1) {
      const pathPoints = this.trajectory.map(p => `${centerX - width / 2 + p.x},${centerY - height / 2 + p.y}`);
      r.path(`M ${pathPoints.join(' L ')}`, {
        fill: 'none',
        stroke: colors.trajectoryYellow,
        strokeWidth: 2,
        strokeDasharray: '5 5',
        opacity: 0.6,
      });
    }

    // Airflow visualization
    if (this.showAirflow && (this.phase === 'play' || this.phase === 'hook')) {
      // Top airflow - faster (lower pressure)
      r.path(`M ${centerX - 100} ${centerY - 30} Q ${centerX} ${centerY - 50} ${centerX + 100} ${centerY - 30}`, {
        fill: 'none',
        stroke: colors.airflowBlue,
        strokeWidth: 2,
        opacity: 0.7,
      });
      r.text(centerX, centerY - 55, 'Fast air = Low pressure', {
        fill: colors.airflowBlue,
        fontSize: 10,
        textAnchor: 'middle',
      });

      // Bottom airflow - slower (higher pressure)
      r.path(`M ${centerX - 100} ${centerY + 30} Q ${centerX} ${centerY + 50} ${centerX + 100} ${centerY + 30}`, {
        fill: 'none',
        stroke: colors.pressureRed,
        strokeWidth: 2,
        strokeDasharray: '8 4',
        opacity: 0.7,
      });
      r.text(centerX, centerY + 65, 'Slow air = High pressure', {
        fill: colors.pressureRed,
        fontSize: 10,
        textAnchor: 'middle',
      });

      // Magnus force arrow
      const forceDir = this.spinDirection === 'topspin' ? -1 : this.spinDirection === 'backspin' ? 1 : 0;
      if (forceDir !== 0) {
        r.line(centerX, centerY + forceDir * 20, centerX, centerY + forceDir * 50, {
          stroke: colors.forceGreen,
          strokeWidth: 3,
        });
        r.polygon([
          { x: centerX, y: centerY + forceDir * 50 },
          { x: centerX - 6, y: centerY + forceDir * 42 },
          { x: centerX + 6, y: centerY + forceDir * 42 },
        ], { fill: colors.forceGreen });
        r.text(centerX + 40, centerY + forceDir * 40, 'Magnus Force', {
          fill: colors.forceGreen,
          fontSize: 11,
          fontWeight: 'bold',
        });
      }
    }

    // Ball
    const ballPosX = centerX - width / 2 + this.ballX;
    const ballPosY = centerY - height / 2 + this.ballY;

    // Ball gradient
    r.circle(ballPosX, ballPosY, 25, {
      fill: colors.ballRed,
      stroke: '#991b1b',
      strokeWidth: 2,
    });

    // Seam lines to show rotation
    const seamOffset = this.ballRotation * Math.PI / 180;
    r.path(`M ${ballPosX - 15} ${ballPosY} Q ${ballPosX} ${ballPosY - 15 * Math.cos(seamOffset)} ${ballPosX + 15} ${ballPosY}`, {
      fill: 'none',
      stroke: colors.textPrimary,
      strokeWidth: 2,
      opacity: 0.8,
    });

    // Spin direction indicator
    if (this.spinDirection === 'topspin') {
      r.path(`M ${ballPosX - 12} ${ballPosY - 32} A 15 15 0 0 1 ${ballPosX + 12} ${ballPosY - 32}`, {
        fill: 'none',
        stroke: colors.trajectoryYellow,
        strokeWidth: 2,
      });
      r.polygon([
        { x: ballPosX + 12, y: ballPosY - 32 },
        { x: ballPosX + 6, y: ballPosY - 38 },
        { x: ballPosX + 6, y: ballPosY - 26 },
      ], { fill: colors.trajectoryYellow });
    } else if (this.spinDirection === 'backspin') {
      r.path(`M ${ballPosX + 12} ${ballPosY - 32} A 15 15 0 0 0 ${ballPosX - 12} ${ballPosY - 32}`, {
        fill: 'none',
        stroke: colors.trajectoryYellow,
        strokeWidth: 2,
      });
      r.polygon([
        { x: ballPosX - 12, y: ballPosY - 32 },
        { x: ballPosX - 6, y: ballPosY - 38 },
        { x: ballPosX - 6, y: ballPosY - 26 },
      ], { fill: colors.trajectoryYellow });
    }

    // Target zone
    r.rect(centerX + width / 2 - 40, centerY - height / 2 + 50, 25, height - 100, {
      fill: colors.success,
      opacity: 0.3,
      rx: 4,
    });
    r.text(centerX + width / 2 - 28, centerY + 50, 'Target', {
      fill: colors.success,
      fontSize: 9,
      textAnchor: 'middle',
    });
  }

  // --- PHASE RENDERERS ---

  private renderHookPhase(r: CommandRenderer): void {
    // Premium badge
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.circle(295, 44, 4, { fill: colors.primary });
    r.text(350, 49, 'SPORTS PHYSICS', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Main title
    r.text(350, 100, 'The Magnus Effect', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'How does spinning make a ball curve?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Card with simulation
    r.rect(130, 160, 440, 240, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 20,
      opacity: 0.8,
    });

    this.renderBallSimulation(r, 350, 260, 400, 180);

    r.text(350, 420, 'A pitcher throws a baseball with heavy spin.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 440, 'Instead of going straight, it curves dramatically!', {
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

    r.rect(100, 80, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 110, 'A ball is thrown with topspin (rotating forward).', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 135, 'Why does it curve downward?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Simple diagram
    r.rect(250, 150, 200, 60, { fill: colors.skyBlue, rx: 8 });
    r.circle(290, 180, 15, { fill: colors.ballRed });
    r.path('M 275 168 A 18 18 0 0 1 305 168', { fill: 'none', stroke: colors.trajectoryYellow, strokeWidth: 2 });
    r.text(290, 165, 'Topspin', { fill: colors.trajectoryYellow, fontSize: 9, textAnchor: 'middle' });
    r.line(310, 180, 420, 180, { stroke: colors.textMuted, strokeWidth: 2, strokeDasharray: '5 5' });
    r.text(370, 175, 'Which way?', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });

    // Show feedback if prediction made
    if (this.prediction) {
      const isCorrect = this.prediction === 'B';
      r.rect(100, 340, 500, 70, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 365, isCorrect
        ? 'Correct! The spinning ball creates pressure differences in the air!'
        : 'Not quite. Spin creates different air pressures on opposite sides.',
        {
          fill: isCorrect ? colors.success : colors.danger,
          fontSize: 13,
          fontWeight: 'bold',
          textAnchor: 'middle',
        }
      );
      r.text(350, 390, 'Faster air = lower pressure. The ball curves toward low pressure!', {
        fill: colors.textMuted,
        fontSize: 11,
        textAnchor: 'middle',
      });
    }
  }

  private renderPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Magnus Effect Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Simulation area
    r.rect(80, 50, 440, 220, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderBallSimulation(r, 300, 160, 400, 180);

    // Stats panel
    r.rect(540, 50, 130, 220, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    r.text(605, 80, 'Stats', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });

    r.rect(555, 95, 100, 45, { fill: '#7f1d1d30', rx: 8 });
    r.text(605, 115, 'Spin Rate', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(605, 135, `${this.spinRate}%`, { fill: colors.primary, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(555, 150, 100, 45, { fill: '#0c4a6e30', rx: 8 });
    r.text(605, 170, 'Ball Speed', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(605, 190, `${this.ballSpeed}%`, { fill: colors.airflowBlue, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(555, 205, 100, 45, { fill: '#06533930', rx: 8 });
    r.text(605, 225, 'Spin Type', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(605, 245, this.spinDirection, { fill: colors.success, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // How it works box
    r.rect(80, 290, 590, 100, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(375, 315, 'How the Magnus Effect Works:', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(375, 340, '1. Spinning ball drags air around (boundary layer)', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(375, 358, '2. One side: spin adds to airflow. Other side: spin subtracts.', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(375, 376, '3. Faster air = lower pressure (Bernoulli). Ball curves toward low pressure!', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding the Magnus Effect', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Physics card
    r.rect(50, 70, 290, 160, { fill: '#7f1d1d40', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'The Physics', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    const physics = [
      'Spinning ball creates asymmetric airflow',
      'One side moves WITH airflow (adds speed)',
      'Other side moves AGAINST airflow (subtracts)',
      'Fast air = low pressure, slow = high',
      'Ball pushed from high to low pressure!',
    ];
    physics.forEach((line, i) => {
      r.text(70, 115 + i * 20, '• ' + line, { fill: colors.textSecondary, fontSize: 10 });
    });

    // Math card
    r.rect(360, 70, 290, 160, { fill: '#0c4a6e40', stroke: colors.airflowBlue, rx: 16 });
    r.text(505, 95, 'The Math', { fill: colors.airflowBlue, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(380, 110, 250, 30, { fill: colors.bgCard, rx: 4 });
    r.text(505, 130, 'F = CL × ½ρv²A', { fill: colors.textPrimary, fontSize: 14, fontFamily: 'monospace', textAnchor: 'middle' });
    const mathItems = ['F = Magnus force', 'CL = Lift coefficient (spin)', 'ρ = Air density', 'v = Ball velocity', 'A = Cross-sectional area'];
    mathItems.forEach((item, i) => {
      r.text(380, 155 + i * 16, '• ' + item, { fill: colors.textSecondary, fontSize: 10 });
    });

    // Spin effects card
    r.rect(50, 250, 600, 100, { fill: '#06533940', stroke: colors.success, rx: 16 });
    r.text(350, 275, 'Spin Direction Effects', { fill: colors.success, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const spinTypes = [
      { name: 'Topspin', effect: 'Ball curves DOWN', sport: 'Tennis groundstrokes' },
      { name: 'Backspin', effect: 'Ball curves UP (floats)', sport: 'Golf drives' },
      { name: 'Sidespin', effect: 'Ball curves LEFT/RIGHT', sport: 'Curveballs, hooks' },
    ];
    spinTypes.forEach((spin, i) => {
      const x = 100 + i * 200;
      r.text(x, 300, spin.name, { fill: colors.textPrimary, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x, 318, spin.effect, { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
      r.text(x, 334, spin.sport, { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist Challenge', {
      fill: colors.accent,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'Smooth balls curve predictably with the Magnus effect.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 145, 'But what about a ball spinning VERY fast at VERY high speeds?', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 175, 'At extreme conditions, what happens to the curve?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Feedback
    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'C';
      r.rect(100, 340, 500, 70, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 365, isCorrect
        ? 'Incredible! The "Reverse Magnus Effect" is real!'
        : 'Not quite. At extreme conditions, the curve can actually REVERSE!',
        {
          fill: isCorrect ? colors.success : colors.danger,
          fontSize: 13,
          fontWeight: 'bold',
          textAnchor: 'middle',
        }
      );
      r.text(350, 390, 'At extreme spin rates and speeds, boundary layer behavior changes completely!', {
        fill: colors.textMuted,
        fontSize: 11,
        textAnchor: 'middle',
      });
    }
  }

  private renderTwistPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Reverse Magnus Effect', {
      fill: colors.accent,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Normal Magnus diagram
    r.rect(80, 60, 260, 150, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(210, 85, 'Normal Magnus', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(100, 100, 220, 80, { fill: colors.skyBlue, rx: 8 });
    r.circle(140, 140, 18, { fill: colors.ballRed });
    r.path('M 125 125 A 20 20 0 0 1 155 125', { fill: 'none', stroke: colors.trajectoryYellow, strokeWidth: 2 });
    r.path('M 160 140 Q 220 120 280 140', { fill: 'none', stroke: colors.forceGreen, strokeWidth: 3 });
    r.text(220, 115, 'Curves up', { fill: colors.forceGreen, fontSize: 10 });
    r.text(210, 195, 'Smooth ball, normal speed', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });

    // Reverse Magnus diagram
    r.rect(360, 60, 260, 150, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(490, 85, 'Reverse Magnus', { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(380, 100, 220, 80, { fill: colors.skyBlue, rx: 8 });
    r.circle(420, 140, 18, { fill: colors.ballRed });
    r.path('M 405 125 A 20 20 0 0 1 435 125', { fill: 'none', stroke: colors.trajectoryYellow, strokeWidth: 3 });
    r.path('M 410 130 A 15 15 0 0 1 430 130', { fill: 'none', stroke: colors.trajectoryYellow, strokeWidth: 2 });
    r.path('M 440 140 Q 500 160 560 140', { fill: 'none', stroke: colors.accent, strokeWidth: 3 });
    r.text(500, 165, 'Curves DOWN!', { fill: colors.accent, fontSize: 10 });
    r.text(490, 195, 'Extreme spin & speed', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });

    // Explanation box
    r.rect(80, 230, 540, 140, { fill: '#6b21a840', stroke: colors.accent, rx: 16 });
    r.text(350, 255, 'Why Does It Reverse?', { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    const reasons = [
      'At extreme speeds, boundary layer transitions from laminar to turbulent',
      'Turbulent flow separates from the ball at different points than laminar flow',
      'This changes which side has higher/lower pressure',
      'The result: the ball curves the OPPOSITE direction!',
    ];
    reasons.forEach((reason, i) => {
      r.text(100, 280 + i * 20, '• ' + reason, { fill: colors.textSecondary, fontSize: 11 });
    });
    r.text(350, 360, 'Observed in volleyball serves and extreme baseball pitches!', {
      fill: colors.primary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', {
      fill: colors.accent,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 280, { fill: '#6b21a840', stroke: colors.accent, rx: 16 });
    r.text(350, 115, 'The Magnus Effect Has Hidden Complexity!', {
      fill: colors.accent,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 150, 'The Magnus effect isn\'t a simple linear relationship. It depends on:', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });

    const factors = [
      '1. Ball surface texture (smooth vs dimpled vs rough)',
      '2. Spin rate relative to forward velocity',
      '3. Reynolds number (fluid dynamics parameter)',
      '4. Air density and viscosity',
    ];
    factors.forEach((factor, i) => {
      r.text(150, 180 + i * 25, factor, { fill: colors.textSecondary, fontSize: 12 });
    });

    r.text(350, 290, 'The curve can be normal, enhanced, reduced, or even reversed!', {
      fill: colors.success,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 330, 'Golf balls have dimples to create controlled turbulent boundary layer -', {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });
    r.text(350, 350, 'this ENHANCES the Magnus effect while reducing overall drag!', {
      fill: colors.textMuted,
      fontSize: 11,
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

    // App tabs
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

    // Selected app content
    const app = applications[this.selectedApp];
    r.rect(80, 130, 540, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    r.text(350, 160, app.title, {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 200, app.description, {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    r.rect(100, 230, 500, 60, { fill: colors.bgCardLight, rx: 8 });
    r.text(350, 265, app.details, {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });

    // Progress
    r.text(350, 360, `Progress: ${this.completedApps.filter(c => c).length}/4`, {
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
      fontSize: 14,
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
        fontSize: 12,
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

    r.text(350, 200, passed
      ? "Excellent! You've mastered the Magnus effect!"
      : 'Keep studying! Review the concepts and try again.',
      {
        fill: colors.textSecondary,
        fontSize: 16,
        textAnchor: 'middle',
      }
    );
  }

  private renderMasteryPhase(r: CommandRenderer): void {
    r.rect(150, 80, 400, 340, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 24,
    });

    r.text(350, 130, 'Magnus Effect Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, 'You\'ve mastered the physics of spinning balls!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'spin', label: 'Spin Physics' },
      { icon: 'pressure', label: 'Pressure Dynamics' },
      { icon: 'sports', label: 'Sports Applications' },
      { icon: 'reverse', label: 'Reverse Magnus' },
    ];

    badges.forEach((badge, i) => {
      const x = 180 + (i % 2) * 170;
      const y = 200 + Math.floor(i / 2) * 80;
      r.rect(x, y, 150, 60, { fill: colors.bgCardLight, rx: 12 });
      r.text(x + 75, y + 25, badge.icon === 'spin' ? '🌀' : badge.icon === 'pressure' ? '💨' : badge.icon === 'sports' ? '⚾' : '🔄', {
        fill: colors.primary,
        fontSize: 18,
        textAnchor: 'middle',
      });
      r.text(x + 75, y + 45, badge.label, { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    });
  }

  // --- UI STATE ---

  private renderUIState(r: CommandRenderer): void {
    r.setHeader(this.gameTitle, this.phaseLabels[this.phase]);

    r.setProgress({
      id: 'phase_progress',
      current: this.phaseOrder.indexOf(this.phase) + 1,
      total: this.phaseOrder.length,
      labels: this.phaseOrder.map(p => this.phaseLabels[p]),
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
        r.addButton({ id: 'throw_ball', label: 'Throw Curveball', variant: 'secondary' });
        r.addButton({ id: 'next', label: 'Discover the Secret', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Spin adds weight', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Pressure differences', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Air grabs the ball', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. Gyroscopic effects', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Explore the Physics', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'spin_rate', label: 'Spin Rate', value: this.spinRate, min: 0, max: 100 });
        r.addSlider({ id: 'ball_speed', label: 'Ball Speed', value: this.ballSpeed, min: 20, max: 100 });
        r.addButton({ id: 'spin_topspin', label: 'Topspin', variant: this.spinDirection === 'topspin' ? 'primary' : 'secondary' });
        r.addButton({ id: 'spin_backspin', label: 'Backspin', variant: this.spinDirection === 'backspin' ? 'primary' : 'secondary' });
        r.addButton({ id: 'spin_sidespin', label: 'Sidespin', variant: this.spinDirection === 'sidespin' ? 'primary' : 'secondary' });
        r.addButton({ id: 'throw_ball', label: 'Throw Ball', variant: 'danger' });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Discover a Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Curve gets stronger', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Goes straight', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Curve REVERSES', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D. Ball explodes', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See How', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addButton({ id: 'next', label: 'Review Discovery', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real-World Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Baseball', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Soccer', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Golf', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Table Tennis', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every(c => c)) {
          r.addButton({ id: 'next', label: 'Take Knowledge Test', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= testQuestions.length - 1 });
          if (this.testAnswers.every(a => a !== null)) {
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
      ballX: this.ballX,
      ballY: this.ballY,
      spinRate: this.spinRate,
      ballSpeed: this.ballSpeed,
      spinDirection: this.spinDirection,
      isAnimating: this.isAnimating,
      ballRotation: this.ballRotation,
      trajectory: this.trajectory,
      showAirflow: this.showAirflow,
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
    this.ballX = (state.ballX as number) || 50;
    this.ballY = (state.ballY as number) || 150;
    this.spinRate = (state.spinRate as number) || 50;
    this.ballSpeed = (state.ballSpeed as number) || 50;
    this.spinDirection = (state.spinDirection as 'topspin' | 'backspin' | 'sidespin') || 'topspin';
    this.isAnimating = (state.isAnimating as boolean) || false;
    this.ballRotation = (state.ballRotation as number) || 0;
    this.trajectory = (state.trajectory as { x: number; y: number }[]) || [];
    this.showAirflow = (state.showAirflow as boolean) ?? true;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===
export function createMagnusEffectGame(sessionId: string): MagnusEffectGame {
  return new MagnusEffectGame(sessionId);
}
