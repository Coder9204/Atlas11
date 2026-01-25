import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// PHOTOELECTRIC EFFECT GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Quantum nature of light - photons eject electrons from metal
// E_photon = hf = hc/λ (photon energy depends on frequency/wavelength)
// KE_max = E_photon - Φ (Einstein's photoelectric equation)
// Emission occurs only when E_photon >= Φ (work function)
// Intensity affects NUMBER of electrons, not their energy
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
  tagline: string;
  description: string;
  connection: string;
}

interface Metal {
  name: string;
  workFunction: number; // in eV
}

// Physics constants (PROTECTED)
const PLANCK_CONSTANT = 4.136e-15; // eV·s
const SPEED_OF_LIGHT = 3e8; // m/s

export class PhotoelectricEffectGame extends BaseGame {
  readonly gameType = 'photoelectric_effect';
  readonly gameTitle = 'The Photoelectric Effect';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private wavelength = 400; // nm
  private intensity = 70; // percentage
  private metalIndex = 0; // index into metals array
  private hasExperimented = false;
  private hasTestedIntensity = false;
  private animationTime = 0;

  // Twist simulation - stopping voltage
  private stoppingVoltage = 0;

  // Metal options
  private readonly metals: Metal[] = [
    { name: 'Sodium', workFunction: 2.3 },
    { name: 'Calcium', workFunction: 3.0 },
    { name: 'Zinc', workFunction: 4.3 },
    { name: 'Copper', workFunction: 4.7 },
    { name: 'Platinum', workFunction: 5.6 }
  ];

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // PROTECTED: Test questions with correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      question: "Red light shines on a metal surface but no electrons escape. You switch to blue light of the same intensity. What happens?",
      options: [
        "Still no electrons - color doesn't matter",
        "Electrons are emitted because blue has higher frequency",
        "Same number of electrons, but slower",
        "Cannot determine without knowing the metal"
      ],
      correctIndex: 1,
      explanation: "Blue light has higher frequency, meaning each photon carries more energy (E = hf). If blue photon energy exceeds the work function, electrons will be emitted."
    },
    {
      question: "You double the intensity of UV light hitting a metal surface. How does this affect the ejected electrons?",
      options: [
        "Electrons move twice as fast",
        "Twice as many electrons are emitted at the same speed",
        "No change at all",
        "Electrons have more kinetic energy"
      ],
      correctIndex: 1,
      explanation: "Doubling intensity means twice as many photons per second. More photons = more electrons, but each photon has the same energy so electron speed is unchanged."
    },
    {
      question: "Einstein won the 1921 Nobel Prize for explaining the photoelectric effect. What was his key insight?",
      options: [
        "Light travels in waves like water",
        "Light consists of discrete packets called photons",
        "Electrons have wave properties",
        "Energy is continuously distributed"
      ],
      correctIndex: 1,
      explanation: "Einstein proposed that light energy comes in discrete quanta (photons), each with energy E = hf. This explained why only frequency determines whether electrons can escape."
    },
    {
      question: "Metal A has work function 2.0 eV. Metal B has work function 4.5 eV. You shine 3.0 eV photons on both. What happens?",
      options: [
        "Both metals emit electrons",
        "Neither metal emits electrons",
        "Only Metal A emits electrons",
        "Only Metal B emits electrons"
      ],
      correctIndex: 2,
      explanation: "Electrons escape only when photon energy exceeds work function. Metal A: 3.0 > 2.0 eV (emission). Metal B: 3.0 < 4.5 eV (no emission)."
    },
    {
      question: "Classical physics predicted that brighter light should eject faster electrons. Why was this prediction wrong?",
      options: [
        "Light doesn't interact with electrons",
        "Energy comes in discrete packets, not continuous waves",
        "Metals absorb all light energy as heat",
        "Electrons are too heavy to accelerate"
      ],
      correctIndex: 1,
      explanation: "Classical wave theory assumed energy accumulates continuously. But light comes in photons with fixed energy E = hf. Each photon's energy depends only on frequency."
    },
    {
      question: "The maximum KE of ejected electrons is 1.5 eV. The metal's work function is 2.3 eV. What was the photon energy?",
      options: [
        "0.8 eV",
        "2.3 eV",
        "3.8 eV",
        "1.5 eV"
      ],
      correctIndex: 2,
      explanation: "Using Einstein's equation: E_photon = Work Function + KE_max = 2.3 + 1.5 = 3.8 eV."
    },
    {
      question: "Why do solar cells need photons with energy greater than the semiconductor's band gap?",
      options: [
        "To heat up the material",
        "To free electrons from bound states",
        "To make the cell vibrate",
        "To change the cell's color"
      ],
      correctIndex: 1,
      explanation: "Just like the photoelectric effect, electrons in solar cells need enough energy to escape their bound states. The band gap is analogous to the work function."
    },
    {
      question: "Night vision devices amplify starlight using the photoelectric effect. How do they work?",
      options: [
        "They heat up the light",
        "One photon triggers a cascade of electrons",
        "They slow down light",
        "They change infrared to visible"
      ],
      correctIndex: 1,
      explanation: "Photomultiplier tubes use the photoelectric effect: one photon releases one electron, which triggers a cascade, amplifying the signal millions of times."
    },
    {
      question: "The threshold frequency for a metal is 5 x 10^14 Hz. What happens with light at 6 x 10^14 Hz?",
      options: [
        "No emission - frequency too high",
        "Electrons are emitted with kinetic energy",
        "Light passes through the metal",
        "Electrons are absorbed"
      ],
      correctIndex: 1,
      explanation: "Since 6 x 10^14 Hz > threshold of 5 x 10^14 Hz, photons have enough energy. Electrons will be emitted with kinetic energy equal to the excess energy."
    },
    {
      question: "In a digital camera sensor, what determines how bright each pixel appears?",
      options: [
        "The color of light hitting it",
        "The number of photons hitting that pixel",
        "The temperature of the sensor",
        "The size of the camera"
      ],
      correctIndex: 1,
      explanation: "Each photon hitting a pixel can free one electron. More photons = more freed electrons = stronger signal = brighter pixel."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "☀️",
      title: "Solar Cells",
      tagline: "Sunlight to electricity",
      description: "Photovoltaic cells convert sunlight directly into electricity. Photons with energy greater than the semiconductor's band gap free electrons that flow as current.",
      connection: "Silicon band gap: 1.1 eV. Multi-junction cells use different band gaps to capture more of the solar spectrum."
    },
    {
      icon: "📷",
      title: "Digital Camera Sensors",
      tagline: "Photons become pixels",
      description: "CCD and CMOS sensors are arrays of photoelectric cells. Each pixel converts incoming photons into electrons, measuring light intensity to create images.",
      connection: "More photons = more electrons = brighter pixel. Color filters (Bayer pattern) separate R, G, B channels."
    },
    {
      icon: "🌙",
      title: "Night Vision",
      tagline: "Amplify starlight 50,000x",
      description: "Photomultiplier tubes amplify tiny amounts of light. One photon releases one electron, which triggers more electrons in a cascade, amplifying light enormously.",
      connection: "Each stage multiplies electron count 10-100x. Gen 3+ devices can see in starlight only."
    },
    {
      icon: "🚪",
      title: "Light Sensors",
      tagline: "Automatic doors and safety",
      description: "Photoelectric sensors detect when light beams are broken. Fewer photons reaching the detector triggers automatic doors, elevator safety, and industrial automation.",
      connection: "Broken beam = fewer photons = signal change. Response time: milliseconds or faster."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate photon energy from wavelength
  private calculatePhotonEnergy(wavelengthNm: number): number {
    return (PLANCK_CONSTANT * SPEED_OF_LIGHT) / (wavelengthNm * 1e-9);
  }

  // PROTECTED: Calculate maximum kinetic energy of ejected electrons
  private calculateMaxKE(wavelengthNm: number, workFunction: number): number {
    const photonEnergy = this.calculatePhotonEnergy(wavelengthNm);
    return Math.max(0, photonEnergy - workFunction);
  }

  // PROTECTED: Check if emission occurs
  private emissionOccurs(wavelengthNm: number, workFunction: number): boolean {
    const photonEnergy = this.calculatePhotonEnergy(wavelengthNm);
    return photonEnergy >= workFunction;
  }

  // Get color from wavelength
  private wavelengthToColor(wl: number): string {
    if (wl < 380) return '#a78bfa'; // UV - purple
    if (wl < 450) return '#3b82f6'; // Blue
    if (wl < 495) return '#06b6d4'; // Cyan
    if (wl < 570) return '#22c55e'; // Green
    if (wl < 590) return '#eab308'; // Yellow
    if (wl < 620) return '#f97316'; // Orange
    return '#ef4444'; // Red
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
        this.wavelength = Math.floor(input.value);
        this.hasExperimented = true;
      } else if (input.id === 'intensity') {
        this.intensity = Math.floor(input.value);
        this.hasTestedIntensity = true;
      } else if (input.id === 'stopping_voltage') {
        this.stoppingVoltage = input.value;
      }
    }
  }

  private handleButtonClick(buttonId: string): void {
    switch (this.phase) {
      case 'hook':
        if (buttonId === 'begin') {
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
          this.resetSimulation();
        }
        break;

      case 'play':
        if (buttonId.startsWith('metal_')) {
          this.metalIndex = parseInt(buttonId.split('_')[1]);
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

  private resetSimulation(): void {
    this.wavelength = 400;
    this.intensity = 70;
    this.metalIndex = 0;
    this.hasExperimented = false;
    this.hasTestedIntensity = false;
    this.stoppingVoltage = 0;
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
    this.resetSimulation();
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
    r.circle(100, 100, 150, { fill: 'rgba(245, 158, 11, 0.05)' });
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
    r.roundRect(125, 60, 150, 30, 8, { fill: 'rgba(245, 158, 11, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle' });

    // Nobel badge
    r.roundRect(100, 105, 200, 35, 12, { fill: 'rgba(161, 98, 7, 0.3)' });
    r.text(200, 128, 'Nobel Prize in Physics 1921', { fill: '#fbbf24', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    // Title
    r.text(200, 180, 'The Photoelectric Effect', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 210, "Einstein's revolutionary discovery", { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    // Light bulb icon
    r.text(200, 290, '💡', { fontSize: 56, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 330, 320, 130, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 360, 'Light knocking electrons off metal proved', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 385, 'that light is made of particles (photons).', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 420, 'But WHY does only the COLOR matter,', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 440, 'not the BRIGHTNESS?', { fill: '#f59e0b', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'begin', label: 'Begin Experiment', variant: 'primary' });

    r.setCoachMessage('Discover why Einstein called this the most revolutionary discovery in physics!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 100, 340, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'Light hits a metal surface, ejecting electrons.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 150, 'What makes the electrons fly out faster?', { fill: '#f59e0b', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      "Brighter light = faster electrons",
      "Light color (frequency) determines speed",
      "Both brightness and color matter equally",
      "Light cannot eject electrons at all"
    ];

    options.forEach((option, i) => {
      const y = 185 + i * 60;
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
        bgColor = 'rgba(245, 158, 11, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 450, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Exactly right!' : 'Only frequency (color) determines electron speed!';
      r.text(200, 480, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 510, "Brightness affects how MANY electrons escape,", { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
      r.text(200, 530, "not how FAST they move.", { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test in the Lab', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    const metal = this.metals[this.metalIndex];
    const photonEnergy = this.calculatePhotonEnergy(this.wavelength);
    const maxKE = this.calculateMaxKE(this.wavelength, metal.workFunction);
    const emission = this.emissionOccurs(this.wavelength, metal.workFunction);
    const lightColor = this.wavelengthToColor(this.wavelength);

    r.text(200, 45, 'Photoelectric Effect Lab', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Vacuum chamber
    r.roundRect(30, 65, 340, 180, 12, { fill: 'rgba(15, 23, 42, 0.8)' });
    r.text(200, 85, 'VACUUM CHAMBER', { fill: '#475569', fontSize: 8, textAnchor: 'middle' });

    // Light source
    r.roundRect(50, 110, 40, 100, 6, { fill: '#374151' });
    r.circle(70, 160, 18, { fill: lightColor });
    r.circle(70, 160, 8, { fill: '#ffffff' });
    r.text(70, 225, `${this.wavelength}nm`, { fill: lightColor, fontSize: 9, fontWeight: 'bold', textAnchor: 'middle' });

    // Photon beam
    if (emission) {
      const numPhotons = Math.floor(this.intensity / 15);
      for (let i = 0; i < numPhotons; i++) {
        const progress = ((this.animationTime * 2 + i * 0.3) % 1);
        const x = 100 + progress * 150;
        const y = 140 + i * 12 + Math.sin(progress * Math.PI * 2) * 5;
        r.circle(x, y, 4, { fill: lightColor });
      }
    }

    // Metal plate
    r.roundRect(280, 110, 30, 100, 4, { fill: '#78716c' });
    r.text(295, 225, metal.name, { fill: '#a8a29e', fontSize: 9, fontWeight: 'bold', textAnchor: 'middle' });

    // Ejected electrons
    if (emission) {
      const numElectrons = Math.floor(this.intensity / 20);
      for (let i = 0; i < numElectrons; i++) {
        const progress = ((this.animationTime * 1.5 + i * 0.4) % 1);
        if (progress > 0.4) {
          const electronProgress = (progress - 0.4) / 0.6;
          const x = 320 + electronProgress * 40;
          const y = 130 + i * 15;
          r.circle(x, y, 4, { fill: '#38bdf8' });
        }
      }
    }

    // No emission indicator
    if (!emission) {
      r.roundRect(260, 140, 80, 40, 8, { fill: '#450a0a' });
      r.text(300, 165, 'NO EMISSION', { fill: '#ef4444', fontSize: 9, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Controls
    r.text(200, 260, 'Wavelength (nm):', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.addSlider({ id: 'wavelength', label: 'Wavelength', min: 200, max: 700, step: 10, value: this.wavelength });

    r.text(200, 310, 'Intensity (%):', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.addSlider({ id: 'intensity', label: 'Intensity', min: 10, max: 100, step: 5, value: this.intensity });

    // Metal selector
    r.text(200, 360, 'Metal:', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    this.metals.forEach((m, i) => {
      const x = 40 + i * 72;
      const active = i === this.metalIndex;
      r.roundRect(x, 375, 68, 35, 6, { fill: active ? 'rgba(245, 158, 11, 0.4)' : 'rgba(51, 65, 85, 0.5)' });
      r.text(x + 34, 397, m.name, { fill: active ? '#f59e0b' : '#94a3b8', fontSize: 8, textAnchor: 'middle' });
      r.addButton({ id: `metal_${i}`, label: '', variant: 'secondary' });
    });

    // Results
    r.roundRect(30, 420, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(100, 445, `Photon E: ${photonEnergy.toFixed(2)} eV`, { fill: '#f59e0b', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 445, `Work fn: ${metal.workFunction} eV`, { fill: '#ef4444', fontSize: 11, textAnchor: 'middle' });
    r.text(300, 445, emission ? `KE: ${maxKE.toFixed(2)} eV` : 'No emission', { fill: emission ? '#34d399' : '#ef4444', fontSize: 11, textAnchor: 'middle' });

    r.text(200, 480, 'E = hc/λ     KE_max = E_photon - Φ', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });

    if (this.hasExperimented) {
      r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'primary' });
    }

    r.setCoachMessage('Try changing wavelength and intensity. Notice what affects electron speed vs. count!');
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, "Einstein's Photoelectric Equation", { fill: '#ffffff', fontSize: 17, fontWeight: 'bold', textAnchor: 'middle' });

    // Main equation
    r.roundRect(50, 85, 300, 70, 12, { fill: 'rgba(245, 158, 11, 0.2)' });
    r.text(200, 115, 'KE_max = hf - Φ', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 140, 'Kinetic Energy = Photon Energy - Work Function', { fill: '#f59e0b', fontSize: 9, textAnchor: 'middle' });

    // Key insights
    const insights = [
      { title: 'Photon Energy = hf', desc: 'Energy depends ONLY on frequency', color: '#f59e0b' },
      { title: 'Intensity = # of photons', desc: 'More photons = more electrons (same speed)', color: '#3b82f6' },
      { title: 'Threshold: hf >= Φ', desc: 'Below threshold = NO electrons at all', color: '#ef4444' }
    ];

    insights.forEach((insight, i) => {
      const y = 175 + i * 75;
      r.roundRect(30, y, 340, 65, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, y + 25, insight.title, { fill: insight.color, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, y + 48, insight.desc, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    });

    // Classical vs Quantum
    r.roundRect(30, 405, 340, 80, 12, { fill: 'rgba(139, 92, 246, 0.2)' });
    r.text(200, 430, 'Why This Was Revolutionary', { fill: '#a78bfa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 455, 'Classical physics: Light is a continuous wave.', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 475, 'Quantum physics: Light is discrete photons!', { fill: '#a78bfa', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore the Twist', variant: 'secondary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist!', { fill: '#a78bfa', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 95, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 120, 'You apply a negative voltage to STOP', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 145, 'the ejected electrons.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 175, 'How does "stopping voltage" relate to light?', { fill: '#a78bfa', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      "Stopping voltage depends on intensity",
      "Stopping voltage depends only on frequency",
      "Stopping voltage is always the same",
      "You cannot stop the electrons"
    ];

    options.forEach((option, i) => {
      const y = 200 + i * 55;
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

      r.roundRect(30, y, 340, 45, 10, { fill: bgColor });
      r.text(50, y + 27, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 10 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 430, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 1 ? 'Exactly right!' : 'Stopping voltage = photon energy - work function!';
      r.text(200, 460, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 490, 'V_stop = (hf - Φ)/e', { fill: '#ffffff', fontSize: 13, textAnchor: 'middle' });
      r.text(200, 515, 'Another proof that energy comes from frequency!', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See It Work', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    const metal = this.metals[0]; // Sodium
    const photonEnergy = this.calculatePhotonEnergy(this.wavelength);
    const maxKE = this.calculateMaxKE(this.wavelength, metal.workFunction);
    const emission = this.emissionOccurs(this.wavelength, metal.workFunction);
    const effectiveKE = Math.max(0, maxKE - this.stoppingVoltage);
    const electronsStopped = this.stoppingVoltage >= maxKE;

    r.text(200, 45, 'Stopping Voltage Experiment', { fill: '#a78bfa', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization
    r.roundRect(30, 70, 340, 150, 12, { fill: 'rgba(15, 23, 42, 0.8)' });

    // Light source
    const lightColor = this.wavelengthToColor(this.wavelength);
    r.circle(70, 145, 20, { fill: lightColor });
    r.text(70, 195, `${this.wavelength}nm`, { fill: lightColor, fontSize: 9, textAnchor: 'middle' });

    // Metal plate
    r.roundRect(150, 100, 15, 90, 2, { fill: '#78716c' });

    // Collector with voltage
    r.roundRect(280, 100, 15, 90, 2, { fill: '#374151' });
    r.text(287, 215, electronsStopped ? 'STOPPED' : 'collecting', { fill: electronsStopped ? '#ef4444' : '#34d399', fontSize: 8, textAnchor: 'middle' });

    // Electrons
    if (emission && !electronsStopped) {
      const speed = effectiveKE / maxKE;
      for (let i = 0; i < 4; i++) {
        const progress = ((this.animationTime * speed + i * 0.3) % 1);
        const x = 175 + progress * 100;
        const y = 120 + i * 20;
        r.circle(x, y, 4, { fill: '#38bdf8' });
      }
    }

    // Electric field indicator
    r.text(220, 145, this.stoppingVoltage > 0 ? '←E←' : '', { fill: '#ef4444', fontSize: 12, textAnchor: 'middle' });

    // Controls
    r.text(200, 245, 'Wavelength (nm):', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.addSlider({ id: 'wavelength', label: 'Wavelength', min: 200, max: 500, step: 10, value: this.wavelength });

    r.text(200, 295, 'Stopping Voltage (eV):', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.addSlider({ id: 'stopping_voltage', label: 'Stopping Voltage', min: 0, max: 5, step: 0.1, value: this.stoppingVoltage });

    // Results
    r.roundRect(30, 340, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 365, `Photon Energy: ${photonEnergy.toFixed(2)} eV | Work fn: ${metal.workFunction} eV`, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 390, `Max KE: ${maxKE.toFixed(2)} eV | Stopping V: ${this.stoppingVoltage.toFixed(1)} eV`, { fill: '#f59e0b', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 415, electronsStopped ? 'All electrons STOPPED!' : `Remaining KE: ${effectiveKE.toFixed(2)} eV`, { fill: electronsStopped ? '#ef4444' : '#34d399', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Implications', variant: 'secondary' });

    r.setCoachMessage('Try to find the exact stopping voltage for each wavelength!');
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Millikan & the Nobel Prize', { fill: '#a78bfa', fontSize: 17, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 85, 340, 100, 12, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 110, 'Robert Millikan used stopping voltage', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 135, "to precisely measure Planck's constant h.", { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 165, 'He won the 1923 Nobel Prize for this work!', { fill: '#a78bfa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // The measurement
    r.roundRect(30, 200, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 225, 'eV_stop = hf - Φ', { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 255, 'Plot V_stop vs frequency → slope = h/e', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 295, 340, 100, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 320, 'Key Insight', { fill: '#fbbf24', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 350, 'Stopping voltage vs frequency gives a STRAIGHT LINE.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 375, "This precisely confirmed Einstein's quantum theory!", { fill: '#fbbf24', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#f59e0b';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.tagline, { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle' });

    // Description
    const words = app.description.split(' ');
    let line = '';
    let lineY = 230;
    words.forEach(word => {
      if ((line + word).length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 16;
      } else {
        line += word + ' ';
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Physics connection
    r.roundRect(40, 320, 320, 55, 10, { fill: 'rgba(245, 158, 11, 0.2)' });
    r.text(200, 340, 'Physics Connection', { fill: '#f59e0b', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 360, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });

    // Mark understood
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 400, 'Completed!', { fill: '#10b981', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 440, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 17, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 80, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Question
      r.roundRect(25, 95, 350, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      const qWords = question.question.split(' ');
      let qLine = '';
      let qLineY = 120;
      qWords.forEach(word => {
        if ((qLine + word).length > 48) {
          r.text(200, qLineY, qLine.trim(), { fill: '#e2e8f0', fontSize: 10, textAnchor: 'middle' });
          qLine = word + ' ';
          qLineY += 15;
        } else {
          qLine += word + ' ';
        }
      });
      if (qLine) r.text(200, qLineY, qLine.trim(), { fill: '#e2e8f0', fontSize: 10, textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 180 + i * 52;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(245, 158, 11, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 45, 8, { fill: bgColor });
        r.text(40, y + 27, `${String.fromCharCode(65 + i)}. ${option.substring(0, 45)}${option.length > 45 ? '...' : ''}`, { fill: isSelected ? '#f59e0b' : '#e2e8f0', fontSize: 9 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      // Navigation
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
        r.text(200, 420, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
      }
    } else {
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 160, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 125, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 175, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 210, score >= 7 ? "Excellent! You understand the photoelectric effect!" : 'Review the concepts and try again.', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: score >= 7 ? 'Claim Mastery Badge' : 'Review & Try Again', variant: 'primary' });
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 100, '🏆', { fontSize: 64, textAnchor: 'middle' });

    r.text(200, 175, 'Photoelectric Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 205, "You understand Einstein's Nobel-winning discovery!", { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Achievements
    r.roundRect(40, 240, 320, 200, 16, { fill: 'rgba(245, 158, 11, 0.2)' });
    r.text(200, 270, 'You now understand:', { fill: '#f59e0b', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    const achievements = [
      'E = hf: Photon energy depends on frequency',
      'KE_max = hf - Φ: Einstein\'s equation',
      'Intensity affects electron count, not speed',
      'Threshold frequency for electron emission',
      'Applications: solar cells, cameras, sensors'
    ];

    achievements.forEach((achievement, i) => {
      r.text(60, 300 + i * 25, `✓ ${achievement}`, { fill: '#cbd5e1', fontSize: 10 });
    });

    r.text(200, 470, 'Light is quantized - photons are real!', { fill: '#f59e0b', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering the photoelectric effect!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      wavelength: this.wavelength,
      intensity: this.intensity,
      metalIndex: this.metalIndex,
      hasExperimented: this.hasExperimented,
      hasTestedIntensity: this.hasTestedIntensity,
      stoppingVoltage: this.stoppingVoltage,
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
    if (state.intensity !== undefined) this.intensity = state.intensity as number;
    if (state.metalIndex !== undefined) this.metalIndex = state.metalIndex as number;
    if (state.hasExperimented !== undefined) this.hasExperimented = state.hasExperimented as boolean;
    if (state.hasTestedIntensity !== undefined) this.hasTestedIntensity = state.hasTestedIntensity as boolean;
    if (state.stoppingVoltage !== undefined) this.stoppingVoltage = state.stoppingVoltage as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createPhotoelectricEffectGame(sessionId: string): PhotoelectricEffectGame {
  return new PhotoelectricEffectGame(sessionId);
}
