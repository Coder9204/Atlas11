import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// INERTIA GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Newton's First Law - Objects at rest stay at rest, objects in motion
// stay in motion, unless acted upon by an external force.
// Classic demo: Coin-Card-Cup trick, Tablecloth trick
// Friction force = μ × Normal force
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
  fact: string;
}

export class InertiaGame extends BaseGame {
  readonly gameType = 'inertia';
  readonly gameTitle = 'Inertia: Objects Resist Change';

  // Game state
  private phase: GamePhase = 'hook';
  private hookStep = 0;
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private reviewStep = 0;
  private twistReviewStep = 0;

  // Play phase - Coin-Card-Cup simulation
  private flickSpeed: 'slow' | 'fast' = 'fast';
  private hasFlicked = false;
  private cardX = 0;
  private coinY = 0;
  private coinFell = false;
  private coinMissed = false;
  private animationTime = 0;
  private flickStartTime = 0;

  // Twist phase - Tablecloth trick
  private clothX = 0;
  private dishesStayed = true;
  private twistFlicked = false;
  private twistSpeed: 'slow' | 'fast' = 'fast';
  private twistStartTime = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showExplanation = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      question: "According to Newton's First Law, what happens to an object at rest with no forces acting on it?",
      options: ["It starts moving slowly", "It stays at rest", "It floats upward", "It shrinks"],
      correctIndex: 1,
      explanation: "Newton's First Law (Law of Inertia) states that an object at rest stays at rest unless acted upon by an external force."
    },
    {
      question: "In the coin-card-cup trick, why does the coin fall straight down into the cup?",
      options: ["The coin is magnetic", "The coin has inertia and resists horizontal motion", "Gravity is stronger on coins", "The cup pulls the coin"],
      correctIndex: 1,
      explanation: "The coin has inertia - it resists changes to its state of motion. When the card is flicked away quickly, the coin drops straight down."
    },
    {
      question: "Why does a fast flick work better than a slow push for the coin trick?",
      options: ["Fast is more fun", "Less time for friction to act on the coin", "The coin likes speed", "Gravity works faster"],
      correctIndex: 1,
      explanation: "A fast flick minimizes the time friction has to transfer horizontal motion to the coin."
    },
    {
      question: "When a bus suddenly stops, passengers lurch forward. This is because:",
      options: ["The bus pushes them forward", "Their bodies have inertia and continue moving", "Gravity changed direction", "The seats push them"],
      correctIndex: 1,
      explanation: "Passengers' bodies were moving with the bus. When the bus stops, their bodies continue moving forward due to inertia."
    },
    {
      question: "A tablecloth can be pulled from under dishes if pulled:",
      options: ["Slowly and carefully", "Quickly and sharply", "Upward at an angle", "While dishes are wet"],
      correctIndex: 1,
      explanation: "Quick motion minimizes the time friction acts on the dishes. The dishes' inertia keeps them in place."
    },
    {
      question: "Why do cars have seatbelts?",
      options: ["To look cool", "To stop inertia from throwing passengers forward in a crash", "To keep seats clean", "Legal requirement only"],
      correctIndex: 1,
      explanation: "In a crash, the car stops but passengers continue moving forward due to inertia. Seatbelts provide the force to stop them safely."
    },
    {
      question: "A hockey puck on ice keeps sliding because:",
      options: ["Ice is magical", "Very little friction = little force to change its motion", "The puck is afraid to stop", "Cold temperatures speed things up"],
      correctIndex: 1,
      explanation: "Ice has very low friction. With almost no external force acting on the puck, it continues moving in a straight line."
    },
    {
      question: "If you're in a car making a sharp right turn, you feel pushed to the left. This is because:",
      options: ["The door pushes you", "Your body's inertia resists the change in direction", "Gravity shifts", "Wind from outside"],
      correctIndex: 1,
      explanation: "Your body has inertia and 'wants' to continue in a straight line. The car turns right, but your body initially continues straight."
    },
    {
      question: "The coin-card trick works best when the card is:",
      options: ["Heavy and rough", "Light and smooth", "Wet", "Made of metal"],
      correctIndex: 1,
      explanation: "A smooth card has less friction with the coin. A light card requires less force to accelerate quickly."
    },
    {
      question: "An astronaut in space throws a ball. What happens to it?",
      options: ["It stops immediately", "It returns to the astronaut", "It keeps moving forever (in the same direction)", "It falls to Earth"],
      correctIndex: 2,
      explanation: "In space, there's no air resistance or friction. With no external force, the ball continues moving forever - pure inertia!"
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🚗",
      title: "Car Safety Systems",
      description: "Seatbelts and airbags counteract inertia. In a crash, your body continues moving while the car stops.",
      fact: "Modern seatbelts have 'pretensioners' that tighten in milliseconds during a crash!"
    },
    {
      icon: "🎢",
      title: "Roller Coasters",
      description: "That feeling of being 'pushed back' during acceleration is your inertia at work!",
      fact: "The fastest coaster accelerates 0-150 mph in 5 seconds - passengers feel 1.7G!"
    },
    {
      icon: "🚀",
      title: "Space Travel",
      description: "In space, no friction means spacecraft keep moving without fuel - pure inertia!",
      fact: "Voyager 1 is still traveling at 38,000 mph without engines - launched in 1977!"
    },
    {
      icon: "⚽",
      title: "Sports Physics",
      description: "Athletes use inertia constantly - pitcher's follow-through, golfer's swing, football tackles.",
      fact: "A pitcher's arm decelerates 7,000 deg/sec to 0 in 0.05 seconds!"
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
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
        if (buttonId === 'next_hook') {
          if (this.hookStep < 2) {
            this.hookStep++;
          } else {
            this.phase = 'predict';
          }
        } else if (buttonId.startsWith('hook_step_')) {
          this.hookStep = parseInt(buttonId.split('_')[2]);
        }
        break;

      case 'predict':
        if (buttonId.startsWith('option_')) {
          this.prediction = buttonId.split('_')[1];
        } else if (buttonId === 'continue' && this.prediction) {
          this.phase = 'play';
          this.resetPlayState();
        }
        break;

      case 'play':
        if (buttonId === 'flick') {
          this.startFlick();
        } else if (buttonId === 'speed_fast') {
          this.flickSpeed = 'fast';
        } else if (buttonId === 'speed_slow') {
          this.flickSpeed = 'slow';
        } else if (buttonId === 'reset') {
          this.resetPlayState();
        } else if (buttonId === 'continue') {
          this.phase = 'review';
          this.reviewStep = 0;
        }
        break;

      case 'review':
        if (buttonId === 'next_review') {
          if (this.reviewStep < 2) {
            this.reviewStep++;
          } else {
            this.phase = 'twist_predict';
          }
        } else if (buttonId.startsWith('review_step_')) {
          this.reviewStep = parseInt(buttonId.split('_')[2]);
        }
        break;

      case 'twist_predict':
        if (buttonId.startsWith('option_')) {
          this.twistPrediction = buttonId.split('_')[1];
        } else if (buttonId === 'continue' && this.twistPrediction) {
          this.phase = 'twist_play';
          this.resetTwistState();
        }
        break;

      case 'twist_play':
        if (buttonId === 'pull') {
          this.startTwistPull();
        } else if (buttonId === 'twist_speed_fast') {
          this.twistSpeed = 'fast';
        } else if (buttonId === 'twist_speed_slow') {
          this.twistSpeed = 'slow';
        } else if (buttonId === 'twist_reset') {
          this.resetTwistState();
        } else if (buttonId === 'continue') {
          this.phase = 'twist_review';
          this.twistReviewStep = 0;
        }
        break;

      case 'twist_review':
        if (buttonId === 'next_twist_review') {
          if (this.twistReviewStep < 1) {
            this.twistReviewStep++;
          } else {
            this.phase = 'transfer';
          }
        } else if (buttonId.startsWith('twist_review_step_')) {
          this.twistReviewStep = parseInt(buttonId.split('_')[3]);
        }
        break;

      case 'transfer':
        if (buttonId.startsWith('app_')) {
          this.activeAppIndex = parseInt(buttonId.split('_')[1]);
          this.completedApps.add(this.activeAppIndex);
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

  private startFlick(): void {
    if (this.hasFlicked) return;
    this.hasFlicked = true;
    this.flickStartTime = this.animationTime;
  }

  private startTwistPull(): void {
    if (this.twistFlicked) return;
    this.twistFlicked = true;
    this.twistStartTime = this.animationTime;
  }

  private resetPlayState(): void {
    this.hasFlicked = false;
    this.cardX = 0;
    this.coinY = 0;
    this.coinFell = false;
    this.coinMissed = false;
  }

  private resetTwistState(): void {
    this.twistFlicked = false;
    this.clothX = 0;
    this.dishesStayed = true;
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.hookStep = 0;
    this.prediction = null;
    this.twistPrediction = null;
    this.reviewStep = 0;
    this.twistReviewStep = 0;
    this.flickSpeed = 'fast';
    this.twistSpeed = 'fast';
    this.resetPlayState();
    this.resetTwistState();
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

    // Coin-Card animation
    if (this.hasFlicked && !this.coinFell && !this.coinMissed) {
      const elapsed = this.animationTime - this.flickStartTime;
      const cardSpeed = this.flickSpeed === 'fast' ? 30 : 3;

      // Card moves right
      this.cardX = Math.min(elapsed * cardSpeed * 50, 300);

      // After card is gone, coin falls
      if (this.cardX > 100) {
        if (this.flickSpeed === 'fast') {
          // Fast flick - coin falls straight down
          const fallTime = elapsed - (100 / (cardSpeed * 50));
          this.coinY = Math.min(fallTime * 300, 80);
          if (this.coinY >= 80) {
            this.coinFell = true;
          }
        } else {
          // Slow - coin moves with card and misses
          const fallTime = elapsed - (100 / (cardSpeed * 50));
          this.coinY = Math.min(fallTime * 300, 80);
          if (this.coinY >= 80) {
            this.coinMissed = true;
          }
        }
      }
    }

    // Tablecloth animation
    if (this.twistFlicked && this.clothX < 400) {
      const elapsed = this.animationTime - this.twistStartTime;
      const clothSpeed = this.twistSpeed === 'fast' ? 40 : 4;

      this.clothX = Math.min(elapsed * clothSpeed * 50, 400);

      if (this.twistSpeed === 'slow' && this.clothX > 50) {
        this.dishesStayed = false;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(245, 158, 11, 0.03)' });
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

  private renderHook(r: CommandRenderer): void {
    const hookContent = [
      { title: "The Magic Coin Trick", content: "Place a coin on a card on top of a cup. Flick the card away, and the coin drops into the cup!", visual: "🪙" },
      { title: "The Sudden Stop", content: "Ever lurched forward when a car brakes? Or felt pushed back when it accelerates?", visual: "🚗" },
      { title: "Newton's First Secret", content: "Isaac Newton called it INERTIA - objects resist changes in their motion!", visual: "⚖️" }
    ];

    const current = hookContent[this.hookStep];

    // Badge
    r.roundRect(130, 50, 140, 30, 8, { fill: 'rgba(245, 158, 11, 0.1)' });
    r.text(200, 70, 'PHYSICS EXPLORATION', { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle' });

    // Visual
    r.text(200, 160, current.visual, { fontSize: 64, textAnchor: 'middle' });

    // Title
    r.text(200, 230, current.title, { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Content wrapped
    const words = current.content.split(' ');
    let line = '';
    let lineY = 270;
    words.forEach(word => {
      if ((line + word).length > 40) {
        r.text(200, lineY, line.trim(), { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 22;
      } else {
        line += word + ' ';
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    // Step indicators
    hookContent.forEach((_, i) => {
      const dotX = 175 + i * 25;
      r.circle(dotX, 380, i === this.hookStep ? 8 : 4, {
        fill: i === this.hookStep ? '#f59e0b' : '#374151'
      });
      r.addButton({ id: `hook_step_${i}`, label: '', variant: 'secondary' });
    });

    // CTA button
    r.addButton({
      id: 'next_hook',
      label: this.hookStep < 2 ? 'Continue' : 'Make a Prediction',
      variant: 'primary'
    });

    // Feature hints
    r.text(200, 500, 'Interactive Lab | Real-World Examples | Knowledge Test', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });

    r.setCoachMessage('Discover why objects resist changes in motion!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 50, 'Make Your Prediction', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 85, 'When you flick the card away quickly,', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 105, 'what happens to the coin?', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    const options = [
      { id: 'coin_falls', text: 'The coin drops straight into the cup', icon: '⬇️' },
      { id: 'coin_flies', text: 'The coin flies away with the card', icon: '➡️' },
      { id: 'coin_stays', text: 'The coin hovers in the air momentarily', icon: '🪙' },
      { id: 'coin_spins', text: 'The coin spins and lands randomly', icon: '🌀' }
    ];

    options.forEach((option, i) => {
      const y = 135 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';

      if (option.id === this.prediction) {
        bgColor = 'rgba(245, 158, 11, 0.3)';
      }

      r.roundRect(30, y, 340, 52, 12, { fill: bgColor });
      r.text(55, y + 32, option.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(80, y + 32, option.text, { fill: '#e2e8f0', fontSize: 12 });

      r.addButton({ id: `option_${option.id}`, label: '', variant: 'secondary' });
    });

    if (this.prediction) {
      r.addButton({ id: 'continue', label: 'Test My Prediction', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 35, 'Coin-Card-Cup Experiment', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 58, 'Flick the card and watch the coin!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Simulation area
    r.roundRect(50, 80, 300, 200, 12, { fill: 'rgba(30, 41, 59, 0.8)' });

    // Table
    r.rect(50, 245, 300, 35, { fill: '#8B4513' });

    // Cup
    r.polygon([
      { x: 180, y: 170 },
      { x: 190, y: 245 },
      { x: 240, y: 245 },
      { x: 250, y: 170 }
    ], { fill: '#6366f1' });
    r.ellipse(215, 170, 35, 10, { fill: '#6366f1' });
    r.ellipse(215, 173, 28, 7, { fill: '#312e81' });

    // Card (if not fully gone)
    if (this.cardX < 300 && !this.coinFell && !this.coinMissed) {
      r.roundRect(150 + this.cardX, 140, 80, 12, 3, { fill: '#ef4444' });
    }

    // Coin position
    const coinXOffset = this.flickSpeed === 'slow' && this.hasFlicked && this.cardX > 50 ? this.cardX * 0.3 : 0;
    r.ellipse(195 + coinXOffset, 125 + this.coinY, 18, 5, { fill: '#b45309' });
    r.ellipse(195 + coinXOffset, 122 + this.coinY, 18, 5, { fill: '#fcd34d' });
    r.text(195 + coinXOffset, 125 + this.coinY, '$', { fill: '#b45309', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Result messages
    if (this.coinFell) {
      r.text(200, 105, 'SUCCESS!', { fill: '#22c55e', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 125, 'Coin dropped into cup!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    }
    if (this.coinMissed) {
      r.text(200, 105, 'MISSED!', { fill: '#ef4444', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 125, 'Card dragged the coin!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    }

    // Finger indicator
    if (!this.hasFlicked) {
      r.text(140, 130, '👆', { fontSize: 20, textAnchor: 'middle' });
      r.text(140, 160, 'Flick here!', { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });
    }

    // Controls
    r.roundRect(30, 300, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 320, 'Flick Speed', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Speed buttons
    r.roundRect(50, 335, 145, 35, 8, { fill: this.flickSpeed === 'fast' ? '#f59e0b' : '#374151' });
    r.text(122, 358, '⚡ Fast Flick', { fill: '#ffffff', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.addButton({ id: 'speed_fast', label: '', variant: 'secondary' });

    r.roundRect(205, 335, 145, 35, 8, { fill: this.flickSpeed === 'slow' ? '#f59e0b' : '#374151' });
    r.text(277, 358, '🐢 Slow Push', { fill: '#ffffff', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.addButton({ id: 'speed_slow', label: '', variant: 'secondary' });

    // Flick/Reset button
    if (!this.hasFlicked) {
      r.addButton({ id: 'flick', label: '👆 Flick the Card!', variant: 'primary' });
    } else if (this.coinFell || this.coinMissed) {
      r.addButton({ id: 'reset', label: '🔄 Try Again', variant: 'secondary' });
    }

    // Tip
    r.roundRect(30, 440, 340, 50, 10, { fill: 'rgba(245, 158, 11, 0.1)' });
    r.text(200, 470, '💡 Try both speeds to see the difference!', { fill: '#f59e0b', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Results', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    const wasCorrect = this.prediction === 'coin_falls';
    const reviewContent = [
      {
        title: "Newton's First Law of Motion",
        content: wasCorrect ? "You predicted correctly! " : "" + "The coin drops straight down because of INERTIA. An object at rest stays at rest unless acted upon by an external force."
      },
      {
        title: "Why the Fast Flick Works",
        content: "Fast flick: Card leaves before friction accelerates the coin. The coin's inertia keeps it in place, then gravity pulls it down."
      },
      {
        title: "The Coin 'Wants' to Stay Still",
        content: "Inertia is resistance to change. The coin was at rest and 'wants' to stay at rest. Fast-moving card doesn't give friction enough time!"
      }
    ];

    const current = reviewContent[this.reviewStep];

    r.text(200, 50, 'Understanding Inertia', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Content card
    r.roundRect(30, 90, 340, 220, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, current.title, { fill: '#f59e0b', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Content wrapped
    const words = current.content.split(' ');
    let line = '';
    let lineY = 165;
    words.forEach(word => {
      if ((line + word).length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 20;
      } else {
        line += word + ' ';
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Correct prediction feedback
    if (this.reviewStep === 0 && wasCorrect) {
      r.roundRect(50, 250, 300, 40, 10, { fill: 'rgba(34, 197, 94, 0.2)' });
      r.text(200, 275, '✓ Great prediction! You got it right!', { fill: '#22c55e', fontSize: 11, textAnchor: 'middle' });
    }

    // Step indicators
    reviewContent.forEach((_, i) => {
      const dotX = 175 + i * 25;
      r.circle(dotX, 340, i === this.reviewStep ? 8 : 4, {
        fill: i === this.reviewStep ? '#f59e0b' : '#374151'
      });
      r.addButton({ id: `review_step_${i}`, label: '', variant: 'secondary' });
    });

    r.addButton({
      id: 'next_review',
      label: this.reviewStep < 2 ? 'Continue' : 'New Experiment',
      variant: 'primary'
    });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 50, '🎪', { fontSize: 40, textAnchor: 'middle' });
    r.text(200, 100, 'The Twist: Tablecloth Trick', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 130, 'If you quickly pull a tablecloth from', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 150, 'under dishes, what happens?', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    const options = [
      { id: 'dishes_stay', text: 'The dishes will stay in place (inertia!)', icon: '🍽️' },
      { id: 'dishes_fly', text: 'The dishes will fly off the table', icon: '💨' },
      { id: 'dishes_crash', text: 'Everything will crash to the floor', icon: '💥' },
      { id: 'cloth_tears', text: 'The tablecloth will tear', icon: '📜' }
    ];

    options.forEach((option, i) => {
      const y = 175 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';

      if (option.id === this.twistPrediction) {
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 12, { fill: bgColor });
      r.text(55, y + 30, option.icon, { fontSize: 18, textAnchor: 'middle' });
      r.text(80, y + 30, option.text, { fill: '#e2e8f0', fontSize: 11 });

      r.addButton({ id: `option_${option.id}`, label: '', variant: 'secondary' });
    });

    if (this.twistPrediction) {
      r.addButton({ id: 'continue', label: 'Test It!', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 35, 'Tablecloth Trick', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 58, 'Pull the tablecloth and watch the dishes!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Simulation area
    r.roundRect(25, 80, 350, 180, 12, { fill: 'rgba(30, 41, 59, 0.8)' });

    // Table
    r.rect(45, 200, 310, 20, { fill: '#8B4513' });
    r.rect(55, 220, 20, 40, { fill: '#654321' });
    r.rect(305, 220, 20, 40, { fill: '#654321' });

    // Tablecloth
    r.rect(45 - this.clothX, 190, 310, 15, { fill: '#dc2626' });
    r.rect(25 - this.clothX, 190, 25, 15, { fill: '#b91c1c' });

    // Dishes position depends on whether they stayed
    const dishOffset = this.dishesStayed ? 0 : this.clothX * 0.4;

    // Plate
    r.ellipse(150 + dishOffset, 185, 30, 10, { fill: '#ffffff' });
    r.ellipse(150 + dishOffset, 183, 25, 8, { fill: '#f3f4f6' });

    // Glass
    r.polygon([
      { x: 240 + dishOffset, y: 150 },
      { x: 245 + dishOffset, y: 188 },
      { x: 275 + dishOffset, y: 188 },
      { x: 280 + dishOffset, y: 150 }
    ], { fill: 'rgba(147, 197, 253, 0.5)' });

    // Cup
    r.roundRect(200 + dishOffset, 160, 30, 28, 3, { fill: '#f8fafc' });

    // Result message
    if (this.clothX >= 400) {
      if (this.dishesStayed) {
        r.text(200, 115, 'SUCCESS!', { fill: '#22c55e', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(200, 135, 'Dishes stayed in place!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      } else {
        r.text(200, 115, 'CRASH!', { fill: '#ef4444', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
        r.text(200, 135, 'Cloth dragged the dishes!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    }

    // Controls
    r.roundRect(30, 280, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 300, 'Pull Speed', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(50, 315, 145, 35, 8, { fill: this.twistSpeed === 'fast' ? '#a855f7' : '#374151' });
    r.text(122, 338, '⚡ Fast Pull', { fill: '#ffffff', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.addButton({ id: 'twist_speed_fast', label: '', variant: 'secondary' });

    r.roundRect(205, 315, 145, 35, 8, { fill: this.twistSpeed === 'slow' ? '#a855f7' : '#374151' });
    r.text(277, 338, '🐢 Slow Pull', { fill: '#ffffff', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.addButton({ id: 'twist_speed_slow', label: '', variant: 'secondary' });

    // Pull/Reset button
    if (!this.twistFlicked) {
      r.addButton({ id: 'pull', label: '🎪 Pull the Tablecloth!', variant: 'primary' });
    } else if (this.clothX >= 400) {
      r.addButton({ id: 'twist_reset', label: '🔄 Try Again', variant: 'secondary' });
    }

    r.addButton({ id: 'continue', label: 'Continue', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    const wasCorrect = this.twistPrediction === 'dishes_stay';
    const reviewContent = [
      {
        title: "Same Principle, Different Demo",
        content: wasCorrect ? "Correct! " : "" + "Just like the coin, the dishes stay put because of inertia. A fast pull minimizes friction time!"
      },
      {
        title: "The Physics of Magic Tricks",
        content: "Magicians use physics! The key is SPEED. Fast motion means less time for friction to transfer force to the objects on top."
      }
    ];

    const current = reviewContent[this.twistReviewStep];

    r.text(200, 50, '💡 Inertia Explained', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 90, 340, 180, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, current.title, { fill: '#a855f7', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Content wrapped
    const words = current.content.split(' ');
    let line = '';
    let lineY = 165;
    words.forEach(word => {
      if ((line + word).length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 20;
      } else {
        line += word + ' ';
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Step indicators
    reviewContent.forEach((_, i) => {
      const dotX = 188 + i * 25;
      r.circle(dotX, 310, i === this.twistReviewStep ? 8 : 4, {
        fill: i === this.twistReviewStep ? '#a855f7' : '#374151'
      });
      r.addButton({ id: `twist_review_step_${i}`, label: '', variant: 'secondary' });
    });

    r.addButton({
      id: 'next_twist_review',
      label: this.twistReviewStep < 1 ? 'Continue' : 'See Real Applications',
      variant: 'primary'
    });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 45, 'Inertia in Real Life', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 70, 'See how inertia affects everyday situations', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#f59e0b';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 95, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 123, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 155, 350, 240, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 190, app.icon, { fontSize: 36, textAnchor: 'middle' });
    r.text(200, 230, app.title, { fill: '#f59e0b', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Description wrapped
    const words = app.description.split(' ');
    let line = '';
    let lineY = 260;
    words.forEach(word => {
      if ((line + word).length > 50) {
        r.text(200, lineY, line.trim(), { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else {
        line += word + ' ';
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Fun fact
    r.roundRect(40, 330, 320, 50, 10, { fill: 'rgba(245, 158, 11, 0.1)' });
    r.text(200, 360, '💡 ' + app.fact.substring(0, 50), { fill: '#f59e0b', fontSize: 9, textAnchor: 'middle' });

    // Completion indicator
    if (this.completedApps.has(this.activeAppIndex)) {
      r.text(200, 400, '✓ Explored', { fill: '#22c55e', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 430, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take the Test', variant: 'primary' });
    } else {
      r.text(200, 470, `Explore all applications to continue`, { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    const question = this.testQuestions[this.currentQuestionIndex];
    const selectedAnswer = this.testAnswers[this.currentQuestionIndex];
    const correctCount = this.testAnswers.filter((a, i) => this.checkAnswer(i, a)).length;

    // Header
    r.text(200, 35, `Question ${this.currentQuestionIndex + 1}/10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(350, 35, `Score: ${correctCount}/${this.testAnswers.filter(a => a !== -1).length}`, { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Progress bar
    r.roundRect(30, 50, 340, 6, 3, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.roundRect(30, 50, 340 * ((this.currentQuestionIndex + 1) / 10), 6, 3, { fill: '#f59e0b' });

    // Question
    r.roundRect(20, 70, 360, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    const qWords = question.question.split(' ');
    let qLine = '';
    let qY = 95;
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
      const y = 165 + i * 55;
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
        bgColor = 'rgba(245, 158, 11, 0.3)';
      }

      r.roundRect(20, y, 360, 48, 8, { fill: bgColor });
      r.text(35, y + 28, option.substring(0, 52) + (option.length > 52 ? '...' : ''), { fill: textColor, fontSize: 11 });

      if (!this.showExplanation) {
        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      }
    });

    // Explanation
    if (this.showExplanation) {
      r.roundRect(20, 390, 360, 70, 12, { fill: 'rgba(245, 158, 11, 0.1)' });
      const expText = question.explanation.substring(0, 100);
      r.text(200, 415, expText.substring(0, 55), { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle' });
      if (expText.length > 55) {
        r.text(200, 435, expText.substring(55), { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle' });
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
        r.text(200, 510, 'Answer all questions', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    const score = this.calculateScore();
    const percentage = Math.round((score / 10) * 100);

    // Trophy badge
    r.circle(200, 100, 50, { fill: 'linear-gradient(135deg, #f59e0b, #ea580c)' });
    r.text(200, 110, '⚖️', { fontSize: 40, textAnchor: 'middle' });

    // Title
    r.text(200, 175, 'Inertia Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Score
    r.text(200, 220, `${percentage}%`, { fill: '#22c55e', fontSize: 42, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 250, `${score}/10 correct answers`, { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    // Key concepts
    r.roundRect(40, 280, 320, 180, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 310, 'Key Concepts Mastered:', { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const concepts = [
      "Newton's First Law",
      'Objects resist changes in motion',
      'Fast motion minimizes friction time',
      'Real-world inertia applications'
    ];

    concepts.forEach((concept, i) => {
      r.text(70, 345 + i * 28, `✓ ${concept}`, { fill: '#ffffff', fontSize: 11 });
    });

    // Key insight
    r.roundRect(40, 480, 320, 60, 12, { fill: 'rgba(245, 158, 11, 0.15)' });
    r.text(200, 505, 'Key Insight: Objects "want" to keep doing', { fill: '#f59e0b', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 525, 'what they are already doing!', { fill: '#f59e0b', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering inertia!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      hookStep: this.hookStep,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      reviewStep: this.reviewStep,
      twistReviewStep: this.twistReviewStep,
      flickSpeed: this.flickSpeed,
      hasFlicked: this.hasFlicked,
      cardX: this.cardX,
      coinY: this.coinY,
      coinFell: this.coinFell,
      coinMissed: this.coinMissed,
      animationTime: this.animationTime,
      clothX: this.clothX,
      dishesStayed: this.dishesStayed,
      twistFlicked: this.twistFlicked,
      twistSpeed: this.twistSpeed,
      testAnswers: this.testAnswers,
      currentQuestionIndex: this.currentQuestionIndex,
      showExplanation: this.showExplanation,
      activeAppIndex: this.activeAppIndex,
      completedApps: Array.from(this.completedApps)
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.hookStep !== undefined) this.hookStep = state.hookStep as number;
    if (state.prediction !== undefined) this.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.reviewStep !== undefined) this.reviewStep = state.reviewStep as number;
    if (state.twistReviewStep !== undefined) this.twistReviewStep = state.twistReviewStep as number;
    if (state.flickSpeed) this.flickSpeed = state.flickSpeed as typeof this.flickSpeed;
    if (state.hasFlicked !== undefined) this.hasFlicked = state.hasFlicked as boolean;
    if (state.cardX !== undefined) this.cardX = state.cardX as number;
    if (state.coinY !== undefined) this.coinY = state.coinY as number;
    if (state.coinFell !== undefined) this.coinFell = state.coinFell as boolean;
    if (state.coinMissed !== undefined) this.coinMissed = state.coinMissed as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.clothX !== undefined) this.clothX = state.clothX as number;
    if (state.dishesStayed !== undefined) this.dishesStayed = state.dishesStayed as boolean;
    if (state.twistFlicked !== undefined) this.twistFlicked = state.twistFlicked as boolean;
    if (state.twistSpeed) this.twistSpeed = state.twistSpeed as typeof this.twistSpeed;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showExplanation !== undefined) this.showExplanation = state.showExplanation as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createInertiaGame(sessionId: string): InertiaGame {
  return new InertiaGame(sessionId);
}
