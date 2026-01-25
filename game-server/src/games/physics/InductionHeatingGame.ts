import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// INDUCTION HEATING GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Faraday's Law creates eddy currents from changing magnetic fields
// Heating from P = I²R - currents through resistance generate heat
// Skin effect concentrates currents at surface at high frequencies
// Material selection: magnetic permeability and electrical conductivity
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

// Material properties (PROTECTED - never sent to client)
interface MaterialProps {
  conductivity: number;
  magnetic: boolean;
  heatingRate: number;
  color: string;
}

const MATERIALS: Record<string, MaterialProps> = {
  steel: { conductivity: 0.7, magnetic: true, heatingRate: 1.0, color: '#6b7280' },
  aluminum: { conductivity: 1.0, magnetic: false, heatingRate: 0.3, color: '#d1d5db' },
  glass: { conductivity: 0, magnetic: false, heatingRate: 0, color: '#93c5fd' },
  copper: { conductivity: 1.0, magnetic: false, heatingRate: 0.4, color: '#f97316' }
};

export class InductionHeatingGame extends BaseGame {
  readonly gameType = 'induction_heating';
  readonly gameTitle = 'Induction Heating: Heat Without Contact';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private isHeating = false;
  private panMaterial: 'steel' | 'aluminum' | 'glass' | 'copper' = 'steel';
  private temperature = 25;
  private frequency = 25; // kHz
  private animationTime = 0;

