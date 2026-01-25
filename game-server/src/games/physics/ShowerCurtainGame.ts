import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// SHOWER CURTAIN GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Bernoulli's Principle and Air Entrainment
// Fast-moving fluid has lower pressure (P + 0.5ρv² = constant)
// Falling water droplets drag surrounding air (entrainment)
// Creates low-pressure zone inside shower, pulling curtain inward
// Hot showers add thermal convection (rising hot air draws cool air in)
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
const AIR_DENSITY = 1.225; // kg/m³ at sea level
const WATER_DROP_VELOCITY = 5; // m/s average falling speed
const BASE_PRESSURE = 101325; // Pa (atmospheric)

export class ShowerCurtainGame extends BaseGame {
  readonly gameType = 'shower_curtain';
  readonly gameTitle = 'Shower Curtain Effect: The Clingy Curtain';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private waterFlow = 50; // percentage
  private waterTemp = 40; // celsius
  private showPressureField = true;
  private showAirflow = true;
  private animationTime = 0;
  private showerOn = false;
  private hookStep = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "You turn on a hot shower and notice the curtain immediately starts blowing inward toward you.",
      question: "What causes the shower curtain to blow inward?",
      options: [
        "Water droplets push the curtain",
        "Low pressure inside from air entrainment",
        "High pressure building inside",
        "Magnetic force from water"
      ],
      correctIndex: 1,
      explanation: "Falling water droplets drag air molecules with them (entrainment), creating a low-pressure zone inside the shower that pulls the curtain inward."
    },
    {
      scenario: "An engineer is explaining Bernoulli's principle to a student using a shower as an example.",
      question: "Bernoulli's principle states that faster-moving air has:",
      options: [
        "Higher pressure",
        "Lower pressure",
        "The same pressure",
        "Higher temperature"
      ],
      correctIndex: 1,
      explanation: "Bernoulli's principle: P + 0.5ρv² = constant. As velocity increases, pressure must decrease to maintain the constant."
    },
    {
      scenario: "A physicist describes 'entrainment' when explaining fluid dynamics to students.",
      question: "What is 'entrainment' in fluid dynamics?",
      options: [
        "Heating a fluid to increase flow",
        "Moving fluid drags surrounding fluid along",
        "Compressing fluid to increase pressure",
        "Freezing fluid to study its properties"
      ],
      correctIndex: 1,
      explanation: "Entrainment is when a moving fluid (water drops) drags surrounding fluid (air) along with it due to viscous forces."
    },
    {
      scenario: "A researcher tests shower curtain movement with both hot and cold water at the same flow rate.",
      question: "Hot showers cause MORE curtain movement because:",
      options: [
        "Hot water is heavier",
        "Rising hot air creates additional convection currents",
        "Cold curtain attracts heat",
        "Hot water has more pressure"
      ],
      correctIndex: 1,
      explanation: "Hot showers add thermal convection to mechanical entrainment. Rising hot air draws cool air in from below, enhancing the pressure difference."
    },
    {
      scenario: "An engineer is designing a device that uses the same principle as the shower curtain effect.",
      question: "The shower curtain effect is used in which engineering application?",
      options: [
        "Only bathrooms",
        "Venturi tubes and atomizers",
        "Electrical circuits",
        "Building foundations"
      ],
      correctIndex: 1,
      explanation: "Venturi tubes, spray bottles, and atomizers all use entrainment and Bernoulli's principle to create low pressure and draw fluids."
    },
    {
      scenario: "A pedestrian nearly gets pulled toward a passing high-speed train on a platform.",
      question: "Why does a passing truck or train 'suck' you toward it?",
      options: [
        "Magnetic attraction",
        "Low pressure in the vehicle's wake (entrainment)",
        "Gravity increase",
        "Static electricity"
      ],
      correctIndex: 1,
      explanation: "The fast-moving vehicle creates a low-pressure zone in its wake through entrainment, similar to the shower curtain effect."
    },
    {
      scenario: "A student examines how a spray bottle works without any mechanical pump.",
      question: "A spray bottle uses entrainment to:",
      options: [
        "Heat the liquid for better spraying",
        "Mix air into the spray stream",
        "Draw liquid up the tube by low pressure",
        "Change the liquid color"
      ],
      correctIndex: 2,
      explanation: "The fast-moving air stream creates low pressure (Bernoulli), which draws liquid up the tube via entrainment."
    },
    {
      scenario: "A person tests different shower conditions to minimize curtain movement.",
      question: "Which would cause the LEAST shower curtain movement?",
      options: [
        "Hot, high-flow shower",
        "Cold, high-flow shower",
        "Cold, low-flow shower",
        "Hot, low-flow shower"
      ],
      correctIndex: 2,
      explanation: "Low flow reduces entrainment, and cold water eliminates convection. Both factors minimized = least movement."
    },
    {
      scenario: "A CFD (computational fluid dynamics) researcher studies the air patterns inside a shower.",
      question: "A horizontal vortex forms in the shower because:",
      options: [
        "Earth's rotation (Coriolis effect)",
        "Water drops drag air down, which then recirculates",
        "Soap creates swirling patterns",
        "The curtain spins the air"
      ],
      correctIndex: 1,
      explanation: "Air dragged down by water drops must recirculate, creating a horizontal vortex that sustains the low-pressure core."
    },
    {
      scenario: "A person shops for a shower curtain that won't stick to them.",
      question: "Heavy shower curtains with magnets at the bottom help because:",
      options: [
        "They conduct electricity away",
        "Weight and attachment resist the pressure difference",
        "Magnets repel water molecules",
        "They heat up faster"
      ],
      correctIndex: 1,
      explanation: "Added weight increases inertia, and magnets keep the bottom anchored, both resisting the inward force from the pressure differential."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "💨",
      title: "Venturi Effect",
      tagline: "Speed up, pressure down",
      description: "The Venturi effect uses a constriction to speed up fluid flow, creating low pressure that can draw in other fluids or particles.",
      connection: "Same principle as shower curtain: faster flow creates lower pressure, which draws surrounding material inward."
    },
    {
      icon: "🚄",
      title: "Train Platform Safety",
      tagline: "Stand behind the yellow line",
      description: "Fast-moving trains create low-pressure zones that can pull bystanders toward the tracks — entrainment at dangerous scales.",
      connection: "The train's movement entrains surrounding air, creating a pressure differential that pulls objects toward the train's wake."
    },
    {
      icon: "🏥",
      title: "Medical Nebulizers",
      tagline: "Breathing in medicine",
      description: "Nebulizers use the Venturi effect to atomize liquid medications into fine mists that patients can inhale directly into their lungs.",
      connection: "Compressed air creates low pressure via Venturi effect, drawing liquid up and breaking it into tiny droplets."
    },
    {
      icon: "🏭",
      title: "Industrial Jet Mixing",
      tagline: "Stirring without stirrers",
      description: "Industrial processes use jet mixing and entrainment to combine fluids without moving mechanical parts.",
      connection: "High-velocity jets entrain surrounding fluid, creating efficient mixing through the same pressure-driven flow."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate pressure drop due to entrainment
  private calculatePressureDrop(flowRate: number, temperature: number): number {
    // Simplified Bernoulli-based calculation
    // ΔP = 0.5 * ρ * v² (dynamic pressure)
    const velocityFactor = (flowRate / 100) * WATER_DROP_VELOCITY;
    const entrainmentDrop = 0.5 * AIR_DENSITY * velocityFactor * velocityFactor;

    // Add thermal convection effect for hot water
    const convectionFactor = temperature > 30 ? (temperature - 20) * 0.5 : 0;

    return entrainmentDrop + convectionFactor;
  }

  // PROTECTED: Calculate curtain bulge
  private calculateCurtainBulge(flowRate: number, temperature: number): number {
    const flowEffect = flowRate * 0.4;
    const tempEffect = temperature > 30 ? (temperature - 20) * 0.2 : 0;
    const oscillation = Math.sin(this.animationTime * 3) * 2;
    return flowEffect + tempEffect + oscillation;
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
      if (input.id === 'water_flow') {
        this.waterFlow = Math.max(0, Math.min(100, input.value));
      } else if (input.id === 'water_temp') {
        this.waterTemp = Math.max(10, Math.min(50, input.value));
      }
    }
  }

  private handleButtonClick(buttonId: string): void {
    switch (this.phase) {
      case 'hook':
        if (buttonId === 'turn_on_shower') {
          this.showerOn = true;
        } else if (buttonId === 'hook_continue') {
          this.hookStep = 1;
        } else if (buttonId === 'discover') {
          this.phase = 'predict';
        }
        break;

      case 'predict':
        if (!this.showPredictionFeedback) {
          if (buttonId.startsWith('predict_')) {
            this.prediction = buttonId.replace('predict_', '');
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
        }
        break;

      case 'play':
        if (buttonId === 'toggle_pressure') {
          this.showPressureField = !this.showPressureField;
        } else if (buttonId === 'toggle_airflow') {
          this.showAirflow = !this.showAirflow;
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
          if (buttonId.startsWith('twist_')) {
            this.twistPrediction = buttonId.replace('twist_', '');
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
    this.waterFlow = 50;
    this.waterTemp = 40;
    this.showPressureField = true;
    this.showAirflow = true;
    this.showerOn = false;
    this.hookStep = 0;
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
    r.circle(100, 100, 150, { fill: 'rgba(0, 212, 255, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(123, 104, 238, 0.05)' });

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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(0, 212, 255, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#00d4ff', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Clingy Curtain', { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Why shower curtains attack you', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    if (this.hookStep === 0) {
      // Shower visualization
      r.roundRect(50, 200, 300, 200, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

      // Shower head
      r.rect(170, 210, 60, 12, { fill: '#888888' });
      r.ellipse(200, 228, 25, 8, { fill: '#666666' });

      // Water drops if shower is on
      if (this.showerOn) {
        for (let i = 0; i < 12; i++) {
          const x = 175 + (i % 5) * 10;
          const baseY = 240 + (i * 15) % 120;
          const animY = (baseY + this.animationTime * 200) % 120 + 240;
          r.circle(x, animY, 2, { fill: '#60a5fa' });
        }
      }

      // Person silhouette
      r.ellipse(200, 310, 15, 18, { fill: '#555555' });
      r.ellipse(200, 355, 25, 35, { fill: '#555555' });

      // Curtains with bulge
      const bulge = this.showerOn ? this.calculateCurtainBulge(60, 40) : 0;

      // Left curtain
      r.path(`M 70 215 Q ${70 + bulge * 0.8} 280 ${70 + bulge} 340 Q ${70 + bulge * 0.6} 370 70 395`,
        { fill: 'none', stroke: '#ff9999', strokeWidth: 4 });

      // Right curtain
      r.path(`M 330 215 Q ${330 - bulge * 0.8} 280 ${330 - bulge} 340 Q ${330 - bulge * 0.6} 370 330 395`,
        { fill: 'none', stroke: '#ff9999', strokeWidth: 4 });

      // Curtain rod
      r.line(50, 215, 350, 215, { stroke: '#666666', strokeWidth: 4 });

      // Instruction text
      r.text(200, 430, this.showerOn ? 'The curtain blows inward!' : 'Turn on the shower to see what happens',
        { fill: this.showerOn ? '#ff6b6b' : '#94a3b8', fontSize: 14, textAnchor: 'middle' });

      if (!this.showerOn) {
        r.addButton({ id: 'turn_on_shower', label: 'Turn On Shower', variant: 'primary' });
      } else {
        r.addButton({ id: 'hook_continue', label: 'Continue', variant: 'primary' });
      }
    } else {
      // Hook step 1 - explanation
      r.roundRect(40, 200, 320, 200, 16, { fill: 'rgba(30, 41, 59, 0.8)' });

      r.text(200, 240, 'Why does the curtain blow INWARD?', { fill: '#00d4ff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 280, "You'd expect it to blow outward", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
      r.text(200, 300, 'from the spray, but it does the opposite!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

      r.roundRect(50, 330, 300, 50, 10, { fill: 'rgba(0, 212, 255, 0.1)' });
      r.text(200, 360, 'The answer involves air pressure', { fill: '#22d3ee', fontSize: 13, textAnchor: 'middle' });

      r.addButton({ id: 'discover', label: 'Discover the Physics', variant: 'primary' });
    }

    r.setCoachMessage('Explore how entrainment and Bernoulli\'s principle create the shower curtain effect!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 100, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'The curtain blows inward, meaning', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'pressure is lower inside than outside.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 175, 'What PRIMARILY causes this?', { fill: '#00d4ff', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'entrainment', label: 'Entrainment - water drags air down', correct: true },
      { id: 'hot', label: 'Hot air rising creates suction' },
      { id: 'push', label: 'Water spray pushes air out' },
      { id: 'static', label: 'Static electricity attraction' }
    ];

    options.forEach((option, i) => {
      const y = 200 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (option.correct) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (option.id === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (option.id === this.prediction) {
        bgColor = 'rgba(0, 212, 255, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, option.label, { fill: textColor, fontSize: 13 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `predict_${option.id}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 460, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const isCorrect = this.prediction === 'entrainment';
      const message = isCorrect ? 'Correct! Entrainment is the primary cause!' : 'Entrainment is the primary driver!';
      r.text(200, 490, message, { fill: isCorrect ? '#34d399' : '#00d4ff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 520, 'Falling water drags air molecules down,', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 540, 'creating low pressure inside.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Simulation', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Shower Simulator', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization area
    r.roundRect(20, 80, 360, 260, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    const bulge = this.calculateCurtainBulge(this.waterFlow, this.waterTemp);

    // Shower enclosure
    r.rect(80, 100, 240, 200, { fill: 'rgba(26, 58, 92, 0.3)' });

    // Pressure fields
    if (this.showPressureField && this.waterFlow > 0) {
      // Low pressure inside
      r.ellipse(200, 200, 60 + bulge, 70, { fill: 'rgba(34, 211, 238, 0.15)' });
      r.text(200, 200, 'Low P', { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });

      // High pressure outside
      r.ellipse(50, 200, 30, 40, { fill: 'rgba(249, 115, 22, 0.15)' });
      r.ellipse(350, 200, 30, 40, { fill: 'rgba(249, 115, 22, 0.15)' });
    }

    // Shower head
    r.rect(170, 105, 60, 12, { fill: '#888888' });
    r.ellipse(200, 122, 25, 8, { fill: '#666666' });

    // Water droplets
    if (this.waterFlow > 0) {
      const dropCount = Math.floor(this.waterFlow / 8);
      for (let i = 0; i < dropCount; i++) {
        const x = 175 + (i % 5) * 10;
        const baseY = 130 + (i * 15) % 130;
        const animY = (baseY + this.animationTime * 200) % 130 + 130;
        const dropColor = this.waterTemp > 40 ? '#ff9999' : '#60a5fa';
        r.circle(x, animY, 1.5, { fill: dropColor });
      }
    }

    // Air flow arrows
    if (this.showAirflow && this.waterFlow > 0) {
      for (let i = 0; i < 3; i++) {
        const x = 165 + i * 35;
        r.line(x, 140, x, 240, { stroke: '#00d4ff', strokeWidth: 1.5, strokeDasharray: '5,3' });
      }
      r.text(200, 265, 'Air dragged down', { fill: '#00d4ff', fontSize: 9, textAnchor: 'middle' });
    }

    // Curtains
    r.path(`M 80 115 Q ${80 + bulge * 0.8} 170 ${80 + bulge} 220 Q ${80 + bulge * 0.6} 270 80 295`,
      { fill: 'none', stroke: '#ff9999', strokeWidth: 4 });
    r.path(`M 320 115 Q ${320 - bulge * 0.8} 170 ${320 - bulge} 220 Q ${320 - bulge * 0.6} 270 320 295`,
      { fill: 'none', stroke: '#ff9999', strokeWidth: 4 });

    // Curtain rod
    r.line(70, 115, 330, 115, { stroke: '#666666', strokeWidth: 4 });

    // Effect indicators
    const flowEffect = (this.waterFlow * 0.4).toFixed(1);
    const tempEffect = (this.waterTemp > 30 ? (this.waterTemp - 20) * 0.2 : 0).toFixed(1);
    r.text(350, 100, `Flow: ${flowEffect}`, { fill: '#00d4ff', fontSize: 9 });
    r.text(350, 115, `Temp: ${tempEffect}`, { fill: '#ff6b6b', fontSize: 9 });

    // Sliders
    r.addSlider({
      id: 'water_flow',
      label: 'Water Flow (%)',
      min: 0,
      max: 100,
      step: 5,
      value: this.waterFlow
    });

    r.addSlider({
      id: 'water_temp',
      label: 'Temperature (°C)',
      min: 10,
      max: 50,
      step: 2,
      value: this.waterTemp
    });

    // Toggle buttons
    r.addButton({ id: 'toggle_pressure', label: this.showPressureField ? '✓ Pressure Field' : '○ Pressure Field', variant: 'secondary' });
    r.addButton({ id: 'toggle_airflow', label: this.showAirflow ? '✓ Air Flow' : '○ Air Flow', variant: 'secondary' });

    // Key insight
    r.roundRect(30, 500, 340, 60, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 525, 'Entrainment + Convection = Low Pressure', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 545, 'Higher flow = more entrainment | Higher temp = more convection', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    if (this.waterFlow >= 30) {
      r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'primary' });
    }
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'Entrainment Physics', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Physics concepts
    const concepts = [
      { title: "Bernoulli's Principle", text: 'Fast-moving fluid = lower pressure', color: '#00d4ff', icon: '⚡' },
      { title: 'Entrainment', text: 'Moving fluid drags surrounding fluid', color: '#10b981', icon: '↓' },
      { title: 'Horizontal Vortex', text: 'Dragged air recirculates, sustaining low P', color: '#7b68ee', icon: '🌀' },
      { title: 'Thermal Convection', text: 'Hot air rises, drawing cool air in', color: '#ff6b6b', icon: '🔥' }
    ];

    concepts.forEach((concept, i) => {
      const y = 90 + i * 85;
      r.roundRect(30, y, 340, 75, 12, { fill: `${concept.color}15` });
      r.text(55, y + 25, concept.icon, { fill: concept.color, fontSize: 20 });
      r.text(85, y + 28, concept.title, { fill: concept.color, fontSize: 14, fontWeight: 'bold' });
      r.text(85, y + 52, concept.text, { fill: '#94a3b8', fontSize: 12 });
    });

    // The formula
    r.roundRect(30, 435, 340, 80, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 460, "Bernoulli's Equation", { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 490, 'P + ½ρv² = constant', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Temperature Effect', variant: 'primary' });

    r.setCoachMessage('Now let\'s see how temperature affects the phenomenon...');
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'Cold vs Hot Shower', { fill: '#a855f7', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 90, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 120, 'You test with same flow rate:', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 145, 'Cold (15°C) vs Hot (45°C)', { fill: '#a855f7', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Visual comparison
    r.roundRect(40, 185, 140, 80, 10, { fill: 'rgba(26, 58, 92, 0.5)' });
    r.text(110, 210, '❄️', { fontSize: 24, textAnchor: 'middle' });
    r.text(110, 245, 'Cold (15°C)', { fill: '#00d4ff', fontSize: 12, textAnchor: 'middle' });

    r.roundRect(220, 185, 140, 80, 10, { fill: 'rgba(92, 26, 26, 0.5)' });
    r.text(290, 210, '🔥', { fontSize: 24, textAnchor: 'middle' });
    r.text(290, 245, 'Hot (45°C)', { fill: '#ff6b6b', fontSize: 12, textAnchor: 'middle' });

    r.text(200, 290, 'Which causes MORE curtain movement?', { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'hot', label: 'Hot - convection adds to entrainment', correct: true, color: '#ff6b6b' },
      { id: 'cold', label: 'Cold - denser air creates more pressure', color: '#00d4ff' },
      { id: 'same', label: 'Same - only flow matters', color: '#94a3b8' }
    ];

    options.forEach((option, i) => {
      const y = 320 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (option.correct) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (option.id === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (option.id === this.twistPrediction) {
        bgColor = `${option.color}30`;
      }

      r.roundRect(30, y, 340, 45, 10, { fill: bgColor });
      r.text(50, y + 28, option.label, { fill: textColor, fontSize: 13 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `twist_${option.id}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 500, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const isCorrect = this.twistPrediction === 'hot';
      r.text(200, 525, isCorrect ? 'Correct! Hot showers cause more movement!' : 'Hot showers actually cause more movement!',
        { fill: isCorrect ? '#34d399' : '#00d4ff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 555, 'Rising hot air adds convection to entrainment', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Comparison', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Temperature Comparison', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Cold shower visualization
    r.roundRect(25, 90, 170, 220, 12, { fill: 'rgba(26, 58, 92, 0.3)' });
    r.text(110, 115, 'Cold (15°C)', { fill: '#00d4ff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Cold curtains (less bulge)
    const coldBulge = 15;
    r.path(`M 40 140 Q ${40 + coldBulge * 0.8} 180 ${40 + coldBulge} 230 Q ${40 + coldBulge * 0.6} 270 40 290`,
      { fill: 'none', stroke: '#ff9999', strokeWidth: 3 });
    r.path(`M 180 140 Q ${180 - coldBulge * 0.8} 180 ${180 - coldBulge} 230 Q ${180 - coldBulge * 0.6} 270 180 290`,
      { fill: 'none', stroke: '#ff9999', strokeWidth: 3 });

    r.text(110, 310, 'MODERATE', { fill: '#00d4ff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 328, 'Entrainment only', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Hot shower visualization
    r.roundRect(205, 90, 170, 220, 12, { fill: 'rgba(92, 26, 26, 0.3)' });
    r.text(290, 115, 'Hot (45°C)', { fill: '#ff6b6b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Hot curtains (more bulge)
    const hotBulge = 30;
    r.path(`M 220 140 Q ${220 + hotBulge * 0.8} 180 ${220 + hotBulge} 230 Q ${220 + hotBulge * 0.6} 270 220 290`,
      { fill: 'none', stroke: '#ff9999', strokeWidth: 3 });
    r.path(`M 360 140 Q ${360 - hotBulge * 0.8} 180 ${360 - hotBulge} 230 Q ${360 - hotBulge * 0.6} 270 360 290`,
      { fill: 'none', stroke: '#ff9999', strokeWidth: 3 });

    // Rising hot air indicator
    r.text(290, 130, '↑', { fill: '#ff6b6b', fontSize: 16 });

    r.text(290, 310, 'HIGH', { fill: '#ff6b6b', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 328, 'Entrainment + Convection', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Explanation
    r.roundRect(30, 350, 340, 120, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 380, 'Why Hot = More Movement', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 410, 'Cold: Water drags air down (entrainment)', { fill: '#00d4ff', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 435, 'Hot: Entrainment + rising hot air pulls', { fill: '#ff6b6b', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 455, 'cool air in from sides (convection)', { fill: '#ff6b6b', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Solutions', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Beating the Clingy Curtain', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const solutions = [
      { icon: '⚖️', title: 'Weighted Curtains', text: 'Mass resists the pressure force', color: '#10b981' },
      { icon: '↪️', title: 'Curved Rods', text: 'More clearance before reaching you', color: '#00d4ff' },
      { icon: '❄️', title: 'Cooler Water', text: 'Reduces convection (not comfortable!)', color: '#7b68ee' },
      { icon: '🪟', title: 'Glass Doors', text: 'Rigid walls don\'t flex with pressure', color: '#fbbf24' }
    ];

    solutions.forEach((sol, i) => {
      const y = 90 + i * 90;
      r.roundRect(30, y, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(55, y + 28, sol.icon, { fontSize: 24 });
      r.text(90, y + 30, sol.title, { fill: sol.color, fontSize: 14, fontWeight: 'bold' });
      r.text(90, y + 55, sol.text, { fill: '#94a3b8', fontSize: 12 });
    });

    // Key takeaway
    r.roundRect(30, 460, 340, 70, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(60, 490, '💡', { fontSize: 20 });
    r.text(200, 490, 'Add weight, increase clearance, or use', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 510, 'rigid materials to resist the pressure differential', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

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
      if (isActive) bgColor = '#0891b2';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 75, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 103, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 135, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 170, app.title, { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 195, app.tagline, { fill: '#22d3ee', fontSize: 12, textAnchor: 'middle' });

    // Description (wrapped)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 225;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Physics connection
    r.roundRect(40, 320, 320, 70, 10, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 345, 'Physics Connection', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 370, app.connection.substring(0, 50) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 420, '✓ Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 455, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Continue button
    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 50, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 75, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Scenario
      r.roundRect(25, 95, 350, 75, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
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
      r.text(200, 195, question.question, { fill: '#22d3ee', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 220 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(6, 182, 212, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${option.substring(0, 42)}${option.length > 42 ? '...' : ''}`,
          { fill: isSelected ? '#22d3ee' : '#e2e8f0', fontSize: 11 });

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
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? 'Excellent! You understand entrainment!' : 'Keep studying! Review and try again.',
        { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 160, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        "Bernoulli's Principle: P + ½ρv² = const",
        'Entrainment and air drag',
        'Thermal convection effects',
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
    r.text(200, 120, '🚿🎓', { fontSize: 64, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Entrainment Expert!', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand why shower curtains', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'misbehave and how to beat them!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '⚡', label: "Bernoulli's Principle" },
      { icon: '↓', label: 'Air Entrainment' },
      { icon: '🔥', label: 'Thermal Convection' },
      { icon: '💨', label: 'Venturi Effect' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 295 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 460, 300, 70, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 488, 'Key Formula', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 515, 'P + ½ρv² = constant', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('You\'ll never look at a shower curtain the same way again!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      waterFlow: this.waterFlow,
      waterTemp: this.waterTemp,
      showPressureField: this.showPressureField,
      showAirflow: this.showAirflow,
      animationTime: this.animationTime,
      showerOn: this.showerOn,
      hookStep: this.hookStep,
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
    if (state.waterFlow !== undefined) this.waterFlow = state.waterFlow as number;
    if (state.waterTemp !== undefined) this.waterTemp = state.waterTemp as number;
    if (state.showPressureField !== undefined) this.showPressureField = state.showPressureField as boolean;
    if (state.showAirflow !== undefined) this.showAirflow = state.showAirflow as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.showerOn !== undefined) this.showerOn = state.showerOn as boolean;
    if (state.hookStep !== undefined) this.hookStep = state.hookStep as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createShowerCurtainGame(sessionId: string): ShowerCurtainGame {
  return new ShowerCurtainGame(sessionId);
}
