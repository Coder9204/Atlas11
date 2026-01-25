import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// BOILING PRESSURE GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Clausius-Clapeyron equation - boiling point depends on pressure
// Higher pressure = higher boiling point (pressure cookers)
// Lower pressure = lower boiling point (mountain cooking)
// Antoine equation approximation: T_boil ≈ 100 + 28.7 × ln(P)
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
const STANDARD_BOILING_POINT = 100; // °C at 1 atm
const SEA_LEVEL_PRESSURE = 1.0; // atm
const DENVER_PRESSURE = 0.83; // atm (at ~1600m)
const EVEREST_PRESSURE = 0.33; // atm (at ~5400m base camp)

export class BoilingPressureGame extends BaseGame {
  readonly gameType = 'boiling_pressure';
  readonly gameTitle = 'Boiling Point & Pressure: Mountain Cooking Mystery';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private pressure = 1.0; // atm
  private temperature = 25; // °C
  private heating = false;
  private animationTime = 0;

  // Twist state - altitude comparison
  private twistLocation: 'sea' | 'denver' | 'everest' = 'sea';
  private twistTemp = 25;
  private twistHeating = false;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "A climber is trying to make tea at Mount Everest base camp where atmospheric pressure is about 0.33 atm.",
      question: "Why doesn't the tea brew properly even though the water is 'boiling'?",
      options: [
        "The air is too cold for tea to steep",
        "Water boils at only ~71°C at this pressure, too cool to steep tea properly",
        "Oxygen levels are too low for proper extraction",
        "The altitude affects the tea leaves directly"
      ],
      correctIndex: 1,
      explanation: "At 0.33 atm, water boils at approximately 71°C. Tea needs 85-95°C for proper extraction. The water 'boils' but is 30°C cooler than at sea level!"
    },
    {
      scenario: "A pressure cooker is used to cook beans. The cooker operates at 2 atm internal pressure.",
      question: "What is the approximate boiling point of water inside?",
      options: [
        "100°C - same as normal",
        "About 120°C",
        "About 80°C",
        "About 150°C"
      ],
      correctIndex: 1,
      explanation: "At 2 atm, water boils at approximately 120°C. Using T ≈ 100 + 28.7×ln(P): 100 + 28.7×ln(2) ≈ 100 + 20 = 120°C."
    },
    {
      scenario: "Denver, Colorado is at 1,600 meters elevation with atmospheric pressure of about 0.83 atm.",
      question: "How does cooking pasta differ in Denver compared to sea level?",
      options: [
        "Pasta cooks faster due to thinner air",
        "Pasta takes longer because water boils at a lower temperature (~95°C)",
        "No difference in cooking time",
        "Pasta can't be cooked in Denver"
      ],
      correctIndex: 1,
      explanation: "At 0.83 atm, water boils at about 95°C instead of 100°C. The cooler water means slower cooking - add about 10-15% more cooking time."
    },
    {
      scenario: "A vacuum distillation apparatus reduces pressure to 0.03 atm to purify a heat-sensitive compound.",
      question: "Why use vacuum distillation instead of normal distillation?",
      options: [
        "It's faster at low pressure",
        "Low pressure means low boiling point - compound can be purified without thermal degradation",
        "Vacuum creates purer compounds",
        "It uses less energy"
      ],
      correctIndex: 1,
      explanation: "At 0.03 atm, water boils at about 25°C (room temperature!). Heat-sensitive compounds can be separated at low temperatures, preventing decomposition."
    },
    {
      scenario: "A geyser shoots boiling water into the air. The underground water was at 150°C before eruption.",
      question: "Why does the water suddenly 'explode' when it reaches the surface?",
      options: [
        "Volcanic gases push it up",
        "Underground water at 150°C is above 100°C but under pressure preventing boiling - rapid depressurization causes instant flash boiling",
        "The water speed creates the explosion",
        "Chemical reactions cause the eruption"
      ],
      correctIndex: 1,
      explanation: "Deep underground, high pressure keeps water liquid at 150°C. When it reaches the surface (1 atm), it's suddenly 50°C above its boiling point, causing explosive flash evaporation!"
    },
    {
      scenario: "An engineer is designing a nuclear power plant where steam needs to reach very high temperatures.",
      question: "How can water be heated to 350°C while remaining liquid?",
      options: [
        "Use special water",
        "Increase pressure to about 165 atm to raise boiling point above 350°C",
        "Heat it faster than it can boil",
        "Add salt to raise boiling point"
      ],
      correctIndex: 1,
      explanation: "At 165 atm, water's boiling point exceeds 350°C. Nuclear pressurized water reactors use this principle to transfer heat efficiently without boiling."
    },
    {
      scenario: "Mars has atmospheric pressure of about 0.006 atm.",
      question: "What would happen to exposed liquid water on Mars?",
      options: [
        "It would freeze immediately",
        "It would boil at body temperature (~37°C) or lower, rapidly evaporating",
        "It would behave normally",
        "It would become acidic"
      ],
      correctIndex: 1,
      explanation: "At 0.006 atm, water boils at about 1°C! Any exposed liquid water would rapidly boil away. Ice sublimates directly to vapor - this is why Mars has no liquid water on its surface."
    },
    {
      scenario: "A chef is making candy and needs to heat sugar syrup to exactly 154°C (hard crack stage).",
      question: "Why does candy-making at high altitude require recipe adjustments?",
      options: [
        "Sugar melts differently at altitude",
        "Water evaporates faster, so syrup reaches each candy stage at lower thermometer readings",
        "Altitude affects sugar chemistry",
        "The thermometer reads incorrectly at altitude"
      ],
      correctIndex: 1,
      explanation: "At altitude, water boils and evaporates at lower temperatures. The candy reaches the same concentration (hard crack) at a lower temperature reading - subtract 1°C per 150m of altitude!"
    },
    {
      scenario: "An astronaut on the ISS has a cup of water at 90°C. The station is pressurized to 1 atm.",
      question: "What happens if the water is suddenly exposed to the vacuum of space?",
      options: [
        "It freezes instantly from the cold",
        "It boils explosively as pressure drops to near-zero",
        "It floats away unchanged",
        "It slowly evaporates over hours"
      ],
      correctIndex: 1,
      explanation: "In vacuum (0 atm), water's boiling point is below 0°C! The 90°C water would explosively boil, and the rapid evaporation would actually cool what remains until it freezes!"
    },
    {
      scenario: "Submarines operate at depths where external pressure can reach 60 atm.",
      question: "If the submarine's cooling system uses water at 60 atm internal pressure, what is the boiling point?",
      options: [
        "100°C - pressure doesn't matter inside the sub",
        "About 275°C",
        "About 60°C",
        "Water cannot boil under pressure"
      ],
      correctIndex: 1,
      explanation: "At 60 atm, water boils at approximately 275°C. This allows submarine reactor cooling systems to operate at very high temperatures without the water boiling."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🍳",
      title: "Pressure Cookers",
      tagline: "Faster cooking at higher temperatures",
      description: "At 2 atm, water boils at ~120°C. The extra 20°C dramatically speeds cooking - beans in 20 min instead of 2 hours! Higher temperature = faster chemical reactions.",
      connection: "Pressure cookers trap steam, increasing pressure. More pressure = higher boiling point = hotter water = faster cooking."
    },
    {
      icon: "⛰️",
      title: "High Altitude Cooking",
      tagline: "Why mountain cooking takes longer",
      description: "Denver (1.6km): water boils at 95°C. Everest base camp: 71°C. Food takes longer because the water is actually cooler even though it's 'boiling'.",
      connection: "Lower atmospheric pressure at altitude means lower boiling point. Cooking adjustments needed for baking, candy, and pasta."
    },
    {
      icon: "⚗️",
      title: "Vacuum Distillation",
      tagline: "Purifying heat-sensitive compounds",
      description: "Reduce pressure to boil liquids at lower temps. Used to purify heat-sensitive compounds like vitamins, fragrances, and pharmaceuticals without destroying them.",
      connection: "At 0.03 atm, even water boils near room temperature! Essential for chemistry and pharmaceutical manufacturing."
    },
    {
      icon: "💨",
      title: "Geysers",
      tagline: "Nature's pressure cookers",
      description: "Underground water under high pressure stays liquid above 100°C. When it reaches the surface - instant explosive boiling! Old Faithful erupts because superheated water flashes to steam.",
      connection: "Geothermal pressure keeps water liquid at extreme temperatures. Surface decompression causes dramatic phase change."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Antoine equation approximation for water boiling point
  private calculateBoilingPoint(pressureAtm: number): number {
    // Simplified: T_boil ≈ 100 + 28.7 × ln(P) for P in atm
    if (pressureAtm <= 0.01) return 7; // Very low pressure limit
    return 100 + 28.7 * Math.log(pressureAtm);
  }

  // PROTECTED: Get pressure for location
  private getLocationPressure(location: 'sea' | 'denver' | 'everest'): number {
    switch (location) {
      case 'sea': return 1.0;
      case 'denver': return 0.83;
      case 'everest': return 0.33;
    }
  }

  // PROTECTED: Determine water state
  private getWaterState(temp: number, boilingPoint: number): 'solid' | 'liquid' | 'boiling' | 'gas' {
    if (temp <= 0) return 'solid';
    if (temp < boilingPoint - 1) return 'liquid';
    if (temp <= boilingPoint + 5) return 'boiling';
    return 'gas';
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
      if (input.id === 'pressure') {
        this.pressure = Math.max(0.1, Math.min(3.0, input.value));
        this.temperature = 25; // Reset temperature when pressure changes
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
        if (buttonId === 'toggle_heat') {
          this.heating = !this.heating;
        } else if (buttonId === 'reset') {
          this.temperature = 25;
          this.heating = false;
        } else if (buttonId === 'continue') {
          this.heating = false;
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
        if (buttonId === 'location_sea') {
          this.twistLocation = 'sea';
          this.twistTemp = 25;
          this.twistHeating = false;
        } else if (buttonId === 'location_denver') {
          this.twistLocation = 'denver';
          this.twistTemp = 25;
          this.twistHeating = false;
        } else if (buttonId === 'location_everest') {
          this.twistLocation = 'everest';
          this.twistTemp = 25;
          this.twistHeating = false;
        } else if (buttonId === 'twist_heat') {
          this.twistHeating = !this.twistHeating;
        } else if (buttonId === 'continue') {
          this.twistHeating = false;
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
    this.pressure = 1.0;
    this.temperature = 25;
    this.heating = false;
    this.twistLocation = 'sea';
    this.twistTemp = 25;
    this.twistHeating = false;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Heating simulation for main play phase
    if (this.heating && this.phase === 'play') {
      const boilingPoint = this.calculateBoilingPoint(this.pressure);
      if (this.temperature < boilingPoint + 5) {
        this.temperature = Math.min(this.temperature + deltaTime * 10, boilingPoint + 5);
      }
    }

    // Heating simulation for twist phase
    if (this.twistHeating && this.phase === 'twist_play') {
      const twistPressure = this.getLocationPressure(this.twistLocation);
      const boilingPoint = this.calculateBoilingPoint(twistPressure);
      if (this.twistTemp < boilingPoint + 5) {
        this.twistTemp = Math.min(this.twistTemp + deltaTime * 10, boilingPoint + 5);
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(6, 182, 212, 0.05)' });
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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(6, 182, 212, 0.1)' });
    r.text(200, 80, 'PHASE TRANSITIONS', { fill: '#22d3ee', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 125, 'Why Is Mountain Cooking', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 155, 'So Tricky?', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 185, 'Discover how pressure controls boiling point', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    // Mountain + tea illustration
    r.text(200, 270, '⛰️ ☕ ❓', { fontSize: 48, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 310, 320, 140, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 345, 'Climbers on Mount Everest can\'t', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 365, 'make a proper cup of tea!', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 400, 'Water boils at only 71°C (160°F)', { fill: '#f87171', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 430, 'The answer involves pressure!', { fill: '#22d3ee', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Discover the Secret', variant: 'primary' });

    r.setCoachMessage('Explore the connection between pressure and phase changes!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 95, 340, 85, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'If you reduce the air pressure', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 145, 'around water, what happens to', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 165, 'its boiling point?', { fill: '#22d3ee', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'The boiling point increases',
      'The boiling point decreases',
      'The boiling point stays the same',
      'Water can no longer boil'
    ];

    options.forEach((option, i) => {
      const y = 195 + i * 55;
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
        bgColor = 'rgba(6, 182, 212, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 425, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Correct!' : 'Lower pressure = lower boiling point!';
      r.text(200, 455, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 480, 'Less pressure means water molecules', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 500, 'escape more easily into gas phase!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test Your Prediction', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 45, 'Pressure & Boiling Point', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 70, 'Adjust pressure and heat the water', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    const boilingPoint = this.calculateBoilingPoint(this.pressure);
    const waterState = this.getWaterState(this.temperature, boilingPoint);

    // Beaker visualization
    r.roundRect(50, 90, 300, 230, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Pressure gauge
    r.roundRect(70, 105, 80, 45, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(110, 122, 'Pressure', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 140, `${this.pressure.toFixed(2)} atm`, { fill: '#22d3ee', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Temperature display
    r.roundRect(250, 105, 80, 45, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(290, 122, 'Temperature', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 140, `${this.temperature.toFixed(0)}°C`, { fill: '#fb923c', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Boiling point indicator
    r.roundRect(160, 105, 80, 45, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 122, 'Boils at', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 140, `${boilingPoint.toFixed(0)}°C`, { fill: '#f87171', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Water container
    const waterColor = waterState === 'boiling' ? '#60a5fa' : waterState === 'gas' ? '#93c5fd' : '#3b82f6';
    r.roundRect(120, 170, 160, 100, 8, { fill: waterColor });

    // State indicator
    r.roundRect(150, 200, 100, 35, 8, { fill: 'rgba(15, 23, 42, 0.9)' });
    const stateColor = waterState === 'boiling' ? '#fb923c' : waterState === 'gas' ? '#f87171' : '#60a5fa';
    r.text(200, 222, waterState.toUpperCase(), { fill: stateColor, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Bubbles if boiling
    if (waterState === 'boiling') {
      const bubbleOffset = (this.animationTime * 50) % 50;
      for (let i = 0; i < 5; i++) {
        const bx = 140 + Math.random() * 120;
        const by = 250 - bubbleOffset - i * 10;
        r.circle(bx, by, 3 + Math.random() * 3, { fill: 'rgba(255,255,255,0.6)' });
      }
    }

    // Heating element
    r.roundRect(130, 280, 140, 12, 4, { fill: this.heating ? '#ef4444' : '#374151' });
    if (this.heating) {
      r.text(200, 287, '🔥', { fontSize: 8, textAnchor: 'middle' });
    }

    // Pressure info
    r.roundRect(50, 335, 300, 50, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 355, `At ${this.pressure.toFixed(2)} atm, water boils at`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 375, `${boilingPoint.toFixed(0)}°C`, { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Slider
    r.addSlider({ id: 'pressure', label: 'Pressure (atm)', min: 0.1, max: 3.0, step: 0.05, value: this.pressure });

    // Pressure presets
    r.text(100, 420, 'Vacuum', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(200, 420, 'Sea Level', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(300, 420, 'Pressure Cooker', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Control buttons
    r.addButton({ id: 'toggle_heat', label: this.heating ? '🔥 Stop Heating' : '🔥 Heat Water', variant: this.heating ? 'danger' : 'primary' });
    r.addButton({ id: 'reset', label: '↺ Reset', variant: 'secondary' });

    r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'Why Pressure Changes', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 78, 'Boiling Point', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Molecular battle card
    r.roundRect(30, 100, 340, 100, 16, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 125, 'The Molecular Battle', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 150, 'Boiling = molecules escaping to gas.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 170, 'Higher pressure pushes back, requiring', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 190, 'more energy (higher temp) to escape.', { fill: '#fbbf24', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    // Comparison chart
    r.roundRect(30, 215, 340, 110, 16, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 240, 'Pressure vs Temperature', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Location comparisons
    const locations = [
      { name: 'Everest', icon: '⛰️', pressure: '0.33 atm', temp: '71°C' },
      { name: 'Sea Level', icon: '🏖️', pressure: '1.0 atm', temp: '100°C' },
      { name: 'Pressure Cooker', icon: '🍳', pressure: '2.0 atm', temp: '120°C' }
    ];

    locations.forEach((loc, i) => {
      const x = 55 + i * 110;
      r.roundRect(x, 258, 90, 55, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
      r.text(x + 45, 275, loc.icon, { fontSize: 16, textAnchor: 'middle' });
      r.text(x + 45, 292, loc.pressure, { fill: '#22d3ee', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x + 45, 306, loc.temp, { fill: '#fb923c', fontSize: 10, textAnchor: 'middle' });
    });

    // Key insight
    r.roundRect(30, 340, 340, 70, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 365, '💡 Key Insight', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 390, "Boiling point isn't fixed - it depends on pressure!", { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Ready for a Twist?', variant: 'secondary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'The Cooking Challenge', { fill: '#fbbf24', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 90, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 120, 'You need to cook pasta in boiling water.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 145, 'At high altitude, water boils at 85°C', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 170, 'instead of 100°C.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });

    r.text(200, 205, 'How will cooking time change?', { fill: '#fbbf24', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Faster - boiling is boiling',
      'About the same time',
      'Longer - the water is cooler',
      'Impossible - pasta needs 100°C water'
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
        bgColor = 'rgba(251, 191, 36, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 455, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 2 ? 'Correct!' : 'Cooler water = longer cooking!';
      r.text(200, 485, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 510, 'Temperature matters more than just "boiling"!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See the Difference', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 45, 'Altitude Cooking', { fill: '#fbbf24', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const twistPressure = this.getLocationPressure(this.twistLocation);
    const boilingPoint = this.calculateBoilingPoint(twistPressure);
    const isBoiling = this.twistTemp >= boilingPoint;

    // Location buttons
    r.roundRect(30, 75, 340, 50, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    const locationWidth = 100;
    const locations: ('sea' | 'denver' | 'everest')[] = ['sea', 'denver', 'everest'];
    locations.forEach((loc, i) => {
      const x = 50 + i * 110;
      const isActive = this.twistLocation === loc;
      r.roundRect(x, 82, 90, 35, 8, { fill: isActive ? '#3b82f6' : 'rgba(51, 65, 85, 0.5)' });
      const icon = loc === 'sea' ? '🏖️' : loc === 'denver' ? '🏙️' : '⛰️';
      const label = loc === 'sea' ? 'Sea Level' : loc === 'denver' ? 'Denver' : 'Everest';
      r.text(x + 45, 105, `${icon} ${label}`, { fill: isActive ? '#ffffff' : '#94a3b8', fontSize: 10, textAnchor: 'middle' });
      r.addButton({ id: `location_${loc}`, label: '', variant: 'secondary' });
    });

    // Data display
    r.roundRect(30, 140, 100, 55, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(80, 160, 'Altitude', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    const altitudeText = this.twistLocation === 'sea' ? '0m' : this.twistLocation === 'denver' ? '1,600m' : '5,400m';
    r.text(80, 180, altitudeText, { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(150, 140, 100, 55, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 160, 'Pressure', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 180, `${twistPressure.toFixed(2)} atm`, { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(270, 140, 100, 55, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(320, 160, 'Boils at', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(320, 180, `${boilingPoint.toFixed(0)}°C`, { fill: '#fb923c', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Water display
    r.roundRect(100, 210, 200, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 250, isBoiling ? '💨' : '🫖', { fontSize: 36, textAnchor: 'middle' });
    r.text(200, 290, `${this.twistTemp.toFixed(0)}°C`, { fill: isBoiling ? '#fb923c' : '#60a5fa', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Status message
    if (isBoiling) {
      const messageColor = this.twistLocation === 'everest' ? '#fbbf24' :
                          this.twistLocation === 'denver' ? '#fb923c' : '#34d399';
      r.roundRect(50, 325, 300, 50, 10, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistLocation === 'everest' ? '⚠️ Only 71°C - pasta will take 50% longer!' :
                      this.twistLocation === 'denver' ? '⚠️ At 95°C - add ~20% more cooking time' :
                      '✓ Perfect 100°C for standard cooking';
      r.text(200, 355, message, { fill: messageColor, fontSize: 11, textAnchor: 'middle' });
    }

    r.addButton({ id: 'twist_heat', label: this.twistHeating ? '⏹ Stop' : '🔥 Heat', variant: this.twistHeating ? 'danger' : 'primary' });
    r.addButton({ id: 'continue', label: 'Understand the Impact', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Cooking Temperature Matters!', { fill: '#fbbf24', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Temperature-Time card
    r.roundRect(30, 85, 340, 90, 16, { fill: 'rgba(251, 146, 60, 0.2)' });
    r.text(200, 110, 'The Temperature-Time Tradeoff', { fill: '#fb923c', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 135, 'Cooking speed depends on temperature,', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 155, 'not just whether water is "boiling"!', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // High altitude problems
    r.roundRect(30, 190, 160, 110, 12, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(110, 215, 'High Altitude Problems', { fill: '#f87171', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 240, '• Pasta undercooked', { fill: '#cbd5e1', fontSize: 9 });
    r.text(110, 255, '• Eggs take longer', { fill: '#cbd5e1', fontSize: 9 });
    r.text(110, 270, '• Baked goods collapse', { fill: '#cbd5e1', fontSize: 9 });
    r.text(110, 285, '• Beans never soften', { fill: '#cbd5e1', fontSize: 9 });

    // Pressure cooker solution
    r.roundRect(210, 190, 160, 110, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(290, 215, 'Pressure Cooker Fix', { fill: '#34d399', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 240, '• Raises boiling to 120°C', { fill: '#cbd5e1', fontSize: 9 });
    r.text(290, 255, '• Beans in 20 min', { fill: '#cbd5e1', fontSize: 9 });
    r.text(290, 270, '• Tough meat tender fast', { fill: '#cbd5e1', fontSize: 9 });
    r.text(290, 285, '• Works at any altitude!', { fill: '#cbd5e1', fontSize: 9 });

    // Fun fact
    r.roundRect(30, 315, 340, 65, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 340, '💡 Fun Fact:', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 360, 'On Mars (0.006 atm), water boils at body temp!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Real Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 50, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#0891b2';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 75, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 103, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 135, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 165, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 188, app.tagline, { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });

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
    r.roundRect(40, 320, 320, 55, 10, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 343, 'Physics Connection', { fill: '#22d3ee', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
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
      r.text(200, 50, 'Knowledge Check', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
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
      r.text(200, 185, question.question, { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 210 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(6, 182, 212, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 44, 8, { fill: bgColor });
        r.text(40, y + 26, `${String.fromCharCode(65 + i)}. ${option.substring(0, 48)}${option.length > 48 ? '...' : ''}`,
          { fill: isSelected ? '#22d3ee' : '#e2e8f0', fontSize: 10 });

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
      r.text(200, 250, score >= 7 ? 'Excellent understanding!' : 'Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Complete Lesson', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 120, '🏆', { fontSize: 72, textAnchor: 'middle' });
    r.text(200, 195, 'Phase Diagram Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 225, "You've mastered pressure and phase changes!", { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });

    // Achievement badges
    const achievements = [
      { icon: '🏖️', label: 'Pressure-Boiling' },
      { icon: '⛰️', label: 'Altitude Effects' },
      { icon: '📊', label: 'Phase Diagrams' },
      { icon: '🍳', label: 'Pressure Cooking' }
    ];

    achievements.forEach((ach, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 260 + Math.floor(i / 2) * 70;
      r.roundRect(x, y, 140, 55, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 22, ach.icon, { fontSize: 18, textAnchor: 'middle' });
      r.text(x + 70, y + 42, ach.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key insight
    r.roundRect(50, 420, 300, 60, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 445, '🌡️ Key Insight', { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 468, 'Boiling point = pressure battle!', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering phase transitions!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      pressure: this.pressure,
      temperature: this.temperature,
      heating: this.heating,
      twistLocation: this.twistLocation,
      twistTemp: this.twistTemp,
      twistHeating: this.twistHeating,
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
    if (state.pressure !== undefined) this.pressure = state.pressure as number;
    if (state.temperature !== undefined) this.temperature = state.temperature as number;
    if (state.heating !== undefined) this.heating = state.heating as boolean;
    if (state.twistLocation !== undefined) this.twistLocation = state.twistLocation as 'sea' | 'denver' | 'everest';
    if (state.twistTemp !== undefined) this.twistTemp = state.twistTemp as number;
    if (state.twistHeating !== undefined) this.twistHeating = state.twistHeating as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createBoilingPressureGame(sessionId: string): BoilingPressureGame {
  return new BoilingPressureGame(sessionId);
}
