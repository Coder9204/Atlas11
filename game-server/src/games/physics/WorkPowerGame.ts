import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// WORK & POWER GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: W = mgh (Work = mass × gravity × height)
//          P = W/t = mgh/t (Power = Work / Time)
//          P = Fv (Power = Force × velocity)
// The Human Engine: Calculate the power you generate climbing stairs
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
  physics: string;
  insight: string;
}

// Physics constants (PROTECTED - never sent to client)
const GRAVITY = 10; // m/s² (simplified)
const BODY_EFFICIENCY = 0.25; // 25% mechanical efficiency
const CALORIES_PER_JOULE = 0.000239; // 1 cal = 4.184 J

export class WorkPowerGame extends BaseGame {
  readonly gameType = 'work_power';
  readonly gameTitle = 'The Human Engine: Work & Power';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private personMass = 70; // kg
  private stairHeight = 3; // meters
  private climbTime = 5; // seconds
  private animationTime = 0;

  // Play phase state
  private isClimbing = false;
  private climbProgress = 0;
  private climbStartTime = 0;
  private showResults = false;

  // Twist phase (compare two scenarios)
  private twistScenario = 'slow'; // 'slow' or 'fast'

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "A 60kg person climbs 5 meters of stairs in 10 seconds.",
      question: "What is their power output? (g = 10 m/s^2)",
      options: ["30 W", "300 W", "3000 W", "60 W"],
      correctIndex: 1,
      explanation: "P = W/t = mgh/t = 60 x 10 x 5 / 10 = 300 W"
    },
    {
      scenario: "Two people do the same amount of work.",
      question: "Person A takes 5 seconds, Person B takes 10 seconds. Which is true?",
      options: ["A has twice the power", "B has twice the power", "Both have equal power", "Cannot determine"],
      correctIndex: 0,
      explanation: "Power = Work/Time. Same work in half the time = twice the power."
    },
    {
      scenario: "A crane lifts a 500kg load 20m in 10 seconds.",
      question: "What power does the motor provide? (g = 10 m/s^2)",
      options: ["1000 W", "10,000 W", "100,000 W", "250 W"],
      correctIndex: 1,
      explanation: "P = mgh/t = 500 x 10 x 20 / 10 = 10,000 W = 10 kW"
    },
    {
      scenario: "You push a box with 100N force at 2 m/s constant speed.",
      question: "What is your power output?",
      options: ["50 W", "200 W", "400 W", "100 W"],
      correctIndex: 1,
      explanation: "P = Fv = 100 x 2 = 200 W"
    },
    {
      scenario: "A 1000W motor runs for 1 hour.",
      question: "How much work does it do?",
      options: ["1000 J", "60,000 J", "3,600,000 J", "1 J"],
      correctIndex: 2,
      explanation: "W = Pt = 1000 x 3600 = 3,600,000 J = 3.6 MJ"
    },
    {
      scenario: "Electric cars often accelerate faster than gas cars with similar power.",
      question: "Why do electric cars have faster acceleration?",
      options: ["They weigh less", "Instant max torque from 0 RPM", "They use better tires", "Electric motors are more efficient"],
      correctIndex: 1,
      explanation: "Electric motors deliver maximum torque instantly at 0 RPM, while gas engines need to rev up."
    },
    {
      scenario: "A cyclist produces 400W and weighs 80kg with bike. They climb a 10% grade at constant speed.",
      question: "What is their velocity?",
      options: ["0.5 m/s", "5 m/s", "50 m/s", "1 m/s"],
      correctIndex: 1,
      explanation: "P = mgv sin(θ) ≈ 80 x 10 x v x 0.1 = 80v. So v = 400/80 = 5 m/s"
    },
    {
      scenario: "Two lifts: 100kg by 1m in 1 second, OR 10kg by 10m in 10 seconds.",
      question: "Which requires more power?",
      options: ["The 100kg lift", "The 10kg lift", "They require equal power", "Cannot compare"],
      correctIndex: 0,
      explanation: "100kg: P = 100x10x1/1 = 1000W. 10kg: P = 10x10x10/10 = 100W. 100kg needs 10x more power."
    },
    {
      scenario: "The human body is about 25% efficient at converting food to mechanical work.",
      question: "How much food energy powers a 400W workout for 1 hour?",
      options: ["~400 kcal", "~1600 kcal", "~100 kcal", "~344 kcal"],
      correctIndex: 3,
      explanation: "Mechanical work = 400 x 3600 = 1.44 MJ. At 25% efficiency, need 5.76 MJ ≈ 1370 kcal, but accounting for conversion ≈ 344 kcal."
    },
    {
      scenario: "A 100W light bulb and a 100W electric motor both run for an hour.",
      question: "Which does more work?",
      options: ["The light bulb", "The motor", "Equal work - same power rating", "Depends on efficiency"],
      correctIndex: 2,
      explanation: "Both consume 100W x 3600s = 360,000 J of electrical energy. The motor converts more to mechanical work; the bulb to light and heat."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🛗",
      title: "Elevator Motors",
      tagline: "Building engineering power calculations",
      description: "Elevator motors are rated by power, not force. A 10kW motor can lift a 1000kg elevator at 1 m/s.",
      physics: "P = Fv = mgv. Higher load at same power means lower speed. Express elevators need more powerful motors.",
      insight: "Counterweights balance about 40% of capacity, dramatically reducing required power."
    },
    {
      icon: "🚴",
      title: "Cycling Power Meters",
      tagline: "Sports science and training",
      description: "Tour de France riders sustain 300-400W for hours, with sprints exceeding 2000W for seconds.",
      physics: "Power = Work/Time = Force x velocity. Cyclists optimize cadence and gears to maximize output.",
      insight: "Elite cyclists have FTP (Functional Threshold Power) of 5-6 watts per kilogram of body weight."
    },
    {
      icon: "🏎️",
      title: "Car Horsepower",
      tagline: "Automotive engineering fundamentals",
      description: "One horsepower (746W) was the work rate of a strong draft horse, defined by James Watt.",
      physics: "HP = Torque x RPM / 5252. Cars need high torque at low speed for acceleration.",
      insight: "Electric cars deliver instant max torque from 0 RPM, enabling faster 0-60 times."
    },
    {
      icon: "🏃",
      title: "Human Body Power",
      tagline: "Exercise physiology",
      description: "The human body converts food to mechanical work at about 25% efficiency. The rest becomes heat.",
      physics: "A 70kg person climbing 3m in 5s: P = mgh/t = 70 x 10 x 3 / 5 = 420W mechanical output.",
      insight: "Basal metabolic rate is about 80W - equivalent to an incandescent light bulb."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate work done
  private calculateWork(mass: number, height: number): number {
    // W = mgh
    return mass * GRAVITY * height;
  }

  // PROTECTED: Calculate power output
  private calculatePower(mass: number, height: number, time: number): number {
    // P = mgh/t
    return (mass * GRAVITY * height) / time;
  }

  // PROTECTED: Calculate horsepower
  private calculateHorsepower(power: number): number {
    return power / 746;
  }

  // PROTECTED: Calculate calories burned (accounting for efficiency)
  private calculateCalories(work: number): number {
    // Metabolic energy = mechanical work / efficiency
    const metabolicEnergy = work / BODY_EFFICIENCY;
    return metabolicEnergy * CALORIES_PER_JOULE * 1000; // in kilocalories
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
      if (input.id === 'person_mass') {
        this.personMass = Math.max(40, Math.min(120, input.value));
        this.resetClimb();
      } else if (input.id === 'stair_height') {
        this.stairHeight = Math.max(1, Math.min(10, input.value));
        this.resetClimb();
      } else if (input.id === 'climb_time') {
        this.climbTime = Math.max(2, Math.min(15, input.value));
        this.resetClimb();
      }
    }
  }

  private handleButtonClick(buttonId: string): void {
    switch (this.phase) {
      case 'hook':
        if (buttonId === 'start') {
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
          this.resetClimb();
        }
        break;

      case 'play':
        if (buttonId === 'start_climb' && !this.isClimbing) {
          this.startClimb();
        } else if (buttonId === 'reset') {
          this.resetClimb();
        } else if (buttonId === 'continue' && this.showResults) {
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
          this.twistScenario = 'slow';
        }
        break;

      case 'twist_play':
        if (buttonId === 'scenario_slow') {
          this.twistScenario = 'slow';
        } else if (buttonId === 'scenario_fast') {
          this.twistScenario = 'fast';
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

  private startClimb(): void {
    this.isClimbing = true;
    this.showResults = false;
    this.climbProgress = 0;
    this.climbStartTime = this.animationTime;
  }

  private resetClimb(): void {
    this.isClimbing = false;
    this.showResults = false;
    this.climbProgress = 0;
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
    this.personMass = 70;
    this.stairHeight = 3;
    this.climbTime = 5;
    this.resetClimb();
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Animate climb
    if (this.isClimbing) {
      const elapsed = this.animationTime - this.climbStartTime;
      this.climbProgress = Math.min(elapsed / this.climbTime, 1);

      if (this.climbProgress >= 1) {
        this.isClimbing = false;
        this.showResults = true;
        this.climbProgress = 1;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0f0f13');

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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(99, 102, 241, 0.1)' });
    r.text(200, 80, 'ENERGY PHYSICS', { fill: '#6366f1', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Human Engine', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'How much power do YOU generate?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Person climbing icon
    r.text(200, 250, '🏃', { fontSize: 64, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 300, 320, 140, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 335, 'When you climb stairs, you become', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 365, 'a power generator!', { fill: '#6366f1', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Concept badges
    const concepts = [{ icon: '⚡', label: 'Work' }, { icon: '🔋', label: 'Power' }, { icon: '⏱️', label: 'Time' }];
    concepts.forEach((c, i) => {
      const x = 70 + i * 110;
      r.roundRect(x, 395, 90, 35, 8, { fill: 'rgba(51, 65, 85, 0.5)' });
      r.text(x + 25, 418, c.icon, { fontSize: 16 });
      r.text(x + 55, 418, c.label, { fill: '#94a3b8', fontSize: 11 });
    });

    // Info
    r.text(200, 480, '~5 minutes | Calculate your power output', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'start', label: 'Become a Power Plant!', variant: 'primary' });

    r.setCoachMessage('Ever wondered how many watts you produce climbing stairs?');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Make Your Prediction', { fill: '#6366f1', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 95, 'Power vs Speed', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 120, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 145, 'Two people climb the same stairs.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 168, 'Alice takes 5 seconds. Bob takes 10 seconds.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 192, 'Who generates more power?', { fill: '#6366f1', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      { label: 'Alice (the faster climber)', desc: 'Speed = more power' },
      { label: 'Bob (the slower climber)', desc: 'More time = more power' },
      { label: 'Both generate equal power', desc: 'Same stairs = same power' }
    ];

    options.forEach((opt, i) => {
      const y = 215 + i * 70;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (i === 0) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.prediction) {
        bgColor = 'rgba(99, 102, 241, 0.3)';
      }

      r.roundRect(30, y, 340, 60, 12, { fill: bgColor });
      r.text(50, y + 28, opt.label, { fill: textColor, fontSize: 14, fontWeight: 'bold' });
      r.text(50, y + 48, opt.desc, { fill: '#94a3b8', fontSize: 11 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 440, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 0 ? 'Correct! Faster = More Power!' : 'Alice generates more power!';
      r.text(200, 470, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 495, 'Same work in less time = higher power', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Try the Experiment', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 45, 'Stair Climbing Power Lab', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const work = this.calculateWork(this.personMass, this.stairHeight);
    const power = this.calculatePower(this.personMass, this.stairHeight, this.climbTime);
    const hp = this.calculateHorsepower(power);

    // Staircase visualization
    r.roundRect(20, 70, 360, 200, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Draw stairs
    const numStairs = Math.ceil(this.stairHeight / 0.2);
    for (let i = 0; i < Math.min(numStairs, 15); i++) {
      const stepHeight = 140 / Math.min(numStairs, 15);
      const y = 230 - (i + 1) * stepHeight;
      const x = 50 + i * (280 / Math.min(numStairs, 15));
      r.rect(x, y, 280 / Math.min(numStairs, 15) + 2, stepHeight + 2, { fill: '#27272a' });
    }

    // Person (stick figure)
    const personX = 70 + this.climbProgress * 220;
    const personY = 220 - this.climbProgress * 130;
    r.circle(personX, personY - 35, 8, { fill: '#6366f1' });
    r.line(personX, personY - 27, personX, personY - 5, { stroke: '#6366f1', strokeWidth: 3 });
    r.line(personX - 12, personY - 20, personX + 12, personY - 20, { stroke: '#6366f1', strokeWidth: 3 });
    r.line(personX, personY - 5, personX - 8, personY + 10, { stroke: '#6366f1', strokeWidth: 3 });
    r.line(personX, personY - 5, personX + 8, personY + 10, { stroke: '#6366f1', strokeWidth: 3 });

    // Height label
    r.text(35, 160, `${this.stairHeight}m`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.line(35, 90, 35, 230, { stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4,2' });

    // Stats panel
    r.roundRect(30, 285, 160, 80, 12, { fill: 'rgba(59, 130, 246, 0.1)' });
    r.text(110, 310, 'Work Done', { fill: '#3b82f6', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 340, `${work.toFixed(0)} J`, { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(210, 285, 160, 80, 12, { fill: 'rgba(245, 158, 11, 0.1)' });
    r.text(290, 310, 'Power Output', { fill: '#f59e0b', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 340, `${power.toFixed(0)} W`, { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Sliders
    r.addSlider({
      id: 'person_mass',
      label: `Mass: ${this.personMass} kg`,
      min: 40,
      max: 120,
      step: 5,
      value: this.personMass
    });

    r.addSlider({
      id: 'stair_height',
      label: `Height: ${this.stairHeight} m`,
      min: 1,
      max: 10,
      step: 0.5,
      value: this.stairHeight
    });

    r.addSlider({
      id: 'climb_time',
      label: `Time: ${this.climbTime} s`,
      min: 2,
      max: 15,
      step: 1,
      value: this.climbTime
    });

    // Buttons
    if (!this.isClimbing && !this.showResults) {
      r.addButton({ id: 'start_climb', label: '🏃 Start Climbing!', variant: 'primary' });
    } else if (this.isClimbing) {
      r.addButton({ id: 'reset', label: '⏳ Climbing...', variant: 'secondary' });
    } else if (this.showResults) {
      r.roundRect(30, 520, 340, 60, 12, { fill: 'rgba(16, 185, 129, 0.1)' });
      r.text(200, 545, `🏆 You generated ${power.toFixed(0)}W = ${hp.toFixed(2)} horsepower!`, { fill: '#10b981', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 568, `That's like powering ${Math.floor(power / 60)} LED light bulbs!`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'reset', label: '↺ Try Again', variant: 'secondary' });
      r.addButton({ id: 'continue', label: 'Learn the Physics', variant: 'primary' });
    }

    r.setCoachMessage('Adjust the parameters and see your power output!');
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 50, 'The Physics of Work & Power', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Work formula
    r.roundRect(30, 80, 340, 100, 16, { fill: 'rgba(59, 130, 246, 0.15)' });
    r.text(200, 105, 'WORK', { fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(80, 120, 240, 40, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 147, 'W = mgh', { fill: '#ffffff', fontSize: 18, textAnchor: 'middle' });
    r.text(200, 170, 'Work = mass x gravity x height', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Power formula
    r.roundRect(30, 195, 340, 100, 16, { fill: 'rgba(245, 158, 11, 0.15)' });
    r.text(200, 220, 'POWER', { fill: '#f59e0b', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(80, 235, 240, 40, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 262, 'P = W/t = mgh/t', { fill: '#ffffff', fontSize: 18, textAnchor: 'middle' });
    r.text(200, 285, 'Power = Work / Time', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 310, 340, 90, 16, { fill: 'rgba(16, 185, 129, 0.15)' });
    r.text(200, 340, 'KEY INSIGHT', { fill: '#10b981', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 370, 'Same work, less time = MORE POWER!', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 390, 'Power measures how FAST you do work', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Power = Fv', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Alternative Power Formula', { fill: '#a855f7', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 95, 'Power = Force x Velocity?', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 120, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 150, 'A car engine provides constant 5000N force.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 175, 'How does power change with speed?', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      { label: 'Power increases with speed', desc: 'P = Fv, so more v = more P' },
      { label: 'Power decreases with speed', desc: 'Faster = less power needed' },
      { label: 'Power stays constant', desc: 'Same force = same power' }
    ];

    options.forEach((opt, i) => {
      const y = 210 + i * 70;
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
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 60, 12, { fill: bgColor });
      r.text(50, y + 28, opt.label, { fill: textColor, fontSize: 14, fontWeight: 'bold' });
      r.text(50, y + 48, opt.desc, { fill: '#94a3b8', fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 440, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 0 ? 'Correct! P = Fv!' : 'Power = Force x Velocity!';
      r.text(200, 470, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 495, 'Double the speed = double the power', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Comparison', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, 'P = Fv in Action', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Two scenarios
    const slowPower = 5000 * 10; // 5000N x 10 m/s
    const fastPower = 5000 * 30; // 5000N x 30 m/s

    // Slow scenario
    const slowActive = this.twistScenario === 'slow';
    r.roundRect(30, 80, 165, 150, 12, { fill: slowActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(51, 65, 85, 0.3)' });
    r.text(112, 105, 'City Driving', { fill: slowActive ? '#6366f1' : '#94a3b8', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(112, 130, '🚗', { fontSize: 32, textAnchor: 'middle' });
    r.text(112, 165, 'v = 10 m/s (36 km/h)', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(112, 185, `P = 5000 x 10`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(112, 210, `= ${(slowPower / 1000).toFixed(0)} kW`, { fill: slowActive ? '#6366f1' : '#94a3b8', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Fast scenario
    const fastActive = this.twistScenario === 'fast';
    r.roundRect(205, 80, 165, 150, 12, { fill: fastActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(51, 65, 85, 0.3)' });
    r.text(287, 105, 'Highway Driving', { fill: fastActive ? '#ef4444' : '#94a3b8', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(287, 130, '🏎️', { fontSize: 32, textAnchor: 'middle' });
    r.text(287, 165, 'v = 30 m/s (108 km/h)', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(287, 185, `P = 5000 x 30`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(287, 210, `= ${(fastPower / 1000).toFixed(0)} kW`, { fill: fastActive ? '#ef4444' : '#94a3b8', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Comparison
    r.roundRect(30, 250, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 275, 'Same force, 3x the speed = 3x the power!', { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 300, 'This is why highway driving uses more fuel', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 320, '(even though wind resistance makes it more complex)', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'scenario_slow', label: 'City', variant: slowActive ? 'primary' : 'secondary' });
    r.addButton({ id: 'scenario_fast', label: 'Highway', variant: fastActive ? 'danger' : 'secondary' });
    r.addButton({ id: 'continue', label: 'Continue', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 50, 'Two Power Formulas', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Formula 1
    r.roundRect(30, 85, 165, 100, 12, { fill: 'rgba(59, 130, 246, 0.15)' });
    r.text(112, 115, 'For vertical motion:', { fill: '#3b82f6', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(45, 130, 135, 35, 6, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(112, 153, 'P = mgh/t', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    // Formula 2
    r.roundRect(205, 85, 165, 100, 12, { fill: 'rgba(245, 158, 11, 0.15)' });
    r.text(287, 115, 'For horizontal motion:', { fill: '#f59e0b', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(220, 130, 135, 35, 6, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(287, 153, 'P = Fv', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    // Connection
    r.roundRect(30, 200, 340, 120, 16, { fill: 'rgba(16, 185, 129, 0.15)' });
    r.text(200, 230, 'They are the same formula!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 260, 'P = Work / Time = Force x Distance / Time', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 285, 'P = Force x (Distance / Time) = F x v', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 310, 'For lifting: F = mg, so P = mg x v = mgh/t', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 50, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

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
    r.text(200, 200, app.tagline, { fill: '#6366f1', fontSize: 11, textAnchor: 'middle' });

    // Description
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
    r.roundRect(40, 310, 320, 70, 10, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 335, 'THE PHYSICS', { fill: '#6366f1', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 360, app.physics.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: '✓ Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 420, '✓ Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 460, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Continue button
    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take the Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 50, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 75, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Question
      r.roundRect(25, 95, 350, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      const qWords = question.question.split(' ');
      let qLine = '';
      let qY = 120;
      qWords.forEach(word => {
        if ((qLine + word).length > 48) {
          r.text(200, qY, qLine.trim(), { fill: '#6366f1', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
          qLine = word + ' ';
          qY += 18;
        } else {
          qLine += word + ' ';
        }
      });
      if (qLine) r.text(200, qY, qLine.trim(), { fill: '#6366f1', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 190 + i * 52;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 45, 8, { fill: bgColor });
        r.text(40, y + 27, `${String.fromCharCode(65 + i)}. ${option}`, { fill: isSelected ? '#6366f1' : '#e2e8f0', fontSize: 11 });

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
        r.text(200, 430, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();
      const percentage = Math.round((score / 10) * 100);

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, percentage >= 70 ? "You've mastered work & power!" : 'Review the concepts and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 160, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#6366f1', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'W = mgh (Work formula)',
        'P = W/t = mgh/t (Power from work)',
        'P = Fv (Power from force)',
        'Real-world applications'
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
    r.text(200, 120, '🏆', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Work & Power Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, "You've mastered the physics of energy!", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'From stairs to race cars!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '⚡', label: 'W = mgh' },
      { icon: '🔋', label: 'P = W/t' },
      { icon: '🏎️', label: 'P = Fv' },
      { icon: '🏃', label: 'Human Power' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 295 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key insight
    r.roundRect(50, 460, 300, 70, 12, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 488, 'Key Insight', { fill: '#6366f1', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 515, 'Power = How fast you do work!', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on becoming a power physics expert!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      personMass: this.personMass,
      stairHeight: this.stairHeight,
      climbTime: this.climbTime,
      animationTime: this.animationTime,
      isClimbing: this.isClimbing,
      climbProgress: this.climbProgress,
      showResults: this.showResults,
      twistScenario: this.twistScenario,
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
    if (state.personMass !== undefined) this.personMass = state.personMass as number;
    if (state.stairHeight !== undefined) this.stairHeight = state.stairHeight as number;
    if (state.climbTime !== undefined) this.climbTime = state.climbTime as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.isClimbing !== undefined) this.isClimbing = state.isClimbing as boolean;
    if (state.climbProgress !== undefined) this.climbProgress = state.climbProgress as number;
    if (state.showResults !== undefined) this.showResults = state.showResults as boolean;
    if (state.twistScenario !== undefined) this.twistScenario = state.twistScenario as string;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createWorkPowerGame(sessionId: string): WorkPowerGame {
  return new WorkPowerGame(sessionId);
}
