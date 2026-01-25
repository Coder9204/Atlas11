import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// GAS LAWS GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: PV = nRT (Ideal Gas Law)
// Boyle's Law: P1V1 = P2V2 (constant T)
// Charles's Law: V1/T1 = V2/T2 (constant P)
// ============================================================================

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number; // PROTECTED: Never sent to client
}

interface TransferApp {
  icon: string;
  title: string;
  description: string;
  details: string;
  stats: { value: string; label: string }[];
}

export class GasLawsGame extends BaseGame {
  readonly gameType = 'gas_laws';
  readonly gameTitle = 'Gas Laws: PVT Relationships';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Boyle's Law simulation
  private volume = 100;
  private pressure = 1;

  // Charles's Law simulation
  private twistTemp = 300;
  private twistVolume = 100;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  private animationTime = 0;

  // PROTECTED: PV constant for Boyle's Law
  private readonly PV_CONSTANT = 100; // P * V = constant at constant T

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      question: "If you halve the volume of a gas at constant temperature, the pressure:",
      options: ["Halves", "Doubles", "Stays the same", "Quadruples"],
      correctIndex: 1
    },
    {
      question: "Boyle's Law states that at constant temperature:",
      options: ["P and V are directly proportional", "P and V are inversely proportional", "P and T are directly proportional", "V and T are inversely proportional"],
      correctIndex: 1
    },
    {
      question: "If a gas is heated at constant pressure, its volume will:",
      options: ["Decrease", "Increase", "Stay the same", "Become zero"],
      correctIndex: 1
    },
    {
      question: "Charles's Law relates:",
      options: ["Pressure and volume", "Volume and temperature", "Pressure and temperature", "All three variables"],
      correctIndex: 1
    },
    {
      question: "The Ideal Gas Law is expressed as:",
      options: ["PV = nRT", "P/V = nRT", "P + V = nRT", "PV = n/RT"],
      correctIndex: 0
    },
    {
      question: "At absolute zero (0 K), an ideal gas would have:",
      options: ["Maximum pressure", "Zero volume", "Maximum volume", "Infinite pressure"],
      correctIndex: 1
    },
    {
      question: "If you double both pressure and temperature of a gas, the volume:",
      options: ["Doubles", "Halves", "Stays the same", "Quadruples"],
      correctIndex: 2
    },
    {
      question: "A weather balloon expands as it rises because:",
      options: ["Temperature increases", "Atmospheric pressure decreases", "More gas enters", "Gravity weakens"],
      correctIndex: 1
    },
    {
      question: "The gas constant R has units of:",
      options: ["J/(mol*K)", "Pa*m^3", "atm*L", "All of these (equivalent)"],
      correctIndex: 3
    },
    {
      question: "Real gases deviate from ideal behavior at:",
      options: ["Low pressure and high temperature", "High pressure and low temperature", "All conditions equally", "Only at room temperature"],
      correctIndex: 1
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🤿",
      title: "Scuba Diving",
      description: "At depth, divers breathe compressed air. As they ascend, air in lungs expands (Boyle's Law). Never hold breath while ascending!",
      details: "P1V1 = P2V2. At 30m, pressure is 4 atm. A 1L breath at depth becomes 4L at surface. Safety stops allow gas equilibration.",
      stats: [
        { value: '4x', label: 'Volume change 30m to 0m' },
        { value: '1 atm', label: 'Per 10m depth' },
        { value: '18m/min', label: 'Safe ascent rate' }
      ]
    },
    {
      icon: "🎈",
      title: "Hot Air Balloons",
      description: "Heating air makes it expand and become less dense. The balloon traps lighter air, creating buoyancy (Charles's Law).",
      details: "V1/T1 = V2/T2. Heating air from 300K to 400K increases volume by 33%. Same mass in larger volume = lower density = floats.",
      stats: [
        { value: '100C', label: 'Typical temp difference' },
        { value: '30%', label: 'Density reduction' },
        { value: '300kg', label: 'Typical payload' }
      ]
    },
    {
      icon: "🚗",
      title: "Car Engines",
      description: "Compress fuel-air mixture, ignite it, and rapid heating causes explosive expansion pushing pistons.",
      details: "Compression ratio (typically 10:1) determines efficiency. Higher compression = higher peak pressure = more work extracted.",
      stats: [
        { value: '10:1', label: 'Compression ratio' },
        { value: '2500C', label: 'Combustion temp' },
        { value: '10%', label: 'Tire P increase hot' }
      ]
    },
    {
      icon: "🌤️",
      title: "Weather Systems",
      description: "Rising air expands and cools (adiabatic cooling), causing cloud formation and driving weather patterns.",
      details: "Lower pressure at altitude means rising air expands. Expansion cools the air. Cool air holds less water = clouds and rain.",
      stats: [
        { value: '10C/km', label: 'Dry adiabatic rate' },
        { value: '50%', label: 'P at 5.5km altitude' },
        { value: '1013', label: 'Sea level P (hPa)' }
      ]
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate pressure from volume using Boyle's Law
  private calculatePressure(volume: number): number {
    return this.PV_CONSTANT / volume;
  }

  // PROTECTED: Calculate volume from temperature using Charles's Law
  private calculateVolume(temperature: number): number {
    return (temperature / 300) * 100; // Reference: 100% at 300K
  }

  private checkAnswer(questionIndex: number, answerIndex: number): boolean {
    return this.testQuestions[questionIndex].correctIndex === answerIndex;
  }

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
      if (input.id === 'volume') {
        this.volume = Math.max(25, Math.min(200, input.value));
        this.pressure = this.calculatePressure(this.volume);
      } else if (input.id === 'temperature') {
        this.twistTemp = Math.max(200, Math.min(500, input.value));
        this.twistVolume = this.calculateVolume(this.twistTemp);
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
            this.prediction = buttonId.replace('option_', '');
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
        }
        break;

      case 'play':
        if (buttonId === 'continue') {
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
            this.twistPrediction = buttonId.replace('option_', '');
            this.showTwistFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'twist_play';
          this.showTwistFeedback = false;
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
        } else if (buttonId === 'mark_explored') {
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
    this.volume = 100;
    this.pressure = 1;
    this.twistTemp = 300;
    this.twistVolume = 100;
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

    r.clear('#0a0f1a');

    // Background effects
    r.circle(100, 100, 150, { fill: 'rgba(139, 92, 246, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(6, 182, 212, 0.05)' });

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
    r.roundRect(120, 60, 160, 30, 8, { fill: 'rgba(139, 92, 246, 0.1)' });
    r.text(200, 80, 'CHEMISTRY EXPLORATION', { fill: '#a78bfa', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'Gas Laws: PVT Relationships', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Why do balloons expand and pop?', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    // Icons
    r.text(130, 220, '📊', { fontSize: 28, textAnchor: 'middle' });
    r.text(200, 220, '📦', { fontSize: 28, textAnchor: 'middle' });
    r.text(270, 220, '🌡️', { fontSize: 28, textAnchor: 'middle' });

    r.text(130, 250, 'Pressure', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 250, 'Volume', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(270, 250, 'Temperature', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 280, 320, 160, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 310, 'Squeeze a sealed syringe...', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 340, 'Half the volume, double the pressure!', { fill: '#a78bfa', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 380, 'How are pressure, volume,', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 400, 'and temperature connected?', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 430, 'Can you predict the relationship?', { fill: '#8b5cf6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'start', label: 'Explore Gas Behavior', variant: 'primary' });

    r.setCoachMessage("Let's explore how gases behave under pressure!");
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 55, 'Make Your Prediction', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 80, 340, 110, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 105, 'You seal a syringe with 20 mL of air', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 125, 'at 1 atm pressure. Push the plunger', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 145, 'to compress to 10 mL (half volume).', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 175, 'What happens to the pressure?', { fill: '#8b5cf6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'A', text: 'Decreases to 0.5 atm' },
      { id: 'B', text: 'Stays at 1 atm' },
      { id: 'C', text: 'Increases to 2 atm' },
      { id: 'D', text: 'Increases to 4 atm' }
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (option.id === 'C') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (option.id === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (option.id === this.prediction) {
        bgColor = 'rgba(139, 92, 246, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${option.id}. ${option.text}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${option.id}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 440, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 'C' ? 'Correct!' : "That's Boyle's Law!";
      r.text(200, 470, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 495, 'P1V1 = P2V2 at constant temperature.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 515, 'Half volume means double pressure!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Explore the Physics', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 50, "Boyle's Law Lab", { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 75, 'Adjust volume and watch pressure change', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Piston visualization
    r.roundRect(30, 95, 340, 200, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Cylinder
    r.rect(80, 115, 180, 150, { fill: 'rgba(51, 65, 85, 0.8)' });

    // Piston position based on volume
    const pistonY = 115 + (200 - this.volume) / 200 * 100;
    r.rect(85, pistonY, 170, 20, { fill: '#94a3b8' });
    r.rect(165, 100, 10, pistonY - 100, { fill: '#64748b' });

    // Gas molecules (simplified)
    const moleculeCount = Math.floor(this.volume / 15);
    for (let i = 0; i < moleculeCount && i < 10; i++) {
      const mx = 100 + (i % 5) * 30 + Math.sin(this.animationTime * 2 + i) * 5;
      const my = pistonY + 40 + Math.floor(i / 5) * 25 + Math.cos(this.animationTime * 2 + i) * 5;
      r.circle(mx, my, 5, { fill: '#8b5cf6' });
    }

    // Info panel
    r.roundRect(270, 120, 90, 90, 8, { fill: 'rgba(15, 23, 42, 0.8)' });
    r.text(315, 140, 'Pressure', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(315, 160, `${this.pressure.toFixed(2)} atm`, { fill: '#8b5cf6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(315, 180, 'Volume', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(315, 200, `${this.volume}%`, { fill: '#06b6d4', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // P*V constant display
    r.roundRect(30, 305, 340, 50, 10, { fill: 'rgba(16, 185, 129, 0.15)' });
    const pv = (this.pressure * this.volume).toFixed(0);
    r.text(200, 335, `P x V = ${pv} (Constant!)`, { fill: '#10b981', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Volume slider
    r.addSlider({
      id: 'volume',
      label: 'Volume',
      min: 25,
      max: 200,
      step: 5,
      value: this.volume
    });

    // Formula box
    r.roundRect(100, 420, 200, 50, 10, { fill: 'rgba(139, 92, 246, 0.15)' });
    r.text(200, 445, 'P1V1 = P2V2', { fill: '#a78bfa', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 462, "Boyle's Law (constant T)", { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 50, "Boyle's Law Explained", { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 75, 'Same molecules, different space', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Main formula
    r.roundRect(50, 95, 300, 70, 16, { fill: 'rgba(139, 92, 246, 0.2)' });
    r.text(200, 130, 'P1V1 = P2V2', { fill: '#a78bfa', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 155, 'At constant temperature, P and V are inversely proportional', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Explanation cards
    r.roundRect(30, 180, 165, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(55, 205, '🔬', { fontSize: 20 });
    r.text(75, 205, 'Molecular View', { fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold' });
    r.text(112, 230, 'Smaller volume = more', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(112, 245, 'collisions with walls', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(112, 260, '= higher pressure', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.roundRect(205, 180, 165, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(230, 205, '📊', { fontSize: 20 });
    r.text(250, 205, 'Inverse Relation', { fill: '#06b6d4', fontSize: 11, fontWeight: 'bold' });
    r.text(287, 230, 'When V doubles,', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(287, 245, 'P halves. Their', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(287, 260, 'product stays constant.', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Applications
    r.text(200, 305, 'Key Applications:', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    const apps = [
      { icon: '🏊', title: 'Scuba Diving', desc: 'Air expands as divers ascend' },
      { icon: '🎈', title: 'Weather Balloons', desc: 'Expand as they rise' },
      { icon: '💉', title: 'Syringes', desc: 'Lower pressure draws liquid' }
    ];

    apps.forEach((app, i) => {
      const y = 325 + i * 55;
      r.roundRect(40, y, 320, 48, 10, { fill: 'rgba(30, 41, 59, 0.3)' });
      r.text(60, y + 28, app.icon, { fontSize: 18 });
      r.text(90, y + 22, app.title, { fill: '#ffffff', fontSize: 11, fontWeight: 'bold' });
      r.text(90, y + 38, app.desc, { fill: '#94a3b8', fontSize: 9 });
    });

    r.addButton({ id: 'continue', label: 'Explore Temperature Effects', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'Temperature Effects', { fill: '#fbbf24', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 85, 340, 110, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 115, 'A balloon at room temperature (300 K)', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 135, 'is heated to 450 K while external', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 155, 'pressure stays constant at 1 atm.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 182, "What happens to the balloon's volume?", { fill: '#fbbf24', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'A', text: 'Balloon shrinks' },
      { id: 'B', text: 'Balloon expands (1.5x volume)' },
      { id: 'C', text: 'Volume stays the same' }
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (option.id === 'B') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (option.id === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (option.id === this.twistPrediction) {
        bgColor = 'rgba(251, 191, 36, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${option.id}. ${option.text}`, { fill: textColor, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${option.id}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 390, 340, 95, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 'B' ? 'Correct!' : "This is Charles's Law!";
      r.text(200, 420, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 445, 'V1/T1 = V2/T2. Since 450K/300K = 1.5,', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 465, 'volume increases by 50%!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Explore Temperature Effects', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, "Charles's Law Lab", { fill: '#fbbf24', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 75, 'Adjust temperature and watch volume change', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Balloon visualization
    r.roundRect(30, 95, 340, 200, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Balloon shape based on volume
    const balloonRadius = 30 + (this.twistVolume - 100) * 0.3;
    const balloonColor = this.twistTemp > 350 ? '#f59e0b' : this.twistTemp < 250 ? '#06b6d4' : '#8b5cf6';
    r.ellipse(200, 180, balloonRadius + 20, balloonRadius, { fill: balloonColor });
    r.text(200, 185, `${this.twistVolume.toFixed(0)}%`, { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Molecules moving faster at higher temp
    const moleculeSpeed = Math.sqrt(this.twistTemp / 300);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + this.animationTime * moleculeSpeed;
      const radius = balloonRadius * 0.6;
      const mx = 200 + Math.cos(angle) * radius;
      const my = 180 + Math.sin(angle) * radius * 0.8;
      r.circle(mx, my, 4, { fill: 'rgba(255, 255, 255, 0.6)' });
    }

    // Temperature display
    r.roundRect(280, 120, 80, 60, 8, { fill: 'rgba(15, 23, 42, 0.8)' });
    const tempC = this.twistTemp - 273;
    r.text(320, 145, `${this.twistTemp} K`, { fill: balloonColor, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(320, 165, `(${tempC.toFixed(0)}C)`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // V/T ratio constant display
    r.roundRect(30, 305, 340, 50, 10, { fill: 'rgba(16, 185, 129, 0.15)' });
    const vt = (this.twistVolume / this.twistTemp).toFixed(3);
    r.text(200, 335, `V / T = ${vt} (Constant!)`, { fill: '#10b981', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Temperature slider
    r.addSlider({
      id: 'temperature',
      label: 'Temperature (K)',
      min: 200,
      max: 500,
      step: 10,
      value: this.twistTemp
    });

    // Formula box
    r.roundRect(100, 420, 200, 50, 10, { fill: 'rgba(251, 191, 36, 0.15)' });
    r.text(200, 445, 'V1/T1 = V2/T2', { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 462, "Charles's Law (constant P)", { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Deep Understanding', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 50, 'The Ideal Gas Law', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 75, 'Combining all three variables', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Main formula
    r.roundRect(50, 95, 300, 80, 16, { fill: 'rgba(139, 92, 246, 0.2)' });
    r.text(200, 135, 'PV = nRT', { fill: '#a78bfa', fontSize: 32, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 165, 'Pressure x Volume = moles x R x Temperature', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Three laws summary
    const laws = [
      { name: "Boyle's", formula: 'P1V1 = P2V2', note: 'constant T', color: '#8b5cf6' },
      { name: "Charles's", formula: 'V1/T1 = V2/T2', note: 'constant P', color: '#fbbf24' },
      { name: "Gay-Lussac's", formula: 'P1/T1 = P2/T2', note: 'constant V', color: '#06b6d4' }
    ];

    laws.forEach((law, i) => {
      const y = 195 + i * 55;
      r.roundRect(40, y, 320, 48, 10, { fill: `${law.color}20` });
      r.rect(40, y, 6, 48, { fill: law.color });
      r.text(60, y + 20, law.name, { fill: law.color, fontSize: 12, fontWeight: 'bold' });
      r.text(60, y + 38, law.formula, { fill: '#ffffff', fontSize: 11 });
      r.text(350, y + 30, `(${law.note})`, { fill: '#94a3b8', fontSize: 9, textAnchor: 'end' });
    });

    // Key insight
    r.roundRect(40, 365, 320, 70, 12, { fill: 'rgba(16, 185, 129, 0.15)' });
    r.text(200, 390, 'The Big Picture', { fill: '#10b981', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 412, 'PV = nRT connects macroscopic measurements', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 428, 'to the microscopic world of molecules!', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 50, 'Real-World Applications', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 90;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#8b5cf6';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 75, 80, 50, 8, { fill: bgColor });
      r.text(x + 40, 100, app.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 40, 118, app.title.split(' ')[0], { fill: '#ffffff', fontSize: 8, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 165, app.title, { fill: '#ffffff', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 185, app.icon, { fontSize: 28, textAnchor: 'middle' });

    // Description (wrapped)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 220;
    words.forEach(word => {
      if ((line + word).length > 48) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 15;
      } else {
        line += word + ' ';
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Stats
    app.stats.forEach((stat, i) => {
      const x = 65 + i * 100;
      r.roundRect(x, 305, 85, 50, 8, { fill: 'rgba(15, 23, 42, 0.5)' });
      r.text(x + 42, 325, stat.value, { fill: '#8b5cf6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x + 42, 345, stat.label, { fill: '#94a3b8', fontSize: 8, textAnchor: 'middle' });
    });

    // Mark explored button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_explored', label: 'Mark as Explored', variant: 'secondary' });
    } else {
      r.text(200, 390, 'Completed!', { fill: '#10b981', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 430, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 50, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 75, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Question
      r.roundRect(25, 95, 350, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 130, question.question.substring(0, 55), { fill: '#ffffff', fontSize: 11, textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 170 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(139, 92, 246, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 44, 8, { fill: bgColor });
        r.text(40, y + 27, `${String.fromCharCode(65 + i)}. ${option.substring(0, 50)}`, { fill: isSelected ? '#a78bfa' : '#e2e8f0', fontSize: 10 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      // Navigation
      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: 'Previous', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next', variant: 'secondary' });
      }

      // Submit
      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      } else {
        r.text(200, 420, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
      }
    } else {
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 200, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🎉' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 185, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 220, score >= 7 ? "You've mastered gas laws!" : 'Review and try again.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 245, `${(score / 10 * 100).toFixed(0)}%`, { fill: score >= 7 ? '#10b981' : '#fbbf24', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Complete Lesson', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Retry', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 100, '🏆', { fontSize: 64, textAnchor: 'middle' });

    r.text(200, 170, 'Mastery Achieved!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, "You've mastered the Gas Laws!", { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '📊', label: "Boyle's Law" },
      { icon: '🌡️', label: "Charles's Law" },
      { icon: '🎈', label: 'Ideal Gas' }
    ];

    concepts.forEach((concept, i) => {
      const x = 70 + i * 100;
      r.roundRect(x, 240, 80, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 40, 265, concept.icon, { fontSize: 22, textAnchor: 'middle' });
      r.text(x + 40, 295, concept.label, { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });
    });

    // Key formulas
    r.roundRect(50, 330, 300, 80, 12, { fill: 'rgba(139, 92, 246, 0.15)' });
    r.text(200, 355, 'Key Formulas Mastered', { fill: '#a78bfa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 380, 'PV = nRT  |  P1V1 = P2V2  |  V1/T1 = V2/T2', { fill: '#ffffff', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 400, 'Ideal Gas Law | Boyle | Charles', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering gas laws!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      volume: this.volume,
      pressure: this.pressure,
      twistTemp: this.twistTemp,
      twistVolume: this.twistVolume,
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
    if (state.prediction !== undefined) this.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.showPredictionFeedback !== undefined) this.showPredictionFeedback = state.showPredictionFeedback as boolean;
    if (state.showTwistFeedback !== undefined) this.showTwistFeedback = state.showTwistFeedback as boolean;
    if (state.volume !== undefined) this.volume = state.volume as number;
    if (state.pressure !== undefined) this.pressure = state.pressure as number;
    if (state.twistTemp !== undefined) this.twistTemp = state.twistTemp as number;
    if (state.twistVolume !== undefined) this.twistVolume = state.twistVolume as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createGasLawsGame(sessionId: string): GasLawsGame {
  return new GasLawsGame(sessionId);
}
