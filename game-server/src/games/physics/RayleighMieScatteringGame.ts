import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// RAYLEIGH VS MIE SCATTERING GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Why is the sky blue and clouds white?
// Rayleigh scattering: I ∝ 1/λ⁴ (small particles scatter short wavelengths more)
// Mie scattering: All wavelengths scatter equally (large particles)
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

// PROTECTED Physics constants (never sent to client)
const BLUE_WAVELENGTH = 450; // nm
const GREEN_WAVELENGTH = 550; // nm
const RED_WAVELENGTH = 650; // nm

export class RayleighMieScatteringGame extends BaseGame {
  readonly gameType = 'rayleigh_mie_scattering';
  readonly gameTitle = 'Rayleigh vs Mie Scattering: Why is the Sky Blue?';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private particleSize = 0.1; // nm scale factor (0.1 = molecules, 10 = droplets)
  private concentration = 50;
  private pathLength = 50;
  private viewAngle: 'side' | 'through' = 'side';
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
      scenario: "You're outside on a clear sunny day looking up at the sky.",
      question: "Why does the sky appear blue during the day?",
      options: [
        "Blue light reflects off the ocean",
        "Air molecules scatter blue light more than red",
        "The ozone layer is blue",
        "Blue light is absorbed by the atmosphere"
      ],
      correctIndex: 1,
      explanation: "Air molecules are much smaller than light wavelengths. Rayleigh scattering causes short wavelengths (blue) to scatter more than long wavelengths (red)."
    },
    {
      scenario: "A physicist is studying the mathematical relationship in Rayleigh scattering.",
      question: "In Rayleigh scattering, how does scattering intensity relate to wavelength?",
      options: [
        "Proportional to wavelength",
        "Inversely proportional to wavelength",
        "Proportional to wavelength^4",
        "Inversely proportional to wavelength^4"
      ],
      correctIndex: 3,
      explanation: "Rayleigh scattering intensity is proportional to 1/λ^4. This means blue light (450nm) scatters about 5.5x more than red light (650nm)."
    },
    {
      scenario: "You're looking at fluffy white clouds on a summer day.",
      question: "Why do clouds appear white instead of blue?",
      options: [
        "Water is white",
        "Cloud droplets are too large for Rayleigh scattering",
        "Clouds are above the atmosphere",
        "Ice crystals are white"
      ],
      correctIndex: 1,
      explanation: "Cloud droplets (10-20μm) are much larger than light wavelengths. Mie scattering occurs, scattering all wavelengths equally -> white appearance."
    },
    {
      scenario: "You're watching a beautiful sunset over the ocean.",
      question: "Why is the sunset red/orange?",
      options: [
        "The sun changes color",
        "Pollution makes it red",
        "Light travels through more atmosphere, scattering away blue",
        "Red light is emitted more at sunset"
      ],
      correctIndex: 2,
      explanation: "At sunset, sunlight travels through ~40x more atmosphere. Blue light scatters away completely via Rayleigh scattering, leaving only red/orange."
    },
    {
      scenario: "An engineer is designing optical equipment for different particle sizes.",
      question: "Mie scattering primarily occurs when:",
      options: [
        "Particles are much smaller than wavelength",
        "Particles are comparable to or larger than wavelength",
        "Temperature is very high",
        "Humidity is above 90%"
      ],
      correctIndex: 1,
      explanation: "Mie scattering dominates when particle size is comparable to or larger than the light wavelength (roughly 0.1-10x the wavelength)."
    },
    {
      scenario: "A scientist is doing an experiment with dilute milk and a flashlight.",
      question: "If you shine white light through dilute milk from the side, what color do you see?",
      options: [
        "White",
        "Yellow",
        "Bluish",
        "Red"
      ],
      correctIndex: 2,
      explanation: "Dilute milk has fewer fat droplets, so Rayleigh scattering from water molecules dominates. Blue light scatters more to the sides -> bluish appearance."
    },
    {
      scenario: "A marine biologist is studying why tropical water looks different from deep ocean.",
      question: "The ocean appears blue primarily because:",
      options: [
        "It reflects the sky",
        "Water molecules scatter blue light and absorb red",
        "Salt is blue",
        "Algae are blue"
      ],
      correctIndex: 1,
      explanation: "Water molecules scatter blue light (Rayleigh) AND absorb red light preferentially. Both effects combine to make deep water appear blue."
    },
    {
      scenario: "A photographer is planning to capture the most vivid sunset photos.",
      question: "Which would make a sunset more vivid?",
      options: [
        "Cleaner air",
        "Volcanic ash particles",
        "Lower humidity",
        "Colder temperature"
      ],
      correctIndex: 1,
      explanation: "Volcanic ash and pollution add particles that enhance Mie scattering, spreading reds and oranges more widely across the sky."
    },
    {
      scenario: "Astronomers are studying Mars rover images of the Martian sky.",
      question: "On Mars, the sky appears pink/butterscotch because:",
      options: [
        "Mars has a blue sun",
        "Iron-rich dust in the atmosphere",
        "CO2 is pink",
        "No atmosphere exists"
      ],
      correctIndex: 1,
      explanation: "Mars atmosphere contains iron-rich dust particles (~1μm). These are the right size for Mie scattering and absorb blue while scattering red."
    },
    {
      scenario: "A genetics student asks about eye color.",
      question: "Blue eyes have blue pigment. True or false, and why?",
      options: [
        "True - melanin is blue",
        "False - Rayleigh scattering of light in the iris",
        "True - blood vessels appear blue",
        "False - they reflect the sky"
      ],
      correctIndex: 1,
      explanation: "Blue eyes have NO blue pigment. The stroma contains colorless collagen fibers that Rayleigh scatter blue light, just like the sky!"
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "sunrise",
      title: "Sunrise & Sunset Colors",
      tagline: "Atmospheric optics in action",
      description: "At sunrise and sunset, sunlight travels through much more atmosphere. Blue light scatters away completely, leaving red and orange to reach your eyes.",
      connection: "At low sun angles, light path through atmosphere is ~40x longer. Short wavelengths scatter out entirely via Rayleigh scattering."
    },
    {
      icon: "cloud",
      title: "White Clouds",
      tagline: "Mie scattering at work",
      description: "Water droplets in clouds are much larger than air molecules (10-20μm vs 0.1nm). At this size, all wavelengths scatter equally - combining to produce white.",
      connection: "Mie scattering occurs when particle size is comparable to wavelength. Large water droplets scatter all visible wavelengths equally."
    },
    {
      icon: "ocean",
      title: "Ocean Blue Color",
      tagline: "Selective absorption + scattering",
      description: "Ocean water is blue for two reasons: Rayleigh scattering by water molecules AND selective absorption. Water absorbs red light more than blue.",
      connection: "Red light is absorbed within the first 10 meters. Blue penetrates to ~200m before being absorbed or scattered."
    },
    {
      icon: "milk",
      title: "Milk's White Color",
      tagline: "Fat droplet scattering",
      description: "Milk contains fat globules 1-10μm in size - perfect for Mie scattering. These scatter all visible wavelengths equally, making milk appear white.",
      connection: "Fat globules are ideal Mie scatterers. Full-fat milk shows strong Mie scattering. Skim milk shows a bluish tint due to more Rayleigh scattering."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate Rayleigh scattering intensity
  private calculateRayleighScattering(wavelength: number): number {
    // I ∝ 1/λ⁴
    const normalized = GREEN_WAVELENGTH / wavelength;
    return Math.pow(normalized, 4);
  }

  // PROTECTED: Calculate scattering based on parameters
  private calculateScattering(wavelength: number): number {
    const rayleighIntensity = this.calculateRayleighScattering(wavelength);
    const mieFactor = Math.min(1, this.particleSize / 5);

    // Blend between Rayleigh and Mie
    const scatterIntensity = rayleighIntensity * (1 - mieFactor) + 1 * mieFactor;
    const scatterProbability = scatterIntensity * (this.concentration / 100) * (this.pathLength / 100);

    return Math.min(0.95, scatterProbability * 0.3);
  }

  // PROTECTED: Get side view color (scattered light)
  private getSideViewColor(): { r: number; g: number; b: number } {
    const blueScatter = this.calculateScattering(BLUE_WAVELENGTH);
    const greenScatter = this.calculateScattering(GREEN_WAVELENGTH);
    const redScatter = this.calculateScattering(RED_WAVELENGTH);

    const mieFactor = Math.min(1, this.particleSize / 5);

    if (mieFactor > 0.7) {
      // Mie: white/gray
      return { r: 220, g: 220, b: 220 };
    }

    // Rayleigh: blue dominates
    const blue = Math.floor(150 + blueScatter * 105);
    const green = Math.floor(100 + greenScatter * 80);
    const red = Math.floor(80 + redScatter * 60);

    return { r: red, g: green, b: blue };
  }

  // PROTECTED: Get through view color (transmitted light)
  private getThroughViewColor(): { r: number; g: number; b: number } {
    const blueScatter = this.calculateScattering(BLUE_WAVELENGTH);
    const greenScatter = this.calculateScattering(GREEN_WAVELENGTH);
    const redScatter = this.calculateScattering(RED_WAVELENGTH);

    const mieFactor = Math.min(1, this.particleSize / 5);

    if (mieFactor > 0.7) {
      // Mie: gray/dim
      const dim = Math.floor(255 * (1 - this.concentration / 150));
      return { r: dim, g: dim, b: dim };
    }

    // Rayleigh: blue scattered out, yellow/orange transmitted
    const red = Math.floor(255 * (1 - redScatter * 0.3));
    const green = Math.floor(255 * (1 - greenScatter * 0.5));
    const blue = Math.floor(255 * (1 - blueScatter * 0.8));

    return { r: Math.max(50, red), g: Math.max(30, green), b: Math.max(20, blue) };
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
      if (input.id === 'particle_size') {
        this.particleSize = Math.max(0.1, Math.min(10, input.value));
      } else if (input.id === 'concentration') {
        this.concentration = Math.max(10, Math.min(100, input.value));
      } else if (input.id === 'path_length') {
        this.pathLength = Math.max(10, Math.min(100, input.value));
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
        if (buttonId === 'view_side') {
          this.viewAngle = 'side';
        } else if (buttonId === 'view_through') {
          this.viewAngle = 'through';
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
          this.particleSize = 5; // Reset to large particles for twist
        }
        break;

      case 'twist_play':
        if (buttonId === 'view_side') {
          this.viewAngle = 'side';
        } else if (buttonId === 'view_through') {
          this.viewAngle = 'through';
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
    this.particleSize = 0.1;
    this.concentration = 50;
    this.pathLength = 50;
    this.viewAngle = 'side';
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
    r.circle(100, 100, 150, { fill: 'rgba(56, 189, 248, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(249, 115, 22, 0.05)' });

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
    r.roundRect(110, 60, 180, 30, 8, { fill: 'rgba(56, 189, 248, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#38bdf8', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'Why is the Sky Blue?', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'And why are clouds white?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Sky illustration
    r.roundRect(60, 190, 280, 150, 16, { fill: 'linear-gradient(180deg, #7dd3fc 0%, #38bdf8 100%)' });

    // Sun
    r.circle(280, 220, 25, { fill: '#fbbf24' });

    // Clouds (white)
    r.circle(120, 230, 20, { fill: '#ffffff' });
    r.circle(140, 230, 25, { fill: '#ffffff' });
    r.circle(160, 230, 20, { fill: '#ffffff' });

    r.circle(200, 280, 18, { fill: '#ffffff' });
    r.circle(220, 280, 22, { fill: '#ffffff' });
    r.circle(240, 280, 18, { fill: '#ffffff' });

    // Comparison
    r.roundRect(60, 360, 130, 80, 12, { fill: '#38bdf8' });
    r.text(125, 395, 'Sky = Blue', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(125, 420, 'Small particles', { fill: '#bae6fd', fontSize: 11, textAnchor: 'middle' });

    r.roundRect(210, 360, 130, 80, 12, { fill: '#e2e8f0' });
    r.text(275, 395, 'Clouds = White', { fill: '#334155', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(275, 420, 'Large droplets', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    // Question
    r.roundRect(40, 460, 320, 80, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 495, 'What makes the same sunlight appear', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 515, 'blue in sky but white in clouds?', { fill: '#38bdf8', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Discover Why', variant: 'primary' });

    r.setCoachMessage('Light interacts differently with different sized particles!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'Looking up at a clear daytime sky,', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'why does it appear blue?', { fill: '#38bdf8', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Blue light is absorbed least',
      'Blue light is scattered most',
      'The ozone layer is blue',
      'Ocean reflection'
    ];

    options.forEach((option, i) => {
      const y = 200 + i * 65;
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
        bgColor = 'rgba(56, 189, 248, 0.3)';
      }

      r.roundRect(30, y, 340, 55, 10, { fill: bgColor });
      r.text(50, y + 32, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 13 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Correct!' : 'The answer: Blue light is scattered most!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 530, 'Small particles scatter short wavelengths', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 550, '(blue) more than long ones (red).', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Scattering Lab', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Light Scattering Lab', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Scattering tank visualization
    r.roundRect(30, 80, 340, 200, 12, { fill: 'rgba(15, 23, 42, 0.8)' });

    // Tank outline
    r.rect(60, 110, 220, 130, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Light beam
    r.rect(30, 168, 35, 10, { fill: '#ffffff' });

    // Transmitted light (color depends on particle size)
    const throughColor = this.getThroughViewColor();
    r.rect(275, 168, 90, 10, { fill: `rgb(${throughColor.r}, ${throughColor.g}, ${throughColor.b})` });

    // Scattered glow
    const sideColor = this.getSideViewColor();
    const glowOpacity = 0.15 + this.concentration / 300;
    r.ellipse(170, 173, 80 + this.concentration / 2, 40 + this.concentration / 4, { fill: `rgba(${sideColor.r}, ${sideColor.g}, ${sideColor.b}, ${glowOpacity})` });

    // Particles
    const mieFactor = Math.min(1, this.particleSize / 5);
    const particleCount = Math.floor(this.concentration / 4);
    for (let i = 0; i < particleCount; i++) {
      const px = 70 + (i % 10) * 20;
      const py = 120 + Math.floor(i / 10) * 25;
      const pSize = mieFactor > 0.5 ? 3 + Math.random() * 3 : 1 + Math.random() * 1.5;
      const pColor = mieFactor > 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(100,150,255,0.4)';
      r.circle(px, py, pSize, { fill: pColor });
    }

    // Labels
    r.text(48, 155, 'WHITE', { fill: '#ffffff', fontSize: 8, textAnchor: 'middle' });
    r.text(48, 165, 'LIGHT', { fill: '#ffffff', fontSize: 8, textAnchor: 'middle' });
    r.text(320, 165, 'TRANSMITTED', { fill: `rgb(${throughColor.r}, ${throughColor.g}, ${throughColor.b})`, fontSize: 8, textAnchor: 'middle' });

    // View toggle
    r.roundRect(50, 295, 140, 50, 10, { fill: this.viewAngle === 'side' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(51, 65, 85, 0.5)' });
    r.text(120, 325, 'Side View', { fill: this.viewAngle === 'side' ? '#38bdf8' : '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.addButton({ id: 'view_side', label: '', variant: 'secondary' });

    r.roundRect(210, 295, 140, 50, 10, { fill: this.viewAngle === 'through' ? 'rgba(249, 115, 22, 0.3)' : 'rgba(51, 65, 85, 0.5)' });
    r.text(280, 325, 'Through View', { fill: this.viewAngle === 'through' ? '#f97316' : '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.addButton({ id: 'view_through', label: '', variant: 'secondary' });

    // Current observation
    const viewColor = this.viewAngle === 'side' ? sideColor : throughColor;
    r.roundRect(80, 355, 240, 50, 10, { fill: 'rgba(30, 41, 59, 0.7)' });
    r.text(200, 375, 'What You See:', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    const colorName = mieFactor > 0.5 ? (this.viewAngle === 'side' ? 'White/Gray' : 'Dimmed') : (this.viewAngle === 'side' ? 'Blue-ish' : 'Yellow/Orange');
    r.text(200, 395, colorName, { fill: `rgb(${viewColor.r}, ${viewColor.g}, ${viewColor.b})`, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Sliders
    r.addSlider({
      id: 'particle_size',
      label: 'Particle Size (Rayleigh <-> Mie)',
      min: 0.1,
      max: 10,
      step: 0.1,
      value: this.particleSize
    });

    r.addSlider({
      id: 'concentration',
      label: 'Concentration',
      min: 10,
      max: 100,
      step: 5,
      value: this.concentration
    });

    // Insight
    r.roundRect(40, 485, 320, 60, 10, { fill: 'rgba(56, 189, 248, 0.15)' });
    const insightText = this.particleSize < 1
      ? 'Small particles: Blue scatters more (Rayleigh)'
      : 'Large particles: All colors scatter equally (Mie)';
    r.text(200, 520, insightText, { fill: '#38bdf8', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Science of Scattering', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Rayleigh formula card
    r.roundRect(30, 85, 340, 140, 16, { fill: 'rgba(56, 189, 248, 0.2)' });
    r.text(200, 115, 'Rayleigh Scattering', { fill: '#38bdf8', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(70, 130, 260, 40, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 158, 'Intensity  ~ 1/wavelength^4', { fill: '#ffffff', fontSize: 15, textAnchor: 'middle' });

    r.text(200, 200, 'Blue (450nm) scatters ~5.5x more than red (650nm)!', { fill: '#bae6fd', fontSize: 11, textAnchor: 'middle' });

    // Mie scattering card
    r.roundRect(30, 240, 340, 100, 16, { fill: 'rgba(226, 232, 240, 0.2)' });
    r.text(200, 270, 'Mie Scattering', { fill: '#e2e8f0', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 300, 'Large particles scatter all wavelengths equally', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 322, 'Result: White appearance (clouds, fog)', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 360, 340, 120, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 390, 'Key Insight', { fill: '#34d399', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 420, 'Particle size determines scattering type:', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 445, 'Small (molecules) -> Blue scattered -> Sky is blue', { fill: '#38bdf8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 465, 'Large (droplets) -> All scattered -> Clouds are white', { fill: '#e2e8f0', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Sunsets (Twist)', variant: 'secondary' });

    r.setCoachMessage("Now let's see what happens at sunset...");
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist: Sunsets', { fill: '#f97316', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'At sunset, sunlight travels through', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'much more atmosphere (40x longer path).', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 178, 'What color will you see?', { fill: '#f97316', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Deeper blue (more scattering)',
      'White (all colors scattered)',
      'Red/Orange (blue scattered away)',
      'Black (all light absorbed)'
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
        bgColor = 'rgba(249, 115, 22, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 2 ? 'Exactly right!' : 'Red/Orange! Blue is scattered away!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 530, 'With a longer path, blue light scatters', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 550, 'out completely, leaving red/orange.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Sunset Effect', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Sunset Simulation', { fill: '#f97316', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Similar to play phase but with longer path emphasis
    r.roundRect(30, 80, 340, 200, 12, { fill: 'rgba(15, 23, 42, 0.8)' });

    // Extended tank to show longer path
    r.rect(40, 110, 320, 130, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Light beam (longer)
    r.rect(10, 168, 35, 10, { fill: '#ffffff' });

    // Transmitted light (should be orange/red with long path)
    const throughColor = this.getThroughViewColor();
    r.rect(355, 168, 35, 10, { fill: `rgb(${throughColor.r}, ${throughColor.g}, ${throughColor.b})` });

    // Scattered glow (blue)
    const sideColor = this.getSideViewColor();
    r.ellipse(200, 173, 120, 50, { fill: `rgba(${sideColor.r}, ${sideColor.g}, ${sideColor.b}, 0.2)` });

    // Path length indicator
    r.text(200, 255, `Path Length: ${this.pathLength}% (longer at sunset!)`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Slider for path length
    r.addSlider({
      id: 'path_length',
      label: 'Path Length (Noon <-> Sunset)',
      min: 10,
      max: 100,
      step: 5,
      value: this.pathLength
    });

    // Results comparison
    r.roundRect(40, 360, 150, 80, 12, { fill: 'rgba(56, 189, 248, 0.2)' });
    r.text(115, 390, 'Side (Sky)', { fill: '#38bdf8', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(115, 420, 'Blue scattered', { fill: '#bae6fd', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(210, 360, 150, 80, 12, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(285, 390, 'Through (Sun)', { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(285, 420, 'Red/Orange left', { fill: '#fdba74', fontSize: 10, textAnchor: 'middle' });

    // Insight
    r.roundRect(40, 460, 320, 50, 10, { fill: 'rgba(249, 115, 22, 0.15)' });
    r.text(200, 490, 'Longer path = more blue scattered away = redder sun!', { fill: '#f97316', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Full Explanation', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Path Length Changes Everything', { fill: '#f97316', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Noon vs sunset comparison
    r.roundRect(25, 85, 170, 180, 12, { fill: 'rgba(56, 189, 248, 0.2)' });
    r.text(110, 115, 'Noon (Short Path)', { fill: '#38bdf8', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.circle(110, 170, 30, { fill: '#fbbf24' }); // Yellow sun
    r.text(110, 220, 'Blue sky, bright sun', { fill: '#bae6fd', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 240, 'Some blue scattered', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.roundRect(205, 85, 170, 180, 12, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(290, 115, 'Sunset (Long Path)', { fill: '#f97316', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.circle(290, 170, 30, { fill: '#ef4444' }); // Red sun
    r.text(290, 220, 'Orange/red sky & sun', { fill: '#fdba74', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 240, 'All blue scattered', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // The math
    r.roundRect(25, 280, 350, 100, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 310, 'The Math', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 340, 'At sunset: 40x longer path through atmosphere', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 360, '40x more chances for blue to scatter = redder light', { fill: '#fef08a', fontSize: 11, textAnchor: 'middle' });

    // Fun fact
    r.roundRect(40, 400, 320, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 425, 'Fun Fact', { fill: '#a855f7', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 450, 'Volcanic eruptions add particles that make', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 468, 'sunsets even more colorful worldwide!', { fill: '#c4b5fd', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    const appIcons = ['sunrise', 'cloud', 'ocean', 'milk'];
    const appLabels = ['Sunset', 'Clouds', 'Ocean', 'Milk'];

    appIcons.forEach((icon, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#0891b2';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 50, 8, { fill: bgColor });
      r.text(x + 40, 100, appLabels[i], { fill: '#ffffff', fontSize: 10, textAnchor: 'middle' });
      if (isCompleted) r.text(x + 40, 118, '(done)', { fill: '#34d399', fontSize: 8, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 145, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 180, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 205, app.tagline, { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });

    // Description (multi-line)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 235;
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

    // Physics connection
    r.roundRect(40, 330, 320, 70, 10, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 355, 'Physics Connection', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 380, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 420, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 460, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

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
      const scenarioWords = question.scenario.split(' ');
      let scenarioLine = '';
      let scenarioY = 120;
      scenarioWords.forEach(word => {
        if ((scenarioLine + word).length > 48) {
          r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
          scenarioLine = word + ' ';
          scenarioY += 16;
        } else {
          scenarioLine += word + ' ';
        }
      });
      if (scenarioLine) r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      // Question
      r.text(200, 195, question.question, { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 220 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(6, 182, 212, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        const displayOption = option.length > 42 ? option.substring(0, 42) + '...' : option;
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${displayOption}`, { fill: isSelected ? '#22d3ee' : '#e2e8f0', fontSize: 11 });

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
      r.text(200, 130, score >= 7 ? 'Excellent!' : 'Keep Learning!', { fill: score >= 7 ? '#34d399' : '#fbbf24', fontSize: 24, textAnchor: 'middle' });
      r.text(200, 180, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "You've mastered light scattering!" : 'Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 160, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'Rayleigh: I proportional to 1/wavelength^4',
        'Small particles scatter blue more',
        'Large particles scatter all equally (Mie)',
        'Path length affects color (sunsets)'
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
    r.text(200, 120, 'MASTERY', { fill: '#fbbf24', fontSize: 48, fontWeight: 'bold', textAnchor: 'middle' });

    // Title
    r.text(200, 180, 'Light Scattering Expert!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 210, 'You understand why the sky is blue', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 232, 'and clouds are white!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { label: 'Rayleigh Scattering', color: '#38bdf8' },
      { label: 'Mie Scattering', color: '#e2e8f0' },
      { label: 'Sunsets', color: '#f97316' },
      { label: 'Wavelength Dependence', color: '#a855f7' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 270 + Math.floor(i / 2) * 70;
      r.roundRect(x, y, 140, 55, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 35, concept.label, { fill: concept.color, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 430, 300, 80, 12, { fill: 'rgba(56, 189, 248, 0.2)' });
    r.text(200, 458, 'Key Formula', { fill: '#38bdf8', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 490, 'Scattering Intensity ~ 1/wavelength^4', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering light scattering physics!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      particleSize: this.particleSize,
      concentration: this.concentration,
      pathLength: this.pathLength,
      viewAngle: this.viewAngle,
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
    if (state.particleSize !== undefined) this.particleSize = state.particleSize as number;
    if (state.concentration !== undefined) this.concentration = state.concentration as number;
    if (state.pathLength !== undefined) this.pathLength = state.pathLength as number;
    if (state.viewAngle !== undefined) this.viewAngle = state.viewAngle as 'side' | 'through';
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createRayleighMieScatteringGame(sessionId: string): RayleighMieScatteringGame {
  return new RayleighMieScatteringGame(sessionId);
}
