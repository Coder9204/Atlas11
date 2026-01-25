import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// HELIUM BALLOON CAR GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: In accelerating car, helium balloon moves FORWARD!
// Air is denser than helium -> pushed backward by inertia
// Creates pressure gradient -> balloon "rises" toward lower pressure
// Demonstrates equivalence principle: acceleration ~ gravity field
// ============================================================================

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number; // PROTECTED: Never sent to client
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  description: string;
  detail: string;
}

// Physics constants (PROTECTED - never sent to client)
const HELIUM_DENSITY = 0.18; // kg/m^3
const AIR_DENSITY = 1.2; // kg/m^3
const MAX_BALLOON_ANGLE = 25; // degrees

export class HeliumBalloonCarGame extends BaseGame {
  readonly gameType = 'helium_balloon_car';
  readonly gameTitle = 'Helium Balloon Car: Acceleration Buoyancy';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation state
  private carState: 'stopped' | 'accelerating' | 'braking' | 'constant' = 'stopped';
  private balloonAngle = 0;
  private pendulumAngle = 0;
  private carPosition = 50;
  private hasAccelerated = false;
  private showResult = false;

  // Twist simulation state
  private twistCarState: 'stopped' | 'accelerating' = 'stopped';
  private twistBalloonAngle = 0;
  private twistPendulumAngle = 0;
  private showTwistResult = false;

