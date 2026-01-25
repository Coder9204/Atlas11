/**
 * Inelastic Collisions Game - Server-side Implementation
 *
 * Physics:
 * - Momentum is ALWAYS conserved: p = mv
 * - Kinetic energy is NOT conserved in inelastic collisions
 * - Impulse-momentum theorem: F = Δp/Δt
 * - Longer collision time = lower peak force
 *
 * Key concept: Crumple zones save lives by extending collision time
 */

import { BaseGame } from '../../types/GameInstance.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

interface TestQuestion {
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface TransferApp {
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  stats: { value: string; label: string }[];
  color: string;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PHASES: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const colors = {
  bg: '#0a0f1a',
  text: '#ffffff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  primary: '#ef4444',
  primaryDark: '#dc2626',
  secondary: '#f97316',
  accent: '#eab308',
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  panel: '#1e293b',
  panelDark: '#0f172a',
  border: '#334155',
  carBody: '#3b82f6',
  wall: '#475569',
  crumple: '#ef4444',
  force: '#22c55e',
};

export class InelasticCollisionsGame extends BaseGame {
  readonly gameType = 'inelastic_collisions';
  readonly gameTitle = 'Inelastic Collisions';

  private phase: Phase = 'hook';
  private frameCount = 0;
  private width = 700;
  private height = 350;

  // Car crash simulation
  private carPosition = 0;
  private crashProgress = 0;
  private isAnimating = false;
  private hasCrumpleZone = true;
  private showForces = true;
  private impactSpeed = 30;

  // Prediction state
  private selectedPrediction: string | null = null;
  private showPredictionFeedback = false;
  private twistPrediction: string | null = null;
  private showTwistFeedback = false;

  // Transfer state
  private activeAppTab = 0;
  private completedApps = new Set<number>();

  // Test state
  private testAnswers: number[] = Array(10).fill(-1);
  private showTestResults = false;

  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "A car at 60 mph crashes into a barrier and comes to a complete stop with significant front damage.",
      question: "In this inelastic collision, what happens to kinetic energy?",
      options: [
        "It's conserved and transfers to barrier",
        "Converted to heat, sound, and deformation",
        "It's destroyed according to collision laws",
        "It doubles due to impact force"
      ],
      correctIndex: 1,
      explanation: "In inelastic collisions, KE converts to heat, sound, and deformation energy. Total energy is conserved, just not as KE."
    },
    {
      scenario: "Two identical trucks collide head-on. Investigators use momentum to reconstruct the crash.",
      question: "Why use momentum even though energy isn't conserved?",
      options: [
        "Momentum only conserved in elastic collisions",
        "Momentum is ALWAYS conserved in collisions",
        "Only applies to slow objects",
        "Different formula for inelastic collisions"
      ],
      correctIndex: 1,
      explanation: "Momentum (p = mv) is ALWAYS conserved - no external force acts. True for all collision types."
    },
    {
      scenario: "A moving train car couples with a stationary one. They move together as one unit.",
      question: "This is an example of what type of collision?",
      options: [
        "Elastic - objects bounce apart",
        "Perfectly inelastic - objects stick together",
        "Super-elastic - energy gained",
        "Non-physical - violates physics"
      ],
      correctIndex: 1,
      explanation: "Perfectly inelastic = objects stick together, losing maximum KE while conserving momentum."
    },
    {
      scenario: "An engineer makes a crumple zone 50cm longer than the previous model.",
      question: "How does this change affect crash safety?",
      options: [
        "No effect - same stopping time",
        "Extends collision time, reducing peak force",
        "Makes car heavier, increasing momentum",
        "Reduces momentum during driving"
      ],
      correctIndex: 1,
      explanation: "From F = Δp/Δt: if Δp fixed, increasing Δt decreases F. Longer crumple = more time = lower force."
    },
    {
      scenario: "Car A stops in 0.1s, Car B stops in 0.2s from the same speed. Equal mass.",
      question: "How do average forces on passengers compare?",
      options: [
        "Car A passengers experience 2× force",
        "Car B passengers experience 2× force",
        "Both experience same force",
        "Cannot determine without speed"
      ],
      correctIndex: 0,
      explanation: "F = Δp/Δt: same Δp, half the time means double the force. Car A stops faster = 2× force."
    },
    {
      scenario: "J = FΔt = Δp describes impulse-momentum theorem.",
      question: "What does this tell us about safety design?",
      options: [
        "Impulse should be maximized",
        "Extending time reduces force for given Δp",
        "Force and time are independent",
        "Only applies to elastic collisions"
      ],
      correctIndex: 1,
      explanation: "For fixed Δp, increasing Δt decreases F. This is why crumple zones, airbags, and helmets work."
    },
    {
      scenario: "An airbag inflates in 30ms, then slowly deflates as the head pushes into it.",
      question: "How does the airbag protect the passenger?",
      options: [
        "Pushing passenger back into seat",
        "Increasing stopping distance and time for head",
        "Making passenger lighter during impact",
        "Absorbing all KE instantly"
      ],
      correctIndex: 1,
      explanation: "Stopping distance goes from ~5cm (dashboard) to ~30cm (airbag) = 6× more time, ~6× less force."
    },
    {
      scenario: "Two equal mass cars: Car A at 40 mph, Car B stationary. They stick together.",
      question: "What is the speed of combined wreckage?",
      options: [
        "40 mph - Car A's momentum conserved",
        "20 mph - momentum shared by double mass",
        "0 mph - they cancel out",
        "80 mph - kinetic energy doubles"
      ],
      correctIndex: 1,
      explanation: "m(40) + m(0) = 2m(v'). Solve: v' = 20 mph. Double mass, half velocity conserves momentum."
    },
    {
      scenario: "Clay ball sticks to wall. Rubber ball of equal mass bounces back at same speed.",
      question: "Which ball experiences greater average force?",
      options: [
        "Clay ball - inelastic has more force",
        "Rubber ball - greater momentum change",
        "Equal force - same initial momentum",
        "Clay ball - it sticks"
      ],
      correctIndex: 1,
      explanation: "Rubber: Δp = 2mv (reverses). Clay: Δp = mv (stops). Greater Δp = greater force."
    },
    {
      scenario: "Helmet manual says replace after any significant impact, even with no visible damage.",
      question: "Why must helmets be replaced after impact?",
      options: [
        "UV weakens outer shell",
        "Foam crushes permanently, can't absorb again",
        "Chin strap stretches",
        "Legal liability requires it"
      ],
      correctIndex: 1,
      explanation: "EPS foam crushes permanently to absorb energy. Once crushed, it can't protect again."
    }
  ];

