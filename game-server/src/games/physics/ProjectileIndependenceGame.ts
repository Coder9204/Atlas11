/**
 * Projectile Independence Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Independence of horizontal and vertical motion
 * - Kinematic equations: y = ½gt², x = v₀ₓt
 * - Time of flight calculations
 * - Air resistance coupling effects
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
    question: 'A ball dropped and a ball thrown horizontally from the same height land:',
    options: ['Dropped lands first', 'Thrown lands first', 'At exactly the same time', 'Depends on throw speed'],
    correctIndex: 2,
  },
  {
    question: 'Horizontal and vertical motions in projectile motion are:',
    options: ['Completely dependent', 'Completely independent', 'Only independent at low speeds', 'Coupled by gravity'],
    correctIndex: 1,
  },
  {
    question: 'The time a projectile is in the air depends on:',
    options: ['Horizontal velocity only', 'Vertical motion and height only', 'Total speed', 'Mass of projectile'],
    correctIndex: 1,
  },
  {
    question: 'If you double the horizontal velocity of a thrown ball (same height):',
    options: ['It lands twice as fast', 'It lands at the same time, twice as far', 'It lands later', 'It lands sooner'],
    correctIndex: 1,
  },
  {
    question: 'The "monkey and hunter" problem demonstrates that:',
    options: ['Monkeys are smart', 'Bullets curve upward', 'Both bullet and monkey fall at the same rate', 'Gravity is optional'],
    correctIndex: 2,
  },
  {
    question: 'At the peak of a projectile\'s path, which velocity is zero?',
    options: ['Horizontal', 'Vertical', 'Both', 'Neither'],
    correctIndex: 1,
  },
  {
    question: 'Adding air resistance to projectile motion:',
    options: ['Has no effect', 'Couples horizontal and vertical motion', 'Only affects vertical motion', 'Only affects horizontal motion'],
    correctIndex: 1,
  },
  {
    question: 'A bullet fired horizontally and one dropped simultaneously both:',
    options: ['Travel the same distance', 'Hit the ground at the same time', 'Have the same final velocity', 'Have the same kinetic energy'],
    correctIndex: 1,
  },
  {
    question: 'The formula for time to fall from height h is:',
    options: ['t = h/g', 't = √(h/g)', 't = √(2h/g)', 't = 2h/g'],
    correctIndex: 2,
  },
  {
    question: 'Projectiles at 30° and 60° with the same speed have:',
    options: ['Same range', 'Same max height', 'Same time of flight', 'Different everything'],
    correctIndex: 0,
  },
];

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
  droppedBall: '#ef4444',
  thrownBall: '#22c55e',
  trail: '#3b82f6',
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
    title: 'Basketball Shooting',
    icon: 'basketball',
    description: 'The horizontal motion toward the hoop and vertical arc are independent.',
    details: 'Players control horizontal aim and vertical arc separately - the ball\'s forward speed doesn\'t affect how fast it falls.',
  },
  {
    title: 'Aircraft Supply Drops',
    icon: 'plane',
    description: 'Packages maintain plane\'s horizontal speed while falling.',
    details: 'At altitude h, drop time is t = √(2h/g). The package travels x = v·t horizontally during this time.',
  },
  {
    title: 'Soccer Free Kicks',
    icon: 'soccer',
    description: 'Horizontal curve and vertical drop are independent components.',
    details: 'Spin creates horizontal curve (Magnus effect) without changing fall rate - players exploit this independence.',
  },
  {
    title: 'Rocket Trajectories',
    icon: 'rocket',
    description: 'Orbit is achieved when falling matches Earth\'s curvature.',
    details: 'Horizontal velocity of ~7.8 km/s means falling 9m/s² matches the curve of Earth - continuous free fall!',
  },
];

// === MAIN GAME CLASS ===

export class ProjectileIndependenceGame extends BaseGame {
  readonly gameType = 'projectile_independence';
  readonly gameTitle = 'Independence of Motion';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private isSimulating = false;
  private simulationTime = 0;
  private droppedBall = { x: 100, y: 50, vy: 0 };
  private thrownBall = { x: 100, y: 50, vx: 100, vy: 0 };
  private horizontalSpeed = 100;
  private cliffHeight = 200;
  private showTrails = true;
  private droppedLanded = false;
  private thrownLanded = false;
  private droppedTrail: { x: number; y: number }[] = [];
  private thrownTrail: { x: number; y: number }[] = [];
  private useAirResistance = false;

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
    hook: 'Drop one ball, throw another horizontally. Which hits first? The answer reveals a fundamental physics principle!',
    predict: 'Think carefully: does horizontal speed affect how fast something falls?',
    play: 'Watch both balls carefully. When do they land?',
    review: 'Horizontal and vertical motions are completely independent - this is a key principle!',
    twist_predict: 'What happens when we add air resistance? Does it change things?',
    twist_play: 'Air resistance depends on total speed, coupling the motions together!',
    twist_review: 'In vacuum, motions are independent. In air, they become coupled!',
    transfer: 'From basketball to rockets - independence of motion is everywhere!',
    test: 'Time to test your understanding of projectile motion!',
    mastery: 'Congratulations! You\'ve mastered the independence of motion principle!',
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
      message: 'Projectile Independence lesson started',
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
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'trails') {
      this.showTrails = value;
      return;
    }
    if (id === 'air_resistance') {
      this.useAirResistance = value;
      this.resetSimulation();
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'horizontal_speed') {
      this.horizontalSpeed = value;
      this.resetSimulation();
      return;
    }
    if (id === 'cliff_height') {
      this.cliffHeight = value;
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
   * PROTECTED: Time to fall from given height
   * t = √(2h/g)
   */
  private calculateTimeToFall(height: number): number {
    const g = 500; // pixels/s² (scaled for visual)
    return Math.sqrt((2 * height) / g);
  }

  /**
   * PROTECTED: Horizontal distance traveled
   * x = v₀ₓ × t
   */
  private calculateHorizontalDistance(): number {
    const timeToFall = this.calculateTimeToFall(this.cliffHeight);
    return this.horizontalSpeed * timeToFall;
  }

  private startSimulation(): void {
    this.isSimulating = true;
    this.simulationTime = 0;
    this.droppedBall = { x: 100, y: 50, vy: 0 };
    this.thrownBall = { x: 100, y: 50, vx: this.horizontalSpeed, vy: 0 };
    this.droppedLanded = false;
    this.thrownLanded = false;
    this.droppedTrail = [];
    this.thrownTrail = [];
  }

  private resetSimulation(): void {
    this.isSimulating = false;
    this.simulationTime = 0;
    this.droppedBall = { x: 100, y: 50, vy: 0 };
    this.thrownBall = { x: 100, y: 50, vx: this.horizontalSpeed, vy: 0 };
    this.droppedLanded = false;
    this.thrownLanded = false;
    this.droppedTrail = [];
    this.thrownTrail = [];
  }

  update(deltaTime: number): void {
    if (!this.isSimulating) return;

    const dt = Math.min(deltaTime / 1000, 0.05);
    this.simulationTime += dt;

    const g = 500; // pixels/s²
    const airDrag = this.useAirResistance ? 0.02 : 0;
    const groundY = 50 + this.cliffHeight;

    // Update dropped ball
    if (!this.droppedLanded) {
      this.droppedBall.vy += g * dt;
      if (this.useAirResistance) {
        this.droppedBall.vy *= (1 - airDrag);
      }
      this.droppedBall.y += this.droppedBall.vy * dt;
      this.droppedTrail.push({ x: this.droppedBall.x, y: this.droppedBall.y });

      if (this.droppedBall.y >= groundY) {
        this.droppedBall.y = groundY;
        this.droppedLanded = true;
      }
    }

    // Update thrown ball
    if (!this.thrownLanded) {
      this.thrownBall.vy += g * dt;
      if (this.useAirResistance) {
        this.thrownBall.vy *= (1 - airDrag);
        this.thrownBall.vx *= (1 - airDrag * 0.5);
      }
      this.thrownBall.x += this.thrownBall.vx * dt;
      this.thrownBall.y += this.thrownBall.vy * dt;
      this.thrownTrail.push({ x: this.thrownBall.x, y: this.thrownBall.y });

      if (this.thrownBall.y >= groundY) {
        this.thrownBall.y = groundY;
        this.thrownLanded = true;
      }
    }

    // Stop simulation when both landed
    if (this.droppedLanded && this.thrownLanded) {
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

  private renderSimulationArea(r: CommandRenderer, centerX: number, centerY: number, scale: number = 1): void {
    const width = 400 * scale;
    const height = 280 * scale;
    const groundY = 50 + this.cliffHeight;

    // Sky background
    r.rect(centerX - width / 2, centerY - height / 2, width, groundY - (centerY - height / 2), {
      fill: '#1e3a5f',
      rx: 8,
    });

    // Ground
    r.rect(centerX - width / 2, groundY, width, height - (groundY - (centerY - height / 2)), {
      fill: '#1e4d3d',
      rx: 0,
    });

    // Cliff/table
    r.rect(centerX - width / 2, centerY - height / 2, 120 * scale, groundY - (centerY - height / 2), {
      fill: colors.bgCard,
      stroke: colors.border,
      strokeWidth: 2,
    });

    // Trails
    if (this.showTrails && this.droppedTrail.length > 1) {
      const trailPath = this.droppedTrail.map(p => `${p.x},${p.y}`).join(' ');
      r.polyline(trailPath, {
        fill: 'none',
        stroke: colors.droppedBall,
        strokeWidth: 2,
        strokeDasharray: '4,4',
        opacity: 0.7,
      });
    }

    if (this.showTrails && this.thrownTrail.length > 1) {
      const trailPath = this.thrownTrail.map(p => `${p.x},${p.y}`).join(' ');
      r.polyline(trailPath, {
        fill: 'none',
        stroke: colors.thrownBall,
        strokeWidth: 2,
        strokeDasharray: '4,4',
        opacity: 0.7,
      });
    }

    // Dropped ball (red)
    r.circle(this.droppedBall.x, Math.min(this.droppedBall.y, groundY), 12 * scale, {
      fill: colors.droppedBall,
      stroke: colors.textPrimary,
      strokeWidth: 2,
    });
    r.text(this.droppedBall.x - 25, Math.min(this.droppedBall.y, groundY) - 18, 'Drop', {
      fill: colors.droppedBall,
      fontSize: 10,
      fontWeight: 'bold',
    });

    // Thrown ball (green)
    r.circle(this.thrownBall.x, Math.min(this.thrownBall.y, groundY), 12 * scale, {
      fill: colors.thrownBall,
      stroke: colors.textPrimary,
      strokeWidth: 2,
    });
    r.text(this.thrownBall.x - 25, Math.min(this.thrownBall.y, groundY) - 18, 'Throw', {
      fill: colors.thrownBall,
      fontSize: 10,
      fontWeight: 'bold',
    });

    // Time display
    r.text(centerX - width / 2 + 10, centerY - height / 2 + 20, `t = ${this.simulationTime.toFixed(2)}s`, {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
    });

    // Height indicator
    r.line(centerX - width / 2 + 130, 50, centerX - width / 2 + 130, groundY, {
      stroke: colors.textMuted,
      strokeDasharray: '4,4',
    });
    r.text(centerX - width / 2 + 140, 50 + this.cliffHeight / 2, `h = ${this.cliffHeight}`, {
      fill: colors.textMuted,
      fontSize: 10,
    });

    // Landing indicators
    if (this.droppedLanded) {
      r.text(this.droppedBall.x - 15, groundY + 20, 'Landed', {
        fill: colors.droppedBall,
        fontSize: 10,
      });
    }
    if (this.thrownLanded) {
      r.text(this.thrownBall.x - 15, groundY + 35, `x = ${Math.round(this.thrownBall.x - 100)}`, {
        fill: colors.thrownBall,
        fontSize: 10,
      });
    }
  }

  private renderHookPhase(r: CommandRenderer): void {
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.text(350, 49, 'PHYSICS EXPLORATION', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, 'The Falling Race', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'Which ball hits the ground first?', {
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

    this.renderSimulationArea(r, 350, 280, 1);

    r.text(350, 400, 'One dropped, one thrown horizontally at the same moment...', {
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
    r.text(350, 115, 'Two balls released at the same instant from the same height.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'One dropped, one thrown horizontally. Which lands first?', {
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
        ? 'Correct! They land at exactly the same time!'
        : 'Surprising, right? They actually land at the SAME time!',
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
    r.text(350, 30, 'Independence Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 540, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderSimulationArea(r, 350, 200, 1.2);

    const expectedTime = this.calculateTimeToFall(this.cliffHeight);
    const expectedDistance = this.calculateHorizontalDistance();

    r.rect(80, 350, 540, 60, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(365, 370, `Predicted fall time: ${expectedTime.toFixed(2)}s | Distance: ${expectedDistance.toFixed(0)} px`, {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(365, 390, 'Horizontal speed doesn\'t affect fall time!', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Independence of Motion', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 290, 150, { fill: '#dc262640', stroke: colors.droppedBall, rx: 16 });
    r.text(195, 95, 'Vertical Motion', { fill: colors.droppedBall, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const vertInfo = [
      'Only gravity acts vertically',
      'Both balls: vᵧ starts at 0',
      'Both accelerate at g = 9.8 m/s²',
      'y = ½gt² - same for both!',
    ];
    vertInfo.forEach((line, i) => {
      r.text(70, 120 + i * 25, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 150, { fill: '#16a34a40', stroke: colors.thrownBall, rx: 16 });
    r.text(505, 95, 'Horizontal Motion', { fill: colors.thrownBall, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const horizInfo = [
      'No horizontal forces (vacuum)',
      'Dropped: vₓ = 0, stays at x = 0',
      'Thrown: vₓ = constant',
      'x = vₓ × t (independent!)',
    ];
    horizInfo.forEach((line, i) => {
      r.text(380, 120 + i * 25, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(50, 240, 600, 80, { fill: '#3b82f640', stroke: colors.trail, rx: 16 });
    r.text(350, 265, 'The Key Insight', { fill: colors.trail, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 290, 'Horizontal velocity (vₓ) does NOT appear in the vertical equation (y = ½gt²)!', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 308, 'The motions are completely independent - they don\'t affect each other.', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist: Air Resistance', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'In real air, the thrown ball experiences drag.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 145, 'Now which lands first?', {
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
        ? 'Correct! With air resistance, the dropped ball lands first!'
        : 'Actually, the dropped ball lands first with air resistance!',
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
    this.useAirResistance = true;

    r.text(350, 30, 'Air Resistance Lab', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 540, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderSimulationArea(r, 350, 200, 1.2);

    r.rect(80, 350, 540, 60, { fill: '#eab30830', stroke: colors.warning, rx: 12 });
    r.text(350, 375, 'Air resistance couples the motions! Higher total speed = more drag on both axes.', {
      fill: colors.warning,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'When Independence Breaks Down', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'Air Resistance Couples Motion', {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const explanation = [
      '• Drag force: Fᵈ = ½ρv²CᵈA - depends on TOTAL velocity',
      '• Total speed v = √(vₓ² + vᵧ²) - combines both components',
      '• Drag direction opposes velocity (not just vertical)',
      '• Thrown ball: higher total v → more drag including vertical component',
      '• Result: thrown ball falls SLOWER than dropped ball',
    ];

    explanation.forEach((line, i) => {
      r.text(120, 150 + i * 26, line, { fill: colors.textSecondary, fontSize: 12 });
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

    r.text(350, 200, passed ? 'You\'ve mastered projectile independence!' : 'Review the concepts and try again.', {
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

    r.text(350, 130, 'Motion Independence Master!', {
      fill: colors.textPrimary,
      fontSize: 26,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, 'You\'ve mastered the independence of motion!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'x,y', label: 'Independent Axes' },
      { icon: '½gt²', label: 'Free Fall' },
      { icon: 'vₓt', label: 'Constant Velocity' },
      { icon: 'Drag', label: 'Air Resistance' },
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
        r.addButton({ id: 'next', label: 'Make a Prediction', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Dropped lands first', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Thrown lands first', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Same time', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Test It', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'horizontal_speed', label: 'Throw Speed', value: this.horizontalSpeed, min: 50, max: 200 });
        r.addSlider({ id: 'cliff_height', label: 'Height', value: this.cliffHeight, min: 100, max: 250 });
        r.addToggle({ id: 'trails', label: 'Trails', value: this.showTrails, onLabel: 'ON', offLabel: 'OFF' });
        if (!this.isSimulating && !this.droppedLanded) {
          r.addButton({ id: 'start_sim', label: 'Drop Both', variant: 'success' });
        } else if (this.droppedLanded && this.thrownLanded) {
          r.addButton({ id: 'reset_sim', label: 'Reset', variant: 'secondary' });
        }
        r.addButton({ id: 'next', label: 'Review', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'The Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Still same time', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Dropped first', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Thrown first', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See With Air', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({ id: 'horizontal_speed', label: 'Throw Speed', value: this.horizontalSpeed, min: 50, max: 200 });
        if (!this.isSimulating && !this.droppedLanded) {
          r.addButton({ id: 'start_sim', label: 'Drop Both', variant: 'success' });
        } else if (this.droppedLanded && this.thrownLanded) {
          r.addButton({ id: 'reset_sim', label: 'Reset', variant: 'secondary' });
        }
        r.addButton({ id: 'next', label: 'Understand Why', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Basketball', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Aircraft', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Soccer', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Rockets', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
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
      isSimulating: this.isSimulating,
      simulationTime: this.simulationTime,
      horizontalSpeed: this.horizontalSpeed,
      cliffHeight: this.cliffHeight,
      useAirResistance: this.useAirResistance,
      showTrails: this.showTrails,
      droppedLanded: this.droppedLanded,
      thrownLanded: this.thrownLanded,
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
    this.horizontalSpeed = (state.horizontalSpeed as number) || 100;
    this.cliffHeight = (state.cliffHeight as number) || 200;
    this.useAirResistance = (state.useAirResistance as boolean) || false;
    this.showTrails = (state.showTrails as boolean) ?? true;
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

export function createProjectileIndependenceGame(sessionId: string): ProjectileIndependenceGame {
  return new ProjectileIndependenceGame(sessionId);
}
