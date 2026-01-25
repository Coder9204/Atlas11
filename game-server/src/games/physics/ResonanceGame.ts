import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// RESONANCE GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Maximum energy transfer when driving frequency = natural frequency
// Natural frequency: f = (1/2pi) * sqrt(k/m)
// At resonance, amplitude grows dramatically - can be destructive
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
const BASE_RESONANT_FREQ = 240; // Hz

export class ResonanceGame extends BaseGame {
  readonly gameType = 'resonance';
  readonly gameTitle = 'Resonance: When Frequencies Match';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private drivingFrequency = 100; // Hz
  private addedMass = 0; // grams
  private foundResonance = false;
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
      scenario: "A physicist is studying vibrating systems.",
      question: "What is resonance?",
      options: ["Random vibration", "Maximum energy transfer at matching frequencies", "Minimum amplitude", "Constant frequency"],
      correctIndex: 1,
      explanation: "Resonance occurs when the driving frequency matches the system's natural frequency, causing maximum energy transfer and amplitude."
    },
    {
      scenario: "A child on a swing has a natural frequency of 0.5 Hz.",
      question: "To push most effectively, at what frequency should you push?",
      options: ["0.25 Hz", "0.5 Hz", "1.0 Hz", "2.0 Hz"],
      correctIndex: 1,
      explanation: "For maximum energy transfer (resonance), the driving frequency must match the natural frequency of 0.5 Hz."
    },
    {
      scenario: "An engineer is designing a spring-mass oscillator.",
      question: "What happens to resonant frequency when you add mass to an oscillator?",
      options: ["Increases", "Decreases", "Stays the same", "Becomes zero"],
      correctIndex: 1,
      explanation: "From f = (1/2pi)*sqrt(k/m), increasing mass decreases the natural/resonant frequency."
    },
    {
      scenario: "A historian is studying the 1940 Tacoma Narrows Bridge collapse.",
      question: "Why did the Tacoma Narrows Bridge collapse?",
      options: ["Earthquake", "Wind-induced resonance", "Heavy traffic", "Material fatigue"],
      correctIndex: 1,
      explanation: "Wind created oscillations matching the bridge's natural frequency, causing resonance that amplified until structural failure."
    },
    {
      scenario: "A medical technician is explaining MRI to a patient.",
      question: "How does MRI imaging work?",
      options: ["X-rays", "Sound waves", "Nuclear magnetic resonance", "Electrical current"],
      correctIndex: 2,
      explanation: "MRI uses nuclear magnetic resonance - hydrogen nuclei in the body resonate at specific frequencies in a magnetic field."
    },
    {
      scenario: "An opera singer is demonstrating their vocal abilities.",
      question: "A singer shatters a wine glass by singing. What must the singer's frequency match?",
      options: ["The room's frequency", "The glass's natural frequency", "440 Hz exactly", "Any high frequency"],
      correctIndex: 1,
      explanation: "The singer must match the glass's natural frequency to create resonance and accumulate enough energy to shatter it."
    },
    {
      scenario: "An audio engineer is designing a speaker system.",
      question: "Why do bass speakers need to be larger than treble speakers?",
      options: ["They need more power", "Lower frequency = longer wavelength needs larger resonator", "They're louder", "Marketing"],
      correctIndex: 1,
      explanation: "Lower frequencies require larger resonating chambers. From f = (1/2pi)*sqrt(k/m), more mass lowers frequency."
    },
    {
      scenario: "An architect is explaining Taipei 101's design.",
      question: "Taipei 101 has a 730-ton ball inside. What is its purpose?",
      options: ["Decoration", "Tuned mass damper to prevent resonance", "Electricity generation", "Water storage"],
      correctIndex: 1,
      explanation: "The tuned mass damper oscillates opposite to building sway, canceling resonant vibrations from wind or earthquakes."
    },
    {
      scenario: "A physics student is studying phase relationships.",
      question: "At resonance, what happens to the phase between driving force and oscillation?",
      options: ["In phase", "90 degrees out of phase", "180 degrees out of phase", "Random"],
      correctIndex: 1,
      explanation: "At resonance, the velocity (not position) is in phase with the driving force, meaning position is 90 degrees behind."
    },
    {
      scenario: "A military commander is training soldiers for bridge crossing.",
      question: "Why do soldiers break step when crossing bridges?",
      options: ["Tradition", "To avoid resonance", "To rest", "Balance"],
      correctIndex: 1,
      explanation: "Marching in step could match the bridge's natural frequency, causing dangerous resonance amplification."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "medical",
      title: "Medical MRI",
      tagline: "Nuclear Magnetic Resonance",
      description: "MRI scanners use nuclear magnetic resonance to image organs without radiation. Hydrogen nuclei in your body resonate at specific radio frequencies in strong magnetic fields.",
      connection: "Resonance frequency f = gamma*B0/(2pi) depends on magnetic field strength. Different tissues have different resonance responses."
    },
    {
      icon: "glass",
      title: "Glass Shattering",
      tagline: "Acoustic Resonance",
      description: "Opera singers can shatter wine glasses by singing at the glass's natural frequency. Energy accumulates with each cycle until the glass fails catastrophically.",
      connection: "Amplitude grows exponentially at resonance: A(t) ~ A0*e^(gamma*t). When stress exceeds material strength, failure occurs."
    },
    {
      icon: "bridge",
      title: "Bridge Engineering",
      tagline: "Avoiding Catastrophic Resonance",
      description: "The 1940 Tacoma Narrows Bridge collapsed from wind-induced resonance. Modern bridges use tuned mass dampers and aerodynamic shapes to prevent disasters.",
      connection: "Engineers must ensure natural frequencies don't match common forcing frequencies like wind gusts or marching soldiers."
    },
    {
      icon: "music",
      title: "Musical Instruments",
      tagline: "Acoustic Amplification",
      description: "Every instrument relies on resonance to amplify sound. Guitar bodies, violin chambers, and piano soundboards resonate at multiple frequencies for rich tones.",
      connection: "Harmonic series: fn = n*f1. Body resonances amplify specific harmonics, creating each instrument's unique 'voice'."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate natural frequency based on added mass
  private getNaturalFrequency(): number {
    // f = (1/2pi) * sqrt(k/m) -> more mass = lower frequency
    return Math.round(BASE_RESONANT_FREQ - this.addedMass * 2);
  }

  // PROTECTED: Calculate response amplitude
  private getResponseAmplitude(): number {
    const resonantFreq = this.getNaturalFrequency();
    const frequencyDiff = Math.abs(this.drivingFrequency - resonantFreq);
    const isAtResonance = frequencyDiff < 15;

    return isAtResonance ? 100 : Math.max(5, 100 - frequencyDiff * 1.2);
  }

  // PROTECTED: Check if at resonance
  private isAtResonance(): boolean {
    const resonantFreq = this.getNaturalFrequency();
    return Math.abs(this.drivingFrequency - resonantFreq) < 15;
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
      if (input.id === 'driving_frequency') {
        this.drivingFrequency = Math.max(50, Math.min(400, input.value));
        if (this.isAtResonance() && !this.foundResonance) {
          this.foundResonance = true;
        }
      } else if (input.id === 'added_mass') {
        this.addedMass = Math.max(0, Math.min(50, input.value));
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
        if (buttonId === 'continue' && this.foundResonance) {
          this.phase = 'review';
        }
        break;

      case 'review':
        if (buttonId === 'continue') {
          this.phase = 'twist_predict';
          this.foundResonance = false; // Reset for twist
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
    this.drivingFrequency = 100;
    this.addedMass = 0;
    this.foundResonance = false;
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
    r.clear('#0a0510');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(236, 72, 153, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(168, 85, 247, 0.05)' });

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
    r.roundRect(110, 60, 180, 30, 8, { fill: 'rgba(236, 72, 153, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#ec4899', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Power of Resonance', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'When frequencies match, energy amplifies', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Swing illustration
    r.roundRect(100, 190, 200, 150, 12, { fill: 'rgba(30, 41, 59, 0.8)' });

    // Swing frame
    r.line(200, 200, 150, 300, { stroke: '#64748b', strokeWidth: 3 });
    r.line(200, 200, 250, 300, { stroke: '#64748b', strokeWidth: 3 });

    // Swinging mass
    const swingAngle = Math.sin(this.animationTime * 2) * 0.5;
    const swingX = 200 + Math.sin(swingAngle) * 60;
    const swingY = 200 + Math.cos(swingAngle) * 80;
    r.line(200, 200, swingX, swingY, { stroke: '#a855f7', strokeWidth: 3 });
    r.circle(swingX, swingY, 15, { fill: '#ec4899' });

    // Question
    r.roundRect(40, 360, 320, 120, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 395, 'How do you push a swing to get', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 420, 'maximum height?', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 455, 'The answer is resonance!', { fill: '#ec4899', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Discover Resonance', variant: 'primary' });

    r.setCoachMessage('Resonance can make bridges collapse or enable MRI imaging!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'A mass on a spring oscillates naturally.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'When does amplitude become maximum?', { fill: '#ec4899', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Push at any random frequency',
      'Push at the natural frequency',
      'Push as fast as possible',
      'Push as slow as possible'
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
        bgColor = 'rgba(236, 72, 153, 0.3)';
      }

      r.roundRect(30, y, 340, 55, 10, { fill: bgColor });
      r.text(50, y + 32, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 13 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Correct!' : 'Push at the natural frequency!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 530, 'Matching frequencies creates resonance -', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 550, 'maximum energy transfer and amplitude!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Find Resonance', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Resonance Lab', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const resonantFreq = this.getNaturalFrequency();
    const amplitude = this.getResponseAmplitude();
    const atResonance = this.isAtResonance();

    // Spring-mass visualization
    r.roundRect(30, 80, 340, 200, 12, { fill: 'rgba(15, 23, 42, 0.8)' });

    // Fixed anchor
    r.rect(150, 90, 60, 15, { fill: '#475569' });

    // Spring (oscillating)
    const springOscillation = amplitude / 2 * Math.sin(this.animationTime * (this.drivingFrequency / 50));
    const massY = 160 + springOscillation;

    // Draw spring
    r.path(`M 180 105 L 180 ${massY - 20}`, { stroke: '#a855f7', strokeWidth: 3 });

    // Mass
    const massSize = 25 + this.addedMass * 0.3;
    r.circle(180, massY, massSize, { fill: atResonance ? '#10b981' : '#ec4899' });
    r.text(180, massY + 5, `${Math.round(100 + this.addedMass)}g`, { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    // Amplitude indicator
    r.roundRect(50, 100, 30, 150, 5, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.roundRect(50, 250 - amplitude * 1.5, 30, amplitude * 1.5, 5, { fill: atResonance ? '#10b981' : '#ec4899' });
    r.text(65, 270, 'AMP', { fill: '#94a3b8', fontSize: 8, textAnchor: 'middle' });

    // Driving force indicator
    r.roundRect(280, 100, 80, 80, 10, { fill: 'rgba(30, 41, 59, 0.7)' });
    r.text(320, 120, 'DRIVE', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    const driveAngle = this.animationTime * (this.drivingFrequency / 50);
    r.line(320, 150, 320 + Math.cos(driveAngle) * 25, 150 + Math.sin(driveAngle) * 25, { stroke: '#a855f7', strokeWidth: 3 });
    r.circle(320, 150, 5, { fill: '#a855f7' });
    r.text(320, 175, `${this.drivingFrequency} Hz`, { fill: '#ec4899', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Status
    r.roundRect(270, 200, 100, 35, 8, { fill: 'rgba(30, 41, 59, 0.7)' });
    r.text(320, 213, 'Natural:', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(320, 228, `${resonantFreq} Hz`, { fill: atResonance ? '#10b981' : '#cbd5e1', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    // Resonance indicator
    if (atResonance) {
      r.roundRect(140, 240, 80, 30, 8, { fill: 'rgba(16, 185, 129, 0.3)' });
      r.text(180, 260, 'RESONANCE!', { fill: '#10b981', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Sliders
    r.addSlider({
      id: 'driving_frequency',
      label: 'Driving Frequency (Hz)',
      min: 50,
      max: 400,
      step: 5,
      value: this.drivingFrequency
    });

    // Hint
    r.roundRect(40, 380, 320, 50, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 410, atResonance ? 'You found resonance! Maximum amplitude!' : `Adjust frequency to match ${resonantFreq} Hz`, { fill: atResonance ? '#10b981' : '#f59e0b', fontSize: 11, textAnchor: 'middle' });

    if (this.foundResonance) {
      r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'primary' });
    }

    r.setCoachMessage('Adjust the driving frequency to match the natural frequency!');
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Science of Resonance', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Natural frequency formula
    r.roundRect(30, 85, 340, 120, 16, { fill: 'rgba(236, 72, 153, 0.2)' });
    r.text(200, 115, 'Natural Frequency', { fill: '#ec4899', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(70, 130, 260, 35, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 155, 'f = (1/2pi) * sqrt(k/m)', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.text(200, 190, 'k = stiffness, m = mass', { fill: '#f9a8d4', fontSize: 11, textAnchor: 'middle' });

    // Resonance condition
    r.roundRect(30, 220, 340, 100, 16, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 250, 'Resonance Condition', { fill: '#a855f7', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 280, 'Driving frequency = Natural frequency', { fill: '#c4b5fd', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 305, 'f_drive = f_natural -> Maximum amplitude', { fill: '#e9d5ff', fontSize: 11, textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 340, 340, 100, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 370, 'Key Insight', { fill: '#34d399', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 400, 'At resonance, energy accumulates each cycle.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 425, 'Small pushes create huge oscillations!', { fill: '#34d399', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Mass Effects', variant: 'secondary' });

    r.setCoachMessage('What happens when we add mass to the system?');
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist: Adding Mass', { fill: '#a855f7', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'You add extra mass to the oscillating', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'system while driving at the same frequency.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 180, 'What happens to resonance?', { fill: '#a855f7', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Nothing changes - same amplitude',
      'Amplitude increases',
      'Amplitude decreases - lost resonance',
      'System stops oscillating'
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
      const message = this.twistPrediction === 2 ? 'Exactly right!' : 'You lose resonance!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 530, 'Adding mass lowers natural frequency.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 550, 'Driving frequency no longer matches!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Mass Effect', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Mass and Frequency', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const resonantFreq = this.getNaturalFrequency();
    const amplitude = this.getResponseAmplitude();
    const atResonance = this.isAtResonance();

    // Visualization similar to play but with mass slider
    r.roundRect(30, 80, 340, 180, 12, { fill: 'rgba(15, 23, 42, 0.8)' });

    // Fixed anchor
    r.rect(150, 90, 60, 12, { fill: '#475569' });

    // Spring and mass
    const springOscillation = amplitude / 2 * Math.sin(this.animationTime * (this.drivingFrequency / 50));
    const massY = 145 + springOscillation;
    const massSize = 20 + this.addedMass * 0.4;

    r.path(`M 180 102 L 180 ${massY - massSize}`, { stroke: '#a855f7', strokeWidth: 3 });
    r.circle(180, massY, massSize, { fill: atResonance ? '#10b981' : '#ec4899' });
    r.text(180, massY + 4, `${Math.round(100 + this.addedMass)}g`, { fill: '#ffffff', fontSize: 9, fontWeight: 'bold', textAnchor: 'middle' });

    // Amplitude bar
    r.roundRect(50, 95, 25, 120, 5, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.roundRect(50, 215 - amplitude * 1.2, 25, amplitude * 1.2, 5, { fill: atResonance ? '#10b981' : '#ec4899' });

    // Frequency info
    r.roundRect(270, 100, 90, 70, 10, { fill: 'rgba(30, 41, 59, 0.7)' });
    r.text(315, 120, 'Drive:', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(315, 138, `${this.drivingFrequency} Hz`, { fill: '#ec4899', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(315, 155, 'Natural:', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(315, 170, `${resonantFreq} Hz`, { fill: atResonance ? '#10b981' : '#f59e0b', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    // Status
    if (atResonance) {
      r.roundRect(130, 230, 100, 25, 8, { fill: 'rgba(16, 185, 129, 0.3)' });
      r.text(180, 248, 'AT RESONANCE!', { fill: '#10b981', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    } else {
      r.text(180, 248, `Off by ${Math.abs(this.drivingFrequency - resonantFreq)} Hz`, { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle' });
    }

    // Sliders
    r.addSlider({
      id: 'added_mass',
      label: 'Added Mass (grams)',
      min: 0,
      max: 50,
      step: 5,
      value: this.addedMass
    });

    r.addSlider({
      id: 'driving_frequency',
      label: 'Driving Frequency (Hz)',
      min: 50,
      max: 400,
      step: 5,
      value: this.drivingFrequency
    });

    // Insight
    r.roundRect(40, 420, 320, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 445, 'More mass = Lower natural frequency', { fill: '#f59e0b', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 465, 'Adjust drive frequency to find resonance again!', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Full Explanation', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Mass Changes Everything', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Formula emphasis
    r.roundRect(25, 85, 350, 100, 16, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 115, 'f = (1/2pi) * sqrt(k/m)', { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 145, 'More mass (m) -> Lower frequency (f)', { fill: '#c4b5fd', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 170, 'This is the key to tuning oscillators!', { fill: '#e9d5ff', fontSize: 11, textAnchor: 'middle' });

    // Real example
    r.roundRect(25, 200, 350, 120, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 230, 'Real-World Example', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 260, 'Guitar strings: thicker strings vibrate slower', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 285, 'Bass strings are thicker (more mass) than treble', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 308, 'To retune: change mass or tension (stiffness)!', { fill: '#fef08a', fontSize: 11, textAnchor: 'middle' });

    // Key takeaway
    r.roundRect(40, 340, 320, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 370, 'Key Takeaway', { fill: '#ec4899', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 395, 'To stay at resonance when parameters change,', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 413, 'you must adjust the driving frequency!', { fill: '#f9a8d4', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    const appLabels = ['MRI', 'Glass', 'Bridge', 'Music'];

    appLabels.forEach((label, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#ec4899';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 50, 8, { fill: bgColor });
      r.text(x + 40, 100, label, { fill: '#ffffff', fontSize: 10, textAnchor: 'middle' });
      if (isCompleted) r.text(x + 40, 118, '(done)', { fill: '#34d399', fontSize: 8, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 145, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 180, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 205, app.tagline, { fill: '#ec4899', fontSize: 11, textAnchor: 'middle' });

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
    r.roundRect(40, 330, 320, 70, 10, { fill: 'rgba(236, 72, 153, 0.2)' });
    r.text(200, 355, 'Physics Connection', { fill: '#ec4899', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
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
      r.text(200, 195, question.question, { fill: '#ec4899', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 220 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(236, 72, 153, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        const displayOption = option.length > 42 ? option.substring(0, 42) + '...' : option;
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${displayOption}`, { fill: isSelected ? '#ec4899' : '#e2e8f0', fontSize: 11 });

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
      r.text(200, 225, score >= 7 ? "You've mastered resonance!" : 'Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 160, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts:', { fill: '#ec4899', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'f = (1/2pi) * sqrt(k/m)',
        'Resonance: f_drive = f_natural',
        'More mass = lower frequency',
        'Energy accumulates at resonance'
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
    r.text(200, 180, 'Resonance Expert!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 210, 'You understand frequency matching', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 232, 'and energy amplification!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { label: 'Natural Frequency', color: '#ec4899' },
      { label: 'f proportional to 1/sqrt(m)', color: '#a855f7' },
      { label: 'Energy Transfer', color: '#10b981' },
      { label: 'Applications', color: '#fbbf24' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 270 + Math.floor(i / 2) * 70;
      r.roundRect(x, y, 140, 55, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 35, concept.label, { fill: concept.color, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 430, 300, 80, 12, { fill: 'rgba(236, 72, 153, 0.2)' });
    r.text(200, 458, 'Key Formula', { fill: '#ec4899', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 485, 'f_natural = (1/2pi) * sqrt(k/m)', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering resonance physics!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      drivingFrequency: this.drivingFrequency,
      addedMass: this.addedMass,
      foundResonance: this.foundResonance,
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
    if (state.drivingFrequency !== undefined) this.drivingFrequency = state.drivingFrequency as number;
    if (state.addedMass !== undefined) this.addedMass = state.addedMass as number;
    if (state.foundResonance !== undefined) this.foundResonance = state.foundResonance as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createResonanceGame(sessionId: string): ResonanceGame {
  return new ResonanceGame(sessionId);
}
