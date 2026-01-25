/**
 * Doppler Effect Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Doppler frequency shift formula: f' = f × (v ± v_obs) / (v ∓ v_src)
 * - Approaching source: f' = f × v / (v - v_src)
 * - Receding source: f' = f × v / (v + v_src)
 * - Double Doppler for radar/echo: f'' = f' × (v + v_obs) / v
 * - Relativistic Doppler for light (cosmological redshift)
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
    scenario: 'An ambulance with a 700 Hz siren approaches you at 30 m/s. Sound travels at 340 m/s in air.',
    question: 'What frequency do you hear as it approaches?',
    options: [
      '~632 Hz (lower pitch)',
      '700 Hz (unchanged)',
      '~768 Hz (higher pitch)',
      '~900 Hz (much higher)',
    ],
    correctIndex: 2,
    explanation: 'Using f\' = f × v/(v - v_src) = 700 × 340/(340-30) ≈ 768 Hz. Approaching compresses waves!',
  },
  {
    scenario: "You're standing on a train platform as an express train sounds its horn while passing through.",
    question: 'At what moment do you hear the TRUE (unshifted) frequency?',
    options: [
      'When approaching but far away',
      'When directly beside you (perpendicular)',
      'When receding but nearby',
      'You never hear the true frequency',
    ],
    correctIndex: 1,
    explanation: "At the perpendicular moment, the train's velocity toward/away from you is ZERO. No Doppler shift!",
  },
  {
    scenario: 'Police radar guns bounce radio waves off moving vehicles and measure the reflected frequency.',
    question: 'If a car is driving TOWARD the radar gun, the reflected waves experience:',
    options: [
      'A single Doppler shift (higher)',
      'A DOUBLE Doppler shift (even higher)',
      'Two shifts that cancel out',
      'No shift (radio waves unaffected)',
    ],
    correctIndex: 1,
    explanation: 'Wave shifted once hitting car, shifted AGAIN reflecting back. Double-Doppler makes radar sensitive!',
  },
  {
    scenario: 'Astronomers observe a distant galaxy. Hydrogen lines at 656 nm appear at 670 nm.',
    question: 'What can we conclude about this galaxy?',
    options: [
      "It's approaching Earth",
      "It's moving away from Earth",
      "It's very hot",
      "It's a young galaxy",
    ],
    correctIndex: 1,
    explanation: 'Longer wavelength (redshift) = galaxy receding. This cosmic Doppler proved universe is expanding!',
  },
  {
    scenario: 'A bat emits 40 kHz ultrasound while flying at 10 m/s toward a stationary insect.',
    question: 'The echo frequency the bat hears is approximately:',
    options: [
      '40 kHz (unchanged)',
      '~41.2 kHz (slightly higher)',
      '~42.5 kHz (noticeably higher)',
      '~44 kHz (much higher)',
    ],
    correctIndex: 2,
    explanation: 'Double Doppler! Outgoing shift + returning shift ≈ 42.5 kHz. Bats detect prey motion this way!',
  },
  {
    scenario: 'Both you AND the ambulance move. You walk toward it at 2 m/s while it approaches at 30 m/s.',
    question: 'Compared to standing still, the Doppler shift you experience is:',
    options: [
      "Less—your motion cancels the ambulance's",
      "The same—observer motion doesn't matter",
      'Greater—both motions ADD to the shift',
      'Reversed—you hear a lower pitch',
    ],
    correctIndex: 2,
    explanation: 'Both motions contribute! f\' = f × (v + v_obs)/(v - v_src). Walking toward = maximum increase!',
  },
  {
    scenario: 'A supersonic jet flies at Mach 2 (twice sound speed). It emits continuous engine sound.',
    question: 'What special phenomenon occurs for ground observers?',
    options: [
      'They hear an extremely high-pitched whine',
      'They hear a very low rumble',
      'They hear a sonic boom (shock wave)',
      'They hear nothing until the jet passes',
    ],
    correctIndex: 2,
    explanation: 'At supersonic speeds, jet outruns its sound waves! They pile into a shock wave—sonic boom!',
  },
  {
    scenario: 'Doppler ultrasound measures blood flow velocity in arteries.',
    question: 'This technology relies on the Doppler effect from:',
    options: [
      'Sound bouncing off artery walls',
      'Sound reflecting off moving red blood cells',
      'Sound passing through blood plasma',
      'Heartbeat vibrations in the chest',
    ],
    correctIndex: 1,
    explanation: 'Red blood cells = millions of tiny moving reflectors! Frequency shift reveals blood velocity.',
  },
  {
    scenario: 'Weather radar shows tornado with one side red (away) and other green (approaching).',
    question: 'This "velocity couplet" signature indicates:',
    options: [
      'A very large, slow-moving storm',
      'Strong rotation—air spinning in a vortex',
      'A very tall storm cloud',
      'Heavy precipitation',
    ],
    correctIndex: 1,
    explanation: 'Doppler radar measures wind velocity! Opposite motions side-by-side = rotation = tornado!',
  },
  {
    scenario: 'Fire truck drives away at 25 m/s sounding 800 Hz siren. Sound speed is 343 m/s.',
    question: 'What frequency do you hear?',
    options: [
      '~746 Hz',
      '~800 Hz',
      '~857 Hz',
      '~691 Hz',
    ],
    correctIndex: 0,
    explanation: 'f\' = f × v/(v + v_src) = 800 × 343/368 ≈ 746 Hz. Receding stretches waves = lower frequency!',
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
    icon: 'P',
    title: 'Police Radar & Speed Detection',
    short: 'Radar',
    tagline: 'Double-Doppler for precision speed measurement',
    description: 'Radar guns emit microwave pulses that bounce off vehicles.',
    connection: 'Reflected signal shifted proportional to speed. Wave TO car then back = double shift!',
    stats: [
      { value: '2x', label: 'Doppler shift' },
      { value: '±1 mph', label: 'Accuracy' },
      { value: '10 GHz', label: 'Frequency' },
    ],
  },
  {
    icon: 'G',
    title: 'Cosmic Redshift & Expansion',
    short: 'Cosmos',
    tagline: 'How Doppler revealed the expanding universe',
    description: 'Light from distant galaxies shifts toward red (longer wavelengths).',
    connection: 'Hubble found MORE distant galaxies have GREATER redshift—proof universe is expanding!',
    stats: [
      { value: '13.8B', label: 'Years ago' },
      { value: '73 km/s', label: 'Per megaparsec' },
      { value: 'z>10', label: 'Highest redshift' },
    ],
  },
  {
    icon: 'B',
    title: 'Bat Echolocation',
    short: 'Biosonar',
    tagline: 'Hunting in darkness using Doppler shifts',
    description: 'Bats emit ultrasonic chirps (40-100 kHz) and analyze echoes.',
    connection: 'Doppler shift reveals if prey is approaching or fleeing. Some bats adjust call frequency!',
    stats: [
      { value: '100+', label: 'kHz frequency' },
      { value: '0.3ms', label: 'Echo precision' },
      { value: '5m', label: 'Detection range' },
    ],
  },
  {
    icon: 'H',
    title: 'Medical Ultrasound',
    short: 'Medical',
    tagline: 'Non-invasive blood flow measurement',
    description: 'Ultrasound waves reflect off moving red blood cells.',
    connection: 'Frequency shift = blood velocity. Color Doppler: red = toward, blue = away.',
    stats: [
      { value: 'cm/s', label: 'Flow velocity' },
      { value: 'Real-time', label: 'Imaging' },
      { value: 'Zero', label: 'Radiation' },
    ],
  },
];

// === COLORS ===
const colors = {
  primary: '#ef4444',
  primaryDark: '#dc2626',
  primaryLight: '#fca5a5',
  accent: '#f97316',
  accentLight: '#fdba74',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  bgDark: '#150a07',
  bgCard: '#1f0f0a',
  bgCardLight: '#2a1510',
  border: '#7f1d1d',
  textPrimary: '#fef2f2',
  textSecondary: '#fca5a5',
  textMuted: '#b91c1c',
};

// === COACH MESSAGES ===
const coachMessages: Record<GamePhase, string> = {
  hook: "Have you noticed how ambulance sirens sound different when approaching vs. leaving? Let's discover why!",
  predict: 'Make your prediction - what happens to the siren pitch as an ambulance approaches?',
  play: 'Watch the wave patterns carefully. Notice how they compress or stretch!',
  review: 'The Doppler effect explains the pitch change. Approaching = compressed waves = higher pitch.',
  twist_predict: 'Now consider: what if YOU also start moving toward the ambulance?',
  twist_play: 'Try different combinations of source and observer speeds!',
  twist_review: 'Both motions contribute to the total Doppler shift. They add together!',
  transfer: 'The Doppler effect appears everywhere - from radar guns to the expanding universe!',
  test: 'Apply what you learned to these real-world scenarios.',
  mastery: 'Congratulations! You now understand how motion changes perceived frequency!',
};

// === MAIN GAME CLASS ===
export class DopplerEffectGame extends BaseGame {
  readonly gameType = 'doppler_effect';
  readonly gameTitle = 'Doppler Effect';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Physics constants (PROTECTED)
  private readonly sourceFreq = 440; // Hz (A4)
  private readonly soundSpeed = 343; // m/s

  // Animation state
  private sourceSpeed = 30;
  private observerSpeed = 0;
  private sourcePosition = 0;
  private waveHistory: { x: number; t: number; id: number }[] = [];
  private passCount = 0;
  private isAnimating = true;
  private teachingMilestone: 'none' | 'approaching' | 'passing' | 'receding' | 'complete' = 'none';
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
  }

  // === DOPPLER PHYSICS CALCULATIONS (PROTECTED) ===
  private calculateObservedFreq(approaching: boolean): number {
    const obsDir = approaching ? this.observerSpeed : -this.observerSpeed;
    const srcDir = approaching ? -this.sourceSpeed : this.sourceSpeed;
    return this.sourceFreq * (this.soundSpeed + obsDir) / (this.soundSpeed + srcDir);
  }

  private get observedFreqApproaching(): number {
    return this.calculateObservedFreq(true);
  }

  private get observedFreqReceding(): number {
    return this.calculateObservedFreq(false);
  }

  private get isApproaching(): boolean {
    return this.sourcePosition < 50;
  }

  private get currentObservedFreq(): number {
    return this.isApproaching ? this.observedFreqApproaching : this.observedFreqReceding;
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
      case 'toggle_change':
        this.handleToggleChange(input.id!, input.value);
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

    // Play controls
    if (id === 'start' || id === 'stop') {
      this.isAnimating = !this.isAnimating;
      return;
    }
    if (id === 'reset') {
      this.resetSimulation();
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
    if (id === 'source_speed') {
      this.sourceSpeed = clamp(value, 5, 100);
    } else if (id === 'observer_speed') {
      this.observerSpeed = clamp(value, 0, 50);
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'animation') {
      this.isAnimating = value;
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

    // Reset simulation when entering play phases
    if (newPhase === 'play' || newPhase === 'twist_play') {
      this.resetSimulation();
      if (newPhase === 'play') {
        this.sourceSpeed = 30;
        this.observerSpeed = 0;
      }
    }
  }

  private resetSimulation(): void {
    this.sourcePosition = 0;
    this.waveHistory = [];
    this.passCount = 0;
    this.isAnimating = true;
    this.teachingMilestone = 'none';
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
    this.time += deltaTime;

    if ((this.phase === 'play' || this.phase === 'twist_play') && this.isAnimating) {
      // Update source position
      this.sourcePosition += this.sourceSpeed * deltaTime * 0.002;

      // Reset when source passes through
      if (this.sourcePosition > 110) {
        this.passCount++;
        this.sourcePosition = -10;
      }

      // Emit waves periodically
      if (Math.random() < 0.15) {
        this.waveHistory.push({
          x: this.sourcePosition,
          t: this.time,
          id: Date.now() + Math.random(),
        });
        if (this.waveHistory.length > 25) {
          this.waveHistory.shift();
        }
      }

      // Update teaching milestone
      const normalizedPos = this.sourcePosition / 100;
      if (normalizedPos < 0.3) {
        this.teachingMilestone = 'approaching';
      } else if (normalizedPos < 0.55) {
        this.teachingMilestone = 'passing';
      } else if (normalizedPos < 0.9) {
        this.teachingMilestone = 'receding';
      } else {
        this.teachingMilestone = 'complete';
      }
    }
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

  // === PHASE RENDERERS ===
  private renderHook(r: CommandRenderer): void {
    // Title
    r.text(350, 40, 'The Doppler Effect', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Hook scenario card
    r.rect(50, 70, 600, 100, {
      fill: colors.bgCard,
      rx: 12,
    });

    r.text(350, 100, "You're standing on the sidewalk as an ambulance", {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 120, 'approaches, passes, and drives away...', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 150, 'Why does the siren sound change pitch?', {
      fill: colors.primary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Simple ambulance illustration
    this.renderAmbulance(r, 350, 250);

    // Sound wave indicators
    r.text(200, 290, 'Higher pitch', {
      fill: colors.primary,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(200, 305, '(approaching)', {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });

    r.text(500, 290, 'Lower pitch', {
      fill: colors.accent,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(500, 305, '(receding)', {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderAmbulance(r: CommandRenderer, x: number, y: number): void {
    // Ambulance body
    r.rect(x - 45, y - 25, 90, 45, {
      fill: '#ffffff',
      rx: 6,
    });

    // Red stripe
    r.rect(x - 45, y + 5, 90, 10, {
      fill: colors.primary,
    });

    // Windows
    r.rect(x - 38, y - 20, 22, 16, {
      fill: '#0ea5e9',
      rx: 3,
    });
    r.rect(x - 10, y - 20, 16, 16, {
      fill: '#0ea5e9',
      rx: 3,
    });
    r.rect(x + 10, y - 20, 22, 16, {
      fill: '#0ea5e9',
      rx: 3,
    });

    // Cross
    r.rect(x - 4, y - 16, 3, 10, { fill: colors.primary });
    r.rect(x - 7, y - 13, 9, 3, { fill: colors.primary });

    // Wheels
    r.circle(x - 28, y + 22, 8, { fill: '#1f2937' });
    r.circle(x + 28, y + 22, 8, { fill: '#1f2937' });

    // Lights
    r.circle(x - 18, y - 32, 6, { fill: colors.primary });
    r.circle(x + 18, y - 32, 6, { fill: colors.info });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(350, 35, 'Make Your Prediction', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 60, 'As the ambulance APPROACHES, the siren pitch will...', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Options are rendered via UI
    r.rect(50, 85, 600, 250, {
      fill: colors.bgCard,
      rx: 12,
    });

    r.text(350, 120, 'Select your answer below:', {
      fill: colors.textMuted,
      fontSize: 13,
      textAnchor: 'middle',
    });
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(350, 25, 'Observe the Doppler Effect', {
      fill: colors.textPrimary,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Doppler visualizer
    this.renderDopplerVisualizer(r, 25, 45, 650, 230, false);

    // Teaching milestone
    const milestone = this.getTeachingMilestoneText();
    r.rect(25, 285, 400, 50, {
      fill: colors.bgCard,
      rx: 8,
    });
    r.text(225, 305, milestone.title, {
      fill: milestone.color,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(225, 325, milestone.description, {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });

    // Stats panel
    r.rect(445, 285, 230, 50, {
      fill: colors.bgCard,
      rx: 8,
    });
    r.text(560, 305, `Passes: ${this.passCount}`, {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(560, 322, `Source: ${this.sourceSpeed} m/s`, {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderDopplerVisualizer(
    r: CommandRenderer,
    x: number,
    y: number,
    width: number,
    height: number,
    showObserverControls: boolean
  ): void {
    // Background
    r.rect(x, y, width, height, {
      fill: colors.bgCard,
      rx: 10,
    });

    // Road
    r.rect(x, y + height * 0.6, width, height * 0.22, {
      fill: '#374151',
    });

    // Road line
    r.rect(x, y + height * 0.7, width, 3, {
      fill: '#fbbf24',
    });

    // Sidewalk
    r.rect(x, y + height * 0.82, width, height * 0.1, {
      fill: '#57534e',
    });

    // Wave fronts
    const observerXPos = x + width / 2;
    this.waveHistory.forEach((wave) => {
      const age = (this.time - wave.t) * 200;
      const waveX = x + 40 + (wave.x / 100) * (width - 80);
      const radius = Math.min(age, 150);
      const opacity = Math.max(0, 1 - age / 180) * 0.5;
      const isCompressed = waveX < observerXPos;
      const waveColor = isCompressed ? colors.primary : colors.accent;

      if (radius > 5 && opacity > 0.05) {
        r.circle(waveX, y + height * 0.62, radius, {
          fill: 'transparent',
          stroke: waveColor,
          strokeWidth: 1.5,
          opacity,
        });
      }
    });

    // Ambulance
    const sourceX = x + 40 + (this.sourcePosition / 100) * (width - 80);
    this.renderAmbulance(r, sourceX, y + height * 0.55);

    // Speed label
    r.rect(sourceX - 25, y + height * 0.35, 50, 18, {
      fill: colors.bgCard,
      rx: 4,
    });
    r.text(sourceX, y + height * 0.35 + 12, `${this.sourceSpeed} m/s`, {
      fill: colors.textPrimary,
      fontSize: 9,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Observer
    const obsX = observerXPos;
    const obsY = y + height * 0.82;
    r.circle(obsX, obsY - 18, 10, { fill: '#f472b6' });
    r.rect(obsX - 8, obsY - 6, 16, 22, {
      fill: '#ec4899',
      rx: 4,
    });
    r.text(obsX, obsY + 22, 'OBSERVER', {
      fill: colors.textMuted,
      fontSize: 8,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Frequency display above observer
    const freqColor = this.isApproaching ? colors.primary : colors.accent;
    r.rect(obsX - 45, obsY - 60, 90, 28, {
      fill: `${freqColor}30`,
      stroke: freqColor,
      strokeWidth: 2,
      rx: 5,
    });
    r.text(obsX, obsY - 46, `${Math.round(this.currentObservedFreq)} Hz`, {
      fill: freqColor,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Frequency panel
    r.rect(x + width - 100, y + 10, 90, 100, {
      fill: colors.bgDark,
      rx: 6,
    });
    r.text(x + width - 55, y + 30, 'FREQUENCY', {
      fill: colors.textMuted,
      fontSize: 8,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(x + width - 55, y + 48, `Source: ${this.sourceFreq}`, {
      fill: colors.textSecondary,
      fontSize: 9,
      textAnchor: 'middle',
    });
    r.text(x + width - 55, y + 68, `Approaching:`, {
      fill: colors.primary,
      fontSize: 8,
      textAnchor: 'middle',
    });
    r.text(x + width - 55, y + 80, `${Math.round(this.observedFreqApproaching)} Hz`, {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(x + width - 55, y + 95, `Receding:`, {
      fill: colors.accent,
      fontSize: 8,
      textAnchor: 'middle',
    });
    r.text(x + width - 55, y + 107, `${Math.round(this.observedFreqReceding)} Hz`, {
      fill: colors.accent,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Observer speed display for twist phase
    if (showObserverControls && this.observerSpeed > 0) {
      r.text(obsX + 50, obsY - 25, `+${this.observerSpeed} m/s`, {
        fill: colors.accent,
        fontSize: 9,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
    }
  }

  private getTeachingMilestoneText(): { title: string; description: string; color: string } {
    switch (this.teachingMilestone) {
      case 'approaching':
        return { title: 'APPROACHING', description: 'Waves COMPRESS -> Higher pitch', color: colors.primary };
      case 'passing':
        return { title: 'PASSING', description: 'Pitch changes dramatically!', color: colors.warning };
      case 'receding':
        return { title: 'RECEDING', description: 'Waves STRETCH -> Lower pitch', color: colors.accent };
      case 'complete':
        return { title: 'CYCLE COMPLETE', description: 'Watch the pattern repeat!', color: colors.success };
      default:
        return { title: 'OBSERVE', description: 'Watch the wave patterns...', color: colors.textMuted };
    }
  }

  private renderReview(r: CommandRenderer): void {
    r.text(350, 35, 'Understanding the Doppler Effect', {
      fill: colors.textPrimary,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Key insight card
    r.rect(40, 60, 620, 100, {
      fill: colors.bgCard,
      rx: 12,
    });
    r.text(350, 90, 'The Key Insight', {
      fill: colors.primary,
      fontSize: 15,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 115, 'Moving TOWARD you: waves COMPRESS -> HIGHER pitch', {
      fill: colors.primaryLight,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 135, 'Moving AWAY: waves STRETCH -> LOWER pitch', {
      fill: colors.accentLight,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Formula card
    r.rect(40, 175, 620, 70, {
      fill: colors.bgCard,
      rx: 12,
    });
    r.text(350, 200, 'The Doppler Formula', {
      fill: colors.success,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 225, "f' = f × (v / (v - v_source))  for approaching", {
      fill: colors.textPrimary,
      fontSize: 11,
      textAnchor: 'middle',
    });

    // Prediction feedback
    if (this.prediction) {
      const wasCorrect = this.prediction === 'A';
      r.rect(40, 260, 620, 60, {
        fill: wasCorrect ? '#16a34a30' : '#dc262630',
        rx: 12,
      });
      r.text(350, 290, wasCorrect ? 'Your prediction was correct!' : 'Correct answer: Higher pitch when approaching',
        {
          fill: wasCorrect ? colors.success : colors.danger,
          fontSize: 14,
          fontWeight: 'bold',
          textAnchor: 'middle',
        });
    }
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 35, 'The Twist: Moving Observer', {
      fill: colors.textPrimary,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 60, 'Now YOU start walking TOWARD the approaching ambulance.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 80, 'What happens to the Doppler shift?', {
      fill: colors.accent,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 95, 600, 230, {
      fill: colors.bgCard,
      rx: 12,
    });

    r.text(350, 125, 'Select your prediction:', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(350, 25, 'Moving Observer Experiment', {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Doppler visualizer with observer controls
    this.renderDopplerVisualizer(r, 25, 45, 650, 220, true);

    // Stats panel
    r.rect(25, 275, 650, 55, {
      fill: colors.bgCard,
      rx: 8,
    });
    r.text(150, 295, `Source: ${this.sourceSpeed} m/s`, {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
    r.text(350, 295, `Observer: ${this.observerSpeed} m/s`, {
      fill: colors.accent,
      fontSize: 11,
      textAnchor: 'middle',
    });
    r.text(550, 295, `Passes: ${this.passCount}`, {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });
    r.text(350, 318, 'Both motions contribute to the total shift!', {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle',
    });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(350, 35, 'The Complete Picture', {
      fill: colors.textPrimary,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Main insight
    r.rect(40, 60, 620, 80, {
      fill: colors.bgCard,
      rx: 12,
    });
    r.text(350, 85, 'Observer motion matters too!', {
      fill: colors.accent,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 108, 'Moving TOWARD = increased shift | Moving AWAY = decreased shift', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 125, 'Both motions combine in the complete formula!', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });

    // Full formula
    r.rect(40, 155, 620, 60, {
      fill: colors.bgDark,
      rx: 12,
    });
    r.text(350, 180, 'Complete Formula:', {
      fill: colors.success,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 200, "f' = f × (v + v_observer) / (v - v_source)", {
      fill: colors.textPrimary,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Prediction feedback
    if (this.twistPrediction) {
      const wasCorrect = this.twistPrediction === 'A';
      r.rect(40, 230, 620, 55, {
        fill: wasCorrect ? '#16a34a30' : '#dc262630',
        rx: 12,
      });
      r.text(350, 257, wasCorrect ? 'Correct! Both motions add to the shift.' : 'Answer: Greater shift when observer also moves toward source', {
        fill: wasCorrect ? colors.success : colors.danger,
        fontSize: 13,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
    }
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(350, 30, 'Real-World Applications', {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Content for selected app
    const app = transferApps[this.selectedApp];

    r.rect(40, 55, 620, 260, {
      fill: colors.bgCard,
      rx: 12,
    });

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
    r.rect(60, 155, 580, 55, {
      fill: colors.bgDark,
      rx: 8,
    });
    r.text(350, 175, 'Physics Connection:', {
      fill: colors.accent,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 195, app.connection, {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle',
    });

    // Stats
    app.stats.forEach((stat, i) => {
      const statX = 120 + i * 180;
      r.rect(statX - 60, 225, 120, 50, {
        fill: colors.bgDark,
        rx: 6,
      });
      r.text(statX, 245, stat.value, {
        fill: colors.primary,
        fontSize: 16,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
      r.text(statX, 265, stat.label, {
        fill: colors.textMuted,
        fontSize: 9,
        textAnchor: 'middle',
      });
    });

    // Progress
    const completed = this.completedApps.filter(Boolean).length;
    r.text(350, 300, `Explored ${completed}/${transferApps.length} applications`, {
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
    r.rect(40, 50, 620, 60, {
      fill: colors.bgCard,
      rx: 10,
    });
    r.text(50, 70, 'Scenario:', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
    });
    r.text(350, 90, q.scenario, {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });

    // Question
    r.text(350, 130, q.question, {
      fill: colors.textPrimary,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Options rendered via UI

    // Progress dots
    const dotsStartX = 350 - (testQuestions.length * 12) / 2;
    testQuestions.forEach((_, i) => {
      const answered = this.testAnswers[i] !== null;
      const isCurrent = i === this.testQuestion;
      r.circle(dotsStartX + i * 12, 310, isCurrent ? 4 : 3, {
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

    // Score circle
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

    // Performance message
    let message = '';
    if (percentage >= 90) {
      message = 'Outstanding! You truly understand the Doppler effect!';
    } else if (percentage >= 70) {
      message = 'Great job! Solid grasp of the concepts.';
    } else if (percentage >= 50) {
      message = 'Good effort! Review the applications for deeper understanding.';
    } else {
      message = "Keep practicing! The Doppler effect takes time to master.";
    }

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

    r.text(350, 80, 'You have mastered the Doppler Effect', {
      fill: colors.textPrimary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    // Achievement badge
    r.circle(350, 170, 55, {
      fill: colors.bgCard,
      stroke: colors.primary,
      strokeWidth: 3,
    });
    r.text(350, 165, 'DOPPLER', {
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

    // Stats summary
    r.rect(100, 250, 500, 70, {
      fill: colors.bgCard,
      rx: 12,
    });

    r.text(200, 275, 'Test Score', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(200, 295, `${percentage}%`, { fill: colors.success, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(350, 275, 'Apps Explored', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(350, 295, `${this.completedApps.filter(Boolean).length}/4`, { fill: colors.accent, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(500, 275, 'Phases', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(500, 295, '10/10', { fill: colors.primary, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
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

    // Back button
    if (idx > 0) {
      r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });
    }

    // Phase-specific controls
    switch (this.phase) {
      case 'hook':
        r.addButton({ id: 'next', label: 'Explore', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({
          id: 'predict_A',
          label: 'Sound HIGHER (waves compress)',
          variant: this.prediction === 'A' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_B',
          label: 'Sound LOWER (waves spread)',
          variant: this.prediction === 'B' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_C',
          label: 'Stay the SAME',
          variant: this.prediction === 'C' ? 'primary' : 'secondary',
        });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({
          id: 'source_speed',
          label: 'Source Speed',
          value: this.sourceSpeed,
          min: 5,
          max: 100,
        });
        r.addButton({
          id: this.isAnimating ? 'stop' : 'start',
          label: this.isAnimating ? 'Pause' : 'Play',
          variant: 'primary',
        });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
        r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Next: The Twist', variant: 'primary' });
        break;

      case 'twist_predict':
        r.addButton({
          id: 'twist_A',
          label: 'Even GREATER shift (add together)',
          variant: this.twistPrediction === 'A' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_B',
          label: 'SMALLER shift (cancel out)',
          variant: this.twistPrediction === 'B' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_C',
          label: 'Stays the SAME',
          variant: this.twistPrediction === 'C' ? 'primary' : 'secondary',
        });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Try It', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({
          id: 'source_speed',
          label: 'Source Speed',
          value: this.sourceSpeed,
          min: 5,
          max: 100,
        });
        r.addSlider({
          id: 'observer_speed',
          label: 'Observer Speed',
          value: this.observerSpeed,
          min: 0,
          max: 50,
        });
        r.addButton({
          id: this.isAnimating ? 'stop' : 'start',
          label: this.isAnimating ? 'Pause' : 'Play',
          variant: 'primary',
        });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
        r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Radar', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Cosmos', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Biosonar', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Medical', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
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
          // Answer buttons
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
      sourceSpeed: this.sourceSpeed,
      observerSpeed: this.observerSpeed,
      sourcePosition: this.sourcePosition,
      passCount: this.passCount,
      isAnimating: this.isAnimating,
      teachingMilestone: this.teachingMilestone,
      time: this.time,
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
    this.sourceSpeed = (state.sourceSpeed as number) || 30;
    this.observerSpeed = (state.observerSpeed as number) || 0;
    this.sourcePosition = (state.sourcePosition as number) || 0;
    this.passCount = (state.passCount as number) || 0;
    this.isAnimating = (state.isAnimating as boolean) ?? true;
    this.teachingMilestone = (state.teachingMilestone as typeof this.teachingMilestone) || 'none';
    this.time = (state.time as number) || 0;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
  }
}

// === FACTORY FUNCTION ===
export function createDopplerEffectGame(sessionId: string): DopplerEffectGame {
  return new DopplerEffectGame(sessionId);
}
