import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// BERNOULLI GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: P + (1/2)ρv² + ρgh = constant (Bernoulli's Equation)
// Fast-moving fluid = Lower pressure (basis for airplane lift)
// Magnus effect: Spinning objects curve due to pressure differential
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
const AIR_DENSITY = 1.225; // kg/m³ at sea level
const GRAVITY = 9.81; // m/s²

export class BernoulliGame extends BaseGame {
  readonly gameType = 'bernoulli';
  readonly gameTitle = "Bernoulli's Principle: Why Planes Fly";

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private airSpeed = 50; // m/s
  private angleOfAttack = 5; // degrees
  private ballSpin = 1500; // RPM
  private simulationMode: 'wing' | 'ball' = 'wing';
  private showStreamlines = true;
  private showPressure = true;
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
      scenario: "Air flows over an airplane wing at 100 m/s on the curved top surface and 80 m/s on the flatter bottom.",
      question: "According to Bernoulli's principle, what happens to the pressure?",
      options: [
        "Pressure is higher on top where air moves faster",
        "Pressure is lower on top where air moves faster",
        "Pressure is the same on both surfaces",
        "Pressure depends only on wing shape, not speed"
      ],
      correctIndex: 1,
      explanation: "Bernoulli's equation: P + (1/2)ρv² = constant. Higher velocity means lower pressure. The top surface has lower pressure, creating lift."
    },
    {
      scenario: "A baseball pitcher throws a curveball at 90 mph with 2000 RPM of topspin.",
      question: "Why does the ball curve downward more than gravity alone would cause?",
      options: [
        "The spin makes the ball heavier",
        "Air friction increases with spin",
        "Spin creates faster airflow on top (low pressure) pulling ball down - Magnus effect",
        "The seams catch the air and push it down"
      ],
      correctIndex: 2,
      explanation: "The Magnus effect: topspin drags air faster over the top (low pressure) and slower under the bottom (high pressure). The pressure difference pushes the ball downward."
    },
    {
      scenario: "You blow between two pieces of paper hanging close together.",
      question: "What happens to the papers?",
      options: [
        "They blow apart from the force of your breath",
        "They come together because fast air between them has low pressure",
        "They stay still because the forces balance",
        "One goes up and one goes down"
      ],
      correctIndex: 1,
      explanation: "Fast-moving air between the papers creates low pressure. The higher-pressure still air on the outside pushes the papers together."
    },
    {
      scenario: "A Venturi tube has a narrow section in the middle where fluid speeds up.",
      question: "What happens to the pressure in the narrow section?",
      options: [
        "Pressure increases because fluid is squeezed",
        "Pressure decreases because fluid speeds up",
        "Pressure stays constant throughout",
        "Pressure oscillates back and forth"
      ],
      correctIndex: 1,
      explanation: "Continuity: A₁v₁ = A₂v₂ means smaller area = faster flow. Bernoulli: faster flow = lower pressure. This powers atomizers, carburetors, and spray bottles."
    },
    {
      scenario: "A shower curtain gets sucked inward when you turn on hot water.",
      question: "What causes this effect?",
      options: [
        "Static electricity from the water",
        "Hot water creates rising air current with lower pressure inside",
        "The water spray pushes the curtain",
        "Temperature difference makes the curtain shrink"
      ],
      correctIndex: 1,
      explanation: "Hot water creates a convection current of rising air inside the shower. This moving air has lower pressure than the still air outside, pulling the curtain inward."
    },
    {
      scenario: "Race cars have inverted wings (spoilers) on the back.",
      question: "Why are the wings upside down compared to airplane wings?",
      options: [
        "To reduce air resistance",
        "To look more aerodynamic",
        "To create downforce by making pressure higher on top",
        "To cool the engine more efficiently"
      ],
      correctIndex: 2,
      explanation: "Inverted wings create faster airflow on the bottom (low pressure below). This pushes the car down, increasing tire grip at high speeds."
    },
    {
      scenario: "A soccer player kicks a ball with sidespin, making it curve around a wall of defenders.",
      question: "Which direction does the ball curve?",
      options: [
        "Toward the side spinning forward (into the airflow)",
        "Away from the side spinning forward",
        "Straight - sidespin doesn't affect trajectory",
        "Upward regardless of spin direction"
      ],
      correctIndex: 0,
      explanation: "Magnus effect: the side spinning forward moves with the airflow (faster = low pressure), while the other side moves against it (slower = high pressure). Ball curves toward low pressure."
    },
    {
      scenario: "An airplane is flying level. The pilot increases throttle, making the plane go faster.",
      question: "What happens to the lift force?",
      options: [
        "Lift stays the same because angle of attack is unchanged",
        "Lift increases because v² increases in the lift equation",
        "Lift decreases because faster air can't push as hard",
        "Lift is unaffected by speed, only by wing area"
      ],
      correctIndex: 1,
      explanation: "Lift ∝ v². Doubling speed quadruples lift. This is why planes need high speed for takeoff and can reduce angle of attack at cruise."
    },
    {
      scenario: "A perfume atomizer uses a rubber bulb to blow air across the top of a tube submerged in perfume.",
      question: "How does this create a spray of perfume droplets?",
      options: [
        "The air pressure forces perfume up the tube",
        "Fast air over the tube creates low pressure, sucking perfume up",
        "The rubber bulb creates a vacuum",
        "Perfume evaporates naturally into the airstream"
      ],
      correctIndex: 1,
      explanation: "Venturi effect: fast air over the tube opening creates low pressure. Higher atmospheric pressure on the perfume surface pushes liquid up the tube where it's broken into droplets."
    },
    {
      scenario: "A golf ball has dimples on its surface, unlike a smooth ball.",
      question: "How do dimples help the ball fly farther?",
      options: [
        "Dimples make the ball lighter",
        "Dimples increase air resistance, slowing the ball",
        "Dimples create turbulent boundary layer, reducing drag and enhancing Magnus effect",
        "Dimples are purely decorative"
      ],
      correctIndex: 2,
      explanation: "Dimples create a turbulent boundary layer that stays attached longer, reducing wake turbulence and drag. They also enhance the Magnus effect for better lift on spinning shots."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "✈️",
      title: "Airplane Wings",
      tagline: "How 500 tons fly through air",
      description: "Airplane wings are shaped so air travels faster over the curved top than under the flatter bottom. The pressure difference creates lift - up to 500,000+ pounds for a 747!",
      connection: "Lift = (1/2)ρv²ACL. Speed squared means doubling velocity quadruples lift!"
    },
    {
      icon: "⚾",
      title: "Sports Spin",
      tagline: "Curving balls and soccer bends",
      description: "When a ball spins, it drags air faster on one side (creating low pressure) and slower on the other (higher pressure). The ball moves toward low pressure.",
      connection: "Magnus Force ∝ spin rate × velocity. A 90mph fastball with 2000 RPM can curve 17 inches!"
    },
    {
      icon: "💨",
      title: "Venturi Effect",
      tagline: "Narrow pipes, fast flow, low pressure",
      description: "When fluid flows through a constriction, it speeds up (continuity) and pressure drops (Bernoulli). This powers carburetors, atomizers, and paint sprayers.",
      connection: "A₁v₁ = A₂v₂ (continuity) + Bernoulli leads to P₂ < P₁ in narrow section."
    },
    {
      icon: "🚿",
      title: "Shower Curtain Mystery",
      tagline: "Why it attacks you",
      description: "Hot shower water creates a column of rising air (convection). This moving air has lower pressure than the still air outside, pushing the curtain inward!",
      connection: "This won an Ig Nobel Prize in 2001 for scientific research on everyday mysteries!"
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate lift coefficient based on airspeed and angle of attack
  private calculateLift(speed: number, angle: number): number {
    // Simplified lift calculation - stall occurs around 15 degrees
    const stallAngle = 15;
    const effectiveAngle = Math.min(angle, stallAngle);
    const lift = Math.pow(speed / 100, 2) * (effectiveAngle / 15) * 100;
    return Math.min(100, lift);
  }

  // PROTECTED: Calculate Magnus force for spinning ball
  private calculateMagnusForce(speed: number, spin: number): number {
    // Magnus force proportional to spin and velocity
    return (speed / 100) * (spin / 2000) * 50;
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
      if (input.id === 'air_speed') {
        this.airSpeed = Math.max(10, Math.min(100, input.value));
      } else if (input.id === 'angle_of_attack') {
        this.angleOfAttack = Math.max(0, Math.min(20, input.value));
      } else if (input.id === 'ball_spin') {
        this.ballSpin = Math.max(-2500, Math.min(2500, input.value));
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
        if (buttonId === 'mode_wing') {
          this.simulationMode = 'wing';
        } else if (buttonId === 'mode_ball') {
          this.simulationMode = 'ball';
        } else if (buttonId === 'toggle_streamlines') {
          this.showStreamlines = !this.showStreamlines;
        } else if (buttonId === 'toggle_pressure') {
          this.showPressure = !this.showPressure;
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
          this.simulationMode = 'ball';
        }
        break;

      case 'twist_play':
        if (buttonId === 'continue') {
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

  processInput(input: UserInput, config: SessionConfig): void {
    this.handleInput(input);
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.airSpeed = 50;
    this.angleOfAttack = 5;
    this.ballSpin = 1500;
    this.simulationMode = 'wing';
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(59, 130, 246, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(99, 102, 241, 0.05)' });

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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(59, 130, 246, 0.1)' });
    r.text(200, 80, 'FLUID DYNAMICS', { fill: '#60a5fa', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'Why Planes Fly', { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'A 500-ton airplane floats through air.', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 180, 'How is this possible?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Airplane illustration
    r.text(200, 260, '✈️', { fontSize: 64, textAnchor: 'middle' });

    // Formula card
    r.roundRect(40, 300, 320, 140, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 335, "Bernoulli's Equation", { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(60, 350, 280, 40, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 375, 'P + (1/2)ρv² = constant', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });
    r.text(200, 420, 'Faster fluid = Lower pressure', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Discover Lift', variant: 'primary' });

    r.setCoachMessage('Daniel Bernoulli discovered the answer 300 years ago!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 90, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 120, 'You hold a strip of paper below your', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 140, 'lips and blow across the TOP of it.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 170, 'What happens to the paper?', { fill: '#60a5fa', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'It bends downward from the force of air',
      'It rises up toward the airflow',
      'It stays perfectly still',
      'It flaps back and forth randomly'
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (i === 1) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.prediction) {
        bgColor = 'rgba(59, 130, 246, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 480, 340, 110, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Correct!' : 'The paper rises!';
      r.text(200, 510, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 535, 'Fast air above = low pressure.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 555, 'Higher pressure below pushes up!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Explore the Physics', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Bernoulli Lab', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    const lift = this.calculateLift(this.airSpeed, this.angleOfAttack);
    const magnus = this.calculateMagnusForce(this.airSpeed, this.ballSpin);

    // Visualization area
    r.roundRect(20, 75, 360, 220, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    if (this.simulationMode === 'wing') {
      // Wing visualization
      const centerX = 200;
      const centerY = 185;

      // Streamlines (if enabled)
      if (this.showStreamlines) {
        const animOffset = (this.animationTime * 50) % 100;
        // Top streamlines (faster, compressed)
        for (let i = 0; i < 3; i++) {
          const yOffset = -20 - i * 15;
          r.line(40, centerY + yOffset, 360, centerY + yOffset * 0.7, { stroke: '#60a5fa', strokeWidth: 1 });
          r.circle(40 + animOffset * 3.2 + i * 30, centerY + yOffset * 0.85, 3, { fill: '#60a5fa' });
        }
        // Bottom streamlines (slower, spread)
        for (let i = 0; i < 3; i++) {
          const yOffset = 30 + i * 15;
          r.line(40, centerY + yOffset, 360, centerY + yOffset * 1.2, { stroke: '#fbbf24', strokeWidth: 1 });
          r.circle(40 + animOffset * 2.4 + i * 30, centerY + yOffset * 1.1, 3, { fill: '#fbbf24' });
        }
      }

      // Pressure regions (if enabled)
      if (this.showPressure) {
        r.ellipse(centerX, centerY - 30, 70, 20, { fill: 'rgba(96, 165, 250, 0.2)' });
        r.text(centerX, centerY - 50, 'LOW PRESSURE', { fill: '#60a5fa', fontSize: 10, textAnchor: 'middle' });
        r.ellipse(centerX, centerY + 40, 60, 15, { fill: 'rgba(251, 191, 36, 0.2)' });
        r.text(centerX, centerY + 60, 'HIGH PRESSURE', { fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' });
      }

      // Airfoil shape
      r.text(centerX, centerY, '✈️', { fontSize: 40, textAnchor: 'middle' });

      // Lift arrow
      if (lift > 5) {
        const arrowLen = lift * 0.5;
        r.line(centerX + 50, centerY, centerX + 50, centerY - arrowLen, { stroke: '#34d399', strokeWidth: 3 });
        r.text(centerX + 70, centerY - arrowLen / 2, 'LIFT', { fill: '#34d399', fontSize: 11, fontWeight: 'bold' });
      }

      r.text(60, 95, `Speed: ${this.airSpeed} m/s`, { fill: '#94a3b8', fontSize: 10 });
      r.text(300, 95, `Angle: ${this.angleOfAttack}°`, { fill: '#94a3b8', fontSize: 10 });
    } else {
      // Ball (Magnus effect) visualization
      const centerX = 200;
      const centerY = 185;
      const curveDir = this.ballSpin > 0 ? -1 : 1;

      // Trajectory curve
      r.text(200, 120, 'Ball curves ' + (this.ballSpin > 0 ? 'UP' : this.ballSpin < 0 ? 'DOWN' : 'straight'),
        { fill: '#f472b6', fontSize: 12, textAnchor: 'middle' });

      // Streamlines around ball
      if (this.showStreamlines) {
        r.text(centerX, centerY - 45, this.ballSpin > 0 ? 'Fast (Low P)' : 'Slow (High P)',
          { fill: '#60a5fa', fontSize: 9, textAnchor: 'middle' });
        r.text(centerX, centerY + 55, this.ballSpin > 0 ? 'Slow (High P)' : 'Fast (Low P)',
          { fill: '#fbbf24', fontSize: 9, textAnchor: 'middle' });
      }

      // Baseball
      r.circle(centerX, centerY, 25, { fill: '#f5f5f4' });
      r.text(centerX, centerY + 5, '⚾', { fontSize: 30, textAnchor: 'middle' });

      // Magnus force arrow
      if (Math.abs(this.ballSpin) > 100) {
        const forceLen = Math.abs(magnus) * 0.8;
        r.line(centerX, centerY, centerX, centerY + curveDir * forceLen, { stroke: '#f472b6', strokeWidth: 3 });
        r.text(centerX + 25, centerY + curveDir * forceLen / 2, 'Magnus', { fill: '#f472b6', fontSize: 10 });
      }

      r.text(60, 95, `Speed: ${this.airSpeed} m/s`, { fill: '#94a3b8', fontSize: 10 });
      r.text(300, 95, `Spin: ${this.ballSpin} RPM`, { fill: '#94a3b8', fontSize: 10 });
    }

    // Data panel
    r.roundRect(30, 305, 100, 55, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(80, 325, 'Speed', { fill: '#60a5fa', fontSize: 10, textAnchor: 'middle' });
    r.text(80, 345, `${this.airSpeed} m/s`, { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(150, 305, 100, 55, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 325, this.simulationMode === 'wing' ? 'Lift' : 'Magnus', { fill: '#34d399', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 345, this.simulationMode === 'wing' ? `${lift.toFixed(0)}%` : `${magnus.toFixed(1)} N`,
      { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(270, 305, 100, 55, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(320, 325, this.simulationMode === 'wing' ? 'Angle' : 'Spin', { fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' });
    r.text(320, 345, this.simulationMode === 'wing' ? `${this.angleOfAttack}°` : `${this.ballSpin}`,
      { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Sliders
    r.addSlider({ id: 'air_speed', label: 'Air Speed (m/s)', min: 10, max: 100, step: 5, value: this.airSpeed });

    if (this.simulationMode === 'wing') {
      r.addSlider({ id: 'angle_of_attack', label: 'Angle of Attack (°)', min: 0, max: 20, step: 1, value: this.angleOfAttack });
    } else {
      r.addSlider({ id: 'ball_spin', label: 'Ball Spin (RPM)', min: -2500, max: 2500, step: 100, value: this.ballSpin });
    }

    // Mode toggle buttons
    r.addButton({ id: 'mode_wing', label: '✈️ Wing', variant: this.simulationMode === 'wing' ? 'primary' : 'secondary' });
    r.addButton({ id: 'mode_ball', label: '⚾ Ball', variant: this.simulationMode === 'ball' ? 'primary' : 'secondary' });
    r.addButton({ id: 'toggle_streamlines', label: this.showStreamlines ? 'Flow ON' : 'Flow OFF', variant: 'secondary' });
    r.addButton({ id: 'toggle_pressure', label: this.showPressure ? 'Pressure ON' : 'Pressure OFF', variant: 'secondary' });

    r.addButton({ id: 'continue', label: 'Review Concepts', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, "Bernoulli's Principle", { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Equation card
    r.roundRect(30, 80, 340, 120, 16, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 110, 'The Bernoulli Equation', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(50, 125, 300, 40, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 150, 'P + (1/2)ρv² + ρgh = constant', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 185, 'Speed up → Pressure down', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Wing lift card
    r.roundRect(30, 215, 340, 130, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 245, 'How Wings Create Lift', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Icons
    r.roundRect(50, 265, 80, 55, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(90, 290, '💨', { fontSize: 18, textAnchor: 'middle' });
    r.text(90, 310, 'Fast=Low P', { fill: '#94a3b8', fontSize: 8, textAnchor: 'middle' });

    r.roundRect(160, 265, 80, 55, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 290, '🐌', { fontSize: 18, textAnchor: 'middle' });
    r.text(200, 310, 'Slow=High P', { fill: '#94a3b8', fontSize: 8, textAnchor: 'middle' });

    r.roundRect(270, 265, 80, 55, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(310, 290, '⬆️', { fontSize: 18, textAnchor: 'middle' });
    r.text(310, 310, 'ΔP = Lift', { fill: '#94a3b8', fontSize: 8, textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 360, 340, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 388, 'Curved top = fast air = low pressure', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 410, 'Pressure difference creates upward force!', { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Discover Magnus Effect', variant: 'secondary' });

    r.setCoachMessage("Now let's see how this applies to spinning balls!");
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'The Curveball Challenge', { fill: '#fbbf24', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 85, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 115, 'A baseball pitcher throws a curveball.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 140, 'The ball spins, creating faster airflow', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 160, 'on one side than the other.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });

    r.text(200, 200, 'Which way does the ball curve?', { fill: '#fbbf24', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Toward the side with faster-moving air',
      'Away from the side with faster-moving air',
      "It doesn't curve - optical illusion",
      'Straight down from gravity only'
    ];

    options.forEach((option, i) => {
      const y = 220 + i * 55;
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
        bgColor = 'rgba(251, 191, 36, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 450, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 0 ? 'Excellent!' : 'Ball curves toward LOW pressure!';
      r.text(200, 480, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 505, 'This is the Magnus effect - Bernoulli', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 525, 'applied to spinning objects!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Magnus Effect', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Magnus Effect Lab', { fill: '#fbbf24', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    const magnus = this.calculateMagnusForce(this.airSpeed, this.ballSpin);
    const curveDir = this.ballSpin > 0 ? 'UP' : this.ballSpin < 0 ? 'DOWN' : 'straight';

    // Visualization
    r.roundRect(20, 75, 360, 200, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    const centerX = 200;
    const centerY = 175;

    // Streamline labels
    r.text(centerX, centerY - 50, this.ballSpin > 0 ? 'Fast (Low P) ↑' : 'Slow (High P)',
      { fill: '#60a5fa', fontSize: 10, textAnchor: 'middle' });
    r.text(centerX, centerY + 60, this.ballSpin > 0 ? 'Slow (High P)' : 'Fast (Low P) ↓',
      { fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' });

    // Baseball
    r.circle(centerX, centerY, 28, { fill: '#f5f5f4' });
    r.text(centerX, centerY + 5, '⚾', { fontSize: 32, textAnchor: 'middle' });

    // Magnus arrow
    if (Math.abs(this.ballSpin) > 100) {
      const arrowDir = this.ballSpin > 0 ? -1 : 1;
      const arrowLen = Math.abs(magnus) * 0.8;
      r.line(centerX + 40, centerY, centerX + 40, centerY + arrowDir * arrowLen, { stroke: '#f472b6', strokeWidth: 3 });
      r.text(centerX + 60, centerY + arrowDir * arrowLen / 2, 'Magnus', { fill: '#f472b6', fontSize: 10 });
    }

    r.text(200, 95, `Ball curves: ${curveDir}`, { fill: '#f472b6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Data display
    r.roundRect(50, 290, 130, 50, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(115, 310, 'Pitch Speed', { fill: '#60a5fa', fontSize: 10, textAnchor: 'middle' });
    r.text(115, 330, `${this.airSpeed} m/s`, { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(220, 290, 130, 50, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(285, 310, 'Ball Spin', { fill: '#f472b6', fontSize: 10, textAnchor: 'middle' });
    r.text(285, 330, `${this.ballSpin} RPM`, { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Sliders
    r.addSlider({ id: 'air_speed', label: 'Pitch Speed (m/s)', min: 10, max: 100, step: 5, value: this.airSpeed });
    r.addSlider({ id: 'ball_spin', label: 'Ball Spin (RPM)', min: -2500, max: 2500, step: 100, value: this.ballSpin });

    // Spin guide
    r.text(100, 430, '← Topspin', { fill: '#94a3b8', fontSize: 10 });
    r.text(300, 430, 'Backspin →', { fill: '#94a3b8', fontSize: 10 });

    r.addButton({ id: 'continue', label: 'Review Discovery', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Magnus Effect Explained', { fill: '#fbbf24', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Main explanation
    r.roundRect(30, 85, 340, 140, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 115, 'Spin Creates Pressure Differences', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Topspin
    r.roundRect(40, 135, 145, 75, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(112, 155, 'Topspin', { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(112, 175, 'Top moves with air', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(112, 190, 'Ball curves DOWN', { fill: '#60a5fa', fontSize: 10, textAnchor: 'middle' });

    // Backspin
    r.roundRect(215, 135, 145, 75, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(287, 155, 'Backspin', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(287, 175, 'Bottom moves with air', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(287, 190, 'Ball curves UP', { fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' });

    // Formula
    r.roundRect(30, 240, 340, 60, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 265, 'Magnus Force', { fill: '#f472b6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 285, 'F ∝ spin × velocity', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    // Applications
    r.roundRect(30, 315, 340, 100, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 345, 'Real Applications', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 375, '⚾ Curveballs  ⚽ Banana kicks  🏌️ Golf slices', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 400, '🎾 Topspin serves  🏓 Spin shots', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 50, 'Bernoulli Everywhere', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#3b82f6';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 75, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 103, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 135, 350, 310, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 165, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 188, app.tagline, { fill: '#60a5fa', fontSize: 11, textAnchor: 'middle' });

    // Description (wrapped)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 215;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 48) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 16;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Physics connection
    r.roundRect(40, 320, 320, 55, 10, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 343, 'Physics Connection', { fill: '#60a5fa', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 363, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: '✓ Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 410, '✓ Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
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
      r.text(200, 50, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 75, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Scenario
      r.roundRect(25, 95, 350, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      const scenarioWords = question.scenario.split(' ');
      let scenarioLine = '';
      let scenarioY = 115;
      scenarioWords.forEach(word => {
        if ((scenarioLine + word).length > 52) {
          r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
          scenarioLine = word + ' ';
          scenarioY += 14;
        } else {
          scenarioLine += word + ' ';
        }
      });
      if (scenarioLine) r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

      // Question
      r.text(200, 185, question.question, { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 210 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 44, 8, { fill: bgColor });
        r.text(40, y + 26, `${String.fromCharCode(65 + i)}. ${option.substring(0, 48)}${option.length > 48 ? '...' : ''}`,
          { fill: isSelected ? '#60a5fa' : '#e2e8f0', fontSize: 10 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      // Navigation
      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: '← Previous', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next →', variant: 'secondary' });
      }

      // Submit button
      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      } else {
        r.text(200, 450, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 100, 280, 200, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 150, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 210, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 250, score >= 7 ? "You've mastered fluid dynamics!" : 'Keep studying!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Trophy
    r.text(200, 120, '✈️', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Fluid Dynamics Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 230, "You understand Bernoulli's Principle", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 250, 'and the Magnus Effect!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '✈️', label: 'Airplane Lift' },
      { icon: '⚾', label: 'Curveballs' },
      { icon: '💨', label: 'Venturi Effect' },
      { icon: '🚿', label: 'Shower Curtain' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 285 + Math.floor(i / 2) * 70;
      r.roundRect(x, y, 140, 55, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 22, concept.icon, { fontSize: 18, textAnchor: 'middle' });
      r.text(x + 70, y + 42, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 440, 300, 60, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 465, 'Key Formula', { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 488, 'P + (1/2)ρv² = constant', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering fluid dynamics!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      airSpeed: this.airSpeed,
      angleOfAttack: this.angleOfAttack,
      ballSpin: this.ballSpin,
      simulationMode: this.simulationMode,
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
    if (state.airSpeed !== undefined) this.airSpeed = state.airSpeed as number;
    if (state.angleOfAttack !== undefined) this.angleOfAttack = state.angleOfAttack as number;
    if (state.ballSpin !== undefined) this.ballSpin = state.ballSpin as number;
    if (state.simulationMode !== undefined) this.simulationMode = state.simulationMode as 'wing' | 'ball';
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createBernoulliGame(sessionId: string): BernoulliGame {
  return new BernoulliGame(sessionId);
}
