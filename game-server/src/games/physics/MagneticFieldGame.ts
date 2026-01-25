/**
 * Magnetic Field Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Biot-Savart Law: B = μ₀I/(2πr) for straight wire
 * - Solenoid field: B = μ₀nI (n = turns per length)
 * - Lorentz force: F = qv × B (cross product)
 * - Force on wire: F = BIL sin(θ)
 * - Right-hand rule for field direction
 * - Permeability of free space: μ₀ = 4π × 10⁻⁷ T·m/A
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
    question: 'Which way does a compass needle point relative to a current-carrying wire?',
    options: ['Toward the wire', 'Away from the wire', 'Tangent to circles around the wire', 'Parallel to the wire'],
    correctIndex: 2,
  },
  {
    question: 'If you double the current in an electromagnet, the magnetic field strength:',
    options: ['Stays the same', 'Doubles', 'Quadruples', 'Halves'],
    correctIndex: 1,
  },
  {
    question: 'A proton moves through a magnetic field. The force on it is:',
    options: ['Parallel to B', 'Opposite to B', 'Perpendicular to both v and B', 'Backward, opposing motion'],
    correctIndex: 2,
  },
  {
    question: 'A charged particle enters a uniform B field perpendicular to field lines. It follows:',
    options: ['A straight line', 'A circular arc', 'A parabola', 'A spiral that loses energy'],
    correctIndex: 1,
  },
  {
    question: 'Two parallel wires carry current in the same direction. They:',
    options: ['Repel each other', 'Attract each other', 'Have no interaction', 'Oscillate back and forth'],
    correctIndex: 1,
  },
  {
    question: 'A tightly wound coil of wire carrying current is called a:',
    options: ['Capacitor', 'Solenoid', 'Transformer', 'Diode'],
    correctIndex: 1,
  },
  {
    question: 'The force on an electron moving at 10^7 m/s in a 0.5 T field at 90 degrees is about:',
    options: ['8 × 10⁻¹³ N', '8 × 10⁻¹⁹ N', '1.6 × 10⁻¹⁹ N', '5 × 10⁶ N'],
    correctIndex: 0,
  },
  {
    question: 'Earth acts like a giant bar magnet because of:',
    options: ['Electric fields in the crust', 'Convection currents in the molten core', 'Stronger gravity in the north', 'Electrostatic attraction'],
    correctIndex: 1,
  },
  {
    question: 'A charged particle moving parallel to a magnetic field experiences:',
    options: ['Maximum force', 'Zero force', 'Half the maximum force', 'Force depending on charge sign'],
    correctIndex: 1,
  },
  {
    question: 'An MRI field is about how many times stronger than Earth\'s field?',
    options: ['30 times', '3,000 times', '30,000 to 60,000 times', 'About the same'],
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
  wireRed: '#ef4444',
  fieldBlue: '#3b82f6',
  forceYellow: '#f59e0b',
  velocityGreen: '#22c55e',
  chargeRed: '#ef4444',
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
    title: 'MRI Medical Imaging',
    icon: 'mri',
    description: 'Uses powerful magnetic fields to align hydrogen atoms in the body, then detects signals as they return to equilibrium.',
    details: 'Superconducting coils create uniform fields 30,000+ times stronger than Earth\'s. B = μ₀nI for the solenoid coils allows precise field control.',
  },
  {
    title: 'Maglev Trains',
    icon: 'train',
    description: 'Float above tracks using magnetic repulsion, eliminating friction and enabling speeds over 600 km/h.',
    details: 'The Lorentz force on induced currents creates levitation. F = BIL provides both lift and propulsion without physical contact.',
  },
  {
    title: 'Particle Accelerators',
    icon: 'accelerator',
    description: 'Use massive magnets to curve particle paths at near light speed, enabling fundamental physics discoveries.',
    details: 'F = qvB provides centripetal force to bend charged particles. The LHC uses 8.3 T dipole magnets cooled to 1.9 K.',
  },
  {
    title: 'Speakers & Microphones',
    icon: 'speaker',
    description: 'Convert between electrical signals and sound using the force on a current-carrying coil in a magnetic field.',
    details: 'F = BIL moves the voice coil and speaker cone. Microphones work in reverse: cone motion induces current via Faraday\'s law.',
  },
];

// === MAIN GAME CLASS ===

export class MagneticFieldGame extends BaseGame {
  readonly gameType = 'magnetic_field';
  readonly gameTitle = 'Magnetic Fields';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private wireCurrent = 5; // Amperes
  private wireDistance = 0.05; // meters
  private chargeVelocity = 1000000; // m/s
  private fieldAngle = 90; // degrees
  private selectedDemo: 'wire' | 'force' = 'wire';
  private showFieldLines = true;
  private isAnimating = true;
  private animationTime = 0;

  // PROTECTED: Physics constants
  private readonly MU_0 = 4 * Math.PI * 1e-7; // Permeability of free space
  private readonly ELECTRON_CHARGE = 1.6e-19; // Coulombs

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
    hook: 'Compasses align with invisible force fields. What creates these fields?',
    predict: 'Think about the pattern of magnetic field lines around a current-carrying wire.',
    play: 'Adjust current and distance. Observe how the field changes using B = μ₀I/(2πr).',
    review: 'Field lines form concentric circles. The right-hand rule predicts direction!',
    twist_predict: 'Does a magnetic force do work on a moving charge? Think about the angle...',
    twist_play: 'The force is always perpendicular to velocity. What does this mean for energy?',
    twist_review: 'Magnetic forces change direction but not speed - perfect for beam steering!',
    transfer: 'From MRI machines to maglev trains, magnetic fields shape our technology.',
    test: 'Apply your understanding of magnetic fields and forces!',
    mastery: 'You\'ve mastered the physics of magnetic fields and forces!',
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
      message: 'Magnetic Fields lesson started',
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

    // Predictions - correct answer is C (concentric circles)
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction, correct: this.prediction === 'C' });
      return;
    }

    // Twist predictions - correct answer is B (zero work)
    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
      this.emitCoachEvent('prediction_made', { twistPrediction: this.twistPrediction, correct: this.twistPrediction === 'B' });
      return;
    }

    // Demo selector
    if (id === 'demo_wire') {
      this.selectedDemo = 'wire';
      return;
    }
    if (id === 'demo_force') {
      this.selectedDemo = 'force';
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
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'field_lines') {
      this.showFieldLines = value;
      return;
    }
    if (id === 'animation') {
      this.isAnimating = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'current') {
      this.wireCurrent = value;
      return;
    }
    if (id === 'distance') {
      this.wireDistance = value / 100; // Convert cm to m
      return;
    }
    if (id === 'angle') {
      this.fieldAngle = value;
      return;
    }
    if (id === 'velocity') {
      this.chargeVelocity = value;
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

  // === PHYSICS CALCULATIONS (PROTECTED - server only) ===

  /**
   * PROTECTED: Magnetic field from straight wire
   * B = μ₀I / (2πr)
   */
  private calculateWireField(current: number, distance: number): number {
    if (distance <= 0) return 0;
    return (this.MU_0 * current) / (2 * Math.PI * distance);
  }

  /**
   * PROTECTED: Lorentz force on moving charge
   * F = qvB sin(θ)
   */
  private calculateLorentzForce(velocity: number, field: number, angleDegrees: number): number {
    const angleRadians = angleDegrees * Math.PI / 180;
    return Math.abs(this.ELECTRON_CHARGE * velocity * field * Math.sin(angleRadians));
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;

    this.animationTime += deltaTime / 1000;
    if (this.animationTime > 2 * Math.PI) {
      this.animationTime -= 2 * Math.PI;
    }
  }

  private resetSimulation(): void {
    this.wireCurrent = 5;
    this.wireDistance = 0.05;
    this.fieldAngle = 90;
    this.isAnimating = true;
    this.animationTime = 0;
    this.selectedDemo = 'wire';
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
    r.circle(175, 0, 200, { fill: '#06b6d4', opacity: 0.03 });
    r.circle(525, 500, 200, { fill: '#3b82f6', opacity: 0.03 });
  }

  // --- WIRE FIELD VISUALIZATION ---

  private renderWireField(r: CommandRenderer, centerX: number, centerY: number, size: number): void {
    const scale = size / 200;

    // Calculate field strength
    const fieldStrength = this.calculateWireField(this.wireCurrent, this.wireDistance);
    const fieldMicroTesla = fieldStrength * 1e6;

    // Wire cross-section (current into page)
    r.circle(centerX, centerY, 15 * scale, { fill: colors.wireRed, stroke: '#fca5a5', strokeWidth: 2 });
    r.text(centerX, centerY + 5 * scale, '⊗', { fill: colors.textPrimary, fontSize: 14 * scale, textAnchor: 'middle' });

    // Concentric field lines
    if (this.showFieldLines) {
      const rings = [30, 50, 70, 90, 110];
      rings.forEach((radius, i) => {
        const lineRadius = radius * scale;
        const fieldFactor = 1 / (radius / 30);

        r.circle(centerX, centerY, lineRadius, {
          fill: 'none',
          stroke: colors.fieldBlue,
          strokeWidth: 1.5 * fieldFactor,
          strokeDasharray: radius > 70 ? '8 4' : 'none',
          opacity: 0.5 + 0.3 * fieldFactor,
        });

        // Direction arrows (clockwise for current into page)
        const arrowAngles = [0, 90, 180, 270];
        arrowAngles.forEach(angle => {
          const animAngle = angle + this.animationTime * 50;
          const rad = animAngle * Math.PI / 180;
          const ax = centerX + Math.cos(rad) * lineRadius;
          const ay = centerY + Math.sin(rad) * lineRadius;

          r.group(`translate(${ax}, ${ay}) rotate(${animAngle + 90})`, (g) => {
            g.polygon([{ x: -4, y: 0 }, { x: 4, y: 0 }, { x: 0, y: -6 }], { fill: colors.fieldBlue });
          });
        });
      });
    }

    // Test point showing field value
    const testX = centerX + this.wireDistance * 1500 * scale;
    r.circle(testX, centerY, 6 * scale, { fill: colors.success });
    r.text(testX, centerY - 15 * scale, `B = ${fieldMicroTesla.toFixed(1)} μT`, {
      fill: colors.success,
      fontSize: 10 * scale,
      textAnchor: 'middle',
    });

    // Distance label
    r.line(centerX + 20 * scale, centerY + 30 * scale, testX, centerY + 30 * scale, {
      stroke: colors.textMuted,
      strokeWidth: 1,
      strokeDasharray: '4 2',
    });
    r.text((centerX + testX) / 2, centerY + 45 * scale, `r = ${(this.wireDistance * 100).toFixed(1)} cm`, {
      fill: colors.textMuted,
      fontSize: 10 * scale,
      textAnchor: 'middle',
    });

    // Formula
    r.rect(centerX - 70 * scale, centerY + 80 * scale, 140 * scale, 28 * scale, {
      fill: colors.bgCard,
      rx: 4,
    });
    r.text(centerX, centerY + 98 * scale, 'B = μ₀I / (2πr)', {
      fill: colors.textPrimary,
      fontSize: 12 * scale,
      textAnchor: 'middle',
      fontFamily: 'monospace',
    });
  }

  // --- LORENTZ FORCE VISUALIZATION ---

  private renderLorentzForce(r: CommandRenderer, centerX: number, centerY: number, size: number): void {
    const scale = size / 200;

    // Background field (B into page - grid of crosses)
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const x = centerX - 80 * scale + col * 40 * scale;
        const y = centerY - 60 * scale + row * 35 * scale;
        r.circle(x, y, 8 * scale, { fill: colors.bgCardLight, stroke: colors.fieldBlue, strokeWidth: 1 });
        r.text(x, y + 4 * scale, '⊗', { fill: colors.fieldBlue, fontSize: 10 * scale, textAnchor: 'middle' });
      }
    }

    // Calculate force
    const field = this.calculateWireField(10, 0.01); // Approximate field for demo
    const force = this.calculateLorentzForce(this.chargeVelocity, field, this.fieldAngle);

    // Moving charge
    r.circle(centerX, centerY, 12 * scale, { fill: colors.chargeRed, stroke: '#fca5a5', strokeWidth: 2 });
    r.text(centerX, centerY + 4 * scale, '+', { fill: colors.textPrimary, fontSize: 12 * scale, textAnchor: 'middle' });

    // Velocity vector (horizontal, to the right)
    r.line(centerX - 50 * scale, centerY, centerX + 50 * scale, centerY, {
      stroke: colors.velocityGreen,
      strokeWidth: 3,
    });
    r.polygon([
      { x: centerX + 50 * scale, y: centerY },
      { x: centerX + 40 * scale, y: centerY - 8 * scale },
      { x: centerX + 40 * scale, y: centerY + 8 * scale },
    ], { fill: colors.velocityGreen });
    r.text(centerX, centerY + 20 * scale, 'v (velocity)', { fill: colors.velocityGreen, fontSize: 10 * scale, textAnchor: 'middle' });

    // Force vector (upward, perpendicular to v and B)
    if (this.fieldAngle > 0) {
      const forceMag = 50 * scale * Math.sin(this.fieldAngle * Math.PI / 180);
      r.line(centerX, centerY - 15 * scale, centerX, centerY - 15 * scale - forceMag, {
        stroke: colors.forceYellow,
        strokeWidth: 3,
      });
      r.polygon([
        { x: centerX, y: centerY - 15 * scale - forceMag },
        { x: centerX - 8 * scale, y: centerY - 5 * scale - forceMag },
        { x: centerX + 8 * scale, y: centerY - 5 * scale - forceMag },
      ], { fill: colors.forceYellow });
      r.text(centerX, centerY - 25 * scale - forceMag, 'F (force)', { fill: colors.forceYellow, fontSize: 10 * scale, textAnchor: 'middle' });
    }

    // Formula and value
    r.rect(centerX - 90 * scale, centerY + 60 * scale, 180 * scale, 45 * scale, { fill: colors.bgCard, rx: 4 });
    r.text(centerX, centerY + 78 * scale, 'F = qvB sin(θ)', {
      fill: colors.textPrimary,
      fontSize: 12 * scale,
      textAnchor: 'middle',
      fontFamily: 'monospace',
    });
    r.text(centerX, centerY + 95 * scale, `= ${force.toExponential(2)} N`, {
      fill: colors.textMuted,
      fontSize: 10 * scale,
      textAnchor: 'middle',
    });
  }

  // --- PHASE RENDERERS ---

  private renderHookPhase(r: CommandRenderer): void {
    // Premium badge
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.circle(295, 44, 4, { fill: colors.primary });
    r.text(350, 49, 'ELECTROMAGNETISM', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Main title
    r.text(350, 100, 'The Invisible Force Fields', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'What invisible force reaches through space?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Card with visualization
    r.rect(160, 160, 380, 220, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 20,
      opacity: 0.8,
    });

    // Bar magnet
    r.rect(280, 240, 60, 40, { fill: colors.danger, rx: 4 });
    r.rect(340, 240, 60, 40, { fill: colors.fieldBlue, rx: 4 });
    r.text(310, 265, 'N', { fill: colors.textPrimary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(370, 265, 'S', { fill: colors.textPrimary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Field lines
    r.path(`M 280 260 Q 230 200 400 260`, { fill: 'none', stroke: colors.fieldBlue, strokeWidth: 2, strokeDasharray: '4 2' });
    r.path(`M 280 260 Q 230 320 400 260`, { fill: 'none', stroke: colors.fieldBlue, strokeWidth: 2, strokeDasharray: '4 2' });

    // Compass
    r.circle(220, 220, 15, { fill: colors.bgCardLight, stroke: colors.textMuted, strokeWidth: 1 });
    r.line(214, 220, 226, 220, { stroke: colors.danger, strokeWidth: 3 });

    r.text(350, 350, 'Compasses reveal invisible field lines', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });

    r.text(350, 400, 'A compass needle always points north...', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 420, 'but bring a magnet close and it swings away!', {
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
    r.text(350, 110, 'A wire carries electric current straight up. A compass nearby deflects.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 135, 'What shape do the magnetic field lines around the wire have?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Show feedback if prediction made
    if (this.prediction) {
      const isCorrect = this.prediction === 'C';
      r.rect(100, 340, 500, 70, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 365, isCorrect
        ? 'Correct! Field lines form concentric circles around the wire!'
        : 'Not quite. The field lines form concentric circles around the wire.',
        {
          fill: isCorrect ? colors.success : colors.danger,
          fontSize: 13,
          fontWeight: 'bold',
          textAnchor: 'middle',
        }
      );
      r.text(350, 390, 'This is predicted by the Biot-Savart Law and the right-hand rule.', {
        fill: colors.textMuted,
        fontSize: 11,
        textAnchor: 'middle',
      });
    }
  }

  private renderPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Magnetic Field Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Demo area
    r.rect(80, 50, 320, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    if (this.selectedDemo === 'wire') {
      this.renderWireField(r, 240, 190, 220);
    } else {
      this.renderLorentzForce(r, 240, 190, 220);
    }

    // Stats panel
    r.rect(420, 50, 230, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    const fieldStrength = this.calculateWireField(this.wireCurrent, this.wireDistance);
    const fieldMicroTesla = fieldStrength * 1e6;

    r.text(535, 80, 'Physics Data', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    r.rect(440, 100, 190, 50, { fill: '#0c4a6e30', rx: 8 });
    r.text(535, 120, 'Current (I)', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(535, 140, `${this.wireCurrent.toFixed(1)} A`, {
      fill: colors.primary,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(440, 160, 190, 50, { fill: '#78350f30', rx: 8 });
    r.text(535, 180, 'Distance (r)', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(535, 200, `${(this.wireDistance * 100).toFixed(1)} cm`, {
      fill: colors.warning,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(440, 220, 190, 50, { fill: '#06533930', rx: 8 });
    r.text(535, 240, 'Field Strength (B)', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(535, 260, `${fieldMicroTesla.toFixed(1)} μT`, {
      fill: colors.success,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Key equations
    r.rect(80, 350, 570, 60, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(365, 375, 'Key Formula: B = μ₀I/(2πr)  |  F = qvB sin(θ)', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(365, 395, 'Field from wire decreases with distance. Force is perpendicular to both v and B.', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Magnetic Fields', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Sources card
    r.rect(50, 70, 290, 150, { fill: '#0c4a6e40', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'Sources of Magnetic Fields', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    const sources = ['Moving electric charges (currents)', 'Permanent magnets (aligned spins)', 'B = μ₀I/(2πr) for straight wire', 'Field lines form closed loops'];
    sources.forEach((line, i) => {
      r.text(70, 115 + i * 20, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    // Right-hand rule card
    r.rect(360, 70, 290, 150, { fill: '#7f1d1d40', stroke: colors.danger, rx: 16 });
    r.text(505, 95, 'Right-Hand Rules', { fill: colors.danger, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    const rules = ['Wire: Thumb = current, fingers curl = B', 'Force: Fingers = v, curl to B, thumb = F', 'Solenoid: Fingers curl with I, thumb = N', 'Works for positive charges'];
    rules.forEach((line, i) => {
      r.text(380, 115 + i * 20, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    // Lorentz force card
    r.rect(50, 240, 290, 130, { fill: '#78350f40', stroke: colors.warning, rx: 16 });
    r.text(195, 265, 'Lorentz Force', { fill: colors.warning, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    const lorentz = ['F = qv × B (cross product)', 'Force ⊥ to both v and B', 'Maximum when v ⊥ B', 'Zero when v ∥ B'];
    lorentz.forEach((line, i) => {
      r.text(70, 285 + i * 20, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    // Properties card
    r.rect(360, 240, 290, 130, { fill: '#06533940', stroke: colors.success, rx: 16 });
    r.text(505, 265, 'Field Properties', { fill: colors.success, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    const props = ['Measured in Tesla (1 T = 10,000 G)', 'Field lines never cross', 'Earth\'s field ≈ 50 μT', 'MRI fields ≈ 1.5-3 T'];
    props.forEach((line, i) => {
      r.text(380, 285 + i * 20, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist Challenge', {
      fill: colors.accent,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'A proton enters a magnetic field perpendicular to the field lines.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 145, 'The magnetic force curves its path into a circle.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 175, 'Does the magnetic field do any work on the proton?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Feedback
    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'B';
      r.rect(100, 340, 500, 70, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 365, isCorrect
        ? 'Correct! Magnetic forces never do work on charged particles!'
        : 'Not quite. Since F ⊥ v always, W = F·d = 0. No work is done!',
        {
          fill: isCorrect ? colors.success : colors.danger,
          fontSize: 13,
          fontWeight: 'bold',
          textAnchor: 'middle',
        }
      );
      r.text(350, 390, 'Speed stays constant; only direction changes!', {
        fill: colors.textMuted,
        fontSize: 11,
        textAnchor: 'middle',
      });
    }
  }

  private renderTwistPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Magnetic Forces Do No Work', {
      fill: colors.accent,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Circular motion diagram
    r.rect(80, 60, 260, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(210, 85, 'Circular Motion', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Draw circular path
    r.circle(210, 160, 50, { fill: 'none', stroke: colors.fieldBlue, strokeWidth: 2, strokeDasharray: '4 2' });

    // Charge on circle
    r.circle(260, 160, 10, { fill: colors.danger });
    r.text(260, 163, '+', { fill: colors.textPrimary, fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    // Velocity (tangent, upward)
    r.line(260, 160, 260, 120, { stroke: colors.velocityGreen, strokeWidth: 2 });
    r.polygon([{ x: 260, y: 120 }, { x: 255, y: 130 }, { x: 265, y: 130 }], { fill: colors.velocityGreen });
    r.text(275, 135, 'v', { fill: colors.velocityGreen, fontSize: 10 });

    // Force (toward center)
    r.line(260, 160, 220, 160, { stroke: colors.forceYellow, strokeWidth: 2 });
    r.polygon([{ x: 220, y: 160 }, { x: 230, y: 155 }, { x: 230, y: 165 }], { fill: colors.forceYellow });
    r.text(230, 175, 'F', { fill: colors.forceYellow, fontSize: 10 });

    r.text(210, 235, 'F ⊥ v always → W = 0', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });

    // Energy conservation
    r.rect(360, 60, 260, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(490, 85, 'Energy Conservation', { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(390, 110, 200, 30, { fill: colors.success, rx: 4 });
    r.text(490, 130, 'KE = ½mv² = constant', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });

    r.text(490, 170, 'Speed: CONSTANT', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(490, 200, 'Direction: CHANGES', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(490, 230, 'No work → No energy change', { fill: colors.success, fontSize: 11, textAnchor: 'middle' });

    // Importance box
    r.rect(80, 280, 540, 100, { fill: '#6b21a840', stroke: colors.accent, rx: 16 });
    r.text(350, 305, 'Why This Matters:', { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 330, 'Particle accelerators use magnets to steer beams without changing energy.', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 350, 'Mass spectrometers separate particles by mass/charge ratio, not energy.', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 370, 'Plasma confinement works because B fields don\'t drain thermal energy.', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', {
      fill: colors.accent,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 280, { fill: '#6b21a840', stroke: colors.accent, rx: 16 });
    r.text(350, 115, 'Magnetic Fields: Steering Without Speeding', {
      fill: colors.accent,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 150, 'The perpendicular nature of magnetic force gives it unique properties:', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });

    const properties = [
      'Can change direction without changing speed',
      'Perfect for beam steering and focusing',
      'Enables particle confinement (tokamaks, magnetic traps)',
      'Creates circular/helical motion naturally',
      'Separates particles by mass (mass spectrometry)',
    ];
    properties.forEach((prop, i) => {
      r.text(150, 185 + i * 28, '• ' + prop, { fill: colors.textSecondary, fontSize: 12 });
    });

    r.text(350, 340, 'This property is key to particle physics, fusion research, and medical imaging!', {
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
    r.text(350, 250, 'Physics Connection:', { fill: colors.primary, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 275, app.details, {
      fill: colors.textMuted,
      fontSize: 10,
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
      ? "Excellent! You've mastered magnetic fields!"
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

    r.text(350, 130, 'Magnetic Field Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, "You've mastered magnetic fields and forces!", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: '⭕', label: 'Circular Field Lines' },
      { icon: '✋', label: 'Right-Hand Rule' },
      { icon: '⚡', label: 'Lorentz Force' },
      { icon: '🔄', label: 'Circular Motion' },
    ];

    badges.forEach((badge, i) => {
      const x = 180 + (i % 2) * 170;
      const y = 200 + Math.floor(i / 2) * 80;
      r.rect(x, y, 150, 60, { fill: colors.bgCardLight, rx: 12 });
      r.text(x + 75, y + 25, badge.icon, { fill: colors.primary, fontSize: 18, textAnchor: 'middle' });
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
        r.addButton({ id: 'next', label: 'Explore the Magnetic Field', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Parallel to wire', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Radiate outward', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Concentric circles', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. Random pattern', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Explore the Physics', variant: 'success' });
        }
        break;

      case 'play':
        r.addButton({ id: 'demo_wire', label: 'Wire Field', variant: this.selectedDemo === 'wire' ? 'primary' : 'secondary' });
        r.addButton({ id: 'demo_force', label: 'Lorentz Force', variant: this.selectedDemo === 'force' ? 'primary' : 'secondary' });
        r.addSlider({ id: 'current', label: 'Current (A)', value: this.wireCurrent, min: 1, max: 20, step: 0.5 });
        r.addSlider({ id: 'distance', label: 'Distance (cm)', value: this.wireDistance * 100, min: 1, max: 20, step: 0.5 });
        r.addToggle({ id: 'field_lines', label: 'Field Lines', value: this.showFieldLines, onLabel: 'ON', offLabel: 'OFF' });
        r.addButton({ id: 'toggle_animation', label: this.isAnimating ? 'Pause' : 'Animate', variant: this.isAnimating ? 'danger' : 'success' });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Discover a Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Yes - force accelerates', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. No - force ⊥ motion', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Yes - gains KE', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D. Depends on field', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See Why It Matters', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addButton({ id: 'next', label: 'Review Discovery', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real-World Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'MRI', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Maglev', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Accelerators', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Speakers', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
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
      wireCurrent: this.wireCurrent,
      wireDistance: this.wireDistance,
      chargeVelocity: this.chargeVelocity,
      fieldAngle: this.fieldAngle,
      selectedDemo: this.selectedDemo,
      showFieldLines: this.showFieldLines,
      isAnimating: this.isAnimating,
      animationTime: this.animationTime,
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
    this.wireCurrent = (state.wireCurrent as number) || 5;
    this.wireDistance = (state.wireDistance as number) || 0.05;
    this.chargeVelocity = (state.chargeVelocity as number) || 1000000;
    this.fieldAngle = (state.fieldAngle as number) || 90;
    this.selectedDemo = (state.selectedDemo as 'wire' | 'force') || 'wire';
    this.showFieldLines = (state.showFieldLines as boolean) ?? true;
    this.isAnimating = (state.isAnimating as boolean) ?? true;
    this.animationTime = (state.animationTime as number) || 0;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===
export function createMagneticFieldGame(sessionId: string): MagneticFieldGame {
  return new MagneticFieldGame(sessionId);
}
