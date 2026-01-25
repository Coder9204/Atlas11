/**
 * Superhydrophobic Surfaces Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Contact angle physics: theta > 150° = superhydrophobic
 * - Cassie-Baxter state: droplet sits on air pockets
 * - Wenzel state: droplet penetrates surface texture
 * - Self-cleaning mechanism via rolling droplets
 * - Surface energy and wetting calculations
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
    question: 'A surface is superhydrophobic when its contact angle is:',
    options: ['Less than 30°', 'Between 30° and 90°', 'Between 90° and 150°', 'Greater than 150°'],
    correctIndex: 3,
  },
  {
    question: 'The lotus leaf stays clean because:',
    options: ['It has a waxy coating', 'Water droplets roll off carrying dirt', 'It repels dust magnetically', 'It has antibacterial properties'],
    correctIndex: 1,
  },
  {
    question: 'In the Cassie-Baxter state, a droplet:',
    options: ['Fully wets the surface', 'Sits on air pockets trapped in surface texture', 'Penetrates the surface', 'Evaporates instantly'],
    correctIndex: 1,
  },
  {
    question: 'Micro/nano surface texture makes surfaces superhydrophobic by:',
    options: ['Making the surface smoother', 'Trapping air pockets beneath droplets', 'Heating the water', 'Creating static electricity'],
    correctIndex: 1,
  },
  {
    question: 'A hydrophilic surface has a contact angle of:',
    options: ['Less than 90°', 'Exactly 90°', 'Greater than 90°', 'Greater than 150°'],
    correctIndex: 0,
  },
  {
    question: 'The Wenzel state differs from Cassie-Baxter because:',
    options: ['The droplet floats', 'Water penetrates into surface texture', 'Contact angle increases', 'The surface becomes smoother'],
    correctIndex: 1,
  },
  {
    question: 'Self-cleaning windows use superhydrophobic coatings to:',
    options: ['Heat the glass', 'Make water sheet off carrying dirt', 'Prevent UV damage', 'Reduce glare'],
    correctIndex: 1,
  },
  {
    question: 'Water striders can walk on water partly because:',
    options: ['They are magnetic', 'Their legs have superhydrophobic micro-hairs', 'Water is more dense than their legs', 'They move very fast'],
    correctIndex: 1,
  },
  {
    question: 'Anti-icing surfaces work by:',
    options: ['Heating continuously', 'Preventing water from spreading and freezing', 'Using antifreeze chemicals', 'Vibrating constantly'],
    correctIndex: 1,
  },
  {
    question: 'The surface energy of a superhydrophobic surface is:',
    options: ['Very high', 'Very low', 'The same as water', 'Negative'],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#06b6d4',
  primaryDark: '#0891b2',
  accent: '#10b981',
  accentDark: '#059669',
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
  water: '#38bdf8',
  waterDark: '#0284c7',
  lotus: '#22c55e',
  lotusDark: '#15803d',
  dirt: '#92400e',
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
    title: 'Self-Cleaning Glass',
    icon: 'window',
    description: 'Modern buildings use superhydrophobic coatings to keep windows clean naturally.',
    details: 'Rain rolls off carrying dirt and dust, reducing maintenance costs by up to 50%. Pilkington Activ Glass is a leading example.',
  },
  {
    title: 'Water-Repellent Clothing',
    icon: 'shirt',
    description: 'Outdoor gear uses nano-coatings to repel water without heavy waterproof membranes.',
    details: 'Brands like NeverWet spray create superhydrophobic fabrics. Water beads up and rolls off, keeping you dry without sacrificing breathability.',
  },
  {
    title: 'Anti-Icing Surfaces',
    icon: 'snowflake',
    description: 'Aircraft and power lines use superhydrophobic coatings to prevent ice buildup.',
    details: 'Water cannot spread and freeze on these surfaces. This reduces ice accumulation by 80-90% and improves safety in cold climates.',
  },
  {
    title: 'Corrosion Prevention',
    icon: 'shield',
    description: 'Protecting metal structures from rust using water-repelling nanotechnology.',
    details: 'Superhydrophobic coatings prevent water contact with metal surfaces, dramatically extending the lifespan of bridges, ships, and marine equipment.',
  },
];

// === MAIN GAME CLASS ===

export class SuperhydrophobicGame extends BaseGame {
  readonly gameType = 'superhydrophobic';
  readonly gameTitle = 'Superhydrophobic Surfaces';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private contactAngle = 90;
  private surfaceType: 'smooth' | 'textured' | 'lotus' = 'smooth';
  private dropletPosition = 50;
  private isAnimating = true;
  private showMicroscope = false;
  private dirtParticles: { x: number; y: number; attached: boolean }[] = [];
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
    hook: 'Lotus leaves stay perfectly clean even in muddy ponds. How?',
    predict: 'What makes water bead up on some surfaces but spread on others?',
    play: 'Adjust the contact angle and surface texture. Watch how water behaves!',
    review: 'Contact angle > 150° = superhydrophobic. The secret is micro-texture!',
    twist_predict: 'Can superhydrophobic surfaces actually clean themselves?',
    twist_play: 'Watch how rolling droplets pick up dirt particles as they go!',
    twist_review: 'Self-cleaning: droplets roll off, carrying dirt with them!',
    transfer: 'This technology is revolutionizing buildings, clothing, and more.',
    test: 'Test your understanding of superhydrophobic surfaces!',
    mastery: 'You understand the lotus effect and superhydrophobic physics!',
  };

  constructor(sessionId: string) {
    super(sessionId);
    this.initializeDirtParticles();
  }

  private initializeDirtParticles(): void {
    this.dirtParticles = [];
    for (let i = 0; i < 8; i++) {
      this.dirtParticles.push({
        x: 150 + Math.random() * 400,
        y: 200 + Math.random() * 50,
        attached: false,
      });
    }
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
      message: 'Superhydrophobic Surfaces lesson started',
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

    // Predictions (predict phase) - correct answer is B
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }

    // Twist predictions - correct answer is A
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

    // Surface type selection
    if (id === 'surface_smooth') {
      this.surfaceType = 'smooth';
      this.contactAngle = 70;
      return;
    }
    if (id === 'surface_textured') {
      this.surfaceType = 'textured';
      this.contactAngle = 120;
      return;
    }
    if (id === 'surface_lotus') {
      this.surfaceType = 'lotus';
      this.contactAngle = 160;
      return;
    }

    // Simulation controls
    if (id === 'toggle_animation') {
      this.isAnimating = !this.isAnimating;
      return;
    }
    if (id === 'reset') {
      this.resetSimulation();
      return;
    }
    if (id === 'add_droplet') {
      this.dropletPosition = 50;
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'microscope') {
      this.showMicroscope = value;
      return;
    }
    if (id === 'animation') {
      this.isAnimating = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'contact_angle') {
      this.contactAngle = value;
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

    // Reset simulation when entering play phases
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
   * PROTECTED: Determine surface classification based on contact angle
   */
  private classifySurface(): string {
    if (this.contactAngle < 90) return 'Hydrophilic';
    if (this.contactAngle < 150) return 'Hydrophobic';
    return 'Superhydrophobic';
  }

  /**
   * PROTECTED: Calculate droplet shape parameters based on contact angle
   * Higher contact angle = more spherical droplet
   */
  private calculateDropletShape(): { width: number; height: number; curvature: number } {
    const angleRad = (this.contactAngle * Math.PI) / 180;
    const height = 30 * Math.sin(angleRad / 2);
    const width = 30 * Math.cos(angleRad / 2);
    const curvature = this.contactAngle / 180;
    return { width: Math.max(width, 10), height: Math.max(height, 5), curvature };
  }

  /**
   * PROTECTED: Calculate rolling behavior
   * Superhydrophobic surfaces have very low roll-off angles
   */
  private calculateRollOffAngle(): number {
    if (this.contactAngle >= 150) return 5; // Very easy to roll
    if (this.contactAngle >= 120) return 15;
    if (this.contactAngle >= 90) return 30;
    return 90; // Won't roll - spreads instead
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;

    this.time += deltaTime / 1000;

    // Animate droplet rolling on superhydrophobic surfaces
    if (this.contactAngle >= 150 && this.phase === 'twist_play') {
      this.dropletPosition += 0.5;
      if (this.dropletPosition > 100) {
        this.dropletPosition = 0;
        this.initializeDirtParticles();
      }

      // Pick up dirt particles
      for (const particle of this.dirtParticles) {
        const dropletX = 150 + (this.dropletPosition / 100) * 400;
        if (!particle.attached && Math.abs(particle.x - dropletX) < 20) {
          particle.attached = true;
        }
        if (particle.attached) {
          particle.x = dropletX;
        }
      }
    }
  }

  private resetSimulation(): void {
    this.dropletPosition = 50;
    this.time = 0;
    this.isAnimating = true;
    this.initializeDirtParticles();
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

    // Set viewport
    r.setViewport(700, 500);

    // Background
    this.renderBackground(r);

    // Phase-specific content
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

    // UI state
    this.renderUIState(r);

    return r.toFrame(this.nextFrame());
  }

  private renderBackground(r: CommandRenderer): void {
    r.clear(colors.bgDark);

    // Subtle gradient overlay
    r.linearGradient('labBg', [
      { offset: '0%', color: '#0a1628' },
      { offset: '50%', color: '#0a0f1a' },
      { offset: '100%', color: '#0a1628' },
    ]);

    // Ambient glow effects
    r.circle(175, 0, 200, { fill: colors.accent, opacity: 0.03 });
    r.circle(525, 500, 200, { fill: colors.water, opacity: 0.03 });
  }

  // --- DROPLET RENDERER ---

  private renderDroplet(r: CommandRenderer, centerX: number, centerY: number, scale: number = 1): void {
    const shape = this.calculateDropletShape();
    const w = shape.width * scale;
    const h = shape.height * scale;

    // Water droplet gradient
    r.radialGradient('dropletGrad', [
      { offset: '0%', color: '#7dd3fc' },
      { offset: '70%', color: colors.water },
      { offset: '100%', color: colors.waterDark },
    ]);

    // Droplet body (ellipse approximation for contact angle)
    if (this.contactAngle >= 150) {
      // Nearly spherical for superhydrophobic
      r.circle(centerX, centerY - h / 2, h * 0.8, { fill: 'url(#dropletGrad)' });
    } else if (this.contactAngle >= 90) {
      // Elliptical for hydrophobic
      r.ellipse(centerX, centerY - h / 3, w * 0.7, h * 0.6, { fill: 'url(#dropletGrad)' });
    } else {
      // Spread out for hydrophilic
      r.ellipse(centerX, centerY - h / 4, w * 1.2, h * 0.3, { fill: 'url(#dropletGrad)' });
    }

    // Highlight
    r.circle(centerX - w * 0.2, centerY - h * 0.5, w * 0.15, { fill: '#ffffff', opacity: 0.5 });
  }

  // --- SURFACE RENDERER ---

  private renderSurface(r: CommandRenderer, y: number, showMicro: boolean = false): void {
    const surfaceY = y;

    if (this.surfaceType === 'lotus' || this.contactAngle >= 150) {
      // Lotus leaf surface with bumps
      r.rect(100, surfaceY, 500, 80, { fill: colors.lotusDark });

      // Micro-texture bumps
      for (let x = 110; x < 590; x += 15) {
        const bumpHeight = 5 + Math.random() * 5;
        r.circle(x, surfaceY, bumpHeight, { fill: colors.lotus });
      }

      if (showMicro) {
        // Microscope view of nano-structures
        r.rect(420, surfaceY - 100, 160, 90, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
        r.text(500, surfaceY - 85, 'Nano-texture', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });

        // Nano pillars with air trapped
        for (let x = 435; x < 565; x += 20) {
          r.rect(x, surfaceY - 60, 8, 35, { fill: colors.lotus, rx: 2 });
        }
        r.text(500, surfaceY - 20, 'Air pockets', { fill: colors.water, fontSize: 9, textAnchor: 'middle' });
      }
    } else if (this.surfaceType === 'textured' || this.contactAngle >= 90) {
      // Textured hydrophobic surface
      r.rect(100, surfaceY, 500, 80, { fill: '#4b5563' });
      for (let x = 110; x < 590; x += 25) {
        r.rect(x, surfaceY - 3, 10, 6, { fill: '#6b7280', rx: 2 });
      }
    } else {
      // Smooth hydrophilic surface
      r.rect(100, surfaceY, 500, 80, { fill: '#64748b' });
    }
  }

  // --- PHASE RENDERERS ---

  private renderHookPhase(r: CommandRenderer): void {
    // Premium badge
    r.rect(280, 30, 140, 28, { fill: colors.accent, opacity: 0.1, rx: 14, stroke: colors.accent, strokeWidth: 1 });
    r.circle(295, 44, 4, { fill: colors.accent });
    r.text(350, 49, 'NATURE\'S NANOTECHNOLOGY', {
      fill: colors.accent,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Main title
    r.text(350, 100, 'The Lotus Effect', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'Discover how lotus leaves stay perfectly clean', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Card with lotus visualization
    r.rect(160, 160, 380, 260, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 20,
      opacity: 0.8,
    });

    // Lotus leaf illustration
    r.ellipse(350, 270, 120, 60, { fill: colors.lotus });

    // Water droplets on leaf
    this.renderDroplet(r, 300, 250, 1.2);
    this.renderDroplet(r, 400, 260, 0.8);

    // Dirt particles being carried away
    r.circle(310, 253, 3, { fill: colors.dirt });
    r.circle(295, 250, 2, { fill: colors.dirt });

    // Question text
    r.text(350, 400, 'Water forms perfect spheres and rolls off instantly.', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 420, 'What gives the lotus leaf this superpower?', {
      fill: colors.accent,
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

    // Question card
    r.rect(100, 80, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 115, 'Why do water droplets bead up on some surfaces', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'but spread flat on others?', {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Show feedback if prediction made
    if (this.prediction) {
      const isCorrect = this.prediction === 'B';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 375, isCorrect
        ? 'Correct! Surface texture at the micro/nano scale traps air and prevents wetting!'
        : 'Not quite. The key is microscopic surface texture that traps air.',
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
    r.text(350, 30, 'Contact Angle Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Main simulation area
    r.rect(100, 50, 500, 240, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    // Surface
    this.renderSurface(r, 230, this.showMicroscope);

    // Droplet on surface
    this.renderDroplet(r, 350, 225, 1.5);

    // Contact angle visualization
    const angleRad = (this.contactAngle * Math.PI) / 180;
    r.line(350, 225, 350 + Math.cos(Math.PI - angleRad / 2) * 60, 225 - Math.sin(angleRad / 2) * 40, {
      stroke: colors.warning,
      strokeWidth: 2,
      strokeDasharray: '4 2',
    });
    r.line(350, 225, 410, 225, {
      stroke: colors.warning,
      strokeWidth: 2,
      strokeDasharray: '4 2',
    });

    // Angle arc
    r.text(380, 210, `${this.contactAngle}°`, {
      fill: colors.warning,
      fontSize: 14,
      fontWeight: 'bold',
    });

    // Stats panel
    r.rect(100, 310, 500, 100, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });

    // Classification
    const classification = this.classifySurface();
    const classColor = classification === 'Superhydrophobic' ? colors.accent :
                       classification === 'Hydrophobic' ? colors.warning : colors.water;

    r.text(200, 340, 'Classification:', { fill: colors.textSecondary, fontSize: 12 });
    r.text(200, 365, classification, { fill: classColor, fontSize: 18, fontWeight: 'bold' });

    r.text(400, 340, 'Roll-off Angle:', { fill: colors.textSecondary, fontSize: 12 });
    r.text(400, 365, `${this.calculateRollOffAngle()}°`, { fill: colors.textPrimary, fontSize: 18, fontWeight: 'bold' });

    r.text(350, 395, 'Superhydrophobic: Contact angle > 150°, droplet nearly spherical!', {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Contact Angles', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Hydrophilic card
    r.rect(50, 70, 190, 150, { fill: '#0c4a6e40', stroke: colors.water, rx: 16 });
    r.text(145, 95, 'Hydrophilic', { fill: colors.water, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(145, 115, 'theta < 90°', { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });
    r.ellipse(145, 165, 40, 15, { fill: colors.water, opacity: 0.6 });
    r.text(145, 200, 'Water spreads', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });

    // Hydrophobic card
    r.rect(255, 70, 190, 150, { fill: '#78350f40', stroke: colors.warning, rx: 16 });
    r.text(350, 95, 'Hydrophobic', { fill: colors.warning, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 115, '90° < theta < 150°', { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });
    r.ellipse(350, 160, 25, 25, { fill: colors.water, opacity: 0.6 });
    r.text(350, 200, 'Water beads up', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });

    // Superhydrophobic card
    r.rect(460, 70, 190, 150, { fill: '#06533940', stroke: colors.accent, rx: 16 });
    r.text(555, 95, 'Superhydrophobic', { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(555, 115, 'theta > 150°', { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });
    r.circle(555, 160, 20, { fill: colors.water, opacity: 0.6 });
    r.text(555, 200, 'Nearly spherical!', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });

    // Cassie-Baxter explanation
    r.rect(100, 240, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 270, 'The Cassie-Baxter State', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 295, 'Micro/nano texture traps AIR beneath the droplet.', { fill: colors.textSecondary, fontSize: 13, textAnchor: 'middle' });
    r.text(350, 315, 'Droplet sits on a cushion of air - minimal contact with solid!', { fill: colors.textSecondary, fontSize: 13, textAnchor: 'middle' });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Self-Cleaning Twist', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Question card
    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'Lotus leaves stay clean even in muddy water.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 155, 'How does a superhydrophobic surface clean itself?', {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Show feedback if prediction made
    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'A';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 375, isCorrect
        ? 'Exactly! Rolling droplets pick up and carry away dirt particles!'
        : 'Think about how spherical droplets roll versus how flat droplets slide.',
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
    r.text(350, 30, 'Self-Cleaning in Action', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Main simulation area
    r.rect(100, 50, 500, 240, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    // Surface with lotus texture
    this.renderSurface(r, 230, false);

    // Dirt particles
    for (const particle of this.dirtParticles) {
      if (!particle.attached) {
        r.circle(particle.x, particle.y, 4, { fill: colors.dirt });
      }
    }

    // Rolling droplet carrying dirt
    const dropletX = 150 + (this.dropletPosition / 100) * 400;
    this.renderDroplet(r, dropletX, 215, 1.5);

    // Attached dirt particles
    for (const particle of this.dirtParticles) {
      if (particle.attached) {
        r.circle(particle.x, 210, 3, { fill: colors.dirt });
      }
    }

    // Arrow showing roll direction
    r.text(350, 270, 'Droplet rolls, picking up dirt particles!', {
      fill: colors.accent,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Explanation
    r.rect(100, 300, 500, 110, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(350, 330, 'Self-Cleaning Mechanism:', { fill: colors.warning, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 355, '1. Dirt sits on top of micro-bumps (weak adhesion)', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 375, '2. Water droplet rolls over, touching dirt particles', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 395, '3. Dirt sticks to water and rolls away with it!', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 250, { fill: '#06533940', stroke: colors.accent, rx: 16 });
    r.text(350, 110, 'Nature\'s Self-Cleaning Technology', {
      fill: colors.accent,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const facts = [
      'Lotus leaves have micro-bumps covered with nano-wax crystals',
      'Contact angle exceeds 160° - extreme water repellency',
      'Rolling droplets act like tiny cleaning balls',
      'Dirt adhesion to leaf is weaker than to water',
      'This is biomimicry - copying nature\'s solutions!',
    ];

    facts.forEach((fact, i) => {
      r.text(130, 145 + i * 30, '* ' + fact, { fill: colors.textSecondary, fontSize: 12 });
    });

    r.text(350, 310, 'Scientists now create synthetic superhydrophobic surfaces!', {
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

    // App tabs
    const tabWidth = 140;
    applications.forEach((app, i) => {
      const isSelected = i === this.selectedApp;
      const isCompleted = this.completedApps[i];
      const x = 80 + i * (tabWidth + 15);

      r.rect(x, 70, tabWidth, 40, {
        fill: isSelected ? colors.accent : colors.bgCard,
        stroke: isCompleted ? colors.success : colors.border,
        rx: 8,
      });
      r.text(x + tabWidth / 2, 95, app.title.split(' ')[0], {
        fill: isSelected ? colors.textPrimary : colors.textSecondary,
        fontSize: 12,
        textAnchor: 'middle',
      });
    });

    // Selected app content
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

    // Progress indicator
    r.text(350, 360, `Progress: ${this.completedApps.filter((c) => c).length}/4`, {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Progress dots
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

    // Answer options
    q.options.forEach((option, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;

      r.rect(100, 110 + i * 55, 500, 45, {
        fill: isSelected ? colors.accent + '40' : colors.bgCard,
        stroke: isSelected ? colors.accent : colors.border,
        rx: 8,
      });
      r.text(350, 138 + i * 55, option, {
        fill: isSelected ? colors.accent : colors.textSecondary,
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

    r.text(350, 200, passed ? "Excellent! You've mastered superhydrophobic surfaces!" : 'Keep studying! Review and try again.', {
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

    r.text(350, 130, 'Lotus Effect Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, "You understand superhydrophobic surfaces!", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Achievement badges
    const badges = [
      { icon: 'theta', label: 'Contact Angles' },
      { icon: 'lotus', label: 'Lotus Effect' },
      { icon: 'nano', label: 'Nano-texture' },
      { icon: 'clean', label: 'Self-Cleaning' },
    ];

    badges.forEach((badge, i) => {
      const x = 180 + (i % 2) * 170;
      const y = 200 + Math.floor(i / 2) * 80;
      r.rect(x, y, 150, 60, { fill: colors.bgCardLight, rx: 12 });
      r.text(x + 75, y + 25, badge.icon, { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
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
      color: colors.accent,
    });

    if (this.guidedMode) {
      r.setCoachMessage(this.coachMessages[this.phase]);
    }

    const idx = this.phaseOrder.indexOf(this.phase);

    // Back button
    if (idx > 0) {
      r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });
    }

    // Phase-specific controls
    switch (this.phase) {
      case 'hook':
        r.addButton({ id: 'next', label: 'Discover the Secret', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Chemical coating repels water', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Micro-texture traps air', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Surface is very smooth', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. Static electricity', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Explore the Physics', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'contact_angle', label: 'Contact Angle', value: this.contactAngle, min: 30, max: 170, step: 5 });
        r.addButton({ id: 'surface_smooth', label: 'Smooth', variant: this.surfaceType === 'smooth' ? 'primary' : 'ghost' });
        r.addButton({ id: 'surface_textured', label: 'Textured', variant: this.surfaceType === 'textured' ? 'primary' : 'ghost' });
        r.addButton({ id: 'surface_lotus', label: 'Lotus', variant: this.surfaceType === 'lotus' ? 'primary' : 'ghost' });
        r.addToggle({ id: 'microscope', label: 'Microscope', value: this.showMicroscope, onLabel: 'ON', offLabel: 'OFF' });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Discover the Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Rolling droplets carry dirt', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Surface vibrates dirt off', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. UV light destroys dirt', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D. Wind blows dirt away', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See Self-Cleaning', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
        r.addButton({ id: 'next', label: 'Review Discovery', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real-World Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Glass', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Clothing', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Anti-Ice', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Corrosion', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
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
      contactAngle: this.contactAngle,
      surfaceType: this.surfaceType,
      dropletPosition: this.dropletPosition,
      showMicroscope: this.showMicroscope,
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
    this.contactAngle = (state.contactAngle as number) || 90;
    this.surfaceType = (state.surfaceType as 'smooth' | 'textured' | 'lotus') || 'smooth';
    this.dropletPosition = (state.dropletPosition as number) || 50;
    this.showMicroscope = (state.showMicroscope as boolean) || false;
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

export function createSuperhydrophobicGame(sessionId: string): SuperhydrophobicGame {
  return new SuperhydrophobicGame(sessionId);
}
