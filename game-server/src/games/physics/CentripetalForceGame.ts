/**
 * Centripetal Force Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Centripetal force formula: F = mv^2/r
 * - Angular velocity: omega = v/r
 * - Centripetal acceleration: a = v^2/r
 * - Banking angle formula: theta = arctan(v^2/rg)
 * - Sliding threshold calculations
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
    question: 'Centripetal force always points:',
    options: ['Tangent to the circle', 'Outward from center', 'Toward the center', 'In direction of motion'],
    correctIndex: 2,
  },
  {
    question: 'The formula for centripetal force is:',
    options: ['F = ma', 'F = mv^2/r', 'F = mg', 'F = kx'],
    correctIndex: 1,
  },
  {
    question: 'If you double the speed on a curve, the required centripetal force:',
    options: ['Doubles', 'Quadruples', 'Halves', 'Stays the same'],
    correctIndex: 1,
  },
  {
    question: '"Centrifugal force" is:',
    options: [
      'A real force pushing outward',
      'An apparent force in rotating frames',
      'Same as centripetal force',
      'A gravitational effect',
    ],
    correctIndex: 1,
  },
  {
    question: 'What provides centripetal force for a car on a flat road?',
    options: ['Engine power', 'Air resistance', 'Friction between tires and road', 'Steering wheel'],
    correctIndex: 2,
  },
  {
    question: 'A banked curve works by using:',
    options: ['Air lift', 'A component of normal force', 'Engine braking', 'Magnetic rails'],
    correctIndex: 1,
  },
  {
    question: 'If curve radius decreases at constant speed:',
    options: ['F_c decreases', 'F_c increases', 'F_c stays same', 'Car stops'],
    correctIndex: 1,
  },
  {
    question: 'In a centrifuge, objects move outward because:',
    options: [
      'Real outward force',
      'They continue straight while container curves',
      'Gravity pulls them',
      'Electric fields',
    ],
    correctIndex: 1,
  },
  {
    question: 'At top of roller coaster loop, centripetal force is from:',
    options: ['Friction only', 'Normal force and gravity together', 'Air resistance', 'Motor'],
    correctIndex: 1,
  },
  {
    question: 'Ideal banking angle depends on:',
    options: ['Only speed', 'Only radius', 'Both speed and radius', 'Always 45 degrees'],
    correctIndex: 2,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#06b6d4',
  primaryDark: '#0891b2',
  accent: '#a855f7',
  accentDark: '#9333ea',
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
  track: '#374151',
  trackInner: '#1e293b',
  car: '#3b82f6',
  carSliding: '#ef4444',
  velocityVector: '#22c55e',
  forceVector: '#ef4444',
  centerMarker: '#fbbf24',
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
    title: 'Highway Engineering',
    icon: 'road',
    description: 'Highway curves are banked to allow cars to turn safely at higher speeds without relying solely on friction.',
    details: 'Engineers use theta = arctan(v^2/rg) to calculate the ideal banking angle. Exit ramps have speed warnings because the banking is designed for a specific velocity.',
  },
  {
    title: 'Roller Coaster Loops',
    icon: 'coaster',
    description: "At the top of a loop, gravity and the track's normal force both point toward the center, providing centripetal force.",
    details: 'Clothoid loops (teardrop shaped) keep g-forces manageable. At the top: N + mg = mv^2/r, so you feel lighter but stay on track!',
  },
  {
    title: 'Centrifuges',
    icon: 'lab',
    description: "Lab centrifuges spin samples at high speeds to separate substances by density using 'centrifugal' effects.",
    details: "In the rotating frame, denser particles experience more 'outward push' and collect at the bottom. Speeds can exceed 100,000 RPM!",
  },
  {
    title: 'Washing Machine Spin',
    icon: 'washing',
    description: 'The spin cycle uses circular motion to force water out of clothes through holes in the drum.',
    details: 'Clothes press against the drum wall while water escapes through perforations. Typical spin speeds: 800-1400 RPM.',
  },
];

// === MAIN GAME CLASS ===

export class CentripetalForceGame extends BaseGame {
  readonly gameType = 'centripetal_force';
  readonly gameTitle = 'Centripetal Force';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private carAngle = 0;
  private speed = 5;
  private radius = 70;
  private showVectors = true;
  private isAnimating = true;
  private isSliding = false;
  private bankAngle = 0;
  private time = 0;

  // PROTECTED: Physics constants
  private readonly maxFriction = 0.8;
  private readonly mass = 1; // normalized mass

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
    hook: 'When a car turns, you feel pushed outward. But is there really an outward force?',
    predict: 'Think carefully - in which direction is the NET force on a car moving in a circle?',
    play: 'Experiment with speed and radius. Watch what happens when the required force exceeds friction!',
    review: "Centripetal force is 'center-seeking'. It changes direction, not speed!",
    twist_predict: 'Banked curves can eliminate the need for friction. How does this work?',
    twist_play: 'Adjust the banking angle. See how the normal force provides centripetal force!',
    twist_review: 'The physics is the same - F = mv^2/r - but the SOURCE of the force varies!',
    transfer: 'Centripetal force is everywhere: roads, roller coasters, centrifuges, and more.',
    test: 'Time to test your understanding of circular motion!',
    mastery: 'Congratulations! You understand centripetal force and circular motion!',
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
      message: 'Centripetal Force lesson started',
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

    // Predictions (predict phase) - correct answer is B
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }

    // Twist predictions - correct answer is C
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
    if (id === 'vectors') {
      this.showVectors = value;
      return;
    }
    if (id === 'animation') {
      this.isAnimating = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'speed') {
      this.speed = value;
      this.updateSlidingState();
      return;
    }
    if (id === 'radius') {
      this.radius = value;
      this.updateSlidingState();
      return;
    }
    if (id === 'bank_angle') {
      this.bankAngle = value;
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

  /**
   * PROTECTED: Centripetal force calculation
   * F_c = mv^2/r
   */
  private calculateCentripetalForce(): number {
    return (this.mass * this.speed * this.speed) / this.radius;
  }

  /**
   * PROTECTED: Angular velocity calculation
   * omega = v/r
   */
  private calculateAngularVelocity(): number {
    return this.speed / this.radius;
  }

  /**
   * PROTECTED: Centripetal acceleration
   * a_c = v^2/r
   */
  private calculateCentripetalAcceleration(): number {
    return (this.speed * this.speed) / this.radius;
  }

  /**
   * PROTECTED: Check if car is sliding (F_c > max friction force)
   */
  private updateSlidingState(): void {
    const centripetalForce = this.calculateCentripetalForce();
    const maxFrictionForce = this.maxFriction * 10; // normalized
    this.isSliding = centripetalForce > maxFrictionForce;
  }

  /**
   * PROTECTED: Ideal banking angle calculation
   * theta = arctan(v^2 / (r * g))
   */
  private calculateIdealBankAngle(): number {
    const g = 9.81;
    return Math.atan((this.speed * this.speed) / (this.radius * g)) * (180 / Math.PI);
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;

    this.time += deltaTime / 1000;

    // Update car angle based on angular velocity
    const angularVelocity = this.speed * 0.5; // visual scaling
    this.carAngle = (this.carAngle + angularVelocity) % 360;

    // Update sliding state
    this.updateSlidingState();
  }

  private resetSimulation(): void {
    this.carAngle = 0;
    this.time = 0;
    this.isAnimating = true;
    this.updateSlidingState();
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
    r.setViewport(700, 500);

    // Background
    this.renderBackground(r);

    // Phase-specific content
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

    // UI state
    this.renderUIState(r);

    return r.toFrame(this.nextFrame());
  }

  private renderBackground(r: CommandRenderer): void {
    r.clear(colors.bgDark);

    // Subtle gradient overlay
    r.linearGradient('labBg', [
      { offset: '0%', color: '#0a1628' },
      { offset: '50%', color: '#0a0f1a' },
      { offset: '100%', color: '#0a1628' },
    ]);

    // Ambient glow effects
    r.circle(175, 0, 200, { fill: '#06b6d4', opacity: 0.03 });
    r.circle(525, 500, 200, { fill: '#3b82f6', opacity: 0.03 });
  }

  // --- CIRCULAR TRACK RENDERER ---

  private renderCircularTrack(r: CommandRenderer, centerX: number, centerY: number, showVec: boolean, size: number = 280): void {
    const scale = size / 280;
    const trackRadius = this.radius * scale;

    // Track surface (outer)
    r.circle(centerX, centerY, trackRadius + 20 * scale, { fill: colors.track });
    // Track inner
    r.circle(centerX, centerY, trackRadius - 20 * scale, { fill: colors.trackInner });
    // Track centerline (dashed)
    r.circle(centerX, centerY, trackRadius, {
      fill: 'none',
      stroke: colors.centerMarker,
      strokeWidth: 2,
      strokeDasharray: '10 5',
    });

    // Track markers
    for (let angle = 0; angle < 360; angle += 45) {
      const rad = (angle * Math.PI) / 180;
      const x1 = centerX + Math.cos(rad) * (trackRadius - 15 * scale);
      const y1 = centerY + Math.sin(rad) * (trackRadius - 15 * scale);
      const x2 = centerX + Math.cos(rad) * (trackRadius + 15 * scale);
      const y2 = centerY + Math.sin(rad) * (trackRadius + 15 * scale);
      r.line(x1, y1, x2, y2, { stroke: colors.textPrimary, strokeWidth: 2 });
    }

    // Car position
    const carRad = (this.carAngle * Math.PI) / 180;
    const carX = centerX + Math.cos(carRad) * trackRadius;
    const carY = centerY + Math.sin(carRad) * trackRadius;

    // Sliding indicators
    if (this.isSliding) {
      const centripetalForce = this.calculateCentripetalForce();
      const centX = ((centerX - carX) / trackRadius) * 35 * scale * Math.min(centripetalForce / 5, 2);
      const centY = ((centerY - carY) / trackRadius) * 35 * scale * Math.min(centripetalForce / 5, 2);

      for (let i = 1; i <= 3; i++) {
        r.circle(carX - centX * 0.2 * i, carY - centY * 0.2 * i, (4 - i) * scale, {
          fill: colors.danger,
          opacity: 0.8 - i * 0.2,
        });
      }
      r.text(carX, carY - 35 * scale, 'SLIDING!', {
        fill: colors.danger,
        fontSize: 11,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
    }

    // Car
    r.group(`translate(${carX}, ${carY}) rotate(${this.carAngle + 90})`, (g) => {
      // Car body
      g.rect(-10 * scale, -16 * scale, 20 * scale, 32 * scale, {
        fill: this.isSliding ? colors.carSliding : colors.car,
        rx: 4 * scale,
      });
      // Windshield
      g.rect(-8 * scale, -12 * scale, 16 * scale, 10 * scale, {
        fill: '#93c5fd',
        rx: 2 * scale,
      });
      // Wheels
      g.rect(-11 * scale, -14 * scale, 5 * scale, 7 * scale, { fill: '#1f2937', rx: 1 * scale });
      g.rect(6 * scale, -14 * scale, 5 * scale, 7 * scale, { fill: '#1f2937', rx: 1 * scale });
      g.rect(-11 * scale, 6 * scale, 5 * scale, 7 * scale, { fill: '#1f2937', rx: 1 * scale });
      g.rect(6 * scale, 6 * scale, 5 * scale, 7 * scale, { fill: '#1f2937', rx: 1 * scale });
    });

    // Vectors
    if (showVec) {
      const centripetalForce = this.calculateCentripetalForce();
      const velAngle = this.carAngle + 90;
      const velRad = (velAngle * Math.PI) / 180;
      const velX = Math.cos(velRad) * 35 * scale;
      const velY = Math.sin(velRad) * 35 * scale;

      const centMag = 35 * scale * Math.min(centripetalForce / 5, 2);
      const centX = ((centerX - carX) / trackRadius) * centMag;
      const centY = ((centerY - carY) / trackRadius) * centMag;

      // Velocity vector (green)
      r.line(carX, carY, carX + velX, carY + velY, {
        stroke: colors.velocityVector,
        strokeWidth: 3,
      });
      r.text(carX + velX * 1.2, carY + velY * 1.2, 'v', {
        fill: colors.velocityVector,
        fontSize: 12,
        fontWeight: 'bold',
      });

      // Centripetal force vector (red)
      r.line(carX, carY, carX + centX, carY + centY, {
        stroke: colors.forceVector,
        strokeWidth: 3,
      });
      r.text((carX + centerX) / 2 - 15, (carY + centerY) / 2, 'F_c', {
        fill: colors.forceVector,
        fontSize: 11,
        fontWeight: 'bold',
      });

      // Center marker
      r.circle(centerX, centerY, 5 * scale, { fill: colors.centerMarker });
    }
  }

  // --- BANKED CURVE RENDERER ---

  private renderBankedCurve(r: CommandRenderer, centerX: number, centerY: number): void {
    const bankRad = (this.bankAngle * Math.PI) / 180;

    // Road surface (tilted polygon)
    r.polygon(
      [
        { x: centerX - 90, y: centerY + 40 },
        { x: centerX + 90, y: centerY },
        { x: centerX + 90, y: centerY + 20 },
        { x: centerX - 90, y: centerY + 60 },
      ],
      { fill: '#4b5563' }
    );

    // Car on banked surface
    r.group(`translate(${centerX}, ${centerY + 10}) rotate(${-this.bankAngle})`, (g) => {
      g.rect(-15, -10, 30, 20, { fill: colors.warning, rx: 3 });

      // Normal force vector
      const normalLength = 40;
      const normalX = -Math.sin(bankRad) * normalLength;
      const normalY = -Math.cos(bankRad) * normalLength;
      g.line(0, -10, normalX, -10 + normalY, { stroke: colors.accent, strokeWidth: 2 });
      g.text(normalX - 5, -15 + normalY, 'N', { fill: colors.accent, fontSize: 10 });
    });

    // Gravity vector
    r.line(centerX, centerY + 10, centerX, centerY + 50, { stroke: colors.velocityVector, strokeWidth: 2 });
    r.text(centerX + 8, centerY + 45, 'mg', { fill: colors.velocityVector, fontSize: 10 });

    // Horizontal component of normal force (if banked)
    if (this.bankAngle > 5) {
      r.line(centerX, centerY + 10, centerX - 40, centerY + 10, {
        stroke: colors.forceVector,
        strokeWidth: 2,
        strokeDasharray: '4 2',
      });
      r.text(centerX - 55, centerY + 8, 'N sin(theta)', { fill: colors.forceVector, fontSize: 9 });
    }

    // Bank angle label
    r.text(centerX, centerY + 75, `Bank angle: ${this.bankAngle} deg`, {
      fill: colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle',
    });
  }

  // --- PHASE RENDERERS ---

  private renderHookPhase(r: CommandRenderer): void {
    // Premium badge
    r.rect(280, 30, 140, 28, { fill: '#06b6d4', opacity: 0.1, rx: 14, stroke: '#06b6d4', strokeWidth: 1 });
    r.circle(295, 44, 4, { fill: '#06b6d4' });
    r.text(350, 49, 'PHYSICS EXPLORATION', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Main title
    r.text(350, 100, 'The Force That Curves', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'Discover what really happens when objects move in circles', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Card with animation
    r.rect(160, 160, 380, 260, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 20,
      opacity: 0.8,
    });

    // Circular track visualization
    this.renderCircularTrack(r, 350, 270, true, 180);

    // Question text
    r.text(350, 400, 'When a car turns, you feel pushed toward the outside.', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 420, 'What force keeps the car moving in a circle?', {
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

    // Question card
    r.rect(100, 80, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 115, 'A car travels around a circular track at constant speed.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'In which direction is the NET force on the car?', {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Small track diagram
    this.renderCircularTrack(r, 350, 250, false, 120);

    // Show feedback if prediction made
    if (this.prediction) {
      const isCorrect = this.prediction === 'B';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 375, isCorrect
        ? 'Correct! This inward force is called centripetal force - "center-seeking"!'
        : 'Not quite. The net force points toward the CENTER of the circle.',
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
    r.text(350, 30, 'Centripetal Force Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Main simulation area
    r.rect(120, 50, 280, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderCircularTrack(r, 260, 190, this.showVectors, 220);

    // Stats panel
    r.rect(420, 50, 230, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    // Physics values (calculated server-side)
    const centripetalForce = this.calculateCentripetalForce();
    const maxFrictionForce = this.maxFriction * 10;

    r.text(535, 80, 'Physics Data', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Required centripetal force
    r.rect(440, 100, 190, 50, { fill: '#0c4a6e30', rx: 8 });
    r.text(535, 120, 'Required F_c', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(535, 140, centripetalForce.toFixed(2), {
      fill: this.isSliding ? colors.danger : colors.primary,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Max friction
    r.rect(440, 160, 190, 50, { fill: '#78350f30', rx: 8 });
    r.text(535, 180, 'Max Friction', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(535, 200, maxFrictionForce.toFixed(1), {
      fill: colors.warning,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Status
    r.rect(440, 220, 190, 50, { fill: this.isSliding ? '#7f1d1d30' : '#06533930', rx: 8 });
    r.text(535, 240, 'Status', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(535, 260, this.isSliding ? 'SLIDING' : 'GRIPPING', {
      fill: this.isSliding ? colors.danger : colors.success,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Formula box
    r.rect(120, 350, 530, 60, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(385, 375, 'Key Formula: F = mv^2/r', {
      fill: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(385, 395, 'v (velocity) is tangent. F_c points to center. If F_c exceeds friction, the car slides!', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Centripetal Force', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Centripetal force card
    r.rect(50, 70, 290, 160, { fill: '#0c4a6e40', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'Centripetal Force', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const centInfo = [
      '"Center-seeking" - always toward the center',
      'F = mv^2/r (mass x velocity^2 / radius)',
      'Changes direction, not speed',
      'Provided by friction, tension, gravity, etc.',
    ];
    centInfo.forEach((line, i) => {
      r.text(70, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    // Centrifugal force card
    r.rect(360, 70, 290, 160, { fill: '#7f1d1d40', stroke: colors.danger, rx: 16 });
    r.text(505, 95, '"Centrifugal Force"', { fill: colors.danger, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const fugalInfo = [
      'NOT a real force - it\'s fictitious',
      'Only appears in rotating reference frames',
      'You feel "pushed out" because you want to go straight',
      'Newton\'s 1st Law: objects resist direction changes',
    ];
    fugalInfo.forEach((line, i) => {
      r.text(380, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    // Physics equations card
    r.rect(50, 250, 600, 80, { fill: '#06533940', stroke: colors.success, rx: 16 });
    r.text(350, 275, 'The Physics', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 300, 'Centripetal acceleration: a = v^2/r always toward center', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 318, 'Newton\'s 2nd Law: F = ma = mv^2/r  |  Double the speed? Requires 4x the force!', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist Challenge', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Question card
    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'Race tracks and highway ramps have banked (tilted) curves.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 150, 'At the right speed, a car can turn with ZERO friction.', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 175, 'How does banking eliminate the need for friction?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Show feedback if prediction made
    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'C';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 375, isCorrect
        ? 'Exactly! The tilted surface redirects the normal force to have an inward component!'
        : 'Not quite. Think about which forces act on the car on a tilted surface.',
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
    r.text(350, 30, 'Banked Curve Physics', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Banked curve visualization
    r.rect(120, 50, 460, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderBankedCurve(r, 350, 130);

    // Explanation
    r.rect(120, 270, 460, 140, { fill: '#78350f30', stroke: colors.warning, rx: 16 });
    r.text(350, 295, 'Why Banking Works:', { fill: colors.warning, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const bankInfo = [
      '* Normal force N is perpendicular to the tilted road',
      '* N has a horizontal component: N sin(theta) toward center',
      '* This horizontal component provides centripetal force!',
      '* At the "design speed," friction isn\'t needed at all',
    ];
    bankInfo.forEach((line, i) => {
      r.text(140, 320 + i * 20, line, { fill: colors.textSecondary, fontSize: 12 });
    });
    r.text(350, 400, 'NASCAR tracks are banked up to 33 deg - allowing cars to turn at 200+ mph!', {
      fill: colors.primary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 250, { fill: '#78350f30', stroke: colors.warning, rx: 16 });
    r.text(350, 110, 'Centripetal Force Has Many Sources!', {
      fill: colors.warning,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const sources = [
      { source: 'Flat road:', force: 'Friction' },
      { source: 'Banked road:', force: 'Component of normal force' },
      { source: 'Planets orbiting:', force: 'Gravity' },
      { source: 'Ball on string:', force: 'Tension' },
      { source: 'Roller coaster loop:', force: 'Normal force +/- gravity' },
    ];

    sources.forEach((item, i) => {
      r.text(200, 145 + i * 30, item.source, { fill: colors.textSecondary, fontSize: 13, fontWeight: 'bold' });
      r.text(350, 145 + i * 30, item.force, { fill: colors.textPrimary, fontSize: 13 });
    });

    r.text(350, 310, 'The physics is the same - F = mv^2/r - but the SOURCE varies!', {
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
        fontSize: 12,
        textAnchor: 'middle',
      });
    });

    // Selected app content
    const app = applications[this.selectedApp];
    r.rect(80, 130, 540, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    r.text(350, 165, app.title, {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Wrap description text
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

    // Progress indicator
    r.text(350, 360, `Progress: ${this.completedApps.filter((c) => c).length}/4`, {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Progress dots
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

    // Answer options
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

    r.text(350, 200, passed ? "Excellent! You've mastered centripetal force!" : 'Keep studying! Review and try again.', {
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

    r.text(350, 130, 'Circular Motion Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, "You've mastered centripetal force and circular motion!", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Achievement badges
    const badges = [
      { icon: 'F_c', label: 'Centripetal Force' },
      { icon: 'theta', label: 'Banked Curves' },
      { icon: 'loop', label: 'Vertical Loops' },
      { icon: 'spin', label: 'Centrifuges' },
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

    // Back button
    if (idx > 0) {
      r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });
    }

    // Phase-specific controls
    switch (this.phase) {
      case 'hook':
        r.addButton({ id: 'next', label: 'Discover the Truth', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Forward (motion direction)', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Toward the center', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Outward from center', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. No net force', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Explore the Physics', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'speed', label: 'Speed', value: this.speed, min: 2, max: 15, step: 0.5 });
        r.addSlider({ id: 'radius', label: 'Curve Radius', value: this.radius, min: 40, max: 100 });
        r.addToggle({ id: 'vectors', label: 'Vectors', value: this.showVectors, onLabel: 'ON', offLabel: 'OFF' });
        r.addButton({ id: 'toggle_animation', label: this.isAnimating ? 'Pause' : 'Play', variant: this.isAnimating ? 'danger' : 'success' });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Discover a Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Creates outward push', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Car naturally faster', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Normal force component', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D. Stronger gravity', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See How It Works', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({ id: 'bank_angle', label: 'Bank Angle', value: this.bankAngle, min: 0, max: 45 });
        r.addButton({ id: 'next', label: 'Review Discovery', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real-World Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Highway', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Coaster', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Centrifuge', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Washer', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
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
      carAngle: this.carAngle,
      speed: this.speed,
      radius: this.radius,
      showVectors: this.showVectors,
      isAnimating: this.isAnimating,
      isSliding: this.isSliding,
      bankAngle: this.bankAngle,
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
    this.carAngle = (state.carAngle as number) || 0;
    this.speed = (state.speed as number) || 5;
    this.radius = (state.radius as number) || 70;
    this.showVectors = (state.showVectors as boolean) ?? true;
    this.isAnimating = (state.isAnimating as boolean) ?? true;
    this.isSliding = (state.isSliding as boolean) || false;
    this.bankAngle = (state.bankAngle as number) || 0;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
    this.updateSlidingState();
  }
}

// === FACTORY FUNCTION ===
// Register this in server.ts: registry.register('centripetal_force', createCentripetalForceGame);

export function createCentripetalForceGame(sessionId: string): CentripetalForceGame {
  return new CentripetalForceGame(sessionId);
}
