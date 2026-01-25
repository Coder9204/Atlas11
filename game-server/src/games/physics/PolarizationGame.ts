/**
 * Polarization Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Malus's Law: I = I₀cos²(θ)
 * - Polarizer angle calculations
 * - Light intensity through multiple polarizers
 * - Crossed polarizer configurations
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
    question: "Malus's Law states that light intensity through a polarizer is:",
    options: ['I = I₀sinθ', 'I = I₀cos²θ', 'I = I₀tanθ', 'I = I₀/θ'],
    correctIndex: 1,
  },
  {
    question: 'Two polarizers with perpendicular axes (90° apart) transmit:',
    options: ['100% of light', '50% of light', '25% of light', '0% of light'],
    correctIndex: 3,
  },
  {
    question: 'Unpolarized light passing through an ideal polarizer loses what fraction of intensity?',
    options: ['None', 'One quarter', 'One half', 'Three quarters'],
    correctIndex: 2,
  },
  {
    question: 'Adding a 45° polarizer between two crossed polarizers:',
    options: ['Still blocks all light', 'Allows some light through', 'Doubles the intensity', 'Has no effect'],
    correctIndex: 1,
  },
  {
    question: '3D movie glasses work by:',
    options: ['Different colors for each eye', 'Perpendicular polarizations for each eye', 'Different brightness levels', 'Rapid flickering'],
    correctIndex: 1,
  },
  {
    question: 'What happens when polarizers are aligned at 0°?',
    options: ['Maximum transmission', 'No transmission', '50% transmission', 'Light bends'],
    correctIndex: 0,
  },
  {
    question: 'LCD screens use polarizers to:',
    options: ['Create colors', 'Control light passage through liquid crystals', 'Increase brightness', 'Reduce heat'],
    correctIndex: 1,
  },
  {
    question: 'If three polarizers are at 0°, 30°, and 60°, the final intensity is:',
    options: ['I₀/2', 'I₀ × cos²(30°) × cos²(30°) × 0.5', '0', 'I₀'],
    correctIndex: 1,
  },
  {
    question: 'Polarized sunglasses reduce glare because reflected light is:',
    options: ['Randomly polarized', 'Horizontally polarized', 'Circularly polarized', 'Unpolarized'],
    correctIndex: 1,
  },
  {
    question: 'The angle between two polarizers for 25% transmission of polarized light is:',
    options: ['30°', '45°', '60°', '90°'],
    correctIndex: 2,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#8b5cf6',
  primaryDark: '#7c3aed',
  accent: '#f59e0b',
  accentDark: '#d97706',
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
  polarizer: '#a855f7',
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
    title: '3D Cinema',
    icon: 'movie',
    description: '3D movies project two images with perpendicular polarizations - one for each eye.',
    details: 'Special glasses have polarized lenses that only let the correct image reach each eye, creating the illusion of depth.',
  },
  {
    title: 'LCD Displays',
    icon: 'screen',
    description: 'Liquid crystals rotate light polarization when voltage is applied.',
    details: 'Crossed polarizers sandwich the liquid crystal layer - when crystals align, light passes through.',
  },
  {
    title: 'Sunglasses',
    icon: 'sunglasses',
    description: 'Polarized sunglasses block horizontally polarized glare from reflective surfaces.',
    details: 'Light reflected from water, roads, and snow is predominantly horizontally polarized.',
  },
  {
    title: 'Photography',
    icon: 'camera',
    description: 'Polarizing filters reduce reflections and enhance color saturation in photos.',
    details: 'Rotating the filter adjusts which polarization angles are blocked.',
  },
];

// === MAIN GAME CLASS ===

export class PolarizationGame extends BaseGame {
  readonly gameType = 'polarization';
  readonly gameTitle = 'Polarization & Malus\'s Law';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private polarizer1Angle = 0;
  private polarizer2Angle = 45;
  private polarizer3Angle = 90;
  private usePolarizer3 = false;
  private showIntensityGraph = true;
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
    hook: 'What happens when light passes through polarized lenses? The answer is surprisingly mathematical!',
    predict: 'When two polarizers are at 90°, no light gets through. But what if they\'re at 45°?',
    play: 'Rotate the polarizers and watch how intensity changes. Can you find the pattern?',
    review: 'Malus\'s Law: I = I₀cos²θ. The cosine squared relationship is key!',
    twist_predict: 'What happens if we add a THIRD polarizer between two crossed ones?',
    twist_play: 'Add a 45° polarizer between crossed polarizers. Something surprising happens!',
    twist_review: 'Each polarizer rotates the light - that\'s how the middle one lets light through!',
    transfer: 'Polarization is everywhere: 3D movies, LCD screens, sunglasses, and more!',
    test: 'Time to test your understanding of polarization physics!',
    mastery: 'Congratulations! You\'ve mastered polarization and Malus\'s Law!',
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
      message: 'Polarization lesson started',
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

    if (id === 'toggle_animation') {
      this.isAnimating = !this.isAnimating;
      return;
    }
    if (id === 'reset') {
      this.resetSimulation();
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'polarizer3') {
      this.usePolarizer3 = value;
      return;
    }
    if (id === 'graph') {
      this.showIntensityGraph = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'polarizer1') {
      this.polarizer1Angle = value;
      return;
    }
    if (id === 'polarizer2') {
      this.polarizer2Angle = value;
      return;
    }
    if (id === 'polarizer3') {
      this.polarizer3Angle = value;
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
   * PROTECTED: Malus's Law calculation
   * I = I₀ × cos²(θ)
   */
  private calculateIntensityAfterPolarizer(inputIntensity: number, angleDifference: number): number {
    const angleRad = (angleDifference * Math.PI) / 180;
    return inputIntensity * Math.cos(angleRad) ** 2;
  }

  /**
   * PROTECTED: Calculate final intensity through polarizer chain
   */
  private calculateFinalIntensity(): number {
    // Unpolarized light through first polarizer: 50%
    let intensity = 0.5;

    if (this.usePolarizer3) {
      // Through middle polarizer (polarizer3)
      const angle1 = this.polarizer3Angle - this.polarizer1Angle;
      intensity = this.calculateIntensityAfterPolarizer(intensity, angle1);

      // Through final polarizer (polarizer2)
      const angle2 = this.polarizer2Angle - this.polarizer3Angle;
      intensity = this.calculateIntensityAfterPolarizer(intensity, angle2);
    } else {
      // Just two polarizers
      const angle = this.polarizer2Angle - this.polarizer1Angle;
      intensity = this.calculateIntensityAfterPolarizer(intensity, angle);
    }

    return intensity;
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;

    this.time += deltaTime / 1000;
  }

  private resetSimulation(): void {
    this.polarizer1Angle = 0;
    this.polarizer2Angle = 45;
    this.polarizer3Angle = 45;
    this.usePolarizer3 = false;
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

  private renderPolarizersVisualization(r: CommandRenderer, centerX: number, centerY: number): void {
    const intensity = this.calculateFinalIntensity();

    // Light source
    r.circle(centerX - 180, centerY, 30, { fill: colors.lightBeam, opacity: 0.9 });
    r.text(centerX - 180, centerY + 50, 'Light Source', {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle',
    });

    // First polarizer
    this.renderPolarizer(r, centerX - 80, centerY, this.polarizer1Angle, '1');

    // Optional middle polarizer
    if (this.usePolarizer3) {
      this.renderPolarizer(r, centerX, centerY, this.polarizer3Angle, '3');
    }

    // Second polarizer
    this.renderPolarizer(r, centerX + 80, centerY, this.polarizer2Angle, '2');

    // Output beam
    const beamOpacity = Math.max(0.05, intensity);
    r.rect(centerX + 130, centerY - 15, 100, 30, {
      fill: colors.lightBeam,
      opacity: beamOpacity,
      rx: 4,
    });

    // Intensity display
    r.text(centerX + 180, centerY + 50, `${(intensity * 100).toFixed(1)}%`, {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderPolarizer(r: CommandRenderer, x: number, y: number, angle: number, label: string): void {
    r.group(`translate(${x}, ${y}) rotate(${angle})`, (g) => {
      // Polarizer frame
      g.rect(-5, -60, 10, 120, {
        fill: colors.polarizer,
        rx: 2,
        opacity: 0.8,
      });
      // Grid lines
      for (let i = -50; i <= 50; i += 10) {
        g.line(-3, i, 3, i, { stroke: colors.textPrimary, strokeWidth: 1, opacity: 0.5 });
      }
    });

    r.text(x, y + 80, `P${label}: ${angle}°`, {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle',
    });
  }

  private renderHookPhase(r: CommandRenderer): void {
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.text(350, 49, 'PHYSICS EXPLORATION', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, 'The Light Filter Mystery', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'Why do polarized sunglasses work?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.rect(160, 160, 380, 240, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 20,
      opacity: 0.8,
    });

    this.renderPolarizersVisualization(r, 350, 280);

    r.text(350, 420, 'Light intensity changes based on polarizer angles...', {
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
    r.text(350, 115, 'Two polarizers are at 45° angle difference.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'What percentage of polarized light passes through?', {
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
        ? 'Correct! cos²(45°) = 0.5, so 50% passes through!'
        : 'Not quite. Use Malus\'s Law: I = I₀cos²(45°) = 50%',
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
    r.text(350, 30, 'Polarization Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 340, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderPolarizersVisualization(r, 250, 180);

    // Stats panel
    r.rect(440, 50, 210, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    const intensity = this.calculateFinalIntensity();

    r.text(545, 80, 'Light Intensity', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    r.rect(460, 100, 170, 60, { fill: '#4c1d9530', rx: 8 });
    r.text(545, 125, `${(intensity * 100).toFixed(1)}%`, {
      fill: colors.primary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(545, 148, 'transmitted', {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });

    const angleDiff = this.polarizer2Angle - this.polarizer1Angle;
    r.rect(460, 170, 170, 50, { fill: colors.bgCardLight, rx: 8 });
    r.text(545, 195, `Angle: ${angleDiff}°`, {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.rect(80, 350, 570, 60, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(365, 375, 'Malus\'s Law: I = I₀ × cos²(θ)', {
      fill: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(365, 395, 'Rotate polarizers to see how intensity changes with angle', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Polarization', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 290, 150, { fill: '#4c1d9540', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'Malus\'s Law', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const malusInfo = [
      'I = I₀ × cos²(θ)',
      'θ = angle between polarizers',
      'At 0°: I = I₀ (maximum)',
      'At 90°: I = 0 (blocked)',
    ];
    malusInfo.forEach((line, i) => {
      r.text(70, 120 + i * 25, '• ' + line, { fill: colors.textSecondary, fontSize: 12 });
    });

    r.rect(360, 70, 290, 150, { fill: '#78350f40', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Key Angles', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const angleInfo = [
      '0° → 100% transmitted',
      '30° → 75% transmitted',
      '45° → 50% transmitted',
      '60° → 25% transmitted',
    ];
    angleInfo.forEach((line, i) => {
      r.text(380, 120 + i * 25, '• ' + line, { fill: colors.textSecondary, fontSize: 12 });
    });

    r.rect(50, 240, 600, 80, { fill: '#06533940', stroke: colors.success, rx: 16 });
    r.text(350, 265, 'Why Cosine Squared?', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 290, 'Only the component of the electric field parallel to the polarizer axis passes through.', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 308, 'Intensity ∝ E², and E_parallel = E₀cosθ, so I ∝ cos²θ', {
      fill: colors.textSecondary,
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

    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'Two polarizers at 90° block all light.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 145, 'What happens if we add a 45° polarizer in between?', {
      fill: colors.textPrimary,
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
      r.text(350, 375, isCorrect
        ? 'Correct! The middle polarizer rotates the light, letting some through!'
        : 'Surprising! The middle polarizer actually ALLOWS light through!',
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
    this.usePolarizer3 = true;

    r.text(350, 30, 'Three Polarizer Experiment', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 540, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderPolarizersVisualization(r, 350, 180);

    const intensity = this.calculateFinalIntensity();

    r.rect(80, 350, 540, 60, { fill: '#78350f30', stroke: colors.warning, rx: 12 });
    r.text(350, 375, `Intensity: ${(intensity * 100).toFixed(1)}% - The middle polarizer lets light through!`, {
      fill: colors.warning,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Magic of the Middle Polarizer', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'How does adding a filter ADD light?', {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const explanation = [
      '1. First polarizer: creates polarized light at 0°',
      '2. Middle polarizer at 45°: rotates the light to 45°',
      '3. Now 45° light meets the 90° polarizer',
      '4. cos²(45°) = 50% passes through!',
      '',
      'Each step follows Malus\'s Law: 50% × 50% = 25%',
    ];

    explanation.forEach((line, i) => {
      r.text(120, 150 + i * 22, line, { fill: colors.textSecondary, fontSize: 13 });
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

    r.text(350, 200, passed ? 'You\'ve mastered polarization!' : 'Review the concepts and try again.', {
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

    r.text(350, 130, 'Polarization Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, 'You\'ve mastered Malus\'s Law and polarization!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'cos²θ', label: 'Malus\'s Law' },
      { icon: '90°', label: 'Crossed Polarizers' },
      { icon: '45°', label: 'Three Polarizers' },
      { icon: '3D', label: 'Applications' },
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
        r.addButton({ id: 'next', label: 'Explore Polarization', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. 100%', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. 50%', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. 25%', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. 0%', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Test Your Prediction', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'polarizer1', label: 'Polarizer 1', value: this.polarizer1Angle, min: 0, max: 180 });
        r.addSlider({ id: 'polarizer2', label: 'Polarizer 2', value: this.polarizer2Angle, min: 0, max: 180 });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Discover a Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Still no light', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Some light passes', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. All light passes', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See What Happens', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({ id: 'polarizer3', label: 'Middle Polarizer', value: this.polarizer3Angle, min: 0, max: 90 });
        r.addButton({ id: 'next', label: 'Understand Why', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: '3D Cinema', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'LCD', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Sunglasses', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Photo', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every((c) => c)) {
          r.addButton({ id: 'next', label: 'Take Knowledge Test', variant: 'success' });
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
      polarizer1Angle: this.polarizer1Angle,
      polarizer2Angle: this.polarizer2Angle,
      polarizer3Angle: this.polarizer3Angle,
      usePolarizer3: this.usePolarizer3,
      showIntensityGraph: this.showIntensityGraph,
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
    this.polarizer1Angle = (state.polarizer1Angle as number) || 0;
    this.polarizer2Angle = (state.polarizer2Angle as number) || 45;
    this.polarizer3Angle = (state.polarizer3Angle as number) || 45;
    this.usePolarizer3 = (state.usePolarizer3 as boolean) || false;
    this.showIntensityGraph = (state.showIntensityGraph as boolean) ?? true;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===

export function createPolarizationGame(sessionId: string): PolarizationGame {
  return new PolarizationGame(sessionId);
}
