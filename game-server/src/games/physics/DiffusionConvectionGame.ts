import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// DIFFUSION vs CONVECTION GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Two modes of heat/mass transfer
// Diffusion: Random molecular motion (slow, Fick's law: J = -D∇c)
// Convection: Bulk fluid motion (fast, driven by buoyancy or external forces)
// Peclet number: Pe = uL/D determines which dominates
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
const DIFFUSION_COEFFICIENT = 2e-9; // m²/s for molecules in water

export class DiffusionConvectionGame extends BaseGame {
  readonly gameType = 'diffusion_convection';
  readonly gameTitle = 'Diffusion vs Convection: Racing Heat Transfer';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private mode: 'diffusion' | 'convection' = 'diffusion';
  private convectionSpeed = 0.5; // 0-1 scale
  private temperature = 25; // Celsius
  private time = 0;
  private isAnimating = false;
  private animationTime = 0;

  // Particle state for visualization
  private particles: { x: number; y: number; vx: number; vy: number }[] = [];

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // PROTECTED: Test questions with correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "You drop food coloring into a glass of still water at room temperature.",
      question: "Without stirring, the color spreads slowly over hours. This is:",
      options: [
        "Convection - bulk fluid motion",
        "Diffusion - random molecular motion",
        "Radiation - electromagnetic waves",
        "Conduction - direct molecular contact"
      ],
      correctIndex: 1,
      explanation: "Diffusion is the spread of particles from high to low concentration through random molecular motion. It's slow but inevitable in still fluids."
    },
    {
      scenario: "Hot air rises from a heating vent, circulating warmth through a room.",
      question: "This is an example of:",
      options: [
        "Natural convection - buoyancy-driven flow",
        "Forced convection - external pump/fan",
        "Diffusion - random molecular motion",
        "Radiation - electromagnetic transfer"
      ],
      correctIndex: 0,
      explanation: "Natural (free) convection occurs when density differences from temperature gradients cause buoyant flow without external forcing."
    },
    {
      scenario: "A ceiling fan pushes air around a room.",
      question: "This heat transfer mechanism is:",
      options: [
        "Natural convection",
        "Forced convection",
        "Diffusion",
        "Conduction"
      ],
      correctIndex: 1,
      explanation: "Forced convection uses external mechanical devices (fans, pumps) to move fluid and enhance heat transfer."
    },
    {
      scenario: "The Peclet number (Pe = uL/D) for a process is very large (Pe >> 1).",
      question: "This indicates:",
      options: [
        "Diffusion dominates over convection",
        "Convection dominates over diffusion",
        "Heat transfer is negligible",
        "The system is in equilibrium"
      ],
      correctIndex: 1,
      explanation: "High Peclet number means fluid velocity (u) dominates over diffusion (D). Convection is the primary transport mechanism."
    },
    {
      scenario: "Fick's First Law states: J = -D∇c",
      question: "The negative sign indicates that diffusion:",
      options: [
        "Always moves downward",
        "Requires energy input",
        "Flows from high to low concentration",
        "Stops at equilibrium"
      ],
      correctIndex: 2,
      explanation: "The negative sign shows flux opposes the concentration gradient - particles move from high to low concentration regions."
    },
    {
      scenario: "You're designing a heat sink for a computer CPU.",
      question: "Adding fins to the heat sink improves cooling primarily by:",
      options: [
        "Increasing conduction through metal",
        "Increasing surface area for convection",
        "Enhancing radiation",
        "Increasing diffusion rate"
      ],
      correctIndex: 1,
      explanation: "Fins dramatically increase surface area for convective heat transfer to the surrounding air, the primary cooling bottleneck."
    },
    {
      scenario: "Ocean currents transport heat from tropics to polar regions.",
      question: "Why is this more effective than diffusion alone?",
      options: [
        "Water has high thermal conductivity",
        "Convection moves entire fluid masses quickly",
        "Diffusion doesn't work in salt water",
        "Ocean currents are radioactive"
      ],
      correctIndex: 1,
      explanation: "Convection transports bulk fluid (and its heat) directly. Diffusion would take millennia to move heat across ocean basins."
    },
    {
      scenario: "In microfluidic devices (tiny channels), mixing is a challenge.",
      question: "Why is mixing slow in microchannels?",
      options: [
        "The walls absorb chemicals",
        "Flow is laminar, so only diffusion causes mixing",
        "Gravity is too weak",
        "Temperature is too low"
      ],
      correctIndex: 1,
      explanation: "In microchannels, flow is laminar (no turbulence). Mixing relies on slow cross-stream diffusion since there's no convective mixing."
    },
    {
      scenario: "A pot of water is heated from below on a stove.",
      question: "Which statement is correct about heat transfer in the pot?",
      options: [
        "Only conduction through water",
        "Convection cells form as hot water rises and cool water sinks",
        "Radiation heats the top surface",
        "Diffusion rapidly distributes heat"
      ],
      correctIndex: 1,
      explanation: "Heating from below creates buoyancy-driven convection cells (Rayleigh-Bénard convection). This is far more efficient than diffusion."
    },
    {
      scenario: "Comparing diffusion vs convection heat transfer rates.",
      question: "Convection is faster because:",
      options: [
        "It uses electromagnetic waves",
        "Molecules vibrate faster",
        "Bulk fluid motion carries energy directly",
        "It works without temperature difference"
      ],
      correctIndex: 2,
      explanation: "Convection physically moves warm fluid to cold regions (and vice versa), bypassing the slow random-walk of diffusion."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🌊",
      title: "Ocean Thermohaline Circulation",
      tagline: "Global heat conveyor belt",
      description: "Dense cold salty water sinks in polar regions, driving global ocean currents that transport heat from tropics to poles. This convection system regulates Earth's climate.",
      connection: "Convection transports ~1 petawatt (10^15 W) of heat poleward - diffusion would take millions of years!"
    },
    {
      icon: "💻",
      title: "CPU Cooling Systems",
      tagline: "Keeping processors cool under pressure",
      description: "Heat sinks with fins use convection to move heat away from CPUs. Fans provide forced convection, water cooling provides even better heat removal through liquid convection.",
      connection: "Convective heat transfer: Q = hA(T_s - T_∞). Increasing h (fans) or A (fins) improves cooling."
    },
    {
      icon: "🧪",
      title: "Microfluidic Lab-on-Chip",
      tagline: "Mixing at microscale",
      description: "In tiny channels, flow is laminar with no turbulent mixing. Special structures induce chaotic advection or rely on enhanced diffusion paths to mix reagents.",
      connection: "Low Reynolds number → laminar flow. Must design special mixers since convective mixing is suppressed."
    },
    {
      icon: "🏠",
      title: "Building HVAC Systems",
      tagline: "Comfort through controlled convection",
      description: "Heating and cooling systems use forced convection (fans, ducts) and natural convection (warm air rises) to maintain comfortable temperatures throughout buildings.",
      connection: "Stack effect: ΔP = ρ_out * g * h * (T_in - T_out)/T_out drives natural ventilation."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
    this.initializeParticles();
  }

  private initializeParticles(): void {
    this.particles = [];
    // Create particles clustered at center
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: 200 + (Math.random() - 0.5) * 30,
        y: 200 + (Math.random() - 0.5) * 30,
        vx: 0,
        vy: 0
      });
    }
  }

  // PROTECTED: Calculate diffusion spread
  private calculateDiffusionSpread(time: number): number {
    // Root mean square displacement: √(2Dt)
    return Math.sqrt(2 * DIFFUSION_COEFFICIENT * time);
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
      if (input.id === 'convection_speed') {
        this.convectionSpeed = Math.max(0, Math.min(1, input.value));
      } else if (input.id === 'temperature') {
        this.temperature = Math.max(10, Math.min(90, input.value));
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
        if (buttonId === 'toggle_mode') {
          this.mode = this.mode === 'diffusion' ? 'convection' : 'diffusion';
          this.initializeParticles();
          this.time = 0;
        } else if (buttonId === 'start') {
          this.isAnimating = true;
          this.time = 0;
          this.initializeParticles();
        } else if (buttonId === 'reset') {
          this.isAnimating = false;
          this.time = 0;
          this.initializeParticles();
        } else if (buttonId === 'continue') {
          this.phase = 'review';
          this.isAnimating = false;
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
    this.mode = 'diffusion';
    this.convectionSpeed = 0.5;
    this.temperature = 25;
    this.time = 0;
    this.isAnimating = false;
    this.initializeParticles();
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    if (this.isAnimating) {
      this.time += deltaTime;

      // Update particles based on mode
      this.particles.forEach(p => {
        if (this.mode === 'diffusion') {
          // Random walk
          p.x += (Math.random() - 0.5) * 3;
          p.y += (Math.random() - 0.5) * 3;
        } else {
          // Convection: circular flow pattern
          const cx = 200, cy = 200;
          const dx = p.x - cx;
          const dy = p.y - cy;
          const angle = Math.atan2(dy, dx);
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Add rotational velocity
          p.x += -Math.sin(angle) * this.convectionSpeed * 3;
          p.y += Math.cos(angle) * this.convectionSpeed * 3;

          // Add some outward drift
          p.x += Math.cos(angle) * 0.5;
          p.y += Math.sin(angle) * 0.5;
        }

        // Keep particles in bounds
        p.x = Math.max(100, Math.min(300, p.x));
        p.y = Math.max(140, Math.min(280, p.y));
      });

      // Stop after some time
      if (this.time > 20) {
        this.isAnimating = false;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(249, 115, 22, 0.05)' });
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
    r.roundRect(120, 60, 160, 30, 8, { fill: 'rgba(249, 115, 22, 0.1)' });
    r.text(200, 80, 'HEAT TRANSFER', { fill: '#f97316', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Racing Dye Mystery', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 165, 'Why does stirring speed things up?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Illustration - two cups
    r.roundRect(60, 200, 280, 140, 16, { fill: 'rgba(30, 41, 59, 0.8)' });

    // Still cup
    r.roundRect(90, 240, 80, 70, 8, { fill: '#374151' });
    r.rect(95, 250, 70, 55, { fill: '#60a5fa' }); // water
    r.circle(130, 280, 8, { fill: '#dc2626' }); // concentrated dye
    r.text(130, 325, 'Still', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Stirred cup
    r.roundRect(230, 240, 80, 70, 8, { fill: '#374151' });
    r.rect(235, 250, 70, 55, { fill: '#f87171' }); // mixed
    // Stir lines
    r.line(270, 260, 280, 280, { stroke: '#ffffff', strokeWidth: 2 });
    r.line(270, 280, 280, 260, { stroke: '#ffffff', strokeWidth: 2 });
    r.text(270, 325, 'Stirred', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 360, 320, 120, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 390, 'Drop dye in still water: spreads in hours.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 415, 'Stir it: spreads in seconds!', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 455, 'What makes stirring so much faster?', { fill: '#f97316', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Discover the Difference', variant: 'primary' });

    r.setCoachMessage('Explore diffusion vs convection!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'Stirring a cup of tea mixes in the milk', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'much faster than letting it sit still.', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 185, 'Why is stirring so effective?', { fill: '#f97316', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Stirring heats up the tea',
      'Stirring creates bulk fluid motion (convection)',
      'Stirring breaks down milk molecules',
      'Stirring adds energy that molecules absorb'
    ];

    options.forEach((option, i) => {
      const y = 220 + i * 65;
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
        bgColor = 'rgba(249, 115, 22, 0.3)';
      }

      r.roundRect(30, y, 340, 55, 10, { fill: bgColor });
      r.text(50, y + 32, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 500, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Exactly!' : 'Convection = bulk fluid motion!';
      r.text(200, 530, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 560, "Let's compare diffusion and convection!", { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See the Difference', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Diffusion vs Convection', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Mode toggle
    r.roundRect(130, 75, 140, 30, 8, { fill: this.mode === 'diffusion' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(249, 115, 22, 0.3)' });
    r.text(200, 95, this.mode === 'diffusion' ? 'DIFFUSION' : 'CONVECTION', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.addButton({ id: 'toggle_mode', label: '', variant: 'secondary' });

    // Visualization area
    r.roundRect(50, 115, 300, 200, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Container
    r.rect(100, 135, 200, 160, { fill: '#1f2937' });

    // Draw particles
    const particleColor = this.mode === 'diffusion' ? '#60a5fa' : '#f97316';
    this.particles.forEach(p => {
      r.circle(p.x, p.y, 4, { fill: particleColor });
    });

    // Mode label
    if (this.mode === 'diffusion') {
      r.text(200, 315, 'Random molecular motion (slow)', { fill: '#60a5fa', fontSize: 11, textAnchor: 'middle' });
    } else {
      r.text(200, 315, 'Bulk fluid motion (fast!)', { fill: '#f97316', fontSize: 11, textAnchor: 'middle' });
      // Draw flow arrows
      r.line(150, 170, 180, 200, { stroke: 'rgba(249, 115, 22, 0.4)', strokeWidth: 2 });
      r.line(220, 200, 250, 170, { stroke: 'rgba(249, 115, 22, 0.4)', strokeWidth: 2 });
    }

    // Time display
    r.roundRect(50, 335, 140, 50, 10, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.text(120, 358, `Time: ${this.time.toFixed(1)}s`, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(120, 378, this.isAnimating ? 'Running...' : 'Paused', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Controls
    if (this.mode === 'convection') {
      r.addSlider({
        id: 'convection_speed',
        label: `Flow Speed: ${Math.round(this.convectionSpeed * 100)}%`,
        min: 0.1,
        max: 1,
        step: 0.1,
        value: this.convectionSpeed
      });
    }

    if (!this.isAnimating) {
      r.addButton({ id: 'start', label: 'Start Simulation', variant: 'primary' });
    } else {
      r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
    }

    r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'secondary' });

    // Explanation
    r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
    if (this.mode === 'diffusion') {
      r.text(200, 495, 'Diffusion: Random Walk', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 520, 'Each molecule moves randomly', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 540, 'Distance ∝ √time (very slow!)', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    } else {
      r.text(200, 495, 'Convection: Bulk Motion', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 520, 'Entire fluid masses move together', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 540, 'Distance ∝ time (much faster!)', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    }
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'Understanding the Difference', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Diffusion
    r.roundRect(30, 80, 340, 110, 16, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 108, 'Diffusion', { fill: '#60a5fa', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 130, "Fick's Law: J = -D∇c", { fill: '#ffffff', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 155, 'Flux proportional to concentration gradient', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 175, 'Distance ~ √(Dt) - spreads slowly!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Convection
    r.roundRect(30, 200, 340, 110, 16, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(200, 228, 'Convection', { fill: '#f97316', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 250, 'Transport by bulk fluid motion', { fill: '#ffffff', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 275, 'Natural (buoyancy) or Forced (pump/fan)', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 295, 'Distance ~ ut - spreads quickly!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Peclet number
    r.roundRect(30, 320, 340, 100, 16, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 348, 'The Peclet Number', { fill: '#a855f7', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(100, 360, 200, 30, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 382, 'Pe = uL/D', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });
    r.text(200, 405, 'Pe >> 1: Convection dominates', { fill: '#f97316', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 420, 'Pe << 1: Diffusion dominates', { fill: '#60a5fa', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore a Twist', variant: 'secondary' });

    r.setCoachMessage('Discover why microscale is different!');
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist Challenge', { fill: '#a855f7', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'In microfluidic chips (tiny channels),', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'mixing chemicals is a major challenge.', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 180, 'Why is mixing slow in microchannels?', { fill: '#a855f7', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Flow is too fast for mixing',
      'Laminar flow prevents convective mixing',
      'Surface tension holds fluids apart',
      'Microchannels are too cold'
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (i === 1) {
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
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 1 ? 'Exactly right!' : 'Laminar flow = no turbulent mixing!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 530, 'At small scales, flow is smooth and', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 550, 'layers slide past without mixing.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See the Scale Effect', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Scale Matters!', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Large scale (turbulent)
    r.roundRect(25, 85, 170, 180, 12, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(110, 110, 'Large Scale', { fill: '#f97316', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Turbulent mixing visualization
    r.rect(45, 125, 130, 80, { fill: '#1f2937' });
    // Swirling pattern
    for (let i = 0; i < 15; i++) {
      const x = 50 + Math.random() * 120;
      const y = 130 + Math.random() * 70;
      r.circle(x, y, 4 + Math.random() * 4, { fill: 'rgba(249, 115, 22, 0.6)' });
    }
    r.text(110, 220, 'Turbulent mixing!', { fill: '#22c55e', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 240, 'Re > 2000', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 255, 'Convection dominates', { fill: '#f97316', fontSize: 10, textAnchor: 'middle' });

    // Small scale (laminar)
    r.roundRect(205, 85, 170, 180, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(290, 110, 'Micro Scale', { fill: '#60a5fa', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Laminar flow visualization
    r.rect(225, 125, 130, 80, { fill: '#1f2937' });
    // Parallel layers
    r.rect(230, 135, 120, 10, { fill: 'rgba(59, 130, 246, 0.8)' });
    r.rect(230, 150, 120, 10, { fill: 'rgba(249, 115, 22, 0.8)' });
    r.rect(230, 165, 120, 10, { fill: 'rgba(59, 130, 246, 0.8)' });
    r.rect(230, 180, 120, 10, { fill: 'rgba(249, 115, 22, 0.8)' });
    r.text(290, 220, 'Layers stay separate!', { fill: '#f87171', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 240, 'Re < 100', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 255, 'Only diffusion mixes', { fill: '#60a5fa', fontSize: 10, textAnchor: 'middle' });

    // Reynolds number explanation
    r.roundRect(30, 280, 340, 130, 16, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 310, 'Reynolds Number Determines Flow Type:', { fill: '#a855f7', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(80, 320, 240, 35, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 345, 'Re = ρuL/μ = inertia/viscosity', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 375, 'Low Re → smooth laminar flow', { fill: '#60a5fa', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 395, 'High Re → chaotic turbulent flow', { fill: '#f97316', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review This Discovery', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Key Discovery', { fill: '#a855f7', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 85, 340, 170, 16, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 115, 'Scale Changes Everything!', { fill: '#a855f7', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(200, 150, 'In everyday life: turbulence dominates', { fill: '#f97316', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 170, 'Stirring, fans, and pumps mix quickly', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.text(200, 200, 'At microscale: laminar flow dominates', { fill: '#60a5fa', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 220, 'Must design special mixers or rely on slow diffusion', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Design strategies
    r.roundRect(30, 270, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 295, 'Microfluidic Mixing Solutions:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 320, 'Serpentine channels (longer diffusion path)', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 340, 'Ridges & grooves (chaotic advection)', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 360, 'Acoustic or electric mixing', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

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
      if (isActive) bgColor = '#ea580c';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.tagline, { fill: '#f97316', fontSize: 11, textAnchor: 'middle' });

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
    r.roundRect(40, 320, 320, 70, 10, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(200, 345, 'Physics Connection', { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
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
      r.text(200, 200, question.question.substring(0, 50), { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 230 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(249, 115, 22, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 42, 8, { fill: bgColor });
        r.text(40, y + 26, `${String.fromCharCode(65 + i)}. ${option.substring(0, 45)}${option.length > 45 ? '...' : ''}`, { fill: isSelected ? '#f97316' : '#e2e8f0', fontSize: 10 });

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
      r.text(200, 225, score >= 7 ? "Excellent! You've mastered heat transfer!" : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 140, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 340, "Diffusion: J = -D∇c (Fick's Law)", { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 360, 'Convection: bulk fluid motion', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 380, 'Peclet number: Pe = uL/D', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 400, 'Reynolds number: laminar vs turbulent', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Trophy
    r.text(200, 120, '🌊', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Heat Transfer Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand diffusion and convection!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '🎲', label: 'Random Walk' },
      { icon: '🌀', label: 'Bulk Flow' },
      { icon: '📏', label: 'Peclet Number' },
      { icon: '💨', label: 'Reynolds Number' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 280 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 450, 300, 70, 12, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(200, 478, 'Key Relationships', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 505, 'Pe = uL/D    Re = ρuL/μ', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering heat transfer!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      mode: this.mode,
      convectionSpeed: this.convectionSpeed,
      temperature: this.temperature,
      time: this.time,
      isAnimating: this.isAnimating,
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
    if (state.mode !== undefined) this.mode = state.mode as 'diffusion' | 'convection';
    if (state.convectionSpeed !== undefined) this.convectionSpeed = state.convectionSpeed as number;
    if (state.temperature !== undefined) this.temperature = state.temperature as number;
    if (state.time !== undefined) this.time = state.time as number;
    if (state.isAnimating !== undefined) this.isAnimating = state.isAnimating as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createDiffusionConvectionGame(sessionId: string): DiffusionConvectionGame {
  return new DiffusionConvectionGame(sessionId);
}
