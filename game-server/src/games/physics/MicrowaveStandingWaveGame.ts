import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// MICROWAVE STANDING WAVE GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Standing waves form when microwaves reflect off metal walls
// lambda = c / f = 3e8 / 2.45e9 = 12.2 cm (microwave wavelength)
// Hot spot spacing = lambda/2 = 6.1 cm (antinodes)
// Nodes = minimum energy, Antinodes = maximum energy
// Turntable moves food through the standing wave pattern for even heating
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
}

// Physics constants (PROTECTED - never sent to client)
const MICROWAVE_FREQUENCY = 2.45e9; // Hz
const SPEED_OF_LIGHT = 3e8; // m/s
const WAVELENGTH = SPEED_OF_LIGHT / MICROWAVE_FREQUENCY; // ~0.122 m = 12.2 cm
const HOT_SPOT_SPACING = WAVELENGTH / 2; // ~6.1 cm

export class MicrowaveStandingWaveGame extends BaseGame {
  readonly gameType = 'microwave_standing_wave';
  readonly gameTitle = 'Microwave Standing Waves: The Hot Spot Mystery';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation state
  private isCooking = false;
  private turntableOn = false;
  private cookTime = 0;
  private foodTemp: number[] = Array(25).fill(20); // 5x5 grid
  private turntableAngle = 0;
  private animationTime = 0;

