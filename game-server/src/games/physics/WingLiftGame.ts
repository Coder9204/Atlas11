/**
 * Wing Lift Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP - Physics Formulas:
 * - Lift force: L = 0.5 * rho * v^2 * Cl * A
 *   where rho = air density, v = velocity, Cl = lift coefficient, A = wing area
 * - Lift coefficient vs angle of attack (simplified model)
 * - Stall condition: angle > critical angle (~15 degrees)
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
    question: 'The lift equation L = 0.5 * rho * v^2 * Cl * A shows lift is proportional to:',
    options: [
      'Velocity',
      'Velocity squared',
      'Velocity cubed',
      'Square root of velocity',
    ],
    correctIndex: 1,
  },
  {
    question: 'What happens to lift when airspeed doubles?',
    options: [
      'Lift doubles',
      'Lift quadruples (4x)',
      'Lift halves',
      'Lift stays the same',
    ],
    correctIndex: 1,
  },
  {
    question: 'What is stall in aerodynamics?',
    options: [
      'The engine stops',
      'Airflow separates from wing, lift drops suddenly',
      'The plane slows down',
      'The wings break',
    ],
    correctIndex: 1,
  },
  {
    question: 'At what approximate angle of attack does stall typically occur?',
    options: [
      '5 degrees',
      '15-20 degrees',
      '45 degrees',
      '90 degrees',
    ],
    correctIndex: 1,
  },
  {
    question: 'The lift coefficient (Cl) depends primarily on:',
    options: [
      'Engine power',
      'Angle of attack and wing shape',
      'Fuel weight',
      'Altitude only',
    ],
    correctIndex: 1,
  },
  {
    question: 'Why do planes need higher speed to take off at high altitude?',
    options: [
      'Engines are less powerful',
      'Air density (rho) is lower, reducing lift',
      'Runways are shorter',
      'Pilots are more careful',
    ],
    correctIndex: 1,
  },
  {
    question: 'Increasing wing area (A) will:',
    options: [
      'Decrease lift proportionally',
      'Increase lift proportionally',
      'Not affect lift',
      'Only affect drag',
    ],
    correctIndex: 1,
  },
  {
    question: 'Flaps on a wing primarily work by:',
    options: [
      'Reducing drag',
      'Increasing effective wing area and camber, boosting Cl',
      'Making the engine more powerful',
      'Reducing weight',
    ],
    correctIndex: 1,
  },
  {
    question: 'Birds soar using thermal updrafts. This is possible because:',
    options: [
      'They weigh nothing',
      'The rising air provides upward force equal to their weight',
      'They flap constantly',
      'They have jet engines',
    ],
    correctIndex: 1,
  },
  {
    question: 'At cruise altitude, lift must equal:',
    options: [
      'Thrust',
      'Drag',
      'Weight',
      'Speed',
    ],
    correctIndex: 2,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#0ea5e9', // Sky blue
  primaryDark: '#0284c7',
  accent: '#f97316', // Orange
  accentDark: '#ea580c',
  lift: '#22c55e', // Green for lift
  drag: '#ef4444', // Red for drag
  stall: '#ef4444',
  airflow: '#06b6d4', // Cyan for airflow
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

export class WingLiftGame extends BaseGame {
  readonly gameType = 'wing_lift';
  readonly gameTitle = 'Wing Lift & Flight';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state (PROTECTED - server only)
  private time = 0;
  private isSimulating = false;

  // Flight parameters
  private angleOfAttack = 5; // degrees
  private airspeed = 50; // m/s
  private altitude = 0; // meters (affects air density)

  // Physical constants (PROTECTED)
  private readonly seaLevelDensity = 1.225; // kg/m^3
  private readonly wingArea = 20; // m^2
  private readonly weight = 10000; // N

  // Calculated values (PROTECTED - computed on server)
  private airDensity = 1.225;
  private liftCoefficient = 0;
  private liftForce = 0;
  private isStalled = false;

  // Animation state
  private animationPhase = 0;
  private showLabels = true;
  private showAirflow = true;

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
    twist_play: 'Stall Zone',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'How do heavy metal planes stay up in the air?',
    predict: 'What happens to lift when you increase speed?',
    play: 'Adjust angle and speed to see how lift changes!',
    review: 'The lift equation reveals the secrets of flight.',
    twist_predict: 'Is more angle always better for lift?',
    twist_play: 'Explore the stall zone - what happens at high angles?',
    twist_review: 'Stall is critical knowledge for pilots!',
    transfer: 'From birds to airliners, the same physics applies.',
    test: 'Test your understanding of aerodynamic lift!',
    mastery: 'You understand how wings generate lift!',
  };

  constructor(sessionId: string) {
    super(sessionId);
    this.calculateLift();
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
      message: 'Wing Lift lesson started',
    });
  }

  // === PROTECTED PHYSICS CALCULATIONS ===

  /**
   * PROTECTED: Calculate lift coefficient based on angle of attack
   * Simplified model with stall behavior
   */
  private calculateLiftCoefficient(angle: number): number {
    if (angle < 0) {
      // Negative angle: negative lift (roughly proportional)
      return angle * 0.05;
    }
    if (angle <= 15) {
      // Linear region: Cl increases with angle
      return angle * 0.1;
    }
    // Post-stall: Cl drops dramatically
    return 1.5 - (angle - 15) * 0.15;
  }

  /**
   * PROTECTED: Calculate air density at altitude
   * Simplified exponential atmosphere model
   */
  private calculateAirDensity(alt: number): number {
    // rho = rho_0 * exp(-alt / H) where H ~ 8500m
    return this.seaLevelDensity * Math.exp(-alt / 8500);
  }

  /**
   * PROTECTED: Calculate lift force
   * L = 0.5 * rho * v^2 * Cl * A
   */
  private calculateLift(): void {
    this.airDensity = this.calculateAirDensity(this.altitude);
    this.liftCoefficient = this.calculateLiftCoefficient(this.angleOfAttack);
    this.isStalled = this.angleOfAttack > 15;

    // Lift equation: L = 0.5 * rho * v^2 * Cl * A
    this.liftForce = 0.5 * this.airDensity * Math.pow(this.airspeed, 2) * this.liftCoefficient * this.wingArea;

    // Clamp to reasonable values
    this.liftForce = clamp(this.liftForce, -50000, 100000);
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
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'labels') {
      this.showLabels = value;
      return;
    }
    if (id === 'airflow') {
      this.showAirflow = value;
      return;
    }
    if (id === 'guided_mode') {
      this.guidedMode = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'angle') {
      this.angleOfAttack = clamp(value, -5, 25);
      this.calculateLift();
      this.emitCoachEvent('value_changed', {
        angle: this.angleOfAttack,
        lift: this.liftForce,
        stalled: this.isStalled,
      });
      return;
    }
    if (id === 'speed') {
      this.airspeed = clamp(value, 10, 150);
      this.calculateLift();
      this.emitCoachEvent('value_changed', { speed: this.airspeed, lift: this.liftForce });
      return;
    }
    if (id === 'altitude') {
      this.altitude = clamp(value, 0, 12000);
      this.calculateLift();
      this.emitCoachEvent('value_changed', { altitude: this.altitude, density: this.airDensity });
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
      hook: 'Air flowing over a curved wing creates a pressure difference.',
      predict: 'Think about the v^2 term in the lift equation.',
      play: 'Watch how both speed and angle affect the lift force.',
      review: 'L = 0.5 * rho * v^2 * Cl * A - each term matters!',
      twist_predict: 'There is a limit to how much angle helps.',
      twist_play: 'At high angles, the airflow separates from the wing.',
      twist_review: 'Stall recovery requires reducing angle and increasing speed.',
      transfer: 'Every flying creature and machine uses these principles.',
      test: 'Remember: lift scales with v^2 and depends on Cl.',
      mastery: 'You now understand aerodynamic lift!',
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

  update(deltaTime: number): void {
    if (!this.isSimulating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play') return;

    this.time += deltaTime / 1000;
    this.animationPhase += deltaTime * 0.01;
    if (this.animationPhase > 2 * Math.PI) {
      this.animationPhase -= 2 * Math.PI;
    }
  }

  private resetSimulation(): void {
    this.time = 0;
    this.animationPhase = 0;
    this.isSimulating = false;
    this.angleOfAttack = 5;
    this.airspeed = 50;
    this.altitude = 0;
    this.calculateLift();
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
    // Sky gradient background
    r.linearGradient('skyGrad', [
      { offset: '0%', color: '#0ea5e9' },
      { offset: '100%', color: '#0f172a' },
    ]);
    r.clear(colors.bgDark);
  }

  private renderHook(r: CommandRenderer): void {
    r.text(350, 60, 'Wing Lift & Flight', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 95, 'How do wings lift heavy planes into the sky?', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    // Wing illustration
    this.renderWingDemo(r, 350, 200);

    r.text(350, 320, 'The answer is in the shape and the flow!', {
      fill: colors.primary,
      fontSize: 14,
      textAnchor: 'middle',
    });
  }

  private renderWingDemo(r: CommandRenderer, cx: number, cy: number): void {
    // Wing cross-section (airfoil)
    r.rect(cx - 100, cy - 30, 200, 60, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 10,
    });

    // Simplified airfoil shape
    const wingPath = `M ${cx - 80} ${cy} Q ${cx - 40} ${cy - 25} ${cx} ${cy - 20} Q ${cx + 40} ${cy - 15} ${cx + 80} ${cy} Q ${cx + 40} ${cy + 5} ${cx} ${cy + 5} Q ${cx - 40} ${cy + 5} ${cx - 80} ${cy} Z`;
    r.path(wingPath, {
      fill: colors.bgCardLight,
      stroke: colors.textSecondary,
      strokeWidth: 2,
    });

    // Airflow arrows
    for (let i = 0; i < 5; i++) {
      const startX = cx - 120;
      const y = cy - 40 + i * 20;
      r.line(startX, y, startX + 40, y, {
        stroke: colors.airflow,
        strokeWidth: 2,
      });
      // Arrow head
      r.line(startX + 35, y - 5, startX + 40, y, { stroke: colors.airflow, strokeWidth: 2 });
      r.line(startX + 35, y + 5, startX + 40, y, { stroke: colors.airflow, strokeWidth: 2 });
    }

    // Lift arrow
    r.line(cx, cy - 30, cx, cy - 70, {
      stroke: colors.lift,
      strokeWidth: 3,
    });
    r.text(cx + 15, cy - 60, 'LIFT', {
      fill: colors.lift,
      fontSize: 12,
      fontWeight: 'bold',
    });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 90, 'A plane is flying at 100 m/s and generating 10,000 N of lift.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 115, 'If the plane doubles its speed to 200 m/s, what happens to lift?', {
      fill: colors.accent,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Visual
    r.rect(150, 150, 400, 100, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });

    r.text(250, 200, '100 m/s', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });
    r.text(350, 200, '->', {
      fill: colors.textMuted,
      fontSize: 24,
      textAnchor: 'middle',
    });
    r.text(450, 200, '200 m/s', {
      fill: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 230, 'Lift = ?', {
      fill: colors.accent,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderPlay(r: CommandRenderer): void {
    const isTwist = this.phase === 'twist_play';

    // Wing visualization with current angle
    this.renderWingVisualization(r, 350, 160);

    // Force vectors
    this.renderForceVectors(r, 350, 160);

    // Stats panel
    r.rect(500, 30, 180, 140, {
      fill: colors.bgCard + 'dd',
      stroke: this.isStalled ? colors.stall : colors.border,
      rx: 8,
    });

    r.text(510, 55, `Angle: ${this.angleOfAttack.toFixed(1)} deg`, {
      fill: this.isStalled ? colors.stall : colors.textSecondary,
      fontSize: 12,
    });

    r.text(510, 75, `Speed: ${this.airspeed.toFixed(0)} m/s`, {
      fill: colors.primary,
      fontSize: 12,
    });

    r.text(510, 95, `Cl: ${this.liftCoefficient.toFixed(2)}`, {
      fill: colors.textSecondary,
      fontSize: 12,
    });

    r.text(510, 120, `Lift: ${(this.liftForce / 1000).toFixed(1)} kN`, {
      fill: colors.lift,
      fontSize: 16,
      fontWeight: 'bold',
    });

    r.text(510, 145, `Weight: ${(this.weight / 1000).toFixed(1)} kN`, {
      fill: colors.textMuted,
      fontSize: 12,
    });

    // Stall warning
    if (this.isStalled) {
      r.text(510, 165, 'STALL!', {
        fill: colors.stall,
        fontSize: 14,
        fontWeight: 'bold',
      });
    }

    // Lift vs Weight indicator
    const liftWeightRatio = this.liftForce / this.weight;
    r.text(350, 300, liftWeightRatio > 1 ? 'CLIMBING' : liftWeightRatio > 0.9 ? 'LEVEL' : 'DESCENDING', {
      fill: liftWeightRatio > 1 ? colors.success : liftWeightRatio > 0.9 ? colors.primary : colors.danger,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderWingVisualization(r: CommandRenderer, cx: number, cy: number): void {
    // Rotate wing based on angle of attack
    const angleRad = (this.angleOfAttack * Math.PI) / 180;
    const wingLength = 150;
    const wingThickness = 20;

    // Wing body (rotated rectangle approximation)
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);

    const points = [
      { x: -wingLength / 2, y: -wingThickness / 2 },
      { x: wingLength / 2, y: -wingThickness / 2 },
      { x: wingLength / 2, y: wingThickness / 2 },
      { x: -wingLength / 2, y: wingThickness / 2 },
    ];

    const transformedPoints = points.map((p) => ({
      x: cx + p.x * cosA - p.y * sinA,
      y: cy + p.x * sinA + p.y * cosA,
    }));

    const pathStr = `M ${transformedPoints[0].x} ${transformedPoints[0].y} L ${transformedPoints[1].x} ${transformedPoints[1].y} L ${transformedPoints[2].x} ${transformedPoints[2].y} L ${transformedPoints[3].x} ${transformedPoints[3].y} Z`;

    r.path(pathStr, {
      fill: this.isStalled ? colors.stall + '60' : colors.bgCardLight,
      stroke: this.isStalled ? colors.stall : colors.textSecondary,
      strokeWidth: 2,
    });

    // Airflow lines
    if (this.showAirflow) {
      for (let i = 0; i < 5; i++) {
        const startX = cx - 200;
        const y = cy - 60 + i * 30;

        if (this.isStalled && i < 3) {
          // Turbulent flow above wing when stalled
          const turbX = cx + Math.random() * 40;
          const turbY = cy - 40 - Math.random() * 20;
          r.circle(turbX, turbY, 5 + Math.random() * 5, {
            fill: colors.stall + '40',
          });
        } else {
          // Smooth flow lines
          const endX = cx + 100;
          const endY = y + (i < 2 ? -10 : i > 3 ? 10 : 0);
          r.line(startX, y, endX, endY, {
            stroke: colors.airflow,
            strokeWidth: 1,
            opacity: 0.6,
          });
        }
      }
    }
  }

  private renderForceVectors(r: CommandRenderer, cx: number, cy: number): void {
    // Lift vector (up)
    const liftMagnitude = clamp(this.liftForce / 500, 10, 80);
    r.line(cx, cy, cx, cy - liftMagnitude, {
      stroke: colors.lift,
      strokeWidth: 4,
    });
    // Arrow head
    r.line(cx - 8, cy - liftMagnitude + 10, cx, cy - liftMagnitude, { stroke: colors.lift, strokeWidth: 4 });
    r.line(cx + 8, cy - liftMagnitude + 10, cx, cy - liftMagnitude, { stroke: colors.lift, strokeWidth: 4 });

    if (this.showLabels) {
      r.text(cx + 15, cy - liftMagnitude / 2, 'L', {
        fill: colors.lift,
        fontSize: 14,
        fontWeight: 'bold',
      });
    }

    // Weight vector (down)
    const weightMagnitude = 40;
    r.line(cx, cy + 30, cx, cy + 30 + weightMagnitude, {
      stroke: colors.textMuted,
      strokeWidth: 3,
    });
    r.line(cx - 6, cy + 30 + weightMagnitude - 8, cx, cy + 30 + weightMagnitude, { stroke: colors.textMuted, strokeWidth: 3 });
    r.line(cx + 6, cy + 30 + weightMagnitude - 8, cx, cy + 30 + weightMagnitude, { stroke: colors.textMuted, strokeWidth: 3 });

    if (this.showLabels) {
      r.text(cx + 15, cy + 50, 'W', {
        fill: colors.textMuted,
        fontSize: 14,
      });
    }
  }

  private renderReview(r: CommandRenderer): void {
    const isMainReview = this.phase === 'review';

    r.text(350, 50, isMainReview ? 'The Lift Equation' : 'Understanding Stall', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (isMainReview) {
      const concepts = [
        { title: 'L = 0.5 * rho * v^2 * Cl * A', desc: 'The fundamental lift equation', color: colors.primary },
        { title: 'v^2 Effect', desc: 'Double speed = 4x lift!', color: colors.success },
        { title: 'Cl (Lift Coefficient)', desc: 'Depends on angle of attack and wing shape', color: colors.accent },
      ];

      concepts.forEach((c, i) => {
        r.rect(100, 90 + i * 75, 500, 60, {
          fill: colors.bgCard,
          stroke: c.color,
          rx: 12,
        });
        r.text(120, 115 + i * 75, c.title, {
          fill: c.color,
          fontSize: 14,
          fontWeight: 'bold',
        });
        r.text(120, 135 + i * 75, c.desc, {
          fill: colors.textSecondary,
          fontSize: 12,
        });
      });
    } else {
      const insights = [
        { title: 'Critical Angle (~15 deg)', desc: 'Beyond this, airflow separates from wing', color: colors.stall },
        { title: 'Lift Drops Suddenly', desc: 'Stall is dangerous - pilots must recover quickly', color: colors.warning },
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

      // Cl vs Angle graph
      this.renderClGraph(r, 350, 280);
    }
  }

  private renderClGraph(r: CommandRenderer, cx: number, cy: number): void {
    r.rect(cx - 100, cy - 30, 200, 60, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 8,
    });

    // Cl curve
    r.line(cx - 80, cy + 20, cx - 20, cy - 15, { stroke: colors.success, strokeWidth: 2 });
    r.line(cx - 20, cy - 15, cx, cy - 20, { stroke: colors.success, strokeWidth: 2 });
    r.line(cx, cy - 20, cx + 20, cy - 10, { stroke: colors.stall, strokeWidth: 2 });
    r.line(cx + 20, cy - 10, cx + 80, cy + 10, { stroke: colors.stall, strokeWidth: 2 });

    r.text(cx, cy + 25, 'Angle', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
    r.text(cx + 5, cy - 20, 'STALL', { fill: colors.stall, fontSize: 8 });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 50, 'The Stall Challenge', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 90, 'To get more lift, a pilot increases the angle of attack.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 115, 'What happens if the angle becomes too steep?', {
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

    r.text(350, 190, 'Angle: 5 deg -> 10 -> 15 -> 20+?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 220, 'What happens to lift?', {
      fill: colors.accent,
      fontSize: 14,
      textAnchor: 'middle',
    });
  }

  private renderTransfer(r: CommandRenderer): void {
    const apps = [
      { name: 'Aircraft', desc: 'Wings designed for optimal Cl at cruise speed' },
      { name: 'Birds', desc: 'Feathers adjust angle for different flight phases' },
      { name: 'Race Cars', desc: 'Inverted wings create downforce (negative lift)' },
      { name: 'Wind Turbines', desc: 'Blade angle optimized for energy extraction' },
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

      r.text(350, 200, passed ? 'You understand aerodynamic lift!' : 'Review the lift equation.', {
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

    r.text(350, 150, 'Aerodynamics Master!', {
      fill: colors.primary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 190, 'You understand how wings generate lift!', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: '(L)', label: 'Lift Equation' },
      { icon: '(v^2)', label: 'Speed Effect' },
      { icon: '(stall)', label: 'Stall Physics' },
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
          id: 'predict_double',
          label: 'Doubles (2x)',
          variant: this.prediction === 'double' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_quadruple',
          label: 'Quadruples (4x)',
          variant: this.prediction === 'quadruple' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_same',
          label: 'Stays same',
          variant: this.prediction === 'same' ? 'primary' : 'secondary',
        });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'See Result', variant: 'success' });
        }
        break;

      case 'play':
      case 'twist_play':
        r.addSlider({
          id: 'angle',
          label: 'Angle (deg)',
          value: this.angleOfAttack,
          min: -5,
          max: 25,
        });
        r.addSlider({
          id: 'speed',
          label: 'Speed (m/s)',
          value: this.airspeed,
          min: 10,
          max: 150,
        });
        r.addButton({
          id: this.isSimulating ? 'stop' : 'start',
          label: this.isSimulating ? 'Stop' : 'Animate',
          variant: 'primary',
        });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
        r.addToggle({ id: 'labels', label: 'Labels', value: this.showLabels });
        r.addToggle({ id: 'airflow', label: 'Airflow', value: this.showAirflow });
        if (this.time > 2 || this.isStalled) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'twist_predict':
        r.addButton({
          id: 'twist_more',
          label: 'More lift always',
          variant: this.twistPrediction === 'more' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_stall',
          label: 'Lift drops (stall)',
          variant: this.twistPrediction === 'stall' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_same',
          label: 'Lift stays same',
          variant: this.twistPrediction === 'same' ? 'primary' : 'secondary',
        });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Aircraft', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Birds', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Race Cars', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Turbines', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
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
      angleOfAttack: this.angleOfAttack,
      airspeed: this.airspeed,
      altitude: this.altitude,
      liftForce: this.liftForce,
      isStalled: this.isStalled,
      time: this.time,
      isSimulating: this.isSimulating,
      showLabels: this.showLabels,
      showAirflow: this.showAirflow,
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
    this.angleOfAttack = state.angleOfAttack || 5;
    this.airspeed = state.airspeed || 50;
    this.altitude = state.altitude || 0;
    this.time = state.time || 0;
    this.isSimulating = state.isSimulating || false;
    this.showLabels = state.showLabels ?? true;
    this.showAirflow = state.showAirflow ?? true;
    this.testQuestion = state.testQuestion || 0;
    this.testAnswers = state.testAnswers || Array(10).fill(null);
    this.testSubmitted = state.testSubmitted || false;
    this.selectedApp = state.selectedApp || 0;
    this.completedApps = state.completedApps || [false, false, false, false];
    this.guidedMode = state.guidedMode ?? true;
    this.calculateLift();
  }
}

// === FACTORY FUNCTION ===
export function createWingLiftGame(sessionId: string): WingLiftGame {
  return new WingLiftGame(sessionId);
}
