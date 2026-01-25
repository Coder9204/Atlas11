/**
 * Angular Momentum Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Angular momentum formula: L = I * ω
 * - Moment of inertia: I = Σmr² (for point masses)
 * - Conservation: L_initial = L_final (when no external torque)
 * - Speed calculation: ω = L / I
 * - Energy calculations for spinning systems
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
    question: 'When a figure skater pulls their arms in during a spin:',
    options: ['They slow down', 'They stay the same speed', 'They speed up', 'They stop spinning'],
    correctIndex: 2,
  },
  {
    question: 'What quantity is conserved when a skater pulls arms in?',
    options: ['Angular velocity', 'Moment of inertia', 'Angular momentum', 'Kinetic energy'],
    correctIndex: 2,
  },
  {
    question: 'If moment of inertia decreases by half, angular velocity:',
    options: ['Halves', 'Stays same', 'Doubles', 'Quadruples'],
    correctIndex: 2,
  },
  {
    question: 'Moment of inertia depends on:',
    options: ['Mass only', 'Radius only', 'Both mass and radius squared', 'Neither'],
    correctIndex: 2,
  },
  {
    question: 'Why do divers tuck into a ball during somersaults?',
    options: ['Reduce air resistance', 'Decrease moment of inertia to spin faster', 'Look more aerodynamic', 'Feel safer'],
    correctIndex: 1,
  },
  {
    question: 'A neutron star spins incredibly fast because:',
    options: ['Nuclear reactions', 'Angular momentum conserved as it collapsed', 'Magnetic fields', 'Dark matter'],
    correctIndex: 1,
  },
  {
    question: 'Why do helicopters need tail rotors?',
    options: ['For steering', 'To counter main rotor angular momentum', 'Extra lift', 'Cooling'],
    correctIndex: 1,
  },
  {
    question: 'When you extend arms on a spinning chair:',
    options: ['You speed up', 'Nothing happens', 'You slow down', 'You fly off'],
    correctIndex: 2,
  },
  {
    question: 'L = Iω represents:',
    options: ['Linear momentum', 'Angular momentum', 'Torque', 'Energy'],
    correctIndex: 1,
  },
  {
    question: 'Gyroscopes resist tilting because:',
    options: ['They are heavy', 'Angular momentum is conserved', 'Friction', 'Magnetic forces'],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#8b5cf6',
  primaryDark: '#7c3aed',
  accent: '#f472b6',
  accentDark: '#ec4899',
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
  figure: '#64748b',
  figureHighlight: '#94a3b8',
  weights: '#ec4899',
  platform: '#334155',
  spin: '#8b5cf6',
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
    title: 'Figure Skating',
    icon: 'skate',
    description: 'Skaters pull arms in to spin faster. Starting with arms out, they can increase speed 3-4x.',
    details: 'Olympic skaters reach 300+ RPM. World record is 342 RPM by Natalia Kanounnikova.',
  },
  {
    title: 'Platform Diving',
    icon: 'dive',
    description: 'Divers tuck tightly to complete multiple somersaults in just 2 seconds from a 10m platform.',
    details: 'Tuck position reduces I by up to 4x compared to pike or layout position.',
  },
  {
    title: 'Gyroscopes',
    icon: 'gyro',
    description: 'Spinning gyroscopes maintain orientation due to angular momentum conservation.',
    details: 'Hubble Space Telescope uses gyroscopes for precise pointing. Your phone has MEMS gyroscopes.',
  },
  {
    title: 'Neutron Stars',
    icon: 'star',
    description: 'When massive stars collapse, angular momentum is compressed into tiny volume.',
    details: 'Fastest pulsar spins 716 times per second. Surface moves at 24% speed of light!',
  },
];

// === MAIN GAME CLASS ===

export class AngularMomentumGame extends BaseGame {
  readonly gameType = 'angular_momentum';
  readonly gameTitle = 'Angular Momentum';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private angle = 0;
  private armExtension = 0.8; // 0 = tucked, 1 = extended
  private hasWeights = true;
  private isSpinning = false;
  private time = 0;

  // PROTECTED: Physics constants
  private readonly bodyInertia = 2.5;
  private readonly initialOmega = 2; // rad/s
  private weightMass = 2;

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
    hook: 'When a figure skater pulls their arms in, they suddenly spin much faster. How is this possible?',
    predict: 'Think about what happens to spinning objects when their mass distribution changes.',
    play: 'Experiment with arm position and weights. Watch how angular momentum stays constant!',
    review: 'Angular momentum L = Iω is conserved. When I decreases, ω must increase!',
    twist_predict: 'What happens when you spin WITHOUT heavy weights - just your arms?',
    twist_play: 'Compare the speed increase with and without weights. Notice the difference!',
    twist_review: 'Heavier mass at larger radius = larger I change = bigger speed change!',
    transfer: 'From ice skating to neutron stars - angular momentum conservation is everywhere!',
    test: 'Test your understanding of angular momentum conservation!',
    mastery: 'Congratulations! You understand the physics behind spinning!',
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
      message: 'Angular Momentum lesson started',
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

    // Simulation controls
    if (id === 'toggle_spin') {
      this.isSpinning = !this.isSpinning;
      return;
    }
    if (id === 'with_weights') {
      this.hasWeights = true;
      this.weightMass = 2;
      return;
    }
    if (id === 'without_weights') {
      this.hasWeights = false;
      this.weightMass = 0.2;
      return;
    }
    if (id === 'reset') {
      this.resetSimulation();
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'weights') {
      this.hasWeights = value;
      this.weightMass = value ? 2 : 0.2;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'arm_extension') {
      this.armExtension = value;
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
   * PROTECTED: Calculate moment of inertia
   * I = I_body + 2 * m * r²
   */
  private calculateMomentOfInertia(): number {
    const armRadius = 0.3 + this.armExtension * 0.5;
    return this.bodyInertia + 2 * this.weightMass * armRadius * armRadius;
  }

  /**
   * PROTECTED: Calculate initial moment of inertia (arms extended)
   */
  private calculateInitialMomentOfInertia(): number {
    const initialArmRadius = 0.8;
    return this.bodyInertia + 2 * this.weightMass * initialArmRadius * initialArmRadius;
  }

  /**
   * PROTECTED: Angular momentum (conserved)
   * L = I_initial * ω_initial
   */
  private calculateAngularMomentum(): number {
    return this.calculateInitialMomentOfInertia() * this.initialOmega;
  }

  /**
   * PROTECTED: Current angular velocity
   * ω = L / I_current
   */
  private calculateOmega(): number {
    return this.calculateAngularMomentum() / this.calculateMomentOfInertia();
  }

  /**
   * PROTECTED: Speed ratio compared to initial
   */
  private calculateSpeedRatio(): number {
    return this.calculateOmega() / this.initialOmega;
  }

  update(deltaTime: number): void {
    if (!this.isSpinning) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;

    this.time += deltaTime / 1000;

    // Update angle based on calculated angular velocity
    const omega = this.calculateOmega();
    this.angle = (this.angle + omega * 0.04) % (2 * Math.PI);
  }

  private resetSimulation(): void {
    this.angle = 0;
    this.time = 0;
    this.armExtension = 0.8;
    this.isSpinning = false;
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
    r.circle(175, 0, 200, { fill: '#8b5cf6', opacity: 0.03 });
    r.circle(525, 500, 200, { fill: '#f472b6', opacity: 0.03 });
  }

  // --- SPINNING FIGURE RENDERER ---

  private renderSpinningFigure(r: CommandRenderer, centerX: number, centerY: number, size: number = 200): void {
    const scale = size / 200;
    const rotation = (this.angle * 180) / Math.PI;
    const armLength = 20 + this.armExtension * 50;
    const weightSize = this.hasWeights ? 14 : 5;
    const omega = this.calculateOmega();
    const momentOfInertia = this.calculateMomentOfInertia();
    const speedRatio = this.calculateSpeedRatio();
    const angularMomentum = this.calculateAngularMomentum();

    // Platform
    r.ellipse(centerX, centerY + 90 * scale, 70 * scale, 15 * scale, { fill: colors.platform });
    r.ellipse(centerX, centerY + 70 * scale, 35 * scale, 8 * scale, { fill: colors.bgCardLight });

    // Spin glow when spinning
    if (this.isSpinning) {
      r.ellipse(centerX, centerY, (50 + armLength) * scale, (25 + armLength / 3) * scale, {
        fill: colors.spin,
        opacity: 0.2,
      });
    }

    // Figure (rotated group)
    r.group(`translate(${centerX}, ${centerY}) rotate(${rotation})`, (g) => {
      // Body
      g.ellipse(0, 20 * scale, 26 * scale, 38 * scale, {
        fill: colors.figure,
        stroke: colors.figureHighlight,
        strokeWidth: 2,
      });

      // Head
      g.circle(0, -28 * scale, 22 * scale, {
        fill: colors.figureHighlight,
        stroke: colors.textSecondary,
        strokeWidth: 2,
      });

      // Eyes
      g.circle(-7 * scale, -32 * scale, 4 * scale, { fill: colors.bgDark });
      g.circle(7 * scale, -32 * scale, 4 * scale, { fill: colors.bgDark });

      // Arms
      g.line(-22 * scale, 2 * scale, (-22 - armLength) * scale, 2 * scale, {
        stroke: colors.textSecondary,
        strokeWidth: 10 * scale,
        strokeLinecap: 'round',
      });
      g.line(22 * scale, 2 * scale, (22 + armLength) * scale, 2 * scale, {
        stroke: colors.textSecondary,
        strokeWidth: 10 * scale,
        strokeLinecap: 'round',
      });

      // Weights
      g.circle((-22 - armLength) * scale, 2 * scale, weightSize * scale, {
        fill: this.hasWeights ? colors.weights : colors.figureHighlight,
        stroke: this.hasWeights ? colors.accent : colors.figure,
        strokeWidth: 2,
      });
      g.circle((22 + armLength) * scale, 2 * scale, weightSize * scale, {
        fill: this.hasWeights ? colors.weights : colors.figureHighlight,
        stroke: this.hasWeights ? colors.accent : colors.figure,
        strokeWidth: 2,
      });
    });

    // Stats display
    const statsY = centerY + 115 * scale;
    r.rect(centerX - 150, statsY, 100, 50, { fill: colors.bgCardLight, rx: 8 });
    r.text(centerX - 100, statsY + 15, 'SPIN SPEED', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(centerX - 100, statsY + 38, `${omega.toFixed(1)} rad/s`, {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(centerX - 40, statsY, 80, 50, { fill: colors.bgCardLight, rx: 8 });
    r.text(centerX, statsY + 15, 'MOMENT I', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(centerX, statsY + 38, `${momentOfInertia.toFixed(2)} kg*m^2`, {
      fill: colors.warning,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(centerX + 50, statsY, 100, 50, {
      fill: speedRatio > 1.2 ? '#065f46' : colors.bgCardLight,
      stroke: speedRatio > 1.2 ? colors.success : 'none',
      rx: 8,
    });
    r.text(centerX + 100, statsY + 15, 'SPEED GAIN', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(centerX + 100, statsY + 38, `${speedRatio.toFixed(1)}x`, {
      fill: speedRatio > 1.2 ? colors.success : colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Angular momentum (conserved)
    r.rect(centerX - 100, statsY + 60, 200, 35, {
      fill: '#581c87',
      stroke: colors.primary,
      rx: 12,
      opacity: 0.4,
    });
    r.text(centerX, statsY + 72, 'ANGULAR MOMENTUM (CONSERVED)', {
      fill: colors.primary,
      fontSize: 9,
      textAnchor: 'middle',
    });
    r.text(centerX, statsY + 88, `L = ${angularMomentum.toFixed(2)} kg*m^2/s`, {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  // --- PHASE RENDERERS ---

  private renderHookPhase(r: CommandRenderer): void {
    // Premium badge
    r.rect(280, 30, 140, 28, { fill: '#8b5cf6', opacity: 0.1, rx: 14, stroke: '#8b5cf6', strokeWidth: 1 });
    r.circle(295, 44, 4, { fill: '#8b5cf6' });
    r.text(350, 49, 'PHYSICS EXPLORATION', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Main title
    r.text(350, 100, 'The Spinning Secret', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'Discover why figure skaters spin faster when they pull their arms in', {
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

    // Icon
    r.text(350, 220, '[skater icon]', {
      fill: colors.primary,
      fontSize: 48,
      textAnchor: 'middle',
    });

    // Description
    r.text(350, 290, 'A skater starts spinning slowly with arms outstretched.', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 315, 'They pull their arms in close and suddenly spin much faster!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 350, 'How do they speed up without pushing off anything?', {
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
    r.rect(100, 80, 500, 80, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 115, 'WHY does pulling arms in make a skater spin faster?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Show feedback if prediction made
    if (this.prediction) {
      const isCorrect = this.prediction === 'B';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(
        350,
        375,
        isCorrect
          ? 'Correct! Angular momentum L = Iw is conserved. When I decreases, w must increase!'
          : 'Not quite. Think about what stays constant when no external force acts.',
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
    r.text(350, 30, 'Spinning Chair Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Main simulation
    this.renderSpinningFigure(r, 350, 180, 180);

    // Formula box
    r.rect(120, 420, 460, 60, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(350, 445, 'Key Formula: L = I * w (Angular Momentum = Moment of Inertia x Angular Velocity)', {
      fill: colors.primary,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 465, 'When L is conserved and I decreases, w must increase to compensate!', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Conservation of Angular Momentum', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Angular momentum card
    r.rect(50, 70, 290, 150, { fill: '#581c8740', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'Angular Momentum (L)', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const amInfo = [
      'L = I x w (inertia x angular velocity)',
      'CONSERVED when no external torque',
      'Like a "spinning memory" preserved',
    ];
    amInfo.forEach((line, i) => {
      r.text(70, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    // Moment of inertia card
    r.rect(360, 70, 290, 150, { fill: '#78350f40', stroke: colors.warning, rx: 16 });
    r.text(505, 95, 'Moment of Inertia (I)', { fill: colors.warning, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const moiInfo = [
      'I = sum(m*r^2) (mass x distance^2)',
      'Farther mass = larger I',
      'Extended arms = large I, tucked = small I',
    ];
    moiInfo.forEach((line, i) => {
      r.text(380, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    // Conservation law card
    r.rect(50, 240, 600, 80, { fill: '#06533940', stroke: colors.success, rx: 16 });
    r.text(350, 265, 'The Conservation Law', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 290, 'L = I*w = constant. When you pull arms in, I decreases, so w must INCREASE!', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 308, 'If I drops by half, w doubles. That\'s how skaters spin 3-4x faster!', {
      fill: colors.textPrimary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist Challenge', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 120, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'You have seen heavy weights make a big difference.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 155, 'What if you spin with NO weights (just your arms)?', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 185, 'Will the speed increase be bigger, smaller, or the same?', {
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
          ? 'Correct! Less mass means smaller change in I, so smaller change in w!'
          : 'Think about I = m*r^2. Less mass means smaller change in I.',
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
    r.text(350, 30, 'Compare With/Without Weights', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    this.renderSpinningFigure(r, 350, 200, 180);
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Mass Distribution is Key!', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 200, { fill: '#78350f30', stroke: colors.warning, rx: 16 });
    r.text(350, 120, 'Since I = sum(m*r^2), the mass (m) multiplies the effect:', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });

    // Comparison cards
    r.rect(130, 145, 200, 120, { fill: colors.bgCard, rx: 12 });
    r.text(230, 170, 'Heavy Weights', { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(230, 195, 'Large change in I', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
    r.text(230, 215, '= Large change in w', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
    r.text(230, 245, 'Spin 3x faster!', { fill: colors.success, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(370, 145, 200, 120, { fill: colors.bgCard, rx: 12 });
    r.text(470, 170, 'Arms Only', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(470, 195, 'Small change in I', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
    r.text(470, 215, '= Small change in w', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
    r.text(470, 245, 'Spin 1.2x faster', { fill: colors.warning, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
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

    r.text(350, 200, passed ? 'Excellent! You have mastered angular momentum!' : 'Keep studying! Review and try again.', {
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

    r.text(350, 130, 'Angular Momentum Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, 'You have mastered the conservation of angular momentum!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Achievement badges
    const badges = [
      { icon: 'L=Iw', label: 'Angular Momentum' },
      { icon: 'I=mr^2', label: 'Moment of Inertia' },
      { icon: 'skate', label: 'Figure Skating' },
      { icon: 'star', label: 'Neutron Stars' },
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
        r.addButton({ id: 'next', label: 'Discover the Physics', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Arms push air, reaction speeds skater', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Angular momentum conserved - smaller radius needs faster spin', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Muscles add energy when pulling arms in', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. Gravity affects you less with arms closer', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Try the Experiment', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'arm_extension', label: 'Arm Position', value: this.armExtension, min: 0, max: 1, step: 0.1 });
        r.addButton({ id: 'with_weights', label: 'With Weights', variant: this.hasWeights ? 'primary' : 'ghost' });
        r.addButton({ id: 'without_weights', label: 'Arms Only', variant: !this.hasWeights ? 'primary' : 'ghost' });
        r.addButton({ id: 'toggle_spin', label: this.isSpinning ? 'Stop Spinning' : 'Start Spinning', variant: this.isSpinning ? 'danger' : 'success' });
        r.addButton({ id: 'next', label: 'Review the Physics', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Try a Challenge', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Same speed increase (arms have mass too)', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. SMALLER speed increase (less mass being moved)', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. LARGER speed increase (weights were slowing)', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D. No change at all', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Compare Both', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({ id: 'arm_extension', label: 'Arm Position', value: this.armExtension, min: 0, max: 1, step: 0.1 });
        r.addButton({ id: 'with_weights', label: 'Heavy Weights', variant: this.hasWeights ? 'primary' : 'ghost' });
        r.addButton({ id: 'without_weights', label: 'Arms Only', variant: !this.hasWeights ? 'primary' : 'ghost' });
        r.addButton({ id: 'toggle_spin', label: this.isSpinning ? 'Stop' : 'Spin', variant: this.isSpinning ? 'danger' : 'success' });
        r.addButton({ id: 'next', label: 'See Why', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real-World Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Skating', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Diving', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Gyroscopes', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Stars', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
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
      angle: this.angle,
      armExtension: this.armExtension,
      hasWeights: this.hasWeights,
      isSpinning: this.isSpinning,
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
    this.angle = (state.angle as number) || 0;
    this.armExtension = (state.armExtension as number) || 0.8;
    this.hasWeights = (state.hasWeights as boolean) ?? true;
    this.isSpinning = (state.isSpinning as boolean) || false;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===
export function createAngularMomentumGame(sessionId: string): AngularMomentumGame {
  return new AngularMomentumGame(sessionId);
}
