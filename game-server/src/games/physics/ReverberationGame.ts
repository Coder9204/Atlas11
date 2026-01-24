/**
 * Reverberation Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Sabine equation: RT60 = 0.161V/A
 * - Absorption coefficient calculations
 * - Room acoustics modeling
 * - Material absorption data
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
    question: 'RT60 measures the time for sound to:',
    options: ['Travel across a room', 'Decrease by 60 dB', 'Reach maximum volume', 'Reflect once'],
    correctIndex: 1,
  },
  {
    question: 'The Sabine equation for RT60 is:',
    options: ['RT60 = V/A', 'RT60 = 0.161V/A', 'RT60 = A/V', 'RT60 = 0.161A/V'],
    correctIndex: 1,
  },
  {
    question: 'Increasing absorption in a room:',
    options: ['Increases RT60', 'Decreases RT60', 'Has no effect', 'Only affects high frequencies'],
    correctIndex: 1,
  },
  {
    question: 'A concert hall typically has RT60 of about:',
    options: ['0.3 seconds', '1-2 seconds', '5 seconds', '10 seconds'],
    correctIndex: 1,
  },
  {
    question: 'Absorption coefficient α = 1 means the material:',
    options: ['Reflects all sound', 'Absorbs all sound', 'Absorbs half the sound', 'Is transparent to sound'],
    correctIndex: 1,
  },
  {
    question: 'Adding carpet to a room will:',
    options: ['Increase reverberation', 'Decrease reverberation', 'Have no effect', 'Only affect bass frequencies'],
    correctIndex: 1,
  },
  {
    question: 'Recording studios typically want RT60 of:',
    options: ['0.1-0.3 seconds (dry)', '2-3 seconds (reverberant)', '5+ seconds (echo)', 'Doesn\'t matter'],
    correctIndex: 0,
  },
  {
    question: 'The total absorption A in the Sabine equation equals:',
    options: ['Sum of all surface areas', 'Sum of α×S for all surfaces', 'Room volume', 'Number of reflections'],
    correctIndex: 1,
  },
  {
    question: 'Churches often have long reverberation because:',
    options: ['They are quiet', 'Hard surfaces and large volume', 'Special construction', 'Sound travels slowly'],
    correctIndex: 1,
  },
  {
    question: 'Flutter echo is caused by:',
    options: ['Curved surfaces', 'Parallel flat surfaces', 'Absorptive materials', 'High ceilings'],
    correctIndex: 1,
  },
];

// === PROTECTED: Material absorption coefficients ===
const materialAbsorption: Record<string, number> = {
  concrete: 0.02,
  glass: 0.04,
  hardwood: 0.10,
  carpet: 0.40,
  curtains: 0.55,
  acoustic_panels: 0.85,
  foam: 0.70,
  people: 0.45, // Per person (0.45 sabins each)
};

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#8b5cf6',
  primaryDark: '#7c3aed',
  accent: '#f97316',
  accentDark: '#ea580c',
  warning: '#eab308',
  success: '#22c55e',
  danger: '#ef4444',
  bgDark: '#0a0a0f',
  bgCard: '#12121a',
  bgCardLight: '#1e1e2e',
  border: '#2a2a3e',
  textPrimary: '#fafafa',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  soundWave: '#22c55e',
  reflection: '#3b82f6',
  absorption: '#ef4444',
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
    title: 'Concert Halls',
    icon: 'music',
    description: 'Designed for optimal RT60 around 1.5-2 seconds for orchestral music.',
    details: 'Different music styles prefer different reverberation - organ music likes longer RT60.',
  },
  {
    title: 'Recording Studios',
    icon: 'mic',
    description: 'Very short RT60 (0.1-0.3s) gives "dry" sound for mixing flexibility.',
    details: 'Engineers add artificial reverb in post-production for creative control.',
  },
  {
    title: 'Lecture Halls',
    icon: 'lecture',
    description: 'Moderate RT60 (0.5-1s) for clear speech intelligibility.',
    details: 'Too much reverb makes words blend together and become unclear.',
  },
  {
    title: 'Home Theaters',
    icon: 'theater',
    description: 'Balance between live sound and clarity, typically 0.3-0.5s RT60.',
    details: 'Acoustic treatment on walls and ceiling helps control reflections.',
  },
];

// === MAIN GAME CLASS ===

export class ReverberationGame extends BaseGame {
  readonly gameType = 'reverberation';
  readonly gameTitle = 'Reverberation & RT60';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private roomVolume = 500; // m³
  private wallMaterial = 'concrete';
  private floorMaterial = 'hardwood';
  private ceilingMaterial = 'concrete';
  private additionalAbsorption = 0; // From furniture, people, etc.
  private showWaves = true;
  private isAnimating = true;
  private time = 0;
  private soundActive = false;
  private soundLevel = 60; // dB

  // Room dimensions (calculated from volume)
  private roomWidth = 10;
  private roomLength = 10;
  private roomHeight = 5;

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
    hook: 'Why do concert halls sound different from your bedroom? It\'s all about reverberation!',
    predict: 'An empty room vs. a furnished room - which has more reverberation?',
    play: 'Change materials and room size to see how RT60 changes!',
    review: 'Sabine equation: RT60 = 0.161V/A. More absorption = less reverberation!',
    twist_predict: 'How does room volume affect reverberation?',
    twist_play: 'Large cathedrals have very long RT60 - see why!',
    twist_review: 'Volume in numerator, absorption in denominator - both matter!',
    transfer: 'From concert halls to recording studios - acoustics design is everywhere!',
    test: 'Time to test your understanding of room acoustics!',
    mastery: 'Congratulations! You\'ve mastered reverberation and the Sabine equation!',
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
      message: 'Reverberation lesson started',
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

    if (id === 'play_sound') {
      this.soundActive = true;
      this.soundLevel = 60;
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

    if (id === 'reset') {
      this.resetSimulation();
      return;
    }

    // Material selection
    if (id.startsWith('wall_')) {
      this.wallMaterial = id.replace('wall_', '');
      return;
    }
    if (id.startsWith('floor_')) {
      this.floorMaterial = id.replace('floor_', '');
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'waves') {
      this.showWaves = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'volume') {
      this.roomVolume = value;
      // Recalculate dimensions (assume cube-ish)
      const side = Math.pow(value, 1/3);
      this.roomWidth = side * 1.2;
      this.roomLength = side * 1.2;
      this.roomHeight = side * 0.7;
      return;
    }
    if (id === 'additional') {
      this.additionalAbsorption = value;
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
   * PROTECTED: Calculate total surface area
   */
  private calculateSurfaceArea(): number {
    const wallArea = 2 * (this.roomWidth + this.roomLength) * this.roomHeight;
    const floorCeilingArea = 2 * this.roomWidth * this.roomLength;
    return wallArea + floorCeilingArea;
  }

  /**
   * PROTECTED: Calculate total absorption (sabins)
   * A = Σ(αᵢ × Sᵢ)
   */
  private calculateTotalAbsorption(): number {
    const wallArea = 2 * (this.roomWidth + this.roomLength) * this.roomHeight;
    const floorArea = this.roomWidth * this.roomLength;
    const ceilingArea = this.roomWidth * this.roomLength;

    const wallAbsorption = materialAbsorption[this.wallMaterial] * wallArea;
    const floorAbsorption = materialAbsorption[this.floorMaterial] * floorArea;
    const ceilingAbsorption = materialAbsorption[this.ceilingMaterial] * ceilingArea;

    return wallAbsorption + floorAbsorption + ceilingAbsorption + this.additionalAbsorption;
  }

  /**
   * PROTECTED: Sabine equation for RT60
   * RT60 = 0.161 × V / A
   */
  private calculateRT60(): number {
    const totalAbsorption = this.calculateTotalAbsorption();
    if (totalAbsorption === 0) return Infinity;
    return (0.161 * this.roomVolume) / totalAbsorption;
  }

  /**
   * PROTECTED: Average absorption coefficient
   */
  private calculateAverageAbsorption(): number {
    const totalAbsorption = this.calculateTotalAbsorption();
    const totalArea = this.calculateSurfaceArea();
    return totalAbsorption / totalArea;
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;

    this.time += deltaTime / 1000;

    // Decay sound level based on RT60
    if (this.soundActive) {
      const rt60 = this.calculateRT60();
      const decayRate = 60 / rt60; // dB per second
      this.soundLevel -= decayRate * (deltaTime / 1000);
      if (this.soundLevel <= 0) {
        this.soundActive = false;
        this.soundLevel = 0;
      }
    }
  }

  private resetSimulation(): void {
    this.roomVolume = 500;
    this.wallMaterial = 'concrete';
    this.floorMaterial = 'hardwood';
    this.ceilingMaterial = 'concrete';
    this.additionalAbsorption = 0;
    this.soundActive = false;
    this.soundLevel = 60;
    this.time = 0;
    this.isAnimating = true;
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
    r.circle(175, 0, 200, { fill: colors.primary, opacity: 0.03 });
    r.circle(525, 500, 200, { fill: colors.accent, opacity: 0.03 });
  }

  private renderRoomVisualization(r: CommandRenderer, centerX: number, centerY: number, scale: number = 1): void {
    const width = 200 * scale;
    const height = 140 * scale;

    // Room outline (simple 2D top view)
    r.rect(centerX - width / 2, centerY - height / 2, width, height, {
      fill: colors.bgCardLight,
      stroke: colors.border,
      strokeWidth: 2,
      rx: 4,
    });

    // Sound source
    const sourceX = centerX;
    const sourceY = centerY;
    r.circle(sourceX, sourceY, 10 * scale, {
      fill: colors.soundWave,
      opacity: this.soundActive ? 1 : 0.5,
    });

    // Sound waves (expanding circles)
    if (this.showWaves && this.soundActive) {
      const rt60 = this.calculateRT60();
      const waveCount = 4;
      for (let i = 0; i < waveCount; i++) {
        const phase = (this.time + i * 0.3) % rt60;
        const radius = 20 + (phase / rt60) * 80;
        const opacity = 1 - (phase / rt60);
        r.circle(sourceX, sourceY, radius * scale, {
          fill: 'none',
          stroke: colors.soundWave,
          strokeWidth: 2,
          opacity: opacity * 0.5,
        });
      }
    }

    // Material labels
    r.text(centerX, centerY - height / 2 - 10, `Walls: ${this.wallMaterial}`, {
      fill: colors.textSecondary,
      fontSize: 9,
      textAnchor: 'middle',
    });
    r.text(centerX, centerY + height / 2 + 15, `Floor: ${this.floorMaterial}`, {
      fill: colors.textSecondary,
      fontSize: 9,
      textAnchor: 'middle',
    });

    // Sound level meter
    const meterWidth = 80 * scale;
    const meterHeight = 15 * scale;
    const meterX = centerX - meterWidth / 2;
    const meterY = centerY + height / 2 + 30;

    r.rect(meterX, meterY, meterWidth, meterHeight, {
      fill: colors.bgDark,
      stroke: colors.border,
      rx: 4,
    });
    r.rect(meterX + 2, meterY + 2, (meterWidth - 4) * (this.soundLevel / 60), meterHeight - 4, {
      fill: this.soundLevel > 40 ? colors.soundWave : colors.warning,
      rx: 2,
    });
    r.text(centerX, meterY + meterHeight + 12, `${this.soundLevel.toFixed(0)} dB`, {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle',
    });
  }

  private renderHookPhase(r: CommandRenderer): void {
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.text(350, 49, 'PHYSICS EXPLORATION', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, 'Room Acoustics', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'Why do some rooms echo and others don\'t?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.rect(160, 160, 380, 220, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 20,
      opacity: 0.8,
    });

    this.renderRoomVisualization(r, 350, 280, 1);

    r.text(350, 400, 'Reverberation time determines room character...', {
      fill: colors.textPrimary,
      fontSize: 14,
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

    r.rect(100, 80, 500, 80, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 115, 'Compare an empty room with bare walls vs. the same room with carpet and curtains.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'Which has longer reverberation?', {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (this.prediction) {
      const isCorrect = this.prediction === 'A';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 375, isCorrect
        ? 'Correct! Empty rooms have less absorption, so longer reverberation!'
        : 'Soft materials absorb sound - empty rooms echo more!',
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
    r.text(350, 30, 'Reverberation Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 340, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderRoomVisualization(r, 250, 190, 1.2);

    // Stats panel
    r.rect(440, 50, 210, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    const rt60 = this.calculateRT60();
    const totalAbsorption = this.calculateTotalAbsorption();
    const avgAlpha = this.calculateAverageAbsorption();

    r.text(545, 80, 'Acoustics Data', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });

    r.rect(460, 100, 170, 50, { fill: '#8b5cf630', rx: 8 });
    r.text(545, 120, 'RT60', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(545, 140, `${rt60.toFixed(2)} seconds`, {
      fill: colors.primary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(460, 160, 170, 50, { fill: '#22c55e30', rx: 8 });
    r.text(545, 180, 'Total Absorption', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(545, 200, `${totalAbsorption.toFixed(1)} sabins`, {
      fill: colors.soundWave,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(460, 220, 170, 50, { fill: colors.bgCardLight, rx: 8 });
    r.text(545, 240, 'Avg. α', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(545, 260, avgAlpha.toFixed(3), {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 350, 570, 60, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(365, 375, 'Sabine Equation: RT60 = 0.161V/A', {
      fill: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(365, 395, 'V = volume (m³), A = total absorption (sabins)', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding RT60', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 290, 150, { fill: '#8b5cf640', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'Sabine Equation', { fill: colors.primary, fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });
    const eqInfo = [
      'RT60 = 0.161 × V / A',
      'V = room volume (m³)',
      'A = Σ(α × S) total absorption',
      'α = absorption coefficient (0-1)',
    ];
    eqInfo.forEach((line, i) => {
      r.text(70, 120 + i * 25, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 150, { fill: '#f9731640', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Material α Values', { fill: colors.accent, fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });
    const matInfo = [
      'Concrete: 0.02 (very reflective)',
      'Carpet: 0.40 (absorptive)',
      'Acoustic panels: 0.85',
      'Open window: 1.00 (perfect)',
    ];
    matInfo.forEach((line, i) => {
      r.text(380, 120 + i * 25, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(50, 240, 600, 80, { fill: '#22c55e40', stroke: colors.success, rx: 16 });
    r.text(350, 265, 'RT60 = "Reverberation Time 60"', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 290, 'Time for sound to decrease by 60 dB (to 1/1,000,000 of original intensity)', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Volume Twist', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'A cathedral vs. a small chapel - both with stone walls.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 145, 'Which has longer reverberation?', {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'A';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 375, isCorrect
        ? 'Correct! Larger volume = more RT60 (volume is in numerator)!'
        : 'Volume is in the numerator - larger rooms have longer RT60!',
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
    r.text(350, 30, 'Volume Effects Lab', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 540, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderRoomVisualization(r, 350, 190, 1.3);

    const rt60 = this.calculateRT60();

    r.rect(80, 350, 540, 60, { fill: '#eab30830', stroke: colors.warning, rx: 12 });
    r.text(350, 370, `Volume: ${this.roomVolume.toFixed(0)} m³ | RT60: ${rt60.toFixed(2)} seconds`, {
      fill: colors.warning,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 395, 'Cathedrals can have RT60 of 5-10 seconds!', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Designing Room Acoustics', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'Optimal RT60 for Different Uses', {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const uses = [
      { type: 'Recording studio', rt60: '0.1-0.3s', desc: '(dry, clean sound)' },
      { type: 'Lecture hall', rt60: '0.5-1.0s', desc: '(speech clarity)' },
      { type: 'Concert hall', rt60: '1.5-2.0s', desc: '(musical warmth)' },
      { type: 'Cathedral', rt60: '5-10s', desc: '(grand reverb)' },
    ];

    uses.forEach((use, i) => {
      r.text(120, 150 + i * 28, `${use.type}: ${use.rt60} ${use.desc}`, { fill: colors.textSecondary, fontSize: 12 });
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
        fontSize: 11,
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
      fontSize: 15,
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

    r.text(350, 100, passed ? 'Congratulations!' : 'Keep Learning!', {
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

    r.text(350, 200, passed ? 'You\'ve mastered room acoustics!' : 'Review the Sabine equation and try again.', {
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

    r.text(350, 130, 'Acoustics Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, 'You\'ve mastered reverberation and room acoustics!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'RT60', label: 'Reverb Time' },
      { icon: 'α', label: 'Absorption' },
      { icon: '0.161', label: 'Sabine' },
      { icon: 'V/A', label: 'Room Design' },
    ];

    badges.forEach((badge, i) => {
      const x = 180 + (i % 2) * 170;
      const y = 200 + Math.floor(i / 2) * 80;
      r.rect(x, y, 150, 60, { fill: colors.bgCardLight, rx: 12 });
      r.text(x + 75, y + 25, badge.icon, { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
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
        r.addButton({ id: 'next', label: 'Explore Acoustics', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Empty room', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Furnished room', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Same', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Test It', variant: 'success' });
        }
        break;

      case 'play':
        r.addButton({ id: 'wall_concrete', label: 'Concrete', variant: this.wallMaterial === 'concrete' ? 'primary' : 'ghost' });
        r.addButton({ id: 'wall_acoustic_panels', label: 'Panels', variant: this.wallMaterial === 'acoustic_panels' ? 'primary' : 'ghost' });
        r.addButton({ id: 'floor_hardwood', label: 'Wood', variant: this.floorMaterial === 'hardwood' ? 'primary' : 'ghost' });
        r.addButton({ id: 'floor_carpet', label: 'Carpet', variant: this.floorMaterial === 'carpet' ? 'primary' : 'ghost' });
        r.addButton({ id: 'play_sound', label: 'Play Sound', variant: 'success' });
        r.addButton({ id: 'next', label: 'Review', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Volume Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Cathedral', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Chapel', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Same', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See Volume Effect', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({ id: 'volume', label: 'Room Volume (m³)', value: this.roomVolume, min: 100, max: 5000, step: 100 });
        r.addButton({ id: 'play_sound', label: 'Play Sound', variant: 'success' });
        r.addButton({ id: 'next', label: 'Design Principles', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Concert', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Studio', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Lecture', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Theater', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every((c) => c)) {
          r.addButton({ id: 'next', label: 'Take Test', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= testQuestions.length - 1 });
          testQuestions[this.testQuestion].options.forEach((_, i) => {
            r.addButton({ id: `answer_${i}`, label: `Option ${String.fromCharCode(65 + i)}`, variant: this.testAnswers[this.testQuestion] === i ? 'primary' : 'secondary' });
          });
          if (this.testAnswers.every((a) => a !== null)) {
            r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
          }
        } else {
          const score = this.calculateTestScore();
          if (score >= 7) {
            r.addButton({ id: 'next', label: 'Claim Badge', variant: 'success' });
          } else {
            r.addButton({ id: 'back', label: 'Review Again', variant: 'secondary' });
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
      roomVolume: this.roomVolume,
      wallMaterial: this.wallMaterial,
      floorMaterial: this.floorMaterial,
      showWaves: this.showWaves,
      soundActive: this.soundActive,
      soundLevel: this.soundLevel,
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
    this.roomVolume = (state.roomVolume as number) || 500;
    this.wallMaterial = (state.wallMaterial as string) || 'concrete';
    this.floorMaterial = (state.floorMaterial as string) || 'hardwood';
    this.showWaves = (state.showWaves as boolean) ?? true;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===

export function createReverberationGame(sessionId: string): ReverberationGame {
  return new ReverberationGame(sessionId);
}
