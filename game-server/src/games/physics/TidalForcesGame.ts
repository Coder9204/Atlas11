/**
 * Tidal Forces Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Tidal force formula: F_tidal ~ 1/r^3 (gradient of gravitational force)
 * - Differential gravity creates two bulges (near and far side)
 * - Tidal locking: rotation period = orbital period
 * - Spring/neap tides from Sun-Moon alignment
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
    question: 'Why are there TWO tidal bulges on Earth, not just one toward the Moon?',
    options: [
      'The Sun creates the second bulge',
      "Earth's rotation creates the second bulge",
      "Differential gravity: far side is pulled less than Earth's center",
      'The second bulge is actually much smaller',
    ],
    correctIndex: 2,
  },
  {
    question: 'What causes tidal forces?',
    options: [
      'The total gravitational pull of the Moon',
      'The DIFFERENCE in gravitational pull across an object',
      "Earth's magnetic field interaction with the Moon",
      "Water's special affinity for lunar radiation",
    ],
    correctIndex: 1,
  },
  {
    question: 'Why do we always see the same side of the Moon?',
    options: [
      "The Moon doesn't rotate",
      'The Moon is tidally locked - rotation period equals orbital period',
      'The other side is too dark to see',
      "Earth's atmosphere blocks the view",
    ],
    correctIndex: 1,
  },
  {
    question: 'Spring tides (highest tides) occur when:',
    options: [
      "It's springtime",
      'The Moon is closest to Earth',
      'Sun, Moon, and Earth align (new/full moon)',
      'Earth is closest to the Sun',
    ],
    correctIndex: 2,
  },
  {
    question: 'Tidal force varies with distance as:',
    options: ['1/r (linear)', '1/r^2 (inverse square)', '1/r^3 (inverse cube)', 'r^2 (quadratic)'],
    correctIndex: 2,
  },
  {
    question: 'Neap tides (weakest tides) occur when:',
    options: [
      'Moon is at first or third quarter (90 degrees from Sun)',
      'Moon is full',
      'Moon is new',
      'Earth is farthest from Sun',
    ],
    correctIndex: 0,
  },
  {
    question: "Why is Jupiter's moon Io so volcanically active?",
    options: [
      'It is very close to the Sun',
      'It has a radioactive core',
      'Tidal flexing from Jupiter heats its interior',
      'It collides with other moons frequently',
    ],
    correctIndex: 2,
  },
  {
    question: 'Earth days are getting longer because:',
    options: [
      "Earth is gaining mass from meteorites",
      'Tidal friction transfers angular momentum to the Moon',
      "The Sun's gravity is slowing Earth",
      'Climate change affects rotation',
    ],
    correctIndex: 1,
  },
  {
    question: 'Which body has more influence on Earth tides, Sun or Moon?',
    options: [
      'Sun (more massive)',
      'Moon (closer, tidal force ~ 1/r^3)',
      'They are exactly equal',
      'Neither - tides are from Earth rotation',
    ],
    correctIndex: 1,
  },
  {
    question: 'A tidal barrage generates electricity by:',
    options: [
      'Heating water with solar energy',
      'Using wave motion to spin turbines',
      'Harnessing predictable tidal flow through turbines',
      'Converting gravitational potential directly',
    ],
    correctIndex: 2,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#06b6d4',
  primaryDark: '#0891b2',
  accent: '#3b82f6',
  accentDark: '#2563eb',
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
  earth: '#22c55e',
  ocean: '#3b82f6',
  moon: '#9ca3af',
  bulge: '#60a5fa',
};

// === APPLICATION DATA ===
interface Application {
  title: string;
  icon: string;
  description: string;
}

const applications: Application[] = [
  {
    title: 'Tidal Energy',
    icon: 'bolt',
    description: 'Tidal barrages and turbines harvest energy from predictable tidal flow - twice daily!',
  },
  {
    title: 'Tidal Locking',
    icon: 'moon',
    description: "The Moon shows us only one face because tidal friction synchronized its rotation.",
  },
  {
    title: "Jupiter's Moon Io",
    icon: 'volcano',
    description: 'Intense tidal flexing from Jupiter heats Io interior, causing volcanic activity!',
  },
  {
    title: 'Navigation & Shipping',
    icon: 'ship',
    description: 'Accurate tide predictions are essential for ships entering harbors.',
  },
];

// === MAIN GAME CLASS ===

export class TidalForcesGame extends BaseGame {
  readonly gameType = 'tidal_forces';
  readonly gameTitle = 'Tidal Forces';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private moonAngle = 0;
  private showVectors = false;
  private showDifferential = false;
  private isAnimating = false;
  private time = 0;

  // Twist state - tidal locking
  private moonRotation = 0;
  private isTidallyLocked = true;

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
    hook: 'The Moon creates TWO tidal bulges - one toward it AND one on the opposite side!',
    predict: 'Why would there be a bulge on the side AWAY from the Moon?',
    play: 'Toggle the vectors to see how differential gravity creates two bulges.',
    review: 'Tidal force comes from the DIFFERENCE in gravity across Earth.',
    twist_predict: 'We always see the same side of the Moon. Why?',
    twist_play: 'Compare tidally locked vs not locked - watch the red marker!',
    twist_review: 'Tidal friction synchronized the Moon rotation with its orbit.',
    transfer: 'Tidal forces affect everything from energy to volcanos!',
    test: 'Test your understanding of tidal physics.',
    mastery: "You've mastered tidal forces!",
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
      message: 'Tidal Forces lesson started',
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

    // Predictions - correct answer is 'differential'
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }

    // Twist predictions - correct answer is 'locked'
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

    // App selection
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
    if (id === 'toggle_vectors') {
      this.showVectors = !this.showVectors;
      if (this.showVectors) this.showDifferential = false;
      return;
    }
    if (id === 'toggle_differential') {
      this.showDifferential = !this.showDifferential;
      if (this.showDifferential) this.showVectors = false;
      return;
    }
    if (id === 'set_locked') {
      this.isTidallyLocked = true;
      return;
    }
    if (id === 'set_unlocked') {
      this.isTidallyLocked = false;
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'vectors') {
      this.showVectors = value;
      if (value) this.showDifferential = false;
      return;
    }
    if (id === 'differential') {
      this.showDifferential = value;
      if (value) this.showVectors = false;
      return;
    }
    if (id === 'animation') {
      this.isAnimating = value;
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

    if (newPhase === 'play') {
      this.showVectors = false;
      this.showDifferential = false;
      this.moonAngle = 0;
      this.isAnimating = false;
    }
    if (newPhase === 'twist_play') {
      this.moonAngle = 0;
      this.moonRotation = 0;
      this.isTidallyLocked = true;
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

  /**
   * PROTECTED: Tidal force calculation
   * F_tidal ~ GMm/r^3 * d (where d is the diameter of the body)
   * Tidal force falls off as 1/r^3, not 1/r^2 like gravity
   */
  private calculateTidalForce(distance: number, mass: number, radius: number): number {
    const G = 6.674e-11;
    return (2 * G * mass * radius) / (distance * distance * distance);
  }

  /**
   * PROTECTED: Calculate differential gravity at near vs far side
   */
  private calculateDifferentialGravity(): { nearSide: number; center: number; farSide: number } {
    // Normalized values for visualization
    const nearSide = 1.03; // Strongest
    const center = 1.0;
    const farSide = 0.97; // Weakest
    return { nearSide, center, farSide };
  }

  update(deltaTime: number): void {
    if (!this.isAnimating && this.phase !== 'twist_play') return;

    this.time += deltaTime / 1000;

    // Update moon orbital position
    if (this.isAnimating || this.phase === 'twist_play') {
      this.moonAngle = (this.moonAngle + 0.02) % (Math.PI * 2);

      // Moon rotation for twist phase
      if (this.phase === 'twist_play') {
        if (this.isTidallyLocked) {
          this.moonRotation = this.moonAngle; // Same rate as orbit
        } else {
          this.moonRotation = (this.moonRotation + 0.08) % (Math.PI * 2); // Different rate
        }
      }
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

    // Space background with stars
    for (let i = 0; i < 50; i++) {
      const x = (i * 41) % 700;
      const y = (i * 23) % 500;
      r.circle(x, y, 0.5 + Math.random() * 0.5, {
        fill: colors.textPrimary,
        opacity: 0.2 + Math.random() * 0.3,
      });
    }

    // Ambient glow
    r.circle(175, 0, 200, { fill: colors.primary, opacity: 0.02 });
    r.circle(525, 500, 200, { fill: colors.accent, opacity: 0.02 });
  }

  private renderTidalScene(r: CommandRenderer, centerX: number, centerY: number, scale: number = 1): void {
    const earthRadius = 50 * scale;
    const moonDistance = 130 * scale;

    const moonX = centerX + Math.cos(this.moonAngle) * moonDistance;
    const moonY = centerY + Math.sin(this.moonAngle) * moonDistance * 0.3;

    // Orbital path
    r.ellipse(centerX, centerY, moonDistance, moonDistance * 0.3, {
      fill: 'none',
      stroke: colors.border,
      strokeWidth: 1,
      strokeDasharray: '5 5',
    });

    // Earth with tidal bulges
    const bulgeAngle = this.moonAngle;

    // Ocean bulges (ellipse stretched toward/away from Moon)
    r.group(`translate(${centerX}, ${centerY}) rotate(${(bulgeAngle * 180) / Math.PI})`, (g) => {
      g.ellipse(0, 0, earthRadius + 10 * scale, earthRadius - 5 * scale, {
        fill: colors.ocean,
        opacity: 0.4,
      });
    });

    // Earth solid
    r.circle(centerX, centerY, earthRadius, { fill: colors.earth });

    // Continents
    r.ellipse(centerX - 15 * scale, centerY - 10 * scale, 20 * scale, 15 * scale, { fill: '#16a34a' });
    r.ellipse(centerX + 15 * scale, centerY + 10 * scale, 15 * scale, 12 * scale, { fill: '#16a34a' });

    // Tidal bulge outline
    r.group(`translate(${centerX}, ${centerY}) rotate(${(bulgeAngle * 180) / Math.PI})`, (g) => {
      g.ellipse(0, 0, earthRadius + 10 * scale, earthRadius - 5 * scale, {
        fill: 'none',
        stroke: colors.bulge,
        strokeWidth: 3,
      });
    });

    // Gravity vectors
    if (this.showVectors) {
      // Near side - strongest
      const nearX = centerX + Math.cos(bulgeAngle) * (earthRadius - 10 * scale);
      const nearY = centerY + Math.sin(bulgeAngle) * (earthRadius - 10 * scale) * 0.3;
      r.line(nearX, nearY, nearX + Math.cos(bulgeAngle) * 40 * scale, nearY + Math.sin(bulgeAngle) * 40 * scale * 0.3, {
        stroke: colors.danger,
        strokeWidth: 3,
      });

      // Center
      r.line(centerX, centerY, centerX + Math.cos(bulgeAngle) * 25 * scale, centerY + Math.sin(bulgeAngle) * 25 * scale * 0.3, {
        stroke: colors.warning,
        strokeWidth: 3,
      });

      // Far side - weakest
      const farX = centerX - Math.cos(bulgeAngle) * (earthRadius - 10 * scale);
      const farY = centerY - Math.sin(bulgeAngle) * (earthRadius - 10 * scale) * 0.3;
      r.line(farX, farY, farX + Math.cos(bulgeAngle) * 15 * scale, farY + Math.sin(bulgeAngle) * 15 * scale * 0.3, {
        stroke: colors.success,
        strokeWidth: 3,
      });
    }

    // Differential vectors (net tidal force)
    if (this.showDifferential) {
      // Near side stretches toward Moon
      const nearX = centerX + Math.cos(bulgeAngle) * earthRadius;
      const nearY = centerY + Math.sin(bulgeAngle) * earthRadius * 0.3;
      r.line(nearX, nearY, nearX + Math.cos(bulgeAngle) * 20 * scale, nearY + Math.sin(bulgeAngle) * 20 * scale * 0.3, {
        stroke: colors.bulge,
        strokeWidth: 3,
      });

      // Far side stretches away
      const farX = centerX - Math.cos(bulgeAngle) * earthRadius;
      const farY = centerY - Math.sin(bulgeAngle) * earthRadius * 0.3;
      r.line(farX, farY, farX - Math.cos(bulgeAngle) * 20 * scale, farY - Math.sin(bulgeAngle) * 20 * scale * 0.3, {
        stroke: colors.bulge,
        strokeWidth: 3,
      });
    }

    // Moon
    r.circle(moonX, moonY, 15 * scale, { fill: colors.moon });
    r.circle(moonX - 3 * scale, moonY - 4 * scale, 3 * scale, { fill: '#6b7280' });
    r.circle(moonX + 5 * scale, moonY + 2 * scale, 2 * scale, { fill: '#6b7280' });
    r.text(moonX, moonY + 25 * scale, 'Moon', {
      fill: colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle',
    });
  }

  private renderTwistScene(r: CommandRenderer, centerX: number, centerY: number): void {
    const earthRadius = 30;
    const moonOrbitRadius = 100;

    const moonX = centerX + Math.cos(this.moonAngle) * moonOrbitRadius;
    const moonY = centerY + Math.sin(this.moonAngle) * moonOrbitRadius * 0.4;

    // Orbital path
    r.ellipse(centerX, centerY, moonOrbitRadius, moonOrbitRadius * 0.4, {
      fill: 'none',
      stroke: colors.border,
      strokeWidth: 1,
      strokeDasharray: '4 4',
    });

    // Earth
    r.circle(centerX, centerY, earthRadius, { fill: colors.accent });
    r.ellipse(centerX - 5, centerY - 5, 12, 8, { fill: colors.earth });

    // Observer marker
    r.text(centerX, centerY - earthRadius - 15, 'Observer', {
      fill: colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle',
    });

    // Line to Moon
    r.line(moonX, moonY, centerX, centerY, {
      stroke: colors.bulge,
      strokeWidth: 1,
      strokeDasharray: '3 3',
      opacity: 0.5,
    });

    // Moon with rotation marker
    const moonFacingAngle = this.isTidallyLocked ? this.moonAngle + Math.PI : this.moonRotation;

    r.circle(moonX, moonY, 18, { fill: colors.moon });
    // Craters (face pattern)
    r.group(`translate(${moonX}, ${moonY}) rotate(${(moonFacingAngle * 180) / Math.PI})`, (g) => {
      g.circle(-5, -3, 4, { fill: '#6b7280' });
      g.circle(5, -3, 4, { fill: '#6b7280' });
      g.ellipse(0, 6, 8, 3, { fill: '#6b7280' });
      // Red marker showing orientation
      g.line(0, 0, 18, 0, { stroke: colors.danger, strokeWidth: 2 });
    });

    // Status panel
    r.rect(centerX + 80, centerY - 60, 140, 90, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 8,
    });
    r.text(centerX + 150, centerY - 40, this.isTidallyLocked ? 'Tidally Locked' : 'NOT Locked', {
      fill: this.isTidallyLocked ? colors.success : colors.danger,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(centerX + 150, centerY - 20, `Orbital: ${((this.moonAngle * 180) / Math.PI).toFixed(0)} deg`, {
      fill: colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle',
    });
    r.text(centerX + 150, centerY, `Rotation: ${((this.moonRotation * 180) / Math.PI).toFixed(0)} deg`, {
      fill: colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle',
    });
    r.text(centerX + 150, centerY + 20, this.isTidallyLocked ? 'Same side faces Earth' : 'Different sides visible', {
      fill: this.isTidallyLocked ? colors.success : colors.danger,
      fontSize: 9,
      textAnchor: 'middle',
    });
  }

  // --- PHASE RENDERERS ---

  private renderHookPhase(r: CommandRenderer): void {
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.circle(295, 44, 4, { fill: colors.primary });
    r.text(350, 49, 'PHYSICS EXPLORATION', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, 'The Two Bulges Mystery', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'Why are there tidal bulges on BOTH sides of Earth?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Visualization
    r.rect(160, 160, 380, 220, { fill: colors.bgCard, stroke: colors.border, rx: 20, opacity: 0.8 });
    this.renderTidalScene(r, 350, 270, 0.8);

    r.text(350, 400, "The Moon's gravity pulls water toward it, but there's also", {
      fill: colors.textPrimary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 420, 'a bulge on the OPPOSITE side. Why?', {
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

    r.rect(100, 80, 500, 80, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 115, 'Why is there a tidal bulge on the side AWAY from the Moon?', {
      fill: colors.textPrimary,
      fontSize: 15,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Show feedback if prediction made
    if (this.prediction) {
      const isCorrect = this.prediction === 'differential';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(
        350,
        375,
        isCorrect
          ? "Correct! Differential gravity - the far side is pulled LESS than Earth's center!"
          : "Not quite. It's about the DIFFERENCE in gravitational pull across Earth.",
        {
          fill: isCorrect ? colors.success : colors.danger,
          fontSize: 12,
          fontWeight: 'bold',
          textAnchor: 'middle',
        }
      );
    }
  }

  private renderPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Differential Gravity Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 540, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderTidalScene(r, 350, 180, 1.2);

    // Legend
    if (this.showVectors) {
      r.rect(100, 260, 200, 60, { fill: colors.bgCardLight, rx: 8 });
      r.line(110, 275, 140, 275, { stroke: colors.danger, strokeWidth: 2 });
      r.text(145, 278, 'Strong (near)', { fill: colors.textSecondary, fontSize: 10 });
      r.line(110, 295, 140, 295, { stroke: colors.warning, strokeWidth: 2 });
      r.text(145, 298, 'Medium (center)', { fill: colors.textSecondary, fontSize: 10 });
      r.line(110, 315, 140, 315, { stroke: colors.success, strokeWidth: 2 });
      r.text(145, 318, 'Weak (far)', { fill: colors.textSecondary, fontSize: 10 });
    }

    if (this.showDifferential) {
      r.rect(400, 260, 200, 40, { fill: colors.bgCardLight, rx: 8 });
      r.line(410, 280, 440, 280, { stroke: colors.bulge, strokeWidth: 2 });
      r.text(450, 283, 'Net tidal force (outward)', { fill: colors.textSecondary, fontSize: 10 });
    }

    // Explanation
    r.rect(80, 350, 540, 60, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    let explanation = 'Toggle the buttons to see how gravity varies across Earth!';
    if (this.showVectors) {
      explanation = "Different pull strengths! Near side pulled MORE, far side pulled LESS than Earth's center.";
    }
    if (this.showDifferential) {
      explanation = 'The DIFFERENCE from center creates the bulges - near side toward Moon, far side away!';
    }
    r.text(350, 385, explanation, {
      fill: colors.primary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Tidal Forces', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Three-step explanation
    const steps = [
      { num: '1', color: colors.danger, title: 'Near Side: Stronger Pull', desc: "Pulled MORE than center -> bulges toward Moon" },
      { num: '2', color: colors.success, title: 'Far Side: Weaker Pull', desc: "Pulled LESS than center -> 'left behind' -> bulges away" },
      { num: '3', color: colors.primary, title: 'Two High Tides Daily', desc: 'Earth rotates through both bulges every 24h' },
    ];

    steps.forEach((step, i) => {
      r.rect(100, 80 + i * 90, 500, 75, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
      r.circle(140, 117 + i * 90, 20, { fill: step.color });
      r.text(140, 123 + i * 90, step.num, { fill: colors.textPrimary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(180, 105 + i * 90, step.title, { fill: colors.textPrimary, fontSize: 14, fontWeight: 'bold' });
      r.text(180, 130 + i * 90, step.desc, { fill: colors.textSecondary, fontSize: 12 });
    });

    // Formula
    r.rect(150, 360, 400, 50, { fill: '#06b6d420', stroke: colors.primary, rx: 12 });
    r.text(350, 385, 'Tidal Force ~ 1/r^3 (falls off faster than gravity!)', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist!', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 80, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 110, 'We always see the same side of the Moon from Earth.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 135, 'Why do we never see the "dark side"?', {
      fill: colors.warning,
      fontSize: 15,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'locked';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(
        350,
        375,
        isCorrect
          ? 'Correct! Tidal friction synchronized rotation with orbit (tidal locking)!'
          : 'Not quite - the Moon DOES rotate, but at a special rate!',
        {
          fill: isCorrect ? colors.success : colors.danger,
          fontSize: 12,
          fontWeight: 'bold',
          textAnchor: 'middle',
        }
      );
    }
  }

  private renderTwistPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Tidal Locking', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 540, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderTwistScene(r, 280, 180);

    // Explanation
    r.rect(80, 350, 540, 60, { fill: '#78350f30', stroke: colors.warning, rx: 12 });
    r.text(
      350,
      385,
      this.isTidallyLocked
        ? 'The Moon rotates once per orbit - same side always faces Earth!'
        : 'Without locking, we would see different sides of the Moon over time.',
      {
        fill: colors.warning,
        fontSize: 12,
        textAnchor: 'middle',
      }
    );
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Tidal Evolution', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 80, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 110, 'The Moon IS rotating - exactly once per orbit (27.3 days)!', {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 135, 'Tidal friction slowly synchronized it over millions of years.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });

    const facts = [
      { color: colors.accent, title: 'Tidal Friction', desc: 'Bulges create drag that transfers angular momentum' },
      { color: colors.primary, title: 'Earth Slowing Too', desc: 'Days are 2ms longer per century from tidal drag' },
      { color: colors.success, title: 'Many Moons Locked', desc: "Most large moons in the solar system are tidally locked" },
    ];

    facts.forEach((fact, i) => {
      r.rect(100, 180 + i * 65, 500, 55, { fill: fact.color + '20', stroke: fact.color, rx: 8 });
      r.text(120, 210 + i * 65, fact.title, { fill: fact.color, fontSize: 12, fontWeight: 'bold' });
      r.text(120, 225 + i * 65, fact.desc, { fill: colors.textSecondary, fontSize: 11 });
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
    applications.forEach((app, i) => {
      const isSelected = i === this.selectedApp;
      const isCompleted = this.completedApps[i];
      const x = 80 + i * 150;

      r.rect(x, 70, 140, 40, {
        fill: isSelected ? colors.primary : colors.bgCard,
        stroke: isCompleted ? colors.success : colors.border,
        rx: 8,
      });
      r.text(x + 70, 95, app.title.split(' ')[0], {
        fill: isSelected ? colors.textPrimary : colors.textSecondary,
        fontSize: 11,
        textAnchor: 'middle',
      });
    });

    // Selected app content
    const app = applications[this.selectedApp];
    r.rect(80, 130, 540, 180, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    r.text(350, 165, app.title, {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 220, app.description, {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });

    // Progress
    r.text(350, 340, `Explored: ${this.completedApps.filter((c) => c).length}/4`, {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
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

    r.text(350, 200, passed ? "Excellent! You've mastered tidal forces!" : 'Review the concepts and try again.', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });
  }

  private renderMasteryPhase(r: CommandRenderer): void {
    r.rect(150, 80, 400, 340, { fill: colors.bgCard, stroke: colors.border, rx: 24 });

    r.text(350, 130, 'Tidal Forces Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, "You've mastered the physics of tides!", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const achievements = [
      'Two bulges from differential gravity',
      'Tidal force ~ 1/r^3',
      'Tidal locking synchronizes rotation',
      'Real-world: energy, navigation, volcanoes',
    ];

    achievements.forEach((ach, i) => {
      r.text(200, 210 + i * 30, '* ' + ach, {
        fill: colors.success,
        fontSize: 12,
      });
    });

    r.text(350, 360, 'Now you understand why tides come twice daily!', {
      fill: colors.primary,
      fontSize: 12,
      textAnchor: 'middle',
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
        r.addButton({ id: 'next', label: 'Investigate!', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_sun', label: 'A. Sun creates it', variant: this.prediction === 'sun' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_differential', label: 'B. Differential gravity', variant: this.prediction === 'differential' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_centrifugal', label: 'C. Centrifugal force', variant: this.prediction === 'centrifugal' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_inertia', label: 'D. Water inertia', variant: this.prediction === 'inertia' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Test It!', variant: 'success' });
        }
        break;

      case 'play':
        r.addButton({ id: 'toggle_vectors', label: this.showVectors ? 'Hide Vectors' : 'Show Vectors', variant: this.showVectors ? 'primary' : 'secondary' });
        r.addButton({ id: 'toggle_differential', label: this.showDifferential ? 'Hide Net Force' : 'Show Net Force', variant: this.showDifferential ? 'primary' : 'secondary' });
        r.addButton({ id: 'toggle_animation', label: this.isAnimating ? 'Pause' : 'Animate', variant: this.isAnimating ? 'danger' : 'success' });
        r.addButton({ id: 'next', label: 'Continue', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'But wait...', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_locked', label: 'A. Tidal locking', variant: this.twistPrediction === 'locked' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_no_rotate', label: "B. Moon doesn't rotate", variant: this.twistPrediction === 'no_rotate' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_coincidence', label: 'C. Coincidence', variant: this.twistPrediction === 'coincidence' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_heavy', label: 'D. Heavy side faces us', variant: this.twistPrediction === 'heavy' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Test It!', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addButton({ id: 'set_locked', label: 'Tidally Locked', variant: this.isTidallyLocked ? 'success' : 'secondary' });
        r.addButton({ id: 'set_unlocked', label: 'Not Locked', variant: !this.isTidallyLocked ? 'danger' : 'secondary' });
        r.addButton({ id: 'next', label: 'Continue', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'See Applications', variant: 'primary' });
        break;

      case 'transfer':
        applications.forEach((_, i) => {
          r.addButton({ id: `app_${i}`, label: applications[i].title.split(' ')[0], variant: this.selectedApp === i ? 'primary' : 'ghost' });
        });
        if (this.completedApps.every((c) => c)) {
          r.addButton({ id: 'next', label: 'Take Quiz', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= testQuestions.length - 1 });
          testQuestions[this.testQuestion].options.forEach((_, i) => {
            r.addButton({ id: `answer_${i}`, label: `Option ${i + 1}`, variant: this.testAnswers[this.testQuestion] === i ? 'primary' : 'secondary' });
          });
          if (this.testAnswers.every((a) => a !== null)) {
            r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
          }
        } else {
          const score = this.calculateTestScore();
          if (score >= 7) {
            r.addButton({ id: 'next', label: 'Complete!', variant: 'success' });
          } else {
            r.addButton({ id: 'back', label: 'Review & Retry', variant: 'secondary' });
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
      moonAngle: this.moonAngle,
      showVectors: this.showVectors,
      showDifferential: this.showDifferential,
      isAnimating: this.isAnimating,
      moonRotation: this.moonRotation,
      isTidallyLocked: this.isTidallyLocked,
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
    this.moonAngle = (state.moonAngle as number) || 0;
    this.showVectors = (state.showVectors as boolean) || false;
    this.showDifferential = (state.showDifferential as boolean) || false;
    this.isAnimating = (state.isAnimating as boolean) || false;
    this.moonRotation = (state.moonRotation as number) || 0;
    this.isTidallyLocked = (state.isTidallyLocked as boolean) ?? true;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===

export function createTidalForcesGame(sessionId: string): TidalForcesGame {
  return new TidalForcesGame(sessionId);
}
