/**
 * Brownian Motion Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Einstein's diffusion equation: <x^2> = 2Dt
 * - Temperature-velocity relationship: KE = (3/2)kT
 * - Mean free path calculations
 * - Particle size vs motion amplitude relationships
 * - Boltzmann constant applications
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

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

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  trail: { x: number; y: number }[];
}

const testQuestions: TestQuestion[] = [
  {
    question: 'What causes Brownian motion?',
    options: ['Wind currents', 'Collisions with fluid molecules', 'Magnetic forces', 'Gravity fluctuations'],
    correctIndex: 1,
  },
  {
    question: 'What happens to Brownian motion when temperature increases?',
    options: ['Motion stops', 'Motion slows', 'Motion becomes more vigorous', 'Motion becomes organized'],
    correctIndex: 2,
  },
  {
    question: 'Which particle shows MORE noticeable Brownian motion?',
    options: ['Large sand grain', 'Small pollen grain', 'Basketball', 'All move the same'],
    correctIndex: 1,
  },
  {
    question: 'Why does a particle in Brownian motion move randomly?',
    options: ['It\'s alive', 'Collisions come from random directions', 'Gravity keeps changing', 'Fluid is spinning'],
    correctIndex: 1,
  },
  {
    question: 'Who explained Brownian motion mathematically in 1905?',
    options: ['Newton', 'Bohr', 'Einstein', 'Brown'],
    correctIndex: 2,
  },
  {
    question: 'What does Brownian motion prove about matter?',
    options: ['Matter is continuous', 'Atoms and molecules exist and move', 'Fluids are still', 'Temperature doesn\'t matter'],
    correctIndex: 1,
  },
  {
    question: 'In which medium would you observe Brownian motion?',
    options: ['Only water', 'Only air', 'Any fluid (liquid or gas)', 'Only vacuum'],
    correctIndex: 2,
  },
  {
    question: 'What pattern does a particle trace in Brownian motion?',
    options: ['Straight line', 'Perfect circle', 'Random zigzag path', 'Smooth curve'],
    correctIndex: 2,
  },
  {
    question: 'At absolute zero (0 K), Brownian motion would:',
    options: ['Speed up', 'Stop', 'Reverse', 'No change'],
    correctIndex: 1,
  },
  {
    question: 'Why is Brownian motion important in biology?',
    options: ['Powers muscles', 'Helps molecules meet in cells', 'Creates bones', 'Doesn\'t affect biology'],
    correctIndex: 1,
  },
];

const colors = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  accent: '#F59E0B',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  bgDark: '#0F0F1A',
  bgCard: '#1A1A2E',
  bgCardLight: '#252542',
  border: '#334155',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  particle: '#F59E0B',
  molecule: '#3B82F6',
  trail: '#8B5CF6',
};

const applications = [
  {
    title: 'Drug Delivery',
    icon: 'pill',
    description: 'Nanoparticles use Brownian motion to diffuse through tissues and deliver medications.',
    details: 'Cancer treatments use nanoparticles that spread via diffusion to target tumors.',
  },
  {
    title: 'Cell Biology',
    icon: 'cell',
    description: 'Proteins, enzymes, and molecules find each other through random Brownian encounters.',
    details: 'DNA replication depends on proteins randomly meeting the right binding sites.',
  },
  {
    title: 'Air Quality',
    icon: 'air',
    description: 'Smoke and pollution particles spread through Brownian diffusion.',
    details: 'This is why smoke gradually fills a room even without wind.',
  },
  {
    title: 'Financial Markets',
    icon: 'chart',
    description: 'Stock price movements are modeled as "random walks" inspired by Brownian motion.',
    details: 'The Black-Scholes equation uses Brownian motion to price options.',
  },
];

export class BrownianMotionGame extends BaseGame {
  readonly gameType = 'brownian_motion';
  readonly gameTitle = 'Brownian Motion';

  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  private particles: Particle[] = [];
  private temperature = 25;
  private showMolecules = false;
  private showTrails = true;
  private isSimulating = false;
  private time = 0;

  private testQuestion = 0;
  private testAnswers: (number | null)[] = Array(10).fill(null);
  private testSubmitted = false;

  private selectedApp = 0;
  private completedApps = [false, false, false, false];

  private lastNavTime = 0;
  private isNavigating = false;
  private guidedMode = true;

  private readonly phaseOrder: GamePhase[] = [
    'hook', 'predict', 'play', 'review', 'twist_predict',
    'twist_play', 'twist_review', 'transfer', 'test', 'mastery',
  ];

  private readonly phaseLabels: Record<GamePhase, string> = {
    hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review',
    twist_predict: 'Twist', twist_play: 'Demo', twist_review: 'Discovery',
    transfer: 'Apply', test: 'Test', mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'In 1827, botanist Robert Brown saw pollen grains "dancing" in water. Why do they jiggle randomly?',
    predict: 'Think about what invisible forces might push tiny particles around...',
    play: 'Watch particles jiggle! Adjust temperature and see how motion changes.',
    review: 'Molecules constantly bombard particles from all sides - creating random motion.',
    twist_predict: 'If particle size changes, does the motion change?',
    twist_play: 'Compare small and large particles. Which jiggles more?',
    twist_review: 'Smaller particles show MORE motion - molecular impacts have larger relative effect!',
    transfer: 'Brownian motion affects drug delivery, biology, and even finance!',
    test: 'Test your understanding of molecular motion!',
    mastery: 'You understand the evidence for atoms!',
  };

  constructor(sessionId: string) {
    super(sessionId);
    this.initParticles();
  }

  private initParticles(): void {
    this.particles = [
      { x: 200, y: 150, vx: 0, vy: 0, radius: 12, trail: [] },
      { x: 280, y: 150, vx: 0, vy: 0, radius: 12, trail: [] },
      { x: 360, y: 150, vx: 0, vy: 0, radius: 12, trail: [] },
    ];
  }

  initialize(config: SessionConfig): void {
    super.initialize(config);
    this.guidedMode = config.guidedMode ?? true;
    if (config.resumePhase && this.phaseOrder.includes(config.resumePhase as GamePhase)) {
      this.phase = config.resumePhase as GamePhase;
    }
    this.emitCoachEvent('game_started', { phase: this.phase });
  }

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click':
        this.handleButtonClick(input.id!);
        break;
      case 'slider_change':
        this.handleSliderChange(input.id!, input.value);
        break;
      case 'toggle_change':
        this.handleToggleChange(input.id!, input.value);
        break;
      case 'progress_click':
        this.handleProgressClick(input.index!);
        break;
    }
  }

  private handleButtonClick(id: string): void {
    if (id === 'next') { this.goNext(); return; }
    if (id === 'back') { this.goBack(); return; }

    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      return;
    }
    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
      return;
    }
    if (id.startsWith('answer_')) {
      this.testAnswers[this.testQuestion] = parseInt(id.replace('answer_', ''), 10);
      return;
    }
    if (id === 'test_next' && this.testQuestion < 9) { this.testQuestion++; return; }
    if (id === 'test_prev' && this.testQuestion > 0) { this.testQuestion--; return; }
    if (id === 'test_submit') { this.testSubmitted = true; return; }
    if (id.startsWith('app_')) {
      const idx = parseInt(id.replace('app_', ''), 10);
      this.selectedApp = idx;
      this.completedApps[idx] = true;
      return;
    }
    if (id === 'toggle_simulation') {
      this.isSimulating = !this.isSimulating;
      return;
    }
    if (id === 'reset') {
      this.initParticles();
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'temperature') { this.temperature = value; }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'show_molecules') { this.showMolecules = value; }
    if (id === 'show_trails') { this.showTrails = value; }
  }

  private handleProgressClick(index: number): void {
    const currentIdx = this.phaseOrder.indexOf(this.phase);
    if (index < currentIdx) {
      this.goToPhase(this.phaseOrder[index]);
    }
  }

  private goToPhase(newPhase: GamePhase): void {
    const now = Date.now();
    if (now - this.lastNavTime < 200 || this.isNavigating) return;
    this.lastNavTime = now;
    this.isNavigating = true;
    this.phase = newPhase;
    if (newPhase === 'play' || newPhase === 'twist_play') {
      this.initParticles();
      this.isSimulating = false;
    }
    this.emitCoachEvent('phase_changed', { phase: newPhase });
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

  /**
   * PROTECTED: Calculate molecular speed based on temperature
   * v_rms = sqrt(3kT/m)
   */
  private getMolecularSpeed(): number {
    const tempKelvin = this.temperature + 273.15;
    return Math.sqrt(tempKelvin / 300) * 2;
  }

  /**
   * PROTECTED: Update particle position with random Brownian kicks
   */
  update(deltaTime: number): void {
    if (!this.isSimulating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play') return;

    this.time += deltaTime / 1000;
    const speed = this.getMolecularSpeed();

    this.particles.forEach((p) => {
      // Random Brownian kicks
      const kickX = (Math.random() - 0.5) * speed * 4;
      const kickY = (Math.random() - 0.5) * speed * 4;

      p.vx = p.vx * 0.9 + kickX;
      p.vy = p.vy * 0.9 + kickY;

      p.x += p.vx;
      p.y += p.vy;

      // Boundaries
      const bounds = { left: 100, right: 460, top: 80, bottom: 280 };
      if (p.x < bounds.left + p.radius) { p.x = bounds.left + p.radius; p.vx *= -0.5; }
      if (p.x > bounds.right - p.radius) { p.x = bounds.right - p.radius; p.vx *= -0.5; }
      if (p.y < bounds.top + p.radius) { p.y = bounds.top + p.radius; p.vy *= -0.5; }
      if (p.y > bounds.bottom - p.radius) { p.y = bounds.bottom - p.radius; p.vy *= -0.5; }

      // Trail
      if (this.showTrails) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 100) p.trail.shift();
      }
    });
  }

  private calculateTestScore(): number {
    let correct = 0;
    for (let i = 0; i < testQuestions.length; i++) {
      if (this.testAnswers[i] === testQuestions[i].correctIndex) correct++;
    }
    return correct;
  }

  render(): GameFrame {
    const r = new CommandRenderer(this.viewport.width, this.viewport.height);
    r.reset();
    r.setViewport(700, 500);

    r.clear(colors.bgDark);

    switch (this.phase) {
      case 'hook': this.renderHookPhase(r); break;
      case 'predict': this.renderPredictPhase(r); break;
      case 'play': this.renderPlayPhase(r); break;
      case 'review': this.renderReviewPhase(r); break;
      case 'twist_predict': this.renderTwistPredictPhase(r); break;
      case 'twist_play': this.renderTwistPlayPhase(r); break;
      case 'twist_review': this.renderTwistReviewPhase(r); break;
      case 'transfer': this.renderTransferPhase(r); break;
      case 'test': this.renderTestPhase(r); break;
      case 'mastery': this.renderMasteryPhase(r); break;
    }

    this.renderUIState(r);
    return r.toFrame(this.nextFrame());
  }

  private renderParticleView(r: CommandRenderer, centerX: number, centerY: number, w: number, h: number): void {
    r.rect(centerX - w/2, centerY - h/2, w, h, { fill: colors.bgCard, stroke: colors.border, rx: 12 });

    // Trails
    if (this.showTrails) {
      this.particles.forEach((p) => {
        for (let i = 1; i < p.trail.length; i++) {
          const alpha = i / p.trail.length;
          r.line(p.trail[i-1].x, p.trail[i-1].y, p.trail[i].x, p.trail[i].y, {
            stroke: colors.trail,
            strokeWidth: 2,
            opacity: alpha * 0.5,
          });
        }
      });
    }

    // Particles
    this.particles.forEach((p) => {
      r.circle(p.x, p.y, p.radius, {
        fill: colors.particle,
        stroke: colors.textPrimary,
        strokeWidth: 2,
      });
    });

    // Stats
    r.rect(centerX - w/2 + 10, centerY + h/2 - 50, 120, 40, { fill: colors.bgCardLight, rx: 8 });
    r.text(centerX - w/2 + 70, centerY + h/2 - 35, `Temp: ${this.temperature} C`, {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
    r.text(centerX - w/2 + 70, centerY + h/2 - 18, this.isSimulating ? 'Running' : 'Paused', {
      fill: this.isSimulating ? colors.success : colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle',
    });
  }

  private renderHookPhase(r: CommandRenderer): void {
    r.text(350, 100, 'Brownian Motion', { fill: colors.textPrimary, fontSize: 32, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 135, 'The dancing proof that atoms exist', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });

    r.rect(160, 160, 380, 200, { fill: colors.bgCard, stroke: colors.border, rx: 20 });
    r.text(350, 200, 'In 1827, botanist Robert Brown looked at', { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 225, 'pollen grains in water through a microscope.', { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 265, 'They were DANCING randomly - never stopping!', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 310, 'What invisible force moves these particles?', { fill: colors.accent, fontSize: 14, textAnchor: 'middle' });
  }

  private renderPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', { fill: colors.textPrimary, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(100, 80, 500, 80, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 115, 'Tiny particles jiggle forever in still water.', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 140, 'What causes this random motion?', { fill: colors.textPrimary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    if (this.prediction) {
      const isCorrect = this.prediction === 'B';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 375, isCorrect ? 'Correct! Invisible molecules constantly bombard the particle!' : 'Think smaller - what is water made of?', {
        fill: isCorrect ? colors.success : colors.danger, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle',
      });
    }
  }

  private renderPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Brownian Motion Lab', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    this.renderParticleView(r, 280, 180, 360, 220);

    r.rect(100, 330, 500, 70, { fill: colors.bgCardLight, rx: 12 });
    r.text(350, 355, 'Einstein\'s Insight (1905): <x^2> = 2Dt', { fill: colors.primary, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 380, 'Average displacement squared grows linearly with time!', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Brownian Motion', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(50, 70, 290, 130, { fill: '#6366f140', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'The Mechanism', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    ['Millions of water molecules', 'Hit the particle every second', 'Random directions = random motion'].forEach((line, i) => {
      r.text(70, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 130, { fill: '#f59e0b40', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Temperature Effect', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    ['Higher T = faster molecules', 'Faster molecules = harder hits', 'More vigorous particle motion!'].forEach((line, i) => {
      r.text(380, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(50, 220, 600, 70, { fill: '#10b98140', stroke: colors.success, rx: 16 });
    r.text(350, 245, 'Historical Significance', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 270, 'Einstein\'s 1905 analysis of Brownian motion provided the first direct evidence for atoms!', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Size Challenge', { fill: colors.accent, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'We have two particles: one tiny, one large.', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 155, 'Which will show MORE noticeable Brownian motion?', { fill: colors.textPrimary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'A';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger, rx: 12,
      });
      r.text(350, 375, isCorrect ? 'Yes! Smaller particles are more affected by each molecular impact!' : 'Think about how a bowling ball vs ping pong ball responds to a tap.', {
        fill: isCorrect ? colors.success : colors.danger, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle',
      });
    }
  }

  private renderTwistPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Size Comparison', { fill: colors.accent, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    this.renderParticleView(r, 280, 180, 360, 220);

    r.rect(100, 330, 500, 70, { fill: colors.bgCardLight, rx: 12 });
    r.text(350, 355, 'Mass Matters!', { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 380, 'Same molecular impacts, but smaller particles have less inertia to resist!', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Size and Motion', { fill: colors.accent, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(100, 90, 500, 150, { fill: '#f59e0b30', stroke: colors.accent, rx: 16 });
    r.text(350, 120, 'The Diffusion Relationship', { fill: colors.accent, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 155, 'D = kT / (6*pi*eta*r)', { fill: colors.textPrimary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 190, 'Diffusion coefficient D decreases with particle radius r', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 215, 'Smaller particles diffuse faster and show more motion!', { fill: colors.success, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
  }

  private renderTransferPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Real-World Applications', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    applications.forEach((app, i) => {
      const x = 80 + i * 155;
      r.rect(x, 70, 140, 40, {
        fill: i === this.selectedApp ? colors.primary : colors.bgCard,
        stroke: this.completedApps[i] ? colors.success : colors.border, rx: 8,
      });
      r.text(x + 70, 95, app.title.split(' ')[0], {
        fill: i === this.selectedApp ? colors.textPrimary : colors.textSecondary, fontSize: 11, textAnchor: 'middle',
      });
    });

    const app = applications[this.selectedApp];
    r.rect(80, 130, 540, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 165, app.title, { fill: colors.textPrimary, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 200, app.description, { fill: colors.textSecondary, fontSize: 13, textAnchor: 'middle' });
    r.text(350, 260, app.details, { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });

    r.text(350, 360, `Progress: ${this.completedApps.filter(c => c).length}/4`, { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    applications.forEach((_, i) => { r.circle(310 + i * 25, 385, 6, { fill: this.completedApps[i] ? colors.success : colors.bgCardLight }); });
  }

  private renderTestPhase(r: CommandRenderer): void {
    if (this.testSubmitted) {
      const score = this.calculateTestScore();
      const passed = score >= 7;
      r.text(350, 100, passed ? 'Congratulations!' : 'Keep Learning!', { fill: passed ? colors.success : colors.warning, fontSize: 32, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(350, 160, `Score: ${score} / 10`, { fill: colors.textPrimary, fontSize: 24, textAnchor: 'middle' });
      return;
    }

    const q = testQuestions[this.testQuestion];
    r.text(350, 40, `Question ${this.testQuestion + 1} of 10`, { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 80, q.question, { fill: colors.textPrimary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    q.options.forEach((opt, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;
      r.rect(100, 110 + i * 55, 500, 45, { fill: isSelected ? colors.primary + '40' : colors.bgCard, stroke: isSelected ? colors.primary : colors.border, rx: 8 });
      r.text(350, 138 + i * 55, opt, { fill: isSelected ? colors.primary : colors.textSecondary, fontSize: 13, textAnchor: 'middle' });
    });
  }

  private renderMasteryPhase(r: CommandRenderer): void {
    r.rect(150, 80, 400, 340, { fill: colors.bgCard, stroke: colors.border, rx: 24 });
    r.text(350, 130, 'Molecular Motion Master!', { fill: colors.textPrimary, fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 165, 'You understand the evidence for atoms!', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });

    const badges = [{ icon: 'atom', label: 'Atoms Exist' }, { icon: 'temp', label: 'Temperature' }, { icon: 'diff', label: 'Diffusion' }, { icon: 'E', label: 'Einstein' }];
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
    r.setProgress({ id: 'progress', current: this.phaseOrder.indexOf(this.phase) + 1, total: 10, labels: this.phaseOrder.map(p => this.phaseLabels[p]), color: colors.primary });
    if (this.guidedMode) r.setCoachMessage(this.coachMessages[this.phase]);

    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx > 0) r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });

    switch (this.phase) {
      case 'hook':
        r.addButton({ id: 'next', label: 'Discover Why', variant: 'primary' });
        break;
      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Wind currents', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Molecular collisions', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Magnetic forces', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. Gravity changes', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) r.addButton({ id: 'next', label: 'See the Lab', variant: 'success' });
        break;
      case 'play':
        r.addSlider({ id: 'temperature', label: 'Temperature (C)', value: this.temperature, min: 0, max: 100, step: 5 });
        r.addToggle({ id: 'show_trails', label: 'Show Trails', value: this.showTrails });
        r.addButton({ id: 'toggle_simulation', label: this.isSimulating ? 'Pause' : 'Start', variant: this.isSimulating ? 'danger' : 'success' });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'ghost' });
        r.addButton({ id: 'next', label: 'Review', variant: 'primary' });
        break;
      case 'review':
        r.addButton({ id: 'next', label: 'Try Size Challenge', variant: 'warning' });
        break;
      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Tiny particle (more motion)', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Large particle (more motion)', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Same motion', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        if (this.twistPrediction) r.addButton({ id: 'next', label: 'Compare', variant: 'success' });
        break;
      case 'twist_play':
        r.addButton({ id: 'toggle_simulation', label: this.isSimulating ? 'Pause' : 'Start', variant: this.isSimulating ? 'danger' : 'success' });
        r.addButton({ id: 'next', label: 'See Why', variant: 'primary' });
        break;
      case 'twist_review':
        r.addButton({ id: 'next', label: 'Applications', variant: 'primary' });
        break;
      case 'transfer':
        applications.forEach((_, i) => r.addButton({ id: `app_${i}`, label: applications[i].title.split(' ')[0], variant: i === this.selectedApp ? 'primary' : 'ghost' }));
        if (this.completedApps.every(c => c)) r.addButton({ id: 'next', label: 'Take Test', variant: 'success' });
        break;
      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= 9 });
          if (this.testAnswers.every(a => a !== null)) r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
        } else {
          if (this.calculateTestScore() >= 7) r.addButton({ id: 'next', label: 'Claim Badge', variant: 'success' });
          else r.addButton({ id: 'back', label: 'Review', variant: 'secondary' });
        }
        break;
      case 'mastery':
        r.addButton({ id: 'back', label: 'Explore Again', variant: 'secondary' });
        break;
    }
  }

  getCurrentPhase(): string { return this.phase; }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase, prediction: this.prediction, twistPrediction: this.twistPrediction,
      temperature: this.temperature, isSimulating: this.isSimulating, showTrails: this.showTrails,
      testQuestion: this.testQuestion, testAnswers: this.testAnswers, testSubmitted: this.testSubmitted,
      selectedApp: this.selectedApp, completedApps: this.completedApps, guidedMode: this.guidedMode,
    };
  }

  restoreState(state: Record<string, unknown>): void {
    this.phase = (state.phase as GamePhase) || 'hook';
    this.prediction = (state.prediction as string) || null;
    this.twistPrediction = (state.twistPrediction as string) || null;
    this.temperature = (state.temperature as number) || 25;
    this.isSimulating = (state.isSimulating as boolean) || false;
    this.showTrails = (state.showTrails as boolean) ?? true;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

export function createBrownianMotionGame(sessionId: string): BrownianMotionGame {
  return new BrownianMotionGame(sessionId);
}