  private readonly transferApps: TransferApp[] = [
    {
      title: "Automotive Crumple Zones",
      short: "Crumple",
      tagline: "Sacrificing the car to save people",
      description: "Vehicles have precisely designed crumple zones that absorb collision energy through controlled deformation.",
      connection: "Crumple zones extend collision time from ~30ms to ~150ms, reducing peak force by 5×.",
      stats: [
        { value: "5×", label: "Force reduction" },
        { value: "~150ms", label: "Collision time" },
        { value: "40%", label: "Fewer fatalities" }
      ],
      color: colors.error
    },
    {
      title: "Airbag Systems",
      short: "Airbags",
      tagline: "Inflate in 30ms, cushion for 300ms",
      description: "Airbags deploy instantly then slowly deflate to cushion occupants over extended time.",
      connection: "Increases head stopping distance from ~5cm to ~30cm, extending time by 6×.",
      stats: [
        { value: "30ms", label: "Inflation time" },
        { value: "6×", label: "Distance increase" },
        { value: "30%", label: "Fewer deaths" }
      ],
      color: colors.secondary
    },
    {
      title: "Helmet Engineering",
      short: "Helmets",
      tagline: "One-time protection through deformation",
      description: "Helmets use crushable EPS foam that permanently deforms to absorb impact energy.",
      connection: "Foam crushing is perfectly inelastic - KE converts to deformation energy.",
      stats: [
        { value: "~85%", label: "Energy absorbed" },
        { value: "~10ms", label: "Time increase" },
        { value: "37%", label: "Fewer head injuries" }
      ],
      color: colors.accent
    },
    {
      title: "Packaging & Shipping",
      short: "Packaging",
      tagline: "Cushioning products with physics",
      description: "Shipping packaging uses the same principles to protect fragile items during drops.",
      connection: "Foam and air cushions extend deceleration time, reducing peak forces below damage threshold.",
      stats: [
        { value: "~95%", label: "Force reduction" },
        { value: "1-2m", label: "Drop protection" },
        { value: "$3B+", label: "Damage avoided" }
      ],
      color: colors.success
    }
  ];

