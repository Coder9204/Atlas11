import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// ENERGY CONSERVATION GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: PE + KE = constant (in absence of friction)
// PE = mgh (potential energy from height)
// KE = 1/2 mv^2 (kinetic energy from motion)
// Friction converts mechanical energy to thermal energy
// ============================================================================

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion {
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number; // PROTECTED: Never sent to client
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  tagline: string;
  description: string;
  connection: string;
}

// Physics constants (PROTECTED - never sent to client)
const GRAVITY = 9.81; // m/s^2

export class EnergyConservationGame extends BaseGame {
  readonly gameType = 'energy_conservation';
  readonly gameTitle = 'Energy Conservation: The Marble Coaster';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private marblePos = { x: 10, y: 20 };
  private marbleVel = { x: 0, y: 0 };
  private isRunning = false;
  private friction = 0;
  private trackType: 'hill' | 'loop' | 'bowl' = 'hill';
  private animationTime = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "A marble is released from rest at height h on a frictionless track.",
      question: "At what height will it have half kinetic and half potential energy?",
      options: ["h/4", "h/2", "h/3", "3h/4"],
      correctIndex: 1,
      explanation: "At h/2, PE = mgh/2 and KE = mgh/2. Total energy conserved."
    },
    {
      scenario: "A roller coaster designer is planning the second hill of a ride.",
      question: "Why can't the second hill be higher than the first (without motors)?",
      options: ["Too scary", "Not enough potential energy", "Cars would derail", "Air resistance"],
      correctIndex: 1,
      explanation: "The initial PE sets the maximum energy. Can't gain more without adding energy."
    },
    {
      scenario: "A ball rolls down a hill and reaches speed v at the bottom.",
      question: "From twice the height, what would the speed be?",
      options: ["v", "2v", "v*sqrt(2)", "4v"],
      correctIndex: 2,
      explanation: "PE = KE gives mgh = 1/2mv^2. For 2h: v = sqrt(2gh), so v_new = sqrt(2) * v."
    },
    {
      scenario: "A marble rolls on a track with significant friction.",
      question: "What happens to mechanical energy when friction is present?",
      options: ["Disappears", "Converts to thermal energy", "Increases", "Stays the same"],
      correctIndex: 1,
      explanation: "Energy is conserved overall - mechanical energy becomes heat."
    },
    {
      scenario: "A pendulum swings from position A to B.",
      question: "At which point is kinetic energy maximum?",
      options: ["At A (highest)", "At B (other highest)", "At the lowest point", "Halfway"],
      correctIndex: 2,
      explanation: "KE is maximum when PE is minimum - at the lowest point."
    },
    {
      scenario: "Two marbles with masses m and 2m are released from the same height.",
      question: "Their speeds at the bottom are:",
      options: ["Heavier is faster", "Lighter is faster", "Same speed", "Cannot determine"],
      correctIndex: 2,
      explanation: "mgh = 1/2mv^2 gives v = sqrt(2gh). Mass cancels - same speed!"
    },
    {
      scenario: "A skater at the top of a ramp has 100J of potential energy.",
      question: "At the bottom (ignoring friction), kinetic energy is:",
      options: ["50J", "100J", "200J", "0J"],
      correctIndex: 1,
      explanation: "Energy conservation: all 100J of PE converts to KE."
    },
    {
      scenario: "Compare: ball at 10m (rest), ball at 5m moving 10m/s, ball at 0m moving 14m/s.",
      question: "Which has MOST mechanical energy?",
      options: ["10m at rest", "5m moving", "0m moving fast", "All similar"],
      correctIndex: 3,
      explanation: "Calculate PE + KE for each. They're approximately equal due to conservation."
    },
    {
      scenario: "A hydroelectric dam converts water energy to electricity.",
      question: "What is the intermediate form of energy?",
      options: ["Chemical", "Nuclear", "Kinetic energy of water", "Thermal"],
      correctIndex: 2,
      explanation: "Water PE → water KE (falling) → turbine rotation → electrical."
    },
    {
      scenario: "Imagine a perfectly frictionless track.",
      question: "If ALL friction eliminated, a marble would:",
      options: ["Eventually stop", "Return to exactly starting height", "Go higher", "Accelerate forever"],
      correctIndex: 1,
      explanation: "Perfect energy conservation means it returns to exact starting height."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🎢",
      title: "Roller Coasters",
      tagline: "Theme Park Engineering",
      description: "The first hill of a roller coaster is always the highest because all subsequent motion relies on that initial potential energy.",
      connection: "PE at top of first hill converts to KE throughout the ride. No motors push the cars after the initial climb."
    },
    {
      icon: "💧",
      title: "Hydroelectric Dams",
      tagline: "Clean Energy Generation",
      description: "Dams store water at height, converting gravitational PE into KE as water falls, then into electrical energy.",
      connection: "Water PE = mgh converts to KE as it falls through penstocks. Turbines convert this to electricity."
    },
    {
      icon: "🕰️",
      title: "Pendulum Clocks",
      tagline: "Timekeeping Precision",
      description: "A pendulum continuously exchanges PE and KE. At extremes: max PE, zero KE. At bottom: max KE, min PE.",
      connection: "The period depends only on length and gravity, not on mass or amplitude for small swings."
    },
    {
      icon: "🛹",
      title: "Skateboard Half-Pipes",
      tagline: "Action Sports Physics",
      description: "Skaters pump by extending legs at the bottom and crouching at the top, adding energy to go higher.",
      connection: "Without pumping, max height equals starting height. Pumping adds work to increase total energy."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate track Y position for physics simulation
  private getTrackY(x: number, type: string): number {
    if (type === 'hill') {
      const normalizedX = (x - 50) / 50;
      return 20 + 60 * (1 - normalizedX * normalizedX);
    } else if (type === 'loop') {
      if (x < 30) return 20 + (x / 30) * 50;
      if (x > 70) return 20 + ((100 - x) / 30) * 50;
      const loopX = (x - 50) / 20;
      const loopY = Math.sqrt(Math.max(0, 1 - loopX * loopX));
      return 50 - loopY * 25;
    } else if (type === 'bowl') {
      const normalizedX = (x - 50) / 50;
      return 20 + 60 * normalizedX * normalizedX;
    }
    return 50;
  }

  // PROTECTED: Calculate energy values
  private calculateEnergy(): { potential: number; kinetic: number; total: number } {
    const maxHeight = 80;
    const currentHeight = maxHeight - this.marblePos.y;
    const speed = Math.sqrt(this.marbleVel.x ** 2 + this.marbleVel.y ** 2);
    const pe = 10 * Math.max(0, currentHeight);
    const ke = 0.5 * speed ** 2 / 100;
    const total = pe + ke;
    return {
      potential: Math.min(100, (pe / 800) * 100),
      kinetic: Math.min(100, (ke / 800) * 100),
      total: Math.min(100, (total / 800) * 100)
    };
  }

  // PROTECTED: Check test answer
  private checkAnswer(questionIndex: number, answerIndex: number): boolean {
    return this.testQuestions[questionIndex].correctIndex === answerIndex;
  }

  // Calculate test score
  private calculateScore(): number {
    return this.testAnswers.reduce((score, answer, index) => {
      return score + (this.checkAnswer(index, answer) ? 1 : 0);
    }, 0);
  }

  getCurrentPhase(): string {
    return this.phase;
  }

  handleInput(input: UserInput): void {
    if (input.type === 'button_click') {
      this.handleButtonClick(input.id);
    } else if (input.type === 'slider_change') {
      if (input.id === 'friction') {
        this.friction = Math.max(0, Math.min(80, input.value));
      }
    }
  }

  private handleButtonClick(buttonId: string): void {
    switch (this.phase) {
      case 'hook':
        if (buttonId === 'discover') {
          this.phase = 'predict';
        }
        break;

      case 'predict':
        if (!this.showPredictionFeedback) {
          if (buttonId.startsWith('option_')) {
            this.prediction = parseInt(buttonId.split('_')[1]);
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
        }
        break;

      case 'play':
        if (buttonId === 'release') {
          this.startSimulation();
        } else if (buttonId === 'reset') {
          this.resetSimulation();
        } else if (buttonId.startsWith('track_')) {
          this.trackType = buttonId.split('_')[1] as 'hill' | 'loop' | 'bowl';
          this.resetSimulation();
        } else if (buttonId === 'continue') {
          this.phase = 'review';
        }
        break;

      case 'review':
        if (buttonId === 'continue') {
          this.phase = 'twist_predict';
        }
        break;

      case 'twist_predict':
        if (!this.showTwistFeedback) {
          if (buttonId.startsWith('option_')) {
            this.twistPrediction = parseInt(buttonId.split('_')[1]);
            this.showTwistFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'twist_play';
          this.showTwistFeedback = false;
        }
        break;

      case 'twist_play':
        if (buttonId === 'release') {
          this.startSimulation();
        } else if (buttonId === 'reset') {
          this.resetSimulation();
        } else if (buttonId === 'continue') {
          this.phase = 'twist_review';
        }
        break;

      case 'twist_review':
        if (buttonId === 'continue') {
          this.phase = 'transfer';
        }
        break;

      case 'transfer':
        if (buttonId.startsWith('app_')) {
          this.activeAppIndex = parseInt(buttonId.split('_')[1]);
        } else if (buttonId === 'mark_understood') {
          this.completedApps.add(this.activeAppIndex);
        } else if (buttonId === 'continue' && this.completedApps.size >= 4) {
          this.phase = 'test';
        }
        break;

      case 'test':
        if (!this.showTestResults) {
          if (buttonId.startsWith('answer_')) {
            const answerIndex = parseInt(buttonId.split('_')[1]);
            this.testAnswers[this.currentQuestionIndex] = answerIndex;
          } else if (buttonId === 'next_question' && this.currentQuestionIndex < 9) {
            this.currentQuestionIndex++;
          } else if (buttonId === 'prev_question' && this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
          } else if (buttonId === 'submit' && !this.testAnswers.includes(-1)) {
            this.showTestResults = true;
          }
        } else {
          if (buttonId === 'continue') {
            if (this.calculateScore() >= 7) {
              this.phase = 'mastery';
            } else {
              this.showTestResults = false;
              this.testAnswers = Array(10).fill(-1);
              this.currentQuestionIndex = 0;
              this.phase = 'review';
            }
          }
        }
        break;

      case 'mastery':
        if (buttonId === 'restart') {
          this.resetGame();
        }
        break;
    }
  }

  private startSimulation(): void {
    this.marblePos = { x: 10, y: 20 };
    this.marbleVel = { x: 50, y: 0 };
    this.isRunning = true;
  }

  private resetSimulation(): void {
    this.isRunning = false;
    this.marblePos = { x: 10, y: 20 };
    this.marbleVel = { x: 0, y: 0 };
  }

  processInput(input: UserInput, config: SessionConfig): void {
    this.handleInput(input);
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.friction = 0;
    this.trackType = 'hill';
    this.resetSimulation();
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    if (this.isRunning) {
      const dt = 0.016;
      const g = 500;
      const frictionCoeff = this.friction * 0.01;

      let newX = this.marblePos.x + this.marbleVel.x * dt;
      let newY = this.marblePos.y + this.marbleVel.y * dt;
      const trackY = this.getTrackY(newX, this.trackType);

      if (newY > trackY) {
        newY = trackY;
        const slope = (this.getTrackY(newX + 1, this.trackType) - this.getTrackY(newX - 1, this.trackType)) / 2;
        const normalAngle = Math.atan2(-1, slope);
        const speed = Math.sqrt(this.marbleVel.x ** 2 + this.marbleVel.y ** 2);
        const newSpeed = speed * (1 - frictionCoeff);

        this.marbleVel = {
          x: newSpeed * Math.cos(normalAngle + Math.PI / 2) * (this.marbleVel.x > 0 ? 1 : -1),
          y: Math.max(0, this.marbleVel.y * -0.3)
        };
      } else {
        this.marbleVel.y += g * dt;
      }

      if (newX < 5) {
        newX = 5;
        this.marbleVel.x = -this.marbleVel.x * 0.5;
      }
      if (newX > 95) {
        newX = 95;
        this.marbleVel.x = -this.marbleVel.x * 0.5;
      }

      this.marblePos = {
        x: Math.max(5, Math.min(95, newX)),
        y: Math.max(5, Math.min(95, newY))
      };
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(147, 51, 234, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(139, 92, 246, 0.05)' });

    // Render phase-specific content
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

    // Progress indicator
    this.renderProgress(r);

    return r.toFrame(Math.floor(this.animationTime * 60));
  }

  private renderProgress(r: CommandRenderer): void {
    const phases: GamePhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phases.indexOf(this.phase);

    r.setProgress({
      id: 'phase_progress',
      current: currentIndex + 1,
      total: phases.length,
      labels: phases
    });
  }

  private renderHook(r: CommandRenderer): void {
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(147, 51, 234, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#a855f7', fontSize: 10, textAnchor: 'middle' });

    r.text(200, 130, 'The Marble Coaster', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, "Why can't the marble go higher than it started?", { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    r.text(200, 250, '🎢', { fill: '#a855f7', fontSize: 64, textAnchor: 'middle' });

    r.roundRect(40, 300, 320, 160, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 335, 'Watch a marble roll down a track.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 365, 'Energy flows between forms...', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 400, 'PE = mgh (height)', { fill: '#fbbf24', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 425, 'KE = 1/2 mv^2 (motion)', { fill: '#10b981', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 455, 'But the total stays constant!', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'discover', label: 'Make a Prediction', variant: 'primary' });

    r.setCoachMessage('Explore how energy transforms but never disappears!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 100, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'If you release a marble from a certain height,', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 155, 'how high can it roll on the other side?', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      'Much lower than start - it loses energy',
      'Exactly the same height - energy conserved',
      'Slightly lower due to friction',
      'Higher than start - it gains energy'
    ];

    options.forEach((option, i) => {
      const y = 200 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (i === 1 || i === 2) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.prediction) {
        bgColor = 'rgba(147, 51, 234, 0.3)';
      }

      r.roundRect(30, y, 340, 52, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 460, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      r.text(200, 490, 'Frictionless: exact same height!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 520, 'With friction: slightly lower (energy to heat)', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See It in Action', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Energy Transformation Lab', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Track visualization
    r.roundRect(20, 80, 360, 200, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Draw track
    const trackPoints: { x: number; y: number }[] = [];
    for (let x = 0; x <= 100; x += 5) {
      const y = this.getTrackY(x, this.trackType);
      trackPoints.push({ x: 50 + x * 3, y: 100 + y * 1.5 });
    }

    for (let i = 0; i < trackPoints.length - 1; i++) {
      r.line(trackPoints[i].x, trackPoints[i].y, trackPoints[i + 1].x, trackPoints[i + 1].y, { stroke: '#94a3b8', strokeWidth: 3 });
    }

    // Draw marble
    const marbleScreenX = 50 + this.marblePos.x * 3;
    const marbleScreenY = 100 + this.marblePos.y * 1.5;
    r.circle(marbleScreenX, marbleScreenY, 10, { fill: '#a855f7' });

    // Energy bars
    const energy = this.calculateEnergy();
    r.roundRect(30, 290, 100, 60, 8, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(80, 310, 'PE', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(40, 325, 80 * (energy.potential / 100), 15, { fill: '#fbbf24' });

    r.roundRect(150, 290, 100, 60, 8, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 310, 'KE', { fill: '#10b981', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(160, 325, 80 * (energy.kinetic / 100), 15, { fill: '#10b981' });

    r.roundRect(270, 290, 100, 60, 8, { fill: 'rgba(147, 51, 234, 0.2)' });
    r.text(320, 310, 'Total', { fill: '#a855f7', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(280, 325, 80 * (energy.total / 100), 15, { fill: '#a855f7' });

    // Track selection
    r.text(200, 375, 'Track Shape:', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    const tracks = ['hill', 'bowl', 'loop'];
    tracks.forEach((track, i) => {
      const x = 80 + i * 80;
      const isActive = this.trackType === track;
      r.roundRect(x, 390, 70, 35, 6, { fill: isActive ? '#a855f7' : 'rgba(51, 65, 85, 0.5)' });
      r.text(x + 35, 412, track.charAt(0).toUpperCase() + track.slice(1), { fill: isActive ? '#ffffff' : '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.addButton({ id: `track_${track}`, label: '', variant: 'secondary' });
    });

    // Control buttons
    r.addButton({ id: this.isRunning ? 'reset' : 'release', label: this.isRunning ? 'Reset' : 'Release Marble', variant: 'primary' });
    r.addButton({ id: 'continue', label: 'Review the Science', variant: 'secondary' });

    r.setCoachMessage('Watch PE and KE trade off while Total stays constant!');
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'Conservation of Mechanical Energy', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 85, 160, 140, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(110, 110, 'Potential Energy', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 140, 'PE = mgh', { fill: '#ffffff', fontSize: 18, textAnchor: 'middle' });
    r.text(110, 170, 'Energy from height', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 190, 'Max at top, zero at bottom', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.roundRect(210, 85, 160, 140, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(290, 110, 'Kinetic Energy', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 140, 'KE = 1/2 mv^2', { fill: '#ffffff', fontSize: 18, textAnchor: 'middle' });
    r.text(290, 170, 'Energy of motion', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 190, 'Max at bottom, zero at top', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.roundRect(30, 240, 340, 100, 16, { fill: 'rgba(147, 51, 234, 0.2)' });
    r.text(200, 270, 'The Conservation Law', { fill: '#a855f7', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 300, 'PE + KE = Constant', { fill: '#ffffff', fontSize: 20, textAnchor: 'middle' });
    r.text(200, 325, 'Energy transforms but total never changes!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.roundRect(30, 360, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 390, 'In Reality: Friction Exists', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 420, 'Some mechanical energy becomes heat', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 440, 'Total energy still conserved!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Friction Effect', variant: 'secondary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist: Friction', { fill: '#f97316', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 95, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'How does friction affect', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, "the marble's maximum height?", { fill: '#f97316', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      'More friction = lower final height',
      "Friction doesn't affect maximum height",
      'Friction only affects speed, not height',
      'Energy disappears completely with friction'
    ];

    options.forEach((option, i) => {
      const y = 195 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (i === 0) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.twistPrediction) {
        bgColor = 'rgba(249, 115, 22, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 430, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 0 ? 'Correct!' : 'More friction = more energy to heat = lower height!';
      r.text(200, 465, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 495, 'Energy becomes heat, not available for height', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test With Friction', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, "Friction's Effect on Energy", { fill: '#f97316', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Track visualization
    r.roundRect(20, 80, 360, 180, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    const trackPoints: { x: number; y: number }[] = [];
    for (let x = 0; x <= 100; x += 5) {
      const y = this.getTrackY(x, 'hill');
      trackPoints.push({ x: 50 + x * 3, y: 95 + y * 1.3 });
    }

    for (let i = 0; i < trackPoints.length - 1; i++) {
      r.line(trackPoints[i].x, trackPoints[i].y, trackPoints[i + 1].x, trackPoints[i + 1].y, { stroke: '#94a3b8', strokeWidth: 3 });
    }

    const marbleScreenX = 50 + this.marblePos.x * 3;
    const marbleScreenY = 95 + this.marblePos.y * 1.3;
    r.circle(marbleScreenX, marbleScreenY, 10, { fill: '#a855f7' });

    // Energy bars
    const energy = this.calculateEnergy();
    r.roundRect(30, 270, 160, 55, 8, { fill: 'rgba(147, 51, 234, 0.2)' });
    r.text(110, 290, 'Total Energy', { fill: '#a855f7', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(40, 302, 140 * (energy.total / 100), 12, { fill: '#a855f7' });

    // Friction indicator
    const frictionColor = this.friction > 50 ? '#ef4444' : this.friction > 20 ? '#fbbf24' : '#10b981';
    r.roundRect(210, 270, 160, 55, 8, { fill: 'rgba(239, 68, 68, 0.1)' });
    r.text(290, 290, `Friction: ${this.friction}%`, { fill: frictionColor, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    // Friction slider
    r.addSlider({
      id: 'friction',
      label: 'Friction Level',
      min: 0,
      max: 80,
      step: 5,
      value: this.friction
    });

    r.roundRect(40, 380, 320, 50, 10, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(200, 410, 'Watch: Total energy decreases with friction!', { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: this.isRunning ? 'reset' : 'release', label: this.isRunning ? 'Reset' : 'Release Marble', variant: 'primary' });
    r.addButton({ id: 'continue', label: 'Review Discovery', variant: 'secondary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Energy Transforms, Never Disappears', { fill: '#f97316', fontSize: 17, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 85, 340, 140, 16, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(200, 115, 'First Law of Thermodynamics', { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 145, 'Energy cannot be created or destroyed,', { fill: '#f97316', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 165, 'only transformed', { fill: '#f97316', fontSize: 12, textAnchor: 'middle' });

    r.roundRect(50, 195, 80, 50, 8, { fill: 'rgba(147, 51, 234, 0.3)' });
    r.text(90, 225, 'PE + KE', { fill: '#a855f7', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(150, 220, '->', { fill: '#94a3b8', fontSize: 18, textAnchor: 'middle' });

    r.roundRect(170, 195, 80, 50, 8, { fill: 'rgba(16, 185, 129, 0.3)' });
    r.text(210, 225, 'Less ME', { fill: '#10b981', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(265, 220, '+', { fill: '#94a3b8', fontSize: 18, textAnchor: 'middle' });

    r.roundRect(280, 195, 80, 50, 8, { fill: 'rgba(239, 68, 68, 0.3)' });
    r.text(320, 225, 'Heat', { fill: '#ef4444', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 270, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 300, 'Real World Example: Car Brakes', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 325, 'When you brake, kinetic energy becomes', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 345, 'heat in the brake pads - thats why they get hot!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 365, 'Hybrid cars recover some energy (regen braking)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Real Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#a855f7';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 170, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 195, app.tagline, { fill: '#a855f7', fontSize: 11, textAnchor: 'middle' });

    const words = app.description.split(' ');
    let line = '';
    let lineY = 225;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.roundRect(40, 310, 320, 60, 10, { fill: 'rgba(147, 51, 234, 0.2)' });
    r.text(200, 335, 'Physics Connection', { fill: '#a855f7', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 358, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 400, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    r.text(200, 440, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      r.roundRect(25, 100, 350, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 125, question.scenario.substring(0, 50), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 145, question.scenario.substring(50, 100) || '', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      r.text(200, 190, question.question, { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      question.options.forEach((option, i) => {
        const y = 215 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(147, 51, 234, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 45, 8, { fill: bgColor });
        r.text(40, y + 27, `${String.fromCharCode(65 + i)}. ${option.substring(0, 45)}${option.length > 45 ? '...' : ''}`, { fill: isSelected ? '#a855f7' : '#e2e8f0', fontSize: 11 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: 'Previous', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next', variant: 'secondary' });
      }

      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      } else {
        r.text(200, 450, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? 'Excellent! Energy conservation mastered!' : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.roundRect(30, 280, 340, 120, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts:', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 340, 'PE + KE = Constant (frictionless)', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 360, 'Friction converts to thermal energy', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 380, 'Mass cancels in energy equations', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 100, '🏆', { fontSize: 72, textAnchor: 'middle' });

    r.text(200, 180, 'Energy Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 215, 'You understand how energy transforms', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 238, 'but is always conserved!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    const concepts = [
      { icon: '🎢', label: 'PE <-> KE Exchange' },
      { icon: '🔥', label: 'Friction to Heat' },
      { icon: '⚖️', label: 'Conservation Law' },
      { icon: '💡', label: 'Real Applications' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 275 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    r.roundRect(50, 440, 300, 70, 12, { fill: 'rgba(147, 51, 234, 0.2)' });
    r.text(200, 468, 'Key Formula', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 495, 'E = mgh + 1/2mv^2 = constant', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering energy conservation!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      marblePos: this.marblePos,
      marbleVel: this.marbleVel,
      isRunning: this.isRunning,
      friction: this.friction,
      trackType: this.trackType,
      animationTime: this.animationTime,
      testAnswers: this.testAnswers,
      currentQuestionIndex: this.currentQuestionIndex,
      showTestResults: this.showTestResults,
      activeAppIndex: this.activeAppIndex,
      completedApps: Array.from(this.completedApps)
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.prediction !== undefined) this.prediction = state.prediction as number | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as number | null;
    if (state.showPredictionFeedback !== undefined) this.showPredictionFeedback = state.showPredictionFeedback as boolean;
    if (state.showTwistFeedback !== undefined) this.showTwistFeedback = state.showTwistFeedback as boolean;
    if (state.marblePos) this.marblePos = state.marblePos as { x: number; y: number };
    if (state.marbleVel) this.marbleVel = state.marbleVel as { x: number; y: number };
    if (state.isRunning !== undefined) this.isRunning = state.isRunning as boolean;
    if (state.friction !== undefined) this.friction = state.friction as number;
    if (state.trackType) this.trackType = state.trackType as 'hill' | 'loop' | 'bowl';
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createEnergyConservationGame(sessionId: string): EnergyConservationGame {
  return new EnergyConservationGame(sessionId);
}
