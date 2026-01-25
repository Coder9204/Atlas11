import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// DROPLET BREAKUP GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Rayleigh-Plateau Instability
// A cylindrical liquid jet is unstable and breaks into droplets
// Surface tension drives the system toward minimum surface area (spheres)
// Wavelength of instability: λ ≈ 9r (r = jet radius)
// Ohnesorge number: Oh = η / √(ρσr) determines breakup dynamics
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
const SURFACE_TENSION_WATER = 0.072; // N/m
const VISCOSITY_WATER = 0.001; // Pa·s
const DENSITY_WATER = 1000; // kg/m³

export class DropletBreakupGame extends BaseGame {
  readonly gameType = 'droplet_breakup';
  readonly gameTitle = 'Droplet Breakup: The Rayleigh-Plateau Instability';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private flowRate = 50; // percent
  private viscosity = 1; // 1=water, 5=oil, 10=honey
  private animationTime = 0;
  private animationPhase = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // PROTECTED: Test questions with correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "Water flows from a faucet as a smooth stream.",
      question: "What is the Rayleigh-Plateau instability?",
      options: [
        "A phenomenon where liquids freeze at low temperatures",
        "The tendency of a cylindrical liquid jet to break into droplets",
        "A type of chemical reaction in fluids",
        "The resistance of fluids to flow"
      ],
      correctIndex: 1,
      explanation: "The Rayleigh-Plateau instability describes how a cylindrical fluid jet is inherently unstable and will break up into droplets."
    },
    {
      scenario: "You turn on a faucet and watch the water stream.",
      question: "Why does a water stream from a faucet break into droplets?",
      options: [
        "Gravity pulls the water apart",
        "Air resistance breaks it up",
        "Surface tension drives the system toward minimum surface area (spheres)",
        "The water evaporates and separates"
      ],
      correctIndex: 2,
      explanation: "Surface tension acts to minimize surface area. For a given volume, a sphere has less surface area than a cylinder, so the jet breaks into spherical droplets."
    },
    {
      scenario: "Consider the geometry of liquid shapes.",
      question: "Which shape has the minimum surface area for a given volume?",
      options: [
        "Cylinder",
        "Cube",
        "Sphere",
        "Cone"
      ],
      correctIndex: 2,
      explanation: "The sphere is the shape that minimizes surface area for a given volume. This is why droplets naturally form spheres."
    },
    {
      scenario: "Surface tension acts on a liquid jet.",
      question: "What role does surface tension play in droplet formation?",
      options: [
        "It holds the stream together indefinitely",
        "It amplifies small perturbations until the stream breaks",
        "It has no effect on droplet formation",
        "It only affects viscous fluids"
      ],
      correctIndex: 1,
      explanation: "Surface tension amplifies perturbations (waves) on the jet surface. Above a critical wavelength, these grow until the jet pinches off into droplets."
    },
    {
      scenario: "You're studying jet breakup in a lab.",
      question: "What determines the typical size of droplets formed from a jet?",
      options: [
        "The speed of the fluid only",
        "The temperature of the fluid",
        "The wavelength of the instability, related to jet radius",
        "Random chance - all droplets are different sizes"
      ],
      correctIndex: 2,
      explanation: "Droplet size is set by the most unstable wavelength, λ ≈ 9r (about 9 times the jet radius). This determines the spacing and size of droplets."
    },
    {
      scenario: "Honey drips slowly from a spoon compared to water.",
      question: "How does higher viscosity affect jet breakup?",
      options: [
        "It makes breakup happen faster",
        "It slows down breakup and can create 'beads on a string' patterns",
        "It prevents any breakup from occurring",
        "It has no effect on breakup"
      ],
      correctIndex: 1,
      explanation: "High viscosity resists the pinch-off, slowing breakup and often creating thin filaments between droplets - the 'beads on a string' pattern."
    },
    {
      scenario: "An inkjet printer produces tiny, precise droplets.",
      question: "In inkjet printing, how are precise droplets created?",
      options: [
        "Random breakup of a continuous stream",
        "Controlled piezoelectric pulses that trigger the instability",
        "Heating the ink until it evaporates",
        "Magnetic fields that shape the ink"
      ],
      correctIndex: 1,
      explanation: "Inkjet printers use piezoelectric elements to create pressure waves that trigger controlled Rayleigh-Plateau breakup at precise intervals."
    },
    {
      scenario: "Analysis shows a perturbation wavelength shorter than the jet circumference.",
      question: "What happens when perturbation wavelength is shorter than jet circumference?",
      options: [
        "The perturbation grows rapidly",
        "The perturbation is damped and the jet remains stable",
        "The jet immediately explodes",
        "The jet solidifies"
      ],
      correctIndex: 1,
      explanation: "Perturbations with wavelength less than πd (jet circumference) are stable and damp out. Only longer wavelengths grow and cause breakup."
    },
    {
      scenario: "Agricultural sprayers must deliver consistent droplets.",
      question: "Why is droplet uniformity important in spray applications?",
      options: [
        "It makes the spray look more appealing",
        "Uniform droplets ensure consistent coverage and dosing",
        "It reduces the cost of the spray equipment",
        "It prevents the spray from evaporating"
      ],
      correctIndex: 1,
      explanation: "Uniform droplet size ensures consistent coverage and controlled dosing. In agriculture, this means even pesticide distribution; in medicine, accurate drug delivery."
    },
    {
      scenario: "A fuel injector creates a fine mist of fuel.",
      question: "What is atomization?",
      options: [
        "Converting liquid into individual atoms",
        "The process of breaking liquid into fine droplets or mist",
        "A nuclear reaction in fluids",
        "Removing air from liquids"
      ],
      correctIndex: 1,
      explanation: "Atomization is the process of breaking a bulk liquid into fine droplets or mist. It uses the Rayleigh-Plateau instability in various applications."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🖨️",
      title: "Inkjet Printing",
      tagline: "Precision droplets for vivid images",
      description: "Inkjet printers use piezoelectric elements to create pressure waves that trigger controlled Rayleigh-Plateau breakup, producing precisely sized droplets that land exactly where needed.",
      connection: "Droplet size ~20μm, frequency ~20kHz, speed 10m/s. Controlled instability enables ±1μm precision."
    },
    {
      icon: "💨",
      title: "Spray Nozzles",
      tagline: "Optimizing droplet size for coverage",
      description: "Agricultural sprayers and industrial coating systems engineer nozzle geometries to control droplet size distribution, optimizing coverage while minimizing drift.",
      connection: "Fine (<150μm): good coverage, drift risk. Coarse (>300μm): no drift, poor coverage. Nozzle design is key."
    },
    {
      icon: "💊",
      title: "Pharmaceutical Manufacturing",
      tagline: "Uniform drug particles for consistent dosing",
      description: "Drug microencapsulation and spray drying use controlled jet breakup to create uniform drug particles for consistent dosing and drug delivery.",
      connection: "Microsphere size: 1-1000μm. Precise dosing, taste masking, controlled release all depend on uniform particle size."
    },
    {
      icon: "⚙️",
      title: "Metal Powder Production",
      tagline: "From molten metal to perfect spheres",
      description: "Gas atomization shoots molten metal through nozzles - the Rayleigh-Plateau instability breaks the stream into droplets that solidify into metal powder for 3D printing.",
      connection: "Molten metal at ~1500°C, high-pressure gas breaks stream. Spherical powder 10-150μm for additive manufacturing."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate Ohnesorge number
  private calculateOhnesorgeNumber(viscosity: number, radius: number): number {
    return viscosity / Math.sqrt(DENSITY_WATER * SURFACE_TENSION_WATER * radius);
  }

  // PROTECTED: Calculate breakup time scale
  private calculateBreakupTime(radius: number): number {
    return Math.sqrt(DENSITY_WATER * radius * radius * radius / SURFACE_TENSION_WATER);
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
      if (input.id === 'flow_rate') {
        this.flowRate = Math.max(20, Math.min(100, input.value));
      } else if (input.id === 'viscosity') {
        this.viscosity = Math.max(1, Math.min(10, input.value));
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
    this.flowRate = 50;
    this.viscosity = 1;
    this.animationPhase = 0;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;
    this.animationPhase = (this.animationPhase + deltaTime * 50) % 200;
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
    r.roundRect(110, 60, 180, 30, 8, { fill: 'rgba(6, 182, 212, 0.1)' });
    r.text(200, 80, 'SURFACE TENSION PHYSICS', { fill: '#22d3ee', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Breaking Stream', { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Mystery', { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 195, 'Why does water become droplets?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Faucet illustration
    r.roundRect(100, 220, 200, 140, 16, { fill: 'rgba(30, 41, 59, 0.8)' });

    // Faucet
    r.roundRect(175, 235, 50, 30, 8, { fill: '#64748b' });
    r.roundRect(190, 260, 20, 15, 4, { fill: '#475569' });

    // Stream breaking into droplets
    r.rect(195, 275, 10, 30, { fill: '#3b82f6' });

    // Necking region (wave pattern)
    const neckY = 310;
    r.ellipse(200, neckY, 5, 3, { fill: '#3b82f6' });
    r.ellipse(200, neckY + 10, 4, 3, { fill: '#3b82f6' });
    r.ellipse(200, neckY + 18, 5, 3, { fill: '#3b82f6' });

    // Droplets
    r.circle(200, neckY + 35, 8, { fill: '#60a5fa' });
    r.circle(200, neckY + 55, 8, { fill: '#60a5fa' });

    // Fact card
    r.roundRect(40, 380, 320, 120, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 410, 'Turn on a faucet and watch closely.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 435, 'The smooth water stream suddenly', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 455, 'breaks into droplets. Why?', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 485, 'Discover the Rayleigh-Plateau instability!', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Find Out Why', variant: 'primary' });

    r.setCoachMessage('Explore the physics of droplet formation!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'Surface tension wants to minimize', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'surface area for a given volume.', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 185, 'Which shape has minimum surface area?', { fill: '#22d3ee', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Cylinder - like the original stream',
      'Cube - simple geometry',
      'Sphere - perfectly round',
      'Cone - pointed shape'
    ];

    options.forEach((option, i) => {
      const y = 220 + i * 65;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (i === 2) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.prediction) {
        bgColor = 'rgba(6, 182, 212, 0.3)';
      }

      r.roundRect(30, y, 340, 55, 10, { fill: bgColor });
      r.text(50, y + 32, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 500, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 2 ? 'Excellent prediction!' : 'Spheres have minimum surface area!';
      r.text(200, 530, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 560, "That's why jets break into droplets!", { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See It In Action', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Watch the Stream Break Up', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization area
    r.roundRect(20, 85, 360, 230, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Faucet
    r.roundRect(175, 100, 50, 30, 8, { fill: '#64748b' });
    r.roundRect(190, 125, 20, 15, 4, { fill: '#475569' });

    // Continuous stream (top)
    r.rect(195, 140, 10, 40, { fill: '#3b82f6' });

    // Necking region with perturbations
    const breakupSpeed = this.flowRate / 25;
    const dropletSpacing = 30 - this.flowRate / 5;

    for (let i = 0; i < 3; i++) {
      const y = 185 + i * 12;
      const amplitude = 2 + Math.sin((this.animationPhase + i * 30) * 0.1) * 2;
      r.ellipse(200, y, 5 - amplitude * 0.3, 4, { fill: '#3b82f6' });
    }

    // Droplets
    for (let i = 0; i < 5; i++) {
      const baseY = 220 + i * dropletSpacing;
      const y = baseY + (this.animationPhase * breakupSpeed * 0.5) % dropletSpacing;
      if (y < 300) {
        r.circle(200, y, 8, { fill: '#60a5fa' });
      }
    }

    // Labels
    r.text(280, 155, 'Stable stream', { fill: '#94a3b8', fontSize: 10 });
    r.text(280, 195, 'Necking region', { fill: '#94a3b8', fontSize: 10 });
    r.text(280, 250, 'Droplets form', { fill: '#94a3b8', fontSize: 10 });

    // Wave visualization
    r.roundRect(40, 200, 100, 80, 10, { fill: 'rgba(30, 41, 59, 0.7)' });
    r.text(90, 220, 'Perturbation', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Wave diagram
    for (let x = 50; x < 130; x += 2) {
      const y = 250 + Math.sin((x + this.animationPhase) * 0.2) * (5 + (x - 50) * 0.1);
      r.circle(x, y, 1, { fill: '#3b82f6' });
    }
    r.text(90, 275, 'Waves grow!', { fill: '#22d3ee', fontSize: 9, textAnchor: 'middle' });

    // Sliders
    r.addSlider({
      id: 'flow_rate',
      label: `Flow Rate: ${this.flowRate}%`,
      min: 20,
      max: 100,
      step: 5,
      value: this.flowRate
    });

    // Explanation
    r.roundRect(30, 380, 340, 130, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
    r.text(200, 408, 'Why Breakup Happens:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 435, 'A cylinder has ~15% more surface area', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 455, 'than spheres of the same total volume.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 480, 'Most unstable wavelength: λ ≈ 9r', { fill: '#60a5fa', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 500, '(about 9× the jet radius)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Understand Why', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Science Revealed', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Rayleigh-Plateau
    r.roundRect(30, 80, 340, 110, 16, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 108, 'Rayleigh-Plateau Instability', { fill: '#22d3ee', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 135, 'A cylindrical fluid column is inherently', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 155, 'UNSTABLE. Any perturbation will grow!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 180, 'Surface tension pulls fluid toward spheres.', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Mathematics
    r.roundRect(30, 200, 340, 100, 16, { fill: 'rgba(139, 92, 246, 0.2)' });
    r.text(200, 228, 'The Mathematics', { fill: '#a78bfa', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 255, 'Most unstable wavelength: λ ≈ 9r', { fill: '#ffffff', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 280, 'Only wavelengths > πd grow (circumference)', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Why spheres
    r.roundRect(30, 310, 340, 100, 16, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 338, 'Why Spheres Win', { fill: '#3b82f6', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 365, 'Surface tension acts like a stretched membrane', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 385, 'trying to contract. Spheres minimize surface', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 405, 'area for a given volume - nature prefers this!', { fill: '#60a5fa', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore a Twist', variant: 'secondary' });

    r.setCoachMessage('Discover how viscosity changes everything!');
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist: Viscous Fluids', { fill: '#a855f7', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'What happens when we use a thick,', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'viscous fluid like honey instead of water?', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 180, 'How does viscosity affect breakup?', { fill: '#a855f7', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Breakup happens much faster',
      'Breakup happens exactly the same way',
      "Breakup is slower, creating 'beads on a string'",
      "No breakup ever occurs - it stays as a stream"
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 60;
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
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 2 ? 'Exactly right!' : "High viscosity creates 'beads on a string'!";
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 530, 'Viscosity resists the pinch-off,', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 550, 'creating thin connecting filaments.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See the Difference', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Water vs Honey', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Water side
    r.roundRect(25, 85, 170, 200, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(110, 110, 'Water (Low η)', { fill: '#3b82f6', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Water nozzle
    r.roundRect(95, 125, 30, 15, 4, { fill: '#64748b' });

    // Water stream - clean breakup
    r.rect(105, 140, 10, 30, { fill: '#3b82f6' });
    for (let i = 0; i < 4; i++) {
      const y = 180 + i * 25;
      r.circle(110, y, 8, { fill: '#60a5fa' });
    }

    r.text(110, 265, 'Clean, fast breakup', { fill: '#60a5fa', fontSize: 10, textAnchor: 'middle' });

    // Honey side
    r.roundRect(205, 85, 170, 200, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(290, 110, 'Honey (High η)', { fill: '#fbbf24', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Honey nozzle
    r.roundRect(275, 125, 30, 15, 4, { fill: '#64748b' });

    // Honey stream - beads on a string
    r.rect(287, 140, 6, 80, { fill: '#fbbf24' });
    for (let i = 0; i < 3; i++) {
      const y = 160 + i * 30;
      r.circle(290, y, 7 + Math.sin(i) * 2, { fill: '#f59e0b' });
    }
    // Thin filament
    r.rect(287, 220, 6, 30, { fill: 'rgba(251, 191, 36, 0.6)' });
    r.circle(290, 260, 10, { fill: '#f59e0b' });

    r.text(290, 275, '"Beads on a string"', { fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' });

    // Ohnesorge number
    r.roundRect(30, 300, 340, 110, 16, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 328, 'The Ohnesorge Number:', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(80, 340, 240, 30, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 362, 'Oh = η / √(ρσr)', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 390, 'Low Oh → quick breakup', { fill: '#3b82f6', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 405, 'High Oh → slow breakup with filaments', { fill: '#fbbf24', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review This Discovery', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, "Viscosity's Role", { fill: '#a855f7', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Honey effect
    r.roundRect(30, 85, 340, 100, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 113, 'The Honey Effect', { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 140, "Viscosity RESISTS the pinch-off.", { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 160, "The fluid can't thin fast enough,", { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 180, 'creating long thin threads between droplets.', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Satellite droplets
    r.roundRect(30, 195, 340, 90, 16, { fill: 'rgba(139, 92, 246, 0.2)' });
    r.text(200, 223, 'Satellite Droplets', { fill: '#a78bfa', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 250, 'Those thin threads eventually break too,', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 270, 'creating small "satellite" droplets between main ones.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Engineering implications
    r.roundRect(30, 295, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 320, 'Engineering Implications:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 345, 'Inkjet ink: tuned viscosity for clean breakup', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 365, 'Atomizers: control satellite droplet formation', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 385, '3D printing: polymer viscosity affects resolution', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
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

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.tagline, { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });

    // Description (multi-line)
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
    r.roundRect(40, 320, 320, 70, 10, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 345, 'Physics Connection', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 370, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

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
      r.text(200, 55, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Scenario
      r.roundRect(25, 100, 350, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      const scenarioShort = question.scenario.substring(0, 80) + (question.scenario.length > 80 ? '...' : '');
      r.text(200, 130, scenarioShort.substring(0, 45), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      if (scenarioShort.length > 45) {
        r.text(200, 148, scenarioShort.substring(45), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      }

      // Question
      r.text(200, 200, question.question.substring(0, 50), { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 230 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(6, 182, 212, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 42, 8, { fill: bgColor });
        r.text(40, y + 26, `${String.fromCharCode(65 + i)}. ${option.substring(0, 45)}${option.length > 45 ? '...' : ''}`, { fill: isSelected ? '#22d3ee' : '#e2e8f0', fontSize: 10 });

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
      r.text(200, 225, score >= 7 ? "Excellent! You've mastered droplet physics!" : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 140, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 340, 'Rayleigh-Plateau instability', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 360, 'Surface tension minimizes area → spheres', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 380, 'Most unstable wavelength: λ ≈ 9r', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 400, 'Ohnesorge number: Oh = η/√(ρσr)', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Trophy
    r.text(200, 120, '💧', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Rayleigh-Plateau Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand why jets break into droplets!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '🎯', label: 'Surface Tension' },
      { icon: '🌊', label: 'Instability' },
      { icon: '⚗️', label: 'Viscosity Effects' },
      { icon: '🖨️', label: 'Applications' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 280 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key takeaways
    r.roundRect(50, 450, 300, 80, 12, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 478, 'Key Insight', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 505, 'Spheres minimize surface area → droplets form!', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering droplet physics!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      flowRate: this.flowRate,
      viscosity: this.viscosity,
      animationTime: this.animationTime,
      animationPhase: this.animationPhase,
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
    if (state.flowRate !== undefined) this.flowRate = state.flowRate as number;
    if (state.viscosity !== undefined) this.viscosity = state.viscosity as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.animationPhase !== undefined) this.animationPhase = state.animationPhase as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createDropletBreakupGame(sessionId: string): DropletBreakupGame {
  return new DropletBreakupGame(sessionId);
}
