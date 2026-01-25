import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// INCLINED PLANE GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: a = g × sin(θ) for frictionless case
// With friction: a = g(sin(θ) - μcos(θ))
// Normal force: N = mg × cos(θ)
// Gravity component parallel to ramp: F_parallel = mg × sin(θ)
// ============================================================================

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number; // PROTECTED: Never sent to client
  explanation: string;
}

interface TransferApp {
  title: string;
  description: string;
  stats: string;
}

// Physics constants (PROTECTED - never sent to client)
const GRAVITY = 9.8; // m/s²
const MASS = 1; // kg (normalized)
const FRICTION_COEFFICIENT = 0.3; // kinetic friction

export class InclinedPlaneGame extends BaseGame {
  readonly gameType = 'inclined_plane';
  readonly gameTitle = 'Inclined Plane: Gravity Components';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private angle = 30; // degrees
  private hasFriction = false;
  private isRolling = false;
  private ballPosition = 0; // 0-100 percentage
  private ballVelocity = 0;
  private showVectors = true;
  private experimentCount = 0;
  private animationTime = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showExplanation = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      question: "Why does a ball roll faster on a steeper ramp?",
      options: ["Less air resistance", "More gravity pulls on it", "Larger component of gravity acts along the ramp", "The ball weighs more on a steeper ramp"],
      correctIndex: 2,
      explanation: "Gravity's magnitude stays constant, but the component along the ramp (mg·sinθ) increases with steeper angles, causing greater acceleration."
    },
    {
      question: "What happens to the normal force as the ramp gets steeper?",
      options: ["Increases", "Decreases (N = mg·cos θ)", "Stays the same", "Becomes zero"],
      correctIndex: 1,
      explanation: "Normal force N = mg·cos(θ). As θ increases, cos(θ) decreases, so the normal force decreases. At 90°, it would be zero!"
    },
    {
      question: "If there's no friction, a ball on a 30° ramp has acceleration:",
      options: ["g (9.8 m/s²)", "g·sin(30°) = 4.9 m/s²", "g·cos(30°) = 8.5 m/s²", "Zero"],
      correctIndex: 1,
      explanation: "Without friction, the acceleration is a = g·sin(θ). For 30°, sin(30°) = 0.5, so a = 9.8 × 0.5 = 4.9 m/s²."
    },
    {
      question: "Friction on a ramp acts:",
      options: ["Downward, speeding up the ball", "Upward along the ramp, opposing motion", "Perpendicular to the ramp", "In the direction of gravity"],
      correctIndex: 1,
      explanation: "Kinetic friction always opposes motion. For a ball rolling down, friction acts up the ramp, reducing the net acceleration."
    },
    {
      question: "At what angle would a frictionless ball have maximum acceleration?",
      options: ["0° (flat)", "45°", "90° (vertical drop)", "30°"],
      correctIndex: 2,
      explanation: "At 90°, the entire weight acts downward and sin(90°) = 1, giving maximum acceleration of g. It's essentially free fall!"
    },
    {
      question: "Why do mountain roads zigzag instead of going straight up?",
      options: ["For better views", "To reduce the effective slope and required force", "Roads can't be built straight", "For drainage"],
      correctIndex: 1,
      explanation: "Zigzag roads reduce the slope angle, decreasing the component of gravity cars must overcome. This allows vehicles to climb with less power."
    },
    {
      question: "A ball on a ramp with friction might not move if:",
      options: ["The ball is too heavy", "Static friction exceeds gravity's parallel component", "The ramp is too long", "There's no normal force"],
      correctIndex: 1,
      explanation: "If static friction (μs × N) is greater than mg·sin(θ), the ball won't start moving. There's a critical angle below which objects stay put."
    },
    {
      question: "The parallel component of gravity equals:",
      options: ["mg", "mg × cos(θ)", "mg × sin(θ)", "mg × tan(θ)"],
      correctIndex: 2,
      explanation: "Using vector decomposition, the component of gravity along (parallel to) the ramp is F_parallel = mg × sin(θ)."
    },
    {
      question: "If you double the mass of a ball on a frictionless ramp:",
      options: ["It accelerates twice as fast", "It accelerates the same (a = g·sinθ)", "It accelerates half as fast", "It doesn't move"],
      correctIndex: 1,
      explanation: "The acceleration a = g·sin(θ) doesn't depend on mass! Both gravity force and inertia scale with mass, so they cancel out."
    },
    {
      question: "Skiers crouch down on steep slopes to:",
      options: ["Look cool", "Reduce air resistance and go faster", "Increase normal force", "Change the slope angle"],
      correctIndex: 1,
      explanation: "Crouching reduces air resistance (drag), allowing skiers to reach higher speeds. The slope angle and gravity components stay the same."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      title: "Mountain Roads",
      description: "Switchback roads reduce effective slope, allowing vehicles to climb mountains with reasonable power. The zigzag path trades distance for reduced gradient.",
      stats: "Max road grade: ~15% (8.5°)"
    },
    {
      title: "Wheelchair Ramps",
      description: "ADA requires ramps with max 1:12 slope (4.8°) for accessibility. This keeps the force needed to push a wheelchair manageable.",
      stats: "ADA max: 1:12 (4.76°)"
    },
    {
      title: "Ski Slopes",
      description: "Ski runs are rated by steepness: Green (10-25°), Blue (25-40°), Black (40°+). Steeper means faster acceleration!",
      stats: "Black diamond: 40°+ slope"
    },
    {
      title: "Loading Docks",
      description: "Truck ramps use gentle angles so forklifts can safely transport heavy loads. Too steep and the cargo could slide or tip.",
      stats: "Typical dock: 5-10° incline"
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate physics values
  private calculatePhysics(): {
    angleRad: number;
    gravityParallel: number;
    normalForce: number;
    frictionForce: number;
    netAcceleration: number;
  } {
    const angleRad = (this.angle * Math.PI) / 180;
    const gravityParallel = MASS * GRAVITY * Math.sin(angleRad);
    const normalForce = MASS * GRAVITY * Math.cos(angleRad);
    const frictionCoef = this.hasFriction ? FRICTION_COEFFICIENT : 0;
    const frictionForce = frictionCoef * normalForce;
    const netAcceleration = Math.max(0, (gravityParallel - frictionForce) / MASS);

    return { angleRad, gravityParallel, normalForce, frictionForce, netAcceleration };
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
      if (input.id === 'angle') {
        this.angle = Math.max(10, Math.min(60, input.value));
        this.resetExperiment();
      }
    }
  }

  private handleButtonClick(buttonId: string): void {
    switch (this.phase) {
      case 'hook':
        if (buttonId === 'investigate') {
          this.phase = 'predict';
        }
        break;

      case 'predict':
        if (!this.showPredictionFeedback) {
          if (buttonId.startsWith('option_')) {
            this.prediction = buttonId.split('_')[1];
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
        }
        break;

      case 'play':
        if (buttonId === 'roll') {
          this.startRolling();
        } else if (buttonId === 'reset') {
          this.resetExperiment();
        } else if (buttonId === 'toggle_vectors') {
          this.showVectors = !this.showVectors;
        } else if (buttonId === 'continue' && this.experimentCount >= 3) {
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
            this.twistPrediction = buttonId.split('_')[1];
            this.showTwistFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'twist_play';
          this.showTwistFeedback = false;
          this.hasFriction = true;
          this.resetExperiment();
        }
        break;

      case 'twist_play':
        if (buttonId === 'roll') {
          this.startRolling();
        } else if (buttonId === 'reset') {
          this.resetExperiment();
        } else if (buttonId === 'smooth') {
          this.hasFriction = false;
          this.resetExperiment();
        } else if (buttonId === 'rough') {
          this.hasFriction = true;
          this.resetExperiment();
        } else if (buttonId === 'continue' && this.experimentCount >= 5) {
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
        } else if (buttonId === 'mark_read') {
          this.completedApps.add(this.activeAppIndex);
          if (this.activeAppIndex < this.transferApps.length - 1) {
            this.activeAppIndex++;
          }
        } else if (buttonId === 'continue' && this.completedApps.size >= 4) {
          this.phase = 'test';
        }
        break;

      case 'test':
        if (buttonId.startsWith('answer_')) {
          const answerIndex = parseInt(buttonId.split('_')[1]);
          if (this.testAnswers[this.currentQuestionIndex] === -1) {
            this.testAnswers[this.currentQuestionIndex] = answerIndex;
            this.showExplanation = true;
          }
        } else if (buttonId === 'next_question') {
          if (this.currentQuestionIndex < 9) {
            this.currentQuestionIndex++;
            this.showExplanation = this.testAnswers[this.currentQuestionIndex] !== -1;
          }
        } else if (buttonId === 'prev_question') {
          if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.showExplanation = this.testAnswers[this.currentQuestionIndex] !== -1;
          }
        } else if (buttonId === 'complete') {
          const allAnswered = !this.testAnswers.includes(-1);
          if (allAnswered) {
            this.phase = 'mastery';
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

  private startRolling(): void {
    if (this.isRolling) return;
    this.isRolling = true;
    this.ballPosition = 0;
    this.ballVelocity = 0;
  }

  private resetExperiment(): void {
    this.isRolling = false;
    this.ballPosition = 0;
    this.ballVelocity = 0;
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.angle = 30;
    this.hasFriction = false;
    this.isRolling = false;
    this.ballPosition = 0;
    this.ballVelocity = 0;
    this.showVectors = true;
    this.experimentCount = 0;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showExplanation = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  processInput(input: UserInput, config: SessionConfig): void {
    this.handleInput(input);
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Physics simulation for rolling ball
    if (this.isRolling && this.ballPosition < 100) {
      const physics = this.calculatePhysics();
      const dt = deltaTime * 3; // Speed up for visualization
      this.ballVelocity += physics.netAcceleration * dt;
      this.ballPosition += this.ballVelocity * dt * 10;

      if (this.ballPosition >= 100) {
        this.ballPosition = 100;
        this.isRolling = false;
        this.experimentCount++;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#060810');

    // Subtle background elements
    r.circle(100, 150, 120, { fill: 'rgba(6, 182, 212, 0.03)' });
    r.circle(300, 550, 150, { fill: 'rgba(168, 85, 247, 0.03)' });

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
    r.roundRect(130, 50, 140, 30, 8, { fill: 'rgba(6, 182, 212, 0.1)' });
    r.text(200, 70, 'PHYSICS EXPLORATION', { fill: '#22d3ee', fontSize: 10, textAnchor: 'middle' });

    // Main emoji
    r.text(200, 160, '🎢', { fontSize: 64, textAnchor: 'middle' });

    // Title
    r.text(200, 230, 'The Inclined Plane', { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 265, 'Roll a ball down ramps of different steepness.', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 285, 'How does the angle affect speed?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Question card
    r.roundRect(40, 320, 320, 100, 16, { fill: 'rgba(6, 182, 212, 0.1)' });
    r.text(200, 360, '"Steeper ramp = faster acceleration.', { fill: '#22d3ee', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 385, 'But by how much?"', { fill: '#22d3ee', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'investigate', label: "Let's Investigate", variant: 'primary' });

    // Feature tags
    r.text(200, 520, 'Gravity Components • Vector Decomposition', { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });

    r.setCoachMessage('Explore how gravity splits into components on a slope!');
  }

  private renderPredict(r: CommandRenderer): void {
    // Title
    r.text(200, 50, '🤔', { fontSize: 48, textAnchor: 'middle' });
    r.text(200, 100, 'Make Your Prediction', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 130, 'If you double the ramp angle from 15° to 30°,', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 150, 'acceleration will:', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'double', label: 'Exactly double (2× more)', icon: '2️⃣' },
      { id: 'more_than_double', label: 'More than double', icon: '📈' },
      { id: 'less_than_double', label: 'Increase, but less than double', icon: '📊' }
    ];

    options.forEach((option, i) => {
      const y = 190 + i * 70;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (option.id === 'less_than_double') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (option.id === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (option.id === this.prediction) {
        bgColor = 'rgba(6, 182, 212, 0.3)';
      }

      r.roundRect(40, y, 320, 60, 12, { fill: bgColor });
      r.text(70, y + 35, option.icon, { fontSize: 24, textAnchor: 'middle' });
      r.text(100, y + 38, option.label, { fill: textColor, fontSize: 14, fontWeight: '500' });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${option.id}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 420, 340, 120, 12, { fill: 'rgba(30, 41, 59, 0.7)' });

      const isCorrect = this.prediction === 'less_than_double';
      if (isCorrect) {
        r.text(200, 455, '✅ Correct!', { fill: '#34d399', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      } else {
        r.text(200, 455, '🤔 The sine function isn\'t linear!', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      }
      r.text(200, 485, 'sin(30°)/sin(15°) ≈ 1.9 (not 2!)', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 505, 'Acceleration depends on sine of angle', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test It!', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    const physics = this.calculatePhysics();

    // Title
    r.text(200, 35, 'Inclined Plane Experiment', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization area
    r.roundRect(20, 55, 360, 280, 12, { fill: 'rgba(6, 8, 16, 0.8)' });

    // Ground line
    r.line(30, 310, 370, 310, { stroke: '#64748b', strokeWidth: 2 });

    // Calculate ramp geometry
    const rampLength = 280;
    const rampHeight = rampLength * Math.tan(physics.angleRad);
    const rampStartX = 50;
    const rampStartY = 100;
    const rampEndX = rampStartX + rampLength;
    const rampEndY = Math.min(rampStartY + rampHeight, 300);

    // Ramp surface
    r.polygon([
      { x: rampStartX, y: rampStartY },
      { x: rampEndX, y: rampEndY },
      { x: rampEndX, y: rampEndY + 15 },
      { x: rampStartX, y: rampStartY + 15 }
    ], { fill: '#4a5568' });

    // Angle arc and label
    r.arc(rampEndX - 40, rampEndY, 35, Math.PI, Math.PI + physics.angleRad, { stroke: '#06b6d4', strokeWidth: 2 });
    r.text(rampEndX - 55, rampEndY - 15, `${this.angle}°`, { fill: '#06b6d4', fontSize: 14, fontWeight: 'bold' });

    // Ball position
    const ballProgress = this.ballPosition / 100;
    const ballX = rampStartX + ballProgress * rampLength;
    const ballY = rampStartY + ballProgress * (rampEndY - rampStartY) - 12;

    // Ball with gradient effect
    r.circle(ballX, ballY, 15, { fill: '#ef4444' });
    r.circle(ballX - 4, ballY - 4, 5, { fill: 'rgba(255,255,255,0.4)' });

    // Force vectors (if enabled)
    if (this.showVectors && !this.isRolling) {
      const vectorScale = 3;

      // Gravity (straight down)
      const gravityLen = MASS * GRAVITY * vectorScale;
      r.line(ballX, ballY, ballX, ballY + gravityLen, { stroke: '#a855f7', strokeWidth: 3 });
      r.text(ballX + 12, ballY + gravityLen / 2, 'mg', { fill: '#a855f7', fontSize: 10 });

      // Normal force (perpendicular to ramp)
      const normalLen = physics.normalForce * vectorScale;
      const normalAngle = -physics.angleRad + Math.PI / 2;
      r.line(ballX, ballY,
        ballX + Math.cos(normalAngle) * normalLen,
        ballY + Math.sin(normalAngle) * normalLen,
        { stroke: '#22c55e', strokeWidth: 3 });

      // Parallel component (along ramp)
      const parallelLen = physics.gravityParallel * vectorScale;
      r.line(ballX, ballY,
        ballX + Math.cos(physics.angleRad) * parallelLen,
        ballY + Math.sin(physics.angleRad) * parallelLen,
        { stroke: '#f59e0b', strokeWidth: 3 });
    }

    // Info panel
    r.roundRect(280, 70, 90, 70, 8, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(325, 90, 'Acceleration', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(325, 115, physics.netAcceleration.toFixed(2), { fill: '#22c55e', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(325, 130, 'm/s²', { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });

    // Controls area
    r.roundRect(20, 345, 360, 180, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Angle slider
    r.text(50, 375, `Ramp angle: ${this.angle}°`, { fill: '#94a3b8', fontSize: 12 });
    r.addSlider({
      id: 'angle',
      label: 'Angle',
      min: 10,
      max: 60,
      step: 5,
      value: this.angle
    });

    // Vector toggle
    r.addButton({ id: 'toggle_vectors', label: this.showVectors ? 'Vectors: ON' : 'Vectors: OFF', variant: 'secondary' });

    // Roll/Reset buttons
    if (!this.isRolling && this.ballPosition === 0) {
      r.addButton({ id: 'roll', label: 'Roll Ball!', variant: 'primary' });
    } else if (!this.isRolling) {
      r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
    }

    // Experiment count
    r.text(200, 500, `Experiments: ${this.experimentCount} • Try different angles!`, { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    // Continue button
    if (this.experimentCount >= 3) {
      r.addButton({ id: 'continue', label: 'I see the pattern!', variant: 'primary' });
    }
  }

  private renderReview(r: CommandRenderer): void {
    // Title
    r.text(200, 50, '💡', { fontSize: 48, textAnchor: 'middle' });
    r.text(200, 100, 'Gravity Components!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Main formula card
    r.roundRect(40, 130, 320, 100, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 175, 'a = g × sin(θ)', { fill: '#06b6d4', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 210, 'Acceleration depends on the sine of the angle,', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 228, 'not the angle directly!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Calculation example
    r.roundRect(40, 250, 320, 120, 12, { fill: 'rgba(6, 182, 212, 0.1)' });
    r.text(200, 280, '15°: sin(15°) = 0.26 → a = 2.5 m/s²', { fill: '#ffffff', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 310, '30°: sin(30°) = 0.50 → a = 4.9 m/s²', { fill: '#ffffff', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 345, 'Ratio: 4.9/2.5 = 1.9× (not 2×!)', { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Prediction feedback
    if (this.prediction === 'less_than_double') {
      r.text(200, 400, '✅ Your prediction was correct!', { fill: '#22c55e', fontSize: 14, textAnchor: 'middle' });
    } else {
      r.text(200, 400, '🤔 The sine function isn\'t linear!', { fill: '#fbbf24', fontSize: 14, textAnchor: 'middle' });
    }

    r.addButton({ id: 'continue', label: 'What About Friction?', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    // Title
    r.text(200, 50, '🧱', { fontSize: 48, textAnchor: 'middle' });
    r.text(200, 100, 'Plot Twist: Rough Surface!', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 135, 'What if the ramp has friction?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'How will acceleration change?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'no_effect', label: 'No effect - gravity is the same' },
      { id: 'slower', label: 'Slower acceleration - friction opposes motion' },
      { id: 'faster', label: 'Faster - friction helps somehow' }
    ];

    options.forEach((option, i) => {
      const y = 190 + i * 65;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (option.id === 'slower') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (option.id === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (option.id === this.twistPrediction) {
        bgColor = 'rgba(6, 182, 212, 0.3)';
      }

      r.roundRect(40, y, 320, 55, 10, { fill: bgColor });
      r.text(60, y + 32, option.label, { fill: textColor, fontSize: 13 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${option.id}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 400, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });

      const isCorrect = this.twistPrediction === 'slower';
      if (isCorrect) {
        r.text(200, 435, '✅ Correct!', { fill: '#34d399', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      } else {
        r.text(200, 435, '🤔 Friction always opposes motion!', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      }
      r.text(200, 470, 'Friction acts opposite to the direction of motion', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Add Friction!', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    const physics = this.calculatePhysics();

    // Title
    r.text(200, 35, 'Friction Experiment', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization (similar to play but with friction indicator)
    r.roundRect(20, 55, 360, 250, 12, { fill: 'rgba(6, 8, 16, 0.8)' });

    // Ground and ramp
    r.line(30, 280, 370, 280, { stroke: '#64748b', strokeWidth: 2 });

    const rampLength = 250;
    const rampHeight = rampLength * Math.tan(physics.angleRad);
    const rampStartX = 50;
    const rampStartY = 90;
    const rampEndX = rampStartX + rampLength;
    const rampEndY = Math.min(rampStartY + rampHeight, 270);

    // Ramp
    r.polygon([
      { x: rampStartX, y: rampStartY },
      { x: rampEndX, y: rampEndY },
      { x: rampEndX, y: rampEndY + 12 },
      { x: rampStartX, y: rampStartY + 12 }
    ], { fill: this.hasFriction ? '#7c2d12' : '#4a5568' });

    // Friction indicator
    if (this.hasFriction) {
      r.text(rampStartX + rampLength / 2, rampStartY + (rampEndY - rampStartY) / 2 + 30, '~ Rough Surface ~',
        { fill: '#ef4444', fontSize: 10, textAnchor: 'middle' });
    }

    // Ball
    const ballProgress = this.ballPosition / 100;
    const ballX = rampStartX + ballProgress * rampLength;
    const ballY = rampStartY + ballProgress * (rampEndY - rampStartY) - 10;
    r.circle(ballX, ballY, 12, { fill: '#ef4444' });

    // Surface toggle buttons
    r.roundRect(20, 315, 175, 50, 10, { fill: !this.hasFriction ? '#22c55e' : 'rgba(51, 65, 85, 0.5)' });
    r.text(107, 345, 'Smooth', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.addButton({ id: 'smooth', label: '', variant: 'secondary' });

    r.roundRect(205, 315, 175, 50, 10, { fill: this.hasFriction ? '#ef4444' : 'rgba(51, 65, 85, 0.5)' });
    r.text(292, 345, 'Rough', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.addButton({ id: 'rough', label: '', variant: 'secondary' });

    // Physics display
    r.roundRect(20, 380, 360, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.roundRect(35, 395, 100, 50, 8, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.text(85, 415, 'mg·sinθ', { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });
    r.text(85, 435, `${physics.gravityParallel.toFixed(1)}N`, { fill: '#f59e0b', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    if (this.hasFriction) {
      r.roundRect(150, 395, 100, 50, 8, { fill: 'rgba(51, 65, 85, 0.5)' });
      r.text(200, 415, 'Friction', { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });
      r.text(200, 435, `${physics.frictionForce.toFixed(1)}N`, { fill: '#ef4444', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    }

    r.roundRect(265, 395, 100, 50, 8, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.text(315, 415, 'Net Accel', { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });
    r.text(315, 435, `${physics.netAcceleration.toFixed(1)}`, { fill: '#22c55e', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Roll/Reset
    if (!this.isRolling && this.ballPosition === 0) {
      r.addButton({ id: 'roll', label: 'Roll!', variant: 'primary' });
    } else if (!this.isRolling) {
      r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
    }

    // Continue
    if (this.experimentCount >= 5) {
      r.addButton({ id: 'continue', label: 'I understand!', variant: 'primary' });
    }
  }

  private renderTwistReview(r: CommandRenderer): void {
    // Title
    r.text(200, 50, '⚔️', { fontSize: 48, textAnchor: 'middle' });
    r.text(200, 100, 'Forces Compete!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Force equation card
    r.roundRect(40, 130, 320, 100, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 165, 'mg·sinθ pulls down the ramp', { fill: '#f59e0b', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 195, 'Friction (μ·N) opposes motion', { fill: '#ef4444', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 220, 'Net = parallel - friction', { fill: '#22c55e', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Critical angle insight
    r.roundRect(40, 250, 320, 100, 12, { fill: 'rgba(6, 182, 212, 0.1)' });
    r.text(200, 290, 'At shallow angles, friction might even', { fill: '#22d3ee', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 315, 'stop the ball from rolling!', { fill: '#22d3ee', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 340, 'There\'s a critical angle where it barely moves.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Prediction feedback
    if (this.twistPrediction === 'slower') {
      r.text(200, 390, '✅ Your prediction was correct!', { fill: '#22c55e', fontSize: 14, textAnchor: 'middle' });
    } else {
      r.text(200, 390, '🤔 Friction always opposes motion!', { fill: '#fbbf24', fontSize: 14, textAnchor: 'middle' });
    }

    r.addButton({ id: 'continue', label: 'See Real Examples', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 45, 'Inclined Planes in Real Life', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Tab buttons
    this.transferApps.forEach((app, i) => {
      const x = 25 + i * 92;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#06b6d4';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 75, 85, 40, 8, { fill: bgColor });
      r.text(x + 42, 100, app.title.split(' ')[0], { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Content card
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(20, 130, 360, 320, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 165, app.title, { fill: '#06b6d4', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Description (wrapped)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 200;
    words.forEach(word => {
      if ((line + word).length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 20;
      } else {
        line += word + ' ';
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Stats
    r.roundRect(60, 320, 280, 40, 10, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.text(200, 345, `📊 ${app.stats}`, { fill: '#22d3ee', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Mark read button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_read', label: `✓ Mark "${app.title}" as Read`, variant: 'secondary' });
    } else {
      r.text(200, 400, '✓ Completed', { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 470, `Read all 4 applications to unlock the quiz (${this.completedApps.size}/4)`, { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take the Quiz!', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    const question = this.testQuestions[this.currentQuestionIndex];
    const selectedAnswer = this.testAnswers[this.currentQuestionIndex];
    const correctCount = this.testAnswers.filter((a, i) => this.checkAnswer(i, a)).length;

    // Header
    r.text(200, 40, `Question ${this.currentQuestionIndex + 1}/10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(350, 40, `Score: ${correctCount}/${this.testAnswers.filter(a => a !== -1).length}`, { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Progress bar
    r.roundRect(30, 55, 340, 6, 3, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.roundRect(30, 55, 340 * ((this.currentQuestionIndex + 1) / 10), 6, 3, { fill: '#06b6d4' });

    // Question
    r.roundRect(20, 75, 360, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    const qWords = question.question.split(' ');
    let qLine = '';
    let qY = 100;
    qWords.forEach(word => {
      if ((qLine + word).length > 48) {
        r.text(200, qY, qLine.trim(), { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
        qLine = word + ' ';
        qY += 18;
      } else {
        qLine += word + ' ';
      }
    });
    if (qLine) r.text(200, qY, qLine.trim(), { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    question.options.forEach((option, i) => {
      const y = 170 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showExplanation) {
        if (i === question.correctIndex) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === selectedAnswer) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === selectedAnswer) {
        bgColor = 'rgba(6, 182, 212, 0.3)';
      }

      r.roundRect(20, y, 360, 48, 8, { fill: bgColor });
      r.text(35, y + 28, option.substring(0, 52) + (option.length > 52 ? '...' : ''), { fill: textColor, fontSize: 11 });

      if (!this.showExplanation) {
        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      }
    });

    // Explanation
    if (this.showExplanation) {
      r.roundRect(20, 400, 360, 80, 12, { fill: 'rgba(6, 182, 212, 0.1)' });
      r.text(35, 425, '💡 ' + question.explanation.substring(0, 55), { fill: '#22d3ee', fontSize: 11 });
      if (question.explanation.length > 55) {
        r.text(35, 445, question.explanation.substring(55, 110), { fill: '#22d3ee', fontSize: 11 });
      }
    }

    // Navigation
    if (this.currentQuestionIndex > 0) {
      r.addButton({ id: 'prev_question', label: '← Back', variant: 'secondary' });
    }

    if (this.currentQuestionIndex < 9) {
      r.addButton({ id: 'next_question', label: 'Next →', variant: 'secondary' });
    } else {
      const allAnswered = !this.testAnswers.includes(-1);
      if (allAnswered) {
        r.addButton({ id: 'complete', label: 'Complete!', variant: 'primary' });
      } else {
        r.text(200, 530, 'Answer all questions', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    const score = this.calculateScore();
    const percentage = Math.round((score / 10) * 100);

    // Trophy
    r.text(200, 100, '🏆', { fontSize: 64, textAnchor: 'middle' });

    // Title
    r.text(200, 170, 'Inclined Plane Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Score
    r.text(200, 220, `${percentage}%`, { fill: '#22c55e', fontSize: 48, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 260, `${score}/10 correct answers`, { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Key takeaways
    r.roundRect(40, 290, 320, 180, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 320, 'Key Takeaways:', { fill: '#06b6d4', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const takeaways = [
      'a = g × sin(θ)',
      'Steeper angle → faster acceleration',
      'Normal force N = mg × cos(θ)',
      'Friction opposes motion up the ramp'
    ];

    takeaways.forEach((item, i) => {
      r.text(70, 355 + i * 28, `✓ ${item}`, { fill: '#ffffff', fontSize: 12 });
    });

    r.addButton({ id: 'restart', label: 'Play Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering inclined planes!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      angle: this.angle,
      hasFriction: this.hasFriction,
      isRolling: this.isRolling,
      ballPosition: this.ballPosition,
      ballVelocity: this.ballVelocity,
      showVectors: this.showVectors,
      experimentCount: this.experimentCount,
      animationTime: this.animationTime,
      testAnswers: this.testAnswers,
      currentQuestionIndex: this.currentQuestionIndex,
      showExplanation: this.showExplanation,
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
    if (state.angle !== undefined) this.angle = state.angle as number;
    if (state.hasFriction !== undefined) this.hasFriction = state.hasFriction as boolean;
    if (state.isRolling !== undefined) this.isRolling = state.isRolling as boolean;
    if (state.ballPosition !== undefined) this.ballPosition = state.ballPosition as number;
    if (state.ballVelocity !== undefined) this.ballVelocity = state.ballVelocity as number;
    if (state.showVectors !== undefined) this.showVectors = state.showVectors as boolean;
    if (state.experimentCount !== undefined) this.experimentCount = state.experimentCount as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showExplanation !== undefined) this.showExplanation = state.showExplanation as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createInclinedPlaneGame(sessionId: string): InclinedPlaneGame {
  return new InclinedPlaneGame(sessionId);
}
