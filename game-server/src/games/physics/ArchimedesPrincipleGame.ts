/**
 * Archimedes' Principle Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Buoyancy formula: F_b = rho * g * V_displaced
 * - Floating condition: F_b >= Weight (rho_object < rho_fluid)
 * - Density calculations: rho = mass / volume
 * - Crown test calculations for detecting alloys
 * - Displacement volume measurements
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
    question: 'According to Archimedes\' Principle, what determines whether an object floats?',
    options: ['Object weight alone', 'Object color and texture', 'Object density vs fluid density', 'Water depth'],
    correctIndex: 2,
  },
  {
    question: 'How did Archimedes detect the fake crown?',
    options: ['Measured how fast it sank', 'Compared water displacement to pure gold', 'Checked water color change', 'Weighed water before and after'],
    correctIndex: 1,
  },
  {
    question: 'How can a massive steel ship float while a tiny bolt sinks?',
    options: ['Ships use lightweight steel', 'Ocean salt helps flotation', 'Hull shape displaces huge water volume', 'Ships have special engines'],
    correctIndex: 2,
  },
  {
    question: 'How does a submarine control floating and sinking?',
    options: ['Changing propeller speed', 'Filling/emptying ballast tanks', 'Heating surrounding water', 'Turning upside down'],
    correctIndex: 1,
  },
  {
    question: 'How do fish control buoyancy?',
    options: ['Swallowing water', 'Changing color', 'Adjusting swim bladder gas volume', 'Moving fins fast'],
    correctIndex: 2,
  },
  {
    question: 'A life jacket displaces 20 liters of water. What buoyant force does it provide?',
    options: ['2 N', '20 N', '200 N', '2000 N'],
    correctIndex: 2,
  },
  {
    question: 'If crude oil is less dense than water, a full oil tanker:',
    options: ['Can be smaller', 'Rides higher than with water cargo', 'Needs extra engines', 'Design unaffected'],
    correctIndex: 1,
  },
  {
    question: 'A hot air balloon with 2500 m^3 of heated air provides approximately:',
    options: ['Zero lift', '575 kg of lift', '2500 kg of lift', '250 kg of lift'],
    correctIndex: 1,
  },
  {
    question: 'A hydrometer sinks too low in battery acid. This indicates:',
    options: ['Battery overcharged', 'Acid too dense', 'Battery discharged (low acid density)', 'Hydrometer broken'],
    correctIndex: 2,
  },
  {
    question: 'NASA trains astronauts underwater because:',
    options: ['Faster sinking for drama', 'Neutral buoyancy simulates zero-g', 'Protection from pressure', 'Looking professional'],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#f59e0b',
  primaryDark: '#d97706',
  accent: '#06b6d4',
  accentDark: '#0891b2',
  warning: '#f59e0b',
  success: '#10b981',
  danger: '#ef4444',
  bgDark: '#020617',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  water: '#3b82f6',
  waterLight: '#60a5fa',
  gold: '#fbbf24',
  silver: '#94a3b8',
};

// === MATERIAL DATA ===
interface Material {
  name: string;
  density: number;
  color: string;
}

const materials: Record<string, Material> = {
  gold: { name: 'Pure Gold', density: 19.3, color: colors.gold },
  silver: { name: 'Silver', density: 10.5, color: colors.silver },
  alloy: { name: 'Gold/Silver Alloy', density: 14.9, color: '#d4a574' },
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
    title: 'Ship Design',
    icon: 'ship',
    description: 'Every ship relies on Archimedes\' principle. Hull volume creates buoyancy equal to ship weight.',
    details: 'The largest ships displace over 500,000 tons of water. Naval architects calculate hull volume for any cargo.',
  },
  {
    title: 'Scuba Diving',
    icon: 'dive',
    description: 'Divers use BCDs (Buoyancy Control Devices) to achieve neutral buoyancy at any depth.',
    details: 'Adding air increases volume and buoyancy. Over 6 million active divers worldwide rely on this principle.',
  },
  {
    title: 'Density Testing',
    icon: 'lab',
    description: 'Hydrometers measure liquid density using displacement - exactly like Archimedes\' crown test.',
    details: 'Used in brewing, battery testing, fuel quality, and jewelry appraisal with 0.0001 g/cm^3 precision.',
  },
  {
    title: 'Hot Air Balloons',
    icon: 'balloon',
    description: 'Archimedes\' principle works for gases too! Hot air displaces heavier cold air for lift.',
    details: 'Weather balloons reach 120,000 ft. Hot air balloons heat air to reduce density and create lift.',
  },
];

// === MAIN GAME CLASS ===

export class ArchimedesPrincipleGame extends BaseGame {
  readonly gameType = 'archimedes_principle';
  readonly gameTitle = 'Archimedes\' Principle';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private objectMass = 500; // grams
  private objectVolume = 100; // cm^3
  private submergeProgress = 0;
  private isSubmerged = false;
  private selectedMaterial: 'gold' | 'silver' | 'alloy' = 'gold';
  private time = 0;
  private isAnimating = false;

  // PROTECTED: Physics constants
  private readonly waterDensity = 1.0; // g/cm^3
  private readonly gravity = 9.81; // m/s^2

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
    twist_play: 'Crown Test',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Legend says Archimedes shouted "Eureka!" when he discovered this principle in his bath.',
    predict: 'Think about what happens when you push a ball underwater...',
    play: 'Experiment with mass and volume. Watch the buoyant force change!',
    review: 'The buoyant force equals the weight of displaced fluid. F_b = rho * g * V',
    twist_predict: 'King Hiero suspected his crown was fake. How could Archimedes test it without melting it?',
    twist_play: 'Compare displacement of different materials with the same weight.',
    twist_review: 'Density = mass/volume. Same weight but different densities = different volumes displaced!',
    transfer: 'From ships to submarines to balloons - Archimedes\' principle is everywhere!',
    test: 'Test your understanding of buoyancy and displacement!',
    mastery: 'Congratulations! You understand Archimedes\' Principle!',
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
      message: 'Archimedes\' Principle lesson started',
    });
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

    // Predictions - correct answer is C
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }

    // Twist predictions - correct answer is B
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

    // Material selection
    if (id === 'material_gold') {
      this.selectedMaterial = 'gold';
      return;
    }
    if (id === 'material_silver') {
      this.selectedMaterial = 'silver';
      return;
    }
    if (id === 'material_alloy') {
      this.selectedMaterial = 'alloy';
      return;
    }

    // Simulation controls
    if (id === 'submerge') {
      this.isAnimating = true;
      this.isSubmerged = true;
      return;
    }
    if (id === 'reset') {
      this.resetSimulation();
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'mass') {
      this.objectMass = value;
      return;
    }
    if (id === 'volume') {
      this.objectVolume = value;
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
   * PROTECTED: Calculate object density
   * rho = m / V
   */
  private calculateDensity(): number {
    return this.objectMass / this.objectVolume;
  }

  /**
   * PROTECTED: Calculate buoyant force
   * F_b = rho_fluid * g * V_displaced
   */
  private calculateBuoyantForce(): number {
    const volumeDisplaced = this.isSubmerged ? this.objectVolume : 0;
    return this.waterDensity * this.gravity * volumeDisplaced / 1000; // Convert to N
  }

  /**
   * PROTECTED: Calculate object weight
   * W = m * g
   */
  private calculateWeight(): number {
    return (this.objectMass / 1000) * this.gravity; // Convert g to kg
  }

  /**
   * PROTECTED: Determine if object floats
   */
  private willFloat(): boolean {
    return this.calculateDensity() < this.waterDensity;
  }

  /**
   * PROTECTED: Calculate displacement for crown test
   */
  private calculateCrownDisplacement(material: 'gold' | 'silver' | 'alloy'): number {
    const crownMass = 1000; // 1 kg crown
    return crownMass / materials[material].density;
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;

    this.time += deltaTime / 1000;

    if (this.isSubmerged && this.submergeProgress < 100) {
      this.submergeProgress += 2;
      if (this.submergeProgress >= 100) {
        this.submergeProgress = 100;
        this.isAnimating = false;
      }
    }
  }

  private resetSimulation(): void {
    this.submergeProgress = 0;
    this.isSubmerged = false;
    this.isAnimating = false;
    this.time = 0;
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

  // --- WATER TANK RENDERER ---

  private renderWaterTank(r: CommandRenderer, centerX: number, centerY: number, width: number, height: number): void {
    // Tank outline
    r.rect(centerX - width / 2, centerY - height / 2, width, height, {
      fill: 'none',
      stroke: colors.border,
      strokeWidth: 3,
      rx: 8,
    });

    // Water
    const waterHeight = height * 0.7;
    const waterY = centerY + height / 2 - waterHeight;

    r.linearGradient('waterGrad', [
      { offset: '0%', color: colors.waterLight },
      { offset: '100%', color: colors.water },
    ]);

    r.rect(centerX - width / 2 + 3, waterY, width - 6, waterHeight - 3, {
      fill: 'url(#waterGrad)',
      opacity: 0.7,
      rx: 4,
    });

    // Object (if submerging)
    if (this.submergeProgress > 0) {
      const objectSize = Math.min(40, Math.sqrt(this.objectVolume) * 2);
      const submergeDepth = (this.submergeProgress / 100) * (waterHeight - objectSize);
      const objectY = waterY - objectSize + submergeDepth;

      const density = this.calculateDensity();
      const floats = density < this.waterDensity;

      // Object
      r.rect(centerX - objectSize / 2, objectY, objectSize, objectSize, {
        fill: floats ? colors.success : colors.danger,
        stroke: colors.textPrimary,
        strokeWidth: 2,
        rx: 4,
      });

      // Buoyancy arrow
      if (this.submergeProgress >= 50) {
        const buoyantForce = this.calculateBuoyantForce();
        const arrowLength = Math.min(60, buoyantForce * 5);
        r.line(centerX, objectY + objectSize, centerX, objectY + objectSize - arrowLength, {
          stroke: colors.accent,
          strokeWidth: 3,
        });
        r.polygon([
          { x: centerX - 8, y: objectY + objectSize - arrowLength + 10 },
          { x: centerX, y: objectY + objectSize - arrowLength },
          { x: centerX + 8, y: objectY + objectSize - arrowLength + 10 },
        ], { fill: colors.accent });
        r.text(centerX + 15, objectY + objectSize - arrowLength / 2, 'F_b', {
          fill: colors.accent,
          fontSize: 12,
          fontWeight: 'bold',
        });
      }
    }

    // Water level indicator
    r.text(centerX - width / 2 - 30, waterY, 'Water', { fill: colors.textMuted, fontSize: 10, textAnchor: 'end' });
  }

  // --- PHASE RENDERERS ---

  private renderHookPhase(r: CommandRenderer): void {
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.circle(295, 44, 4, { fill: colors.primary });
    r.text(350, 49, 'PHYSICS EXPLORATION', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, 'Archimedes\' Principle', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 135, 'The eureka moment that changed science forever', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.rect(160, 160, 380, 200, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 20,
    });

    // Story text
    r.text(350, 200, 'King Hiero suspected his goldsmith had cheated him,', {
      fill: colors.textPrimary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 225, 'mixing silver into his golden crown.', {
      fill: colors.textPrimary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 260, 'He asked Archimedes to find out WITHOUT melting the crown.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 300, 'How could Archimedes solve this puzzle?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Crown icon
    r.text(350, 340, '[crown]', {
      fill: colors.gold,
      fontSize: 32,
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
    r.text(350, 115, 'When you push a ball underwater and release it, it shoots up.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 145, 'What determines if an object floats or sinks?', {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (this.prediction) {
      const isCorrect = this.prediction === 'C';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(
        350,
        375,
        isCorrect
          ? 'Correct! Density comparison determines floating vs sinking!'
          : 'Think about what property compares the object to the fluid.',
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
    r.text(350, 30, 'Buoyancy Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Water tank
    this.renderWaterTank(r, 350, 200, 200, 250);

    // Stats panel
    r.rect(480, 80, 180, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    const density = this.calculateDensity();
    const buoyantForce = this.calculateBuoyantForce();
    const weight = this.calculateWeight();
    const floats = this.willFloat();

    r.text(570, 105, 'Physics Data', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });

    r.rect(495, 120, 150, 45, { fill: colors.bgCardLight, rx: 8 });
    r.text(570, 140, 'Density', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(570, 158, `${density.toFixed(2)} g/cm^3`, { fill: colors.textPrimary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(495, 175, 150, 45, { fill: colors.bgCardLight, rx: 8 });
    r.text(570, 195, 'Weight', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(570, 213, `${weight.toFixed(2)} N`, { fill: colors.danger, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(495, 230, 150, 45, { fill: colors.bgCardLight, rx: 8 });
    r.text(570, 250, 'Buoyant Force', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(570, 268, `${buoyantForce.toFixed(2)} N`, { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(495, 285, 150, 45, { fill: floats ? '#065f4640' : '#7f1d1d40', stroke: floats ? colors.success : colors.danger, rx: 8 });
    r.text(570, 305, 'Prediction', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(570, 323, floats ? 'FLOATS' : 'SINKS', { fill: floats ? colors.success : colors.danger, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Formula
    r.rect(80, 380, 540, 50, { fill: colors.bgCardLight, rx: 12 });
    r.text(350, 410, 'Archimedes\' Principle: F_buoyant = rho_fluid * g * V_displaced', {
      fill: colors.primary,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Buoyancy', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 290, 140, { fill: '#f59e0b40', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'Archimedes\' Principle', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const apInfo = [
      'Buoyant force = weight of displaced fluid',
      'F_b = rho * g * V_displaced',
      'Acts upward, opposing gravity',
    ];
    apInfo.forEach((line, i) => {
      r.text(70, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 140, { fill: '#06b6d440', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Float vs Sink', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const fsInfo = [
      'If rho_object < rho_fluid: FLOATS',
      'If rho_object > rho_fluid: SINKS',
      'Ships float due to low average density',
    ];
    fsInfo.forEach((line, i) => {
      r.text(380, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(50, 230, 600, 80, { fill: '#06533940', stroke: colors.success, rx: 16 });
    r.text(350, 255, 'Key Insight', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 280, 'A steel ship floats because the HULL creates low AVERAGE density - mostly air inside!', {
      fill: colors.textPrimary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Crown Challenge', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 120, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'King Hiero gives Archimedes a crown that SHOULD be pure gold.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 155, 'He suspects the goldsmith mixed in silver (less dense than gold).', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 185, 'How can Archimedes test it WITHOUT melting the crown?', {
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
      r.text(
        350,
        375,
        isCorrect
          ? 'Eureka! Compare water displacement to what pure gold would displace!'
          : 'Think about what displacement reveals about an object.',
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
    r.text(350, 30, 'The Crown Test', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Three containers showing displacement comparison
    const goldDisp = this.calculateCrownDisplacement('gold');
    const silverDisp = this.calculateCrownDisplacement('silver');
    const alloyDisp = this.calculateCrownDisplacement('alloy');

    const containers = [
      { label: 'Pure Gold', disp: goldDisp, color: colors.gold, x: 120 },
      { label: 'Silver', disp: silverDisp, color: colors.silver, x: 300 },
      { label: 'Alloy (Fake)', disp: alloyDisp, color: '#d4a574', x: 480 },
    ];

    containers.forEach((c) => {
      r.rect(c.x - 60, 80, 120, 200, { fill: colors.bgCard, stroke: colors.border, rx: 12 });

      // Water level varies based on displacement
      const waterHeight = 100 + c.disp * 0.3;
      r.rect(c.x - 55, 280 - waterHeight, 110, waterHeight - 5, { fill: colors.water, opacity: 0.5, rx: 4 });

      // Crown
      r.rect(c.x - 25, 180, 50, 30, { fill: c.color, rx: 4 });

      r.text(c.x, 300, c.label, { fill: colors.textPrimary, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(c.x, 320, `V = ${c.disp.toFixed(1)} cm^3`, { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    });

    // Explanation
    r.rect(80, 350, 540, 80, { fill: colors.bgCardLight, rx: 12 });
    r.text(350, 375, 'Same mass (1 kg crown), but different volumes displaced!', {
      fill: colors.primary,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 400, 'Lower density (alloy) = larger volume = more water displaced. Eureka!', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Density Connection', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 200, { fill: '#78350f30', stroke: colors.warning, rx: 16 });
    r.text(350, 120, 'Density = Mass / Volume', {
      fill: colors.warning,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(150, 160, 'If mass is constant:', { fill: colors.textSecondary, fontSize: 13 });
    r.text(170, 190, '* Lower density = LARGER volume', { fill: colors.textSecondary, fontSize: 12 });
    r.text(170, 215, '* Larger volume = MORE water displaced', { fill: colors.textSecondary, fontSize: 12 });
    r.text(170, 240, '* More displacement = alloy detected!', { fill: colors.textSecondary, fontSize: 12 });

    r.text(350, 280, 'Gold: 19.3 g/cm^3  |  Silver: 10.5 g/cm^3  |  Alloy: ~14.9 g/cm^3', {
      fill: colors.textMuted,
      fontSize: 11,
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

    r.text(350, 200, passed ? 'Excellent! You understand Archimedes\' Principle!' : 'Keep studying! Review and try again.', {
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

    r.text(350, 130, 'Buoyancy Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, 'You have mastered Archimedes\' Principle!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'F_b', label: 'Buoyant Force' },
      { icon: 'rho', label: 'Density' },
      { icon: 'ship', label: 'Ship Design' },
      { icon: 'crown', label: 'Crown Test' },
    ];

    badges.forEach((badge, i) => {
      const x = 180 + (i % 2) * 170;
      const y = 200 + Math.floor(i / 2) * 80;
      r.rect(x, y, 150, 60, { fill: colors.bgCardLight, rx: 12 });
      r.text(x + 75, y + 25, badge.icon, { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x + 75, y + 45, badge.label, { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    });
  }

  // --- UI STATE ---

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
        r.addButton({ id: 'next', label: 'Discover the Secret', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Object weight alone', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Object color and texture', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Object density vs fluid density', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. Water depth', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Explore the Physics', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'mass', label: 'Mass (g)', value: this.objectMass, min: 100, max: 1000, step: 50 });
        r.addSlider({ id: 'volume', label: 'Volume (cm^3)', value: this.objectVolume, min: 50, max: 500, step: 25 });
        r.addButton({ id: 'submerge', label: 'Submerge Object', variant: 'primary' });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'ghost' });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Try the Crown Challenge', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Measure how fast it sinks', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Compare water displacement to pure gold', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Check water color change', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D. Weigh the water', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See the Test', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addButton({ id: 'material_gold', label: 'Pure Gold', variant: this.selectedMaterial === 'gold' ? 'primary' : 'ghost' });
        r.addButton({ id: 'material_silver', label: 'Silver', variant: this.selectedMaterial === 'silver' ? 'primary' : 'ghost' });
        r.addButton({ id: 'material_alloy', label: 'Alloy (Fake)', variant: this.selectedMaterial === 'alloy' ? 'primary' : 'ghost' });
        r.addButton({ id: 'next', label: 'See Why It Works', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real-World Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Ships', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Diving', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Testing', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Balloons', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every((c) => c)) {
          r.addButton({ id: 'next', label: 'Take Knowledge Test', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= testQuestions.length - 1 });
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
      objectMass: this.objectMass,
      objectVolume: this.objectVolume,
      submergeProgress: this.submergeProgress,
      isSubmerged: this.isSubmerged,
      selectedMaterial: this.selectedMaterial,
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
    this.objectMass = (state.objectMass as number) || 500;
    this.objectVolume = (state.objectVolume as number) || 100;
    this.submergeProgress = (state.submergeProgress as number) || 0;
    this.isSubmerged = (state.isSubmerged as boolean) || false;
    this.selectedMaterial = (state.selectedMaterial as 'gold' | 'silver' | 'alloy') || 'gold';
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===
export function createArchimedesPrincipleGame(sessionId: string): ArchimedesPrincipleGame {
  return new ArchimedesPrincipleGame(sessionId);
}