  constructor(sessionId: string, _config?: SessionConfig) {
    super(sessionId);
    if (_config?.viewport) {
      this.width = _config.viewport.width || 700;
      this.height = _config.viewport.height || 350;
    }
  }

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click':
        this.handleButtonClick(input.id!);
        break;
      case 'slider_change':
        this.handleSliderChange(input.id!, input.value ?? 0);
        break;
      case 'toggle_change':
        this.handleToggleChange(input.id!, input.value as boolean);
        break;
    }
  }

  update(_deltaTime: number): void {
    // Update crash animation
    if (this.isAnimating) {
      if (this.carPosition < 100) {
        this.carPosition += 5;
      } else {
        const crumpleRate = this.hasCrumpleZone ? 5 : 20;
        this.crashProgress += crumpleRate;
        if (this.crashProgress >= 100) {
          this.crashProgress = 100;
          this.isAnimating = false;
        }
      }
    }
  }

  getCurrentPhase(): string {
    return this.phase;
  }

  private handleButtonClick(id: string): void {
    if (id === 'next' || id === 'continue') {
      this.advancePhase();
      return;
    }

    if (id === 'back_to_start') {
      this.phase = 'hook';
      this.resetGameState();
      return;
    }

    if (id === 'retry_test') {
      this.testAnswers = Array(10).fill(-1);
      this.showTestResults = false;
      this.phase = 'review';
      return;
    }

    // Predictions
    if (id.startsWith('pred_')) {
      const prediction = id.replace('pred_', '');
      this.selectedPrediction = prediction;
      this.showPredictionFeedback = true;
      return;
    }

    if (id.startsWith('twist_pred_')) {
      const prediction = id.replace('twist_pred_', '');
      this.twistPrediction = prediction;
      this.showTwistFeedback = true;
      return;
    }

    // Simulation controls
    if (id === 'start_crash') {
      this.carPosition = 0;
      this.crashProgress = 0;
      this.isAnimating = true;
      return;
    }

    if (id === 'reset_crash') {
      this.carPosition = 0;
      this.crashProgress = 0;
      this.isAnimating = false;
      return;
    }

    if (id === 'toggle_crumple') {
      this.hasCrumpleZone = !this.hasCrumpleZone;
      this.carPosition = 0;
      this.crashProgress = 0;
      return;
    }

    // Transfer apps
    if (id.startsWith('app_tab_')) {
      this.activeAppTab = parseInt(id.replace('app_tab_', ''));
      return;
    }

    if (id.startsWith('complete_app_')) {
      const appIndex = parseInt(id.replace('complete_app_', ''));
      this.completedApps.add(appIndex);
      return;
    }

    // Test answers
    if (id.startsWith('test_q')) {
      const parts = id.replace('test_', '').split('_a');
      const qIndex = parseInt(parts[0].replace('q', ''));
      const aIndex = parseInt(parts[1]);
      this.testAnswers[qIndex] = aIndex;
      return;
    }

    if (id === 'submit_test') {
      this.showTestResults = true;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'impact_speed') {
      this.impactSpeed = value;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'show_forces') {
      this.showForces = value;
    }
  }

  private advancePhase(): void {
    const currentIndex = PHASES.indexOf(this.phase);
    if (currentIndex < PHASES.length - 1) {
      this.phase = PHASES[currentIndex + 1];
    }
  }

  private resetGameState(): void {
    this.carPosition = 0;
    this.crashProgress = 0;
    this.isAnimating = false;
    this.hasCrumpleZone = true;
    this.showForces = true;
    this.impactSpeed = 30;
    this.selectedPrediction = null;
    this.showPredictionFeedback = false;
    this.twistPrediction = null;
    this.showTwistFeedback = false;
    this.activeAppTab = 0;
    this.completedApps.clear();
    this.testAnswers = Array(10).fill(-1);
    this.showTestResults = false;
  }

  private getTestScore(): number {
    return this.testAnswers.reduce((score, answer, index) => {
      return score + (answer === this.testQuestions[index].correctIndex ? 1 : 0);
    }, 0);
  }

  render(): GameFrame {
    this.update(0.05);

    const r = new CommandRenderer(this.width, this.height);
    r.clear(colors.bg);

    const phaseIndex = PHASES.indexOf(this.phase);
    r.setProgress({ id: 'phase_progress', current: phaseIndex + 1, total: PHASES.length });

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

    this.frameCount++;
    return r.toFrame(this.frameCount);
  }

  private renderHook(r: CommandRenderer): void {
    r.setHeader('Inelastic Collisions', 'Why cars are designed to crumple');

    const cx = this.width / 2;

    // Animated car and wall scene
    const carX = 100 + (this.frameCount % 100);
    const wallX = 450;

    // Road
    r.rect(50, 180, this.width - 100, 40, { fill: '#374151' });
    r.rect(50, 195, this.width - 100, 4, { fill: colors.accent });

    // Wall
    r.rect(wallX, 100, 40, 120, { fill: colors.wall });
    for (let i = 0; i < 3; i++) {
      r.line(wallX + 5, 110 + i * 35, wallX + 35, 110 + i * 35, { stroke: colors.border, strokeWidth: 2 });
    }

    // Car
    r.rect(carX, 140, 80, 35, { fill: colors.carBody, rx: 5 });
    r.rect(carX + 15, 125, 50, 20, { fill: '#60a5fa', rx: 3 });
    r.circle(carX + 20, 175, 12, { fill: '#1f2937' });
    r.circle(carX + 60, 175, 12, { fill: '#1f2937' });

    // Description
    r.text(cx, 250, 'Modern cars are engineered to CRUMPLE on impact.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle'
    });
    r.text(cx, 275, 'This isn\'t a design flaw - it\'s a life-saving feature!', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.setCoachMessage('Understanding inelastic collisions explains why crumpling saves lives. Let\'s explore!');
    r.addButton({ id: 'next', label: 'Discover the Physics', variant: 'primary' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.setHeader('Make Your Prediction', 'Which car is safer?');

    r.text(this.width / 2, 50, 'Two cars crash into a wall at the same speed.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle'
    });
    r.text(this.width / 2, 70, 'Car A has a crumple zone (stops in 0.15s). Car B is rigid (stops in 0.03s).', {
      fill: colors.primary,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const options = [
      { id: 'A', text: 'Car A is safer - longer stopping time means less force' },
      { id: 'B', text: 'Car B is safer - rigid structure protects passengers' },
      { id: 'C', text: 'Both equally safe - same momentum in both crashes' },
      { id: 'D', text: 'Car B is safer - stops faster, less damage overall' }
    ];

    const startY = 95;
    options.forEach((opt, i) => {
      const y = startY + i * 42;
      const isSelected = this.selectedPrediction === opt.id;
      const isCorrect = opt.id === 'A';

      let bgColor = colors.panel;
      if (this.showPredictionFeedback) {
        if (isSelected && isCorrect) bgColor = '#166534';
        else if (isSelected && !isCorrect) bgColor = '#991b1b';
        else if (isCorrect) bgColor = '#166534';
      }

      r.rect(50, y, this.width - 100, 36, { fill: bgColor, rx: 8 });
      r.text(70, y + 22, `${opt.id}.`, { fill: colors.text, fontSize: 13, fontWeight: 'bold' });
      r.text(95, y + 22, opt.text, { fill: colors.text, fontSize: 11 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `pred_${opt.id}`, label: opt.id, variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.rect(50, 275, this.width - 100, 55, { fill: colors.panelDark, rx: 8 });
      r.text(this.width / 2, 295, 'From F = Δp/Δt: same Δp, longer Δt = less force!', {
        fill: colors.success,
        fontSize: 13,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });
      r.text(this.width / 2, 315, 'Crumple zones extend collision time by 5×, reducing force by 5×.', {
        fill: colors.textSecondary,
        fontSize: 11,
        textAnchor: 'middle'
      });
      r.addButton({ id: 'next', label: 'See the Crash Test', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.setHeader('Crash Test Lab', 'Compare crumple zone vs. rigid car');

    const roadY = 200;
    const wallX = 480;

    // Road
    r.rect(30, roadY, this.width - 60, 35, { fill: '#374151' });

    // Wall
    r.rect(wallX, roadY - 80, 30, 115, { fill: colors.wall });

    // Car
    const carX = 80 + (this.carPosition * 3);
    const crumpleAmount = this.hasCrumpleZone ? this.crashProgress * 0.3 : this.crashProgress * 0.05;

    // Car body (crumples if no crumple zone and crashed)
    const carWidth = 70 - crumpleAmount;
    r.rect(carX, roadY - 55, carWidth, 35, {
      fill: this.hasCrumpleZone ? colors.carBody : colors.error,
      rx: 5
    });

    // Crumple zone visualization
    if (this.hasCrumpleZone && this.crashProgress > 0) {
      r.rect(carX + carWidth - 5, roadY - 55, 5 + crumpleAmount, 35, {
        fill: colors.crumple,
        rx: 2
      });
    }

    // Roof
    r.rect(carX + 15, roadY - 70, 35, 20, { fill: '#60a5fa', rx: 3 });

    // Wheels
    r.circle(carX + 15, roadY - 5, 10, { fill: '#1f2937' });
    r.circle(carX + 55, roadY - 5, 10, { fill: '#1f2937' });

    // Force arrows
    if (this.showForces && this.crashProgress > 0) {
      const forceLen = this.hasCrumpleZone ? 30 : 60;
      r.line(carX + 35, roadY - 35, carX + 35 - forceLen, roadY - 35, { stroke: colors.force, strokeWidth: 3 });
      r.polygon([
        [carX + 30 - forceLen, roadY - 35],
        [carX + 40 - forceLen, roadY - 30],
        [carX + 40 - forceLen, roadY - 40]
      ], { fill: colors.force });

      const forceLabel = this.hasCrumpleZone ? 'Lower Force' : 'HIGH FORCE!';
      r.text(carX + 35 - forceLen / 2, roadY - 50, forceLabel, {
        fill: this.hasCrumpleZone ? colors.success : colors.error,
        fontSize: 10,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });
    }

    // Stats panel
    r.rect(30, 50, 200, 90, { fill: colors.panel, rx: 10 });
    r.text(45, 75, this.hasCrumpleZone ? 'With Crumple Zone' : 'Rigid Car', {
      fill: this.hasCrumpleZone ? colors.success : colors.error,
      fontSize: 12,
      fontWeight: 'bold'
    });
    r.text(45, 95, `Collision time: ${this.hasCrumpleZone ? '~150ms' : '~30ms'}`, { fill: colors.textSecondary, fontSize: 10 });
    r.text(45, 115, `Force multiplier: ${this.hasCrumpleZone ? '1×' : '5×'}`, { fill: colors.textSecondary, fontSize: 10 });
    r.text(45, 135, `Crash progress: ${this.crashProgress.toFixed(0)}%`, { fill: colors.textSecondary, fontSize: 10 });

    // Physics formula
    r.rect(this.width - 230, 50, 200, 50, { fill: colors.panelDark, rx: 8 });
    r.text(this.width - 130, 72, 'F = Δp / Δt', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(this.width - 130, 90, 'Longer time = Less force', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });

    // Controls
    r.addButton({ id: 'toggle_crumple', label: this.hasCrumpleZone ? 'Switch to Rigid' : 'Add Crumple Zone', variant: 'secondary' });
    r.addToggle({ id: 'show_forces', label: 'Show Forces', value: this.showForces });

    if (!this.isAnimating) {
      r.addButton({ id: 'start_crash', label: 'Crash Test!', variant: 'primary' });
    } else {
      r.addButton({ id: 'reset_crash', label: 'Reset', variant: 'secondary' });
    }

    r.addButton({ id: 'next', label: 'Continue', variant: 'success' });

    r.setCoachMessage('Try both car types to see how crumple zones reduce the force on passengers!');
  }

  private renderReview(r: CommandRenderer): void {
    r.setHeader('The Physics Explained', 'Impulse-momentum theorem');

    const cx = this.width / 2;

    // Main formula
    r.rect(100, 45, this.width - 200, 55, { fill: colors.panelDark, rx: 10 });
    r.text(cx, 68, 'Impulse = Change in Momentum', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(cx, 90, 'J = FΔt = Δp = m(v₂ - v₁)', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Key insights
    const insights = [
      { title: 'Momentum Conserved', desc: 'Always! Even in inelastic collisions.' },
      { title: 'KE NOT Conserved', desc: 'Energy converts to heat, sound, deformation.' },
      { title: 'F = Δp/Δt', desc: 'More time = less force for same Δp.' }
    ];

    const cardW = (this.width - 80) / 3;
    insights.forEach((item, i) => {
      const x = 30 + i * (cardW + 10);
      r.rect(x, 115, cardW, 75, { fill: colors.panel, rx: 8 });
      r.text(x + cardW / 2, 140, item.title, { fill: colors.primary, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x + cardW / 2, 165, item.desc, { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });
    });

    // Comparison
    r.rect(50, 205, this.width - 100, 70, { fill: colors.panel, rx: 10 });
    r.text(cx, 225, 'Why Crumple Zones Work:', { fill: colors.text, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(cx, 250, 'Same momentum change (car stops) + Longer time = Much lower force on passengers', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle'
    });
    r.text(cx, 268, '5× longer collision time → 5× less force!', { fill: colors.success, fontSize: 12, textAnchor: 'middle' });

    r.setCoachMessage('Now let\'s explore what happens in PERFECTLY inelastic collisions!');
    r.addButton({ id: 'next', label: 'Discover the Twist', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.setHeader('The Twist Challenge', 'Perfectly inelastic collisions');

    r.text(this.width / 2, 50, 'Two identical cars (mass m each) collide head-on.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle'
    });
    r.text(this.width / 2, 70, 'Both moving at speed v, they STICK TOGETHER after impact.', {
      fill: colors.accent,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(this.width / 2, 95, 'What percentage of kinetic energy is lost?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const options = [
      { id: 'A', text: '0% - energy is always conserved' },
      { id: 'B', text: '50% - half the energy is lost' },
      { id: 'C', text: '100% - all kinetic energy is lost' },
      { id: 'D', text: '200% - energy doubles in collisions' }
    ];

    const startY = 115;
    options.forEach((opt, i) => {
      const y = startY + i * 42;
      const isSelected = this.twistPrediction === opt.id;
      const isCorrect = opt.id === 'C';

      let bgColor = colors.panel;
      if (this.showTwistFeedback) {
        if (isSelected && isCorrect) bgColor = '#166534';
        else if (isSelected && !isCorrect) bgColor = '#991b1b';
        else if (isCorrect) bgColor = '#166534';
      }

      r.rect(80, y, this.width - 160, 36, { fill: bgColor, rx: 8 });
      r.text(100, y + 22, `${opt.id}. ${opt.text}`, { fill: colors.text, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `twist_pred_${opt.id}`, label: opt.id, variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.rect(80, 290, this.width - 160, 45, { fill: colors.panelDark, rx: 8 });
      r.text(this.width / 2, 310, '100% of kinetic energy is lost!', {
        fill: colors.success,
        fontSize: 13,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });
      r.text(this.width / 2, 328, 'Momenta cancel: mv + m(-v) = 0. Wreckage is stationary.', {
        fill: colors.textSecondary,
        fontSize: 11,
        textAnchor: 'middle'
      });
      r.addButton({ id: 'next', label: 'See Where Energy Goes', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.setHeader('Energy Transformation', 'Where does the kinetic energy go?');

    const cx = this.width / 2;

    // Before collision
    r.text(cx, 50, 'BEFORE: Both cars have kinetic energy', { fill: colors.text, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Cars moving toward each other
    r.rect(100, 70, 60, 30, { fill: colors.carBody, rx: 5 });
    r.text(130, 90, '→', { fill: colors.text, fontSize: 16, textAnchor: 'middle' });

    r.rect(this.width - 160, 70, 60, 30, { fill: colors.error, rx: 5 });
    r.text(this.width - 130, 90, '←', { fill: colors.text, fontSize: 16, textAnchor: 'middle' });

    r.text(cx, 90, 'KE = ½mv² + ½mv²', { fill: colors.primary, fontSize: 12, textAnchor: 'middle' });

    // After collision
    r.text(cx, 130, 'AFTER: Combined wreckage is STATIONARY', { fill: colors.text, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Crumpled cars
    r.rect(cx - 40, 145, 80, 35, { fill: colors.textMuted, rx: 5 });
    r.text(cx, 165, 'v = 0', { fill: colors.text, fontSize: 12, textAnchor: 'middle' });
    r.text(cx, 195, 'KE = 0', { fill: colors.error, fontSize: 12, textAnchor: 'middle' });

    // Energy transformation
    r.rect(50, 215, this.width - 100, 100, { fill: colors.panel, rx: 10 });
    r.text(cx, 235, 'Where did the energy go?', { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const transformations = [
      { label: 'Heat', icon: '🔥', desc: 'Metal heats up' },
      { label: 'Sound', icon: '💥', desc: 'Crash noise' },
      { label: 'Deformation', icon: '🔧', desc: 'Crumpling' }
    ];

    transformations.forEach((t, i) => {
      const x = 100 + i * (this.width - 200) / 3;
      r.text(x, 265, t.icon, { fill: colors.text, fontSize: 18 });
      r.text(x, 285, t.label, { fill: colors.text, fontSize: 11, fontWeight: 'bold' });
      r.text(x, 300, t.desc, { fill: colors.textSecondary, fontSize: 9 });
    });

    r.setCoachMessage('The "lost" KE actually protects passengers by absorbing the impact energy!');
    r.addButton({ id: 'next', label: 'Key Discovery', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.setHeader('Key Discovery', 'Lost energy saves lives');

    const cx = this.width / 2;

    r.text(cx, 55, 'The "lost" kinetic energy is actually the SAFETY FEATURE!', {
      fill: colors.success,
      fontSize: 15,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const concepts = [
      { title: 'Momentum', desc: 'ALWAYS conserved (mv)', icon: '⚡' },
      { title: 'Kinetic Energy', desc: 'NOT conserved in inelastic', icon: '🔋' },
      { title: 'Total Energy', desc: 'ALWAYS conserved (converts form)', icon: '♻️' }
    ];

    concepts.forEach((c, i) => {
      const x = 60 + i * (this.width - 120) / 3;
      r.rect(x, 80, (this.width - 140) / 3, 80, { fill: colors.panel, rx: 10 });
      r.text(x + 15, 105, c.icon, { fill: colors.text, fontSize: 20 });
      r.text(x + 45, 105, c.title, { fill: colors.primary, fontSize: 12, fontWeight: 'bold' });
      r.text(x + 15, 135, c.desc, { fill: colors.textSecondary, fontSize: 10 });
    });

    // Key insight box
    r.rect(50, 175, this.width - 100, 80, { fill: colors.panelDark, rx: 10 });
    r.text(cx, 200, 'Why This Matters:', { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(cx, 225, 'Energy that goes into crumpling metal doesn\'t go into injuring people.', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle'
    });
    r.text(cx, 245, 'Inelastic collisions are DESIGNED into safety systems!', {
      fill: colors.success,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.setCoachMessage('Now explore real-world applications of inelastic collision physics!');
    r.addButton({ id: 'next', label: 'See Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.setHeader('Real-World Applications', 'Inelastic physics saves lives');

    // Tab buttons
    const tabY = 35;
    const tabW = (this.width - 60) / 4;
    this.transferApps.forEach((app, i) => {
      const isActive = this.activeAppTab === i;
      const isComplete = this.completedApps.has(i);

      r.rect(30 + i * tabW, tabY, tabW - 5, 28, {
        fill: isActive ? app.color : (isComplete ? colors.success + '40' : colors.panel),
        rx: 5
      });
      r.text(30 + i * tabW + (tabW - 5) / 2, tabY + 18, app.short, {
        fill: isActive ? colors.text : colors.textSecondary,
        fontSize: 10,
        fontWeight: isActive ? 'bold' : 'normal',
        textAnchor: 'middle'
      });

      r.addButton({ id: `app_tab_${i}`, label: app.short, variant: 'secondary' });
    });

    const app = this.transferApps[this.activeAppTab];

    // Content card
    r.rect(30, 70, this.width - 60, 180, { fill: colors.panel, rx: 10 });

    r.text(50, 95, app.title, { fill: colors.text, fontSize: 14, fontWeight: 'bold' });
    r.text(50, 115, app.tagline, { fill: app.color, fontSize: 11 });
    r.text(50, 140, app.description.substring(0, 80), { fill: colors.textSecondary, fontSize: 10 });
    if (app.description.length > 80) {
      r.text(50, 155, app.description.substring(80), { fill: colors.textSecondary, fontSize: 10 });
    }

    // Physics connection
    r.rect(40, 170, this.width - 100, 40, { fill: colors.panelDark, rx: 5 });
    r.text(50, 190, 'Physics: ' + app.connection.substring(0, 70), { fill: colors.primary, fontSize: 9 });
    r.text(50, 205, app.connection.substring(70), { fill: colors.primary, fontSize: 9 });

    // Stats
    app.stats.forEach((stat, i) => {
      const x = 50 + i * 100;
      r.text(x, 230, stat.value, { fill: app.color, fontSize: 12, fontWeight: 'bold' });
      r.text(x, 245, stat.label, { fill: colors.textMuted, fontSize: 9 });
    });

    if (!this.completedApps.has(this.activeAppTab)) {
      r.addButton({ id: `complete_app_${this.activeAppTab}`, label: 'Mark Understood', variant: 'success' });
    }

    r.text(30, 275, 'Progress:', { fill: colors.textMuted, fontSize: 11 });
    this.transferApps.forEach((_, i) => {
      r.circle(90 + i * 20, 272, 6, { fill: this.completedApps.has(i) ? colors.success : colors.border });
    });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'next', label: 'Take the Quiz', variant: 'primary' });
    }

    r.setCoachMessage('Explore all 4 applications to continue.');
  }

  private renderTest(r: CommandRenderer): void {
    r.setHeader('Knowledge Check', `Question ${Math.min(this.testAnswers.findIndex(a => a === -1) + 1, 10)} of 10`);

    if (!this.showTestResults) {
      let currentQ = this.testAnswers.findIndex(a => a === -1);
      if (currentQ === -1) currentQ = 9;

      const q = this.testQuestions[currentQ];

      r.rect(30, 35, this.width - 60, 35, { fill: colors.panelDark, rx: 8 });
      r.text(45, 57, q.scenario.substring(0, 95), { fill: colors.primary, fontSize: 9, fontStyle: 'italic' });

      r.text(30, 90, `${currentQ + 1}. ${q.question}`, { fill: colors.text, fontSize: 11, fontWeight: 'bold' });

      q.options.forEach((opt, i) => {
        const y = 105 + i * 40;
        const isSelected = this.testAnswers[currentQ] === i;

        r.rect(30, y, this.width - 60, 34, {
          fill: isSelected ? colors.primary + '40' : colors.panel,
          stroke: isSelected ? colors.primary : 'transparent',
          strokeWidth: 2,
          rx: 8
        });
        r.text(50, y + 22, opt, { fill: colors.text, fontSize: 10 });

        r.addButton({ id: `test_q${currentQ}_a${i}`, label: `Option ${i + 1}`, variant: 'secondary' });
      });

      const dotsY = 275;
      this.testQuestions.forEach((_, i) => {
        const answered = this.testAnswers[i] !== -1;
        const isCurrent = i === currentQ;
        r.circle(this.width / 2 - 55 + i * 12, dotsY, 4, {
          fill: isCurrent ? colors.primary : (answered ? colors.success : colors.border)
        });
      });

      if (!this.testAnswers.includes(-1)) {
        r.addButton({ id: 'submit_test', label: 'Submit Answers', variant: 'success' });
      }
    } else {
      const score = this.getTestScore();
      const passed = score >= 7;

      r.text(this.width / 2, 70, passed ? 'Excellent!' : 'Keep Learning', {
        fill: passed ? colors.success : colors.warning,
        fontSize: 24,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });

      r.text(this.width / 2, 105, `Score: ${score}/10`, {
        fill: colors.text,
        fontSize: 18,
        textAnchor: 'middle'
      });

      r.rect(30, 125, this.width - 60, 120, { fill: colors.panel, rx: 10 });
      this.testQuestions.forEach((q, i) => {
        const correct = this.testAnswers[i] === q.correctIndex;
        const x = 50 + (i % 5) * 120;
        const y = 150 + Math.floor(i / 5) * 50;

        r.circle(x, y, 8, { fill: correct ? colors.success : colors.error });
        r.text(x + 15, y + 4, `Q${i + 1}`, { fill: colors.textSecondary, fontSize: 10 });
      });

      if (passed) {
        r.addButton({ id: 'next', label: 'Claim Your Badge!', variant: 'success' });
      } else {
        r.addButton({ id: 'retry_test', label: 'Review & Try Again', variant: 'primary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.setHeader('Congratulations!', 'Collision Safety Expert');

    const cx = this.width / 2;

    r.circle(cx, 90, 45, { fill: colors.primary + '30', stroke: colors.primary, strokeWidth: 3 });
    r.text(cx, 82, '🚗', { fill: colors.text, fontSize: 36, textAnchor: 'middle' });

    r.text(cx, 155, 'Collision Safety Expert!', {
      fill: colors.text,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(cx, 180, 'You\'ve mastered inelastic collision physics!', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle'
    });

    const achievements = [
      '✓ Momentum is always conserved',
      '✓ F = Δp/Δt explains crumple zones',
      '✓ Lost KE protects passengers',
      '✓ Real safety applications'
    ];

    r.rect(100, 200, this.width - 200, 90, { fill: colors.panel, rx: 10 });
    achievements.forEach((text, i) => {
      r.text(120, 220 + i * 18, text, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.setCoachMessage('You now understand the physics that saves lives in car crashes!');
    r.addButton({ id: 'back_to_start', label: 'Explore Again', variant: 'secondary' });
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      carPosition: this.carPosition,
      crashProgress: this.crashProgress,
      isAnimating: this.isAnimating,
      hasCrumpleZone: this.hasCrumpleZone,
      showForces: this.showForces,
      impactSpeed: this.impactSpeed,
      selectedPrediction: this.selectedPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      twistPrediction: this.twistPrediction,
      showTwistFeedback: this.showTwistFeedback,
      activeAppTab: this.activeAppTab,
      completedApps: Array.from(this.completedApps),
      testAnswers: this.testAnswers,
      showTestResults: this.showTestResults
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as Phase;
    if (state.carPosition !== undefined) this.carPosition = state.carPosition as number;
    if (state.crashProgress !== undefined) this.crashProgress = state.crashProgress as number;
    if (state.isAnimating !== undefined) this.isAnimating = state.isAnimating as boolean;
    if (state.hasCrumpleZone !== undefined) this.hasCrumpleZone = state.hasCrumpleZone as boolean;
    if (state.showForces !== undefined) this.showForces = state.showForces as boolean;
    if (state.impactSpeed !== undefined) this.impactSpeed = state.impactSpeed as number;
    if (state.selectedPrediction !== undefined) this.selectedPrediction = state.selectedPrediction as string | null;
    if (state.showPredictionFeedback !== undefined) this.showPredictionFeedback = state.showPredictionFeedback as boolean;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.showTwistFeedback !== undefined) this.showTwistFeedback = state.showTwistFeedback as boolean;
    if (state.activeAppTab !== undefined) this.activeAppTab = state.activeAppTab as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
  }
}

// Factory function
export function createInelasticCollisionsGame(sessionId: string, config?: SessionConfig): InelasticCollisionsGame {
  return new InelasticCollisionsGame(sessionId, config);
}
