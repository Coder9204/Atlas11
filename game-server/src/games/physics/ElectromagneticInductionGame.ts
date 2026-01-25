/**
 * Electromagnetic Induction Game - Server-side Implementation
 *
 * Physics: Faraday's Law EMF = -dΦ/dt, Magnetic Flux Φ = B × A × cos(θ), Lenz's Law
 *
 * 10-Phase Structure:
 * 1. hook - Moving magnet through coil creates electricity
 * 2. predict - What happens when magnet moves faster?
 * 3. play - Explore EMF generation with magnet and coil
 * 4. review - Understand Faraday's Law and flux change
 * 5. twist_predict - What if coil is superconducting?
 * 6. twist_play - Explore flux trapping in superconductors
 * 7. twist_review - Perfect diamagnetism and Meissner effect
 * 8. transfer - Real-world applications
 * 9. test - Assessment questions
 * 10. mastery - Final celebration
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer, clamp } from '../../renderer/CommandRenderer.js';

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TransferApplication {
  id: string;
  title: string;
  description: string;
  realWorld: string;
  physics: string;
}

interface TestQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  scenario: string;
}

const colors = {
  bgDark: '#0a1628',
  bgCard: '#1a2a4a',
  primary: '#4fc3f7',
  secondary: '#81d4fa',
  accent: '#ff9800',
  success: '#4caf50',
  error: '#f44336',
  textPrimary: '#ffffff',
  textSecondary: '#b0bec5',
  coilCopper: '#cd7f32',
  magnetNorth: '#f44336',
  magnetSouth: '#2196f3',
  fieldLines: '#9c27b0',
  superconductor: '#00bcd4',
  fluxLines: '#ffeb3b'
};

const testQuestions: TestQuestion[] = [
  {
    id: 1,
    question: 'A magnet moves toward a coil. What determines EMF magnitude?',
    scenario: 'You push a magnet toward a coil at constant speed.',
    options: [
      "The magnet's total field strength",
      'How quickly the flux through the coil changes',
      "The coil's resistance",
      'The distance from the magnet'
    ],
    correctIndex: 1,
    explanation: "Faraday's Law: EMF = -dΦ/dt. It's the RATE of flux change that matters."
  },
  {
    id: 2,
    question: "Double the magnet's speed. What happens to EMF?",
    scenario: 'Moving the magnet twice as fast through the coil.',
    options: ['EMF stays the same', 'EMF doubles', 'EMF quadruples', 'EMF halves'],
    correctIndex: 1,
    explanation: 'EMF ∝ dΦ/dt. Double speed = double rate of flux change = double EMF.'
  },
  {
    id: 3,
    question: "Why does induced current oppose its cause? (Lenz's Law)",
    scenario: 'The magnet approaches and current flows in the coil.',
    options: ['Conservation of energy', "Coil's resistance", 'Magnetic attraction', 'Field direction'],
    correctIndex: 0,
    explanation: "Lenz's Law is energy conservation. If current aided the change, you'd get free energy!"
  },
  {
    id: 4,
    question: 'Coil tilted 60° to field. How does flux compare to perpendicular?',
    scenario: 'The coil is angled relative to field lines.',
    options: ['Same flux', 'Half the flux', 'Zero flux', '86.6% of max'],
    correctIndex: 1,
    explanation: 'Φ = BA cos(θ). At 60°: cos(60°) = 0.5, so flux is exactly half.'
  },
  {
    id: 5,
    question: 'What makes superconductors trap magnetic flux?',
    scenario: 'Superconductor cooled below critical temp in magnetic field.',
    options: ['High resistance', 'Zero resistance - currents never decay', 'Magnetic attraction', 'Thermal expansion'],
    correctIndex: 1,
    explanation: 'Zero resistance means induced currents persist forever, maintaining the trapped flux.'
  },
  {
    id: 6,
    question: 'AC generator spins at 60 Hz. What is the EMF frequency?',
    scenario: 'A coil rotates steadily in a magnetic field.',
    options: ['30 Hz', '60 Hz', '120 Hz', 'DC (0 Hz)'],
    correctIndex: 1,
    explanation: 'EMF frequency = rotation frequency. One rotation = one complete EMF cycle.'
  },
  {
    id: 7,
    question: 'Why do transformers only work with AC, not DC?',
    scenario: 'Transformer has two coils around an iron core.',
    options: ['DC is too strong', 'DC creates no changing flux', 'AC has higher voltage', 'Iron blocks DC'],
    correctIndex: 1,
    explanation: 'EMF requires CHANGING flux. DC creates constant flux, so dΦ/dt = 0.'
  },
  {
    id: 8,
    question: 'Eddy current braking is most effective at which speed?',
    scenario: 'A train uses electromagnetic brakes.',
    options: ['Low speed', 'High speed', 'Same at all speeds', 'Only when stopped'],
    correctIndex: 1,
    explanation: 'Braking force ∝ velocity. Higher speed = faster flux change = stronger braking.'
  },
  {
    id: 9,
    question: 'Coil has 200 turns. How does doubling turns affect EMF?',
    scenario: 'You wind more wire on the same coil form.',
    options: ['No change', 'EMF doubles', 'EMF halves', 'EMF quadruples'],
    correctIndex: 1,
    explanation: 'EMF = -N(dΦ/dt). EMF is directly proportional to number of turns.'
  },
  {
    id: 10,
    question: 'Wireless charger at 100 kHz. Why such high frequency?',
    scenario: 'Designing efficient wireless power transfer.',
    options: ['Higher frequency is safer', 'Faster flux change = more EMF', "Lower frequencies don't work", 'Regulations'],
    correctIndex: 1,
    explanation: 'EMF ∝ dΦ/dt. Higher frequency = faster flux changes = more induced EMF.'
  }
];

const transferApps: TransferApplication[] = [
  {
    id: 'generator',
    title: 'Electric Generators',
    description: 'Spinning coils in magnetic fields power the world',
    realWorld: 'Power plants use massive generators spinning at 3600 RPM.',
    physics: 'EMF = NABω sin(ωt). Rotating coil continuously changes flux.'
  },
  {
    id: 'wireless_charging',
    title: 'Wireless Charging',
    description: 'Transfer energy without wires using changing fields',
    realWorld: 'Phone chargers use 100-200 kHz oscillating fields.',
    physics: 'Changing current creates changing field, inducing EMF in receiver.'
  },
  {
    id: 'induction_cooktop',
    title: 'Induction Cooktops',
    description: 'Cook with invisible magnetic waves',
    realWorld: 'Induction stoves generate 20-100 kHz magnetic fields.',
    physics: 'High-frequency field induces eddy currents, heating the pan directly.'
  },
  {
    id: 'em_braking',
    title: 'Electromagnetic Braking',
    description: "Stop vehicles without friction using Lenz's Law",
    realWorld: 'Roller coasters and trains use EM brakes for smooth stopping.',
    physics: "Moving conductor induces opposing field (Lenz's Law). Force ∝ velocity."
  }
];

export class ElectromagneticInductionGame extends BaseGame {
  readonly gameType = 'electromagnetic_induction';
  readonly gameTitle = 'Electromagnetic Induction';

  private phase: GamePhase = 'hook';
  private readonly phaseOrder: GamePhase[] = [
    'hook', 'predict', 'play', 'review',
    'twist_predict', 'twist_play', 'twist_review',
    'transfer', 'test', 'mastery'
  ];

  // Game state
  private magnetPosition: number = 0.2;
  private magnetVelocity: number = 0.3;
  private magnetFieldStrength: number = 0.5;
  private coilTurns: number = 100;
  private currentEMF: number = 0;
  private currentFlux: number = 0;
  private isAnimating: boolean = true;
  private time: number = 0;

  // Superconductor twist state
  private isSuperconducting: boolean = false;
  private trappedFlux: number = 0;
  private temperature: number = 300;
  private criticalTemp: number = 92;

  // Prediction state
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Transfer state
  private currentTransferIndex: number = 0;

  // Test state
  private currentTestQuestion: number = 0;
  private testAnswers: (number | null)[] = [];
  private testSubmitted: boolean = false;

  // Navigation
  private lastNavTime: number = 0;
  private isNavigating: boolean = false;

  constructor(sessionId: string) {
    super(sessionId);
    this.testAnswers = new Array(testQuestions.length).fill(null);
  }

  initialize(config: SessionConfig): void {
    super.initialize(config);
    if (config.resumePhase && this.phaseOrder.includes(config.resumePhase as GamePhase)) {
      this.phase = config.resumePhase as GamePhase;
    }
    this.emitCoachEvent('game_started', {
      phase: this.phase,
      message: 'Welcome to Electromagnetic Induction!'
    });
  }

  // Physics calculations (protected server-side)
  private calculateMagneticFlux(B: number, position: number): number {
    const distanceFromCenter = Math.abs(position - 0.5);
    const fluxFactor = Math.exp(-distanceFromCenter * 10);
    return B * 0.01 * fluxFactor * this.coilTurns;
  }

  private updatePhysics(dt: number): void {
    const newFlux = this.calculateMagneticFlux(this.magnetFieldStrength, this.magnetPosition);
    if (dt > 0) {
      this.currentEMF = -(newFlux - this.currentFlux) / dt * 0.1;
    }
    this.currentFlux = newFlux;

    if (this.isAnimating) {
      this.magnetPosition += this.magnetVelocity * dt;
      if (this.magnetPosition > 0.9 || this.magnetPosition < 0.1) {
        this.magnetVelocity = -this.magnetVelocity;
      }
    }
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    this.time += deltaTime / 1000;
    this.updatePhysics(deltaTime / 1000);
  }

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click':
        this.handleButtonClick(input.id!);
        break;
      case 'slider_change':
        this.handleSliderChange(input.id!, input.value as number);
        break;
      case 'progress_click':
        this.handleProgressClick(input.index!);
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

    // Animation controls
    if (id === 'start') {
      this.isAnimating = true;
      return;
    }
    if (id === 'stop') {
      this.isAnimating = false;
      return;
    }
    if (id === 'reset') {
      this.magnetPosition = 0.2;
      this.magnetVelocity = 0.3;
      this.isAnimating = true;
      this.currentEMF = 0;
      return;
    }

    // Superconductor controls
    if (id === 'cool') {
      this.temperature = Math.max(4, this.temperature - 50);
      if (this.temperature < this.criticalTemp && !this.isSuperconducting) {
        this.isSuperconducting = true;
        this.trappedFlux = this.currentFlux;
      }
      return;
    }
    if (id === 'warm') {
      this.temperature = Math.min(300, this.temperature + 50);
      if (this.temperature >= this.criticalTemp) {
        this.isSuperconducting = false;
        this.trappedFlux = 0;
      }
      return;
    }

    // Transfer navigation
    if (id === 'next_app') {
      this.currentTransferIndex = Math.min(transferApps.length - 1, this.currentTransferIndex + 1);
      return;
    }
    if (id === 'prev_app') {
      this.currentTransferIndex = Math.max(0, this.currentTransferIndex - 1);
      return;
    }
    if (id.startsWith('app_')) {
      this.currentTransferIndex = parseInt(id.replace('app_', ''), 10);
      return;
    }

    // Test answers
    if (id.startsWith('answer_')) {
      this.testAnswers[this.currentTestQuestion] = parseInt(id.replace('answer_', ''), 10);
      return;
    }
    if (id === 'test_next' && this.currentTestQuestion < testQuestions.length - 1) {
      this.currentTestQuestion++;
      return;
    }
    if (id === 'test_prev' && this.currentTestQuestion > 0) {
      this.currentTestQuestion--;
      return;
    }
    if (id === 'test_submit') {
      this.testSubmitted = true;
      this.emitCoachEvent('test_completed', { score: this.calculateTestScore() });
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'magnet_position') {
      this.magnetPosition = clamp(value, 0.05, 0.95);
      this.isAnimating = false;
      this.updatePhysics(0.016);
      return;
    }
    if (id === 'field_strength') {
      this.magnetFieldStrength = clamp(value, 0.1, 1);
      return;
    }
    if (id === 'coil_turns') {
      this.coilTurns = clamp(Math.round(value), 10, 500);
      return;
    }
    if (id === 'magnet_speed') {
      this.magnetVelocity = value > 0 ? value : -value;
      return;
    }
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

    if (newPhase === 'play' || newPhase === 'twist_play' || newPhase === 'hook') {
      this.resetSimulation();
    }

    this.emitCoachEvent('phase_changed', { phase: newPhase });

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

  private resetSimulation(): void {
    this.magnetPosition = 0.2;
    this.magnetVelocity = 0.3;
    this.isAnimating = true;
    this.currentEMF = 0;
    this.currentFlux = 0;
  }

  private calculateTestScore(): number {
    let correct = 0;
    this.testAnswers.forEach((answer, i) => {
      if (answer === testQuestions[i].correctIndex) correct++;
    });
    return Math.round((correct / testQuestions.length) * 100);
  }

  render(): GameFrame {
    const r = new CommandRenderer(this.viewport.width, this.viewport.height);
    r.reset();
    r.setViewport(400, 500);
    r.clear(colors.bgDark);

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

    this.renderNavigation(r);
    return r.toFrame(this.nextFrame());
  }

  private renderHook(r: CommandRenderer): void {
    r.text(200, 30, 'Electromagnetic Induction', {
      fill: colors.primary,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.rect(20, 50, 360, 70, { fill: colors.bgCard, rx: 8 });
    r.text(200, 75, 'Moving Magnets Create Electricity!', {
      fill: colors.accent,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(200, 100, 'Push a magnet through a coil and electricity flows!', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle'
    });

    this.renderMagnetAndCoil(r, 200, 200);
    this.renderEMFMeter(r, 200, 320);

    r.rect(20, 380, 360, 50, { fill: colors.bgCard, rx: 8 });
    r.text(200, 400, 'This is electromagnetic induction - discovered', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle'
    });
    r.text(200, 418, 'by Michael Faraday in 1831!', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle'
    });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 30, 'Make a Prediction', {
      fill: colors.primary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.rect(20, 50, 360, 70, { fill: colors.bgCard, rx: 8 });
    r.text(200, 75, 'If you move the magnet FASTER', {
      fill: colors.textPrimary,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(200, 100, 'through the coil, what happens to the induced EMF?', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle'
    });

    const options = [
      { id: 'more', label: 'EMF increases' },
      { id: 'same', label: 'EMF stays the same' },
      { id: 'less', label: 'EMF decreases' }
    ];

    options.forEach((opt, i) => {
      const y = 140 + i * 50;
      const isSelected = this.prediction === opt.id;
      r.rect(40, y, 320, 40, {
        fill: isSelected ? colors.primary : colors.bgCard,
        rx: 8
      });
      r.text(200, y + 25, opt.label, {
        fill: isSelected ? colors.bgDark : colors.textPrimary,
        fontSize: 13,
        textAnchor: 'middle'
      });
      r.addButton({
        id: `predict_${opt.id}`,
        label: opt.label,
        variant: isSelected ? 'primary' : 'secondary'
      });
    });

    if (this.prediction) {
      const isCorrect = this.prediction === 'more';
      r.rect(20, 310, 360, 90, {
        fill: isCorrect ? '#1b3d1b' : '#3d1b1b',
        rx: 8
      });
      r.text(200, 335, isCorrect ? 'Correct!' : 'Not quite!', {
        fill: isCorrect ? colors.success : colors.error,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });
      r.text(200, 360, 'Faster motion = faster flux change = more EMF!', {
        fill: colors.textSecondary,
        fontSize: 11,
        textAnchor: 'middle'
      });
      r.text(200, 380, 'EMF depends on RATE of change: EMF = -dΦ/dt', {
        fill: colors.textSecondary,
        fontSize: 11,
        textAnchor: 'middle'
      });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 25, 'Explore Electromagnetic Induction', {
      fill: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    this.renderMagnetAndCoil(r, 200, 120);
    this.renderEMFMeter(r, 200, 210);

    // Controls
    r.text(200, 255, 'Magnet Position', {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle'
    });
    r.addSlider({
      id: 'magnet_position',
      label: 'Position',
      min: 0.05,
      max: 0.95,
      step: 0.01,
      value: this.magnetPosition
    });

    r.text(200, 290, 'Field Strength', {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle'
    });
    r.addSlider({
      id: 'field_strength',
      label: 'Field',
      min: 0.1,
      max: 1,
      step: 0.1,
      value: this.magnetFieldStrength
    });

    r.text(200, 325, `Coil Turns: ${this.coilTurns}`, {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle'
    });
    r.addSlider({
      id: 'coil_turns',
      label: 'Turns',
      min: 10,
      max: 500,
      step: 10,
      value: this.coilTurns
    });

    // Physics readout
    r.rect(20, 350, 360, 70, { fill: colors.bgCard, rx: 8 });
    r.text(200, 370, 'Live Physics', {
      fill: colors.accent,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const flux = this.magnetFieldStrength * 10;
    r.text(200, 390, `Magnetic Flux: Φ = ${flux.toFixed(2)} mWb`, {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle'
    });
    r.text(200, 408, `Induced EMF: ε = ${Math.abs(this.currentEMF).toFixed(2)} V`, {
      fill: colors.primary,
      fontSize: 11,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 30, "Faraday's Law", {
      fill: colors.primary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.rect(40, 55, 320, 55, {
      fill: colors.bgCard,
      rx: 8,
      stroke: colors.primary,
      strokeWidth: 2
    });
    r.text(200, 82, 'EMF = -N × dΦ/dt', {
      fill: colors.primary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(200, 100, 'Induced voltage = turns × rate of flux change', {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle'
    });

    const concepts = [
      { title: 'Magnetic Flux', formula: 'Φ = B × A × cos(θ)', desc: 'Field through area' },
      { title: "Lenz's Law", formula: 'Opposes change', desc: 'Current opposes flux change' },
      { title: 'Motional EMF', formula: 'ε = BLv', desc: 'Moving conductor in field' }
    ];

    concepts.forEach((concept, i) => {
      const y = 125 + i * 65;
      r.rect(30, y, 340, 55, { fill: colors.bgCard, rx: 8 });
      r.text(50, y + 20, concept.title, {
        fill: colors.accent,
        fontSize: 12,
        fontWeight: 'bold',
        textAnchor: 'start'
      });
      r.text(50, y + 38, concept.formula, {
        fill: colors.primary,
        fontSize: 13,
        fontWeight: 'bold',
        textAnchor: 'start'
      });
      r.text(350, y + 30, concept.desc, {
        fill: colors.textSecondary,
        fontSize: 10,
        textAnchor: 'end'
      });
    });

    r.rect(30, 330, 340, 90, { fill: '#1a3a2a', rx: 8 });
    r.text(200, 352, 'Why This Matters', {
      fill: colors.success,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(200, 375, '• Generators convert motion → electricity', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle'
    });
    r.text(200, 393, '• Transformers change voltage levels', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle'
    });
    r.text(200, 411, '• Wireless charging transfers power', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle'
    });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 30, 'The Superconductor Twist', {
      fill: colors.accent,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.rect(20, 55, 360, 80, { fill: colors.bgCard, rx: 8 });
    r.text(200, 78, 'Superconductors have ZERO resistance!', {
      fill: colors.superconductor,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(200, 98, 'When cooled below critical temperature,', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle'
    });
    r.text(200, 115, 'electric current flows forever without loss.', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle'
    });

    r.rect(20, 150, 360, 45, { fill: colors.bgCard, rx: 8 });
    r.text(200, 170, 'A superconductor ring is cooled in a magnetic field.', {
      fill: colors.textPrimary,
      fontSize: 11,
      textAnchor: 'middle'
    });
    r.text(200, 188, 'When the external field is removed, what happens?', {
      fill: colors.textPrimary,
      fontSize: 11,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const options = [
      { id: 'nothing', label: 'Nothing - field just disappears' },
      { id: 'current', label: 'Current flows briefly then stops' },
      { id: 'trap', label: 'Flux stays trapped by persistent current' }
    ];

    options.forEach((opt, i) => {
      const y = 210 + i * 42;
      const isSelected = this.twistPrediction === opt.id;
      r.rect(40, y, 320, 34, {
        fill: isSelected ? colors.superconductor : colors.bgCard,
        rx: 8
      });
      r.text(200, y + 21, opt.label, {
        fill: isSelected ? colors.bgDark : colors.textPrimary,
        fontSize: 11,
        textAnchor: 'middle'
      });
      r.addButton({
        id: `twist_${opt.id}`,
        label: opt.label,
        variant: isSelected ? 'primary' : 'secondary'
      });
    });

    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'trap';
      r.rect(20, 350, 360, 70, {
        fill: isCorrect ? '#1b3d1b' : '#3d1b1b',
        rx: 8
      });
      r.text(200, 372, isCorrect ? 'Amazing insight!' : 'Interesting guess!', {
        fill: isCorrect ? colors.success : colors.error,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });
      r.text(200, 395, 'With zero resistance, induced currents persist', {
        fill: colors.textSecondary,
        fontSize: 10,
        textAnchor: 'middle'
      });
      r.text(200, 410, 'FOREVER, maintaining the magnetic flux inside!', {
        fill: colors.textSecondary,
        fontSize: 10,
        textAnchor: 'middle'
      });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 25, 'Superconductor Flux Trapping', {
      fill: colors.superconductor,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const tempColor = this.temperature < this.criticalTemp ? colors.superconductor : colors.error;
    r.rect(20, 45, 360, 35, { fill: colors.bgCard, rx: 8 });
    r.text(120, 67, `Temperature: ${this.temperature} K`, {
      fill: tempColor,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(300, 67, `Critical: ${this.criticalTemp} K`, {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle'
    });

    this.renderSuperconductorRing(r, 200, 150);

    const stateText = this.isSuperconducting ? 'SUPERCONDUCTING' :
                      (this.temperature < this.criticalTemp ? 'Ready to trap' : 'Normal state');
    r.text(200, 235, stateText, {
      fill: this.isSuperconducting ? colors.superconductor : colors.textSecondary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    if (this.isSuperconducting && this.trappedFlux > 0) {
      r.text(200, 255, `Trapped Flux: ${(this.trappedFlux * 1000).toFixed(2)} mWb`, {
        fill: colors.fluxLines,
        fontSize: 12,
        textAnchor: 'middle'
      });
    }

    r.addSlider({
      id: 'field_strength',
      label: 'External Field',
      min: 0,
      max: 1,
      step: 0.1,
      value: this.magnetFieldStrength
    });

    r.rect(20, 320, 360, 45, { fill: colors.bgCard, rx: 8 });
    r.text(200, 340, '1. Set magnetic field   2. Cool below 92K', {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle'
    });
    r.text(200, 356, '3. Remove field - flux stays trapped!', {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle'
    });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 30, 'Flux Trapping Explained', {
      fill: colors.superconductor,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.rect(20, 55, 360, 70, {
      fill: colors.bgCard,
      rx: 8,
      stroke: colors.superconductor,
      strokeWidth: 2
    });
    r.text(200, 78, 'Zero Resistance = Persistent Current', {
      fill: colors.superconductor,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(200, 98, "When flux tries to change, Faraday's Law induces", {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle'
    });
    r.text(200, 113, 'a current that EXACTLY opposes the change - forever!', {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle'
    });

    const apps = [
      { icon: '🧲', title: 'MRI Machines', desc: 'Persistent currents create stable fields' },
      { icon: '🚄', title: 'Maglev Trains', desc: 'Trapped flux enables levitation' },
      { icon: '⚡', title: 'Energy Storage', desc: 'SMES stores energy in currents' }
    ];

    apps.forEach((app, i) => {
      const y = 140 + i * 55;
      r.rect(30, y, 340, 48, { fill: colors.bgCard, rx: 8 });
      r.text(50, y + 20, `${app.icon} ${app.title}`, {
        fill: colors.accent,
        fontSize: 12,
        fontWeight: 'bold',
        textAnchor: 'start'
      });
      r.text(50, y + 38, app.desc, {
        fill: colors.textSecondary,
        fontSize: 10,
        textAnchor: 'start'
      });
    });

    r.rect(20, 315, 360, 60, { fill: '#1a2a3a', rx: 8 });
    r.text(200, 338, 'Meissner Effect', {
      fill: colors.primary,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(200, 358, 'Superconductors actively expel magnetic fields', {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle'
    });
  }

  private renderTransfer(r: CommandRenderer): void {
    const app = transferApps[this.currentTransferIndex];

    r.text(200, 25, 'Real-World Applications', {
      fill: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(200, 45, `${this.currentTransferIndex + 1} / ${transferApps.length}`, {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle'
    });

    // App tabs
    transferApps.forEach((a, i) => {
      const x = 50 + i * 85;
      const isActive = i === this.currentTransferIndex;
      r.rect(x, 55, 80, 28, {
        fill: isActive ? colors.primary : colors.bgCard,
        rx: 4
      });
      r.text(x + 40, 73, a.title.split(' ')[0], {
        fill: isActive ? colors.bgDark : colors.textSecondary,
        fontSize: 10,
        textAnchor: 'middle'
      });
      r.addButton({
        id: `app_${i}`,
        label: a.title,
        variant: isActive ? 'primary' : 'secondary'
      });
    });

    r.rect(20, 95, 360, 310, { fill: colors.bgCard, rx: 12 });

    r.text(200, 120, app.title, {
      fill: colors.accent,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(200, 142, app.description, {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle'
    });

    r.rect(35, 160, 330, 70, { fill: '#1a3a2a', rx: 8 });
    r.text(50, 180, 'Real World', {
      fill: colors.success,
      fontSize: 11,
      fontWeight: 'bold',
      textAnchor: 'start'
    });
    r.text(200, 200, app.realWorld, {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle'
    });
    r.text(200, 218, '', {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle'
    });

    r.rect(35, 240, 330, 70, { fill: '#2a2a3a', rx: 8 });
    r.text(50, 260, 'Physics', {
      fill: colors.primary,
      fontSize: 11,
      fontWeight: 'bold',
      textAnchor: 'start'
    });
    r.text(200, 280, app.physics, {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle'
    });
  }

  private renderTest(r: CommandRenderer): void {
    if (this.testSubmitted) {
      this.renderTestResults(r);
      return;
    }

    const question = testQuestions[this.currentTestQuestion];

    r.text(200, 25, 'Knowledge Check', {
      fill: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(200, 45, `Question ${this.currentTestQuestion + 1} of ${testQuestions.length}`, {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle'
    });

    r.rect(20, 55, 360, 35, { fill: '#2a3a4a', rx: 8 });
    r.text(200, 77, question.scenario, {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle'
    });

    r.rect(20, 95, 360, 45, { fill: colors.bgCard, rx: 8 });
    r.text(200, 122, question.question, {
      fill: colors.textPrimary,
      fontSize: 12,
      textAnchor: 'middle'
    });

    question.options.forEach((option, i) => {
      const y = 150 + i * 42;
      const isSelected = this.testAnswers[this.currentTestQuestion] === i;
      const letter = String.fromCharCode(65 + i);
      r.rect(30, y, 340, 36, {
        fill: isSelected ? colors.primary : colors.bgCard,
        rx: 8
      });
      r.text(200, y + 22, `${letter}. ${option}`, {
        fill: isSelected ? colors.bgDark : colors.textPrimary,
        fontSize: 11,
        textAnchor: 'middle'
      });
      r.addButton({
        id: `answer_${i}`,
        label: `${letter}. ${option}`,
        variant: isSelected ? 'primary' : 'secondary'
      });
    });
  }

  private renderTestResults(r: CommandRenderer): void {
    const score = this.calculateTestScore();
    const passed = score >= 70;

    r.text(200, 30, 'Test Results', {
      fill: colors.primary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.circle(200, 120, 55, {
      fill: colors.bgCard,
      stroke: passed ? colors.success : colors.accent,
      strokeWidth: 4
    });
    r.text(200, 115, `${score}%`, {
      fill: passed ? colors.success : colors.accent,
      fontSize: 26,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const correctCount = this.testAnswers.filter((a, i) => a === testQuestions[i].correctIndex).length;
    r.text(200, 140, `${correctCount}/${testQuestions.length}`, {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle'
    });

    r.text(200, 200, passed ? 'Excellent understanding!' : 'Review and try again', {
      fill: passed ? colors.success : colors.accent,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Show missed question hints
    const missed = testQuestions.filter((q, i) => this.testAnswers[i] !== q.correctIndex);
    if (missed.length > 0 && missed.length <= 3) {
      r.text(200, 235, 'Review these concepts:', {
        fill: colors.textSecondary,
        fontSize: 11,
        textAnchor: 'middle'
      });
      missed.slice(0, 3).forEach((q, i) => {
        const hint = q.explanation.slice(0, 45) + '...';
        r.text(200, 255 + i * 18, `• ${hint}`, {
          fill: colors.textSecondary,
          fontSize: 9,
          textAnchor: 'middle'
        });
      });
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Stars
    for (let i = 0; i < 15; i++) {
      const x = 40 + (i * 23) % 320;
      const y = 40 + (i * 31) % 400;
      r.circle(x, y, 2 + (i % 3), {
        fill: i % 2 === 0 ? colors.primary : colors.accent
      });
    }

    r.text(200, 70, 'Mastery Achieved!', {
      fill: colors.accent,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(200, 100, 'Electromagnetic Induction', {
      fill: colors.primary,
      fontSize: 16,
      textAnchor: 'middle'
    });

    r.circle(200, 180, 60, {
      fill: colors.bgCard,
      stroke: colors.accent,
      strokeWidth: 4
    });
    r.text(200, 175, '⚡', {
      fill: colors.accent,
      fontSize: 45,
      textAnchor: 'middle'
    });
    r.text(200, 215, 'MASTER', {
      fill: colors.accent,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.rect(30, 260, 340, 110, { fill: colors.bgCard, rx: 12 });
    r.text(200, 285, 'You Mastered:', {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(200, 308, "✓ Faraday's Law: EMF = -N(dΦ/dt)", {
      fill: colors.success,
      fontSize: 11,
      textAnchor: 'middle'
    });
    r.text(200, 326, '✓ Magnetic flux and flux change', {
      fill: colors.success,
      fontSize: 11,
      textAnchor: 'middle'
    });
    r.text(200, 344, "✓ Lenz's Law and energy conservation", {
      fill: colors.success,
      fontSize: 11,
      textAnchor: 'middle'
    });
    r.text(200, 362, '✓ Superconductor flux trapping', {
      fill: colors.success,
      fontSize: 11,
      textAnchor: 'middle'
    });

    this.emitCoachEvent('mastery_achieved', {
      message: "Congratulations! You've mastered Electromagnetic Induction!"
    });
  }

  private renderMagnetAndCoil(r: CommandRenderer, cx: number, cy: number): void {
    // Coil
    const coilWidth = 50;
    const coilHeight = 70;
    r.rect(cx - coilWidth/2, cy - coilHeight/2, coilWidth, coilHeight, {
      fill: 'transparent',
      stroke: colors.coilCopper,
      strokeWidth: 6,
      rx: 4
    });

    // Coil windings
    for (let i = 0; i < 4; i++) {
      const y = cy - coilHeight/2 + 12 + i * 15;
      r.line(cx - coilWidth/2, y, cx - coilWidth/2 - 4, y, {
        stroke: colors.coilCopper,
        strokeWidth: 2
      });
      r.line(cx + coilWidth/2, y, cx + coilWidth/2 + 4, y, {
        stroke: colors.coilCopper,
        strokeWidth: 2
      });
    }

    // Magnet
    const magnetX = cx - 80 + this.magnetPosition * 160;
    const magnetWidth = 40;
    const magnetHeight = 20;

    // North pole
    r.rect(magnetX - magnetWidth/2, cy - magnetHeight/2, magnetWidth/2, magnetHeight, {
      fill: colors.magnetNorth,
      rx: 3
    });
    r.text(magnetX - magnetWidth/4, cy + 5, 'N', {
      fill: colors.textPrimary,
      fontSize: 11,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // South pole
    r.rect(magnetX, cy - magnetHeight/2, magnetWidth/2, magnetHeight, {
      fill: colors.magnetSouth,
      rx: 3
    });
    r.text(magnetX + magnetWidth/4, cy + 5, 'S', {
      fill: colors.textPrimary,
      fontSize: 11,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
  }

  private renderEMFMeter(r: CommandRenderer, cx: number, cy: number): void {
    r.rect(cx - 70, cy - 20, 140, 40, { fill: colors.bgCard, rx: 8 });

    r.text(cx, cy - 5, 'Induced EMF', {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle'
    });

    const maxEMF = 2;
    const normalizedEMF = Math.min(1, Math.abs(this.currentEMF) / maxEMF);
    r.rect(cx - 55, cy + 5, 110, 10, { fill: '#1a2a3a', rx: 5 });
    r.rect(cx - 55, cy + 5, 110 * normalizedEMF, 10, {
      fill: this.currentEMF > 0 ? colors.success : colors.error,
      rx: 5
    });

    r.text(cx + 75, cy + 12, `${Math.abs(this.currentEMF).toFixed(2)} V`, {
      fill: colors.textPrimary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'start'
    });
  }

  private renderSuperconductorRing(r: CommandRenderer, cx: number, cy: number): void {
    const ringColor = this.isSuperconducting ? colors.superconductor : colors.coilCopper;

    r.circle(cx, cy, 50, {
      fill: 'transparent',
      stroke: ringColor,
      strokeWidth: 15
    });
    r.circle(cx, cy, 30, { fill: colors.bgDark });

    // Trapped flux lines
    if (this.isSuperconducting && this.trappedFlux > 0) {
      for (let i = 0; i < 4; i++) {
        const x = cx - 15 + i * 10;
        r.line(x, cy - 20, x, cy + 20, {
          stroke: colors.fluxLines,
          strokeWidth: 2,
          opacity: 0.7
        });
      }
    }

    // External field lines
    if (this.magnetFieldStrength > 0 && !this.isSuperconducting) {
      for (let i = -2; i <= 2; i++) {
        r.line(cx - 70, cy + i * 18, cx + 70, cy + i * 18, {
          stroke: colors.fieldLines,
          strokeWidth: 1,
          opacity: 0.3
        });
      }
    }

    r.text(cx, cy + 5, `${this.temperature}K`, {
      fill: this.temperature < this.criticalTemp ? colors.superconductor : colors.error,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
  }

  private renderNavigation(r: CommandRenderer): void {
    const idx = this.phaseOrder.indexOf(this.phase);

    if (idx > 0) {
      r.addButton({ id: 'back', label: '← Back', variant: 'secondary' });
    }

    if (idx < this.phaseOrder.length - 1) {
      const canAdvance = this.canAdvance();
      r.addButton({
        id: 'next',
        label: 'Continue →',
        variant: canAdvance ? 'primary' : 'secondary',
        disabled: !canAdvance
      });
    }

    // Simulation controls for play phases
    if (this.phase === 'play' || this.phase === 'hook') {
      r.addButton({
        id: this.isAnimating ? 'stop' : 'start',
        label: this.isAnimating ? 'Stop' : 'Start',
        variant: 'secondary'
      });
      r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
    }

    // Temperature controls for twist_play
    if (this.phase === 'twist_play') {
      r.addButton({ id: 'cool', label: '❄️ Cool', variant: 'secondary' });
      r.addButton({ id: 'warm', label: '🔥 Warm', variant: 'secondary' });
    }

    // Test navigation
    if (this.phase === 'test' && !this.testSubmitted) {
      if (this.currentTestQuestion > 0) {
        r.addButton({ id: 'test_prev', label: '← Prev', variant: 'secondary' });
      }
      if (this.currentTestQuestion < testQuestions.length - 1) {
        r.addButton({ id: 'test_next', label: 'Next →', variant: 'secondary' });
      } else {
        const allAnswered = this.testAnswers.every(a => a !== null);
        r.addButton({
          id: 'test_submit',
          label: 'Submit',
          variant: allAnswered ? 'primary' : 'secondary',
          disabled: !allAnswered
        });
      }
    }

    // Progress indicator
    r.setProgress({
      id: 'phase_progress',
      current: idx,
      total: this.phaseOrder.length,
      labels: this.phaseOrder.map(p => p.replace('_', ' '))
    });
  }

  private canAdvance(): boolean {
    switch (this.phase) {
      case 'predict':
        return this.prediction !== null;
      case 'twist_predict':
        return this.twistPrediction !== null;
      case 'test':
        return this.testSubmitted;
      case 'transfer':
        return this.currentTransferIndex >= transferApps.length - 1;
      default:
        return true;
    }
  }

  // State management
  getCurrentPhase(): string {
    return this.phase;
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      magnetPosition: this.magnetPosition,
      magnetVelocity: this.magnetVelocity,
      magnetFieldStrength: this.magnetFieldStrength,
      coilTurns: this.coilTurns,
      currentEMF: this.currentEMF,
      isAnimating: this.isAnimating,
      isSuperconducting: this.isSuperconducting,
      trappedFlux: this.trappedFlux,
      temperature: this.temperature,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      currentTransferIndex: this.currentTransferIndex,
      currentTestQuestion: this.currentTestQuestion,
      testAnswers: this.testAnswers,
      testSubmitted: this.testSubmitted
    };
  }

  restoreState(state: Record<string, unknown>): void {
    this.phase = (state.phase as GamePhase) || 'hook';
    this.magnetPosition = (state.magnetPosition as number) || 0.2;
    this.magnetVelocity = (state.magnetVelocity as number) || 0.3;
    this.magnetFieldStrength = (state.magnetFieldStrength as number) || 0.5;
    this.coilTurns = (state.coilTurns as number) || 100;
    this.currentEMF = (state.currentEMF as number) || 0;
    this.isAnimating = (state.isAnimating as boolean) ?? true;
    this.isSuperconducting = (state.isSuperconducting as boolean) || false;
    this.trappedFlux = (state.trappedFlux as number) || 0;
    this.temperature = (state.temperature as number) || 300;
    this.prediction = (state.prediction as string) || null;
    this.twistPrediction = (state.twistPrediction as string) || null;
    this.currentTransferIndex = (state.currentTransferIndex as number) || 0;
    this.currentTestQuestion = (state.currentTestQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || new Array(testQuestions.length).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
  }
}

export function createElectromagneticInductionGame(sessionId: string): ElectromagneticInductionGame {
  return new ElectromagneticInductionGame(sessionId);
}
