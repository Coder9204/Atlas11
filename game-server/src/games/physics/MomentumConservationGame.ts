import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// MOMENTUM CONSERVATION GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: p = m * v (momentum = mass x velocity)
// Conservation: p_total = constant (in absence of external forces)
// Two carts with compressed spring: m1*v1 + m2*v2 = 0 initially
// After release: m1*v1 = -m2*v2 (equal and opposite momenta)
// Lighter cart moves faster: v_light = (m_heavy/m_light) * v_heavy
// ============================================================================

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number; // PROTECTED: Never sent to client
  explanation: string;
}

interface TransferApp {
  id: string;
  title: string;
  description: string;
  formula: string;
  stat: string;
  color: string;
}

// Physics constants (PROTECTED - calculations done server-side only)
const SPRING_IMPULSE = 10; // kg*m/s
const FRICTION_SMOOTH = 0.001;
const FRICTION_CARPET = 0.015;

export class MomentumConservationGame extends BaseGame {
  readonly gameType = 'momentum_conservation';
  readonly gameTitle = 'Momentum Conservation: The Push-Off Puzzle';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation state
  private massLeft = 1;
  private massRight = 2;
  private hasFriction = false;
  private isCompressed = true;
  private isAnimating = false;
  private leftPos = 0;
  private rightPos = 0;
  private leftVel = 0;
  private rightVel = 0;
  private experimentCount = 0;
  private animationTime = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private showExplanation = false;
  private answeredQuestions: Set<number> = new Set();
  private correctAnswers = 0;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      question: "Two carts push off each other. If cart A is heavier, which cart moves faster?",
      options: [
        "Cart A (heavier)",
        "Cart B (lighter)",
        "Both same speed",
        "Neither moves"
      ],
      correctIndex: 1,
      explanation: "The lighter cart moves faster. Since momentum is conserved and starts at zero, m1*v1 = m2*v2. The lighter cart needs higher velocity to match the heavier cart's momentum."
    },
    {
      question: "What is the total momentum before and after two stationary carts push off?",
      options: [
        "Increases after",
        "Decreases after",
        "Zero both times",
        "Depends on masses"
      ],
      correctIndex: 2,
      explanation: "Total momentum is conserved. Starting at rest = zero momentum. After pushing, momenta are equal and opposite, still summing to zero."
    },
    {
      question: "If a 1kg cart and 3kg cart push off, and the 1kg cart moves at 6 m/s, how fast is the 3kg cart?",
      options: [
        "6 m/s",
        "2 m/s",
        "18 m/s",
        "3 m/s"
      ],
      correctIndex: 1,
      explanation: "Using p1 = p2: 1kg x 6m/s = 3kg x v2, so v2 = 2 m/s. The heavier cart moves slower."
    },
    {
      question: "Why doesn't total momentum equal zero on carpet (with friction)?",
      options: [
        "Friction creates momentum",
        "Momentum transfers to Earth",
        "Carts are heavier",
        "Momentum is destroyed"
      ],
      correctIndex: 1,
      explanation: "Friction transfers momentum to Earth. The Earth-cart system still conserves momentum, but Earth's huge mass means it doesn't noticeably move."
    },
    {
      question: "Two ice skaters push off each other. What happens?",
      options: [
        "Only lighter one moves",
        "Only heavier one moves",
        "Both move opposite ways",
        "Neither moves on ice"
      ],
      correctIndex: 2,
      explanation: "Both skaters move in opposite directions. The lighter skater moves faster, but both acquire equal and opposite momenta."
    },
    {
      question: "Momentum is calculated as:",
      options: [
        "mass x acceleration",
        "mass x velocity",
        "force x time",
        "mass x distance"
      ],
      correctIndex: 1,
      explanation: "Momentum (p) equals mass times velocity: p = mv. It's a vector quantity with both magnitude and direction."
    },
    {
      question: "A gun recoils when fired. This demonstrates:",
      options: [
        "Energy conservation",
        "Momentum conservation",
        "Mass conservation",
        "Friction effects"
      ],
      correctIndex: 1,
      explanation: "Gun recoil demonstrates momentum conservation. The bullet gains forward momentum, so the gun gains equal backward momentum."
    },
    {
      question: "If you double both masses but keep the spring the same, what happens to velocities?",
      options: [
        "Both double",
        "Both halve",
        "Stay the same",
        "One doubles, one halves"
      ],
      correctIndex: 1,
      explanation: "Same spring impulse but doubled masses means both velocities halve. Total momentum of each cart stays similar, but v = p/m means lower velocity."
    },
    {
      question: "Why is momentum a vector quantity?",
      options: [
        "Only has magnitude",
        "Has magnitude and direction",
        "Always positive",
        "Doesn't change"
      ],
      correctIndex: 1,
      explanation: "Momentum is a vector because it has both magnitude (how much) and direction (which way). Opposite momenta cancel in the sum."
    },
    {
      question: "In space, an astronaut throws a tool. What happens?",
      options: [
        "Only tool moves",
        "Both move opposite ways",
        "Neither moves in space",
        "Astronaut moves faster"
      ],
      correctIndex: 1,
      explanation: "Both move in opposite directions due to momentum conservation. The lighter tool moves faster than the heavier astronaut."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      id: 'rocket',
      title: "Rocket Propulsion",
      description: "Rockets expel exhaust gases backward at high speed, gaining forward momentum. Newton's third law in action!",
      formula: "F = dp/dt = m_dot x v_e",
      stat: "Saturn V thrust: 35 million N",
      color: '#f97316'
    },
    {
      id: 'skating',
      title: "Ice Skating Pairs",
      description: "When skaters push off each other, the lighter skater moves faster. Choreographers use this for dramatic separations.",
      formula: "m1*v1 = m2*v2",
      stat: "Push-off speeds: 2-5 m/s",
      color: '#3b82f6'
    },
    {
      id: 'cradle',
      title: "Newton's Cradle",
      description: "Momentum transfers through the balls via elastic collisions. Lift one ball, and one ball swings out the other side.",
      formula: "p_before = p_after",
      stat: "~95% momentum transfer",
      color: '#22c55e'
    },
    {
      id: 'billiards',
      title: "Billiard Physics",
      description: "When the cue ball strikes another ball, momentum transfers. A direct hit can transfer nearly all momentum.",
      formula: "m1*v1 = m2*v2 + losses",
      stat: "Cue ball: 170g at 10 m/s",
      color: '#a855f7'
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate cart physics
  private calculateCartPhysics(): void {
    if (!this.isAnimating) return;

    const friction = this.hasFriction ? FRICTION_CARPET : FRICTION_SMOOTH;

    // Apply friction
    this.leftVel *= (1 - friction);
    this.rightVel *= (1 - friction);

    // Update positions
    this.leftPos += this.leftVel * 0.5;
    this.rightPos += this.rightVel * 0.5;

    // Check if animation should stop
    if (Math.abs(this.leftVel) < 0.05 && Math.abs(this.rightVel) < 0.05) {
      this.isAnimating = false;
      this.experimentCount++;
    }
  }

  // PROTECTED: Start cart animation
  private releaseCarts(): void {
    if (this.isAnimating || !this.isCompressed) return;

    this.isAnimating = true;
    this.isCompressed = false;

    // Calculate initial velocities based on momentum conservation
    // Spring gives equal and opposite impulse to both carts
    // m1*v1 = -m2*v2 and impulse J = m1*v1 = m2*v2 = SPRING_IMPULSE
    this.leftVel = -SPRING_IMPULSE / this.massLeft;
    this.rightVel = SPRING_IMPULSE / this.massRight;
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
        if (buttonId === 'find_out') {
          this.phase = 'predict';
        }
        break;

      case 'predict':
        if (!this.showPredictionFeedback) {
          if (buttonId === 'heavy' || buttonId === 'light' || buttonId === 'same') {
            this.prediction = buttonId;
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
        }
        break;

      case 'play':
        if (buttonId.startsWith('mass_left_')) {
          this.massLeft = parseInt(buttonId.split('_')[2]);
          this.resetExperiment();
        } else if (buttonId.startsWith('mass_right_')) {
          this.massRight = parseInt(buttonId.split('_')[2]);
          this.resetExperiment();
        } else if (buttonId === 'release') {
          this.releaseCarts();
        } else if (buttonId === 'reset') {
          this.resetExperiment();
        } else if (buttonId === 'continue' && this.experimentCount >= 2) {
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
          if (buttonId === 'still_conserved' || buttonId === 'not_conserved' || buttonId === 'more_momentum') {
            this.twistPrediction = buttonId;
            this.showTwistFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.hasFriction = true;
          this.resetExperiment();
          this.phase = 'twist_play';
          this.showTwistFeedback = false;
        }
        break;

      case 'twist_play':
        if (buttonId === 'smooth') {
          this.hasFriction = false;
          this.resetExperiment();
        } else if (buttonId === 'carpet') {
          this.hasFriction = true;
          this.resetExperiment();
        } else if (buttonId === 'release') {
          this.releaseCarts();
        } else if (buttonId === 'reset') {
          this.resetExperiment();
        } else if (buttonId === 'continue' && this.experimentCount >= 4) {
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
        if (!this.showTestResults) {
          if (buttonId.startsWith('answer_')) {
            const answerIndex = parseInt(buttonId.split('_')[1]);
            if (!this.answeredQuestions.has(this.currentQuestionIndex)) {
              this.testAnswers[this.currentQuestionIndex] = answerIndex;
              this.showExplanation = true;
              this.answeredQuestions.add(this.currentQuestionIndex);
              if (this.checkAnswer(this.currentQuestionIndex, answerIndex)) {
                this.correctAnswers++;
              }
            }
          } else if (buttonId === 'next_question' && this.currentQuestionIndex < 9) {
            this.currentQuestionIndex++;
            this.showExplanation = this.answeredQuestions.has(this.currentQuestionIndex);
          } else if (buttonId === 'prev_question' && this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.showExplanation = this.answeredQuestions.has(this.currentQuestionIndex);
          } else if (buttonId === 'complete' && this.answeredQuestions.size === 10) {
            this.showTestResults = true;
          }
        } else {
          if (buttonId === 'continue') {
            if (this.correctAnswers >= 7) {
              this.phase = 'mastery';
            } else {
              this.showTestResults = false;
              this.testAnswers = Array(10).fill(-1);
              this.currentQuestionIndex = 0;
              this.answeredQuestions.clear();
              this.correctAnswers = 0;
              this.showExplanation = false;
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

  private resetExperiment(): void {
    this.isCompressed = true;
    this.isAnimating = false;
    this.leftPos = 0;
    this.rightPos = 0;
    this.leftVel = 0;
    this.rightVel = 0;
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
    this.massLeft = 1;
    this.massRight = 2;
    this.hasFriction = false;
    this.resetExperiment();
    this.experimentCount = 0;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.showExplanation = false;
    this.answeredQuestions.clear();
    this.correctAnswers = 0;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    if (this.isAnimating) {
      this.calculateCartPhysics();
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(59, 130, 246, 0.03)' });
    r.circle(300, 600, 150, { fill: 'rgba(249, 115, 22, 0.03)' });

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

  private renderCartVisualization(r: CommandRenderer, yOffset: number = 100): void {
    const trackY = yOffset + 60;
    const centerX = 200;
    const cartWidth = 56;
    const cartHeight = 38;
    const leftCartX = centerX - 70 + this.leftPos * 3;
    const rightCartX = centerX + 14 + this.rightPos * 3;

    // Track
    const trackColor = this.hasFriction ? '#a07a55' : '#4a4a5e';
    r.roundRect(24, trackY + cartHeight + 8, 352, 14, 3, { fill: trackColor });
    r.text(368, trackY + cartHeight + 38, this.hasFriction ? 'Carpet (friction)' : 'Frictionless track', { fill: '#64748b', fontSize: 9, textAnchor: 'end' });

    // Spring
    if (this.isCompressed) {
      const springPath = 'M0,0 L3,-6 L6,6 L9,-6 L12,6 L15,-6 L18,6 L21,-6 L24,0';
      r.roundRect(leftCartX + cartWidth + 2, trackY + cartHeight/2 - 4, 26, 8, 2, { fill: '#22c55e' });
    }

    // Left cart (blue)
    r.roundRect(leftCartX, trackY, cartWidth, cartHeight, 6, { fill: '#3b82f6' });
    r.text(leftCartX + cartWidth/2, trackY + cartHeight/2 + 6, `${this.massLeft} kg`, { fill: '#ffffff', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.circle(leftCartX + 14, trackY + cartHeight + 5, 7, { fill: '#1a1a25' });
    r.circle(leftCartX + cartWidth - 14, trackY + cartHeight + 5, 7, { fill: '#1a1a25' });

    // Right cart (orange)
    r.roundRect(rightCartX, trackY, cartWidth, cartHeight, 6, { fill: '#f97316' });
    r.text(rightCartX + cartWidth/2, trackY + cartHeight/2 + 6, `${this.massRight} kg`, { fill: '#ffffff', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.circle(rightCartX + 14, trackY + cartHeight + 5, 7, { fill: '#1a1a25' });
    r.circle(rightCartX + cartWidth - 14, trackY + cartHeight + 5, 7, { fill: '#1a1a25' });

    // Velocity arrows (when moving)
    if (!this.isCompressed && Math.abs(this.leftVel) > 0.1) {
      const arrowLen = Math.min(40, Math.abs(this.leftVel) * 6);
      r.line(leftCartX + cartWidth/2, trackY - 15, leftCartX + cartWidth/2 + (this.leftVel > 0 ? arrowLen : -arrowLen), trackY - 15, { stroke: '#3b82f6', strokeWidth: 3 });
      r.text(leftCartX + cartWidth/2, trackY - 25, `v = ${Math.abs(this.leftVel).toFixed(1)}`, { fill: '#3b82f6', fontSize: 10, textAnchor: 'middle' });
    }
    if (!this.isCompressed && Math.abs(this.rightVel) > 0.1) {
      const arrowLen = Math.min(40, Math.abs(this.rightVel) * 6);
      r.line(rightCartX + cartWidth/2, trackY - 15, rightCartX + cartWidth/2 + (this.rightVel > 0 ? arrowLen : -arrowLen), trackY - 15, { stroke: '#f97316', strokeWidth: 3 });
      r.text(rightCartX + cartWidth/2, trackY - 25, `v = ${Math.abs(this.rightVel).toFixed(1)}`, { fill: '#f97316', fontSize: 10, textAnchor: 'middle' });
    }

    // Momentum display
    const momentumLeft = this.massLeft * this.leftVel;
    const momentumRight = this.massRight * this.rightVel;
    const totalMomentum = momentumLeft + momentumRight;

    r.text(20, yOffset + 160, 'Momentum (p = mv)', { fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' });
    r.roundRect(20, yOffset + 168, 100, 8, 4, { fill: '#1e293b' });
    r.roundRect(70 - Math.min(50, Math.abs(momentumLeft) * 3), yOffset + 168, Math.min(50, Math.abs(momentumLeft) * 3), 8, 4, { fill: '#3b82f6' });
    r.text(130, yOffset + 176, `p1 = ${momentumLeft.toFixed(1)}`, { fill: '#3b82f6', fontSize: 10 });

    r.roundRect(180, yOffset + 168, 100, 8, 4, { fill: '#1e293b' });
    r.roundRect(230, yOffset + 168, Math.min(50, Math.abs(momentumRight) * 3), 8, 4, { fill: '#f97316' });
    r.text(290, yOffset + 176, `p2 = ${momentumRight.toFixed(1)}`, { fill: '#f97316', fontSize: 10 });

    // Total momentum badge
    const totalColor = Math.abs(totalMomentum) < 0.5 ? '#22c55e' : '#f1f5f9';
    r.roundRect(310, yOffset + 10, 75, 32, 8, { fill: Math.abs(totalMomentum) < 0.5 ? 'rgba(34,197,94,0.15)' : '#1e293b' });
    r.text(347, yOffset + 22, 'Sp', { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });
    r.text(347, yOffset + 35, totalMomentum.toFixed(1), { fill: totalColor, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
  }

  private renderHook(r: CommandRenderer): void {
    // Badge
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(59, 130, 246, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#3b82f6', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'Momentum Conservation', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Two carts, one compressed spring...', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Cart icons
    r.text(200, 250, '🛒💥🛒', { fontSize: 48, textAnchor: 'middle' });

    // Question card
    r.roundRect(40, 310, 320, 120, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 350, '"If one cart is heavier,', { fill: '#cbd5e1', fontSize: 16, textAnchor: 'middle' });
    r.text(200, 380, 'which one moves faster', { fill: '#cbd5e1', fontSize: 16, textAnchor: 'middle' });
    r.text(200, 410, 'after they push off?"', { fill: '#3b82f6', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA Button
    r.addButton({ id: 'find_out', label: "Let's Find Out", variant: 'primary' });

    r.setCoachMessage('Explore the physics of momentum conservation!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 100, 'A 1kg cart and 2kg cart push off. Which moves faster?', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'heavy', label: 'The heavy cart (2kg) moves faster', icon: '🏋️' },
      { id: 'light', label: 'The light cart (1kg) moves faster', icon: '🪶' },
      { id: 'same', label: 'Both move at the same speed', icon: '⚖️' }
    ];

    options.forEach((option, i) => {
      const y = 140 + i * 70;
      let bgColor = 'rgba(51, 65, 85, 0.5)';

      if (this.showPredictionFeedback) {
        if (option.id === 'light') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
        } else if (option.id === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
        }
      } else if (option.id === this.prediction) {
        bgColor = 'rgba(59, 130, 246, 0.3)';
      }

      r.roundRect(40, y, 320, 60, 12, { fill: bgColor });
      r.text(70, y + 35, option.icon, { fontSize: 24, textAnchor: 'middle' });
      r.text(95, y + 38, option.label, { fill: '#e2e8f0', fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: option.id, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(40, 380, 320, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const isCorrect = this.prediction === 'light';
      r.text(200, 410, isCorrect ? 'Correct! The lighter cart moves faster!' : 'Not quite! The lighter cart moves faster.', { fill: isCorrect ? '#34d399' : '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 440, 'Momentum conservation: m1*v1 = m2*v2', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 460, 'Smaller mass needs higher velocity!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test It!', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Momentum Lab', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Cart visualization
    r.roundRect(15, 75, 370, 130, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    this.renderCartVisualization(r, 80);

    // Mass controls
    r.text(70, 235, 'Left:', { fill: '#3b82f6', fontSize: 11, fontWeight: 'bold' });
    for (let m = 1; m <= 3; m++) {
      const x = 100 + (m - 1) * 35;
      const isSelected = this.massLeft === m;
      r.circle(x, 235, 14, { fill: isSelected ? '#3b82f6' : '#374151' });
      r.text(x, 239, `${m}`, { fill: '#ffffff', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
      r.addButton({ id: `mass_left_${m}`, label: '', variant: 'secondary' });
    }

    r.text(230, 235, 'Right:', { fill: '#f97316', fontSize: 11, fontWeight: 'bold' });
    for (let m = 1; m <= 3; m++) {
      const x = 265 + (m - 1) * 35;
      const isSelected = this.massRight === m;
      r.circle(x, 235, 14, { fill: isSelected ? '#f97316' : '#374151' });
      r.text(x, 239, `${m}`, { fill: '#ffffff', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
      r.addButton({ id: `mass_right_${m}`, label: '', variant: 'secondary' });
    }

    // Control buttons
    if (this.isCompressed) {
      r.addButton({ id: 'release', label: 'Release Spring', variant: 'primary' });
    } else {
      r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
    }

    r.text(200, 310, `Experiments: ${this.experimentCount}`, { fill: '#6b7280', fontSize: 11, textAnchor: 'middle' });

    if (this.experimentCount >= 2) {
      r.addButton({ id: 'continue', label: 'I see the pattern', variant: 'primary' });
    }
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'Momentum Conservation!', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Main formula
    r.roundRect(40, 85, 320, 80, 16, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 115, 'Total momentum before = Total momentum after', { fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 145, 'm1*v1 + m2*v2 = 0', { fill: '#ffffff', fontSize: 18, textAnchor: 'middle' });

    // Key insight
    r.roundRect(40, 180, 320, 80, 12, { fill: 'rgba(59, 130, 246, 0.15)' });
    r.text(200, 205, 'Key Insight', { fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 230, 'Starting at rest = zero total momentum.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 248, 'After the push, momenta are equal and opposite.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // The math
    r.roundRect(40, 275, 320, 70, 12, { fill: 'rgba(249, 115, 22, 0.15)' });
    r.text(200, 300, 'The Math', { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 325, 'If m1 = 1kg and m2 = 2kg, then v1 = 2 x v2', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Prediction result
    const resultText = this.prediction === 'light' ? '✅ Correct!' : '🤔 Now you know!';
    r.text(200, 370, `Your prediction: ${resultText}`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'What About Friction?', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Plot Twist: Add Friction!', { fill: '#f59e0b', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 90, 'What if we put the carts on carpet instead?', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'still_conserved', label: 'Momentum still conserved perfectly' },
      { id: 'not_conserved', label: "Momentum appears to be 'lost'" },
      { id: 'more_momentum', label: 'Friction creates more momentum' }
    ];

    options.forEach((option, i) => {
      const y = 130 + i * 65;
      let bgColor = 'rgba(51, 65, 85, 0.5)';

      if (this.showTwistFeedback) {
        if (option.id === 'not_conserved') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
        } else if (option.id === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
        }
      } else if (option.id === this.twistPrediction) {
        bgColor = 'rgba(245, 158, 11, 0.3)';
      }

      r.roundRect(40, y, 320, 55, 10, { fill: bgColor });
      r.text(200, y + 32, option.label, { fill: '#e2e8f0', fontSize: 12, textAnchor: 'middle' });

      if (!this.showTwistFeedback) {
        r.addButton({ id: option.id, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(40, 340, 320, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const isCorrect = this.twistPrediction === 'not_conserved';
      r.text(200, 370, isCorrect ? 'Correct!' : 'Not quite!', { fill: isCorrect ? '#34d399' : '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 400, "Momentum transfers to Earth via friction.", { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 420, "Earth moves, but it's too massive to notice!", { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test With Carpet', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Friction Experiment', { fill: '#f59e0b', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Cart visualization
    r.roundRect(15, 75, 370, 130, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    this.renderCartVisualization(r, 80);

    // Surface toggle
    r.addButton({ id: 'smooth', label: 'Smooth', variant: this.hasFriction ? 'secondary' : 'primary' });
    r.addButton({ id: 'carpet', label: 'Carpet', variant: this.hasFriction ? 'primary' : 'secondary' });

    // Control buttons
    if (this.isCompressed) {
      r.addButton({ id: 'release', label: 'Release', variant: 'primary' });
    } else {
      r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
    }

    r.text(200, 320, 'Compare smooth vs carpet!', { fill: '#6b7280', fontSize: 11, textAnchor: 'middle' });

    if (this.experimentCount >= 4) {
      r.addButton({ id: 'continue', label: 'I understand', variant: 'primary' });
    }
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Friction & Momentum', { fill: '#f59e0b', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Main insight
    r.roundRect(40, 85, 320, 80, 16, { fill: 'rgba(245, 158, 11, 0.2)' });
    r.text(200, 115, "Momentum isn't destroyed - it's transferred!", { fill: '#f59e0b', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 140, 'Friction transfers momentum to the Earth.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Comparison
    r.roundRect(40, 180, 320, 80, 12, { fill: 'rgba(59, 130, 246, 0.15)' });
    r.text(200, 205, 'Smooth track: Momentum stays in carts', { fill: '#22c55e', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 235, 'Carpet: Momentum leaks to Earth via friction', { fill: '#f59e0b', fontSize: 11, textAnchor: 'middle' });

    // Prediction result
    const resultText = this.twistPrediction === 'not_conserved' ? '✅ Correct!' : '🤔 Now you understand!';
    r.text(200, 290, `Your prediction: ${resultText}`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Real Examples', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Progress dots
    this.transferApps.forEach((_, i) => {
      const color = this.completedApps.has(i) ? '#10b981' : i === this.activeAppIndex ? '#3b82f6' : '#374151';
      r.circle(150 + i * 35, 85, 6, { fill: color });
    });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 45 + i * 85;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (i === this.activeAppIndex) bgColor = '#3b82f6';
      else if (this.completedApps.has(i)) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 100, 75, 35, 8, { fill: bgColor });
      r.text(x + 37, 122, app.title.split(' ')[0], { fill: '#ffffff', fontSize: 9, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(40, 150, 320, 200, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 180, app.title, { fill: app.color, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Description (wrapped)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 210;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 16;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Formula and stat
    r.roundRect(50, 280, 140, 55, 8, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(120, 300, 'Formula', { fill: '#6b7280', fontSize: 9, textAnchor: 'middle' });
    r.text(120, 320, app.formula, { fill: '#ffffff', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(210, 280, 140, 55, 8, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(280, 300, 'Real Data', { fill: '#6b7280', fontSize: 9, textAnchor: 'middle' });
    r.text(280, 320, app.stat, { fill: '#ffffff', fontSize: 9, textAnchor: 'middle' });

    // Mark as read button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_read', label: 'Mark as Read', variant: 'secondary' });
    }

    // Continue button
    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take the Quiz', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

      // Progress bar
      r.roundRect(60, 75, 280, 6, 3, { fill: '#1e293b' });
      r.roundRect(60, 75, (280 * (this.currentQuestionIndex + 1)) / 10, 6, 3, { fill: '#3b82f6' });
      r.text(320, 95, `${this.currentQuestionIndex + 1}/10`, { fill: '#94a3b8', fontSize: 10 });
      r.text(80, 95, `Score: ${this.correctAnswers}/${this.answeredQuestions.size}`, { fill: '#10b981', fontSize: 10 });

      const question = this.testQuestions[this.currentQuestionIndex];
      const isAnswered = this.answeredQuestions.has(this.currentQuestionIndex);

      // Question
      r.roundRect(30, 110, 340, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 145, question.question, { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 185 + i * 45;
        let bgColor = 'rgba(51, 65, 85, 0.5)';

        if (isAnswered) {
          if (i === question.correctIndex) {
            bgColor = 'rgba(16, 185, 129, 0.3)';
          } else if (i === this.testAnswers[this.currentQuestionIndex]) {
            bgColor = 'rgba(239, 68, 68, 0.3)';
          }
        }

        r.roundRect(30, y, 340, 40, 8, { fill: bgColor });
        r.text(45, y + 25, `${String.fromCharCode(65 + i)}. ${option}`, { fill: '#e2e8f0', fontSize: 10 });

        if (!isAnswered) {
          r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
        }
      });

      // Explanation
      if (this.showExplanation && isAnswered) {
        r.roundRect(30, 375, 340, 60, 10, { fill: 'rgba(59, 130, 246, 0.15)' });
        r.text(200, 410, question.explanation.substring(0, 60) + '...', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });
      }

      // Navigation
      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: 'Back', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next', variant: 'secondary' });
      }
      if (this.answeredQuestions.size === 10) {
        r.addButton({ id: 'complete', label: 'Complete', variant: 'primary' });
      }
    } else {
      // Results
      const percentage = Math.round((this.correctAnswers / 10) * 100);
      r.text(200, 120, '🏆', { fontSize: 64, textAnchor: 'middle' });
      r.text(200, 190, 'Momentum Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 230, `${percentage}%`, { fill: '#10b981', fontSize: 40, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 260, `${this.correctAnswers}/10 correct`, { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

      if (this.correctAnswers >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Trophy
    r.text(200, 120, '🏆', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Momentum Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, "You've mastered momentum conservation!", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Key takeaways
    r.roundRect(50, 270, 300, 130, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 295, 'Key Takeaways', { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 320, '* Momentum p = mass x velocity', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 340, '* Total momentum is always conserved', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 360, '* Lighter objects move faster in push-offs', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 380, '* Friction transfers momentum to Earth', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Play Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering momentum conservation!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      massLeft: this.massLeft,
      massRight: this.massRight,
      hasFriction: this.hasFriction,
      isCompressed: this.isCompressed,
      isAnimating: this.isAnimating,
      leftPos: this.leftPos,
      rightPos: this.rightPos,
      leftVel: this.leftVel,
      rightVel: this.rightVel,
      experimentCount: this.experimentCount,
      animationTime: this.animationTime,
      testAnswers: this.testAnswers,
      currentQuestionIndex: this.currentQuestionIndex,
      showTestResults: this.showTestResults,
      showExplanation: this.showExplanation,
      answeredQuestions: Array.from(this.answeredQuestions),
      correctAnswers: this.correctAnswers,
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
    if (state.massLeft !== undefined) this.massLeft = state.massLeft as number;
    if (state.massRight !== undefined) this.massRight = state.massRight as number;
    if (state.hasFriction !== undefined) this.hasFriction = state.hasFriction as boolean;
    if (state.isCompressed !== undefined) this.isCompressed = state.isCompressed as boolean;
    if (state.isAnimating !== undefined) this.isAnimating = state.isAnimating as boolean;
    if (state.leftPos !== undefined) this.leftPos = state.leftPos as number;
    if (state.rightPos !== undefined) this.rightPos = state.rightPos as number;
    if (state.leftVel !== undefined) this.leftVel = state.leftVel as number;
    if (state.rightVel !== undefined) this.rightVel = state.rightVel as number;
    if (state.experimentCount !== undefined) this.experimentCount = state.experimentCount as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.showExplanation !== undefined) this.showExplanation = state.showExplanation as boolean;
    if (state.answeredQuestions) this.answeredQuestions = new Set(state.answeredQuestions as number[]);
    if (state.correctAnswers !== undefined) this.correctAnswers = state.correctAnswers as number;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createMomentumConservationGame(sessionId: string): MomentumConservationGame {
  return new MomentumConservationGame(sessionId);
}
