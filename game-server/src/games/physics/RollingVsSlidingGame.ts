import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// ROLLING VS SLIDING GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Rolling friction << Sliding friction
// f_friction = mu * N (Normal force)
// Rolling: mu ~ 0.01-0.05, Sliding: mu ~ 0.3-0.7
// Static friction > Kinetic friction
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

// PROTECTED Physics constants (never sent to client)
const FRICTION_COEFFICIENTS = {
  sliding: { smooth: 0.4, rough: 0.7 },
  rolling: { smooth: 0.02, rough: 0.05 }
};

const STATIC_FRICTION = { smooth: 0.5, rough: 0.9 };

export class RollingVsSlidingGame extends BaseGame {
  readonly gameType = 'rolling_vs_sliding';
  readonly gameTitle = 'Rolling vs Sliding: Why Wheels Changed Everything';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private motionType: 'sliding' | 'rolling' = 'sliding';
  private appliedForce = 5; // N
  private objectPosition = 0;
  private objectVelocity = 0;
  private isMoving = false;
  private hasStarted = false;
  private experimentsRun = 0;

  // Twist: static vs kinetic
  private surfaceType: 'smooth' | 'rough' = 'smooth';
  private twistForce = 0;
  private twistPosition = 0;
  private twistVelocity = 0;
  private hasBrokenFree = false;
  private twistExperimentsRun = 0;

