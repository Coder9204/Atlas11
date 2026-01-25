import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// CARNOT CYCLE GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Carnot Efficiency η = 1 - T_cold/T_hot
// Maximum theoretical efficiency for heat engines
// Four reversible processes: isothermal expansion/compression, adiabatic expansion/compression
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
const ABSOLUTE_ZERO = 0; // Kelvin
const ROOM_TEMP = 293; // K (~20°C)
const WATER_BOILING = 373; // K (100°C)
const STEAM_TURBINE_HOT = 823; // K (~550°C)
const OCEAN_COLD = 280; // K (~7°C)

export class CarnotCycleGame extends BaseGame {
  readonly gameType = 'carnot_cycle';
  readonly gameTitle = 'Carnot Cycle: The Limits of Efficiency';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private hotTemp = 600; // Kelvin
  private coldTemp = 300; // Kelvin
  private cycleStep = 0; // 0-3 for the four stages
  private isAnimating = false;
  private animationProgress = 0;
  private animationTime = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Cycle stage info
  private readonly cycleStages = [
    { name: 'Isothermal Expansion', color: '#ef4444', desc: 'Gas expands at hot T, absorbs heat Q_H' },
    { name: 'Adiabatic Expansion', color: '#f59e0b', desc: 'Gas expands without heat transfer, T drops' },
    { name: 'Isothermal Compression', color: '#3b82f6', desc: 'Gas compresses at cold T, releases Q_C' },
    { name: 'Adiabatic Compression', color: '#8b5cf6', desc: 'Gas compresses, T rises back to T_H' }
  ];

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "A coal power plant operates with steam at 550°C (823 K) and cooling water at 30°C (303 K).",
      question: "What is the maximum theoretical efficiency of this power plant?",
      options: [
        "About 37%",
        "About 63%",
        "About 85%",
        "About 45%"
      ],
      correctIndex: 1,
      explanation: "Carnot efficiency η = 1 - T_C/T_H = 1 - 303/823 = 1 - 0.368 = 63.2%. Real plants achieve 35-45% due to irreversibilities."
    },
    {
      scenario: "A car engine burns fuel at 2000 K combustion temperature, but the effective T_H is only about 600 K. Exhaust is at 350 K.",
      question: "Why is actual efficiency (25-30%) so much lower than 2000 K would suggest?",
      options: [
        "The fuel doesn't burn completely",
        "The working fluid can't absorb heat at combustion T due to time constraints",
        "Friction uses up most of the energy",
        "The exhaust temperature is too high"
      ],
      correctIndex: 1,
      explanation: "In a real engine, the working fluid doesn't have time to reach combustion temperature. Effective T_H is much lower, limiting theoretical efficiency."
    },
    {
      scenario: "During isothermal expansion in the Carnot cycle, the gas does work while absorbing heat.",
      question: "Why does the temperature remain constant?",
      options: [
        "The gas is perfectly insulated",
        "The heat absorbed equals the work done, so internal energy stays constant",
        "The pressure remains constant",
        "The volume doesn't change"
      ],
      correctIndex: 1,
      explanation: "For an ideal gas, internal energy depends only on temperature. During isothermal expansion, Q_in = W_out, so ΔU = Q - W = 0."
    },
    {
      scenario: "A geothermal power plant uses hot water at 180°C (453 K) and cools with air at 25°C (298 K).",
      question: "What is the maximum possible efficiency?",
      options: [
        "About 34%",
        "About 50%",
        "About 65%",
        "About 25%"
      ],
      correctIndex: 0,
      explanation: "η = 1 - T_C/T_H = 1 - 298/453 = 34.2%. Geothermal has lower efficiency than coal because T_H is lower."
    },
    {
      scenario: "An engine takes in 1000 J from hot reservoir at 500 K, does 600 J of work, and rejects 400 J to cold reservoir at 300 K.",
      question: "Is this engine possible?",
      options: [
        "Yes, it's within the Carnot limit",
        "No, it exceeds the Carnot efficiency limit",
        "Yes, because energy is conserved (1000 = 600 + 400)",
        "No, because perpetual motion is impossible"
      ],
      correctIndex: 1,
      explanation: "Proposed efficiency: 600/1000 = 60%. Carnot limit: 1 - 300/500 = 40%. Since 60% > 40%, this engine violates the Second Law."
    },
    {
      scenario: "During adiabatic expansion, the gas does work but no heat enters or leaves the system.",
      question: "Where does the energy for this work come from?",
      options: [
        "From delayed heat transfer from hot reservoir",
        "From the internal energy of the gas (temperature drops)",
        "From the kinetic energy of the piston",
        "From nuclear reactions in the gas"
      ],
      correctIndex: 1,
      explanation: "In adiabatic expansion, Q = 0, so ΔU = -W. Work comes from internal energy, causing temperature to drop."
    },
    {
      scenario: "An engineer can either increase T_H by 50 K or decrease T_C by 50 K. Current: T_H = 600 K, T_C = 300 K.",
      question: "Which modification gives larger efficiency improvement?",
      options: [
        "Increasing T_H by 50 K (new η = 50.8%)",
        "Decreasing T_C by 50 K (new η = 58.3%)",
        "Both give the same improvement",
        "Neither significantly changes efficiency"
      ],
      correctIndex: 1,
      explanation: "Original: η = 50%. T_H = 650 K: η = 53.8%. T_C = 250 K: η = 58.3%. Lowering T_C has more impact."
    },
    {
      scenario: "A heat pump heats a house. Outside: 0°C (273 K), Inside: 20°C (293 K).",
      question: "What is the maximum COP (Coefficient of Performance)?",
      options: [
        "About 1.0 (same as electric heater)",
        "About 5.0",
        "About 14.6",
        "About 0.93 (Carnot engine efficiency)"
      ],
      correctIndex: 2,
      explanation: "For heat pump: COP = T_H/(T_H - T_C) = 293/20 = 14.65. For every 1 kW electricity, you could deliver 14.65 kW heat!"
    },
    {
      scenario: "A refrigerator: interior 5°C (278 K), kitchen 25°C (298 K). It removes 100 W from food.",
      question: "What is the minimum power required at Carnot efficiency?",
      options: [
        "About 7.2 W",
        "About 100 W",
        "About 50 W",
        "About 20 W"
      ],
      correctIndex: 0,
      explanation: "Refrigerator COP = T_C/(T_H - T_C) = 278/20 = 13.9. W = Q_C/COP = 100/13.9 = 7.2 W."
    },
    {
      scenario: "Two Carnot engines in series: A (800 K to 500 K), B (500 K to 300 K). A's waste heat powers B.",
      question: "What is the combined efficiency?",
      options: [
        "Same as single engine 800 K to 300 K (62.5%)",
        "Higher than single engine",
        "Lower than single engine",
        "Sum of individual efficiencies (77.5%)"
      ],
      correctIndex: 0,
      explanation: "η_A = 37.5%, η_B = 40%. Combined: η = 1 - (1-η_A)(1-η_B) = 62.5%. Same as single engine 800 K → 300 K!"
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🏭",
      title: "Power Plants",
      tagline: "Maximizing energy conversion",
      description: "Thermal power plants use the Carnot limit to understand maximum efficiency. Combined-cycle plants achieve 60%+ by using waste heat from one cycle to power another.",
      connection: "η = 1 - T_C/T_H sets the absolute maximum. Real plants achieve 60-70% of this limit."
    },
    {
      icon: "🚗",
      title: "Car Engines",
      tagline: "Why cars waste so much fuel",
      description: "Car engines achieve only 25-30% efficiency. The Carnot cycle explains why: effective T_H is limited by how fast heat can transfer to the working fluid.",
      connection: "With effective T_H ≈ 600 K and T_C ≈ 350 K, Carnot limit is ~42%. Real engines achieve 60-70% of this."
    },
    {
      icon: "❄️",
      title: "Refrigerators & AC",
      tagline: "Moving heat the 'wrong' way",
      description: "Refrigerators are reversed Carnot cycles. They use work to pump heat from cold to hot. COP can exceed 1 - you get more heat moved than work input!",
      connection: "COP = T_C/(T_H - T_C). Small temperature difference = high COP = efficient cooling."
    },
    {
      icon: "🏠",
      title: "Heat Pumps",
      tagline: "3-5× more efficient than electric heaters",
      description: "Heat pumps extract heat from cold outdoor air and deliver it inside. With COP of 3-5, they're the most efficient electric heating available.",
      connection: "COP = T_H/(T_H - T_C). Even extracting heat from 0°C air works because T_C > 0 K!"
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate Carnot efficiency
  private calculateEfficiency(hotTemp: number, coldTemp: number): number {
    // η = 1 - T_cold/T_hot
    if (hotTemp <= coldTemp || coldTemp <= 0) return 0;
    return (1 - coldTemp / hotTemp) * 100;
  }

  // PROTECTED: Calculate waste heat percentage
  private calculateWasteHeat(efficiency: number): number {
    return 100 - efficiency;
  }

  // PROTECTED: Calculate heat pump COP
  private calculateHeatPumpCOP(hotTemp: number, coldTemp: number): number {
    // COP = T_H / (T_H - T_C)
    if (hotTemp <= coldTemp) return Infinity;
    return hotTemp / (hotTemp - coldTemp);
  }

  // PROTECTED: Calculate refrigerator COP
  private calculateRefrigeratorCOP(hotTemp: number, coldTemp: number): number {
    // COP = T_C / (T_H - T_C)
    if (hotTemp <= coldTemp) return Infinity;
    return coldTemp / (hotTemp - coldTemp);
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
      if (input.id === 'hot_temp') {
        this.hotTemp = Math.max(this.coldTemp + 50, Math.min(1200, input.value));
      } else if (input.id === 'cold_temp') {
        this.coldTemp = Math.max(200, Math.min(this.hotTemp - 50, input.value));
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
        if (buttonId === 'toggle_animation') {
          this.isAnimating = !this.isAnimating;
        } else if (buttonId === 'next_step') {
          this.cycleStep = (this.cycleStep + 1) % 4;
        } else if (buttonId === 'reset') {
          this.cycleStep = 0;
          this.animationProgress = 0;
          this.isAnimating = false;
        } else if (buttonId === 'continue') {
          this.isAnimating = false;
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
    this.hotTemp = 600;
    this.coldTemp = 300;
    this.cycleStep = 0;
    this.isAnimating = false;
    this.animationProgress = 0;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Animate cycle
    if (this.isAnimating) {
      this.animationProgress += deltaTime * 40; // Speed of animation
      if (this.animationProgress >= 100) {
        this.animationProgress = 0;
        this.cycleStep = (this.cycleStep + 1) % 4;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs (warm/cold theme)
    r.circle(100, 100, 150, { fill: 'rgba(239, 68, 68, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(59, 130, 246, 0.05)' });

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
    r.roundRect(120, 60, 160, 30, 8, { fill: 'rgba(239, 68, 68, 0.1)' });
    r.text(200, 80, 'THERMODYNAMICS', { fill: '#f87171', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 125, "Why Can't Engines Be", { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 155, '100% Efficient?', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 185, "Discover nature's fundamental limit", { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    // Engine illustration
    r.text(200, 260, '⚙️', { fontSize: 64, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 310, 320, 130, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 345, 'Your car engine wastes', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 375, '70-75% of its fuel as heat!', { fill: '#f87171', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 410, "Is this bad engineering or physics?", { fill: '#fbbf24', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'discover', label: 'Discover the Carnot Limit', variant: 'primary' });

    r.setCoachMessage("Learn why 100% efficiency is impossible!");
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 95, 340, 85, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'A heat engine operates between a hot', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 145, 'reservoir (600 K) and cold reservoir (300 K).', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 168, "What's the maximum possible efficiency?", { fill: '#f87171', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Any efficiency up to 100%',
      '50% - exactly half the energy',
      'Depends only on temperature difference',
      'Cannot be determined without more info'
    ];

    options.forEach((option, i) => {
      const y = 195 + i * 58;
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
        bgColor = 'rgba(239, 68, 68, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 440, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Correct!' : 'Maximum is exactly 50%!';
      r.text(200, 470, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 495, 'η = 1 - T_cold/T_hot = 1 - 300/600 = 50%', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 515, 'Temperature RATIO is the key!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Explore the Carnot Cycle', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 40, 'The Carnot Cycle', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const efficiency = this.calculateEfficiency(this.hotTemp, this.coldTemp);
    const wasteHeat = this.calculateWasteHeat(efficiency);

    // PV diagram visualization
    r.roundRect(30, 65, 200, 170, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(130, 85, 'P-V Diagram', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Simplified PV diagram
    const pvX = 50, pvY = 100, pvW = 160, pvH = 110;

    // Axes
    r.line(pvX, pvY + pvH, pvX + pvW, pvY + pvH, { stroke: '#64748b', strokeWidth: 1 }); // V axis
    r.line(pvX, pvY, pvX, pvY + pvH, { stroke: '#64748b', strokeWidth: 1 }); // P axis
    r.text(pvX + pvW / 2, pvY + pvH + 15, 'V', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });
    r.text(pvX - 10, pvY + pvH / 2, 'P', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });

    // Cycle path (simplified rectangle for visual)
    const points = [
      { x: pvX + 20, y: pvY + 20 },  // 1: High P, Low V
      { x: pvX + 80, y: pvY + 35 },  // 2: After isothermal expansion
      { x: pvX + 140, y: pvY + 75 }, // 3: After adiabatic expansion
      { x: pvX + 80, y: pvY + 90 },  // 4: After isothermal compression
    ];

    // Draw cycle path
    for (let i = 0; i < 4; i++) {
      const start = points[i];
      const end = points[(i + 1) % 4];
      const isCurrentStep = i === this.cycleStep;
      const color = this.cycleStages[i].color;
      r.line(start.x, start.y, end.x, end.y, { stroke: color, strokeWidth: isCurrentStep ? 3 : 2 });
    }

    // Current position indicator
    if (this.isAnimating) {
      const start = points[this.cycleStep];
      const end = points[(this.cycleStep + 1) % 4];
      const t = this.animationProgress / 100;
      const cx = start.x + (end.x - start.x) * t;
      const cy = start.y + (end.y - start.y) * t;
      r.circle(cx, cy, 5, { fill: '#fbbf24' });
    }

    // Data panel
    r.roundRect(240, 65, 130, 170, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(305, 88, 'T_H', { fill: '#ef4444', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(305, 108, `${this.hotTemp} K`, { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(305, 135, 'T_C', { fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(305, 155, `${this.coldTemp} K`, { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(305, 182, 'Efficiency', { fill: '#10b981', fontSize: 11, textAnchor: 'middle' });
    r.text(305, 205, `${efficiency.toFixed(1)}%`, { fill: '#10b981', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(305, 228, `Waste: ${wasteHeat.toFixed(1)}%`, { fill: '#f87171', fontSize: 10, textAnchor: 'middle' });

    // Current stage info
    r.roundRect(30, 250, 340, 55, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    const stage = this.cycleStages[this.cycleStep];
    r.text(200, 272, `Stage ${this.cycleStep + 1}: ${stage.name}`, { fill: stage.color, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 292, stage.desc, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Sliders
    r.addSlider({ id: 'hot_temp', label: 'Hot Reservoir (K)', min: 350, max: 1200, step: 50, value: this.hotTemp });
    r.addSlider({ id: 'cold_temp', label: 'Cold Reservoir (K)', min: 200, max: 500, step: 10, value: this.coldTemp });

    // Control buttons
    r.addButton({ id: 'toggle_animation', label: this.isAnimating ? '⏸ Pause' : '▶ Run Cycle', variant: 'secondary' });
    r.addButton({ id: 'next_step', label: '⏭ Next Step', variant: 'secondary' });
    r.addButton({ id: 'reset', label: '↺ Reset', variant: 'secondary' });

    r.addButton({ id: 'continue', label: 'Understand the Formula', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 50, 'Carnot Efficiency', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Main formula
    r.roundRect(30, 80, 340, 90, 16, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(200, 105, 'Maximum Engine Efficiency', { fill: '#f87171', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(60, 120, 280, 35, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 142, 'η = 1 - T_C / T_H', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 185, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 210, '💡 Key Insight', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'Efficiency depends on TEMPERATURE RATIO', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 255, 'not the temperature difference!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Example calculations
    r.roundRect(30, 280, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 305, 'Examples:', { fill: '#94a3b8', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 330, 'T_H=600 K, T_C=300 K → η = 1 - 0.5 = 50%', { fill: '#22d3ee', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 350, 'T_H=900 K, T_C=300 K → η = 1 - 0.33 = 67%', { fill: '#22d3ee', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 370, 'T_H=300 K, T_C=300 K → η = 0% (no work!)', { fill: '#f87171', fontSize: 10, textAnchor: 'middle' });

    // Limitation
    r.roundRect(30, 395, 340, 50, 12, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(200, 420, '⚠️ 100% efficiency needs T_C = 0 K (impossible!)', { fill: '#f87171', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Heat Pumps', variant: 'secondary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'Heat Pumps: The Twist', { fill: '#3b82f6', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 90, 340, 95, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 118, 'A heat pump moves heat from outside (0°C)', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 140, 'to inside your house (20°C).', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 165, 'You put in 1 kW of electricity...', { fill: '#3b82f6', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(200, 200, 'How much heat can it deliver inside?', { fill: '#fbbf24', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Less than 1 kW (energy is lost)',
      'Exactly 1 kW (energy conservation)',
      'More than 1 kW (pumps outdoor heat inside)',
      'Depends on the refrigerant used'
    ];

    options.forEach((option, i) => {
      const y = 225 + i * 55;
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
        bgColor = 'rgba(59, 130, 246, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 455, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 2 ? 'Exactly right!' : 'You get MORE heat than electricity!';
      r.text(200, 485, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 510, 'COP = T_H/(T_H-T_C) = 293/20 = 14.6!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See How', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 45, 'Heat Pump Efficiency', { fill: '#3b82f6', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const hpCOP = this.calculateHeatPumpCOP(this.hotTemp, this.coldTemp);
    const refCOP = this.calculateRefrigeratorCOP(this.hotTemp, this.coldTemp);

    // Heat pump diagram
    r.roundRect(30, 75, 340, 180, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Hot reservoir (inside)
    r.roundRect(50, 95, 130, 60, 8, { fill: 'rgba(239, 68, 68, 0.3)' });
    r.text(115, 120, '🏠 Inside', { fill: '#ef4444', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(115, 140, `${this.hotTemp} K`, { fill: '#ffffff', fontSize: 11, textAnchor: 'middle' });

    // Cold reservoir (outside)
    r.roundRect(220, 95, 130, 60, 8, { fill: 'rgba(59, 130, 246, 0.3)' });
    r.text(285, 120, '❄️ Outside', { fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(285, 140, `${this.coldTemp} K`, { fill: '#ffffff', fontSize: 11, textAnchor: 'middle' });

    // Arrows showing heat flow
    r.text(200, 95, '← Q_H', { fill: '#ef4444', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 145, 'W →', { fill: '#fbbf24', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 160, '← Q_C', { fill: '#3b82f6', fontSize: 11, textAnchor: 'middle' });

    // COP display
    r.roundRect(100, 175, 200, 65, 10, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 200, 'Heat Pump COP', { fill: '#10b981', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 225, `${hpCOP.toFixed(1)}`, { fill: '#10b981', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Explanation
    r.roundRect(30, 270, 340, 80, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 295, '💡 COP = T_H / (T_H - T_C)', { fill: '#10b981', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 320, `For every 1 kW electricity, deliver ${hpCOP.toFixed(1)} kW heat!`, { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 340, 'Efficiency > 100% because it MOVES heat!', { fill: '#fbbf24', fontSize: 11, textAnchor: 'middle' });

    // Comparison with regular heater
    r.roundRect(30, 365, 340, 45, 10, { fill: 'rgba(251, 146, 60, 0.2)' });
    r.text(200, 390, `Heat pump: ${hpCOP.toFixed(1)}× more efficient than electric heater!`, { fill: '#fbbf24', fontSize: 11, textAnchor: 'middle' });

    r.addSlider({ id: 'hot_temp', label: 'Inside Temp (K)', min: 280, max: 310, step: 5, value: Math.min(310, this.hotTemp) });
    r.addSlider({ id: 'cold_temp', label: 'Outside Temp (K)', min: 250, max: 290, step: 5, value: Math.max(250, Math.min(290, this.coldTemp)) });

    r.addButton({ id: 'continue', label: 'Summary', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 50, 'Reversed Carnot Cycles', { fill: '#3b82f6', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Heat engine vs heat pump
    r.roundRect(30, 80, 165, 120, 12, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(112, 105, 'Heat Engine', { fill: '#ef4444', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(112, 130, 'Hot → Work + Cold', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(112, 155, 'η = 1 - T_C/T_H', { fill: '#ffffff', fontSize: 11, textAnchor: 'middle' });
    r.text(112, 180, 'Always < 100%', { fill: '#f87171', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(205, 80, 165, 120, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(287, 105, 'Heat Pump', { fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(287, 130, 'Work → Cold to Hot', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(287, 155, 'COP = T_H/(T_H-T_C)', { fill: '#ffffff', fontSize: 11, textAnchor: 'middle' });
    r.text(287, 180, 'Can exceed 1!', { fill: '#10b981', fontSize: 10, textAnchor: 'middle' });

    // Refrigerator
    r.roundRect(30, 215, 340, 80, 12, { fill: 'rgba(14, 165, 233, 0.2)' });
    r.text(200, 240, '❄️ Refrigerator COP', { fill: '#0ea5e9', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 265, 'COP = T_C / (T_H - T_C)', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 285, 'Small ΔT = high efficiency!', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 310, 340, 70, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 335, '💡 Moving heat is more efficient than creating it!', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 360, "That's why heat pumps beat electric heaters.", { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 50, 'Carnot in the Real World', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#dc2626';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 75, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 103, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 135, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 165, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 188, app.tagline, { fill: '#f87171', fontSize: 11, textAnchor: 'middle' });

    // Description (wrapped)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 218;
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
    r.roundRect(40, 320, 320, 55, 10, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(200, 343, 'Physics Connection', { fill: '#f87171', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 363, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: '✓ Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 410, '✓ Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 455, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take the Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 50, 'Carnot Cycle Test', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
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
      r.text(200, 185, question.question, { fill: '#f87171', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 210 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(239, 68, 68, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 44, 8, { fill: bgColor });
        r.text(40, y + 26, `${String.fromCharCode(65 + i)}. ${option.substring(0, 48)}${option.length > 48 ? '...' : ''}`,
          { fill: isSelected ? '#f87171' : '#e2e8f0', fontSize: 10 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      // Navigation
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
        r.text(200, 450, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      const score = this.calculateScore();

      r.roundRect(60, 100, 280, 200, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 150, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 210, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 250, score >= 7 ? 'Thermodynamics master!' : 'Review the concepts.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Complete Lesson', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Retry', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 120, '⚙️', { fontSize: 72, textAnchor: 'middle' });
    r.text(200, 195, 'Carnot Cycle Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 225, "You understand nature's efficiency limits!", { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });

    // Achievement badges
    const achievements = [
      { icon: '🔥', label: 'Carnot Efficiency' },
      { icon: '❄️', label: 'Heat Pumps' },
      { icon: '🔄', label: 'Four Stages' },
      { icon: '📊', label: 'COP Analysis' }
    ];

    achievements.forEach((ach, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 260 + Math.floor(i / 2) * 70;
      r.roundRect(x, y, 140, 55, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 22, ach.icon, { fontSize: 18, textAnchor: 'middle' });
      r.text(x + 70, y + 42, ach.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 420, 300, 60, 12, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(200, 445, 'Key Formula', { fill: '#f87171', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 468, 'η = 1 - T_C / T_H', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage("You've mastered the Carnot cycle!");
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      hotTemp: this.hotTemp,
      coldTemp: this.coldTemp,
      cycleStep: this.cycleStep,
      isAnimating: this.isAnimating,
      animationProgress: this.animationProgress,
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
    if (state.hotTemp !== undefined) this.hotTemp = state.hotTemp as number;
    if (state.coldTemp !== undefined) this.coldTemp = state.coldTemp as number;
    if (state.cycleStep !== undefined) this.cycleStep = state.cycleStep as number;
    if (state.isAnimating !== undefined) this.isAnimating = state.isAnimating as boolean;
    if (state.animationProgress !== undefined) this.animationProgress = state.animationProgress as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createCarnotCycleGame(sessionId: string): CarnotCycleGame {
  return new CarnotCycleGame(sessionId);
}
