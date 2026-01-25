/**
 * Elastic Collisions Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Momentum conservation: m1*v1 + m2*v2 = m1*v1' + m2*v2'
 * - Kinetic energy conservation: (1/2)m1*v1^2 + (1/2)m2*v2^2 = (1/2)m1*v1'^2 + (1/2)m2*v2'^2
 * - Elastic collision final velocity formulas
 * - Coefficient of restitution calculations
 * - Newton's cradle animation physics
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer, clamp } from '../../renderer/CommandRenderer.js';

// === GAME PHASES ===
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

// === TEST QUESTIONS (PROTECTED - never sent to client) ===
interface TestQuestion {
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const testQuestions: TestQuestion[] = [
  {
    scenario: 'A pool player hits the cue ball into the 8-ball. The cue ball stops dead, and the 8-ball moves away at the same speed.',
    question: 'What quantities are conserved in this elastic collision?',
    options: [
      'Only momentum is conserved',
      'Only kinetic energy is conserved',
      'Both momentum and kinetic energy are conserved',
      'Neither momentum nor kinetic energy is conserved',
    ],
    correctIndex: 2,
    explanation: 'Elastic collisions conserve BOTH momentum (p = mv) AND kinetic energy (KE = 1/2 mv^2). The cue ball transfers all its momentum and energy to the 8-ball.',
  },
  {
    scenario: "You're playing with a Newton's cradle on your desk. Steel balls click back and forth for several minutes before stopping.",
    question: "Why does Newton's cradle demonstrate nearly elastic collisions?",
    options: [
      'The balls are magnetic and attract each other',
      'Steel balls barely deform, losing very little energy to heat',
      'The strings store and release energy',
      'Air resistance is zero inside the cradle',
    ],
    correctIndex: 1,
    explanation: 'Steel is very hard and barely deforms on impact. The tiny deformation stores energy briefly as elastic potential, then returns almost all of it. Real steel balls lose only 1-5% energy per collision.',
  },
  {
    scenario: "You pull back 2 balls on the left side of a Newton's cradle and release them.",
    question: 'What happens on the other side?',
    options: [
      '1 ball flies out at double the speed',
      '2 balls fly out at the same speed the incoming balls had',
      'All 5 balls move together slowly',
      'The middle ball absorbs the energy and heats up',
    ],
    correctIndex: 1,
    explanation: 'Exactly 2 balls swing out at the same velocity. This is the ONLY outcome that conserves both momentum AND kinetic energy simultaneously.',
  },
  {
    scenario: 'A physics textbook describes a collision as having a coefficient of restitution (e) equal to 1.',
    question: 'What does this tell you about the collision?',
    options: [
      'The objects stick together (perfectly inelastic)',
      'Half the kinetic energy is lost',
      "It's a perfectly elastic collision with no energy loss",
      'The collision takes exactly 1 second',
    ],
    correctIndex: 2,
    explanation: 'The coefficient of restitution e = 1 means perfectly elastic (no energy loss). e = 0 means perfectly inelastic (objects stick together). Real collisions have 0 < e < 1.',
  },
  {
    scenario: "A student asks: 'When 2 balls are released on Newton's cradle, why can't 1 ball fly out at twice the speed? Both conserve momentum!'",
    question: "What's the correct response?",
    options: [
      'Friction prevents the ball from reaching 2x speed',
      '1 ball at 2x speed would have 4x the kinetic energy, violating energy conservation',
      'The string length limits maximum velocity',
      'Gravity pulls equally on all balls, so they must move equally',
    ],
    correctIndex: 1,
    explanation: 'KE = 1/2 mv^2, so doubling velocity quadruples energy! 2 balls at v have KE = mv^2, but 1 ball at 2v would have KE = 1/2 m(2v)^2 = 2mv^2. Energy conservation forbids this.',
  },
  {
    scenario: 'Two identical hockey pucks slide toward each other on frictionless ice and collide head-on elastically.',
    question: 'What happens after the collision?',
    options: [
      'Both pucks stop at the collision point',
      "They exchange velocities - each moves the opposite direction at the other's original speed",
      'They stick together and move at half speed',
      'Both pucks continue in their original directions at half speed',
    ],
    correctIndex: 1,
    explanation: 'In an elastic head-on collision between equal masses, they exchange velocities completely. This satisfies both conservation of momentum and conservation of kinetic energy.',
  },
  {
    scenario: 'Engineers test two different materials for collision efficiency. Material A loses 2% energy per collision, Material B loses 15%.',
    question: 'Which material is closer to perfectly elastic behavior?',
    options: [
      'Material B, because higher percentages mean more elasticity',
      'Material A, because less energy loss means more elastic behavior',
      'Both are equally elastic since they both lose some energy',
      'Neither is elastic because elastic collisions lose 0% energy',
    ],
    correctIndex: 1,
    explanation: "Material A (2% loss) is more elastic because it returns more kinetic energy. Steel balls (1-5% loss) and billiard balls (5-10% loss) are considered 'nearly elastic' in practice.",
  },
  {
    scenario: 'During an elastic collision, you observe the objects briefly compress against each other before separating.',
    question: 'Where does the kinetic energy go during that brief compression?',
    options: [
      "It's converted to heat and lost permanently",
      "It's stored temporarily as elastic potential energy in the deformation",
      "It's destroyed and then recreated",
      'It transfers to the surrounding air as sound waves',
    ],
    correctIndex: 1,
    explanation: "During compression, kinetic energy converts to elastic potential energy stored in the materials' deformation. In a perfectly elastic collision, 100% of this energy returns as kinetic energy.",
  },
  {
    scenario: 'Professional billiard players know that hitting a stationary ball dead-center produces different results than hitting it at an angle.',
    question: 'Why do billiard balls approximate elastic collisions?',
    options: [
      'The colorful coating reduces friction',
      "They're made of hard phenolic resin that barely deforms",
      'The green felt table absorbs excess energy',
      'Their spherical shape eliminates energy loss',
    ],
    correctIndex: 1,
    explanation: 'Billiard balls are made of hard phenolic resin that deforms very little on impact. This minimal deformation means most kinetic energy is returned rather than lost to heat.',
  },
  {
    scenario: 'A moving ball strikes an identical stationary ball in a perfectly elastic collision on a frictionless surface.',
    question: 'What is the final state after collision?',
    options: [
      'Both balls move together at half the original velocity',
      'The first ball stops completely; the second moves at the original velocity',
      "The first ball bounces back; the second ball doesn't move",
      'Both balls stop at the point of collision',
    ],
    correctIndex: 1,
    explanation: 'This is the classic elastic collision result for equal masses: complete momentum and energy transfer. The moving ball stops, and the stationary ball takes on all the momentum and kinetic energy.',
  },
];

// === TRANSFER APPLICATIONS (content shown to users) ===
interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  stats: { value: string; label: string }[];
}

const transferApps: TransferApp[] = [
  {
    icon: '8',
    title: 'Pool & Billiards',
    short: 'Billiards',
    tagline: 'Where geometry meets elastic physics',
    description: 'Professional pool players rely on elastic collision physics to predict shot outcomes.',
    connection: 'Billiard balls made of hard phenolic resin demonstrate nearly elastic collisions.',
    stats: [
      { value: '~95%', label: 'Energy retained' },
      { value: '6-8 m/s', label: 'Break speed' },
      { value: '0.2ms', label: 'Contact time' },
    ],
  },
  {
    icon: 'A',
    title: 'Particle Physics',
    short: 'Particles',
    tagline: "Probing the universe's smallest building blocks",
    description: 'Particle accelerators use elastic collision physics to study fundamental particles.',
    connection: 'When particles collide at nearly light speed, elastic scattering reveals their internal structure.',
    stats: [
      { value: '13 TeV', label: 'LHC energy' },
      { value: '99.999%', label: 'Speed of light' },
      { value: '1B/sec', label: 'Collisions' },
    ],
  },
  {
    icon: 'R',
    title: 'Gravity Assist Maneuvers',
    short: 'Slingshot',
    tagline: 'Free speed from planetary encounters',
    description: "Spacecraft use gravitational 'elastic collisions' with planets to gain speed.",
    connection: "A gravity assist is equivalent to an elastic collision in the planet's reference frame.",
    stats: [
      { value: '35,700', label: 'km/h gained' },
      { value: '9+ yrs', label: 'Time saved' },
      { value: '0 fuel', label: 'Required' },
    ],
  },
  {
    icon: 'B',
    title: 'Sports Equipment Engineering',
    short: 'Sports',
    tagline: 'Maximum energy return for peak performance',
    description: "Engineers design bats and rackets to maximize elastic energy return at the 'sweet spot'.",
    connection: 'The coefficient of restitution determines how much kinetic energy returns after impact.',
    stats: [
      { value: '0.546', label: 'Baseball COR' },
      { value: '~20%', label: 'Energy lost' },
      { value: '100+', label: 'mph exit' },
    ],
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#f59e0b',
  primaryDark: '#d97706',
  accent: '#06b6d4',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  bgDark: '#0a0f1a',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
};

// === MAIN GAME CLASS ===

export class ElasticCollisionsGame extends BaseGame {
  readonly gameType = 'elastic_collisions';
  readonly gameTitle = 'Elastic Collisions';

  // --- PROTECTED GAME STATE (never sent to client) ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Newton's cradle animation state
  private leftBallAngle = -30;
  private rightBallAngle = 0;
  private animationPhase: 'left_swing' | 'impact' | 'right_swing' | 'right_return' = 'left_swing';
  private isAnimating = true;
  private numBallsReleased = 1;
  private showMomentum = true;
  private showEnergy = true;
  private collisionCount = 0;

  // Simulation state
  private time = 0;

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
    twist_predict: 'Energy Puzzle',
    twist_play: 'Explore',
    twist_review: 'Discovery',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: "Welcome to Newton's Cradle! Watch how steel balls transfer momentum perfectly.",
    predict: 'What makes a collision truly elastic? Make your prediction!',
    play: 'Experiment with different numbers of balls. Notice both momentum AND energy are conserved!',
    review: "Great observations! Let's understand the physics of elastic collisions.",
    twist_predict: 'Here is the puzzle: Why do 2 balls in mean exactly 2 balls out?',
    twist_play: 'See how kinetic energy scales with velocity squared - this constrains outcomes!',
    twist_review: "You've discovered why Newton's cradle behavior is mathematically unique!",
    transfer: 'From billiards to spacecraft, elastic collisions are everywhere!',
    test: 'Time to test your mastery of elastic collision physics!',
    mastery: 'Congratulations! You understand momentum and energy conservation in collisions!',
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
      message: 'Elastic Collisions lesson started',
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

    // Predictions
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }
    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
      this.emitCoachEvent('twist_prediction_made', { prediction: this.twistPrediction });
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
      this.isAnimating = true;
      return;
    }
    if (id === 'stop') {
      this.isAnimating = false;
      return;
    }
    if (id === 'reset') {
      this.resetSimulation();
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'show_momentum') {
      this.showMomentum = value;
      return;
    }
    if (id === 'show_energy') {
      this.showEnergy = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'num_balls') {
      this.numBallsReleased = clamp(value, 1, 4);
      this.resetSimulation();
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
   * PROTECTED PHYSICS: Newton's Cradle Animation
   *
   * Core conservation laws:
   * - Momentum: p = m * v (conserved in all collisions)
   * - Kinetic Energy: KE = (1/2) * m * v^2 (conserved in elastic collisions)
   *
   * For equal masses with one stationary:
   * - v1' = 0 (moving ball stops)
   * - v2' = v1 (stationary ball takes all velocity)
   *
   * This is the ONLY solution satisfying both conservation laws simultaneously.
   */
  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;

    this.time += deltaTime / 1000;

    // Newton's cradle animation physics
    const dt = deltaTime / 1000;
    const angularSpeed = 90; // degrees per second

    switch (this.animationPhase) {
      case 'left_swing':
        this.leftBallAngle += angularSpeed * dt;
        if (this.leftBallAngle >= 0) {
          this.leftBallAngle = 0;
          this.animationPhase = 'impact';
          this.collisionCount++;
          this.emitCoachEvent('collision', { count: this.collisionCount });
        }
        break;

      case 'impact':
        // Instantaneous momentum transfer (elastic collision)
        this.animationPhase = 'right_swing';
        break;

      case 'right_swing':
        this.rightBallAngle += angularSpeed * dt;
        const maxAngle = 30 * this.numBallsReleased;
        if (this.rightBallAngle >= maxAngle) {
          this.rightBallAngle = maxAngle;
          this.animationPhase = 'right_return';
        }
        break;

      case 'right_return':
        this.rightBallAngle -= angularSpeed * dt;
        if (this.rightBallAngle <= 0) {
          this.rightBallAngle = 0;
          this.animationPhase = 'left_swing';
          this.leftBallAngle = -30 * this.numBallsReleased;
        }
        break;
    }
  }

  private resetSimulation(): void {
    this.time = 0;
    this.leftBallAngle = -30 * this.numBallsReleased;
    this.rightBallAngle = 0;
    this.animationPhase = 'left_swing';
    this.isAnimating = true;
    this.collisionCount = 0;
  }

  /**
   * PROTECTED PHYSICS: Calculate momentum and energy values
   *
   * Momentum: p = m * v
   * Kinetic Energy: KE = (1/2) * m * v^2
   * Potential Energy: PE = m * g * h = m * g * L * (1 - cos(theta))
   * Total Energy: E = KE + PE (conserved)
   */
  private calculatePhysicsValues(): { velocity: number; momentum: number; kineticEnergy: number; potentialEnergy: number; totalEnergy: number } {
    // Determine which ball is moving
    let angle = 0;
    if (this.animationPhase === 'left_swing' || this.animationPhase === 'impact') {
      angle = this.leftBallAngle;
    } else {
      angle = this.rightBallAngle;
    }

    const angleRad = Math.abs(angle) * (Math.PI / 180);
    const mass = this.numBallsReleased; // Normalized mass units

    // Velocity proportional to angular velocity
    const velocity = Math.sin(angleRad) * 2;
    const momentum = mass * velocity;
    const kineticEnergy = 0.5 * mass * velocity * velocity;
    const potentialEnergy = mass * (1 - Math.cos(angleRad)) * 0.5;
    const totalEnergy = kineticEnergy + potentialEnergy;

    return { velocity, momentum, kineticEnergy, potentialEnergy, totalEnergy };
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

    // Background
    r.clear(colors.bgDark);

    // Phase-specific content
    switch (this.phase) {
      case 'hook':
        this.renderHook(r);
        break;
      case 'predict':
        this.renderPredict(r);
        break;
      case 'play':
        this.renderPlay(r);
        break;
      case 'review':
        this.renderReview(r);
        break;
      case 'twist_predict':
        this.renderTwistPredict(r);
        break;
      case 'twist_play':
        this.renderTwistPlay(r);
        break;
      case 'twist_review':
        this.renderTwistReview(r);
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

  // --- Newton's Cradle Visualization ---

  private renderNewtonsCradle(r: CommandRenderer, centerX: number, topY: number, size: number, showLabels: boolean): void {
    const stringLength = size * 0.35;
    const ballRadius = size * 0.05;
    const spacing = ballRadius * 2.15;

    // Frame
    r.rect(centerX - spacing * 3, topY - 25, spacing * 6, 15, {
      fill: colors.bgCardLight,
      stroke: colors.border,
      rx: 4,
    });

    // Draw 5 balls
    for (let i = 0; i < 5; i++) {
      let angle = 0;
      let isMoving = false;

      // Handle multi-ball release
      if (i < this.numBallsReleased && this.animationPhase === 'left_swing') {
        angle = this.leftBallAngle;
        isMoving = angle !== 0;
      } else if (i >= 5 - this.numBallsReleased && (this.animationPhase === 'right_swing' || this.animationPhase === 'right_return')) {
        angle = this.rightBallAngle;
        isMoving = angle !== 0;
      }

      const angleRad = angle * (Math.PI / 180);
      const ballX = centerX + (i - 2) * spacing + Math.sin(angleRad) * stringLength;
      const ballY = topY + Math.cos(angleRad) * stringLength;

      // String
      r.line(centerX + (i - 2) * spacing, topY - 10, ballX, ballY - ballRadius, {
        stroke: colors.textMuted,
        strokeWidth: 1.5,
      });

      // Ball
      r.circle(ballX, ballY, ballRadius, {
        fill: isMoving ? colors.primary : colors.bgCardLight,
        stroke: isMoving ? colors.primaryDark : colors.border,
        strokeWidth: isMoving ? 2 : 1,
      });

      // Highlight
      r.circle(ballX - ballRadius * 0.3, ballY - ballRadius * 0.3, ballRadius * 0.2, {
        fill: 'rgba(255,255,255,0.3)',
      });
    }

    // Physics displays
    if (showLabels) {
      const physics = this.calculatePhysicsValues();

      if (this.showMomentum) {
        r.rect(10, topY + stringLength + 20, 100, 45, {
          fill: '#1e40af',
          opacity: 0.4,
          rx: 8,
        });
        r.text(60, topY + stringLength + 40, 'Momentum', {
          fill: '#60a5fa',
          fontSize: 11,
          fontWeight: 'bold',
          textAnchor: 'middle',
        });
        r.text(60, topY + stringLength + 55, `p = ${physics.momentum.toFixed(2)}`, {
          fill: '#93c5fd',
          fontSize: 14,
          fontWeight: 'bold',
          textAnchor: 'middle',
        });
      }

      if (this.showEnergy) {
        r.rect(size - 110, topY + stringLength + 20, 100, 45, {
          fill: '#166534',
          opacity: 0.4,
          rx: 8,
        });
        r.text(size - 60, topY + stringLength + 40, 'Total Energy', {
          fill: '#4ade80',
          fontSize: 11,
          fontWeight: 'bold',
          textAnchor: 'middle',
        });
        r.text(size - 60, topY + stringLength + 55, `E = ${physics.totalEnergy.toFixed(2)}`, {
          fill: '#86efac',
          fontSize: 14,
          fontWeight: 'bold',
          textAnchor: 'middle',
        });
      }
    }
  }

  // --- Collision Diagram ---

  private renderCollisionDiagram(r: CommandRenderer, x: number, y: number, width: number, height: number): void {
    r.rect(x, y, width, height, { fill: colors.bgCardLight, rx: 12 });

    // Before section
    r.text(x + width * 0.22, y + 22, 'Before', {
      fill: colors.textMuted,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Moving ball (before)
    r.circle(x + width * 0.12, y + height * 0.45, 18, { fill: colors.primary });
    r.text(x + width * 0.12, y + height * 0.45 + 5, 'm', {
      fill: colors.textPrimary,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Velocity arrow (before)
    r.line(x + width * 0.18, y + height * 0.45, x + width * 0.28, y + height * 0.45, {
      stroke: colors.success,
      strokeWidth: 3,
    });
    r.text(x + width * 0.23, y + height * 0.35, 'v', {
      fill: colors.success,
      fontSize: 11,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Stationary ball (before)
    r.circle(x + width * 0.33, y + height * 0.45, 18, { fill: colors.bgCardLight, stroke: colors.border });
    r.text(x + width * 0.33, y + height * 0.45 + 5, 'm', {
      fill: colors.textPrimary,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Arrow between sections
    r.line(x + width * 0.43, y + height * 0.5, x + width * 0.55, y + height * 0.5, {
      stroke: colors.textMuted,
      strokeWidth: 2,
    });

    // After section
    r.text(x + width * 0.78, y + 22, 'After', {
      fill: colors.textMuted,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // First ball stopped (after)
    r.circle(x + width * 0.62, y + height * 0.45, 18, { fill: colors.bgCardLight, stroke: colors.border });
    r.text(x + width * 0.62, y + height * 0.45 + 5, 'm', {
      fill: colors.textPrimary,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Moving ball (after)
    r.circle(x + width * 0.88, y + height * 0.45, 18, { fill: colors.primary });
    r.text(x + width * 0.88, y + height * 0.45 + 5, 'm', {
      fill: colors.textPrimary,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Velocity arrow (after)
    r.line(x + width * 0.72, y + height * 0.45, x + width * 0.82, y + height * 0.45, {
      stroke: colors.success,
      strokeWidth: 3,
    });
    r.text(x + width * 0.77, y + height * 0.35, 'v', {
      fill: colors.success,
      fontSize: 11,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Labels
    r.text(x + width * 0.5, y + height - 25, 'Velocities exchange!', {
      fill: colors.primary,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  // --- Energy Comparison Diagram ---

  private renderEnergyComparison(r: CommandRenderer, x: number, y: number, width: number, height: number): void {
    r.rect(x, y, width, height, { fill: colors.bgCardLight, rx: 12 });

    // Title
    r.text(x + width / 2, y + 25, 'Why 2 balls, not 1 at 2x speed?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Left side - 2 balls at v (correct)
    r.rect(x + 15, y + 45, width / 2 - 25, 140, {
      fill: colors.success,
      opacity: 0.2,
      stroke: colors.success,
      rx: 8,
    });
    r.text(x + width / 4, y + 70, '2 balls at v', {
      fill: colors.success,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.circle(x + width / 4 - 15, y + 100, 12, { fill: colors.primary });
    r.circle(x + width / 4 + 15, y + 100, 12, { fill: colors.primary });
    r.text(x + width / 4, y + 130, 'p = 2mv', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
    r.text(x + width / 4, y + 148, 'KE = mv^2', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
    r.text(x + width / 4, y + 172, 'Both conserved!', {
      fill: colors.success,
      fontSize: 11,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Right side - 1 ball at 2v (incorrect)
    r.rect(x + width / 2 + 10, y + 45, width / 2 - 25, 140, {
      fill: colors.danger,
      opacity: 0.2,
      stroke: colors.danger,
      rx: 8,
    });
    r.text(x + (width * 3) / 4, y + 70, '1 ball at 2v', {
      fill: colors.danger,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.circle(x + (width * 3) / 4, y + 100, 12, { fill: colors.primary });
    r.text(x + (width * 3) / 4, y + 130, 'p = 2mv', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
    r.text(x + (width * 3) / 4, y + 148, 'KE = 2mv^2', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
    r.text(x + (width * 3) / 4, y + 172, 'Energy doubled!', {
      fill: colors.danger,
      fontSize: 11,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  // --- PHASE RENDERERS ---

  private renderHook(r: CommandRenderer): void {
    r.text(350, 50, "Newton's Cradle: The Perfect Bounce", {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 80, "Why does the same number always come out?", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Newton's cradle visualization
    this.renderNewtonsCradle(r, 350, 110, 360, true);

    r.text(350, 320, "Pull back one ball, exactly one swings out. Pull back two, two swing out!", {
      fill: colors.primary,
      fontSize: 13,
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

    r.text(350, 80, 'What makes this collision "elastic"?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Collision diagram
    this.renderCollisionDiagram(r, 180, 100, 340, 120);
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(350, 30, 'Elastic Collision Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Newton's cradle
    this.renderNewtonsCradle(r, 350, 70, 320, true);

    // Conservation laws box
    r.rect(100, 250, 500, 80, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });

    r.text(350, 275, 'Conservation Laws in Elastic Collisions', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(230, 305, 'Momentum: p1 + p2 = p1\' + p2\'', {
      fill: '#60a5fa',
      fontSize: 12,
      textAnchor: 'middle',
    });

    r.text(470, 305, 'Energy: KE1 + KE2 = KE1\' + KE2\'', {
      fill: '#4ade80',
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(350, 50, 'Understanding Elastic Collisions', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Conservation card
    r.rect(50, 80, 280, 120, {
      fill: colors.bgCard,
      stroke: colors.primary,
      rx: 12,
    });
    r.text(190, 105, "What's Conserved", {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(190, 130, 'Momentum: p = mv', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(190, 150, 'Kinetic Energy: KE = 1/2 mv^2', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(190, 175, 'Both conserved in elastic collisions!', {
      fill: colors.success,
      fontSize: 11,
      textAnchor: 'middle',
    });

    // Equal mass card
    r.rect(370, 80, 280, 120, {
      fill: colors.bgCard,
      stroke: colors.accent,
      rx: 12,
    });
    r.text(510, 105, 'Equal Mass Special Case', {
      fill: colors.accent,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(510, 130, 'When m1 = m2:', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(510, 150, 'Velocities completely exchange', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(510, 175, 'Moving stops, stationary moves!', {
      fill: colors.success,
      fontSize: 11,
      textAnchor: 'middle',
    });

    // COR card
    r.rect(140, 220, 420, 100, {
      fill: colors.bgCard,
      stroke: '#a855f7',
      rx: 12,
    });
    r.text(350, 245, 'Coefficient of Restitution (e)', {
      fill: '#a855f7',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(200, 280, 'e = 1', { fill: colors.success, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 295, 'Perfectly Elastic', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    r.text(350, 280, '0 < e < 1', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 295, 'Real Collisions', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    r.text(500, 280, 'e = 0', { fill: colors.danger, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(500, 295, 'Perfectly Inelastic', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 50, 'The Energy Puzzle', {
      fill: '#a855f7',
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 85, "On Newton's cradle, you release 2 balls.", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 110, 'Why do exactly 2 balls swing out, not 1 ball at double speed?', {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(150, 130, 400, 40, {
      fill: colors.accent,
      opacity: 0.2,
      rx: 8,
    });
    r.text(350, 155, 'Both options conserve momentum: p = 2mv = m(2v)', {
      fill: colors.accent,
      fontSize: 13,
      textAnchor: 'middle',
    });
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(350, 40, 'The Energy Constraint', {
      fill: '#a855f7',
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Energy comparison diagram
    this.renderEnergyComparison(r, 160, 70, 380, 200);

    // Key insight
    r.rect(120, 285, 460, 50, {
      fill: colors.bgCard,
      stroke: colors.accent,
      rx: 8,
    });
    r.text(350, 307, 'KE = 1/2 mv^2 : Doubling velocity QUADRUPLES energy!', {
      fill: colors.accent,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 325, 'Energy conservation rules out the 1-ball option.', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', {
      fill: '#a855f7',
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 200, {
      fill: colors.bgCard,
      stroke: '#a855f7',
      rx: 16,
    });

    r.text(350, 110, 'Energy Conservation Constrains Physical Outcomes!', {
      fill: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 150, 'Conserving BOTH momentum and energy gives a unique solution:', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    r.text(350, 180, 'Pull 1 ball -> 1 ball swings out at same velocity', {
      fill: colors.success,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 200, 'Pull 2 balls -> 2 balls swing out at same velocity', {
      fill: colors.success,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 220, 'Pull 3 balls -> 3 balls swing out at same velocity', {
      fill: colors.success,
      fontSize: 12,
      textAnchor: 'middle',
    });

    r.text(350, 260, "Newton's cradle behavior is mathematically UNIQUE!", {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderTransfer(r: CommandRenderer): void {
    const app = transferApps[this.selectedApp];

    r.text(350, 35, 'Real-World Applications', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // App tabs
    transferApps.forEach((a, i) => {
      const isSelected = i === this.selectedApp;
      r.rect(70 + i * 155, 55, 145, 35, {
        fill: isSelected ? colors.primary : colors.bgCard,
        stroke: this.completedApps[i] ? colors.success : colors.border,
        rx: 8,
      });
      r.text(142 + i * 155, 77, `${a.icon} ${a.short}`, {
        fill: isSelected ? colors.textPrimary : colors.textSecondary,
        fontSize: 12,
        textAnchor: 'middle',
      });
    });

    // App content
    r.rect(70, 100, 560, 230, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });

    r.text(350, 125, app.title, {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 145, app.tagline, {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });

    r.text(350, 175, app.description, {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Stats
    app.stats.forEach((stat, i) => {
      r.rect(120 + i * 170, 200, 150, 50, {
        fill: colors.bgCardLight,
        rx: 8,
      });
      r.text(195 + i * 170, 220, stat.value, {
        fill: colors.primary,
        fontSize: 16,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
      r.text(195 + i * 170, 238, stat.label, {
        fill: colors.textMuted,
        fontSize: 10,
        textAnchor: 'middle',
      });
    });

    // Physics connection
    r.rect(120, 260, 460, 55, {
      fill: colors.bgCardLight,
      rx: 8,
    });
    r.text(350, 280, 'Physics Connection', {
      fill: colors.accent,
      fontSize: 11,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 300, app.connection, {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle',
    });
  }

  private renderTest(r: CommandRenderer): void {
    if (this.testSubmitted) {
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

      r.text(350, 200, passed ? "You've mastered elastic collision physics!" : 'Review the concepts and try again.', {
        fill: colors.textSecondary,
        fontSize: 14,
        textAnchor: 'middle',
      });
      return;
    }

    const q = testQuestions[this.testQuestion];

    r.text(350, 30, `Question ${this.testQuestion + 1} of ${testQuestions.length}`, {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Scenario
    r.rect(80, 45, 540, 40, {
      fill: colors.bgCard,
      rx: 8,
    });
    r.text(350, 70, q.scenario.substring(0, 80) + (q.scenario.length > 80 ? '...' : ''), {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });

    r.text(350, 105, q.question, {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Answer options
    q.options.forEach((option, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;

      r.rect(100, 125 + i * 50, 500, 40, {
        fill: isSelected ? `${colors.primary}40` : colors.bgCard,
        stroke: isSelected ? colors.primary : colors.border,
        rx: 8,
      });
      r.text(350, 150 + i * 50, option.substring(0, 60) + (option.length > 60 ? '...' : ''), {
        fill: isSelected ? colors.primary : colors.textSecondary,
        fontSize: 12,
        textAnchor: 'middle',
      });
    });
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(350, 80, '8', { fontSize: 60, fill: colors.primary, textAnchor: 'middle' });

    r.text(350, 140, 'Elastic Collision Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 175, "You've mastered the physics of elastic collisions!", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Achievement cards
    const achievements = [
      { icon: 'E', label: 'Energy Conservation', formula: 'KE1 + KE2 = KE1\' + KE2\'' },
      { icon: 'p', label: 'Momentum Transfer', formula: 'p1 + p2 = p1\' + p2\'' },
      { icon: 'V', label: 'Velocity Exchange', formula: 'Equal masses swap v' },
      { icon: 'R', label: 'Real Applications', formula: 'Billiards to space' },
    ];

    achievements.forEach((a, i) => {
      const x = 110 + (i % 2) * 250;
      const y = 205 + Math.floor(i / 2) * 60;
      r.rect(x, y, 230, 50, {
        fill: colors.bgCard,
        stroke: colors.border,
        rx: 8,
      });
      r.text(x + 25, y + 30, a.icon, {
        fill: colors.primary,
        fontSize: 18,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
      r.text(x + 130, y + 22, a.label, {
        fill: colors.textPrimary,
        fontSize: 11,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
      r.text(x + 130, y + 38, a.formula, {
        fill: colors.textMuted,
        fontSize: 9,
        textAnchor: 'middle',
      });
    });
  }

  // --- UI STATE ---

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
          id: 'predict_A',
          label: 'Rubber balls bounce',
          variant: this.prediction === 'A' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_B',
          label: 'Only momentum conserved',
          variant: this.prediction === 'B' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_C',
          label: 'Both momentum AND energy',
          variant: this.prediction === 'C' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_D',
          label: 'Balls stick together',
          variant: this.prediction === 'D' ? 'primary' : 'secondary',
        });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({
          id: 'num_balls',
          label: 'Balls Released',
          value: this.numBallsReleased,
          min: 1,
          max: 4,
        });
        r.addToggle({
          id: 'show_momentum',
          label: 'Show Momentum',
          value: this.showMomentum,
        });
        r.addToggle({
          id: 'show_energy',
          label: 'Show Energy',
          value: this.showEnergy,
        });
        r.addButton({
          id: this.isAnimating ? 'stop' : 'start',
          label: this.isAnimating ? 'Pause' : 'Play',
          variant: 'primary',
        });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
        r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        break;

      case 'twist_predict':
        r.addButton({
          id: 'twist_A',
          label: 'Strings prevent it',
          variant: this.twistPrediction === 'A' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_B',
          label: 'Violates energy conservation',
          variant: this.twistPrediction === 'B' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_C',
          label: 'Magnetic coupling',
          variant: this.twistPrediction === 'C' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_D',
          label: 'Air resistance',
          variant: this.twistPrediction === 'D' ? 'primary' : 'secondary',
        });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Billiards', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Particles', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Slingshot', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Sports', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every((c) => c)) {
          r.addButton({ id: 'next', label: 'Take Quiz', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
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
              label: `Option ${i + 1}`,
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

      default:
        r.addButton({ id: 'next', label: 'Continue', variant: 'primary' });
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
      leftBallAngle: this.leftBallAngle,
      rightBallAngle: this.rightBallAngle,
      animationPhase: this.animationPhase,
      isAnimating: this.isAnimating,
      numBallsReleased: this.numBallsReleased,
      showMomentum: this.showMomentum,
      showEnergy: this.showEnergy,
      collisionCount: this.collisionCount,
      time: this.time,
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
    this.leftBallAngle = (state.leftBallAngle as number) || -30;
    this.rightBallAngle = (state.rightBallAngle as number) || 0;
    this.animationPhase = (state.animationPhase as 'left_swing' | 'impact' | 'right_swing' | 'right_return') || 'left_swing';
    this.isAnimating = (state.isAnimating as boolean) ?? true;
    this.numBallsReleased = (state.numBallsReleased as number) || 1;
    this.showMomentum = (state.showMomentum as boolean) ?? true;
    this.showEnergy = (state.showEnergy as boolean) ?? true;
    this.collisionCount = (state.collisionCount as number) || 0;
    this.time = (state.time as number) || 0;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===
// Register this in server.ts: registry.register('elastic_collisions', createElasticCollisionsGame);
export function createElasticCollisionsGame(sessionId: string): ElasticCollisionsGame {
  return new ElasticCollisionsGame(sessionId);
}
