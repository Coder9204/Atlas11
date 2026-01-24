/**
 * Snell's Law Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Snell's Law: n1 * sin(theta1) = n2 * sin(theta2)
 * - Critical angle: theta_c = arcsin(n2/n1) when n1 > n2
 * - Total internal reflection conditions
 * - Refractive indices of various materials
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
    question: "What does Snell's Law describe?",
    options: [
      'The speed of light in a vacuum',
      'The relationship between incident and refracted angles',
      'How light reflects off mirrors',
      'The frequency of light waves',
    ],
    correctIndex: 1,
  },
  {
    question: 'If n1*sin(theta1) = n2*sin(theta2), and n2 > n1, what happens to theta2?',
    options: ['theta2 is larger than theta1', 'theta2 is smaller than theta1', 'theta2 equals theta1', 'theta2 becomes 90 deg'],
    correctIndex: 1,
  },
  {
    question: 'What is the critical angle?',
    options: [
      'The angle at which light travels fastest',
      'The angle above which total internal reflection occurs',
      'The angle at which colors separate',
      '45 degrees exactly',
    ],
    correctIndex: 1,
  },
  {
    question: 'Light travels from glass (n=1.5) to air (n=1.0). At 30 deg incidence, what is sin(theta2)?',
    options: ['0.5', '0.75', '1.0 (critical angle)', 'Greater than 1 (TIR)'],
    correctIndex: 1,
  },
  {
    question: 'Why is the ratio sin(theta1)/sin(theta2) constant for a given pair of media?',
    options: [
      'It depends on light color',
      'It equals the ratio of refractive indices n2/n1',
      'It changes with angle',
      'It is always 1.0',
    ],
    correctIndex: 1,
  },
  {
    question: 'When light enters water from air at 45 deg, why does it bend toward the normal?',
    options: [
      'Water pushes the light down',
      'Light speeds up in water',
      'Light slows down in water',
      'The light beam gets wider',
    ],
    correctIndex: 2,
  },
  {
    question: 'A scientist measures theta1=40 deg and theta2=25 deg for air-to-unknown material. What is n?',
    options: ['n = 1.0', 'n = 1.33', 'n = 1.52', 'n = 2.0'],
    correctIndex: 2,
  },
  {
    question: 'At what incident angle does NO refraction occur?',
    options: ['0 deg (perpendicular to surface)', '45 deg', '90 deg (parallel to surface)', 'Refraction always occurs'],
    correctIndex: 0,
  },
  {
    question: 'What happens when sin(theta2) would need to exceed 1.0?',
    options: [
      'The light disappears',
      'Total internal reflection occurs',
      'The light splits into colors',
      'The equation fails',
    ],
    correctIndex: 1,
  },
  {
    question: 'Which material pair has the largest critical angle?',
    options: [
      'Diamond to air (n: 2.42 to 1.0)',
      'Glass to air (n: 1.5 to 1.0)',
      'Water to air (n: 1.33 to 1.0)',
      'Acrylic to air (n: 1.49 to 1.0)',
    ],
    correctIndex: 2,
  },
];

// === PHYSICS CONSTANTS (PROTECTED) ===
const REFRACTIVE_INDICES: Record<string, number> = {
  air: 1.0,
  water: 1.333,
  glass: 1.52,
  diamond: 2.42,
  acrylic: 1.49,
};

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  accent: '#f59e0b',
  accentDark: '#d97706',
  warning: '#ef4444',
  success: '#10b981',
  danger: '#ef4444',
  bgDark: '#0f172a',
  bgCard: '#1e293b',
  bgCardLight: '#334155',
  border: '#475569',
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#64748b',
  laser: '#ef4444',
  laserGlow: 'rgba(239, 68, 68, 0.4)',
  air: 'rgba(148, 163, 184, 0.05)',
  water: 'rgba(56, 189, 248, 0.25)',
  glass: 'rgba(148, 163, 184, 0.35)',
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
    title: 'Optical Fiber Design',
    icon: 'fiber',
    description: "Snell's Law determines the critical angle for total internal reflection in fiber optics.",
    details: 'Core and cladding materials are chosen for optimal light trapping. Submarine cables carry 99% of international data using this principle!',
  },
  {
    title: 'Diamond Cutting',
    icon: 'diamond',
    description: "Diamond's high refractive index (2.42) creates a small critical angle (24.4 deg), maximizing brilliance.",
    details: 'Cuts are angled to maximize total internal reflection. Light bounces multiple times before exiting through the top!',
  },
  {
    title: 'Lens Design',
    icon: 'lens',
    description: "Snell's Law at curved surfaces determines focal length in cameras and telescopes.",
    details: 'Multiple lens elements compensate for chromatic aberration. Modern camera lenses use 10+ elements precisely calculated.',
  },
  {
    title: 'Underwater Optics',
    icon: 'underwater',
    description: "Flat masks create an air layer - Snell's Law at water-air-eye interfaces.",
    details: 'Spearfishing requires mental compensation for apparent fish position. Underwater camera housings use dome ports to minimize distortion.',
  },
];

// === MAIN GAME CLASS ===

export class SnellsLawGame extends BaseGame {
  readonly gameType = 'snells_law';
  readonly gameTitle = "Snell's Law";

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private incidentAngle = 45;
  private topMedium: 'air' | 'water' | 'glass' | 'acrylic' = 'air';
  private bottomMedium: 'air' | 'water' | 'glass' | 'acrylic' = 'water';
  private showProtractor = true;
  private reverseDirection = false;
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
    hook: 'Why does a straw look bent in water? Light bends when it crosses between materials!',
    predict: 'Think about what happens when light enters a denser medium...',
    play: 'Use the protractor to measure incident and refracted angles. Can you find a pattern?',
    review: "Snell's Law: n1 * sin(theta1) = n2 * sin(theta2). The ratio of sines equals the ratio of refractive indices!",
    twist_predict: 'What happens when light goes from glass to air at a steep angle?',
    twist_play: 'Find the critical angle! Beyond it, all light reflects back.',
    twist_review: 'Total internal reflection is the basis of fiber optics and diamond brilliance.',
    transfer: "From fiber optics to diamond cutting, Snell's Law shapes technology.",
    test: 'Test your understanding of light refraction!',
    mastery: "You now understand how light bends at boundaries - Snell's Law in action!",
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
      message: "Snell's Law lesson started",
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

    if (id.startsWith('medium_top_')) {
      this.topMedium = id.replace('medium_top_', '') as typeof this.topMedium;
      return;
    }
    if (id.startsWith('medium_bottom_')) {
      this.bottomMedium = id.replace('medium_bottom_', '') as typeof this.bottomMedium;
      return;
    }
    if (id === 'toggle_direction') {
      this.reverseDirection = !this.reverseDirection;
      return;
    }
    if (id === 'reset') {
      this.resetSimulation();
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'protractor') {
      this.showProtractor = value;
      return;
    }
    if (id === 'reverse') {
      this.reverseDirection = value;
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

  // === PHYSICS CALCULATIONS (PROTECTED - runs on server only) ===

  private getN1(): number {
    return this.reverseDirection
      ? REFRACTIVE_INDICES[this.bottomMedium]
      : REFRACTIVE_INDICES[this.topMedium];
  }

  private getN2(): number {
    return this.reverseDirection
      ? REFRACTIVE_INDICES[this.topMedium]
      : REFRACTIVE_INDICES[this.bottomMedium];
  }

  /**
   * PROTECTED: Snell's Law calculation
   * n1 * sin(theta1) = n2 * sin(theta2)
   * Returns refracted angle and whether TIR occurs
   */
  private calculateRefractedAngle(theta1: number): { angle: number; isTIR: boolean } {
    const theta1Rad = (theta1 * Math.PI) / 180;
    const n1 = this.getN1();
    const n2 = this.getN2();
    const sinTheta2 = (n1 * Math.sin(theta1Rad)) / n2;

    if (Math.abs(sinTheta2) > 1) {
      // Total internal reflection
      return { angle: theta1, isTIR: true };
    }

    const theta2Rad = Math.asin(sinTheta2);
    return { angle: (theta2Rad * 180) / Math.PI, isTIR: false };
  }

  /**
   * PROTECTED: Critical angle calculation
   * theta_c = arcsin(n2/n1) when n1 > n2
   */
  private calculateCriticalAngle(): number | null {
    const n1 = this.getN1();
    const n2 = this.getN2();
    if (n1 <= n2) return null; // No critical angle when going to denser medium
    const sinCritical = n2 / n1;
    return (Math.asin(sinCritical) * 180) / Math.PI;
  }

  update(deltaTime: number): void {
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;
    this.time += deltaTime / 1000;
  }

  private resetSimulation(): void {
    this.incidentAngle = 45;
    this.time = 0;
    if (this.phase === 'twist_play') {
      // Set up for TIR demonstration
      this.topMedium = 'glass';
      this.bottomMedium = 'air';
      this.reverseDirection = false;
    } else {
      this.topMedium = 'air';
      this.bottomMedium = 'water';
      this.reverseDirection = false;
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
    r.linearGradient('labBg', [
      { offset: '0%', color: '#0f172a' },
      { offset: '50%', color: '#0a0f1a' },
      { offset: '100%', color: '#0f172a' },
    ]);
    r.circle(175, 0, 200, { fill: colors.primary, opacity: 0.03 });
    r.circle(525, 500, 200, { fill: colors.accent, opacity: 0.03 });
  }

  private renderRefractionDiagram(r: CommandRenderer, centerX: number, centerY: number, size: number = 300): void {
    const refractedResult = this.calculateRefractedAngle(this.incidentAngle);
    const criticalAngle = this.calculateCriticalAngle();
    const rayLength = size * 0.4;

    // Medium colors
    const topColor = colors.air;
    const bottomColor = this.bottomMedium === 'water' ? colors.water : colors.glass;

    // Top medium
    r.rect(centerX - size / 2, centerY - size / 2, size, size / 2, { fill: topColor });
    r.text(centerX - size / 2 + 10, centerY - size / 2 + 20, `${this.topMedium.toUpperCase()} (n=${REFRACTIVE_INDICES[this.topMedium].toFixed(2)})`, {
      fill: colors.textMuted,
      fontSize: 11,
    });

    // Bottom medium
    r.rect(centerX - size / 2, centerY, size, size / 2, { fill: bottomColor });
    r.text(centerX - size / 2 + 10, centerY + size / 2 - 10, `${this.bottomMedium.toUpperCase()} (n=${REFRACTIVE_INDICES[this.bottomMedium].toFixed(2)})`, {
      fill: colors.textMuted,
      fontSize: 11,
    });

    // Interface line
    r.line(centerX - size / 2, centerY, centerX + size / 2, centerY, {
      stroke: 'rgba(255, 255, 255, 0.5)',
      strokeWidth: 2,
    });

    // Normal line (dashed)
    r.line(centerX, centerY - rayLength - 20, centerX, centerY + rayLength + 20, {
      stroke: 'rgba(255, 255, 255, 0.3)',
      strokeWidth: 1,
      strokeDasharray: '6 4',
    });
    r.text(centerX + 5, centerY - rayLength - 25, 'Normal', { fill: colors.textMuted, fontSize: 10 });

    // Calculate ray endpoints
    const incidentRad = (this.incidentAngle * Math.PI) / 180;
    const refractedRad = (refractedResult.angle * Math.PI) / 180;

    // Incident ray (coming from top-left toward center)
    const incidentStartX = centerX - Math.sin(incidentRad) * rayLength;
    const incidentStartY = centerY - Math.cos(incidentRad) * rayLength;

    r.line(incidentStartX, incidentStartY, centerX, centerY, {
      stroke: colors.laser,
      strokeWidth: 3,
    });

    // Refracted or reflected ray
    if (refractedResult.isTIR) {
      // Total internal reflection - mirror the incident ray
      const reflectedEndX = centerX + Math.sin(incidentRad) * rayLength;
      const reflectedEndY = centerY - Math.cos(incidentRad) * rayLength;
      r.line(centerX, centerY, reflectedEndX, reflectedEndY, {
        stroke: colors.laser,
        strokeWidth: 3,
      });
      r.text(centerX + 50, centerY - 30, 'TIR!', { fill: colors.warning, fontSize: 14, fontWeight: 'bold' });
    } else {
      // Refracted ray
      const refractedEndX = centerX + Math.sin(refractedRad) * rayLength;
      const refractedEndY = centerY + Math.cos(refractedRad) * rayLength;
      r.line(centerX, centerY, refractedEndX, refractedEndY, {
        stroke: colors.laser,
        strokeWidth: 3,
      });
    }

    // Protractor overlay
    if (this.showProtractor) {
      // Arc for incident angle
      r.path(this.describeArc(centerX, centerY, 40, 270, 270 + this.incidentAngle), {
        fill: 'none',
        stroke: colors.primary,
        strokeWidth: 2,
      });
      r.text(centerX - 60, centerY - 25, `${this.incidentAngle.toFixed(0)} deg`, { fill: colors.primary, fontSize: 12, fontWeight: 'bold' });

      if (!refractedResult.isTIR) {
        // Arc for refracted angle
        r.path(this.describeArc(centerX, centerY, 50, 90 - refractedResult.angle, 90), {
          fill: 'none',
          stroke: colors.success,
          strokeWidth: 2,
        });
        r.text(centerX + 40, centerY + 40, `${refractedResult.angle.toFixed(1)} deg`, { fill: colors.success, fontSize: 12, fontWeight: 'bold' });
      }
    }

    // Critical angle indicator
    if (criticalAngle !== null && this.phase === 'twist_play') {
      r.text(centerX + size / 2 - 80, centerY - 10, `Critical: ${criticalAngle.toFixed(1)} deg`, {
        fill: colors.warning,
        fontSize: 11,
      });
    }
  }

  private describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
    const start = this.polarToCartesian(cx, cy, radius, endAngle);
    const end = this.polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  }

  private polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number): { x: number; y: number } {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  private renderHookPhase(r: CommandRenderer): void {
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.circle(295, 44, 4, { fill: colors.primary });
    r.text(350, 49, 'OPTICS & REFRACTION', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, 'Bending Light', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, "Why does a straw look bent in water? That's refraction!", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.rect(160, 160, 380, 260, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 20,
      opacity: 0.8,
    });

    this.renderRefractionDiagram(r, 350, 290, 220);

    r.text(350, 420, 'Light bends when it crosses from one material to another!', {
      fill: colors.primary,
      fontSize: 13,
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

    r.rect(100, 80, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 115, 'A laser beam enters water from air at an angle.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'How does the refracted angle compare to the incident angle?', {
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
        ? 'Correct! Light bends toward the normal when entering a denser medium!'
        : 'Not quite. In denser media (higher n), light bends toward the normal.',
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
    r.text(350, 30, "Snell's Law Lab", {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Main diagram
    r.rect(80, 50, 350, 320, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderRefractionDiagram(r, 255, 210, 280);

    // Stats panel
    r.rect(450, 50, 200, 180, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    const refractedResult = this.calculateRefractedAngle(this.incidentAngle);
    const sinRatio = Math.sin(this.incidentAngle * Math.PI / 180) / Math.sin(refractedResult.angle * Math.PI / 180);

    r.text(550, 80, 'Measurements', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });

    r.text(470, 110, 'theta1:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(620, 110, `${this.incidentAngle.toFixed(0)} deg`, { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });

    r.text(470, 135, 'theta2:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(620, 135, refractedResult.isTIR ? 'TIR' : `${refractedResult.angle.toFixed(1)} deg`, {
      fill: refractedResult.isTIR ? colors.warning : colors.success,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'end',
    });

    r.text(470, 160, 'sin(theta1)/sin(theta2):', { fill: colors.textSecondary, fontSize: 11 });
    r.text(620, 180, refractedResult.isTIR ? '-' : sinRatio.toFixed(3), {
      fill: colors.accent,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'end',
    });

    r.text(470, 205, 'n2/n1:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(620, 205, (this.getN2() / this.getN1()).toFixed(3), {
      fill: colors.accent,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'end',
    });

    // Formula box
    r.rect(80, 390, 570, 50, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(365, 420, "Snell's Law: n1 * sin(theta1) = n2 * sin(theta2)", {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, "Understanding Snell's Law", {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 290, 160, { fill: '#4f46e540', stroke: colors.primary, rx: 16 });
    r.text(195, 95, "Snell's Law", { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const snellInfo = [
      'n1 * sin(theta1) = n2 * sin(theta2)',
      'n = refractive index of medium',
      'theta = angle from normal',
      'Higher n = light slows down & bends toward normal',
    ];
    snellInfo.forEach((line, i) => {
      r.text(70, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 160, { fill: '#78350f40', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Why Light Bends', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const bendInfo = [
      'Light travels slower in denser materials',
      "Like a car's wheels hitting sand",
      'One side slows first, causing a turn',
      "Huygens' principle explains the wavefront",
    ];
    bendInfo.forEach((line, i) => {
      r.text(380, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(50, 250, 600, 80, { fill: '#06533940', stroke: colors.success, rx: 16 });
    r.text(350, 275, 'Key Insight', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 300, 'The ratio sin(theta1)/sin(theta2) is CONSTANT for any angle - it equals n2/n1!', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist Challenge', {
      fill: colors.accent,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 120, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'Light goes from glass (n=1.52) to air (n=1.0).', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 150, 'What happens at steep incident angles?', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 180, 'Try to predict what happens beyond 42 degrees!', {
      fill: colors.primary,
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
        ? 'Correct! Beyond the critical angle, all light reflects back - Total Internal Reflection!'
        : 'Not quite. When sin(theta2) would exceed 1, the light cannot escape - it reflects!',
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
    r.text(350, 30, 'Total Internal Reflection', {
      fill: colors.accent,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 350, 320, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderRefractionDiagram(r, 255, 210, 280);

    // Stats panel
    const criticalAngle = this.calculateCriticalAngle();
    const refractedResult = this.calculateRefractedAngle(this.incidentAngle);

    r.rect(450, 50, 200, 180, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    r.text(550, 80, 'TIR Analysis', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });

    r.text(470, 110, 'Critical angle:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(620, 110, criticalAngle ? `${criticalAngle.toFixed(1)} deg` : 'N/A', {
      fill: colors.warning,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'end',
    });

    r.text(470, 140, 'Current angle:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(620, 140, `${this.incidentAngle.toFixed(0)} deg`, {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'end',
    });

    r.text(470, 170, 'Status:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(620, 170, refractedResult.isTIR ? 'TOTAL REFLECTION' : 'Refraction', {
      fill: refractedResult.isTIR ? colors.warning : colors.success,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'end',
    });

    r.rect(450, 250, 200, 120, { fill: '#78350f30', stroke: colors.accent, rx: 12 });
    r.text(550, 275, 'Try This!', { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(550, 300, 'Increase angle past', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(550, 320, `${criticalAngle?.toFixed(0) || '?'} deg to see TIR!`, { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(550, 350, 'This is how fiber optics work!', { fill: colors.primary, fontSize: 11, textAnchor: 'middle' });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', {
      fill: colors.accent,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 250, { fill: '#78350f30', stroke: colors.accent, rx: 16 });
    r.text(350, 110, 'Total Internal Reflection', {
      fill: colors.accent,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const tirInfo = [
      { label: 'Critical angle:', value: 'theta_c = arcsin(n2/n1)' },
      { label: 'Occurs when:', value: 'Going from dense to less dense medium' },
      { label: 'Above theta_c:', value: 'ALL light reflects (0% transmitted)' },
      { label: 'Diamond:', value: 'theta_c = 24 deg (small = brilliant!)' },
      { label: 'Fiber optics:', value: 'Light bounces along the fiber' },
    ];

    tirInfo.forEach((item, i) => {
      r.text(180, 145 + i * 30, item.label, { fill: colors.textSecondary, fontSize: 13, fontWeight: 'bold' });
      r.text(370, 145 + i * 30, item.value, { fill: colors.textPrimary, fontSize: 13 });
    });

    r.text(350, 310, 'TIR is lossless reflection - perfect for fiber optics!', {
      fill: colors.success,
      fontSize: 14,
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

    r.text(350, 100, passed ? 'Excellent Work!' : 'Keep Learning!', {
      fill: passed ? colors.success : colors.accent,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 160, `Score: ${score} / ${testQuestions.length}`, {
      fill: colors.textPrimary,
      fontSize: 24,
      textAnchor: 'middle',
    });

    r.text(350, 200, passed ? "You've mastered Snell's Law!" : 'Review the material and try again.', {
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

    r.text(350, 130, 'Optics Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, "You've mastered Snell's Law and refraction!", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'n', label: 'Refractive Index' },
      { icon: 'TIR', label: 'Total Internal Reflection' },
      { icon: 'theta', label: 'Critical Angle' },
      { icon: 'fiber', label: 'Fiber Optics' },
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
        r.addButton({ id: 'next', label: 'Explore Refraction', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Refracted > incident', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Refracted < incident', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. They are equal', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. Light does not bend', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Measure the Angles', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'angle', label: 'Incident Angle', value: this.incidentAngle, min: 5, max: 85 });
        r.addToggle({ id: 'protractor', label: 'Protractor', value: this.showProtractor, onLabel: 'ON', offLabel: 'OFF' });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Discover a Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Light bends more', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Light escapes at 90 deg', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. All light reflects back', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Find Critical Angle', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({ id: 'angle', label: 'Incident Angle', value: this.incidentAngle, min: 5, max: 85 });
        r.addToggle({ id: 'protractor', label: 'Protractor', value: this.showProtractor, onLabel: 'ON', offLabel: 'OFF' });
        r.addButton({ id: 'next', label: 'Review Discovery', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real-World Applications', variant: 'primary' });
        break;

      case 'transfer':
        applications.forEach((_, i) => {
          r.addButton({ id: `app_${i}`, label: applications[i].title.split(' ')[0], variant: this.selectedApp === i ? 'primary' : 'ghost' });
        });
        if (this.completedApps.every((c) => c)) {
          r.addButton({ id: 'next', label: 'Take Knowledge Test', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= testQuestions.length - 1 });
          testQuestions[this.testQuestion].options.forEach((_, i) => {
            r.addButton({ id: `answer_${i}`, label: String.fromCharCode(65 + i), variant: this.testAnswers[this.testQuestion] === i ? 'primary' : 'secondary' });
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
      incidentAngle: this.incidentAngle,
      topMedium: this.topMedium,
      bottomMedium: this.bottomMedium,
      showProtractor: this.showProtractor,
      reverseDirection: this.reverseDirection,
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
    this.topMedium = (state.topMedium as typeof this.topMedium) || 'air';
    this.bottomMedium = (state.bottomMedium as typeof this.bottomMedium) || 'water';
    this.showProtractor = (state.showProtractor as boolean) ?? true;
    this.reverseDirection = (state.reverseDirection as boolean) || false;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===

export function createSnellsLawGame(sessionId: string): SnellsLawGame {
  return new SnellsLawGame(sessionId);
}