  // Twist state
  private twistTurntable = false;
  private twistCookTime = 0;
  private twistFoodTemp: number[] = Array(25).fill(20);

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      question: "Why does a microwave oven have hot spots and cold spots?",
      options: [
        "The magnetron doesn't produce enough power",
        "Standing waves form with fixed nodes (cold) and antinodes (hot)",
        "Food absorbs microwaves unevenly due to its color",
        "The walls absorb some of the microwave energy"
      ],
      correctIndex: 1,
      explanation: "Standing waves form when microwaves bounce back and forth between the metal walls. The interference creates fixed patterns of high energy (antinodes - hot spots) and low energy (nodes - cold spots)."
    },
    {
      question: "What happens at a standing wave node?",
      options: [
        "Maximum energy - food heats fastest",
        "Minimum/zero energy - food barely heats",
        "The wave changes direction",
        "Microwaves are absorbed by the walls"
      ],
      correctIndex: 1,
      explanation: "At nodes, the interfering waves cancel out (destructive interference), resulting in minimum or zero energy. Food at a node will barely heat even after extended cooking."
    },
    {
      question: "Why do microwave ovens have turntables?",
      options: [
        "To look more professional",
        "To move food through hot spots for even heating",
        "To prevent sparks",
        "To reduce microwave power consumption"
      ],
      correctIndex: 1,
      explanation: "The turntable moves food through the fixed standing wave pattern. Each part of the food gets exposure to hot spots (antinodes) over time, resulting in more even heating."
    },
    {
      question: "The wavelength of microwave radiation is about 12 cm. What distance is between hot spots?",
      options: [
        "12 cm (one wavelength)",
        "6 cm (half wavelength)",
        "3 cm (quarter wavelength)",
        "24 cm (two wavelengths)"
      ],
      correctIndex: 1,
      explanation: "Hot spots (antinodes) are spaced half a wavelength apart. With a 12 cm wavelength, hot spots are approximately 6 cm apart. This can be measured using the famous marshmallow experiment!"
    },
    {
      question: "What creates the standing wave pattern in a microwave oven?",
      options: [
        "The food vibrating at microwave frequency",
        "Multiple magnetrons in different positions",
        "Microwaves reflecting off metal walls and interfering",
        "Temperature differences in the food"
      ],
      correctIndex: 2,
      explanation: "Microwaves reflect off the metal walls and interfere with incoming waves. When they interfere constructively, you get antinodes (hot spots). When they interfere destructively, you get nodes (cold spots)."
    },
    {
      question: "If you removed the turntable and heated cheese on a plate, what pattern would you see?",
      options: [
        "Evenly melted cheese everywhere",
        "Melted spots in a regular pattern, unmelted areas in between",
        "Only the center would melt",
        "Only the edges would melt"
      ],
      correctIndex: 1,
      explanation: "You'd see the standing wave pattern directly! The cheese melts at the hot spots (antinodes) and stays solid at cold spots (nodes), creating a distinctive pattern that reveals the wave physics."
    },
    {
      question: "The famous marshmallow experiment can be used to calculate:",
      options: [
        "The temperature of microwaves",
        "The power of the magnetron",
        "The speed of light (using f and measured lambda)",
        "The weight of the food"
      ],
      correctIndex: 2,
      explanation: "By measuring the distance between melted marshmallow spots (lambda/2) and knowing the microwave frequency (usually 2.45 GHz), you can calculate c = f x lambda. This gives approximately the speed of light!"
    },
    {
      question: "What is an antinode in a standing wave?",
      options: [
        "A point where the wave amplitude is zero",
        "A point where the wave amplitude is maximum",
        "A point where waves change direction",
        "A point where waves are absorbed"
      ],
      correctIndex: 1,
      explanation: "An antinode is a point of maximum amplitude in a standing wave, where the interfering waves reinforce each other (constructive interference). In a microwave, these are the hot spots."
    },
    {
      question: "Why doesn't stirring help as much as a turntable in a microwave?",
      options: [
        "Stirring is actually better",
        "The hot spots move when you open the door",
        "Stirring mixes temperature but doesn't expose all parts to hot spots",
        "Stirring creates more microwaves"
      ],
      correctIndex: 2,
      explanation: "Stirring redistributes already-heated parts but doesn't ensure all parts get exposed to the standing wave's hot spots. The turntable continuously moves all parts through the hot spot pattern."
    },
    {
      question: "Acoustic room modes (bass build-up in room corners) work by the same principle as:",
      options: [
        "Microwave cooking - standing waves in the room",
        "Radio transmission",
        "Light reflection",
        "Heat conduction"
      ],
      correctIndex: 0,
      explanation: "Sound waves in a room reflect off walls and create standing waves, just like microwaves. Certain spots have strong bass (antinodes) while others have weak bass (nodes). Studio designers use this knowledge to place speakers and acoustic treatment."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🍡",
      title: "Marshmallow Experiment",
      description: "Remove the turntable, heat marshmallows, measure distance between melted spots to find wavelength!"
    },
    {
      icon: "🔊",
      title: "Acoustic Room Modes",
      description: "Bass frequencies create standing waves in rooms - some spots have strong bass, others weak."
    },
    {
      icon: "🔴",
      title: "Laser Cavities",
      description: "Lasers use standing waves between mirrors to amplify light at specific frequencies."
    },
    {
      icon: "🎸",
      title: "Musical Instruments",
      description: "String and wind instruments create standing waves at specific harmonics!"
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate standing wave intensity at a point
  private getIntensityAt(x: number, y: number, angle: number): number {
    // Rotate coordinates for turntable
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;

    // Simplified 2D standing wave pattern
    const intensity = Math.abs(Math.sin(rx * Math.PI * 2) * Math.sin(ry * Math.PI * 2));
    return intensity;
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
        if (buttonId === 'investigate') {
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
        if (buttonId === 'toggle_cooking') {
          this.isCooking = !this.isCooking;
        } else if (buttonId === 'toggle_turntable') {
          this.turntableOn = !this.turntableOn;
        } else if (buttonId === 'reset') {
          this.foodTemp = Array(25).fill(20);
          this.cookTime = 0;
          this.isCooking = false;
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
        }
        break;

      case 'twist_play':
        if (buttonId === 'cook_without_turntable') {
          this.twistTurntable = false;
          this.twistFoodTemp = Array(25).fill(20);
          this.twistCookTime = 10;
        } else if (buttonId === 'cook_with_turntable') {
          this.twistTurntable = true;
          this.twistFoodTemp = Array(25).fill(20);
          this.twistCookTime = 10;
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

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.isCooking = false;
    this.turntableOn = false;
    this.cookTime = 0;
    this.foodTemp = Array(25).fill(20);
    this.turntableAngle = 0;
    this.twistTurntable = false;
    this.twistCookTime = 0;
    this.twistFoodTemp = Array(25).fill(20);
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Cooking simulation
    if (this.isCooking) {
      this.cookTime += deltaTime;
      if (this.turntableOn) {
        this.turntableAngle += deltaTime * 0.5;
      }

      // Update food temperatures
      this.foodTemp = this.foodTemp.map((temp, i) => {
        const x = (i % 5) / 4 - 0.5;
        const y = Math.floor(i / 5) / 4 - 0.5;
        const intensity = this.getIntensityAt(x, y, this.turntableOn ? this.turntableAngle : 0);
        const heating = intensity * deltaTime * 200;
        return Math.min(100, temp + heating);
      });
    }

    // Twist cooking simulation
    if (this.twistCookTime > 0) {
      this.twistCookTime -= deltaTime;

      if (this.twistCookTime > 0) {
        this.twistFoodTemp = this.twistFoodTemp.map((temp, i) => {
          const x = (i % 5) / 4 - 0.5;
          const y = Math.floor(i / 5) / 4 - 0.5;
          const angle = this.twistTurntable ? (10 - this.twistCookTime) * 0.5 : 0;
          const intensity = this.getIntensityAt(x, y, angle);
          const heating = intensity * deltaTime * 300;
          return Math.min(100, temp + heating);
        });
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(245, 158, 11, 0.03)' });
    r.circle(300, 600, 150, { fill: 'rgba(234, 88, 12, 0.03)' });

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

  private tempToColor(temp: number): string {
    const normalized = (temp - 20) / 80;
    if (normalized < 0.25) return '#3b82f6'; // Blue - cold
    if (normalized < 0.5) return '#22c55e';  // Green - warm
    if (normalized < 0.75) return '#eab308'; // Yellow - hot
    return '#ef4444'; // Red - very hot
  }

  private renderMicrowaveScene(r: CommandRenderer, temps: number[], cooking: boolean, turntable: boolean, yOffset: number = 80): void {
    // Microwave body
    r.roundRect(50, yOffset, 300, 200, 10, { fill: '#374151' });
    r.roundRect(60, yOffset + 10, 220, 180, 5, { fill: '#1f2937' });
    r.roundRect(70, yOffset + 20, 200, 160, 3, { fill: '#0a1628' });

    // Mesh pattern
    for (let i = 0; i < 20; i++) {
      r.line(70, yOffset + 25 + i * 8, 270, yOffset + 25 + i * 8, { stroke: '#1e293b', strokeWidth: 1 });
    }
    for (let i = 0; i < 25; i++) {
      r.line(75 + i * 8, yOffset + 20, 75 + i * 8, yOffset + 180, { stroke: '#1e293b', strokeWidth: 1 });
    }

    // Standing wave visualization (when cooking)
    if (cooking) {
      for (let yi = 0; yi < 5; yi++) {
        for (let xi = 0; xi < 5; xi++) {
          const intensity = this.getIntensityAt((xi / 4 - 0.5), (yi / 4 - 0.5), 0);
          const radius = 8 + intensity * 6;
          const color = intensity > 0.5 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.3)';
          r.circle(95 + xi * 40, yOffset + 45 + yi * 30, radius, { fill: color });
        }
      }
    }

    // Turntable
    r.ellipse(170, yOffset + 150, 60, 15, { fill: '#4b5563' });

    // Food grid (5x5)
    temps.forEach((temp, i) => {
      const x = 120 + (i % 5) * 20;
      const y = yOffset + 70 + Math.floor(i / 5) * 16;
      r.roundRect(x, y, 18, 14, 2, { fill: this.tempToColor(temp) });
    });

    // Control panel
    r.roundRect(290, yOffset + 20, 50, 160, 3, { fill: '#1f2937' });
    r.circle(315, yOffset + 50, 12, { fill: cooking ? '#22c55e' : '#4b5563' });
    r.text(315, yOffset + 80, cooking ? 'ON' : 'OFF', { fill: '#9ca3af', fontSize: 9, textAnchor: 'middle' });
    r.roundRect(300, yOffset + 100, 30, 8, 2, { fill: turntable ? '#3b82f6' : '#4b5563' });
    r.text(315, yOffset + 125, 'Turn', { fill: '#6b7280', fontSize: 9, textAnchor: 'middle' });
    r.text(315, yOffset + 160, `${this.cookTime.toFixed(1)}s`, { fill: '#4ade80', fontSize: 12, textAnchor: 'middle' });

    // Temperature legend
    r.roundRect(60, yOffset + 200, 280, 20, 4, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.rect(70, yOffset + 205, 20, 10, { fill: '#3b82f6' });
    r.text(95, yOffset + 213, 'Cold', { fill: '#9ca3af', fontSize: 9 });
    r.rect(130, yOffset + 205, 20, 10, { fill: '#22c55e' });
    r.text(155, yOffset + 213, 'Warm', { fill: '#9ca3af', fontSize: 9 });
    r.rect(190, yOffset + 205, 20, 10, { fill: '#eab308' });
    r.text(215, yOffset + 213, 'Hot', { fill: '#9ca3af', fontSize: 9 });
    r.rect(250, yOffset + 205, 20, 10, { fill: '#ef4444' });
    r.text(275, yOffset + 213, 'V.Hot', { fill: '#9ca3af', fontSize: 9 });
  }

  private renderHook(r: CommandRenderer): void {
    // Badge
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(245, 158, 11, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Microwave Mystery', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Hot spots and cold spots - why?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Food icon
    r.text(200, 250, '🍲', { fontSize: 72, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 310, 320, 130, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 345, 'You heat leftovers in the microwave.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 375, 'One bite is ice cold,', { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 400, 'the next is scalding hot!', { fill: '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 430, 'Why does this happen?', { fill: '#f59e0b', fontSize: 12, textAnchor: 'middle' });

    // CTA Button
    r.addButton({ id: 'investigate', label: 'Investigate!', variant: 'primary' });

    r.setCoachMessage('Discover the physics of standing waves in your microwave!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'Microwaves bounce back and forth', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'inside the oven. What happens when', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 180, 'waves reflect off the walls?', { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Random chaos - energy scatters equally',
      'Standing waves with fixed hot/cold spots',
      'All energy concentrates in the center',
      'Walls absorb most energy'
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 55;
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
        bgColor = 'rgba(245, 158, 11, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 440, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Correct!' : 'Not quite!';
      r.text(200, 470, `${message} Standing waves create fixed patterns!`, { fill: '#34d399', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 500, 'Hot spots at antinodes, cold spots at nodes.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 520, 'Spacing = wavelength/2 = ~6 cm', { fill: '#f59e0b', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See It in Action', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Standing Wave Lab', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Microwave visualization
    this.renderMicrowaveScene(r, this.foodTemp, this.isCooking, this.turntableOn, 70);

    // Control buttons
    r.addButton({ id: 'toggle_cooking', label: this.isCooking ? 'Stop' : 'Start Cooking', variant: this.isCooking ? 'secondary' : 'primary' });
    r.addButton({ id: 'toggle_turntable', label: `Turntable: ${this.turntableOn ? 'ON' : 'OFF'}`, variant: 'secondary' });
    r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });

    // Info card
    r.roundRect(30, 340, 340, 70, 12, { fill: 'rgba(245, 158, 11, 0.15)' });
    r.text(200, 365, 'Standing waves: microwaves interfere to create', { fill: '#f59e0b', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 385, 'fixed patterns of high (antinodes) and low (nodes) energy.', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 405, 'Try cooking with and without the turntable!', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review the Science', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'Standing Wave Physics', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Wave reflection card
    r.roundRect(25, 85, 170, 120, 12, { fill: 'rgba(245, 158, 11, 0.2)' });
    r.text(110, 110, 'Wave Reflection', { fill: '#f59e0b', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 135, 'Microwaves bounce', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 150, 'off metal walls', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 165, 'creating interference', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 185, 'patterns.', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Hot spots card
    r.roundRect(205, 85, 170, 120, 12, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(290, 110, 'Hot & Cold Spots', { fill: '#ef4444', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 135, 'Antinodes = HOT', { fill: '#ef4444', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 155, 'Nodes = COLD', { fill: '#3b82f6', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 175, 'Spacing = lambda/2', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 195, '= 6.1 cm', { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle' });

    // The math
    r.roundRect(25, 220, 350, 90, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 245, 'The Math', { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 270, 'Wavelength: lambda = c / f = 3x10^8 / 2.45x10^9', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 290, '= 12.2 cm. Hot spot spacing = lambda/2 = 6.1 cm!', { fill: '#22c55e', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Discover the Twist', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist Challenge', { fill: '#f59e0b', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'If standing waves create fixed hot spots,', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 150, 'why do microwave ovens have a turntable?', { fill: '#3b82f6', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Moves food through hot spots for even heating',
      'Just stirs the food like a mixer',
      'Creates additional microwaves',
      "Decorative - doesn't really help"
    ];

    options.forEach((option, i) => {
      const y = 200 + i * 55;
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
        bgColor = 'rgba(245, 158, 11, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 430, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 0 ? 'Exactly!' : 'Not quite!';
      r.text(200, 460, `${message} The turntable moves food through the pattern!`, { fill: '#34d399', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 490, "It doesn't change the standing wave,", { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 510, 'but each part of the food visits the hot spots!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See How It Works', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Turntable vs No Turntable', { fill: '#f59e0b', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Food temperature display
    r.roundRect(100, 85, 200, 150, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 105, this.twistTurntable ? 'WITH Turntable' : 'NO Turntable', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Food grid
    this.twistFoodTemp.forEach((temp, i) => {
      const x = 115 + (i % 5) * 22;
      const y = 120 + Math.floor(i / 5) * 22;
      r.roundRect(x, y, 20, 20, 3, { fill: this.tempToColor(temp) });
    });

    // Stats
    const avgTemp = this.twistFoodTemp.reduce((a, b) => a + b, 0) / this.twistFoodTemp.length;
    const tempVariance = Math.sqrt(this.twistFoodTemp.reduce((acc, t) => acc + Math.pow(t - avgTemp, 2), 0) / this.twistFoodTemp.length);

    r.text(200, 240, `Avg: ${avgTemp.toFixed(0)}C  Variation: +-${tempVariance.toFixed(0)}C`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Control buttons
    r.addButton({ id: 'cook_without_turntable', label: 'Cook WITHOUT Turntable', variant: 'secondary' });
    r.addButton({ id: 'cook_with_turntable', label: 'Cook WITH Turntable', variant: 'secondary' });

    // Timer/status
    if (this.twistCookTime > 0) {
      r.text(200, 330, `Cooking... ${this.twistCookTime.toFixed(1)}s remaining`, { fill: '#f59e0b', fontSize: 12, textAnchor: 'middle' });
    }

    // Explanation
    r.roundRect(30, 360, 340, 60, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    const explanation = this.twistTurntable
      ? 'Turntable moves food through hot spots - even heating!'
      : 'Food sits in fixed positions - hot and cold spots!';
    r.text(200, 395, explanation, { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review Discovery', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Turntable Solution', { fill: '#f59e0b', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Main insight
    r.roundRect(25, 85, 350, 80, 16, { fill: 'rgba(245, 158, 11, 0.2)' });
    r.text(200, 115, "The turntable doesn't change the standing wave,", { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 135, 'it moves the food through the pattern!', { fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Comparison cards
    r.roundRect(25, 180, 170, 100, 12, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(110, 205, 'Without Turntable', { fill: '#ef4444', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 230, 'Hot spots: scalding', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 250, 'Cold spots: frozen', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 270, 'Uneven heating!', { fill: '#f87171', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(205, 180, 170, 100, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(290, 205, 'With Turntable', { fill: '#10b981', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 230, 'Each part visits', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 250, 'hot spots over time', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 270, 'Even heating!', { fill: '#34d399', fontSize: 10, textAnchor: 'middle' });

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
      if (isActive) bgColor = '#f59e0b';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 200, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Description (wrapped)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 210;
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

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 320, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 380, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

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
      r.roundRect(25, 100, 350, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 140, question.question, { fill: '#f59e0b', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 185 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(245, 158, 11, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 45, 8, { fill: bgColor });
        r.text(40, y + 27, `${String.fromCharCode(65 + i)}. ${option.substring(0, 48)}${option.length > 48 ? '...' : ''}`, { fill: isSelected ? '#f59e0b' : '#e2e8f0', fontSize: 10 });

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
        r.text(200, 420, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "You've mastered standing waves!" : 'Keep studying and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

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
    r.text(200, 200, 'Standing Wave Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, "You've mastered microwave physics!", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '〰️', label: 'Standing Waves' },
      { icon: '🔥', label: 'Hot Spots' },
      { icon: '🔄', label: 'Turntable Solution' },
      { icon: '🍡', label: 'Marshmallow Test' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 275 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 440, 300, 70, 12, { fill: 'rgba(245, 158, 11, 0.2)' });
    r.text(200, 465, 'Key Formula', { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 492, 'Hot spot spacing = lambda/2 = 6.1 cm', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering standing wave physics!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      isCooking: this.isCooking,
      turntableOn: this.turntableOn,
      cookTime: this.cookTime,
      foodTemp: this.foodTemp,
      turntableAngle: this.turntableAngle,
      animationTime: this.animationTime,
      twistTurntable: this.twistTurntable,
      twistCookTime: this.twistCookTime,
      twistFoodTemp: this.twistFoodTemp,
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
    if (state.isCooking !== undefined) this.isCooking = state.isCooking as boolean;
    if (state.turntableOn !== undefined) this.turntableOn = state.turntableOn as boolean;
    if (state.cookTime !== undefined) this.cookTime = state.cookTime as number;
    if (state.foodTemp) this.foodTemp = state.foodTemp as number[];
    if (state.turntableAngle !== undefined) this.turntableAngle = state.turntableAngle as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.twistTurntable !== undefined) this.twistTurntable = state.twistTurntable as boolean;
    if (state.twistCookTime !== undefined) this.twistCookTime = state.twistCookTime as number;
    if (state.twistFoodTemp) this.twistFoodTemp = state.twistFoodTemp as number[];
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createMicrowaveStandingWaveGame(sessionId: string): MicrowaveStandingWaveGame {
  return new MicrowaveStandingWaveGame(sessionId);
}
