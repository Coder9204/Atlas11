import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// WAVE SPEED & TENSION GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: v = sqrt(T/u) - Wave speed on a string
// Tension (T) in newtons, linear mass density (u) in kg/m
// Higher tension = faster waves, higher mass density = slower waves
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
  formula: string;
}

// Physics constants (PROTECTED - never sent to client)
const ROPE_LENGTH = 5; // meters

export class WaveSpeedTensionGame extends BaseGame {
  readonly gameType = 'wave_speed_tension';
  readonly gameTitle = 'Wave Speed on Strings';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private tension = 50; // Newtons
  private linearDensity = 0.01; // kg/m
  private twistLinearDensity = 0.02; // kg/m for twist experiment
  private animationTime = 0;

  // Play phase state
  private isPulseSent = false;
  private pulsePosition = 0;
  private pulseComplete = false;
  private stopwatchTime = 0;
  private pulseStartTime = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "A rope has tension T = 100 N and linear density u = 0.01 kg/m.",
      question: "What is the wave speed?",
      options: ["10 m/s", "50 m/s", "100 m/s", "1000 m/s"],
      correctIndex: 2,
      explanation: "v = sqrt(T/u) = sqrt(100/0.01) = sqrt(10000) = 100 m/s."
    },
    {
      scenario: "The formula for wave speed on a string is v = sqrt(T/u).",
      question: "What happens to wave speed if tension doubles?",
      options: ["Speed doubles", "Speed increases by sqrt(2)", "Speed halves", "Speed stays the same"],
      correctIndex: 1,
      explanation: "Because of the square root, v is proportional to sqrt(T). Doubling T multiplies v by sqrt(2) = 1.414."
    },
    {
      scenario: "A guitar string is replaced with a thicker string (more mass per length).",
      question: "How does the wave speed change?",
      options: ["Increases", "Decreases", "Stays the same", "Depends on tension only"],
      correctIndex: 1,
      explanation: "v = sqrt(T/u). Higher u (mass density) in the denominator means lower wave speed."
    },
    {
      scenario: "A wave travels 10 meters in 0.2 seconds on a rope.",
      question: "What is the wave speed?",
      options: ["2 m/s", "20 m/s", "50 m/s", "200 m/s"],
      correctIndex: 2,
      explanation: "v = distance/time = 10m / 0.2s = 50 m/s."
    },
    {
      scenario: "Two strings have the same tension. String A has u = 0.01 kg/m, String B has u = 0.04 kg/m.",
      question: "How do their wave speeds compare?",
      options: ["Same speed", "A is twice as fast", "A is four times as fast", "B is twice as fast"],
      correctIndex: 1,
      explanation: "vA/vB = sqrt(uB/uA) = sqrt(0.04/0.01) = sqrt(4) = 2. String A (lighter) is 2x faster."
    },
    {
      scenario: "A piano's bass strings are wrapped with wire (higher mass density).",
      question: "Why is this done?",
      options: ["To increase wave speed", "To produce lower pitch notes", "To make them louder", "Only for durability"],
      correctIndex: 1,
      explanation: "Higher mass = lower wave speed = lower frequency = lower pitch."
    },
    {
      scenario: "A tightrope walker increases the rope tension.",
      question: "What happens to wave speed if you pluck the rope?",
      options: ["Decreases", "Increases", "Stays the same", "Becomes zero"],
      correctIndex: 1,
      explanation: "v = sqrt(T/u). Higher tension = higher wave speed."
    },
    {
      scenario: "Sound travels through air at ~343 m/s and through steel at ~5000 m/s.",
      question: "Why is steel so much faster?",
      options: ["Steel is hotter", "Steel is much stiffer (higher tension equivalent)", "Steel is less dense", "Steel has fewer molecules"],
      correctIndex: 1,
      explanation: "Steel's extreme stiffness dominates its higher density, resulting in much faster wave propagation."
    },
    {
      scenario: "A pulse takes 0.5 s to travel a 10m rope with T = 80 N.",
      question: "What is the rope's linear density?",
      options: ["0.01 kg/m", "0.02 kg/m", "0.05 kg/m", "0.2 kg/m"],
      correctIndex: 3,
      explanation: "v = 10m/0.5s = 20 m/s. From v^2 = T/u, u = T/v^2 = 80/(20)^2 = 80/400 = 0.2 kg/m."
    },
    {
      scenario: "Seismic waves travel faster in denser rock layers deep in Earth.",
      question: "How is this possible given v = sqrt(T/u)?",
      options: ["The formula doesn't apply", "Extreme pressure increases stiffness more than density", "Deeper rock is less dense", "Temperature makes them faster"],
      correctIndex: 1,
      explanation: "At great depths, extreme pressure increases the rock's elastic modulus faster than density."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🎸",
      title: "Guitar Strings",
      tagline: "Tension and thickness determine pitch",
      description: "How string tension and thickness determine pitch.",
      physics: "Tuning pegs adjust tension (T) while string gauge affects mass density (u). Together they control wave speed and frequency.",
      formula: "f = (1/2L)sqrt(T/u)"
    },
    {
      icon: "🌉",
      title: "Bridge Cables",
      tagline: "Structural health monitoring",
      description: "Engineers monitor cable health by measuring wave speed.",
      physics: "Cable tension affects wave propagation speed. Damaged or corroded cables have different vibration characteristics.",
      formula: "v = sqrt(T/u) --> T = u*v^2"
    },
    {
      icon: "🏥",
      title: "Medical Imaging",
      tagline: "Ultrasound tissue imaging",
      description: "Ultrasound uses wave speed differences to image tissue.",
      physics: "Sound waves travel at different speeds through different tissues based on their density and stiffness.",
      formula: "v = sqrt(K/rho)"
    },
    {
      icon: "🌍",
      title: "Seismology",
      tagline: "Earth's internal structure",
      description: "Earthquake waves reveal Earth's internal structure.",
      physics: "P-waves and S-waves travel at speeds determined by rock density and elastic properties.",
      formula: "vP = sqrt((K + 4G/3)/rho)"
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate wave speed using v = sqrt(T/u)
  private calculateWaveSpeed(tension: number, linearDensity: number): number {
    return Math.sqrt(tension / linearDensity);
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
      if (input.id === 'tension') {
        this.tension = Math.max(10, Math.min(200, input.value));
        this.resetPulse();
      } else if (input.id === 'linear_density') {
        this.linearDensity = Math.max(0.005, Math.min(0.1, input.value));
        this.resetPulse();
      } else if (input.id === 'twist_linear_density') {
        this.twistLinearDensity = Math.max(0.005, Math.min(0.1, input.value));
        this.resetPulse();
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
            this.prediction = buttonId.split('_')[1];
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
          this.resetPulse();
        }
        break;

      case 'play':
        if (buttonId === 'send_pulse' && !this.isPulseSent) {
          this.sendPulse();
        } else if (buttonId === 'reset') {
          this.resetPulse();
        } else if (buttonId === 'continue' && this.pulseComplete) {
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
          this.resetPulse();
        }
        break;

      case 'twist_play':
        if (buttonId === 'send_pulse' && !this.isPulseSent) {
          this.sendPulse();
        } else if (buttonId === 'reset') {
          this.resetPulse();
        } else if (buttonId === 'continue' && this.pulseComplete) {
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

  private sendPulse(): void {
    this.isPulseSent = true;
    this.pulseComplete = false;
    this.pulsePosition = 0;
    this.stopwatchTime = 0;
    this.pulseStartTime = this.animationTime;
  }

  private resetPulse(): void {
    this.isPulseSent = false;
    this.pulseComplete = false;
    this.pulsePosition = 0;
    this.stopwatchTime = 0;
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
    this.tension = 50;
    this.linearDensity = 0.01;
    this.twistLinearDensity = 0.02;
    this.resetPulse();
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Animate pulse travel
    if (this.isPulseSent && !this.pulseComplete) {
      const density = this.phase === 'twist_play' ? this.twistLinearDensity : this.linearDensity;
      const speed = this.calculateWaveSpeed(this.tension, density);
      const elapsed = this.animationTime - this.pulseStartTime;
      const position = (speed * elapsed) / ROPE_LENGTH;

      this.stopwatchTime = elapsed;

      if (position >= 1) {
        this.pulsePosition = 1;
        this.pulseComplete = true;
        this.isPulseSent = false;
        this.stopwatchTime = ROPE_LENGTH / speed;
      } else {
        this.pulsePosition = position;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(245, 158, 11, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(249, 115, 22, 0.05)' });

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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(245, 158, 11, 0.1)' });
    r.text(200, 80, 'WAVE PHYSICS', { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'Wave Speed on Strings', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Why do tight ropes carry pulses faster?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Rope icon
    r.text(200, 250, '🪢', { fontSize: 64, textAnchor: 'middle' });

    // Key concepts
    r.roundRect(40, 300, 320, 140, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 335, 'Discover the v = sqrt(T/u) formula', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [{ icon: '🎯', label: 'Tension' }, { icon: '⚖️', label: 'Mass' }, { icon: '⏱️', label: 'Timing' }];
    concepts.forEach((c, i) => {
      const x = 70 + i * 110;
      r.roundRect(x, 360, 90, 55, 8, { fill: 'rgba(51, 65, 85, 0.5)' });
      r.text(x + 45, 385, c.icon, { fontSize: 18, textAnchor: 'middle' });
      r.text(x + 45, 405, c.label, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    });

    // Info
    r.text(200, 470, '~5 minutes | Interactive simulation | 10 questions', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'start', label: 'Start Experiment', variant: 'primary' });

    r.setCoachMessage('Explore how tension and mass affect wave propagation!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Make Your Prediction', { fill: '#f59e0b', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 95, 'Tight vs. Loose Rope?', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 125, 'What happens when you increase tension?', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'faster', label: 'Pulse travels faster', desc: 'Higher tension = faster pulse', icon: '🚀' },
      { id: 'slower', label: 'Pulse travels slower', desc: 'Higher tension = slower pulse', icon: '🐢' },
      { id: 'same', label: 'No change in speed', desc: "Tension doesn't affect speed", icon: '➡️' }
    ];

    options.forEach((opt, i) => {
      const y = 160 + i * 75;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (opt.id === 'faster') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (opt.id === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (opt.id === this.prediction) {
        bgColor = 'rgba(245, 158, 11, 0.3)';
      }

      r.roundRect(30, y, 340, 65, 12, { fill: bgColor });
      r.text(55, y + 28, opt.icon, { fontSize: 20 });
      r.text(85, y + 30, opt.label, { fill: textColor, fontSize: 14, fontWeight: 'bold' });
      r.text(85, y + 50, opt.desc, { fill: '#94a3b8', fontSize: 11 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${opt.id}`, label: '', variant: 'secondary' });
      }
    });

    // Hint
    r.roundRect(40, 400, 320, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(60, 425, '💡 THINK ABOUT IT', { fill: '#f59e0b', fontSize: 10, fontWeight: 'bold' });
    r.text(200, 450, 'When you tighten a guitar string, what', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 465, "happens to the note's pitch?", { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 490, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 'faster' ? 'Correct! Higher tension = faster waves!' : 'Actually, higher tension makes waves faster!';
      r.text(200, 525, message, { fill: '#34d399', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test It Out', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 45, 'Wave Speed Experiment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const waveSpeed = this.calculateWaveSpeed(this.tension, this.linearDensity);
    const ropeThickness = Math.min(14, 3 + this.linearDensity * 500);

    // Rope visualization
    r.roundRect(20, 70, 360, 200, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Info panels
    r.roundRect(35, 85, 80, 28, 8, { fill: 'rgba(245, 158, 11, 0.2)' });
    r.text(75, 104, `T=${this.tension}N`, { fill: '#f59e0b', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(155, 85, 90, 28, 8, { fill: 'rgba(234, 179, 8, 0.15)' });
    r.text(200, 104, `u=${(this.linearDensity * 1000).toFixed(1)}g/m`, { fill: '#eab308', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(280, 85, 90, 28, 8, { fill: 'rgba(34, 197, 94, 0.15)' });
    r.text(325, 104, `v=${waveSpeed.toFixed(1)}m/s`, { fill: '#22c55e', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    // Anchors
    r.rect(35, 140, 25, 70, { fill: '#4b5563' });
    r.circle(340, 170, 20, { fill: '#4b5563' });

    // Rope
    r.line(60, 170, 320, 170, { stroke: '#8b6914', strokeWidth: ropeThickness });

    // Pulse
    if (this.isPulseSent || (this.pulseComplete && this.pulsePosition > 0)) {
      const pulseX = 60 + this.pulsePosition * 260;
      r.circle(pulseX, 150, 15, { fill: 'rgba(251, 191, 36, 0.5)' });
      r.circle(pulseX, 150, 8, { fill: '#fbbf24' });
    }

    // Distance markers
    for (let m = 0; m <= 5; m++) {
      const x = 60 + m * 52;
      r.line(x, 200, x, 210, { stroke: '#4b5563', strokeWidth: 2 });
      r.text(x, 225, `${m}m`, { fill: '#6b7488', fontSize: 9, textAnchor: 'middle' });
    }

    // Stopwatch
    r.roundRect(130, 240, 140, 35, 10, { fill: '#161a24' });
    r.text(155, 263, 'TIME:', { fill: '#6b7488', fontSize: 10, fontWeight: 'bold' });
    r.text(245, 263, `${this.stopwatchTime.toFixed(3)}s`, { fill: this.pulseComplete ? '#22c55e' : '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });

    // Slider
    r.addSlider({
      id: 'tension',
      label: 'Tension (N)',
      min: 10,
      max: 200,
      step: 5,
      value: this.tension
    });

    // Buttons
    if (!this.isPulseSent && !this.pulseComplete) {
      r.addButton({ id: 'send_pulse', label: '🎯 Send Pulse', variant: 'primary' });
    } else if (this.isPulseSent) {
      r.addButton({ id: 'reset', label: '🏃 Traveling...', variant: 'secondary' });
    } else if (this.pulseComplete) {
      r.addButton({ id: 'reset', label: '↺ Reset', variant: 'secondary' });
      r.addButton({ id: 'continue', label: 'Understand Why', variant: 'primary' });
    }

    r.setCoachMessage('Adjust tension and send a pulse!');
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 50, 'Why Does Tension Increase Speed?', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    const wasCorrect = this.prediction === 'faster';
    r.text(200, 85, wasCorrect ? '✅ You predicted correctly!' : 'Higher tension increases wave speed!', { fill: wasCorrect ? '#34d399' : '#f59e0b', fontSize: 13, textAnchor: 'middle' });

    // Explanation cards
    r.roundRect(30, 110, 160, 100, 12, { fill: 'rgba(245, 158, 11, 0.1)' });
    r.text(50, 135, '🎯', { fontSize: 18 });
    r.text(110, 138, 'Restoring Force', { fill: '#f59e0b', fontSize: 12, fontWeight: 'bold' });
    r.text(110, 160, 'Higher tension means', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 175, 'stronger restoring force.', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 195, 'Rope snaps back faster!', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(210, 110, 160, 100, 12, { fill: 'rgba(16, 185, 129, 0.1)' });
    r.text(230, 135, '⚡', { fontSize: 18 });
    r.text(290, 138, 'Faster Propagation', { fill: '#34d399', fontSize: 12, fontWeight: 'bold' });
    r.text(290, 160, 'Wave speed increases', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 175, 'with square root of', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 195, 'tension: v ∝ sqrt(T)', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Formula card
    r.roundRect(30, 230, 340, 120, 16, { fill: 'rgba(245, 158, 11, 0.15)' });
    r.text(200, 260, 'THE WAVE SPEED FORMULA', { fill: '#f59e0b', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(80, 275, 240, 40, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 302, 'v = sqrt(T / u)', { fill: '#ffffff', fontSize: 18, textAnchor: 'middle' });
    r.text(200, 335, 'T = tension (N) | u = mass per length (kg/m)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Mass Effect', variant: 'primary' });

    r.setCoachMessage("Now let's see what happens when we change the rope's mass...");
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'What About Rope Mass?', { fill: '#a855f7', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 95, 'New Variable: Mass Density', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 125, 'Keep tension same, use HEAVIER rope.', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    const options = [
      { id: 'faster', label: 'Wave travels faster', desc: 'More mass = more momentum = faster', icon: '🚀' },
      { id: 'slower', label: 'Wave travels slower', desc: 'More mass = more inertia = slower', icon: '🐢' },
      { id: 'same', label: 'No change in speed', desc: "Mass doesn't affect wave speed", icon: '➡️' }
    ];

    options.forEach((opt, i) => {
      const y = 160 + i * 75;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (opt.id === 'slower') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (opt.id === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (opt.id === this.twistPrediction) {
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 65, 12, { fill: bgColor });
      r.text(55, y + 28, opt.icon, { fontSize: 20 });
      r.text(85, y + 30, opt.label, { fill: textColor, fontSize: 14, fontWeight: 'bold' });
      r.text(85, y + 50, opt.desc, { fill: '#94a3b8', fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${opt.id}`, label: '', variant: 'secondary' });
      }
    });

    // Hint
    r.roundRect(40, 400, 320, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(60, 425, '💡 THINK ABOUT IT', { fill: '#f59e0b', fontSize: 10, fontWeight: 'bold' });
    r.text(200, 450, 'Imagine pushing a heavy cart vs. a light cart.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 465, 'Which responds faster to the same force?', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    if (this.showTwistFeedback) {
      r.roundRect(30, 490, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 'slower' ? 'Correct! More mass = more inertia = slower!' : 'More mass actually slows the wave down!';
      r.text(200, 525, message, { fill: '#34d399', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test Your Prediction', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 45, 'Mass Density Experiment', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const waveSpeed = this.calculateWaveSpeed(this.tension, this.twistLinearDensity);
    const ropeThickness = Math.min(14, 3 + this.twistLinearDensity * 500);

    // Rope visualization
    r.roundRect(20, 70, 360, 200, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Info panels
    r.roundRect(35, 85, 80, 28, 8, { fill: 'rgba(245, 158, 11, 0.2)' });
    r.text(75, 104, `T=${this.tension}N`, { fill: '#f59e0b', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(155, 85, 90, 28, 8, { fill: 'rgba(234, 179, 8, 0.15)' });
    r.text(200, 104, `u=${(this.twistLinearDensity * 1000).toFixed(1)}g/m`, { fill: '#eab308', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(280, 85, 90, 28, 8, { fill: 'rgba(34, 197, 94, 0.15)' });
    r.text(325, 104, `v=${waveSpeed.toFixed(1)}m/s`, { fill: '#22c55e', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    // Anchors
    r.rect(35, 140, 25, 70, { fill: '#4b5563' });
    r.circle(340, 170, 20, { fill: '#4b5563' });

    // Rope (thicker for higher mass)
    r.line(60, 170, 320, 170, { stroke: '#8b6914', strokeWidth: ropeThickness });

    // Pulse
    if (this.isPulseSent || (this.pulseComplete && this.pulsePosition > 0)) {
      const pulseX = 60 + this.pulsePosition * 260;
      r.circle(pulseX, 150, 15, { fill: 'rgba(251, 191, 36, 0.5)' });
      r.circle(pulseX, 150, 8, { fill: '#fbbf24' });
    }

    // Distance markers
    for (let m = 0; m <= 5; m++) {
      const x = 60 + m * 52;
      r.line(x, 200, x, 210, { stroke: '#4b5563', strokeWidth: 2 });
      r.text(x, 225, `${m}m`, { fill: '#6b7488', fontSize: 9, textAnchor: 'middle' });
    }

    // Stopwatch
    r.roundRect(130, 240, 140, 35, 10, { fill: '#161a24' });
    r.text(155, 263, 'TIME:', { fill: '#6b7488', fontSize: 10, fontWeight: 'bold' });
    r.text(245, 263, `${this.stopwatchTime.toFixed(3)}s`, { fill: this.pulseComplete ? '#22c55e' : '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'end' });

    // Slider
    r.addSlider({
      id: 'twist_linear_density',
      label: 'Mass Density (g/m)',
      min: 5,
      max: 100,
      step: 5,
      value: this.twistLinearDensity * 1000
    });

    // Buttons
    if (!this.isPulseSent && !this.pulseComplete) {
      r.addButton({ id: 'send_pulse', label: '🎯 Send Pulse', variant: 'primary' });
    } else if (this.isPulseSent) {
      r.addButton({ id: 'reset', label: '🏃 Traveling...', variant: 'secondary' });
    } else if (this.pulseComplete) {
      r.addButton({ id: 'reset', label: '↺ Reset', variant: 'secondary' });
      r.addButton({ id: 'continue', label: 'See the Full Picture', variant: 'primary' });
    }
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 50, 'The Complete Picture', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    const wasCorrect = this.twistPrediction === 'slower';
    r.text(200, 85, wasCorrect ? '✅ Correct! More mass = more inertia = slower.' : 'More mass per length DECREASES wave speed!', { fill: wasCorrect ? '#34d399' : '#a855f7', fontSize: 12, textAnchor: 'middle' });

    // Formula card
    r.roundRect(30, 110, 340, 130, 16, { fill: 'rgba(245, 158, 11, 0.15)' });
    r.text(200, 135, 'WAVE SPEED ON A STRING', { fill: '#f59e0b', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(80, 150, 240, 40, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 177, 'v = sqrt(T / u)', { fill: '#ffffff', fontSize: 18, textAnchor: 'middle' });

    // Effect arrows
    r.roundRect(80, 200, 100, 35, 8, { fill: 'rgba(245, 158, 11, 0.2)' });
    r.text(130, 222, '↑ T = Faster', { fill: '#f59e0b', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(220, 200, 100, 35, 8, { fill: 'rgba(234, 179, 8, 0.2)' });
    r.text(270, 222, '↑ u = Slower', { fill: '#eab308', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 260, 340, 100, 12, { fill: 'rgba(16, 185, 129, 0.1)' });
    r.text(55, 285, '🎓 KEY INSIGHT', { fill: '#34d399', fontSize: 10, fontWeight: 'bold' });
    r.text(200, 310, 'Wave speed is the balance between restoring', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 328, 'force (tension) and inertia (mass). This applies', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 346, 'to guitar strings, bridge cables, seismic waves!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

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
      if (isActive) bgColor = '#f59e0b';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.tagline, { fill: '#f59e0b', fontSize: 11, textAnchor: 'middle' });

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
    r.roundRect(40, 280, 320, 70, 10, { fill: 'rgba(245, 158, 11, 0.2)' });
    r.text(200, 305, 'THE PHYSICS', { fill: '#f59e0b', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 330, app.physics.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Formula
    r.roundRect(120, 360, 160, 35, 8, { fill: 'rgba(30, 41, 59, 0.6)' });
    r.text(200, 383, app.formula, { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });

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

      // Scenario
      r.roundRect(25, 95, 350, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      const scenarioWords = question.scenario.split(' ');
      let scenarioLine = '';
      let scenarioY = 115;
      scenarioWords.forEach(word => {
        if ((scenarioLine + word).length > 50) {
          r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
          scenarioLine = word + ' ';
          scenarioY += 16;
        } else {
          scenarioLine += word + ' ';
        }
      });
      if (scenarioLine) r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      // Question
      r.text(200, 195, question.question.substring(0, 50), { fill: '#f59e0b', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 220 + i * 52;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(245, 158, 11, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 45, 8, { fill: bgColor });
        r.text(40, y + 27, `${String.fromCharCode(65 + i)}. ${option.substring(0, 42)}${option.length > 42 ? '...' : ''}`, { fill: isSelected ? '#f59e0b' : '#e2e8f0', fontSize: 11 });

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
        r.text(200, 475, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();
      const percentage = Math.round((score / 10) * 100);

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, percentage >= 70 ? "You've mastered wave speed physics!" : 'Review the concepts and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 160, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'v = sqrt(T/u) formula',
        'Tension increases speed',
        'Mass density decreases speed',
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
    r.text(200, 200, 'Wave Speed Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, "You've mastered the v = sqrt(T/u) formula!", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'From guitar strings to seismic waves!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '🎯', label: 'Tension Effect' },
      { icon: '⚖️', label: 'Mass Effect' },
      { icon: '📐', label: 'Wave Formula' },
      { icon: '🌍', label: 'Applications' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 295 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 460, 300, 70, 12, { fill: 'rgba(245, 158, 11, 0.2)' });
    r.text(200, 488, 'Key Formula', { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 515, 'v = sqrt(T / u)', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering wave speed physics!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      tension: this.tension,
      linearDensity: this.linearDensity,
      twistLinearDensity: this.twistLinearDensity,
      animationTime: this.animationTime,
      isPulseSent: this.isPulseSent,
      pulsePosition: this.pulsePosition,
      pulseComplete: this.pulseComplete,
      stopwatchTime: this.stopwatchTime,
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
    if (state.tension !== undefined) this.tension = state.tension as number;
    if (state.linearDensity !== undefined) this.linearDensity = state.linearDensity as number;
    if (state.twistLinearDensity !== undefined) this.twistLinearDensity = state.twistLinearDensity as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.isPulseSent !== undefined) this.isPulseSent = state.isPulseSent as boolean;
    if (state.pulsePosition !== undefined) this.pulsePosition = state.pulsePosition as number;
    if (state.pulseComplete !== undefined) this.pulseComplete = state.pulseComplete as boolean;
    if (state.stopwatchTime !== undefined) this.stopwatchTime = state.stopwatchTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createWaveSpeedTensionGame(sessionId: string): WaveSpeedTensionGame {
  return new WaveSpeedTensionGame(sessionId);
}
