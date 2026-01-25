import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// DIFFRACTION GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Single-slit diffraction and Young's double-slit interference
// Single slit: θ_min = λ/a (first minimum)
// Double slit: bright fringes at d*sinθ = mλ (m = 0, ±1, ±2, ...)
// This demonstrates the wave nature of light!
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
const SPEED_OF_LIGHT = 3e8; // m/s

export class DiffractionGame extends BaseGame {
  readonly gameType = 'diffraction';
  readonly gameTitle = 'Diffraction: Light Bends Around Corners';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private wavelength = 550; // nm (green light)
  private slitWidth = 100; // arbitrary units
  private slitSeparation = 300; // for double slit
  private slitMode: 'single' | 'double' = 'single';
  private animationTime = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // PROTECTED: Test questions with correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "Light from a laser passes through a very narrow slit onto a screen.",
      question: "Why does the light spread out instead of forming a thin line?",
      options: [
        "The laser is defective and emits diverging beams",
        "Light diffracts (bends) around the edges of the slit",
        "The slit heats up and creates thermal currents",
        "Gravity bends the light downward"
      ],
      correctIndex: 1,
      explanation: "When light passes through a narrow opening, it diffracts - bends around the edges due to its wave nature. This spreads the beam out."
    },
    {
      scenario: "You observe a single-slit diffraction pattern with a central bright band.",
      question: "What happens to the pattern if you make the slit narrower?",
      options: [
        "The central band becomes narrower",
        "The central band becomes wider",
        "The pattern disappears entirely",
        "Nothing changes - the pattern stays the same"
      ],
      correctIndex: 1,
      explanation: "Narrower slits cause MORE diffraction - the light spreads out more. This is why the central maximum gets wider with a narrower slit."
    },
    {
      scenario: "Young's double-slit experiment shows alternating bright and dark fringes.",
      question: "What causes the dark fringes?",
      options: [
        "Light from the two slits doesn't reach those areas",
        "The light waves from both slits destructively interfere",
        "The slits absorb some of the light",
        "The screen has dark spots painted on it"
      ],
      correctIndex: 1,
      explanation: "Dark fringes occur where light waves from the two slits are out of phase (by half a wavelength) and cancel each other out through destructive interference."
    },
    {
      scenario: "In a double-slit experiment, you switch from green light (λ=530nm) to red light (λ=650nm).",
      question: "How does the fringe pattern change?",
      options: [
        "Fringes become closer together",
        "Fringes become farther apart",
        "Pattern intensity increases but spacing stays same",
        "The pattern completely disappears"
      ],
      correctIndex: 1,
      explanation: "Fringe spacing is proportional to wavelength (Δy = λL/d). Red light has a longer wavelength than green, so fringes spread farther apart."
    },
    {
      scenario: "A single slit has width 'a' and is illuminated with light of wavelength λ.",
      question: "The first minimum occurs at angle θ where:",
      options: [
        "sin θ = λ/a",
        "sin θ = a/λ",
        "sin θ = 2λ/a",
        "sin θ = a/2λ"
      ],
      correctIndex: 0,
      explanation: "For single-slit diffraction, the first minimum (dark fringe) occurs when sin θ = λ/a. This is the defining relationship for single-slit diffraction."
    },
    {
      scenario: "You're trying to resolve two distant stars that are close together.",
      question: "A larger telescope aperture helps because:",
      options: [
        "It collects more light so stars appear brighter",
        "Larger aperture means LESS diffraction and finer angular resolution",
        "The telescope magnifies more with larger aperture",
        "It filters out atmospheric disturbances"
      ],
      correctIndex: 1,
      explanation: "Angular resolution is limited by diffraction. Larger apertures cause less diffraction (θ_min = 1.22λ/D), allowing finer detail to be resolved."
    },
    {
      scenario: "In Young's experiment, bright fringes occur when path difference equals:",
      question: "What condition gives constructive interference?",
      options: [
        "d sin θ = (m + ½)λ",
        "d sin θ = mλ (m = 0, ±1, ±2...)",
        "d sin θ = m/λ",
        "d sin θ = λ/m"
      ],
      correctIndex: 1,
      explanation: "Constructive interference (bright fringes) occurs when waves are in phase - when path difference is a whole number of wavelengths: d sin θ = mλ."
    },
    {
      scenario: "A CD creates rainbow patterns when light shines on it.",
      question: "What optical phenomenon causes this?",
      options: [
        "Refraction through the plastic surface",
        "Diffraction from the spiral track grooves acting as a grating",
        "Reflection from the metallic layer",
        "Absorption of certain wavelengths"
      ],
      correctIndex: 1,
      explanation: "The spiral tracks on a CD are spaced about 1.6μm apart - similar to visible light wavelengths. They act as a diffraction grating, separating colors at different angles."
    },
    {
      scenario: "An X-ray crystallographer studies a protein crystal structure.",
      question: "X-ray diffraction works for crystals because:",
      options: [
        "Crystals are transparent to X-rays",
        "Crystal atomic spacing matches X-ray wavelengths",
        "X-rays are absorbed by protein molecules",
        "Crystals amplify X-ray intensity"
      ],
      correctIndex: 1,
      explanation: "X-rays have wavelengths of ~0.1 nm, matching atomic spacing in crystals. This creates diffraction patterns that reveal atomic structure."
    },
    {
      scenario: "Single-slit diffraction and double-slit interference both involve wave phenomena.",
      question: "What fundamentally proved that light is a wave?",
      options: [
        "Light travels in straight lines",
        "Light can be reflected off mirrors",
        "Light creates interference patterns that particles cannot",
        "Light has different colors"
      ],
      correctIndex: 2,
      explanation: "Interference patterns with characteristic bright and dark fringes can only be explained by wave behavior. Particles would never create these patterns."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🔬",
      title: "X-Ray Crystallography",
      tagline: "Revealing atomic structures through diffraction",
      description: "X-rays diffract off crystal lattices, creating patterns that reveal molecular structures. This technique has determined structures of DNA, proteins, and countless materials.",
      connection: "Uses Bragg's Law: nλ = 2d sin θ, where d is atomic spacing ~0.1-1nm matching X-ray wavelengths."
    },
    {
      icon: "🔭",
      title: "Telescope Resolution",
      tagline: "Diffraction limits what we can see",
      description: "Even perfect telescopes can't see infinitely fine detail. Diffraction at the aperture sets a fundamental resolution limit determined by wavelength and mirror size.",
      connection: "Rayleigh criterion: θ_min = 1.22λ/D. Larger apertures and shorter wavelengths improve resolution."
    },
    {
      icon: "📀",
      title: "CD/DVD/Blu-ray",
      tagline: "Diffraction gratings in your media player",
      description: "Optical discs use tightly spaced tracks that act as diffraction gratings. The rainbow you see on a CD comes from different wavelengths diffracting at different angles.",
      connection: "Track spacing: CD=1.6μm, DVD=0.74μm, Blu-ray=0.32μm - all comparable to visible light wavelengths."
    },
    {
      icon: "🌡️",
      title: "Spectrometers",
      tagline: "Measuring light by separating wavelengths",
      description: "Diffraction gratings in spectrometers separate light into its component wavelengths, enabling chemical analysis, astronomy, and quality control across industries.",
      connection: "Grating equation: d sin θ = mλ allows precise wavelength measurement from angular position."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate diffraction pattern intensity
  private calculateSingleSlitIntensity(theta: number): number {
    // I = I_0 * (sin(β)/β)² where β = (π * a * sin θ) / λ
    const beta = (Math.PI * this.slitWidth * Math.sin(theta)) / (this.wavelength / 1000);
    if (Math.abs(beta) < 0.001) return 1;
    const sinc = Math.sin(beta) / beta;
    return sinc * sinc;
  }

  // PROTECTED: Calculate double-slit interference pattern
  private calculateDoubleSlitIntensity(theta: number): number {
    // Combines diffraction envelope with interference pattern
    const envelope = this.calculateSingleSlitIntensity(theta);
    // I = cos²(δ/2) where δ = (2π * d * sin θ) / λ
    const delta = (2 * Math.PI * this.slitSeparation * Math.sin(theta)) / (this.wavelength / 1000);
    const interference = Math.cos(delta / 2);
    return envelope * interference * interference;
  }

  // Get wavelength color
  private getWavelengthColor(): string {
    if (this.wavelength < 450) return '#7c3aed'; // violet
    if (this.wavelength < 490) return '#3b82f6'; // blue
    if (this.wavelength < 560) return '#22c55e'; // green
    if (this.wavelength < 590) return '#eab308'; // yellow
    if (this.wavelength < 620) return '#f97316'; // orange
    return '#ef4444'; // red
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
      if (input.id === 'wavelength') {
        this.wavelength = Math.max(380, Math.min(700, input.value));
      } else if (input.id === 'slit_width') {
        this.slitWidth = Math.max(20, Math.min(200, input.value));
      } else if (input.id === 'slit_separation') {
        this.slitSeparation = Math.max(100, Math.min(500, input.value));
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
          this.slitMode = this.slitMode === 'single' ? 'double' : 'single';
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
    this.wavelength = 550;
    this.slitWidth = 100;
    this.slitSeparation = 300;
    this.slitMode = 'single';
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
    r.circle(100, 100, 150, { fill: 'rgba(99, 102, 241, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(139, 92, 246, 0.05)' });

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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(99, 102, 241, 0.1)' });
    r.text(200, 80, 'WAVE OPTICS', { fill: '#818cf8', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'Light Bends Around', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Corners?', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 195, 'The wave nature of light revealed', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Illustration - laser through slit
    r.roundRect(100, 230, 200, 120, 16, { fill: 'rgba(30, 41, 59, 0.8)' });

    // Laser
    r.roundRect(80, 275, 50, 20, 4, { fill: '#dc2626' });
    r.text(105, 290, 'LASER', { fill: '#ffffff', fontSize: 6, textAnchor: 'middle' });

    // Beam to slit
    r.rect(130, 283, 35, 4, { fill: '#ef4444' });

    // Slit barrier
    r.rect(165, 260, 10, 25, { fill: '#374151' });
    r.rect(165, 305, 10, 25, { fill: '#374151' });

    // Spreading pattern
    r.circle(210, 290, 6, { fill: 'rgba(239, 68, 68, 0.8)' });
    r.circle(210, 275, 4, { fill: 'rgba(239, 68, 68, 0.4)' });
    r.circle(210, 305, 4, { fill: 'rgba(239, 68, 68, 0.4)' });
    r.circle(235, 290, 8, { fill: 'rgba(239, 68, 68, 0.6)' });
    r.circle(235, 268, 5, { fill: 'rgba(239, 68, 68, 0.3)' });
    r.circle(235, 312, 5, { fill: 'rgba(239, 68, 68, 0.3)' });

    // Screen
    r.rect(270, 250, 15, 80, { fill: '#f5f5f4' });

    // Fact card
    r.roundRect(40, 370, 320, 120, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 400, 'If light travels in straight lines,', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 420, 'why does it spread out after passing', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 440, 'through a narrow slit?', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 470, 'This is direct evidence light is a WAVE!', { fill: '#818cf8', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Discover Diffraction', variant: 'primary' });

    r.setCoachMessage('Explore how waves bend around obstacles!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'Light passes through a narrow slit.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'What will you see on the screen?', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 185, 'Think about what happens to the light...', { fill: '#818cf8', fontSize: 12, textAnchor: 'middle' });

    // Options
    const options = [
      'A single thin bright line matching the slit',
      'A wide central band with fainter bands on sides',
      'A completely uniform illuminated screen',
      'Two separate bright spots'
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
        bgColor = 'rgba(99, 102, 241, 0.3)';
      }

      r.roundRect(30, y, 340, 55, 10, { fill: bgColor });
      r.text(50, y + 32, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 500, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Excellent prediction!' : 'Diffraction creates a central band with side fringes!';
      r.text(200, 530, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 560, "Let's see this amazing wave behavior!", { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Explore Diffraction', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Diffraction Pattern Lab', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Mode toggle
    r.roundRect(130, 75, 140, 30, 8, { fill: this.slitMode === 'single' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(139, 92, 246, 0.3)' });
    r.text(200, 95, this.slitMode === 'single' ? 'Single Slit' : 'Double Slit', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.addButton({ id: 'toggle_mode', label: '', variant: 'secondary' });

    // Visualization area
    r.roundRect(20, 115, 360, 200, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    const color = this.getWavelengthColor();

    // Laser source
    r.roundRect(30, 205, 40, 20, 4, { fill: color });
    r.text(50, 218, 'λ', { fill: '#ffffff', fontSize: 10, textAnchor: 'middle' });

    // Beam
    r.rect(70, 213, 30, 4, { fill: color });

    // Slit barrier
    if (this.slitMode === 'single') {
      r.rect(100, 150, 8, 55, { fill: '#374151' });
      r.rect(100, 210 + this.slitWidth / 8, 8, 60, { fill: '#374151' });
    } else {
      r.rect(100, 150, 8, 45, { fill: '#374151' });
      r.rect(100, 200, 8, this.slitSeparation / 15, { fill: '#374151' });
      r.rect(100, 200 + this.slitSeparation / 15 + 15, 8, 50, { fill: '#374151' });
    }

    // Diffraction pattern on screen
    r.rect(320, 130, 20, 170, { fill: '#1f2937' });

    // Draw intensity pattern
    for (let i = 0; i < 85; i++) {
      const y = 135 + i * 2;
      const theta = ((i - 42.5) / 42.5) * 0.4; // angle range
      let intensity;
      if (this.slitMode === 'single') {
        intensity = this.calculateSingleSlitIntensity(theta);
      } else {
        intensity = this.calculateDoubleSlitIntensity(theta);
      }
      const brightness = Math.floor(intensity * 255);
      r.rect(322, y, 16, 2, { fill: `rgba(${brightness}, ${brightness}, ${brightness}, 0.9)` });
    }

    // Pattern label
    r.text(200, 330, this.slitMode === 'single' ? 'Single-slit: Central maximum + side fringes' : 'Double-slit: Interference fringes', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Sliders
    r.addSlider({
      id: 'wavelength',
      label: `Wavelength: ${this.wavelength} nm`,
      min: 380,
      max: 700,
      step: 10,
      value: this.wavelength
    });

    r.addSlider({
      id: 'slit_width',
      label: `Slit Width: ${this.slitWidth}`,
      min: 20,
      max: 200,
      step: 10,
      value: this.slitWidth
    });

    if (this.slitMode === 'double') {
      r.addSlider({
        id: 'slit_separation',
        label: `Slit Separation: ${this.slitSeparation}`,
        min: 100,
        max: 500,
        step: 20,
        value: this.slitSeparation
      });
    }

    // Physics formulas
    r.roundRect(30, 470, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
    if (this.slitMode === 'single') {
      r.text(200, 495, 'First minimum: sin θ = λ / a', { fill: '#818cf8', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 520, 'Narrower slit = wider spread!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    } else {
      r.text(200, 495, 'Bright fringes: d sin θ = mλ', { fill: '#a78bfa', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 520, 'Interference + diffraction envelope!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    }

    r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'Understanding Diffraction', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Wave bending concept
    r.roundRect(30, 80, 340, 120, 16, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 108, 'Why Light Spreads Out', { fill: '#818cf8', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 135, 'At the slit edges, light waves bend around', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 155, 'corners - a property ONLY waves have!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 180, 'Particles would just go straight through.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Single slit formula
    r.roundRect(30, 210, 340, 100, 16, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 238, 'Single Slit Diffraction', { fill: '#3b82f6', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(80, 250, 240, 30, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 272, 'First dark fringe: sin θ = λ / a', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 298, 'a = slit width, λ = wavelength', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Double slit formula
    r.roundRect(30, 320, 340, 100, 16, { fill: 'rgba(139, 92, 246, 0.2)' });
    r.text(200, 348, "Young's Double Slit", { fill: '#a78bfa', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(80, 360, 240, 30, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 382, 'Bright fringes: d sin θ = mλ', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 408, 'Path difference = whole wavelengths', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 430, 340, 70, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 465, 'Diffraction PROVED light is a wave!', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 485, 'This was a major physics breakthrough.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore a Twist', variant: 'secondary' });

    r.setCoachMessage('Now discover how diffraction limits what we can see!');
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist Challenge', { fill: '#a855f7', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'Two stars are very close together.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'Even with a perfect telescope, they blur.', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 180, 'What limits the telescope resolution?', { fill: '#a855f7', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Imperfect lenses cause aberrations',
      "Earth's atmosphere distorts the light",
      'Diffraction at the aperture sets a limit',
      'Stars are too faint to see clearly'
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
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 2 ? 'Exactly right!' : 'Diffraction is the fundamental limit!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 530, 'Even a perfect telescope has diffraction', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 550, 'at its aperture limiting resolution.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See the Resolution Limit', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'The Diffraction Limit', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Small telescope
    r.roundRect(25, 85, 170, 180, 12, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(110, 110, 'Small Aperture', { fill: '#818cf8', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Stars blurred together
    r.circle(90, 165, 25, { fill: 'rgba(255, 255, 255, 0.3)' });
    r.circle(130, 165, 25, { fill: 'rgba(255, 255, 255, 0.3)' });
    r.text(110, 210, 'Stars overlap!', { fill: '#f87171', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 230, 'MORE diffraction', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 248, 'θ_min = 1.22λ/D', { fill: '#818cf8', fontSize: 10, textAnchor: 'middle' });

    // Large telescope
    r.roundRect(205, 85, 170, 180, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(290, 110, 'Large Aperture', { fill: '#22c55e', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Stars resolved
    r.circle(265, 165, 15, { fill: 'rgba(255, 255, 255, 0.8)' });
    r.circle(315, 165, 15, { fill: 'rgba(255, 255, 255, 0.8)' });
    r.text(290, 210, 'Stars resolved!', { fill: '#22c55e', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 230, 'LESS diffraction', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 248, 'Bigger D = smaller θ', { fill: '#22c55e', fontSize: 10, textAnchor: 'middle' });

    // Rayleigh criterion
    r.roundRect(30, 280, 340, 130, 16, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 310, 'Rayleigh Criterion:', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(80, 320, 240, 35, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 345, 'θ_min = 1.22 λ / D', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });
    r.text(200, 375, 'Minimum angle between resolvable points', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 395, 'Bigger telescope = better resolution!', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review This Discovery', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Key Discovery', { fill: '#a855f7', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 85, 340, 180, 16, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 115, 'Diffraction Limits All Imaging!', { fill: '#a855f7', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(200, 150, 'No matter how perfect your optics,', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 170, 'diffraction at the aperture blurs', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 190, 'fine details below a certain angle.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Improvement strategies
    r.roundRect(40, 220, 150, 30, 8, { fill: 'rgba(22, 163, 74, 0.3)' });
    r.text(115, 240, 'Bigger aperture', { fill: '#22c55e', fontSize: 11, textAnchor: 'middle' });
    r.roundRect(210, 220, 150, 30, 8, { fill: 'rgba(22, 163, 74, 0.3)' });
    r.text(285, 240, 'Shorter wavelength', { fill: '#22c55e', fontSize: 11, textAnchor: 'middle' });

    // Examples
    r.roundRect(30, 280, 340, 120, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 310, 'Real World Examples:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 340, 'Hubble (2.4m) → radio telescopes (km!)', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 360, 'Optical microscopes → electron microscopes', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 380, 'CD (780nm laser) → Blu-ray (405nm laser)', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

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
      if (isActive) bgColor = '#6366f1';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.tagline, { fill: '#818cf8', fontSize: 11, textAnchor: 'middle' });

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
    r.roundRect(40, 320, 320, 70, 10, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 345, 'Physics Connection', { fill: '#818cf8', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
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
      r.text(200, 200, question.question.substring(0, 50), { fill: '#818cf8', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 230 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 42, 8, { fill: bgColor });
        r.text(40, y + 26, `${String.fromCharCode(65 + i)}. ${option.substring(0, 45)}${option.length > 45 ? '...' : ''}`, { fill: isSelected ? '#818cf8' : '#e2e8f0', fontSize: 10 });

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
      r.text(200, 225, score >= 7 ? "Excellent! You've mastered diffraction!" : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 140, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#818cf8', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 340, 'Single slit: sin θ = λ/a', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 360, 'Double slit: d sin θ = mλ', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 380, 'Resolution: θ_min = 1.22λ/D', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 400, 'Proof that light is a wave', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Trophy
    r.text(200, 120, '🌈', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Diffraction Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand how light waves bend!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '📡', label: 'Wave Nature' },
      { icon: '🔬', label: 'Interference' },
      { icon: '🔭', label: 'Resolution Limits' },
      { icon: '💿', label: 'Diffraction Gratings' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 280 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 450, 300, 70, 12, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 478, 'Key Formulas', { fill: '#818cf8', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 505, 'sin θ = λ/a    d sin θ = mλ', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering diffraction!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      wavelength: this.wavelength,
      slitWidth: this.slitWidth,
      slitSeparation: this.slitSeparation,
      slitMode: this.slitMode,
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
    if (state.wavelength !== undefined) this.wavelength = state.wavelength as number;
    if (state.slitWidth !== undefined) this.slitWidth = state.slitWidth as number;
    if (state.slitSeparation !== undefined) this.slitSeparation = state.slitSeparation as number;
    if (state.slitMode !== undefined) this.slitMode = state.slitMode as 'single' | 'double';
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createDiffractionGame(sessionId: string): DiffractionGame {
  return new DiffractionGame(sessionId);
}
