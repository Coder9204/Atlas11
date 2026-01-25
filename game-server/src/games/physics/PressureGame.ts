/**
 * Pressure Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Pressure formula: P = F/A
 * - Nail bed pressure distribution
 * - Force concentration calculations
 * - Contact area relationships
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
    question: 'The formula for pressure is:',
    options: ['P = F × A', 'P = F / A', 'P = A / F', 'P = F + A'],
    correctIndex: 1,
  },
  {
    question: 'If you double the contact area while keeping force constant, pressure:',
    options: ['Doubles', 'Halves', 'Stays the same', 'Quadruples'],
    correctIndex: 1,
  },
  {
    question: 'A bed of nails works because:',
    options: ['The nails are dull', 'Force is distributed over many contact points', 'The person is very light', 'The nails are magnetic'],
    correctIndex: 1,
  },
  {
    question: 'High heels cause more floor damage than flat shoes because:',
    options: ['They weigh more', 'The contact area is smaller', 'The material is harder', 'They have more mass'],
    correctIndex: 1,
  },
  {
    question: 'The SI unit of pressure is:',
    options: ['Newton', 'Pascal (N/m²)', 'Joule', 'Watt'],
    correctIndex: 1,
  },
  {
    question: 'A knife cuts well because:',
    options: ['It\'s heavy', 'The blade edge has very small area', 'It\'s made of steel', 'It moves fast'],
    correctIndex: 1,
  },
  {
    question: 'Wide tires on trucks help by:',
    options: ['Looking better', 'Distributing weight over larger area', 'Going faster', 'Using less fuel'],
    correctIndex: 1,
  },
  {
    question: 'Atmospheric pressure at sea level is about:',
    options: ['1 Pa', '100 Pa', '10,000 Pa', '101,325 Pa'],
    correctIndex: 3,
  },
  {
    question: 'Why do camels have large flat feet?',
    options: ['For better swimming', 'To distribute weight on sand', 'To run faster', 'For protection'],
    correctIndex: 1,
  },
  {
    question: 'If 100 nails share a 500 N force, each nail experiences:',
    options: ['500 N', '50,000 N', '5 N', '0.5 N'],
    correctIndex: 2,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#ef4444',
  primaryDark: '#dc2626',
  accent: '#3b82f6',
  accentDark: '#2563eb',
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
  nailColor: '#78716c',
  forceArrow: '#22c55e',
  pressureHigh: '#ef4444',
  pressureLow: '#22c55e',
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
    title: 'Knife Design',
    icon: 'knife',
    description: 'Sharp knives cut better because the edge has minimal contact area.',
    details: 'The same force applied over a smaller area creates much higher pressure, allowing the blade to cut through materials.',
  },
  {
    title: 'Snowshoes',
    icon: 'snowshoe',
    description: 'Wide snowshoes prevent sinking by spreading weight over a larger area.',
    details: 'By increasing the contact area, the pressure on the snow decreases below its breaking point.',
  },
  {
    title: 'Nail Bed Stunts',
    icon: 'nails',
    description: 'Performers lie on hundreds of nails without injury.',
    details: 'Each nail supports only a tiny fraction of the body weight, keeping pressure below the skin-piercing threshold.',
  },
  {
    title: 'Foundation Design',
    icon: 'building',
    description: 'Buildings need wide foundations to prevent sinking.',
    details: 'Engineers calculate the required foundation area based on soil bearing capacity and building weight.',
  },
];

// === MAIN GAME CLASS ===

export class PressureGame extends BaseGame {
  readonly gameType = 'pressure';
  readonly gameTitle = 'Pressure: P = F/A';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private force = 500; // Newtons
  private nailCount = 100;
  private nailDiameter = 2; // mm
  private showForceDistribution = true;
  private isAnimating = true;
  private personMass = 70; // kg
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
    hook: 'How can someone lie on a bed of sharp nails without getting hurt? The answer is pressure!',
    predict: 'Would you rather be stepped on by a shoe or a stiletto heel? Why?',
    play: 'Adjust the number of nails and see how pressure changes!',
    review: 'Pressure = Force / Area. More nails = more area = less pressure per nail!',
    twist_predict: 'What happens if we remove half the nails?',
    twist_play: 'Watch how reducing contact points dramatically increases pressure!',
    twist_review: 'The danger zone! Too few nails means too much pressure per point.',
    transfer: 'Pressure principles are used everywhere: knives, snowshoes, buildings, and more!',
    test: 'Time to test your understanding of pressure!',
    mastery: 'Congratulations! You\'ve mastered the relationship between force, area, and pressure!',
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
      message: 'Pressure lesson started',
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

    if (id === 'reset') {
      this.resetSimulation();
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'distribution') {
      this.showForceDistribution = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'nail_count') {
      this.nailCount = value;
      return;
    }
    if (id === 'force') {
      this.force = value;
      return;
    }
    if (id === 'nail_diameter') {
      this.nailDiameter = value;
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
   * PROTECTED: Pressure calculation
   * P = F / A
   */
  private calculatePressure(): number {
    const totalArea = this.calculateTotalContactArea();
    if (totalArea === 0) return Infinity;
    return this.force / totalArea;
  }

  /**
   * PROTECTED: Total contact area calculation
   * A = n × π × (d/2)²
   */
  private calculateTotalContactArea(): number {
    const radiusMeters = (this.nailDiameter / 2) / 1000; // Convert mm to m
    const areaPerNail = Math.PI * radiusMeters ** 2;
    return this.nailCount * areaPerNail;
  }

  /**
   * PROTECTED: Force per nail
   */
  private calculateForcePerNail(): number {
    if (this.nailCount === 0) return Infinity;
    return this.force / this.nailCount;
  }

  /**
   * PROTECTED: Pressure per nail
   */
  private calculatePressurePerNail(): number {
    const radiusMeters = (this.nailDiameter / 2) / 1000;
    const areaPerNail = Math.PI * radiusMeters ** 2;
    const forcePerNail = this.calculateForcePerNail();
    return forcePerNail / areaPerNail;
  }

  /**
   * PROTECTED: Check if pressure is dangerous
   * Skin piercing threshold ~1 MPa (1,000,000 Pa)
   */
  private isPressureDangerous(): boolean {
    return this.calculatePressurePerNail() > 1000000;
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;

    this.time += deltaTime / 1000;
  }

  private resetSimulation(): void {
    this.force = 500;
    this.nailCount = 100;
    this.nailDiameter = 2;
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

  private renderNailBed(r: CommandRenderer, centerX: number, centerY: number, scale: number = 1): void {
    const isDangerous = this.isPressureDangerous();
    const nailsPerRow = Math.ceil(Math.sqrt(this.nailCount));
    const spacing = 15 * scale;
    const bedWidth = nailsPerRow * spacing;

    // Bed frame
    r.rect(centerX - bedWidth / 2 - 10, centerY, bedWidth + 20, 30 * scale, {
      fill: '#44403c',
      stroke: colors.border,
      rx: 4,
    });

    // Draw nails
    let nailsDrawn = 0;
    for (let row = 0; row < nailsPerRow && nailsDrawn < this.nailCount; row++) {
      for (let col = 0; col < nailsPerRow && nailsDrawn < this.nailCount; col++) {
        const x = centerX - bedWidth / 2 + spacing / 2 + col * spacing;
        const y = centerY - 5;

        // Nail shaft
        r.line(x, y, x, y - 25 * scale, {
          stroke: colors.nailColor,
          strokeWidth: 2 * scale,
        });
        // Nail tip
        r.circle(x, y - 28 * scale, 2 * scale, {
          fill: isDangerous ? colors.pressureHigh : colors.pressureLow,
        });

        nailsDrawn++;
      }
    }

    // Force distribution visualization
    if (this.showForceDistribution) {
      const forcePerNail = this.calculateForcePerNail();
      const maxForce = 50; // For visualization scaling
      const arrowLength = Math.min(40, (forcePerNail / maxForce) * 40) * scale;

      r.line(centerX, centerY - 80 * scale, centerX, centerY - 80 * scale - arrowLength, {
        stroke: colors.forceArrow,
        strokeWidth: 3,
      });
      r.text(centerX + 15, centerY - 80 * scale - arrowLength / 2, `${this.force} N`, {
        fill: colors.forceArrow,
        fontSize: 12,
        fontWeight: 'bold',
      });
    }
  }

  private renderHookPhase(r: CommandRenderer): void {
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.text(350, 49, 'PHYSICS EXPLORATION', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, 'The Bed of Nails', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'How can someone lie on sharp nails without pain?', {
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

    this.renderNailBed(r, 350, 300, 1);

    r.text(350, 400, 'The secret lies in how force is distributed...', {
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
    r.text(350, 115, 'The same person stands on one nail vs. 100 nails.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'Where is the pressure on each nail GREATER?', {
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
        ? 'Correct! One nail has to support ALL the weight = HUGE pressure!'
        : 'Think again! One nail must support the entire body weight.',
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
    r.text(350, 30, 'Pressure Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 340, 260, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderNailBed(r, 250, 200, 1.2);

    // Stats panel
    r.rect(440, 50, 210, 260, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    const pressure = this.calculatePressurePerNail();
    const forcePerNail = this.calculateForcePerNail();
    const isDangerous = this.isPressureDangerous();

    r.text(545, 80, 'Pressure Analysis', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });

    r.rect(460, 100, 170, 50, { fill: isDangerous ? '#dc262630' : '#15803d30', rx: 8 });
    r.text(545, 120, 'Pressure per Nail', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(545, 140, `${(pressure / 1000).toFixed(1)} kPa`, {
      fill: isDangerous ? colors.pressureHigh : colors.pressureLow,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(460, 160, 170, 50, { fill: colors.bgCardLight, rx: 8 });
    r.text(545, 180, 'Force per Nail', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(545, 200, `${forcePerNail.toFixed(2)} N`, {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(460, 220, 170, 50, { fill: isDangerous ? '#7f1d1d40' : '#06533940', rx: 8 });
    r.text(545, 240, 'Status', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(545, 260, isDangerous ? 'DANGEROUS!' : 'Safe', {
      fill: isDangerous ? colors.danger : colors.success,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 330, 570, 60, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(365, 355, 'Key Formula: P = F / A', {
      fill: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(365, 375, 'More nails = more area = less pressure per point!', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Pressure', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 290, 150, { fill: '#dc262640', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'The Pressure Equation', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const eqInfo = [
      'P = F / A (Pressure = Force / Area)',
      'Unit: Pascal (Pa) = N/m²',
      'Same force, smaller area = more pressure',
      'Same force, larger area = less pressure',
    ];
    eqInfo.forEach((line, i) => {
      r.text(70, 120 + i * 25, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 150, { fill: '#2563eb40', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Nail Bed Math', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const mathInfo = [
      '100 nails share 700 N (person\'s weight)',
      'Each nail: 7 N force',
      'Tip area: ~3 mm² = 0.000003 m²',
      'Pressure: 2.3 MPa (safe!)',
    ];
    mathInfo.forEach((line, i) => {
      r.text(380, 120 + i * 25, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(50, 240, 600, 80, { fill: '#15803d40', stroke: colors.success, rx: 16 });
    r.text(350, 265, 'The Key Insight', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 290, 'It\'s not the total force that causes damage - it\'s the PRESSURE (force concentrated in a small area).', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Dangerous Twist', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'What if we removed 90% of the nails?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 145, '(Going from 100 nails to just 10)', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'C';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 375, isCorrect
        ? 'Correct! Pressure increases 10x - now it\'s dangerous!'
        : 'Think about P = F/A: less nails means less area...',
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
    r.text(350, 30, 'The Danger Zone', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 540, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderNailBed(r, 350, 200, 1.5);

    const pressure = this.calculatePressurePerNail();
    const isDangerous = this.isPressureDangerous();

    r.rect(80, 350, 540, 60, { fill: isDangerous ? '#7f1d1d30' : '#15803d30', stroke: isDangerous ? colors.danger : colors.success, rx: 12 });
    r.text(350, 375, isDangerous
      ? `DANGER! Pressure: ${(pressure / 1000000).toFixed(2)} MPa - above skin piercing threshold!`
      : `Safe: Pressure ${(pressure / 1000).toFixed(1)} kPa - below damage threshold`,
      {
        fill: isDangerous ? colors.danger : colors.success,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle',
      }
    );
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Critical Threshold', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'When Pressure Becomes Dangerous', {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const explanation = [
      '• Skin can withstand ~1 MPa (1,000,000 Pa) before being pierced',
      '• 100 nails: each gets 7 N over 3 mm² ≈ 2.3 MPa (borderline)',
      '• 10 nails: each gets 70 N over 3 mm² ≈ 23 MPa (OUCH!)',
      '• 1 nail: gets 700 N over 3 mm² ≈ 230 MPa (serious injury)',
      '',
      'This is why the trick requires MANY nails!',
    ];

    explanation.forEach((line, i) => {
      r.text(120, 150 + i * 24, line, { fill: colors.textSecondary, fontSize: 13 });
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

    r.text(350, 200, passed ? 'You\'ve mastered pressure!' : 'Review P = F/A and try again.', {
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

    r.text(350, 130, 'Pressure Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, 'You\'ve mastered the relationship between force, area, and pressure!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'P=F/A', label: 'Pressure Formula' },
      { icon: 'Pa', label: 'Pascal Units' },
      { icon: 'Nails', label: 'Nail Bed Physics' },
      { icon: 'Area', label: 'Contact Area' },
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
        r.addButton({ id: 'next', label: 'Explore Pressure', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. One nail (more concentrated)', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. 100 nails (more force)', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Same pressure both', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Test Your Prediction', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'nail_count', label: 'Number of Nails', value: this.nailCount, min: 1, max: 200 });
        r.addSlider({ id: 'force', label: 'Force (N)', value: this.force, min: 100, max: 1000 });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Discover the Danger', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Stays the same', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Decreases slightly', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Increases 10x', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See the Danger', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({ id: 'nail_count', label: 'Number of Nails', value: this.nailCount, min: 1, max: 100 });
        r.addButton({ id: 'next', label: 'Understand Why', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Knives', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Snowshoes', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Nails', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Buildings', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every((c) => c)) {
          r.addButton({ id: 'next', label: 'Take Knowledge Test', variant: 'success' });
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
      force: this.force,
      nailCount: this.nailCount,
      nailDiameter: this.nailDiameter,
      showForceDistribution: this.showForceDistribution,
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
    this.force = (state.force as number) || 500;
    this.nailCount = (state.nailCount as number) || 100;
    this.nailDiameter = (state.nailDiameter as number) || 2;
    this.showForceDistribution = (state.showForceDistribution as boolean) ?? true;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===

export function createPressureGame(sessionId: string): PressureGame {
  return new PressureGame(sessionId);
}
