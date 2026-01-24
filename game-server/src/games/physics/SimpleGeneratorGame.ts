/**
 * Simple Generator Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Faraday's Law: EMF = -N * dPhi/dt
 * - Magnetic flux: Phi = B * A * cos(theta)
 * - Induced EMF: EMF = N * B * A * omega * sin(omega*t)
 * - Peak voltage calculation and RMS values
 * - Power generation: P = V * I
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
    question: 'What does Faraday\'s Law describe?',
    options: [
      'The force between magnets',
      'The relationship between changing magnetic flux and induced EMF',
      'How batteries store energy',
      'The speed of light',
    ],
    correctIndex: 1,
  },
  {
    question: 'In the equation EMF = -N * dPhi/dt, what does N represent?',
    options: ['Newtons', 'Number of coil turns', 'North pole strength', 'Noise factor'],
    correctIndex: 1,
  },
  {
    question: 'To increase the EMF produced by a generator, you could:',
    options: [
      'Spin the coil slower',
      'Use fewer coil turns',
      'Use a stronger magnet',
      'Make the coil smaller',
    ],
    correctIndex: 2,
  },
  {
    question: 'Why does a rotating coil in a magnetic field produce AC voltage?',
    options: [
      'The magnet is alternating',
      'The flux through the coil changes direction periodically',
      'Electrons move in circles',
      'The wire gets hot',
    ],
    correctIndex: 1,
  },
  {
    question: 'The negative sign in Faraday\'s Law (-dPhi/dt) indicates:',
    options: [
      'The EMF is always negative',
      'Lenz\'s Law - induced current opposes the change',
      'Power is being lost',
      'The generator is broken',
    ],
    correctIndex: 1,
  },
  {
    question: 'When is the induced EMF maximum in a rotating generator?',
    options: [
      'When the coil is parallel to the magnetic field',
      'When the coil is perpendicular to the magnetic field',
      'When the coil stops rotating',
      'At midnight',
    ],
    correctIndex: 0,
  },
  {
    question: 'Magnetic flux (Phi) is calculated as:',
    options: ['B + A', 'B * A * cos(theta)', 'B / A', 'B - A * sin(theta)'],
    correctIndex: 1,
  },
  {
    question: 'A bicycle dynamo generates electricity by:',
    options: [
      'Chemical reactions',
      'Solar energy',
      'A magnet spinning near a coil',
      'Friction heat',
    ],
    correctIndex: 2,
  },
  {
    question: 'If you double the rotation speed of a generator, the EMF:',
    options: ['Stays the same', 'Doubles', 'Quadruples', 'Halves'],
    correctIndex: 1,
  },
  {
    question: 'Regenerative braking in electric vehicles works by:',
    options: [
      'Using friction to slow down',
      'Converting kinetic energy to electrical energy via a generator',
      'Deploying a parachute',
      'Reversing the motor polarity',
    ],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  accent: '#f59e0b',
  accentDark: '#d97706',
  warning: '#ef4444',
  success: '#10b981',
  danger: '#ef4444',
  bgDark: '#0a0f1a',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  magnetic: '#8b5cf6',
  coil: '#f97316',
  emf: '#22c55e',
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
    title: 'Power Plants',
    icon: 'plant',
    description: 'All power plants (coal, nuclear, hydro, wind) use generators based on Faraday\'s Law to convert mechanical energy to electricity.',
    details: 'Turbines spin massive coils in powerful magnetic fields. A single generator can produce hundreds of megawatts, enough to power a city!',
  },
  {
    title: 'Bicycle Dynamos',
    icon: 'bike',
    description: 'Hub dynamos and bottle dynamos use the rotation of your wheel to spin a magnet and generate electricity for lights.',
    details: 'Modern hub dynamos are over 90% efficient and produce 3-6 watts. You barely notice the resistance while riding!',
  },
  {
    title: 'Regenerative Braking',
    icon: 'car',
    description: 'Electric vehicles use their motors as generators when slowing down, converting kinetic energy back to electricity.',
    details: 'This can recover 10-25% of the energy that would be lost as heat in traditional brakes. Tesla vehicles can recover up to 70% under optimal conditions.',
  },
  {
    title: 'Wind Turbines',
    icon: 'wind',
    description: 'Wind spins the turbine blades, which rotate a generator to produce clean electricity.',
    details: 'Modern wind turbines can generate 2-8 MW each. The largest offshore turbines have blades longer than a football field!',
  },
];

// === MAIN GAME CLASS ===

export class SimpleGeneratorGame extends BaseGame {
  readonly gameType = 'simple_generator';
  readonly gameTitle = 'Simple Generator';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private coilAngle = 0;
  private rotationSpeed = 2; // rad/s
  private numTurns = 10;
  private magneticFieldStrength = 1; // Tesla
  private coilArea = 0.01; // m^2
  private isAnimating = true;
  private time = 0;

  // Calculated values (PROTECTED)
  private emf = 0;
  private flux = 0;

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
    hook: 'How does spinning a magnet near a wire create electricity? Let\'s discover Faraday\'s Law!',
    predict: 'Think about what happens when a coil rotates in a magnetic field...',
    play: 'Adjust the rotation speed and coil turns. Watch how the EMF changes!',
    review: 'Faraday\'s Law: EMF = -N * dPhi/dt. The change in flux induces voltage!',
    twist_predict: 'What happens if we change the magnetic field strength instead of the rotation?',
    twist_play: 'Experiment with field strength and coil size.',
    twist_review: 'Multiple factors affect EMF: speed, turns, field strength, and coil area.',
    transfer: 'From power plants to bicycle lights, generators are everywhere!',
    test: 'Test your understanding of electromagnetic induction!',
    mastery: 'You now understand how motion and magnetism create electricity!',
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
      message: 'Simple Generator lesson started',
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
    if (id === 'animation') {
      this.isAnimating = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'speed') {
      this.rotationSpeed = value;
      return;
    }
    if (id === 'turns') {
      this.numTurns = value;
      return;
    }
    if (id === 'field') {
      this.magneticFieldStrength = value;
      return;
    }
    if (id === 'area') {
      this.coilArea = value / 100; // Convert from cm^2 display
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
   * PROTECTED: Magnetic flux calculation
   * Phi = B * A * cos(theta)
   */
  private calculateFlux(angle: number): number {
    return this.magneticFieldStrength * this.coilArea * Math.cos(angle);
  }

  /**
   * PROTECTED: EMF calculation using Faraday's Law
   * EMF = -N * dPhi/dt = N * B * A * omega * sin(omega*t)
   */
  private calculateEMF(angle: number): number {
    // EMF is proportional to rate of change of flux
    // d/dt[B*A*cos(omega*t)] = -B*A*omega*sin(omega*t)
    // So EMF = N * B * A * omega * sin(theta)
    return this.numTurns * this.magneticFieldStrength * this.coilArea * this.rotationSpeed * Math.sin(angle);
  }

  /**
   * PROTECTED: Peak EMF calculation
   */
  private calculatePeakEMF(): number {
    return this.numTurns * this.magneticFieldStrength * this.coilArea * this.rotationSpeed;
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;

    this.time += deltaTime / 1000;
    this.coilAngle = (this.coilAngle + this.rotationSpeed * deltaTime / 1000) % (2 * Math.PI);

    // Update calculated values
    this.flux = this.calculateFlux(this.coilAngle);
    this.emf = this.calculateEMF(this.coilAngle);
  }

  private resetSimulation(): void {
    this.coilAngle = 0;
    this.time = 0;
    this.isAnimating = true;
    this.flux = this.calculateFlux(0);
    this.emf = this.calculateEMF(0);
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
    r.circle(525, 500, 200, { fill: colors.magnetic, opacity: 0.03 });
  }

  private renderGenerator(r: CommandRenderer, centerX: number, centerY: number, size: number = 200): void {
    // Magnetic field lines (background)
    for (let i = -3; i <= 3; i++) {
      const y = centerY + i * 25;
      r.line(centerX - size / 2, y, centerX + size / 2, y, {
        stroke: colors.magnetic,
        strokeWidth: 1,
        opacity: 0.3,
      });
      // Arrow heads pointing right
      r.path(`M ${centerX + size / 2 - 10} ${y - 5} L ${centerX + size / 2} ${y} L ${centerX + size / 2 - 10} ${y + 5}`, {
        fill: 'none',
        stroke: colors.magnetic,
        strokeWidth: 1,
        opacity: 0.5,
      });
    }
    r.text(centerX + size / 2 + 20, centerY - 60, 'B', { fill: colors.magnetic, fontSize: 14, fontWeight: 'bold' });

    // Magnet poles
    r.rect(centerX - size / 2 - 30, centerY - 60, 30, 120, { fill: '#dc2626', rx: 5 });
    r.text(centerX - size / 2 - 15, centerY + 5, 'N', { fill: colors.textPrimary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(centerX + size / 2, centerY - 60, 30, 120, { fill: '#2563eb', rx: 5 });
    r.text(centerX + size / 2 + 15, centerY + 5, 'S', { fill: colors.textPrimary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Rotating coil
    const coilWidth = 80 * Math.cos(this.coilAngle);
    const coilHeight = 100;

    r.group(`translate(${centerX}, ${centerY})`, (g) => {
      // Coil (appears as ellipse from side view)
      g.ellipse(0, 0, Math.abs(coilWidth / 2), coilHeight / 2, {
        fill: 'none',
        stroke: colors.coil,
        strokeWidth: 4,
      });

      // Coil ends/connections
      g.line(0, -coilHeight / 2, 0, -coilHeight / 2 - 30, { stroke: colors.coil, strokeWidth: 3 });
      g.line(0, coilHeight / 2, 0, coilHeight / 2 + 30, { stroke: colors.coil, strokeWidth: 3 });

      // Rotation axis
      g.circle(0, -coilHeight / 2 - 30, 5, { fill: colors.textMuted });
      g.circle(0, coilHeight / 2 + 30, 5, { fill: colors.textMuted });
    });

    // Output wires to "bulb"
    r.line(centerX, centerY + 80, centerX - 40, centerY + 120, { stroke: colors.coil, strokeWidth: 2 });
    r.line(centerX, centerY + 80, centerX + 40, centerY + 120, { stroke: colors.coil, strokeWidth: 2 });

    // Light bulb (brightness based on EMF)
    const brightness = Math.abs(this.emf) / this.calculatePeakEMF();
    r.circle(centerX, centerY + 140, 20, {
      fill: `rgba(255, 255, 150, ${brightness})`,
      stroke: colors.textMuted,
      strokeWidth: 2,
    });
  }

  private renderEMFGraph(r: CommandRenderer, x: number, y: number, width: number, height: number): void {
    // Graph background
    r.rect(x, y, width, height, { fill: colors.bgCard, stroke: colors.border, rx: 8 });

    // Axes
    r.line(x + 30, y + height / 2, x + width - 10, y + height / 2, { stroke: colors.textMuted, strokeWidth: 1 });
    r.line(x + 30, y + 10, x + 30, y + height - 10, { stroke: colors.textMuted, strokeWidth: 1 });

    // Labels
    r.text(x + 15, y + height / 2, '0', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(x + 15, y + 20, '+', { fill: colors.emf, fontSize: 12, textAnchor: 'middle' });
    r.text(x + 15, y + height - 20, '-', { fill: colors.danger, fontSize: 12, textAnchor: 'middle' });
    r.text(x + width / 2, y + height - 5, 'Time', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Sine wave
    const peakEMF = this.calculatePeakEMF();
    const amplitude = (height / 2 - 15);
    let path = '';
    for (let i = 0; i <= width - 40; i++) {
      const t = (i / (width - 40)) * 4 * Math.PI + this.time * this.rotationSpeed;
      const emfValue = Math.sin(t);
      const px = x + 30 + i;
      const py = y + height / 2 - emfValue * amplitude;
      path += (i === 0 ? 'M' : 'L') + ` ${px} ${py}`;
    }
    r.path(path, { fill: 'none', stroke: colors.emf, strokeWidth: 2 });

    // Current position marker
    const currentX = x + 30 + (this.coilAngle % (2 * Math.PI)) / (4 * Math.PI) * (width - 40);
    const currentY = y + height / 2 - (this.emf / (peakEMF || 1)) * amplitude;
    r.circle(currentX, currentY, 5, { fill: colors.accent });
  }

  private renderHookPhase(r: CommandRenderer): void {
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.circle(295, 44, 4, { fill: colors.primary });
    r.text(350, 49, 'ELECTROMAGNETIC INDUCTION', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, 'Creating Electricity from Motion', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'How does a spinning magnet create electricity?', {
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

    this.renderGenerator(r, 350, 280, 160);

    r.text(350, 420, 'Faraday discovered that changing magnetic fields create electric current!', {
      fill: colors.primary,
      fontSize: 13,
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
    r.text(350, 115, 'A coil of wire rotates between two magnets.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'What type of voltage will be produced?', {
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
        ? 'Correct! The rotating coil produces alternating current (AC)!'
        : 'Not quite. The flux change alternates as the coil rotates, creating AC.',
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
    r.text(350, 30, 'Generator Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Generator visualization
    r.rect(80, 50, 300, 250, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderGenerator(r, 230, 160, 180);

    // EMF graph
    this.renderEMFGraph(r, 400, 50, 250, 120);

    // Stats panel
    r.rect(400, 185, 250, 115, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    const peakEMF = this.calculatePeakEMF();

    r.text(525, 210, 'Generator Output', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });

    r.text(450, 240, 'EMF:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(560, 240, (this.emf * 1000).toFixed(1) + ' mV', {
      fill: this.emf >= 0 ? colors.emf : colors.danger,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'end',
    });

    r.text(450, 265, 'Peak EMF:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(560, 265, (peakEMF * 1000).toFixed(1) + ' mV', {
      fill: colors.accent,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'end',
    });

    r.text(450, 290, 'Flux:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(560, 290, (this.flux * 1000).toFixed(2) + ' mWb', {
      fill: colors.magnetic,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'end',
    });

    // Formula box
    r.rect(80, 320, 570, 60, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(365, 345, 'Faraday\'s Law: EMF = -N * dPhi/dt = N * B * A * omega * sin(theta)', {
      fill: colors.primary,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(365, 365, 'More turns, stronger field, larger area, faster rotation = more voltage!', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Electromagnetic Induction', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 290, 160, { fill: '#1e40af40', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'Faraday\'s Law', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const faradayInfo = [
      'EMF = -N * dPhi/dt',
      'Changing flux induces voltage',
      'More coil turns = more EMF',
      'Faster change = more EMF',
    ];
    faradayInfo.forEach((line, i) => {
      r.text(70, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 160, { fill: '#7c3aed40', stroke: colors.magnetic, rx: 16 });
    r.text(505, 95, 'Magnetic Flux', { fill: colors.magnetic, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const fluxInfo = [
      'Phi = B * A * cos(theta)',
      'B = magnetic field strength',
      'A = coil area',
      'theta = angle to field',
    ];
    fluxInfo.forEach((line, i) => {
      r.text(380, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(50, 250, 600, 80, { fill: '#06533940', stroke: colors.success, rx: 16 });
    r.text(350, 275, 'Key Insight', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 300, 'It\'s the CHANGE in flux that matters, not the flux itself!', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 318, 'Maximum EMF when coil is parallel to field (flux changing fastest)', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist Challenge', {
      fill: colors.accent,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 120, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'Instead of changing rotation speed, what if we', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 150, 'change the magnetic field strength?', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 180, 'How will this affect the output?', {
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
      r.text(350, 375, isCorrect
        ? 'Correct! EMF is directly proportional to field strength (EMF = N*B*A*omega)!'
        : 'Not quite. The EMF scales linearly with magnetic field strength.',
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
    r.text(350, 30, 'Exploring Generator Parameters', {
      fill: colors.accent,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 300, 250, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderGenerator(r, 230, 160, 180);

    this.renderEMFGraph(r, 400, 50, 250, 120);

    r.rect(400, 185, 250, 115, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    const peakEMF = this.calculatePeakEMF();

    r.text(525, 210, 'Parameters', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });

    r.text(450, 235, 'Field (B):', { fill: colors.textSecondary, fontSize: 11 });
    r.text(560, 235, this.magneticFieldStrength.toFixed(1) + ' T', { fill: colors.magnetic, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });

    r.text(450, 255, 'Turns (N):', { fill: colors.textSecondary, fontSize: 11 });
    r.text(560, 255, this.numTurns.toString(), { fill: colors.coil, fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });

    r.text(450, 275, 'Peak EMF:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(560, 275, (peakEMF * 1000).toFixed(1) + ' mV', { fill: colors.emf, fontSize: 16, fontWeight: 'bold', textAnchor: 'end' });

    r.rect(80, 320, 570, 60, { fill: '#78350f30', stroke: colors.accent, rx: 16 });
    r.text(365, 345, 'EMF_peak = N * B * A * omega', {
      fill: colors.accent,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(365, 365, 'Each factor contributes linearly to the peak voltage!', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', {
      fill: colors.accent,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 250, { fill: '#78350f30', stroke: colors.accent, rx: 16 });
    r.text(350, 110, 'Multiple Ways to Increase Generator Output!', {
      fill: colors.accent,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const factors = [
      { factor: 'More coil turns (N):', effect: 'Direct multiplication' },
      { factor: 'Stronger magnet (B):', effect: 'Direct multiplication' },
      { factor: 'Larger coil area (A):', effect: 'Direct multiplication' },
      { factor: 'Faster rotation (omega):', effect: 'Direct multiplication' },
      { factor: 'Combined:', effect: 'EMF = N * B * A * omega' },
    ];

    factors.forEach((item, i) => {
      r.text(180, 145 + i * 30, item.factor, { fill: colors.textSecondary, fontSize: 13, fontWeight: 'bold' });
      r.text(400, 145 + i * 30, item.effect, { fill: colors.textPrimary, fontSize: 13 });
    });

    r.text(350, 310, 'Real generators optimize all these factors!', {
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

    r.text(350, 100, passed ? 'Excellent Work!' : 'Keep Learning!', {
      fill: passed ? colors.success : colors.accent,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 160, `Score: ${score} / ${testQuestions.length}`, {
      fill: colors.textPrimary,
      fontSize: 24,
      textAnchor: 'middle',
    });

    r.text(350, 200, passed ? "You've mastered electromagnetic induction!" : 'Review the material and try again.', {
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

    r.text(350, 130, 'Generator Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, "You've mastered electromagnetic induction!", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'EMF', label: 'Faraday\'s Law' },
      { icon: 'Phi', label: 'Magnetic Flux' },
      { icon: 'AC', label: 'AC Generation' },
      { icon: 'app', label: 'Real Applications' },
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
        r.addButton({ id: 'next', label: 'Explore Induction', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Constant DC voltage', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Alternating AC voltage', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. No voltage', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. Random voltage', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'See the Physics', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'speed', label: 'Rotation Speed', value: this.rotationSpeed, min: 0.5, max: 10, step: 0.5 });
        r.addSlider({ id: 'turns', label: 'Coil Turns', value: this.numTurns, min: 1, max: 50 });
        r.addToggle({ id: 'animation', label: 'Animation', value: this.isAnimating, onLabel: 'ON', offLabel: 'OFF' });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Discover a Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. No change', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. EMF increases proportionally', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. EMF decreases', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Explore Parameters', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({ id: 'field', label: 'Magnetic Field', value: this.magneticFieldStrength, min: 0.1, max: 5, step: 0.1 });
        r.addSlider({ id: 'turns', label: 'Coil Turns', value: this.numTurns, min: 1, max: 50 });
        r.addSlider({ id: 'speed', label: 'Rotation Speed', value: this.rotationSpeed, min: 0.5, max: 10, step: 0.5 });
        r.addButton({ id: 'next', label: 'Review Discovery', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real-World Applications', variant: 'primary' });
        break;

      case 'transfer':
        applications.forEach((_, i) => {
          r.addButton({ id: `app_${i}`, label: applications[i].title.split(' ')[0], variant: this.selectedApp === i ? 'primary' : 'ghost' });
        });
        if (this.completedApps.every((c) => c)) {
          r.addButton({ id: 'next', label: 'Take Knowledge Test', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= testQuestions.length - 1 });
          testQuestions[this.testQuestion].options.forEach((_, i) => {
            r.addButton({ id: `answer_${i}`, label: String.fromCharCode(65 + i), variant: this.testAnswers[this.testQuestion] === i ? 'primary' : 'secondary' });
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
      coilAngle: this.coilAngle,
      rotationSpeed: this.rotationSpeed,
      numTurns: this.numTurns,
      magneticFieldStrength: this.magneticFieldStrength,
      coilArea: this.coilArea,
      isAnimating: this.isAnimating,
      emf: this.emf,
      flux: this.flux,
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
    this.coilAngle = (state.coilAngle as number) || 0;
    this.rotationSpeed = (state.rotationSpeed as number) || 2;
    this.numTurns = (state.numTurns as number) || 10;
    this.magneticFieldStrength = (state.magneticFieldStrength as number) || 1;
    this.coilArea = (state.coilArea as number) || 0.01;
    this.isAnimating = (state.isAnimating as boolean) ?? true;
    this.emf = (state.emf as number) || 0;
    this.flux = (state.flux as number) || 0;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===

export function createSimpleGeneratorGame(sessionId: string): SimpleGeneratorGame {
  return new SimpleGeneratorGame(sessionId);
}
