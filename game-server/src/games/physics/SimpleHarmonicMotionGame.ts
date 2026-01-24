/**
 * Simple Harmonic Motion Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED PHYSICS (never sent to client):
 * - Period: T = 2*PI*sqrt(L/g)
 * - Angular frequency: omega = sqrt(g/L)
 * - Position: theta(t) = A*cos(omega*t)
 * - Energy conservation: KE + PE = constant
 * - Large angle correction: T_actual = T * [1 + (1/16)*theta^2 + ...]
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

// === TEST QUESTIONS (PROTECTED - never sent to client) ===
interface TestQuestion {
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const testQuestions: TestQuestion[] = [
  {
    scenario: 'A grandfather clock uses a pendulum that swings back and forth every 2 seconds to keep accurate time.',
    question: 'What determines the period of the pendulum\'s swing?',
    options: [
      'The mass of the pendulum bob',
      'The length of the pendulum',
      'How hard you push it initially',
      'The color of the pendulum',
    ],
    correctIndex: 1,
    explanation: 'The period T = 2*PI*sqrt(L/g) depends only on the pendulum\'s length and gravitational acceleration. Mass and initial amplitude (for small angles) don\'t affect the period!',
  },
  {
    scenario: 'A child is swinging on a playground swing. Their parent wants them to swing faster (higher frequency).',
    question: 'What should the child do to increase the swing frequency?',
    options: [
      'Swing their legs to go higher',
      'Move to a swing with shorter chains',
      'Add weight by holding a backpack',
      'Push off harder from the ground',
    ],
    correctIndex: 1,
    explanation: 'Frequency = 1/T, and T = 2*PI*sqrt(L/g). A shorter pendulum (shorter chains) has a shorter period and therefore higher frequency.',
  },
  {
    scenario: 'An engineer is designing a metronome for musicians that needs to tick at exactly 120 beats per minute (2 Hz).',
    question: 'Using T = 2*PI*sqrt(L/g), what length pendulum is needed?',
    options: [
      'About 0.062 meters (6.2 cm)',
      'About 0.25 meters (25 cm)',
      'About 1 meter (100 cm)',
      'About 2 meters (200 cm)',
    ],
    correctIndex: 0,
    explanation: 'For f=2Hz, T=0.5s. Using T=2*PI*sqrt(L/g): 0.5=2*PI*sqrt(L/9.81), solving gives L=0.062m. Short pendulums swing fast!',
  },
  {
    scenario: 'A pendulum is swinging back and forth. At the moment it reaches its maximum displacement (highest point in swing)...',
    question: 'What is the relationship between kinetic and potential energy at this point?',
    options: [
      'Maximum kinetic energy, minimum potential energy',
      'Maximum potential energy, minimum (zero) kinetic energy',
      'Both kinetic and potential energy are at their maximum',
      'Both kinetic and potential energy are zero',
    ],
    correctIndex: 1,
    explanation: 'At maximum displacement, the pendulum momentarily stops (v=0, so KE=0) and is at its highest point (maximum PE). Energy continuously converts between KE and PE.',
  },
  {
    scenario: 'You\'re timing a pendulum and notice it completes 10 full swings in 25 seconds.',
    question: 'What is the frequency of this pendulum?',
    options: [
      '0.25 Hz',
      '0.4 Hz',
      '2.5 Hz',
      '10 Hz',
    ],
    correctIndex: 1,
    explanation: 'Period T = 25s/10 swings = 2.5 seconds per swing. Frequency f = 1/T = 1/2.5 = 0.4 Hz.',
  },
  {
    scenario: 'A simple pendulum on Earth has a period of 2 seconds. The same pendulum is taken to the Moon where gravity is 1/6 of Earth\'s.',
    question: 'What happens to the pendulum\'s period on the Moon?',
    options: [
      'It decreases to about 0.82 seconds',
      'It stays exactly 2 seconds',
      'It increases to about 4.9 seconds',
      'The pendulum won\'t swing on the Moon',
    ],
    correctIndex: 2,
    explanation: 'T = 2*PI*sqrt(L/g). With g reduced to g/6, T_moon = sqrt(6) * T_earth = 2.45 * 2s = 4.9s. Weaker gravity means slower swinging!',
  },
  {
    scenario: 'The position of a simple harmonic oscillator follows x(t) = A*cos(omega*t), where A is amplitude and omega is angular frequency.',
    question: 'If you double the angular frequency omega, what happens to the period?',
    options: [
      'Period doubles',
      'Period is cut in half',
      'Period stays the same',
      'Period becomes zero',
    ],
    correctIndex: 1,
    explanation: 'Period T = 2*PI/omega. If omega doubles, T becomes half: T_new = 2*PI/(2*omega) = T/2.',
  },
  {
    scenario: 'A mass on a spring oscillates up and down. The spring constant k = 100 N/m and the mass m = 0.25 kg.',
    question: 'Using T = 2*PI*sqrt(m/k), what is the period of oscillation?',
    options: [
      'About 0.1 seconds',
      'About 0.31 seconds',
      'About 1 second',
      'About 6.28 seconds',
    ],
    correctIndex: 1,
    explanation: 'T = 2*PI*sqrt(m/k) = 2*PI*sqrt(0.25/100) = 2*PI*0.05 = 0.314 seconds.',
  },
  {
    scenario: 'You\'re designing a car\'s suspension system. Each shock absorber has a spring constant of 50,000 N/m, and the car\'s mass per wheel is 400 kg.',
    question: 'Approximately how many oscillations per second will the car bounce at?',
    options: [
      'About 0.3 Hz',
      'About 1.8 Hz',
      'About 10 Hz',
      'About 50 Hz',
    ],
    correctIndex: 1,
    explanation: 'T = 2*PI*sqrt(m/k) = 2*PI*sqrt(400/50000) = 0.56s. Frequency f = 1/0.56 = 1.8 Hz. A comfortable bounce rate!',
  },
  {
    scenario: 'The equation for simple harmonic motion can be written as x(t) = A*cos(2*PI*f*t + phi), where phi is the phase angle.',
    question: 'If phi = PI/2, how does this change the motion compared to phi = 0?',
    options: [
      'The amplitude becomes larger',
      'The frequency increases',
      'The motion starts at x=0 instead of x=A',
      'The motion reverses direction',
    ],
    correctIndex: 2,
    explanation: 'cos(theta + PI/2) = -sin(theta), so with phi=PI/2, x(0)=A*cos(PI/2)=0. The oscillation starts at equilibrium.',
  },
];

// === TRANSFER APPLICATIONS (PROTECTED) ===
interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string;
  stats: string[];
  examples: string[];
  companies: string[];
  futureImpact: string;
}

const transferApps: TransferApp[] = [
  {
    icon: 'clock',
    title: 'Precision Timekeeping',
    short: 'Clocks',
    tagline: 'The heartbeat of accurate time',
    description: 'Pendulum clocks revolutionized timekeeping by using SHM\'s constant period.',
    connection: 'Period depends only on length (not amplitude), making it ideal for timekeeping.',
    howItWorks: 'A pendulum swings with period T=2*PI*sqrt(L/g). Each swing releases one gear tooth.',
    stats: ['Pendulum clocks accurate to 1 second per year', 'Quartz crystals vibrate at 32,768 Hz', 'Atomic clocks use cesium at 9.2 GHz'],
    examples: ['Grandfather clocks', 'Quartz wristwatches', 'GPS atomic clocks', 'Metronomes'],
    companies: ['Rolex', 'Seiko', 'NIST', 'Apple Watch'],
    futureImpact: 'Optical atomic clocks will achieve 1 second error over the age of the universe.',
  },
  {
    icon: 'car',
    title: 'Vehicle Suspension Systems',
    short: 'Suspension',
    tagline: 'Smooth rides through oscillation control',
    description: 'Car suspensions use springs and dampers that follow SHM principles.',
    connection: 'Natural frequency f = (1/2*PI)*sqrt(k/m). Engineers tune to avoid resonance.',
    howItWorks: 'Suspension compresses and oscillates. Shock absorbers dissipate energy to prevent bouncing.',
    stats: ['Typical suspension: 1-2 Hz', 'Active suspension: 1000+ adjustments/second', 'Magnetic dampers: 5ms response'],
    examples: ['MacPherson struts', 'Air suspension', 'Magnetic MagneRide', 'Motorcycle forks'],
    companies: ['Bose', 'Tesla', 'BWI Group', 'ZF Friedrichshafen'],
    futureImpact: 'AI-controlled predictive suspension will read roads ahead with cameras.',
  },
  {
    icon: 'building',
    title: 'Structural Engineering',
    short: 'Buildings',
    tagline: 'Keeping structures stable against vibrations',
    description: 'Buildings have natural frequencies. Engineers design to avoid dangerous resonance.',
    connection: 'Every structure has f = (1/2*PI)*sqrt(k/m). Matching external forces causes resonance.',
    howItWorks: 'Tuned mass dampers oscillate opposite to building sway, canceling the motion.',
    stats: ['Taipei 101 damper: 730 tons', 'Millennium Bridge: 1 Hz resonance', 'Earthquake freq: 0.1-10 Hz'],
    examples: ['Taipei 101 pendulum damper', 'Shanghai Tower damper', 'London Millennium Bridge', 'Base isolators'],
    companies: ['ARUP', 'Thornton Tomasetti', 'Motioneering', 'Taylor Devices'],
    futureImpact: 'Smart buildings will have AI-controlled active damping systems.',
  },
  {
    icon: 'music',
    title: 'Musical Instruments',
    short: 'Music',
    tagline: 'Vibrations creating harmony',
    description: 'Every musical note is a specific frequency of vibration following SHM.',
    connection: 'String frequency f = (1/2L)*sqrt(T/mu), where L is length, T is tension.',
    howItWorks: 'Plucking creates fundamental frequency plus harmonics, creating unique timbre.',
    stats: ['Concert A = 440 Hz', 'Piano strings: 200+ lbs tension', 'Human hearing: 20-20,000 Hz'],
    examples: ['Guitar strings', 'Piano hammers', 'Wind instruments', 'Tuning forks'],
    companies: ['Yamaha', 'Steinway', 'Fender', 'Martin Guitar'],
    futureImpact: 'Electronic instruments will use perfect SHM models for unprecedented realism.',
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#f59e0b', // Amber
  primaryDark: '#d97706',
  primaryLight: '#fbbf24',
  accent: '#eab308', // Yellow
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
  cyan: '#06b6d4',
  purple: '#a855f7',
  pink: '#ec4899',
  emerald: '#10b981',
  red: '#ef4444',
  blue: '#3b82f6',
};

// === MAIN GAME CLASS ===

export class SimpleHarmonicMotionGame extends BaseGame {
  readonly gameType = 'simple_harmonic_motion';
  readonly gameTitle = 'Simple Harmonic Motion';

  // --- PROTECTED PHYSICS CONSTANTS ---
  private readonly g = 9.81; // m/s^2

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Pendulum state
  private pendulumAngle = 30; // degrees
  private angularVelocity = 0;
  private time = 0;
  private amplitude = 30; // degrees (release angle)
  private length = 1.5; // meters
  private isAnimating = false;
  private showEnergyBars = true;

  // Trail for wave graph
  private trailPoints: Array<{ x: number; y: number; t: number }> = [];

  // Teaching milestones
  private milestones = {
    observedOscillation: false,
    changedLength: false,
    changedAmplitude: false,
    understoodPeriod: false,
    trackedEnergy: false,
  };

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
    twist_predict: 'Twist',
    twist_play: 'Twist Lab',
    twist_review: 'Discovery',
    transfer: 'Apply',
    test: 'Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'A pendulum swings with perfect regularity. What determines its rhythm?',
    predict: 'What do you think affects how fast a pendulum swings?',
    play: 'Experiment with the pendulum. Watch the energy transform!',
    review: 'Period T = 2*PI*sqrt(L/g) - length is the key!',
    twist_predict: 'What happens with VERY large swing angles?',
    twist_play: 'Try different angles and compare the actual period to the formula.',
    twist_review: 'The simple formula is an approximation that works for small angles.',
    transfer: 'See how SHM powers clocks, cars, buildings, and music!',
    test: 'Time to test your understanding of oscillations!',
    mastery: 'Congratulations! You\'ve mastered Simple Harmonic Motion!',
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
      message: 'Simple Harmonic Motion lesson started',
    });
  }

  // === PROTECTED PHYSICS CALCULATIONS ===

  /**
   * Calculate pendulum period: T = 2*PI*sqrt(L/g)
   * This formula is NEVER sent to the client
   */
  private calculatePeriod(): number {
    return 2 * Math.PI * Math.sqrt(this.length / this.g);
  }

  /**
   * Calculate frequency: f = 1/T
   */
  private calculateFrequency(): number {
    return 1 / this.calculatePeriod();
  }

  /**
   * Calculate angular frequency: omega = sqrt(g/L)
   */
  private calculateAngularFrequency(): number {
    return Math.sqrt(this.g / this.length);
  }

  /**
   * Calculate position using SHM equation: theta(t) = A * cos(omega * t)
   */
  private calculatePosition(t: number): number {
    const omega = this.calculateAngularFrequency();
    const amplitudeRad = (this.amplitude * Math.PI) / 180;
    return amplitudeRad * Math.cos(omega * t);
  }

  /**
   * Calculate angular velocity: omega_dot = -A * omega * sin(omega * t)
   */
  private calculateAngularVelocityAt(t: number): number {
    const omega = this.calculateAngularFrequency();
    const amplitudeRad = (this.amplitude * Math.PI) / 180;
    return -omega * amplitudeRad * Math.sin(omega * t);
  }

  /**
   * Calculate large angle correction factor
   * Full formula: T_actual = T_ideal * [1 + (1/16)*theta^2 + (11/3072)*theta^4 + ...]
   */
  private calculateLargeAngleCorrectionFactor(): number {
    const angleRad = (this.amplitude * Math.PI) / 180;
    return 1 + (1 / 16) * angleRad ** 2 + (11 / 3072) * angleRad ** 4;
  }

  /**
   * Calculate actual period with large angle correction
   */
  private calculateActualPeriod(): number {
    return this.calculatePeriod() * this.calculateLargeAngleCorrectionFactor();
  }

  /**
   * Calculate energy distribution (normalized)
   * PE + KE = constant (conservation of energy)
   */
  private calculateEnergies(): { pe: number; ke: number; pePercent: number; kePercent: number } {
    const maxPE = 0.5 * ((this.amplitude * Math.PI) / 180) ** 2;
    const currentAngleRad = (this.pendulumAngle * Math.PI) / 180;
    const pe = 0.5 * currentAngleRad ** 2;
    const ke = maxPE - pe;

    return {
      pe,
      ke,
      pePercent: maxPE > 0 ? (pe / maxPE) * 100 : 0,
      kePercent: maxPE > 0 ? (ke / maxPE) * 100 : 0,
    };
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
      this.emitCoachEvent('prediction_made', { twistPrediction: this.twistPrediction });
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

    // Simulation controls
    if (id === 'start') {
      this.startAnimation();
      return;
    }
    if (id === 'stop') {
      this.stopAnimation();
      return;
    }
    if (id === 'reset') {
      this.resetSimulation();
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'energy_bars') {
      this.showEnergyBars = value;
      return;
    }
    if (id === 'guided_mode') {
      this.guidedMode = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'length') {
      this.length = value;
      if (!this.milestones.changedLength) {
        this.milestones.changedLength = true;
        this.emitCoachEvent('milestone_reached', { milestone: 'changedLength' });
      }
      return;
    }
    if (id === 'amplitude') {
      this.amplitude = value;
      if (!this.milestones.changedAmplitude) {
        this.milestones.changedAmplitude = true;
        this.emitCoachEvent('milestone_reached', { milestone: 'changedAmplitude' });
      }
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

  // === SIMULATION CONTROLS ===

  private startAnimation(): void {
    this.time = 0;
    this.trailPoints = [];
    this.pendulumAngle = this.amplitude;
    this.angularVelocity = 0;
    this.isAnimating = true;

    if (!this.milestones.observedOscillation) {
      this.milestones.observedOscillation = true;
      this.emitCoachEvent('milestone_reached', { milestone: 'observedOscillation' });
    }

    this.emitCoachEvent('simulation_started', { amplitude: this.amplitude, length: this.length });
  }

  private stopAnimation(): void {
    this.isAnimating = false;
    this.emitCoachEvent('simulation_stopped', {});
  }

  private resetSimulation(): void {
    this.time = 0;
    this.trailPoints = [];
    this.pendulumAngle = this.amplitude;
    this.angularVelocity = 0;
    this.isAnimating = false;
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

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'hook' && this.phase !== 'play' && this.phase !== 'twist_play') return;

    const dt = deltaTime / 1000;
    this.time += dt;

    // Calculate position using SHM equation
    const angleRadians = this.calculatePosition(this.time);
    const angleDegrees = (angleRadians * 180) / Math.PI;
    this.pendulumAngle = angleDegrees;

    // Calculate angular velocity
    this.angularVelocity = this.calculateAngularVelocityAt(this.time);

    // Track position for wave trail
    const newPoint = { x: this.time, y: angleDegrees, t: this.time };
    this.trailPoints.push(newPoint);

    // Keep only recent points (last 5 seconds)
    this.trailPoints = this.trailPoints.filter((p) => p.t > this.time - 5).slice(-200);
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
    // Ambient glow effects
    r.circle(175, 100, 150, { fill: colors.primary, opacity: 0.03 });
    r.circle(525, 400, 150, { fill: colors.accent, opacity: 0.03 });
    r.circle(350, 250, 200, { fill: colors.primary, opacity: 0.02 });

    // Subtle grid
    for (let x = 0; x < 700; x += 35) {
      r.line(x, 0, x, 500, { stroke: colors.bgCardLight, strokeWidth: 0.5, opacity: 0.3 });
    }
    for (let y = 0; y < 500; y += 35) {
      r.line(0, y, 700, y, { stroke: colors.bgCardLight, strokeWidth: 0.5, opacity: 0.3 });
    }
  }

  // --- PHASE RENDERERS ---

  private renderHook(r: CommandRenderer): void {
    // Premium badge
    r.rect(275, 30, 150, 26, { fill: `${colors.primary}20`, stroke: `${colors.primary}40`, rx: 13 });
    r.circle(290, 43, 4, { fill: colors.primary });
    r.text(350, 48, 'PHYSICS EXPLORATION', { fill: colors.primary, fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    // Title
    r.text(350, 90, 'The Rhythm of the Universe', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Pendulum visualization
    this.renderPendulum(r, 350, 160, 180, false);

    // Description
    r.text(350, 380, 'A pendulum swings with perfect regularity,', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 400, 'regardless of how high you release it!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.text(350, 435, 'What determines how fast a pendulum swings?', {
      fill: colors.cyan,
      fontSize: 16,
      fontWeight: 'bold',
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

    // Scenario card
    r.rect(100, 80, 500, 80, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(350, 110, 'A grandfather clock has a pendulum that swings every 2 seconds.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 130, 'You want to make it swing faster.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 150, 'What would change the pendulum\'s period?', {
      fill: colors.cyan,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Prediction options displayed visually
    const options = [
      { id: 'A', text: 'Increasing the mass of the bob' },
      { id: 'B', text: 'Shortening the pendulum length' },
      { id: 'C', text: 'Pulling it back farther before releasing' },
      { id: 'D', text: 'Pushing it harder when releasing' },
    ];

    options.forEach((opt, i) => {
      const isSelected = this.prediction === opt.id;
      const isCorrect = opt.id === 'B';
      const showFeedback = this.prediction !== null;

      let fillColor = colors.bgCardLight;
      let strokeColor = colors.border;

      if (showFeedback && isSelected) {
        fillColor = isCorrect ? `${colors.success}40` : `${colors.danger}40`;
        strokeColor = isCorrect ? colors.success : colors.danger;
      } else if (showFeedback && isCorrect) {
        fillColor = `${colors.success}40`;
        strokeColor = colors.success;
      }

      r.rect(150, 175 + i * 55, 400, 45, { fill: fillColor, stroke: strokeColor, rx: 10 });
      r.text(170, 203 + i * 55, `${opt.id}.`, { fill: colors.textPrimary, fontSize: 14, fontWeight: 'bold' });
      r.text(195, 203 + i * 55, opt.text, { fill: colors.textSecondary, fontSize: 13 });
    });

    // Feedback
    if (this.prediction) {
      r.rect(100, 400, 500, 60, { fill: colors.bgCard, stroke: colors.success, rx: 12 });
      r.text(350, 425, 'The length is the key! Period T = 2*PI*sqrt(L/g)', {
        fill: colors.success,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
      r.text(350, 445, 'Mass and amplitude don\'t affect period for small angles!', {
        fill: colors.textMuted,
        fontSize: 12,
        textAnchor: 'middle',
      });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(350, 30, 'Pendulum Laboratory', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Pendulum visualization (left side)
    this.renderPendulum(r, 200, 70, 200, true);

    // Energy bars (right side)
    if (this.showEnergyBars) {
      const energies = this.calculateEnergies();
      this.renderEnergyBars(r, 420, 80, energies);
    }

    // Period/Frequency info
    const period = this.calculatePeriod();
    const freq = this.calculateFrequency();
    r.rect(380, 220, 280, 60, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
    r.text(520, 245, `Period: T = ${period.toFixed(3)}s`, { fill: colors.success, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(520, 265, `Frequency: f = ${freq.toFixed(3)} Hz`, { fill: colors.blue, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Wave graph
    this.renderWaveGraph(r, 50, 310, 600, 100);

    // Key insight
    r.rect(100, 420, 500, 50, { fill: `${colors.primary}20`, stroke: `${colors.primary}40`, rx: 10 });
    r.text(350, 440, 'Key Discovery: T = 2*PI*sqrt(L/g)', { fill: colors.primary, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 458, 'Period depends only on length and gravity!', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(350, 40, 'Simple Harmonic Motion Explained', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Four info cards
    const cards = [
      { title: 'The Mathematics', color: colors.primary, items: ['Position: theta(t) = A*cos(omega*t)', 'Period: T = 2*PI*sqrt(L/g)', 'Frequency: f = 1/T', 'Angular freq: omega = sqrt(g/L)'] },
      { title: 'Energy Conservation', color: colors.cyan, items: ['At max displacement: 100% PE, 0% KE', 'At equilibrium: 0% PE, 100% KE', 'Total: KE + PE = constant', 'Energy oscillates between forms'] },
      { title: 'Restoring Force', color: colors.emerald, items: ['Force points toward equilibrium', 'F = -mg*sin(theta) ~ -mg*theta', 'Proportional to displacement', 'Creates oscillating motion'] },
      { title: 'Key Properties', color: colors.purple, items: ['Period independent of amplitude', 'Period independent of mass', 'Sinusoidal motion (cosine wave)', 'Isochronism: equal time swings'] },
    ];

    cards.forEach((card, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 60 + col * 310;
      const y = 70 + row * 170;

      r.rect(x, y, 280, 150, { fill: colors.bgCard, stroke: card.color, rx: 12 });
      r.text(x + 140, y + 25, card.title, { fill: card.color, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      card.items.forEach((item, j) => {
        r.text(x + 15, y + 50 + j * 25, item, { fill: colors.textSecondary, fontSize: 11 });
      });
    });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist Challenge', {
      fill: colors.purple,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Historical context
    r.rect(100, 80, 500, 70, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(350, 105, 'Galileo discovered pendulum isochronism by watching', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 125, 'a chandelier swing in the Pisa Cathedral. He timed it with his pulse!', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 145, 'What happens with a VERY large angle (like 90 degrees)?', {
      fill: colors.cyan,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Options
    const options = [
      { id: 'A', text: 'The period stays exactly the same' },
      { id: 'B', text: 'The period becomes shorter (faster swings)' },
      { id: 'C', text: 'The period becomes longer (slower swings)' },
      { id: 'D', text: 'The pendulum stops oscillating' },
    ];

    options.forEach((opt, i) => {
      const isSelected = this.twistPrediction === opt.id;
      const isCorrect = opt.id === 'C';
      const showFeedback = this.twistPrediction !== null;

      let fillColor = colors.bgCardLight;
      let strokeColor = colors.border;

      if (showFeedback && isSelected) {
        fillColor = isCorrect ? `${colors.success}40` : `${colors.danger}40`;
        strokeColor = isCorrect ? colors.success : colors.danger;
      } else if (showFeedback && isCorrect) {
        fillColor = `${colors.success}40`;
        strokeColor = colors.success;
      }

      r.rect(150, 170 + i * 55, 400, 45, { fill: fillColor, stroke: strokeColor, rx: 10 });
      r.text(170, 198 + i * 55, `${opt.id}.`, { fill: colors.textPrimary, fontSize: 14, fontWeight: 'bold' });
      r.text(195, 198 + i * 55, opt.text, { fill: colors.textSecondary, fontSize: 13 });
    });

    // Feedback
    if (this.twistPrediction) {
      r.rect(100, 400, 500, 60, { fill: colors.bgCard, stroke: colors.success, rx: 12 });
      r.text(350, 420, 'The period actually increases for large angles!', {
        fill: colors.success,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
      r.text(350, 440, 'The simple formula only works for small angles (sin(theta) ~ theta)', {
        fill: colors.textMuted,
        fontSize: 12,
        textAnchor: 'middle',
      });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(350, 30, 'Large Angle Effects', {
      fill: colors.purple,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const period = this.calculatePeriod();
    const actualPeriod = this.calculateActualPeriod();
    const correction = this.calculateLargeAngleCorrectionFactor();

    // Period comparison
    r.rect(50, 60, 300, 180, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(200, 85, 'Period Comparison', { fill: colors.cyan, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Small angle formula bar
    r.text(70, 115, 'Small angle formula:', { fill: colors.emerald, fontSize: 11 });
    r.text(290, 115, `${period.toFixed(3)}s`, { fill: colors.emerald, fontSize: 11, textAnchor: 'end' });
    r.rect(70, 125, 250, 20, { fill: colors.bgCardLight, rx: 4 });
    r.rect(70, 125, 250, 20, { fill: `${colors.emerald}70`, rx: 4 });

    // Actual period bar
    r.text(70, 165, `Actual (at ${this.amplitude} degrees):`, { fill: colors.primary, fontSize: 11 });
    r.text(290, 165, `${actualPeriod.toFixed(3)}s`, { fill: colors.primary, fontSize: 11, textAnchor: 'end' });
    r.rect(70, 175, 250, 20, { fill: colors.bgCardLight, rx: 4 });
    const actualWidth = Math.min((actualPeriod / period) * 250, 250);
    r.rect(70, 175, actualWidth, 20, { fill: `${colors.primary}70`, rx: 4 });

    r.text(200, 220, `Difference: +${((correction - 1) * 100).toFixed(1)}%`, {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Why this happens
    r.rect(370, 60, 280, 180, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(510, 85, 'Why This Happens', { fill: colors.purple, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const reasons = [
      'Small angle: sin(theta) ~ theta',
      'Large angle: sin(theta) < theta',
      'Weaker restoring force',
      'Slower return = longer period',
      'At 90 deg: ~18% longer than predicted',
    ];
    reasons.forEach((reason, i) => {
      r.text(390, 110 + i * 22, reason, { fill: colors.textSecondary, fontSize: 11 });
    });

    // Full formula
    r.rect(370, 195, 260, 35, { fill: `${colors.purple}20`, rx: 6 });
    r.text(500, 218, 'T = T_ideal * [1 + (1/4)sin^2(theta/2) + ...]', {
      fill: colors.purple,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Pendulum visualization
    this.renderPendulum(r, 350, 280, 150, true);
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery', {
      fill: colors.purple,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 200, { fill: `${colors.purple}10`, stroke: `${colors.purple}40`, rx: 16 });
    r.text(350, 125, 'The Limits of Simple Harmonic Motion', {
      fill: colors.purple,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 160, 'Simple Harmonic Motion is an idealization that', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 180, 'works beautifully for small oscillations:', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });

    const items = ['Pendulums with small angles (<15 degrees)', 'Springs within their elastic limit', 'Systems without friction or damping'];
    items.forEach((item, i) => {
      r.text(180, 210 + i * 22, '  ' + item, { fill: colors.textSecondary, fontSize: 12 });
    });

    r.text(350, 280, 'Real systems deviate from perfect SHM, but the model', {
      fill: colors.primary,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 300, 'remains incredibly useful for understanding oscillatory motion!', {
      fill: colors.primary,
      fontSize: 13,
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
    const appColors = [colors.primary, colors.blue, colors.textMuted, colors.purple];
    transferApps.forEach((app, i) => {
      const isSelected = i === this.selectedApp;
      const isCompleted = this.completedApps[i];

      r.rect(55 + i * 155, 55, 145, 35, {
        fill: isSelected ? appColors[i] : colors.bgCard,
        stroke: isCompleted ? colors.success : colors.border,
        rx: 8,
      });
      r.text(127 + i * 155, 78, app.short, {
        fill: isSelected ? colors.textPrimary : colors.textSecondary,
        fontSize: 12,
        fontWeight: isSelected ? 'bold' : 'normal',
        textAnchor: 'middle',
      });
    });

    // Selected app content
    const app = transferApps[this.selectedApp];
    r.rect(50, 100, 600, 350, { fill: colors.bgCard, stroke: colors.border, rx: 12 });

    // Header
    r.text(350, 130, app.title, { fill: colors.textPrimary, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 150, app.tagline, { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });

    // Description
    r.text(70, 180, app.description, { fill: colors.textSecondary, fontSize: 11 });

    // Two columns: Connection and How It Works
    r.rect(60, 200, 280, 80, { fill: colors.bgCardLight, rx: 8 });
    r.text(200, 220, 'Physics Connection', { fill: colors.cyan, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    // Wrap text manually for connection
    const connectionLines = this.wrapText(app.connection, 35);
    connectionLines.forEach((line, i) => {
      r.text(70, 240 + i * 15, line, { fill: colors.textMuted, fontSize: 10 });
    });

    r.rect(360, 200, 280, 80, { fill: colors.bgCardLight, rx: 8 });
    r.text(500, 220, 'How It Works', { fill: colors.primary, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    const howLines = this.wrapText(app.howItWorks, 35);
    howLines.forEach((line, i) => {
      r.text(370, 240 + i * 15, line, { fill: colors.textMuted, fontSize: 10 });
    });

    // Stats
    r.text(70, 300, 'Key Stats:', { fill: colors.emerald, fontSize: 11, fontWeight: 'bold' });
    app.stats.slice(0, 2).forEach((stat, i) => {
      r.text(80, 318 + i * 16, '  ' + stat, { fill: colors.textMuted, fontSize: 10 });
    });

    // Examples
    r.text(360, 300, 'Examples:', { fill: colors.purple, fontSize: 11, fontWeight: 'bold' });
    app.examples.slice(0, 2).forEach((ex, i) => {
      r.text(370, 318 + i * 16, '  ' + ex, { fill: colors.textMuted, fontSize: 10 });
    });

    // Companies
    r.text(70, 360, 'Industry Leaders:', { fill: colors.pink, fontSize: 11, fontWeight: 'bold' });
    r.text(160, 360, app.companies.join(', '), { fill: colors.textMuted, fontSize: 10 });

    // Future impact
    r.rect(60, 385, 580, 50, { fill: `${colors.blue}10`, rx: 8 });
    r.text(350, 405, 'Future Impact', { fill: colors.blue, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 425, app.futureImpact.substring(0, 80) + '...', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Progress dots
    r.text(280, 460, 'Progress:', { fill: colors.textMuted, fontSize: 11 });
    this.completedApps.forEach((completed, i) => {
      r.circle(340 + i * 20, 460, 6, { fill: completed ? colors.success : colors.bgCardLight, stroke: colors.border });
    });
    r.text(430, 460, `${this.completedApps.filter((c) => c).length}/4`, { fill: colors.textMuted, fontSize: 11 });
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
    r.rect(80, 55, 540, 50, { fill: colors.bgCard, rx: 8 });
    const scenarioLines = this.wrapText(q.scenario, 70);
    scenarioLines.forEach((line, i) => {
      r.text(350, 75 + i * 16, line, { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
    });

    // Question
    r.text(350, 130, q.question, {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Answer options
    q.options.forEach((option, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;

      r.rect(100, 160 + i * 55, 500, 45, {
        fill: isSelected ? `${colors.primary}40` : colors.bgCard,
        stroke: isSelected ? colors.primary : colors.border,
        rx: 10,
      });
      r.text(350, 188 + i * 55, option, {
        fill: isSelected ? colors.primary : colors.textSecondary,
        fontSize: 12,
        textAnchor: 'middle',
      });
    });

    // Question navigation dots
    r.text(200, 400, 'Questions:', { fill: colors.textMuted, fontSize: 10 });
    for (let i = 0; i < testQuestions.length; i++) {
      const answered = this.testAnswers[i] !== null;
      const current = i === this.testQuestion;
      r.circle(270 + i * 18, 400, 6, {
        fill: current ? colors.primary : answered ? colors.success : colors.bgCardLight,
        stroke: colors.border,
      });
    }
  }

  private renderTestResults(r: CommandRenderer): void {
    const score = this.calculateTestScore();
    const passed = score >= 7;

    r.text(350, 100, passed ? 'Excellent!' : 'Keep Studying!', {
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

    r.text(350, 200, passed ? 'You\'ve mastered Simple Harmonic Motion!' : 'Review the concepts and try again.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Show which questions were correct/incorrect
    r.text(200, 250, 'Results:', { fill: colors.textMuted, fontSize: 12 });
    for (let i = 0; i < testQuestions.length; i++) {
      const isCorrect = this.testAnswers[i] === testQuestions[i].correctIndex;
      r.circle(270 + i * 25, 250, 8, {
        fill: isCorrect ? colors.success : colors.danger,
        stroke: colors.border,
      });
      r.text(270 + i * 25, 254, `${i + 1}`, {
        fill: colors.textPrimary,
        fontSize: 8,
        textAnchor: 'middle',
      });
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Celebration
    r.text(350, 80, 'Mastery Achieved!', {
      fill: colors.primary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    r.text(350, 130, 'Simple Harmonic Motion Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 170, 'You\'ve mastered the fundamental physics of oscillations and waves!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Achievement badges
    const badges = [
      { icon: 'math', label: 'Period Formula' },
      { icon: 'energy', label: 'Energy Conservation' },
      { icon: 'wave', label: 'Sine Waves' },
      { icon: 'clock', label: 'Timekeeping' },
    ];

    badges.forEach((badge, i) => {
      r.rect(110 + i * 130, 210, 110, 70, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
      r.text(165 + i * 130, 250, badge.label, { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    });

    // Final message
    r.rect(150, 310, 400, 60, { fill: `${colors.success}20`, stroke: colors.success, rx: 12 });
    r.text(350, 340, 'You understand the rhythm of the universe!', {
      fill: colors.success,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 360, 'From pendulums to music to skyscrapers.', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  // --- HELPER RENDER FUNCTIONS ---

  private renderPendulum(r: CommandRenderer, centerX: number, topY: number, maxLength: number, showLabels: boolean): void {
    const pivotX = centerX;
    const pivotY = topY + 20;
    const pendulumLength = maxLength * (this.length / 2.5);
    const bobRadius = 15;

    const angleRad = (this.pendulumAngle * Math.PI) / 180;
    const bobX = pivotX + pendulumLength * Math.sin(angleRad);
    const bobY = pivotY + pendulumLength * Math.cos(angleRad);

    // Background for pendulum area
    r.rect(centerX - maxLength / 2 - 30, topY, maxLength + 60, maxLength + 50, {
      fill: colors.bgDark,
      rx: 12,
    });

    // Grid lines
    for (let i = 0; i < 8; i++) {
      r.line(centerX - maxLength / 2 - 20, topY + 10 + i * (maxLength + 30) / 8, centerX + maxLength / 2 + 20, topY + 10 + i * (maxLength + 30) / 8, {
        stroke: colors.bgCardLight,
        strokeWidth: 0.5,
        opacity: 0.3,
      });
    }

    // Equilibrium line (dashed)
    r.line(pivotX, pivotY, pivotX, pivotY + pendulumLength + 30, {
      stroke: colors.success,
      strokeWidth: 1,
      strokeDasharray: '5,3',
      opacity: 0.5,
    });

    // Swing arc
    const arcAmplitudeRad = (this.amplitude * Math.PI) / 180;
    // Simplified arc representation with lines at the amplitude boundaries
    r.line(pivotX, pivotY, pivotX - pendulumLength * Math.sin(arcAmplitudeRad), pivotY + pendulumLength * Math.cos(arcAmplitudeRad), {
      stroke: colors.blue,
      strokeWidth: 1,
      strokeDasharray: '3,3',
      opacity: 0.4,
    });
    r.line(pivotX, pivotY, pivotX + pendulumLength * Math.sin(arcAmplitudeRad), pivotY + pendulumLength * Math.cos(arcAmplitudeRad), {
      stroke: colors.blue,
      strokeWidth: 1,
      strokeDasharray: '3,3',
      opacity: 0.4,
    });

    // Pivot mount
    r.rect(pivotX - 25, topY + 5, 50, 15, { fill: colors.bgCardLight, rx: 3 });
    r.circle(pivotX, pivotY, 6, { fill: colors.bgCardLight, stroke: colors.textMuted, strokeWidth: 2 });

    // Pendulum rod
    r.line(pivotX, pivotY, bobX, bobY, { stroke: colors.textMuted, strokeWidth: 3 });

    // Bob with gradient effect (simplified)
    r.circle(bobX, bobY, bobRadius, { fill: colors.primary, stroke: colors.primaryDark, strokeWidth: 2 });
    r.circle(bobX - 4, bobY - 4, 5, { fill: colors.primaryLight, opacity: 0.5 }); // Highlight

    // Velocity arrow (if moving)
    const tangentialVelocity = Math.abs(this.angularVelocity) * pendulumLength;
    if (tangentialVelocity > 0.1) {
      const arrowLength = clamp(tangentialVelocity * 20, 5, 40);
      const arrowDir = Math.sign(-this.angularVelocity);
      const arrowEndX = bobX + arrowDir * arrowLength * Math.cos(angleRad);
      const arrowEndY = bobY + arrowDir * arrowLength * Math.sin(angleRad);
      r.line(bobX, bobY, arrowEndX, arrowEndY, { stroke: colors.danger, strokeWidth: 2 });
    }

    // Labels
    if (showLabels) {
      r.text(pivotX + 35, pivotY + 20, `theta = ${this.pendulumAngle.toFixed(1)} deg`, {
        fill: colors.textMuted,
        fontSize: 10,
      });
      r.text(pivotX + 15, pivotY + pendulumLength / 2, `L = ${this.length.toFixed(2)}m`, {
        fill: colors.textMuted,
        fontSize: 10,
      });
    }
  }

  private renderEnergyBars(r: CommandRenderer, x: number, y: number, energies: { pePercent: number; kePercent: number }): void {
    r.rect(x, y, 230, 120, { fill: colors.bgCard, stroke: colors.border, rx: 10 });
    r.text(x + 115, y + 20, 'Energy Distribution', { fill: colors.textSecondary, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // KE bar
    r.text(x + 15, y + 45, 'Kinetic (KE)', { fill: colors.danger, fontSize: 10 });
    r.text(x + 200, y + 45, `${energies.kePercent.toFixed(0)}%`, { fill: colors.danger, fontSize: 10 });
    r.rect(x + 15, y + 50, 200, 12, { fill: colors.bgCardLight, rx: 3 });
    r.rect(x + 15, y + 50, energies.kePercent * 2, 12, { fill: colors.danger, rx: 3 });

    // PE bar
    r.text(x + 15, y + 75, 'Potential (PE)', { fill: colors.blue, fontSize: 10 });
    r.text(x + 200, y + 75, `${energies.pePercent.toFixed(0)}%`, { fill: colors.blue, fontSize: 10 });
    r.rect(x + 15, y + 80, 200, 12, { fill: colors.bgCardLight, rx: 3 });
    r.rect(x + 15, y + 80, energies.pePercent * 2, 12, { fill: colors.blue, rx: 3 });

    // Total
    r.line(x + 15, y + 102, x + 215, y + 102, { stroke: colors.border, strokeWidth: 1 });
    r.text(x + 15, y + 115, 'Total Energy', { fill: colors.emerald, fontSize: 10 });
    r.text(x + 200, y + 115, '100%', { fill: colors.emerald, fontSize: 10 });
  }

  private renderWaveGraph(r: CommandRenderer, x: number, y: number, width: number, height: number): void {
    r.rect(x, y, width, height, { fill: colors.bgDark, rx: 8 });

    const padding = 25;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;

    // Axes
    r.line(x + padding, y + height / 2, x + width - padding, y + height / 2, { stroke: colors.border, strokeWidth: 1 });
    r.line(x + padding, y + padding, x + padding, y + height - padding, { stroke: colors.border, strokeWidth: 1 });

    // Generate sine wave points
    const numPoints = 100;
    for (let i = 0; i < numPoints - 1; i++) {
      const t1 = (i / numPoints) * 4 * Math.PI;
      const t2 = ((i + 1) / numPoints) * 4 * Math.PI;
      const x1 = x + padding + (i / numPoints) * graphWidth;
      const x2 = x + padding + ((i + 1) / numPoints) * graphWidth;
      const y1 = y + height / 2 - (this.amplitude / 45) * (graphHeight / 2) * Math.cos(t1);
      const y2 = y + height / 2 - (this.amplitude / 45) * (graphHeight / 2) * Math.cos(t2);

      r.line(x1, y1, x2, y2, { stroke: colors.blue, strokeWidth: 2 });
    }

    // Current position marker
    if (this.isAnimating) {
      const omega = this.calculateAngularFrequency();
      const currentT = (this.time % ((4 * Math.PI) / omega)) * omega;
      const markerX = x + padding + (currentT / (4 * Math.PI)) * graphWidth;
      const markerY = y + height / 2 - (this.pendulumAngle / 45) * (graphHeight / 2);
      r.circle(markerX, markerY, 5, { fill: colors.primary, stroke: colors.primaryLight, strokeWidth: 2 });
    }

    // Labels
    r.text(x + width / 2, y + height - 5, 'Time (t)', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
    r.text(x + width - padding, y + 15, 'theta(t) = A*cos(omega*t)', { fill: colors.success, fontSize: 9, textAnchor: 'end' });
  }

  private wrapText(text: string, maxChars: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxChars) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.slice(0, 3); // Limit to 3 lines
  }

  // --- UI STATE ---

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
      r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });
    }

    // Phase-specific controls
    switch (this.phase) {
      case 'hook':
        r.addButton({
          id: this.isAnimating ? 'stop' : 'start',
          label: this.isAnimating ? 'Stop' : 'Start Pendulum',
          variant: this.isAnimating ? 'danger' : 'primary',
        });
        r.addButton({ id: 'next', label: 'Discover the Secret', variant: 'success' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A: Mass', variant: this.prediction === 'A' ? 'danger' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B: Length', variant: this.prediction === 'B' ? 'success' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C: Pull back', variant: this.prediction === 'C' ? 'danger' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D: Push', variant: this.prediction === 'D' ? 'danger' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Explore the Physics', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'length', label: 'Length (m)', value: this.length, min: 0.25, max: 2.5, step: 0.05 });
        r.addSlider({ id: 'amplitude', label: 'Release Angle', value: this.amplitude, min: 5, max: 45, step: 1 });
        r.addButton({ id: this.isAnimating ? 'stop' : 'start', label: this.isAnimating ? 'Stop' : 'Start', variant: this.isAnimating ? 'danger' : 'primary' });
        r.addToggle({ id: 'energy_bars', label: 'Energy', value: this.showEnergyBars, onLabel: 'ON', offLabel: 'OFF' });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'success' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Discover a Twist', variant: 'primary' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A: Same', variant: this.twistPrediction === 'A' ? 'danger' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B: Shorter', variant: this.twistPrediction === 'B' ? 'danger' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C: Longer', variant: this.twistPrediction === 'C' ? 'success' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D: Stops', variant: this.twistPrediction === 'D' ? 'danger' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Explore This Effect', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({ id: 'amplitude', label: 'Release Angle', value: this.amplitude, min: 5, max: 85, step: 5 });
        r.addButton({ id: this.isAnimating ? 'stop' : 'start', label: this.isAnimating ? 'Stop' : 'Start', variant: this.isAnimating ? 'danger' : 'primary' });
        r.addButton({ id: 'next', label: 'Review Discovery', variant: 'success' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real-World Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Clocks', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Suspension', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Buildings', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Music', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every((c) => c)) {
          r.addButton({ id: 'next', label: 'Take Knowledge Test', variant: 'success' });
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
            label: score >= 7 ? 'Claim Mastery Badge' : 'Review & Try Again',
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
      pendulumAngle: this.pendulumAngle,
      angularVelocity: this.angularVelocity,
      time: this.time,
      amplitude: this.amplitude,
      length: this.length,
      isAnimating: this.isAnimating,
      showEnergyBars: this.showEnergyBars,
      milestones: this.milestones,
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
    this.pendulumAngle = state.pendulumAngle || 30;
    this.angularVelocity = state.angularVelocity || 0;
    this.time = state.time || 0;
    this.amplitude = state.amplitude || 30;
    this.length = state.length || 1.5;
    this.isAnimating = state.isAnimating || false;
    this.showEnergyBars = state.showEnergyBars ?? true;
    this.milestones = state.milestones || {
      observedOscillation: false,
      changedLength: false,
      changedAmplitude: false,
      understoodPeriod: false,
      trackedEnergy: false,
    };
    this.testQuestion = state.testQuestion || 0;
    this.testAnswers = state.testAnswers || Array(10).fill(null);
    this.testSubmitted = state.testSubmitted || false;
    this.selectedApp = state.selectedApp || 0;
    this.completedApps = state.completedApps || [false, false, false, false];
    this.guidedMode = state.guidedMode ?? true;
  }
}

// === FACTORY FUNCTION ===
// Register this in server.ts: registry.register('simple_harmonic_motion', createSimpleHarmonicMotionGame);

export function createSimpleHarmonicMotionGame(sessionId: string): SimpleHarmonicMotionGame {
  return new SimpleHarmonicMotionGame(sessionId);
}
