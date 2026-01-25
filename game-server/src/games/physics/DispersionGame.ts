import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// DISPERSION GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Dispersion - wavelength-dependent refraction
// n(λ) varies with wavelength: n_red < n_violet (normal dispersion)
// Cauchy equation: n(λ) = A + B/λ² + C/λ⁴
// This separates white light into rainbow spectrum!
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
// Cauchy coefficients for typical glass
const CAUCHY_A = 1.5;
const CAUCHY_B = 0.004; // μm²

export class DispersionGame extends BaseGame {
  readonly gameType = 'dispersion';
  readonly gameTitle = 'Dispersion: The CD Rainbow';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private incidentAngle = 45; // degrees
  private prismAngle = 60; // degrees
  private showSpectrum = true;
  private animationTime = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Wavelength colors
  private readonly spectrumColors = [
    { wavelength: 700, color: '#ef4444', name: 'Red' },
    { wavelength: 620, color: '#f97316', name: 'Orange' },
    { wavelength: 580, color: '#eab308', name: 'Yellow' },
    { wavelength: 530, color: '#22c55e', name: 'Green' },
    { wavelength: 470, color: '#3b82f6', name: 'Blue' },
    { wavelength: 420, color: '#8b5cf6', name: 'Violet' }
  ];

  // PROTECTED: Test questions with correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "White light passes through a glass prism.",
      question: "Why does the light separate into a rainbow?",
      options: [
        "The prism filters different colors",
        "Different wavelengths refract by different amounts",
        "The prism absorbs some colors",
        "Light naturally separates in glass"
      ],
      correctIndex: 1,
      explanation: "Dispersion occurs because the refractive index varies with wavelength. Shorter wavelengths (violet) bend more than longer ones (red)."
    },
    {
      scenario: "In normal dispersion (like glass), n(λ) decreases as wavelength increases.",
      question: "Which color bends the MOST?",
      options: [
        "Red (longest wavelength)",
        "Yellow (middle wavelength)",
        "Violet (shortest wavelength)",
        "All colors bend equally"
      ],
      correctIndex: 2,
      explanation: "In normal dispersion, shorter wavelengths have higher refractive index and bend more. Violet (λ ≈ 400nm) bends most, red (λ ≈ 700nm) bends least."
    },
    {
      scenario: "You're looking at the back of a CD under white light.",
      question: "Why do you see rainbow colors?",
      options: [
        "The plastic is acting as a prism",
        "The spiral tracks act as a diffraction grating",
        "The aluminum coating is oxidizing",
        "The laser dye is fluorescent"
      ],
      correctIndex: 1,
      explanation: "CDs have spiral tracks spaced ~1.6μm apart, acting as a diffraction grating. Different wavelengths diffract at different angles, creating rainbow patterns."
    },
    {
      scenario: "A rainbow appears after a rain shower with the sun behind you.",
      question: "The rainbow forms because:",
      options: [
        "Water vapor in air bends light",
        "Raindrops act as prisms - refracting and dispersing sunlight",
        "The sun emits colored rings",
        "Dust particles scatter different colors"
      ],
      correctIndex: 1,
      explanation: "Raindrops refract sunlight (at entry and exit) and reflect it internally. Dispersion separates colors, each exiting at slightly different angles."
    },
    {
      scenario: "The Cauchy equation n(λ) = A + B/λ² describes dispersion.",
      question: "As wavelength λ increases, refractive index n:",
      options: [
        "Increases (B/λ² term grows)",
        "Decreases (B/λ² term shrinks)",
        "Stays constant",
        "Oscillates"
      ],
      correctIndex: 1,
      explanation: "Since B/λ² decreases as λ increases, the total n decreases. This is normal dispersion: longer wavelengths have lower refractive indices."
    },
    {
      scenario: "Fiber optic cables carry data as light pulses.",
      question: "Why is dispersion a problem for fiber optics?",
      options: [
        "It makes the light too colorful",
        "Different wavelengths travel at different speeds, spreading pulses",
        "It increases light absorption",
        "It causes the fiber to heat up"
      ],
      correctIndex: 1,
      explanation: "Chromatic dispersion causes pulse broadening - different wavelengths in a pulse travel at different speeds, causing the pulse to spread and blur data."
    },
    {
      scenario: "Diamond has a very high refractive index (~2.4) and strong dispersion.",
      question: "This is why diamonds:",
      options: [
        "Are so hard",
        "Sparkle with rainbow 'fire'",
        "Are transparent",
        "Are expensive"
      ],
      correctIndex: 1,
      explanation: "Diamond's strong dispersion separates white light into vivid colors. High refractive index also causes total internal reflection, making the 'fire' visible from many angles."
    },
    {
      scenario: "A spectrometer uses a prism or grating to analyze light.",
      question: "Dispersion in spectrometers allows us to:",
      options: [
        "Focus light more precisely",
        "Measure the intensity of light",
        "Separate and identify wavelengths present in light",
        "Filter out unwanted light"
      ],
      correctIndex: 2,
      explanation: "Spectrometers use dispersion to spread light by wavelength onto a detector. Each position corresponds to a specific wavelength, enabling spectral analysis."
    },
    {
      scenario: "Some materials exhibit 'anomalous dispersion' where n increases with wavelength.",
      question: "This typically occurs:",
      options: [
        "In all crystalline materials",
        "Near absorption bands where light interacts strongly with the material",
        "Only at very low temperatures",
        "Only in gases"
      ],
      correctIndex: 1,
      explanation: "Anomalous dispersion occurs near resonant frequencies where the material strongly absorbs. The refractive index behavior changes dramatically in these regions."
    },
    {
      scenario: "Comparing a prism and a diffraction grating for dispersing light.",
      question: "A key difference is:",
      options: [
        "Only prisms work with white light",
        "Prism: red bends least; Grating: red diffracts most",
        "Gratings require special materials",
        "Only gratings show colors"
      ],
      correctIndex: 1,
      explanation: "Prism dispersion: shorter λ bends more (n higher). Grating dispersion: longer λ diffracts more (angle from d sinθ = mλ). They reverse the spectrum order!"
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🌈",
      title: "Rainbows",
      tagline: "Nature's prism in the sky",
      description: "Raindrops act as tiny prisms. Light enters, refracts (dispersing colors), reflects off the back, and exits. Each color emerges at a specific angle, creating the arc.",
      connection: "Primary rainbow: 42° arc. Red on outside (42°), violet inside (40°). Secondary rainbow: reversed order at 51°."
    },
    {
      icon: "💎",
      title: "Diamond Fire",
      tagline: "The physics of sparkle",
      description: "Diamond's high dispersion (0.044) and refractive index (2.42) create intense 'fire'. Total internal reflection traps light, letting it bounce and disperse before escaping.",
      connection: "Dispersion = n_F - n_C. Diamond: 0.044 vs glass: 0.017. Higher dispersion = more colorful fire."
    },
    {
      icon: "📡",
      title: "Fiber Optic Communications",
      tagline: "Fighting dispersion to carry data",
      description: "Chromatic dispersion in fibers spreads data pulses. Engineers use dispersion-shifted fibers and laser sources with narrow linewidth to minimize pulse broadening.",
      connection: "Dispersion ~17 ps/(nm·km) at 1550nm. Limits data rate × distance product without compensation."
    },
    {
      icon: "🔬",
      title: "Spectroscopy",
      tagline: "Reading light's hidden messages",
      description: "Prism or grating spectrometers spread light by wavelength. Each element emits unique spectral lines - a fingerprint that reveals composition of stars, materials, and more.",
      connection: "Spectral resolution R = λ/Δλ. Higher dispersion = better separation of close wavelengths."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate refractive index using Cauchy equation
  private calculateRefractiveIndex(wavelength: number): number {
    const lambda_um = wavelength / 1000; // convert nm to μm
    return CAUCHY_A + CAUCHY_B / (lambda_um * lambda_um);
  }

  // PROTECTED: Calculate refraction angle using Snell's law
  private calculateRefractionAngle(n: number, incidentAngle: number): number {
    const theta1 = incidentAngle * Math.PI / 180;
    const sinTheta2 = Math.sin(theta1) / n;
    if (Math.abs(sinTheta2) > 1) return 90; // Total internal reflection
    return Math.asin(sinTheta2) * 180 / Math.PI;
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
      if (input.id === 'incident_angle') {
        this.incidentAngle = Math.max(10, Math.min(80, input.value));
      } else if (input.id === 'prism_angle') {
        this.prismAngle = Math.max(30, Math.min(90, input.value));
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
        if (buttonId === 'toggle_spectrum') {
          this.showSpectrum = !this.showSpectrum;
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
    this.incidentAngle = 45;
    this.prismAngle = 60;
    this.showSpectrum = true;
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

    // Subtle background orbs (rainbow colors)
    r.circle(80, 100, 100, { fill: 'rgba(239, 68, 68, 0.05)' });
    r.circle(200, 80, 80, { fill: 'rgba(34, 197, 94, 0.05)' });
    r.circle(320, 120, 90, { fill: 'rgba(59, 130, 246, 0.05)' });
    r.circle(100, 600, 120, { fill: 'rgba(139, 92, 246, 0.05)' });

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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(139, 92, 246, 0.1)' });
    r.text(200, 80, 'WAVE OPTICS', { fill: '#a78bfa', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The CD Rainbow', { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 165, 'Why white light becomes colors', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // CD illustration
    r.roundRect(100, 200, 200, 140, 16, { fill: 'rgba(30, 41, 59, 0.8)' });

    // CD disc
    r.circle(200, 270, 50, { fill: '#1f2937' });
    r.circle(200, 270, 40, { fill: '#374151' });
    r.circle(200, 270, 10, { fill: '#0f172a' });

    // Rainbow shimmer effect
    const time = this.animationTime * 2;
    r.arc(200, 270, 35, time, time + 0.5, { fill: 'rgba(239, 68, 68, 0.4)' });
    r.arc(200, 270, 35, time + 0.5, time + 1, { fill: 'rgba(249, 115, 22, 0.4)' });
    r.arc(200, 270, 35, time + 1, time + 1.5, { fill: 'rgba(234, 179, 8, 0.4)' });
    r.arc(200, 270, 35, time + 1.5, time + 2, { fill: 'rgba(34, 197, 94, 0.4)' });
    r.arc(200, 270, 35, time + 2, time + 2.5, { fill: 'rgba(59, 130, 246, 0.4)' });
    r.arc(200, 270, 35, time + 2.5, time + 3, { fill: 'rgba(139, 92, 246, 0.4)' });

    // Fact card
    r.roundRect(40, 360, 320, 120, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 390, 'Tilt a CD under light and', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 410, 'rainbow colors appear!', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 445, 'Prisms, rainbows, diamonds - all use', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 465, 'the same principle: DISPERSION', { fill: '#a78bfa', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Discover Why', variant: 'primary' });

    r.setCoachMessage('Explore how white light becomes rainbows!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'White light enters a glass prism', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'and separates into a rainbow.', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 185, 'Why does this happen?', { fill: '#a78bfa', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'The prism filters out most colors',
      'Different wavelengths bend by different amounts',
      'White light is actually just one color',
      'The prism creates new colors from energy'
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
        bgColor = 'rgba(139, 92, 246, 0.3)';
      }

      r.roundRect(30, y, 340, 55, 10, { fill: bgColor });
      r.text(50, y + 32, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 500, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Exactly right!' : 'Different wavelengths bend differently!';
      r.text(200, 530, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 560, "This is called DISPERSION!", { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See It In Action', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Prism Dispersion Lab', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization area
    r.roundRect(20, 85, 360, 220, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Light source
    r.roundRect(30, 180, 50, 30, 4, { fill: '#fef3c7' });
    r.text(55, 200, 'LIGHT', { fill: '#92400e', fontSize: 8, textAnchor: 'middle' });

    // Incident white beam
    r.line(80, 195, 130, 195, { stroke: '#ffffff', strokeWidth: 4 });

    // Prism (triangle)
    const prismCenterX = 180;
    const prismCenterY = 195;
    r.polygon([
      { x: prismCenterX - 50, y: prismCenterY + 40 },
      { x: prismCenterX, y: prismCenterY - 50 },
      { x: prismCenterX + 50, y: prismCenterY + 40 }
    ], { fill: 'rgba(139, 92, 246, 0.3)', stroke: '#a78bfa', strokeWidth: 2 });

    // Dispersed beams
    if (this.showSpectrum) {
      this.spectrumColors.forEach((spec, i) => {
        const baseAngle = -15 + i * 6; // Different exit angles
        const endX = prismCenterX + 50 + Math.cos(baseAngle * Math.PI / 180) * 120;
        const endY = prismCenterY + 20 + Math.sin(baseAngle * Math.PI / 180) * 120;
        r.line(prismCenterX + 40, prismCenterY + 10 + i * 5, endX, endY, {
          stroke: spec.color,
          strokeWidth: 3
        });
      });

      // Spectrum labels on screen
      r.rect(340, 130, 30, 140, { fill: '#1f2937' });
      this.spectrumColors.forEach((spec, i) => {
        r.rect(342, 135 + i * 22, 26, 18, { fill: spec.color });
      });
    } else {
      // Just white beam through
      r.line(prismCenterX + 40, prismCenterY + 20, 340, 195, { stroke: '#ffffff', strokeWidth: 4 });
    }

    // Toggle button area
    r.text(200, 320, this.showSpectrum ? 'Showing Dispersion' : 'No Dispersion', { fill: '#a78bfa', fontSize: 12, textAnchor: 'middle' });
    r.addButton({ id: 'toggle_spectrum', label: this.showSpectrum ? 'Hide Dispersion' : 'Show Dispersion', variant: 'secondary' });

    // Sliders
    r.addSlider({
      id: 'incident_angle',
      label: `Incident Angle: ${this.incidentAngle}°`,
      min: 10,
      max: 80,
      step: 5,
      value: this.incidentAngle
    });

    // Key physics
    r.roundRect(30, 420, 340, 140, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
    r.text(200, 448, 'Why Colors Separate:', { fill: '#a78bfa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 475, "Refractive index n depends on wavelength λ", { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 495, "n(λ) = A + B/λ² (Cauchy equation)", { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 520, "Shorter λ (violet) → higher n → bends more", { fill: '#8b5cf6', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 540, "Longer λ (red) → lower n → bends less", { fill: '#ef4444', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'Understanding Dispersion', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // What is dispersion
    r.roundRect(30, 80, 340, 100, 16, { fill: 'rgba(139, 92, 246, 0.2)' });
    r.text(200, 108, 'Dispersion', { fill: '#a78bfa', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 135, 'The refractive index n varies with wavelength λ', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 155, 'Different colors bend by different amounts!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Cauchy equation
    r.roundRect(30, 190, 340, 100, 16, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 218, 'Cauchy Equation', { fill: '#3b82f6', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(80, 230, 240, 30, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 252, 'n(λ) = A + B/λ² + C/λ⁴', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 280, 'Constants A, B, C depend on the material', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Spectrum order
    r.roundRect(30, 300, 340, 110, 16, { fill: 'rgba(234, 179, 8, 0.2)' });
    r.text(200, 325, 'In Normal Dispersion:', { fill: '#eab308', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Color bars with bending amounts
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
    colors.forEach((color, i) => {
      r.rect(50 + i * 50, 345, 45, 15, { fill: color });
    });
    r.text(75, 375, 'Red', { fill: '#ef4444', fontSize: 9, textAnchor: 'middle' });
    r.text(275, 375, 'Violet', { fill: '#8b5cf6', fontSize: 9, textAnchor: 'middle' });
    r.text(175, 395, 'Bends least ←——→ Bends most', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore a Twist', variant: 'secondary' });

    r.setCoachMessage('Discover how CDs use diffraction instead of dispersion!');
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist Challenge', { fill: '#a855f7', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'A CD shows rainbow colors, but', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, "the color order is REVERSED from a prism!", { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 180, 'Why is the CD rainbow different?', { fill: '#a855f7', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      "CDs use a different type of glass",
      "CD tracks cause diffraction, not refraction",
      "The aluminum coating reverses colors",
      "Your eyes perceive CD light differently"
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
      const message = this.twistPrediction === 1 ? 'Exactly right!' : 'CDs use diffraction, not refraction!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 530, 'The tiny tracks act as a diffraction grating.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 550, "Longer wavelengths diffract MORE (opposite of prism)!", { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See the Difference', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Prism vs Grating', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Prism side
    r.roundRect(25, 85, 170, 200, 12, { fill: 'rgba(139, 92, 246, 0.2)' });
    r.text(110, 110, 'Prism (Refraction)', { fill: '#a78bfa', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Mini prism
    r.polygon([
      { x: 80, y: 180 },
      { x: 110, y: 130 },
      { x: 140, y: 180 }
    ], { fill: 'rgba(139, 92, 246, 0.3)', stroke: '#a78bfa', strokeWidth: 1 });

    // Spectrum - violet bends more
    r.line(140, 165, 180, 140, { stroke: '#8b5cf6', strokeWidth: 2 });
    r.line(140, 170, 180, 160, { stroke: '#3b82f6', strokeWidth: 2 });
    r.line(140, 175, 180, 180, { stroke: '#22c55e', strokeWidth: 2 });
    r.line(140, 180, 180, 200, { stroke: '#eab308', strokeWidth: 2 });
    r.line(140, 185, 180, 220, { stroke: '#ef4444', strokeWidth: 2 });

    r.text(110, 250, 'Violet bends MOST', { fill: '#8b5cf6', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 270, 'n(violet) > n(red)', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Grating side
    r.roundRect(205, 85, 170, 200, 12, { fill: 'rgba(234, 179, 8, 0.2)' });
    r.text(290, 110, 'Grating (Diffraction)', { fill: '#eab308', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // CD tracks (lines)
    for (let i = 0; i < 6; i++) {
      r.line(265 + i * 10, 130, 265 + i * 10, 180, { stroke: '#64748b', strokeWidth: 2 });
    }

    // Spectrum - red diffracts more (d sinθ = mλ)
    r.line(295, 165, 355, 140, { stroke: '#ef4444', strokeWidth: 2 });
    r.line(295, 170, 355, 160, { stroke: '#eab308', strokeWidth: 2 });
    r.line(295, 175, 355, 180, { stroke: '#22c55e', strokeWidth: 2 });
    r.line(295, 180, 355, 200, { stroke: '#3b82f6', strokeWidth: 2 });
    r.line(295, 185, 355, 220, { stroke: '#8b5cf6', strokeWidth: 2 });

    r.text(290, 250, 'Red diffracts MOST', { fill: '#ef4444', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 270, 'd sinθ = mλ', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Key difference
    r.roundRect(30, 300, 340, 100, 16, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 330, 'The Key Difference:', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 355, 'Prism: shorter λ bends more (higher n)', { fill: '#a78bfa', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 375, 'Grating: longer λ diffracts more (d sinθ = mλ)', { fill: '#eab308', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 395, 'REVERSED spectrum order!', { fill: '#f87171', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review This Discovery', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Key Discovery', { fill: '#a855f7', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 85, 340, 160, 16, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 115, 'Two Ways to Separate Colors!', { fill: '#a855f7', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Dispersion
    r.roundRect(40, 135, 150, 90, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(115, 158, 'Dispersion', { fill: '#a78bfa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(115, 178, 'n varies with λ', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(115, 195, 'Prisms, rainbows', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(115, 210, 'Violet bends most', { fill: '#8b5cf6', fontSize: 9, textAnchor: 'middle' });

    // Diffraction
    r.roundRect(210, 135, 150, 90, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(285, 158, 'Diffraction', { fill: '#eab308', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(285, 178, 'd sinθ = mλ', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(285, 195, 'CDs, gratings', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(285, 210, 'Red diffracts most', { fill: '#ef4444', fontSize: 9, textAnchor: 'middle' });

    // Both useful
    r.roundRect(30, 260, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 288, 'Both Are Useful!', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 315, 'Prisms: simple, efficient for visible light', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 335, 'Gratings: more precise, work for all wavelengths', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

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
      if (isActive) bgColor = '#7c3aed';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.tagline, { fill: '#a78bfa', fontSize: 11, textAnchor: 'middle' });

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
    r.roundRect(40, 320, 320, 70, 10, { fill: 'rgba(139, 92, 246, 0.2)' });
    r.text(200, 345, 'Physics Connection', { fill: '#a78bfa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
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
      r.text(200, 200, question.question.substring(0, 50), { fill: '#a78bfa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 230 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(139, 92, 246, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 42, 8, { fill: bgColor });
        r.text(40, y + 26, `${String.fromCharCode(65 + i)}. ${option.substring(0, 45)}${option.length > 45 ? '...' : ''}`, { fill: isSelected ? '#a78bfa' : '#e2e8f0', fontSize: 10 });

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
      r.text(200, 225, score >= 7 ? "Excellent! You've mastered dispersion!" : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 140, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#a78bfa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 340, 'Cauchy equation: n(λ) = A + B/λ²', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 360, 'Normal dispersion: violet bends most', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 380, 'Diffraction: red diffracts most', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 400, 'Real-world applications', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

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
    r.text(200, 200, 'Dispersion Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand how light separates into colors!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '🔺', label: 'Prism Physics' },
      { icon: '💿', label: 'Grating Diffraction' },
      { icon: '🌈', label: 'Rainbow Formation' },
      { icon: '💎', label: 'Diamond Fire' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 280 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 450, 300, 70, 12, { fill: 'rgba(139, 92, 246, 0.2)' });
    r.text(200, 478, 'Key Equation', { fill: '#a78bfa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 505, 'n(λ) = A + B/λ²', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering dispersion!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      incidentAngle: this.incidentAngle,
      prismAngle: this.prismAngle,
      showSpectrum: this.showSpectrum,
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
    if (state.incidentAngle !== undefined) this.incidentAngle = state.incidentAngle as number;
    if (state.prismAngle !== undefined) this.prismAngle = state.prismAngle as number;
    if (state.showSpectrum !== undefined) this.showSpectrum = state.showSpectrum as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createDispersionGame(sessionId: string): DispersionGame {
  return new DispersionGame(sessionId);
}
