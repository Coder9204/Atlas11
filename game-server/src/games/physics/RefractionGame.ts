/**
 * Refraction Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Snell's Law: n₁sinθ₁ = n₂sinθ₂
 * - Critical angle calculations
 * - Total internal reflection
 * - Refractive indices for materials
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
    question: 'Snell\'s Law is written as:',
    options: ['n₁/n₂ = sinθ₂/sinθ₁', 'n₁sinθ₁ = n₂sinθ₂', 'n₁cosθ₁ = n₂cosθ₂', 'n₁θ₁ = n₂θ₂'],
    correctIndex: 1,
  },
  {
    question: 'Light bends toward the normal when entering a medium with:',
    options: ['Lower refractive index', 'Higher refractive index', 'Same refractive index', 'No relation'],
    correctIndex: 1,
  },
  {
    question: 'The refractive index of vacuum is:',
    options: ['0', '1', '1.33', 'Infinity'],
    correctIndex: 1,
  },
  {
    question: 'Total internal reflection occurs when light goes from:',
    options: ['Low n to high n', 'High n to low n at large angles', 'Any medium at any angle', 'Only in diamonds'],
    correctIndex: 1,
  },
  {
    question: 'The critical angle for water (n=1.33) to air is approximately:',
    options: ['24°', '42°', '49°', '90°'],
    correctIndex: 2,
  },
  {
    question: 'Fiber optic cables work by:',
    options: ['Absorption', 'Diffraction', 'Total internal reflection', 'Refraction only'],
    correctIndex: 2,
  },
  {
    question: 'A straw appears bent in water because:',
    options: ['Water magnifies', 'Light refracts at air-water interface', 'The straw actually bends', 'Optical illusion'],
    correctIndex: 1,
  },
  {
    question: 'Diamond\'s high refractive index (n≈2.4) causes:',
    options: ['Less sparkle', 'More total internal reflection and sparkle', 'No special effects', 'Darker appearance'],
    correctIndex: 1,
  },
  {
    question: 'When light enters glass from air at 30° incidence, the refracted angle is:',
    options: ['Greater than 30°', 'Less than 30°', 'Exactly 30°', 'Cannot determine'],
    correctIndex: 1,
  },
  {
    question: 'The speed of light in a medium with n=2 is:',
    options: ['2c', 'c', 'c/2', 'Cannot determine'],
    correctIndex: 2,
  },
];

// === PROTECTED: Refractive indices ===
const refractiveIndices: Record<string, number> = {
  vacuum: 1.0,
  air: 1.0003,
  water: 1.33,
  glass: 1.52,
  diamond: 2.42,
  ice: 1.31,
  oil: 1.47,
};

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  accent: '#8b5cf6',
  accentDark: '#7c3aed',
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
  lightBeam: '#fef08a',
  lightBeamRefracted: '#06b6d4',
  medium1: '#1e3a5f20',
  medium2: '#06b6d420',
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
    title: 'Fiber Optics',
    icon: 'fiber',
    description: 'Data travels as light through glass fibers using total internal reflection.',
    details: 'Light bounces inside the fiber at angles above the critical angle, traveling miles without escaping.',
  },
  {
    title: 'Lenses & Eyeglasses',
    icon: 'glasses',
    description: 'Curved glass surfaces focus light by carefully controlled refraction.',
    details: 'Convex lenses converge light (farsightedness), concave lenses diverge light (nearsightedness).',
  },
  {
    title: 'Diamond Sparkle',
    icon: 'diamond',
    description: 'Diamond\'s high refractive index creates brilliance and fire.',
    details: 'Small critical angle means light bounces inside many times before exiting, creating intense sparkle.',
  },
  {
    title: 'Mirages',
    icon: 'mirage',
    description: 'Hot air near roads has lower density, causing light to curve.',
    details: 'Gradual refraction in air layers creates the illusion of water on hot roads.',
  },
];

// === MAIN GAME CLASS ===

export class RefractionGame extends BaseGame {
  readonly gameType = 'refraction';
  readonly gameTitle = 'Refraction & Snell\'s Law';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private incidentAngle = 45; // degrees from normal
  private medium1 = 'air';
  private medium2 = 'water';
  private showNormal = true;
  private showAngles = true;
  private isAnimating = true;
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
    hook: 'Why does a straw look bent in water? The answer is refraction!',
    predict: 'When light goes from air into water, does it bend toward or away from the normal?',
    play: 'Adjust the angle and watch how light bends. Find the pattern!',
    review: 'Snell\'s Law: n₁sinθ₁ = n₂sinθ₂. Light bends toward the normal in denser media!',
    twist_predict: 'What happens at steep angles when going from water to air?',
    twist_play: 'Find the critical angle - where light can\'t escape!',
    twist_review: 'Total internal reflection - the basis of fiber optics!',
    transfer: 'Refraction powers fiber optics, lenses, and even creates mirages!',
    test: 'Time to test your understanding of refraction!',
    mastery: 'Congratulations! You\'ve mastered Snell\'s Law and refraction!',
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
      message: 'Refraction lesson started',
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

    if (id === 'reset') {
      this.resetSimulation();
      return;
    }

    // Medium selection
    if (id.startsWith('medium1_')) {
      this.medium1 = id.replace('medium1_', '');
      return;
    }
    if (id.startsWith('medium2_')) {
      this.medium2 = id.replace('medium2_', '');
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'normal') {
      this.showNormal = value;
      return;
    }
    if (id === 'angles') {
      this.showAngles = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'angle') {
      this.incidentAngle = value;
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
   * PROTECTED: Snell's Law calculation
   * n₁sinθ₁ = n₂sinθ₂
   * θ₂ = arcsin((n₁/n₂)sinθ₁)
   */
  private calculateRefractedAngle(): number | null {
    const n1 = refractiveIndices[this.medium1];
    const n2 = refractiveIndices[this.medium2];
    const theta1Rad = (this.incidentAngle * Math.PI) / 180;

    const sinTheta2 = (n1 / n2) * Math.sin(theta1Rad);

    // Check for total internal reflection
    if (Math.abs(sinTheta2) > 1) {
      return null; // TIR
    }

    return (Math.asin(sinTheta2) * 180) / Math.PI;
  }

  /**
   * PROTECTED: Critical angle calculation
   * θc = arcsin(n₂/n₁) where n₁ > n₂
   */
  private calculateCriticalAngle(): number | null {
    const n1 = refractiveIndices[this.medium1];
    const n2 = refractiveIndices[this.medium2];

    if (n1 <= n2) {
      return null; // No critical angle when going to denser medium
    }

    return (Math.asin(n2 / n1) * 180) / Math.PI;
  }

  /**
   * PROTECTED: Check for total internal reflection
   */
  private isTotalInternalReflection(): boolean {
    return this.calculateRefractedAngle() === null;
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;

    this.time += deltaTime / 1000;
  }

  private resetSimulation(): void {
    this.incidentAngle = 45;
    this.medium1 = 'air';
    this.medium2 = 'water';
    this.time = 0;
    this.isAnimating = true;
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

  private renderRefractionDiagram(r: CommandRenderer, centerX: number, centerY: number, scale: number = 1): void {
    const width = 300 * scale;
    const height = 200 * scale;

    // Medium 1 (top)
    r.rect(centerX - width / 2, centerY - height / 2, width, height / 2, {
      fill: colors.medium1,
      stroke: colors.border,
    });
    r.text(centerX - width / 2 + 10, centerY - height / 2 + 20, this.medium1.toUpperCase(), {
      fill: colors.textSecondary,
      fontSize: 10,
    });
    r.text(centerX - width / 2 + 10, centerY - height / 2 + 35, `n = ${refractiveIndices[this.medium1].toFixed(2)}`, {
      fill: colors.textMuted,
      fontSize: 9,
    });

    // Medium 2 (bottom)
    r.rect(centerX - width / 2, centerY, width, height / 2, {
      fill: colors.medium2,
      stroke: colors.border,
    });
    r.text(centerX - width / 2 + 10, centerY + 20, this.medium2.toUpperCase(), {
      fill: colors.textSecondary,
      fontSize: 10,
    });
    r.text(centerX - width / 2 + 10, centerY + 35, `n = ${refractiveIndices[this.medium2].toFixed(2)}`, {
      fill: colors.textMuted,
      fontSize: 9,
    });

    // Interface line
    r.line(centerX - width / 2, centerY, centerX + width / 2, centerY, {
      stroke: colors.textPrimary,
      strokeWidth: 2,
    });

    // Normal line (dashed vertical)
    if (this.showNormal) {
      r.line(centerX, centerY - height / 2 + 10, centerX, centerY + height / 2 - 10, {
        stroke: colors.textMuted,
        strokeWidth: 1,
        strokeDasharray: '5,5',
      });
      r.text(centerX + 5, centerY - height / 2 + 25, 'Normal', {
        fill: colors.textMuted,
        fontSize: 9,
      });
    }

    // Incident ray
    const incidentRad = (this.incidentAngle * Math.PI) / 180;
    const rayLength = 80 * scale;
    const incidentEndX = centerX - rayLength * Math.sin(incidentRad);
    const incidentEndY = centerY - rayLength * Math.cos(incidentRad);

    r.line(incidentEndX, incidentEndY, centerX, centerY, {
      stroke: colors.lightBeam,
      strokeWidth: 3,
    });

    // Arrow head on incident ray
    r.circle(centerX - 5 * Math.sin(incidentRad), centerY - 5 * Math.cos(incidentRad), 4, {
      fill: colors.lightBeam,
    });

    // Refracted or reflected ray
    const refractedAngle = this.calculateRefractedAngle();
    const isTIR = this.isTotalInternalReflection();

    if (isTIR) {
      // Total internal reflection - reflected ray
      const reflectEndX = centerX + rayLength * Math.sin(incidentRad);
      const reflectEndY = centerY - rayLength * Math.cos(incidentRad);

      r.line(centerX, centerY, reflectEndX, reflectEndY, {
        stroke: colors.danger,
        strokeWidth: 3,
      });
      r.text(centerX + 30, centerY - 30, 'TIR!', {
        fill: colors.danger,
        fontSize: 12,
        fontWeight: 'bold',
      });
    } else if (refractedAngle !== null) {
      // Refracted ray
      const refractedRad = (refractedAngle * Math.PI) / 180;
      const refractedEndX = centerX + rayLength * Math.sin(refractedRad);
      const refractedEndY = centerY + rayLength * Math.cos(refractedRad);

      r.line(centerX, centerY, refractedEndX, refractedEndY, {
        stroke: colors.lightBeamRefracted,
        strokeWidth: 3,
      });
    }

    // Angle labels
    if (this.showAngles) {
      r.text(centerX - 40, centerY - 50, `θ₁ = ${this.incidentAngle}°`, {
        fill: colors.lightBeam,
        fontSize: 11,
        fontWeight: 'bold',
      });

      if (!isTIR && refractedAngle !== null) {
        r.text(centerX + 20, centerY + 50, `θ₂ = ${refractedAngle.toFixed(1)}°`, {
          fill: colors.lightBeamRefracted,
          fontSize: 11,
          fontWeight: 'bold',
        });
      }
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

    r.text(350, 100, 'The Bent Straw', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'Why do things look distorted in water?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.rect(160, 160, 380, 220, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 20,
      opacity: 0.8,
    });

    this.renderRefractionDiagram(r, 350, 280, 1);

    r.text(350, 400, 'Light bends when crossing between materials...', {
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
    r.text(350, 115, 'Light travels from air (n=1) into water (n=1.33).', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'Does the light bend toward or away from the normal?', {
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
      r.text(350, 375, isCorrect
        ? 'Correct! Light bends toward the normal when entering a denser medium!'
        : 'Not quite. Light bends TOWARD the normal when entering denser media.',
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
    r.text(350, 30, 'Refraction Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 340, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderRefractionDiagram(r, 250, 190, 1.2);

    // Stats panel
    r.rect(440, 50, 210, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    const n1 = refractiveIndices[this.medium1];
    const n2 = refractiveIndices[this.medium2];
    const refractedAngle = this.calculateRefractedAngle();
    const criticalAngle = this.calculateCriticalAngle();

    r.text(545, 80, 'Snell\'s Law Data', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });

    r.rect(460, 100, 170, 50, { fill: '#3b82f630', rx: 8 });
    r.text(545, 120, 'n₁sinθ₁', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(545, 140, (n1 * Math.sin(this.incidentAngle * Math.PI / 180)).toFixed(3), {
      fill: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(460, 160, 170, 50, { fill: '#06b6d430', rx: 8 });
    r.text(545, 180, 'Refracted Angle', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(545, 200, refractedAngle !== null ? `${refractedAngle.toFixed(1)}°` : 'TIR', {
      fill: refractedAngle !== null ? colors.lightBeamRefracted : colors.danger,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (criticalAngle !== null) {
      r.rect(460, 220, 170, 50, { fill: '#eab30830', rx: 8 });
      r.text(545, 240, 'Critical Angle', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
      r.text(545, 260, `${criticalAngle.toFixed(1)}°`, {
        fill: colors.warning,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
    }

    r.rect(80, 350, 570, 60, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(365, 375, 'Snell\'s Law: n₁sinθ₁ = n₂sinθ₂', {
      fill: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Refraction', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 290, 150, { fill: '#3b82f640', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'Snell\'s Law', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const snellInfo = [
      'n₁sinθ₁ = n₂sinθ₂',
      'n = c/v (refractive index)',
      'Higher n → slower light → bends toward normal',
      'Lower n → faster light → bends away from normal',
    ];
    snellInfo.forEach((line, i) => {
      r.text(70, 120 + i * 25, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 150, { fill: '#8b5cf640', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Key Materials', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const matInfo = [
      'Vacuum/Air: n ≈ 1.00',
      'Water: n = 1.33',
      'Glass: n ≈ 1.5',
      'Diamond: n = 2.42',
    ];
    matInfo.forEach((line, i) => {
      r.text(380, 120 + i * 25, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(50, 240, 600, 80, { fill: '#15803d40', stroke: colors.success, rx: 16 });
    r.text(350, 265, 'The Speed Connection', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 290, 'Light slows down in denser media. The change in speed causes the bending!', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Critical Twist', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'Light travels from water (n=1.33) into air (n=1).', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 145, 'What happens at very large incident angles?', {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'C';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 375, isCorrect
        ? 'Correct! Total Internal Reflection - light can\'t escape!'
        : 'At large angles, light reflects back instead of refracting out!',
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
    // Set up for TIR demonstration
    this.medium1 = 'water';
    this.medium2 = 'air';

    r.text(350, 30, 'Total Internal Reflection Lab', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 540, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderRefractionDiagram(r, 350, 190, 1.4);

    const criticalAngle = this.calculateCriticalAngle();
    const isTIR = this.isTotalInternalReflection();

    r.rect(80, 350, 540, 60, { fill: isTIR ? '#dc262630' : '#eab30830', stroke: isTIR ? colors.danger : colors.warning, rx: 12 });
    r.text(350, 375, isTIR
      ? `Total Internal Reflection! Angle (${this.incidentAngle}°) > Critical Angle (${criticalAngle?.toFixed(1)}°)`
      : `Critical angle for water→air: ${criticalAngle?.toFixed(1)}° - increase angle to see TIR!`,
      {
        fill: isTIR ? colors.danger : colors.warning,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle',
      }
    );
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Total Internal Reflection', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'When Light Can\'t Escape', {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const explanation = [
      '• Only occurs going from higher to lower refractive index',
      '• Critical angle: θc = arcsin(n₂/n₁)',
      '• Above critical angle: ALL light reflects back',
      '• Basis of fiber optic technology!',
      '• Diamond\'s small θc (24°) creates brilliant sparkle',
    ];

    explanation.forEach((line, i) => {
      r.text(120, 150 + i * 28, line, { fill: colors.textSecondary, fontSize: 12 });
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

    r.text(350, 200, passed ? 'You\'ve mastered refraction!' : 'Review Snell\'s Law and try again.', {
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

    r.text(350, 130, 'Refraction Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, 'You\'ve mastered Snell\'s Law and refraction!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'n₁n₂', label: 'Snell\'s Law' },
      { icon: 'θc', label: 'Critical Angle' },
      { icon: 'TIR', label: 'Total Reflection' },
      { icon: '💎', label: 'Diamond Optics' },
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
        r.addButton({ id: 'next', label: 'Explore Refraction', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Toward normal', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Away from normal', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Straight through', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Test It', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'angle', label: 'Incident Angle', value: this.incidentAngle, min: 0, max: 89 });
        r.addToggle({ id: 'normal', label: 'Normal', value: this.showNormal, onLabel: 'ON', offLabel: 'OFF' });
        r.addToggle({ id: 'angles', label: 'Angles', value: this.showAngles, onLabel: 'ON', offLabel: 'OFF' });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Critical Angle Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Bends more', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Goes straight', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Total reflection', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See TIR', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({ id: 'angle', label: 'Incident Angle', value: this.incidentAngle, min: 0, max: 89 });
        r.addButton({ id: 'next', label: 'Understand TIR', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Fiber', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Lenses', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Diamond', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Mirages', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
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
      incidentAngle: this.incidentAngle,
      medium1: this.medium1,
      medium2: this.medium2,
      showNormal: this.showNormal,
      showAngles: this.showAngles,
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
    this.incidentAngle = (state.incidentAngle as number) || 45;
    this.medium1 = (state.medium1 as string) || 'air';
    this.medium2 = (state.medium2 as string) || 'water';
    this.showNormal = (state.showNormal as boolean) ?? true;
    this.showAngles = (state.showAngles as boolean) ?? true;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===

export function createRefractionGame(sessionId: string): RefractionGame {
  return new RefractionGame(sessionId);
}
