/**
 * Terminal Velocity Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED PHYSICS (never sent to client):
 * - Drag force: F_drag = 0.5 * rho * v^2 * Cd * A
 * - Terminal velocity: v_t = sqrt(2 * m * g / (rho * Cd * A))
 * - Velocity vs time: dv/dt = g - (drag / mass)
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

// === PROTECTED PHYSICS DATA ===

interface FallingObject {
  name: string;
  mass: number;        // kg
  area: number;        // m^2
  dragCoeff: number;   // dimensionless
  color: string;
  emoji: string;
  terminalV: number;   // m/s (pre-calculated for display)
}

// PROTECTED: Object parameters - these define the physics
const fallingObjects: FallingObject[] = [
  { name: 'Coffee Filter', mass: 0.001, area: 0.02, dragCoeff: 1.2, color: '#f5f5dc', emoji: '(cup)', terminalV: 0.9 },
  { name: 'Tennis Ball', mass: 0.057, area: 0.0034, dragCoeff: 0.5, color: '#ccff00', emoji: '(ball)', terminalV: 20 },
  { name: 'Baseball', mass: 0.145, area: 0.0042, dragCoeff: 0.35, color: '#ffffff', emoji: '(ball)', terminalV: 33 },
  { name: 'Bowling Ball', mass: 7.26, area: 0.035, dragCoeff: 0.4, color: '#1a1a2e', emoji: '(heavy)', terminalV: 77 },
];

// === TEST QUESTIONS (PROTECTED IP - never sent to client) ===

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

const testQuestions: TestQuestion[] = [
  {
    question: 'At terminal velocity, what is the net force on a falling object?',
    options: ['Maximum downward', 'Maximum upward', 'Zero', 'Constantly changing'],
    correctIndex: 2,
  },
  {
    question: 'Which factor does NOT affect terminal velocity?',
    options: ['Mass', 'Height of drop', 'Surface area', 'Air density'],
    correctIndex: 1,
  },
  {
    question: 'Why does a coffee filter fall slower than a baseball?',
    options: ['High area-to-mass ratio', 'Lower mass', 'Air avoids it', 'Gravity is weaker on it'],
    correctIndex: 0,
  },
  {
    question: 'A skydiver reaches terminal velocity and then tucks into a ball. What happens?',
    options: ['Speed stays the same', 'Speed decreases', 'Speed increases to new terminal V', 'Speed becomes zero'],
    correctIndex: 2,
  },
  {
    question: 'According to the square-cube law, as animals get smaller...',
    options: ['Terminal velocity increases', 'Terminal velocity decreases', 'Terminal velocity is unchanged', "They can't reach terminal velocity"],
    correctIndex: 1,
  },
  {
    question: 'What is the approximate terminal velocity of a skydiver (spread eagle)?',
    options: ['55 m/s (120 mph)', '100 m/s (220 mph)', '20 m/s (45 mph)', '5 m/s (11 mph)'],
    correctIndex: 0,
  },
  {
    question: 'How does a parachute reduce terminal velocity?',
    options: ['Reduces mass', 'Reduces gravity', 'Increases drag area dramatically', 'Creates upward thrust'],
    correctIndex: 2,
  },
  {
    question: 'Without air resistance, how fast would rain hit the ground?',
    options: ['Same speed (5-10 m/s)', 'About 500 m/s', 'Speed of light', 'It would float'],
    correctIndex: 1,
  },
  {
    question: 'Why can an ant survive a fall from any height?',
    options: ['Very low terminal velocity', 'Exoskeleton protection', 'They can fly', 'Time moves slower for them'],
    correctIndex: 0,
  },
  {
    question: 'What is the relationship between drag and velocity at terminal velocity?',
    options: ['Drag < Gravity', 'Drag > Gravity', 'Drag = Gravity', 'No relationship'],
    correctIndex: 2,
  },
];

// === PREMIUM COLOR PALETTE ===

const colors = {
  primary: '#f59e0b',     // amber
  primaryDark: '#d97706',
  accent: '#ea580c',      // orange
  success: '#10b981',
  danger: '#ef4444',
  warning: '#fbbf24',
  bgDark: '#0a0f1a',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  sky: '#1e90ff',
  ground: '#2d5a27',
  forceGravity: '#ff4444',
  forceDrag: '#44ff44',
};

// === MAIN GAME CLASS ===

export class TerminalVelocityGame extends BaseGame {
  readonly gameType = 'terminal_velocity';
  readonly gameTitle = 'Terminal Velocity';

  // --- PROTECTED GAME STATE (never sent to client) ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state - PROTECTED PHYSICS
  private selectedObject = 0;
  private objectY = 40;           // screen position
  private objectVelocity = 0;     // m/s (actual physics velocity)
  private isDropping = false;
  private timeElapsed = 0;
  private reachedTerminal = false;
  private velocityHistory: number[] = [];
  private showVelocityGraph = true;

  // Twist simulation (cat vs human)
  private catY = 30;
  private humanY = 30;
  private antY = 30;
  private isTwistDropping = false;

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
    hook: 'Why do skydivers stop accelerating, even though gravity never stops pulling?',
    predict: 'At terminal velocity, what happens to the forces?',
    play: 'Watch how different objects reach different terminal velocities!',
    review: 'Drag force increases with velocity squared - that\'s the key!',
    twist_predict: 'How does size affect survival from falls?',
    twist_play: 'Compare how an ant, cat, and human fall at different speeds.',
    twist_review: 'The square-cube law explains why small animals survive falls!',
    transfer: 'Terminal velocity affects everything from skydivers to raindrops.',
    test: 'Test your understanding of terminal velocity physics!',
    mastery: 'You now understand why skydivers stop accelerating!',
  };

  // PROTECTED: Physics constants
  private readonly GRAVITY = 9.8;      // m/s^2
  private readonly AIR_DENSITY = 1.2;  // kg/m^3

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
      message: 'Terminal Velocity lesson started',
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
      return;
    }

    // Object selection
    if (id.startsWith('object_')) {
      const objIndex = parseInt(id.replace('object_', ''), 10);
      this.selectedObject = objIndex;
      this.resetSimulation();
      return;
    }

    // Simulation controls
    if (id === 'drop') {
      this.startDrop();
      return;
    }
    if (id === 'reset') {
      this.resetSimulation();
      return;
    }

    // Twist simulation
    if (id === 'twist_drop') {
      this.startTwistDrop();
      return;
    }
    if (id === 'twist_reset') {
      this.resetTwistSimulation();
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
    if (id === 'show_graph') {
      this.showVelocityGraph = value;
    }
    if (id === 'guided_mode') {
      this.guidedMode = value;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    // Could add adjustable parameters here
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
    if (newPhase === 'play') {
      this.resetSimulation();
    }
    if (newPhase === 'twist_play') {
      this.resetTwistSimulation();
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

  // === PROTECTED PHYSICS SIMULATION ===

  /**
   * PROTECTED: Main physics update loop
   *
   * Implements:
   * - Drag force: F_drag = 0.5 * rho * Cd * A * v^2
   * - Net force: F_net = mg - F_drag
   * - Acceleration: a = F_net / m
   * - Velocity update: v_new = v + a * dt
   */
  update(deltaTime: number): void {
    // Main simulation update
    if (this.isDropping && (this.phase === 'play' || this.phase === 'twist_play')) {
      this.updateFallingObject(deltaTime);
    }

    // Twist simulation update
    if (this.isTwistDropping && this.phase === 'twist_play') {
      this.updateTwistSimulation(deltaTime);
    }
  }

  /**
   * PROTECTED PHYSICS: Calculate drag force and update velocity
   */
  private updateFallingObject(deltaTime: number): void {
    const dt = deltaTime / 1000;  // Convert to seconds
    const obj = fallingObjects[this.selectedObject];

    // PROTECTED FORMULA: Drag force
    // F_drag = 0.5 * rho * v^2 * Cd * A
    const dragForce = 0.5 * this.AIR_DENSITY *
                      this.objectVelocity * this.objectVelocity *
                      obj.dragCoeff * obj.area;

    // Gravity force
    const gravityForce = obj.mass * this.GRAVITY;

    // Net force (down is positive)
    const netForce = gravityForce - dragForce;

    // Acceleration from Newton's second law
    const acceleration = netForce / obj.mass;

    // Update velocity
    this.objectVelocity += acceleration * dt;
    this.timeElapsed += dt;

    // Track velocity history for graph
    this.velocityHistory.push(this.objectVelocity);
    if (this.velocityHistory.length > 100) {
      this.velocityHistory.shift();
    }

    // Check if terminal velocity reached (within 5%)
    if (Math.abs(this.objectVelocity - obj.terminalV) < obj.terminalV * 0.05) {
      this.reachedTerminal = true;
    }

    // Update screen position (scaled for display)
    this.objectY += this.objectVelocity * dt * 6;  // Scale factor for visualization

    // Check if hit ground
    if (this.objectY >= 280) {
      this.objectY = 280;
      this.isDropping = false;
    }
  }

  /**
   * PROTECTED PHYSICS: Twist simulation - comparing terminal velocities
   * Demonstrates square-cube law effect
   */
  private updateTwistSimulation(deltaTime: number): void {
    const dt = deltaTime / 1000;

    // Each creature has different terminal velocity due to area-to-mass ratio
    // Ant: very high area/mass -> very low terminal V (~0.5 m/s)
    // Cat: moderate area/mass -> medium terminal V (~27 m/s)
    // Human: low area/mass -> high terminal V (~55 m/s)

    // Simplified simulation - accelerate towards terminal velocity
    const antTerminalV = 2;    // Scaled for display
    const catTerminalV = 8;
    const humanTerminalV = 15;

    // Ant velocity (approaches terminal very quickly)
    const antV = Math.min(antTerminalV, antTerminalV * (1 - Math.exp(-this.timeElapsed * 5)));
    // Cat velocity
    const catV = Math.min(catTerminalV, catTerminalV * (1 - Math.exp(-this.timeElapsed * 2)));
    // Human velocity
    const humanV = Math.min(humanTerminalV, humanTerminalV * (1 - Math.exp(-this.timeElapsed * 1.5)));

    this.antY += antV * dt * 10;
    this.catY += catV * dt * 10;
    this.humanY += humanV * dt * 10;

    this.timeElapsed += dt;

    // Check if all hit ground
    if (this.humanY >= 200) {
      this.antY = Math.min(this.antY, 200);
      this.catY = Math.min(this.catY, 200);
      this.humanY = 200;
      this.isTwistDropping = false;
    }
  }

  private startDrop(): void {
    this.objectY = 40;
    this.objectVelocity = 0;
    this.velocityHistory = [];
    this.timeElapsed = 0;
    this.reachedTerminal = false;
    this.isDropping = true;
  }

  private resetSimulation(): void {
    this.isDropping = false;
    this.objectY = 40;
    this.objectVelocity = 0;
    this.velocityHistory = [];
    this.timeElapsed = 0;
    this.reachedTerminal = false;
  }

  private startTwistDrop(): void {
    this.catY = 30;
    this.humanY = 30;
    this.antY = 30;
    this.timeElapsed = 0;
    this.isTwistDropping = true;
  }

  private resetTwistSimulation(): void {
    this.isTwistDropping = false;
    this.catY = 30;
    this.humanY = 30;
    this.antY = 30;
    this.timeElapsed = 0;
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

  private renderHook(r: CommandRenderer): void {
    // Title
    r.text(350, 50, 'The Speed Limit of Falling', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 80, 'Why do skydivers stop accelerating?', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    // Sky background
    r.rect(100, 110, 500, 180, {
      fill: '#1e3a5f',
      rx: 12,
    });

    // Clouds
    r.ellipse(180, 140, 45, 18, { fill: '#ffffff', opacity: 0.3 });
    r.ellipse(420, 155, 55, 22, { fill: '#ffffff', opacity: 0.25 });

    // Airplane
    r.ellipse(200, 160, 30, 8, { fill: '#64748b' });
    r.polygon([{ x: 185, y: 152 }, { x: 185, y: 168 }, { x: 165, y: 175 }], { fill: '#475569' });

    // Skydiver
    r.ellipse(350, 210, 20, 10, { fill: colors.accent });
    r.circle(350, 195, 10, { fill: '#fcd9b6' });
    r.line(330, 210, 305, 202, { stroke: colors.accent, strokeWidth: 5 });
    r.line(370, 210, 395, 202, { stroke: colors.accent, strokeWidth: 5 });

    // Speed indicator box
    r.rect(450, 180, 85, 55, {
      fill: 'rgba(15,23,42,0.8)',
      stroke: 'rgba(251,191,36,0.3)',
      rx: 8,
    });
    r.text(492, 202, 'SPEED', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
    r.text(492, 225, '120 mph', { fill: colors.primary, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Question
    r.text(350, 310, "Why doesn't the speed keep increasing?", {
      fill: colors.warning,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', {
      fill: colors.primary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 85, 'At terminal velocity, what is the relationship between', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 105, 'GRAVITY and AIR RESISTANCE (drag)?', {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Force arrows visualization
    r.text(250, 145, 'Gravity', { fill: colors.forceGravity, fontSize: 12, textAnchor: 'middle' });
    r.line(250, 155, 250, 190, { stroke: colors.forceGravity, strokeWidth: 3 });
    r.polygon([
      { x: 250, y: 195 },
      { x: 245, y: 185 },
      { x: 255, y: 185 },
    ], { fill: colors.forceGravity });

    r.text(450, 145, 'Drag', { fill: colors.forceDrag, fontSize: 12, textAnchor: 'middle' });
    r.line(450, 190, 450, 155, { stroke: colors.forceDrag, strokeWidth: 3 });
    r.polygon([
      { x: 450, y: 150 },
      { x: 445, y: 160 },
      { x: 455, y: 160 },
    ], { fill: colors.forceDrag });

    // Feedback if prediction made
    if (this.prediction) {
      const isCorrect = this.prediction === 'C';
      r.rect(100, 220, 500, 80, {
        fill: isCorrect ? '#064e3b' : '#7f1d1d',
        rx: 12,
      });
      r.text(350, 250, isCorrect ? 'Correct!' : 'Not quite!', {
        fill: isCorrect ? colors.success : colors.warning,
        fontSize: 18,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
      r.text(350, 275, 'At terminal velocity, drag force equals gravity!', {
        fill: colors.textSecondary,
        fontSize: 12,
        textAnchor: 'middle',
      });
      r.text(350, 290, 'Net force = 0, so acceleration = 0. Constant speed!', {
        fill: colors.textSecondary,
        fontSize: 12,
        textAnchor: 'middle',
      });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    const obj = fallingObjects[this.selectedObject];

    // Title
    r.text(200, 25, 'Terminal Velocity Simulator', {
      fill: colors.primary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Drop zone - sky gradient
    r.rect(50, 40, 300, 260, {
      fill: '#0c4a6e',
      rx: 12,
    });

    // Altitude markers
    for (let y = 80; y <= 260; y += 40) {
      r.line(55, y, 70, y, { stroke: '#ffffff', strokeWidth: 1, opacity: 0.3 });
      const altitude = Math.round((280 - y) * 50);
      r.text(75, y + 4, `${altitude}ft`, { fill: '#ffffff', fontSize: 8, opacity: 0.3 });
    }

    // Ground
    r.rect(50, 280, 300, 20, { fill: colors.ground, rx: 0 });
    r.line(50, 280, 350, 280, { stroke: '#1a3a15', strokeWidth: 2 });

    // Falling object
    this.renderFallingObject(r, 200, this.objectY, this.selectedObject);

    // Force vectors (only when dropping)
    if (this.isDropping && this.objectY < 270) {
      // Gravity arrow (red, down)
      r.line(200, this.objectY + 20, 200, this.objectY + 50, { stroke: colors.forceGravity, strokeWidth: 3 });
      r.polygon([
        { x: 200, y: this.objectY + 55 },
        { x: 196, y: this.objectY + 45 },
        { x: 204, y: this.objectY + 45 },
      ], { fill: colors.forceGravity });

      // Drag arrow (green, up) - scales with velocity
      if (this.objectVelocity > 0.5) {
        const dragScale = Math.min(this.objectVelocity / obj.terminalV * 30, 30);
        r.line(200, this.objectY - 20, 200, this.objectY - 20 - dragScale, { stroke: colors.forceDrag, strokeWidth: 3 });
        r.polygon([
          { x: 200, y: this.objectY - 25 - dragScale },
          { x: 196, y: this.objectY - 15 - dragScale },
          { x: 204, y: this.objectY - 15 - dragScale },
        ], { fill: colors.forceDrag });
      }
    }

    // Terminal velocity indicator
    if (this.reachedTerminal) {
      r.text(200, 55, 'TERMINAL VELOCITY!', {
        fill: colors.success,
        fontSize: 12,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
    }

    // Velocity graph panel
    if (this.showVelocityGraph) {
      r.rect(380, 40, 280, 180, {
        fill: colors.bgCard,
        stroke: colors.border,
        rx: 12,
      });
      r.text(520, 60, 'Velocity vs Time', { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });

      // Axes
      r.line(410, 65, 410, 200, { stroke: colors.border, strokeWidth: 1 });
      r.line(410, 200, 640, 200, { stroke: colors.border, strokeWidth: 1 });
      r.text(395, 130, 'v', { fill: colors.textMuted, fontSize: 10 });
      r.text(525, 215, 'time', { fill: colors.textMuted, fontSize: 10 });

      // Terminal velocity line
      const vtY = 200 - (obj.terminalV / 80) * 130;
      r.line(410, vtY, 640, vtY, { stroke: colors.accent, strokeWidth: 1, strokeDasharray: '4,4' });
      r.text(645, vtY + 4, 'Vt', { fill: colors.accent, fontSize: 10 });

      // Velocity curve
      if (this.velocityHistory.length > 1) {
        const points = this.velocityHistory.map((v, i) => ({
          x: 410 + (i / 100) * 230,
          y: 200 - (v / 80) * 130,
        }));
        r.polyline(points, { stroke: colors.success, strokeWidth: 2, fill: 'none' });
      }
    }

    // Stats panel
    r.rect(380, 230, 280, 70, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });

    // Stats row
    const stats = [
      { label: 'm/s', value: this.objectVelocity.toFixed(1), color: colors.primary },
      { label: 'Terminal V', value: obj.terminalV.toString(), color: colors.accent },
      { label: '% of Terminal', value: `${(this.objectVelocity / obj.terminalV * 100).toFixed(0)}%`, color: colors.success },
      { label: 'Time', value: `${this.timeElapsed.toFixed(1)}s`, color: '#06b6d4' },
    ];

    stats.forEach((stat, i) => {
      const x = 400 + i * 70;
      r.text(x + 30, 255, stat.value, { fill: stat.color, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x + 30, 275, stat.label, { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
    });
  }

  private renderFallingObject(r: CommandRenderer, cx: number, cy: number, objectIndex: number): void {
    const obj = fallingObjects[objectIndex];

    switch (objectIndex) {
      case 0: // Coffee filter
        r.ellipse(cx, cy, 20, 8, { fill: obj.color, stroke: '#aaa', strokeWidth: 1 });
        break;
      case 1: // Tennis ball
        r.circle(cx, cy, 12, { fill: obj.color });
        r.path(`M${cx - 8} ${cy - 8} Q${cx} ${cy - 2} ${cx + 8} ${cy - 8}`, { stroke: '#ffffff', strokeWidth: 2, fill: 'none' });
        r.path(`M${cx - 8} ${cy + 8} Q${cx} ${cy + 2} ${cx + 8} ${cy + 8}`, { stroke: '#ffffff', strokeWidth: 2, fill: 'none' });
        break;
      case 2: // Baseball
        r.circle(cx, cy, 12, { fill: obj.color });
        r.path(`M${cx - 8} ${cy - 5} Q${cx - 3} ${cy} ${cx - 8} ${cy + 5}`, { stroke: '#ff0000', strokeWidth: 1.5, fill: 'none' });
        r.path(`M${cx + 8} ${cy - 5} Q${cx + 3} ${cy} ${cx + 8} ${cy + 5}`, { stroke: '#ff0000', strokeWidth: 1.5, fill: 'none' });
        break;
      case 3: // Bowling ball
        r.circle(cx, cy, 15, { fill: obj.color });
        r.circle(cx - 5, cy - 5, 2, { fill: '#333' });
        r.circle(cx + 3, cy - 6, 2, { fill: '#333' });
        r.circle(cx, cy, 2, { fill: '#333' });
        break;
    }
  }

  private renderReview(r: CommandRenderer): void {
    r.text(350, 40, 'The Physics of Terminal Velocity', {
      fill: colors.primary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Forces panel
    r.rect(50, 70, 280, 120, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });
    r.text(70, 95, 'Forces on a Falling Object', { fill: colors.forceGravity, fontSize: 14, fontWeight: 'bold' });

    // Force arrows
    r.text(120, 130, 'Gravity', { fill: colors.forceGravity, fontSize: 11 });
    r.text(120, 145, 'F = mg', { fill: colors.textMuted, fontSize: 10 });

    r.text(220, 130, 'vs', { fill: colors.textMuted, fontSize: 14 });

    r.text(270, 130, 'Drag', { fill: colors.forceDrag, fontSize: 11 });
    r.text(270, 145, 'F = 1/2 pv^2 CdA', { fill: colors.textMuted, fontSize: 9 });

    // Terminal velocity equation
    r.rect(370, 70, 280, 120, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });
    r.text(390, 95, 'Terminal Velocity Equation', { fill: colors.primary, fontSize: 14, fontWeight: 'bold' });

    r.rect(390, 110, 240, 35, { fill: colors.bgDark, rx: 6 });
    r.text(510, 133, 'Vt = sqrt(2mg / pCdA)', { fill: colors.primary, fontSize: 14, textAnchor: 'middle', fontFamily: 'monospace' });

    r.text(510, 165, 'When drag = gravity, solve for v!', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });

    // Different objects comparison
    r.rect(50, 200, 600, 100, {
      fill: `${colors.primary}20`,
      stroke: `${colors.primary}40`,
      rx: 12,
    });
    r.text(350, 225, 'Why Different Objects Have Different Terminal Velocities', {
      fill: colors.accent,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const comparisons = [
      { emoji: '(cup)', name: 'Coffee Filter', speed: '~1 m/s', note: 'Light + Large area' },
      { emoji: '(ball)', name: 'Tennis Ball', speed: '~20 m/s', note: 'Light + Small' },
      { emoji: '(person)', name: 'Skydiver', speed: '~55 m/s', note: 'Heavy + Large' },
      { emoji: '(heavy)', name: 'Bowling Ball', speed: '~77 m/s', note: 'Heavy + Small' },
    ];

    comparisons.forEach((item, i) => {
      const x = 80 + i * 150;
      r.text(x + 40, 255, item.name, { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
      r.text(x + 40, 270, item.speed, { fill: colors.primary, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x + 40, 285, item.note, { fill: colors.textMuted, fontSize: 8, textAnchor: 'middle' });
    });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist: Cats vs Humans', {
      fill: '#a855f7',
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Info box
    r.rect(100, 80, 500, 80, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });

    r.text(350, 105, "A cat's terminal velocity is about 60 mph.", { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.text(250, 105, '60 mph', { fill: colors.success, fontWeight: 'bold', fontSize: 14 });

    r.text(350, 130, "A human's terminal velocity is about 120 mph.", { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.text(265, 130, '120 mph', { fill: colors.danger, fontWeight: 'bold', fontSize: 14 });

    // Question
    r.text(350, 180, 'If a cat and human fall from a skyscraper,', {
      fill: '#a855f7',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 200, 'which is MORE likely to survive?', {
      fill: '#a855f7',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Feedback
    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'B';
      r.rect(100, 230, 500, 80, {
        fill: isCorrect ? '#064e3b' : '#4c1d95',
        rx: 12,
      });
      r.text(350, 255, isCorrect ? 'Exactly right!' : 'Surprising but true!', {
        fill: isCorrect ? colors.success : '#a855f7',
        fontSize: 16,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
      r.text(350, 280, 'Cats have survived falls from 32+ stories!', {
        fill: colors.textSecondary,
        fontSize: 12,
        textAnchor: 'middle',
      });
      r.text(350, 295, 'Low terminal velocity + spreading out + relaxing = survival', {
        fill: colors.textSecondary,
        fontSize: 11,
        textAnchor: 'middle',
      });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(350, 30, 'Size vs Terminal Velocity', {
      fill: '#a855f7',
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Sky area
    r.rect(100, 50, 500, 200, {
      fill: '#0c4a6e',
      rx: 12,
    });

    // Ground
    r.rect(100, 230, 500, 30, { fill: colors.ground });
    r.line(100, 230, 600, 230, { stroke: '#1a3a15', strokeWidth: 2 });

    // Labels
    r.text(180, 70, 'Ant', { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 70, 'Cat', { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });
    r.text(520, 70, 'Human', { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });

    // Ant (tiny dot)
    r.circle(180, 50 + this.antY, 3, { fill: '#333' });

    // Cat
    r.ellipse(350, 50 + this.catY, 15, 8, { fill: '#ff9933' });
    r.circle(338, 45 + this.catY, 6, { fill: '#ff9933' });

    // Human
    r.ellipse(520, 50 + this.humanY, 15, 8, { fill: colors.accent });
    r.circle(520, 38 + this.humanY, 8, { fill: '#fcd9b6' });

    // Terminal velocity labels
    r.text(180, 250, '~0.5 m/s', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(350, 250, '~27 m/s', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(520, 250, '~55 m/s', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    r.text(350, 320, 'Watch how size affects terminal velocity and survival!', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(350, 40, 'The Square-Cube Law', {
      fill: '#a855f7',
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 70, 'Why Smaller Animals Have Lower Terminal Velocity', {
      fill: '#ec4899',
      fontSize: 16,
      textAnchor: 'middle',
    });

    // Two boxes side by side
    r.rect(80, 100, 250, 100, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });
    r.text(100, 125, 'Surface Area', { fill: colors.warning, fontSize: 14, fontWeight: 'bold' });
    r.text(100, 145, 'Scales with size^2', { fill: colors.textSecondary, fontSize: 12 });
    r.text(100, 165, '2x bigger -> 4x area', { fill: colors.textMuted, fontSize: 11 });

    r.rect(370, 100, 250, 100, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });
    r.text(390, 125, 'Mass (Volume)', { fill: colors.danger, fontSize: 14, fontWeight: 'bold' });
    r.text(390, 145, 'Scales with size^3', { fill: colors.textSecondary, fontSize: 12 });
    r.text(390, 165, '2x bigger -> 8x mass', { fill: colors.textMuted, fontSize: 11 });

    // Explanation
    r.rect(80, 210, 540, 90, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });
    r.text(350, 235, 'As animals get smaller, their area-to-mass ratio increases.', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 255, 'More area relative to weight = more drag relative to gravity', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 275, '= SLOWER TERMINAL VELOCITY', {
      fill: colors.success,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Quote
    r.text(350, 315, '"An ant can\'t be hurt by falling at any height!"', {
      fill: colors.primary,
      fontSize: 13,
      textAnchor: 'middle',
    });
  }

  private renderTransfer(r: CommandRenderer): void {
    const apps = [
      { title: 'Skydiving', color: '#ea580c' },
      { title: 'Parachutes', color: '#0ea5e9' },
      { title: 'Hailstones', color: '#64748b' },
      { title: 'Raindrops', color: '#3b82f6' },
    ];

    r.text(350, 40, 'Real-World Applications', {
      fill: colors.success,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // App content based on selection
    const descriptions = [
      'Skydivers use body position to control terminal velocity (120-200 mph). Wingsuits increase surface area dramatically, reducing terminal velocity to ~60 mph for horizontal flight.',
      'Parachutes dramatically increase surface area, reducing terminal velocity from ~55 m/s to ~5 m/s (safe landing speed). The large canopy creates enough drag to balance gravity.',
      'Hailstones of different sizes fall at different terminal velocities. A golf-ball sized hailstone can reach 100+ mph - fast enough to dent cars and break windows!',
      'Raindrops reach terminal velocity of only 5-10 m/s due to their small size and air resistance. Without air, rain would hit the ground at ~500 m/s and be lethal!',
    ];

    // Selected app content
    r.rect(80, 90, 540, 180, {
      fill: colors.bgCard,
      stroke: apps[this.selectedApp].color,
      rx: 12,
    });

    r.text(350, 125, apps[this.selectedApp].title, {
      fill: apps[this.selectedApp].color,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Word wrap the description
    const desc = descriptions[this.selectedApp];
    const words = desc.split(' ');
    let lines: string[] = [];
    let currentLine = '';
    words.forEach(word => {
      if ((currentLine + ' ' + word).length > 70) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      }
    });
    if (currentLine) lines.push(currentLine);

    lines.forEach((line, i) => {
      r.text(350, 160 + i * 20, line, {
        fill: colors.textSecondary,
        fontSize: 12,
        textAnchor: 'middle',
      });
    });

    // Completed count
    const completedCount = this.completedApps.filter(c => c).length;
    r.text(350, 290, `Explored: ${completedCount} / ${apps.length}`, {
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

    // Question text - word wrap if needed
    const questionWords = q.question.split(' ');
    let qLines: string[] = [];
    let qCurrentLine = '';
    questionWords.forEach(word => {
      if ((qCurrentLine + ' ' + word).length > 60) {
        qLines.push(qCurrentLine);
        qCurrentLine = word;
      } else {
        qCurrentLine = qCurrentLine ? qCurrentLine + ' ' + word : word;
      }
    });
    if (qCurrentLine) qLines.push(qCurrentLine);

    qLines.forEach((line, i) => {
      r.text(350, 65 + i * 20, line, {
        fill: colors.textPrimary,
        fontSize: 15,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
    });

    // Answer options
    const optionStartY = 110 + (qLines.length - 1) * 10;
    q.options.forEach((option, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;

      r.rect(100, optionStartY + i * 50, 500, 40, {
        fill: isSelected ? `${colors.primary}40` : colors.bgCard,
        stroke: isSelected ? colors.primary : colors.border,
        rx: 8,
        id: `answer_${i}`,
      });
      r.text(350, optionStartY + 25 + i * 50, option, {
        fill: isSelected ? colors.primary : colors.textSecondary,
        fontSize: 13,
        textAnchor: 'middle',
      });
    });
  }

  private renderTestResults(r: CommandRenderer): void {
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

    r.text(350, 200, passed ? "You've mastered terminal velocity!" : 'Review the concepts and try again.', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });
  }

  private renderMastery(r: CommandRenderer): void {
    // Cloud emoji representation
    r.text(350, 80, '(cloud)', { fill: colors.textMuted, fontSize: 48, textAnchor: 'middle' });

    r.text(350, 150, 'Terminal Velocity Master!', {
      fill: colors.primary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(150, 180, 400, 130, {
      fill: `${colors.primary}20`,
      stroke: `${colors.primary}40`,
      rx: 12,
    });

    r.text(350, 205, "You've mastered the physics of terminal velocity!", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const achievements = [
      'Terminal velocity = when drag equals gravity',
      'Different objects have different terminal velocities',
      'Square-cube law explains why small animals survive falls',
      'Parachutes dramatically increase drag area',
    ];

    achievements.forEach((text, i) => {
      r.text(180, 235 + i * 18, '> ' + text, {
        fill: colors.textSecondary,
        fontSize: 11,
      });
    });

    r.text(350, 330, 'Now you understand why skydivers stop accelerating!', {
      fill: colors.primary,
      fontSize: 13,
      textAnchor: 'middle',
    });
  }

  // --- UI RENDERING ---

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

    // Back button (always except first phase)
    if (idx > 0) {
      r.addButton({ id: 'back', label: '<- Back', variant: 'secondary' });
    }

    // Phase-specific controls
    switch (this.phase) {
      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A: Gravity > Drag', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B: Drag > Gravity', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C: Gravity = Drag', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D: Both become zero', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'See It In Action ->', variant: 'success' });
        }
        break;

      case 'play':
        // Object selection buttons
        fallingObjects.forEach((obj, i) => {
          r.addButton({
            id: `object_${i}`,
            label: `${obj.emoji} ${obj.name}`,
            variant: this.selectedObject === i ? 'primary' : 'secondary',
          });
        });
        r.addButton({ id: 'drop', label: this.isDropping ? 'Falling...' : 'Drop!', variant: 'success', disabled: this.isDropping });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
        r.addToggle({ id: 'show_graph', label: 'Graph', value: this.showVelocityGraph });
        r.addButton({ id: 'next', label: 'Review Physics ->', variant: 'primary' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A: Human - bigger body', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B: Cat - lower terminal V', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C: Same chance', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D: Neither survives', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See the Physics ->', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addButton({ id: 'twist_drop', label: this.isTwistDropping ? 'Falling...' : 'Drop All Three!', variant: 'primary', disabled: this.isTwistDropping });
        r.addButton({ id: 'twist_reset', label: 'Reset', variant: 'secondary' });
        r.addButton({ id: 'next', label: 'Understand Why ->', variant: 'success' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Skydiving', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Parachutes', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Hailstones', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Raindrops', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.filter(c => c).length >= 3) {
          r.addButton({ id: 'next', label: 'Take the Quiz ->', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: '<- Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next ->', variant: 'ghost', disabled: this.testQuestion >= testQuestions.length - 1 });
          if (this.testAnswers.every(a => a !== null)) {
            r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
          }
        } else {
          const score = this.calculateTestScore();
          if (score >= 7) {
            r.addButton({ id: 'next', label: 'Claim Your Badge! ->', variant: 'success' });
          } else {
            r.addButton({ id: 'back', label: '<- Review', variant: 'secondary' });
          }
        }
        break;

      default:
        r.addButton({ id: 'next', label: 'Continue ->', variant: 'primary' });
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
      selectedObject: this.selectedObject,
      objectY: this.objectY,
      objectVelocity: this.objectVelocity,
      isDropping: this.isDropping,
      timeElapsed: this.timeElapsed,
      reachedTerminal: this.reachedTerminal,
      showVelocityGraph: this.showVelocityGraph,
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
    this.selectedObject = (state.selectedObject as number) || 0;
    this.objectY = (state.objectY as number) || 40;
    this.objectVelocity = (state.objectVelocity as number) || 0;
    this.isDropping = (state.isDropping as boolean) || false;
    this.timeElapsed = (state.timeElapsed as number) || 0;
    this.reachedTerminal = (state.reachedTerminal as boolean) || false;
    this.showVelocityGraph = state.showVelocityGraph !== undefined ? (state.showVelocityGraph as boolean) : true;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = state.guidedMode !== undefined ? (state.guidedMode as boolean) : true;
  }
}

// === FACTORY FUNCTION ===
// Register this in server.ts: registry.register('terminal_velocity', createTerminalVelocityGame);

export function createTerminalVelocityGame(sessionId: string): TerminalVelocityGame {
  return new TerminalVelocityGame(sessionId);
}
