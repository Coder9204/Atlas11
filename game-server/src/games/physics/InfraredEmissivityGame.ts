import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// INFRARED EMISSIVITY GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Stefan-Boltzmann Law - P = εσAT⁴
// All warm objects emit infrared radiation
// Emissivity (ε) determines how much IR a surface emits vs a perfect blackbody
// Low emissivity surfaces reflect surroundings instead of emitting
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
const STEFAN_BOLTZMANN = 5.67e-8; // W/(m²·K⁴)
const AMBIENT_TEMP = 22; // °C

// Emissivity values (PROTECTED)
const EMISSIVITY_VALUES: Record<string, number> = {
  hand: 0.98,
  cup_matte: 0.95,
  cup_shiny: 0.1,
  ice: 0.96
};

export class InfraredEmissivityGame extends BaseGame {
  readonly gameType = 'infrared_emissivity';
  readonly gameTitle = 'Infrared Emissivity: The Invisible Heat Vision';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private viewMode: 'visible' | 'infrared' = 'visible';
  private selectedObject: 'hand' | 'cup_matte' | 'cup_shiny' | 'ice' = 'hand';
  private objectTemp = 37;
  private twistViewMode: 'visible' | 'infrared' = 'visible';
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
      scenario: "A physicist is studying thermal radiation from everyday objects at room temperature.",
      question: "Why do all warm objects emit infrared radiation?",
      options: [
        "They have special IR emitting chemicals",
        "Thermal motion of molecules produces electromagnetic radiation",
        "They absorb IR from the sun and re-emit it",
        "Only metal objects emit IR"
      ],
      correctIndex: 1,
      explanation: "All matter above absolute zero has vibrating molecules, and this thermal motion produces electromagnetic radiation in the infrared spectrum."
    },
    {
      scenario: "A shiny metal cup and a matte black cup both contain hot water at 60°C. A thermal camera is pointed at them.",
      question: "How will they appear on the IR camera?",
      options: [
        "They look the same - same temperature means same IR",
        "The shiny cup appears COOLER because it reflects surroundings instead of emitting",
        "The shiny cup appears HOTTER because metal conducts better",
        "IR cameras cannot see metal objects"
      ],
      correctIndex: 1,
      explanation: "The shiny cup has low emissivity (~0.1), so it reflects the cooler surroundings rather than emitting its true temperature. The matte cup (ε≈0.95) shows its true temperature."
    },
    {
      scenario: "An engineer is calibrating a thermal camera for accurate temperature measurements.",
      question: "What is emissivity?",
      options: [
        "How hot an object is",
        "How much IR radiation a surface emits compared to a perfect blackbody",
        "The color of an object under normal light",
        "How reflective a surface is to visible light"
      ],
      correctIndex: 1,
      explanation: "Emissivity (ε) is the ratio of IR radiation emitted by a surface compared to a perfect 'blackbody' at the same temperature. It ranges from 0 to 1."
    },
    {
      scenario: "A technician needs accurate temperature readings from a shiny metal pipe using an IR camera.",
      question: "What should they do?",
      options: [
        "Always use a shiny surface for best results",
        "Set the emissivity value to match the surface, or apply high-emissivity tape",
        "Only measure on cloudy days",
        "Point the camera at the sun first to calibrate"
      ],
      correctIndex: 1,
      explanation: "For accurate readings on low-emissivity surfaces, either adjust the camera's emissivity setting or apply electrical tape (ε≈0.95) to create a high-emissivity measurement spot."
    },
    {
      scenario: "A building inspector uses thermal imaging to find energy efficiency problems.",
      question: "What can thermal imaging detect in buildings?",
      options: [
        "Only visible light leaks",
        "Heat leaks, missing insulation, and moisture damage",
        "Only metal structural elements",
        "Sound transmission paths"
      ],
      correctIndex: 1,
      explanation: "Thermal cameras detect temperature differences that reveal heat escaping through walls, missing insulation, water damage (which changes thermal properties), and air leaks."
    },
    {
      scenario: "A doctor is considering using thermal imaging for medical diagnosis.",
      question: "What makes thermal imaging useful for medical applications?",
      options: [
        "It can see through skin to organs",
        "It detects temperature differences indicating inflammation or blood flow issues",
        "It only works on metal implants",
        "It measures blood oxygen levels"
      ],
      correctIndex: 1,
      explanation: "Medical thermal imaging detects temperature variations on the skin surface that can indicate increased blood flow, inflammation, or circulatory problems."
    },
    {
      scenario: "An electrician inspects a power distribution panel with a thermal camera.",
      question: "Why is thermal imaging valuable for electrical maintenance?",
      options: [
        "To measure voltage levels",
        "To find hot spots indicating loose connections or overloaded circuits",
        "To see wire colors in the dark",
        "To measure current flow directly"
      ],
      correctIndex: 1,
      explanation: "Loose connections and overloaded circuits generate excess heat due to increased resistance. Thermal cameras detect these hot spots before they cause fires."
    },
    {
      scenario: "A wildlife researcher studies nocturnal animals in a forest at night.",
      question: "How does thermal imaging help observe wildlife?",
      options: [
        "It makes animals glow visible colors",
        "It detects body heat, allowing observation in complete darkness",
        "It only works on cold-blooded animals",
        "It requires the animals to wear sensors"
      ],
      correctIndex: 1,
      explanation: "Warm-blooded animals emit IR radiation from their body heat, making them visible to thermal cameras even in complete darkness without any external illumination."
    },
    {
      scenario: "A scientist is explaining why polished metal appears cold on thermal cameras.",
      question: "What is the apparent temperature formula for IR cameras?",
      options: [
        "Apparent = Actual temperature only",
        "Apparent = ε × Actual + (1-ε) × Ambient",
        "Apparent = Actual + Ambient",
        "Apparent = Actual ÷ ε"
      ],
      correctIndex: 1,
      explanation: "The camera measures: Apparent = ε×T_actual + (1-ε)×T_ambient. Low emissivity means more reflection of ambient temperature, less emission of actual temperature."
    },
    {
      scenario: "A materials scientist is selecting surface coatings for thermal management.",
      question: "Which coating would radiate the most heat at a given temperature?",
      options: [
        "Polished aluminum (ε≈0.05)",
        "Matte black paint (ε≈0.95)",
        "Shiny chrome (ε≈0.1)",
        "All coatings radiate equally"
      ],
      correctIndex: 1,
      explanation: "Matte black paint has the highest emissivity (~0.95), meaning it radiates nearly as much as a perfect blackbody. High emissivity is crucial for cooling via radiation."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🏠",
      title: "Building Inspections",
      tagline: "Finding hidden heat leaks",
      description: "Thermal cameras reveal heat escaping through walls, missing insulation, moisture damage, and air leaks that are invisible to the naked eye.",
      connection: "Temperature differences show where building envelope is failing. Areas of heat loss appear as hot spots in winter."
    },
    {
      icon: "🏥",
      title: "Medical Imaging",
      tagline: "Non-invasive health screening",
      description: "Detect inflammation, blood flow issues, and fever screening by measuring skin temperature patterns without contact.",
      connection: "Increased blood flow to injured or infected areas raises local temperature, creating detectable thermal signatures."
    },
    {
      icon: "⚡",
      title: "Electrical Maintenance",
      tagline: "Preventing fires before they start",
      description: "Find dangerous hot spots in electrical panels that indicate loose connections, overloaded circuits, or failing components.",
      connection: "Electrical resistance in poor connections converts energy to heat. High resistance = high temperature = visible on thermal camera."
    },
    {
      icon: "🌙",
      title: "Night Vision",
      tagline: "Seeing in complete darkness",
      description: "Military, security, and wildlife observation use thermal imaging to detect warm bodies in total darkness.",
      connection: "Unlike regular cameras needing light, thermal cameras detect IR radiation emitted by warm objects - works in zero light conditions."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate apparent temperature based on emissivity
  private calculateApparentTemp(actualTemp: number, emissivity: number): number {
    // Apparent = ε × T_actual + (1-ε) × T_ambient
    return emissivity * actualTemp + (1 - emissivity) * AMBIENT_TEMP;
  }

  // PROTECTED: Get object properties
  private getObjectProps(obj: string): { emissivity: number; name: string; actualTemp: number } {
    const props: Record<string, { emissivity: number; name: string; actualTemp: number }> = {
      hand: { emissivity: EMISSIVITY_VALUES.hand, name: 'Human Hand', actualTemp: 37 },
      cup_matte: { emissivity: EMISSIVITY_VALUES.cup_matte, name: 'Matte Black Cup', actualTemp: this.objectTemp },
      cup_shiny: { emissivity: EMISSIVITY_VALUES.cup_shiny, name: 'Polished Metal Cup', actualTemp: this.objectTemp },
      ice: { emissivity: EMISSIVITY_VALUES.ice, name: 'Ice Cube', actualTemp: 0 }
    };
    return props[obj] || props.hand;
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
      if (input.id === 'object_temp') {
        this.objectTemp = Math.max(20, Math.min(80, input.value));
      }
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
            this.prediction = buttonId.split('_')[1];
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
        }
        break;

      case 'play':
        if (buttonId === 'toggle_view') {
          this.viewMode = this.viewMode === 'visible' ? 'infrared' : 'visible';
        } else if (buttonId.startsWith('select_')) {
          this.selectedObject = buttonId.split('_')[1] as 'hand' | 'cup_matte' | 'cup_shiny' | 'ice';
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
            this.twistPrediction = buttonId.split('_')[1];
            this.showTwistFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'twist_play';
          this.showTwistFeedback = false;
        }
        break;

      case 'twist_play':
        if (buttonId === 'toggle_view') {
          this.twistViewMode = this.twistViewMode === 'visible' ? 'infrared' : 'visible';
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
    this.viewMode = 'visible';
    this.selectedObject = 'hand';
    this.objectTemp = 37;
    this.twistViewMode = 'visible';
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

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(249, 115, 22, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(239, 68, 68, 0.05)' });

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
    r.roundRect(110, 60, 180, 30, 8, { fill: 'rgba(249, 115, 22, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#fb923c', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Invisible Heat Vision', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Discover how thermal cameras reveal hidden temperatures', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Visual icons
    r.text(200, 250, '🌡️📷', { fill: '#ffffff', fontSize: 64, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 300, 320, 180, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 340, 'Thermal cameras can "see" heat!', { fill: '#fb923c', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 375, 'Every warm object glows with', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 395, 'invisible infrared light.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 435, 'But some hot objects appear', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 455, 'COLD on thermal cameras!', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'investigate', label: 'Investigate!', variant: 'primary' });

    r.setCoachMessage('Explore the physics of infrared radiation and emissivity!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 100, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'You point a thermal camera at your hand.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'What determines how bright it appears?', { fill: '#fb923c', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'color', text: 'The color of your skin', icon: '🎨' },
      { id: 'temp', text: 'Your body temperature creates IR', icon: '🌡️' },
      { id: 'motion', text: 'How fast you move your hand', icon: '👋' },
      { id: 'light', text: 'How much visible light hits it', icon: '💡' }
    ];

    options.forEach((option, i) => {
      const y = 200 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (option.id === 'temp') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (option.id === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (option.id === this.prediction) {
        bgColor = 'rgba(249, 115, 22, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, option.icon, { fontSize: 18 });
      r.text(80, y + 30, option.text, { fill: textColor, fontSize: 13 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${option.id}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 460, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const correct = this.prediction === 'temp';
      const message = correct ? 'Correct!' : 'The answer: Body temperature creates IR!';
      r.text(200, 495, message, { fill: correct ? '#34d399' : '#fb923c', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 525, 'Thermal motion of molecules produces IR radiation.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test It!', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Thermal Imaging Experiment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const props = this.getObjectProps(this.selectedObject);
    const apparentTemp = this.calculateApparentTemp(props.actualTemp, props.emissivity);

    // Visualization area
    r.roundRect(20, 80, 360, 250, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // View mode label
    const viewLabel = this.viewMode === 'infrared' ? '📷 IR Camera View' : '👁️ Normal View';
    r.text(200, 105, viewLabel, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 125, props.name, { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Object visualization
    if (this.viewMode === 'infrared') {
      // IR view - color based on apparent temperature
      const temp = apparentTemp;
      const hue = Math.max(0, Math.min(60, (temp + 10) * 2)); // Blue to red
      const color = temp > 30 ? '#f97316' : temp > 15 ? '#fbbf24' : '#3b82f6';
      r.circle(200, 210, 60, { fill: color });
      r.text(200, 210, Math.round(apparentTemp) + '°C', { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

      // Emissivity warning for low-e objects
      if (props.emissivity < 0.5) {
        r.text(200, 290, '⚠️ Low emissivity - reflects surroundings!', { fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' });
      }
    } else {
      // Normal view
      const objColor = this.selectedObject === 'hand' ? '#e8b4a0' :
                       this.selectedObject === 'cup_matte' ? '#1f2937' :
                       this.selectedObject === 'cup_shiny' ? '#9ca3af' : '#e0f2fe';
      r.circle(200, 210, 60, { fill: objColor });
    }

    // Temperature display
    r.text(200, 310, `Actual: ${props.actualTemp}°C | Apparent: ${apparentTemp.toFixed(1)}°C`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Object selector
    r.text(200, 350, 'Select Object:', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    const objects = ['hand', 'cup_matte', 'cup_shiny', 'ice'];
    objects.forEach((obj, i) => {
      const x = 50 + i * 85;
      const isSelected = this.selectedObject === obj;
      r.roundRect(x, 365, 75, 40, 8, { fill: isSelected ? 'rgba(249, 115, 22, 0.3)' : 'rgba(51, 65, 85, 0.5)' });
      const labels: Record<string, string> = { hand: '✋ Hand', cup_matte: '☕ Matte', cup_shiny: '🥤 Shiny', ice: '🧊 Ice' };
      r.text(x + 37, 390, labels[obj], { fill: isSelected ? '#fb923c' : '#94a3b8', fontSize: 10, textAnchor: 'middle' });
      r.addButton({ id: `select_${obj}`, label: '', variant: 'secondary' });
    });

    // Temperature slider for cups
    if (this.selectedObject === 'cup_matte' || this.selectedObject === 'cup_shiny') {
      r.addSlider({
        id: 'object_temp',
        label: `Cup Temperature: ${this.objectTemp}°C`,
        min: 20,
        max: 80,
        step: 1,
        value: this.objectTemp
      });
    }

    // View toggle button
    r.addButton({ id: 'toggle_view', label: this.viewMode === 'infrared' ? 'Switch to Normal View' : 'Switch to IR View', variant: 'secondary' });

    r.addButton({ id: 'continue', label: 'Continue', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'How Thermal Imaging Works', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Explanation cards
    const cards = [
      { num: '1', title: 'Thermal Motion', desc: 'All matter above absolute zero has vibrating molecules', color: '#f97316' },
      { num: '2', title: 'IR Emission', desc: 'These vibrations emit electromagnetic radiation (infrared)', color: '#ef4444' },
      { num: '3', title: 'Camera Detection', desc: 'IR sensors measure the radiation and map it to colors', color: '#fbbf24' }
    ];

    cards.forEach((card, i) => {
      const y = 90 + i * 85;
      r.roundRect(30, y, 340, 75, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.circle(60, y + 37, 20, { fill: card.color });
      r.text(60, y + 43, card.num, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(90, y + 30, card.title, { fill: '#ffffff', fontSize: 14, fontWeight: 'bold' });
      r.text(90, y + 52, card.desc, { fill: '#94a3b8', fontSize: 11 });
    });

    // Stefan-Boltzmann Law
    r.roundRect(30, 360, 340, 90, 12, { fill: 'rgba(249, 115, 22, 0.1)' });
    r.text(200, 390, 'Stefan-Boltzmann Law', { fill: '#fb923c', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 420, 'Power radiated = ε × σ × A × T⁴', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 440, 'Hotter objects radiate exponentially more IR!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'But wait...', variant: 'secondary' });

    r.setCoachMessage('Now let\'s see what happens with different surface types...');
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, '🔄 The Twist!', { fill: '#ef4444', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'Two cups with the same 60°C hot water.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'One is matte black, one is polished metal.', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 180, 'On the thermal camera:', { fill: '#ef4444', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'same', text: 'Both appear the same temperature', icon: '=' },
      { id: 'shiny_cold', text: 'Shiny cup appears COOLER', icon: '❄️' },
      { id: 'shiny_hot', text: 'Shiny cup appears HOTTER', icon: '🔥' },
      { id: 'invisible', text: 'Shiny cup is invisible to IR', icon: '👻' }
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (option.id === 'shiny_cold') {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (option.id === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (option.id === this.twistPrediction) {
        bgColor = 'rgba(239, 68, 68, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, option.icon, { fontSize: 16 });
      r.text(75, y + 30, option.text, { fill: textColor, fontSize: 13 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${option.id}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 440, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const correct = this.twistPrediction === 'shiny_cold';
      const message = correct ? 'Correct!' : 'The shiny cup appears COOLER!';
      r.text(200, 475, message, { fill: correct ? '#34d399' : '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 505, 'Low emissivity surfaces reflect surroundings!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Comparison', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, 'The Emissivity Trick', { fill: '#ef4444', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 75, 'Both cups contain 60°C hot water', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Side-by-side comparison
    if (this.twistViewMode === 'infrared') {
      // IR view
      // Matte cup - shows true temp
      r.roundRect(30, 100, 160, 200, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
      r.text(110, 125, 'Matte Black', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.circle(110, 190, 50, { fill: '#f97316' }); // Hot color
      r.text(110, 195, '~58°C', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(110, 280, 'ε = 0.95', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      // Shiny cup - reflects ambient
      r.roundRect(210, 100, 160, 200, 12, { fill: 'rgba(71, 85, 105, 0.2)' });
      r.text(290, 125, 'Polished Metal', { fill: '#94a3b8', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.circle(290, 190, 50, { fill: '#3b82f6' }); // Cool color - reflects ambient
      const shinyApparent = this.calculateApparentTemp(60, 0.1);
      r.text(290, 195, `~${Math.round(shinyApparent)}°C`, { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(290, 280, 'ε = 0.1', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.text(200, 330, 'Same temperature, different IR readings!', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 350, 'Shiny surface reflects the cold room.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    } else {
      // Normal view - both look the same temp
      r.roundRect(30, 100, 160, 200, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(110, 125, 'Matte Black', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
      r.roundRect(70, 145, 80, 120, 8, { fill: '#1f2937' });
      r.text(110, 280, '60°C', { fill: '#fb923c', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      r.roundRect(210, 100, 160, 200, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(290, 125, 'Polished Metal', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
      r.roundRect(250, 145, 80, 120, 8, { fill: '#9ca3af' });
      r.text(290, 280, '60°C', { fill: '#fb923c', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      r.text(200, 330, 'Both cups are the same temperature!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    }

    // View toggle and continue
    r.addButton({ id: 'toggle_view', label: this.twistViewMode === 'infrared' ? 'Normal View' : 'IR Camera View', variant: 'secondary' });
    r.addButton({ id: 'continue', label: 'Continue', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 50, 'Emissivity Explained', { fill: '#ef4444', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Emissivity definition
    r.roundRect(30, 80, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 110, 'Emissivity (ε)', { fill: '#fb923c', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 140, 'Ratio of IR emitted vs a perfect "blackbody"', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // High vs Low emissivity
    r.roundRect(30, 175, 165, 110, 12, { fill: 'rgba(249, 115, 22, 0.1)' });
    r.text(112, 200, 'High (ε ≈ 1)', { fill: '#fb923c', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(112, 225, 'Skin, matte paint', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(112, 245, '→ Emits true temp', { fill: '#34d399', fontSize: 10, textAnchor: 'middle' });
    r.text(112, 265, 'Accurate readings!', { fill: '#34d399', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(205, 175, 165, 110, 12, { fill: 'rgba(59, 130, 246, 0.1)' });
    r.text(287, 200, 'Low (ε ≈ 0.1)', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(287, 225, 'Polished metal', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(287, 245, '→ Reflects ambient', { fill: '#f87171', fontSize: 10, textAnchor: 'middle' });
    r.text(287, 265, 'Misleading readings!', { fill: '#f87171', fontSize: 10, textAnchor: 'middle' });

    // Pro tip
    r.roundRect(30, 300, 340, 70, 12, { fill: 'rgba(251, 191, 36, 0.1)' });
    r.text(200, 325, '💡 Pro tip:', { fill: '#fbbf24', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 350, 'Apply electrical tape (ε≈0.95) on shiny surfaces!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Formula
    r.roundRect(30, 385, 340, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 410, 'Apparent = ε×T_actual + (1-ε)×T_ambient', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 435, 'Low ε → More ambient reflection!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 50, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#f97316';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.tagline, { fill: '#fb923c', fontSize: 11, textAnchor: 'middle' });

    // Description (wrapped)
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
    r.roundRect(40, 320, 320, 70, 10, { fill: 'rgba(249, 115, 22, 0.1)' });
    r.text(200, 345, 'Physics Connection', { fill: '#fb923c', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 370, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

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
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 50, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 77, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Scenario
      r.roundRect(25, 95, 350, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      const scenarioText = question.scenario.length > 80 ? question.scenario.substring(0, 80) + '...' : question.scenario;
      r.text(200, 140, scenarioText, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

      // Question
      r.text(200, 195, question.question, { fill: '#fb923c', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 220 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(249, 115, 22, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${option.substring(0, 45)}${option.length > 45 ? '...' : ''}`, { fill: isSelected ? '#fb923c' : '#e2e8f0', fontSize: 11 });

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
        r.text(200, 485, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? 'Excellent! You understand thermal imaging!' : 'Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 140, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#fb923c', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'Stefan-Boltzmann Law: P = εσAT⁴',
        'Emissivity and surface properties',
        'Real-world IR applications'
      ];
      concepts.forEach((concept, i) => {
        r.text(200, 340 + i * 25, concept, { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
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
    r.text(200, 200, 'Thermal Imaging Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand infrared physics!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '🌡️', label: 'Stefan-Boltzmann Law' },
      { icon: '✨', label: 'Emissivity' },
      { icon: '📷', label: 'IR Imaging' },
      { icon: '🔬', label: 'Applications' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 275 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key takeaways
    r.roundRect(50, 440, 300, 80, 12, { fill: 'rgba(249, 115, 22, 0.1)' });
    r.text(200, 465, 'Key Formula', { fill: '#fb923c', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 490, 'Apparent = ε×T + (1-ε)×T_ambient', { fill: '#ffffff', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 510, 'Emissivity determines IR camera accuracy!', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering infrared emissivity!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      viewMode: this.viewMode,
      selectedObject: this.selectedObject,
      objectTemp: this.objectTemp,
      twistViewMode: this.twistViewMode,
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
    if (state.viewMode) this.viewMode = state.viewMode as 'visible' | 'infrared';
    if (state.selectedObject) this.selectedObject = state.selectedObject as 'hand' | 'cup_matte' | 'cup_shiny' | 'ice';
    if (state.objectTemp !== undefined) this.objectTemp = state.objectTemp as number;
    if (state.twistViewMode) this.twistViewMode = state.twistViewMode as 'visible' | 'infrared';
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createInfraredEmissivityGame(sessionId: string): InfraredEmissivityGame {
  return new InfraredEmissivityGame(sessionId);
}
