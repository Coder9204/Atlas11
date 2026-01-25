/**
 * Wave-Particle Duality Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * What an attacker sees: circles at coordinates, rectangles, text
 * What they DON'T see: physics calculations, pattern generation, scoring
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer, clamp } from '../../renderer/CommandRenderer.js';

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

interface ParticleHit {
  x: number;
  y: number;
  id: number;
}

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#06b6d4',
  primaryDark: '#0891b2',
  accent: '#a855f7',
  accentDark: '#9333ea',
  warning: '#f59e0b',
  success: '#10b981',
  danger: '#ef4444',
  bgDark: '#020617',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
};

// === TEST QUESTIONS (protected IP) ===
const testQuestions: TestQuestion[] = [
  {
    question: 'What pattern do electrons create when passing through two slits without observation?',
    options: ['Two distinct bands', 'Interference pattern with multiple bands', 'Random scatter', 'Single bright spot'],
    correctIndex: 1,
  },
  {
    question: 'What happens to the pattern when we observe which slit electrons go through?',
    options: [
      'Pattern stays the same',
      'Pattern becomes two distinct bands',
      'Electrons stop moving',
      'Pattern becomes brighter',
    ],
    correctIndex: 1,
  },
  {
    question: 'The wave-particle duality means that electrons behave as:',
    options: ['Only waves', 'Only particles', 'Both waves and particles', 'Neither waves nor particles'],
    correctIndex: 2,
  },
  {
    question: 'In quantum mechanics, the act of measurement:',
    options: [
      'Has no effect on the system',
      'Collapses the wave function',
      'Creates new particles',
      'Speeds up electrons',
    ],
    correctIndex: 1,
  },
  {
    question: 'Quantum computers use what property to perform calculations?',
    options: ['Classical bits', 'Superposition', 'Gravity', 'Magnetism'],
    correctIndex: 1,
  },
  {
    question: 'The interference pattern demonstrates that electrons:',
    options: [
      'Travel in straight lines',
      'Pass through both slits simultaneously',
      'Only go through one slit',
      'Bounce off the barrier',
    ],
    correctIndex: 1,
  },
  {
    question: 'Quantum key distribution is secure because:',
    options: [
      'Strong encryption',
      'Observation disturbs quantum states',
      'Fast transmission',
      'Multiple encryption layers',
    ],
    correctIndex: 1,
  },
  {
    question: 'The electron microscope achieves high resolution by using:',
    options: ['Bright light', 'The wave nature of electrons', 'Magnetic fields only', 'X-rays'],
    correctIndex: 1,
  },
  {
    question: "What is 'wave function collapse'?",
    options: [
      'A wave crashing',
      'Quantum state reducing to a definite outcome upon measurement',
      'Electrons slowing down',
      'Light bending',
    ],
    correctIndex: 1,
  },
  {
    question: 'Superposition allows a quantum bit (qubit) to:',
    options: [
      'Be only 0',
      'Be only 1',
      'Be both 0 and 1 simultaneously',
      'Switch between 0 and 1 rapidly',
    ],
    correctIndex: 2,
  },
];

// === MAIN GAME CLASS ===

export class WaveParticleDualityGame extends BaseGame {
  readonly gameType = 'wave_particle_duality';
  readonly gameTitle = 'Wave-Particle Duality';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private time = 0;
  private particleCount = 0;
  private detectorOn = true;
  private firingRate = 8;
  private particleHits: ParticleHit[] = [];
  private hitIdCounter = 0;
  private testQuestion = 0;
  private testAnswers: (number | null)[] = Array(10).fill(null);
  private testSubmitted = false;
  private selectedApp = 0;
  private completedApps = [false, false, false, false];
  private guidedMode = true;
  private lastCoachMessage = '';

  // Navigation debouncing
  private lastNavTime = 0;
  private isNavigating = false;

  // Phase metadata
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
    twist_predict: 'New Variable',
    twist_play: 'Observer Effect',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Welcome to the quantum world! This experiment changed physics forever.',
    predict: 'Time to make a prediction! What do YOU think will happen?',
    play: 'Watch carefully as electrons hit the screen. Notice any patterns forming?',
    review: 'Did you expect THAT? Let\'s understand why this happens.',
    twist_predict: 'What happens when we try to catch the electrons in the act?',
    twist_play: 'Toggle the observer on and off. Watch how the pattern changes!',
    twist_review: 'You\'ve discovered the Observer Effect! Mind-blowing, right?',
    transfer: 'Let\'s see how this quantum weirdness powers real-world technology!',
    test: 'Time to test your understanding! Take your time with each question.',
    mastery: 'Congratulations! You\'ve mastered wave-particle duality!',
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
      message: 'Wave-Particle Duality lesson started',
    });
  }

  // === INPUT HANDLING (game logic ON SERVER) ===

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click':
        this.handleButtonClick(input.id);
        break;
      case 'toggle_change':
        this.handleToggleChange(input.id, input.value);
        break;
      case 'slider_change':
        this.handleSliderChange(input.id, input.value);
        break;
      case 'select_change':
        this.handleSelectChange(input.id, input.value);
        break;
      case 'progress_click':
        this.handleProgressClick(input.index);
        break;
      case 'hint_request':
        this.handleHintRequest();
        break;
    }
  }

  private handleButtonClick(id: string): void {
    // Navigation buttons
    if (id === 'next') {
      this.goNext();
      return;
    }
    if (id === 'back') {
      this.goBack();
      return;
    }

    // Prediction buttons (predict phase)
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }

    // Twist prediction buttons
    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
      this.emitCoachEvent('prediction_made', { twistPrediction: this.twistPrediction });
      return;
    }

    // Test answer buttons
    if (id.startsWith('answer_')) {
      const answerIndex = parseInt(id.replace('answer_', ''), 10);
      this.testAnswers[this.testQuestion] = answerIndex;
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
      const score = this.calculateTestScore();
      this.emitCoachEvent('test_completed', { score, total: testQuestions.length });
      return;
    }

    // App tabs (transfer phase)
    if (id.startsWith('app_')) {
      const appIndex = parseInt(id.replace('app_', ''), 10);
      this.selectedApp = appIndex;
      this.completedApps[appIndex] = true;
      return;
    }

    // Reset simulation
    if (id === 'reset') {
      this.particleHits = [];
      this.particleCount = 0;
      this.time = 0;
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'detector') {
      this.detectorOn = value;
      this.particleHits = [];
      this.particleCount = 0;
      this.emitCoachEvent('value_changed', { detector: value });
    }
    if (id === 'guided_mode') {
      this.guidedMode = value;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'firing_rate') {
      this.firingRate = value;
    }
  }

  private handleSelectChange(id: string, value: string): void {
    // Handle any select changes
  }

  private handleProgressClick(index: number): void {
    const currentIdx = this.phaseOrder.indexOf(this.phase);
    if (index < currentIdx) {
      this.goToPhase(this.phaseOrder[index]);
    }
  }

  private handleHintRequest(): void {
    const hints: Record<GamePhase, string> = {
      hook: 'Take a moment to read about the double-slit experiment.',
      predict: 'Think about what you\'d expect if you threw tiny balls through two slits.',
      play: 'Keep watching! The pattern takes time to emerge.',
      review: 'Key insight: Each electron somehow goes through BOTH slits at once!',
      twist_predict: 'If we watch which slit the electron goes through, does it still go through both?',
      twist_play: 'Compare the patterns: Observer ON vs OFF.',
      twist_review: 'The measurement doesn\'t push the electron - it\'s the INFORMATION that matters.',
      transfer: 'Each application uses a different aspect of wave-particle duality.',
      test: 'Think back to what you observed.',
      mastery: 'Review any section you\'d like to revisit.',
    };
    this.lastCoachMessage = hints[this.phase];
    this.emitCoachEvent('hint_requested', { hint: hints[this.phase] });
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
      this.particleHits = [];
      this.particleCount = 0;
      this.time = 0;
    }
    if (newPhase === 'twist_play') {
      this.detectorOn = true;
    }
    if (newPhase === 'play') {
      this.detectorOn = false;
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

  // === PHYSICS SIMULATION (PROTECTED - runs on server) ===

  update(deltaTime: number): void {
    // Only update during simulation phases
    if (this.phase !== 'play' && this.phase !== 'twist_play') {
      return;
    }

    // Time progression
    this.time += deltaTime / 1000;

    // Generate particles based on firing rate
    const particlesPerSecond = this.firingRate;
    const shouldAddParticle = Math.random() < (particlesPerSecond * deltaTime) / 1000;

    if (shouldAddParticle) {
      this.addParticle();
    }
  }

  /**
   * PROTECTED PHYSICS: Particle generation with quantum interference
   *
   * This is the core IP - the actual physics calculation.
   * Client NEVER sees this formula.
   */
  private addParticle(): void {
    const hit = this.calculateHitPosition();
    this.particleHits.push(hit);
    this.particleCount++;

    // Limit stored hits for performance
    if (this.particleHits.length > 500) {
      this.particleHits.shift();
    }
  }

  /**
   * PROTECTED: Calculate where particle hits based on quantum physics
   *
   * When NOT observing: interference pattern (wave behavior)
   * When observing: two distinct bands (particle behavior)
   */
  private calculateHitPosition(): ParticleHit {
    // Screen dimensions (relative to SVG viewport)
    const screenX = 560 + Math.random() * 45;
    let screenY: number;

    if (this.detectorOn) {
      // PARTICLE BEHAVIOR: Two distinct bands
      // Slit 1 at y=148, Slit 2 at y=216 (relative to barrier)
      // Screen shows bands at y=100-120 and y=220-240
      const useSlit1 = Math.random() < 0.5;
      if (useSlit1) {
        screenY = 100 + Math.random() * 20; // Band 1
      } else {
        screenY = 220 + Math.random() * 20; // Band 2
      }
    } else {
      // WAVE BEHAVIOR: Interference pattern
      // Multiple bands with varying intensity based on interference formula
      const intensity = this.calculateInterferencePattern();
      screenY = 40 + intensity * 265;
    }

    return {
      x: screenX,
      y: screenY,
      id: ++this.hitIdCounter,
    };
  }

  /**
   * PROTECTED: Quantum interference pattern calculation
   *
   * This simulates the probability distribution from quantum mechanics.
   * The formula is based on the double-slit interference equation.
   */
  private calculateInterferencePattern(): number {
    // Simplified interference pattern
    // Real formula: I = I0 * cos²(πd*sinθ/λ) * sinc²(πa*sinθ/λ)
    // We use a probabilistic approximation

    // Generate position with interference-like distribution
    // More likely in bright fringes, less likely in dark fringes
    const numFringes = 7;
    const fringe = Math.floor(Math.random() * numFringes);
    const fringeCenter = (fringe + 0.5) / numFringes;

    // Add gaussian spread within fringe
    const spread = 0.04;
    const position = fringeCenter + (Math.random() - 0.5) * spread * 2;

    return clamp(position, 0, 1);
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

  // === RENDERING (converts state to draw commands) ===

  render(): GameFrame {
    const r = new CommandRenderer(this.viewport.width, this.viewport.height);
    r.reset();

    // Set viewport
    r.setViewport(700, 350);

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
      case 'twist_play':
        this.renderPlayPhase(r);
        break;
      case 'review':
      case 'twist_review':
        this.renderReviewPhase(r);
        break;
      case 'twist_predict':
        this.renderTwistPredictPhase(r);
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
    // Dark lab background
    r.clear('#030712');

    // Gradient overlay
    r.linearGradient('labBg', [
      { offset: '0%', color: '#030712' },
      { offset: '50%', color: '#0a0f1a' },
      { offset: '100%', color: '#030712' },
    ]);

    // Subtle grid
    for (let x = 0; x < 700; x += 25) {
      r.line(x, 0, x, 350, { stroke: '#1e293b', strokeWidth: 0.5, opacity: 0.3 });
    }
    for (let y = 0; y < 350; y += 25) {
      r.line(0, y, 700, y, { stroke: '#1e293b', strokeWidth: 0.5, opacity: 0.3 });
    }
  }

  private renderHookPhase(r: CommandRenderer): void {
    // Introduction content
    r.text(350, 80, 'The Double-Slit Experiment', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 120, '"The most beautiful experiment in physics"', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    // Simplified diagram
    this.renderSimplifiedApparatus(r);

    r.text(350, 300, 'Electrons behave in ways that defy common sense...', {
      fill: colors.primary,
      fontSize: 14,
      textAnchor: 'middle',
    });
  }

  private renderPredictPhase(r: CommandRenderer): void {
    r.text(350, 60, 'What pattern will electrons create?', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Show apparatus
    this.renderSimplifiedApparatus(r);

    // Prediction options as visual hints
    r.text(350, 290, 'Make your prediction below:', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
  }

  private renderPlayPhase(r: CommandRenderer): void {
    // Full quantum lab visualizer
    this.renderQuantumLab(r);
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 60, this.phase === 'review' ? 'The Interference Pattern' : 'The Observer Effect', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Key takeaways
    const takeaways =
      this.phase === 'review'
        ? [
            { title: 'Wave Behavior', desc: 'Electrons create interference patterns like waves' },
            { title: 'Superposition', desc: 'Each electron goes through BOTH slits simultaneously' },
          ]
        : [
            { title: 'Observation Matters', desc: 'Looking changes the outcome' },
            { title: 'Wave Function Collapse', desc: 'Measurement forces a definite state' },
          ];

    takeaways.forEach((t, i) => {
      r.rect(100, 120 + i * 80, 500, 60, {
        fill: colors.bgCard,
        stroke: colors.border,
        rx: 12,
      });
      r.text(120, 150 + i * 80, t.title, {
        fill: colors.primary,
        fontSize: 16,
        fontWeight: 'bold',
      });
      r.text(120, 170 + i * 80, t.desc, {
        fill: colors.textSecondary,
        fontSize: 12,
      });
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 60, 'What if we watch the electrons?', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, 'Adding a detector to see which slit each electron passes through...', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Show detector illustration
    r.rect(250, 150, 200, 100, {
      fill: '#7f1d1d',
      stroke: '#991b1b',
      rx: 8,
    });
    r.text(350, 210, 'DETECTOR', {
      fill: '#fca5a5',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderTransferPhase(r: CommandRenderer): void {
    const apps = ['Quantum Computing', 'Quantum Cryptography', 'Electron Microscopy', 'Quantum Sensors'];

    r.text(350, 40, 'Real-World Applications', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // App tabs
    apps.forEach((app, i) => {
      const isSelected = i === this.selectedApp;
      const isCompleted = this.completedApps[i];

      r.rect(50 + i * 160, 80, 150, 40, {
        fill: isSelected ? colors.primary : colors.bgCard,
        stroke: isCompleted ? colors.success : colors.border,
        rx: 8,
        id: `app_${i}`,
      });
      r.text(125 + i * 160, 105, app, {
        fill: isSelected ? colors.textPrimary : colors.textSecondary,
        fontSize: 11,
        textAnchor: 'middle',
      });
    });

    // App content
    r.rect(50, 140, 600, 180, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });
    r.text(350, 230, `Learn about ${apps[this.selectedApp]}`, {
      fill: colors.textPrimary,
      fontSize: 16,
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
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Answer options
    q.options.forEach((option, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;

      r.rect(100, 120 + i * 50, 500, 40, {
        fill: isSelected ? colors.primary + '40' : colors.bgCard,
        stroke: isSelected ? colors.primary : colors.border,
        rx: 8,
        id: `answer_${i}`,
      });
      r.text(350, 145 + i * 50, option, {
        fill: isSelected ? colors.primary : colors.textSecondary,
        fontSize: 14,
        textAnchor: 'middle',
      });
    });
  }

  private renderTestResults(r: CommandRenderer): void {
    const score = this.calculateTestScore();
    const passed = score >= 7;

    r.text(350, 80, passed ? 'Congratulations!' : 'Keep Learning!', {
      fill: passed ? colors.success : colors.warning,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 140, `Score: ${score} / ${testQuestions.length}`, {
      fill: colors.textPrimary,
      fontSize: 24,
      textAnchor: 'middle',
    });

    r.text(350, 180, passed ? 'You\'ve mastered wave-particle duality!' : 'Review the concepts and try again.', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });
  }

  private renderMasteryPhase(r: CommandRenderer): void {
    // Celebration
    r.text(350, 100, '🎉', { fontSize: 60, textAnchor: 'middle' });

    r.text(350, 180, 'You\'ve Mastered', {
      fill: colors.textSecondary,
      fontSize: 18,
      textAnchor: 'middle',
    });

    r.text(350, 220, 'Wave-Particle Duality!', {
      fill: colors.primary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 280, 'You now understand one of the most profound concepts in physics.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
  }

  private renderSimplifiedApparatus(r: CommandRenderer): void {
    // Electron source
    r.rect(50, 150, 60, 50, { fill: colors.bgCardLight, stroke: colors.border, rx: 8 });
    r.text(80, 180, 'e⁻', { fill: colors.primary, fontSize: 20, textAnchor: 'middle' });

    // Barrier with slits
    r.rect(280, 100, 20, 150, { fill: colors.bgCardLight, stroke: colors.border });
    r.rect(280, 160, 20, 30, { fill: '#000' }); // Slit 1
    r.rect(280, 210, 20, 30, { fill: '#000' }); // Slit 2

    // Screen
    r.rect(550, 100, 40, 150, { fill: '#064e3b', stroke: colors.border, rx: 4 });

    // Labels
    r.text(80, 220, 'Source', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(290, 90, 'Slits', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(570, 90, 'Screen', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
  }

  private renderQuantumLab(r: CommandRenderer): void {
    // Optical table
    r.rect(5, 305, 690, 45, { fill: '#111827', rx: 4 });

    // Electron gun
    r.group('translate(25, 175)', (g) => {
      g.rect(0, -55, 90, 110, { fill: colors.bgCardLight, stroke: colors.border, rx: 10 });
      g.ellipse(90, 0, 30, 45, { fill: colors.primary + '20', stroke: colors.border });
      g.circle(30, 0, 12, { fill: colors.warning }); // Cathode glow
    });

    // Barrier with slits
    r.group('translate(255, 45)', (g) => {
      g.rect(-8, 0, 26, 265, { fill: colors.bgCardLight });
      g.rect(-8, 90, 26, 28, { fill: '#030712' }); // Slit 1
      g.rect(-8, 158, 26, 28, { fill: '#030712' }); // Slit 2
    });

    // Detector (if in twist_play and on)
    if (this.phase === 'twist_play' && this.detectorOn) {
      r.rect(185, 105, 35, 50, { fill: '#7f1d1d', stroke: '#991b1b', rx: 5 });
      r.circle(203, 130, 10, { fill: '#dc2626' });
    }

    // Detection screen
    r.group('translate(560, 40)', (g) => {
      g.rect(0, 0, 45, 265, { fill: '#022c22', rx: 3 });

      // Particle hits (client sees only positions, not the physics)
      this.particleHits.forEach((hit) => {
        g.circle(hit.x - 560, hit.y - 40, 2.5, {
          fill: this.detectorOn ? '#f87171' : '#67e8f9',
          opacity: 0.95,
        });
      });
    });

    // Stats display
    r.text(350, 20, `Electrons: ${this.particleCount}`, {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderUIState(r: CommandRenderer): void {
    // Header
    r.setHeader(this.gameTitle, this.phaseLabels[this.phase]);

    // Progress
    r.setProgress({
      id: 'phase_progress',
      current: this.phaseOrder.indexOf(this.phase) + 1,
      total: this.phaseOrder.length,
      labels: this.phaseOrder.map((p) => this.phaseLabels[p]),
      color: colors.primary,
    });

    // Coach message
    if (this.guidedMode) {
      r.setCoachMessage(this.coachMessages[this.phase]);
    }

    // Phase-specific controls
    const idx = this.phaseOrder.indexOf(this.phase);

    // Back button (always except first phase)
    if (idx > 0) {
      r.addButton({ id: 'back', label: '← Back', variant: 'secondary' });
    }

    // Phase-specific buttons
    switch (this.phase) {
      case 'predict':
        r.addButton({
          id: 'predict_two_bands',
          label: 'Two Bands',
          variant: this.prediction === 'two_bands' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_interference',
          label: 'Interference Pattern',
          variant: this.prediction === 'interference' ? 'primary' : 'secondary',
        });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Continue →', variant: 'success' });
        }
        break;

      case 'play':
      case 'twist_play':
        r.addSlider({
          id: 'firing_rate',
          label: 'Firing Rate',
          value: this.firingRate,
          min: 1,
          max: 20,
        });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
        if (this.phase === 'twist_play') {
          r.addToggle({
            id: 'detector',
            label: 'Observer',
            value: this.detectorOn,
            onLabel: 'ON',
            offLabel: 'OFF',
          });
        }
        if (this.particleCount >= 50) {
          r.addButton({ id: 'next', label: 'Continue →', variant: 'success' });
        }
        break;

      case 'twist_predict':
        r.addButton({
          id: 'twist_same',
          label: 'Same Pattern',
          variant: this.twistPrediction === 'same' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_different',
          label: 'Different Pattern',
          variant: this.twistPrediction === 'different' ? 'primary' : 'secondary',
        });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Continue →', variant: 'success' });
        }
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Computing', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Crypto', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Microscopy', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Sensors', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every((c) => c)) {
          r.addButton({ id: 'next', label: 'Take Quiz →', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: '← Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({
            id: 'test_next',
            label: 'Next →',
            variant: 'ghost',
            disabled: this.testQuestion >= testQuestions.length - 1,
          });
          if (this.testAnswers.every((a) => a !== null)) {
            r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
          }
        } else {
          const score = this.calculateTestScore();
          if (score >= 7) {
            r.addButton({ id: 'next', label: 'Complete! →', variant: 'success' });
          } else {
            r.addButton({ id: 'back', label: 'Review Concepts', variant: 'secondary' });
          }
        }
        break;

      default:
        // Hook, review phases - just continue button
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
      particleCount: this.particleCount,
      detectorOn: this.detectorOn,
      firingRate: this.firingRate,
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
    this.particleCount = state.particleCount || 0;
    this.detectorOn = state.detectorOn ?? true;
    this.firingRate = state.firingRate || 8;
    this.testQuestion = state.testQuestion || 0;
    this.testAnswers = state.testAnswers || Array(10).fill(null);
    this.testSubmitted = state.testSubmitted || false;
    this.selectedApp = state.selectedApp || 0;
    this.completedApps = state.completedApps || [false, false, false, false];
    this.guidedMode = state.guidedMode ?? true;
  }
}

// === FACTORY ===

export function createWaveParticleDualityGame(sessionId: string): WaveParticleDualityGame {
  return new WaveParticleDualityGame(sessionId);
}
