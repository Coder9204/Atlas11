/**
 * Entropy Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Boltzmann entropy formula: S = k_B * ln(Ω)
 * - Mixing entropy calculation: S = -k * Σ(p_i * ln(p_i))
 * - Microstate counting: Ω = n! / (k! * (n-k)!)
 * - Second law: ΔS_universe ≥ 0
 * - Landauer limit: E_min = k*T*ln(2) per bit
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer, clamp } from '../../renderer/CommandRenderer.js';

// === GAME PHASES ===
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

// === PARTICLE TYPE ===
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  side: 'left' | 'right';
}

// === TEST QUESTIONS (PROTECTED) ===
interface TestQuestion {
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const testQuestions: TestQuestion[] = [
  {
    scenario: 'A chemist mixes two gases in an insulated container. Before mixing, each gas is in its own compartment.',
    question: 'What happens to total entropy after the barrier is removed?',
    options: [
      'Decreases (mixing creates order)',
      'Stays same (energy conserved)',
      'Increases (more possible arrangements)',
      'Cannot determine',
    ],
    correctIndex: 2,
    explanation: 'Mixing always increases entropy—the number of possible microstates dramatically increases!',
  },
  {
    scenario: 'A hot cup of coffee cools to room temperature in a room.',
    question: 'How does total entropy of the universe change?',
    options: [
      'Decreases (coffee more ordered)',
      'Increases (heat flows hot to cold)',
      'Stays same (no work done)',
      'First increases then decreases',
    ],
    correctIndex: 1,
    explanation: 'Heat flowing hot→cold is irreversible. Room gains more entropy than coffee loses.',
  },
  {
    scenario: 'Ice at 0°C absorbs 100 J of heat and melts to water at 0°C.',
    question: 'What is the entropy change of the ice?',
    options: [
      'Zero (temperature unchanged)',
      'Negative (ice more ordered)',
      'Positive (liquid has more microstates)',
      'Undefined at phase transitions',
    ],
    correctIndex: 2,
    explanation: 'ΔS = Q/T = 100J/273K ≈ 0.37 J/K. Liquid molecules have many more arrangements!',
  },
  {
    scenario: 'A machine transfers heat from cold to hot without external work.',
    question: 'Why is this machine impossible?',
    options: [
      'Energy not conserved',
      'Violates second law (entropy would decrease)',
      'Heat cannot flow through vacuum',
      'Requires infinite power',
    ],
    correctIndex: 1,
    explanation: 'Second law: heat flows hot→cold spontaneously. Reverse requires external work.',
  },
  {
    scenario: 'A perfectly ordered deck of cards is shuffled many times.',
    question: 'Could it return to perfect order through random shuffling?',
    options: [
      'No, physically impossible',
      'Yes, but extremely improbable',
      'Yes, after exactly 52! shuffles',
      'Only if shuffled counterclockwise',
    ],
    correctIndex: 1,
    explanation: 'Not forbidden—just incredibly improbable. 52! ≈ 8×10⁶⁷ possible arrangements!',
  },
  {
    scenario: 'Living cells maintain ordered structures despite the second law.',
    question: 'How does this not violate the second law?',
    options: [
      'Living things exempt from thermodynamics',
      'Cells export disorder (heat, waste) to surroundings',
      'Second law only applies to closed systems',
      'Biological processes are reversible',
    ],
    correctIndex: 1,
    explanation: 'Cells import low-entropy food, export high-entropy waste. Total entropy increases!',
  },
  {
    scenario: 'A computer erases 1 bit of information from memory.',
    question: 'According to Landauer\'s principle, what must happen?',
    options: [
      'Nothing—information not physical',
      'At least kT·ln(2) joules released as heat',
      'Computer must cool down',
      'Energy destroyed with information',
    ],
    correctIndex: 1,
    explanation: 'Erasing info has thermodynamic cost: ≈ 3×10⁻²¹ J per bit as heat!',
  },
  {
    scenario: 'An engineer claims a machine extracts work from single heat reservoir.',
    question: 'This violates which statement?',
    options: [
      'First law of thermodynamics',
      'Kelvin-Planck statement of second law',
      'Conservation of momentum',
      'Newton\'s third law',
    ],
    correctIndex: 1,
    explanation: 'Kelvin-Planck: impossible to extract work from single reservoir with no other effect.',
  },
  {
    scenario: 'The universe started in a very low-entropy state (Big Bang).',
    question: 'What is the "heat death" hypothesis?',
    options: [
      'Universe becomes too hot for life',
      'Maximum entropy—all processes stop',
      'Universe collapses back',
      'Stars burn even hotter',
    ],
    correctIndex: 1,
    explanation: 'Maximum entropy = no temperature gradients = no free energy = all processes stop.',
  },
  {
    scenario: 'A reaction has ΔG (Gibbs free energy) = -50 kJ/mol at room temp.',
    question: 'What can we conclude?',
    options: [
      'Will not occur spontaneously',
      'Will occur spontaneously',
      'ΔG doesn\'t predict spontaneity',
      'Requires a catalyst',
    ],
    correctIndex: 1,
    explanation: 'Negative ΔG = spontaneous. ΔG = ΔH - TΔS combines enthalpy and entropy.',
  },
];

// === TRANSFER APPLICATIONS ===
interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  stats: { value: string; label: string }[];
}

const transferApps: TransferApp[] = [
  {
    icon: 'L',
    title: 'Biochemistry & Life',
    short: 'Life',
    tagline: 'How living systems create order from chaos',
    description: 'Living organisms maintain internal order by exporting entropy.',
    connection: 'Cells import low-entropy nutrients and export high-entropy waste. Net effect: total entropy increases!',
    stats: [
      { value: '10⁷', label: 'ATP/cell/sec' },
      { value: '100W', label: 'Human heat output' },
      { value: '10¹⁴', label: 'Cells in body' },
    ],
  },
  {
    icon: 'C',
    title: 'Information & Computing',
    short: 'Computing',
    tagline: 'The thermodynamics of bits',
    description: 'Every bit erased has a minimum thermodynamic cost.',
    connection: 'Landauer limit: erasing 1 bit requires dissipating kT·ln(2) energy as heat.',
    stats: [
      { value: '3×10⁻²¹J', label: 'Per bit minimum' },
      { value: '1%', label: 'World electricity' },
      { value: '10²¹', label: 'Bits stored' },
    ],
  },
  {
    icon: 'E',
    title: 'Heat Engines & Efficiency',
    short: 'Engines',
    tagline: 'Why perfect efficiency is impossible',
    description: 'Heat engines are limited by entropy—some heat must always be rejected.',
    connection: 'Carnot efficiency η = 1 - T_cold/T_hot is the absolute maximum.',
    stats: [
      { value: '40%', label: 'Best coal plant' },
      { value: '60%', label: 'Gas turbine' },
      { value: '25%', label: 'Car engine' },
    ],
  },
  {
    icon: 'T',
    title: 'Cosmology & Arrow of Time',
    short: 'Cosmology',
    tagline: 'Why time flows forward',
    description: 'Entropy gives time its direction. Universe increases toward maximum disorder.',
    connection: 'The arrow of time emerges from entropy always increasing in closed systems.',
    stats: [
      { value: '10¹²⁰', label: 'Universe entropy' },
      { value: '10¹⁰⁰', label: 'Years to heat death' },
      { value: '1', label: 'Time direction' },
    ],
  },
];

// === COLORS ===
const colors = {
  primary: '#8b5cf6',
  primaryDark: '#7c3aed',
  primaryLight: '#c4b5fd',
  accent: '#ec4899',
  accentLight: '#f9a8d4',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  bgDark: '#0f0a1e',
  bgCard: '#1a1030',
  bgCardLight: '#251842',
  border: '#4c1d95',
  textPrimary: '#f5f3ff',
  textSecondary: '#c4b5fd',
  textMuted: '#7c3aed',
  blue: '#3b82f6',
  red: '#ef4444',
};

// === COACH MESSAGES ===
const coachMessages: Record<GamePhase, string> = {
  hook: 'Watch the particles! Blue on left, red on right. What happens when we remove the barrier?',
  predict: 'After mixing, could particles ever spontaneously separate back?',
  play: 'Remove the barrier and watch entropy increase! Notice how particles spread out.',
  review: 'Entropy measures disorder. More arrangements = higher entropy = more probable.',
  twist_predict: 'What if we started with ALL particles on one side? Even more extreme!',
  twist_play: 'Try different particle counts. More particles = astronomically more microstates!',
  twist_review: 'S = k ln(Ω). Entropy is connected to probability via microstates.',
  transfer: 'Entropy appears everywhere—from biology to black holes!',
  test: 'Apply the second law to these real-world scenarios.',
  mastery: 'You now understand why time has a direction!',
};

// === MAIN GAME CLASS ===
export class EntropyGame extends BaseGame {
  readonly gameType = 'entropy';
  readonly gameTitle = 'Entropy';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Particle simulation (PROTECTED)
  private particles: Particle[] = [];
  private numParticles = 20;
  private isSimulating = false;
  private barrierRemoved = false;
  private timeElapsed = 0;

  // Physics constants (PROTECTED)
  private readonly k_B = 1.38e-23; // Boltzmann constant

  // Test state
  private testQuestion = 0;
  private testAnswers: (number | null)[] = Array(10).fill(null);
  private testSubmitted = false;

  // Transfer phase state
  private selectedApp = 0;
  private completedApps = [false, false, false, false];

  // Navigation
  private lastNavTime = 0;

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
    twist_predict: 'Twist',
    twist_play: 'Twist Lab',
    twist_review: 'Twist Review',
    transfer: 'Transfer',
    test: 'Test',
    mastery: 'Mastery',
  };

  constructor(sessionId: string) {
    super(sessionId);
    this.initializeParticles(this.numParticles, true);
  }

  // === ENTROPY PHYSICS CALCULATIONS (PROTECTED) ===
  private initializeParticles(count: number, separated: boolean): void {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const isLeftSide = separated ? i < count / 2 : Math.random() > 0.5;
      this.particles.push({
        x: separated
          ? (isLeftSide ? 20 + Math.random() * 70 : 110 + Math.random() * 70)
          : 20 + Math.random() * 160,
        y: 20 + Math.random() * 100,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        side: isLeftSide ? 'left' : 'right',
      });
    }
  }

  private calculateEntropy(): number {
    if (this.particles.length === 0) return 0;

    const leftCount = this.particles.filter(p => p.x < 100).length;
    const rightCount = this.particles.length - leftCount;
    const total = this.particles.length;

    if (leftCount === 0 || rightCount === 0) return 0;

    // Mixing entropy formula: S = -k * Σ(p_i * ln(p_i))
    const pLeft = leftCount / total;
    const pRight = rightCount / total;
    const S = -total * (pLeft * Math.log(pLeft) + pRight * Math.log(pRight));

    return S;
  }

  private calculateMicrostates(): number {
    const n = this.particles.length;
    const k = this.particles.filter(p => p.x < 100).length;
    if (k === 0 || k === n) return 1;

    // Binomial coefficient using Stirling approximation
    const logOmega = n * Math.log(n) - k * Math.log(k) - (n - k) * Math.log(n - k);
    return Math.min(Math.round(Math.exp(logOmega)), 1e15);
  }

  private get leftCount(): number {
    return this.particles.filter(p => p.x < 100).length;
  }

  private get rightCount(): number {
    return this.particles.length - this.leftCount;
  }

  private get maxEntropy(): number {
    return this.numParticles * Math.log(2);
  }

  // === INPUT HANDLING ===
  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click':
        this.handleButtonClick(input.id!);
        break;
      case 'slider_change':
        this.handleSliderChange(input.id!, input.value);
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

    // Predictions
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }
    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
      this.emitCoachEvent('twist_prediction_made', { prediction: this.twistPrediction });
      return;
    }

    // Simulation controls
    if (id === 'remove_barrier') {
      this.barrierRemoved = true;
      this.isSimulating = true;
      this.emitCoachEvent('barrier_removed', {});
      return;
    }
    if (id === 'reset') {
      this.resetSimulation();
      return;
    }
    if (id === 'start' || id === 'stop') {
      this.isSimulating = !this.isSimulating;
      return;
    }

    // Test answers
    if (id.startsWith('answer_')) {
      const optionIndex = parseInt(id.replace('answer_', ''), 10);
      this.testAnswers[this.testQuestion] = optionIndex;
      return;
    }
    if (id === 'test_next') {
      if (this.testQuestion < testQuestions.length - 1) {
        this.testQuestion++;
      }
      return;
    }
    if (id === 'test_prev') {
      if (this.testQuestion > 0) {
        this.testQuestion--;
      }
      return;
    }
    if (id === 'test_submit') {
      this.testSubmitted = true;
      const score = this.calculateTestScore();
      this.emitCoachEvent('test_completed', { score, total: testQuestions.length });
      return;
    }

    // Transfer app tabs
    if (id.startsWith('app_')) {
      const appIndex = parseInt(id.replace('app_', ''), 10);
      this.selectedApp = appIndex;
      this.completedApps[appIndex] = true;
      this.emitCoachEvent('app_explored', { app: transferApps[appIndex].title });
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'num_particles') {
      this.numParticles = clamp(Math.round(value), 10, 50);
      this.resetSimulation();
    }
  }

  // === NAVIGATION ===
  private goNext(): void {
    const currentIndex = this.phaseOrder.indexOf(this.phase);
    if (currentIndex < this.phaseOrder.length - 1) {
      this.goToPhase(this.phaseOrder[currentIndex + 1]);
    }
  }

  private goBack(): void {
    const currentIndex = this.phaseOrder.indexOf(this.phase);
    if (currentIndex > 0) {
      this.goToPhase(this.phaseOrder[currentIndex - 1]);
    }
  }

  private goToPhase(newPhase: GamePhase): void {
    const now = Date.now();
    if (now - this.lastNavTime < 400) return;
    this.lastNavTime = now;

    this.emitCoachEvent('phase_change', { from: this.phase, to: newPhase });
    this.phase = newPhase;

    // Reset simulation for play phases
    if (newPhase === 'play' || newPhase === 'twist_play') {
      this.resetSimulation();
    }
  }

  private resetSimulation(): void {
    this.initializeParticles(this.numParticles, true);
    this.barrierRemoved = false;
    this.isSimulating = false;
    this.timeElapsed = 0;
  }

  private calculateTestScore(): number {
    let correct = 0;
    for (let i = 0; i < testQuestions.length; i++) {
      if (this.testAnswers[i] === testQuestions[i].correctIndex) {
        correct++;
      }
    }
    return correct;
  }

  // === UPDATE ===
  update(deltaTime: number): void {
    if (!this.isSimulating) return;

    this.timeElapsed += deltaTime;

    // Update particles
    this.particles = this.particles.map(p => {
      let newX = p.x + p.vx;
      let newY = p.y + p.vy;
      let newVx = p.vx;
      let newVy = p.vy;

      // Wall collisions
      if (newX < 10 || newX > 190) {
        newVx = -newVx;
        newX = Math.max(10, Math.min(190, newX));
      }
      if (newY < 10 || newY > 130) {
        newVy = -newVy;
        newY = Math.max(10, Math.min(130, newY));
      }

      // Barrier collision (if not removed)
      if (!this.barrierRemoved) {
        if (p.x < 100 && newX >= 100) {
          newVx = -newVx;
          newX = 99;
        } else if (p.x >= 100 && newX < 100) {
          newVx = -newVx;
          newX = 101;
        }
      }

      return {
        ...p,
        x: newX,
        y: newY,
        vx: newVx,
        vy: newVy,
        side: newX < 100 ? 'left' : 'right',
      };
    });
  }

  // === RENDER ===
  render(): GameFrame {
    const r = new CommandRenderer(this.viewport.width, this.viewport.height);
    r.reset();
    r.setViewport(700, 400);

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
        this.renderPlay(r);
        break;
      case 'review':
        this.renderReview(r);
        break;
      case 'twist_predict':
        this.renderTwistPredict(r);
        break;
      case 'twist_play':
        this.renderTwistPlay(r);
        break;
      case 'twist_review':
        this.renderTwistReview(r);
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

    return r.toFrame(this.nextFrame());
  }

  // === PARTICLE SIMULATION RENDERER ===
  private renderParticleSimulation(r: CommandRenderer, x: number, y: number, width: number, height: number): void {
    // Container
    r.rect(x, y, width, height, {
      fill: '#0f172a',
      stroke: '#334155',
      strokeWidth: 2,
      rx: 8,
    });

    // Barrier (if not removed)
    if (!this.barrierRemoved) {
      r.line(x + width / 2, y + 5, x + width / 2, y + height - 5, {
        stroke: '#64748b',
        strokeWidth: 4,
      });
    } else {
      // Dashed line showing where barrier was
      r.line(x + width / 2, y + 5, x + width / 2, y + height - 5, {
        stroke: '#64748b',
        strokeWidth: 1,
        strokeDasharray: '4,4',
        opacity: 0.3,
      });
    }

    // Scale particles to fit
    const scaleX = width / 200;
    const scaleY = height / 150;

    // Particles
    this.particles.forEach(p => {
      const px = x + p.x * scaleX;
      const py = y + p.y * scaleY;
      const particleColor = p.x < 100 ? colors.blue : colors.red;
      r.circle(px, py, 4 * Math.min(scaleX, scaleY), {
        fill: particleColor,
      });
    });

    // Labels
    r.text(x + width * 0.25, y + height - 8, `${this.leftCount}`, {
      fill: colors.blue,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(x + width * 0.75, y + height - 8, `${this.rightCount}`, {
      fill: colors.red,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Entropy bar
    const entropy = this.calculateEntropy();
    const entropyRatio = Math.min(entropy / this.maxEntropy, 1);
    r.rect(x + 5, y + 2, width - 10, 4, {
      fill: '#1e293b',
      rx: 2,
    });
    r.rect(x + 5, y + 2, (width - 10) * entropyRatio, 4, {
      fill: colors.primary,
      rx: 2,
    });
  }

  // === PHASE RENDERERS ===
  private renderHook(r: CommandRenderer): void {
    r.text(350, 35, 'Entropy: The Arrow of Time', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 60, 'Explore the fundamental law that gives time its direction', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });

    // Particle simulation
    this.renderParticleSimulation(r, 175, 80, 350, 150);

    // Stats
    r.rect(100, 245, 200, 55, { fill: colors.bgCard, rx: 8 });
    r.text(200, 265, 'Entropy (S)', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(200, 288, this.calculateEntropy().toFixed(2), {
      fill: colors.info,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(400, 245, 200, 55, { fill: colors.bgCard, rx: 8 });
    r.text(500, 265, 'Microstates', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(500, 288, this.calculateMicrostates().toExponential(1), {
      fill: colors.primary,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Question
    r.text(350, 325, 'Blue particles left, red right. Remove the barrier...', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 345, 'Why don\'t they ever spontaneously separate again?', {
      fill: colors.accent,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(350, 35, 'Make Your Prediction', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 60, 500, 80, { fill: colors.bgCard, rx: 12 });
    r.text(350, 90, 'After mixing, particles are randomly distributed.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 115, 'Could they ever spontaneously separate back?', {
      fill: colors.accent,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 155, 500, 170, { fill: colors.bgCard, rx: 12 });
    r.text(350, 180, 'Select your answer below:', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(350, 25, 'Observe Entropy in Action', {
      fill: colors.textPrimary,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Particle simulation (larger)
    this.renderParticleSimulation(r, 100, 50, 500, 180);

    // Stats panel
    r.rect(100, 245, 150, 65, { fill: colors.bgCard, rx: 8 });
    r.text(175, 265, 'Entropy', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(175, 290, this.calculateEntropy().toFixed(2), {
      fill: colors.info,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(275, 245, 150, 65, { fill: colors.bgCard, rx: 8 });
    r.text(350, 265, 'Microstates', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(350, 290, this.calculateMicrostates().toExponential(1), {
      fill: colors.primary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(450, 245, 150, 65, { fill: colors.bgCard, rx: 8 });
    r.text(525, 265, 'Left : Right', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(525, 290, `${this.leftCount} : ${this.rightCount}`, {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Status
    if (!this.barrierRemoved) {
      r.text(350, 335, 'Click "Remove Barrier" to start mixing!', {
        fill: colors.accent,
        fontSize: 13,
        textAnchor: 'middle',
      });
    } else {
      r.text(350, 335, 'Watch the particles spread out—entropy increasing!', {
        fill: colors.success,
        fontSize: 13,
        textAnchor: 'middle',
      });
    }
  }

  private renderReview(r: CommandRenderer): void {
    r.text(350, 35, 'Understanding Entropy', {
      fill: colors.textPrimary,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Key insight
    r.rect(60, 60, 580, 90, { fill: colors.bgCard, rx: 12 });
    r.text(350, 85, 'The Second Law of Thermodynamics', {
      fill: colors.primary,
      fontSize: 15,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 110, 'Entropy in an isolated system never decreases.', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 130, 'Systems naturally evolve toward states with MORE possible arrangements.', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Formula
    r.rect(60, 165, 580, 55, { fill: colors.bgDark, rx: 12 });
    r.text(350, 185, 'Boltzmann Entropy Formula:', {
      fill: colors.success,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 205, 'S = k_B × ln(Ω)   where Ω = number of microstates', {
      fill: colors.textPrimary,
      fontSize: 13,
      textAnchor: 'middle',
    });

    // Prediction feedback
    if (this.prediction) {
      const wasCorrect = this.prediction === 'C';
      r.rect(60, 235, 580, 60, {
        fill: wasCorrect ? '#16a34a30' : '#dc262630',
        rx: 12,
      });
      r.text(350, 265, wasCorrect
        ? 'Correct! Separation is possible but astronomically improbable.'
        : 'Answer: Extremely improbable but not physically impossible!',
      {
        fill: wasCorrect ? colors.success : colors.danger,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
    }
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 35, 'The Twist: All Particles on One Side', {
      fill: colors.textPrimary,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 60, 'What if we started with ALL particles on the LEFT side?', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 80, 'How does this affect entropy and probability?', {
      fill: colors.accent,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 100, 500, 220, { fill: colors.bgCard, rx: 12 });
    r.text(350, 130, 'Select your prediction:', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(350, 25, 'Extreme Entropy Experiment', {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Particle simulation
    this.renderParticleSimulation(r, 100, 50, 500, 170);

    // Stats
    r.rect(100, 230, 250, 55, { fill: colors.bgCard, rx: 8 });
    r.text(225, 250, 'Entropy', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(225, 275, this.calculateEntropy().toFixed(3), {
      fill: colors.info,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(370, 230, 250, 55, { fill: colors.bgCard, rx: 8 });
    r.text(495, 250, 'Microstates', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(495, 275, this.calculateMicrostates().toExponential(2), {
      fill: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 310, `Particles: ${this.numParticles}  |  Left: ${this.leftCount}  |  Right: ${this.rightCount}`, {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(350, 35, 'The Power of Probability', {
      fill: colors.textPrimary,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(60, 60, 580, 85, { fill: colors.bgCard, rx: 12 });
    r.text(350, 85, 'Entropy connects to probability!', {
      fill: colors.accent,
      fontSize: 15,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 108, 'More particles = exponentially more microstates', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 128, 'Returning to original state becomes astronomically improbable!', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Numbers
    r.rect(60, 160, 580, 70, { fill: colors.bgDark, rx: 12 });
    r.text(350, 185, 'For 100 particles: 2^100 ≈ 10^30 possible arrangements', {
      fill: colors.textPrimary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 210, 'Probability of spontaneous separation: ~ 0.000000000000000000000000001%', {
      fill: colors.primary,
      fontSize: 11,
      textAnchor: 'middle',
    });

    if (this.twistPrediction) {
      const wasCorrect = this.twistPrediction === 'B';
      r.rect(60, 245, 580, 55, {
        fill: wasCorrect ? '#16a34a30' : '#dc262630',
        rx: 12,
      });
      r.text(350, 272, wasCorrect
        ? 'Correct! More particles = exponentially more microstates.'
        : 'More particles dramatically increases possible arrangements!',
      {
        fill: wasCorrect ? colors.success : colors.danger,
        fontSize: 13,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
    }
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(350, 30, 'Entropy in the Real World', {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const app = transferApps[this.selectedApp];

    r.rect(60, 55, 580, 250, { fill: colors.bgCard, rx: 12 });

    r.text(350, 85, app.title, {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 105, app.tagline, {
      fill: colors.primary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    r.text(350, 135, app.description, {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });

    // Physics connection
    r.rect(80, 155, 540, 50, { fill: colors.bgDark, rx: 8 });
    r.text(350, 175, 'Physics Connection:', {
      fill: colors.accent,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 193, app.connection, {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle',
    });

    // Stats
    app.stats.forEach((stat, i) => {
      const statX = 140 + i * 180;
      r.rect(statX - 60, 215, 120, 45, { fill: colors.bgDark, rx: 6 });
      r.text(statX, 233, stat.value, {
        fill: colors.primary,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
      r.text(statX, 252, stat.label, {
        fill: colors.textMuted,
        fontSize: 9,
        textAnchor: 'middle',
      });
    });

    const completed = this.completedApps.filter(Boolean).length;
    r.text(350, 290, `Explored ${completed}/${transferApps.length} applications`, {
      fill: colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle',
    });
  }

  private renderTest(r: CommandRenderer): void {
    if (this.testSubmitted) {
      this.renderTestResults(r);
      return;
    }

    const q = testQuestions[this.testQuestion];

    r.text(350, 30, `Question ${this.testQuestion + 1} of ${testQuestions.length}`, {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Scenario
    r.rect(60, 50, 580, 55, { fill: colors.bgCard, rx: 10 });
    r.text(70, 70, 'Scenario:', { fill: colors.primary, fontSize: 10, fontWeight: 'bold' });
    r.text(350, 88, q.scenario, {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });

    // Question
    r.text(350, 125, q.question, {
      fill: colors.textPrimary,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Progress dots
    const dotsStartX = 350 - (testQuestions.length * 12) / 2;
    testQuestions.forEach((_, i) => {
      const answered = this.testAnswers[i] !== null;
      const isCurrent = i === this.testQuestion;
      r.circle(dotsStartX + i * 12, 305, isCurrent ? 4 : 3, {
        fill: answered ? colors.success : isCurrent ? colors.primary : colors.border,
      });
    });
  }

  private renderTestResults(r: CommandRenderer): void {
    const score = this.calculateTestScore();
    const percentage = Math.round((score / testQuestions.length) * 100);

    r.text(350, 50, 'Test Complete!', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.circle(350, 150, 60, {
      fill: colors.bgCard,
      stroke: colors.success,
      strokeWidth: 4,
    });
    r.text(350, 145, `${score}/${testQuestions.length}`, {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 170, `${percentage}%`, {
      fill: colors.success,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    let message = '';
    if (percentage >= 90) message = 'Outstanding! You truly understand entropy!';
    else if (percentage >= 70) message = 'Great job! Solid grasp of thermodynamics.';
    else if (percentage >= 50) message = 'Good effort! Review the concepts for deeper understanding.';
    else message = "Keep practicing! Entropy takes time to master.";

    r.text(350, 235, message, {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderMastery(r: CommandRenderer): void {
    const score = this.calculateTestScore();
    const percentage = Math.round((score / testQuestions.length) * 100);

    r.text(350, 50, 'Congratulations!', {
      fill: colors.success,
      fontSize: 26,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 80, 'You understand why time has a direction!', {
      fill: colors.textPrimary,
      fontSize: 15,
      textAnchor: 'middle',
    });

    // Badge
    r.circle(350, 170, 55, {
      fill: colors.bgCard,
      stroke: colors.primary,
      strokeWidth: 3,
    });
    r.text(350, 165, 'ENTROPY', {
      fill: colors.primary,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 182, 'MASTER', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Stats
    r.rect(120, 250, 460, 65, { fill: colors.bgCard, rx: 12 });

    r.text(220, 273, 'Test Score', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(220, 295, `${percentage}%`, { fill: colors.success, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(350, 273, 'Apps', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(350, 295, `${this.completedApps.filter(Boolean).length}/4`, { fill: colors.accent, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(480, 273, 'Phases', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(480, 295, '10/10', { fill: colors.primary, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
  }

  // === UI STATE ===
  private renderUI(r: CommandRenderer): void {
    r.setHeader(this.gameTitle, this.phaseLabels[this.phase]);

    r.setProgress({
      id: 'phase_progress',
      current: this.phaseOrder.indexOf(this.phase) + 1,
      total: this.phaseOrder.length,
      labels: this.phaseOrder.map((p) => this.phaseLabels[p]),
      color: colors.primary,
    });

    r.setCoachMessage(coachMessages[this.phase]);

    const idx = this.phaseOrder.indexOf(this.phase);

    if (idx > 0) {
      r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });
    }

    switch (this.phase) {
      case 'hook':
        r.addButton({
          id: this.barrierRemoved ? 'reset' : 'remove_barrier',
          label: this.barrierRemoved ? 'Reset' : 'Remove Barrier',
          variant: 'primary',
        });
        r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        break;

      case 'predict':
        r.addButton({
          id: 'predict_A',
          label: 'Yes, if we wait long enough',
          variant: this.prediction === 'A' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_B',
          label: 'No, physically impossible',
          variant: this.prediction === 'B' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_C',
          label: 'Possible but extremely improbable',
          variant: this.prediction === 'C' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_D',
          label: 'Only at absolute zero',
          variant: this.prediction === 'D' ? 'primary' : 'secondary',
        });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'play':
        r.addButton({
          id: this.barrierRemoved ? 'reset' : 'remove_barrier',
          label: this.barrierRemoved ? 'Reset' : 'Remove Barrier',
          variant: 'primary',
        });
        r.addButton({
          id: this.isSimulating ? 'stop' : 'start',
          label: this.isSimulating ? 'Pause' : 'Play',
          variant: 'secondary',
        });
        r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Next: The Twist', variant: 'primary' });
        break;

      case 'twist_predict':
        r.addButton({
          id: 'twist_A',
          label: 'Same entropy increase',
          variant: this.twistPrediction === 'A' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_B',
          label: 'Much larger entropy increase',
          variant: this.twistPrediction === 'B' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_C',
          label: 'Smaller entropy increase',
          variant: this.twistPrediction === 'C' ? 'primary' : 'secondary',
        });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Try It', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({
          id: 'num_particles',
          label: 'Particles',
          value: this.numParticles,
          min: 10,
          max: 50,
        });
        r.addButton({
          id: this.barrierRemoved ? 'reset' : 'remove_barrier',
          label: this.barrierRemoved ? 'Reset' : 'Remove Barrier',
          variant: 'primary',
        });
        r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Life', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Computing', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Engines', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Cosmology', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.filter(Boolean).length >= 2) {
          r.addButton({ id: 'next', label: 'Take Quiz', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({
            id: 'test_next',
            label: 'Next',
            variant: 'ghost',
            disabled: this.testQuestion >= testQuestions.length - 1,
          });
          const q = testQuestions[this.testQuestion];
          for (let i = 0; i < q.options.length; i++) {
            r.addButton({
              id: `answer_${i}`,
              label: q.options[i].substring(0, 40),
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
        r.addButton({ id: 'next', label: 'Finish', variant: 'success' });
        break;
    }
  }

  // === REQUIRED BASEGAME METHODS ===
  getCurrentPhase(): string {
    return this.phase;
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      particles: this.particles,
      numParticles: this.numParticles,
      isSimulating: this.isSimulating,
      barrierRemoved: this.barrierRemoved,
      timeElapsed: this.timeElapsed,
      testQuestion: this.testQuestion,
      testAnswers: this.testAnswers,
      testSubmitted: this.testSubmitted,
      selectedApp: this.selectedApp,
      completedApps: this.completedApps,
    };
  }

  restoreState(state: Record<string, unknown>): void {
    this.phase = (state.phase as GamePhase) || 'hook';
    this.prediction = (state.prediction as string) || null;
    this.twistPrediction = (state.twistPrediction as string) || null;
    this.particles = (state.particles as Particle[]) || [];
    this.numParticles = (state.numParticles as number) || 20;
    this.isSimulating = (state.isSimulating as boolean) || false;
    this.barrierRemoved = (state.barrierRemoved as boolean) || false;
    this.timeElapsed = (state.timeElapsed as number) || 0;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];

    if (this.particles.length === 0) {
      this.initializeParticles(this.numParticles, true);
    }
  }
}

// === FACTORY FUNCTION ===
export function createEntropyGame(sessionId: string): EntropyGame {
  return new EntropyGame(sessionId);
}
