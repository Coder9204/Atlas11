/**
 * Moment of Inertia Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Moment of inertia formulas: I = mr² for point mass, various shapes
 * - Conservation of angular momentum: L = Iω = constant
 * - Rotational kinetic energy: KE = ½Iω²
 * - Angular momentum transfer and system boundaries
 * - Relationship between I and ω when L is conserved
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
    question: 'What quantity is conserved when an ice skater pulls in their arms?',
    options: ['Angular velocity', 'Angular momentum', 'Rotational energy', 'Moment of inertia'],
    correctIndex: 1,
  },
  {
    question: 'When a skater pulls in their arms, their moment of inertia:',
    options: ['Increases', 'Decreases', 'Stays the same', 'Becomes zero'],
    correctIndex: 1,
  },
  {
    question: 'The moment of inertia depends on:',
    options: ['Only the total mass', 'Mass distribution relative to the rotation axis', 'Only the rotation speed', 'The temperature'],
    correctIndex: 1,
  },
  {
    question: 'Angular momentum L is calculated as:',
    options: ['L = mv', 'L = Iω', 'L = ½Iω²', 'L = mgh'],
    correctIndex: 1,
  },
  {
    question: 'A diver in the tuck position spins faster because:',
    options: ['They have more energy', 'Their moment of inertia is smaller', 'Gravity pulls them faster', 'Air resistance is lower'],
    correctIndex: 1,
  },
  {
    question: 'When a neutron star collapses and shrinks, its spin rate:',
    options: ['Decreases dramatically', 'Increases dramatically', 'Stays exactly the same', 'Becomes zero'],
    correctIndex: 1,
  },
  {
    question: 'Which shape has the largest moment of inertia for the same mass?',
    options: ['Solid sphere', 'Hollow sphere', 'Point mass at center', 'All have the same I'],
    correctIndex: 1,
  },
  {
    question: 'If you double the distance of a mass from the rotation axis, its contribution to I:',
    options: ['Doubles', 'Quadruples', 'Halves', 'Stays the same'],
    correctIndex: 1,
  },
  {
    question: 'When an ice skater extends their arms, their kinetic energy:',
    options: ['Increases', 'Decreases', 'Stays constant', 'Becomes negative'],
    correctIndex: 1,
  },
  {
    question: 'The equation I = mr² shows that moment of inertia depends on distance:',
    options: ['Linearly', 'Quadratically (squared)', 'Cubically', 'Exponentially'],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#ec4899',
  primaryDark: '#db2777',
  accent: '#8b5cf6',
  accentDark: '#7c3aed',
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
  iceCyan: '#a5f3fc',
  skinTone: '#fcd9b6',
  dressPink: '#ec4899',
  skirtPink: '#f472b6',
  angularCyan: '#22d3ee',
  momentPink: '#f472b6',
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
    icon: 'skating',
    description: 'Skaters control spin speed by adjusting body position.',
    details: 'Tucked positions enable spins over 300 RPM! Reducing I by 3-4x triples spin rate.',
  },
  {
    title: 'Platform Diving',
    icon: 'diving',
    description: 'Divers use tuck and pike positions to control rotation.',
    details: 'A tight tuck reduces I by about 3.5x, allowing rapid somersaults before extending for clean entry.',
  },
  {
    title: 'Neutron Stars',
    icon: 'star',
    description: 'When a massive star collapses, conservation causes extreme spin-up.',
    details: 'A Sun-like star rotating once/month collapses to spin 700+ times per second!',
  },
  {
    title: 'Gyroscope Stabilization',
    icon: 'gyro',
    description: 'Heavy flywheels use their large I for stability.',
    details: 'Control Moment Gyroscopes keep satellites precisely pointed using large angular momentum.',
  },
];

// === MAIN GAME CLASS ===

export class MomentOfInertiaGame extends BaseGame {
  readonly gameType = 'moment_of_inertia';
  readonly gameTitle = 'Moment of Inertia';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private rotation = 0;
  private armExtension = 1; // 0 = tucked, 1 = extended
  private angularVelocity = 3;
  private initialL = 15; // Angular momentum (constant)
  private isSpinning = true;

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
    twist_predict: 'Twist',
    twist_play: 'Demo',
    twist_review: 'Discovery',
    transfer: 'Apply',
    test: 'Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Watch an ice skater pull in their arms and suddenly spin incredibly fast!',
    predict: 'What happens to spin speed when a skater pulls their arms in?',
    play: 'Adjust arm position and angular momentum. See L = Iω in action!',
    review: 'When I decreases, ω must increase to keep L constant. That\'s conservation!',
    twist_predict: 'What if a spinning skater releases weights instead of pulling in?',
    twist_play: 'Released weights carry away angular momentum. The skater keeps their own L!',
    twist_review: 'System boundaries matter - L is conserved for the entire system.',
    transfer: 'From figure skating to neutron stars, angular momentum shapes our universe.',
    test: 'Apply your understanding of moment of inertia and angular momentum!',
    mastery: 'You\'ve mastered rotational dynamics and conservation laws!',
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
      message: 'Moment of Inertia lesson started',
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

    // Predictions - correct answer is B (speed increases)
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction, correct: this.prediction === 'B' });
      return;
    }

    // Twist predictions - correct answer is A (speed stays same)
    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
      this.emitCoachEvent('prediction_made', { twistPrediction: this.twistPrediction, correct: this.twistPrediction === 'A' });
      return;
    }

    // Animation control
    if (id === 'toggle_spin') {
      this.isSpinning = !this.isSpinning;
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
    if (id === 'spinning') {
      this.isSpinning = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'arm_extension') {
      this.armExtension = value;
      return;
    }
    if (id === 'angular_momentum') {
      this.initialL = value;
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
   * PROTECTED: Calculate moment of inertia based on arm extension
   * I = I_body + m*r² for arms
   * Simplified: I scales from 1 (tucked) to 3 (extended)
   */
  private calculateMomentOfInertia(): number {
    return 1 + 2 * this.armExtension;
  }

  /**
   * PROTECTED: Calculate angular velocity from conservation of L
   * L = Iω is constant, so ω = L/I
   */
  private calculateOmega(): number {
    const I = this.calculateMomentOfInertia();
    return this.initialL / I;
  }

  /**
   * PROTECTED: Calculate rotational kinetic energy
   * KE = ½Iω²
   */
  private calculateRotationalKE(): number {
    const I = this.calculateMomentOfInertia();
    const omega = this.calculateOmega();
    return 0.5 * I * omega * omega;
  }

  update(deltaTime: number): void {
    if (!this.isSpinning) return;

    const omega = this.calculateOmega();
    this.angularVelocity = omega;
    this.rotation = (this.rotation + omega * 2 * (deltaTime / 1000) * 60) % 360;
  }

  private resetSimulation(): void {
    this.rotation = 0;
    this.armExtension = 0.5;
    this.initialL = 15;
    this.isSpinning = true;
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

  // --- SKATER VISUALIZATION ---

  private renderSkater(r: CommandRenderer, centerX: number, centerY: number, extension: number, rot: number, size: number = 200): void {
    const scale = size / 200;
    const armLength = 25 + extension * 40;
    const armAngle = 70 - extension * 60;

    // Ice surface
    r.ellipse(centerX, centerY + 80 * scale, 80 * scale, 15 * scale, { fill: colors.iceCyan, opacity: 0.3 });

    // Rotation trail
    r.ellipse(centerX, centerY + 60 * scale, 50 * scale, 12 * scale, {
      fill: 'none',
      stroke: colors.accent,
      strokeWidth: 2,
      strokeDasharray: '8 4',
      opacity: 0.3,
    });

    // Speed indicators around trail
    const intensity = Math.min(1, this.angularVelocity / 10);
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 + rot) * Math.PI / 180;
      const x = centerX + Math.cos(angle) * 45 * scale;
      const y = centerY + 60 * scale + Math.sin(angle) * 12 * scale;
      r.circle(x, y, (2 + intensity * 2) * scale, {
        fill: colors.accent,
        opacity: 0.3 + intensity * 0.5,
      });
    }

    // Skater body (simplified SVG-style rendering)
    const bodyRot = rot * 0.5;

    // Group transform would be nice but we'll calculate positions
    // Head
    r.circle(centerX, centerY - 55 * scale, 15 * scale, { fill: colors.skinTone, stroke: '#e0b090', strokeWidth: 2 });
    r.circle(centerX - 4 * scale, centerY - 58 * scale, 2 * scale, { fill: '#333' }); // Eyes
    r.circle(centerX + 4 * scale, centerY - 58 * scale, 2 * scale, { fill: '#333' });

    // Hair
    r.path(`M ${centerX - 12 * scale} ${centerY - 62 * scale} Q ${centerX - 15 * scale} ${centerY - 75 * scale} ${centerX} ${centerY - 72 * scale} Q ${centerX + 15 * scale} ${centerY - 75 * scale} ${centerX + 12 * scale} ${centerY - 62 * scale}`, {
      fill: '#8B4513',
    });

    // Torso
    r.polygon([
      { x: centerX - 15 * scale, y: centerY - 40 * scale },
      { x: centerX - 12 * scale, y: centerY - 10 * scale },
      { x: centerX + 12 * scale, y: centerY - 10 * scale },
      { x: centerX + 15 * scale, y: centerY - 40 * scale },
    ], { fill: colors.dressPink });

    // Skirt
    r.path(`M ${centerX - 15 * scale} ${centerY - 10 * scale} Q ${centerX - 25 * scale} ${centerY + 10 * scale} ${centerX - 30 * scale} ${centerY + 40 * scale} L ${centerX + 30 * scale} ${centerY + 40 * scale} Q ${centerX + 25 * scale} ${centerY + 10 * scale} ${centerX + 15 * scale} ${centerY - 10 * scale} Z`, {
      fill: colors.skirtPink,
    });

    // Arms (simplified - just rectangles at angles based on extension)
    const armW = 8 * scale;
    const armH = armLength * scale;

    // Left arm
    const leftArmAngle = -armAngle * Math.PI / 180;
    const leftArmEndX = centerX - Math.cos(leftArmAngle) * armH;
    const leftArmEndY = centerY - 25 * scale - Math.sin(leftArmAngle) * armH;
    r.line(centerX - 5 * scale, centerY - 25 * scale, leftArmEndX, leftArmEndY, { stroke: colors.skinTone, strokeWidth: armW });
    r.circle(leftArmEndX, leftArmEndY, 6 * scale, { fill: colors.skinTone }); // Hand

    // Right arm
    const rightArmAngle = armAngle * Math.PI / 180;
    const rightArmEndX = centerX + Math.cos(rightArmAngle) * armH;
    const rightArmEndY = centerY - 25 * scale - Math.sin(rightArmAngle) * armH;
    r.line(centerX + 5 * scale, centerY - 25 * scale, rightArmEndX, rightArmEndY, { stroke: colors.skinTone, strokeWidth: armW });
    r.circle(rightArmEndX, rightArmEndY, 6 * scale, { fill: colors.skinTone }); // Hand

    // Legs
    r.rect(centerX - 8 * scale, centerY + 35 * scale, 6 * scale, 35 * scale, { fill: colors.skinTone });
    r.rect(centerX + 2 * scale, centerY + 35 * scale, 6 * scale, 35 * scale, { fill: colors.skinTone });

    // Skates
    r.rect(centerX - 12 * scale, centerY + 68 * scale, 14 * scale, 6 * scale, { fill: '#f8f8f8', rx: 2 });
    r.rect(centerX - 2 * scale, centerY + 68 * scale, 14 * scale, 6 * scale, { fill: '#f8f8f8', rx: 2 });
    r.rect(centerX - 12 * scale, centerY + 73 * scale, 16 * scale, 2 * scale, { fill: '#c0c0c0' });
    r.rect(centerX - 2 * scale, centerY + 73 * scale, 16 * scale, 2 * scale, { fill: '#c0c0c0' });
  }

  // --- PHASE RENDERERS ---

  private renderHookPhase(r: CommandRenderer): void {
    // Premium badge
    r.rect(260, 30, 180, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.circle(280, 44, 4, { fill: colors.primary });
    r.text(350, 49, 'ROTATIONAL MECHANICS', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Main title
    r.text(350, 100, 'The Spinning Skater Mystery', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'How does moving arms change spin speed?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Card with skater
    r.rect(150, 160, 400, 230, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 20,
      opacity: 0.8,
    });

    this.renderSkater(r, 350, 280, 0.3, this.rotation, 180);

    r.text(350, 410, 'Watch an ice skater begin a slow spin,', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 430, 'then suddenly pull in their arms and spin incredibly fast!', {
      fill: colors.textPrimary,
      fontSize: 13,
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

    r.rect(100, 80, 500, 120, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 110, 'A spinning skater pulls their arms in close to their body.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 135, 'What happens to their spin speed?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Show two skaters: extended -> tucked
    this.renderSkater(r, 220, 160, 1, 0, 100);
    r.text(285, 170, '->', { fill: colors.angularCyan, fontSize: 24, textAnchor: 'middle' });
    this.renderSkater(r, 350, 160, 0, 0, 100);

    // Show feedback if prediction made
    if (this.prediction) {
      const isCorrect = this.prediction === 'B';
      r.rect(100, 340, 500, 70, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 365, isCorrect
        ? 'Correct! This happens because of conservation of angular momentum!'
        : 'Not quite. When arms are pulled in, spin speed increases significantly!',
        {
          fill: isCorrect ? colors.success : colors.danger,
          fontSize: 13,
          fontWeight: 'bold',
          textAnchor: 'middle',
        }
      );
      r.text(350, 390, 'L = Iω stays constant. When I decreases, ω must increase!', {
        fill: colors.textMuted,
        fontSize: 11,
        textAnchor: 'middle',
      });
    }
  }

  private renderPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Interactive Spin Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Skater display
    r.rect(80, 50, 350, 250, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderSkater(r, 255, 175, this.armExtension, this.rotation, 200);

    // Data panel
    r.rect(450, 50, 200, 250, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    const momentI = this.calculateMomentOfInertia();
    const omega = this.calculateOmega();

    r.text(550, 80, 'Physics Data', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });

    // Moment of inertia
    r.rect(465, 95, 170, 50, { fill: '#be185d30', rx: 8 });
    r.text(550, 115, 'Moment of Inertia (I)', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(550, 138, momentI.toFixed(2), { fill: colors.primary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Angular velocity
    r.rect(465, 155, 170, 50, { fill: '#0891b230', rx: 8 });
    r.text(550, 175, 'Angular Velocity (ω)', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(550, 198, omega.toFixed(2), { fill: colors.angularCyan, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Angular momentum
    r.rect(465, 215, 170, 50, { fill: '#05966930', rx: 8 });
    r.text(550, 235, 'L = Iω (constant!)', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(550, 258, this.initialL.toFixed(0), { fill: colors.success, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Key insight box
    r.rect(80, 320, 570, 70, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(365, 345, 'Key Insight: L = Iω is constant', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(365, 370, 'When you decrease I by pulling in arms, ω must increase to keep L the same!', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Moment of Inertia', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Moment of Inertia card
    r.rect(50, 70, 290, 150, { fill: '#be185d40', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'Moment of Inertia', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    const moiPoints = ['Rotational "mass" - resistance to spin', 'For point mass: I = mr²', 'Distance squared - doubling r quadruples I!', 'Mass far from axis = larger I'];
    moiPoints.forEach((point, i) => {
      r.text(70, 115 + i * 22, '• ' + point, { fill: colors.textSecondary, fontSize: 10 });
    });

    // Angular Momentum card
    r.rect(360, 70, 290, 150, { fill: '#0891b240', stroke: colors.angularCyan, rx: 16 });
    r.text(505, 95, 'Angular Momentum', { fill: colors.angularCyan, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    const angPoints = ['L = Iω (moment × velocity)', 'Conserved when no external torque', 'When I decreases, ω increases', 'When I increases, ω decreases'];
    angPoints.forEach((point, i) => {
      r.text(380, 115 + i * 22, '• ' + point, { fill: colors.textSecondary, fontSize: 10 });
    });

    // Math card
    r.rect(50, 240, 600, 100, { fill: '#05966940', stroke: colors.success, rx: 16 });
    r.text(350, 265, 'The Math', { fill: colors.success, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 295, 'Initial: L₁ = I₁ω₁ (arms extended)  |  Final: L₂ = I₂ω₂ (arms tucked)', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(350, 320, 'Conservation: L₁ = L₂ → If I₂ = I₁/3, then ω₂ = 3ω₁ (3x faster spin!)', { fill: colors.angularCyan, fontSize: 12, textAnchor: 'middle' });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist Challenge', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'A spinning skater is holding two heavy weights at arm\'s length.', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 145, 'While spinning, they let go of the weights, which fly away.', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 175, 'What happens to the skater\'s spin speed?', {
      fill: colors.warning,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Feedback
    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'A';
      r.rect(100, 340, 500, 70, {
        fill: isCorrect ? '#065f4620' : '#78350f20',
        stroke: isCorrect ? colors.success : colors.warning,
        rx: 12,
      });
      r.text(350, 365, isCorrect
        ? 'Surprising! The spin speed stays the same!'
        : 'Not quite. The spin speed actually stays the same!',
        {
          fill: isCorrect ? colors.success : colors.warning,
          fontSize: 13,
          fontWeight: 'bold',
          textAnchor: 'middle',
        }
      );
      r.text(350, 390, 'The weights carry away their share of angular momentum when released.', {
        fill: colors.textMuted,
        fontSize: 11,
        textAnchor: 'middle',
      });
    }
  }

  private renderTwistPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Releasing vs. Pulling In', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Pull arms in card
    r.rect(80, 60, 260, 180, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(210, 85, 'Pull Arms In', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.circle(210, 140, 30, { fill: colors.dressPink });
    r.circle(210, 110, 12, { fill: colors.skinTone });

    // Spin arrow getting faster
    r.path('M 250 140 A 40 40 0 0 1 210 180', { fill: 'none', stroke: colors.success, strokeWidth: 3 });
    r.text(260, 150, 'ω↑', { fill: colors.success, fontSize: 14, fontWeight: 'bold' });
    r.text(210, 220, 'Mass stays with skater', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(210, 235, 'L stays constant → ω increases', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });

    // Release weights card
    r.rect(360, 60, 260, 180, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(490, 85, 'Release Weights', { fill: colors.warning, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.circle(490, 140, 30, { fill: colors.dressPink });
    r.circle(490, 110, 12, { fill: colors.skinTone });

    // Flying weights
    r.circle(430, 120, 8, { fill: colors.textMuted });
    r.circle(550, 160, 8, { fill: colors.textMuted });
    r.line(438, 118, 420, 110, { stroke: colors.danger, strokeWidth: 2 });
    r.line(542, 162, 560, 170, { stroke: colors.danger, strokeWidth: 2 });

    // Spin arrow same size
    r.path('M 530 140 A 40 40 0 0 1 490 180', { fill: 'none', stroke: colors.warning, strokeWidth: 3 });
    r.text(540, 150, 'ω=', { fill: colors.warning, fontSize: 14, fontWeight: 'bold' });
    r.text(490, 220, 'Weights take L with them', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(490, 235, 'L splits → ω stays same', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });

    // Key difference box
    r.rect(80, 260, 540, 100, { fill: '#78350f30', stroke: colors.warning, rx: 16 });
    r.text(350, 285, 'The Key Difference:', { fill: colors.warning, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 315, 'Pulling in arms: Mass stays in system. Total L conserved → ω increases.', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(350, 340, 'Releasing weights: Weights carry away their L. Skater keeps their own L → ω same.', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 280, { fill: '#78350f30', stroke: colors.warning, rx: 16 });
    r.text(350, 115, 'System Boundaries Matter!', {
      fill: colors.warning,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 150, 'Angular momentum is conserved for the entire system.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 175, 'When you define what\'s in your system, that determines what happens:', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });

    const points = [
      { color: colors.primary, text: 'Closed system (arms pulled in): All L stays → ω increases' },
      { color: colors.warning, text: 'Open system (weights released): L is shared → each keeps own L' },
    ];
    points.forEach((point, i) => {
      r.text(150, 210 + i * 30, '• ' + point.text, { fill: point.color, fontSize: 12 });
    });

    r.text(350, 290, 'This principle explains why rockets work in space -', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 310, 'they "release" exhaust which carries momentum away!', {
      fill: colors.success,
      fontSize: 13,
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
      ? "Excellent! You've mastered moment of inertia and angular momentum!"
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

    r.text(350, 130, 'Rotational Dynamics Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, 'You\'ve mastered moment of inertia and angular momentum!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'scale', label: 'Moment of Inertia' },
      { icon: 'rotate', label: 'Angular Momentum' },
      { icon: 'sparkle', label: 'Conservation Laws' },
      { icon: 'star', label: 'Stellar Spin-Up' },
    ];

    badges.forEach((badge, i) => {
      const x = 180 + (i % 2) * 170;
      const y = 200 + Math.floor(i / 2) * 80;
      r.rect(x, y, 150, 60, { fill: colors.bgCardLight, rx: 12 });
      r.text(x + 75, y + 25, badge.icon === 'scale' ? '⚖️' : badge.icon === 'rotate' ? '🔄' : badge.icon === 'sparkle' ? '💫' : '⭐', {
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
        r.addButton({ id: 'next', label: 'Discover the Secret', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Speed stays same', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Speed increases', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Speed decreases', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. Skater stops', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Explore the Physics', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'arm_extension', label: 'Arm Position', value: this.armExtension, min: 0, max: 1, step: 0.05 });
        r.addSlider({ id: 'angular_momentum', label: 'Angular Momentum L', value: this.initialL, min: 5, max: 25 });
        r.addButton({ id: 'toggle_spin', label: this.isSpinning ? 'Pause' : 'Play', variant: this.isSpinning ? 'danger' : 'success' });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Discover a Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Speed stays same', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Speed increases', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Speed decreases', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D. Skater stops', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See Why', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addButton({ id: 'next', label: 'Review Discovery', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real-World Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Skating', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Diving', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Stars', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Gyroscopes', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
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
      rotation: this.rotation,
      armExtension: this.armExtension,
      angularVelocity: this.angularVelocity,
      initialL: this.initialL,
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
    this.rotation = (state.rotation as number) || 0;
    this.armExtension = (state.armExtension as number) || 0.5;
    this.angularVelocity = (state.angularVelocity as number) || 3;
    this.initialL = (state.initialL as number) || 15;
    this.isSpinning = (state.isSpinning as boolean) ?? true;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===
export function createMomentOfInertiaGame(sessionId: string): MomentOfInertiaGame {
  return new MomentOfInertiaGame(sessionId);
}
