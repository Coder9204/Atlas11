import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// LAMINAR VS TURBULENT FLOW GAME - SERVER-SIDE FLUID DYNAMICS
// ============================================================================
// Physics: Reynolds Number Re = (rho * v * D) / mu
// Re < 2300: Laminar flow (smooth, parallel layers)
// Re > 4000: Turbulent flow (chaotic, mixing vortices)
// 2300 < Re < 4000: Transitional regime
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
const WATER_DENSITY = 1000; // kg/m^3
const WATER_VISCOSITY = 0.001; // Pa.s (at 20C)
const AIR_DENSITY = 1.225; // kg/m^3
const AIR_VISCOSITY = 0.0000181; // Pa.s
const LAMINAR_THRESHOLD = 2300;
const TURBULENT_THRESHOLD = 4000;

export class LaminarTurbulentGame extends BaseGame {
  readonly gameType = 'laminar_turbulent';
  readonly gameTitle = 'Laminar vs Turbulent Flow';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private velocity = 0.5; // m/s
  private pipeDiameter = 0.02; // m (20mm)
  private fluidType: 'water' | 'oil' | 'air' = 'water';
  private showStreamlines = true;
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
      scenario: "A chemical engineer is designing a pipe system for transporting crude oil (density 850 kg/m^3, viscosity 0.1 Pa.s) at 2 m/s through a 0.1m diameter pipe.",
      question: "Calculate the Reynolds number and determine the flow regime.",
      options: [
        "Re = 1700, Laminar flow - oil flows smoothly in layers",
        "Re = 17000, Turbulent flow - oil mixes chaotically",
        "Re = 170, Laminar flow - very slow and ordered",
        "Re = 4000, Transitional - borderline regime"
      ],
      correctIndex: 0,
      explanation: "Re = (rho x v x D) / mu = (850 x 2 x 0.1) / 0.1 = 1700. Since Re < 2300, this is laminar flow. Oil's high viscosity keeps flow organized."
    },
    {
      scenario: "A cardiologist is studying blood flow in a coronary artery (diameter 3mm) where blood (density 1060 kg/m^3, viscosity 0.004 Pa.s) flows at 0.3 m/s.",
      question: "Is the blood flow in this healthy artery laminar or turbulent?",
      options: [
        "Laminar (Re ~ 240) - smooth flow delivers oxygen efficiently",
        "Turbulent (Re ~ 2400) - chaotic mixing improves delivery",
        "Transitional (Re ~ 4000) - borderline behavior",
        "Cannot determine without more information"
      ],
      correctIndex: 0,
      explanation: "Re = (1060 x 0.3 x 0.003) / 0.004 = 238.5. Healthy arterial flow is laminar (Re < 2300), reducing wear on vessel walls and ensuring efficient oxygen delivery."
    },
    {
      scenario: "An aerospace engineer is analyzing airflow over a wing at Mach 0.8 (272 m/s). The wing chord is 2m and air properties are standard at altitude.",
      question: "With Re ~ 30 million, what flow characteristics dominate?",
      options: [
        "Fully turbulent boundary layer with intense mixing",
        "Laminar flow for most of the wing surface",
        "Flow remains attached and smooth everywhere",
        "Reynolds number is irrelevant at high speeds"
      ],
      correctIndex: 0,
      explanation: "At Re ~ 30 million, flow is highly turbulent. Turbulent boundary layers provide better mixing of momentum, which can help delay flow separation but increases drag."
    },
    {
      scenario: "A plumber notices that when a faucet is barely open, water flows smoothly like glass. When fully open, it becomes chaotic and splashy.",
      question: "What fundamental property change causes this transition?",
      options: [
        "Increased velocity raises Re above the critical threshold",
        "Water pressure makes molecules more active",
        "Pipe vibrations cause the turbulence",
        "Air mixing into the water stream"
      ],
      correctIndex: 0,
      explanation: "As velocity increases, the Reynolds number rises. When Re exceeds ~2300, inertial forces overcome viscous forces, causing the flow to transition from laminar to turbulent."
    },
    {
      scenario: "A heat exchanger designer must choose between laminar and turbulent flow regimes for cooling a processor.",
      question: "Why might turbulent flow be preferred despite higher pumping costs?",
      options: [
        "Turbulent mixing greatly enhances heat transfer rates",
        "Laminar flow causes pipe corrosion",
        "Turbulent flow uses less coolant volume",
        "Processors only work with turbulent cooling"
      ],
      correctIndex: 0,
      explanation: "Turbulent flow creates intense mixing that breaks up thermal boundary layers, dramatically increasing convective heat transfer coefficients (often 2-10x compared to laminar)."
    },
    {
      scenario: "An oil pipeline engineer wants to reduce pumping power costs for transporting crude oil 1000km.",
      question: "Why is maintaining laminar flow advantageous for long pipelines?",
      options: [
        "Laminar flow has much lower friction losses (pressure drop)",
        "Turbulent flow corrodes pipes faster",
        "Laminar flow moves oil faster",
        "There's no difference in energy consumption"
      ],
      correctIndex: 0,
      explanation: "In laminar flow, pressure drop is proportional to velocity (Hagen-Poiseuille). In turbulent flow, it's proportional to v^2. Laminar flow minimizes pumping energy for viscous fluids."
    },
    {
      scenario: "A sports scientist studies why golf balls have dimples. Smooth balls experience a drag crisis around Re ~ 300,000.",
      question: "How do dimples affect the flow regime and drag?",
      options: [
        "Dimples trigger early turbulence, delaying flow separation",
        "Dimples create laminar flow around the ball",
        "Dimples have no effect on Reynolds number",
        "Dimples only affect spin, not flow"
      ],
      correctIndex: 0,
      explanation: "Dimples trip the boundary layer to turbulent earlier. Turbulent boundary layers have more momentum near the surface, delaying separation and reducing pressure drag dramatically."
    },
    {
      scenario: "A submarine designer needs to minimize drag for a torpedo-shaped vehicle moving at 20 knots underwater.",
      question: "What flow consideration is most important for the hull design?",
      options: [
        "Maintaining attached turbulent boundary layer to prevent separation",
        "Achieving laminar flow over the entire hull",
        "Creating maximum turbulence for propulsion",
        "Flow regime doesn't matter for submerged vehicles"
      ],
      correctIndex: 0,
      explanation: "At high Re (typical for submarines), flow will be turbulent. The key is shaping the hull so the turbulent boundary layer stays attached, preventing the large pressure drag of separation."
    },
    {
      scenario: "A microfluidics engineer designs channels only 50 micrometers wide for lab-on-a-chip devices processing blood samples.",
      question: "Why is flow almost always laminar in microfluidic devices?",
      options: [
        "Very small D makes Re extremely low even at high velocities",
        "Blood is too thick to flow turbulently",
        "Microchips prevent turbulence electronically",
        "Flow is turbulent but appears smooth at small scales"
      ],
      correctIndex: 0,
      explanation: "Re = rho*v*D/mu. With D ~ 50um, even at v = 1 m/s with water, Re ~ 50, far below transition. Microfluidics operates almost exclusively in the laminar regime."
    },
    {
      scenario: "An HVAC engineer notices that smoke from incense rises smoothly for the first 10cm, then breaks into swirling patterns.",
      question: "What causes this laminar-to-turbulent transition in the rising smoke?",
      options: [
        "Buoyancy accelerates flow until Re exceeds critical value",
        "Air conditioning creates wind currents",
        "Chemical reactions in burning incense",
        "Smoke particles collide and scatter"
      ],
      correctIndex: 0,
      explanation: "Hot smoke rises due to buoyancy, accelerating as it goes. Initially slow (low Re, laminar), but as velocity increases, Re exceeds ~2300 and instabilities grow into turbulence."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "heart",
      title: "Cardiovascular Health",
      tagline: "Your heart prefers laminar flow",
      description: "Healthy arteries maintain laminar flow (Re < 2300). Plaque buildup narrows vessels, accelerating blood and triggering turbulence that damages artery walls.",
      connection: "Doctors use ultrasound to detect turbulent flow sounds (bruits) as early warning signs of cardiovascular disease. The transition from laminar to turbulent flow in arteries is a key diagnostic indicator."
    },
    {
      icon: "plane",
      title: "Aircraft Wing Design",
      tagline: "Managing boundary layers at 900 km/h",
      description: "Aircraft wings operate at extremely high Reynolds numbers (millions). Engineers carefully design wing shapes to control where turbulent transition occurs to balance lift and drag.",
      connection: "Modern laminar flow airfoils can achieve 10-15% drag reduction by maintaining smooth flow over more of the wing surface, significantly improving fuel efficiency."
    },
    {
      icon: "pipeline",
      title: "Oil Pipeline Transport",
      tagline: "Pumping billions of barrels efficiently",
      description: "The Trans-Alaska Pipeline transports crude oil 1,300 km. Maintaining laminar flow in viscous oil reduces pumping costs by orders of magnitude compared to turbulent regime.",
      connection: "Pipeline engineers add drag-reducing polymers that suppress turbulence, allowing higher flow rates with the same pumping power - a direct application of Re manipulation."
    },
    {
      icon: "swimming",
      title: "Competitive Swimming",
      tagline: "Milliseconds matter in Olympic pools",
      description: "Swimmers create complex flows around their bodies. Specialized swimsuits and shaved bodies reduce turbulent boundary layer thickness, minimizing form drag.",
      connection: "The dimpled texture of some racing suits intentionally triggers turbulence in specific locations to keep the boundary layer attached longer, reducing overall drag like a golf ball."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate Reynolds number
  private calculateReynoldsNumber(): number {
    let density: number;
    let viscosity: number;

    if (this.fluidType === 'water') {
      density = WATER_DENSITY;
      viscosity = WATER_VISCOSITY;
    } else if (this.fluidType === 'oil') {
      density = 850; // crude oil
      viscosity = 0.1; // much more viscous
    } else {
      density = AIR_DENSITY;
      viscosity = AIR_VISCOSITY;
    }

    return (density * this.velocity * this.pipeDiameter) / viscosity;
  }

  // PROTECTED: Determine flow regime
  private getFlowRegime(): 'laminar' | 'transitional' | 'turbulent' {
    const re = this.calculateReynoldsNumber();
    if (re < LAMINAR_THRESHOLD) return 'laminar';
    if (re > TURBULENT_THRESHOLD) return 'turbulent';
    return 'transitional';
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
      if (input.id === 'velocity') {
        this.velocity = Math.max(0.1, Math.min(5, input.value));
      } else if (input.id === 'diameter') {
        this.pipeDiameter = Math.max(0.005, Math.min(0.1, input.value));
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
        if (buttonId === 'toggle_streamlines') {
          this.showStreamlines = !this.showStreamlines;
        } else if (buttonId === 'fluid_water') {
          this.fluidType = 'water';
        } else if (buttonId === 'fluid_oil') {
          this.fluidType = 'oil';
        } else if (buttonId === 'fluid_air') {
          this.fluidType = 'air';
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
    this.velocity = 0.5;
    this.pipeDiameter = 0.02;
    this.fluidType = 'water';
    this.showStreamlines = true;
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
    r.circle(100, 100, 150, { fill: 'rgba(59, 130, 246, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(14, 165, 233, 0.05)' });

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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(59, 130, 246, 0.1)' });
    r.text(200, 80, 'FLUID DYNAMICS', { fill: '#60a5fa', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'Laminar vs Turbulent', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Two fundamentally different ways fluids flow', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Visual comparison
    r.roundRect(40, 190, 320, 180, 16, { fill: 'rgba(30, 41, 59, 0.8)' });

    // Laminar side
    r.roundRect(55, 210, 130, 80, 10, { fill: 'rgba(34, 197, 94, 0.2)' });
    r.text(120, 235, 'Laminar', { fill: '#4ade80', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    // Smooth parallel lines
    for (let i = 0; i < 4; i++) {
      r.line(65, 255 + i * 10, 175, 255 + i * 10, { stroke: '#4ade80', strokeWidth: 2 });
    }

    // Turbulent side
    r.roundRect(215, 210, 130, 80, 10, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(280, 235, 'Turbulent', { fill: '#f87171', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    // Chaotic wavy lines
    const t = this.animationTime;
    for (let i = 0; i < 4; i++) {
      const y = 255 + i * 10;
      const amp = 4 + Math.sin(t * 2 + i) * 2;
      r.line(225, y, 335, y + Math.sin(t * 3 + i) * amp, { stroke: '#f87171', strokeWidth: 2 });
    }

    r.text(200, 320, 'Same fluid, same pipe', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 340, "What determines which flow you get?", { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Fun fact
    r.roundRect(40, 390, 320, 80, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 420, 'Reynolds discovered this in 1883', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 445, 'using dye in a glass tube!', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Explore Flow Regimes', variant: 'primary' });

    r.setCoachMessage('Discover the physics that governs all fluid motion!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 55, 'Make Your Prediction', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 85, 340, 110, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 115, 'You turn on a faucet very slowly.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 135, 'The water stream is smooth and glassy.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 155, 'You gradually open it more and more...', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 180, 'What happens to the flow pattern?', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Stays smooth - water always flows the same way',
      'Becomes chaotic/splashy - turbulence develops',
      'Gets narrower but stays smooth',
      'Pulses on and off rhythmically'
    ];

    options.forEach((option, i) => {
      const y = 205 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (i === 1) { // Correct answer
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.prediction) {
        bgColor = 'rgba(59, 130, 246, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 440, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Exactly right! Flow transitions from laminar to turbulent.' : 'Not quite. Higher velocity triggers a fundamental change!';
      r.text(200, 470, message, { fill: this.prediction === 1 ? '#34d399' : '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 500, 'The Reynolds number determines this transition.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 520, 'Re = rho * v * D / mu', { fill: '#60a5fa', fontSize: 13, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Explore the Transition', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 45, 'Flow Regime Explorer', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    const re = this.calculateReynoldsNumber();
    const regime = this.getFlowRegime();

    // Pipe visualization
    r.roundRect(20, 70, 360, 150, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Pipe walls
    r.roundRect(40, 100, 320, 80, 8, { fill: 'rgba(51, 65, 85, 0.8)', stroke: '#64748b', strokeWidth: 2 });

    // Flow visualization based on regime
    if (this.showStreamlines) {
      const numLines = 6;
      for (let i = 0; i < numLines; i++) {
        const y = 115 + (i / (numLines - 1)) * 50;
        const speed = this.velocity * (1 - Math.pow((i - numLines / 2) / (numLines / 2), 2) * 0.5);

        if (regime === 'laminar') {
          // Smooth parabolic flow profile
          const offset = (this.animationTime * speed * 100) % 60;
          for (let x = 50 + offset; x < 350; x += 60) {
            r.circle(x, y, 4, { fill: '#4ade80' });
          }
        } else if (regime === 'turbulent') {
          // Chaotic particles
          const offset = (this.animationTime * speed * 80) % 40;
          for (let x = 50 + offset; x < 350; x += 40) {
            const yJitter = Math.sin(this.animationTime * 5 + x * 0.1 + i) * 8;
            r.circle(x, y + yJitter, 4, { fill: '#f87171' });
          }
        } else {
          // Transitional - some order, some chaos
          const offset = (this.animationTime * speed * 90) % 50;
          for (let x = 50 + offset; x < 350; x += 50) {
            const yJitter = Math.sin(this.animationTime * 3 + x * 0.05 + i) * 4;
            r.circle(x, y + yJitter, 4, { fill: '#fbbf24' });
          }
        }
      }
    }

    // Reynolds number display
    r.roundRect(100, 185, 200, 35, 8, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 208, `Re = ${re.toFixed(0)}`, { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Regime indicator
    const regimeColor = regime === 'laminar' ? '#4ade80' : regime === 'turbulent' ? '#f87171' : '#fbbf24';
    r.roundRect(130, 230, 140, 30, 8, { fill: regimeColor });
    r.text(200, 250, regime.toUpperCase(), { fill: '#000000', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Threshold indicators
    r.text(200, 280, `Laminar: Re < 2300 | Turbulent: Re > 4000`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Controls
    r.addSlider({ id: 'velocity', label: 'Velocity (m/s)', min: 0.1, max: 5, step: 0.1, value: this.velocity });
    r.addSlider({ id: 'diameter', label: 'Pipe Diameter (m)', min: 0.005, max: 0.1, step: 0.005, value: this.pipeDiameter });

    // Fluid type buttons
    r.text(200, 380, 'Fluid Type:', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    const fluids = [
      { id: 'water', label: 'Water', x: 80 },
      { id: 'oil', label: 'Oil', x: 200 },
      { id: 'air', label: 'Air', x: 320 }
    ];
    fluids.forEach(f => {
      const isSelected = this.fluidType === f.id;
      r.roundRect(f.x - 40, 395, 80, 30, 8, { fill: isSelected ? '#3b82f6' : 'rgba(51, 65, 85, 0.5)' });
      r.text(f.x, 415, f.label, { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });
      r.addButton({ id: `fluid_${f.id}`, label: '', variant: 'secondary' });
    });

    r.addButton({ id: 'toggle_streamlines', label: this.showStreamlines ? 'Hide Flow' : 'Show Flow', variant: 'secondary' });
    r.addButton({ id: 'continue', label: 'Learn the Physics', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 50, 'The Reynolds Number', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Main equation
    r.roundRect(50, 75, 300, 70, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 100, 'Re = rho * v * D / mu', { fill: '#60a5fa', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 128, 'Inertial Forces / Viscous Forces', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Variable explanations
    r.roundRect(30, 160, 340, 120, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    const vars = [
      { sym: 'rho', desc: 'Fluid density (kg/m^3)', color: '#22d3ee' },
      { sym: 'v', desc: 'Flow velocity (m/s)', color: '#4ade80' },
      { sym: 'D', desc: 'Characteristic length (m)', color: '#fbbf24' },
      { sym: 'mu', desc: 'Dynamic viscosity (Pa.s)', color: '#f472b6' }
    ];
    vars.forEach((v, i) => {
      const y = 185 + i * 22;
      r.text(60, y, v.sym, { fill: v.color, fontSize: 14, fontWeight: 'bold' });
      r.text(100, y, '=', { fill: '#94a3b8', fontSize: 12 });
      r.text(120, y, v.desc, { fill: '#cbd5e1', fontSize: 11 });
    });

    // Flow regimes
    r.roundRect(30, 295, 340, 130, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 320, 'Flow Regimes', { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    const regimes = [
      { name: 'Laminar', range: 'Re < 2300', desc: 'Smooth, parallel layers', color: '#4ade80' },
      { name: 'Transitional', range: '2300 < Re < 4000', desc: 'Unstable, intermittent', color: '#fbbf24' },
      { name: 'Turbulent', range: 'Re > 4000', desc: 'Chaotic, mixing vortices', color: '#f87171' }
    ];
    regimes.forEach((reg, i) => {
      const y = 350 + i * 22;
      r.text(60, y, reg.name, { fill: reg.color, fontSize: 12, fontWeight: 'bold' });
      r.text(160, y, reg.range, { fill: '#94a3b8', fontSize: 11 });
      r.text(290, y, reg.desc, { fill: '#cbd5e1', fontSize: 10 });
    });

    // Physical interpretation
    r.roundRect(30, 440, 340, 70, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 465, 'Physical Meaning', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 490, 'High Re = Inertia wins -> Turbulence', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore the Twist', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'Challenge: Unexpected Behavior', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 85, 340, 120, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 110, 'A golf ball and a smooth sphere of the', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 130, 'same size are hit at the same speed.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 150, 'The dimpled golf ball travels FARTHER.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 175, 'How can adding roughness reduce drag?', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Dimples trap air, creating a cushion',
      'Dimples cause early turbulence that delays separation',
      'Dimples make the ball spin faster',
      'Dimples reduce the ball\'s mass'
    ];

    options.forEach((option, i) => {
      const y = 215 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (i === 1) { // Correct answer
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.twistPrediction) {
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 450, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 1 ? 'Brilliant! This is the boundary layer effect!' : 'The answer involves controlling WHERE turbulence happens.';
      r.text(200, 480, message, { fill: this.twistPrediction === 1 ? '#34d399' : '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 510, 'Turbulent boundary layers stay attached longer,', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 530, 'reducing pressure drag dramatically!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See the Physics', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Boundary Layer Separation', { fill: '#fbbf24', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Smooth ball visualization
    r.roundRect(25, 80, 170, 150, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(110, 105, 'Smooth Ball', { fill: '#f87171', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.circle(110, 160, 35, { fill: 'rgba(100, 116, 139, 0.5)', stroke: '#94a3b8', strokeWidth: 2 });
    // Early separation wake
    r.arc(145, 160, 50, -0.6, 0.6, { fill: 'rgba(239, 68, 68, 0.3)' });
    r.text(110, 210, 'Early separation', { fill: '#f87171', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 225, 'Large wake = high drag', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Dimpled ball visualization
    r.roundRect(205, 80, 170, 150, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(290, 105, 'Dimpled Ball', { fill: '#4ade80', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.circle(290, 160, 35, { fill: 'rgba(100, 116, 139, 0.5)', stroke: '#94a3b8', strokeWidth: 2 });
    // Add dimple indicators
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dx = Math.cos(angle) * 25;
      const dy = Math.sin(angle) * 25;
      r.circle(290 + dx, 160 + dy, 4, { fill: '#64748b' });
    }
    // Delayed separation - smaller wake
    r.arc(325, 160, 25, -0.3, 0.3, { fill: 'rgba(74, 222, 128, 0.3)' });
    r.text(290, 210, 'Delayed separation', { fill: '#4ade80', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 225, 'Small wake = low drag', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Explanation
    r.roundRect(25, 245, 350, 140, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
    r.text(200, 270, 'The Boundary Layer Effect', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const explanations = [
      'Laminar boundary layers have low momentum near surface',
      'They separate easily when pressure rises (adverse gradient)',
      'Turbulent boundary layers mix high momentum fluid down',
      'This helps them resist separation much longer'
    ];
    explanations.forEach((exp, i) => {
      r.text(200, 295 + i * 20, exp, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key insight
    r.roundRect(40, 400, 320, 60, 10, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 425, 'Sometimes turbulence helps!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 448, 'Less separation drag > More friction drag', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review Summary', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 50, 'Summary: Flow Regimes', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Key concepts
    r.roundRect(25, 80, 350, 160, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 105, 'Key Concepts', { fill: '#60a5fa', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    const concepts = [
      { text: 'Re = rho * v * D / mu determines flow type', color: '#60a5fa' },
      { text: 'Re < 2300: Laminar (smooth, efficient)', color: '#4ade80' },
      { text: 'Re > 4000: Turbulent (chaotic, mixing)', color: '#f87171' },
      { text: 'Turbulence can reduce separation drag', color: '#fbbf24' }
    ];
    concepts.forEach((c, i) => {
      r.text(200, 135 + i * 25, c.text, { fill: c.color, fontSize: 12, textAnchor: 'middle' });
    });

    // When to use each
    r.roundRect(25, 255, 170, 120, 12, { fill: 'rgba(74, 222, 128, 0.15)' });
    r.text(110, 280, 'Prefer Laminar', { fill: '#4ade80', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 305, 'Low friction loss', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 322, 'Pipelines, blood flow', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 339, 'Microfluidics', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(205, 255, 170, 120, 12, { fill: 'rgba(248, 113, 113, 0.15)' });
    r.text(290, 280, 'Prefer Turbulent', { fill: '#f87171', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 305, 'Better heat transfer', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 322, 'Delayed separation', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 339, 'Mixing applications', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 50, 'Real-World Applications', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#3b82f6';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 75, 80, 45, 8, { fill: bgColor });
      const icons: Record<string, string> = { heart: '<3', plane: '>', pipeline: '|', swimming: '~' };
      r.text(x + 40, 103, icons[app.icon] || '?', { fontSize: 18, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 135, 350, 310, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 165, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 188, app.tagline, { fill: '#60a5fa', fontSize: 11, textAnchor: 'middle' });

    // Description (multi-line)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 218;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 50) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Physics connection
    r.roundRect(40, 310, 320, 80, 10, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 335, 'Physics Connection', { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 360, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 420, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
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
      r.text(200, 50, 'Knowledge Test', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 75, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Scenario
      r.roundRect(25, 95, 350, 85, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      const scenarioWords = question.scenario.split(' ');
      let scenarioLine = '';
      let scenarioY = 115;
      scenarioWords.forEach(word => {
        if ((scenarioLine + word).length > 55) {
          r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
          scenarioLine = word + ' ';
          scenarioY += 15;
        } else {
          scenarioLine += word + ' ';
        }
      });
      if (scenarioLine) r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

      // Question
      r.text(200, 200, question.question.substring(0, 55) + (question.question.length > 55 ? '...' : ''), { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 225 + i * 52;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 45, 8, { fill: bgColor });
        r.text(40, y + 27, `${String.fromCharCode(65 + i)}. ${option.substring(0, 48)}${option.length > 48 ? '...' : ''}`, { fill: isSelected ? '#60a5fa' : '#e2e8f0', fontSize: 10 });

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
        r.text(200, 455, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? 'trophy' : 'book', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? 'Fluid Dynamics Expert!' : 'Review the concepts and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 150, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'Reynolds number calculation and meaning',
        'Laminar vs turbulent flow characteristics',
        'Boundary layer separation effects',
        'Real-world flow applications'
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
    r.text(200, 120, 'wave', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Fluid Dynamics Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand how fluids flow', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'in laminar and turbulent regimes!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: 'Re', label: 'Reynolds Number' },
      { icon: '~', label: 'Laminar Flow' },
      { icon: '?', label: 'Turbulent Flow' },
      { icon: '<>', label: 'Boundary Layers' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 295 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 18, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 460, 300, 70, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 488, 'Key Formula', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 515, 'Re = rho * v * D / mu', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering fluid flow regimes!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      velocity: this.velocity,
      pipeDiameter: this.pipeDiameter,
      fluidType: this.fluidType,
      showStreamlines: this.showStreamlines,
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
    if (state.velocity !== undefined) this.velocity = state.velocity as number;
    if (state.pipeDiameter !== undefined) this.pipeDiameter = state.pipeDiameter as number;
    if (state.fluidType !== undefined) this.fluidType = state.fluidType as 'water' | 'oil' | 'air';
    if (state.showStreamlines !== undefined) this.showStreamlines = state.showStreamlines as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createLaminarTurbulentGame(sessionId: string): LaminarTurbulentGame {
  return new LaminarTurbulentGame(sessionId);
}