  // Twist state
  private twistMaterial: 'steel' | 'aluminum' | 'glass' = 'steel';

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showExplanation = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      question: "What causes metal to heat up in an induction cooktop?",
      options: [
        "Direct heat from burning gas",
        "Radiation from a hot coil",
        "Eddy currents induced in the metal pan",
        "Microwaves penetrating the food"
      ],
      correctIndex: 2,
      explanation: "The oscillating magnetic field induces circular currents (eddy currents) in the conductive pan, which heat it through resistive losses (I²R)."
    },
    {
      question: "Why doesn't a glass pan heat up on an induction stove?",
      options: [
        "Glass is already too hot",
        "Glass is an insulator - no eddy currents form",
        "The magnetic field passes through glass too fast",
        "Glass reflects the magnetic field"
      ],
      correctIndex: 1,
      explanation: "Glass has no free electrons to carry current. Without electrical conductivity, no eddy currents can form and thus no I²R heating occurs."
    },
    {
      question: "How do eddy currents cause heating?",
      options: [
        "They create friction with air molecules",
        "They flow through resistance, converting electrical energy to heat (I²R)",
        "They vibrate at ultrasonic frequencies",
        "They create sparks inside the metal"
      ],
      correctIndex: 1,
      explanation: "Power dissipation P = I²R: the current flowing through the metal's electrical resistance converts electrical energy into thermal energy."
    },
    {
      question: "Why is induction cooking more efficient than gas?",
      options: [
        "It uses more electricity",
        "Heat is generated directly in the pan, not wasted on air",
        "Gas burners are turned down",
        "Induction uses nuclear energy"
      ],
      correctIndex: 1,
      explanation: "Induction is 80-90% efficient because heat is generated directly in the pan. Gas is only ~40% efficient since most heat escapes into the air."
    },
    {
      question: "Why does steel heat faster than aluminum on induction?",
      options: [
        "Steel is lighter",
        "Steel is magnetic AND has moderate resistance for I²R heating",
        "Aluminum blocks magnetic fields",
        "Steel has more atoms"
      ],
      correctIndex: 1,
      explanation: "Steel's ferromagnetic properties enhance field coupling, and its higher resistance (compared to aluminum) maximizes I²R heating."
    },
    {
      question: "What happens to heating rate if you increase coil frequency?",
      options: [
        "Heating decreases",
        "Heating stays the same",
        "Heating increases due to stronger induced currents",
        "The pan explodes"
      ],
      correctIndex: 2,
      explanation: "Higher frequency means faster-changing magnetic field, which induces stronger eddy currents and faster heating (P ∝ f²)."
    },
    {
      question: "The 'skin effect' in induction heating means:",
      options: [
        "Only the outer surface of the pan heats up",
        "Currents concentrate near the surface at high frequencies",
        "The pan develops a skin-like texture",
        "Heat only affects the pan's coating"
      ],
      correctIndex: 1,
      explanation: "At high frequencies, eddy currents are pushed to the surface of the conductor (skin depth decreases), concentrating heating near the surface."
    },
    {
      question: "Induction furnaces melt metals by:",
      options: [
        "Burning fuel around the metal",
        "Using lasers to cut the metal",
        "Inducing massive eddy currents that heat to melting point",
        "Adding chemicals that lower melting point"
      ],
      correctIndex: 2,
      explanation: "Industrial induction furnaces use powerful coils to induce enormous eddy currents, heating metal to thousands of degrees for melting."
    },
    {
      question: "Why do some aluminum pans have a steel disk on the bottom?",
      options: [
        "For decoration",
        "To make them induction-compatible by providing magnetic material",
        "To prevent scratching",
        "To reduce weight"
      ],
      correctIndex: 1,
      explanation: "The steel disk provides the magnetic, resistive material needed for efficient induction heating, while aluminum provides good heat distribution."
    },
    {
      question: "Wireless phone charging works on a similar principle because:",
      options: [
        "It uses the same plug",
        "Both use oscillating magnetic fields to induce currents",
        "Phones are made of steel",
        "They both use batteries"
      ],
      correctIndex: 1,
      explanation: "Wireless charging uses electromagnetic induction - an oscillating field in the charging pad induces current in a coil inside the phone."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🍳",
      title: "Induction Cooktops",
      description: "Oscillating field creates eddy currents in steel/iron pans. 80-90% efficient vs 40% for gas!"
    },
    {
      icon: "⚙️",
      title: "Metal Hardening",
      description: "Rapid surface heating hardens tool steel without affecting the core. Used for gears and shafts."
    },
    {
      icon: "🔥",
      title: "Induction Furnaces",
      description: "Melt metals without contamination from fuel combustion. Essential for high-purity alloys."
    },
    {
      icon: "🔋",
      title: "Wireless Charging",
      description: "Similar principle! Oscillating field induces current in your phone's receiver coil."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Get material properties
  private getMaterialProps(material: string): MaterialProps {
    return MATERIALS[material] || MATERIALS.steel;
  }

  // PROTECTED: Calculate heating rate
  private calculateHeatingRate(): number {
    const props = this.getMaterialProps(this.panMaterial);
    return props.heatingRate * (this.frequency / 25);
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
      if (input.id === 'frequency') {
        this.frequency = Math.max(10, Math.min(50, input.value));
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
            this.prediction = buttonId.split('_')[1];
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
        }
        break;

      case 'play':
        if (buttonId === 'toggle_heat') {
          this.isHeating = !this.isHeating;
          if (!this.isHeating) {
            // Start cooling
          }
        } else if (buttonId.startsWith('material_')) {
          const mat = buttonId.split('_')[1] as typeof this.panMaterial;
          this.panMaterial = mat;
          this.temperature = 25;
        } else if (buttonId === 'continue') {
          this.isHeating = false;
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
        if (buttonId.startsWith('twist_material_')) {
          const mat = buttonId.split('_')[2] as typeof this.twistMaterial;
          this.twistMaterial = mat;
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
          this.completedApps.add(this.activeAppIndex);
        } else if (buttonId === 'continue' && this.completedApps.size >= 4) {
          this.phase = 'test';
        }
        break;

      case 'test':
        if (buttonId.startsWith('answer_')) {
          const answerIndex = parseInt(buttonId.split('_')[1]);
          if (this.testAnswers[this.currentQuestionIndex] === -1) {
            this.testAnswers[this.currentQuestionIndex] = answerIndex;
            this.showExplanation = true;
          }
        } else if (buttonId === 'next_question') {
          if (this.currentQuestionIndex < 9) {
            this.currentQuestionIndex++;
            this.showExplanation = this.testAnswers[this.currentQuestionIndex] !== -1;
          }
        } else if (buttonId === 'prev_question') {
          if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.showExplanation = this.testAnswers[this.currentQuestionIndex] !== -1;
          }
        } else if (buttonId === 'complete') {
          const allAnswered = !this.testAnswers.includes(-1);
          if (allAnswered) {
            this.phase = 'mastery';
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

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.isHeating = false;
    this.panMaterial = 'steel';
    this.temperature = 25;
    this.frequency = 25;
    this.twistMaterial = 'steel';
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showExplanation = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  processInput(input: UserInput, config: SessionConfig): void {
    this.handleInput(input);
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Heating simulation
    if (this.isHeating) {
      const props = this.getMaterialProps(this.panMaterial);
      const maxTemp = props.heatingRate > 0 ? 400 : 25;
      const rate = props.heatingRate * (this.frequency / 25);
      if (this.temperature < maxTemp) {
        this.temperature = Math.min(maxTemp, this.temperature + rate * deltaTime * 10);
      }
    } else if (this.temperature > 25) {
      // Cooling
      this.temperature = Math.max(25, this.temperature - deltaTime * 5);
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(249, 115, 22, 0.03)' });
    r.circle(300, 600, 150, { fill: 'rgba(239, 68, 68, 0.03)' });

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

  private renderCooktop(r: CommandRenderer, startY: number, material: string, temp: number, heating: boolean): void {
    const props = this.getMaterialProps(material);
    const tempColor = temp > 200 ? '#ef4444' : temp > 100 ? '#f97316' : temp > 50 ? '#fbbf24' : props.color;

    // Cooktop surface
    r.roundRect(50, startY + 140, 300, 30, 8, { fill: '#1f2937' });

    // Induction coils
    for (let i = 0; i < 5; i++) {
      r.ellipse(200, startY + 155, 30 + i * 15, 6 + i * 3, {
        stroke: heating ? '#f97316' : '#4b5563',
        strokeWidth: 3,
        fill: 'transparent'
      });
    }

    // Magnetic field indicators
    if (heating) {
      const fieldOffset = Math.sin(this.animationTime * 5) * 20;
      r.line(120, startY + 120 + fieldOffset, 120, startY + 140, { stroke: '#3b82f6', strokeWidth: 2 });
      r.line(280, startY + 120 + fieldOffset, 280, startY + 140, { stroke: '#3b82f6', strokeWidth: 2 });
      r.text(115, startY + 110, 'B', { fill: '#3b82f6', fontSize: 10, textAnchor: 'middle' });
      r.text(285, startY + 110, 'B', { fill: '#3b82f6', fontSize: 10, textAnchor: 'middle' });
    }

    // Pan body
    r.ellipse(200, startY + 135, 80, 15, { fill: tempColor });
    r.rect(120, startY + 60, 160, 75, { fill: props.color });
    r.ellipse(200, startY + 60, 80, 20, { fill: props.color });
    r.ellipse(200, startY + 60, 70, 15, { fill: '#111827' });

    // Pan handle
    r.roundRect(280, startY + 85, 60, 15, 4, { fill: '#1f2937' });

    // Eddy currents visualization
    if (heating && props.conductivity > 0) {
      for (let i = 0; i < 3; i++) {
        r.ellipse(200, startY + 130 - i * 20, 60 - i * 10, 10 - i * 2, {
          stroke: temp > 100 ? '#ef4444' : '#f97316',
          strokeWidth: 2,
          fill: 'transparent'
        });
      }
    }

    // "No currents" indicator for glass
    if (material === 'glass' && heating) {
      r.text(200, startY + 100, 'No currents!', { fill: '#93c5fd', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Temperature display
    r.roundRect(20, startY, 90, 45, 8, { fill: '#1f2937' });
    r.text(65, startY + 18, 'Pan Temp', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });
    r.text(65, startY + 38, `${Math.round(temp)}°C`, {
      fill: temp > 100 ? '#ef4444' : '#94a3b8',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Material display
    r.roundRect(290, startY, 90, 45, 8, { fill: '#1f2937' });
    r.text(335, startY + 18, 'Material', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });
    r.text(335, startY + 38, material.charAt(0).toUpperCase() + material.slice(1), {
      fill: '#ffffff',
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
  }

  private renderHook(r: CommandRenderer): void {
    // Badge
    r.roundRect(130, 50, 140, 30, 8, { fill: 'rgba(249, 115, 22, 0.1)' });
    r.text(200, 70, 'PHYSICS EXPLORATION', { fill: '#f97316', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 120, 'Heat Without Contact', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 150, 'Discover how invisible magnetic fields', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 170, 'can cook your dinner', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    // Cooktop preview
    this.renderCooktop(r, 200, 'steel', 25, false);

    // Question card
    r.roundRect(40, 420, 320, 90, 16, { fill: 'rgba(249, 115, 22, 0.1)' });
    r.text(200, 455, 'Induction cooktops boil water in seconds,', { fill: '#f97316', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 475, 'yet stay cool to touch!', { fill: '#f97316', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 500, 'How does invisible energy create visible heat?', { fill: '#ffffff', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Discover the Secret', variant: 'primary' });

    r.setCoachMessage('Explore how electromagnetic induction creates heat!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 50, 'Make Your Prediction', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 80, 'An oscillating magnetic field passes through', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 100, 'a metal pan. What happens inside the metal?', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    const options = [
      { id: 'A', text: 'The metal vibrates like a speaker' },
      { id: 'B', text: 'Circular currents form and heat the metal (I²R)' },
      { id: 'C', text: 'The metal becomes a permanent magnet' },
      { id: 'D', text: "Nothing - magnetism doesn't affect metal" }
    ];

    options.forEach((option, i) => {
      const y = 130 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (option.id === 'B') {
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
      r.text(50, y + 30, `${option.id}. ${option.text}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${option.id}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 380, 340, 100, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
      r.text(200, 415, 'Eddy currents induced by the changing field', { fill: '#34d399', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 440, 'flow through resistance and generate heat!', { fill: '#34d399', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 465, 'P = I²R (Power = Current² × Resistance)', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Explore the Physics', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    const props = this.getMaterialProps(this.panMaterial);

    r.text(200, 35, 'Induction Heating Lab', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Cooktop visualization
    this.renderCooktop(r, 60, this.panMaterial, this.temperature, this.isHeating);

    // Material selector
    r.roundRect(20, 270, 175, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(107, 292, 'Pan Material', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    const materials = ['steel', 'aluminum', 'glass', 'copper'];
    materials.forEach((mat, i) => {
      const x = 30 + (i % 2) * 80;
      const y = 305 + Math.floor(i / 2) * 28;
      const isSelected = mat === this.panMaterial;
      r.roundRect(x, y, 75, 24, 6, { fill: isSelected ? '#f97316' : '#374151' });
      r.text(x + 37, y + 16, mat.charAt(0).toUpperCase() + mat.slice(1), {
        fill: '#ffffff',
        fontSize: 10,
        fontWeight: isSelected ? 'bold' : 'normal',
        textAnchor: 'middle'
      });
      r.addButton({ id: `material_${mat}`, label: '', variant: 'secondary' });
    });

    // Frequency slider
    r.roundRect(205, 270, 175, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(292, 292, `Frequency: ${this.frequency} kHz`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.addSlider({
      id: 'frequency',
      label: 'Frequency (kHz)',
      min: 10,
      max: 50,
      step: 5,
      value: this.frequency
    });

    // Status panel
    r.roundRect(20, 360, 360, 70, 12, { fill: 'rgba(249, 115, 22, 0.1)' });

    r.roundRect(35, 375, 100, 45, 8, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(85, 395, `${Math.round(this.temperature)}°C`, {
      fill: this.temperature > 100 ? '#ef4444' : '#f97316',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(85, 412, 'Temperature', { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });

    r.roundRect(150, 375, 100, 45, 8, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 395, props.magnetic ? 'Yes' : 'No', {
      fill: props.magnetic ? '#22c55e' : '#ef4444',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(200, 412, 'Magnetic', { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });

    r.roundRect(265, 375, 100, 45, 8, { fill: 'rgba(30, 41, 59, 0.5)' });
    const status = props.heatingRate > 0.5 ? 'FAST' : props.heatingRate > 0 ? 'SLOW' : 'NONE';
    r.text(315, 395, status, {
      fill: props.heatingRate > 0.5 ? '#22c55e' : props.heatingRate > 0 ? '#fbbf24' : '#ef4444',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(315, 412, 'Heating', { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });

    // Heat toggle button
    r.addButton({
      id: 'toggle_heat',
      label: this.isHeating ? 'Turn Off' : 'Turn On',
      variant: this.isHeating ? 'secondary' : 'primary'
    });

    // Info text
    r.roundRect(20, 470, 360, 50, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    let infoText = 'Steel heats efficiently - magnetic + conductive!';
    if (this.panMaterial === 'glass') {
      infoText = 'Glass is an insulator - no eddy currents, no heating!';
    } else if (this.panMaterial === 'aluminum' || this.panMaterial === 'copper') {
      infoText = 'Non-magnetic metal heats slowly (fewer eddy currents)';
    }
    r.text(200, 500, infoText, { fill: '#f97316', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review the Concepts', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 45, 'Understanding Induction Heating', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // How it works
    r.roundRect(20, 75, 175, 150, 12, { fill: 'rgba(249, 115, 22, 0.15)' });
    r.text(107, 100, 'How It Works', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(107, 125, 'Coil creates oscillating', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(107, 140, 'magnetic field', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(107, 160, 'Field induces eddy', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(107, 175, 'currents in metal', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(107, 195, 'P = I²R heating!', { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Best materials
    r.roundRect(205, 75, 175, 150, 12, { fill: 'rgba(16, 185, 129, 0.15)' });
    r.text(292, 100, 'Best Materials', { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(292, 125, 'Iron/Steel:', { fill: '#ffffff', fontSize: 11, textAnchor: 'middle' });
    r.text(292, 142, 'Magnetic + resistive', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(292, 165, 'Cast Iron:', { fill: '#ffffff', fontSize: 11, textAnchor: 'middle' });
    r.text(292, 182, 'Excellent heating', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(292, 205, 'Higher R = more heat', { fill: '#22c55e', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    // Poor materials
    r.roundRect(20, 240, 175, 150, 12, { fill: 'rgba(239, 68, 68, 0.15)' });
    r.text(107, 265, 'Poor Materials', { fill: '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(107, 290, 'Glass: No electrons', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(107, 310, 'Aluminum: Too', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(107, 325, 'conductive (low R)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(107, 345, 'Copper: Same issue', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(107, 370, 'No magnetic coupling', { fill: '#ef4444', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    // Efficiency
    r.roundRect(205, 240, 175, 150, 12, { fill: 'rgba(251, 191, 36, 0.15)' });
    r.text(292, 265, 'Efficiency', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(292, 295, 'Induction: 80-90%', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(292, 315, '(heat in pan directly)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(292, 345, 'Gas: Only 40%', { fill: '#ef4444', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(292, 365, '(heat escapes to air)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Discover the Material Twist', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 50, 'The Material Challenge', { fill: '#fbbf24', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 85, 'Why do induction cooktops require special pans?', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 105, 'What happens with aluminum or glass?', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    r.text(200, 145, 'What determines if a material heats up', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 165, 'on an induction stove?', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      { id: 'A', text: 'All pans work equally well' },
      { id: 'B', text: "Non-magnetic/non-conducting pans don't heat" },
      { id: 'C', text: 'The cooktop will break if wrong pan is used' },
      { id: 'D', text: 'All metal pans work, only glass fails' }
    ];

    options.forEach((option, i) => {
      const y = 195 + i * 55;
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
      r.roundRect(30, 420, 340, 80, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
      r.text(200, 450, 'Only magnetic, conductive materials heat', { fill: '#34d399', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 475, 'effectively on induction!', { fill: '#34d399', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Compare Materials', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 40, 'Material Comparison Lab', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Material selector tabs
    const materials: Array<typeof this.twistMaterial> = ['steel', 'aluminum', 'glass'];
    materials.forEach((mat, i) => {
      const x = 55 + i * 110;
      const isSelected = mat === this.twistMaterial;
      r.roundRect(x, 65, 95, 35, 8, { fill: isSelected ? '#f97316' : '#374151' });
      r.text(x + 47, 88, mat.charAt(0).toUpperCase() + mat.slice(1), {
        fill: '#ffffff',
        fontSize: 12,
        fontWeight: isSelected ? 'bold' : 'normal',
        textAnchor: 'middle'
      });
      r.addButton({ id: `twist_material_${mat}`, label: '', variant: 'secondary' });
    });

    // Show cooktop with selected material
    this.renderCooktop(r, 110, this.twistMaterial, 25, true);

    // Material info
    const materialInfo: Record<string, { heats: string; reason: string; color: string }> = {
      steel: { heats: 'Fast', reason: 'Magnetic + moderate resistance = strong eddy currents + I²R heating', color: '#f97316' },
      aluminum: { heats: 'Slow', reason: 'Conductive but non-magnetic - weak eddy currents', color: '#fbbf24' },
      glass: { heats: 'None', reason: 'No free electrons - no currents can form!', color: '#3b82f6' }
    };

    const info = materialInfo[this.twistMaterial];
    const bgColor = info.heats === 'Fast' ? 'rgba(249, 115, 22, 0.2)' : info.heats === 'Slow' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(59, 130, 246, 0.2)';

    r.roundRect(40, 340, 320, 100, 12, { fill: bgColor });
    r.text(200, 375, `Heating: ${info.heats}`, {
      fill: info.color,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(200, 405, info.reason.substring(0, 50), { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    if (info.reason.length > 50) {
      r.text(200, 425, info.reason.substring(50), { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    }

    // Comparison table
    r.roundRect(40, 460, 100, 50, 8, { fill: this.twistMaterial === 'steel' ? '#374151' : '#1e293b' });
    r.text(90, 480, 'Steel', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(90, 498, 'Fast', { fill: '#f97316', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(150, 460, 100, 50, 8, { fill: this.twistMaterial === 'aluminum' ? '#374151' : '#1e293b' });
    r.text(200, 480, 'Aluminum', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 498, 'Slow', { fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(260, 460, 100, 50, 8, { fill: this.twistMaterial === 'glass' ? '#374151' : '#1e293b' });
    r.text(310, 480, 'Glass', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(310, 498, 'None', { fill: '#3b82f6', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Understand Why', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 45, 'Why Material Matters', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Key properties
    r.roundRect(30, 80, 340, 70, 12, { fill: 'rgba(6, 182, 212, 0.15)' });
    r.text(200, 105, 'Two Key Properties for Induction:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 128, '1. Electrical conductivity - for currents to flow', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 145, '2. Magnetic permeability - for stronger field coupling', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Material comparison
    r.roundRect(30, 165, 105, 100, 10, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(82, 190, 'Steel/Cast Iron', { fill: '#22c55e', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(82, 210, 'Conductive +', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(82, 225, 'Magnetic', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(82, 250, 'BEST', { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(147, 165, 105, 100, 10, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 190, 'Aluminum', { fill: '#fbbf24', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 210, 'Conductive,', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(200, 225, 'Not magnetic', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(200, 250, 'POOR', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(265, 165, 105, 100, 10, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(317, 190, 'Glass', { fill: '#ef4444', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(317, 210, 'Insulator,', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(317, 225, 'Not magnetic', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(317, 250, 'NONE', { fill: '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Pro tip
    r.roundRect(40, 285, 320, 60, 12, { fill: 'rgba(251, 191, 36, 0.15)' });
    r.text(200, 310, 'Pro Tip:', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 332, 'Induction-ready aluminum pans have a steel plate bonded to the bottom!', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Real Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 45, 'Real-World Applications', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 70, 'How induction heating powers modern industry', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#f97316';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 95, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 123, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 155, 350, 220, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 190, app.icon, { fontSize: 36, textAnchor: 'middle' });
    r.text(200, 230, app.title, { fill: '#f97316', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Description wrapped
    const words = app.description.split(' ');
    let line = '';
    let lineY = 260;
    words.forEach(word => {
      if ((line + word).length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else {
        line += word + ' ';
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Completion indicator
    if (this.completedApps.has(this.activeAppIndex)) {
      r.text(200, 350, '✓ Explored', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 400, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    // Progress dots
    this.transferApps.forEach((_, i) => {
      const dotX = 175 + i * 18;
      r.circle(dotX, 420, 5, { fill: this.completedApps.has(i) ? '#22c55e' : '#374151' });
    });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take the Test', variant: 'primary' });
    } else {
      r.text(200, 460, `Explore all applications to continue (${this.completedApps.size}/4)`, { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    const question = this.testQuestions[this.currentQuestionIndex];
    const selectedAnswer = this.testAnswers[this.currentQuestionIndex];
    const correctCount = this.testAnswers.filter((a, i) => this.checkAnswer(i, a)).length;

    // Header
    r.text(200, 35, `Question ${this.currentQuestionIndex + 1}/10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(350, 35, `Score: ${correctCount}/${this.testAnswers.filter(a => a !== -1).length}`, { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Progress bar
    r.roundRect(30, 50, 340, 6, 3, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.roundRect(30, 50, 340 * ((this.currentQuestionIndex + 1) / 10), 6, 3, { fill: '#f97316' });

    // Question
    r.roundRect(20, 70, 360, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    const qWords = question.question.split(' ');
    let qLine = '';
    let qY = 95;
    qWords.forEach(word => {
      if ((qLine + word).length > 48) {
        r.text(200, qY, qLine.trim(), { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
        qLine = word + ' ';
        qY += 18;
      } else {
        qLine += word + ' ';
      }
    });
    if (qLine) r.text(200, qY, qLine.trim(), { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    question.options.forEach((option, i) => {
      const y = 165 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showExplanation) {
        if (i === question.correctIndex) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === selectedAnswer) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === selectedAnswer) {
        bgColor = 'rgba(249, 115, 22, 0.3)';
      }

      r.roundRect(20, y, 360, 48, 8, { fill: bgColor });
      r.text(35, y + 28, option.substring(0, 52) + (option.length > 52 ? '...' : ''), { fill: textColor, fontSize: 11 });

      if (!this.showExplanation) {
        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      }
    });

    // Explanation
    if (this.showExplanation) {
      r.roundRect(20, 390, 360, 70, 12, { fill: 'rgba(249, 115, 22, 0.1)' });
      const expText = question.explanation.substring(0, 100);
      r.text(200, 415, expText.substring(0, 55), { fill: '#f97316', fontSize: 10, textAnchor: 'middle' });
      if (expText.length > 55) {
        r.text(200, 435, expText.substring(55), { fill: '#f97316', fontSize: 10, textAnchor: 'middle' });
      }
    }

    // Navigation
    if (this.currentQuestionIndex > 0) {
      r.addButton({ id: 'prev_question', label: '← Back', variant: 'secondary' });
    }

    if (this.currentQuestionIndex < 9) {
      r.addButton({ id: 'next_question', label: 'Next →', variant: 'secondary' });
    } else {
      const allAnswered = !this.testAnswers.includes(-1);
      if (allAnswered) {
        r.addButton({ id: 'complete', label: 'Complete!', variant: 'primary' });
      } else {
        r.text(200, 510, 'Answer all questions', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    const score = this.calculateScore();
    const percentage = Math.round((score / 10) * 100);

    // Trophy badge
    r.circle(200, 100, 50, { fill: 'linear-gradient(135deg, #f59e0b, #f97316)' });
    r.text(200, 110, '✓', { fill: '#ffffff', fontSize: 40, textAnchor: 'middle' });

    // Title
    r.text(200, 175, 'Induction Heating Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Score
    r.text(200, 220, `${percentage}%`, { fill: '#22c55e', fontSize: 42, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 250, `${score}/10 correct answers`, { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    // Key concepts
    r.roundRect(40, 280, 320, 180, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 310, 'Key Concepts Mastered:', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const concepts = [
      'Eddy currents from changing B fields',
      'I²R heating in resistive materials',
      'Material selection for efficiency',
      'Industrial induction applications'
    ];

    concepts.forEach((concept, i) => {
      r.text(70, 345 + i * 28, `✓ ${concept}`, { fill: '#ffffff', fontSize: 11 });
    });

    // Key insight
    r.roundRect(40, 480, 320, 60, 12, { fill: 'rgba(249, 115, 22, 0.15)' });
    r.text(200, 505, 'Key Insight: Heat without contact!', { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 525, 'Oscillating fields → currents → heat (P=I²R)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering induction heating!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      isHeating: this.isHeating,
      panMaterial: this.panMaterial,
      temperature: this.temperature,
      frequency: this.frequency,
      animationTime: this.animationTime,
      twistMaterial: this.twistMaterial,
      testAnswers: this.testAnswers,
      currentQuestionIndex: this.currentQuestionIndex,
      showExplanation: this.showExplanation,
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
    if (state.isHeating !== undefined) this.isHeating = state.isHeating as boolean;
    if (state.panMaterial) this.panMaterial = state.panMaterial as typeof this.panMaterial;
    if (state.temperature !== undefined) this.temperature = state.temperature as number;
    if (state.frequency !== undefined) this.frequency = state.frequency as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.twistMaterial) this.twistMaterial = state.twistMaterial as typeof this.twistMaterial;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showExplanation !== undefined) this.showExplanation = state.showExplanation as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createInductionHeatingGame(sessionId: string): InductionHeatingGame {
  return new InductionHeatingGame(sessionId);
}