  // Animation state
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
      question: "When a car accelerates forward, which way does a helium balloon move?",
      options: ["Backward (like everything else)", "Forward (opposite to everything else)", "Stays perfectly still", "Moves side to side"],
      correctIndex: 1,
      explanation: "The helium balloon moves forward! When the car accelerates, the denser air is pushed backward, creating higher pressure at the back. The balloon moves toward the lower pressure at the front."
    },
    {
      question: "Why does the helium balloon behave opposite to a heavy pendulum?",
      options: ["Helium is magnetic", "The string is different", "Helium is less dense than surrounding air", "The balloon has more surface area"],
      correctIndex: 2,
      explanation: "The key is relative density. The pendulum is denser than air, so it follows the 'pseudo-force' backward. Helium is less dense than air, so it moves opposite - toward where the air is being pushed away from."
    },
    {
      question: "What creates the forward force on the balloon during acceleration?",
      options: ["Wind from outside", "Air pressure gradient inside the car", "Static electricity", "The car's heater"],
      correctIndex: 1,
      explanation: "Acceleration creates a pressure gradient: air piles up at the back (higher pressure) and thins at the front (lower pressure). The balloon experiences a net buoyant force toward the low-pressure region."
    },
    {
      question: "What physics principle explains why acceleration affects objects like gravity?",
      options: ["Newton's First Law", "Conservation of Energy", "Einstein's Equivalence Principle", "Hooke's Law"],
      correctIndex: 2,
      explanation: "Einstein's Equivalence Principle states that the effects of acceleration are indistinguishable from gravity. In an accelerating car, forward acceleration creates an effective 'gravity' pointing backward."
    },
    {
      question: "What happens to the balloon when the car brakes (decelerates)?",
      options: ["Moves forward even faster", "Moves backward", "Stays perfectly still", "Pops"],
      correctIndex: 1,
      explanation: "During braking (negative acceleration), the pressure gradient reverses - higher pressure at front, lower at back. The balloon moves backward, toward the lower pressure region."
    },
    {
      question: "In the car's reference frame, what 'pseudo-force' do objects experience during forward acceleration?",
      options: ["A forward force", "A backward force", "An upward force", "No force"],
      correctIndex: 1,
      explanation: "In the accelerating car's reference frame, objects experience a backward pseudo-force (opposite to acceleration direction). This is why loose objects slide backward and pendulums swing backward."
    },
    {
      question: "If you put a bubble in a bottle of water and accelerate forward, which way does the bubble go?",
      options: ["Backward (with inertia)", "Forward (like the helium balloon)", "Straight up", "Straight down"],
      correctIndex: 1,
      explanation: "The bubble moves forward, just like the helium balloon! It's less dense than water, so when water is pushed backward by acceleration, the bubble goes the opposite direction."
    },
    {
      question: "Why doesn't this balloon effect happen when the car moves at constant speed?",
      options: ["Air stops moving", "No acceleration means no pressure gradient", "The balloon pops", "Friction stops it"],
      correctIndex: 1,
      explanation: "At constant velocity, there's no acceleration, so no pressure gradient develops inside the car. Without a pressure difference, there's no net buoyant force on the balloon."
    },
    {
      question: "How is the balloon in a car similar to a balloon in an elevator accelerating upward?",
      options: ["Both pop from pressure", "Both rise relative to the car/elevator", "Both experience enhanced 'gravity' making balloon rise more", "They behave completely differently"],
      correctIndex: 2,
      explanation: "An upward-accelerating elevator creates stronger effective gravity. Just like real gravity makes the balloon rise (buoyancy), enhanced effective gravity makes it rise even faster relative to the elevator."
    },
    {
      question: "What would happen to the helium balloon in a car that's turning left?",
      options: ["Moves left (into the turn)", "Moves right (away from turn)", "Stays centered", "Moves backward"],
      correctIndex: 0,
      explanation: "The balloon moves INTO the turn (left). The centripetal acceleration points left, so the air is pushed right. The balloon moves toward the lower pressure region on the left."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "plane",
      title: "Aircraft Fuel Gauges",
      description: "Accurate readings during maneuvers",
      detail: "Aircraft fuel systems account for acceleration effects. During climbs, dives, and turns, fuel sloshes and sensors must compensate for pseudo-gravity to give accurate readings."
    },
    {
      icon: "ship",
      title: "Submarine Buoyancy",
      description: "Neutral buoyancy during maneuvers",
      detail: "Submarines must carefully manage buoyancy. During acceleration, denser water redistributes, affecting the sub's trim. Ballast systems compensate for these dynamic effects."
    },
    {
      icon: "flask",
      title: "Centrifuges",
      description: "Separating by density",
      detail: "Medical and industrial centrifuges use extreme acceleration to separate substances by density. Blood components, DNA, and chemical mixtures separate because denser materials move outward."
    },
    {
      icon: "balloon",
      title: "Hot Air Balloons",
      description: "Buoyancy in the atmosphere",
      detail: "Hot air balloons rise because heated air is less dense than cool air. They experience acceleration effects too - tilting during horizontal wind changes just like our helium balloon."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate balloon tilt based on acceleration
  private calculateBalloonTilt(acceleration: number): number {
    // In an accelerating reference frame, the balloon tilts forward
    // The angle depends on the ratio of acceleration to gravity
    const g = 9.81;
    return Math.atan(acceleration / g) * (180 / Math.PI);
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
          if (buttonId.startsWith('prediction_')) {
            this.prediction = buttonId.replace('prediction_', '');
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
        }
        break;

      case 'play':
        if (buttonId === 'accelerate' && this.carState === 'stopped') {
          this.startAcceleration();
        } else if (buttonId === 'brake' && this.carState === 'constant') {
          this.startBraking();
        } else if (buttonId === 'reset') {
          this.resetSimulation();
        } else if (buttonId === 'see_results' && this.hasAccelerated && this.carState === 'stopped') {
          this.showResult = true;
        } else if (buttonId === 'continue' && this.showResult) {
          this.phase = 'review';
          this.showResult = false;
        }
        break;

      case 'review':
        if (buttonId === 'continue') {
          this.phase = 'twist_predict';
        }
        break;

      case 'twist_predict':
        if (!this.showTwistFeedback) {
          if (buttonId.startsWith('twist_')) {
            this.twistPrediction = buttonId.replace('twist_', '');
            this.showTwistFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'twist_play';
          this.showTwistFeedback = false;
        }
        break;

      case 'twist_play':
        if (buttonId === 'accelerate_twist' && this.twistCarState === 'stopped') {
          this.startTwistAcceleration();
        } else if (buttonId === 'reset_twist') {
          this.resetTwist();
        } else if (buttonId === 'see_twist_results') {
          this.showTwistResult = true;
        } else if (buttonId === 'continue' && this.showTwistResult) {
          this.phase = 'twist_review';
          this.showTwistResult = false;
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

  private startAcceleration(): void {
    this.carState = 'accelerating';
    this.hasAccelerated = true;
  }

  private startBraking(): void {
    this.carState = 'braking';
  }

  private resetSimulation(): void {
    this.carState = 'stopped';
    this.balloonAngle = 0;
    this.pendulumAngle = 0;
    this.carPosition = 50;
    this.hasAccelerated = false;
    this.showResult = false;
  }

  private startTwistAcceleration(): void {
    this.twistCarState = 'accelerating';
  }

  private resetTwist(): void {
    this.twistCarState = 'stopped';
    this.twistBalloonAngle = 0;
    this.twistPendulumAngle = 0;
    this.showTwistResult = false;
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
    this.carState = 'stopped';
    this.balloonAngle = 0;
    this.pendulumAngle = 0;
    this.carPosition = 50;
    this.hasAccelerated = false;
    this.showResult = false;
    this.twistCarState = 'stopped';
    this.twistBalloonAngle = 0;
    this.twistPendulumAngle = 0;
    this.showTwistResult = false;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Update car physics simulation
    if (this.phase === 'play') {
      if (this.carState === 'accelerating') {
        // Balloon tilts forward, pendulum tilts backward
        this.balloonAngle = Math.min(this.balloonAngle + 1.5, MAX_BALLOON_ANGLE);
        this.pendulumAngle = -this.balloonAngle;
        this.carPosition = Math.min(this.carPosition + 2, 300);

        if (this.balloonAngle >= MAX_BALLOON_ANGLE) {
          this.carState = 'constant';
        }
      } else if (this.carState === 'constant') {
        // Return to neutral over time
        this.balloonAngle *= 0.95;
        this.pendulumAngle *= 0.95;
        if (Math.abs(this.balloonAngle) < 0.5) {
          this.balloonAngle = 0;
          this.pendulumAngle = 0;
        }
      } else if (this.carState === 'braking') {
        // Balloon tilts backward during braking
        this.balloonAngle = Math.max(this.balloonAngle - 1.5, -20);
        this.pendulumAngle = -this.balloonAngle;

        if (this.balloonAngle <= -20) {
          this.carState = 'stopped';
        }
      } else if (this.carState === 'stopped' && this.hasAccelerated) {
        // Return to neutral
        this.balloonAngle *= 0.9;
        this.pendulumAngle *= 0.9;
        if (Math.abs(this.balloonAngle) < 0.5) {
          this.balloonAngle = 0;
          this.pendulumAngle = 0;
        }
      }
    }

    // Update twist simulation
    if (this.phase === 'twist_play') {
      if (this.twistCarState === 'accelerating') {
        this.twistBalloonAngle = Math.min(this.twistBalloonAngle + 1.5, MAX_BALLOON_ANGLE);
        this.twistPendulumAngle = -this.twistBalloonAngle;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(139, 92, 246, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(59, 130, 246, 0.05)' });

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
    // Badge
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(139, 92, 246, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#a78bfa', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Backward Balloon', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Everything slides backward when a car', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 180, 'accelerates... but what about a helium balloon?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Car illustration
    this.renderCarDiagram(r, 200, 300, 0, 0, false);

    // Question
    r.roundRect(40, 400, 320, 100, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 435, 'When the car accelerates forward...', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 465, 'Which way does the balloon move?', { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Make Your Prediction', variant: 'primary' });

    r.setCoachMessage('This counterintuitive physics demo will surprise you!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'A helium balloon is tied to the floor of a car.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 150, 'When the car accelerates forward, the balloon will...', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'a', text: 'Tilt backward (like a pendulum)' },
      { id: 'b', text: 'Tilt forward (opposite to pendulum)' },
      { id: 'c', text: 'Stay perfectly upright' }
    ];

    options.forEach((option, i) => {
      const y = 200 + i * 70;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (option.id === 'b') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (option.id === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (option.id === this.prediction) {
        bgColor = 'rgba(139, 92, 246, 0.3)';
      }

      r.roundRect(30, y, 340, 55, 10, { fill: bgColor });
      r.text(50, y + 32, `${option.id.toUpperCase()}. ${option.text}`, { fill: textColor, fontSize: 14 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `prediction_${option.id}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 420, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 'b' ? 'Excellent prediction!' : 'Surprising, right?';
      r.text(200, 450, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 480, 'The balloon moves FORWARD - opposite to a pendulum!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See It Happen', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Balloon vs Pendulum Simulator', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Status text
    let statusText = 'Car is stopped';
    let statusColor = '#94a3b8';
    if (this.carState === 'accelerating') {
      statusText = '>>> ACCELERATING FORWARD >>>';
      statusColor = '#22c55e';
    } else if (this.carState === 'constant') {
      statusText = 'Constant speed';
      statusColor = '#fbbf24';
    } else if (this.carState === 'braking') {
      statusText = '<<< BRAKING <<<';
      statusColor = '#ef4444';
    }
    r.text(200, 80, statusText, { fill: statusColor, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Car visualization
    this.renderCarDiagram(r, 200, 220, this.balloonAngle, this.pendulumAngle, true);

    // Result highlight
    if (this.hasAccelerated && this.carState !== 'accelerating') {
      r.text(200, 360, 'Balloon: FORWARD | Pendulum: BACKWARD', { fill: '#22c55e', fontSize: 12, textAnchor: 'middle' });
    }

    // Controls
    r.roundRect(40, 390, 320, 120, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    if (this.carState === 'stopped' && !this.hasAccelerated) {
      r.addButton({ id: 'accelerate', label: 'Accelerate!', variant: 'primary' });
    } else if (this.carState === 'constant') {
      r.addButton({ id: 'brake', label: 'Brake!', variant: 'secondary' });
    } else if (this.carState === 'stopped' && this.hasAccelerated) {
      r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
    }

    if (this.hasAccelerated && this.carState === 'stopped' && !this.showResult) {
      r.addButton({ id: 'see_results', label: 'See Results', variant: 'primary' });
    }

    if (this.showResult) {
      r.roundRect(30, 530, 340, 120, 12, { fill: this.prediction === 'b' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)' });
      const resultText = this.prediction === 'b' ? 'Correct!' : 'Surprising, right?';
      r.text(200, 560, resultText, { fill: this.prediction === 'b' ? '#34d399' : '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 590, 'The balloon moves forward because helium', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 610, 'is less dense than air!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Learn the Physics', variant: 'primary' });
    }
  }

  private renderCarDiagram(r: CommandRenderer, cx: number, cy: number, balloonAngle: number, pendulumAngle: number, showLabels: boolean): void {
    // Car body
    r.roundRect(cx - 100, cy - 30, 200, 60, 10, { fill: '#3b82f6' });
    r.roundRect(cx - 80, cy - 50, 160, 30, 8, { fill: '#1d4ed8' });

    // Windows
    r.roundRect(cx - 70, cy - 45, 60, 25, 4, { fill: '#93c5fd' });
    r.roundRect(cx, cy - 45, 70, 25, 4, { fill: '#93c5fd' });

    // Wheels
    r.circle(cx - 60, cy + 35, 18, { fill: '#1e293b' });
    r.circle(cx - 60, cy + 35, 8, { fill: '#64748b' });
    r.circle(cx + 60, cy + 35, 18, { fill: '#1e293b' });
    r.circle(cx + 60, cy + 35, 8, { fill: '#64748b' });

    // Helium balloon (tilts with angle)
    const balloonBaseX = cx - 30;
    const balloonBaseY = cy - 20;
    const balloonOffsetX = Math.sin(balloonAngle * Math.PI / 180) * 30;
    const balloonOffsetY = -Math.cos(balloonAngle * Math.PI / 180) * 30;

    // String
    r.line(balloonBaseX, balloonBaseY, balloonBaseX + balloonOffsetX, balloonBaseY + balloonOffsetY - 20, { stroke: '#94a3b8', strokeWidth: 1 });
    // Balloon
    r.ellipse(balloonBaseX + balloonOffsetX, balloonBaseY + balloonOffsetY - 40, 16, 20, { fill: 'rgba(168, 85, 247, 0.8)' });
    r.text(balloonBaseX + balloonOffsetX, balloonBaseY + balloonOffsetY - 36, 'He', { fill: 'white', fontSize: 8, fontWeight: 'bold', textAnchor: 'middle' });

    // Pendulum (tilts opposite to balloon)
    const pendulumBaseX = cx + 30;
    const pendulumBaseY = cy - 45;
    const pendulumOffsetX = Math.sin(pendulumAngle * Math.PI / 180) * 30;
    const pendulumOffsetY = Math.cos(pendulumAngle * Math.PI / 180) * 30;

    // String
    r.line(pendulumBaseX, pendulumBaseY, pendulumBaseX + pendulumOffsetX, pendulumBaseY + pendulumOffsetY, { stroke: '#64748b', strokeWidth: 2 });
    // Ball
    r.circle(pendulumBaseX + pendulumOffsetX, pendulumBaseY + pendulumOffsetY + 8, 8, { fill: '#ef4444' });

    if (showLabels) {
      r.text(cx - 30, cy + 60, 'Balloon', { fill: '#a78bfa', fontSize: 10, textAnchor: 'middle' });
      r.text(cx + 30, cy + 60, 'Pendulum', { fill: '#f87171', fontSize: 10, textAnchor: 'middle' });
    }
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 60, 'The Physics: Buoyancy in Acceleration', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Why it happens
    r.roundRect(30, 90, 340, 180, 16, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 120, 'Why It Happens', { fill: '#3b82f6', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    const steps = [
      '1. Car accelerates forward',
      '2. Air (denser) pushed backward by inertia',
      '3. Creates pressure gradient: High (back) Low (front)',
      '4. Balloon (less dense) moves toward low pressure'
    ];
    steps.forEach((step, i) => {
      r.text(50, 150 + i * 25, step, { fill: '#cbd5e1', fontSize: 12 });
    });

    // Equivalence Principle
    r.roundRect(30, 290, 340, 120, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 320, 'The Equivalence Principle', { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 355, 'Forward acceleration = "Gravity" pointing backward', { fill: '#fbbf24', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 385, 'Balloon "rises" against this pseudo-gravity!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Try a Twist!', variant: 'secondary' });

    r.setCoachMessage("Now let's see if this applies to other situations...");
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Bubble in Water', { fill: '#a855f7', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'A sealed bottle of water has an air bubble inside.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 150, 'When the car accelerates forward...', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 180, 'Which way does the bubble move?', { fill: '#a855f7', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'a', text: 'Bubble moves backward (with inertia)' },
      { id: 'b', text: 'Bubble moves forward (like helium balloon)' },
      { id: 'c', text: 'Bubble stays in place' }
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 65;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (option.id === 'b') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (option.id === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (option.id === this.twistPrediction) {
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 55, 10, { fill: bgColor });
      r.text(50, y + 32, `${option.id.toUpperCase()}. ${option.text}`, { fill: textColor, fontSize: 13 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `twist_${option.id}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 420, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 'b' ? 'Correct!' : 'Same physics!';
      r.text(200, 450, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 480, 'The bubble moves FORWARD - just like the balloon!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Comparison', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Balloon vs Bubble Comparison', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 75, 'Same principle, different mediums!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Left side - Balloon in air
    r.roundRect(25, 100, 170, 180, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(110, 125, 'Balloon in Air', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Air box
    r.roundRect(40, 140, 140, 100, 8, { fill: 'rgba(30, 41, 59, 0.5)' });
    // Balloon
    const balloonOffsetX = Math.sin(this.twistBalloonAngle * Math.PI / 180) * 25;
    r.ellipse(110 + balloonOffsetX, 180, 18, 22, { fill: 'rgba(168, 85, 247, 0.8)' });

    r.text(110, 260, 'He in air', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Right side - Bubble in water
    r.roundRect(205, 100, 170, 180, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(290, 125, 'Bubble in Water', { fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Water bottle
    r.roundRect(230, 140, 120, 100, 8, { fill: '#3b82f6' });
    // Cap
    r.roundRect(260, 125, 60, 20, 4, { fill: '#64748b' });
    // Bubble
    const bubbleOffsetX = this.twistBalloonAngle * 0.8;
    r.ellipse(290 + bubbleOffsetX, 190, 15, 12, { fill: 'rgba(255, 255, 255, 0.9)' });

    r.text(290, 260, 'Air in water', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Result
    if (this.twistCarState === 'accelerating' && this.twistBalloonAngle > 20) {
      r.text(200, 300, 'Both move FORWARD!', { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Controls
    if (this.twistCarState === 'stopped') {
      r.addButton({ id: 'accelerate_twist', label: 'Accelerate!', variant: 'primary' });
    } else {
      r.addButton({ id: 'reset_twist', label: 'Reset', variant: 'secondary' });
    }

    if (this.twistBalloonAngle > 20 && !this.showTwistResult) {
      r.addButton({ id: 'see_twist_results', label: 'See Results', variant: 'primary' });
    }

    if (this.showTwistResult) {
      r.roundRect(30, 450, 340, 100, 12, { fill: this.twistPrediction === 'b' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)' });
      r.text(200, 485, 'It\'s all about relative density!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 515, 'Less dense = moves opposite to pseudo-gravity', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Understand Why', variant: 'primary' });
    }
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Universal Principle', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Density comparison
    r.roundRect(30, 85, 170, 140, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(115, 115, 'Helium in Air', { fill: '#22d3ee', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(115, 145, 'He = 0.18 kg/m3', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(115, 165, 'Air = 1.2 kg/m3', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(115, 195, 'He is 7x lighter', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(200, 85, 170, 140, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(285, 115, 'Air in Water', { fill: '#3b82f6', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(285, 145, 'Air = 1.2 kg/m3', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(285, 165, 'Water = 1000 kg/m3', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(285, 195, 'Air is 830x lighter', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // The rule
    r.roundRect(30, 245, 340, 100, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 275, 'The Rule:', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 305, 'Less dense objects move opposite to', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 325, 'the pseudo-force direction', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });

    // More examples
    r.roundRect(30, 360, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 385, 'More Examples:', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 410, 'Turning car: Balloon moves INTO the turn', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 430, 'Elevator up: Balloon rises faster relative to car', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 450, 'Airplane takeoff: Balloon tilts toward cockpit', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Real Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#8b5cf6';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });

      // Draw icon as text
      const iconMap: Record<string, string> = {
        plane: 'A',
        ship: 'S',
        flask: 'C',
        balloon: 'B'
      };
      r.text(x + 40, 108, iconMap[app.icon] || '?', { fontSize: 16, textAnchor: 'middle', fill: isActive ? '#ffffff' : '#94a3b8' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.description, { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });

    // Description (multi-line)
    const words = app.detail.split(' ');
    let line = '';
    let lineY = 230;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 48) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 400, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 460, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Continue button
    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Question
      r.roundRect(25, 100, 350, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 145, question.question.substring(0, 50), { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      if (question.question.length > 50) {
        r.text(200, 165, question.question.substring(50), { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      }

      // Options
      question.options.forEach((option, i) => {
        const y = 200 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(139, 92, 246, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${option.substring(0, 45)}${option.length > 45 ? '...' : ''}`, { fill: isSelected ? '#a78bfa' : '#e2e8f0', fontSize: 11 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      // Navigation
      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: 'Previous', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next', variant: 'secondary' });
      }

      // Submit button
      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      } else {
        r.text(200, 485, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? 'Trophy' : 'Book', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "Excellent! You've mastered the concept!" : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 160, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'Acceleration creates pressure gradients',
        'Less dense objects move toward low pressure',
        'Equivalence principle: acceleration ~ gravity',
        'Same rule: balloon in air = bubble in water'
      ];
      concepts.forEach((concept, i) => {
        r.text(200, 340 + i * 22, concept, { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Trophy
    r.text(200, 120, 'Trophy', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Acceleration Buoyancy Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand why helium balloons seem', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'to defy physics in accelerating vehicles!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Score and achievements
    const score = this.calculateScore();
    r.roundRect(50, 290, 300, 150, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 330, `Test Score: ${score}/10`, { fill: '#22c55e', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 365, 'Key Takeaways:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 395, 'Acceleration creates pressure gradients', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 415, 'Less dense objects move toward low pressure', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Play Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering acceleration buoyancy!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      carState: this.carState,
      balloonAngle: this.balloonAngle,
      pendulumAngle: this.pendulumAngle,
      carPosition: this.carPosition,
      hasAccelerated: this.hasAccelerated,
      showResult: this.showResult,
      twistCarState: this.twistCarState,
      twistBalloonAngle: this.twistBalloonAngle,
      twistPendulumAngle: this.twistPendulumAngle,
      showTwistResult: this.showTwistResult,
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
    if (state.prediction !== undefined) this.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.showPredictionFeedback !== undefined) this.showPredictionFeedback = state.showPredictionFeedback as boolean;
    if (state.showTwistFeedback !== undefined) this.showTwistFeedback = state.showTwistFeedback as boolean;
    if (state.carState !== undefined) this.carState = state.carState as 'stopped' | 'accelerating' | 'braking' | 'constant';
    if (state.balloonAngle !== undefined) this.balloonAngle = state.balloonAngle as number;
    if (state.pendulumAngle !== undefined) this.pendulumAngle = state.pendulumAngle as number;
    if (state.carPosition !== undefined) this.carPosition = state.carPosition as number;
    if (state.hasAccelerated !== undefined) this.hasAccelerated = state.hasAccelerated as boolean;
    if (state.showResult !== undefined) this.showResult = state.showResult as boolean;
    if (state.twistCarState !== undefined) this.twistCarState = state.twistCarState as 'stopped' | 'accelerating';
    if (state.twistBalloonAngle !== undefined) this.twistBalloonAngle = state.twistBalloonAngle as number;
    if (state.twistPendulumAngle !== undefined) this.twistPendulumAngle = state.twistPendulumAngle as number;
    if (state.showTwistResult !== undefined) this.showTwistResult = state.showTwistResult as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createHeliumBalloonCarGame(sessionId: string): HeliumBalloonCarGame {
  return new HeliumBalloonCarGame(sessionId);
}
