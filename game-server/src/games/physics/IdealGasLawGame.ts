/**
 * Ideal Gas Law Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED PHYSICS:
 * - Ideal Gas Law: PV = nRT
 * - Boyle's Law: P1V1 = P2V2 (constant T, n)
 * - Charles's Law: V1/T1 = V2/T2 (constant P, n)
 * - Gay-Lussac's Law: P1/T1 = P2/T2 (constant V, n)
 * - Combined Gas Law: P1V1/T1 = P2V2/T2
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

// === PROTECTED TEST QUESTIONS (never sent to client) ===
interface TestQuestion {
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const testQuestions: TestQuestion[] = [
  {
    scenario: 'A sealed balloon is taken from a warm room (25C) and placed in a freezer (-18C).',
    question: 'What happens to the balloon?',
    options: [
      'It expands because cold air is denser',
      'It shrinks because lower temperature means lower pressure and volume',
      'Nothing changes because it\'s sealed',
      'It pops from the cold',
    ],
    correctIndex: 1,
    explanation: 'From PV = nRT, when T decreases with n constant, PV must decrease. For a flexible balloon, pressure stays roughly constant (atmospheric), so volume decreases.',
  },
  {
    scenario: 'A scuba diver at 30 meters depth has 2 liters of air in their lungs. They ascend to the surface without exhaling.',
    question: 'What volume would the air in their lungs try to occupy at the surface?',
    options: [
      'Still 2 liters',
      'About 4 liters',
      'About 8 liters (dangerous!)',
      'Less than 2 liters',
    ],
    correctIndex: 2,
    explanation: 'At 30m depth, pressure is ~4 atm. At surface it\'s 1 atm. With constant T and n, when P decreases by 4x, V increases by 4x (from 2L to 8L). This is why divers must exhale while ascending!',
  },
  {
    scenario: 'A car tire is inflated to 200 kPa on a cool morning (15C). After highway driving, the tire temperature rises to 45C.',
    question: 'What is the approximate new pressure in the tire?',
    options: [
      'Still 200 kPa - tires are built to handle heat',
      'About 220 kPa',
      'About 600 kPa',
      'The pressure decreases',
    ],
    correctIndex: 1,
    explanation: 'Using P1/T1 = P2/T2 (constant V and n): 200/(273+15) = P2/(273+45). P2 = 200 x 318/288 = 220 kPa. That\'s why tire pressure warnings often appear after long drives.',
  },
  {
    scenario: 'A rigid steel tank contains nitrogen gas at 500 kPa and 20C. The tank is heated to 100C.',
    question: 'What happens to the pressure?',
    options: [
      'Stays at 500 kPa because the tank doesn\'t expand',
      'Increases to about 635 kPa',
      'Decreases because hot gas is less dense',
      'The tank explodes immediately',
    ],
    correctIndex: 1,
    explanation: 'With constant V and n: P1/T1 = P2/T2. 500/293 = P2/373. P2 = 500 x 373/293 = 635 kPa. Gay-Lussac\'s Law: pressure and temperature are directly proportional at constant volume.',
  },
  {
    scenario: 'A syringe with its end blocked contains 10 mL of air. You push the plunger, compressing the air to 5 mL.',
    question: 'What happens to the pressure inside?',
    options: [
      'Stays the same',
      'Doubles (becomes 2x original)',
      'Quadruples (becomes 4x original)',
      'Halves (becomes 0.5x original)',
    ],
    correctIndex: 1,
    explanation: 'Boyle\'s Law: P1V1 = P2V2 at constant T and n. If V halves (10 mL -> 5 mL), then P must double. This is why it gets harder to push as you compress more.',
  },
  {
    scenario: 'Two identical containers hold different gases at the same temperature and pressure. Container A has helium (He, molar mass 4), Container B has argon (Ar, molar mass 40).',
    question: 'How do the number of gas molecules compare?',
    options: [
      'Container B has more molecules (argon is heavier)',
      'Container A has more molecules (helium is lighter)',
      'Both containers have the same number of molecules',
      'Cannot determine without knowing the masses',
    ],
    correctIndex: 2,
    explanation: 'From PV = nRT, if P, V, and T are equal, then n (moles) must be equal. Equal moles means equal numbers of molecules (Avogadro\'s principle). The type of gas doesn\'t matter!',
  },
  {
    scenario: 'A hot air balloon envelope holds 2800 m3 of air. Outside air is at 20C and 101 kPa.',
    question: 'If the air inside is heated to 100C while keeping pressure constant (open bottom), what volume would the same mass of air occupy?',
    options: [
      'About 2800 m3 (no change)',
      'About 3560 m3',
      'About 14,000 m3',
      'About 2200 m3',
    ],
    correctIndex: 1,
    explanation: 'Charles\'s Law: V1/T1 = V2/T2. 2800/293 = V2/373. V2 = 2800 x 373/293 = 3560 m3. But the envelope can only hold 2800 m3, so some air escapes - this is what makes the balloon lighter!',
  },
  {
    scenario: 'A weather balloon is released at sea level with volume 1 m3. It rises to an altitude where pressure is 0.3 atm and temperature is -50C.',
    question: 'Approximately what volume does the balloon expand to?',
    options: [
      'About 1 m3 (rubber stretches to compensate)',
      'About 2.5 m3',
      'About 3.3 m3',
      'About 10 m3',
    ],
    correctIndex: 1,
    explanation: 'Using combined gas law: P1V1/T1 = P2V2/T2. With T1=288K, T2=223K: (1)(1)/288 = (0.3)(V2)/223. V2 = 223/(0.3x288) = 2.5 m3. Temperature decrease partially offsets pressure decrease.',
  },
  {
    scenario: 'In the ideal gas law PV = nRT, R is the gas constant with value 8.314 J/(mol*K).',
    question: 'What does R represent physically?',
    options: [
      'The rate of gas reactions',
      'The energy per mole per degree of temperature',
      'The density of the gas',
      'The resistance to compression',
    ],
    correctIndex: 1,
    explanation: 'R connects energy and temperature for gases. R = 8.314 J/(mol*K) means each mole of gas gains 8.314 joules of kinetic energy per kelvin of temperature increase. It\'s the same for ALL ideal gases!',
  },
  {
    scenario: 'At STP (Standard Temperature and Pressure: 0C and 101.325 kPa), one mole of any ideal gas occupies exactly 22.4 liters.',
    question: 'If you have 0.5 moles of oxygen at STP, what volume does it occupy?',
    options: [
      '44.8 liters (oxygen is O2)',
      '22.4 liters (one mole equivalent)',
      '11.2 liters',
      '5.6 liters',
    ],
    correctIndex: 2,
    explanation: 'Volume is directly proportional to moles at constant T and P. Half the moles = half the volume. 0.5 mol x 22.4 L/mol = 11.2 L. The molecular formula (O2) doesn\'t change this.',
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
  howItWorks: string;
  stats: { value: string; label: string }[];
}

const applications: TransferApp[] = [
  {
    icon: 'CAR',
    title: 'Automotive Tire Pressure',
    short: 'Tire Safety',
    tagline: 'Why your tire pressure light comes on after driving',
    description: 'Car tires are calibrated using the ideal gas law to maintain safe pressure across temperature ranges.',
    connection: 'Tire rubber has fixed volume, so as temperature increases from driving friction, pressure increases proportionally (Gay-Lussac\'s Law).',
    howItWorks: 'TPMS sensors monitor pressure constantly. A tire inflated to 32 psi at 20C will reach ~35 psi at 50C.',
    stats: [
      { value: '10%', label: 'Pressure increase per 30C rise' },
      { value: '3-4 psi', label: 'Typical seasonal variation' },
      { value: '25%', label: 'Fuel loss from underinflation' },
      { value: '6 months', label: 'Average time for 1 psi natural loss' },
    ],
  },
  {
    icon: 'BALLOON',
    title: 'Weather Balloons',
    short: 'Meteorology',
    tagline: 'How balloons expand 100x as they rise through the atmosphere',
    description: 'Weather balloons carrying radiosondes expand dramatically as they ascend through decreasing atmospheric pressure.',
    connection: 'As altitude increases, external pressure drops. With fixed gas amount, volume must increase inversely - balloons expand until they burst.',
    howItWorks: 'Balloons are partially filled at launch (~1 m3). As they rise, P drops -> V increases. At burst altitude, they\'ve expanded to 8-10 m3.',
    stats: [
      { value: '~2 hrs', label: 'Flight time to burst' },
      { value: '30 km', label: 'Typical burst altitude' },
      { value: '8-10x', label: 'Volume expansion factor' },
      { value: '1,800+', label: 'Balloons launched daily worldwide' },
    ],
  },
  {
    icon: 'DIVER',
    title: 'Scuba Diving Physics',
    short: 'Diving Safety',
    tagline: 'Why divers must never hold their breath while ascending',
    description: 'Scuba diving safety fundamentally relies on understanding how gas volumes change with pressure at different depths.',
    connection: 'At 10m depth, pressure is 2 atm. At 30m, it\'s 4 atm. Gas volume is inversely proportional to pressure.',
    howItWorks: 'Regulators deliver air at ambient pressure. A diver at 30m breathes air at 4x surface pressure.',
    stats: [
      { value: '4x', label: 'Pressure increase at 30m depth' },
      { value: '2 m/min', label: 'Safe ascent rate' },
      { value: '100%', label: 'Volume doubling from 10m to surface' },
      { value: '#1', label: 'Rule: Never hold breath' },
    ],
  },
  {
    icon: 'FACTORY',
    title: 'Industrial Gas Storage',
    short: 'Gas Cylinders',
    tagline: 'How millions of liters fit into small tanks',
    description: 'Compressed gas cylinders store enormous quantities of gas by exploiting the pressure-volume relationship.',
    connection: 'PV = nRT means high pressure = small volume for the same amount of gas. A 50L cylinder at 200 atm holds 10,000 liters at atmospheric pressure!',
    howItWorks: 'Industrial compressors force gas into cylinders until target pressure is reached. Temperature must be monitored.',
    stats: [
      { value: '200-300 bar', label: 'Typical cylinder pressure' },
      { value: '200x', label: 'Volume reduction factor' },
      { value: '6,000 psi', label: 'Medical oxygen standard' },
      { value: '700 bar', label: 'Hydrogen fuel cell pressure' },
    ],
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  secondary: '#06b6d4',
  accent: '#a855f7',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  bgDark: '#0a0f1a',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
};

// === MOLECULE STATE ===
interface Molecule {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// === MAIN GAME CLASS ===

export class IdealGasLawGame extends BaseGame {
  readonly gameType = 'ideal_gas_law';
  readonly gameTitle = 'The Ideal Gas Law';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // PROTECTED PHYSICS CONSTANTS
  private readonly R = 8.314; // Gas constant J/(mol*K) = kPa*L/(mol*K)

  // Gas state variables
  private pressure = 100; // kPa
  private volume = 1.0; // Liters
  private temperature = 300; // Kelvin
  private moles = 0.04; // moles of gas
  private lockedVariable: 'P' | 'V' | 'T' = 'T';

  // Molecule simulation
  private molecules: Molecule[] = [];
  private isAnimating = false;

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
    'hook', 'predict', 'play', 'review',
    'twist_predict', 'twist_play', 'twist_review',
    'transfer', 'test', 'mastery',
  ];

  private readonly phaseLabels: Record<GamePhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Gas Lab',
    review: 'Understanding',
    twist_predict: 'Diving Challenge',
    twist_play: 'Depth Physics',
    twist_review: 'Key Discovery',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Welcome! One equation governs the behavior of ALL gases: PV = nRT',
    predict: 'What happens when you compress a gas? Make your prediction!',
    play: 'Explore the gas lab! Try changing volume and temperature to see how pressure responds.',
    review: 'You\'ve discovered the ideal gas relationships! Let\'s understand why they work.',
    twist_predict: 'Scuba diving is a life-or-death application of gas laws. What do you predict?',
    twist_play: 'See how pressure changes with depth, and why divers must never hold their breath!',
    twist_review: 'The ideal gas law saves lives! Understanding PV = nRT is critical for safe diving.',
    transfer: 'Let\'s see how gas laws power real-world technology.',
    test: 'Time to test your understanding of the ideal gas law!',
    mastery: 'Congratulations! You\'ve mastered PV = nRT!',
  };

  constructor(sessionId: string) {
    super(sessionId);
    this.initializeMolecules();
  }

  private initializeMolecules(): void {
    const numMolecules = Math.round(this.moles * 250);
    this.molecules = Array.from({ length: Math.min(numMolecules, 80) }, () => ({
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
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
      message: 'Ideal Gas Law lesson started',
    });
  }

  // === PROTECTED PHYSICS CALCULATIONS ===

  /**
   * PROTECTED: Calculate pressure from PV = nRT
   * P = nRT / V
   */
  private calculatePressure(v: number, t: number, n: number): number {
    return (n * this.R * t) / v;
  }

  /**
   * PROTECTED: Calculate volume from PV = nRT
   * V = nRT / P
   */
  private calculateVolume(p: number, t: number, n: number): number {
    return (n * this.R * t) / p;
  }

  /**
   * PROTECTED: Calculate temperature from PV = nRT
   * T = PV / nR
   */
  private calculateTemperature(p: number, v: number, n: number): number {
    return (p * v) / (n * this.R);
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
    if (id === 'next') { this.goNext(); return; }
    if (id === 'back') { this.goBack(); return; }

    // Predictions (predict phase)
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }

    // Twist predictions
    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
      this.emitCoachEvent('twist_prediction_made', { prediction: this.twistPrediction });
      return;
    }

    // Lock variable buttons
    if (id === 'lock_T') { this.lockedVariable = 'T'; return; }
    if (id === 'lock_V') { this.lockedVariable = 'V'; return; }
    if (id === 'lock_P') { this.lockedVariable = 'P'; return; }

    // Animation control
    if (id === 'toggle_animation') {
      this.isAnimating = !this.isAnimating;
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
    if (id === 'test_retry') {
      this.testSubmitted = false;
      this.testAnswers = Array(10).fill(null);
      this.testQuestion = 0;
      this.goToPhase('review');
      return;
    }

    // App tabs
    if (id.startsWith('app_')) {
      const appIndex = parseInt(id.replace('app_', ''), 10);
      this.selectedApp = appIndex;
      this.completedApps[appIndex] = true;
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'animation') {
      this.isAnimating = value;
    }
    if (id === 'guided_mode') {
      this.guidedMode = value;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'volume') {
      this.handleVolumeChange(value);
    }
    if (id === 'temperature') {
      this.handleTemperatureChange(value);
    }
    if (id === 'pressure') {
      this.handlePressureChange(value);
    }
  }

  /**
   * PROTECTED: Handle volume change with gas law calculations
   */
  private handleVolumeChange(newVolume: number): void {
    const oldVolume = this.volume;
    this.volume = newVolume;

    if (this.lockedVariable === 'T') {
      // Boyle's Law: P1V1 = P2V2 at constant T
      this.pressure = this.calculatePressure(newVolume, this.temperature, this.moles);
    } else if (this.lockedVariable === 'P') {
      // Charles's Law: V1/T1 = V2/T2 at constant P
      this.temperature = this.calculateTemperature(this.pressure, newVolume, this.moles);
    }

    this.emitCoachEvent('volume_adjusted', { volume: newVolume, oldVolume });
  }

  /**
   * PROTECTED: Handle temperature change with gas law calculations
   */
  private handleTemperatureChange(newTemp: number): void {
    const oldTemp = this.temperature;
    this.temperature = newTemp;

    if (this.lockedVariable === 'V') {
      // Gay-Lussac's Law: P1/T1 = P2/T2 at constant V
      this.pressure = this.calculatePressure(this.volume, newTemp, this.moles);
    } else if (this.lockedVariable === 'P') {
      // Charles's Law: V1/T1 = V2/T2 at constant P
      this.volume = this.calculateVolume(this.pressure, newTemp, this.moles);
    }

    this.emitCoachEvent('temperature_adjusted', { temperature: newTemp, oldTemp });
  }

  /**
   * PROTECTED: Handle pressure change with gas law calculations
   */
  private handlePressureChange(newPressure: number): void {
    const oldPressure = this.pressure;
    this.pressure = newPressure;

    if (this.lockedVariable === 'T') {
      // Boyle's Law: P1V1 = P2V2 at constant T
      this.volume = this.calculateVolume(newPressure, this.temperature, this.moles);
    } else if (this.lockedVariable === 'V') {
      // Gay-Lussac's Law: P1/T1 = P2/T2 at constant V
      this.temperature = this.calculateTemperature(newPressure, this.volume, this.moles);
    }

    this.emitCoachEvent('pressure_adjusted', { pressure: newPressure, oldPressure });
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

  private resetSimulation(): void {
    this.pressure = 100;
    this.volume = 1.0;
    this.temperature = 300;
    this.lockedVariable = 'T';
    this.isAnimating = false;
    this.initializeMolecules();
  }

  // === PHYSICS SIMULATION ===

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'hook') return;

    // PROTECTED: Molecule speed based on temperature (kinetic theory)
    const speedFactor = Math.sqrt(this.temperature / 300);

    // Container bounds based on volume
    const containerScale = Math.cbrt(this.volume);
    const containerWidth = 80 * containerScale;
    const containerHeight = 80 * containerScale;
    const offsetX = (80 - containerWidth) / 2 + 10;
    const offsetY = (80 - containerHeight) / 2 + 10;

    // Update molecule positions
    this.molecules = this.molecules.map(mol => {
      let newX = mol.x + mol.vx * speedFactor * (deltaTime / 16);
      let newY = mol.y + mol.vy * speedFactor * (deltaTime / 16);
      let newVx = mol.vx;
      let newVy = mol.vy;

      // Wall collisions
      if (newX < offsetX || newX > offsetX + containerWidth) {
        newVx = -newVx;
        newX = clamp(newX, offsetX, offsetX + containerWidth);
      }
      if (newY < offsetY || newY > offsetY + containerHeight) {
        newVy = -newVy;
        newY = clamp(newY, offsetY, offsetY + containerHeight);
      }

      return { x: newX, y: newY, vx: newVx, vy: newVy };
    });
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

    // Background
    r.clear(colors.bgDark);
    this.renderBackground(r);

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

  private renderBackground(r: CommandRenderer): void {
    // Gradient overlays
    r.linearGradient('bgGrad', [
      { offset: '0%', color: '#1e3a5f20' },
      { offset: '50%', color: '#00000000' },
      { offset: '100%', color: '#0e7490' + '20' },
    ]);

    // Ambient glow circles
    r.circle(100, 100, 150, { fill: '#3b82f6', opacity: 0.05 });
    r.circle(600, 400, 150, { fill: '#06b6d4', opacity: 0.05 });
  }

  private renderGasContainer(r: CommandRenderer, x: number, y: number, width: number, height: number): void {
    // Container dimensions scale with volume
    const containerScale = Math.cbrt(this.volume);
    const containerWidth = (width * 0.75) * containerScale;
    const containerHeight = (height * 0.75) * containerScale;
    const offsetX = x + (width - containerWidth) / 2;
    const offsetY = y + (height - containerHeight) / 2;

    const speedFactor = Math.sqrt(this.temperature / 300);
    const pressureIntensity = clamp(this.pressure / 200, 0, 1);

    // Container background with pressure-dependent fill
    r.linearGradient('gasGrad', [
      { offset: '0%', color: `rgba(59, 130, 246, ${pressureIntensity * 0.3})` },
      { offset: '100%', color: `rgba(147, 51, 234, ${pressureIntensity * 0.4})` },
    ]);

    r.rect(offsetX, offsetY, containerWidth, containerHeight, {
      fill: `rgba(59, 130, 246, ${pressureIntensity * 0.2})`,
      stroke: colors.border,
      strokeWidth: 3,
      rx: 4,
    });

    // Piston at top
    r.rect(offsetX - 2, offsetY - 8, containerWidth + 4, 10, {
      fill: '#64748b',
      stroke: '#475569',
      rx: 2,
    });
    r.rect(offsetX + containerWidth / 2 - 4, offsetY - 20, 8, 15, {
      fill: '#475569',
    });

    // Render molecules
    const molContainerScale = Math.cbrt(this.volume);
    const molContainerW = 80 * molContainerScale;
    const molContainerH = 80 * molContainerScale;
    const molOffX = (80 - molContainerW) / 2 + 10;
    const molOffY = (80 - molContainerH) / 2 + 10;

    this.molecules.forEach((mol) => {
      const scaledX = offsetX + ((mol.x - molOffX) / molContainerW) * containerWidth;
      const scaledY = offsetY + ((mol.y - molOffY) / molContainerH) * containerHeight;
      const size = 3 + speedFactor * 1;

      r.circle(scaledX, scaledY, size, {
        fill: '#60a5fa',
        opacity: 0.85,
      });
    });

    // Labels
    r.text(x + width / 2, y + height + 15, `V = ${this.volume.toFixed(2)} L`, {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Heat waves if temperature is high
    if (this.temperature > 350) {
      for (let i = 0; i < 3; i++) {
        r.path(`M${offsetX + 15 + i * 30},${offsetY + containerHeight + 5} Q${offsetX + 25 + i * 30},${offsetY + containerHeight + 12} ${offsetX + 35 + i * 30},${offsetY + containerHeight + 5}`, {
          fill: 'none',
          stroke: '#f97316',
          strokeWidth: 2,
          opacity: 0.6,
        });
      }
    }
  }

  private renderHook(r: CommandRenderer): void {
    // Badge
    r.rect(280, 30, 140, 28, { fill: '#3b82f620', stroke: '#3b82f640', rx: 14 });
    r.circle(295, 44, 4, { fill: colors.primary });
    r.text(350, 49, 'Thermodynamics', { fill: colors.primary, fontSize: 12, textAnchor: 'middle' });

    // Title
    r.text(350, 100, 'The Ideal Gas Law', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 135, 'One equation to rule the behavior of all gases', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    // Gas container visualization
    this.renderGasContainer(r, 250, 160, 200, 160);

    // Question prompts
    r.text(350, 355, 'Why does a balloon shrink in cold weather?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 375, 'Why must scuba divers exhale while ascending?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Equation display
    r.rect(275, 400, 150, 40, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
    r.text(350, 427, 'PV = nRT', {
      fill: colors.primary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Variable key
    const vars = [
      { letter: 'P', label: 'Pressure', color: '#3b82f6' },
      { letter: 'V', label: 'Volume', color: '#10b981' },
      { letter: 'n', label: 'Moles', color: '#a855f7' },
      { letter: 'T', label: 'Temperature', color: '#f97316' },
    ];
    vars.forEach((v, i) => {
      r.text(170 + i * 120, 465, v.letter, { fill: v.color, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(170 + i * 120, 480, `= ${v.label}`, { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Scenario
    r.rect(100, 80, 500, 80, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(350, 110, 'A sealed syringe contains air at room temperature.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 130, 'You push the plunger to compress the air to half its original volume.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Syringe diagram
    r.rect(150, 180, 300, 60, { fill: '#e2e8f0', stroke: '#94a3b8', strokeWidth: 2, rx: 4 });
    r.rect(450, 170, 20, 80, { fill: '#475569', rx: 2 }); // Plunger
    r.rect(465, 195, 60, 30, { fill: '#334155', rx: 4 }); // Handle
    r.rect(160, 190, 280, 40, { fill: 'rgba(59, 130, 246, 0.2)', rx: 2 }); // Air

    // Arrow
    r.path('M540,210 L480,210', { fill: 'none', stroke: '#f59e0b', strokeWidth: 3 });
    r.text(510, 235, 'Push', { fill: '#f59e0b', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Question
    r.text(350, 280, 'What happens to the pressure inside the syringe?', {
      fill: colors.secondary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Feedback
    if (this.prediction) {
      const isCorrect = this.prediction === 'B';
      r.rect(100, 420, 500, 60, {
        fill: isCorrect ? '#10b98120' : '#ef444420',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 445, isCorrect ? 'Correct! This is Boyle\'s Law: P1V1 = P2V2' : 'Not quite. Think about what happens when you compress a gas.', {
        fill: isCorrect ? colors.success : colors.danger,
        fontSize: 14,
        textAnchor: 'middle',
      });
      r.text(350, 465, 'When volume halves, pressure doubles - they\'re inversely proportional!', {
        fill: colors.textSecondary,
        fontSize: 12,
        textAnchor: 'middle',
      });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(350, 30, 'Ideal Gas Laboratory', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Gas container
    this.renderGasContainer(r, 50, 60, 250, 200);

    // Controls panel
    r.rect(320, 60, 350, 200, { fill: colors.bgCard, stroke: colors.border, rx: 12 });

    // Lock selector label
    r.text(340, 85, 'Hold constant:', { fill: colors.textMuted, fontSize: 12 });

    // Equation display
    r.rect(340, 200, 310, 45, { fill: colors.bgDark, stroke: colors.border, rx: 8 });
    r.text(495, 230,
      `${this.pressure.toFixed(0)} x ${this.volume.toFixed(2)} = ${this.moles.toFixed(3)} x 8.314 x ${this.temperature.toFixed(0)}`,
      { fill: colors.secondary, fontSize: 12, textAnchor: 'middle', fontFamily: 'monospace' }
    );

    // Key relationships card
    r.rect(50, 285, 600, 100, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(350, 310, 'Key Relationships:', { fill: colors.secondary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Three law boxes
    const laws = [
      { name: 'Boyle\'s Law', formula: 'P1V1 = P2V2', note: '(constant T, n)', color: '#3b82f6' },
      { name: 'Charles\'s Law', formula: 'V1/T1 = V2/T2', note: '(constant P, n)', color: '#10b981' },
      { name: 'Gay-Lussac\'s Law', formula: 'P1/T1 = P2/T2', note: '(constant V, n)', color: '#f97316' },
    ];

    laws.forEach((law, i) => {
      const lx = 85 + i * 200;
      r.rect(lx, 325, 180, 50, { fill: colors.bgDark, stroke: colors.border, rx: 6 });
      r.text(lx + 90, 343, law.name, { fill: law.color, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(lx + 90, 358, law.formula, { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
      r.text(lx + 90, 370, law.note, { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
    });

    // Current values display
    r.rect(50, 400, 600, 50, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
    r.text(120, 430, `P: ${this.pressure.toFixed(0)} kPa`, { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(270, 430, `V: ${this.volume.toFixed(2)} L`, { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(420, 430, `T: ${this.temperature.toFixed(0)} K (${(this.temperature - 273).toFixed(0)}C)`, { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(570, 430, `n: ${this.moles.toFixed(3)} mol`, { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding PV = nRT', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Equation card
    r.rect(200, 70, 300, 70, { fill: '#1e3a5f40', stroke: colors.border, rx: 12 });
    r.text(350, 115, 'PV = nRT', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
      fontFamily: 'monospace',
    });

    // Variables explanation
    const vars = [
      { letter: 'P', desc: 'Pressure (Pa or kPa)', color: '#3b82f6' },
      { letter: 'V', desc: 'Volume (L or m3)', color: '#10b981' },
      { letter: 'n', desc: 'Amount of gas (moles)', color: '#a855f7' },
      { letter: 'R', desc: 'Gas constant (8.314 J/mol*K)', color: '#fcd34d' },
      { letter: 'T', desc: 'Temperature (Kelvin!)', color: '#f97316' },
    ];

    r.rect(50, 160, 280, 180, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(190, 185, 'The Variables', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    vars.forEach((v, i) => {
      r.text(70, 210 + i * 25, v.letter, { fill: v.color, fontSize: 14, fontWeight: 'bold' });
      r.text(95, 210 + i * 25, `= ${v.desc}`, { fill: colors.textSecondary, fontSize: 11 });
    });

    // Why "Ideal" card
    r.rect(370, 160, 280, 180, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(510, 185, 'Why "Ideal"?', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const idealPoints = [
      'Assumes molecules have no volume',
      'Assumes no intermolecular forces',
      'Assumes perfectly elastic collisions',
      'Works best at high T and low P',
      'Real gases deviate at extremes',
    ];
    idealPoints.forEach((point, i) => {
      r.text(390, 210 + i * 25, '* ' + point, { fill: colors.textSecondary, fontSize: 11 });
    });

    // Key insight card
    r.rect(50, 360, 600, 90, { fill: '#10b98120', stroke: colors.success, rx: 12 });
    r.text(350, 390, 'The Key Insight', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 415, 'If you know any three of P, V, n, and T, you can calculate the fourth!', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 435, 'At STP (0C, 101.325 kPa): 1 mole of any gas occupies exactly 22.4 liters!', {
      fill: colors.secondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 40, 'The Diving Challenge', {
      fill: colors.accent,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Scenario
    r.rect(75, 70, 550, 80, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(350, 95, 'A scuba diver at 30 meters depth takes a full breath (2L at 4 atm).', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 115, 'They make a critical mistake: they hold their breath and swim to the surface.', {
      fill: colors.danger,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Water depth diagram
    r.linearGradient('waterGrad', [
      { offset: '0%', color: '#0ea5e9' },
      { offset: '50%', color: '#0284c7' },
      { offset: '100%', color: '#0c4a6e' },
    ]);
    r.rect(250, 160, 200, 200, { fill: '#0284c7', rx: 4 });

    // Depth markers
    const depths = [
      { label: 'Surface (1 atm)', y: 170 },
      { label: '10m (2 atm)', y: 220 },
      { label: '20m (3 atm)', y: 280 },
      { label: '30m (4 atm)', y: 340 },
    ];
    depths.forEach(d => {
      r.line(250, d.y, 290, d.y, { stroke: '#ffffff40', strokeWidth: 1, strokeDasharray: '4' });
      r.text(260, d.y + 4, d.label, { fill: '#ffffff99', fontSize: 9 });
    });

    // Diver
    r.ellipse(400, 330, 15, 25, { fill: '#1e293b' });
    r.circle(400, 300, 15, { fill: '#fcd34d' });
    r.ellipse(400, 340, 12, 6, { fill: 'rgba(59, 130, 246, 0.5)', stroke: '#3b82f6' });
    r.text(400, 343, '2L', { fill: colors.textPrimary, fontSize: 8, textAnchor: 'middle' });

    // Arrow going up
    r.path('M400,280 L400,180', { fill: 'none', stroke: colors.danger, strokeWidth: 3 });
    r.text(420, 230, 'Ascending!', { fill: colors.danger, fontSize: 11, fontWeight: 'bold' });

    // Question
    r.text(350, 390, 'What happens to the air in their lungs at the surface?', {
      fill: colors.danger,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Feedback
    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'C';
      r.rect(75, 420, 550, 60, {
        fill: isCorrect ? '#10b98120' : '#ef444420',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 445, isCorrect
        ? 'Correct! This is why the #1 rule of scuba diving is: NEVER HOLD YOUR BREATH!'
        : 'Think about Boyle\'s Law: P1V1 = P2V2. What happens when pressure drops by 4x?',
        { fill: isCorrect ? colors.success : colors.danger, fontSize: 12, textAnchor: 'middle' }
      );
      r.text(350, 465, 'At 4 atm, 2L of air would expand to 8L at 1 atm - lungs can rupture!', {
        fill: colors.textSecondary,
        fontSize: 11,
        textAnchor: 'middle',
      });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(350, 30, 'Pressure vs Depth', {
      fill: colors.accent,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Water column with depth levels
    r.rect(100, 60, 500, 220, { fill: '#0284c7', rx: 8 });

    // Depth levels with expanding balloons
    const levels = [
      { depth: 0, pressure: 1, volume: 4, y: 80, label: 'Surface' },
      { depth: 10, pressure: 2, volume: 2, y: 130, label: '10m' },
      { depth: 20, pressure: 3, volume: 1.33, y: 190, label: '20m' },
      { depth: 30, pressure: 4, volume: 1, y: 250, label: '30m' },
    ];

    levels.forEach(level => {
      // Depth line
      r.line(100, level.y, 600, level.y, { stroke: '#ffffff30', strokeWidth: 1, strokeDasharray: '4' });

      // Labels
      r.text(115, level.y + 4, level.label, { fill: '#ffffff', fontSize: 10 });
      r.text(170, level.y + 4, `${level.pressure} atm`, { fill: '#fcd34d', fontSize: 9 });

      // Balloon (size based on volume)
      r.ellipse(350, level.y, 12 * level.volume, 10 * level.volume, {
        fill: 'rgba(239, 68, 68, 0.7)',
        stroke: colors.danger,
        strokeWidth: 2,
      });
      r.text(350, level.y + 3, `${level.volume.toFixed(1)}L`, {
        fill: colors.textPrimary,
        fontSize: 8,
        textAnchor: 'middle',
      });

      // Volume label
      r.text(480, level.y + 4, `V = ${level.volume.toFixed(2)}L`, { fill: '#4ade80', fontSize: 9 });
    });

    // Boyle's Law annotation
    r.text(350, 295, 'P1V1 = P2V2  ->  4 atm x 1L = 1 atm x 4L', {
      fill: colors.textPrimary,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Warning box
    r.rect(100, 310, 250, 100, { fill: '#7f1d1d40', stroke: colors.danger, rx: 12 });
    r.text(225, 335, 'Why This Matters', { fill: colors.danger, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    const warnings = [
      'At 30m, pressure is 4x surface',
      'Air compressed to 1/4 surface volume',
      'On ascent: volume increases 4x',
      'Lungs can rupture at just 1-2m!',
    ];
    warnings.forEach((w, i) => {
      r.text(115, 355 + i * 14, '* ' + w, { fill: colors.textSecondary, fontSize: 10 });
    });

    // Safe practice box
    r.rect(370, 310, 230, 100, { fill: '#10b98120', stroke: colors.success, rx: 12 });
    r.text(485, 335, 'Safe Diving Practice', { fill: colors.success, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    const safe = [
      'NEVER hold breath while ascending',
      'Exhale continuously in emergencies',
      'Ascend slowly (max 9m/min)',
      'Safety stop at 5m for 3 minutes',
    ];
    safe.forEach((s, i) => {
      r.text(385, 355 + i * 14, '* ' + s, { fill: colors.textSecondary, fontSize: 10 });
    });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', {
      fill: colors.accent,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Main insight card
    r.rect(100, 80, 500, 150, { fill: '#581c8740', stroke: colors.accent, rx: 16 });
    r.text(350, 115, 'The Ideal Gas Law Saves Lives!', {
      fill: colors.accent,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(120, 145, 'Understanding PV = nRT is critical in:', { fill: colors.textSecondary, fontSize: 13 });

    const applications = [
      { app: 'Scuba diving', desc: 'Prevents fatal lung overexpansion' },
      { app: 'Aviation', desc: 'Cabin pressurization protects passengers' },
      { app: 'Medicine', desc: 'Hyperbaric chambers treat decompression sickness' },
      { app: 'Space travel', desc: 'Suit and cabin pressure management' },
    ];

    applications.forEach((a, i) => {
      r.text(140, 170 + i * 18, `* ${a.app}`, { fill: colors.secondary, fontSize: 11, fontWeight: 'bold' });
      r.text(270, 170 + i * 18, `- ${a.desc}`, { fill: colors.textSecondary, fontSize: 11 });
    });

    // Combined gas law
    r.rect(150, 260, 400, 60, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(350, 295, 'P1V1/T1 = P2V2/T2', {
      fill: colors.success,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
      fontFamily: 'monospace',
    });
    r.text(350, 315, 'A simple equation can predict life-threatening situations!', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(350, 35, 'Real-World Applications', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // App tabs
    applications.forEach((app, i) => {
      const isSelected = i === this.selectedApp;
      const isCompleted = this.completedApps[i];

      r.rect(60 + i * 160, 60, 150, 35, {
        fill: isSelected ? colors.primary : colors.bgCard,
        stroke: isCompleted ? colors.success : colors.border,
        rx: 8,
      });
      r.text(135 + i * 160, 82, app.short, {
        fill: isSelected ? colors.textPrimary : colors.textSecondary,
        fontSize: 12,
        textAnchor: 'middle',
      });
    });

    // Selected app content
    const app = applications[this.selectedApp];

    r.rect(60, 110, 580, 300, { fill: colors.bgCard, stroke: colors.border, rx: 12 });

    // App header
    r.text(100, 145, app.title, { fill: colors.textPrimary, fontSize: 18, fontWeight: 'bold' });
    r.text(100, 165, app.tagline, { fill: colors.secondary, fontSize: 12 });

    // Description
    r.text(100, 195, app.description, { fill: colors.textSecondary, fontSize: 11 });

    // Connection to gas law
    r.rect(80, 215, 540, 50, { fill: '#3b82f620', stroke: '#3b82f640', rx: 8 });
    r.text(100, 235, 'How PV = nRT Applies:', { fill: colors.primary, fontSize: 11, fontWeight: 'bold' });
    r.text(100, 252, app.connection, { fill: colors.textSecondary, fontSize: 10 });

    // How it works
    r.rect(80, 275, 540, 40, { fill: colors.bgDark, stroke: colors.border, rx: 8 });
    r.text(100, 295, 'How It Works:', { fill: colors.textMuted, fontSize: 10, fontWeight: 'bold' });
    r.text(100, 308, app.howItWorks, { fill: colors.textSecondary, fontSize: 9 });

    // Stats
    app.stats.forEach((stat, i) => {
      r.rect(80 + i * 135, 325, 125, 50, { fill: colors.bgDark, stroke: colors.border, rx: 6 });
      r.text(142 + i * 135, 348, stat.value, { fill: colors.secondary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(142 + i * 135, 365, stat.label, { fill: colors.textMuted, fontSize: 8, textAnchor: 'middle' });
    });

    // Progress indicator
    r.text(350, 430, `Progress: ${this.completedApps.filter(c => c).length}/4`, {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });

    this.completedApps.forEach((completed, i) => {
      r.circle(310 + i * 25, 450, 6, {
        fill: completed ? colors.success : colors.bgCardLight,
        stroke: completed ? colors.success : colors.border,
      });
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
    r.rect(80, 55, 540, 50, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
    r.text(350, 85, q.scenario, {
      fill: colors.secondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Question
    r.text(350, 130, q.question, {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Answer options
    q.options.forEach((option, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;

      r.rect(100, 160 + i * 55, 500, 45, {
        fill: isSelected ? colors.primary + '40' : colors.bgCard,
        stroke: isSelected ? colors.primary : colors.border,
        rx: 8,
      });
      r.text(350, 188 + i * 55, option, {
        fill: isSelected ? colors.primary : colors.textSecondary,
        fontSize: 13,
        textAnchor: 'middle',
      });
    });

    // Question navigation dots
    for (let i = 0; i < testQuestions.length; i++) {
      const hasAnswer = this.testAnswers[i] !== null;
      r.circle(235 + i * 25, 420, 6, {
        fill: i === this.testQuestion ? colors.primary : (hasAnswer ? colors.success : colors.bgCardLight),
        stroke: i === this.testQuestion ? colors.primary : colors.border,
      });
    }
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

    r.text(350, 180, passed
      ? 'You\'ve mastered the Ideal Gas Law!'
      : 'Review the concepts and try again.',
      {
        fill: colors.textSecondary,
        fontSize: 16,
        textAnchor: 'middle',
      }
    );

    // Show correct/incorrect for each question
    r.rect(100, 210, 500, 200, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(350, 235, 'Question Summary', { fill: colors.textMuted, fontSize: 14, textAnchor: 'middle' });

    for (let i = 0; i < testQuestions.length; i++) {
      const isCorrect = this.testAnswers[i] === testQuestions[i].correctIndex;
      const row = Math.floor(i / 5);
      const col = i % 5;

      r.circle(150 + col * 85, 270 + row * 50, 15, {
        fill: isCorrect ? colors.success + '40' : colors.danger + '40',
        stroke: isCorrect ? colors.success : colors.danger,
      });
      r.text(150 + col * 85, 275 + row * 50, `${i + 1}`, {
        fill: isCorrect ? colors.success : colors.danger,
        fontSize: 12,
        textAnchor: 'middle',
      });
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Trophy/celebration
    r.text(350, 100, 'Ideal Gas Law Master!', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 140, 'You\'ve mastered PV = nRT and can predict gas behavior!', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    // Equation display
    r.rect(250, 170, 200, 50, { fill: colors.bgCard, stroke: colors.primary, rx: 12 });
    r.text(350, 202, 'PV = nRT', {
      fill: colors.secondary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
      fontFamily: 'monospace',
    });

    // Achievement badges
    const badges = [
      { icon: 'CHART', label: 'Boyle\'s Law' },
      { icon: 'TEMP', label: 'Charles\'s Law' },
      { icon: 'FIRE', label: 'Gay-Lussac\'s Law' },
      { icon: 'DIVER', label: 'Diving Safety' },
    ];

    badges.forEach((badge, i) => {
      r.rect(130 + i * 140, 250, 120, 80, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
      r.text(190 + i * 140, 290, badge.icon, { fill: colors.primary, fontSize: 24, textAnchor: 'middle' });
      r.text(190 + i * 140, 315, badge.label, { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    });
  }

  // === UI STATE ===

  private renderUI(r: CommandRenderer): void {
    r.setHeader(this.gameTitle, this.phaseLabels[this.phase]);

    r.setProgress({
      id: 'phase_progress',
      current: this.phaseOrder.indexOf(this.phase) + 1,
      total: this.phaseOrder.length,
      labels: this.phaseOrder.map(p => this.phaseLabels[p]),
      color: colors.primary,
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
        r.addToggle({
          id: 'animation',
          label: 'Animation',
          value: this.isAnimating,
          onLabel: 'ON',
          offLabel: 'OFF',
        });
        r.addButton({ id: 'next', label: 'Continue', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A: Stays same', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B: Doubles', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C: Quadruples', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D: Decreases', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'play':
        r.addButton({ id: 'lock_T', label: 'Lock T', variant: this.lockedVariable === 'T' ? 'warning' : 'ghost' });
        r.addButton({ id: 'lock_V', label: 'Lock V', variant: this.lockedVariable === 'V' ? 'warning' : 'ghost' });
        r.addButton({ id: 'lock_P', label: 'Lock P', variant: this.lockedVariable === 'P' ? 'warning' : 'ghost' });

        if (this.lockedVariable !== 'V') {
          r.addSlider({ id: 'volume', label: 'Volume (L)', value: this.volume, min: 0.5, max: 2.0, step: 0.1 });
        }
        if (this.lockedVariable !== 'T') {
          r.addSlider({ id: 'temperature', label: 'Temperature (K)', value: this.temperature, min: 200, max: 500, step: 10 });
        }

        r.addToggle({ id: 'animation', label: 'Animate', value: this.isAnimating, onLabel: 'ON', offLabel: 'OFF' });
        r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A: Stays 2L', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B: Compresses', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C: Expands to 8L', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D: Leaks out', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Tires', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Balloons', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Diving', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Cylinders', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every(c => c)) {
          r.addButton({ id: 'next', label: 'Take Quiz', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= testQuestions.length - 1 });

          // Answer buttons
          for (let i = 0; i < 4; i++) {
            r.addButton({
              id: `answer_${i}`,
              label: ['A', 'B', 'C', 'D'][i],
              variant: this.testAnswers[this.testQuestion] === i ? 'primary' : 'secondary',
            });
          }

          if (this.testAnswers.every(a => a !== null)) {
            r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
          }
        } else {
          const score = this.calculateTestScore();
          if (score >= 7) {
            r.addButton({ id: 'next', label: 'Complete!', variant: 'success' });
          } else {
            r.addButton({ id: 'test_retry', label: 'Review & Retry', variant: 'secondary' });
          }
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

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      pressure: this.pressure,
      volume: this.volume,
      temperature: this.temperature,
      moles: this.moles,
      lockedVariable: this.lockedVariable,
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
    this.pressure = (state.pressure as number) || 100;
    this.volume = (state.volume as number) || 1.0;
    this.temperature = (state.temperature as number) || 300;
    this.moles = (state.moles as number) || 0.04;
    this.lockedVariable = (state.lockedVariable as 'P' | 'V' | 'T') || 'T';
    this.isAnimating = (state.isAnimating as boolean) || false;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;

    this.initializeMolecules();
  }
}

// === FACTORY FUNCTION ===
export function createIdealGasLawGame(sessionId: string): IdealGasLawGame {
  return new IdealGasLawGame(sessionId);
}