  // Animation
  private animationTime = 0;
  private wheelRotation = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "An ancient Egyptian is tasked with moving a massive stone block.",
      question: "Why did the invention of the wheel revolutionize transportation?",
      options: ["Wheels are lighter", "Rolling friction is much less than sliding friction", "Wheels are round", "Wheels don't touch the ground"],
      correctIndex: 1,
      explanation: "Rolling friction can be 10-50x less than sliding friction, making it much easier to move heavy objects."
    },
    {
      scenario: "An engineer is comparing friction coefficients.",
      question: "What is the typical ratio of sliding to rolling friction?",
      options: ["About 2x", "About 5-10x", "About 10-50x", "About 100x"],
      correctIndex: 2,
      explanation: "Rolling friction (mu ~ 0.01-0.05) is typically 10-50x less than sliding friction (mu ~ 0.3-0.7)."
    },
    {
      scenario: "A worker is trying to start pushing a heavy crate.",
      question: "Why is it harder to START moving an object than to KEEP it moving?",
      options: ["Gravity increases initially", "Static friction > kinetic friction", "The object heats up", "Air resistance"],
      correctIndex: 1,
      explanation: "Static friction (keeping objects still) is greater than kinetic friction (objects in motion). Once you break free, it's easier to maintain motion."
    },
    {
      scenario: "A car manufacturer is designing brake systems.",
      question: "Why do ABS brakes prevent wheels from locking up?",
      options: ["Saves fuel", "Rolling friction provides better control than sliding", "Wheels last longer", "Looks better"],
      correctIndex: 1,
      explanation: "A rolling tire has better grip than a sliding one. ABS prevents lockup to maintain rolling friction and steering control."
    },
    {
      scenario: "An engineer is designing a conveyor system.",
      question: "Why do conveyor belts use rollers instead of flat surfaces?",
      options: ["Easier to build", "Rolling friction reduces energy loss", "Better appearance", "Tradition"],
      correctIndex: 1,
      explanation: "Rollers convert sliding friction to rolling friction, dramatically reducing energy needed to move objects."
    },
    {
      scenario: "A physicist is studying the friction formula f = mu * N.",
      question: "In the friction formula, what does N represent?",
      options: ["Newton force", "Normal force (perpendicular to surface)", "Net force", "Number of surfaces"],
      correctIndex: 1,
      explanation: "N is the normal force - the force perpendicular to the contact surface, typically equal to weight on flat surfaces."
    },
    {
      scenario: "A bowling alley manager is maintaining the lanes.",
      question: "Why are bowling lanes kept very smooth and oiled?",
      options: ["To increase sliding friction", "To decrease sliding friction for consistent rolls", "For appearance", "To prevent fires"],
      correctIndex: 1,
      explanation: "Smooth, oiled lanes reduce friction, allowing the ball to maintain speed and have predictable sliding/rolling behavior."
    },
    {
      scenario: "A cyclist is comparing tire pressures.",
      question: "Higher tire pressure reduces rolling resistance because:",
      options: ["Less air means less weight", "Less tire deformation means smaller contact area", "Air is lubricating", "Higher pressure inflates more"],
      correctIndex: 1,
      explanation: "Higher pressure means less tire deformation, reducing the contact area and energy lost to deforming the tire."
    },
    {
      scenario: "A mover is deciding how to transport a heavy refrigerator.",
      question: "Why do movers use furniture dollies instead of dragging?",
      options: ["Dollies are stronger", "Rolling friction allows the same force to move more weight", "Dragging makes noise", "Safety regulations"],
      correctIndex: 1,
      explanation: "With rolling friction being 10-50x less, a dolly allows the same applied force to move much heavier objects."
    },
    {
      scenario: "An engineer is designing ball bearings.",
      question: "Ball bearings reduce friction by:",
      options: ["Adding lubricant only", "Converting sliding to rolling motion", "Reducing weight", "Increasing surface area"],
      correctIndex: 1,
      explanation: "Ball bearings place rolling elements between surfaces, converting sliding friction to rolling friction, reducing friction by 10-100x."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "wheel",
      title: "Wheels & Transportation",
      tagline: "The invention that changed civilization",
      description: "Wheels convert sliding friction to rolling friction, making it 10-50x easier to move heavy loads. This enabled trade, travel, and construction at scales never before possible.",
      connection: "Rolling mu ~ 0.02 vs sliding mu ~ 0.4. For a 1000N load, rolling needs ~20N to move vs ~400N for sliding!"
    },
    {
      icon: "car",
      title: "ABS Braking Systems",
      tagline: "Safety through friction science",
      description: "ABS prevents wheel lockup during braking because a rolling tire has more grip than a sliding one. This maintains steering control and often reduces stopping distance.",
      connection: "Locked wheel (sliding): mu ~ 0.7. Rolling tire: mu ~ 0.9+ for grip. ABS keeps wheels at the threshold for maximum braking force."
    },
    {
      icon: "bearing",
      title: "Ball Bearings",
      tagline: "Reducing friction in machines",
      description: "Ball bearings place rolling elements between rotating parts, converting sliding friction to rolling friction. They're in everything from skateboards to jet engines.",
      connection: "Without bearings: sliding mu ~ 0.3. With ball bearings: effective mu ~ 0.001-0.01. Up to 100x reduction!"
    },
    {
      icon: "luggage",
      title: "Wheeled Luggage",
      tagline: "Modern travel convenience",
      description: "Wheeled luggage wasn't invented until 1970! Before that, people carried heavy bags. Adding wheels reduced the force needed to move luggage by 95%+.",
      connection: "Dragging a 20kg bag: ~80N force. Rolling the same bag: ~4N. Wheels made a 20x difference in travel comfort."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Get friction coefficient
  private getFriction(type: 'sliding' | 'rolling', surface: 'smooth' | 'rough' = 'smooth'): number {
    return FRICTION_COEFFICIENTS[type][surface];
  }

  // PROTECTED: Get static friction coefficient
  private getStaticFriction(surface: 'smooth' | 'rough'): number {
    return STATIC_FRICTION[surface];
  }

  // PROTECTED: Calculate acceleration
  private calculateAcceleration(force: number, frictionCoef: number, weight: number = 10): number {
    const frictionForce = frictionCoef * weight;
    const netForce = force - frictionForce;
    return netForce > 0 ? netForce / 1 : 0; // mass = 1kg
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
      if (input.id === 'applied_force') {
        this.appliedForce = Math.max(1, Math.min(15, input.value));
      } else if (input.id === 'twist_force') {
        this.twistForce = Math.max(0, Math.min(15, input.value));
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
        if (buttonId === 'motion_sliding') {
          this.motionType = 'sliding';
          this.resetMotion();
        } else if (buttonId === 'motion_rolling') {
          this.motionType = 'rolling';
          this.resetMotion();
        } else if (buttonId === 'start_motion') {
          this.startMotion();
        } else if (buttonId === 'reset') {
          this.resetMotion();
        } else if (buttonId === 'continue' && this.experimentsRun >= 2) {
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
        if (buttonId === 'surface_smooth') {
          this.surfaceType = 'smooth';
          this.resetTwistMotion();
        } else if (buttonId === 'surface_rough') {
          this.surfaceType = 'rough';
          this.resetTwistMotion();
        } else if (buttonId === 'apply_twist_force') {
          this.applyTwistForce();
        } else if (buttonId === 'reset_twist') {
          this.resetTwistMotion();
        } else if (buttonId === 'continue' && this.twistExperimentsRun >= 2) {
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

  private startMotion(): void {
    if (this.isMoving || this.hasStarted) return;

    const friction = this.getFriction(this.motionType);
    const weight = 10;
    const frictionForce = friction * weight;

    if (this.appliedForce <= frictionForce && this.motionType === 'sliding') {
      // Not enough force
      return;
    }

    this.isMoving = true;
    this.hasStarted = true;
    this.experimentsRun++;
  }

  private resetMotion(): void {
    this.objectPosition = 0;
    this.objectVelocity = 0;
    this.isMoving = false;
    this.hasStarted = false;
  }

  private applyTwistForce(): void {
    const staticFric = this.getStaticFriction(this.surfaceType);
    const weight = 10;
    const staticForce = staticFric * weight;

    if (this.twistForce >= staticForce && !this.hasBrokenFree) {
      this.hasBrokenFree = true;
      this.twistExperimentsRun++;
    }
  }

  private resetTwistMotion(): void {
    this.twistPosition = 0;
    this.twistVelocity = 0;
    this.hasBrokenFree = false;
    this.twistForce = 0;
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
    this.motionType = 'sliding';
    this.appliedForce = 5;
    this.objectPosition = 0;
    this.objectVelocity = 0;
    this.isMoving = false;
    this.hasStarted = false;
    this.experimentsRun = 0;
    this.surfaceType = 'smooth';
    this.twistForce = 0;
    this.twistPosition = 0;
    this.twistVelocity = 0;
    this.hasBrokenFree = false;
    this.twistExperimentsRun = 0;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Update main motion
    if (this.isMoving && this.phase === 'play') {
      const friction = this.getFriction(this.motionType);
      const accel = this.calculateAcceleration(this.appliedForce, friction);

      this.objectVelocity += accel * deltaTime;
      if (this.objectVelocity < 0) this.objectVelocity = 0;
      this.objectPosition += this.objectVelocity * deltaTime * 50;

      if (this.motionType === 'rolling') {
        this.wheelRotation += this.objectVelocity * deltaTime * 100;
      }

      if (this.objectPosition >= 250 || this.objectVelocity <= 0) {
        this.isMoving = false;
        if (this.objectPosition > 250) this.objectPosition = 250;
      }
    }

    // Update twist motion
    if (this.hasBrokenFree && this.phase === 'twist_play') {
      const kineticFric = this.getFriction('sliding', this.surfaceType);
      const accel = this.calculateAcceleration(this.twistForce, kineticFric);

      if (accel > 0) {
        this.twistVelocity += accel * deltaTime;
        this.twistPosition += this.twistVelocity * deltaTime * 50;

        if (this.twistPosition >= 250) {
          this.twistPosition = 250;
        }
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(99, 102, 241, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(16, 185, 129, 0.05)' });

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
    r.roundRect(110, 60, 180, 30, 8, { fill: 'rgba(99, 102, 241, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#6366f1', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'Rolling vs Sliding', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Why wheels changed civilization', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Illustration - Box vs Cart
    r.roundRect(40, 190, 320, 150, 12, { fill: 'rgba(30, 41, 59, 0.8)' });

    // Sliding box (left)
    r.rect(80, 260, 50, 50, { fill: '#ef4444' });
    r.text(105, 290, 'DRAG', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    // Friction lines
    r.line(70, 310, 90, 310, { stroke: '#f87171', strokeWidth: 2 });
    r.line(75, 315, 95, 315, { stroke: '#f87171', strokeWidth: 2 });

    // Rolling cart (right)
    r.rect(250, 250, 60, 35, { fill: '#10b981' });
    r.text(280, 272, 'ROLL', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    // Wheels
    r.circle(260, 300, 12, { fill: '#1f2937' });
    r.circle(300, 300, 12, { fill: '#1f2937' });

    // Ground
    r.rect(40, 320, 320, 20, { fill: '#64748b' });

    // Question
    r.roundRect(40, 360, 320, 120, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 395, 'Why did the wheel change everything?', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 420, 'The answer is friction physics!', { fill: '#6366f1', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 450, 'Rolling friction << Sliding friction', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Explore Friction', variant: 'primary' });

    r.setCoachMessage('Rolling friction can be 10-50x less than sliding friction!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'You push a heavy box and a cart', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'with the same force. Which goes farther?', { fill: '#6366f1', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'The box slides farther',
      'The cart rolls farther',
      'They travel the same distance',
      'Depends on the surface'
    ];

    options.forEach((option, i) => {
      const y = 200 + i * 65;
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
        bgColor = 'rgba(99, 102, 241, 0.3)';
      }

      r.roundRect(30, y, 340, 55, 10, { fill: bgColor });
      r.text(50, y + 32, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 13 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Correct!' : 'The cart rolls MUCH farther!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 530, 'Rolling friction is 10-50x less than sliding!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 550, 'Same force, much greater distance.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See It In Action', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Friction Lab', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Motion type selector
    r.roundRect(50, 85, 140, 40, 8, { fill: this.motionType === 'sliding' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(51, 65, 85, 0.5)' });
    r.text(120, 110, 'Sliding (Box)', { fill: this.motionType === 'sliding' ? '#f87171' : '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.addButton({ id: 'motion_sliding', label: '', variant: 'secondary' });

    r.roundRect(210, 85, 140, 40, 8, { fill: this.motionType === 'rolling' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(51, 65, 85, 0.5)' });
    r.text(280, 110, 'Rolling (Cart)', { fill: this.motionType === 'rolling' ? '#34d399' : '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.addButton({ id: 'motion_rolling', label: '', variant: 'secondary' });

    // Visualization
    r.roundRect(30, 140, 340, 180, 12, { fill: 'rgba(15, 23, 42, 0.8)' });

    // Ground
    r.rect(40, 280, 320, 30, { fill: '#64748b' });

    // Object at position
    const objX = 70 + this.objectPosition;

    if (this.motionType === 'sliding') {
      // Box
      r.rect(objX - 25, 230, 50, 50, { fill: '#ef4444' });
      r.text(objX, 260, 'BOX', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

      // Friction lines (more for sliding)
      if (this.objectPosition > 0) {
        r.line(objX - 30, 278, objX - 10, 278, { stroke: '#f87171', strokeWidth: 2 });
        r.line(objX - 25, 282, objX - 5, 282, { stroke: '#f87171', strokeWidth: 2 });
      }
    } else {
      // Cart
      r.rect(objX - 30, 225, 60, 35, { fill: '#10b981' });
      r.text(objX, 247, 'CART', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

      // Wheels
      r.circle(objX - 18, 270, 10, { fill: '#1f2937' });
      r.circle(objX + 18, 270, 10, { fill: '#1f2937' });

      // Wheel rotation indicators
      const rot = this.wheelRotation;
      r.line(objX - 18, 262, objX - 18, 278, { stroke: '#ffffff', strokeWidth: 2 });
      r.line(objX + 18, 262, objX + 18, 278, { stroke: '#ffffff', strokeWidth: 2 });
    }

    // Applied force arrow
    if (!this.hasStarted) {
      r.line(30, 255, 60, 255, { stroke: '#6366f1', strokeWidth: 3 });
      r.polygon([[60, 255], [52, 250], [52, 260]], { fill: '#6366f1' });
      r.text(45, 245, `${this.appliedForce}N`, { fill: '#6366f1', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Friction coefficient display
    const friction = this.getFriction(this.motionType);
    r.roundRect(270, 145, 90, 50, 8, { fill: 'rgba(30, 41, 59, 0.7)' });
    r.text(315, 165, 'Friction mu', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(315, 185, friction.toFixed(3), { fill: this.motionType === 'sliding' ? '#f87171' : '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Distance display
    r.roundRect(40, 145, 90, 50, 8, { fill: 'rgba(30, 41, 59, 0.7)' });
    r.text(85, 165, 'Distance', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(85, 185, `${this.objectPosition.toFixed(0)} units`, { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Slider
    r.addSlider({
      id: 'applied_force',
      label: 'Applied Force (N)',
      min: 1,
      max: 15,
      step: 1,
      value: this.appliedForce
    });

    // Buttons
    if (!this.hasStarted) {
      r.addButton({ id: 'start_motion', label: 'Push!', variant: 'primary' });
    } else if (!this.isMoving) {
      r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
    }

    if (this.experimentsRun >= 2) {
      r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'primary' });
    } else {
      r.text(200, 480, `Try both types! (${this.experimentsRun}/2)`, { fill: '#f59e0b', fontSize: 11, textAnchor: 'middle' });
    }

    r.setCoachMessage(this.motionType === 'sliding' ? 'Sliding friction is high - needs more force!' : 'Rolling friction is very low - watch it go!');
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Science of Friction', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Friction formula
    r.roundRect(30, 85, 340, 100, 16, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 115, 'Friction Force', { fill: '#6366f1', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(70, 130, 260, 35, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 155, 'f = mu * N', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    // Comparison
    r.roundRect(25, 200, 170, 120, 12, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(110, 230, 'Sliding Friction', { fill: '#f87171', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 260, 'mu = 0.3 - 0.7', { fill: '#fca5a5', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 285, 'HIGH resistance', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 300, 'Surface contact', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(205, 200, 170, 120, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(290, 230, 'Rolling Friction', { fill: '#34d399', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 260, 'mu = 0.01 - 0.05', { fill: '#86efac', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 285, 'LOW resistance', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 300, 'Point contact', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 340, 340, 100, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 370, 'Key Insight', { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 400, 'Rolling friction is 10-50x LESS than sliding!', { fill: '#fef08a', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 425, 'This is why wheels revolutionized transportation.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Static vs Kinetic', variant: 'secondary' });

    r.setCoachMessage("Now let's see another friction secret...");
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist: Static vs Kinetic', { fill: '#a855f7', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, "You're pushing a heavy box that won't budge.", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'You push harder... and it suddenly moves!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 178, 'What happened?', { fill: '#a855f7', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'The box got lighter',
      'You overcame static friction (higher)',
      'The floor became slippery',
      'Momentum built up'
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (i === 1) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.twistPrediction) {
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 1 ? 'Exactly right!' : 'You overcame STATIC friction!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 530, 'Static friction > Kinetic friction', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 550, 'Harder to START than to KEEP moving!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test Static vs Kinetic', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Static vs Kinetic Friction', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Surface type selector
    r.roundRect(50, 85, 140, 40, 8, { fill: this.surfaceType === 'smooth' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(51, 65, 85, 0.5)' });
    r.text(120, 110, 'Smooth Surface', { fill: this.surfaceType === 'smooth' ? '#60a5fa' : '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.addButton({ id: 'surface_smooth', label: '', variant: 'secondary' });

    r.roundRect(210, 85, 140, 40, 8, { fill: this.surfaceType === 'rough' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(51, 65, 85, 0.5)' });
    r.text(280, 110, 'Rough Surface', { fill: this.surfaceType === 'rough' ? '#fbbf24' : '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.addButton({ id: 'surface_rough', label: '', variant: 'secondary' });

    // Visualization
    r.roundRect(30, 140, 340, 160, 12, { fill: 'rgba(15, 23, 42, 0.8)' });

    // Ground with surface texture
    const groundColor = this.surfaceType === 'smooth' ? '#64748b' : '#78716c';
    r.rect(40, 260, 320, 30, { fill: groundColor });

    // Box at position
    const boxX = 70 + this.twistPosition;
    r.rect(boxX - 25, 210, 50, 50, { fill: this.hasBrokenFree ? '#10b981' : '#ef4444' });
    r.text(boxX, 240, 'BOX', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    // Force arrow
    const arrowLength = this.twistForce * 3;
    r.line(30, 235, 30 + arrowLength, 235, { stroke: '#6366f1', strokeWidth: 3 });
    if (arrowLength > 5) {
      r.polygon([[30 + arrowLength, 235], [25 + arrowLength, 230], [25 + arrowLength, 240]], { fill: '#6366f1' });
    }

    // Friction thresholds
    const staticThreshold = this.getStaticFriction(this.surfaceType) * 10;
    const kineticThreshold = this.getFriction('sliding', this.surfaceType) * 10;

    r.roundRect(250, 145, 110, 80, 8, { fill: 'rgba(30, 41, 59, 0.7)' });
    r.text(305, 165, 'Friction Thresholds', { fill: '#94a3b8', fontSize: 8, textAnchor: 'middle' });
    r.text(305, 185, `Static: ${staticThreshold.toFixed(1)}N`, { fill: '#f87171', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(305, 205, `Kinetic: ${kineticThreshold.toFixed(1)}N`, { fill: '#34d399', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    // Status
    if (!this.hasBrokenFree) {
      const forceNeeded = staticThreshold - this.twistForce;
      if (forceNeeded > 0) {
        r.text(200, 155, `Need ${forceNeeded.toFixed(1)}N more to break free!`, { fill: '#f87171', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      r.text(200, 155, 'Moving! Kinetic friction now lower!', { fill: '#34d399', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Force slider
    r.addSlider({
      id: 'twist_force',
      label: 'Applied Force (N)',
      min: 0,
      max: 15,
      step: 0.5,
      value: this.twistForce
    });

    // Buttons
    if (!this.hasBrokenFree) {
      r.addButton({ id: 'apply_twist_force', label: 'Apply Force', variant: 'primary' });
    } else {
      r.addButton({ id: 'reset_twist', label: 'Reset', variant: 'secondary' });
    }

    if (this.twistExperimentsRun >= 2) {
      r.addButton({ id: 'continue', label: 'Full Explanation', variant: 'primary' });
    } else {
      r.text(200, 480, `Try both surfaces! (${this.twistExperimentsRun}/2)`, { fill: '#f59e0b', fontSize: 11, textAnchor: 'middle' });
    }
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Static vs Kinetic Friction', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Comparison
    r.roundRect(25, 85, 170, 150, 12, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(110, 115, 'Static Friction', { fill: '#f87171', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 145, 'mu_s ~ 0.5 - 0.9', { fill: '#fca5a5', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 175, 'Keeps objects still', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 195, 'Must overcome to start', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 215, 'HIGHER force needed', { fill: '#f87171', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(205, 85, 170, 150, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(290, 115, 'Kinetic Friction', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 145, 'mu_k ~ 0.3 - 0.7', { fill: '#86efac', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 175, 'Objects already moving', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 195, 'Opposes continued motion', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 215, 'LOWER force needed', { fill: '#34d399', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 255, 340, 100, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 285, 'Key Insight', { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 315, 'static friction > kinetic friction', { fill: '#fef08a', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 340, 'Harder to START than to KEEP moving!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Real world
    r.roundRect(40, 375, 320, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 400, 'Real-World Example', { fill: '#a855f7', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 425, 'ABS brakes keep wheels rolling (not sliding)', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 442, 'because rolling has better grip than sliding!', { fill: '#c4b5fd', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    const appLabels = ['Wheels', 'ABS', 'Bearings', 'Luggage'];

    appLabels.forEach((label, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#6366f1';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 50, 8, { fill: bgColor });
      r.text(x + 40, 100, label, { fill: '#ffffff', fontSize: 10, textAnchor: 'middle' });
      if (isCompleted) r.text(x + 40, 118, '(done)', { fill: '#34d399', fontSize: 8, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 145, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 180, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 205, app.tagline, { fill: '#6366f1', fontSize: 11, textAnchor: 'middle' });

    // Description (multi-line)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 235;
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

    // Physics connection
    r.roundRect(40, 330, 320, 70, 10, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 355, 'Physics Connection', { fill: '#6366f1', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 380, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 420, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 460, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Scenario
      r.roundRect(25, 100, 350, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      const scenarioWords = question.scenario.split(' ');
      let scenarioLine = '';
      let scenarioY = 120;
      scenarioWords.forEach(word => {
        if ((scenarioLine + word).length > 48) {
          r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
          scenarioLine = word + ' ';
          scenarioY += 16;
        } else {
          scenarioLine += word + ' ';
        }
      });
      if (scenarioLine) r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      // Question
      r.text(200, 195, question.question, { fill: '#6366f1', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 220 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        const displayOption = option.length > 42 ? option.substring(0, 42) + '...' : option;
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${displayOption}`, { fill: isSelected ? '#6366f1' : '#e2e8f0', fontSize: 11 });

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
        r.text(200, 480, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? 'Excellent!' : 'Keep Learning!', { fill: score >= 7 ? '#34d399' : '#fbbf24', fontSize: 24, textAnchor: 'middle' });
      r.text(200, 180, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "You've mastered friction physics!" : 'Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 160, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts:', { fill: '#6366f1', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'f = mu * N (friction formula)',
        'Rolling friction << Sliding friction',
        'Static friction > Kinetic friction',
        'Wheels revolutionized transportation'
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
    r.text(200, 120, 'MASTERY', { fill: '#fbbf24', fontSize: 48, fontWeight: 'bold', textAnchor: 'middle' });

    // Title
    r.text(200, 180, 'Friction Physics Expert!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 210, 'You understand why wheels', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 232, 'changed civilization!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { label: 'f = mu * N', color: '#6366f1' },
      { label: 'Rolling << Sliding', color: '#10b981' },
      { label: 'Static > Kinetic', color: '#ef4444' },
      { label: 'Applications', color: '#fbbf24' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 270 + Math.floor(i / 2) * 70;
      r.roundRect(x, y, 140, 55, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 35, concept.label, { fill: concept.color, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 430, 300, 80, 12, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 458, 'Key Comparisons', { fill: '#6366f1', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 480, 'mu_rolling ~ 0.02 vs mu_sliding ~ 0.4', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 500, 'mu_static > mu_kinetic', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering friction physics!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      motionType: this.motionType,
      appliedForce: this.appliedForce,
      objectPosition: this.objectPosition,
      objectVelocity: this.objectVelocity,
      isMoving: this.isMoving,
      hasStarted: this.hasStarted,
      experimentsRun: this.experimentsRun,
      surfaceType: this.surfaceType,
      twistForce: this.twistForce,
      twistPosition: this.twistPosition,
      twistVelocity: this.twistVelocity,
      hasBrokenFree: this.hasBrokenFree,
      twistExperimentsRun: this.twistExperimentsRun,
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
    if (state.motionType !== undefined) this.motionType = state.motionType as 'sliding' | 'rolling';
    if (state.appliedForce !== undefined) this.appliedForce = state.appliedForce as number;
    if (state.objectPosition !== undefined) this.objectPosition = state.objectPosition as number;
    if (state.objectVelocity !== undefined) this.objectVelocity = state.objectVelocity as number;
    if (state.isMoving !== undefined) this.isMoving = state.isMoving as boolean;
    if (state.hasStarted !== undefined) this.hasStarted = state.hasStarted as boolean;
    if (state.experimentsRun !== undefined) this.experimentsRun = state.experimentsRun as number;
    if (state.surfaceType !== undefined) this.surfaceType = state.surfaceType as 'smooth' | 'rough';
    if (state.twistForce !== undefined) this.twistForce = state.twistForce as number;
    if (state.twistPosition !== undefined) this.twistPosition = state.twistPosition as number;
    if (state.twistVelocity !== undefined) this.twistVelocity = state.twistVelocity as number;
    if (state.hasBrokenFree !== undefined) this.hasBrokenFree = state.hasBrokenFree as boolean;
    if (state.twistExperimentsRun !== undefined) this.twistExperimentsRun = state.twistExperimentsRun as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createRollingVsSlidingGame(sessionId: string): RollingVsSlidingGame {
  return new RollingVsSlidingGame(sessionId);
}
