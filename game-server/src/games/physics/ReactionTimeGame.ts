import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// REACTION TIME GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: d = 1/2 * g * t^2 -> t = sqrt(2d/g)
// Measure reaction time using free fall physics
// Human reaction time is typically 150-300ms
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
const GRAVITY = 9.8; // m/s^2

export class ReactionTimeGame extends BaseGame {
  readonly gameType = 'reaction_time';
  readonly gameTitle = 'Reaction Time: The Ruler Drop Test';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private rulerState: 'ready' | 'waiting' | 'dropping' | 'caught' | 'missed' = 'ready';
  private rulerPosition = 0; // cm fallen
  private dropStartTime = 0;
  private catchDistance = 0; // cm
  private reactionTime = 0; // ms
  private attempts: number[] = [];

  // Twist: distraction type
  private distractionType: 'none' | 'visual' | 'audio' | 'math' = 'none';
  private mathProblem = { a: 0, b: 0, answer: 0 };
  private twistAttempts: { type: string; time: number }[] = [];

  // Animation
  private animationTime = 0;
  private waitingTimer = 0;
  private dropDelay = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "A student catches a ruler after it falls 15cm during a reaction time test.",
      question: "What equation relates fall distance to reaction time?",
      options: ["t = d/g", "t = sqrt(2d/g)", "t = d * g", "t = 2d/g"],
      correctIndex: 1,
      explanation: "From d = 1/2 * g * t^2, solving for t gives t = sqrt(2d/g). This is derived from the kinematic equation for free fall."
    },
    {
      scenario: "A researcher measures a subject's reaction time as 200ms.",
      question: "How far would a ruler fall in this time?",
      options: ["About 5cm", "About 10cm", "About 20cm", "About 40cm"],
      correctIndex: 2,
      explanation: "d = 1/2 * g * t^2 = 1/2 * 9.8 * (0.2)^2 = 0.196m = 19.6cm, approximately 20cm."
    },
    {
      scenario: "A typical human reaction time to visual stimuli is measured.",
      question: "What is the typical range for visual reaction time?",
      options: ["50-100ms", "150-300ms", "500-800ms", "1-2 seconds"],
      correctIndex: 1,
      explanation: "Average human visual reaction time is 150-300ms. Athletes can achieve 150-180ms, while average people are around 200-250ms."
    },
    {
      scenario: "A driver sees brake lights ahead and must react.",
      question: "Why does distraction significantly increase reaction time?",
      options: ["It weakens muscles", "Divided attention slows neural processing", "Eyes move slower", "Reflexes stop working"],
      correctIndex: 1,
      explanation: "Cognitive load from distractions competes for brain resources. Processing multiple stimuli simultaneously delays the response to any single one."
    },
    {
      scenario: "Scientists compare reaction times across different senses.",
      question: "Which sense typically has the fastest reaction time?",
      options: ["Vision", "Touch", "Hearing", "Smell"],
      correctIndex: 2,
      explanation: "Auditory reaction time (~150ms) is typically faster than visual (~180ms) because the auditory pathway has fewer synapses to cross."
    },
    {
      scenario: "A student asks why reaction time can't be instant.",
      question: "What limits how fast we can react?",
      options: ["Battery power in nerves", "Speed of light", "Nerve signal speed and synapse delays", "Blood oxygen levels"],
      correctIndex: 2,
      explanation: "Nerve signals travel at 30-120 m/s (not instant!), and each synapse adds ~1ms delay. The pathway from eye to motor neurons involves multiple synapses."
    },
    {
      scenario: "An esports player trains to improve reaction time.",
      question: "By how much can training typically improve reaction time?",
      options: ["10-20%", "50-75%", "No improvement possible", "100% (double speed)"],
      correctIndex: 0,
      explanation: "Training can improve reaction time by about 10-20% through anticipation and faster decision-making, but biological limits exist."
    },
    {
      scenario: "A safety engineer designs warning systems for vehicles.",
      question: "At 60 mph, a 200ms reaction time means traveling how far before reacting?",
      options: ["About 2 meters", "About 5 meters", "About 10 meters", "About 20 meters"],
      correctIndex: 1,
      explanation: "60 mph = 26.8 m/s. In 0.2 seconds: d = 26.8 * 0.2 = 5.36m, about 5 meters before you even begin to brake."
    },
    {
      scenario: "A researcher studies how age affects reaction time.",
      question: "How does reaction time change with age?",
      options: ["Gets faster with age", "Stays constant", "Slows gradually after 20s", "Only changes after 70"],
      correctIndex: 2,
      explanation: "Reaction time peaks in the 20s and gradually slows due to decreasing nerve conduction speed and processing efficiency."
    },
    {
      scenario: "A coffee company claims their product 'improves reaction time.'",
      question: "How might caffeine actually affect reaction time?",
      options: ["It doesn't affect reaction time", "Decreases it slightly by increasing alertness", "Dramatically speeds up reflexes", "Slows reaction time"],
      correctIndex: 1,
      explanation: "Caffeine moderately improves alertness and can reduce reaction time by 5-10% by blocking adenosine receptors that cause drowsiness."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "car",
      title: "Driving Safety",
      tagline: "Why following distance matters",
      description: "At highway speeds, your reaction time determines minimum safe following distance. In 200ms at 70mph, you travel 6+ meters before even starting to brake.",
      connection: "Reaction time + braking distance = total stopping distance. This is why texting while driving is so dangerous - it adds 1-2 seconds of reaction delay."
    },
    {
      icon: "game",
      title: "Esports & Gaming",
      tagline: "Milliseconds make champions",
      description: "Professional gamers train to minimize reaction time. In competitive games, 50ms faster reaction can mean the difference between winning and losing.",
      connection: "d = 1/2 * g * t^2 means small time differences have outsized effects. A 50ms advantage compounds over thousands of in-game decisions."
    },
    {
      icon: "sports",
      title: "Sports Performance",
      tagline: "The athletic edge",
      description: "Athletes in sports like baseball, tennis, and boxing need exceptional reaction times. A fastball gives batters only 400ms to see, decide, and swing.",
      connection: "Elite athletes have ~150ms visual reaction times. Training improves anticipation, effectively 'buying time' to react."
    },
    {
      icon: "medical",
      title: "Medical Diagnostics",
      tagline: "Reaction time as health indicator",
      description: "Doctors use reaction time tests to assess neurological health. Slowed reactions can indicate concussion, sleep deprivation, or cognitive decline.",
      connection: "The ruler drop test is used clinically because t = sqrt(2d/g) provides precise, equipment-free measurements of neural processing speed."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Convert fall distance to reaction time
  private distanceToTime(distanceCm: number): number {
    // d = 1/2 * g * t^2 -> t = sqrt(2d/g)
    const distanceM = distanceCm / 100;
    return Math.sqrt((2 * distanceM) / GRAVITY) * 1000; // Convert to ms
  }

  // PROTECTED: Convert reaction time to fall distance
  private timeToDistance(timeMs: number): number {
    // t = sqrt(2d/g) -> d = 1/2 * g * t^2
    const timeS = timeMs / 1000;
    return (0.5 * GRAVITY * timeS * timeS) * 100; // Convert to cm
  }

  // PROTECTED: Get rating based on reaction time
  private getReactionRating(ms: number): { label: string; color: string } {
    if (ms < 180) return { label: 'Excellent!', color: '#10b981' };
    if (ms < 220) return { label: 'Great!', color: '#3b82f6' };
    if (ms < 280) return { label: 'Average', color: '#f59e0b' };
    return { label: 'Keep practicing', color: '#ef4444' };
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
        }
        break;

      case 'play':
        if (buttonId === 'start_test') {
          this.startDropTest();
        } else if (buttonId === 'catch') {
          this.catchRuler();
        } else if (buttonId === 'reset') {
          this.resetDropTest();
        } else if (buttonId === 'continue' && this.attempts.length >= 3) {
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
          this.distractionType = 'math';
        }
        break;

      case 'twist_play':
        if (buttonId === 'distraction_visual') {
          this.distractionType = 'visual';
        } else if (buttonId === 'distraction_math') {
          this.distractionType = 'math';
        } else if (buttonId === 'distraction_none') {
          this.distractionType = 'none';
        } else if (buttonId === 'start_test') {
          this.startDropTest();
          if (this.distractionType === 'math') {
            this.mathProblem = {
              a: Math.floor(Math.random() * 10) + 5,
              b: Math.floor(Math.random() * 10) + 5,
              answer: 0
            };
            this.mathProblem.answer = this.mathProblem.a + this.mathProblem.b;
          }
        } else if (buttonId === 'catch') {
          this.catchRuler();
          if (this.reactionTime > 0) {
            this.twistAttempts.push({ type: this.distractionType, time: this.reactionTime });
          }
        } else if (buttonId === 'reset') {
          this.resetDropTest();
        } else if (buttonId === 'continue' && this.twistAttempts.length >= 3) {
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

  private startDropTest(): void {
    this.rulerState = 'waiting';
    this.rulerPosition = 0;
    this.catchDistance = 0;
    this.reactionTime = 0;
    this.waitingTimer = 0;
    this.dropDelay = 1 + Math.random() * 2; // 1-3 seconds delay
  }

  private catchRuler(): void {
    if (this.rulerState === 'waiting') {
      // Jumped the gun
      this.rulerState = 'ready';
      return;
    }

    if (this.rulerState !== 'dropping') return;

    this.catchDistance = this.rulerPosition;
    this.reactionTime = this.distanceToTime(this.catchDistance);
    this.rulerState = 'caught';

    if (this.phase === 'play') {
      this.attempts.push(this.reactionTime);
    }
  }

  private resetDropTest(): void {
    this.rulerState = 'ready';
    this.rulerPosition = 0;
    this.catchDistance = 0;
    this.reactionTime = 0;
    this.waitingTimer = 0;
    this.dropDelay = 0;
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
    this.rulerState = 'ready';
    this.rulerPosition = 0;
    this.catchDistance = 0;
    this.reactionTime = 0;
    this.attempts = [];
    this.distractionType = 'none';
    this.twistAttempts = [];
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    if (this.rulerState === 'waiting') {
      this.waitingTimer += deltaTime;
      if (this.waitingTimer >= this.dropDelay) {
        this.rulerState = 'dropping';
        this.dropStartTime = this.animationTime;
      }
    }

    if (this.rulerState === 'dropping') {
      // Calculate position based on free fall
      const elapsedTime = this.animationTime - this.dropStartTime;
      // d = 1/2 * g * t^2, convert to cm
      this.rulerPosition = 0.5 * GRAVITY * elapsedTime * elapsedTime * 100;

      if (this.rulerPosition >= 30) {
        this.rulerState = 'missed';
        this.rulerPosition = 30;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(99, 102, 241, 0.05)' });
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
    // Badge
    r.roundRect(110, 60, 180, 30, 8, { fill: 'rgba(99, 102, 241, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#818cf8', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Reaction Time Test', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, "Measure your brain's speed limit", { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Brain -> Nerves -> Hand diagram
    r.roundRect(50, 190, 300, 120, 12, { fill: 'rgba(30, 41, 59, 0.8)' });

    // Brain
    r.circle(100, 250, 25, { fill: '#818cf8' });
    r.text(100, 255, 'BRAIN', { fill: '#1e1b4b', fontSize: 8, fontWeight: 'bold', textAnchor: 'middle' });

    // Nerves
    r.line(125, 250, 175, 250, { stroke: '#818cf8', strokeWidth: 3 });
    r.circle(200, 250, 20, { fill: '#60a5fa' });
    r.text(200, 254, 'NERVES', { fill: '#1e3a8a', fontSize: 7, textAnchor: 'middle' });

    // Hand
    r.line(220, 250, 270, 250, { stroke: '#818cf8', strokeWidth: 3 });
    r.ellipse(300, 250, 25, 15, { fill: '#fbbf24' });
    r.text(300, 255, 'HAND', { fill: '#78350f', fontSize: 8, fontWeight: 'bold', textAnchor: 'middle' });

    // Time labels
    r.text(150, 225, '~50ms', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(245, 225, '~100ms', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(200, 290, 'Total: ~150-300ms', { fill: '#818cf8', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    // Question card
    r.roundRect(40, 330, 320, 120, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 365, "Your brain can't react instantly!", { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 395, 'There is a physical speed limit.', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 430, 'Can we measure it with physics?', { fill: '#818cf8', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Test Your Reaction', variant: 'primary' });

    r.setCoachMessage('We can measure reaction time using a falling ruler and physics!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'How fast can humans react to', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'visual stimuli?', { fill: '#818cf8', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Less than 100ms (lightning fast!)',
      '150-300ms (typical human range)',
      '500-800ms (pretty slow)',
      'More than 1 second'
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
      const message = this.prediction === 1 ? 'Correct!' : 'The answer: 150-300ms!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 530, 'Your nervous system has a speed limit.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 550, "Let's measure yours!", { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Start the Test', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Ruler Drop Test', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Ruler visualization
    this.renderRulerDrop(r, false);

    // Results display
    if (this.rulerState === 'caught') {
      const rating = this.getReactionRating(this.reactionTime);
      r.roundRect(40, 370, 320, 80, 12, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 395, `${this.reactionTime.toFixed(0)}ms`, { fill: rating.color, fontSize: 32, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 425, `Caught at ${this.catchDistance.toFixed(1)}cm - ${rating.label}`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    } else if (this.rulerState === 'missed') {
      r.roundRect(40, 370, 320, 80, 12, { fill: 'rgba(239, 68, 68, 0.2)' });
      r.text(200, 410, 'Missed! Try again.', { fill: '#ef4444', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Attempts display
    if (this.attempts.length > 0) {
      r.roundRect(40, 465, 320, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      const avgTime = this.attempts.reduce((a, b) => a + b, 0) / this.attempts.length;
      r.text(200, 490, `Attempts: ${this.attempts.length} | Average: ${avgTime.toFixed(0)}ms`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 510, this.attempts.map(t => `${t.toFixed(0)}ms`).join(', '), { fill: '#818cf8', fontSize: 10, textAnchor: 'middle' });
    }

    // Buttons
    if (this.rulerState === 'ready') {
      r.addButton({ id: 'start_test', label: 'Start Drop Test', variant: 'primary' });
    } else if (this.rulerState === 'waiting' || this.rulerState === 'dropping') {
      r.addButton({ id: 'catch', label: 'CATCH!', variant: 'primary' });
    } else {
      r.addButton({ id: 'reset', label: 'Try Again', variant: 'secondary' });
    }

    if (this.attempts.length >= 3) {
      r.addButton({ id: 'continue', label: 'See the Physics', variant: 'primary' });
    }

    const statusMessages: Record<string, string> = {
      'ready': 'Click to start',
      'waiting': 'Get ready...',
      'dropping': 'CATCH IT!',
      'caught': 'Nice catch!',
      'missed': 'Missed!'
    };
    r.setCoachMessage(statusMessages[this.rulerState] || '');
  }

  private renderRulerDrop(r: CommandRenderer, showDistraction: boolean): void {
    r.roundRect(100, 90, 200, 260, 12, { fill: 'rgba(248, 250, 252, 0.1)' });

    // Distraction visual
    if (showDistraction && this.distractionType === 'visual' && this.rulerState === 'dropping') {
      const flashColors = ['#ef4444', '#f59e0b', '#22d3ee'];
      const color = flashColors[Math.floor(this.animationTime * 5) % 3];
      r.circle(150 + Math.sin(this.animationTime * 10) * 30, 180, 15, { fill: color });
      r.circle(250 + Math.cos(this.animationTime * 8) * 25, 220, 12, { fill: color });
    }

    // Math problem distraction
    if (showDistraction && this.distractionType === 'math' && (this.rulerState === 'waiting' || this.rulerState === 'dropping')) {
      r.roundRect(160, 200, 80, 40, 5, { fill: '#ffffff' });
      r.text(200, 225, `${this.mathProblem.a} + ${this.mathProblem.b} = ?`, { fill: '#6366f1', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Hand at top (releasing)
    r.ellipse(200, 105, 25, 15, { fill: '#fbbf24' });

    // Ruler
    const rulerY = 115 + this.rulerPosition * 6;
    r.rect(185, rulerY, 30, 180, { fill: '#f59e0b' });

    // Ruler markings
    for (let cm = 0; cm <= 30; cm += 5) {
      const markY = rulerY + cm * 6;
      if (markY < 320 && markY > rulerY) {
        r.line(185, markY, 195, markY, { stroke: '#92400e', strokeWidth: 1 });
        r.text(210, markY + 3, `${cm}`, { fill: '#92400e', fontSize: 8 });
      }
    }

    // Catch hand at bottom
    r.ellipse(200, 340, 30, 18, { fill: '#fbbf24' });

    // Status indicator
    let statusColor = '#64748b';
    let statusText = 'Ready';
    if (this.rulerState === 'waiting') {
      statusColor = '#f59e0b';
      statusText = 'Get Ready...';
    } else if (this.rulerState === 'dropping') {
      statusColor = '#ef4444';
      statusText = 'CATCH!';
    } else if (this.rulerState === 'caught') {
      statusColor = '#10b981';
      statusText = 'Caught!';
    } else if (this.rulerState === 'missed') {
      statusColor = '#ef4444';
      statusText = 'Missed!';
    }

    r.roundRect(150, 70, 100, 24, 10, { fill: statusColor });
    r.text(200, 87, statusText, { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Physics of Reaction Time', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Free fall equation
    r.roundRect(30, 85, 340, 120, 16, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 115, 'Free Fall Physics', { fill: '#818cf8', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(70, 130, 260, 35, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 155, 'd = 1/2 * g * t^2', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.text(200, 190, 'Solving for time: t = sqrt(2d/g)', { fill: '#c4b5fd', fontSize: 12, textAnchor: 'middle' });

    // Example calculation
    r.roundRect(30, 220, 340, 100, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 250, 'Example Calculation', { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 280, 'If you catch at 20cm:', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 305, 't = sqrt(2 * 0.2 / 9.8) = 0.202s = 202ms', { fill: '#fef08a', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Your results
    if (this.attempts.length > 0) {
      const avgTime = this.attempts.reduce((a, b) => a + b, 0) / this.attempts.length;
      const rating = this.getReactionRating(avgTime);

      r.roundRect(30, 340, 340, 100, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
      r.text(200, 370, 'Your Average', { fill: '#34d399', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 410, `${avgTime.toFixed(0)}ms`, { fill: rating.color, fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 430, rating.label, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    }

    r.addButton({ id: 'continue', label: 'Test With Distractions', variant: 'secondary' });

    r.setCoachMessage('What happens when your brain is distracted?');
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist: Distractions', { fill: '#a855f7', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'What happens to your reaction time', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'when you are distracted?', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 180, '(like solving math while watching)', { fill: '#a855f7', fontSize: 13, textAnchor: 'middle' });

    // Options
    const options = [
      'No change - reflexes are automatic',
      'Gets faster - adrenaline kicks in',
      'Gets slower - divided attention',
      'Becomes random - unpredictable'
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 60;
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

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 2 ? 'Exactly right!' : 'Gets slower with divided attention!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 530, 'Your brain has limited processing power.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 550, "That's why texting while driving is dangerous!", { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test While Distracted', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Distraction Test', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Ruler visualization with distraction
    this.renderRulerDrop(r, true);

    // Distraction type selector
    r.roundRect(40, 365, 320, 50, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 385, 'Distraction Type:', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Distraction buttons
    const types = [
      { id: 'none', label: 'None', x: 60 },
      { id: 'visual', label: 'Visual', x: 155 },
      { id: 'math', label: 'Math', x: 250 }
    ];

    types.forEach(t => {
      const isActive = this.distractionType === t.id;
      r.roundRect(t.x, 395, 70, 25, 5, { fill: isActive ? '#a855f7' : 'rgba(51, 65, 85, 0.5)' });
      r.text(t.x + 35, 412, t.label, { fill: isActive ? '#ffffff' : '#94a3b8', fontSize: 10, textAnchor: 'middle' });
      r.addButton({ id: `distraction_${t.id}`, label: '', variant: 'secondary' });
    });

    // Results
    if (this.rulerState === 'caught' && this.reactionTime > 0) {
      const rating = this.getReactionRating(this.reactionTime);
      r.roundRect(40, 430, 320, 50, 10, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 455, `${this.reactionTime.toFixed(0)}ms with ${this.distractionType} distraction`, { fill: rating.color, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Attempts display
    if (this.twistAttempts.length > 0) {
      r.roundRect(40, 490, 320, 50, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      const lastThree = this.twistAttempts.slice(-3);
      r.text(200, 515, lastThree.map(a => `${a.type}: ${a.time.toFixed(0)}ms`).join(' | '), { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    }

    // Buttons
    if (this.rulerState === 'ready') {
      r.addButton({ id: 'start_test', label: 'Start Distraction Test', variant: 'primary' });
    } else if (this.rulerState === 'waiting' || this.rulerState === 'dropping') {
      r.addButton({ id: 'catch', label: 'CATCH!', variant: 'primary' });
    } else {
      r.addButton({ id: 'reset', label: 'Try Again', variant: 'secondary' });
    }

    if (this.twistAttempts.length >= 3) {
      r.addButton({ id: 'continue', label: 'See Comparison', variant: 'primary' });
    }
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Distraction Effects', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Compare normal vs distracted
    const normalAvg = this.attempts.length > 0 ? this.attempts.reduce((a, b) => a + b, 0) / this.attempts.length : 200;
    const distractedAvg = this.twistAttempts.length > 0
      ? this.twistAttempts.reduce((a, b) => a + b.time, 0) / this.twistAttempts.length
      : normalAvg * 1.3;

    r.roundRect(25, 85, 170, 150, 12, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(110, 115, 'Normal', { fill: '#818cf8', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 165, `${normalAvg.toFixed(0)}ms`, { fill: '#818cf8', fontSize: 32, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 210, 'Full attention', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.roundRect(205, 85, 170, 150, 12, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(290, 115, 'Distracted', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 165, `${distractedAvg.toFixed(0)}ms`, { fill: '#a855f7', fontSize: 32, fontWeight: 'bold', textAnchor: 'middle' });
    const increase = ((distractedAvg - normalAvg) / normalAvg * 100).toFixed(0);
    r.text(290, 210, `+${increase}% slower`, { fill: '#ef4444', fontSize: 11, textAnchor: 'middle' });

    // Real-world impact
    r.roundRect(25, 250, 350, 120, 16, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(200, 280, 'Why This Matters: Driving', { fill: '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 310, 'At 60 mph, you travel ~27 meters per second.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    const extraDistance = ((distractedAvg - normalAvg) / 1000 * 27).toFixed(1);
    r.text(200, 335, `Your ${increase}% slower reaction adds ${extraDistance}m`, { fill: '#fca5a5', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 355, 'before you even start braking!', { fill: '#fca5a5', fontSize: 12, textAnchor: 'middle' });

    // Key takeaway
    r.roundRect(40, 390, 320, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 420, 'Key Takeaway', { fill: '#fbbf24', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 450, 'Divided attention significantly slows reactions.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    const appLabels = ['Driving', 'Gaming', 'Sports', 'Medical'];

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
    r.text(200, 205, app.tagline, { fill: '#818cf8', fontSize: 11, textAnchor: 'middle' });

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
    r.text(200, 355, 'Physics Connection', { fill: '#818cf8', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
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
      r.text(200, 195, question.question, { fill: '#818cf8', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 220 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        const displayOption = option.length > 42 ? option.substring(0, 42) + '...' : option;
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${displayOption}`, { fill: isSelected ? '#818cf8' : '#e2e8f0', fontSize: 11 });

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
      r.text(200, 225, score >= 7 ? "You've mastered reaction time physics!" : 'Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 160, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts:', { fill: '#818cf8', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        't = sqrt(2d/g) - free fall equation',
        '150-300ms typical human reaction',
        'Distractions increase reaction time',
        'Real-world safety implications'
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
    r.text(200, 180, 'Reaction Time Expert!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 210, 'You understand the physics of', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 232, 'human reaction time!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { label: 't = sqrt(2d/g)', color: '#818cf8' },
      { label: '150-300ms Range', color: '#a855f7' },
      { label: 'Distraction Effects', color: '#ef4444' },
      { label: 'Safety Applications', color: '#10b981' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 270 + Math.floor(i / 2) * 70;
      r.roundRect(x, y, 140, 55, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 35, concept.label, { fill: concept.color, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 430, 300, 80, 12, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 458, 'Key Formula', { fill: '#818cf8', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 485, 'd = 1/2 * g * t^2', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 502, 't = sqrt(2d/g)', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Test Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering reaction time physics!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      rulerState: this.rulerState,
      rulerPosition: this.rulerPosition,
      catchDistance: this.catchDistance,
      reactionTime: this.reactionTime,
      attempts: this.attempts,
      distractionType: this.distractionType,
      twistAttempts: this.twistAttempts,
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
    if (state.rulerState !== undefined) this.rulerState = state.rulerState as 'ready' | 'waiting' | 'dropping' | 'caught' | 'missed';
    if (state.rulerPosition !== undefined) this.rulerPosition = state.rulerPosition as number;
    if (state.catchDistance !== undefined) this.catchDistance = state.catchDistance as number;
    if (state.reactionTime !== undefined) this.reactionTime = state.reactionTime as number;
    if (state.attempts) this.attempts = state.attempts as number[];
    if (state.distractionType !== undefined) this.distractionType = state.distractionType as 'none' | 'visual' | 'audio' | 'math';
    if (state.twistAttempts) this.twistAttempts = state.twistAttempts as { type: string; time: number }[];
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createReactionTimeGame(sessionId: string): ReactionTimeGame {
  return new ReactionTimeGame(sessionId);
}
