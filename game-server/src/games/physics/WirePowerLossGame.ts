/**
 * Wire Power Loss Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP - Physics Formulas:
 * - Power loss: P = I^2 * R (Joule heating)
 * - Wire resistance: R = rho * L / A (resistivity * length / area)
 * - Power transmission: P = V * I
 * - Higher voltage = lower current = less loss for same power
 * - Temperature rise: delta_T = P_loss * thermal_resistance
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
    question: 'Power loss in a wire is given by P = I^2 * R. This means loss depends on:',
    options: [
      'Current linearly',
      'Current squared',
      'Voltage squared',
      'Resistance squared',
    ],
    correctIndex: 1,
  },
  {
    question: 'If current doubles, power loss in the wire:',
    options: [
      'Doubles',
      'Quadruples (4x)',
      'Halves',
      'Stays the same',
    ],
    correctIndex: 1,
  },
  {
    question: 'Why do power lines use very high voltages (hundreds of kV)?',
    options: [
      'To make electricity travel faster',
      'To reduce current and minimize I^2*R losses',
      'Because generators produce high voltage',
      'To make the lines glow',
    ],
    correctIndex: 1,
  },
  {
    question: 'A thicker wire has lower resistance because:',
    options: [
      'It weighs more',
      'It has larger cross-sectional area (R = rho*L/A)',
      'It is made of better material',
      'It is shorter',
    ],
    correctIndex: 1,
  },
  {
    question: 'If you need to transmit 1000 W over a long distance, which option loses less power?',
    options: [
      '100 V at 10 A',
      '1000 V at 1 A',
      '10 V at 100 A',
      'All lose the same amount',
    ],
    correctIndex: 1,
  },
  {
    question: 'The wire gets hot when carrying current because:',
    options: [
      'Electrons are hot',
      'Electrical energy converts to heat (Joule heating)',
      'The wire is painted red',
      'Magnetism creates heat',
    ],
    correctIndex: 1,
  },
  {
    question: 'What is the unit of electrical resistance?',
    options: [
      'Watts',
      'Ohms',
      'Amperes',
      'Volts',
    ],
    correctIndex: 1,
  },
  {
    question: 'Wire gauge (thickness) affects resistance. Thinner wire has:',
    options: [
      'Lower resistance',
      'Higher resistance',
      'Same resistance',
      'No resistance',
    ],
    correctIndex: 1,
  },
  {
    question: 'Transformers are used in power transmission to:',
    options: [
      'Generate electricity',
      'Step up voltage for efficient transmission',
      'Store electricity',
      'Cool down the wires',
    ],
    correctIndex: 1,
  },
  {
    question: 'If a wire has 10 ohms resistance and carries 3 A, the power loss is:',
    options: [
      '30 W',
      '90 W (P = I^2 * R = 9 * 10)',
      '300 W',
      '3 W',
    ],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#f59e0b', // Amber
  primaryDark: '#d97706',
  accent: '#3b82f6', // Blue
  accentDark: '#2563eb',
  hot: '#ef4444', // Red for heat
  cool: '#22c55e', // Green for efficient
  wire: '#71717a', // Gray for wire
  current: '#facc15', // Yellow for current flow
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

// === MAIN GAME CLASS ===

export class WirePowerLossGame extends BaseGame {
  readonly gameType = 'wire_power_loss';
  readonly gameTitle = 'Wire Power Loss';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state (PROTECTED - server only)
  private time = 0;
  private isSimulating = false;

  // Wire parameters
  private wireGauge: 'thin' | 'medium' | 'thick' = 'medium';
  private wireLength = 100; // meters
  private current = 5; // Amperes

  // Transmission parameters (for twist phase)
  private transmissionPower = 1000; // Watts
  private transmissionVoltage: 'low' | 'high' = 'low'; // 120V vs 12000V

  // Physical constants (PROTECTED)
  private readonly gaugeResistances: Record<string, number> = {
    thin: 1.0, // ohms per meter
    medium: 0.3,
    thick: 0.1,
  };
  private readonly lineResistance = 10; // ohms for transmission line

  // Calculated values (PROTECTED - computed on server)
  private wireResistance = 0;
  private powerLoss = 0;
  private wireTemperature = 20; // Celsius
  private efficiency = 0;
  private transmissionLoss = 0;

  // Animation state
  private animationPhase = 0;
  private showLabels = true;
  private showHeat = true;
  private electronPositions: number[] = [];

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
    twist_play: 'High Voltage',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Why do power lines carry electricity at hundreds of thousands of volts?',
    predict: 'What happens to wire losses when you increase current?',
    play: 'Adjust current and wire thickness to see power loss change!',
    review: 'P = I^2 * R explains why current matters so much.',
    twist_predict: 'How can we reduce losses when transmitting power far?',
    twist_play: 'Compare low voltage vs high voltage transmission!',
    twist_review: 'Higher voltage = lower current = less I^2*R loss!',
    transfer: 'Power loss affects everything from phone chargers to power grids.',
    test: 'Test your understanding of electrical power loss!',
    mastery: 'You understand why power transmission uses high voltage!',
  };

  constructor(sessionId: string) {
    super(sessionId);
    this.initElectrons();
    this.calculatePowerLoss();
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
      message: 'Wire Power Loss lesson started',
    });
  }

  private initElectrons(): void {
    this.electronPositions = [];
    for (let i = 0; i < 10; i++) {
      this.electronPositions.push(Math.random() * 400);
    }
  }

  // === PROTECTED PHYSICS CALCULATIONS ===

  /**
   * PROTECTED: Calculate wire resistance
   * R = resistivity_per_meter * length
   */
  private getWireResistance(): number {
    const gaugeResistance = this.gaugeResistances[this.wireGauge];
    return gaugeResistance * this.wireLength;
  }

  /**
   * PROTECTED: Calculate power loss
   * P = I^2 * R (Joule heating)
   */
  private calculatePowerLoss(): void {
    this.wireResistance = this.getWireResistance();

    // P = I^2 * R
    this.powerLoss = this.current * this.current * this.wireResistance;

    // Temperature rise (simplified model)
    this.wireTemperature = 20 + this.powerLoss * 0.05;

    // Efficiency (if we know input power)
    const inputPower = 120 * this.current; // Assuming 120V source
    this.efficiency = inputPower > 0 ? ((inputPower - this.powerLoss) / inputPower) * 100 : 100;

    // Transmission loss calculation
    this.calculateTransmissionLoss();
  }

  /**
   * PROTECTED: Calculate transmission loss for high vs low voltage
   */
  private calculateTransmissionLoss(): void {
    const voltage = this.transmissionVoltage === 'low' ? 120 : 12000;
    const lineCurrent = this.transmissionPower / voltage;
    this.transmissionLoss = lineCurrent * lineCurrent * this.lineResistance;
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

    // Wire gauge selection
    if (id === 'gauge_thin') {
      this.wireGauge = 'thin';
      this.calculatePowerLoss();
      return;
    }
    if (id === 'gauge_medium') {
      this.wireGauge = 'medium';
      this.calculatePowerLoss();
      return;
    }
    if (id === 'gauge_thick') {
      this.wireGauge = 'thick';
      this.calculatePowerLoss();
      return;
    }

    // Voltage selection
    if (id === 'voltage_low') {
      this.transmissionVoltage = 'low';
      this.calculatePowerLoss();
      return;
    }
    if (id === 'voltage_high') {
      this.transmissionVoltage = 'high';
      this.calculatePowerLoss();
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
    if (id === 'heat') {
      this.showHeat = value;
      return;
    }
    if (id === 'guided_mode') {
      this.guidedMode = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'current') {
      this.current = clamp(value, 0.5, 20);
      this.calculatePowerLoss();
      this.emitCoachEvent('value_changed', {
        current: this.current,
        powerLoss: this.powerLoss,
      });
      return;
    }
    if (id === 'wire_length') {
      this.wireLength = clamp(value, 10, 500);
      this.calculatePowerLoss();
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
      hook: 'Electricity loses energy as heat in wires.',
      predict: 'Think about P = I^2 * R - what happens when I doubles?',
      play: 'Notice how current affects loss much more than wire thickness.',
      review: 'The I^2 term is why current reduction is so important.',
      twist_predict: 'P = V * I means same power at higher V needs lower I.',
      twist_play: 'Compare the current needed at 120V vs 12,000V.',
      twist_review: 'This is why power grids use transformers!',
      transfer: 'Every electrical system must manage power loss.',
      test: 'Remember: P_loss = I^2 * R and P_transmitted = V * I.',
      mastery: 'You understand electrical power transmission!',
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
    this.animationPhase += deltaTime * 0.01;

    // Animate electrons
    const speed = this.current * 0.5;
    for (let i = 0; i < this.electronPositions.length; i++) {
      this.electronPositions[i] += speed * (deltaTime / 16);
      if (this.electronPositions[i] > 400) {
        this.electronPositions[i] = 0;
      }
    }
  }

  private resetSimulation(): void {
    this.time = 0;
    this.animationPhase = 0;
    this.isSimulating = false;
    this.current = 5;
    this.wireGauge = 'medium';
    this.wireLength = 100;
    this.transmissionVoltage = 'low';
    this.initElectrons();
    this.calculatePowerLoss();
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
    r.text(350, 60, 'Wire Power Loss', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 95, 'Why do power lines use extremely high voltages?', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    // Power line illustration
    this.renderPowerLineDemo(r, 350, 200);

    r.text(350, 320, 'The answer involves P = I^2 * R!', {
      fill: colors.primary,
      fontSize: 14,
      textAnchor: 'middle',
    });
  }

  private renderPowerLineDemo(r: CommandRenderer, cx: number, cy: number): void {
    // Power tower left
    r.rect(cx - 180, cy - 40, 30, 80, {
      fill: colors.bgCardLight,
      stroke: colors.border,
    });
    r.line(cx - 165, cy - 40, cx - 165, cy - 60, { stroke: colors.wire, strokeWidth: 3 });

    // Power lines
    r.line(cx - 165, cy - 50, cx + 165, cy - 50, { stroke: colors.wire, strokeWidth: 3 });
    r.line(cx - 165, cy - 30, cx + 165, cy - 30, { stroke: colors.wire, strokeWidth: 3 });
    r.line(cx - 165, cy - 10, cx + 165, cy - 10, { stroke: colors.wire, strokeWidth: 3 });

    // Power tower right
    r.rect(cx + 150, cy - 40, 30, 80, {
      fill: colors.bgCardLight,
      stroke: colors.border,
    });
    r.line(cx + 165, cy - 40, cx + 165, cy - 60, { stroke: colors.wire, strokeWidth: 3 });

    // Voltage labels
    r.text(cx, cy - 70, '500,000 V', {
      fill: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Heat indication
    r.text(cx, cy + 60, 'Some power is lost as heat...', {
      fill: colors.hot,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 90, 'A wire carries 5 A and loses 25 W as heat.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 115, 'If current doubles to 10 A, what is the power loss?', {
      fill: colors.accent,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Visual
    r.rect(150, 150, 400, 100, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });

    r.text(250, 190, '5 A -> 25 W', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 190, 'then', {
      fill: colors.textMuted,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(450, 190, '10 A -> ? W', {
      fill: colors.accent,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 230, 'Hint: P = I^2 * R', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderPlay(r: CommandRenderer): void {
    const isTwist = this.phase === 'twist_play';

    // Wire visualization
    this.renderWireVisualization(r, 350, 140);

    // Stats panel
    r.rect(480, 30, 200, 150, {
      fill: colors.bgCard + 'dd',
      stroke: colors.border,
      rx: 8,
    });

    r.text(490, 55, `Current: ${this.current.toFixed(1)} A`, {
      fill: colors.current,
      fontSize: 14,
      fontWeight: 'bold',
    });

    r.text(490, 80, `Resistance: ${this.wireResistance.toFixed(1)} ohms`, {
      fill: colors.textSecondary,
      fontSize: 12,
    });

    r.text(490, 105, `Power Loss: ${this.powerLoss.toFixed(1)} W`, {
      fill: colors.hot,
      fontSize: 16,
      fontWeight: 'bold',
    });

    r.text(490, 130, `Wire Temp: ${this.wireTemperature.toFixed(0)} C`, {
      fill: this.wireTemperature > 50 ? colors.hot : colors.textSecondary,
      fontSize: 12,
    });

    r.text(490, 155, `Efficiency: ${this.efficiency.toFixed(1)}%`, {
      fill: this.efficiency > 90 ? colors.success : colors.warning,
      fontSize: 12,
    });

    if (isTwist) {
      // Transmission comparison
      this.renderTransmissionComparison(r, 350, 280);
    }
  }

  private renderWireVisualization(r: CommandRenderer, cx: number, cy: number): void {
    // Wire
    const wireThickness = this.wireGauge === 'thin' ? 8 : this.wireGauge === 'medium' ? 16 : 24;
    const wireColor = this.showHeat && this.wireTemperature > 30 ?
      `rgb(${Math.min(255, 100 + this.wireTemperature * 3)}, ${Math.max(0, 100 - this.wireTemperature)}, ${Math.max(0, 100 - this.wireTemperature)})` :
      colors.wire;

    r.rect(cx - 200, cy - wireThickness / 2, 400, wireThickness, {
      fill: wireColor,
      stroke: colors.border,
      rx: wireThickness / 4,
    });

    // Electron flow animation
    if (this.isSimulating) {
      for (const pos of this.electronPositions) {
        const electronX = cx - 200 + pos;
        if (electronX < cx + 200) {
          r.circle(electronX, cy, 4, {
            fill: colors.current,
            opacity: 0.8,
          });
        }
      }
    }

    // Heat glow
    if (this.showHeat && this.powerLoss > 10) {
      const glowIntensity = Math.min(0.5, this.powerLoss / 200);
      r.rect(cx - 200, cy - wireThickness, 400, wireThickness * 2, {
        fill: colors.hot,
        opacity: glowIntensity,
        rx: wireThickness / 2,
      });
    }

    // Labels
    if (this.showLabels) {
      r.text(cx - 220, cy, 'I ->', {
        fill: colors.current,
        fontSize: 14,
        fontWeight: 'bold',
      });
      r.text(cx + 210, cy, '-> I', {
        fill: colors.current,
        fontSize: 14,
        fontWeight: 'bold',
      });
      r.text(cx, cy + 30, `Wire: ${this.wireGauge} gauge, ${this.wireLength}m`, {
        fill: colors.textMuted,
        fontSize: 11,
        textAnchor: 'middle',
      });
    }

    // Formula visualization
    r.text(cx, cy - 50, `P = I^2 * R = ${this.current.toFixed(1)}^2 * ${this.wireResistance.toFixed(1)} = ${this.powerLoss.toFixed(1)} W`, {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTransmissionComparison(r: CommandRenderer, cx: number, cy: number): void {
    r.rect(cx - 280, cy - 35, 560, 70, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 10,
    });

    // Low voltage
    const lowV = 120;
    const lowI = this.transmissionPower / lowV;
    const lowLoss = lowI * lowI * this.lineResistance;

    r.text(cx - 200, cy - 15, 'Low Voltage (120 V)', {
      fill: colors.textSecondary,
      fontSize: 12,
      fontWeight: 'bold',
    });
    r.text(cx - 200, cy + 5, `I = ${lowI.toFixed(1)} A`, { fill: colors.current, fontSize: 11 });
    r.text(cx - 200, cy + 20, `Loss = ${lowLoss.toFixed(0)} W`, { fill: colors.hot, fontSize: 11 });

    // High voltage
    const highV = 12000;
    const highI = this.transmissionPower / highV;
    const highLoss = highI * highI * this.lineResistance;

    r.text(cx + 120, cy - 15, 'High Voltage (12,000 V)', {
      fill: colors.success,
      fontSize: 12,
      fontWeight: 'bold',
    });
    r.text(cx + 120, cy + 5, `I = ${highI.toFixed(3)} A`, { fill: colors.current, fontSize: 11 });
    r.text(cx + 120, cy + 20, `Loss = ${highLoss.toFixed(2)} W`, { fill: colors.success, fontSize: 11 });

    // Comparison arrow
    r.text(cx, cy, `${(lowLoss / highLoss).toFixed(0)}x less!`, {
      fill: colors.success,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderReview(r: CommandRenderer): void {
    const isMainReview = this.phase === 'review';

    r.text(350, 50, isMainReview ? 'Power Loss Formula' : 'High Voltage Transmission', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (isMainReview) {
      const concepts = [
        { title: 'P = I^2 * R', desc: 'Power loss scales with current SQUARED', color: colors.primary },
        { title: 'Double Current = 4x Loss', desc: 'The I^2 term makes current critical', color: colors.hot },
        { title: 'Thicker Wire = Lower R', desc: 'Resistance decreases with cross-sectional area', color: colors.success },
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
        { title: 'P = V * I', desc: 'Same power at higher V needs lower I', color: colors.primary },
        { title: 'Transformers', desc: 'Step up voltage for transmission, step down for use', color: colors.success },
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

      r.text(350, 290, 'This is why power grids use 100,000+ volts!', {
        fill: colors.accent,
        fontSize: 14,
        textAnchor: 'middle',
      });
    }
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 50, 'The Transmission Challenge', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 90, 'You need to transmit 1000 W over a long wire.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 115, 'How can you reduce the power lost to heat?', {
      fill: colors.accent,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(200, 150, 300, 100, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 12,
    });

    r.text(350, 180, 'Remember: P_loss = I^2 * R', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 210, 'And: P_transmitted = V * I', {
      fill: colors.primary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 235, 'How can we reduce I?', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTransfer(r: CommandRenderer): void {
    const apps = [
      { name: 'Power Grid', desc: 'High voltage transmission saves billions in losses' },
      { name: 'USB Charging', desc: 'Thicker cables handle more current with less loss' },
      { name: 'Electric Vehicles', desc: 'Fast chargers use high voltage to reduce heat' },
      { name: 'Data Centers', desc: 'Power distribution optimized to minimize waste' },
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

      r.text(350, 200, passed ? 'You understand power loss in wires!' : 'Review P = I^2 * R.', {
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

    r.text(350, 150, 'Power Transmission Master!', {
      fill: colors.primary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 190, 'You understand electrical power loss and transmission!', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: '(P=I^2R)', label: 'Joule Heating' },
      { icon: '(V)', label: 'High Voltage' },
      { icon: '(R)', label: 'Resistance' },
      { icon: '(app)', label: 'Applications' },
    ];

    badges.forEach((badge, i) => {
      r.rect(90 + i * 135, 230, 120, 70, {
        fill: colors.bgCard,
        stroke: colors.success,
        rx: 10,
      });
      r.text(150 + i * 135, 255, badge.icon, {
        fontSize: 16,
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
          id: 'predict_50',
          label: '50 W (2x)',
          variant: this.prediction === '50' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_100',
          label: '100 W (4x)',
          variant: this.prediction === '100' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_25',
          label: '25 W (same)',
          variant: this.prediction === '25' ? 'primary' : 'secondary',
        });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'See Result', variant: 'success' });
        }
        break;

      case 'play':
      case 'twist_play':
        r.addSlider({
          id: 'current',
          label: 'Current (A)',
          value: this.current,
          min: 0.5,
          max: 20,
        });
        r.addButton({
          id: 'gauge_thin',
          label: 'Thin',
          variant: this.wireGauge === 'thin' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'gauge_medium',
          label: 'Medium',
          variant: this.wireGauge === 'medium' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'gauge_thick',
          label: 'Thick',
          variant: this.wireGauge === 'thick' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: this.isSimulating ? 'stop' : 'start',
          label: this.isSimulating ? 'Stop' : 'Animate',
          variant: 'primary',
        });
        r.addToggle({ id: 'labels', label: 'Labels', value: this.showLabels });
        r.addToggle({ id: 'heat', label: 'Heat', value: this.showHeat });
        if (this.time > 2) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'twist_predict':
        r.addButton({
          id: 'twist_thicker',
          label: 'Use thicker wire',
          variant: this.twistPrediction === 'thicker' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_voltage',
          label: 'Use higher voltage',
          variant: this.twistPrediction === 'voltage' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_both',
          label: 'Both help',
          variant: this.twistPrediction === 'both' ? 'primary' : 'secondary',
        });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Grid', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'USB', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'EV', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Data', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
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
      wireGauge: this.wireGauge,
      wireLength: this.wireLength,
      current: this.current,
      transmissionVoltage: this.transmissionVoltage,
      powerLoss: this.powerLoss,
      wireTemperature: this.wireTemperature,
      time: this.time,
      isSimulating: this.isSimulating,
      showLabels: this.showLabels,
      showHeat: this.showHeat,
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
    this.wireGauge = state.wireGauge || 'medium';
    this.wireLength = state.wireLength || 100;
    this.current = state.current || 5;
    this.transmissionVoltage = state.transmissionVoltage || 'low';
    this.time = state.time || 0;
    this.isSimulating = state.isSimulating || false;
    this.showLabels = state.showLabels ?? true;
    this.showHeat = state.showHeat ?? true;
    this.testQuestion = state.testQuestion || 0;
    this.testAnswers = state.testAnswers || Array(10).fill(null);
    this.testSubmitted = state.testSubmitted || false;
    this.selectedApp = state.selectedApp || 0;
    this.completedApps = state.completedApps || [false, false, false, false];
    this.guidedMode = state.guidedMode ?? true;
    this.initElectrons();
    this.calculatePowerLoss();
  }
}

// === FACTORY FUNCTION ===
export function createWirePowerLossGame(sessionId: string): WirePowerLossGame {
  return new WirePowerLossGame(sessionId);
}
