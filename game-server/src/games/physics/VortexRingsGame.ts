/**
 * Vortex Rings Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP - Physics Formulas:
 * - Ring velocity: V = (Gamma / 4*pi*R) * ln(8R/a)
 *   where Gamma = circulation, R = ring radius, a = core radius
 * - Core radius: a = R * 0.2 (typical for smoke rings)
 * - Circulation affects ring speed and stability
 * - Smaller rings travel faster than larger rings
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer, lerp, clamp } from '../../renderer/CommandRenderer.js';

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
    question: 'What happens to ring speed when the ring radius decreases?',
    options: [
      'Speed decreases',
      'Speed increases',
      'Speed stays the same',
      'The ring stops moving',
    ],
    correctIndex: 1,
  },
  {
    question: 'What creates a vortex ring?',
    options: [
      'A steady flow of air',
      'A pulse of fluid through an opening',
      'Heating the air',
      'Static pressure',
    ],
    correctIndex: 1,
  },
  {
    question: 'The circulation in a vortex ring represents:',
    options: [
      'The ring temperature',
      'The amount of rotational flow around the ring core',
      'The ring color',
      'The air pressure inside',
    ],
    correctIndex: 1,
  },
  {
    question: 'Why do smaller vortex rings travel faster?',
    options: [
      'They weigh less',
      'The induced velocity is inversely proportional to radius',
      'Air resistance is lower',
      'They have more energy',
    ],
    correctIndex: 1,
  },
  {
    question: 'What is the core of a vortex ring?',
    options: [
      'The center of the ring (empty space)',
      'The rotating tube of fluid that forms the ring',
      'The air inside the ring',
      'The smoke particles',
    ],
    correctIndex: 1,
  },
  {
    question: 'Dolphins blow bubble rings. These are examples of:',
    options: [
      'Air pressure only',
      'Vortex rings in water',
      'Surface tension',
      'Chemical reactions',
    ],
    correctIndex: 1,
  },
  {
    question: 'When two vortex rings collide, they can:',
    options: [
      'Simply pass through each other unchanged',
      'Create complex interactions including leapfrogging',
      'Always destroy each other',
      'Merge into one larger ring',
    ],
    correctIndex: 1,
  },
  {
    question: 'The formula for ring velocity includes what mathematical function?',
    options: [
      'Square root',
      'Natural logarithm',
      'Sine',
      'Exponential',
    ],
    correctIndex: 1,
  },
  {
    question: 'What makes vortex rings stable and able to travel far?',
    options: [
      'High temperature',
      'The self-induced velocity field is uniform across the ring',
      'Air pressure differences',
      'Gravity',
    ],
    correctIndex: 1,
  },
  {
    question: 'A smoke ring gun works by:',
    options: [
      'Heating the air',
      'Creating a rapid pulse of air through a circular opening',
      'Chemical reactions',
      'Magnetic forces',
    ],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#06b6d4', // Cyan
  primaryDark: '#0891b2',
  accent: '#a855f7', // Purple
  accentDark: '#9333ea',
  ring: '#8b5cf6', // Violet for vortex
  ringCore: '#c084fc',
  flow: '#22d3ee',
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

// === VORTEX RING STATE ===
interface VortexRing {
  x: number;
  y: number;
  radius: number;
  velocity: number;
  age: number;
  rotation: number;
}

// === MAIN GAME CLASS ===

export class VortexRingsGame extends BaseGame {
  readonly gameType = 'vortex_rings';
  readonly gameTitle = 'Vortex Rings';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state (PROTECTED - server only)
  private time = 0;
  private isSimulating = false;

  // Ring parameters
  private ringRadius = 40;
  private circulation = 100;
  private rings: VortexRing[] = [];

  // Calculated values (PROTECTED - computed on server)
  private ringSpeed = 0;
  private coreRadius = 0;

  // Animation state
  private animationTime = 0;
  private showLabels = true;
  private showFlowLines = true;

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
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Challenge',
    twist_play: 'Ring Collisions',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Smoke rings - beautiful physics in action!',
    predict: 'Which ring travels faster: big or small?',
    play: 'Create rings of different sizes and watch them race!',
    review: 'The formula reveals an inverse relationship with radius.',
    twist_predict: 'What happens when two vortex rings meet?',
    twist_play: 'Launch two rings and watch them interact!',
    twist_review: 'Vortex interactions can create leapfrogging and merging.',
    transfer: 'From smoke rings to jellyfish propulsion to heart valves.',
    test: 'Test your understanding of vortex ring physics!',
    mastery: 'You understand the elegant physics of vortex rings!',
  };

  constructor(sessionId: string) {
    super(sessionId);
    this.calculateRingSpeed();
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
      message: 'Vortex Rings lesson started',
    });
  }

  // === PROTECTED PHYSICS CALCULATIONS ===

  /**
   * PROTECTED: Calculate ring velocity using vortex ring formula
   * V = (Gamma / 4*pi*R) * ln(8R/a)
   */
  private calculateRingSpeed(): void {
    this.coreRadius = this.ringRadius * 0.2;
    // V = (Gamma / 4*pi*R) * ln(8R/a)
    const logTerm = Math.log((8 * this.ringRadius) / this.coreRadius);
    this.ringSpeed = (this.circulation / (4 * Math.PI * this.ringRadius)) * logTerm;
  }

  /**
   * PROTECTED: Calculate speed for a given radius
   */
  private getSpeedForRadius(radius: number): number {
    const coreR = radius * 0.2;
    const logTerm = Math.log((8 * radius) / coreR);
    return (this.circulation / (4 * Math.PI * radius)) * logTerm;
  }

  /**
   * PROTECTED: Create a new vortex ring
   */
  private createRing(radius: number): void {
    const speed = this.getSpeedForRadius(radius);
    this.rings.push({
      x: 100,
      y: 175,
      radius: radius,
      velocity: speed,
      age: 0,
      rotation: 0,
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

    // Launch rings
    if (id === 'launch_small') {
      this.createRing(25);
      this.isSimulating = true;
      return;
    }
    if (id === 'launch_medium') {
      this.createRing(40);
      this.isSimulating = true;
      return;
    }
    if (id === 'launch_large') {
      this.createRing(60);
      this.isSimulating = true;
      return;
    }
    if (id === 'launch_current') {
      this.createRing(this.ringRadius);
      this.isSimulating = true;
      return;
    }

    // Test answers
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

    if (id === 'start') {
      this.isSimulating = true;
      return;
    }
    if (id === 'stop') {
      this.isSimulating = false;
      return;
    }
    if (id === 'reset') {
      this.resetSimulation();
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'labels') {
      this.showLabels = value;
      return;
    }
    if (id === 'flow_lines') {
      this.showFlowLines = value;
      return;
    }
    if (id === 'guided_mode') {
      this.guidedMode = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'ring_radius') {
      this.ringRadius = clamp(value, 20, 80);
      this.calculateRingSpeed();
      this.emitCoachEvent('value_changed', { ringRadius: this.ringRadius, speed: this.ringSpeed });
      return;
    }
    if (id === 'circulation') {
      this.circulation = clamp(value, 50, 200);
      this.calculateRingSpeed();
      this.emitCoachEvent('value_changed', { circulation: this.circulation, speed: this.ringSpeed });
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
    const hints: Record<GamePhase, string> = {
      hook: 'Vortex rings are self-sustaining rotating fluid structures.',
      predict: 'Think about how the formula relates speed to radius.',
      play: 'Notice smaller rings consistently outpace larger ones.',
      review: 'The logarithm makes the relationship non-linear.',
      twist_predict: 'Vortex interactions can be surprisingly complex.',
      twist_play: 'Watch for leapfrogging when rings get close.',
      twist_review: 'Vortex dynamics are key to understanding turbulence.',
      transfer: 'Nature uses vortex rings for efficient propulsion.',
      test: 'Remember: smaller radius = faster ring.',
      mastery: 'You understand vortex ring physics!',
    };
    this.emitCoachEvent('hint_requested', { hint: hints[this.phase] });
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

  // === PHYSICS SIMULATION (PROTECTED) ===

  update(deltaTime: number): void {
    if (!this.isSimulating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play') return;

    this.time += deltaTime / 1000;
    this.animationTime += deltaTime;

    // Update all rings
    for (const ring of this.rings) {
      ring.x += ring.velocity * (deltaTime / 16);
      ring.age += deltaTime / 1000;
      ring.rotation += 0.1;

      // Slight expansion as ring ages (energy dissipation)
      ring.radius += 0.01;
      ring.velocity = this.getSpeedForRadius(ring.radius) * Math.exp(-ring.age * 0.1);
    }

    // Remove rings that have exited
    this.rings = this.rings.filter((ring) => ring.x < 700 && ring.age < 10);
  }

  private resetSimulation(): void {
    this.time = 0;
    this.animationTime = 0;
    this.isSimulating = false;
    this.rings = [];
    this.calculateRingSpeed();
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

    r.setViewport(700, 350);

    this.renderBackground(r);

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

    this.renderUI(r);

    return r.toFrame(this.nextFrame());
  }

  private renderBackground(r: CommandRenderer): void {
    r.clear(colors.bgDark);

    r.linearGradient('bgGrad', [
      { offset: '0%', color: '#0a0f1a' },
      { offset: '50%', color: '#0f172a' },
      { offset: '100%', color: '#0a0f1a' },
    ]);
  }

  private renderHook(r: CommandRenderer): void {
    r.text(350, 60, 'Vortex Rings', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 95, 'The elegant physics of smoke rings and beyond', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    // Animated ring illustration
    this.renderDemoRings(r, 350, 200);

    r.text(350, 320, 'What determines how fast they travel?', {
      fill: colors.primary,
      fontSize: 14,
      textAnchor: 'middle',
    });
  }

  private renderDemoRings(r: CommandRenderer, cx: number, cy: number): void {
    // Large ring (slow)
    const phase1 = (this.animationTime / 100) % (2 * Math.PI);
    r.ellipse(cx - 80, cy, 50, 50, {
      fill: 'transparent',
      stroke: colors.ring,
      strokeWidth: 8,
      opacity: 0.7,
    });
    // Rotation indication
    for (let i = 0; i < 4; i++) {
      const angle = phase1 + (i * Math.PI) / 2;
      const px = cx - 80 + Math.cos(angle) * 50;
      const py = cy + Math.sin(angle) * 50;
      r.circle(px, py, 4, { fill: colors.ringCore });
    }
    r.text(cx - 80, cy + 70, 'Large', { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });

    // Small ring (fast)
    const phase2 = (this.animationTime / 60) % (2 * Math.PI);
    r.ellipse(cx + 80, cy, 25, 25, {
      fill: 'transparent',
      stroke: colors.ring,
      strokeWidth: 6,
      opacity: 0.9,
    });
    for (let i = 0; i < 4; i++) {
      const angle = phase2 + (i * Math.PI) / 2;
      const px = cx + 80 + Math.cos(angle) * 25;
      const py = cy + Math.sin(angle) * 25;
      r.circle(px, py, 3, { fill: colors.ringCore });
    }
    r.text(cx + 80, cy + 70, 'Small', { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 90, 'You create two smoke rings: one large, one small.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 115, 'Which ring travels faster?', {
      fill: colors.accent,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Visual comparison
    r.rect(150, 150, 150, 120, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });
    r.ellipse(225, 200, 45, 45, {
      fill: 'transparent',
      stroke: colors.ring,
      strokeWidth: 6,
    });
    r.text(225, 260, 'Large Ring', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });

    r.rect(400, 150, 150, 120, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });
    r.ellipse(475, 200, 20, 20, {
      fill: 'transparent',
      stroke: colors.ring,
      strokeWidth: 4,
    });
    r.text(475, 260, 'Small Ring', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderPlay(r: CommandRenderer): void {
    const isTwist = this.phase === 'twist_play';

    // Ring launcher
    r.rect(50, 100, 60, 150, {
      fill: colors.bgCardLight,
      stroke: colors.border,
      rx: 10,
    });
    r.text(80, 175, 'LAUNCH', {
      fill: colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle',
    });

    // Render all active rings
    for (const ring of this.rings) {
      this.renderVortexRing(r, ring);
    }

    // Stats panel
    r.rect(450, 30, 230, 100, {
      fill: colors.bgCard + 'cc',
      stroke: colors.border,
      rx: 8,
    });

    r.text(460, 55, `Ring Radius: ${this.ringRadius.toFixed(0)} units`, {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
    });

    r.text(460, 80, `Calculated Speed: ${this.ringSpeed.toFixed(1)} units/s`, {
      fill: colors.success,
      fontSize: 12,
    });

    r.text(460, 100, `Core Radius: ${this.coreRadius.toFixed(1)} units`, {
      fill: colors.textMuted,
      fontSize: 11,
    });

    r.text(460, 120, `Active Rings: ${this.rings.length}`, {
      fill: colors.textSecondary,
      fontSize: 11,
    });

    if (this.showLabels && this.rings.length > 0) {
      r.text(350, 310, 'Watch how size affects speed!', {
        fill: colors.textMuted,
        fontSize: 12,
        textAnchor: 'middle',
      });
    }
  }

  private renderVortexRing(r: CommandRenderer, ring: VortexRing): void {
    const opacity = clamp(1 - ring.age * 0.1, 0.3, 1);

    // Ring body (torus cross-section)
    r.ellipse(ring.x, ring.y, ring.radius, ring.radius * 0.3, {
      fill: 'transparent',
      stroke: colors.ring,
      strokeWidth: ring.radius * 0.15,
      opacity: opacity,
    });

    // Rotating core particles
    if (this.showFlowLines) {
      for (let i = 0; i < 6; i++) {
        const angle = ring.rotation + (i * Math.PI) / 3;
        const px = ring.x + Math.cos(angle) * ring.radius;
        const py = ring.y + Math.sin(angle) * ring.radius * 0.3;
        r.circle(px, py, 3, {
          fill: colors.ringCore,
          opacity: opacity * 0.8,
        });
      }
    }

    // Speed label
    if (this.showLabels) {
      r.text(ring.x, ring.y - ring.radius - 15, `v=${ring.velocity.toFixed(1)}`, {
        fill: colors.textMuted,
        fontSize: 9,
        textAnchor: 'middle',
        opacity: opacity,
      });
    }
  }

  private renderReview(r: CommandRenderer): void {
    const isMainReview = this.phase === 'review';

    r.text(350, 50, isMainReview ? 'The Vortex Ring Formula' : 'Ring Interactions', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (isMainReview) {
      const concepts = [
        { title: 'V = (Gamma/4piR) * ln(8R/a)', desc: 'Speed inversely proportional to radius', color: colors.primary },
        { title: 'Smaller = Faster', desc: 'Smaller rings have higher self-induced velocity', color: colors.success },
        { title: 'Circulation (Gamma)', desc: 'More circulation = faster ring, but same size dependence', color: colors.accent },
      ];

      concepts.forEach((c, i) => {
        r.rect(100, 90 + i * 75, 500, 60, {
          fill: colors.bgCard,
          stroke: c.color,
          rx: 12,
        });
        r.text(120, 115 + i * 75, c.title, {
          fill: c.color,
          fontSize: 14,
          fontWeight: 'bold',
        });
        r.text(120, 135 + i * 75, c.desc, {
          fill: colors.textSecondary,
          fontSize: 12,
        });
      });
    } else {
      const insights = [
        { title: 'Leapfrogging', desc: 'Following rings can pass through leading rings', color: colors.primary },
        { title: 'Reconnection', desc: 'Colliding rings can merge or break apart', color: colors.accent },
      ];

      insights.forEach((c, i) => {
        r.rect(100, 100 + i * 90, 500, 70, {
          fill: colors.bgCard,
          stroke: c.color,
          rx: 12,
        });
        r.text(120, 130 + i * 90, c.title, {
          fill: c.color,
          fontSize: 16,
          fontWeight: 'bold',
        });
        r.text(120, 155 + i * 90, c.desc, {
          fill: colors.textSecondary,
          fontSize: 13,
        });
      });
    }
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 50, 'Ring Collision Challenge', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 90, 'What happens when two vortex rings collide?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Illustration of approaching rings
    r.rect(150, 130, 400, 120, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });

    r.ellipse(250, 190, 30, 30, {
      fill: 'transparent',
      stroke: colors.ring,
      strokeWidth: 6,
    });
    r.text(290, 190, '->', {
      fill: colors.textMuted,
      fontSize: 20,
    });
    r.text(350, 190, '?', {
      fill: colors.accent,
      fontSize: 30,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(410, 190, '<-', {
      fill: colors.textMuted,
      fontSize: 20,
    });
    r.ellipse(450, 190, 30, 30, {
      fill: 'transparent',
      stroke: colors.ring,
      strokeWidth: 6,
    });
  }

  private renderTransfer(r: CommandRenderer): void {
    const apps = [
      { name: 'Smoke Rings', desc: 'Entertainment and physics demonstrations' },
      { name: 'Jellyfish', desc: 'Use vortex rings for efficient propulsion' },
      { name: 'Heart Valves', desc: 'Blood flow creates vortex rings in the heart' },
      { name: 'Combustion', desc: 'Fuel injection creates vortices for mixing' },
    ];

    r.text(350, 40, 'Real-World Applications', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    apps.forEach((app, i) => {
      const isSelected = i === this.selectedApp;
      const isCompleted = this.completedApps[i];

      r.rect(40 + i * 165, 75, 155, 40, {
        fill: isSelected ? colors.primary : colors.bgCard,
        stroke: isCompleted ? colors.success : colors.border,
        rx: 8,
      });
      r.text(118 + i * 165, 100, app.name, {
        fill: isSelected ? colors.textPrimary : colors.textSecondary,
        fontSize: 11,
        textAnchor: 'middle',
      });
    });

    const selected = apps[this.selectedApp];
    r.rect(50, 135, 600, 160, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });

    r.text(350, 180, selected.name, {
      fill: colors.primary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 220, selected.desc, {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    const completed = this.completedApps.filter((c) => c).length;
    r.text(350, 320, `Progress: ${completed}/4 applications explored`, {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTest(r: CommandRenderer): void {
    if (this.testSubmitted) {
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

      r.text(350, 200, passed ? 'You understand vortex ring physics!' : 'Review the ring velocity formula.', {
        fill: colors.textSecondary,
        fontSize: 14,
        textAnchor: 'middle',
      });
      return;
    }

    const q = testQuestions[this.testQuestion];

    r.text(350, 35, `Question ${this.testQuestion + 1} of ${testQuestions.length}`, {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });

    r.text(350, 70, q.question, {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    q.options.forEach((option, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;

      r.rect(80, 100 + i * 55, 540, 45, {
        fill: isSelected ? colors.primary + '40' : colors.bgCard,
        stroke: isSelected ? colors.primary : colors.border,
        rx: 8,
      });
      r.text(350, 128 + i * 55, option, {
        fill: isSelected ? colors.primary : colors.textSecondary,
        fontSize: 13,
        textAnchor: 'middle',
      });
    });
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(350, 80, '(trophy)', { fontSize: 50, textAnchor: 'middle', fill: colors.warning });

    r.text(350, 150, 'Vortex Ring Master!', {
      fill: colors.primary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 190, 'You understand the elegant physics of vortex rings.', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: '(ring)', label: 'Ring Formula' },
      { icon: '(size)', label: 'Size Effects' },
      { icon: '(flow)', label: 'Flow Dynamics' },
      { icon: '(app)', label: 'Applications' },
    ];

    badges.forEach((badge, i) => {
      r.rect(90 + i * 135, 230, 120, 70, {
        fill: colors.bgCard,
        stroke: colors.success,
        rx: 10,
      });
      r.text(150 + i * 135, 255, badge.icon, {
        fontSize: 20,
        textAnchor: 'middle',
        fill: colors.success,
      });
      r.text(150 + i * 135, 285, badge.label, {
        fill: colors.textSecondary,
        fontSize: 10,
        textAnchor: 'middle',
      });
    });
  }

  private renderUI(r: CommandRenderer): void {
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
      case 'predict':
        r.addButton({
          id: 'predict_large',
          label: 'Large is faster',
          variant: this.prediction === 'large' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_small',
          label: 'Small is faster',
          variant: this.prediction === 'small' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_same',
          label: 'Same speed',
          variant: this.prediction === 'same' ? 'primary' : 'secondary',
        });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'See Result', variant: 'success' });
        }
        break;

      case 'play':
      case 'twist_play':
        r.addSlider({
          id: 'ring_radius',
          label: 'Ring Radius',
          value: this.ringRadius,
          min: 20,
          max: 80,
        });
        r.addButton({ id: 'launch_small', label: 'Small', variant: 'secondary' });
        r.addButton({ id: 'launch_medium', label: 'Medium', variant: 'secondary' });
        r.addButton({ id: 'launch_large', label: 'Large', variant: 'secondary' });
        r.addButton({ id: 'launch_current', label: 'Launch', variant: 'primary' });
        r.addButton({ id: 'reset', label: 'Clear', variant: 'secondary' });
        r.addToggle({ id: 'labels', label: 'Labels', value: this.showLabels });
        r.addToggle({ id: 'flow_lines', label: 'Flow', value: this.showFlowLines });
        if (this.rings.length >= 2 || this.time > 3) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'twist_predict':
        r.addButton({
          id: 'twist_pass',
          label: 'Pass through',
          variant: this.twistPrediction === 'pass' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_merge',
          label: 'Merge together',
          variant: this.twistPrediction === 'merge' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_complex',
          label: 'Complex interaction',
          variant: this.twistPrediction === 'complex' ? 'primary' : 'secondary',
        });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Smoke', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Jellyfish', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Heart', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Combustion', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every((c) => c)) {
          r.addButton({ id: 'next', label: 'Take Test', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({
            id: 'test_prev',
            label: 'Prev',
            variant: 'ghost',
            disabled: this.testQuestion === 0,
          });
          r.addButton({
            id: 'test_next',
            label: 'Next',
            variant: 'ghost',
            disabled: this.testQuestion >= testQuestions.length - 1,
          });
          for (let i = 0; i < 4; i++) {
            r.addButton({
              id: `answer_${i}`,
              label: String.fromCharCode(65 + i),
              variant: this.testAnswers[this.testQuestion] === i ? 'primary' : 'secondary',
            });
          }
          if (this.testAnswers.every((a) => a !== null)) {
            r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
          }
        } else {
          const score = this.calculateTestScore();
          r.addButton({
            id: score >= 7 ? 'next' : 'back',
            label: score >= 7 ? 'Complete!' : 'Review',
            variant: score >= 7 ? 'success' : 'secondary',
          });
        }
        break;

      case 'mastery':
        r.addButton({ id: 'back', label: 'Explore Again', variant: 'secondary' });
        break;

      default:
        r.addButton({ id: 'next', label: 'Continue', variant: 'primary' });
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
      ringRadius: this.ringRadius,
      circulation: this.circulation,
      ringSpeed: this.ringSpeed,
      rings: this.rings,
      time: this.time,
      isSimulating: this.isSimulating,
      showLabels: this.showLabels,
      showFlowLines: this.showFlowLines,
      testQuestion: this.testQuestion,
      testAnswers: this.testAnswers,
      testSubmitted: this.testSubmitted,
      selectedApp: this.selectedApp,
      completedApps: this.completedApps,
      guidedMode: this.guidedMode,
    };
  }

  restoreState(state: Record<string, any>): void {
    this.phase = state.phase || 'hook';
    this.prediction = state.prediction || null;
    this.twistPrediction = state.twistPrediction || null;
    this.ringRadius = state.ringRadius || 40;
    this.circulation = state.circulation || 100;
    this.rings = state.rings || [];
    this.time = state.time || 0;
    this.isSimulating = state.isSimulating || false;
    this.showLabels = state.showLabels ?? true;
    this.showFlowLines = state.showFlowLines ?? true;
    this.testQuestion = state.testQuestion || 0;
    this.testAnswers = state.testAnswers || Array(10).fill(null);
    this.testSubmitted = state.testSubmitted || false;
    this.selectedApp = state.selectedApp || 0;
    this.completedApps = state.completedApps || [false, false, false, false];
    this.guidedMode = state.guidedMode ?? true;
    this.calculateRingSpeed();
  }
}

// === FACTORY FUNCTION ===
export function createVortexRingsGame(sessionId: string): VortexRingsGame {
  return new VortexRingsGame(sessionId);
}
