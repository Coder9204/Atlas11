import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// EGG DROP GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Impulse-Momentum Theorem
// F × Δt = Δp (Force × Time = Change in Momentum)
// More padding = longer collision time = less force = egg survives
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
const GRAVITY = 9.81; // m/s²
const EGG_BREAKING_FORCE = 25; // Newtons - approximate force to crack an egg
const EGG_MASS = 0.06; // kg (60 grams)

export class EggDropGame extends BaseGame {
  readonly gameType = 'egg_drop';
  readonly gameTitle = 'Egg Drop: The Physics of Protection';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private paddingType: 'none' | 'foam' | 'thick' = 'none';
  private dropHeight: 'low' | 'medium' | 'high' = 'medium';
  private eggPosition = 0; // 0-100 for animation
  private isDropping = false;
  private dropComplete = false;
  private eggSurvived: boolean | null = null;
  private animationTime = 0;

  // Twist state
  private twistHeight: 'low' | 'medium' | 'high' = 'medium';
  private twistDropComplete = false;
  private twistEggSurvived: boolean | null = null;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "Two eggs are dropped from the same height. One lands on concrete, the other on a thick foam pad.",
      question: "Why does the egg on foam survive while the concrete egg breaks?",
      options: [
        "Foam absorbs all the kinetic energy",
        "Foam increases the stopping time, reducing force",
        "Foam is magnetic and repels the egg",
        "Foam weighs less than concrete"
      ],
      correctIndex: 1,
      explanation: "Impulse = Force × Time. The foam extends the stopping time, so the same momentum change happens with less force."
    },
    {
      scenario: "The Impulse-Momentum Theorem states: F × Δt = Δp",
      question: "If the stopping time doubles, what happens to the average force?",
      options: [
        "Force doubles",
        "Force stays the same",
        "Force is cut in half",
        "Force becomes zero"
      ],
      correctIndex: 2,
      explanation: "Since momentum change (Δp) is constant, if time doubles, force must halve to maintain the equation F × Δt = Δp."
    },
    {
      scenario: "Modern cars have 'crumple zones' - areas designed to collapse in a crash.",
      question: "How do crumple zones protect passengers?",
      options: [
        "They make the car lighter",
        "They increase crash time, reducing force on passengers",
        "They make the car bounce away from obstacles",
        "They prevent the car from moving"
      ],
      correctIndex: 1,
      explanation: "Crumple zones extend the collision time from milliseconds to hundreds of milliseconds, dramatically reducing the force transmitted to passengers."
    },
    {
      scenario: "A stunt person falls from a building onto a giant airbag.",
      question: "Why do airbags work better than landing on the ground?",
      options: [
        "Airbags eliminate all momentum",
        "Airbags provide more stopping distance and time",
        "Airbags are made of special materials",
        "Airbags reverse the direction of falling"
      ],
      correctIndex: 1,
      explanation: "The airbag allows the stunt person to decelerate over a longer distance and time, reducing the peak force far below dangerous levels."
    },
    {
      scenario: "Boxers are trained to 'roll with the punch' - moving their head in the direction of a punch.",
      question: "How does this technique reduce injury?",
      options: [
        "It makes the punch miss completely",
        "It increases the contact time, reducing force",
        "It makes the boxer's head harder",
        "It confuses the opponent"
      ],
      correctIndex: 1,
      explanation: "Moving with the punch extends the contact time, distributing the impulse over a longer period and reducing the peak force on the brain."
    },
    {
      scenario: "Two identical eggs are dropped from 3 meters. One has 5cm of foam padding, the other has 15cm.",
      question: "Which egg is more likely to survive?",
      options: [
        "5cm foam - less material to crush",
        "15cm foam - more stopping distance",
        "Both have equal chances",
        "Neither will survive from 3 meters"
      ],
      correctIndex: 1,
      explanation: "More foam = more stopping distance = more time = less force. The 15cm foam provides three times the cushioning distance."
    },
    {
      scenario: "Bicycle helmets are designed to crack and crush on impact.",
      question: "Why is this actually a safety feature?",
      options: [
        "Cracked helmets are cheaper to replace",
        "The crushing absorbs energy over time, reducing head force",
        "It signals that the helmet worked",
        "Cracked helmets are more aerodynamic"
      ],
      correctIndex: 1,
      explanation: "The helmet's foam crushing is the energy absorption mechanism - it extends impact time and reduces the force transmitted to your skull."
    },
    {
      scenario: "A package containing fragile electronics is shipped. It arrives with the styrofoam packing compressed.",
      question: "What does the compressed foam indicate?",
      options: [
        "The package was too heavy",
        "The foam did its job - it absorbed impact energy over time",
        "The foam was defective",
        "The electronics are definitely broken"
      ],
      correctIndex: 1,
      explanation: "Compressed foam means it deformed during shipping, extending the impact time and reducing the peak force on the electronics. That's exactly what it's designed to do!"
    },
    {
      scenario: "Bungee jumping uses elastic cords that stretch significantly during the fall.",
      question: "Why is the cord's stretchiness important for safety?",
      options: [
        "It makes the jump more exciting",
        "It extends stopping time, reducing force on the jumper",
        "It keeps the cord from breaking",
        "It makes the cord lighter"
      ],
      correctIndex: 1,
      explanation: "The elastic cord stretches over several seconds, gradually slowing the jumper. A rigid rope would stop them in milliseconds with deadly force."
    },
    {
      scenario: "Dropping an egg from 1 meter onto thick foam, it survives. From 10 meters onto the same foam, it breaks.",
      question: "Why does height matter if the foam is the same?",
      options: [
        "Higher drops give more momentum, requiring more force to stop",
        "Foam only works at low heights",
        "The egg gets scared at higher heights",
        "Air resistance is different"
      ],
      correctIndex: 0,
      explanation: "Higher drop = higher velocity = more momentum (p = mv). More momentum requires more impulse to stop, and even with foam extending time, the force can exceed breaking point."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🚗",
      title: "Car Crumple Zones",
      tagline: "Designed to crush, not you",
      description: "Modern cars have front and rear sections that deliberately crumple in crashes, extending impact time from 50ms to 300ms+.",
      connection: "This 6× increase in stopping time means 6× less force on passengers. Crumple zones save thousands of lives yearly."
    },
    {
      icon: "🪖",
      title: "Helmet Technology",
      tagline: "Crushing foam saves brains",
      description: "Bike, motorcycle, and sports helmets use EPS foam that crushes on impact, spreading deceleration over critical milliseconds.",
      connection: "The foam's crushing is the protection - it turns a 2ms impact into a 20ms controlled stop, reducing brain injury risk by 85%."
    },
    {
      icon: "📦",
      title: "Packaging Engineering",
      tagline: "Getting fragile items there safely",
      description: "Styrofoam, bubble wrap, and air pillows all work by increasing the time over which shipped items experience impact forces.",
      connection: "When packing peanuts compress, they're doing exactly what egg drop padding does - trading distance for reduced force."
    },
    {
      icon: "🪂",
      title: "Parachute Landing Falls",
      tagline: "Military technique for safe landings",
      description: "Paratroopers are trained to roll upon landing, spreading the impact across their body over several hundred milliseconds.",
      connection: "A rigid landing concentrates force in milliseconds. Rolling spreads it over half a second - reducing force by 100×."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate impact force and survival
  private calculateSurvival(padding: 'none' | 'foam' | 'thick', height: 'low' | 'medium' | 'high'): boolean {
    // Calculate velocity at impact: v = sqrt(2gh)
    const heights = { low: 1, medium: 3, high: 5 }; // meters
    const h = heights[height];
    const impactVelocity = Math.sqrt(2 * GRAVITY * h);

    // Calculate momentum: p = mv
    const momentum = EGG_MASS * impactVelocity;

    // Calculate stopping time based on padding
    // F × Δt = Δp → F = Δp / Δt
    const stoppingTimes = { none: 0.001, foam: 0.015, thick: 0.04 }; // seconds
    const stopTime = stoppingTimes[padding];

    // Calculate average force
    const averageForce = momentum / stopTime;

    // Egg survives if force is below breaking threshold
    return averageForce < EGG_BREAKING_FORCE;
  }

  // PROTECTED: Calculate impact velocity (for display)
  private calculateImpactVelocity(height: 'low' | 'medium' | 'high'): number {
    const heights = { low: 1, medium: 3, high: 5 }; // meters
    return Math.sqrt(2 * GRAVITY * heights[height]);
  }

  // PROTECTED: Calculate impact force (for display, simplified)
  private calculateImpactForce(padding: 'none' | 'foam' | 'thick', height: 'low' | 'medium' | 'high'): number {
    const velocity = this.calculateImpactVelocity(height);
    const momentum = EGG_MASS * velocity;
    const stoppingTimes = { none: 0.001, foam: 0.015, thick: 0.04 };
    return momentum / stoppingTimes[padding];
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
          if (buttonId.startsWith('option_')) {
            this.prediction = parseInt(buttonId.split('_')[1]);
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
          this.resetDrop();
        }
        break;

      case 'play':
        if (buttonId === 'drop_egg') {
          this.startDrop();
        } else if (buttonId === 'reset') {
          this.resetDrop();
        } else if (buttonId === 'padding_none') {
          this.paddingType = 'none';
          this.resetDrop();
        } else if (buttonId === 'padding_foam') {
          this.paddingType = 'foam';
          this.resetDrop();
        } else if (buttonId === 'padding_thick') {
          this.paddingType = 'thick';
          this.resetDrop();
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
          this.resetTwistDrop();
        }
        break;

      case 'twist_play':
        if (buttonId === 'drop_egg') {
          this.startTwistDrop();
        } else if (buttonId === 'reset') {
          this.resetTwistDrop();
        } else if (buttonId === 'height_low') {
          this.twistHeight = 'low';
          this.resetTwistDrop();
        } else if (buttonId === 'height_medium') {
          this.twistHeight = 'medium';
          this.resetTwistDrop();
        } else if (buttonId === 'height_high') {
          this.twistHeight = 'high';
          this.resetTwistDrop();
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

  processInput(input: UserInput, config: SessionConfig): void {
    this.handleInput(input);
  }

  private startDrop(): void {
    if (this.isDropping) return;
    this.isDropping = true;
    this.dropComplete = false;
    this.eggPosition = 0;
    this.eggSurvived = null;
  }

  private startTwistDrop(): void {
    if (this.isDropping) return;
    this.isDropping = true;
    this.twistDropComplete = false;
    this.eggPosition = 0;
    this.twistEggSurvived = null;
  }

  private resetDrop(): void {
    this.eggPosition = 0;
    this.dropComplete = false;
    this.eggSurvived = null;
    this.isDropping = false;
  }

  private resetTwistDrop(): void {
    this.eggPosition = 0;
    this.twistDropComplete = false;
    this.twistEggSurvived = null;
    this.isDropping = false;
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.paddingType = 'none';
    this.dropHeight = 'medium';
    this.resetDrop();
    this.twistHeight = 'medium';
    this.resetTwistDrop();
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Update drop animation
    if (this.isDropping && this.eggPosition < 100) {
      const speed = this.phase === 'twist_play'
        ? { low: 3, medium: 5, high: 7 }[this.twistHeight]
        : 5;
      this.eggPosition += speed * deltaTime * 60;

      if (this.eggPosition >= 100) {
        this.eggPosition = 100;
        this.isDropping = false;

        if (this.phase === 'play') {
          this.dropComplete = true;
          this.eggSurvived = this.calculateSurvival(this.paddingType, 'medium');
        } else if (this.phase === 'twist_play') {
          this.twistDropComplete = true;
          this.twistEggSurvived = this.calculateSurvival('foam', this.twistHeight);
        }
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Sky gradient background
    r.clear('#e0f2fe');
    r.rect(0, 500, 400, 200, { fill: '#78716c' }); // Ground

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
    // Override background for hook
    r.clear('#0f172a');
    r.circle(100, 100, 150, { fill: 'rgba(99, 102, 241, 0.05)' });

    // Badge
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(251, 191, 36, 0.1)' });
    r.text(200, 80, 'PHYSICS CHALLENGE', { fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Egg Drop Challenge', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Can physics save a falling egg?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Egg illustration
    r.ellipse(200, 250, 30, 40, { fill: '#fefce8', stroke: '#fde047', strokeWidth: 3 });
    r.ellipse(200, 250, 20, 28, { fill: 'rgba(253, 224, 71, 0.5)' });
    r.text(200, 255, '🥚', { fontSize: 24, textAnchor: 'middle' });

    // Scenario card
    r.roundRect(40, 310, 320, 130, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 345, 'Drop an egg from a 3-story building...', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 375, 'One lands on concrete. One lands on foam.', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 415, 'Why does foam save the egg?', { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Hint
    r.roundRect(60, 460, 280, 50, 10, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 490, 'The secret is in how FORCE spreads over TIME', { fill: '#818cf8', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'discover', label: 'Make Your Prediction', variant: 'primary' });

    r.setCoachMessage('Why does padding protect fragile objects?');
  }

  private renderPredict(r: CommandRenderer): void {
    r.clear('#0f172a');
    r.text(200, 70, 'Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 100, 'Why does padding protect eggs?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    const options = [
      { label: 'Padding absorbs all the energy', icon: '🔋' },
      { label: 'Padding is softer than the ground', icon: '🧸' },
      { label: 'Padding extends impact TIME', icon: '⏱️' },
      { label: 'Padding reduces egg speed', icon: '🐌' }
    ];

    options.forEach((option, i) => {
      const y = 140 + i * 65;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (i === 2) { // Correct answer
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
      r.text(55, y + 32, option.icon, { fontSize: 18 });
      r.text(85, y + 35, option.label, { fill: textColor, fontSize: 13 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 415, 340, 120, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 2 ? 'Exactly right!' : 'The answer is TIME!';
      r.text(200, 450, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 480, 'F × Δt = Δp (Impulse-Momentum)', { fill: '#fbbf24', fontSize: 14, textAnchor: 'middle' });
      r.text(200, 510, 'More time = Less force on the egg!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Start the Experiment', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.clear('#e0f2fe');
    r.text(200, 45, 'Egg Drop Lab', { fill: '#1e293b', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Building/platform
    r.rect(140, 70, 120, 30, { fill: '#94a3b8' });
    r.text(200, 90, '3m DROP', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    // Drop zone
    const dropY = 100 + (this.eggPosition / 100) * 200;

    // Padding on ground
    if (this.paddingType !== 'none') {
      const padHeight = this.paddingType === 'thick' ? 30 : 15;
      const padColor = this.paddingType === 'thick' ? '#34d399' : '#60a5fa';
      r.rect(130, 300 - padHeight, 140, padHeight, { fill: padColor });
      r.text(200, 300 - padHeight / 2, this.paddingType === 'thick' ? 'THICK FOAM' : 'FOAM', { fill: '#ffffff', fontSize: 9, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Ground
    r.rect(100, 300, 200, 40, { fill: '#78716c' });

    // Egg
    if (!this.dropComplete) {
      r.ellipse(200, dropY, 15, 20, { fill: '#fefce8', stroke: '#fde047', strokeWidth: 2 });
    } else {
      if (this.eggSurvived) {
        r.ellipse(200, 285, 15, 20, { fill: '#fefce8', stroke: '#fde047', strokeWidth: 2 });
        r.text(200, 360, '✓ SURVIVED!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      } else {
        r.ellipse(200, 295, 25, 10, { fill: '#fde047' });
        r.text(200, 360, '✗ BROKE!', { fill: '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      }
    }

    // Force display
    if (this.dropComplete) {
      const force = this.calculateImpactForce(this.paddingType, 'medium');
      r.roundRect(30, 380, 340, 50, 10, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 405, `Impact Force: ${force.toFixed(1)}N`, { fill: force < EGG_BREAKING_FORCE ? '#34d399' : '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 425, `Breaking threshold: ${EGG_BREAKING_FORCE}N`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    }

    // Padding selector
    r.text(200, 460, 'Select Padding:', { fill: '#1e293b', fontSize: 12, textAnchor: 'middle' });
    r.addButton({ id: 'padding_none', label: 'None', variant: this.paddingType === 'none' ? 'primary' : 'secondary' });
    r.addButton({ id: 'padding_foam', label: 'Foam', variant: this.paddingType === 'foam' ? 'primary' : 'secondary' });
    r.addButton({ id: 'padding_thick', label: 'Thick', variant: this.paddingType === 'thick' ? 'primary' : 'secondary' });

    // Drop/Reset buttons
    if (!this.isDropping && !this.dropComplete) {
      r.addButton({ id: 'drop_egg', label: 'Drop Egg', variant: 'primary' });
    }
    if (this.dropComplete) {
      r.addButton({ id: 'reset', label: 'Try Again', variant: 'secondary' });
    }

    r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.clear('#0f172a');
    r.text(200, 55, 'The Impulse-Momentum Theorem', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Main formula
    r.roundRect(30, 85, 340, 100, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 115, 'The Key Equation', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(70, 130, 260, 40, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 157, 'F × Δt = Δp = m × Δv', { fill: '#ffffff', fontSize: 18, textAnchor: 'middle' });

    // Explanation
    r.roundRect(30, 200, 340, 120, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 230, 'Force × Time = Momentum Change', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 265, 'If Δp is constant (same drop)', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 290, '↑ Time = ↓ Force', { fill: '#34d399', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Padding comparison
    r.roundRect(30, 340, 165, 90, 12, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(112, 365, 'No Padding', { fill: '#f87171', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(112, 390, 'Stop time: 1ms', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(112, 410, 'Force: HUGE', { fill: '#ef4444', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(205, 340, 165, 90, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(287, 365, 'Thick Foam', { fill: '#34d399', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(287, 390, 'Stop time: 40ms', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(287, 410, 'Force: 40× less', { fill: '#10b981', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Height Effects', variant: 'secondary' });

    r.setCoachMessage('More stopping time = less force on the egg!');
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.clear('#0f172a');
    r.text(200, 60, 'The Twist: Height Matters', { fill: '#a78bfa', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'Same foam padding, but now we test', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'drops from different HEIGHTS.', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 180, 'What happens as we go higher?', { fill: '#a78bfa', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      'Height doesn\'t matter - foam protects equally',
      'Higher drops survive better (more time to slow)',
      'Higher drops break (more momentum to stop)',
      'Height only matters without padding'
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (i === 2) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.twistPrediction) {
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(45, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 440, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      r.text(200, 475, 'Higher drops have more momentum!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 505, 'p = mv. Faster fall = more momentum', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 525, 'Even foam can\'t reduce extreme forces enough!', { fill: '#a78bfa', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test Different Heights', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.clear('#e0f2fe');
    r.text(200, 45, 'Height Test Lab', { fill: '#1e293b', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    const heights = { low: 80, medium: 150, high: 220 };
    const platformY = 280 - heights[this.twistHeight];

    // Platform
    r.rect(140, platformY, 120, 25, { fill: '#94a3b8' });
    r.text(200, platformY + 17, `${this.twistHeight === 'low' ? '1m' : this.twistHeight === 'medium' ? '3m' : '5m'}`, { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    // Foam padding on ground
    r.rect(130, 280, 140, 15, { fill: '#60a5fa' });
    r.text(200, 290, 'FOAM', { fill: '#ffffff', fontSize: 9, fontWeight: 'bold', textAnchor: 'middle' });

    // Ground
    r.rect(100, 295, 200, 40, { fill: '#78716c' });

    // Egg
    const dropY = platformY + 25 + (this.eggPosition / 100) * (255 - platformY);

    if (!this.twistDropComplete) {
      r.ellipse(200, dropY, 15, 20, { fill: '#fefce8', stroke: '#fde047', strokeWidth: 2 });
    } else {
      if (this.twistEggSurvived) {
        r.ellipse(200, 275, 15, 20, { fill: '#fefce8', stroke: '#fde047', strokeWidth: 2 });
        r.text(200, 355, '✓ SURVIVED!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      } else {
        r.ellipse(200, 288, 25, 10, { fill: '#fde047' });
        r.text(200, 355, '✗ BROKE!', { fill: '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      }
    }

    // Velocity and force display
    if (this.twistDropComplete) {
      const velocity = this.calculateImpactVelocity(this.twistHeight);
      const force = this.calculateImpactForce('foam', this.twistHeight);
      r.roundRect(30, 380, 340, 60, 10, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 400, `Impact velocity: ${velocity.toFixed(1)} m/s`, { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 425, `Force with foam: ${force.toFixed(1)}N`, { fill: force < EGG_BREAKING_FORCE ? '#34d399' : '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Height selector
    r.text(200, 465, 'Select Height:', { fill: '#1e293b', fontSize: 12, textAnchor: 'middle' });
    r.addButton({ id: 'height_low', label: '1m (Low)', variant: this.twistHeight === 'low' ? 'primary' : 'secondary' });
    r.addButton({ id: 'height_medium', label: '3m (Medium)', variant: this.twistHeight === 'medium' ? 'primary' : 'secondary' });
    r.addButton({ id: 'height_high', label: '5m (High)', variant: this.twistHeight === 'high' ? 'primary' : 'secondary' });

    if (!this.isDropping && !this.twistDropComplete) {
      r.addButton({ id: 'drop_egg', label: 'Drop Egg', variant: 'primary' });
    }
    if (this.twistDropComplete) {
      r.addButton({ id: 'reset', label: 'Try Again', variant: 'secondary' });
    }

    r.addButton({ id: 'continue', label: 'Learn Why Height Matters', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.clear('#0f172a');
    r.text(200, 55, 'Why Height Breaks Even Padded Eggs', { fill: '#a78bfa', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Momentum explanation
    r.roundRect(30, 85, 340, 100, 16, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 115, 'Momentum = mass × velocity', { fill: '#a78bfa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 145, 'Higher drop → Faster fall → More momentum', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 170, 'More momentum needs more impulse to stop!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Height comparison
    r.roundRect(30, 200, 110, 80, 10, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(85, 225, '1m Drop', { fill: '#34d399', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(85, 250, `v = ${this.calculateImpactVelocity('low').toFixed(1)} m/s`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(85, 270, 'Survives!', { fill: '#10b981', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(145, 200, 110, 80, 10, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 225, '3m Drop', { fill: '#fbbf24', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 250, `v = ${this.calculateImpactVelocity('medium').toFixed(1)} m/s`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 270, 'Borderline', { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(260, 200, 110, 80, 10, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(315, 225, '5m Drop', { fill: '#f87171', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(315, 250, `v = ${this.calculateImpactVelocity('high').toFixed(1)} m/s`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(315, 270, 'Breaks!', { fill: '#ef4444', fontSize: 10, textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 300, 340, 80, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 330, 'The Limit of Padding', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 355, 'Padding extends time, but at some point', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 375, 'the momentum is too great to absorb safely.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.clear('#0f172a');
    r.text(200, 55, 'Impulse Physics Saves Lives', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#6366f1';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.tagline, { fill: '#fbbf24', fontSize: 11, textAnchor: 'middle' });

    // Description (multi-line)
    const words = app.description.split(' ');
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

    // Physics connection
    r.roundRect(40, 320, 320, 70, 10, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 345, 'Physics Connection', { fill: '#818cf8', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 370, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 420, '✓ Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    r.text(200, 460, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    r.clear('#0f172a');

    if (!this.showTestResults) {
      r.text(200, 55, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      r.roundRect(25, 100, 350, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 130, question.scenario.substring(0, 50), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 148, question.scenario.substring(50, 100), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      r.text(200, 200, question.question, { fill: '#fbbf24', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      question.options.forEach((option, i) => {
        const y = 230 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 42, 8, { fill: bgColor });
        r.text(40, y + 25, `${String.fromCharCode(65 + i)}. ${option}`, { fill: isSelected ? '#818cf8' : '#e2e8f0', fontSize: 11 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: '← Previous', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next →', variant: 'secondary' });
      }

      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      } else {
        r.text(200, 480, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🎉' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "Excellent! You understand impulse physics!" : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.clear('#0f172a');
    r.text(200, 120, '🏆', { fontSize: 72, textAnchor: 'middle' });

    r.text(200, 200, 'Impulse Physics Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand how time reduces force!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    const concepts = [
      { icon: '⏱️', label: 'F × Δt = Δp' },
      { icon: '🥚', label: 'Padding Extends Time' },
      { icon: '🚗', label: 'Crumple Zones' },
      { icon: '🪖', label: 'Helmet Protection' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 280 + Math.floor(i / 2) * 70;
      r.roundRect(x, y, 135, 55, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 67, y + 22, concept.icon, { fontSize: 18, textAnchor: 'middle' });
      r.text(x + 67, y + 44, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    r.roundRect(50, 440, 300, 70, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 468, 'Key Principle', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 495, 'More time = Less force = Survival!', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering impulse physics!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      paddingType: this.paddingType,
      dropHeight: this.dropHeight,
      eggPosition: this.eggPosition,
      isDropping: this.isDropping,
      dropComplete: this.dropComplete,
      eggSurvived: this.eggSurvived,
      twistHeight: this.twistHeight,
      twistDropComplete: this.twistDropComplete,
      twistEggSurvived: this.twistEggSurvived,
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
    if (state.paddingType !== undefined) this.paddingType = state.paddingType as 'none' | 'foam' | 'thick';
    if (state.dropHeight !== undefined) this.dropHeight = state.dropHeight as 'low' | 'medium' | 'high';
    if (state.eggPosition !== undefined) this.eggPosition = state.eggPosition as number;
    if (state.isDropping !== undefined) this.isDropping = state.isDropping as boolean;
    if (state.dropComplete !== undefined) this.dropComplete = state.dropComplete as boolean;
    if (state.eggSurvived !== undefined) this.eggSurvived = state.eggSurvived as boolean | null;
    if (state.twistHeight !== undefined) this.twistHeight = state.twistHeight as 'low' | 'medium' | 'high';
    if (state.twistDropComplete !== undefined) this.twistDropComplete = state.twistDropComplete as boolean;
    if (state.twistEggSurvived !== undefined) this.twistEggSurvived = state.twistEggSurvived as boolean | null;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createEggDropGame(sessionId: string): EggDropGame {
  return new EggDropGame(sessionId);
}
