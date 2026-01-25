/**
 * Angular Momentum Transfer Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Cat righting reflex physics
 * - Angular momentum transfer between body parts: L_front + L_back = 0
 * - Moment of inertia changes: I = mr^2 (extended vs tucked)
 * - Two-phase rotation sequence calculations
 * - Zero net angular momentum rotation techniques
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
    question: 'How can a cat rotate in mid-air without external torque?',
    options: ['It pushes against the air', 'It transfers angular momentum between body parts', 'Gravity helps it rotate', 'Cats have magic'],
    correctIndex: 1,
  },
  {
    question: 'When a cat extends one set of legs while tucking the other:',
    options: ['Both halves rotate the same amount', 'The tucked half rotates more', 'The extended half rotates more', 'Neither half rotates'],
    correctIndex: 1,
  },
  {
    question: 'During the righting reflex, the total angular momentum of the cat is:',
    options: ['Constantly increasing', 'Constantly decreasing', 'Zero (or constant)', 'Negative'],
    correctIndex: 2,
  },
  {
    question: 'The moment of inertia of extended legs compared to tucked legs is:',
    options: ['Smaller', 'Larger', 'The same', 'Undefined'],
    correctIndex: 1,
  },
  {
    question: 'If a body part has lower moment of inertia, it can rotate:',
    options: ['Slower', 'Faster for the same angular momentum', 'Not at all', 'Only backward'],
    correctIndex: 1,
  },
  {
    question: 'Astronauts can self-rotate in space using the same principle by:',
    options: ['Swimming through air', 'Extending and retracting limbs asymmetrically', 'Using jet packs', 'Pushing off walls only'],
    correctIndex: 1,
  },
  {
    question: 'The minimum height for a cat to right itself is approximately:',
    options: ['1 centimeter', '30 centimeters (about 1 foot)', '5 meters', 'Any height works'],
    correctIndex: 1,
  },
  {
    question: 'If a falling object has zero initial angular momentum, its final angular momentum will be:',
    options: ['Positive', 'Negative', 'Zero', 'Depends on shape'],
    correctIndex: 2,
  },
  {
    question: 'The cat righting problem was famously studied using:',
    options: ['Slow motion photography', 'Computer simulations only', 'Mathematical theory only', 'It has never been studied'],
    correctIndex: 0,
  },
  {
    question: 'A diver performing twists uses the same principle by:',
    options: ['Flapping arms like wings', 'Asymmetrically moving arms and legs', 'Holding completely still', 'Spinning before jumping'],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#f97316',
  primaryDark: '#ea580c',
  accent: '#06b6d4',
  accentDark: '#0891b2',
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
  cat: '#f97316',
  catLight: '#fb923c',
  catDark: '#ea580c',
  sky: '#0ea5e9',
  skyLight: '#7dd3fc',
  ground: '#22c55e',
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
    title: 'Diving & Gymnastics',
    icon: 'dive',
    description: 'Divers and gymnasts use asymmetric arm and leg movements to control twists in mid-air.',
    details: 'A diver can initiate a twist after leaving the board by dropping one shoulder and asymmetrically moving their arms.',
  },
  {
    title: 'Space Operations',
    icon: 'rocket',
    description: 'Astronauts use self-rotation techniques during spacewalks and inside spacecraft.',
    details: 'NASA trains astronauts in these maneuvers in underwater neutral buoyancy facilities.',
  },
  {
    title: 'Falling Robots',
    icon: 'robot',
    description: 'Aerial drones and falling robots use reaction wheels and limb movements to self-right.',
    details: 'Boston Dynamics robots use rapid limb movements to reorient during falls.',
  },
  {
    title: 'Ice Skating Spins',
    icon: 'skate',
    description: 'Skaters use arm positions to initiate and control twist direction.',
    details: 'A skater can start a spin in one direction, then use asymmetric arms to reverse or add twisting rotations.',
  },
];

// === MAIN GAME CLASS ===

export class AngularMomentumTransferGame extends BaseGame {
  readonly gameType = 'angular_momentum_transfer';
  readonly gameTitle = 'Angular Momentum Transfer';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private fallProgress = 0;
  private catRotation = 180; // Starts upside down
  private frontLegsExtended = false;
  private backLegsExtended = true;
  private isAnimating = false;
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
    twist_predict: 'Twist',
    twist_play: 'Demo',
    twist_review: 'Discovery',
    transfer: 'Apply',
    test: 'Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Cats always land on their feet - even when dropped upside down. How do they rotate with nothing to push against?',
    predict: 'Think about what happens when the cat extends one set of legs while tucking the other.',
    play: 'Watch how the cat transfers angular momentum between body parts to rotate without external torque!',
    review: 'The key: L_front + L_back = 0 always. By changing I of each part, rotation rates change asymmetrically.',
    twist_predict: 'Can astronauts use the same technique to rotate in zero gravity?',
    twist_play: 'Watch how astronauts use asymmetric limb movements - same physics as the cat!',
    twist_review: 'Angular momentum transfer works anywhere - in space, underwater, or in mid-air!',
    transfer: 'From diving to robotics - this principle is used everywhere!',
    test: 'Test your understanding of angular momentum transfer!',
    mastery: 'Congratulations! You understand the cat righting reflex!',
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
      message: 'Angular Momentum Transfer lesson started',
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
    // Navigation
    if (id === 'next') {
      this.goNext();
      return;
    }
    if (id === 'back') {
      this.goBack();
      return;
    }

    // Predictions - correct answer is C
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
    if (id === 'start_drop') {
      this.startCatDrop();
      return;
    }
    if (id === 'reset') {
      this.resetSimulation();
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'show_labels') {
      // Toggle label display
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
   * PROTECTED: Cat righting physics
   * Phase 1: Front legs tuck (small I, fast rotation), back legs extend (large I, slow counter-rotation)
   * Phase 2: Swap - front extends, back tucks. Net result: 180 degree rotation with zero angular momentum
   */
  private startCatDrop(): void {
    this.fallProgress = 0;
    this.catRotation = 180;
    this.frontLegsExtended = false;
    this.backLegsExtended = true;
    this.isAnimating = true;
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;

    this.time += deltaTime / 1000;

    // Update fall progress
    const progressInc = 2;
    this.fallProgress += progressInc;

    // Phase 1: 0-30% - Front legs tuck, back legs extend
    if (this.fallProgress < 30) {
      this.frontLegsExtended = false;
      this.backLegsExtended = true;
      // PROTECTED: Rotation calculation based on asymmetric inertia
      this.catRotation = 180 - (this.fallProgress / 30) * 90;
    }
    // Phase 2: 30-60% - Swap configuration
    else if (this.fallProgress < 60) {
      this.frontLegsExtended = true;
      this.backLegsExtended = false;
      // PROTECTED: Back half catches up
      this.catRotation = 90 - ((this.fallProgress - 30) / 30) * 90;
    }
    // Phase 3: 60-100% - Prepare for landing
    else if (this.fallProgress < 100) {
      this.frontLegsExtended = true;
      this.backLegsExtended = true;
      this.catRotation = Math.max(0, 0 - ((this.fallProgress - 60) / 40) * 5);
    }
    // Reset when complete
    else {
      this.isAnimating = false;
      this.fallProgress = 0;
    }
  }

  private resetSimulation(): void {
    this.fallProgress = 0;
    this.catRotation = 180;
    this.frontLegsExtended = false;
    this.backLegsExtended = true;
    this.isAnimating = false;
    this.time = 0;
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

  // --- CAT RENDERER ---

  private renderCat(r: CommandRenderer, centerX: number, centerY: number, size: number = 200): void {
    const scale = size / 200;

    // Sky background
    r.linearGradient('skyGrad', [
      { offset: '0%', color: colors.sky },
      { offset: '100%', color: colors.skyLight },
    ]);
    r.rect(centerX - 100 * scale, centerY - 100 * scale, 200 * scale, 200 * scale, { fill: 'url(#skyGrad)', rx: 10 });

    // Ground indicator
    r.rect(centerX - 100 * scale, centerY + 85 * scale, 200 * scale, 15 * scale, { fill: colors.ground });

    // Cat body (rotated)
    r.group(`translate(${centerX}, ${centerY}) rotate(${this.catRotation})`, (g) => {
      // Back body segment
      g.ellipse(20 * scale, 0, 30 * scale, 20 * scale, { fill: colors.cat });

      // Back legs
      if (this.backLegsExtended) {
        g.rect(30 * scale, -25 * scale, 8 * scale, 30 * scale, { fill: colors.catDark, rx: 3 });
        g.rect(30 * scale, -5 * scale, 8 * scale, 30 * scale, { fill: colors.catDark, rx: 3 });
      } else {
        g.rect(35 * scale, -12 * scale, 6 * scale, 15 * scale, { fill: colors.catDark, rx: 3 });
        g.rect(35 * scale, -3 * scale, 6 * scale, 15 * scale, { fill: colors.catDark, rx: 3 });
      }

      // Tail
      g.path(`M${45 * scale},0 Q${60 * scale},${-10 * scale} ${70 * scale},${5 * scale} Q${80 * scale},${20 * scale} ${70 * scale},${25 * scale}`, {
        fill: 'none',
        stroke: colors.catDark,
        strokeWidth: 6 * scale,
        strokeLinecap: 'round',
      });

      // Front body segment
      g.ellipse(-20 * scale, 0, 25 * scale, 18 * scale, { fill: colors.catLight });

      // Head
      g.circle(-45 * scale, 0, 18 * scale, { fill: colors.cat });

      // Ears
      g.polygon([
        { x: -55 * scale, y: -15 * scale },
        { x: -58 * scale, y: -30 * scale },
        { x: -48 * scale, y: -18 * scale },
      ], { fill: colors.catDark });
      g.polygon([
        { x: -35 * scale, y: -15 * scale },
        { x: -32 * scale, y: -30 * scale },
        { x: -42 * scale, y: -18 * scale },
      ], { fill: colors.catDark });

      // Face
      g.circle(-50 * scale, -3 * scale, 3 * scale, { fill: colors.bgDark });
      g.circle(-40 * scale, -3 * scale, 3 * scale, { fill: colors.bgDark });
      g.ellipse(-45 * scale, 5 * scale, 4 * scale, 2 * scale, { fill: '#fda4af' });

      // Front legs
      if (this.frontLegsExtended) {
        g.rect(-35 * scale, -25 * scale, 8 * scale, 30 * scale, { fill: colors.catDark, rx: 3 });
        g.rect(-35 * scale, -5 * scale, 8 * scale, 30 * scale, { fill: colors.catDark, rx: 3 });
      } else {
        g.rect(-30 * scale, -12 * scale, 6 * scale, 15 * scale, { fill: colors.catDark, rx: 3 });
        g.rect(-30 * scale, -3 * scale, 6 * scale, 15 * scale, { fill: colors.catDark, rx: 3 });
      }
    });

    // Stats display
    r.rect(centerX - 80, centerY + 110 * scale, 70, 40, { fill: colors.bgCardLight, rx: 8 });
    r.text(centerX - 45, centerY + 125 * scale, 'ROTATION', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
    r.text(centerX - 45, centerY + 142 * scale, `${Math.round(180 - this.catRotation)} deg`, {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(centerX + 10, centerY + 110 * scale, 70, 40, { fill: colors.bgCardLight, rx: 8 });
    r.text(centerX + 45, centerY + 125 * scale, 'PROGRESS', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
    r.text(centerX + 45, centerY + 142 * scale, `${Math.round(this.fallProgress)}%`, {
      fill: colors.accent,
      fontSize: 14,
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

    r.text(350, 100, 'The Cat Righting Reflex', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'How do cats always land on their feet with nothing to push against?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.rect(160, 150, 380, 260, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 20,
      opacity: 0.8,
    });

    this.renderCat(r, 350, 270, 180);
  }

  private renderPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 115, 'A cat is dropped upside down in free fall.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 145, 'How does it manage to rotate and land on its feet?', {
      fill: colors.textPrimary,
      fontSize: 16,
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
        isCorrect
          ? 'Correct! Cats use angular momentum transfer between body parts!'
          : 'Not quite. Think about how the cat can rotate its parts independently.',
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
    r.text(350, 30, 'Cat Righting Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    this.renderCat(r, 350, 200, 200);

    // Explanation
    r.rect(120, 360, 460, 120, { fill: colors.bgCardLight, stroke: colors.border, rx: 16 });
    r.text(350, 385, 'The Two-Phase Righting Reflex:', { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(140, 400, 180, 60, { fill: '#ea580c20', rx: 8 });
    r.text(230, 415, 'Phase 1', { fill: colors.primary, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(230, 435, 'Front legs tuck (small I)', { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });
    r.text(230, 450, 'Front half rotates more', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });

    r.rect(380, 400, 180, 60, { fill: '#f59e0b20', rx: 8 });
    r.text(470, 415, 'Phase 2', { fill: colors.warning, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(470, 435, 'Swap: back tucks', { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });
    r.text(470, 450, 'Back half catches up', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Angular Momentum Transfer', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 290, 160, { fill: '#ea580c40', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'The Core Principle', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const coreInfo = [
      'Total L must stay constant (zero)',
      'L = I x w for each part',
      'Small I = fast rotation',
      'Large I = slow rotation',
      'By alternating, net rotation accumulates!',
    ];
    coreInfo.forEach((line, i) => {
      r.text(70, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 10 });
    });

    r.rect(360, 70, 290, 160, { fill: '#06b6d440', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Cat\'s Flexible Spine', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const catInfo = [
      'Extremely flexible spine',
      'Front/back rotate almost independently',
      '30+ vertebrae for twist ability',
      'No collarbone = free front legs',
      'Reflexes complete in < 0.3 seconds!',
    ];
    catInfo.forEach((line, i) => {
      r.text(380, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 10 });
    });

    r.rect(50, 250, 600, 80, { fill: '#06533940', stroke: colors.success, rx: 16 });
    r.text(350, 275, 'The Math', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 300, 'L_front + L_back = 0 (always). When front is tucked: I_front is small, so w_front is large', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
    r.text(350, 318, 'Net: Front rotates 90 deg while back counter-rotates only 30 deg. Then swap!', {
      fill: colors.textPrimary,
      fontSize: 11,
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
    r.text(350, 125, 'An astronaut floats in the middle of a space station, not touching anything.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 155, 'They are facing the wrong direction for their task.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 185, 'Can they rotate without grabbing anything?', {
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
          ? 'Yes! Astronauts can self-rotate using the exact same physics!'
          : 'Think about how the cat rotates with nothing to push against.',
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
    r.text(350, 30, 'Astronaut Self-Rotation', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Cat method
    r.rect(80, 60, 240, 180, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(200, 90, 'Cat Method', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 120, 'Flexible spine rotation', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(200, 145, 'Front/back halves twist', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(200, 170, 'asymmetrically', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(200, 210, 'Complete in < 0.3s', { fill: colors.success, fontSize: 11, textAnchor: 'middle' });

    // Astronaut method
    r.rect(380, 60, 240, 180, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(500, 90, 'Astronaut Method', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(500, 120, 'Asymmetric arm circles', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(500, 145, 'Bicycle leg motions', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(500, 170, 'Hula hip rotations', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(500, 210, 'Slower but same physics!', { fill: colors.warning, fontSize: 11, textAnchor: 'middle' });

    r.rect(120, 270, 460, 80, { fill: colors.bgCardLight, stroke: colors.primary, rx: 16 });
    r.text(350, 295, 'Both use the same principle:', { fill: colors.textPrimary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 320, 'Transfer angular momentum between body parts while keeping total L = 0', {
      fill: colors.textSecondary,
      fontSize: 12,
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

    r.rect(100, 90, 500, 200, { fill: '#78350f30', stroke: colors.warning, rx: 16 });
    r.text(350, 120, 'Angular Momentum Transfer Is Universal!', {
      fill: colors.warning,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(150, 155, 'Any object with movable parts can change orientation by:', {
      fill: colors.textSecondary,
      fontSize: 12,
    });

    const steps = [
      '1. Moving parts to change moment of inertia distribution',
      '2. Rotating different sections at different rates',
      '3. Repeating with reversed configuration',
      '4. Accumulating net rotation over multiple cycles',
    ];
    steps.forEach((step, i) => {
      r.text(170, 180 + i * 22, step, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.text(350, 280, 'This works in space, underwater, in mid-air - anywhere!', {
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

    r.text(350, 200, passed ? 'Excellent! You have mastered angular momentum transfer!' : 'Keep studying! Review and try again.', {
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

    r.text(350, 165, 'You have mastered angular momentum transfer and the cat righting reflex!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'transfer', label: 'Momentum Transfer' },
      { icon: 'cat', label: 'Righting Reflex' },
      { icon: 'rocket', label: 'Space Maneuvers' },
      { icon: 'I=mr^2', label: 'Moment of Inertia' },
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
        r.addButton({ id: 'start_drop', label: 'Watch Cat Fall', variant: 'ghost' });
        r.addButton({ id: 'next', label: 'Discover the Secret', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. It pushes against the air', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Gravity pulls one side first', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Transfers angular momentum between body parts', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. Cats have anti-gravity organs', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Explore the Physics', variant: 'success' });
        }
        break;

      case 'play':
        r.addButton({ id: 'start_drop', label: 'Start Cat Drop', variant: 'primary' });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'ghost' });
        r.addButton({ id: 'next', label: 'Review the Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Try a Challenge', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. No - impossible without pushing', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Yes - same technique as cats', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Only by throwing something', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D. Only with special equipment', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See How', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addButton({ id: 'next', label: 'Review the Discovery', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real-World Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Diving', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Space', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Robots', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Skating', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
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
      fallProgress: this.fallProgress,
      catRotation: this.catRotation,
      frontLegsExtended: this.frontLegsExtended,
      backLegsExtended: this.backLegsExtended,
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
    this.fallProgress = (state.fallProgress as number) || 0;
    this.catRotation = (state.catRotation as number) || 180;
    this.frontLegsExtended = (state.frontLegsExtended as boolean) || false;
    this.backLegsExtended = (state.backLegsExtended as boolean) ?? true;
    this.isAnimating = (state.isAnimating as boolean) || false;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===
export function createAngularMomentumTransferGame(sessionId: string): AngularMomentumTransferGame {
  return new AngularMomentumTransferGame(sessionId);
}
