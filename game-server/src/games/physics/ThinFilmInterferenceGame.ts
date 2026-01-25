/**
 * Thin Film Interference Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Interference condition: 2nt = (m + 1/2)lambda for constructive
 * - Phase shift at reflection from higher n medium
 * - Anti-reflection coating design: t = lambda/(4n)
 * - Color calculation from wavelength
 * - Oil slick and soap bubble physics
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
    question: 'Thin film interference occurs because light reflects from:',
    options: ['Only the top surface', 'Only the bottom surface', 'Both top and bottom surfaces', 'Neither surface'],
    correctIndex: 2,
  },
  {
    question: 'For constructive interference in a thin film, the path difference must be:',
    options: ['Any multiple of wavelength', 'An odd multiple of half-wavelength', 'Depends on phase shifts', 'Zero'],
    correctIndex: 2,
  },
  {
    question: 'Why do soap bubbles show rainbow colors?',
    options: ['Chemical pigments', 'Different thicknesses interfere with different wavelengths', 'Sunlight is colorful', 'Soap molecules glow'],
    correctIndex: 1,
  },
  {
    question: 'An anti-reflection coating is designed to have thickness equal to:',
    options: ['One wavelength', 'Half wavelength', 'Quarter wavelength in the film', 'Any thickness'],
    correctIndex: 2,
  },
  {
    question: 'When light reflects from a higher refractive index medium:',
    options: ['No phase shift', '90-degree phase shift', '180-degree phase shift', 'Random phase shift'],
    correctIndex: 2,
  },
  {
    question: 'Oil slicks on water show colors because oil is:',
    options: ['Colored liquid', 'A thin film causing interference', 'Fluorescent', 'Refracting sunlight'],
    correctIndex: 1,
  },
  {
    question: 'The condition 2nt = (m + 1/2)lambda represents:',
    options: ['Destructive interference', 'Constructive interference with one phase shift', 'Total reflection', 'Refraction'],
    correctIndex: 1,
  },
  {
    question: 'As a soap bubble gets thinner before popping, it appears:',
    options: ['More colorful', 'Darker/black', 'Brighter white', 'Transparent'],
    correctIndex: 1,
  },
  {
    question: 'MgF2 is used in camera coatings because its refractive index:',
    options: ['Is very high', 'Is between air and glass', 'Equals that of glass', 'Is exactly 1.0'],
    correctIndex: 1,
  },
  {
    question: 'Newton\'s rings are formed by interference between:',
    options: ['Two flat surfaces', 'A curved surface and flat surface', 'Two curved surfaces', 'Light and sound waves'],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#8b5cf6',
  primaryDark: '#7c3aed',
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
};

// Visible spectrum colors (wavelength to color mapping)
const wavelengthToColor = (wavelength: number): string => {
  if (wavelength < 380) return '#2c003e'; // UV - dark purple
  if (wavelength < 440) return '#8b00ff'; // Violet
  if (wavelength < 490) return '#0000ff'; // Blue
  if (wavelength < 510) return '#00ff00'; // Green
  if (wavelength < 580) return '#ffff00'; // Yellow
  if (wavelength < 620) return '#ff8000'; // Orange
  if (wavelength < 750) return '#ff0000'; // Red
  return '#3d0000'; // IR - dark red
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
    title: 'Anti-Reflection Coatings',
    icon: 'camera',
    description: 'Camera lenses and eyeglasses use thin film coatings to minimize unwanted reflections.',
    details: 'MgF2 (n=1.38) coatings at 1/4 wavelength thickness cause destructive interference for reflected light, reducing glare and increasing light transmission to 99%+.',
  },
  {
    title: 'Soap Bubbles',
    icon: 'bubble',
    description: 'The swirling rainbow colors in soap bubbles come from interference, not pigments.',
    details: 'As the bubble thins from gravity, different thicknesses constructively interfere with different wavelengths. Very thin regions appear black just before popping.',
  },
  {
    title: 'Oil Slicks',
    icon: 'droplet',
    description: 'Rainbow patterns on puddles reveal oil contamination through thin film interference.',
    details: 'Oil forms a thin layer (n≈1.5) on water. Different thicknesses across the slick create the swirling color patterns you see in parking lots.',
  },
  {
    title: 'Morpho Butterfly Wings',
    icon: 'butterfly',
    description: 'The brilliant blue of Morpho butterflies comes from structural color, not pigment.',
    details: 'Nano-scale ridges on wing scales create constructive interference for blue wavelengths. The color shifts with viewing angle and never fades like dyes.',
  },
];

// === MAIN GAME CLASS ===

export class ThinFilmInterferenceGame extends BaseGame {
  readonly gameType = 'thin_film_interference';
  readonly gameTitle = 'Thin Film Interference';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private filmThickness = 200; // nanometers
  private refractiveIndex = 1.33; // soap film
  private viewingAngle = 0; // degrees from normal
  private filmType: 'soap' | 'oil' | 'coating' = 'soap';
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
    hook: 'Why do soap bubbles shimmer with rainbow colors?',
    predict: 'What creates the colors in a thin film?',
    play: 'Adjust film thickness and watch the colors change!',
    review: 'Interference: 2nt determines which wavelengths constructively interfere.',
    twist_predict: 'Can we engineer coatings to eliminate reflections?',
    twist_play: 'Design an anti-reflection coating for a camera lens!',
    twist_review: 'Quarter-wavelength coatings create destructive interference!',
    transfer: 'Thin film physics is everywhere: from butterflies to smartphones.',
    test: 'Test your understanding of thin film interference!',
    mastery: 'You understand thin film interference and its applications!',
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
      message: 'Thin Film Interference lesson started',
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

    if (id === 'film_soap') {
      this.filmType = 'soap';
      this.refractiveIndex = 1.33;
      return;
    }
    if (id === 'film_oil') {
      this.filmType = 'oil';
      this.refractiveIndex = 1.5;
      return;
    }
    if (id === 'film_coating') {
      this.filmType = 'coating';
      this.refractiveIndex = 1.38;
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
    if (id === 'animation') {
      this.isAnimating = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'thickness') {
      this.filmThickness = value;
      return;
    }
    if (id === 'angle') {
      this.viewingAngle = value;
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
   * PROTECTED: Calculate path difference in the film
   * Path = 2 * n * t (at normal incidence)
   */
  private calculatePathDifference(): number {
    return 2 * this.refractiveIndex * this.filmThickness;
  }

  /**
   * PROTECTED: Find wavelength that constructively interferes
   * For air-film-substrate with one phase shift: 2nt = (m + 1/2)lambda
   */
  private calculateConstructiveWavelength(order: number = 0): number {
    const pathDiff = this.calculatePathDifference();
    // 2nt = (m + 1/2) * lambda
    // lambda = 2nt / (m + 0.5)
    return pathDiff / (order + 0.5);
  }

  /**
   * PROTECTED: Calculate the dominant color for current thickness
   */
  private calculateDominantColor(): string {
    // Find which visible wavelength constructively interferes
    for (let m = 0; m < 10; m++) {
      const wavelength = this.calculateConstructiveWavelength(m);
      if (wavelength >= 380 && wavelength <= 750) {
        return wavelengthToColor(wavelength);
      }
    }
    // If no visible wavelength matches, film appears dark or white
    return this.filmThickness < 50 ? '#1a1a2e' : '#ffffff';
  }

  /**
   * PROTECTED: Calculate reflectance at a given wavelength
   * Simplified model for demonstration
   */
  private calculateReflectance(wavelength: number): number {
    const pathDiff = this.calculatePathDifference();
    // Phase from path difference (in radians)
    const phi = (2 * Math.PI * pathDiff) / wavelength;
    // Include 180-degree phase shift from reflection
    const totalPhase = phi + Math.PI;
    // Reflectance intensity (simplified)
    return Math.pow(Math.cos(totalPhase / 2), 2);
  }

  /**
   * PROTECTED: Calculate ideal thickness for anti-reflection coating
   * t = lambda / (4 * n)
   */
  private calculateAntiReflectionThickness(wavelength: number): number {
    return wavelength / (4 * this.refractiveIndex);
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;

    this.time += deltaTime / 1000;
  }

  private resetSimulation(): void {
    this.time = 0;
    this.isAnimating = true;
    this.filmThickness = 200;
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

    // Rainbow gradient hints
    r.circle(175, 0, 200, { fill: '#8b5cf6', opacity: 0.03 });
    r.circle(525, 500, 200, { fill: '#06b6d4', opacity: 0.03 });
  }

  // --- SOAP BUBBLE RENDERER ---

  private renderSoapBubble(r: CommandRenderer, x: number, y: number, radius: number): void {
    // Create rainbow gradient based on thickness variation
    const dominantColor = this.calculateDominantColor();

    // Main bubble with gradient
    r.radialGradient('bubbleGrad', [
      { offset: '0%', color: '#ffffff' },
      { offset: '30%', color: dominantColor },
      { offset: '60%', color: '#8b5cf6' },
      { offset: '100%', color: '#3b82f6' },
    ]);

    // Bubble body
    r.circle(x, y, radius, { fill: 'url(#bubbleGrad)', opacity: 0.8 });

    // Highlight
    r.circle(x - radius * 0.3, y - radius * 0.3, radius * 0.2, { fill: '#ffffff', opacity: 0.6 });

    // Swirling color bands (simulating thickness variation)
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + this.time;
      const bandX = x + Math.cos(angle) * radius * 0.5;
      const bandY = y + Math.sin(angle) * radius * 0.3;
      const bandColor = wavelengthToColor(400 + i * 70);
      r.ellipse(bandX, bandY, radius * 0.3, radius * 0.1, {
        fill: bandColor,
        opacity: 0.3,
      });
    }
  }

  // --- THIN FILM DIAGRAM ---

  private renderThinFilmDiagram(r: CommandRenderer, x: number, y: number, width: number, height: number): void {
    const dominantColor = this.calculateDominantColor();
    const filmHeight = Math.max(this.filmThickness / 10, 5);

    // Air layer (top)
    r.rect(x, y, width, height / 3, { fill: '#1e293b' });
    r.text(x + 20, y + height / 6, 'Air (n=1)', { fill: colors.textMuted, fontSize: 11 });

    // Thin film
    r.rect(x, y + height / 3, width, filmHeight, { fill: dominantColor, opacity: 0.7 });
    r.text(x + 20, y + height / 3 + filmHeight / 2 + 4, `Film (n=${this.refractiveIndex.toFixed(2)})`, {
      fill: colors.textPrimary,
      fontSize: 10,
    });

    // Substrate (bottom)
    r.rect(x, y + height / 3 + filmHeight, width, height * 2 / 3 - filmHeight, { fill: '#374151' });
    r.text(x + 20, y + height * 2 / 3, 'Substrate', { fill: colors.textMuted, fontSize: 11 });

    // Incident light ray
    r.line(x + width / 2 - 50, y - 20, x + width / 2, y + height / 3, {
      stroke: '#fbbf24',
      strokeWidth: 3,
    });

    // Reflected rays (showing interference)
    r.line(x + width / 2, y + height / 3, x + width / 2 + 30, y - 20, {
      stroke: dominantColor,
      strokeWidth: 2,
    });
    r.line(x + width / 2, y + height / 3 + filmHeight, x + width / 2 + 50, y - 20, {
      stroke: dominantColor,
      strokeWidth: 2,
      strokeDasharray: '4 2',
    });

    // Path difference indicator
    r.text(x + width - 80, y + height / 3 + filmHeight / 2, `t = ${this.filmThickness} nm`, {
      fill: colors.warning,
      fontSize: 11,
    });
  }

  // --- PHASE RENDERERS ---

  private renderHookPhase(r: CommandRenderer): void {
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.circle(295, 44, 4, { fill: colors.primary });
    r.text(350, 49, 'LIGHT & COLOR', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, 'The Rainbow Bubble', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'Where do the swirling colors in soap bubbles come from?', {
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

    // Animated soap bubble
    this.renderSoapBubble(r, 350, 280, 80);

    r.text(350, 390, 'No dyes, no pigments - just pure physics!', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 410, 'How does a thin film of soap create rainbows?', {
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

    r.rect(100, 80, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 115, 'Light hits a thin soap film. Some reflects from the top surface,', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'some from the bottom. What creates the colors?', {
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
        ? 'Correct! The two reflected waves interfere - some wavelengths add up, others cancel!'
        : 'Think about what happens when two waves meet...',
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
    r.text(350, 30, 'Thin Film Interference Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 50, 340, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    // Thin film diagram
    this.renderThinFilmDiagram(r, 120, 70, 300, 160);

    // Color preview
    r.rect(460, 50, 140, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(530, 75, 'Dominant Color', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });

    const dominantColor = this.calculateDominantColor();
    r.circle(530, 140, 50, { fill: dominantColor });

    const constructiveWavelength = this.calculateConstructiveWavelength(0);
    r.text(530, 210, `lambda ≈ ${constructiveWavelength.toFixed(0)} nm`, {
      fill: colors.textPrimary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Stats panel
    r.rect(100, 270, 500, 100, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });

    r.text(180, 300, 'Path Difference:', { fill: colors.textSecondary, fontSize: 12 });
    r.text(180, 325, `${this.calculatePathDifference().toFixed(0)} nm`, {
      fill: colors.warning,
      fontSize: 16,
      fontWeight: 'bold',
    });

    r.text(350, 300, 'Film Type:', { fill: colors.textSecondary, fontSize: 12 });
    r.text(350, 325, this.filmType.charAt(0).toUpperCase() + this.filmType.slice(1), {
      fill: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
    });

    r.text(520, 300, 'Refractive Index:', { fill: colors.textSecondary, fontSize: 12 });
    r.text(520, 325, `n = ${this.refractiveIndex.toFixed(2)}`, {
      fill: colors.accent,
      fontSize: 16,
      fontWeight: 'bold',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Thin Film Interference', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Main formula card
    r.rect(150, 70, 400, 80, { fill: '#581c8740', stroke: colors.primary, rx: 16 });
    r.text(350, 100, '2nt = (m + 1/2)lambda', {
      fill: colors.primary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 130, 'Constructive interference condition (with one phase shift)', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });

    // Key concepts
    const concepts = [
      { title: 'Path Difference', desc: '2nt - light travels through film twice', color: colors.warning },
      { title: 'Phase Shift', desc: '180° when reflecting from higher n medium', color: colors.danger },
      { title: 'Wavelength Selection', desc: 'Only matching wavelengths constructively interfere', color: colors.success },
    ];

    concepts.forEach((c, i) => {
      const y = 170 + i * 55;
      r.rect(150, y, 400, 45, { fill: colors.bgCard, rx: 8 });
      r.text(170, y + 20, c.title, { fill: c.color, fontSize: 13, fontWeight: 'bold' });
      r.text(170, y + 38, c.desc, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.text(350, 350, 'Different thicknesses → different colors constructively interfere!', {
      fill: colors.textPrimary,
      fontSize: 13,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Anti-Reflection Challenge', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 120, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'Camera lenses have coatings that eliminate reflections.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 155, 'Instead of making colors, they make reflected light disappear!', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 185, 'How thick should an anti-reflection coating be?', {
      fill: colors.warning,
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
        ? 'Correct! Quarter-wavelength creates destructive interference for reflected light!'
        : 'Think about what path difference creates destructive interference...',
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
    r.text(350, 30, 'Anti-Reflection Coating Design', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 50, 500, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    // Camera lens illustration
    r.ellipse(350, 150, 100, 60, { fill: '#1e40af', opacity: 0.3 });
    r.ellipse(350, 150, 80, 48, { fill: '#3b82f6', opacity: 0.4 });

    // MgF2 coating layer
    const coatingColor = this.filmThickness > 90 && this.filmThickness < 110 ? colors.success : colors.danger;
    r.ellipse(350, 150, 82, 50, { fill: 'none', stroke: coatingColor, strokeWidth: 3 });

    r.text(350, 100, 'MgF2 Coating (n = 1.38)', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });

    // Ideal thickness indicator
    const idealThickness = this.calculateAntiReflectionThickness(550); // Green light
    r.text(350, 220, `Current: ${this.filmThickness} nm`, { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 240, `Ideal for green light: ${idealThickness.toFixed(0)} nm`, { fill: colors.success, fontSize: 12, textAnchor: 'middle' });

    // Reflection indicator
    r.rect(100, 270, 500, 90, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(350, 295, 'Anti-Reflection Formula:', { fill: colors.warning, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 320, 't = lambda / (4n)', { fill: colors.primary, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 345, 'Creates 180° phase difference → destructive interference for reflected light', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 250, { fill: '#0c4a6e40', stroke: colors.accent, rx: 16 });
    r.text(350, 110, 'Engineering Light with Thin Films', {
      fill: colors.accent,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const facts = [
      'Quarter-wavelength coatings create destructive interference',
      'MgF2 (n=1.38) is ideal between air (1.0) and glass (1.5)',
      'Multiple coatings can work for broader wavelength ranges',
      'Modern lenses use 7+ coating layers for 99.9% transmission',
      'The purple/green tint on lenses is residual thin film color',
    ];

    facts.forEach((fact, i) => {
      r.text(130, 145 + i * 30, '• ' + fact, { fill: colors.textSecondary, fontSize: 12 });
    });

    r.text(350, 310, 'Understanding interference lets us control light!', {
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

    r.text(350, 200, passed ? "Excellent! You've mastered thin film interference!" : 'Keep studying! Review and try again.', {
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

    r.text(350, 130, 'Thin Film Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, "You understand thin film interference!", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: '2nt', label: 'Interference' },
      { icon: 'lambda/4', label: 'AR Coatings' },
      { icon: 'bubble', label: 'Soap Films' },
      { icon: 'lens', label: 'Optics' },
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
        r.addButton({ id: 'next', label: 'Discover Why', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Refraction only', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Wave interference', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Chemical pigments', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. Temperature effects', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Explore the Physics', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'thickness', label: 'Film Thickness (nm)', value: this.filmThickness, min: 50, max: 500 });
        r.addButton({ id: 'film_soap', label: 'Soap', variant: this.filmType === 'soap' ? 'primary' : 'ghost' });
        r.addButton({ id: 'film_oil', label: 'Oil', variant: this.filmType === 'oil' ? 'primary' : 'ghost' });
        r.addButton({ id: 'film_coating', label: 'MgF2', variant: this.filmType === 'coating' ? 'primary' : 'ghost' });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Discover the Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Full wavelength', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Half wavelength', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Quarter wavelength', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D. Any thickness', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Design a Coating', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({ id: 'thickness', label: 'Coating Thickness (nm)', value: this.filmThickness, min: 50, max: 200 });
        r.addButton({ id: 'next', label: 'Review Discovery', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real-World Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Coatings', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Bubbles', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Oil Slicks', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Butterflies', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
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
      filmThickness: this.filmThickness,
      refractiveIndex: this.refractiveIndex,
      filmType: this.filmType,
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
    this.filmThickness = (state.filmThickness as number) || 200;
    this.refractiveIndex = (state.refractiveIndex as number) || 1.33;
    this.filmType = (state.filmType as 'soap' | 'oil' | 'coating') || 'soap';
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

export function createThinFilmInterferenceGame(sessionId: string): ThinFilmInterferenceGame {
  return new ThinFilmInterferenceGame(sessionId);
}
