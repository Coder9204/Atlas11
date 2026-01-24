/**
 * Rolling Race Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Moment of inertia formulas: I = kMR² (k depends on shape)
 * - Rolling acceleration: a = g×sin(θ)/(1 + I/(MR²))
 * - Energy partition between translation and rotation
 * - Solid vs hollow cylinder physics
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
    question: 'A solid sphere and hollow sphere of same mass and radius roll down a ramp. Which reaches bottom first?',
    options: ['Solid sphere', 'Hollow sphere', 'Same time', 'Depends on mass'],
    correctIndex: 0,
  },
  {
    question: 'The moment of inertia for a solid cylinder is:',
    options: ['I = MR²', 'I = 0.5MR²', 'I = 0.4MR²', 'I = 2MR²'],
    correctIndex: 1,
  },
  {
    question: 'Why does a solid cylinder beat a hollow one down a ramp?',
    options: ['It\'s heavier', 'Less rotational inertia, more translational energy', 'It has less friction', 'It starts faster'],
    correctIndex: 1,
  },
  {
    question: 'A figure skater pulls arms in while spinning. This:',
    options: ['Slows them down', 'Speeds them up', 'Has no effect', 'Stops them'],
    correctIndex: 1,
  },
  {
    question: 'For a solid cylinder, what fraction of energy is translational?',
    options: ['50%', '67%', '75%', '100%'],
    correctIndex: 1,
  },
  {
    question: 'The moment of inertia I measures:',
    options: ['How fast something spins', 'Resistance to changes in rotation', 'Total kinetic energy', 'Angular momentum'],
    correctIndex: 1,
  },
  {
    question: 'Flywheels store energy best with mass at:',
    options: ['The center', 'The rim (edge)', 'Evenly distributed', 'Doesn\'t matter'],
    correctIndex: 1,
  },
  {
    question: 'Racing car wheels are designed to be:',
    options: ['Heavy at the rim', 'Light overall with mass at hub', 'As heavy as possible', 'Solid steel'],
    correctIndex: 1,
  },
  {
    question: 'Angular momentum L = Iω is conserved when:',
    options: ['Speed is constant', 'No external torques act', 'Mass is constant', 'Always'],
    correctIndex: 1,
  },
  {
    question: 'A diver tucks during a somersault to:',
    options: ['Look professional', 'Increase moment of inertia', 'Spin faster by decreasing I', 'Fall slower'],
    correctIndex: 2,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#f97316',
  primaryDark: '#ea580c',
  accent: '#8b5cf6',
  accentDark: '#7c3aed',
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
  solidCylinder: '#f97316',
  hollowCylinder: '#8b5cf6',
  ramp: '#44403c',
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
    title: 'Racing Wheels',
    icon: 'wheel',
    description: 'Light wheels with mass at the hub accelerate faster.',
    details: 'Every gram at the rim is worth ~2 grams at the hub. Carbon fiber wheels save up to 10 lbs.',
  },
  {
    title: 'Flywheels',
    icon: 'flywheel',
    description: 'Energy storage wheels want mass at the edge for maximum I.',
    details: 'Higher I means more energy stored at the same rotation speed.',
  },
  {
    title: 'Figure Skating',
    icon: 'skating',
    description: 'Skaters change spin speed by moving arms in and out.',
    details: 'Arms in = lower I = faster spin. Angular momentum is conserved!',
  },
  {
    title: 'Yo-Yos',
    icon: 'yoyo',
    description: 'Mass at the edges gives stability and long spin times.',
    details: 'High I yo-yos resist orientation changes (gyroscopic stability).',
  },
];

// === MAIN GAME CLASS ===

export class RollingRaceGame extends BaseGame {
  readonly gameType = 'rolling_race';
  readonly gameTitle = 'Rolling Race: Solid vs Hollow';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private rampAngle = 30; // degrees
  private isRacing = false;
  private raceTime = 0;
  private solidPosition = 0;
  private hollowPosition = 0;
  private solidVelocity = 0;
  private hollowVelocity = 0;
  private raceComplete = false;
  private massDistribution = 0.5; // 0 = solid, 1 = hollow (for twist)
  private showEnergyBars = true;

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
    hook: 'A solid cylinder vs a hollow one - same mass, same size. Which wins the race?',
    predict: 'Think about where the mass is located. Does that matter for rolling?',
    play: 'Watch the race! The solid cylinder accelerates faster. But why?',
    review: 'Energy splits between translation and rotation. Less I means more goes to motion!',
    twist_predict: 'What if we could move mass from center to edge?',
    twist_play: 'Adjust mass distribution and see how speed changes!',
    twist_review: 'Mass location matters more than total mass for rotational dynamics!',
    transfer: 'From racing wheels to figure skating - this principle is everywhere!',
    test: 'Time to test your understanding of rotational inertia!',
    mastery: 'Congratulations! You\'ve mastered rotational dynamics!',
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
      message: 'Rolling Race lesson started',
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

    if (id === 'start_race') {
      this.startRace();
      return;
    }
    if (id === 'reset_race') {
      this.resetRace();
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
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'energy') {
      this.showEnergyBars = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'ramp_angle') {
      this.rampAngle = value;
      this.resetRace();
      return;
    }
    if (id === 'mass_distribution') {
      this.massDistribution = value;
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
      this.resetRace();
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
   * PROTECTED: Calculate acceleration for rolling object
   * a = g × sin(θ) / (1 + I/(MR²))
   *
   * For solid cylinder: I = 0.5MR², so denominator = 1.5, a = g×sin(θ)/1.5
   * For hollow cylinder: I = MR², so denominator = 2, a = g×sin(θ)/2
   */
  private calculateAcceleration(momentOfInertiaFactor: number): number {
    const g = 9.8; // m/s² (scaled for visualization)
    const sinTheta = Math.sin(this.rampAngle * Math.PI / 180);
    return (g * sinTheta) / (1 + momentOfInertiaFactor);
  }

  /**
   * PROTECTED: Solid cylinder moment of inertia factor
   * I/(MR²) = 0.5
   */
  private getSolidInertiaFactor(): number {
    return 0.5;
  }

  /**
   * PROTECTED: Hollow cylinder moment of inertia factor
   * I/(MR²) = 1.0
   */
  private getHollowInertiaFactor(): number {
    return 1.0;
  }

  /**
   * PROTECTED: Calculate translational energy fraction
   * KE_trans / KE_total = 1 / (1 + I/(MR²))
   */
  private calculateTranslationalFraction(momentOfInertiaFactor: number): number {
    return 1 / (1 + momentOfInertiaFactor);
  }

  /**
   * PROTECTED: Variable inertia factor for twist phase
   */
  private getVariableInertiaFactor(): number {
    // Ranges from 0.5 (solid) to 1.0 (hollow) based on massDistribution
    return 0.5 + this.massDistribution * 0.5;
  }

  private startRace(): void {
    this.isRacing = true;
    this.raceTime = 0;
    this.solidPosition = 0;
    this.hollowPosition = 0;
    this.solidVelocity = 0;
    this.hollowVelocity = 0;
    this.raceComplete = false;
  }

  private resetRace(): void {
    this.isRacing = false;
    this.raceTime = 0;
    this.solidPosition = 0;
    this.hollowPosition = 0;
    this.solidVelocity = 0;
    this.hollowVelocity = 0;
    this.raceComplete = false;
  }

  update(deltaTime: number): void {
    if (!this.isRacing || this.raceComplete) return;

    const dt = Math.min(deltaTime / 1000, 0.05);
    this.raceTime += dt;

    // Update solid cylinder
    const solidAccel = this.calculateAcceleration(this.getSolidInertiaFactor());
    this.solidVelocity += solidAccel * dt;
    this.solidPosition += this.solidVelocity * dt * 8; // Scale for visualization

    // Update hollow cylinder
    const hollowAccel = this.calculateAcceleration(this.getHollowInertiaFactor());
    this.hollowVelocity += hollowAccel * dt;
    this.hollowPosition += this.hollowVelocity * dt * 8;

    // Check for race completion
    if (this.solidPosition >= 100) {
      this.raceComplete = true;
      this.isRacing = false;
    }
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

  private renderRollingRace(r: CommandRenderer, centerX: number, centerY: number, scale: number = 1): void {
    const rampWidth = 400 * scale;
    const rampHeight = 200 * scale;

    // Ramp
    const angleRad = this.rampAngle * Math.PI / 180;
    const rampEndX = centerX - rampWidth / 2 + rampWidth * Math.cos(angleRad);
    const rampEndY = centerY + rampHeight / 2;
    const rampStartY = rampEndY - rampWidth * Math.sin(angleRad);

    r.line(centerX - rampWidth / 2, rampStartY, rampEndX, rampEndY, {
      stroke: colors.ramp,
      strokeWidth: 8,
    });

    // Ground
    r.line(rampEndX, rampEndY, centerX + rampWidth / 2, rampEndY, {
      stroke: colors.ramp,
      strokeWidth: 8,
    });

    // Calculate cylinder positions along ramp
    const rampProgress = (pos: number) => {
      const x = centerX - rampWidth / 2 + 30 + pos * (rampWidth - 60) * Math.cos(angleRad) / 100;
      const y = rampStartY - 30 + pos * (rampWidth - 60) * Math.sin(angleRad) / 100;
      return { x, y };
    };

    // Solid cylinder (orange)
    const solidPos = rampProgress(this.solidPosition);
    const solidRadius = 25 * scale;
    r.circle(solidPos.x, solidPos.y - solidRadius, solidRadius, {
      fill: colors.solidCylinder,
      stroke: colors.textPrimary,
      strokeWidth: 2,
    });
    // Solid inner mass
    r.circle(solidPos.x, solidPos.y - solidRadius, solidRadius * 0.6, {
      fill: colors.primaryDark,
      opacity: 0.7,
    });
    // Rotation indicator
    const solidRotation = this.solidPosition * 0.1;
    r.line(solidPos.x, solidPos.y - solidRadius,
           solidPos.x + solidRadius * 0.8 * Math.cos(solidRotation),
           solidPos.y - solidRadius + solidRadius * 0.8 * Math.sin(solidRotation),
           { stroke: colors.textPrimary, strokeWidth: 2 });
    r.text(solidPos.x, solidPos.y - solidRadius - solidRadius - 10, 'SOLID', {
      fill: colors.solidCylinder,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Hollow cylinder (purple) - offset vertically for clarity
    const hollowPos = rampProgress(this.hollowPosition);
    hollowPos.y += 50 * scale;
    const hollowRadius = 25 * scale;
    r.circle(hollowPos.x, hollowPos.y - hollowRadius, hollowRadius, {
      fill: 'none',
      stroke: colors.hollowCylinder,
      strokeWidth: 6,
    });
    r.circle(hollowPos.x, hollowPos.y - hollowRadius, hollowRadius * 0.7, {
      fill: colors.bgDark,
    });
    // Rotation indicator
    const hollowRotation = this.hollowPosition * 0.1;
    r.line(hollowPos.x, hollowPos.y - hollowRadius,
           hollowPos.x + hollowRadius * 0.8 * Math.cos(hollowRotation),
           hollowPos.y - hollowRadius + hollowRadius * 0.8 * Math.sin(hollowRotation),
           { stroke: colors.textPrimary, strokeWidth: 2 });
    r.text(hollowPos.x, hollowPos.y + 10, 'HOLLOW', {
      fill: colors.hollowCylinder,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Energy bars
    if (this.showEnergyBars) {
      const barWidth = 100 * scale;
      const barHeight = 15 * scale;

      // Solid energy split
      const solidTransFrac = this.calculateTranslationalFraction(this.getSolidInertiaFactor());
      r.rect(centerX - rampWidth / 2, centerY + rampHeight / 2 + 30, barWidth, barHeight, {
        fill: colors.bgCardLight,
        rx: 3,
      });
      r.rect(centerX - rampWidth / 2, centerY + rampHeight / 2 + 30, barWidth * solidTransFrac, barHeight, {
        fill: colors.solidCylinder,
        rx: 3,
      });
      r.text(centerX - rampWidth / 2 + barWidth + 10, centerY + rampHeight / 2 + 42, `Solid: ${Math.round(solidTransFrac * 100)}% motion`, {
        fill: colors.solidCylinder,
        fontSize: 10,
      });

      // Hollow energy split
      const hollowTransFrac = this.calculateTranslationalFraction(this.getHollowInertiaFactor());
      r.rect(centerX - rampWidth / 2, centerY + rampHeight / 2 + 55, barWidth, barHeight, {
        fill: colors.bgCardLight,
        rx: 3,
      });
      r.rect(centerX - rampWidth / 2, centerY + rampHeight / 2 + 55, barWidth * hollowTransFrac, barHeight, {
        fill: colors.hollowCylinder,
        rx: 3,
      });
      r.text(centerX - rampWidth / 2 + barWidth + 10, centerY + rampHeight / 2 + 67, `Hollow: ${Math.round(hollowTransFrac * 100)}% motion`, {
        fill: colors.hollowCylinder,
        fontSize: 10,
      });
    }

    // Winner indicator
    if (this.raceComplete) {
      r.rect(centerX - 80, centerY - rampHeight / 2 - 40, 160, 35, {
        fill: colors.success,
        rx: 17,
      });
      r.text(centerX, centerY - rampHeight / 2 - 18, 'SOLID WINS!', {
        fill: colors.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
        textAnchor: 'middle',
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

    r.text(350, 100, 'Which Wins the Race?', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'Same mass, same size - different mass distribution', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.rect(100, 160, 500, 220, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 20,
      opacity: 0.8,
    });

    this.renderRollingRace(r, 350, 280, 0.9);

    r.text(350, 400, 'Solid metal vs hollow pipe - which rolls faster?', {
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
    r.text(350, 115, 'Both cylinders have the same mass and radius.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'Which reaches the bottom first?', {
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
        ? 'Correct! The solid cylinder wins because more energy goes to motion!'
        : 'Surprising! The solid one wins - less energy "wasted" on spinning.',
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
    r.text(350, 30, 'Rolling Race Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 540, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderRollingRace(r, 350, 190, 1.1);

    r.rect(80, 350, 540, 60, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(365, 375, 'Energy splits between translation and rotation. Lower I = more motion!', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(365, 395, `Solid I = 0.5MR² | Hollow I = MR²`, {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Why Solid Wins', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 290, 150, { fill: '#f9731640', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'Energy Split', { fill: colors.primary, fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });
    const energyInfo = [
      'Total KE = Translation + Rotation',
      'KE_trans = ½mv²',
      'KE_rot = ½Iω²',
      'Lower I → more translational KE',
    ];
    energyInfo.forEach((line, i) => {
      r.text(70, 120 + i * 25, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 150, { fill: '#8b5cf640', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Moment of Inertia', { fill: colors.accent, fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });
    const inertiaInfo = [
      'I = Σmr² (sum of mass × distance²)',
      'Solid cylinder: I = 0.5MR²',
      'Hollow cylinder: I = MR²',
      'Mass at edge → higher I',
    ];
    inertiaInfo.forEach((line, i) => {
      r.text(380, 120 + i * 25, '• ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(50, 240, 600, 80, { fill: '#22c55e40', stroke: colors.success, rx: 16 });
    r.text(350, 265, 'The Key Insight', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 290, 'It\'s not about total mass - it\'s about WHERE the mass is located!', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Mass Distribution Twist', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'What if you could move mass from center to edge?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 145, 'Moving mass toward the edge would...', {
      fill: colors.textPrimary,
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
        ? 'Correct! More edge mass = higher I = slower rolling!'
        : 'Mass at the edge increases I, making it roll slower.',
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
    r.text(350, 30, 'Mass Distribution Lab', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 540, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    // Adjustable wheel visualization
    const centerX = 350;
    const centerY = 180;
    const radius = 60;

    // Wheel with adjustable mass
    r.circle(centerX, centerY, radius, {
      stroke: colors.accent,
      strokeWidth: 8 + this.massDistribution * 20,
      fill: 'none',
    });
    r.circle(centerX, centerY, radius * (1 - this.massDistribution * 0.6), {
      fill: colors.accent,
      opacity: 1 - this.massDistribution * 0.7,
    });
    r.circle(centerX, centerY, 10, { fill: colors.textPrimary });

    // Labels
    r.text(centerX, centerY + radius + 30, 'Mass Distribution', {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const inertiaFactor = this.getVariableInertiaFactor();
    const transFrac = this.calculateTranslationalFraction(inertiaFactor);

    r.rect(80, 350, 540, 60, { fill: '#eab30830', stroke: colors.warning, rx: 12 });
    r.text(350, 370, `I factor: ${inertiaFactor.toFixed(2)} | Translation: ${Math.round(transFrac * 100)}%`, {
      fill: colors.warning,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 390, 'More edge mass → higher I → slower roll!', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Mass Distribution Is Everything', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'I = Σmr² - The Distance Squared Matters!', {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const explanation = [
      '• Mass at 2x distance contributes 4x to moment of inertia',
      '• Engineers choose mass distribution for specific goals:',
      '  - Fast acceleration: mass at center (low I)',
      '  - Energy storage: mass at rim (high I)',
      '  - Gyroscopic stability: mass at rim (high I)',
    ];

    explanation.forEach((line, i) => {
      r.text(120, 150 + i * 28, line, { fill: colors.textSecondary, fontSize: 12 });
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
      fontSize: 14,
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

    r.text(350, 200, passed ? 'You\'ve mastered rotational inertia!' : 'Review the concepts and try again.', {
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

    r.text(350, 130, 'Rotation Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, 'You\'ve mastered rotational inertia and dynamics!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'I=mr²', label: 'Moment of Inertia' },
      { icon: 'L=Iω', label: 'Angular Momentum' },
      { icon: '67%', label: 'Energy Split' },
      { icon: 'Σmr²', label: 'Mass Distribution' },
    ];

    badges.forEach((badge, i) => {
      const x = 180 + (i % 2) * 170;
      const y = 200 + Math.floor(i / 2) * 80;
      r.rect(x, y, 150, 60, { fill: colors.bgCardLight, rx: 12 });
      r.text(x + 75, y + 25, badge.icon, { fill: colors.primary, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x + 75, y + 45, badge.label, { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
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
        r.addButton({ id: 'next', label: 'Make a Prediction', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Solid wins', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Hollow wins', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. They tie', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Run the Race', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'ramp_angle', label: 'Ramp Angle', value: this.rampAngle, min: 10, max: 60 });
        r.addToggle({ id: 'energy', label: 'Energy', value: this.showEnergyBars, onLabel: 'ON', offLabel: 'OFF' });
        if (!this.isRacing && !this.raceComplete) {
          r.addButton({ id: 'start_race', label: 'Start Race', variant: 'success' });
        } else if (this.raceComplete) {
          r.addButton({ id: 'reset_race', label: 'Race Again', variant: 'secondary' });
        }
        r.addButton({ id: 'next', label: 'Understand Why', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'The Twist', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Make it faster', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Make it slower', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. No change', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Experiment', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({ id: 'mass_distribution', label: 'Mass: Center→Edge', value: this.massDistribution, min: 0, max: 1, step: 0.05 });
        r.addButton({ id: 'next', label: 'Deep Insight', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Wheels', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Flywheels', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Skating', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Yo-Yos', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
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
      rampAngle: this.rampAngle,
      massDistribution: this.massDistribution,
      showEnergyBars: this.showEnergyBars,
      isRacing: this.isRacing,
      raceComplete: this.raceComplete,
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
    this.rampAngle = (state.rampAngle as number) || 30;
    this.massDistribution = (state.massDistribution as number) || 0.5;
    this.showEnergyBars = (state.showEnergyBars as boolean) ?? true;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
    this.resetRace();
  }
}

// === FACTORY FUNCTION ===

export function createRollingRaceGame(sessionId: string): RollingRaceGame {
  return new RollingRaceGame(sessionId);
}
