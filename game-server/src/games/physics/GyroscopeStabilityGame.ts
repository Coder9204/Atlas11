/**
 * Gyroscope Stability Game - Server-Side Implementation
 *
 * Physics: L = Iω (angular momentum = moment of inertia × angular velocity)
 * Conservation of angular momentum creates stability
 * Torque causes precession: τ = dL/dt
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion {
  question: string;
  options: string[];
  correct: number;
}

interface TransferApp {
  icon: string;
  title: string;
  short: string;
  description: string;
  color: string;
}

const testQuestions: TestQuestion[] = [
  {
    question: 'What is angular momentum?',
    options: ['Linear speed', 'L = Iω (rotational momentum)', 'Force to start spinning', 'Stored energy'],
    correct: 1
  },
  {
    question: 'Why does a spinning wheel resist tilting?',
    options: ['Becomes heavier', 'Air resistance', 'Angular momentum conservation', 'More friction'],
    correct: 2
  },
  {
    question: "What happens as a spinning top slows?",
    options: ['More stable', 'Same stability', 'Less stable, falls', 'Speeds up'],
    correct: 2
  },
  {
    question: 'How do bicycles stay upright when moving?',
    options: ['Rider balance only', 'Gyroscopic effect from wheels', 'Auto-correcting bars', 'Hidden stabilizers'],
    correct: 1
  },
  {
    question: 'What is the relationship between spin and stability?',
    options: ['Faster = less stable', 'No relationship', 'Faster = more stable', 'Only mass matters'],
    correct: 2
  },
  {
    question: 'How do spacecraft control orientation without rockets?',
    options: ["Can't - rockets needed", 'Reaction wheels & gyroscopes', 'Solar wind', 'Magnetic fields'],
    correct: 1
  },
  {
    question: 'Why does a gyroscope "defy gravity"?',
    options: ['Cancels gravity', 'Angular momentum prevents falling', 'Anti-gravity field', 'Air pressure'],
    correct: 1
  },
  {
    question: 'What is moment of inertia?',
    options: ['When it stops', 'Mass distribution relative to axis', 'Time to start', 'Force for rotation'],
    correct: 1
  },
  {
    question: 'Why are flywheels used in engines?',
    options: ['Make lighter', 'Store energy, smooth power', 'More friction', 'Reduce fuel'],
    correct: 1
  },
  {
    question: 'What happens when you rotate a spinning gyroscope?',
    options: ['Rotates easily', 'Precesses perpendicular to force', 'Stops spinning', 'Spins faster'],
    correct: 1
  }
];

const transferApps: TransferApp[] = [
  {
    icon: "bike",
    title: "Bicycle Stability",
    short: "Bicycles",
    description: "Spinning wheels create angular momentum that resists tipping, helping bikes stay upright.",
    color: "#22c55e"
  },
  {
    icon: "satellite",
    title: "Spacecraft Attitude Control",
    short: "Spacecraft",
    description: "Satellites use reaction wheels to change orientation without propellant. Hubble has 4 wheels.",
    color: "#3b82f6"
  },
  {
    icon: "camera",
    title: "Camera Gimbals",
    short: "Gimbals",
    description: "Steadicams use gyroscopic stabilization for smooth video during movement.",
    color: "#f59e0b"
  },
  {
    icon: "ship",
    title: "Ship Stabilizers",
    short: "Ships",
    description: "Cruise ships use massive gyroscopes to reduce rolling by up to 80% in rough seas.",
    color: "#a855f7"
  }
];

export class GyroscopeStabilityGame extends BaseGame {
  readonly gameType = 'gyroscope_stability';
  readonly gameTitle = 'Gyroscope Stability';

  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private selectedApp = 0;
  private testIndex = 0;
  private testScore = 0;
  private testAnswers: (number | null)[] = new Array(10).fill(null);
  private showExplanation = false;

  // Simulation state
  private spinRate = 50;
  private isSpinning = false;
  private animPhase = 0;

  constructor(sessionId: string) {
    super(sessionId);
  }

  initialize(config: SessionConfig): void {
    super.initialize(config);
    if (config.resumePhase) {
      this.phase = config.resumePhase as GamePhase;
    }
  }

  handleInput(input: UserInput): void {
    if (input.type === 'button_click') {
      this.handleButtonClick(input.id);
    } else if (input.type === 'slider_change') {
      this.handleSliderChange(input.id, input.value ?? 0);
    }
  }

  private handleButtonClick(id: string): void {
    // Navigation
    if (id === 'nav_predict') {
      this.phase = 'predict';
      this.emitCoachEvent('phase_started', { phase: 'predict' });
    } else if (id === 'nav_play') {
      this.phase = 'play';
    } else if (id === 'nav_review') {
      this.phase = 'review';
    } else if (id === 'nav_twist_predict') {
      this.phase = 'twist_predict';
    } else if (id === 'nav_twist_play') {
      this.phase = 'twist_play';
    } else if (id === 'nav_twist_review') {
      this.phase = 'twist_review';
    } else if (id === 'nav_transfer') {
      this.phase = 'transfer';
    } else if (id === 'nav_test') {
      this.phase = 'test';
    } else if (id === 'nav_mastery') {
      this.phase = 'mastery';
    }

    // Predictions
    else if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
    } else if (id.startsWith('twist_predict_')) {
      this.twistPrediction = id.replace('twist_predict_', '');
    }

    // Simulation
    else if (id === 'toggle_spin') {
      this.isSpinning = !this.isSpinning;
    }

    // Transfer apps
    else if (id.startsWith('app_')) {
      this.selectedApp = parseInt(id.replace('app_', ''));
    }

    // Test answers
    else if (id.startsWith('answer_')) {
      const answerIndex = parseInt(id.replace('answer_', ''));
      this.handleTestAnswer(answerIndex);
    } else if (id === 'next_question') {
      if (this.testIndex < testQuestions.length - 1) {
        this.testIndex++;
        this.showExplanation = false;
      } else {
        this.phase = 'mastery';
      }
    } else if (id === 'retry_test') {
      this.testIndex = 0;
      this.testScore = 0;
      this.testAnswers = new Array(10).fill(null);
      this.showExplanation = false;
      this.phase = 'test';
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'spin_rate') {
      this.spinRate = value;
    }
  }

  private handleTestAnswer(optionIndex: number): void {
    if (this.testAnswers[this.testIndex] !== null) return;

    this.testAnswers[this.testIndex] = optionIndex;
    const isCorrect = testQuestions[this.testIndex].correct === optionIndex;

    if (isCorrect) {
      this.testScore++;
    }

    this.showExplanation = true;
    this.emitCoachEvent('test_answer_submitted', {
      questionIndex: this.testIndex,
      correct: isCorrect,
      score: this.testScore
    });
  }

  update(_deltaTime: number): void {
    // Animate
    if (this.isSpinning) {
      this.animPhase = (this.animPhase + this.spinRate / 10) % 360;
    }
  }

  getCurrentPhase(): string {
    return this.phase;
  }

  render(): GameFrame {
    const r = new CommandRenderer(700, 350);

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

    r.setProgress({ id: 'phase', current: this.getPhaseIndex() + 1, total: 10 });

    return r.toFrame(this.nextFrame());
  }

  private getPhaseIndex(): number {
    const phases: GamePhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    return phases.indexOf(this.phase);
  }

  private renderHook(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 35, 'THE SPINNING WHEEL MYSTERY', {
      fill: '#22c55e',
      fontSize: 26,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 60, 'Why do spinning objects resist being tilted?', {
      fill: '#94a3b8',
      fontSize: 14,
      textAnchor: 'middle'
    });

    // Gyroscope illustration
    r.circle(350, 160, 60, { fill: 'none', stroke: '#64748b', strokeWidth: 4 });
    r.line(290, 160, 410, 160, { stroke: '#475569', strokeWidth: 3 }); // Axle

    // Spokes
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 + this.animPhase) * Math.PI / 180;
      r.line(
        350, 160,
        350 + Math.cos(angle) * 55, 160 + Math.sin(angle) * 55,
        { stroke: '#475569', strokeWidth: 2 }
      );
    }

    r.circle(350, 160, 8, { fill: '#334155' }); // Hub

    // Angular momentum arrow
    r.line(350, 160, 350, 90, { stroke: '#22c55e', strokeWidth: 3 });
    r.text(365, 85, 'L', { fill: '#22c55e', fontSize: 16, fontWeight: 'bold' });

    r.text(350, 260, 'Hold a spinning bicycle wheel by its axle.', {
      fill: '#e2e8f0',
      fontSize: 13,
      textAnchor: 'middle'
    });
    r.text(350, 280, "When it's spinning fast, it resists tilting!", {
      fill: '#22c55e',
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(350, 305, 'What invisible force creates this stability?', {
      fill: '#94a3b8',
      fontSize: 12,
      textAnchor: 'middle'
    });

    r.addButton({ id: 'nav_predict', label: 'Find Out Why', variant: 'primary' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 30, 'MAKE YOUR PREDICTION', {
      fill: '#ffffff',
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 55, 'You hold a spinning bicycle wheel and try to tilt it.', {
      fill: '#e2e8f0',
      fontSize: 13,
      textAnchor: 'middle'
    });
    r.text(350, 75, 'What happens?', {
      fill: '#22c55e',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const options = [
      { id: 'easy', text: 'Tilts easily, like when not spinning' },
      { id: 'resists', text: 'Resists tilting and pushes back' },
      { id: 'faster', text: 'Spins faster when tilted' },
      { id: 'stops', text: 'Immediately stops spinning' }
    ];

    options.forEach((opt, i) => {
      const y = 100 + i * 45;
      const isSelected = this.prediction === opt.id;
      const isCorrect = opt.id === 'resists';

      let bgColor = '#1e293b';
      if (this.prediction) {
        if (isCorrect) bgColor = '#052e16';
        else if (isSelected) bgColor = '#450a0a';
      } else if (isSelected) {
        bgColor = '#14532d';
      }

      r.rect(100, y, 500, 38, {
        fill: bgColor,
        rx: 8,
        stroke: isSelected ? '#22c55e' : '#334155',
        strokeWidth: 2
      });

      r.text(350, y + 24, opt.text, {
        fill: '#e2e8f0',
        fontSize: 12,
        textAnchor: 'middle'
      });

      r.addButton({ id: `predict_${opt.id}`, label: opt.id, variant: 'secondary' });
    });

    if (this.prediction) {
      r.addButton({ id: 'nav_play', label: 'Test Your Prediction', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 25, 'SPINNING WHEEL EXPERIMENT', {
      fill: '#ffffff',
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Wheel visualization
    const tiltAngle = this.isSpinning ? 10 : 45;
    const stabilityFactor = this.isSpinning ? this.spinRate / 10 : 0;

    r.rect(100, 50, 350, 200, { fill: '#1e293b', rx: 10 });

    // Draw tilted wheel
    const wheelCenterX = 275;
    const wheelCenterY = 150;
    const wheelRadius = 50;

    // Axle
    r.line(wheelCenterX - 60, wheelCenterY + tiltAngle, wheelCenterX + 60, wheelCenterY - tiltAngle,
      { stroke: '#64748b', strokeWidth: 4 });

    // Wheel
    r.circle(wheelCenterX, wheelCenterY, wheelRadius, { fill: 'none', stroke: '#64748b', strokeWidth: 4 });

    // Spokes
    for (let i = 0; i < 8; i++) {
      const angle = (i * 45 + this.animPhase) * Math.PI / 180;
      r.line(
        wheelCenterX, wheelCenterY,
        wheelCenterX + Math.cos(angle) * (wheelRadius - 5),
        wheelCenterY + Math.sin(angle) * (wheelRadius - 5),
        { stroke: '#475569', strokeWidth: 2 }
      );
    }

    r.circle(wheelCenterX, wheelCenterY, 6, { fill: '#334155' });

    // Angular momentum vector (when spinning)
    if (this.isSpinning) {
      r.line(wheelCenterX, wheelCenterY, wheelCenterX, wheelCenterY - 30 - stabilityFactor,
        { stroke: '#22c55e', strokeWidth: 3 });
      r.text(wheelCenterX + 15, wheelCenterY - 35 - stabilityFactor / 2, 'L', {
        fill: '#22c55e',
        fontSize: 14,
        fontWeight: 'bold'
      });
    }

    // Stability meter
    r.rect(480, 60, 180, 80, { fill: '#1e293b', rx: 8 });
    r.text(570, 80, 'Tilt Resistance', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.rect(500, 95, 140, 20, { fill: '#374151', rx: 4 });
    const resistanceWidth = this.isSpinning ? 130 * (this.spinRate / 100) : 10;
    r.rect(505, 100, resistanceWidth, 10, {
      fill: this.isSpinning ? '#22c55e' : '#ef4444',
      rx: 3
    });

    r.text(570, 130, this.isSpinning ? 'HIGH' : 'LOW', {
      fill: this.isSpinning ? '#22c55e' : '#ef4444',
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Status
    r.rect(480, 150, 180, 40, { fill: '#1e293b', rx: 8 });
    r.text(570, 175, this.isSpinning ? `Spinning: ${this.spinRate}%` : 'Not Spinning', {
      fill: this.isSpinning ? '#22c55e' : '#94a3b8',
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Key insight
    r.rect(100, 260, 560, 45, { fill: '#052e16', rx: 8 });
    r.text(380, 287, this.isSpinning
      ? 'Angular momentum L = Iω points along the axis and resists changes!'
      : 'Try spinning the wheel to see how it resists tilting.', {
      fill: '#22c55e',
      fontSize: 11,
      textAnchor: 'middle'
    });

    // Controls
    r.addButton({
      id: 'toggle_spin',
      label: this.isSpinning ? 'Stop Wheel' : 'Spin Wheel',
      variant: this.isSpinning ? 'secondary' : 'primary'
    });

    if (this.isSpinning) {
      r.addSlider({
        id: 'spin_rate',
        label: `Spin Rate: ${this.spinRate}%`,
        value: this.spinRate,
        min: 10,
        max: 100,
        step: 5
      });
    }

    r.addButton({ id: 'nav_review', label: 'Understand Why', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 28, 'THE SCIENCE OF GYROSCOPIC STABILITY', {
      fill: '#22c55e',
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const correct = this.prediction === 'resists';
    r.text(350, 52, correct
      ? 'Excellent prediction! The wheel does resist tilting.'
      : 'Answer: It resists tilting and pushes back unexpectedly!', {
      fill: correct ? '#22c55e' : '#f59e0b',
      fontSize: 12,
      textAnchor: 'middle'
    });

    // Key concepts
    r.rect(50, 70, 290, 80, { fill: '#1e3a5f', rx: 8 });
    r.text(195, 95, 'Angular Momentum', { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(195, 118, 'L = Iω', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(195, 140, 'moment of inertia × angular velocity', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.rect(360, 70, 290, 80, { fill: '#052e16', rx: 8 });
    r.text(505, 95, 'Conservation Law', { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(505, 118, 'L is conserved', { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(505, 140, 'Changing direction requires torque', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Why faster = more stable
    r.rect(50, 165, 600, 55, { fill: '#3d1f0d', rx: 8 });
    r.text(350, 185, 'WHY FASTER = MORE STABLE', { fill: '#f59e0b', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 207, 'Higher ω → larger L → more torque needed to change direction', {
      fill: '#e2e8f0',
      fontSize: 11,
      textAnchor: 'middle'
    });

    // Summary
    r.rect(50, 235, 600, 45, { fill: '#1e293b', rx: 8 });
    r.text(350, 260, 'Fast-spinning tops stay upright. Slow ones wobble and fall.', {
      fill: '#e2e8f0',
      fontSize: 11,
      textAnchor: 'middle'
    });

    r.addButton({ id: 'nav_twist_predict', label: 'Explore the Twist: Precession', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 30, 'THE TWIST: PRECESSION', {
      fill: '#14b8a6',
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 60, 'You apply a constant sideways force to a spinning gyroscope.', {
      fill: '#e2e8f0',
      fontSize: 13,
      textAnchor: 'middle'
    });
    r.text(350, 80, 'What happens?', {
      fill: '#14b8a6',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const options = [
      { id: 'falls', text: 'Falls in direction of force' },
      { id: 'precesses', text: 'Rotates perpendicular to force (precession)' },
      { id: 'nothing', text: 'Nothing - completely resists' },
      { id: 'faster', text: 'Spins faster around original axis' }
    ];

    options.forEach((opt, i) => {
      const y = 105 + i * 45;
      const isSelected = this.twistPrediction === opt.id;
      const isCorrect = opt.id === 'precesses';

      let bgColor = '#1e293b';
      if (this.twistPrediction) {
        if (isCorrect) bgColor = '#052e16';
        else if (isSelected) bgColor = '#450a0a';
      } else if (isSelected) {
        bgColor = '#134e4a';
      }

      r.rect(100, y, 500, 38, {
        fill: bgColor,
        rx: 8,
        stroke: isSelected ? '#14b8a6' : '#334155',
        strokeWidth: 2
      });

      r.text(350, y + 24, opt.text, {
        fill: '#e2e8f0',
        fontSize: 12,
        textAnchor: 'middle'
      });

      r.addButton({ id: `twist_predict_${opt.id}`, label: opt.id, variant: 'secondary' });
    });

    if (this.twistPrediction) {
      r.addButton({ id: 'nav_twist_play', label: 'See What Happens', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 25, 'GYROSCOPIC PRECESSION', {
      fill: '#14b8a6',
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Precession visualization
    const precessionAngle = this.animPhase * 0.5;

    r.rect(100, 45, 350, 200, { fill: '#1e293b', rx: 10 });

    // Pivot point
    r.circle(275, 200, 5, { fill: '#64748b' });

    // Gyroscope arm
    const armEndX = 275 + 70 * Math.cos(precessionAngle * Math.PI / 180);
    const armEndY = 200 - 60;
    r.line(275, 200, armEndX, armEndY, { stroke: '#64748b', strokeWidth: 3 });

    // Spinning disk
    r.ellipse(armEndX, armEndY, 25, 10, { fill: '#22c55e', opacity: 0.8 });
    r.ellipse(armEndX, armEndY, 25, 10, { fill: 'none', stroke: '#16a34a', strokeWidth: 2 });

    // L vector
    r.line(armEndX, armEndY, armEndX, armEndY - 35, { stroke: '#fbbf24', strokeWidth: 2 });
    r.text(armEndX + 12, armEndY - 30, 'L', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold' });

    // Precession path (dashed ellipse)
    r.ellipse(275, 200, 80, 30, { fill: 'none', stroke: '#fbbf24', strokeWidth: 1, opacity: 0.5 });

    // Gravity arrow
    r.line(430, 100, 430, 150, { stroke: '#ef4444', strokeWidth: 2 });
    r.text(445, 130, 'Gravity', { fill: '#ef4444', fontSize: 10 });

    // Explanation
    r.rect(480, 50, 180, 100, { fill: '#134e4a', rx: 8 });
    r.text(570, 72, 'Why Precession?', { fill: '#14b8a6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(570, 95, 'τ = dL/dt', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(570, 115, 'Torque changes L', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(570, 135, 'perpendicular to both!', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Result
    r.rect(100, 260, 560, 45, { fill: '#0f766e', rx: 8 });
    r.text(380, 287, 'Instead of falling, it precesses - rotating around the vertical axis!', {
      fill: '#5eead4',
      fontSize: 12,
      textAnchor: 'middle'
    });

    r.addButton({ id: 'nav_twist_review', label: 'Learn More', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 28, 'UNDERSTANDING PRECESSION', {
      fill: '#14b8a6',
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const correct = this.twistPrediction === 'precesses';
    r.text(350, 52, correct
      ? 'Exactly right! It precesses perpendicular to the force.'
      : 'Answer: It precesses - rotating perpendicular to the applied force!', {
      fill: correct ? '#22c55e' : '#f59e0b',
      fontSize: 12,
      textAnchor: 'middle'
    });

    // Key concepts
    r.rect(50, 70, 290, 75, { fill: '#134e4a', rx: 8 });
    r.text(195, 95, 'Torque Changes L', { fill: '#14b8a6', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(195, 118, 'τ = dL/dt', { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(195, 138, 'Change is perpendicular to both', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.rect(360, 70, 290, 75, { fill: '#3d1f0d', rx: 8 });
    r.text(505, 95, 'Precession Rate', { fill: '#f59e0b', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(505, 118, 'Ω = τ/L = mgr/(Iω)', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(505, 138, 'Faster spin → slower precession', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Key insight
    r.rect(50, 160, 600, 55, { fill: '#1e293b', rx: 8 });
    r.text(350, 182, "Fast-spinning tops barely precess. Slow ones wobble wildly!", {
      fill: '#e2e8f0',
      fontSize: 12,
      textAnchor: 'middle'
    });
    r.text(350, 202, 'This is why gyroscopes are used for navigation and stabilization.', {
      fill: '#94a3b8',
      fontSize: 10,
      textAnchor: 'middle'
    });

    r.addButton({ id: 'nav_transfer', label: 'See Real Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 25, 'GYROSCOPES IN THE REAL WORLD', {
      fill: '#ffffff',
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // App tabs
    transferApps.forEach((app, i) => {
      const x = 100 + i * 130;
      const isSelected = this.selectedApp === i;

      r.rect(x - 55, 45, 110, 28, {
        fill: isSelected ? app.color : '#1e293b',
        rx: 14
      });
      r.text(x, 63, app.short, {
        fill: '#ffffff',
        fontSize: 10,
        fontWeight: isSelected ? 'bold' : 'normal',
        textAnchor: 'middle'
      });

      r.addButton({ id: `app_${i}`, label: app.short, variant: 'secondary' });
    });

    const app = transferApps[this.selectedApp];

    // App content
    r.rect(50, 85, 600, 175, { fill: '#1e293b', rx: 10 });

    r.text(350, 115, app.title, {
      fill: app.color,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Description (split into lines)
    const words = app.description.split(' ');
    let line1 = '';
    let line2 = '';
    words.forEach(word => {
      if (line1.length < 60) line1 += word + ' ';
      else line2 += word + ' ';
    });

    r.text(350, 150, line1.trim(), {
      fill: '#e2e8f0',
      fontSize: 12,
      textAnchor: 'middle'
    });
    if (line2) {
      r.text(350, 170, line2.trim(), {
        fill: '#e2e8f0',
        fontSize: 12,
        textAnchor: 'middle'
      });
    }

    // Physics connection
    r.rect(80, 195, 540, 50, { fill: '#374151', rx: 6 });
    r.text(350, 215, 'Physics Connection:', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(350, 235, 'Angular momentum conservation provides stability and control.', {
      fill: app.color,
      fontSize: 11,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.addButton({ id: 'nav_test', label: 'Test Your Knowledge', variant: 'primary' });
  }

  private renderTest(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    const question = testQuestions[this.testIndex];
    const answered = this.testAnswers[this.testIndex] !== null;

    // Header
    r.text(100, 20, 'KNOWLEDGE CHECK', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold' });
    r.text(600, 20, `${this.testIndex + 1}/${testQuestions.length}`, {
      fill: '#94a3b8',
      fontSize: 12,
      textAnchor: 'end'
    });

    // Progress bar
    r.rect(50, 35, 600, 6, { fill: '#374151', rx: 3 });
    r.rect(50, 35, 600 * ((this.testIndex + (answered ? 1 : 0)) / testQuestions.length), 6, {
      fill: '#22c55e',
      rx: 3
    });

    // Question
    r.text(350, 75, question.question, {
      fill: '#ffffff',
      fontSize: 15,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Options
    question.options.forEach((opt, i) => {
      const y = 100 + i * 45;
      const isSelected = this.testAnswers[this.testIndex] === i;
      const isCorrect = question.correct === i;

      let bgColor = '#1e293b';
      let borderColor = '#334155';

      if (answered) {
        if (isCorrect) {
          bgColor = '#052e16';
          borderColor = '#22c55e';
        } else if (isSelected) {
          bgColor = '#450a0a';
          borderColor = '#ef4444';
        }
      }

      r.rect(80, y, 540, 38, { fill: bgColor, rx: 6, stroke: borderColor, strokeWidth: 2 });

      const letter = String.fromCharCode(65 + i);
      r.circle(105, y + 19, 12, {
        fill: answered && isCorrect ? '#22c55e' : answered && isSelected ? '#ef4444' : '#374151'
      });
      r.text(105, y + 19, answered ? (isCorrect ? '✓' : isSelected ? '✗' : letter) : letter, {
        fill: '#ffffff',
        fontSize: 11,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });

      r.text(130, y + 19, opt, {
        fill: '#e2e8f0',
        fontSize: 11
      });

      if (!answered) {
        r.addButton({ id: `answer_${i}`, label: letter, variant: 'secondary' });
      }
    });

    if (this.showExplanation) {
      r.addButton({
        id: 'next_question',
        label: this.testIndex < testQuestions.length - 1 ? 'Next Question' : 'See Results',
        variant: 'primary'
      });
    }

    // Score
    r.text(350, 335, `Score: ${this.testScore}/${this.testIndex + (answered ? 1 : 0)}`, {
      fill: '#64748b',
      fontSize: 11,
      textAnchor: 'middle'
    });
  }

  private renderMastery(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    const percentage = Math.round((this.testScore / testQuestions.length) * 100);
    const passed = percentage >= 70;

    r.text(350, 40, passed ? 'GYROSCOPE MASTER!' : 'KEEP LEARNING!', {
      fill: passed ? '#22c55e' : '#f59e0b',
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Score
    r.rect(250, 60, 200, 50, { fill: '#1e293b', rx: 10 });
    r.text(350, 90, `${this.testScore}/${testQuestions.length} (${percentage}%)`, {
      fill: '#ffffff',
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Key takeaways
    r.rect(50, 125, 600, 130, { fill: '#1e293b', rx: 10 });
    r.text(350, 150, 'KEY TAKEAWAYS', { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const takeaways = [
      '• Angular momentum L = Iω resists changes in direction',
      '• Faster spin = larger L = more stability',
      '• Torque causes precession, not simple falling',
      '• Used in bikes, spacecraft, cameras, and ships!'
    ];

    takeaways.forEach((item, i) => {
      r.text(100, 175 + i * 20, item, { fill: '#e2e8f0', fontSize: 11 });
    });

    // Formula box
    r.rect(200, 265, 300, 45, { fill: '#134e4a', rx: 8 });
    r.text(350, 285, 'L = Iω    |    τ = dL/dt', {
      fill: '#5eead4',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(350, 305, 'Angular momentum | Precession', {
      fill: '#94a3b8',
      fontSize: 9,
      textAnchor: 'middle'
    });

    if (!passed) {
      r.addButton({ id: 'retry_test', label: 'Try Again', variant: 'primary' });
    }
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      selectedApp: this.selectedApp,
      testIndex: this.testIndex,
      testScore: this.testScore,
      testAnswers: this.testAnswers,
      showExplanation: this.showExplanation,
      spinRate: this.spinRate,
      isSpinning: this.isSpinning,
      animPhase: this.animPhase
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.prediction !== undefined) this.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.selectedApp !== undefined) this.selectedApp = state.selectedApp as number;
    if (state.testIndex !== undefined) this.testIndex = state.testIndex as number;
    if (state.testScore !== undefined) this.testScore = state.testScore as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as (number | null)[];
    if (state.showExplanation !== undefined) this.showExplanation = state.showExplanation as boolean;
    if (state.spinRate !== undefined) this.spinRate = state.spinRate as number;
    if (state.isSpinning !== undefined) this.isSpinning = state.isSpinning as boolean;
    if (state.animPhase !== undefined) this.animPhase = state.animPhase as number;
  }
}

export function createGyroscopeStabilityGame(sessionId: string): GyroscopeStabilityGame {
  return new GyroscopeStabilityGame(sessionId);
}
