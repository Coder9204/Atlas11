/**
 * Tidal Locking Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Tidal locking: rotation period = orbital period
 * - Tidal friction dissipates rotational energy
 * - Synchronous rotation stable configuration
 * - Mutual tidal locking (e.g., Pluto-Charon)
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
    question: 'What causes tidal locking to occur?',
    options: ['Magnetic attraction', 'Tidal friction dissipating rotational energy', 'Solar radiation', "The satellite's composition"],
    correctIndex: 1,
  },
  {
    question: 'When a body is tidally locked, its rotation period equals its:',
    options: ['Day length of the parent body', 'Orbital period', "Parent body's rotation period", 'None - it stops rotating'],
    correctIndex: 1,
  },
  {
    question: "The Moon's rotation period is approximately:",
    options: ['1 day', '1 week', '27.3 days (same as its orbital period)', '365 days'],
    correctIndex: 2,
  },
  {
    question: 'Tidal bulges on a body are caused by:',
    options: ['Internal heat', 'Differential gravitational pull across the body', 'Magnetic fields', 'Solar wind'],
    correctIndex: 1,
  },
  {
    question: 'Which statement about the Earth-Moon system is true?',
    options: ['Earth is already tidally locked to the Moon', 'The Moon is moving closer to Earth', "Earth's rotation is gradually slowing", 'Tidal locking cannot happen to Earth'],
    correctIndex: 2,
  },
  {
    question: 'Pluto and Charon are special because:',
    options: ['Neither is tidally locked', 'They are mutually tidally locked', 'Only Charon is tidally locked', 'They orbit the Sun together'],
    correctIndex: 1,
  },
  {
    question: "An 'eyeball world' refers to a tidally locked exoplanet with:",
    options: ['Unusual coloring', 'A permanent day side and night side', 'Multiple moons', 'A ring system'],
    correctIndex: 1,
  },
  {
    question: "What powers Io's extreme volcanic activity?",
    options: ['Radioactive decay', 'Solar heating', "Tidal heating from Jupiter's gravity", 'Chemical reactions'],
    correctIndex: 2,
  },
  {
    question: 'Before tidal locking, a moon typically rotates:',
    options: ['Slower than its orbital period', 'Faster than its orbital period', 'At exactly its orbital period', 'In the opposite direction'],
    correctIndex: 1,
  },
  {
    question: "The 'far side' of the Moon:",
    options: ['Is always dark', 'Was first photographed from space', "Doesn't exist", 'Faces the Sun constantly'],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#06b6d4',
  primaryDark: '#0891b2',
  accent: '#14b8a6',
  accentDark: '#0d9488',
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
  earth: '#60a5fa',
  moon: '#9ca3af',
  marker: '#fbbf24',
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
    title: 'Earth-Moon System',
    icon: 'globe',
    description: "The Moon is tidally locked to Earth, always showing the same face.",
    details: "The 'far side' of the Moon was a complete mystery until Luna 3 photographed it in 1959.",
  },
  {
    title: 'Pluto-Charon',
    icon: 'star',
    description: 'Pluto and Charon are mutually tidally locked - both always show the same face to each other!',
    details: "This is rare because Charon is so large relative to Pluto (about 1/8 Pluto's mass).",
  },
  {
    title: 'Eyeball Worlds',
    icon: 'eye',
    description: 'Tidally locked exoplanets around red dwarfs have a permanent day side and night side.',
    details: "Life might exist in a 'terminator ring' between the hot and cold extremes.",
  },
  {
    title: "Io's Volcanism",
    icon: 'volcano',
    description: "Jupiter's moon Io is the most volcanically active body in the solar system - powered by tidal heating!",
    details: 'Other moons perturb Io orbit, flexing it like a stress ball and generating enormous internal heat.',
  },
];

// === MAIN GAME CLASS ===

export class TidalLockingGame extends BaseGame {
  readonly gameType = 'tidal_locking';
  readonly gameTitle = 'Tidal Locking';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private orbitalAngle = 0;
  private moonRotation = 0;
  private isTidallyLocked = true;
  private showTidalBulge = true;
  private timeScale = 1;
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
    hook: "Throughout human history, we've only ever seen one face of the Moon. Why?",
    predict: 'Why do we always see the same side of the Moon from Earth?',
    play: 'Compare locked vs unlocked - watch the yellow marker on the Moon!',
    review: 'Tidal friction slowly synchronizes rotation with orbital period.',
    twist_predict: "The Moon raises tides on Earth too. What does this mean for Earth's future?",
    twist_play: "Earth's day is gradually getting longer - we have fossil evidence!",
    twist_review: 'Tidal locking is universal - any two close bodies will eventually lock.',
    transfer: 'Tidal locking affects moons, planets, and even stars throughout the universe.',
    test: 'Test your understanding of tidal locking and orbital mechanics.',
    mastery: "You've mastered tidal locking and synchronous rotation!",
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
      message: 'Tidal Locking lesson started',
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

    // Predictions - correct answer is 'C' (locked)
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }

    // Twist predictions - correct answer is 'B' (days longer)
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
    if (id === 'set_locked') {
      this.isTidallyLocked = true;
      return;
    }
    if (id === 'set_unlocked') {
      this.isTidallyLocked = false;
      return;
    }
    if (id === 'toggle_bulge') {
      this.showTidalBulge = !this.showTidalBulge;
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'locked') {
      this.isTidallyLocked = value;
      return;
    }
    if (id === 'bulge') {
      this.showTidalBulge = value;
      return;
    }
    if (id === 'animation') {
      this.isAnimating = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'time_scale') {
      this.timeScale = value;
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
      this.orbitalAngle = 0;
      this.moonRotation = 0;
      this.isTidallyLocked = true;
      this.isAnimating = true;
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
   * PROTECTED: Tidal locking condition
   * Rotation period = Orbital period
   */
  private isSynchronousRotation(): boolean {
    return this.isTidallyLocked;
  }

  /**
   * PROTECTED: Calculate tidal bulge direction
   * Bulge always points toward the primary body
   */
  private calculateBulgeAngle(): number {
    // In a tidally locked state, bulge points toward Earth
    return this.orbitalAngle + Math.PI;
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;

    this.time += deltaTime / 1000;

    // Update orbital angle
    const orbitalRate = 0.5 * this.timeScale;
    this.orbitalAngle = (this.orbitalAngle + orbitalRate) % 360;

    // Update moon rotation
    if (this.isTidallyLocked) {
      // Rotation matches orbital period - same face always visible
      this.moonRotation = (this.moonRotation + orbitalRate) % 360;
    } else {
      // Rotation faster than orbit - different faces visible
      this.moonRotation = (this.moonRotation + 2 * this.timeScale) % 360;
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

    // Stars
    for (let i = 0; i < 50; i++) {
      const x = (i * 41) % 700;
      const y = (i * 23) % 500;
      r.circle(x, y, 0.5 + Math.random() * 0.5, {
        fill: colors.textPrimary,
        opacity: 0.2 + Math.random() * 0.3,
      });
    }

    r.circle(175, 0, 200, { fill: colors.primary, opacity: 0.02 });
    r.circle(525, 500, 200, { fill: colors.accent, opacity: 0.02 });
  }

  private renderMoonSystem(r: CommandRenderer, centerX: number, centerY: number, scale: number = 1): void {
    const orbitRadius = 100 * scale;

    // Calculate positions
    const moonX = centerX + Math.cos((this.orbitalAngle * Math.PI) / 180) * orbitRadius;
    const moonY = centerY + Math.sin((this.orbitalAngle * Math.PI) / 180) * orbitRadius;

    // Angle from Moon to Earth
    const angleToEarth = Math.atan2(centerY - moonY, centerX - moonX);

    // Orbital path
    r.circle(centerX, centerY, orbitRadius, {
      fill: 'none',
      stroke: colors.border,
      strokeWidth: 1,
      strokeDasharray: '4 2',
    });

    // Earth
    r.circle(centerX, centerY, 35 * scale, { fill: colors.earth });
    r.ellipse(centerX - 10 * scale, centerY - 5 * scale, 12 * scale, 8 * scale, { fill: '#22c55e', opacity: 0.5 });
    r.ellipse(centerX + 8 * scale, centerY + 8 * scale, 8 * scale, 5 * scale, { fill: '#22c55e', opacity: 0.4 });

    // Moon
    if (this.showTidalBulge) {
      // Elongated toward Earth
      r.group(`translate(${moonX}, ${moonY}) rotate(${(angleToEarth * 180) / Math.PI})`, (g) => {
        g.ellipse(0, 0, 28 * scale, 22 * scale, { fill: colors.moon });
      });
    } else {
      r.circle(moonX, moonY, 25 * scale, { fill: colors.moon });
    }

    // Moon surface features (rotate with moon)
    const moonRot = this.isTidallyLocked ? this.moonRotation : this.moonRotation;
    r.group(`translate(${moonX}, ${moonY}) rotate(${moonRot})`, (g) => {
      g.circle(-8 * scale, -5 * scale, 4 * scale, { fill: '#4b5563', opacity: 0.6 });
      g.circle(6 * scale, -3 * scale, 3 * scale, { fill: '#4b5563', opacity: 0.5 });
      g.circle(0, 8 * scale, 5 * scale, { fill: '#4b5563', opacity: 0.6 });
      // Yellow marker showing "near side"
      g.circle(0, -12 * scale, 3 * scale, { fill: colors.marker });
    });

    // Tidal force arrow
    if (this.showTidalBulge) {
      const arrowStartX = moonX + Math.cos(angleToEarth) * 30 * scale;
      const arrowStartY = moonY + Math.sin(angleToEarth) * 30 * scale;
      const arrowEndX = moonX + Math.cos(angleToEarth) * 50 * scale;
      const arrowEndY = moonY + Math.sin(angleToEarth) * 50 * scale;
      r.line(arrowStartX, arrowStartY, arrowEndX, arrowEndY, {
        stroke: colors.warning,
        strokeWidth: 2,
        opacity: 0.7,
      });
    }

    // Observer on Earth
    r.circle(centerX + 25 * scale, centerY - 20 * scale, 4 * scale, { fill: '#fcd9b6' });

    // Labels
    r.text(centerX, centerY + 50 * scale, 'Earth', {
      fill: colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle',
    });
    r.text(moonX, moonY + 35 * scale, 'Moon', {
      fill: colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle',
    });
  }

  // --- PHASE RENDERERS ---

  private renderHookPhase(r: CommandRenderer): void {
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.circle(295, 44, 4, { fill: colors.primary });
    r.text(350, 49, 'ORBITAL MECHANICS', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, "The Moon's Hidden Side", {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'A mystery hiding in plain sight for all of human history', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Visualization
    r.rect(160, 160, 380, 220, { fill: colors.bgCard, stroke: colors.border, rx: 20, opacity: 0.8 });
    this.renderMoonSystem(r, 350, 260, 0.8);

    r.text(350, 400, "We've only ever seen one face of the Moon from Earth.", {
      fill: colors.textPrimary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 420, 'The "far side" was a mystery until 1959. Why?', {
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
    r.text(350, 115, 'Why do we always see the same side of the Moon from Earth?', {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (this.prediction) {
      const isCorrect = this.prediction === 'C';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(
        350,
        375,
        isCorrect ? 'Correct! The Moon IS rotating, but exactly once per orbit. This is tidal locking!' : 'Not quite - the Moon does rotate, but at a very specific rate.',
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
    r.text(350, 30, 'Tidal Locking Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 540, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderMoonSystem(r, 350, 180, 1.0);

    r.text(350, 300, 'Yellow dot = marker on Moon near side. Watch if it always faces Earth!', {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });

    // Status panel
    r.rect(450, 70, 150, 80, { fill: colors.bgCardLight, rx: 8 });
    r.text(525, 95, this.isTidallyLocked ? 'LOCKED' : 'NOT LOCKED', {
      fill: this.isTidallyLocked ? colors.success : colors.warning,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(525, 115, this.isTidallyLocked ? 'Rotation = Orbit' : 'Rotation > Orbit', {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle',
    });
    r.text(525, 135, this.isTidallyLocked ? 'Same side visible' : 'Different sides visible', {
      fill: colors.textMuted,
      fontSize: 9,
      textAnchor: 'middle',
    });

    // Explanation
    r.rect(80, 350, 540, 60, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    const explanation = this.isTidallyLocked
      ? 'When locked: Yellow marker always points toward Earth - even though Moon IS rotating!'
      : 'When unlocked: Different parts of the Moon become visible as it rotates faster than it orbits.';
    r.text(350, 385, explanation, {
      fill: colors.primary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Tidal Locking', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Tidal Forces
    r.rect(50, 80, 290, 130, { fill: '#06b6d420', stroke: colors.primary, rx: 12 });
    r.text(195, 105, 'Tidal Forces', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    const tidalInfo = ['Gravity stronger on near side', 'Creates elongated tidal bulge', 'Bulge always points toward primary'];
    tidalInfo.forEach((line, i) => {
      r.text(70, 130 + i * 20, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    // Tidal Friction
    r.rect(360, 80, 290, 130, { fill: '#f59e0b20', stroke: colors.warning, rx: 12 });
    r.text(505, 105, 'Tidal Friction', { fill: colors.warning, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    const frictionInfo = ['Moving bulge creates friction', 'Friction dissipates energy', 'Rotation gradually slows'];
    frictionInfo.forEach((line, i) => {
      r.text(380, 130 + i * 20, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    // Locked State
    r.rect(50, 230, 600, 100, { fill: '#10b98120', stroke: colors.success, rx: 12 });
    r.text(350, 255, 'The Locked State', { fill: colors.success, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 280, 'Synchronous Rotation: rotation period = orbital period', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 300, 'Stable: bulge stays fixed, no more friction, no more energy loss', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 320, 'The Moon rotates once every 27.3 days - same as its orbital period!', { fill: colors.primary, fontSize: 11, textAnchor: 'middle' });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist Challenge', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 110, "The Moon raises tides on Earth too - that's where ocean tides come from!", {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 135, 'These tides create friction as they slosh against continents.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 165, "What does this mean for Earth's future?", {
      fill: colors.warning,
      fontSize: 15,
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
      r.text(350, 365, isCorrect ? "Correct! Earth's day gets about 1.4 milliseconds longer each century!" : 'Not quite - think about what tidal friction does to rotation.', {
        fill: isCorrect ? colors.success : colors.danger,
        fontSize: 12,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
      r.text(350, 385, 'Billions of years from now, Earth could become tidally locked to the Moon!', {
        fill: colors.textMuted,
        fontSize: 10,
        textAnchor: 'middle',
      });
    }
  }

  private renderTwistPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, "Earth's Slowing Rotation", {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // 400 million years ago
    r.rect(80, 60, 250, 160, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(205, 90, '400 Million Years Ago', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.circle(205, 140, 40, { fill: colors.earth });
    r.text(205, 200, '~22 hour day', { fill: colors.warning, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(205, 215, '~400 days/year', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Today
    r.rect(370, 60, 250, 160, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(495, 90, 'Today', { fill: colors.warning, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.circle(495, 140, 40, { fill: colors.earth });
    r.text(495, 200, '24 hour day', { fill: colors.warning, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(495, 215, '365 days/year', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Evidence
    r.rect(80, 240, 540, 140, { fill: '#f59e0b20', stroke: colors.warning, rx: 12 });
    r.text(350, 265, 'The Evidence:', { fill: colors.warning, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    const evidence = [
      'Coral fossils: Growth rings show ~400 days per year in Devonian period',
      'Tidal rhythmites: Ancient sediment layers record shorter days',
      'Lunar laser ranging: Moon moves 3.8 cm farther from Earth each year',
      'Atomic clocks: Leap seconds are added because Earth slowing',
    ];
    evidence.forEach((line, i) => {
      r.text(100, 290 + i * 18, '* ' + line, { fill: colors.textSecondary, fontSize: 10 });
    });

    r.text(350, 390, 'The same mechanism that locked the Moon is slowly working on Earth!', {
      fill: colors.primary,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 200, { fill: '#f59e0b20', stroke: colors.warning, rx: 16 });
    r.text(350, 110, 'Tidal Locking Is Universal!', {
      fill: colors.warning,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 145, 'Any two bodies in close orbit will eventually become tidally locked.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });

    r.text(350, 175, 'Time required depends on:', {
      fill: colors.primary,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const factors = ['Distance between bodies (closer = faster)', 'Size difference (larger primary = faster)', 'Composition (liquid bodies lock faster)', 'Initial rotation rate'];
    factors.forEach((factor, i) => {
      r.text(180, 200 + i * 18, '* ' + factor, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.text(350, 300, 'Most moons in our solar system are tidally locked to their planets!', {
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
    applications.forEach((app, i) => {
      const isSelected = i === this.selectedApp;
      const isCompleted = this.completedApps[i];
      const x = 80 + i * 150;

      r.rect(x, 70, 140, 40, {
        fill: isSelected ? colors.primary : colors.bgCard,
        stroke: isCompleted ? colors.success : colors.border,
        rx: 8,
      });
      r.text(x + 70, 95, app.title.split('-')[0].trim(), {
        fill: isSelected ? colors.textPrimary : colors.textSecondary,
        fontSize: 11,
        textAnchor: 'middle',
      });
    });

    // Selected app content
    const app = applications[this.selectedApp];
    r.rect(80, 130, 540, 180, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

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

    r.text(350, 240, app.details, {
      fill: colors.textMuted,
      fontSize: 11,
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

    r.text(350, 200, passed ? "You've mastered tidal locking and orbital mechanics!" : 'Review the concepts and try again.', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });
  }

  private renderMasteryPhase(r: CommandRenderer): void {
    r.rect(150, 80, 400, 340, { fill: colors.bgCard, stroke: colors.border, rx: 24 });

    r.text(350, 130, 'Tidal Locking Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, "You've mastered the physics of tidal locking!", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const achievements = ['Synchronous rotation = orbital period', 'Tidal friction dissipates rotational energy', 'Tidal heating powers volcanism (Io)', 'Eyeball worlds around red dwarfs'];

    achievements.forEach((ach, i) => {
      r.text(200, 210 + i * 30, '* ' + ach, {
        fill: colors.success,
        fontSize: 12,
      });
    });

    r.text(350, 360, "Now you know why we only see one face of the Moon!", {
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
        r.addButton({ id: 'next', label: 'Uncover the Mystery', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: "A. Moon doesn't rotate", variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Coincidence', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Once per orbit (locked)', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. Magnetic field', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Explore the Physics', variant: 'success' });
        }
        break;

      case 'play':
        r.addButton({ id: 'set_locked', label: 'Locked', variant: this.isTidallyLocked ? 'success' : 'secondary' });
        r.addButton({ id: 'set_unlocked', label: 'Not Locked', variant: !this.isTidallyLocked ? 'warning' : 'secondary' });
        r.addButton({ id: 'toggle_bulge', label: this.showTidalBulge ? 'Hide Bulge' : 'Show Bulge', variant: this.showTidalBulge ? 'primary' : 'secondary' });
        r.addSlider({ id: 'time_scale', label: 'Time Speed', value: this.timeScale, min: 0.5, max: 3, step: 0.5 });
        r.addButton({ id: 'toggle_animation', label: this.isAnimating ? 'Pause' : 'Play', variant: this.isAnimating ? 'danger' : 'success' });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Discover a Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Earth spins faster', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Days getting longer', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Rotation unaffected', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D. Earth stops rotating', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See the Evidence', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addButton({ id: 'next', label: 'Review Discovery', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'See Applications', variant: 'primary' });
        break;

      case 'transfer':
        applications.forEach((_, i) => {
          r.addButton({ id: `app_${i}`, label: applications[i].title.split('-')[0].trim(), variant: this.selectedApp === i ? 'primary' : 'ghost' });
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
            r.addButton({ id: 'next', label: 'Claim Badge', variant: 'success' });
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
      orbitalAngle: this.orbitalAngle,
      moonRotation: this.moonRotation,
      isTidallyLocked: this.isTidallyLocked,
      showTidalBulge: this.showTidalBulge,
      timeScale: this.timeScale,
      isAnimating: this.isAnimating,
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
    this.orbitalAngle = (state.orbitalAngle as number) || 0;
    this.moonRotation = (state.moonRotation as number) || 0;
    this.isTidallyLocked = (state.isTidallyLocked as boolean) ?? true;
    this.showTidalBulge = (state.showTidalBulge as boolean) ?? true;
    this.timeScale = (state.timeScale as number) || 1;
    this.isAnimating = (state.isAnimating as boolean) ?? true;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===

export function createTidalLockingGame(sessionId: string): TidalLockingGame {
  return new TidalLockingGame(sessionId);
}
