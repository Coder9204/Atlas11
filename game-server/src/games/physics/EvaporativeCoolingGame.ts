import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// EVAPORATIVE COOLING GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Latent heat of vaporization (Lv = 2,260 J/g for water)
// Evaporation requires energy, which is drawn from the surroundings
// Humidity affects evaporation rate: lower humidity = faster evaporation
// Wind removes saturated boundary layer, accelerating evaporation
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
const LATENT_HEAT_VAPORIZATION = 2260; // J/g
const BODY_TEMP_NORMAL = 37; // Celsius
const WATER_SURFACE_TENSION = 0.073; // N/m

export class EvaporativeCoolingGame extends BaseGame {
  readonly gameType = 'evaporative_cooling';
  readonly gameTitle = 'Evaporative Cooling: Why Sweating Cools You';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private skinWet = false;
  private humidity = 30;
  private skinTemp = 37;
  private windSpeed = 0;
  private animationTime = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "You step out of a shower in a warm bathroom and feel chilly.",
      question: "What provides the energy for water to evaporate from your skin?",
      options: ["The air around you", "Heat from your skin (body)", "The water itself", "Sunlight only"],
      correctIndex: 1,
      explanation: "Your skin provides the heat energy needed for evaporation (latent heat)."
    },
    {
      scenario: "On a humid tropical day, you're sweating but don't feel cooler.",
      question: "Why doesn't sweating cool you down as well in humid weather?",
      options: ["Sweat is different in humid weather", "Your body produces less sweat", "Air saturated with water can't accept more evaporation", "Humidity makes sweat hotter"],
      correctIndex: 2,
      explanation: "High humidity means the air can't absorb much more water vapor, slowing evaporation."
    },
    {
      scenario: "A scientist measures water's latent heat of vaporization.",
      question: "The latent heat of vaporization for water is about:",
      options: ["226 J/g", "2,260 J/g", "22,600 J/g", "4.18 J/g"],
      correctIndex: 1,
      explanation: "Water's Lv is 2,260 J/g - enormous energy to change phase!"
    },
    {
      scenario: "You blow air across your wet arm on a hot day.",
      question: "Why does blowing on wet skin cool it faster?",
      options: ["Your breath is cold", "Moving air carries away humid air, allowing faster evaporation", "Blowing adds water to your skin", "It doesn't actually cool faster"],
      correctIndex: 1,
      explanation: "Wind removes the saturated boundary layer, replacing with drier air."
    },
    {
      scenario: "A veterinarian explains how dogs regulate temperature.",
      question: "Why do dogs pant instead of sweating?",
      options: ["Dogs can't produce sweat", "Fur traps sweat; panting evaporates water from tongue and lungs", "Panting is just for breathing", "Dogs don't need to cool down"],
      correctIndex: 1,
      explanation: "Dogs have few sweat glands. Panting evaporates water from tongue and lungs."
    },
    {
      scenario: "A nurse cleans a patient's arm with rubbing alcohol.",
      question: "Rubbing alcohol evaporates faster than water and feels colder because:",
      options: ["Alcohol is colder than water", "Alcohol evaporates faster, removing heat more quickly", "Alcohol absorbs heat from the air", "Alcohol reflects body heat"],
      correctIndex: 1,
      explanation: "Alcohol has lower latent heat and evaporates faster, cooling more rapidly."
    },
    {
      scenario: "Compare sweating in a desert (10% humidity) vs a jungle (90% humidity).",
      question: "Which cools better by sweating?",
      options: ["Jungle (more moisture)", "Desert (lower humidity allows more evaporation)", "They're the same", "Neither - too hot to sweat"],
      correctIndex: 1,
      explanation: "Low humidity in deserts allows rapid evaporation and effective cooling."
    },
    {
      scenario: "You climb out of a swimming pool and immediately feel cold.",
      question: "Why does getting out of a swimming pool make you feel cold?",
      options: ["Pool water is always cold", "Air temperature drops near pools", "Water on skin evaporates rapidly, pulling heat from your body", "Chlorine makes water feel colder"],
      correctIndex: 2,
      explanation: "Water evaporating from skin requires heat energy from your body."
    },
    {
      scenario: "An engineer is installing a cooling system in Arizona.",
      question: "Evaporative coolers (swamp coolers) work best in:",
      options: ["Humid climates", "Dry climates", "Cold climates", "Any climate equally"],
      correctIndex: 1,
      explanation: "Evaporative coolers need dry air to allow water to evaporate effectively."
    },
    {
      scenario: "A physicist compares heating water vs evaporating water.",
      question: "Which takes more energy: heating 1g of water by 1C, or evaporating 1g of water?",
      options: ["Heating by 1C (specific heat)", "Evaporating (latent heat)", "They're the same", "Depends on the temperature"],
      correctIndex: 1,
      explanation: "Evaporating 1g takes 2,260 J; heating 1g by 1C takes only 4.18 J!"
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "💪",
      title: "Sweating in Humans",
      tagline: "Nature's cooling system",
      description: "Humans can produce 2-4 liters of sweat per hour during intense exercise. At 2,260 J/g, evaporating 1 liter removes 2.26 MJ of heat!",
      connection: "That's equivalent to a 1,000W heater running for 40 minutes."
    },
    {
      icon: "❄️",
      title: "Evaporative Coolers",
      tagline: "Desert air conditioning",
      description: "Desert coolers (swamp coolers) blow air through wet pads. Water evaporates, cooling the air by 10-15C.",
      connection: "They use 75% less electricity than AC but only work in low humidity (<30%)."
    },
    {
      icon: "🌡️",
      title: "Wet Bulb Temperature",
      tagline: "Humidity measurement",
      description: "Meteorologists use wet bulb temperature to measure humidity's effect on cooling.",
      connection: "A thermometer wrapped in wet cloth shows how much evaporation can cool - critical for heat wave warnings."
    },
    {
      icon: "🏭",
      title: "Cooling Towers",
      tagline: "Industrial heat rejection",
      description: "Power plants and factories use massive cooling towers. Hot water sprays through the air, evaporating partially.",
      connection: "The remaining water cools by 10-20C and recirculates."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate evaporation rate based on humidity and wind
  private calculateEvaporationRate(humid: number, wind: number = 0): number {
    const baseRate = (100 - humid) / 100;
    const windFactor = 1 + wind / 10;
    return baseRate * windFactor;
  }

  // PROTECTED: Calculate cooling effect from evaporation
  private calculateCooling(evapRate: number): number {
    return evapRate * 3; // Simplified cooling model
  }

  // PROTECTED: Get skin color based on temperature
  private getSkinColor(temp: number): string {
    if (temp >= 37) return '#e8b4a0';
    if (temp >= 35) return '#d4a090';
    if (temp >= 33) return '#c09080';
    return '#b08878';
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
      if (input.id === 'humidity') {
        this.humidity = Math.max(10, Math.min(95, input.value));
        this.updateSkinTemp();
      } else if (input.id === 'wind_speed') {
        this.windSpeed = Math.max(0, Math.min(10, input.value));
        this.updateSkinTemp();
      }
    }
  }

  private updateSkinTemp(): void {
    if (!this.skinWet) {
      this.skinTemp = BODY_TEMP_NORMAL;
      return;
    }
    const evapRate = this.calculateEvaporationRate(this.humidity, this.windSpeed);
    const cooling = this.calculateCooling(evapRate);
    this.skinTemp = BODY_TEMP_NORMAL - cooling;
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
        if (buttonId === 'wet_skin') {
          this.skinWet = true;
          this.updateSkinTemp();
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
          this.skinWet = true;
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
    this.skinWet = false;
    this.humidity = 30;
    this.skinTemp = 37;
    this.windSpeed = 0;
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

    r.circle(100, 100, 150, { fill: 'rgba(6, 182, 212, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(56, 189, 248, 0.05)' });

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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(6, 182, 212, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#22d3ee', fontSize: 10, textAnchor: 'middle' });

    r.text(200, 130, 'Evaporative Cooling', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Why does wet skin feel cold?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    r.text(200, 250, '💧🌡️❄️', { fill: '#22d3ee', fontSize: 48, textAnchor: 'middle' });

    r.roundRect(40, 300, 320, 160, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 335, 'You step out of a shower...', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 365, 'Even in a warm bathroom, you feel chilly!', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 400, 'Your wet skin loses heat rapidly', { fill: '#22d3ee', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 430, 'as water evaporates.', { fill: '#22d3ee', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 460, 'But where does that cooling power come from?', { fill: '#fbbf24', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'discover', label: 'Explore Evaporative Cooling', variant: 'primary' });

    r.setCoachMessage('Discover how phase changes remove heat!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 100, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'Your skin is wet with water. As it evaporates,', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 150, 'where does the energy come from?', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      'The surrounding air - warm air provides energy',
      'Your skin - water steals heat from your body',
      'The water itself - it has stored energy',
      'Only sunlight can provide evaporation energy'
    ];

    options.forEach((option, i) => {
      const y = 200 + i * 55;
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
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 430, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      r.text(200, 460, 'Correct! Water pulls heat from your skin!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 490, "That's why wet skin feels cold - it's losing heat!", { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Explore the Physics', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Evaporation & Skin Temperature', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Skin visualization
    r.roundRect(20, 80, 360, 200, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Air region
    r.rect(30, 90, 340, 60, { fill: 'rgba(30, 58, 95, 0.5)' });
    r.text(200, 125, `Humidity: ${this.humidity}%`, { fill: '#60a5fa', fontSize: 12, textAnchor: 'middle' });

    // Humidity particles
    const numParticles = Math.round(this.humidity / 15);
    for (let i = 0; i < numParticles; i++) {
      const x = 50 + i * 45 + Math.sin(this.animationTime * 2 + i) * 10;
      const y = 105 + Math.cos(this.animationTime * 3 + i) * 8;
      r.circle(x, y, 3, { fill: 'rgba(100, 149, 237, 0.5)' });
    }

    // Skin region
    const skinColor = this.getSkinColor(this.skinTemp);
    r.rect(30, 155, 340, 115, { fill: skinColor });

    // Water droplets if wet
    if (this.skinWet) {
      const evapRate = this.calculateEvaporationRate(this.humidity, this.windSpeed);
      for (let i = 0; i < 12; i++) {
        const x = 50 + (i % 6) * 50 + Math.random() * 20;
        const y = 180 + Math.floor(i / 6) * 40 + Math.random() * 15;
        const opacity = 0.7 - (this.animationTime * evapRate % 1) * 0.3;
        r.ellipse(x, y, 6, 4, { fill: `rgba(100, 149, 237, ${opacity})` });
      }

      // Evaporating particles
      if (evapRate > 0.3) {
        for (let i = 0; i < Math.round(evapRate * 5); i++) {
          const x = 80 + i * 60 + Math.sin(this.animationTime * 2 + i) * 15;
          const y = 150 - (this.animationTime * 20 + i * 10) % 50;
          r.circle(x, y, 3, { fill: 'rgba(100, 149, 237, 0.3)' });
        }
      }
    }

    // Thermometer
    r.rect(330, 170, 30, 80, { fill: '#1f2937' });
    const tempHeight = (this.skinTemp - 30) * 8;
    const tempColor = this.skinTemp >= 36 ? '#ef4444' : this.skinTemp >= 34 ? '#fbbf24' : '#3b82f6';
    r.rect(335, 245 - tempHeight, 20, tempHeight, { fill: tempColor });
    r.text(345, 260, `${this.skinTemp.toFixed(1)}C`, { fill: '#e5e7eb', fontSize: 10, textAnchor: 'middle' });

    // Controls
    if (!this.skinWet) {
      r.addButton({ id: 'wet_skin', label: 'Wet the Skin', variant: 'primary' });
    }

    r.addSlider({
      id: 'humidity',
      label: 'Air Humidity (%)',
      min: 10,
      max: 95,
      step: 5,
      value: this.humidity
    });

    // Stats
    const evapRate = this.calculateEvaporationRate(this.humidity, this.windSpeed);
    r.roundRect(30, 330, 100, 60, 8, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(80, 355, `${this.skinTemp.toFixed(1)}C`, { fill: '#22d3ee', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(80, 375, 'Skin Temp', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(150, 330, 100, 60, 8, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 355, `${(37 - this.skinTemp).toFixed(1)}C`, { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 375, 'Cooling', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(270, 330, 100, 60, 8, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(320, 355, `${(evapRate * 100).toFixed(0)}%`, { fill: '#10b981', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(320, 375, 'Evap Rate', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Learn the Science', variant: 'secondary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Science of Evaporative Cooling', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 85, 340, 100, 12, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 110, 'Latent Heat of Vaporization', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(100, 125, 200, 35, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 148, 'Lv = 2,260 J/g', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });
    r.text(200, 175, 'Enormous energy to change liquid to vapor!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.roundRect(30, 200, 340, 90, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 225, 'Where Does the Heat Go?', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 250, 'Water molecules need energy to break free.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 270, 'They "steal" this energy from your skin as heat!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.roundRect(30, 305, 340, 110, 12, { fill: 'rgba(147, 51, 234, 0.2)' });
    r.text(200, 330, "Humidity's Role", { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(45, 345, 150, 55, 8, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(120, 365, 'Low Humidity (Desert)', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(120, 385, 'Fast evap = strong cooling', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.roundRect(205, 345, 150, 55, 8, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(280, 365, 'High Humidity (Jungle)', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(280, 385, 'Slow evap = weak cooling', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Discover a Surprising Twist', variant: 'secondary' });

    r.setCoachMessage("Now let's see what happens with wind...");
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Wind Twist', { fill: '#f97316', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 95, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 120, 'You have wet skin. Someone blows air across it.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 145, 'What happens to the cooling effect?', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      'Cooling increases - wind speeds up evaporation',
      'Cooling decreases - wind blows away the cool',
      'No change - humidity is what matters',
      'Skin dries instantly, no more cooling'
    ];

    options.forEach((option, i) => {
      const y = 195 + i * 55;
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
        bgColor = 'rgba(249, 115, 22, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 430, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      r.text(200, 460, 'Correct! Wind removes saturated air!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 490, 'Fresh dry air contacts skin = faster evaporation', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Wind Effect in Action', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Wind & Evaporative Cooling', { fill: '#f97316', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization with wind
    r.roundRect(20, 80, 360, 180, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Air region
    r.rect(30, 90, 340, 50, { fill: 'rgba(30, 58, 95, 0.5)' });

    // Wind arrows
    if (this.windSpeed > 0) {
      for (let i = 0; i < Math.round(this.windSpeed / 2); i++) {
        const x = 30 + ((this.animationTime * 60 + i * 50) % 340);
        const y = 105 + i * 10;
        r.line(x, y, x + 20, y, { stroke: '#60a5fa', strokeWidth: 2 });
        r.line(x + 15, y - 5, x + 20, y, { stroke: '#60a5fa', strokeWidth: 2 });
        r.line(x + 15, y + 5, x + 20, y, { stroke: '#60a5fa', strokeWidth: 2 });
      }
    }

    // Skin
    const skinColor = this.getSkinColor(this.skinTemp);
    r.rect(30, 145, 340, 105, { fill: skinColor });

    // Water droplets
    const evapRate = this.calculateEvaporationRate(this.humidity, this.windSpeed);
    for (let i = 0; i < 8; i++) {
      const x = 60 + (i % 4) * 70;
      const y = 175 + Math.floor(i / 4) * 35;
      r.ellipse(x, y, 5, 3, { fill: 'rgba(100, 149, 237, 0.7)' });
    }

    // Evaporating particles
    for (let i = 0; i < Math.round(evapRate * 6); i++) {
      const x = 70 + i * 45 + Math.sin(this.animationTime * 2 + i) * 10;
      const y = 140 - (this.animationTime * 25 + i * 8) % 40;
      r.circle(x, y, 3, { fill: 'rgba(100, 149, 237, 0.4)' });
    }

    // Sliders
    r.addSlider({
      id: 'humidity',
      label: 'Humidity (%)',
      min: 10,
      max: 95,
      step: 5,
      value: this.humidity
    });

    r.addSlider({
      id: 'wind_speed',
      label: 'Wind Speed (m/s)',
      min: 0,
      max: 10,
      step: 1,
      value: this.windSpeed
    });

    // Comparison
    const noWindTemp = 37 - this.calculateCooling(this.calculateEvaporationRate(this.humidity, 0));
    r.roundRect(30, 380, 160, 60, 8, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(110, 405, 'No Wind', { fill: '#ffffff', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 425, `Temp: ${noWindTemp.toFixed(1)}C`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.roundRect(210, 380, 160, 60, 8, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(290, 405, 'With Wind', { fill: '#ffffff', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 425, `Temp: ${this.skinTemp.toFixed(1)}C`, { fill: '#f97316', fontSize: 11, textAnchor: 'middle' });

    if (this.windSpeed > 0) {
      const extraCooling = noWindTemp - this.skinTemp;
      r.text(290, 440, `+${extraCooling.toFixed(1)}C extra cooling!`, { fill: '#fbbf24', fontSize: 9, textAnchor: 'middle' });
    }

    r.addButton({ id: 'continue', label: 'See Explanation', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Wind Chill & Evaporation', { fill: '#f97316', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 85, 340, 120, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 110, 'Why Wind Helps', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 135, 'A thin layer of humid air forms above wet skin.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 155, 'This "boundary layer" slows further evaporation.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 180, 'Wind blows it away, replacing with drier air!', { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 220, 340, 120, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 245, 'Wind Chill Effect', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 270, "Wind feels colder than still air at same temp!", { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 295, "It's not colder - it removes heat faster by:", { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 315, '1. Increasing evaporation (if wet)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 330, '2. Breaking up insulating air layer', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Real Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#0891b2';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 170, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 195, app.tagline, { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });

    const words = app.description.split(' ');
    let line = '';
    let lineY = 225;
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

    r.roundRect(40, 310, 320, 60, 10, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 335, 'Physics Connection', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 358, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 400, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    r.text(200, 440, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      r.roundRect(25, 100, 350, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 125, question.scenario.substring(0, 50), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 145, question.scenario.substring(50, 100) || '', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      r.text(200, 190, question.question, { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      question.options.forEach((option, i) => {
        const y = 215 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(6, 182, 212, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 45, 8, { fill: bgColor });
        r.text(40, y + 27, `${String.fromCharCode(65 + i)}. ${option.substring(0, 45)}${option.length > 45 ? '...' : ''}`, { fill: isSelected ? '#22d3ee' : '#e2e8f0', fontSize: 11 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: 'Previous', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next', variant: 'secondary' });
      }

      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      } else {
        r.text(200, 450, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🎉' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? 'Excellent! Evaporative cooling mastered!' : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.roundRect(30, 280, 340, 120, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 340, 'Latent heat: Lv = 2,260 J/g', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 360, 'Low humidity = faster evaporation', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 380, 'Wind removes boundary layer', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 100, '💧', { fontSize: 72, textAnchor: 'middle' });

    r.text(200, 180, 'Cooling Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 215, "You've mastered evaporative cooling", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 238, 'and heat transfer!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    const concepts = [
      { icon: '🌡️', label: 'Latent Heat' },
      { icon: '💨', label: 'Wind Chill' },
      { icon: '💧', label: 'Humidity Effects' },
      { icon: '❄️', label: 'Swamp Coolers' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 275 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    r.roundRect(50, 440, 300, 70, 12, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 468, 'Key Formula', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 495, 'Q = m * Lv (2,260 J/g)', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering evaporative cooling!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      skinWet: this.skinWet,
      humidity: this.humidity,
      skinTemp: this.skinTemp,
      windSpeed: this.windSpeed,
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
    if (state.skinWet !== undefined) this.skinWet = state.skinWet as boolean;
    if (state.humidity !== undefined) this.humidity = state.humidity as number;
    if (state.skinTemp !== undefined) this.skinTemp = state.skinTemp as number;
    if (state.windSpeed !== undefined) this.windSpeed = state.windSpeed as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createEvaporativeCoolingGame(sessionId: string): EvaporativeCoolingGame {
  return new EvaporativeCoolingGame(sessionId);
}
