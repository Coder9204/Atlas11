/**
 * Ohm's Law Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Ohm's Law: V = IR (voltage = current * resistance)
 * - Power formulas: P = VI = I²R = V²/R
 * - Series resistance: R_total = R1 + R2 + ...
 * - Parallel resistance: 1/R_total = 1/R1 + 1/R2 + ...
 * - All test questions and correct answers
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

interface ElectronPosition {
  pos: number; // 0-100 percentage along circuit path
}

interface TestQuestion {
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string;
  stats: { value: string; label: string }[];
  examples: string[];
  companies: string[];
  futureImpact: string;
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
  bgDark: '#0a0f1a',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  yellow: '#fbbf24',
  blue: '#60a5fa',
  purple: '#a855f7',
  orange: '#f97316',
  green: '#22c55e',
  red: '#ef4444',
};

// === TEST QUESTIONS (PROTECTED - never sent to client) ===
const testQuestions: TestQuestion[] = [
  {
    scenario: 'A 9V battery is connected to a resistor. An ammeter shows 0.5A of current flowing.',
    question: 'What is the resistance of the resistor?',
    options: ['4.5 Ohms', '9 Ohms', '18 Ohms', '0.056 Ohms'],
    correctIndex: 2,
    explanation:
      'Using V = IR, we get R = V/I = 9V / 0.5A = 18 Ohms. This is a direct application of Ohm\'s Law rearranged to solve for resistance.',
  },
  {
    scenario: 'A light bulb rated at 60W operates on household voltage (120V).',
    question: 'What current flows through the bulb when it\'s on?',
    options: ['0.25 A', '0.5 A', '2 A', '7200 A'],
    correctIndex: 1,
    explanation:
      'Power P = V * I, so I = P/V = 60W/120V = 0.5A. The bulb draws half an amp of current. You can verify: 120V * 0.5A = 60W.',
  },
  {
    scenario: 'You double the voltage across a fixed resistor.',
    question: 'What happens to the current?',
    options: ['Current stays the same', 'Current halves', 'Current doubles', 'Current quadruples'],
    correctIndex: 2,
    explanation:
      'Since I = V/R and R is constant, doubling V doubles I. Current and voltage are directly proportional when resistance is fixed. This is the essence of Ohm\'s Law.',
  },
  {
    scenario: 'You add more resistance to a circuit while keeping voltage constant.',
    question: 'What happens to the current flow?',
    options: ['Current increases', 'Current decreases', 'Current stays the same', 'The circuit explodes'],
    correctIndex: 1,
    explanation:
      'I = V/R. With constant V and increasing R, current I must decrease. More resistance means more opposition to current flow - like a narrower pipe carrying less water.',
  },
  {
    scenario: 'A car headlight draws 5A from a 12V battery.',
    question: 'What is the resistance of the headlight filament and how much power does it use?',
    options: ['2.4 Ohms, 60W', '60 Ohms, 2.4W', '0.42 Ohms, 720W', '12 Ohms, 5W'],
    correctIndex: 0,
    explanation:
      'R = V/I = 12V/5A = 2.4 Ohms. Power P = V * I = 12V * 5A = 60W. You can verify: P = I^2*R = 25 * 2.4 = 60W.',
  },
  {
    scenario: 'Two resistors of 10 Ohms each are connected in series to a 20V source.',
    question: 'What is the total current in the circuit?',
    options: ['0.5 A', '1 A', '2 A', '4 A'],
    correctIndex: 1,
    explanation:
      'In series, resistances add: R_total = 10 + 10 = 20 Ohms. Then I = V/R = 20V/20Ohm = 1A. The same 1A flows through both resistors.',
  },
  {
    scenario: 'A smartphone charger outputs 5V and can deliver up to 2A.',
    question: 'What is the minimum resistance the phone can present to draw maximum current?',
    options: ['10 Ohms', '2.5 Ohms', '0.4 Ohms', '7 Ohms'],
    correctIndex: 1,
    explanation:
      'R = V/I = 5V/2A = 2.5 Ohms. If the phone\'s effective resistance is lower than 2.5 Ohms, it would try to draw more than 2A, which the charger can\'t provide safely.',
  },
  {
    scenario: 'A 1000 Ohm (1k Ohm) resistor has 5V across it.',
    question: 'What current flows through it?',
    options: ['0.5 A', '0.05 A (50 mA)', '0.005 A (5 mA)', '5000 A'],
    correctIndex: 2,
    explanation:
      'I = V/R = 5V/1000Ohm = 0.005A = 5mA. High resistance (1k Ohm) with moderate voltage (5V) results in small current - perfect for LED circuits!',
  },
  {
    scenario: 'An electric heater uses 10A at 240V.',
    question: 'What is its resistance and power consumption?',
    options: ['24 Ohms, 2400W', '2400 Ohms, 24W', '0.042 Ohms, 57,600W', '2.4 Ohms, 240W'],
    correctIndex: 0,
    explanation:
      'R = V/I = 240V/10A = 24 Ohms. Power P = V * I = 240V * 10A = 2400W = 2.4kW. This is why heaters need dedicated circuits - they draw a lot of power!',
  },
  {
    scenario: 'The human body has roughly 1000 Ohms internal resistance when wet.',
    question: 'If someone touches 120V with wet hands, what current would flow through their body?',
    options: [
      '0.012 A (12 mA) - potentially lethal!',
      '0.12 A (120 mA) - definitely lethal!',
      '1.2 A - instant death',
      '0.0012 A (1.2 mA) - barely felt',
    ],
    correctIndex: 1,
    explanation:
      'I = V/R = 120V/1000Ohm = 0.12A = 120mA. Currents above 10mA can cause painful shock, and 100mA+ through the heart is often fatal. This is why water and electricity don\'t mix!',
  },
];

// === TRANSFER APPLICATIONS (PROTECTED content) ===
const applications: TransferApp[] = [
  {
    icon: '💡',
    title: 'LED Lighting Design',
    short: 'LED Circuits',
    tagline: 'Why every LED needs a resistor',
    description:
      'LEDs require precise current control - too much current destroys them, too little won\'t light them. Ohm\'s Law determines the resistor value needed.',
    connection:
      'LEDs have a fixed forward voltage drop (typically 2-3V). Using V = IR, engineers calculate the resistor needed: R = (V_supply - V_LED) / I_LED.',
    howItWorks:
      'For a 5V supply and LED needing 20mA at 2V drop: R = (5V - 2V) / 0.02A = 150 Ohms. This current-limiting resistor protects the LED from burning out.',
    stats: [
      { value: '20 mA', label: 'Typical LED current' },
      { value: '150 Ohm', label: 'Common resistor value' },
      { value: '2-3V', label: 'LED voltage drop' },
      { value: '100,000+ hrs', label: 'LED lifespan with proper design' },
    ],
    examples: ['Indicator lights on electronics', 'Automotive LED assemblies', 'Architectural lighting', 'Display backlighting'],
    companies: ['Cree', 'Philips', 'Osram', 'Samsung LED'],
    futureImpact:
      'Smart LED systems with dynamic current control can adjust brightness and color temperature while maximizing efficiency and lifespan.',
  },
  {
    icon: '🔌',
    title: 'Home Electrical Safety',
    short: 'Wire Sizing',
    tagline: 'Why your house hasn\'t burned down',
    description:
      'Electrical wires have resistance that generates heat when current flows. Ohm\'s Law helps engineers size wires to safely carry required current.',
    connection:
      'Wire resistance causes power loss as heat: P = I^2*R. Higher current needs thicker (lower resistance) wire to prevent overheating and fires.',
    howItWorks:
      'A 15A circuit uses 14 AWG wire (2.5m Ohm/ft resistance). With 50ft of wire: R = 0.25 Ohm, Power loss = 15^2 * 0.25 = 56W. Thicker 12 AWG for 20A circuits reduces this further.',
    stats: [
      { value: '15A/20A', label: 'Typical home circuits' },
      { value: '14/12 AWG', label: 'Wire gauges used' },
      { value: '3%', label: 'Max acceptable voltage drop' },
      { value: '60 C', label: 'Wire insulation rating' },
    ],
    examples: ['Kitchen appliance circuits', 'HVAC system wiring', 'Electric vehicle charging', 'Industrial power distribution'],
    companies: ['Southwire', 'Romex', 'Belden', 'General Cable'],
    futureImpact:
      'Smart home systems monitor current draw per circuit, detecting anomalies that indicate damaged wiring before fires occur.',
  },
  {
    icon: '🔋',
    title: 'Battery Management',
    short: 'Power Systems',
    tagline: 'How phones know their battery level',
    description:
      'Batteries have internal resistance that affects voltage output under load. Measuring voltage and current reveals both charge state and battery health.',
    connection:
      'A battery\'s terminal voltage V_terminal = V_internal - I * R_internal. Under heavy load (high I), voltage drops more if R_internal is high (old battery).',
    howItWorks:
      'Phone batteries have ~100m Ohm internal resistance when new. Drawing 2A: voltage drop = 2A * 0.1 Ohm = 0.2V. As batteries age, R increases, causing bigger voltage sags.',
    stats: [
      { value: '~100 mOhm', label: 'New Li-ion internal R' },
      { value: '~300 mOhm', label: 'Degraded battery R' },
      { value: '80%', label: 'Capacity at 500 cycles' },
      { value: '4.2V', label: 'Full charge voltage' },
    ],
    examples: ['Smartphone battery health indicators', 'Electric vehicle range estimation', 'UPS backup power systems', 'Laptop power management'],
    companies: ['Tesla', 'Panasonic', 'LG Energy', 'CATL'],
    futureImpact:
      'AI-powered battery management systems use continuous Ohm\'s Law measurements to predict battery failure and optimize charging strategies.',
  },
  {
    icon: '🎸',
    title: 'Audio Electronics',
    short: 'Audio Design',
    tagline: 'How volume knobs and tone controls work',
    description:
      'Audio equipment uses variable resistors (potentiometers) to control volume and tone. Ohm\'s Law governs signal levels and speaker impedance matching.',
    connection:
      'A volume pot acts as a voltage divider: V_out = V_in * (R2 / (R1 + R2)). As you turn the knob, you change the ratio and thus the output voltage (volume).',
    howItWorks:
      'Speaker impedance (typically 4-8 Ohm) must match amplifier output. Power delivered: P = V^2/R. An 8 Ohm speaker with 20V signal gets 50W. A 4 Ohm speaker would get 100W - potentially damaging!',
    stats: [
      { value: '4-8 Ohm', label: 'Speaker impedance' },
      { value: '10k-100k Ohm', label: 'Volume pot range' },
      { value: '1-1000 W', label: 'Amplifier power range' },
      { value: '20-20kHz', label: 'Audio frequency range' },
    ],
    examples: ['Guitar amplifiers and effects pedals', 'Home theater systems', 'Studio mixing consoles', 'Headphone amplifiers'],
    companies: ['Fender', 'Marshall', 'Bose', 'JBL'],
    futureImpact:
      'Digital-analog hybrid audio systems use precision resistor networks for audiophile-quality sound reproduction with digital convenience.',
  },
];

// === MAIN GAME CLASS ===

export class OhmsLawGame extends BaseGame {
  readonly gameType = 'ohms_law';
  readonly gameTitle = 'Ohm\'s Law';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Circuit simulation state (PROTECTED physics)
  private voltage = 12; // Volts
  private resistance = 6; // Ohms
  private current = 2; // Amps (calculated from V = IR)
  private isCircuitOn = true;
  private electronPositions: ElectronPosition[] = [];
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
    play: 'Explore',
    review: 'Review',
    twist_predict: 'Safety',
    twist_play: 'Power',
    twist_review: 'Discovery',
    transfer: 'Apply',
    test: 'Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Welcome! Ohm\'s Law is the fundamental equation of electricity: V = IR.',
    predict: 'What do you think will happen when we double the voltage?',
    play: 'Adjust voltage and resistance to see how current changes. Notice the pattern!',
    review: 'You\'ve discovered that current is proportional to voltage and inversely proportional to resistance.',
    twist_predict: 'What happens when you plug a 120V device into a 240V outlet?',
    twist_play: 'Explore how power changes with voltage. Notice the squared relationship!',
    twist_review: 'Power depends on V squared - doubling voltage quadruples the power!',
    transfer: 'See how Ohm\'s Law applies to LEDs, home wiring, batteries, and audio.',
    test: 'Test your understanding with these real-world circuit problems.',
    mastery: 'Congratulations! You\'ve mastered Ohm\'s Law!',
  };

  constructor(sessionId: string) {
    super(sessionId);
    this.initializeElectrons();
  }

  private initializeElectrons(): void {
    this.electronPositions = Array.from({ length: 12 }, (_, i) => ({
      pos: (i * 100) / 12,
    }));
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
      message: 'Ohm\'s Law lesson started',
    });
  }

  // === PROTECTED PHYSICS CALCULATIONS ===

  /**
   * PROTECTED: Calculate current using Ohm's Law
   * I = V / R
   */
  private calculateCurrent(): number {
    if (this.resistance <= 0) return 0;
    return this.voltage / this.resistance;
  }

  /**
   * PROTECTED: Calculate power using P = VI
   * Also equivalent to P = I^2*R and P = V^2/R
   */
  private calculatePower(): number {
    return this.voltage * this.current;
  }

  /**
   * PROTECTED: Calculate power at wrong voltage
   * For the safety twist phase - shows P = V^2/R relationship
   */
  private calculatePowerAtVoltage(voltage: number, resistance: number): number {
    return (voltage * voltage) / resistance;
  }

  // === INPUT HANDLING ===

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click':
        this.handleButtonClick(input.id!);
        break;
      case 'toggle_change':
        this.handleToggleChange(input.id!, input.value as boolean);
        break;
      case 'slider_change':
        this.handleSliderChange(input.id!, input.value as number);
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

    // Predictions
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      const isCorrect = this.prediction === 'C';
      this.emitCoachEvent('prediction_made', {
        prediction: this.prediction,
        correct: isCorrect,
      });
      return;
    }

    // Twist predictions
    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
      const isCorrect = this.twistPrediction === 'B';
      this.emitCoachEvent('twist_prediction_made', {
        prediction: this.twistPrediction,
        correct: isCorrect,
      });
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

    // Circuit toggle
    if (id === 'circuit_toggle') {
      this.isCircuitOn = !this.isCircuitOn;
      return;
    }

    // Restart from mastery
    if (id === 'restart') {
      this.goToPhase('hook');
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'circuit') {
      this.isCircuitOn = value;
      return;
    }
    if (id === 'guided_mode') {
      this.guidedMode = value;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'voltage') {
      this.voltage = clamp(value, 1, 24);
      this.current = this.calculateCurrent();
      this.emitCoachEvent('voltage_adjusted', { voltage: this.voltage, current: this.current });
      return;
    }
    if (id === 'resistance') {
      this.resistance = clamp(value, 1, 20);
      this.current = this.calculateCurrent();
      this.emitCoachEvent('resistance_adjusted', { resistance: this.resistance, current: this.current });
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

    // Reset states when entering certain phases
    if (newPhase === 'play') {
      this.voltage = 12;
      this.resistance = 6;
      this.current = this.calculateCurrent();
      this.isCircuitOn = true;
    }
    if (newPhase === 'test') {
      this.testQuestion = 0;
      this.testAnswers = Array(10).fill(null);
      this.testSubmitted = false;
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

  // === PHYSICS SIMULATION ===

  update(deltaTime: number): void {
    if (!this.isCircuitOn) return;
    if (this.phase !== 'hook' && this.phase !== 'play' && this.phase !== 'twist_play') return;

    this.time += deltaTime / 1000;

    // Update electron positions based on current
    // Speed is proportional to current (PROTECTED physics)
    const speed = this.current * 2;
    this.electronPositions = this.electronPositions.map((e) => ({
      pos: (e.pos + speed * 0.5 * (deltaTime / 16.67)) % 100,
    }));
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
    r.setViewport(700, 400);

    // Background
    r.clear(colors.bgDark);

    // Ambient gradients
    r.circle(650, -50, 200, { fill: '#06b6d4', opacity: 0.05 });
    r.circle(-50, 200, 200, { fill: '#3b82f6', opacity: 0.05 });
    r.circle(450, 400, 200, { fill: '#fbbf24', opacity: 0.05 });

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

  // --- Circuit Rendering Helper ---

  private renderCircuit(r: CommandRenderer, x: number, y: number, width: number, height: number): void {
    const bulbBrightness = Math.min(this.current / 3, 1);

    // Circuit background
    r.rect(x, y, width, height, { fill: '#0f172a', rx: 10 });

    // Scale factors
    const sx = width / 300;
    const sy = height / 200;

    // Wires (top and bottom paths)
    r.path(`M${x + 50 * sx},${y + 100 * sy} L${x + 50 * sx},${y + 40 * sy} L${x + 250 * sx},${y + 40 * sy} L${x + 250 * sx},${y + 100 * sy}`, {
      fill: 'none',
      stroke: colors.warning,
      strokeWidth: 4,
    });
    r.path(`M${x + 50 * sx},${y + 100 * sy} L${x + 50 * sx},${y + 160 * sy} L${x + 250 * sx},${y + 160 * sy} L${x + 250 * sx},${y + 100 * sy}`, {
      fill: 'none',
      stroke: colors.warning,
      strokeWidth: 4,
    });

    // Battery (left side)
    r.rect(x + 35 * sx, y + 85 * sy, 30 * sx, 30 * sy, { fill: colors.green, rx: 3 });
    r.rect(x + 45 * sx, y + 78 * sy, 10 * sx, 7 * sy, { fill: '#16a34a' });
    r.text(x + 50 * sx, y + 105 * sy, '+', {
      fill: 'white',
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(x + 50 * sx, y + 125 * sy, `${this.voltage}V`, {
      fill: colors.textMuted,
      fontSize: 8,
      textAnchor: 'middle',
    });

    // Resistor (bottom)
    r.rect(x + 120 * sx, y + 152 * sy, 60 * sx, 16 * sy, { fill: '#64748b', rx: 2 });
    // Resistor bands
    r.rect(x + 125 * sx, y + 152 * sy, 6 * sx, 16 * sy, { fill: colors.purple });
    r.rect(x + 140 * sx, y + 152 * sy, 6 * sx, 16 * sy, { fill: colors.blue });
    r.rect(x + 155 * sx, y + 152 * sy, 6 * sx, 16 * sy, { fill: colors.danger });
    r.rect(x + 170 * sx, y + 152 * sy, 4 * sx, 16 * sy, { fill: colors.warning });
    r.text(x + 150 * sx, y + 185 * sy, `${this.resistance} Ohm`, {
      fill: colors.textMuted,
      fontSize: 8,
      textAnchor: 'middle',
    });

    // Light bulb (right side)
    if (this.isCircuitOn && bulbBrightness > 0.1) {
      r.circle(x + 250 * sx, y + 100 * sy, (20 + bulbBrightness * 15) * sx, {
        fill: colors.yellow,
        opacity: bulbBrightness * 0.5,
      });
    }
    r.ellipse(x + 250 * sx, y + 95 * sy, 15 * sx, 18 * sy, {
      fill: this.isCircuitOn ? `rgba(253, 224, 71, ${bulbBrightness})` : '#475569',
      stroke: colors.textMuted,
      strokeWidth: 2,
    });
    r.rect(x + 242 * sx, y + 110 * sy, 16 * sx, 12 * sy, { fill: '#64748b' });

    // Ammeter display (top)
    r.rect(x + 125 * sx, y + 28 * sy, 50 * sx, 24 * sy, {
      fill: colors.bgCardLight,
      stroke: colors.blue,
      strokeWidth: 2,
      rx: 3,
    });
    r.text(x + 150 * sx, y + 45 * sy, `${this.current.toFixed(2)}A`, {
      fill: colors.blue,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Electron flow animation
    if (this.isCircuitOn) {
      this.electronPositions.forEach((e) => {
        const pos = e.pos;
        let ex: number, ey: number;

        if (pos < 25) {
          // Top wire (left to right)
          ex = x + (50 + (pos / 25) * 200) * sx;
          ey = y + 40 * sy;
        } else if (pos < 50) {
          // Right side (top to bottom)
          ex = x + 250 * sx;
          ey = y + (40 + ((pos - 25) / 25) * 120) * sy;
        } else if (pos < 75) {
          // Bottom wire (right to left)
          ex = x + (250 - ((pos - 50) / 25) * 200) * sx;
          ey = y + 160 * sy;
        } else {
          // Left side (bottom to top)
          ex = x + 50 * sx;
          ey = y + (160 - ((pos - 75) / 25) * 120) * sy;
        }

        r.circle(ex, ey, 4, { fill: colors.blue, opacity: 0.8 });
      });
    }

    // Formula label
    r.text(x + 150 * sx, y + 195 * sy, 'V = I x R', {
      fill: colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle',
    });
  }

  // --- Phase Renderers ---

  private renderHook(r: CommandRenderer): void {
    // Premium badge
    r.circle(345, 50, 4, { fill: colors.primary });
    r.text(350, 50, 'Electrical Circuits', {
      fill: `${colors.primary}cc`,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Title
    r.text(350, 90, 'Ohm\'s Law', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 120, 'The fundamental law of electrical circuits', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    // Circuit visualization
    this.renderCircuit(r, 175, 140, 350, 200);

    // Formula display
    r.text(350, 360, 'V = I x R', {
      fill: colors.primary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
      fontFamily: 'monospace',
    });

    // Variable labels
    r.text(280, 385, 'V = Volts', { fill: colors.yellow, fontSize: 11, textAnchor: 'middle' });
    r.text(350, 385, 'I = Amps', { fill: colors.blue, fontSize: 11, textAnchor: 'middle' });
    r.text(420, 385, 'R = Ohms', { fill: colors.purple, fontSize: 11, textAnchor: 'middle' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Scenario
    r.rect(100, 70, 500, 80, { fill: colors.bgCard, rx: 12 });
    r.text(350, 95, 'A circuit has a 12V battery and a 6 Ohm resistor.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 115, 'Currently, 2 Amps of current flows through it.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'If you DOUBLE the voltage to 24V, what happens to the current?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Options
    const options = [
      { id: 'A', text: 'Current stays at 2A' },
      { id: 'B', text: 'Current increases to 3A' },
      { id: 'C', text: 'Current doubles to 4A (I = V/R)' },
      { id: 'D', text: 'Current quadruples to 8A' },
    ];

    options.forEach((opt, i) => {
      const isSelected = this.prediction === opt.id;
      const isCorrect = opt.id === 'C';
      const showFeedback = this.prediction !== null;

      let bgColor = colors.bgCardLight;
      let borderColor = colors.border;

      if (showFeedback) {
        if (isSelected && isCorrect) {
          bgColor = `${colors.success}40`;
          borderColor = colors.success;
        } else if (isSelected && !isCorrect) {
          bgColor = `${colors.danger}40`;
          borderColor = colors.danger;
        } else if (isCorrect) {
          bgColor = `${colors.success}40`;
          borderColor = colors.success;
        }
      } else if (isSelected) {
        bgColor = `${colors.primary}40`;
        borderColor = colors.primary;
      }

      r.rect(100, 165 + i * 50, 500, 42, {
        fill: bgColor,
        stroke: borderColor,
        strokeWidth: 2,
        rx: 8,
        id: `predict_${opt.id}`,
      });
      r.text(120, 190 + i * 50, `${opt.id}.`, {
        fill: colors.textPrimary,
        fontSize: 14,
        fontWeight: 'bold',
      });
      r.text(145, 190 + i * 50, opt.text, {
        fill: colors.textSecondary,
        fontSize: 14,
      });
    });

    // Feedback
    if (this.prediction !== null) {
      r.rect(100, 370, 500, 50, { fill: colors.bgCard, rx: 8 });
      r.text(350, 400, 'I = V/R - current is directly proportional to voltage!', {
        fill: colors.success,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(350, 30, 'Ohm\'s Law Laboratory', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Circuit on left
    this.renderCircuit(r, 30, 50, 280, 180);

    // Controls on right
    r.rect(330, 50, 340, 180, { fill: colors.bgCard, rx: 12 });

    // Voltage slider visualization
    r.text(350, 75, 'Voltage (V)', { fill: colors.yellow, fontSize: 12, fontWeight: 'bold' });
    r.text(650, 75, `${this.voltage} V`, { fill: colors.textPrimary, fontSize: 12, textAnchor: 'end' });
    r.rect(350, 85, 300, 8, { fill: colors.bgCardLight, rx: 4 });
    r.rect(350, 85, ((this.voltage - 1) / 23) * 300, 8, { fill: colors.yellow, rx: 4 });

    // Resistance slider visualization
    r.text(350, 115, 'Resistance (R)', { fill: colors.purple, fontSize: 12, fontWeight: 'bold' });
    r.text(650, 115, `${this.resistance} Ohm`, { fill: colors.textPrimary, fontSize: 12, textAnchor: 'end' });
    r.rect(350, 125, 300, 8, { fill: colors.bgCardLight, rx: 4 });
    r.rect(350, 125, ((this.resistance - 1) / 19) * 300, 8, { fill: colors.purple, rx: 4 });

    // Current display
    r.rect(350, 145, 300, 35, { fill: colors.bgCardLight, rx: 8 });
    r.text(360, 167, 'Current (I)', { fill: colors.blue, fontSize: 12, fontWeight: 'bold' });
    r.text(640, 167, `${this.current.toFixed(2)} A`, {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'end',
    });

    // Power display
    const power = this.calculatePower();
    r.rect(350, 190, 300, 35, { fill: `${colors.orange}20`, rx: 8 });
    r.text(360, 212, 'Power (P = V x I)', { fill: colors.orange, fontSize: 12, fontWeight: 'bold' });
    r.text(640, 212, `${power.toFixed(1)} W`, {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'end',
    });

    // Key relationships
    r.text(350, 260, 'Key Relationships:', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const relationships = [
      { label: 'V = I x R', desc: 'Voltage drives current', color: colors.yellow },
      { label: 'I = V / R', desc: 'More V or less R = more I', color: colors.blue },
      { label: 'R = V / I', desc: 'Resistance opposes flow', color: colors.purple },
    ];

    relationships.forEach((rel, i) => {
      r.rect(80 + i * 190, 280, 175, 50, { fill: colors.bgCard, rx: 8 });
      r.text(167 + i * 190, 300, rel.label, {
        fill: rel.color,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
      r.text(167 + i * 190, 320, rel.desc, {
        fill: colors.textMuted,
        fontSize: 10,
        textAnchor: 'middle',
      });
    });

    // Live equation
    r.rect(200, 340, 300, 35, { fill: `${colors.yellow}20`, rx: 8 });
    r.text(350, 363, `${this.voltage} = ${this.current.toFixed(2)} x ${this.resistance}`, {
      fill: colors.yellow,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
      fontFamily: 'monospace',
    });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(350, 50, 'Understanding V = IR', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Water analogy
    r.rect(50, 80, 290, 150, { fill: `${colors.yellow}20`, rx: 12 });
    r.text(195, 105, 'The Water Analogy', {
      fill: colors.yellow,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    const analogies = [
      { var: 'Voltage', eq: '=', desc: 'Water pressure' },
      { var: 'Current', eq: '=', desc: 'Water flow rate' },
      { var: 'Resistance', eq: '=', desc: 'Pipe narrowness' },
    ];
    analogies.forEach((a, i) => {
      r.text(70, 135 + i * 25, a.var, { fill: colors.yellow, fontSize: 12, fontWeight: 'bold' });
      r.text(155, 135 + i * 25, a.desc, { fill: colors.textSecondary, fontSize: 12 });
    });
    r.text(195, 215, 'Higher pressure -> more flow', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });

    // Triangle diagram
    r.rect(360, 80, 290, 150, { fill: `${colors.blue}20`, rx: 12 });
    r.text(505, 105, 'The Math Triangle', {
      fill: colors.blue,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    // Draw triangle
    r.path('M505,130 L555,200 L455,200 Z', { fill: 'none', stroke: colors.blue, strokeWidth: 2 });
    r.line(455, 170, 555, 170, { stroke: colors.textMuted, strokeWidth: 1 });
    r.text(505, 155, 'V', { fill: colors.yellow, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(475, 190, 'I', { fill: colors.blue, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(535, 190, 'R', { fill: colors.purple, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(505, 220, 'Cover what you want!', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Power relationships
    r.rect(50, 250, 600, 100, { fill: `${colors.success}20`, rx: 12 });
    r.text(350, 275, 'Power Relationships', {
      fill: colors.success,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const powerFormulas = [
      { formula: 'P = V x I', desc: 'Basic power formula' },
      { formula: 'P = I^2 x R', desc: 'Current-focused' },
      { formula: 'P = V^2 / R', desc: 'Voltage-focused' },
    ];

    powerFormulas.forEach((p, i) => {
      r.rect(80 + i * 200, 295, 180, 40, { fill: colors.bgCard, rx: 8 });
      r.text(170 + i * 200, 312, p.formula, {
        fill: colors.orange,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle',
        fontFamily: 'monospace',
      });
      r.text(170 + i * 200, 328, p.desc, { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    });

    r.text(350, 365, 'Power (Watts) = Rate of energy use. All formulas give the same answer!', {
      fill: colors.primary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 50, 'The Safety Challenge', {
      fill: colors.purple,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Scenario
    r.rect(80, 75, 540, 85, { fill: colors.bgCard, rx: 12 });
    r.text(350, 100, 'A hair dryer uses 1500W of power at 120V.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 125, 'You accidentally plug it into a 240V outlet (like in Europe).', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Warning
    r.rect(180, 165, 340, 35, { fill: `${colors.danger}30`, stroke: colors.danger, rx: 8 });
    r.text(350, 187, 'Warning: This is extremely dangerous - do not try this!', {
      fill: colors.danger,
      fontSize: 12,
      textAnchor: 'middle',
    });

    r.text(350, 220, 'What power would the hair dryer try to draw?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Options
    const options = [
      { id: 'A', text: 'Still 1500W (power stays constant)' },
      { id: 'B', text: '6000W (4x the power!) because P = V^2/R' },
      { id: 'C', text: '3000W (double voltage = double power)' },
      { id: 'D', text: '750W (higher voltage = lower power)' },
    ];

    options.forEach((opt, i) => {
      const isSelected = this.twistPrediction === opt.id;
      const isCorrect = opt.id === 'B';
      const showFeedback = this.twistPrediction !== null;

      let bgColor = colors.bgCardLight;
      let borderColor = colors.border;

      if (showFeedback) {
        if (isSelected && isCorrect) {
          bgColor = `${colors.success}40`;
          borderColor = colors.success;
        } else if (isSelected && !isCorrect) {
          bgColor = `${colors.danger}40`;
          borderColor = colors.danger;
        } else if (isCorrect) {
          bgColor = `${colors.success}40`;
          borderColor = colors.success;
        }
      } else if (isSelected) {
        bgColor = `${colors.primary}40`;
        borderColor = colors.primary;
      }

      r.rect(80, 240 + i * 45, 540, 38, {
        fill: bgColor,
        stroke: borderColor,
        strokeWidth: 2,
        rx: 8,
        id: `twist_${opt.id}`,
      });
      r.text(100, 263 + i * 45, `${opt.id}.`, {
        fill: colors.textPrimary,
        fontSize: 14,
        fontWeight: 'bold',
      });
      r.text(125, 263 + i * 45, opt.text, { fill: colors.textSecondary, fontSize: 13 });
    });

    // Feedback
    if (this.twistPrediction !== null) {
      r.rect(80, 425, 540, 50, { fill: `${colors.danger}30`, stroke: colors.danger, rx: 8 });
      r.text(350, 448, 'Power quadruples because P = V^2/R!', {
        fill: colors.success,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
      r.text(350, 465, 'Hair dryer R = 9.6 Ohm. At 240V: P = 240^2/9.6 = 6000W!', {
        fill: colors.textSecondary,
        fontSize: 11,
        textAnchor: 'middle',
      });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(350, 30, 'Power & Safety', {
      fill: colors.purple,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 55, 'Why V^2 Matters So Much', {
      fill: colors.primary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Hair dryer resistance (PROTECTED calculation)
    // R = V^2/P = 120^2/1500 = 9.6 Ohm
    const hairDryerR = 9.6;
    const power120 = this.calculatePowerAtVoltage(120, hairDryerR);
    const power240 = this.calculatePowerAtVoltage(240, hairDryerR);

    // At 120V
    r.rect(80, 75, 260, 120, { fill: colors.bgCard, rx: 12 });
    r.text(210, 100, 'At 120V (US)', { fill: colors.yellow, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(210, 125, `P = V^2/R = 120^2/9.6`, { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(210, 150, `= ${power120.toFixed(0)}W`, {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.rect(100, 165, 220, 12, { fill: colors.bgCardLight, rx: 6 });
    r.rect(100, 165, 55, 12, { fill: colors.success, rx: 6 });
    r.text(210, 190, 'Normal operation', { fill: colors.success, fontSize: 10, textAnchor: 'middle' });

    // At 240V
    r.rect(360, 75, 260, 120, { fill: `${colors.danger}30`, stroke: colors.danger, rx: 12 });
    r.text(490, 100, 'At 240V (Wrong!)', { fill: colors.danger, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(490, 125, `P = V^2/R = 240^2/9.6`, { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(490, 150, `= ${power240.toFixed(0)}W!`, {
      fill: colors.danger,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.rect(380, 165, 220, 12, { fill: colors.bgCardLight, rx: 6 });
    r.rect(380, 165, 220, 12, { fill: colors.danger, rx: 6 });
    r.text(490, 190, '4x overload - FIRE HAZARD!', { fill: colors.danger, fontSize: 10, textAnchor: 'middle' });

    // Math breakdown
    r.rect(80, 210, 540, 100, { fill: `${colors.purple}20`, rx: 12 });
    r.text(350, 235, 'The Math Breakdown', {
      fill: colors.purple,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    const mathPoints = [
      'Doubling voltage (2x) squares the power effect: 2^2 = 4x',
      'Current also doubles: I = V/R -> 240/9.6 = 25A (vs 12.5A)',
      'P = V x I = 240 x 25 = 6000W - all formulas agree!',
    ];
    mathPoints.forEach((point, i) => {
      r.text(100, 260 + i * 18, `* ${point}`, { fill: colors.textSecondary, fontSize: 11 });
    });

    // Safety implications
    r.rect(80, 325, 540, 80, { fill: colors.bgCard, rx: 12 });
    r.text(350, 350, 'Safety Implications', {
      fill: colors.success,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    const safetyPoints = [
      'Circuit breakers trip when current exceeds safe limits',
      'Dual-voltage devices (100-240V) automatically adjust',
      'Never use a device at wrong voltage without a converter!',
    ];
    safetyPoints.forEach((point, i) => {
      r.text(100, 375 + i * 16, `* ${point}`, { fill: colors.textSecondary, fontSize: 11 });
    });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(350, 60, 'Key Discovery', {
      fill: colors.purple,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 200, { fill: `${colors.purple}20`, rx: 16 });

    r.text(350, 125, 'Ohm\'s Law Keeps You Safe!', {
      fill: colors.purple,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 155, 'Understanding V = IR and P = V^2/R explains:', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const insights = [
      { text: 'Why thick wires are needed for high-current appliances', color: colors.primary },
      { text: 'Why voltage standards exist (120V, 240V, etc.)', color: colors.primary },
      { text: 'Why circuit breakers are essential safety devices', color: colors.primary },
      { text: 'Why LEDs need resistors - without them, they burn out', color: colors.primary },
    ];

    insights.forEach((insight, i) => {
      r.text(140, 185 + i * 22, `* ${insight.text}`, { fill: insight.color, fontSize: 12 });
    });

    r.text(350, 275, 'Every electrician and electronics engineer uses Ohm\'s Law daily!', {
      fill: colors.success,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(350, 35, 'Real-World Applications', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // App tabs
    applications.forEach((app, i) => {
      const isSelected = i === this.selectedApp;
      const isCompleted = this.completedApps[i];

      r.rect(65 + i * 155, 55, 145, 35, {
        fill: isSelected ? colors.warning : colors.bgCard,
        stroke: isCompleted ? colors.success : colors.border,
        strokeWidth: isCompleted ? 2 : 1,
        rx: 8,
        id: `app_${i}`,
      });
      r.text(137 + i * 155, 77, `${app.icon} ${app.short}`, {
        fill: isSelected ? colors.textPrimary : colors.textSecondary,
        fontSize: 12,
        fontWeight: isSelected ? 'bold' : 'normal',
        textAnchor: 'middle',
      });
    });

    // Selected app content
    const app = applications[this.selectedApp];
    r.rect(50, 100, 600, 280, { fill: colors.bgCard, rx: 12 });

    // Header
    r.text(80, 130, `${app.icon} ${app.title}`, {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
    });
    r.text(80, 150, app.tagline, { fill: colors.primary, fontSize: 12 });

    // Description
    r.text(80, 175, app.description.substring(0, 80) + '...', { fill: colors.textSecondary, fontSize: 11 });

    // How V = IR applies
    r.rect(70, 195, 560, 50, { fill: `${colors.warning}20`, rx: 8 });
    r.text(80, 215, 'How V = IR Applies', { fill: colors.textPrimary, fontSize: 12, fontWeight: 'bold' });
    r.text(80, 235, app.connection.substring(0, 90) + '...', { fill: colors.textSecondary, fontSize: 10 });

    // Stats
    r.text(80, 265, 'Key Statistics', { fill: colors.textMuted, fontSize: 11, fontWeight: 'bold' });
    app.stats.slice(0, 4).forEach((stat, i) => {
      r.rect(70 + i * 145, 275, 135, 40, { fill: colors.bgCardLight, rx: 6 });
      r.text(137 + i * 145, 293, stat.value, {
        fill: colors.primary,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
      r.text(137 + i * 145, 308, stat.label, {
        fill: colors.textMuted,
        fontSize: 8,
        textAnchor: 'middle',
      });
    });

    // Companies
    r.text(80, 340, 'Industry Leaders:', { fill: colors.textMuted, fontSize: 10 });
    app.companies.forEach((company, i) => {
      r.rect(175 + i * 90, 330, 80, 22, { fill: `${colors.warning}30`, rx: 4 });
      r.text(215 + i * 90, 345, company, {
        fill: colors.warning,
        fontSize: 9,
        textAnchor: 'middle',
      });
    });

    // Progress
    r.text(350, 395, `Progress: ${this.completedApps.filter((c) => c).length}/4`, {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTest(r: CommandRenderer): void {
    if (this.testSubmitted) {
      this.renderTestResults(r);
      return;
    }

    const q = testQuestions[this.testQuestion];

    r.text(350, 35, `Question ${this.testQuestion + 1} of ${testQuestions.length}`, {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Scenario
    r.rect(80, 50, 540, 45, { fill: colors.bgCard, rx: 8 });
    r.text(350, 78, q.scenario, {
      fill: colors.primary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Question
    r.text(350, 120, q.question, {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Options
    q.options.forEach((option, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;

      r.rect(80, 145 + i * 50, 540, 42, {
        fill: isSelected ? `${colors.primary}40` : colors.bgCard,
        stroke: isSelected ? colors.primary : colors.border,
        strokeWidth: isSelected ? 2 : 1,
        rx: 8,
        id: `answer_${i}`,
      });
      r.text(350, 170 + i * 50, option, {
        fill: isSelected ? colors.primary : colors.textSecondary,
        fontSize: 13,
        textAnchor: 'middle',
      });
    });

    // Question progress dots
    testQuestions.forEach((_, i) => {
      const answered = this.testAnswers[i] !== null;
      const isCurrent = i === this.testQuestion;
      r.circle(245 + i * 22, 365, isCurrent ? 6 : 4, {
        fill: answered ? colors.success : colors.bgCardLight,
        stroke: isCurrent ? colors.primary : 'none',
        strokeWidth: 2,
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

    r.text(350, 130, `Score: ${score} / ${testQuestions.length}`, {
      fill: colors.textPrimary,
      fontSize: 24,
      textAnchor: 'middle',
    });

    r.text(350, 170, passed ? 'You\'ve mastered Ohm\'s Law!' : 'Review the concepts and try again.', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    // Show correct/incorrect summary
    r.rect(100, 200, 500, 150, { fill: colors.bgCard, rx: 12 });
    testQuestions.forEach((q, i) => {
      const isCorrect = this.testAnswers[i] === q.correctIndex;
      const col = i < 5 ? 0 : 1;
      const row = i % 5;
      r.text(130 + col * 250, 225 + row * 25, `Q${i + 1}: ${isCorrect ? 'Correct' : 'Incorrect'}`, {
        fill: isCorrect ? colors.success : colors.danger,
        fontSize: 12,
      });
    });
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(350, 80, '⚡', { fontSize: 60, textAnchor: 'middle' });

    r.text(350, 150, 'Ohm\'s Law Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 185, 'You\'ve mastered V = IR and understand electrical circuits!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Formula badge
    r.rect(250, 210, 200, 50, { fill: colors.bgCard, rx: 12 });
    r.text(350, 243, 'V = I x R', {
      fill: colors.yellow,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
      fontFamily: 'monospace',
    });

    // Achievement icons
    const achievements = [
      { icon: '⚡', label: 'Voltage' },
      { icon: '🌊', label: 'Current' },
      { icon: '🚧', label: 'Resistance' },
      { icon: '💡', label: 'Power' },
    ];

    achievements.forEach((a, i) => {
      r.rect(130 + i * 135, 280, 120, 60, { fill: colors.bgCard, rx: 8 });
      r.text(190 + i * 135, 305, a.icon, { fontSize: 24, textAnchor: 'middle' });
      r.text(190 + i * 135, 330, a.label, {
        fill: colors.textSecondary,
        fontSize: 11,
        textAnchor: 'middle',
      });
    });
  }

  // --- UI State ---

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

    // Back button
    if (idx > 0) {
      r.addButton({ id: 'back', label: '← Back', variant: 'secondary' });
    }

    // Phase-specific controls
    switch (this.phase) {
      case 'hook':
        r.addToggle({
          id: 'circuit',
          label: 'Circuit',
          value: this.isCircuitOn,
          onLabel: 'ON',
          offLabel: 'OFF',
        });
        r.addButton({ id: 'next', label: 'Explore the Law →', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({
          id: 'predict_A',
          label: 'A. Stays at 2A',
          variant: this.prediction === 'A' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_B',
          label: 'B. Increases to 3A',
          variant: this.prediction === 'B' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_C',
          label: 'C. Doubles to 4A',
          variant: this.prediction === 'C' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_D',
          label: 'D. Quadruples to 8A',
          variant: this.prediction === 'D' ? 'primary' : 'secondary',
        });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Explore Circuit Lab →', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({
          id: 'voltage',
          label: 'Voltage (V)',
          value: this.voltage,
          min: 1,
          max: 24,
          step: 1,
        });
        r.addSlider({
          id: 'resistance',
          label: 'Resistance (Ω)',
          value: this.resistance,
          min: 1,
          max: 20,
          step: 1,
        });
        r.addToggle({
          id: 'circuit',
          label: 'Circuit',
          value: this.isCircuitOn,
          onLabel: 'ON',
          offLabel: 'OFF',
        });
        r.addButton({ id: 'next', label: 'Review Concepts →', variant: 'success' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Safety Challenge →', variant: 'primary' });
        break;

      case 'twist_predict':
        r.addButton({
          id: 'twist_A',
          label: 'A. Still 1500W',
          variant: this.twistPrediction === 'A' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_B',
          label: 'B. 6000W (4x)',
          variant: this.twistPrediction === 'B' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_C',
          label: 'C. 3000W (2x)',
          variant: this.twistPrediction === 'C' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_D',
          label: 'D. 750W',
          variant: this.twistPrediction === 'D' ? 'primary' : 'secondary',
        });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Explore Power Safety →', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addButton({ id: 'next', label: 'Key Discovery →', variant: 'success' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real-World Applications →', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'LED', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Wiring', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Battery', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Audio', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every((c) => c)) {
          r.addButton({ id: 'next', label: 'Take Knowledge Test →', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({
            id: 'test_prev',
            label: '← Prev',
            variant: 'ghost',
            disabled: this.testQuestion === 0,
          });
          r.addButton({
            id: 'test_next',
            label: 'Next →',
            variant: 'ghost',
            disabled: this.testQuestion >= testQuestions.length - 1,
          });
          if (this.testAnswers.every((a) => a !== null)) {
            r.addButton({ id: 'test_submit', label: 'Submit Answers', variant: 'success' });
          }
        } else {
          const score = this.calculateTestScore();
          if (score >= 7) {
            r.addButton({ id: 'next', label: 'Claim Mastery Badge →', variant: 'success' });
          } else {
            r.addButton({ id: 'back', label: 'Review & Try Again', variant: 'secondary' });
          }
        }
        break;

      case 'mastery':
        r.addButton({ id: 'restart', label: '↺ Explore Again', variant: 'ghost' });
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
      voltage: this.voltage,
      resistance: this.resistance,
      current: this.current,
      isCircuitOn: this.isCircuitOn,
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
    this.voltage = (state.voltage as number) || 12;
    this.resistance = (state.resistance as number) || 6;
    this.current = this.calculateCurrent();
    this.isCircuitOn = (state.isCircuitOn as boolean) ?? true;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===
// Register this in server.ts: registry.register('ohms_law', createOhmsLawGame);
export function createOhmsLawGame(sessionId: string): OhmsLawGame {
  return new OhmsLawGame(sessionId);
}
