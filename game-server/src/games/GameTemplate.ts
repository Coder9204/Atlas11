/**
 * GAME TEMPLATE - Copy this file to create a new server-side game
 *
 * Instructions:
 * 1. Copy this file to src/games/{category}/{GameName}Game.ts
 * 2. Replace all TEMPLATE placeholders with your game's values
 * 3. Implement the game logic in handleInput(), update(), and render()
 * 4. Register the game in src/server.ts
 *
 * KEY PRINCIPLE: All game logic stays HERE on the server.
 * Client receives ONLY draw commands (shapes, positions, colors).
 */

import { BaseGame } from '../types/GameInstance.js';
import { GameFrame } from '../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../types/UserInput.js';
import { CommandRenderer } from '../renderer/CommandRenderer.js';
// Utility functions available if needed:
// import { clamp, lerp } from '../renderer/CommandRenderer.js';

// === INTELLIGENT LABELING SYSTEM ===
// Import these for smart label positioning that avoids overlaps
import {
  LabelingEngine,
  createLabelingEngine,
  LabelDefinition,
  ViewportType,
} from '../labeling/index.js';

// === SMART DESIGN SYSTEM ===
// Import these for realistic, clear graphics with proper spacing
import {
  // Object styles
  BALL_STYLES,
  ARROW_STYLES,
  MARKER_STYLES,
  COLORS,
  SHADOWS,
  createCustomBallStyle,
  // Layout
  LayoutEngine,
  createLayoutEngine,
  // Interaction design
  COMMON_SLIDERS,
  slider,
  // 3D visualization (if needed)
  getRecommendedVisualization,
  projectIsometric,
} from '../design/index.js';

// === GAME PHASES ===
// Customize these for your game
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

// === TEST QUESTIONS (PROTECTED - never sent to client) ===
interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

// TODO: Add your test questions here
const testQuestions: TestQuestion[] = [
  {
    question: 'TEMPLATE: Replace with your first question',
    options: ['Option A', 'Option B (correct)', 'Option C', 'Option D'],
    correctIndex: 1,
  },
  // Add 9 more questions for a complete 10-question test
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#06b6d4',
  primaryDark: '#0891b2',
  accent: '#a855f7',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  bgDark: '#020617',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
};

// === MAIN GAME CLASS ===

export class TemplateGame extends BaseGame {
  // TODO: Change these to match your game
  readonly gameType = 'template_game'; // Must match registration key
  readonly gameTitle = 'Template Game Title';

  // --- PROTECTED GAME STATE (never sent to client) ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // TODO: Add your game-specific state variables here
  // Examples:
  // private velocity = 0;
  // private angle = 45;
  // private score = 0;
  // private particles: Array<{x: number, y: number}> = [];

  // Simulation state
  private time = 0;
  private isSimulating = false;

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

  // === LABELING ENGINE ===
  // The labeling engine handles intelligent label positioning
  // to avoid overlaps and maintain clarity across viewports
  private labelEngine = createLabelingEngine();
  private currentViewport: ViewportType = 'desktop';

  // === LAYOUT ENGINE ===
  // The layout engine handles smart spacing and safe zones
  private layoutEngine = createLayoutEngine(700, 350);

  // Phase configuration
  private readonly phaseOrder: GamePhase[] = [
    'hook', 'predict', 'play', 'review',
    'twist_predict', 'twist_play', 'twist_review',
    'transfer', 'test', 'mastery',
  ];

  private readonly phaseLabels: Record<GamePhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  // TODO: Customize coach messages for your game
  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Welcome! Let\'s explore this fascinating concept.',
    predict: 'What do you think will happen? Make a prediction!',
    play: 'Now let\'s run the experiment and see what happens.',
    review: 'Great observations! Let\'s understand why this happens.',
    twist_predict: 'What if we change something? Make another prediction.',
    twist_play: 'Explore how the new variable affects the outcome.',
    twist_review: 'You\'ve discovered something important!',
    transfer: 'Let\'s see how this applies to the real world.',
    test: 'Time to test your understanding!',
    mastery: 'Congratulations! You\'ve mastered this concept!',
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

    // === VIEWPORT DETECTION FOR LABELING ===
    // Detect viewport type from session config for intelligent label positioning
    if (config.viewport) {
      const width = config.viewport.width;
      if (width < 768) {
        this.currentViewport = 'mobile';
      } else if (width < 1024) {
        this.currentViewport = 'tablet';
      } else {
        this.currentViewport = 'desktop';
      }
      this.labelEngine.setViewport(this.currentViewport);
    }

