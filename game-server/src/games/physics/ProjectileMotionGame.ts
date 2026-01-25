/**
 * Projectile Motion Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP - Physics Formulas:
 * - Trajectory: x = v0*cos(theta)*t, y = v0*sin(theta)*t - 0.5*g*t^2
 * - Range: R = v0^2 * sin(2*theta) / g
 * - Maximum Height: h = (v0*sin(theta))^2 / (2*g)
 * - Flight Time: T = 2*v0*sin(theta) / g
 * - Complementary angles (theta and 90-theta) give same range
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

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

// === PROTECTED TEST QUESTIONS (never sent to client) ===
interface TestQuestion {
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const testQuestions: TestQuestion[] = [
  {
    scenario: 'A basketball player is practicing free throws from the free-throw line, which is 4.6 meters from the basket.',
    question: 'What path does the basketball follow through the air (ignoring air resistance)?',
    options: [
      'A straight line from hand to basket',
      'A parabola (curved arc)',
      'A circular arc',
      'A zig-zag pattern',
    ],
    correctIndex: 1,
    explanation: 'Projectiles follow parabolic paths because horizontal motion (constant velocity) combines with vertical motion (constant acceleration from gravity).',
  },
  {
    scenario: 'An artillery officer needs to hit a target 500 meters away. They can choose any launch angle between 10 and 80 degrees.',
    question: 'What angle will give the maximum horizontal range (assuming no air resistance)?',
    options: [
      '30 degrees - low and fast',
      '45 degrees - perfect balance',
      '60 degrees - high arc',
      '80 degrees - almost vertical',
    ],
    correctIndex: 1,
    explanation: 'Range = (v0^2*sin(2*theta))/g. Since sin(2*theta) is maximized when 2*theta = 90 degrees (theta = 45 degrees), this angle provides optimal balance.',
  },
  {
    scenario: 'A soccer player kicks a ball at 20 m/s at an angle of 30 degrees above horizontal.',
    question: 'What happens to the horizontal velocity during the ball\'s flight?',
    options: [
      'It stays constant throughout',
      'It decreases due to gravity',
      'It increases as the ball falls',
      'It becomes zero at the peak',
    ],
    correctIndex: 0,
    explanation: 'Gravity only acts vertically (downward). Since there\'s no horizontal force (ignoring air resistance), horizontal velocity remains constant.',
  },
  {
    scenario: 'You\'re standing on a cliff. You throw one ball horizontally and simply drop another from the same height at the same moment.',
    question: 'Which ball hits the ground first?',
    options: [
      'The dropped ball - it takes the shortest path',
      'The thrown ball - it has more energy',
      'They hit at exactly the same time',
      'It depends on how hard you throw',
    ],
    correctIndex: 2,
    explanation: 'Vertical and horizontal motions are independent! Both balls accelerate downward at g = 9.8 m/s^2 and fall the same vertical distance.',
  },
  {
    scenario: 'At the highest point of a ball\'s trajectory, it momentarily reaches its peak height before falling back down.',
    question: 'What is the ball\'s velocity at this highest point?',
    options: [
      'Zero in all directions',
      'Zero vertical, but horizontal velocity remains',
      'Maximum vertical, zero horizontal',
      'Equal horizontal and vertical',
    ],
    correctIndex: 1,
    explanation: 'At the peak, vertical velocity is zero (it\'s reversing direction). But horizontal velocity is unchanged throughout the flight.',
  },
  {
    scenario: 'A golfer hits a ball at 50 m/s and wants to maximize distance. Another golfer hits at 100 m/s at the same angle.',
    question: 'How does doubling the launch speed affect the range?',
    options: [
      'Doubles the range (2x)',
      'Quadruples the range (4x)',
      'Triples the range (3x)',
      'No change - only angle matters',
    ],
    correctIndex: 1,
    explanation: 'Range = v0^2*sin(2*theta)/g. Since range depends on v0^2, doubling speed means 2^2 = 4 times the range.',
  },
  {
    scenario: 'A water fountain shoots water upward at various angles. The designer wants symmetrical arcs on both sides.',
    question: 'If one jet is at 30 degrees, what angle for the other jet gives the same range?',
    options: [
      '30 degrees (same angle)',
      '45 degrees (optimal angle)',
      '60 degrees (complementary angle)',
      '70 degrees',
    ],
    correctIndex: 2,
    explanation: 'Complementary angles (angles that sum to 90 degrees) give the same range! sin(2*30) = sin(60) and sin(2*60) = sin(120) = sin(60).',
  },
  {
    scenario: 'A cannon fires a cannonball at 45 degrees with initial speed of 100 m/s. You want to calculate the maximum height reached.',
    question: 'Which formula correctly gives the maximum height?',
    options: [
      'h = v0^2/(2g) - uses total velocity',
      'h = (v0*sin(theta))^2/(2g) - uses vertical component',
      'h = v0*t - simple distance formula',
      'h = g*t^2/2 - free fall formula',
    ],
    correctIndex: 1,
    explanation: 'Maximum height depends only on the initial vertical velocity component (v0*sin(theta)). Using energy conservation gives h = (v0*sin(theta))^2/(2g).',
  },
  {
    scenario: 'A baseball is hit at an angle. You measure that it travels 120 meters horizontally and is in the air for 4 seconds.',
    question: 'What is the initial horizontal velocity?',
    options: [
      '30 m/s',
      '40 m/s',
      '120 m/s',
      '480 m/s',
    ],
    correctIndex: 0,
    explanation: 'Since horizontal velocity is constant, vx = distance/time = 120m/4s = 30 m/s.',
  },
  {
    scenario: 'A stunt driver needs to jump a motorcycle over a 50-meter gap. The takeoff ramp is at ground level.',
    question: 'What factor does NOT affect whether the motorcycle successfully clears the gap?',
    options: [
      'The mass of the motorcycle and rider',
      'The launch speed',
      'The launch angle',
      'The gravitational acceleration',
    ],
    correctIndex: 0,
    explanation: 'Just like Galileo\'s falling objects, mass doesn\'t affect projectile motion! The equations don\'t include mass.',
  },
];

// === TRANSFER APPLICATIONS (protected content) ===
interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string;
  stats: string[];
  examples: string[];
  companies: string[];
  futureImpact: string;
}

const transferApps: TransferApp[] = [
  {
    icon: 'basketball',
    title: 'Sports Ball Trajectories',
    short: 'Sports',
    tagline: 'The science behind every perfect shot',
    description: 'From basketball free throws to soccer kicks, athletes instinctively apply projectile motion principles to score.',
    connection: 'Every thrown, kicked, or hit ball follows a parabolic path governed by initial velocity, launch angle, and gravity.',
    howItWorks: 'A basketball released at the optimal 52 degree angle with backspin has higher success rates.',
    stats: [
      'NBA free throw line is exactly 4.57m from basket',
      'Optimal basketball release angle: 52 degrees',
      'Golf balls can reach 300+ yards at 250+ mph',
      'Soccer free kicks curve using Magnus effect',
    ],
    examples: [
      'Basketball arc shooting for higher success rate',
      'Golf club loft angles (drivers ~10, wedges ~56)',
      'Baseball outfielder predicting fly ball landing',
      'Tennis serve toss height optimization',
    ],
    companies: ['Spalding', 'Nike', 'Callaway Golf', 'Wilson'],
    futureImpact: 'AI coaching systems will use real-time trajectory analysis for instant feedback.',
  },
  {
    icon: 'rocket',
    title: 'Ballistics & Aerospace',
    short: 'Aerospace',
    tagline: 'From cannons to spacecraft trajectories',
    description: 'Military ballistics and space mission planning rely on projectile motion equations extended for air resistance and varying gravity.',
    connection: 'The fundamental parabolic trajectory applies to everything from bullets to spacecraft.',
    howItWorks: 'Artillery computers calculate trajectories accounting for muzzle velocity, angle, air density, wind, and Earth\'s rotation.',
    stats: [
      'ICBM trajectories reach 1,200+ km altitude',
      'Tank shells can travel 4+ km accurately',
      'Sniper bullets affected by Earth rotation over 1km',
      'Apollo missions used trajectory calculations for Moon landing',
    ],
    examples: [
      'Artillery fire control computers',
      'Spacecraft orbital transfer calculations',
      'Missile guidance systems',
      'Re-entry trajectory planning for capsules',
    ],
    companies: ['Lockheed Martin', 'SpaceX', 'Raytheon', 'Boeing'],
    futureImpact: 'Advanced AI will enable real-time trajectory optimization for hypersonic vehicles.',
  },
  {
    icon: 'water',
    title: 'Water Features & Fountains',
    short: 'Fountains',
    tagline: 'Engineering beauty through physics',
    description: 'Fountain designers use projectile motion to create stunning water displays with multiple jets at different angles.',
    connection: 'Each water jet follows a parabolic arc. Complementary angles create jets that land at the same spot.',
    howItWorks: 'The Bellagio fountains use 1,214 nozzles firing water at precisely calculated angles synchronized to music.',
    stats: [
      'Bellagio fountains shoot water 460 feet high',
      'Dubai Fountain jets reach 150 meters',
      'Precision nozzles control trajectory within millimeters',
      'Pump pressure directly controls launch velocity',
    ],
    examples: [
      'Bellagio Hotel dancing fountains in Las Vegas',
      'Dubai Fountain choreographed water shows',
      'Olympic stadium water feature displays',
      'Theme park water ride trajectory design',
    ],
    companies: ['WET Design', 'Oase', 'Fountain People', 'Delta Fountains'],
    futureImpact: 'Smart fountains will use AI to create dynamic shows responding to audience in real-time.',
  },
  {
    icon: 'fire',
    title: 'Firefighting Operations',
    short: 'Firefighting',
    tagline: 'Reaching flames with physics precision',
    description: 'Firefighters calculate water hose angles to reach upper floors and maximize coverage.',
    connection: 'Water from a fire hose follows projectile motion. Higher pressure and optimal angles determine reach.',
    howItWorks: 'Fire engines use high-pressure pumps to increase water velocity. Firefighters adjust nozzle angle based on distance and height.',
    stats: [
      'Fire hoses operate at 100-250 PSI',
      'Monitor nozzles can throw water 100+ meters',
      'Ladder trucks reach 100+ feet elevation',
      'Optimal angle for upper floors: 60-70 degrees',
    ],
    examples: [
      'Ground crews adjusting hose angles for reach',
      'Aerial ladder water streams hitting high floors',
      'Foam cannon trajectories for aircraft fires',
      'Sprinkler system spray pattern design',
    ],
    companies: ['Pierce Manufacturing', 'E-ONE', 'Rosenbauer', 'Oshkosh'],
    futureImpact: 'Autonomous firefighting drones will calculate optimal water trajectories in real-time.',
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#f97316',
  primaryDark: '#ea580c',
  accent: '#fbbf24',
  accentDark: '#f59e0b',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#eab308',
  bgDark: '#0a0f1a',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  sky: '#1e3a5f',
  skyLight: '#4a7c9b',
  court: '#c4a77d',
  courtDark: '#a08060',
  ball: '#ff6600',
  ballLight: '#ff8c00',
  ballDark: '#cc4400',
  hoop: '#ff6600',
  purple: '#a855f7',
  purpleDark: '#9333ea',
  cyan: '#06b6d4',
};

// === MAIN GAME CLASS ===

export class ProjectileMotionGame extends BaseGame {
  readonly gameType = 'projectile_motion';
  readonly gameTitle = 'Projectile Motion';

  // --- PROTECTED GAME STATE (never sent to client) ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Physics constants (PROTECTED)
  private readonly g = 9.81; // m/s^2
  private readonly scale = 12; // pixels per meter
  private readonly startX = 60;
  private readonly startY = 260;
  private readonly hoopX = 320;
  private readonly hoopY = 165;

  // Simulation state
  private launchAngle = 45;
  private launchSpeed = 15;
  private isLaunched = false;
  private ballX = 60;
  private ballY = 260;
  private trajectoryPoints: { x: number; y: number }[] = [];
  private showTrajectory = true;
  private flightTime = 0;
  private maxHeight = 0;
  private range = 0;
  private madeBasket: boolean | null = null;
  private simulationTime = 0;

  // Twist demo state
  private twistDropY = 50;
  private twistThrowX = 80;
  private isTwistDropping = false;
  private twistTime = 0;

  // Milestones
  private milestones = {
    launchedFirstBall: false,
    changedAngle: false,
    changedSpeed: false,
    scored: false,
  };

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
    twist_predict: 'Twist',
    twist_play: 'Demo',
    twist_review: 'Discovery',
    transfer: 'Apply',
    test: 'Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Welcome! Ever wondered what makes a perfect basketball shot? Let\'s explore!',
    predict: 'What launch angle do you think gives maximum range? Make a prediction!',
    play: 'Experiment with angle and speed. Try to make a basket!',
    review: 'Great work! Let\'s understand the physics behind projectile motion.',
    twist_predict: 'Here\'s a brain-teaser: dropped vs thrown balls - which lands first?',
    twist_play: 'Watch carefully! Both balls fall at the same rate.',
    twist_review: 'You\'ve discovered the independence of horizontal and vertical motion!',
    transfer: 'Projectile motion is everywhere! Explore real-world applications.',
    test: 'Time to test your understanding. You\'ve got this!',
    mastery: 'Congratulations! You\'ve mastered projectile motion physics!',
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
      message: 'Projectile Motion lesson started',
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
    if (id === 'next') { this.goNext(); return; }
    if (id === 'back') { this.goBack(); return; }

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
    if (id === 'launch') { this.launchBall(); return; }
    if (id === 'reset') { this.resetSimulation(); return; }
    if (id === 'drop_balls') { this.startTwistDrop(); return; }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'show_trajectory') {
      this.showTrajectory = value;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'angle') {
      this.resetSimulation();
      this.launchAngle = value;
      if (!this.milestones.changedAngle) {
        this.milestones.changedAngle = true;
        this.emitCoachEvent('milestone_reached', { milestone: 'changedAngle' });
      }
    }
    if (id === 'speed') {
      this.resetSimulation();
      this.launchSpeed = value;
      if (!this.milestones.changedSpeed) {
        this.milestones.changedSpeed = true;
        this.emitCoachEvent('milestone_reached', { milestone: 'changedSpeed' });
      }
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

    setTimeout(() => { this.isNavigating = false; }, 400);
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
    // Ball launch simulation
    if (this.isLaunched && (this.phase === 'play' || this.phase === 'hook')) {
      this.updateBallSimulation(deltaTime);
    }

    // Twist drop simulation
    if (this.isTwistDropping && this.phase === 'twist_play') {
      this.updateTwistDropSimulation(deltaTime);
    }
  }

  /**
   * PROTECTED: Core projectile motion physics
   *
   * x(t) = x0 + v0*cos(theta)*t
   * y(t) = y0 + v0*sin(theta)*t - 0.5*g*t^2
   */
  private updateBallSimulation(deltaTime: number): void {
    const dt = deltaTime / 1000;
    this.simulationTime += dt;

    const t = this.simulationTime;
    const theta = (this.launchAngle * Math.PI) / 180;
    const v0x = this.launchSpeed * Math.cos(theta);
    const v0y = this.launchSpeed * Math.sin(theta);

    // PROTECTED FORMULA: Projectile trajectory
    const x = this.startX + v0x * t * this.scale;
    const y = this.startY - (v0y * t - 0.5 * this.g * t * t) * this.scale;

    // Store trajectory point
    this.trajectoryPoints.push({ x, y });
    if (this.trajectoryPoints.length > 500) {
      this.trajectoryPoints.shift();
    }

    this.ballX = x;
    this.ballY = y;

    // Check if scored
    if (!this.madeBasket && Math.abs(x - this.hoopX) < 18 && Math.abs(y - this.hoopY) < 12 && y < this.hoopY + 10) {
      this.madeBasket = true;
      if (!this.milestones.scored) {
        this.milestones.scored = true;
        this.emitCoachEvent('milestone_reached', { milestone: 'scored' });
      }
      this.emitCoachEvent('basket_scored', { angle: this.launchAngle, speed: this.launchSpeed });
    }

    // Check if ball out of bounds or hit ground
    if (y > 320 || x > 420 || t > 5) {
      this.isLaunched = false;
      if (!this.madeBasket) {
        this.madeBasket = false;
      }
      this.emitCoachEvent('ball_launched', {
        angle: this.launchAngle,
        speed: this.launchSpeed,
        scored: this.madeBasket,
      });
    }
  }

  /**
   * PROTECTED: Independence of horizontal and vertical motion
   *
   * Vertical: y = y0 + 0.5*g*t^2 (same for both balls!)
   * Horizontal: x = x0 + vx*t (only thrown ball has this)
   */
  private updateTwistDropSimulation(deltaTime: number): void {
    const dt = deltaTime / 1000;
    this.twistTime += dt;

    const t = this.twistTime;

    // PROTECTED: Both balls fall at same rate
    const verticalDrop = 0.5 * this.g * t * t * 10; // scaled for display
    const newDropY = 50 + verticalDrop;
    const newThrowX = 80 + 100 * t; // horizontal motion at constant velocity

    this.twistDropY = Math.min(newDropY, 240);
    this.twistThrowX = Math.min(newThrowX, 340);

    // Both hit ground at same time
    if (newDropY >= 240) {
      this.isTwistDropping = false;
    }
  }

  /**
   * PROTECTED: Calculate flight statistics using physics formulas
   */
  private calculateFlightStats(): void {
    const theta = (this.launchAngle * Math.PI) / 180;
    const v0y = this.launchSpeed * Math.sin(theta);

    // PROTECTED FORMULAS:
    // Flight time: T = 2*v0y/g
    this.flightTime = (2 * v0y) / this.g;

    // Maximum height: h = v0y^2/(2g)
    this.maxHeight = (v0y * v0y) / (2 * this.g);

    // Range: R = v0^2*sin(2*theta)/g
    this.range = (this.launchSpeed * this.launchSpeed * Math.sin(2 * theta)) / this.g;
  }

  private launchBall(): void {
    if (this.isLaunched) return;

    this.isLaunched = true;
    this.trajectoryPoints = [];
    this.madeBasket = null;
    this.simulationTime = 0;

    this.calculateFlightStats();

    if (!this.milestones.launchedFirstBall) {
      this.milestones.launchedFirstBall = true;
      this.emitCoachEvent('milestone_reached', { milestone: 'launchedFirstBall' });
    }
  }

  private resetSimulation(): void {
    this.isLaunched = false;
    this.ballX = this.startX;
    this.ballY = this.startY;
    this.trajectoryPoints = [];
    this.madeBasket = null;
    this.simulationTime = 0;
    this.flightTime = 0;
    this.maxHeight = 0;
    this.range = 0;
  }

  private startTwistDrop(): void {
    if (this.isTwistDropping) return;
    this.isTwistDropping = true;
    this.twistDropY = 50;
    this.twistThrowX = 80;
    this.twistTime = 0;
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
    const r = new CommandRenderer(700, 350);
    r.reset();

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

  // --- PHASE RENDERERS ---

  private renderBasketballCourt(r: CommandRenderer, width: number, height: number, offsetX = 0, offsetY = 0): void {
    // Sky gradient
    r.linearGradient('skyGrad', [
      { offset: '0%', color: colors.sky },
      { offset: '100%', color: colors.skyLight },
    ]);
    r.rect(offsetX, offsetY, width, 220, { fill: 'url(#skyGrad)' });

    // Court floor
    r.linearGradient('courtGrad', [
      { offset: '0%', color: colors.court },
      { offset: '100%', color: colors.courtDark },
    ]);
    r.rect(offsetX, offsetY + 220, width, 80, { fill: 'url(#courtGrad)' });
    r.line(offsetX, offsetY + 220, offsetX + width, offsetY + 220, { stroke: '#8b7355', strokeWidth: 3 });

    // Free throw line
    r.line(offsetX + 60, offsetY + 220, offsetX + 60, offsetY + 240, { stroke: '#ffffff', strokeWidth: 2 });

    // Backboard
    r.rect(offsetX + 345, offsetY + 60, 12, 90, { fill: '#ffffff', stroke: '#333333', strokeWidth: 2 });
    r.rect(offsetX + 348, offsetY + 100, 6, 30, { fill: '#ff0000', opacity: 0.3 });

    // Hoop
    r.ellipse(offsetX + this.hoopX, offsetY + this.hoopY - 40, 22, 6, { fill: 'none', stroke: colors.hoop, strokeWidth: 5 });

    // Net (simplified)
    for (let i = 0; i < 5; i++) {
      const x1 = offsetX + 298 + i * 10;
      const y1 = offsetY + 131;
      const y2 = offsetY + 170;
      const x2 = offsetX + 305 + i * 6;
      r.line(x1, y1, x2, y2, { stroke: '#ffffff', strokeWidth: 1.5, opacity: 0.7 });
    }

    // Launch angle indicator
    const angleRad = (this.launchAngle * Math.PI) / 180;
    const arrowLength = 50;
    const arrowEndX = offsetX + 60 + arrowLength * Math.cos(angleRad);
    const arrowEndY = offsetY + 220 - arrowLength * Math.sin(angleRad);
    r.line(offsetX + 60, offsetY + 220, arrowEndX, arrowEndY, {
      stroke: '#ffff00',
      strokeWidth: 3,
      strokeDasharray: '6,4',
    });
    r.text(offsetX + 65 + 35 * Math.cos(angleRad), offsetY + 215 - 35 * Math.sin(angleRad), `${this.launchAngle}deg`, {
      fill: '#ffff00',
      fontSize: 14,
      fontWeight: 'bold',
    });

    // Trajectory path
    if (this.showTrajectory && this.trajectoryPoints.length > 1) {
      for (let i = 1; i < this.trajectoryPoints.length; i++) {
        const p1 = this.trajectoryPoints[i - 1];
        const p2 = this.trajectoryPoints[i];
        r.line(offsetX + p1.x - 60, offsetY + p1.y - 40, offsetX + p2.x - 60, offsetY + p2.y - 40, {
          stroke: '#ffff00',
          strokeWidth: 2,
          strokeDasharray: '6,4',
          opacity: 0.8,
        });
      }
    }

    // Basketball
    r.linearGradient('ballGrad', [
      { offset: '0%', color: colors.ballLight },
      { offset: '50%', color: colors.ball },
      { offset: '100%', color: colors.ballDark },
    ]);
    r.circle(offsetX + this.ballX - 60, offsetY + this.ballY - 40, 14, {
      fill: 'url(#ballGrad)',
      stroke: '#8b4513',
      strokeWidth: 1,
    });
    // Ball lines
    r.line(offsetX + this.ballX - 60, offsetY + this.ballY - 54, offsetX + this.ballX - 60, offsetY + this.ballY - 26, {
      stroke: '#333',
      strokeWidth: 1.5,
    });

    // Score indicator
    if (this.madeBasket !== null) {
      const indicatorColor = this.madeBasket ? colors.success : colors.danger;
      const indicatorText = this.madeBasket ? 'SWISH!' : 'MISS!';
      r.rect(offsetX + width / 2 - 60, offsetY + 10, 120, 40, {
        fill: indicatorColor,
        opacity: 0.9,
        rx: 8,
      });
      r.text(offsetX + width / 2, offsetY + 38, indicatorText, {
        fill: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
    }
  }

  private renderHook(r: CommandRenderer): void {
    // Badge
    r.rect(250, 20, 200, 30, { fill: `${colors.primary}20`, stroke: `${colors.primary}40`, rx: 15 });
    r.circle(265, 35, 4, { fill: colors.primary });
    r.text(350, 41, 'PHYSICS EXPLORATION', {
      fill: colors.primary,
      fontSize: 11,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Title
    r.text(350, 80, 'The Perfect Free Throw', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 105, 'Master the physics of projectile motion', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Basketball court preview
    this.renderBasketballCourt(r, 380, 180, 160, 125);

    r.text(350, 320, 'What determines whether the shot goes in?', {
      fill: colors.cyan,
      fontSize: 16,
      fontWeight: 'bold',
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

    r.text(350, 85, 'You want maximum horizontal distance (range).',
      { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 105, 'What launch angle gives the maximum range?',
      { fill: colors.cyan, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Prediction feedback
    if (this.prediction) {
      const isCorrect = this.prediction === 'B';
      r.rect(100, 270, 500, 60, {
        fill: colors.bgCard,
        stroke: isCorrect ? colors.success : colors.primary,
        rx: 12,
      });
      r.text(350, 295, isCorrect ? '45 degrees is the magic angle for maximum range!' : 'Not quite! 45 degrees maximizes range.',
        { fill: isCorrect ? colors.success : colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(350, 315, 'Range = (v0^2 * sin(2*theta)) / g maximized at theta = 45 degrees',
        { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(350, 20, 'Projectile Motion Lab', {
      fill: colors.textPrimary,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Basketball court
    this.renderBasketballCourt(r, 420, 220, 140, 40);

    // Flight stats
    if (this.trajectoryPoints.length > 0) {
      r.rect(20, 270, 100, 60, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
      r.text(70, 290, `${this.flightTime.toFixed(2)}s`, { fill: colors.primary, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(70, 310, 'Flight Time', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

      r.rect(130, 270, 100, 60, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
      r.text(180, 290, `${this.maxHeight.toFixed(1)}m`, { fill: colors.cyan, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(180, 310, 'Max Height', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

      r.rect(240, 270, 100, 60, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
      r.text(290, 290, `${this.range.toFixed(1)}m`, { fill: colors.success, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(290, 310, 'Range', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    }

    // Hint
    r.rect(360, 270, 320, 60, { fill: `${colors.primary}20`, stroke: colors.primary, rx: 8 });
    r.text(380, 290, 'Try This!', { fill: colors.primary, fontSize: 12, fontWeight: 'bold' });
    r.text(380, 310, 'Compare 30 and 60 degrees at same speed.', { fill: colors.textSecondary, fontSize: 11 });
    r.text(380, 325, 'They land at the same distance!', { fill: colors.textMuted, fontSize: 10 });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(350, 40, 'The Physics of Projectile Motion', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Horizontal motion card
    r.rect(30, 70, 310, 100, { fill: `${colors.cyan}15`, stroke: colors.cyan, rx: 12 });
    r.text(50, 95, 'Horizontal Motion', { fill: colors.cyan, fontSize: 16, fontWeight: 'bold' });
    r.text(50, 115, 'No horizontal force (ignoring air)', { fill: colors.textSecondary, fontSize: 11 });
    r.text(50, 135, 'Velocity stays constant: vx = v0*cos(theta)', { fill: colors.cyan, fontSize: 11 });
    r.text(50, 155, 'Position: x = vx * t', { fill: colors.cyan, fontSize: 11 });

    // Vertical motion card
    r.rect(360, 70, 310, 100, { fill: `${colors.success}15`, stroke: colors.success, rx: 12 });
    r.text(380, 95, 'Vertical Motion', { fill: colors.success, fontSize: 16, fontWeight: 'bold' });
    r.text(380, 115, 'Gravity pulls down at g = 9.8 m/s^2', { fill: colors.textSecondary, fontSize: 11 });
    r.text(380, 135, 'Velocity changes: vy = v0*sin(theta) - g*t', { fill: colors.success, fontSize: 11 });
    r.text(380, 155, 'Position: y = vy*t - 0.5*g*t^2', { fill: colors.success, fontSize: 11 });

    // Maximum range card
    r.rect(30, 185, 310, 90, { fill: `${colors.primary}15`, stroke: colors.primary, rx: 12 });
    r.text(50, 210, 'Maximum Range', { fill: colors.primary, fontSize: 16, fontWeight: 'bold' });
    r.text(50, 230, 'Range = (v0^2 * sin(2*theta)) / g', { fill: colors.primary, fontSize: 12 });
    r.text(50, 250, 'sin(2*theta) maximized at 2*theta = 90 deg', { fill: colors.textSecondary, fontSize: 11 });
    r.text(50, 265, 'Therefore theta = 45 deg gives max range', { fill: colors.textMuted, fontSize: 11 });

    // Complementary angles card
    r.rect(360, 185, 310, 90, { fill: `${colors.purple}15`, stroke: colors.purple, rx: 12 });
    r.text(380, 210, 'Complementary Angles', { fill: colors.purple, fontSize: 16, fontWeight: 'bold' });
    r.text(380, 230, 'Angles that add to 90 deg give SAME range', { fill: colors.textSecondary, fontSize: 11 });
    r.text(380, 250, '30 deg and 60 deg land at the same spot', { fill: colors.purple, fontSize: 11 });
    r.text(380, 265, 'Different paths, same destination!', { fill: colors.textMuted, fontSize: 11 });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist Challenge', {
      fill: colors.purple,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 80, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(350, 110, 'You hold two identical balls at the same height.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 135, 'You DROP one straight down and THROW the other horizontally.', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 185, 'Which ball hits the ground first?', {
      fill: colors.cyan,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Feedback
    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'C';
      r.rect(100, 280, 500, 50, {
        fill: colors.bgCard,
        stroke: isCorrect ? colors.success : colors.purple,
        rx: 12,
      });
      r.text(350, 305, isCorrect ? 'Correct! They hit at exactly the same time!' : 'Surprise! They hit at exactly the same time!', {
        fill: isCorrect ? colors.success : colors.purple,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
      r.text(350, 322, 'Horizontal and vertical motions are independent!', {
        fill: colors.textMuted,
        fontSize: 11,
        textAnchor: 'middle',
      });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(350, 30, 'Independence of Motion', {
      fill: colors.purple,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Demo area
    r.rect(150, 50, 400, 220, { fill: '#1e1e3f', rx: 8 });

    // Ground
    r.rect(150, 230, 400, 40, { fill: '#4a3728' });
    r.line(150, 230, 550, 230, { stroke: '#6b5344', strokeWidth: 2 });

    // Platform
    r.rect(180, 80, 80, 10, { fill: '#64748b', rx: 2 });

    // Labels
    r.text(200, 70, 'DROP', { fill: colors.primary, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(330, 70, 'THROW', { fill: colors.cyan, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Height reference line
    r.line(170, 90, 170, 230, { stroke: '#555', strokeWidth: 1, strokeDasharray: '4,4' });

    // Dropped ball (orange)
    r.circle(210, this.twistDropY + 40, 16, { fill: colors.primary, stroke: colors.primaryDark, strokeWidth: 2 });

    // Thrown ball (cyan)
    r.circle(this.twistThrowX + 130, this.twistDropY + 40, 16, { fill: colors.cyan, stroke: '#0891b2', strokeWidth: 2 });

    // Impact markers
    if (this.twistDropY >= 190) {
      r.circle(210, 230, 20, { fill: colors.primary, opacity: 0.3 });
      r.circle(this.twistThrowX + 130, 230, 20, { fill: colors.cyan, opacity: 0.3 });
      r.text(350, 260, 'SAME TIME!', { fill: colors.success, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Explanation
    r.rect(150, 285, 400, 50, { fill: `${colors.purple}20`, stroke: colors.purple, rx: 8 });
    r.text(170, 305, 'Why This Works:', { fill: colors.purple, fontSize: 12, fontWeight: 'bold' });
    r.text(170, 322, 'Gravity only affects vertical motion. Both follow: y = 0.5*g*t^2', {
      fill: colors.textSecondary,
      fontSize: 11,
    });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', {
      fill: colors.purple,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 80, 540, 120, { fill: `${colors.purple}15`, stroke: colors.purple, rx: 12 });
    r.text(350, 110, 'Independence of Horizontal and Vertical Motion', {
      fill: colors.purple,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 140, 'This is one of the most important principles in physics!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Dropped ball box
    r.rect(100, 220, 220, 80, { fill: colors.bgCard, stroke: colors.primary, rx: 8 });
    r.text(210, 245, 'Dropped Ball', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(210, 265, 'y = 0.5*g*t^2', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(210, 285, 'Pure vertical motion', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Thrown ball box
    r.rect(380, 220, 220, 80, { fill: colors.bgCard, stroke: colors.cyan, rx: 8 });
    r.text(490, 245, 'Thrown Ball', { fill: colors.cyan, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(490, 265, 'y = 0.5*g*t^2 (same!)', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(490, 285, 'x = vx*t (bonus motion)', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    r.text(350, 325, 'A bullet fired horizontally hits ground same time as one dropped!', {
      fill: colors.accent,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(350, 35, 'Real-World Applications', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // App tabs
    const tabWidth = 150;
    const tabStartX = 50;
    transferApps.forEach((app, i) => {
      const isSelected = i === this.selectedApp;
      const isCompleted = this.completedApps[i];

      r.rect(tabStartX + i * (tabWidth + 10), 60, tabWidth, 35, {
        fill: isSelected ? colors.primary : colors.bgCard,
        stroke: isCompleted ? colors.success : colors.border,
        rx: 8,
      });
      r.text(tabStartX + i * (tabWidth + 10) + tabWidth / 2, 83, app.short, {
        fill: isSelected ? colors.textPrimary : colors.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
    });

    // Selected app content
    const app = transferApps[this.selectedApp];
    r.rect(50, 110, 600, 210, { fill: colors.bgCard, stroke: colors.border, rx: 12 });

    r.text(70, 140, app.title, { fill: colors.textPrimary, fontSize: 18, fontWeight: 'bold' });
    r.text(70, 160, app.tagline, { fill: colors.textMuted, fontSize: 11 });

    r.text(70, 185, app.description.substring(0, 80) + '...', { fill: colors.textSecondary, fontSize: 11 });

    // Stats preview
    r.rect(70, 210, 260, 80, { fill: colors.bgDark, rx: 8 });
    r.text(90, 230, 'Key Stats:', { fill: colors.cyan, fontSize: 11, fontWeight: 'bold' });
    app.stats.slice(0, 2).forEach((stat, i) => {
      r.text(90, 250 + i * 15, '* ' + stat.substring(0, 40), { fill: colors.textMuted, fontSize: 9 });
    });

    // Examples preview
    r.rect(350, 210, 280, 80, { fill: colors.bgDark, rx: 8 });
    r.text(370, 230, 'Examples:', { fill: colors.success, fontSize: 11, fontWeight: 'bold' });
    app.examples.slice(0, 2).forEach((ex, i) => {
      r.text(370, 250 + i * 15, '* ' + ex.substring(0, 35), { fill: colors.textMuted, fontSize: 9 });
    });

    // Progress
    r.text(350, 335, `Progress: ${this.completedApps.filter(c => c).length}/4`, {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTest(r: CommandRenderer): void {
    if (this.testSubmitted) {
      this.renderTestResults(r);
      return;
    }

    const q = testQuestions[this.testQuestion];

    r.text(350, 35, `Question ${this.testQuestion + 1} of ${testQuestions.length}`, {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Scenario
    r.rect(50, 50, 600, 40, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
    r.text(350, 75, q.scenario.length > 90 ? q.scenario.substring(0, 90) + '...' : q.scenario, {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });

    // Question
    r.text(350, 115, q.question, {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Answer options
    q.options.forEach((option, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;

      r.rect(100, 140 + i * 45, 500, 38, {
        fill: isSelected ? `${colors.primary}40` : colors.bgCard,
        stroke: isSelected ? colors.primary : colors.border,
        rx: 8,
      });
      r.text(350, 165 + i * 45, option, {
        fill: isSelected ? colors.primary : colors.textSecondary,
        fontSize: 12,
        textAnchor: 'middle',
      });
    });
  }

  private renderTestResults(r: CommandRenderer): void {
    const score = this.calculateTestScore();
    const passed = score >= 7;

    r.text(350, 80, passed ? 'Congratulations!' : 'Keep Learning!', {
      fill: passed ? colors.success : colors.warning,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 140, `Score: ${score} / ${testQuestions.length}`, {
      fill: colors.textPrimary,
      fontSize: 24,
      textAnchor: 'middle',
    });

    r.text(350, 180, passed ? 'You\'ve mastered Projectile Motion!' : 'Review the concepts and try again.', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    // Score breakdown
    r.rect(150, 210, 400, 100, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(350, 240, 'What you learned:', { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 260, '* Parabolic trajectories from combined motions', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(350, 280, '* 45 degrees for maximum range', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(350, 300, '* Independence of horizontal/vertical motion', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
  }

  private renderMastery(r: CommandRenderer): void {
    // Celebration
    r.text(350, 80, 'Projectile Motion Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 120, 'You can now predict where any thrown object will land!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Achievement badges
    const badges = [
      { icon: '45deg', label: '45 deg Max Range' },
      { icon: 'Independence', label: 'Motion Independence' },
      { icon: 'Parabola', label: 'Parabolic Path' },
      { icon: 'Complementary', label: 'Complementary Angles' },
    ];

    badges.forEach((badge, i) => {
      const x = 100 + i * 140;
      r.rect(x, 160, 120, 80, { fill: colors.bgCard, stroke: colors.primary, rx: 12 });
      r.text(x + 60, 195, badge.icon, { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x + 60, 225, badge.label, { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
    });

    r.rect(150, 270, 400, 50, { fill: `${colors.success}20`, stroke: colors.success, rx: 12 });
    r.text(350, 300, 'Mission Complete! You\'re ready for advanced physics!', {
      fill: colors.success,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  // --- UI STATE ---

  private renderUI(r: CommandRenderer): void {
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

    // Back button
    if (idx > 0) {
      r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });
    }

    // Phase-specific controls
    switch (this.phase) {
      case 'predict':
        r.addButton({ id: 'predict_A', label: '30 deg', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: '45 deg', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: '60 deg', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: '90 deg', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'angle', label: 'Angle', value: this.launchAngle, min: 10, max: 80 });
        r.addSlider({ id: 'speed', label: 'Speed', value: this.launchSpeed, min: 8, max: 25 });
        r.addButton({ id: this.isLaunched ? 'reset' : 'launch', label: this.isLaunched ? 'Reset' : 'Launch!', variant: 'primary' });
        r.addToggle({ id: 'show_trajectory', label: 'Show Path', value: this.showTrajectory });
        r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'Dropped first', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'Thrown first', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'Same time', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'Depends on throw speed', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addButton({ id: 'drop_balls', label: this.isTwistDropping ? 'Dropping...' : 'Drop Both Balls', variant: 'primary', disabled: this.isTwistDropping });
        r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Sports', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Aerospace', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Fountains', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Firefighting', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every(c => c)) {
          r.addButton({ id: 'next', label: 'Take Test', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= testQuestions.length - 1 });
          // Answer buttons
          for (let i = 0; i < 4; i++) {
            r.addButton({
              id: `answer_${i}`,
              label: String.fromCharCode(65 + i),
              variant: this.testAnswers[this.testQuestion] === i ? 'primary' : 'secondary',
            });
          }
          if (this.testAnswers.every(a => a !== null)) {
            r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
          }
        } else {
          const score = this.calculateTestScore();
          r.addButton({ id: score >= 7 ? 'next' : 'back', label: score >= 7 ? 'Complete!' : 'Review', variant: score >= 7 ? 'success' : 'secondary' });
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
      launchAngle: this.launchAngle,
      launchSpeed: this.launchSpeed,
      milestones: this.milestones,
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
    this.launchAngle = (state.launchAngle as number) || 45;
    this.launchSpeed = (state.launchSpeed as number) || 15;
    this.milestones = (state.milestones as typeof this.milestones) || {
      launchedFirstBall: false,
      changedAngle: false,
      changedSpeed: false,
      scored: false,
    };
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===
// Register this in server.ts: registry.register('projectile_motion', createProjectileMotionGame);
export function createProjectileMotionGame(sessionId: string): ProjectileMotionGame {
  return new ProjectileMotionGame(sessionId);
}
