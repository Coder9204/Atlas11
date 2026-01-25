/**
 * Bernoulli's Principle Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Bernoulli equation: P + 0.5*rho*v^2 + rho*g*h = constant
 * - Lift calculations: L = 0.5*rho*v^2*A*C_L
 * - Magnus effect: F_M = S*omega x v (spinning ball deflection)
 * - Venturi effect: A1*v1 = A2*v2 (continuity)
 * - Pressure-velocity relationship calculations
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
    question: 'When blowing between two hanging ping pong balls, they move together because:',
    options: ['Air pushes them together', 'Static electricity', 'Fast air has LOWER pressure', 'Vacuum between them'],
    correctIndex: 2,
  },
  {
    question: 'How does wing shape create lift?',
    options: ['Curved top makes air move faster, creating lower pressure above', 'Flat bottom blocks air', 'Wing pushes air down', 'Suction cup effect'],
    correctIndex: 0,
  },
  {
    question: 'Why does a shower curtain billow inward?',
    options: ['Hot air rises', 'Water pushes it', 'Fast airflow inside creates lower pressure', 'Steam makes it heavier'],
    correctIndex: 2,
  },
  {
    question: 'How does spin make a baseball curve?',
    options: ['Gravity affects spinning ball more', 'Creates pressure differential on sides', 'Air friction slows one side', 'Seams steer it'],
    correctIndex: 1,
  },
  {
    question: 'A carburetor mixes fuel by:',
    options: ['Fuel pump', 'Air through narrow section creates low pressure, sucking fuel', 'Engine heat vaporizes fuel', 'Gravity drips fuel'],
    correctIndex: 1,
  },
  {
    question: 'Blowing over a paper strip makes it rise because:',
    options: ['Breath pushes paper up', 'Fast air above has lower pressure than still air below', 'Paper catches air like a sail', 'Warm breath heats paper'],
    correctIndex: 1,
  },
  {
    question: 'How does a perfume atomizer work?',
    options: ['Squeezing pressurizes bottle', 'Fast air creates low pressure, pulling liquid up', 'Capillary action', 'Bulb pushes air into liquid'],
    correctIndex: 1,
  },
  {
    question: 'Race car spoilers push DOWN because:',
    options: ['Aerodynamic look', 'Inverted shape creates higher pressure above', 'Reduces wind noise', 'Cools engine'],
    correctIndex: 1,
  },
  {
    question: 'If wind tunnel area halves, air speed:',
    options: ['Stays at 50 m/s', 'Slows to 25 m/s', 'Doubles to ~100 m/s', 'Becomes turbulent'],
    correctIndex: 2,
  },
  {
    question: 'Sails generate forward force from side wind because:',
    options: ['Bounce wind like trampoline', 'Curved shape creates pressure differential', 'Friction drags boat', 'Mast redirects wind'],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  accent: '#06b6d4',
  accentDark: '#0891b2',
  warning: '#f59e0b',
  success: '#10b981',
  danger: '#ef4444',
  bgDark: '#020617',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  airHigh: '#dc2626',
  airLow: '#3b82f6',
  airflow: '#60a5fa',
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
    title: 'Aircraft Wings',
    icon: 'plane',
    description: 'Wing shape creates pressure difference. 500-ton planes fly because air moves faster over curved tops.',
    details: 'A380s cruise at 640 mph with ~90,000 flights daily worldwide.',
  },
  {
    title: 'Sports Aerodynamics',
    icon: 'sports',
    description: 'The Magnus Effect makes balls curve. Spin creates pressure asymmetry.',
    details: 'Curveballs break up to 19 inches. Pro pitchers spin at 3,000 RPM.',
  },
  {
    title: 'Race Car Downforce',
    icon: 'car',
    description: 'Inverted wings push cars onto the track. F1 cars generate 5x their weight in downforce.',
    details: 'F1 cars could theoretically drive upside down at high speed.',
  },
  {
    title: 'Medical Devices',
    icon: 'medical',
    description: 'Venturi effect powers oxygen masks, surgical suction, and nebulizers without pumps.',
    details: 'Venturi masks provide precise O2 concentration. No moving parts!',
  },
];

// === MAIN GAME CLASS ===

export class BernoulliPrincipleGame extends BaseGame {
  readonly gameType = 'bernoulli_principle';
  readonly gameTitle = 'Bernoulli\'s Principle';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private airSpeed = 50; // m/s
  private wingAngle = 5; // degrees
  private showPressure = true;
  private showStreamlines = true;
  private ballSpin = 50;
  private spinDirection: 'topspin' | 'backspin' | 'sidespin' = 'topspin';
  private time = 0;

  // PROTECTED: Physics constants
  private readonly airDensity = 1.225; // kg/m^3
  private readonly liftCoeffBase = 0.5;

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
    play: 'Wind Tunnel',
    review: 'Understanding',
    twist_predict: 'Curve Ball',
    twist_play: 'Magnus Effect',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Blow between two ping pong balls - they move TOGETHER, not apart! Why?',
    predict: 'Think about what happens to air pressure when air moves faster...',
    play: 'Experiment with air speed and wing angle. Watch the pressure zones!',
    review: 'Bernoulli discovered: faster flow = lower pressure. P + 0.5*rho*v^2 = constant',
    twist_predict: 'A baseball pitcher throws a spinning ball. Will it curve?',
    twist_play: 'Watch how spin creates an asymmetric pressure field!',
    twist_review: 'The Magnus effect: spin + airflow = curve. Same physics, rotational version!',
    transfer: 'From planes to race cars to medicine - Bernoulli is everywhere!',
    test: 'Test your understanding of fluid dynamics!',
    mastery: 'Congratulations! You understand Bernoulli\'s Principle!',
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
      message: 'Bernoulli\'s Principle lesson started',
    });
  }

  // === INPUT HANDLING ===

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click':
        this.handleButtonClick(input.id!);
        break;
      case 'slider_change':
        this.handleSliderChange(input.id!, input.value);
        break;
      case 'toggle_change':
        this.handleToggleChange(input.id!, input.value);
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

    // Predictions - correct answer is A
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }

    // Twist predictions - correct answer is B
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

    // Spin direction
    if (id === 'topspin') {
      this.spinDirection = 'topspin';
      return;
    }
    if (id === 'backspin') {
      this.spinDirection = 'backspin';
      return;
    }
    if (id === 'sidespin') {
      this.spinDirection = 'sidespin';
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'air_speed') {
      this.airSpeed = value;
      return;
    }
    if (id === 'wing_angle') {
      this.wingAngle = value;
      return;
    }
    if (id === 'ball_spin') {
      this.ballSpin = value;
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'show_pressure') {
      this.showPressure = value;
      return;
    }
    if (id === 'show_streamlines') {
      this.showStreamlines = value;
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
   * PROTECTED: Calculate dynamic pressure
   * q = 0.5 * rho * v^2
   */
  private calculateDynamicPressure(): number {
    return 0.5 * this.airDensity * this.airSpeed * this.airSpeed;
  }

  /**
   * PROTECTED: Calculate lift coefficient based on angle of attack
   * Simplified model: C_L = C_L0 + 0.1 * angle (up to stall)
   */
  private calculateLiftCoefficient(): number {
    const angle = this.wingAngle;
    if (angle > 15) {
      // Stall condition
      return Math.max(0, this.liftCoeffBase + 0.1 * 15 - 0.05 * (angle - 15));
    }
    return this.liftCoeffBase + 0.1 * angle;
  }

  /**
   * PROTECTED: Calculate lift force
   * L = q * A * C_L
   */
  private calculateLift(): number {
    const q = this.calculateDynamicPressure();
    const CL = this.calculateLiftCoefficient();
    const wingArea = 2; // m^2 (simplified)
    return q * wingArea * CL;
  }

  /**
   * PROTECTED: Calculate Magnus force for spinning ball
   * F_M proportional to spin rate and velocity
   */
  private calculateMagnusForce(): number {
    const spinFactor = this.ballSpin / 100;
    const velocityFactor = this.airSpeed / 100;
    return 10 * spinFactor * velocityFactor; // Simplified model
  }

  /**
   * PROTECTED: Get pressure at top of wing relative to bottom
   * Higher speed = lower pressure (Bernoulli)
   */
  private calculatePressureDifferential(): { top: number; bottom: number } {
    const baseP = 101325; // Pa (atmospheric)
    const topSpeed = this.airSpeed * (1 + 0.2 * (this.wingAngle / 10)); // Faster over curved top
    const bottomSpeed = this.airSpeed * 0.9;

    const topPressure = baseP - 0.5 * this.airDensity * topSpeed * topSpeed;
    const bottomPressure = baseP - 0.5 * this.airDensity * bottomSpeed * bottomSpeed;

    return {
      top: topPressure / baseP, // Relative to atmospheric
      bottom: bottomPressure / baseP,
    };
  }

  update(deltaTime: number): void {
    this.time += deltaTime / 1000;
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

  // --- WIND TUNNEL RENDERER ---

  private renderWindTunnel(r: CommandRenderer, centerX: number, centerY: number, width: number, height: number): void {
    // Tunnel outline
    r.rect(centerX - width / 2, centerY - height / 2, width, height, {
      fill: colors.bgCard,
      stroke: colors.border,
      strokeWidth: 2,
      rx: 12,
    });

    const lift = this.calculateLift();
    const pressure = this.calculatePressureDifferential();

    // Streamlines
    if (this.showStreamlines) {
      const numLines = 8;
      for (let i = 0; i < numLines; i++) {
        const yOffset = (i - numLines / 2 + 0.5) * (height / numLines);
        const baseY = centerY + yOffset;

        // Simplified streamline path
        const waveAmp = (i < numLines / 2) ? -20 - this.wingAngle : 5;
        const animOffset = (this.time * 50) % 100;

        for (let x = 0; x < width - 20; x += 25) {
          const startX = centerX - width / 2 + 20 + x - animOffset;
          if (startX > centerX - width / 2 && startX < centerX + width / 2 - 40) {
            const y = baseY + Math.sin((x + animOffset) * 0.03) * waveAmp * 0.3;
            r.circle(startX, y, 2, { fill: colors.airflow, opacity: 0.5 });
          }
        }
      }
    }

    // Wing (airfoil)
    const wingX = centerX - 30;
    const wingY = centerY;
    const wingWidth = 100;
    const wingHeight = 15;

    // Rotate wing by angle
    r.group(`translate(${wingX + wingWidth / 2}, ${wingY}) rotate(${-this.wingAngle})`, (g) => {
      // Airfoil shape (simplified)
      g.ellipse(0, 0, wingWidth / 2, wingHeight, {
        fill: colors.textSecondary,
        stroke: colors.textPrimary,
        strokeWidth: 2,
      });
      // Top curve (more pronounced)
      g.ellipse(0, -3, wingWidth / 2 - 5, wingHeight / 2, {
        fill: colors.bgCardLight,
        opacity: 0.5,
      });
    });

    // Pressure indicators
    if (this.showPressure) {
      // Low pressure (top - blue)
      r.rect(centerX - 15, centerY - 55, 80, 25, { fill: colors.airLow, opacity: 0.3, rx: 4 });
      r.text(centerX + 25, centerY - 38, `LOW P: ${(pressure.top * 100).toFixed(0)}%`, {
        fill: colors.airLow,
        fontSize: 10,
        textAnchor: 'middle',
      });

      // High pressure (bottom - red)
      r.rect(centerX - 15, centerY + 35, 80, 25, { fill: colors.airHigh, opacity: 0.3, rx: 4 });
      r.text(centerX + 25, centerY + 52, `HIGH P: ${(pressure.bottom * 100).toFixed(0)}%`, {
        fill: colors.airHigh,
        fontSize: 10,
        textAnchor: 'middle',
      });

      // Lift arrow
      const liftArrowLen = Math.min(80, lift / 10);
      r.line(centerX + 20, centerY, centerX + 20, centerY - liftArrowLen, {
        stroke: colors.success,
        strokeWidth: 4,
      });
      r.polygon([
        { x: centerX + 12, y: centerY - liftArrowLen + 10 },
        { x: centerX + 20, y: centerY - liftArrowLen },
        { x: centerX + 28, y: centerY - liftArrowLen + 10 },
      ], { fill: colors.success });
      r.text(centerX + 40, centerY - liftArrowLen / 2, 'LIFT', {
        fill: colors.success,
        fontSize: 10,
        fontWeight: 'bold',
      });
    }

    // Stats
    r.rect(centerX - width / 2 + 10, centerY + height / 2 - 55, 120, 45, { fill: colors.bgCardLight, rx: 8 });
    r.text(centerX - width / 2 + 70, centerY + height / 2 - 40, `Speed: ${this.airSpeed} m/s`, {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
    r.text(centerX - width / 2 + 70, centerY + height / 2 - 22, `Lift: ${lift.toFixed(0)} N`, {
      fill: colors.success,
      fontSize: 11,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  // --- SPINNING BALL RENDERER ---

  private renderSpinningBall(r: CommandRenderer, centerX: number, centerY: number, size: number): void {
    const magnusForce = this.calculateMagnusForce();

    // Background
    r.rect(centerX - size, centerY - size / 2, size * 2, size, { fill: colors.bgCard, stroke: colors.border, rx: 12 });

    // Airflow lines
    const numLines = 5;
    for (let i = 0; i < numLines; i++) {
      const yOffset = (i - numLines / 2 + 0.5) * (size / numLines);
      const y = centerY + yOffset;
      const animX = (this.time * 80) % 150;

      for (let x = 0; x < size * 1.8; x += 30) {
        const px = centerX - size + 10 + x - animX;
        if (px > centerX - size && px < centerX + size - 10) {
          r.circle(px, y, 2, { fill: colors.airflow, opacity: 0.4 });
        }
      }
    }

    // Ball
    r.circle(centerX, centerY, 25, {
      fill: colors.danger,
      stroke: colors.textPrimary,
      strokeWidth: 2,
    });

    // Spin indicator (seams)
    const spinAngle = this.time * this.ballSpin * 0.1;
    r.group(`translate(${centerX}, ${centerY}) rotate(${spinAngle})`, (g) => {
      g.arc(0, 0, 20, 0, Math.PI, { fill: 'none', stroke: colors.textPrimary, strokeWidth: 2 });
      g.arc(0, 0, 20, Math.PI, 2 * Math.PI, { fill: 'none', stroke: colors.textPrimary, strokeWidth: 2 });
    });

    // Magnus force arrow
    let arrowDirX = 0;
    let arrowDirY = 0;
    let forceLabel = '';

    switch (this.spinDirection) {
      case 'topspin':
        arrowDirY = 1;
        forceLabel = 'DROPS';
        break;
      case 'backspin':
        arrowDirY = -1;
        forceLabel = 'RISES';
        break;
      case 'sidespin':
        arrowDirX = 1;
        forceLabel = 'CURVES';
        break;
    }

    const arrowLen = 30 + magnusForce * 2;
    const arrowEndX = centerX + arrowDirX * arrowLen;
    const arrowEndY = centerY + arrowDirY * arrowLen;

    r.line(centerX, centerY, arrowEndX, arrowEndY, {
      stroke: colors.warning,
      strokeWidth: 4,
    });
    r.circle(arrowEndX, arrowEndY, 6, { fill: colors.warning });
    r.text(arrowEndX + 15, arrowEndY, forceLabel, {
      fill: colors.warning,
      fontSize: 10,
      fontWeight: 'bold',
    });

    // Pressure zones
    if (this.spinDirection === 'topspin') {
      r.text(centerX, centerY - 45, 'LOW P', { fill: colors.airLow, fontSize: 9, textAnchor: 'middle' });
      r.text(centerX, centerY + 50, 'HIGH P', { fill: colors.airHigh, fontSize: 9, textAnchor: 'middle' });
    } else if (this.spinDirection === 'backspin') {
      r.text(centerX, centerY - 45, 'HIGH P', { fill: colors.airHigh, fontSize: 9, textAnchor: 'middle' });
      r.text(centerX, centerY + 50, 'LOW P', { fill: colors.airLow, fontSize: 9, textAnchor: 'middle' });
    } else {
      r.text(centerX - 45, centerY, 'HIGH', { fill: colors.airHigh, fontSize: 9, textAnchor: 'middle' });
      r.text(centerX + 45, centerY, 'LOW', { fill: colors.airLow, fontSize: 9, textAnchor: 'middle' });
    }
  }

  // --- PHASE RENDERERS ---

  private renderHookPhase(r: CommandRenderer): void {
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.text(350, 49, 'PHYSICS EXPLORATION', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, 'Bernoulli\'s Principle', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 135, 'The surprising relationship between speed and pressure', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.rect(160, 160, 380, 200, { fill: colors.bgCard, stroke: colors.border, rx: 20 });

    r.text(350, 200, 'Blow between two ping pong balls on strings.', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 230, 'You might expect them to separate...', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 270, 'But they MOVE TOGETHER!', {
      fill: colors.primary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 310, 'Why does fast-moving air bring things closer?', {
      fill: colors.warning,
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
    r.text(350, 115, 'Two ping pong balls hang on strings. You blow between them.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 145, 'Why do they move TOGETHER instead of apart?', {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (this.prediction) {
      const isCorrect = this.prediction === 'A';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(
        350,
        375,
        isCorrect
          ? 'Correct! Fast-moving air has LOWER pressure!'
          : 'Think about what happens to pressure when air moves faster.',
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
    r.text(350, 30, 'Wind Tunnel Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    this.renderWindTunnel(r, 350, 200, 400, 250);

    // Formula
    r.rect(100, 370, 500, 60, { fill: colors.bgCardLight, rx: 12 });
    r.text(350, 395, 'Bernoulli\'s Equation: P + 0.5*rho*v^2 + rho*g*h = constant', {
      fill: colors.primary,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 415, 'Higher velocity (v) means lower pressure (P)!', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Bernoulli', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 290, 140, { fill: '#3b82f640', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'The Core Principle', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const coreInfo = [
      'Faster fluid = lower pressure',
      'P + 0.5*rho*v^2 = constant',
      'Energy is conserved in flow',
    ];
    coreInfo.forEach((line, i) => {
      r.text(70, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 140, { fill: '#06b6d440', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Wing Lift', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const liftInfo = [
      'Curved top = faster air = low P',
      'Flat bottom = slower air = high P',
      'Pressure difference = LIFT!',
    ];
    liftInfo.forEach((line, i) => {
      r.text(380, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(50, 230, 600, 80, { fill: '#06533940', stroke: colors.success, rx: 16 });
    r.text(350, 255, 'Key Insight', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 280, 'This is why planes fly! Wings are shaped to make air move faster over the top.', {
      fill: colors.textPrimary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Curveball Challenge', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 120, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'A pitcher throws a baseball with heavy topspin.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 155, 'The ball is rotating rapidly as it flies through the air.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 185, 'What happens to the ball\'s path?', {
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
      r.text(
        350,
        375,
        isCorrect
          ? 'Yes! Spin creates a pressure difference - the Magnus Effect!'
          : 'Think about how spin affects air speed on different sides.',
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
    r.text(350, 30, 'Magnus Effect Lab', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    this.renderSpinningBall(r, 350, 200, 150);

    // Explanation
    r.rect(100, 330, 500, 100, { fill: colors.bgCardLight, rx: 12 });
    r.text(350, 355, 'The Magnus Effect:', { fill: colors.warning, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 380, 'Spin drags air faster on one side (low pressure)', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 400, 'and slower on the other (high pressure).', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 420, 'Ball curves toward the low pressure side!', {
      fill: colors.accent,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Bernoulli + Rotation = Magnus', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 200, { fill: '#78350f30', stroke: colors.warning, rx: 16 });
    r.text(350, 120, 'Same Physics, Different Application!', {
      fill: colors.warning,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Comparison
    r.rect(130, 145, 200, 120, { fill: colors.bgCard, rx: 12 });
    r.text(230, 170, 'Wing Lift', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(230, 195, 'Shape creates speed', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(230, 215, 'difference', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(230, 245, 'UP/DOWN force', { fill: colors.success, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(370, 145, 200, 120, { fill: colors.bgCard, rx: 12 });
    r.text(470, 170, 'Magnus Effect', { fill: colors.danger, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(470, 195, 'Spin creates speed', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(470, 215, 'difference', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(470, 245, 'CURVED path', { fill: colors.warning, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
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

    r.text(350, 200, passed ? 'Excellent! You understand Bernoulli\'s Principle!' : 'Keep studying! Review and try again.', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });
  }

  private renderMasteryPhase(r: CommandRenderer): void {
    r.rect(150, 80, 400, 340, { fill: colors.bgCard, stroke: colors.border, rx: 24 });

    r.text(350, 130, 'Fluid Dynamics Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, 'You have mastered Bernoulli\'s Principle!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'P+v', label: 'Bernoulli Eq.' },
      { icon: 'wing', label: 'Lift Force' },
      { icon: 'ball', label: 'Magnus Effect' },
      { icon: 'venturi', label: 'Venturi Effect' },
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

    if (idx > 0) {
      r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });
    }

    switch (this.phase) {
      case 'hook':
        r.addButton({ id: 'next', label: 'Discover the Secret', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Fast air has LOWER pressure', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Static electricity', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Air pushing directly', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. Vacuum between balls', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Explore the Physics', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'air_speed', label: 'Air Speed (m/s)', value: this.airSpeed, min: 10, max: 100, step: 5 });
        r.addSlider({ id: 'wing_angle', label: 'Wing Angle (deg)', value: this.wingAngle, min: -5, max: 20, step: 1 });
        r.addToggle({ id: 'show_pressure', label: 'Show Pressure', value: this.showPressure });
        r.addToggle({ id: 'show_streamlines', label: 'Show Streamlines', value: this.showStreamlines });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Try the Curveball Challenge', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Flies straight', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Curves downward', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Curves upward', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D. Slows down only', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See the Magnus Effect', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({ id: 'ball_spin', label: 'Spin Rate', value: this.ballSpin, min: 0, max: 100, step: 10 });
        r.addButton({ id: 'topspin', label: 'Topspin', variant: this.spinDirection === 'topspin' ? 'primary' : 'ghost' });
        r.addButton({ id: 'backspin', label: 'Backspin', variant: this.spinDirection === 'backspin' ? 'primary' : 'ghost' });
        r.addButton({ id: 'sidespin', label: 'Sidespin', variant: this.spinDirection === 'sidespin' ? 'primary' : 'ghost' });
        r.addButton({ id: 'next', label: 'See Why It Works', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real-World Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Wings', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Sports', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Cars', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Medical', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
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
      airSpeed: this.airSpeed,
      wingAngle: this.wingAngle,
      showPressure: this.showPressure,
      showStreamlines: this.showStreamlines,
      ballSpin: this.ballSpin,
      spinDirection: this.spinDirection,
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
    this.airSpeed = (state.airSpeed as number) || 50;
    this.wingAngle = (state.wingAngle as number) || 5;
    this.showPressure = (state.showPressure as boolean) ?? true;
    this.showStreamlines = (state.showStreamlines as boolean) ?? true;
    this.ballSpin = (state.ballSpin as number) || 50;
    this.spinDirection = (state.spinDirection as 'topspin' | 'backspin' | 'sidespin') || 'topspin';
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===
export function createBernoulliPrincipleGame(sessionId: string): BernoulliPrincipleGame {
  return new BernoulliPrincipleGame(sessionId);
}
