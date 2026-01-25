/**
 * Tipping Point Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Critical tipping angle depends on CG height and base width
 * - Object tips when CG moves outside base of support
 * - Loading position affects CG location and stability
 * - Higher loads reduce critical tipping angle
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

type ObjectType = 'tall' | 'normal' | 'wide';
type LoadPosition = 'low' | 'middle' | 'high';

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

// === TEST QUESTIONS (PROTECTED - never sent to client) ===
const testQuestions: TestQuestion[] = [
  {
    question: 'An object tips when:',
    options: ['Its weight increases', 'The CG moves outside the base of support', 'It gets too tall', 'Wind blows'],
    correctIndex: 1,
  },
  {
    question: 'A wider base makes an object:',
    options: ['Heavier', 'More stable', 'Taller', 'Lighter'],
    correctIndex: 1,
  },
  {
    question: 'A lower center of gravity makes an object:',
    options: ['Less stable', 'More stable', 'Unchanged', 'Fall faster'],
    correctIndex: 1,
  },
  {
    question: 'Loading cargo HIGH in a truck makes it:',
    options: ['More stable', 'Less stable', 'Faster', 'Slower'],
    correctIndex: 1,
  },
  {
    question: "Weeble toys don't fall down because:",
    options: ["They're magnetic", 'Heavy weighted bottom keeps CG low', "They're made of rubber", 'Air pressure'],
    correctIndex: 1,
  },
  {
    question: 'A tall narrow bookshelf tips easily because:',
    options: ["It's too heavy", 'Its CG is high and base is narrow', 'The shelves are weak', "It's old"],
    correctIndex: 1,
  },
  {
    question: 'SUVs have higher rollover risk than sports cars due to:',
    options: ['More power', 'Higher center of gravity', 'Heavier weight', 'Bigger tires'],
    correctIndex: 1,
  },
  {
    question: 'Pyramids are extremely stable because:',
    options: ["They're made of stone", 'Wide base with low CG', "They're ancient", 'Desert sand'],
    correctIndex: 1,
  },
  {
    question: 'A gymnast in a handstand is unstable because:',
    options: ['Arms are weak', 'High CG over tiny base (hands)', 'Blood rush', 'Floor is slippery'],
    correctIndex: 1,
  },
  {
    question: 'Double-decker buses stay stable by:',
    options: ['Wide wheels', 'Heavy engine/chassis at bottom', 'Passengers sit evenly', 'Slow speed'],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#10B981',
  primaryDark: '#059669',
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
  objectStable: '#10B981',
  objectTipped: '#ef4444',
  cgMarker: '#3b82f6',
  load: '#f59e0b',
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
    title: 'Vehicle Rollover Safety',
    icon: 'car',
    description: 'Vehicles with high centers of gravity (SUVs, trucks) have a higher rollover risk than low-slung sports cars.',
    details: 'Electronic Stability Control (ESC) monitors steering and yaw rate. When it detects potential rollover conditions, it applies individual brakes.',
  },
  {
    title: 'Building Foundations',
    icon: 'building',
    description: 'Tall buildings are designed with massive foundations that extend the base of support and lower the overall center of gravity.',
    details: 'Foundations spread building weight over large areas and often extend deep underground to prevent tipping.',
  },
  {
    title: 'Baby Product Safety',
    icon: 'baby',
    description: 'Baby walkers, high chairs, and furniture are designed with low CGs and wide bases to prevent tipping.',
    details: 'Weeble toys work on this principle - weighted bottoms keep the CG so low that they always self-right.',
  },
  {
    title: 'Ship Stability',
    icon: 'ship',
    description: 'Ships use ballast, cargo placement, and hull design to maintain stability in rough seas.',
    details: 'Ballast tanks filled with water lower the CG. Cargo is carefully distributed to maintain proper balance.',
  },
];

// === OBJECT DIMENSIONS ===
const objectDimensions: Record<ObjectType, { width: number; height: number }> = {
  tall: { width: 40, height: 120 },
  normal: { width: 60, height: 80 },
  wide: { width: 100, height: 50 },
};

// === MAIN GAME CLASS ===

export class TippingPointGame extends BaseGame {
  readonly gameType = 'tipping_point';
  readonly gameTitle = 'The Tipping Point';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private tiltAngle = 0;
  private objectType: ObjectType = 'normal';
  private hasTipped = false;
  private tippingAngles: Partial<Record<ObjectType, number>> = {};

  // Twist state - loading position
  private loadPosition: LoadPosition = 'middle';
  private twistTiltAngle = 0;
  private twistHasTipped = false;
  private twistExperimentsRun = 0;

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
    hook: 'Why do some objects topple easily while others stand firm?',
    predict: 'What makes objects stable against tipping?',
    play: 'Tilt different shaped objects and find their critical tipping angles!',
    review: 'An object tips when its Center of Gravity moves outside its Base of Support.',
    twist_predict: 'Does the position of a load affect stability?',
    twist_play: 'Compare how load position changes the tipping angle!',
    twist_review: 'Heavy items placed HIGH raise the CG, making objects tip easier.',
    transfer: 'Stability physics is crucial for vehicles, buildings, and products.',
    test: 'Test your understanding of stability and tipping physics.',
    mastery: "You've mastered the physics of balance and tipping!",
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
      message: 'Tipping Point lesson started',
    });
  }

  // === INPUT HANDLING ===

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click':
        this.handleButtonClick(input.id!);
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

    // Predictions - correct answer is 'both'
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }

    // Twist predictions - correct answer is 'high_unstable'
    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
      this.emitCoachEvent('prediction_made', { twistPrediction: this.twistPrediction });
      return;
    }

    // Object type selection
    if (id === 'type_tall' || id === 'type_normal' || id === 'type_wide') {
      this.objectType = id.replace('type_', '') as ObjectType;
      this.resetTilt(false);
      return;
    }

    // Load position selection
    if (id === 'load_low' || id === 'load_middle' || id === 'load_high') {
      this.loadPosition = id.replace('load_', '') as LoadPosition;
      this.resetTilt(true);
      return;
    }

    // Tilt controls
    if (id === 'tilt_increase') {
      this.handleTilt(5, false);
      return;
    }
    if (id === 'tilt_decrease') {
      this.handleTilt(-5, false);
      return;
    }
    if (id === 'twist_tilt_increase') {
      this.handleTilt(5, true);
      return;
    }
    if (id === 'twist_tilt_decrease') {
      this.handleTilt(-5, true);
      return;
    }
    if (id === 'reset') {
      this.resetTilt(false);
      return;
    }
    if (id === 'twist_reset') {
      this.resetTilt(true);
      return;
    }
    if (id === 'twist_try_another') {
      this.twistExperimentsRun++;
      this.resetTilt(true);
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
      this.tiltAngle = 0;
      this.hasTipped = false;
    }
    if (newPhase === 'twist_play') {
      this.twistTiltAngle = 0;
      this.twistHasTipped = false;
      this.twistExperimentsRun = 0;
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
   * PROTECTED: Calculate critical tipping angle
   * Based on object geometry and load position
   * Critical angle = atan(base_width / (2 * CG_height))
   */
  private getCriticalAngle(type: ObjectType, load: LoadPosition = 'middle'): number {
    const baseAngles: Record<ObjectType, number> = {
      tall: 15, // Narrow base, high CG
      normal: 30, // Moderate base and height
      wide: 50, // Wide base, low CG
    };

    let angle = baseAngles[type];

    // Load position affects CG height
    if (load === 'high') angle *= 0.6; // Higher CG = tips easier
    if (load === 'low') angle *= 1.3; // Lower CG = more stable

    return angle;
  }

  /**
   * PROTECTED: Calculate CG position based on load
   */
  private getCGPosition(type: ObjectType, load: LoadPosition): number {
    const dims = objectDimensions[type];
    let cgY = dims.height / 2; // Default middle

    if (load === 'high') cgY = dims.height * 0.75;
    if (load === 'low') cgY = dims.height * 0.25;

    return cgY;
  }

  private handleTilt(delta: number, isTwist: boolean): void {
    if (isTwist) {
      if (this.twistHasTipped) return;

      const newAngle = Math.max(0, Math.min(60, this.twistTiltAngle + delta));
      this.twistTiltAngle = newAngle;

      const criticalAngle = this.getCriticalAngle('normal', this.loadPosition);
      if (newAngle >= criticalAngle) {
        this.twistHasTipped = true;
        this.emitCoachEvent('tipped', { loadPosition: this.loadPosition, angle: newAngle });
      }
    } else {
      if (this.hasTipped) return;

      const newAngle = Math.max(0, Math.min(60, this.tiltAngle + delta));
      this.tiltAngle = newAngle;

      const criticalAngle = this.getCriticalAngle(this.objectType);
      if (newAngle >= criticalAngle) {
        this.hasTipped = true;
        this.tippingAngles[this.objectType] = newAngle;
        this.emitCoachEvent('tipped', { objectType: this.objectType, angle: newAngle });
      }
    }
  }

  private resetTilt(isTwist: boolean): void {
    if (isTwist) {
      this.twistTiltAngle = 0;
      this.twistHasTipped = false;
    } else {
      this.tiltAngle = 0;
      this.hasTipped = false;
    }
  }

  update(_deltaTime: number): void {
    // No continuous animation needed for this game
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

    r.circle(175, 0, 200, { fill: colors.primary, opacity: 0.02 });
    r.circle(525, 500, 200, { fill: colors.accent, opacity: 0.02 });
  }

  private renderTippingVisualization(
    r: CommandRenderer,
    centerX: number,
    centerY: number,
    angle: number,
    type: ObjectType,
    tipped: boolean,
    loadPos?: LoadPosition
  ): void {
    const dims = objectDimensions[type];
    const criticalAngle = this.getCriticalAngle(type, loadPos);

    // Calculate CG position
    let cgY = dims.height / 2;
    if (loadPos === 'high') cgY = dims.height * 0.75;
    if (loadPos === 'low') cgY = dims.height * 0.25;

    const pivotX = centerX;
    const pivotY = centerY + 80;

    // Ground
    r.rect(pivotX - 140, pivotY + 5, 280, 25, { fill: colors.border });

    // Tilting platform and object
    r.group(`translate(${pivotX}, ${pivotY}) rotate(${angle})`, (g) => {
      // Platform
      g.rect(-70, -5, 140, 10, { fill: colors.textSecondary, rx: 3 });

      // Object
      const objColor = tipped ? colors.objectTipped : colors.objectStable;
      g.rect(-dims.width / 2, -dims.height - 5, dims.width, dims.height, { fill: objColor, rx: 5 });

      // CG marker
      g.circle(0, -cgY - 5, 8, { fill: colors.cgMarker, stroke: colors.textPrimary, strokeWidth: 2 });
      g.text(0, -cgY - 2, 'CG', { fill: colors.textPrimary, fontSize: 8, fontWeight: 'bold', textAnchor: 'middle' });

      // Load indicator for twist phase
      if (loadPos) {
        const loadY = loadPos === 'high' ? -dims.height + 15 : loadPos === 'low' ? -25 : -dims.height / 2 - 5;
        g.rect(-dims.width / 4, loadY - 10, dims.width / 2, 20, { fill: colors.load, rx: 3 });
      }

      // Base of support indicator
      g.line(-dims.width / 2, 15, dims.width / 2, 15, { stroke: colors.cgMarker, strokeWidth: 3 });
    });

    // Status display
    r.text(pivotX - 100, centerY - 60, `Tilt: ${angle.toFixed(0)} deg`, {
      fill: colors.textSecondary,
      fontSize: 11,
      fontWeight: 'bold',
    });
    r.text(pivotX - 100, centerY - 45, `Critical: ${criticalAngle.toFixed(0)} deg`, {
      fill: angle >= criticalAngle ? colors.danger : colors.success,
      fontSize: 10,
    });

    // Status badge
    r.rect(pivotX - 35, centerY - 80, 70, 22, {
      fill: tipped ? colors.danger : colors.success,
      rx: 11,
    });
    r.text(pivotX, centerY - 65, tipped ? 'TIPPED!' : 'STABLE', {
      fill: colors.textPrimary,
      fontSize: 10,
      fontWeight: 'bold',
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

    r.text(350, 100, 'The Tipping Point', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'Discover why some objects topple easily while others stand firm', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Visualization - tall vs wide
    r.rect(160, 160, 380, 200, { fill: colors.bgCard, stroke: colors.border, rx: 20, opacity: 0.8 });

    // Tall object (unstable)
    r.rect(230, 280, 30, 100, { fill: colors.danger, rx: 3 });
    r.text(245, 255, 'TALL', { fill: colors.danger, fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    // Wide object (stable)
    r.rect(400, 320, 100, 40, { fill: colors.success, rx: 3 });
    r.text(450, 255, 'WIDE', { fill: colors.success, fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    // VS text
    r.text(350, 290, 'VS', { fill: colors.warning, fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(350, 395, 'A bookshelf falls over, but a coffee table stays put.', {
      fill: colors.textPrimary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 415, 'What determines when something tips?', {
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
    r.text(350, 115, 'What makes objects stable against tipping?', {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 140, 'Choose the best answer:', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    if (this.prediction) {
      const isCorrect = this.prediction === 'both';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 375, isCorrect ? 'Correct! The Center of Gravity must stay OVER the Base of Support!' : 'Not quite - think about what keeps an object from falling over.', {
        fill: isCorrect ? colors.success : colors.danger,
        fontSize: 12,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
    }
  }

  private renderPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Stability Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 540, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderTippingVisualization(r, 350, 100, this.tiltAngle, this.objectType, this.hasTipped);

    // Results display
    if (Object.keys(this.tippingAngles).length > 0) {
      r.rect(100, 260, 500, 60, { fill: '#10b98130', rx: 12 });
      r.text(350, 280, 'Results:', { fill: colors.primary, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      let xOffset = 150;
      Object.entries(this.tippingAngles).forEach(([type, angle]) => {
        r.text(xOffset, 300, `${type}: ${(angle as number).toFixed(0)} deg`, {
          fill: colors.textSecondary,
          fontSize: 11,
          textAnchor: 'middle',
        });
        xOffset += 150;
      });
    }

    // Progress requirement
    r.text(350, 360, Object.keys(this.tippingAngles).length >= 2 ? 'Great! You found at least 2 tipping angles!' : 'Tip at least 2 different shapes to continue', {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'The Stability Secret', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // More stable
    r.rect(50, 80, 290, 120, { fill: '#10b98130', stroke: colors.success, rx: 12 });
    r.text(195, 105, 'More Stable When:', { fill: colors.success, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    const stablePoints = ['Wider base of support', 'Lower center of gravity', 'Heavier bottom, lighter top'];
    stablePoints.forEach((point, i) => {
      r.text(70, 130 + i * 20, '* ' + point, { fill: colors.textSecondary, fontSize: 11 });
    });

    // Less stable
    r.rect(360, 80, 290, 120, { fill: '#ef444430', stroke: colors.danger, rx: 12 });
    r.text(505, 105, 'Less Stable When:', { fill: colors.danger, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    const unstablePoints = ['Narrow base of support', 'High center of gravity', 'Top-heavy loading'];
    unstablePoints.forEach((point, i) => {
      r.text(380, 130 + i * 20, '* ' + point, { fill: colors.textSecondary, fontSize: 11 });
    });

    // Physics rule
    r.rect(50, 220, 600, 80, { fill: '#3b82f630', stroke: colors.cgMarker, rx: 12 });
    r.text(350, 250, 'The Physics Rule', { fill: colors.cgMarker, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 275, 'An object tips when the Center of Gravity moves OUTSIDE the Base of Support.', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 292, 'Gravity pulls straight down on the CG - if this line misses the base, it tips!', {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Loading Twist', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 110, 'Imagine loading cargo in a delivery truck.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 135, 'Does it matter if heavy boxes go on top or bottom?', {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'high_unstable';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 375, isCorrect ? 'Correct! Higher loads raise the center of gravity, making objects tip easier!' : 'Not quite - think about how load position affects the center of gravity.', {
        fill: isCorrect ? colors.success : colors.danger,
        fontSize: 12,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
    }
  }

  private renderTwistPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Loading Position Lab', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 540, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderTippingVisualization(r, 350, 100, this.twistTiltAngle, 'normal', this.twistHasTipped, this.loadPosition);

    // Result feedback
    if (this.twistHasTipped) {
      r.rect(100, 270, 500, 50, { fill: '#f59e0b30', rx: 12 });
      let message = '';
      if (this.loadPosition === 'high') message = 'High load tipped early! Higher CG = less stable.';
      else if (this.loadPosition === 'middle') message = 'Middle load tipped at a moderate angle.';
      else message = 'Low load lasted longest! Lower CG = more stable.';
      r.text(350, 300, message, { fill: colors.warning, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    }

    r.text(350, 360, `Experiments run: ${this.twistExperimentsRun} (need 2 to continue)`, {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Loading Effects', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 200, { fill: '#f59e0b20', stroke: colors.warning, rx: 16 });
    r.text(350, 110, 'The Complete Picture', {
      fill: colors.warning,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 145, 'Heavy items placed HIGH raise the center of gravity,', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 165, 'making objects tip at smaller angles.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });

    r.text(350, 195, 'Always load heavy items LOW for maximum stability!', {
      fill: colors.primary,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const examples = ['Trucks: Heavy cargo at bottom', 'SUVs: Higher CG = more rollover risk', 'Ships: Heavy cargo in lower holds', 'Backpacks: Heavy items close to back'];
    examples.forEach((ex, i) => {
      r.text(150, 230 + i * 18, '* ' + ex, { fill: colors.textSecondary, fontSize: 11 });
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

    r.text(350, 200, passed ? "You've mastered stability physics!" : 'Review the concepts and try again.', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });
  }

  private renderMasteryPhase(r: CommandRenderer): void {
    r.rect(150, 80, 400, 340, { fill: colors.bgCard, stroke: colors.border, rx: 24 });

    r.text(350, 130, 'Stability Physics Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, "You've mastered the physics of balance and tipping!", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const achievements = ['Center of Gravity concepts', 'Base of Support principles', 'Load Position effects', 'Vehicle safety applications'];

    achievements.forEach((ach, i) => {
      r.text(200, 210 + i * 30, '* ' + ach, {
        fill: colors.success,
        fontSize: 12,
      });
    });

    r.text(350, 360, "Now you know why tall things tip and wide things don't!", {
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
        r.addButton({ id: 'next', label: 'Discover the Secret', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_weight', label: 'A. Heavier = more stable', variant: this.prediction === 'weight' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_base', label: 'B. Wider base = stable', variant: this.prediction === 'base' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_height', label: 'C. Shorter = stable', variant: this.prediction === 'height' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_both', label: 'D. Base AND height (CG)', variant: this.prediction === 'both' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Explore Physics', variant: 'success' });
        }
        break;

      case 'play':
        r.addButton({ id: 'type_tall', label: 'Tall & Narrow', variant: this.objectType === 'tall' ? 'primary' : 'secondary' });
        r.addButton({ id: 'type_normal', label: 'Normal', variant: this.objectType === 'normal' ? 'primary' : 'secondary' });
        r.addButton({ id: 'type_wide', label: 'Wide & Short', variant: this.objectType === 'wide' ? 'primary' : 'secondary' });
        r.addButton({ id: 'tilt_decrease', label: '-5 deg', variant: 'ghost', disabled: this.hasTipped || this.tiltAngle <= 0 });
        r.addButton({ id: 'tilt_increase', label: '+5 deg', variant: 'success', disabled: this.hasTipped });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'ghost' });
        if (Object.keys(this.tippingAngles).length >= 2) {
          r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        }
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Discover Loading Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_no_difference', label: "A. Position doesn't matter", variant: this.twistPrediction === 'no_difference' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_high_unstable', label: 'B. High load tips easier', variant: this.twistPrediction === 'high_unstable' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_low_unstable', label: 'C. Low load tips easier', variant: this.twistPrediction === 'low_unstable' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Test Loading Positions', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addButton({ id: 'load_low', label: 'Low', variant: this.loadPosition === 'low' ? 'warning' : 'secondary' });
        r.addButton({ id: 'load_middle', label: 'Middle', variant: this.loadPosition === 'middle' ? 'warning' : 'secondary' });
        r.addButton({ id: 'load_high', label: 'High', variant: this.loadPosition === 'high' ? 'warning' : 'secondary' });
        r.addButton({ id: 'twist_tilt_decrease', label: '-5 deg', variant: 'ghost', disabled: this.twistHasTipped || this.twistTiltAngle <= 0 });
        r.addButton({ id: 'twist_tilt_increase', label: '+5 deg', variant: 'warning', disabled: this.twistHasTipped });
        r.addButton({ id: 'twist_reset', label: 'Reset', variant: 'ghost' });
        if (this.twistHasTipped) {
          r.addButton({ id: 'twist_try_another', label: 'Try Another', variant: 'warning' });
        }
        if (this.twistExperimentsRun >= 2) {
          r.addButton({ id: 'next', label: 'Review Findings', variant: 'primary' });
        }
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
      tiltAngle: this.tiltAngle,
      objectType: this.objectType,
      hasTipped: this.hasTipped,
      tippingAngles: this.tippingAngles,
      loadPosition: this.loadPosition,
      twistTiltAngle: this.twistTiltAngle,
      twistHasTipped: this.twistHasTipped,
      twistExperimentsRun: this.twistExperimentsRun,
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
    this.tiltAngle = (state.tiltAngle as number) || 0;
    this.objectType = (state.objectType as ObjectType) || 'normal';
    this.hasTipped = (state.hasTipped as boolean) || false;
    this.tippingAngles = (state.tippingAngles as Partial<Record<ObjectType, number>>) || {};
    this.loadPosition = (state.loadPosition as LoadPosition) || 'middle';
    this.twistTiltAngle = (state.twistTiltAngle as number) || 0;
    this.twistHasTipped = (state.twistHasTipped as boolean) || false;
    this.twistExperimentsRun = (state.twistExperimentsRun as number) || 0;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===

export function createTippingPointGame(sessionId: string): TippingPointGame {
  return new TippingPointGame(sessionId);
}
