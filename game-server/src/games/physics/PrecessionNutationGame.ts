/**
 * Precession & Nutation Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Precession rate formula: Ω = mgr / (Iω)
 * - Torque calculation: τ = r × F
 * - Angular momentum: L = Iω
 * - Nutation frequency calculations
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
    question: 'What causes a spinning top to precess instead of falling over?',
    options: ['Friction', 'Angular momentum resists direction change', 'Air resistance', 'Magnetic fields'],
    correctIndex: 1,
  },
  {
    question: 'The precession rate of a gyroscope is:',
    options: ['Ω = Iω/mgr', 'Ω = mgr/(Iω)', 'Ω = mgr × Iω', 'Ω = I/(mgrω)'],
    correctIndex: 1,
  },
  {
    question: 'If a gyroscope spins faster, its precession rate:',
    options: ['Increases', 'Decreases', 'Stays the same', 'Becomes random'],
    correctIndex: 1,
  },
  {
    question: 'Nutation is best described as:',
    options: ['Spinning motion', 'Wobbling superimposed on precession', 'Falling motion', 'Friction effect'],
    correctIndex: 1,
  },
  {
    question: "Earth's precession cycle takes approximately:",
    options: ['1 year', '100 years', '1,000 years', '26,000 years'],
    correctIndex: 3,
  },
  {
    question: 'The torque causing precession comes from:',
    options: ['The spin itself', 'Gravity acting on off-center mass', 'Air currents', 'Centripetal force'],
    correctIndex: 1,
  },
  {
    question: 'A gyroscope with higher moment of inertia (same spin speed):',
    options: ['Precesses faster', 'Precesses slower', 'Falls over immediately', 'Spins backwards'],
    correctIndex: 1,
  },
  {
    question: 'Bicycle stability at speed uses:',
    options: ['Heavy frame', 'Gyroscopic precession of wheels', 'Wide tires', 'Low center of gravity only'],
    correctIndex: 1,
  },
  {
    question: 'MRI machines use precession of:',
    options: ['Electrons', 'Protons (hydrogen nuclei)', 'Neutrons', 'Entire atoms'],
    correctIndex: 1,
  },
  {
    question: 'Angular momentum direction is:',
    options: ['Along the rotation axis', 'Perpendicular to rotation', 'Random', 'Toward the center of mass'],
    correctIndex: 0,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#06b6d4',
  primaryDark: '#0891b2',
  accent: '#f97316',
  accentDark: '#ea580c',
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
  gyroscope: '#3b82f6',
  angularMomentum: '#22c55e',
  torque: '#ef4444',
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
    title: 'Earth\'s Axial Precession',
    icon: 'earth',
    description: 'Earth\'s axis slowly traces a cone over 26,000 years.',
    details: 'The gravitational pull of the Sun and Moon on Earth\'s equatorial bulge causes our planet to precess, changing which star is the North Star.',
  },
  {
    title: 'Spacecraft Attitude Control',
    icon: 'rocket',
    description: 'Control moment gyroscopes orient spacecraft without rockets.',
    details: 'By tilting spinning flywheels, spacecraft can rotate without expelling propellant - essential for ISS and Hubble.',
  },
  {
    title: 'MRI Imaging',
    icon: 'medical',
    description: 'Protons precess in magnetic fields at a specific frequency.',
    details: 'MRI detects the precession frequency of hydrogen nuclei, which varies with tissue type - no radiation needed!',
  },
  {
    title: 'Gyroscopic Navigation',
    icon: 'compass',
    description: 'Inertial navigation systems use gyroscope stability.',
    details: 'A spinning gyroscope maintains its orientation in space, allowing ships and aircraft to navigate without external references.',
  },
];

// === MAIN GAME CLASS ===

export class PrecessionNutationGame extends BaseGame {
  readonly gameType = 'precession_nutation';
  readonly gameTitle = 'Precession & Nutation';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private spinRate = 10; // rad/s
  private precessionAngle = 0;
  private nutationAngle = 0;
  private tiltAngle = 30; // degrees from vertical
  private mass = 1;
  private radius = 0.1; // distance from pivot to center of mass
  private momentOfInertia = 0.01;
  private showVectors = true;
  private isAnimating = true;
  private showNutation = false;
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
    hook: 'A spinning top doesn\'t fall over - it traces a circle. Why? The answer involves angular momentum!',
    predict: 'What happens when you tilt a spinning gyroscope? Does it fall or do something else?',
    play: 'Adjust spin speed and tilt. Watch how precession rate changes!',
    review: 'Precession happens because torque changes angular momentum direction, not magnitude!',
    twist_predict: 'What if the gyroscope wobbles while precessing? This is called nutation.',
    twist_play: 'Add nutation to see the complex wobbling motion superimposed on precession.',
    twist_review: 'Nutation is the "bobbing" motion caused by initial conditions and energy exchange.',
    transfer: 'From Earth\'s axis to MRI machines - precession is everywhere!',
    test: 'Time to test your understanding of gyroscopic motion!',
    mastery: 'Congratulations! You\'ve mastered precession and nutation!',
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
      message: 'Precession & Nutation lesson started',
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
    if (id === 'nutation') {
      this.showNutation = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'spin_rate') {
      this.spinRate = value;
      return;
    }
    if (id === 'tilt') {
      this.tiltAngle = value;
      return;
    }
    if (id === 'mass') {
      this.mass = value;
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
   * PROTECTED: Precession rate calculation
   * Ω = mgr / (Iω) = τ / L
   */
  private calculatePrecessionRate(): number {
    const g = 9.81;
    const torque = this.mass * g * this.radius * Math.sin(this.tiltAngle * Math.PI / 180);
    const angularMomentum = this.momentOfInertia * this.spinRate;
    if (angularMomentum === 0) return 0;
    return torque / angularMomentum;
  }

  /**
   * PROTECTED: Angular momentum magnitude
   * L = Iω
   */
  private calculateAngularMomentum(): number {
    return this.momentOfInertia * this.spinRate;
  }

  /**
   * PROTECTED: Torque magnitude
   * τ = mgr × sin(θ)
   */
  private calculateTorque(): number {
    const g = 9.81;
    return this.mass * g * this.radius * Math.sin(this.tiltAngle * Math.PI / 180);
  }

  /**
   * PROTECTED: Nutation frequency
   * ω_n ≈ L / I_perp (simplified)
   */
  private calculateNutationFrequency(): number {
    return this.spinRate * 0.5; // Simplified approximation
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;

    const dt = deltaTime / 1000;
    this.time += dt;

    // Update precession angle
    const precessionRate = this.calculatePrecessionRate();
    this.precessionAngle += precessionRate * dt * 50; // Visual scaling
    this.precessionAngle = this.precessionAngle % 360;

    // Update nutation if enabled
    if (this.showNutation) {
      const nutationFreq = this.calculateNutationFrequency();
      this.nutationAngle = 5 * Math.sin(nutationFreq * this.time * 2); // Small wobble
    } else {
      this.nutationAngle = 0;
    }
  }

  private resetSimulation(): void {
    this.spinRate = 10;
    this.tiltAngle = 30;
    this.precessionAngle = 0;
    this.nutationAngle = 0;
    this.time = 0;
    this.isAnimating = true;
    this.showNutation = false;
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

  private renderGyroscope(r: CommandRenderer, centerX: number, centerY: number, scale: number = 1): void {
    const effectiveTilt = this.tiltAngle + this.nutationAngle;

    r.group(`translate(${centerX}, ${centerY})`, (g) => {
      // Pivot point
      g.circle(0, 0, 5 * scale, { fill: colors.textMuted });

      // Shaft
      const shaftLength = 80 * scale;
      const shaftEndX = shaftLength * Math.sin(effectiveTilt * Math.PI / 180) * Math.cos(this.precessionAngle * Math.PI / 180);
      const shaftEndY = -shaftLength * Math.cos(effectiveTilt * Math.PI / 180);

      g.line(0, 0, shaftEndX, shaftEndY, { stroke: colors.textPrimary, strokeWidth: 4 * scale });

      // Spinning disk
      const diskRadius = 40 * scale;
      g.ellipse(shaftEndX, shaftEndY, diskRadius, diskRadius * 0.3, {
        fill: colors.gyroscope,
        stroke: colors.primary,
        strokeWidth: 2,
      });

      // Spin indicator
      const spinIndicatorAngle = this.time * this.spinRate * 10;
      const indicatorX = shaftEndX + diskRadius * 0.7 * Math.cos(spinIndicatorAngle);
      const indicatorY = shaftEndY + diskRadius * 0.1 * Math.sin(spinIndicatorAngle);
      g.circle(indicatorX, indicatorY, 4 * scale, { fill: colors.textPrimary });

      // Vectors
      if (this.showVectors) {
        // Angular momentum vector (along spin axis)
        const lLength = 60 * scale;
        const lX = lLength * Math.sin(effectiveTilt * Math.PI / 180) * Math.cos(this.precessionAngle * Math.PI / 180);
        const lY = -lLength * Math.cos(effectiveTilt * Math.PI / 180);
        g.line(shaftEndX, shaftEndY, shaftEndX + lX * 0.8, shaftEndY + lY * 0.8, {
          stroke: colors.angularMomentum,
          strokeWidth: 3,
        });
        g.text(shaftEndX + lX, shaftEndY + lY - 10, 'L', {
          fill: colors.angularMomentum,
          fontSize: 12,
          fontWeight: 'bold',
        });

        // Torque vector (perpendicular)
        const tLength = 40 * scale;
        g.line(shaftEndX, shaftEndY, shaftEndX + tLength, shaftEndY, {
          stroke: colors.torque,
          strokeWidth: 3,
          strokeDasharray: '5,3',
        });
        g.text(shaftEndX + tLength + 10, shaftEndY, 'τ', {
          fill: colors.torque,
          fontSize: 12,
          fontWeight: 'bold',
        });
      }
    });

    // Precession path (dashed circle)
    const pathRadius = 60 * scale * Math.sin(effectiveTilt * Math.PI / 180);
    r.circle(centerX, centerY - 60 * scale * Math.cos(effectiveTilt * Math.PI / 180), pathRadius, {
      fill: 'none',
      stroke: colors.primary,
      strokeWidth: 1,
      strokeDasharray: '5,5',
      opacity: 0.5,
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

    r.text(350, 100, 'Why Don\'t Tops Fall?', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'The mysterious gyroscopic effect explained', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.rect(160, 160, 380, 240, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 20,
      opacity: 0.8,
    });

    this.renderGyroscope(r, 350, 300, 1);

    r.text(350, 420, 'A spinning gyroscope defies gravity through precession...', {
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
    r.text(350, 115, 'A tilted gyroscope is released while spinning fast.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'What happens to it?', {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (this.prediction) {
      const isCorrect = this.prediction === 'B';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 375, isCorrect
        ? 'Correct! It precesses - tracing a cone while staying upright!'
        : 'Not quite. It actually precesses - rotating horizontally while tilted!',
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
    r.text(350, 30, 'Precession Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 340, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderGyroscope(r, 250, 200, 1.2);

    // Stats panel
    r.rect(440, 50, 210, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    const precessionRate = this.calculatePrecessionRate();
    const angularMomentum = this.calculateAngularMomentum();

    r.text(545, 80, 'Physics Data', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });

    r.rect(460, 100, 170, 50, { fill: '#0e769940', rx: 8 });
    r.text(545, 120, 'Precession Rate', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(545, 140, `${precessionRate.toFixed(2)} rad/s`, {
      fill: colors.primary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(460, 160, 170, 50, { fill: '#15803d30', rx: 8 });
    r.text(545, 180, 'Angular Momentum', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(545, 200, `${angularMomentum.toFixed(3)} kg·m²/s`, {
      fill: colors.angularMomentum,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(460, 220, 170, 50, { fill: '#dc262630', rx: 8 });
    r.text(545, 240, 'Torque', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(545, 260, `${this.calculateTorque().toFixed(3)} N·m`, {
      fill: colors.torque,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 350, 570, 60, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(365, 375, 'Key: Ω = τ/L = mgr/(Iω)', {
      fill: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(365, 395, 'Faster spin → smaller precession rate (more stable)', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Precession', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 290, 150, { fill: '#0e769940', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'Why It Happens', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const whyInfo = [
      'Gravity creates torque on tilted gyroscope',
      'Torque changes direction of L, not magnitude',
      'L traces a cone → precession!',
      'τ = dL/dt (perpendicular, not parallel)',
    ];
    whyInfo.forEach((line, i) => {
      r.text(70, 120 + i * 25, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 150, { fill: '#ea580c40', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Key Relationships', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const keyInfo = [
      'Higher spin ω → slower precession Ω',
      'More mass/tilt → faster precession',
      'Ω = mgr/(Iω) - the precession formula',
      'Energy is conserved (precession is stable)',
    ];
    keyInfo.forEach((line, i) => {
      r.text(380, 120 + i * 25, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(50, 240, 600, 80, { fill: '#15803d40', stroke: colors.success, rx: 16 });
    r.text(350, 265, 'The Deep Insight', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 290, 'Angular momentum is a vector - torque changes its DIRECTION, not just magnitude.', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 308, 'This vector nature is why gyroscopes behave so counterintuitively!', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist: Nutation', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'Real gyroscopes don\'t precess smoothly.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 145, 'What additional motion do they exhibit?', {
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
        ? 'Correct! Nutation is a wobbling/nodding motion superimposed on precession!'
        : 'Not quite. Nutation is a subtle wobbling that adds to the precession.',
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
    r.text(350, 30, 'Nutation Lab', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 540, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderGyroscope(r, 350, 200, 1.5);

    r.rect(80, 350, 540, 60, { fill: '#eab30830', stroke: colors.warning, rx: 12 });
    r.text(350, 375, 'Notice the wobbling motion added to the precession.', {
      fill: colors.warning,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 395, 'This is nutation - caused by the initial "release" conditions.', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Understanding Nutation', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'Nutation: The "Wobble Within the Wobble"', {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const explanation = [
      '• Nutation is a fast oscillation superimposed on slower precession',
      '• Caused by initial conditions (how you release the gyroscope)',
      '• Energy exchanges between precession and nutation modes',
      '• Earth\'s nutation: 18.6-year cycle from Moon\'s pull',
      '• In ideal cases with perfect release, nutation can be zero',
    ];

    explanation.forEach((line, i) => {
      r.text(120, 150 + i * 28, line, { fill: colors.textSecondary, fontSize: 13 });
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

    r.text(350, 200, passed ? 'You\'ve mastered gyroscopic motion!' : 'Review the concepts and try again.', {
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

    r.text(350, 130, 'Gyroscope Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, 'You\'ve mastered precession and nutation!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'Ω', label: 'Precession' },
      { icon: 'L', label: 'Angular Momentum' },
      { icon: '~', label: 'Nutation' },
      { icon: 'τ', label: 'Torque' },
    ];

    badges.forEach((badge, i) => {
      const x = 180 + (i % 2) * 170;
      const y = 200 + Math.floor(i / 2) * 80;
      r.rect(x, y, 150, 60, { fill: colors.bgCardLight, rx: 12 });
      r.text(x + 75, y + 25, badge.icon, { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
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
        r.addButton({ id: 'next', label: 'Explore Gyroscopes', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Falls over immediately', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Precesses (traces a cone)', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Stays perfectly still', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. Spins faster', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'See What Happens', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'spin_rate', label: 'Spin Rate', value: this.spinRate, min: 1, max: 30 });
        r.addSlider({ id: 'tilt', label: 'Tilt Angle', value: this.tiltAngle, min: 5, max: 60 });
        r.addToggle({ id: 'vectors', label: 'Vectors', value: this.showVectors, onLabel: 'ON', offLabel: 'OFF' });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Discover Nutation', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Perfectly smooth precession', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Wobbling/nodding motion', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Complete chaos', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See Nutation', variant: 'success' });
        }
        break;

      case 'twist_play':
        this.showNutation = true;
        r.addSlider({ id: 'spin_rate', label: 'Spin Rate', value: this.spinRate, min: 1, max: 30 });
        r.addButton({ id: 'next', label: 'Understand Nutation', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Earth', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Space', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'MRI', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Nav', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every((c) => c)) {
          r.addButton({ id: 'next', label: 'Take Knowledge Test', variant: 'success' });
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
      spinRate: this.spinRate,
      precessionAngle: this.precessionAngle,
      nutationAngle: this.nutationAngle,
      tiltAngle: this.tiltAngle,
      showVectors: this.showVectors,
      showNutation: this.showNutation,
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
    this.spinRate = (state.spinRate as number) || 10;
    this.precessionAngle = (state.precessionAngle as number) || 0;
    this.nutationAngle = (state.nutationAngle as number) || 0;
    this.tiltAngle = (state.tiltAngle as number) || 30;
    this.showVectors = (state.showVectors as boolean) ?? true;
    this.showNutation = (state.showNutation as boolean) || false;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===

export function createPrecessionNutationGame(sessionId: string): PrecessionNutationGame {
  return new PrecessionNutationGame(sessionId);
}