    this.emitCoachEvent('game_started', {
      phase: this.phase,
      phaseLabel: this.phaseLabels[this.phase],
      message: `${this.gameTitle} started`,
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
    if (id === 'next') { this.goNext(); return; }
    if (id === 'back') { this.goBack(); return; }

    // Predictions
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }
    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
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
    if (id === 'start') { this.isSimulating = true; return; }
    if (id === 'stop') { this.isSimulating = false; return; }
    if (id === 'reset') { this.resetSimulation(); return; }

    // TODO: Add your game-specific button handlers here
  }

  private handleToggleChange(id: string, value: boolean): void {
    // TODO: Handle your game-specific toggles
    // Example:
    // if (id === 'gravity') { this.gravityEnabled = value; return; }
  }

  private handleSliderChange(id: string, value: number): void {
    // TODO: Handle your game-specific sliders
    // Example:
    // if (id === 'angle') { this.angle = value; return; }
    // if (id === 'velocity') { this.velocity = value; return; }
  }

  private handleProgressClick(index: number): void {
    const currentIdx = this.phaseOrder.indexOf(this.phase);
    if (index < currentIdx) {
      this.goToPhase(this.phaseOrder[index]);
    }
  }

  private handleHintRequest(): void {
    // TODO: Customize hints for each phase
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

    setTimeout(() => { this.isNavigating = false; }, 400);
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

  update(deltaTime: number): void {
    if (!this.isSimulating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play') return;

    this.time += deltaTime / 1000;

    // TODO: Implement your physics simulation here
    // This is where your protected formulas and algorithms go
    // Example:
    // this.position.x += this.velocity.x * deltaTime / 1000;
    // this.position.y += this.velocity.y * deltaTime / 1000 + 0.5 * g * (deltaTime/1000)^2;
  }

  private resetSimulation(): void {
    this.time = 0;
    this.isSimulating = false;
    // TODO: Reset your game-specific state
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
    const r = new CommandRenderer(700, 350);
    r.reset();

    // === LABELING WORKFLOW ===
    // Step 1: Clear label engine for new frame
    this.labelEngine.clear();

    // Background
    r.clear(colors.bgDark);

    // Phase-specific content
    switch (this.phase) {
      case 'hook':
        this.renderHook(r);
        break;
      case 'predict':
        this.renderPredict(r);
        break;
      case 'play':
      case 'twist_play':
        this.renderPlay(r);
        break;
      case 'review':
      case 'twist_review':
        this.renderReview(r);
        break;
      case 'twist_predict':
        this.renderTwistPredict(r);
        break;
      case 'transfer':
        this.renderTransfer(r);
        break;
      case 'test':
        this.renderTest(r);
        break;
      case 'mastery':
        this.renderMastery(r);
        break;
    }

    // UI state
    this.renderUI(r);

    // === LABELING OUTPUT ===
    // Step 4: Use toFrameWithLabels() for phases with registered labels
    // This computes optimal positions and renders labels automatically
    if (this.phase === 'play' || this.phase === 'twist_play') {
      return r.toFrameWithLabels(this.nextFrame(), this.labelEngine);
    }

    // For phases without labels, use standard toFrame()
    return r.toFrame(this.nextFrame());
  }

  // --- PHASE RENDERERS ---

  private renderHook(r: CommandRenderer): void {
    r.text(350, 80, this.gameTitle, {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 120, 'TODO: Add your hook content here', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    // TODO: Render introduction visuals
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(350, 60, 'What do you predict will happen?', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // TODO: Render prediction visuals
  }

  private renderPlay(r: CommandRenderer): void {
    // TODO: Render your interactive simulation
    // This is where you visualize your physics using draw commands

    r.text(350, 30, `Time: ${this.time.toFixed(1)}s`, {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // === SMART DESIGN SYSTEM EXAMPLE ===
    // Here's how to create realistic, clear graphics with proper spacing

    // --- STEP 1: Configure layout engine ---
    this.layoutEngine.setViewport(this.currentViewport);
    this.layoutEngine.clear();

    // Get available space (respects safe zones)
    const available = this.layoutEngine.getAvailableSpace();
    const center = this.layoutEngine.getGraphicCenter();

    // --- STEP 2: Use realistic object styles ---
    // The BALL_STYLES provide pre-configured realistic appearances
    const ballStyle = BALL_STYLES.standard;
    const targetStyle = MARKER_STYLES.target;

    // Get optimal positions with proper spacing
    const positions = this.layoutEngine.getHorizontalPositions(60, 2, center.y);
    const ballPos = positions[0];
    const targetPos = positions[1];

    // --- STEP 3: Draw with realistic styles ---
    // Ball with gradient for 3D effect
    const ballRadius = 30;

    // Add gradient definition for realistic metallic look
    r.radialGradient('ball_gradient', [
      { offset: '0%', color: COLORS.primary.light },
      { offset: '50%', color: COLORS.primary.base },
      { offset: '100%', color: COLORS.primary.dark },
    ], { cx: '30%', cy: '30%', r: '70%' });

    // Draw shadow first (for depth)
    r.ellipse(ballPos.x + 4, ballPos.y + ballRadius + 8, ballRadius * 0.8, ballRadius * 0.3, {
      fill: 'rgba(0,0,0,0.2)',
      id: 'ball_shadow',
    });

    // Draw ball with realistic gradient
    r.circle(ballPos.x, ballPos.y, ballRadius, {
      fill: 'url(#ball_gradient)',
      stroke: COLORS.primary.dark,
      strokeWidth: 1,
      id: 'ball',
    });

    // Add specular highlight for 3D effect
    r.ellipse(ballPos.x - 8, ballPos.y - 8, 6, 4, {
      fill: 'rgba(255,255,255,0.6)',
      id: 'ball_highlight',
    });

    // Draw target with realistic style
    r.circle(targetPos.x, targetPos.y, 25, {
      fill: COLORS.success.base,
      stroke: COLORS.success.dark,
      strokeWidth: 2,
      id: 'target',
    });

    // --- STEP 4: Register elements for labeling ---
    this.layoutEngine.placeObject('ball', {
      x: ballPos.x - ballRadius,
      y: ballPos.y - ballRadius,
      width: ballRadius * 2,
      height: ballRadius * 2,
    });

    r.registerCircleElement(this.labelEngine, 'ball', ballPos.x, ballPos.y, ballRadius, {
      isInteractive: true,
    });

    this.layoutEngine.placeObject('target', {
      x: targetPos.x - 25,
      y: targetPos.y - 25,
      width: 50,
      height: 50,
    });

    r.registerCircleElement(this.labelEngine, 'target', targetPos.x, targetPos.y, 25);

    // --- STEP 5: Register labels with educational context ---
    this.labelEngine.registerLabel({
      id: 'ball_label',
      targetId: 'ball',
      fullText: 'Projectile',
      abbreviation: 'P',
      useAbbreviationAfter: 2,
      anchor: 'top',
      offset: { x: 0, y: -10 },
      priority: 'high',
      style: {
        fill: colors.textPrimary,
        fontSize: 12,
        background: { fill: 'rgba(0,0,0,0.7)', padding: 4, borderRadius: 4 },
      },
      viewportOverrides: {
        mobile: { anchor: 'right', fontSize: 10 },
      },
    });

    this.labelEngine.registerLabel({
      id: 'target_label',
      targetId: 'target',
      fullText: 'Target',
      anchor: 'bottom',
      offset: { x: 0, y: 10 },
      priority: 'medium',
      style: {
        fill: colors.textPrimary,
        fontSize: 12,
        background: { fill: 'rgba(0,0,0,0.7)', padding: 4, borderRadius: 4 },
      },
    });

    // --- STEP 6: Verify layout (optional, for debugging) ---
    // const layoutResult = this.layoutEngine.analyze();
    // if (layoutResult.issues.length > 0) {
    //   console.warn('Layout issues:', layoutResult.issues);
    // }

    // Note: Labels are rendered automatically in toFrameWithLabels()
  }

  private renderReview(r: CommandRenderer): void {
    const title = this.phase === 'review' ? 'What We Learned' : 'Key Insight';

    r.text(350, 60, title, {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // TODO: Render review content
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 60, 'What if we change something?', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // TODO: Render twist prediction content
  }

  private renderTransfer(r: CommandRenderer): void {
    const apps = ['App 1', 'App 2', 'App 3', 'App 4']; // TODO: Replace with real applications

    r.text(350, 40, 'Real-World Applications', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // App tabs
    apps.forEach((app, i) => {
      r.rect(50 + i * 160, 80, 150, 40, {
        fill: i === this.selectedApp ? colors.primary : colors.bgCard,
        stroke: this.completedApps[i] ? colors.success : colors.border,
        rx: 8,
      });
      r.text(125 + i * 160, 105, app, {
        fill: colors.textPrimary,
        fontSize: 12,
        textAnchor: 'middle',
      });
    });

    // TODO: Render selected app content
  }

  private renderTest(r: CommandRenderer): void {
    if (this.testSubmitted) {
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

      r.rect(100, 120 + i * 50, 500, 40, {
        fill: isSelected ? `${colors.primary}40` : colors.bgCard,
        stroke: isSelected ? colors.primary : colors.border,
        rx: 8,
      });
      r.text(350, 145 + i * 50, option, {
        fill: isSelected ? colors.primary : colors.textSecondary,
        fontSize: 14,
        textAnchor: 'middle',
      });
    });
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(350, 100, '🎉', { fontSize: 60, textAnchor: 'middle' });

    r.text(350, 180, 'You\'ve Mastered', {
      fill: colors.textSecondary,
      fontSize: 18,
      textAnchor: 'middle',
    });

    r.text(350, 220, this.gameTitle, {
      fill: colors.primary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  // --- UI STATE ---

  private renderUI(r: CommandRenderer): void {
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

    // Back button
    if (idx > 0) {
      r.addButton({ id: 'back', label: '← Back', variant: 'secondary' });
    }

    // Phase-specific controls
    switch (this.phase) {
      case 'predict':
        // TODO: Add your prediction options
        r.addButton({ id: 'predict_option1', label: 'Option 1', variant: this.prediction === 'option1' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_option2', label: 'Option 2', variant: this.prediction === 'option2' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Continue →', variant: 'success' });
        }
        break;

      case 'play':
      case 'twist_play':
        // TODO: Add your simulation controls
        // r.addSlider({ id: 'angle', label: 'Angle', value: this.angle, min: 0, max: 90 });
        r.addButton({ id: this.isSimulating ? 'stop' : 'start', label: this.isSimulating ? 'Stop' : 'Start', variant: 'primary' });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
        r.addButton({ id: 'next', label: 'Continue →', variant: 'success' });
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: '← Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next →', variant: 'ghost', disabled: this.testQuestion >= testQuestions.length - 1 });
          if (this.testAnswers.every(a => a !== null)) {
            r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
          }
        } else {
          const score = this.calculateTestScore();
          r.addButton({ id: score >= 7 ? 'next' : 'back', label: score >= 7 ? 'Complete! →' : 'Review', variant: score >= 7 ? 'success' : 'secondary' });
        }
        break;

      default:
        r.addButton({ id: 'next', label: 'Continue →', variant: 'primary' });
    }
  }

  // === STATE MANAGEMENT ===

  getCurrentPhase(): string {
    return this.phase;
  }

  getState(): Record<string, any> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      time: this.time,
      isSimulating: this.isSimulating,
      testQuestion: this.testQuestion,
      testAnswers: this.testAnswers,
      testSubmitted: this.testSubmitted,
      selectedApp: this.selectedApp,
      completedApps: this.completedApps,
      guidedMode: this.guidedMode,
      // TODO: Add your game-specific state
    };
  }

  restoreState(state: Record<string, any>): void {
    this.phase = state.phase || 'hook';
    this.prediction = state.prediction || null;
    this.twistPrediction = state.twistPrediction || null;
    this.time = state.time || 0;
    this.isSimulating = state.isSimulating || false;
    this.testQuestion = state.testQuestion || 0;
    this.testAnswers = state.testAnswers || Array(10).fill(null);
    this.testSubmitted = state.testSubmitted || false;
    this.selectedApp = state.selectedApp || 0;
    this.completedApps = state.completedApps || [false, false, false, false];
    this.guidedMode = state.guidedMode ?? true;
    // TODO: Restore your game-specific state
  }
}

// === FACTORY FUNCTION ===
// Register this in server.ts: registry.register('template_game', createTemplateGame);
export function createTemplateGame(sessionId: string): TemplateGame {
  return new TemplateGame(sessionId);
}
