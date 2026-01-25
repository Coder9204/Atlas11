/**
 * Forced Oscillations & Resonance Game - Server-Side Implementation
 *
 * Physics: m(d²x/dt²) + c(dx/dt) + kx = F₀cos(ωt)
 * Natural frequency: ω₀ = √(k/m)
 * Resonance: maximum amplitude when ω ≈ ω₀
 * Amplitude: A = F₀ / √[(k - mω²)² + (cω)²]
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion {
  scenario: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface TransferApp {
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  color: string;
}

const testQuestions: TestQuestion[] = [
  {
    scenario: "A child on a swing is being pushed by their parent at regular intervals.",
    question: "When should the parent push for maximum height?",
    options: ["As fast as possible", "Very slowly", "At the swing's natural frequency", "At random times"],
    correct: 2,
    explanation: "Maximum energy transfer (resonance) occurs when driving frequency matches natural frequency."
  },
  {
    scenario: "An opera singer shatters a wine glass by singing.",
    question: "Why does only one specific pitch break the glass?",
    options: ["It's the loudest note", "It matches the glass's resonant frequency", "High pitches break glass", "More force at that note"],
    correct: 1,
    explanation: "Glass has a natural frequency. Sound at that exact frequency causes resonance until stress exceeds breaking point."
  },
  {
    scenario: "The Tacoma Narrows Bridge collapsed in 1940 during moderate winds.",
    question: "What caused the violent oscillations?",
    options: ["Wind too strong", "Bridge too heavy", "Vortex shedding matched resonant frequency", "Earthquake"],
    correct: 2,
    explanation: "Wind vortex shedding created periodic forces matching the bridge's torsional natural frequency."
  },
  {
    scenario: "You're tuning a radio to 101.5 MHz.",
    question: "What principle allows frequency selection?",
    options: ["Magnetic filtering", "Electrical resonance in LC circuit", "Digital processing", "Sound interference"],
    correct: 1,
    explanation: "The radio's tuning circuit resonates only with the selected frequency, amplifying it while rejecting others."
  },
  {
    scenario: "A car's steering wheel vibrates only at certain engine RPMs.",
    question: "Why only at specific speeds?",
    options: ["Engine misfiring", "Unbalanced tires", "Engine frequency matches structural resonance", "Wrong fuel"],
    correct: 2,
    explanation: "When engine vibrations match structural natural frequencies, resonance amplifies oscillations."
  },
  {
    scenario: "MRI machines use precise radio waves for imaging.",
    question: "MRI exploits resonance of:",
    options: ["Body tissue", "Sound waves", "Hydrogen nuclei in magnetic field", "X-rays"],
    correct: 2,
    explanation: "MRI uses Nuclear Magnetic Resonance - hydrogen nuclei precess and absorb energy at resonant frequencies."
  },
  {
    scenario: "Musicians notice certain notes make the room 'ring'.",
    question: "These room modes occur because:",
    options: ["Playing too loudly", "Sound resonates with room dimensions", "Out of tune", "Echo"],
    correct: 1,
    explanation: "Rooms have natural acoustic frequencies based on dimensions. Matching notes create standing waves."
  },
  {
    scenario: "In a forced oscillator, you increase damping.",
    question: "What happens to the resonance peak?",
    options: ["Taller and narrower", "Shorter and wider", "Shifts higher", "Disappears"],
    correct: 1,
    explanation: "Higher damping reduces maximum amplitude and broadens the peak. Low damping gives sharp resonance."
  },
  {
    scenario: "A washing machine 'walks' across the floor during spin cycle.",
    question: "This happens because:",
    options: ["Unbalanced at all speeds", "Spin passes through resonant frequency", "Floor uneven", "Too light"],
    correct: 1,
    explanation: "During spin-up, rotation frequency passes through resonant frequencies, temporarily amplifying vibrations."
  },
  {
    scenario: "Soldiers are told to break step crossing a bridge.",
    question: "This order prevents:",
    options: ["Tiredness", "Resonance from synchronized steps collapsing bridge", "Getting dirty", "Noise"],
    correct: 1,
    explanation: "Synchronized marching creates periodic forces that could match bridge natural frequency, causing dangerous resonance."
  }
];

const transferApps: TransferApp[] = [
  {
    title: "Radio & Wireless",
    short: "Radio",
    tagline: "Selecting signals from the spectrum",
    description: "Every radio uses resonant LC circuits to select specific frequencies from all available signals.",
    connection: "Tuned circuits resonate only with your desired frequency, rejecting others.",
    color: "#3b82f6"
  },
  {
    title: "Medical MRI",
    short: "MRI",
    tagline: "Nuclear magnetic resonance imaging",
    description: "MRI uses resonance of hydrogen nuclei in magnetic fields to create detailed soft tissue images.",
    connection: "RF pulses at the resonant frequency cause nuclei to absorb and re-emit energy.",
    color: "#f59e0b"
  },
  {
    title: "Musical Instruments",
    short: "Music",
    tagline: "Making strings and air columns sing",
    description: "Instrument bodies resonate with string vibrations, amplifying sound dramatically.",
    connection: "Guitar bodies, piano soundboards, and wind instruments all use resonance amplification.",
    color: "#a855f7"
  },
  {
    title: "Earthquake Engineering",
    short: "Seismic",
    tagline: "Designing for ground shaking",
    description: "Buildings must avoid resonating with earthquake frequencies to prevent collapse.",
    connection: "Tuned mass dampers absorb resonant energy. Base isolation shifts natural frequency.",
    color: "#ef4444"
  }
];

export class ForcedOscillationsGame extends BaseGame {
  readonly gameType = 'forced_oscillations';
  readonly gameTitle = 'Forced Oscillations & Resonance';

  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private selectedApp = 0;
  private testIndex = 0;
  private testScore = 0;
  private testAnswers: (number | null)[] = new Array(10).fill(null);
  private showExplanation = false;

  // Simulation state
  private drivingFrequency = 0.5; // ratio to natural frequency
  private naturalFrequency = 1.0;
  private damping = 0.1;
  private isAnimating = false;
  private time = 0;
  private displacement = 0;
  private amplitude = 0;

  constructor(sessionId: string) {
    super(sessionId);
  }

  initialize(config: SessionConfig): void {
    super.initialize(config);
    if (config.resumePhase) {
      this.phase = config.resumePhase as GamePhase;
    }
  }

  private calculateAmplitude(omega: number, omega0: number, zeta: number): number {
    const denom1 = Math.pow(omega0 * omega0 - omega * omega, 2);
    const denom2 = Math.pow(2 * zeta * omega0 * omega, 2);
    return 1 / Math.sqrt(denom1 + denom2 + 0.01);
  }

  private isAtResonance(): boolean {
    return Math.abs(this.drivingFrequency - 1.0) < 0.15;
  }

  handleInput(input: UserInput): void {
    if (input.type === 'button_click') {
      this.handleButtonClick(input.id);
    } else if (input.type === 'slider_change') {
      this.handleSliderChange(input.id, input.value ?? 0);
    }
  }

  private handleButtonClick(id: string): void {
    // Navigation
    if (id === 'nav_predict') {
      this.phase = 'predict';
      this.emitCoachEvent('phase_started', { phase: 'predict' });
    } else if (id === 'nav_play') {
      this.phase = 'play';
    } else if (id === 'nav_review') {
      this.phase = 'review';
    } else if (id === 'nav_twist_predict') {
      this.phase = 'twist_predict';
    } else if (id === 'nav_twist_play') {
      this.phase = 'twist_play';
    } else if (id === 'nav_twist_review') {
      this.phase = 'twist_review';
    } else if (id === 'nav_transfer') {
      this.phase = 'transfer';
    } else if (id === 'nav_test') {
      this.phase = 'test';
    } else if (id === 'nav_mastery') {
      this.phase = 'mastery';
    }

    // Predictions
    else if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
    } else if (id.startsWith('twist_predict_')) {
      this.twistPrediction = id.replace('twist_predict_', '');
    }

    // Simulation
    else if (id === 'start_sim') {
      this.isAnimating = true;
      this.time = 0;
    } else if (id === 'stop_sim') {
      this.isAnimating = false;
    }

    // Transfer apps
    else if (id.startsWith('app_')) {
      this.selectedApp = parseInt(id.replace('app_', ''));
    }

    // Test answers
    else if (id.startsWith('answer_')) {
      const answerIndex = parseInt(id.replace('answer_', ''));
      this.handleTestAnswer(answerIndex);
    } else if (id === 'next_question') {
      if (this.testIndex < testQuestions.length - 1) {
        this.testIndex++;
        this.showExplanation = false;
      } else {
        this.phase = 'mastery';
      }
    } else if (id === 'retry_test') {
      this.testIndex = 0;
      this.testScore = 0;
      this.testAnswers = new Array(10).fill(null);
      this.showExplanation = false;
      this.phase = 'test';
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'driving_freq') {
      this.drivingFrequency = value;
    }
  }

  private handleTestAnswer(optionIndex: number): void {
    if (this.testAnswers[this.testIndex] !== null) return;

    this.testAnswers[this.testIndex] = optionIndex;
    const isCorrect = testQuestions[this.testIndex].correct === optionIndex;

    if (isCorrect) {
      this.testScore++;
    }

    this.showExplanation = true;
    this.emitCoachEvent('test_answer_submitted', {
      questionIndex: this.testIndex,
      correct: isCorrect,
      score: this.testScore
    });
  }

  update(_deltaTime: number): void {
    if (this.isAnimating) {
      this.time += 0.05;
      const omega = this.drivingFrequency * this.naturalFrequency;
      this.amplitude = this.calculateAmplitude(omega, this.naturalFrequency, this.damping);
      this.displacement = this.amplitude * Math.cos(omega * this.time * 5) * 80;
    }
  }

  getCurrentPhase(): string {
    return this.phase;
  }

  render(): GameFrame {
    const r = new CommandRenderer(700, 350);

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

    r.setProgress({ id: 'phase', current: this.getPhaseIndex() + 1, total: 10 });

    return r.toFrame(this.nextFrame());
  }

  private getPhaseIndex(): number {
    const phases: GamePhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    return phases.indexOf(this.phase);
  }

  private renderHook(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 35, 'WHY DO OPERA SINGERS BREAK GLASS?', {
      fill: '#ef4444',
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 60, 'Discover the power of resonance', {
      fill: '#94a3b8',
      fontSize: 14,
      textAnchor: 'middle'
    });

    // Wine glass illustration
    r.rect(200, 85, 300, 150, { fill: '#1e293b', rx: 10 });

    // Glass shape
    const glassPath = 'M350 100 Q290 100, 290 140 Q290 180, 340 180 L340 220 L320 220 L380 220 L360 220 L360 180 Q410 180, 410 140 Q410 100, 350 100';
    r.path(glassPath, { fill: '#3b82f6', opacity: 0.3, stroke: '#60a5fa', strokeWidth: 2 });

    // Sound waves
    for (let i = 0; i < 3; i++) {
      r.ellipse(230 - i * 20, 150, 5, 20, { fill: 'none', stroke: '#f59e0b', strokeWidth: 2, opacity: 0.7 - i * 0.2 });
    }

    // Singer icon
    r.circle(180, 140, 15, { fill: '#fcd9b6' });
    r.ellipse(180, 170, 12, 20, { fill: '#ec4899' });
    r.ellipse(180, 150, 4, 3, { fill: '#1e293b' });

    // Vibration lines
    r.line(300, 130, 295, 125, { stroke: '#ef4444', strokeWidth: 2 });
    r.line(400, 130, 405, 125, { stroke: '#ef4444', strokeWidth: 2 });

    r.text(350, 260, 'A trained singer can shatter a wine glass using only', {
      fill: '#e2e8f0',
      fontSize: 13,
      textAnchor: 'middle'
    });
    r.text(350, 280, 'their voice at one specific pitch!', {
      fill: '#ef4444',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(350, 305, 'What makes that pitch so destructive?', {
      fill: '#94a3b8',
      fontSize: 12,
      textAnchor: 'middle'
    });

    r.addButton({ id: 'nav_predict', label: 'Discover Resonance', variant: 'primary' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 30, 'MAKE YOUR PREDICTION', {
      fill: '#ffffff',
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 55, 'You push a child on a swing. Which rhythm makes it go highest?', {
      fill: '#e2e8f0',
      fontSize: 13,
      textAnchor: 'middle'
    });

    const options = [
      { id: 'A', text: 'Push as fast as possible' },
      { id: 'B', text: 'Push very slowly' },
      { id: 'C', text: "Match the swing's natural frequency" },
      { id: 'D', text: 'Push at random times' }
    ];

    options.forEach((opt, i) => {
      const y = 85 + i * 50;
      const isSelected = this.prediction === opt.id;
      const isCorrect = opt.id === 'C';

      let bgColor = '#1e293b';
      if (this.prediction) {
        if (isCorrect) bgColor = '#052e16';
        else if (isSelected) bgColor = '#450a0a';
      } else if (isSelected) {
        bgColor = '#7f1d1d';
      }

      r.rect(100, y, 500, 42, {
        fill: bgColor,
        rx: 8,
        stroke: isSelected ? '#ef4444' : '#334155',
        strokeWidth: 2
      });

      r.text(350, y + 26, `${opt.id}. ${opt.text}`, {
        fill: '#e2e8f0',
        fontSize: 13,
        textAnchor: 'middle'
      });

      r.addButton({ id: `predict_${opt.id}`, label: opt.id, variant: 'secondary' });
    });

    if (this.prediction) {
      const correct = this.prediction === 'C';
      r.rect(100, 295, 500, 35, { fill: correct ? '#052e16' : '#7f1d1d', rx: 8 });
      r.text(350, 316, correct
        ? 'Correct! This is RESONANCE - max response at natural frequency!'
        : 'The answer is C - matching natural frequency creates resonance!', {
        fill: correct ? '#22c55e' : '#fca5a5',
        fontSize: 12,
        textAnchor: 'middle'
      });
      r.addButton({ id: 'nav_play', label: 'Explore Resonance', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 22, 'FORCED OSCILLATION LAB', {
      fill: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Spring-mass visualization
    r.rect(50, 35, 280, 200, { fill: '#1e293b', rx: 8 });

    // Ceiling
    r.rect(50, 35, 280, 20, { fill: '#374151' });
    r.circle(190, 45, 8, { fill: '#ef4444' }); // Motor

    // Spring (zigzag)
    const springLength = 80 + this.displacement * 0.3;
    let springPath = `M190 55`;
    for (let i = 0; i < 8; i++) {
      const x = 170 + (i % 2) * 40;
      const y = 55 + (i + 1) * springLength / 9;
      springPath += ` L${x} ${y}`;
    }
    springPath += ` L190 ${55 + springLength}`;
    r.path(springPath, { stroke: '#f59e0b', strokeWidth: 3, fill: 'none' });

    // Mass
    const massY = 55 + springLength;
    r.rect(160, massY, 60, 35, {
      fill: this.isAtResonance() ? '#ef4444' : '#3b82f6',
      rx: 5
    });
    r.text(190, massY + 22, `${this.displacement.toFixed(0)}`, {
      fill: '#ffffff',
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Resonance indicator
    if (this.isAtResonance()) {
      r.text(280, 70, 'RESONANCE!', {
        fill: '#ef4444',
        fontSize: 12,
        fontWeight: 'bold'
      });
    }

    // Amplitude response curve
    r.rect(350, 40, 300, 140, { fill: '#1e293b', rx: 8 });
    r.text(500, 55, 'Amplitude Response', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Draw curve
    let curvePath = 'M365 165';
    for (let i = 0; i < 280; i++) {
      const omega = (i / 280) * 2;
      const A = 1 / Math.sqrt(Math.pow(1 - omega * omega, 2) + Math.pow(2 * 0.1 * omega, 2) + 0.01);
      const y = 165 - Math.min(A * 15, 100);
      curvePath += ` L${365 + i} ${y}`;
    }
    r.path(curvePath, { stroke: '#3b82f6', strokeWidth: 2, fill: 'none' });

    // Frequency marker
    const markerX = 365 + this.drivingFrequency * 140;
    r.line(markerX, 60, markerX, 170, { stroke: '#ef4444', strokeWidth: 2, opacity: 0.7 });
    r.circle(markerX, 165 - Math.min(this.amplitude * 15, 100), 5, { fill: '#ef4444' });

    // Stats
    r.rect(350, 195, 145, 40, { fill: '#1e3a5f', rx: 6 });
    r.text(422, 210, 'Frequency', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(422, 228, `${this.drivingFrequency.toFixed(2)}ω₀`, {
      fill: this.isAtResonance() ? '#ef4444' : '#3b82f6',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.rect(505, 195, 145, 40, { fill: '#3d1f0d', rx: 6 });
    r.text(577, 210, 'Amplitude', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(577, 228, `${this.amplitude.toFixed(1)}×`, {
      fill: this.isAtResonance() ? '#ef4444' : '#f59e0b',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Explanation
    let explanation = 'Adjust frequency to find resonance';
    if (this.drivingFrequency < 0.85) explanation = 'Below resonance: mass follows driving force';
    else if (this.drivingFrequency > 1.15) explanation = 'Above resonance: mass opposes driving force';
    else explanation = 'AT RESONANCE: Maximum amplitude!';

    r.rect(50, 250, 600, 35, { fill: this.isAtResonance() ? '#7f1d1d' : '#1e293b', rx: 6 });
    r.text(350, 272, explanation, {
      fill: this.isAtResonance() ? '#fca5a5' : '#94a3b8',
      fontSize: 11,
      textAnchor: 'middle'
    });

    // Controls
    r.addSlider({
      id: 'driving_freq',
      label: `Driving Frequency: ${this.drivingFrequency.toFixed(2)}×ω₀`,
      value: this.drivingFrequency,
      min: 0.2,
      max: 2.0,
      step: 0.05
    });

    if (this.isAnimating) {
      r.addButton({ id: 'stop_sim', label: 'Stop', variant: 'secondary' });
    } else {
      r.addButton({ id: 'start_sim', label: 'Start Driving', variant: 'primary' });
    }

    r.addButton({ id: 'nav_review', label: 'Review Concepts', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 28, 'THE PHYSICS OF FORCED OSCILLATIONS', {
      fill: '#ef4444',
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Equation of motion
    r.rect(50, 50, 290, 75, { fill: '#7f1d1d', rx: 8 });
    r.text(195, 70, 'Equation of Motion', { fill: '#fca5a5', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(195, 95, 'mx" + cx\' + kx = F₀cos(ωt)', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(195, 115, 'Natural frequency: ω₀ = √(k/m)', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Amplitude response
    r.rect(360, 50, 290, 75, { fill: '#581c87', rx: 8 });
    r.text(505, 70, 'Amplitude Response', { fill: '#d8b4fe', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(505, 95, 'A = F₀/√[(k-mω²)²+(cω)²]', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(505, 115, 'Peak when ω ≈ ω₀', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Why resonance is powerful
    r.rect(50, 140, 600, 75, { fill: '#052e16', rx: 8 });
    r.text(350, 160, 'WHY RESONANCE IS POWERFUL', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 185, 'At resonance, each driving cycle adds energy at exactly the right moment.', { fill: '#e2e8f0', fontSize: 11, textAnchor: 'middle' });
    r.text(350, 205, 'Quality Factor Q = 1/(2ζ) measures peak sharpness. High Q = sharp resonance!', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Glass breaking explanation
    r.rect(50, 230, 600, 45, { fill: '#1e293b', rx: 8 });
    r.text(350, 255, 'Glass has high Q, so only one exact frequency causes resonance - that\'s the note!', {
      fill: '#ef4444',
      fontSize: 11,
      textAnchor: 'middle'
    });

    r.addButton({ id: 'nav_twist_predict', label: 'Discover the Twist', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 30, 'THE TACOMA NARROWS MYSTERY', {
      fill: '#a855f7',
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 55, 'The bridge collapsed in 1940 during moderate (not storm) winds.', {
      fill: '#e2e8f0',
      fontSize: 12,
      textAnchor: 'middle'
    });
    r.text(350, 75, 'The wind was steady, not gusting. How did it cause oscillations?', {
      fill: '#a855f7',
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const options = [
      { id: 'A', text: 'Wind was simply too strong' },
      { id: 'B', text: 'Vortex shedding matched resonant frequency' },
      { id: 'C', text: 'Earthquake at same time' },
      { id: 'D', text: 'Truck traffic vibrations' }
    ];

    options.forEach((opt, i) => {
      const y = 100 + i * 45;
      const isSelected = this.twistPrediction === opt.id;
      const isCorrect = opt.id === 'B';

      let bgColor = '#1e293b';
      if (this.twistPrediction) {
        if (isCorrect) bgColor = '#052e16';
        else if (isSelected) bgColor = '#450a0a';
      } else if (isSelected) {
        bgColor = '#581c87';
      }

      r.rect(100, y, 500, 38, {
        fill: bgColor,
        rx: 8,
        stroke: isSelected ? '#a855f7' : '#334155',
        strokeWidth: 2
      });

      r.text(350, y + 24, `${opt.id}. ${opt.text}`, {
        fill: '#e2e8f0',
        fontSize: 12,
        textAnchor: 'middle'
      });

      r.addButton({ id: `twist_predict_${opt.id}`, label: opt.id, variant: 'secondary' });
    });

    if (this.twistPrediction) {
      const correct = this.twistPrediction === 'B';
      r.rect(100, 290, 500, 35, { fill: correct ? '#052e16' : '#581c87', rx: 8 });
      r.text(350, 311, correct
        ? 'Correct! Vortex shedding turned steady wind into periodic force!'
        : 'Answer: B - Vortex shedding created periodic forces at resonant frequency!', {
        fill: correct ? '#22c55e' : '#d8b4fe',
        fontSize: 11,
        textAnchor: 'middle'
      });
      r.addButton({ id: 'nav_twist_play', label: 'See How It Happens', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 25, 'VORTEX-INDUCED VIBRATION', {
      fill: '#a855f7',
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Vortex shedding diagram
    r.rect(50, 50, 280, 140, { fill: '#1e293b', rx: 8 });
    r.text(190, 70, 'Vortex Shedding', { fill: '#06b6d4', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Wind arrows
    for (let i = 0; i < 3; i++) {
      r.line(70, 100 + i * 25, 100, 100 + i * 25, { stroke: '#60a5fa', strokeWidth: 2 });
    }

    // Bridge section
    r.rect(115, 90, 25, 60, { fill: '#64748b', rx: 10 });

    // Vortices
    r.ellipse(170, 105, 18, 12, { fill: 'none', stroke: '#ef4444', strokeWidth: 2 });
    r.ellipse(170, 135, 18, 12, { fill: 'none', stroke: '#3b82f6', strokeWidth: 2 });
    r.ellipse(210, 110, 14, 10, { fill: 'none', stroke: '#3b82f6', strokeWidth: 2 });
    r.ellipse(210, 130, 14, 10, { fill: 'none', stroke: '#ef4444', strokeWidth: 2 });

    r.text(190, 175, 'Alternating pressure = periodic force', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Resonance buildup
    r.rect(370, 50, 280, 140, { fill: '#1e293b', rx: 8 });
    r.text(510, 70, 'Resonance Buildup', { fill: '#ef4444', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Growing oscillation
    r.path('M390 130 Q420 100, 450 130 Q480 160, 510 130 Q540 90, 570 130 Q600 170, 630 130', {
      stroke: '#ef4444',
      strokeWidth: 2,
      fill: 'none'
    });

    // Envelope
    r.path('M390 130 Q510 70, 630 95', { stroke: '#f59e0b', strokeWidth: 1, fill: 'none', opacity: 0.5 });
    r.path('M390 130 Q510 190, 630 165', { stroke: '#f59e0b', strokeWidth: 1, fill: 'none', opacity: 0.5 });

    r.text(510, 175, 'Amplitude grows over time!', { fill: '#f59e0b', fontSize: 9, textAnchor: 'middle' });

    // Strouhal number
    r.rect(150, 205, 400, 65, { fill: '#581c87', rx: 8 });
    r.text(350, 225, 'The Strouhal Number', { fill: '#d8b4fe', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 245, 'f = St × V / D', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 262, 'At 40 mph, vortices formed at ~0.2 Hz - matching bridge frequency!', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.addButton({ id: 'nav_twist_review', label: 'Review This Discovery', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 28, 'HIDDEN RESONANCE DANGERS', {
      fill: '#a855f7',
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Hidden periodic forces
    r.rect(50, 55, 290, 120, { fill: '#7f1d1d', rx: 8 });
    r.text(195, 75, 'Hidden Periodic Forces', { fill: '#fca5a5', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    const forces = ['• Vortex shedding from wind', '• Rotating machinery imbalance', '• Synchronized walking/marching', '• Electrical grid 50/60 Hz'];
    forces.forEach((f, i) => {
      r.text(70, 98 + i * 18, f, { fill: '#e2e8f0', fontSize: 10 });
    });

    // Prevention methods
    r.rect(360, 55, 290, 120, { fill: '#052e16', rx: 8 });
    r.text(505, 75, 'Prevention Methods', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    const methods = ['• Add damping to reduce peak', '• Detune natural frequency', '• Break up vortex patterns', '• Active vibration control'];
    methods.forEach((m, i) => {
      r.text(380, 98 + i * 18, m, { fill: '#e2e8f0', fontSize: 10 });
    });

    // Key insight
    r.rect(50, 190, 600, 50, { fill: '#1e293b', rx: 8 });
    r.text(350, 215, 'Engineers must always ask: "What periodic forces might my system encounter?"', {
      fill: '#22c55e',
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.addButton({ id: 'nav_transfer', label: 'See Real Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 25, 'RESONANCE IN THE REAL WORLD', {
      fill: '#ffffff',
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // App tabs
    transferApps.forEach((app, i) => {
      const x = 100 + i * 130;
      const isSelected = this.selectedApp === i;

      r.rect(x - 55, 45, 110, 28, {
        fill: isSelected ? app.color : '#1e293b',
        rx: 14
      });
      r.text(x, 63, app.short, {
        fill: '#ffffff',
        fontSize: 10,
        fontWeight: isSelected ? 'bold' : 'normal',
        textAnchor: 'middle'
      });

      r.addButton({ id: `app_${i}`, label: app.short, variant: 'secondary' });
    });

    const app = transferApps[this.selectedApp];

    // App content
    r.rect(50, 85, 600, 175, { fill: '#1e293b', rx: 10 });

    r.text(350, 110, app.title, {
      fill: app.color,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(350, 128, app.tagline, {
      fill: '#94a3b8',
      fontSize: 11,
      textAnchor: 'middle'
    });

    // Description (split into lines)
    const words = app.description.split(' ');
    let line1 = '';
    let line2 = '';
    words.forEach(word => {
      if (line1.length < 70) line1 += word + ' ';
      else line2 += word + ' ';
    });

    r.text(350, 155, line1.trim(), { fill: '#e2e8f0', fontSize: 11, textAnchor: 'middle' });
    if (line2) {
      r.text(350, 172, line2.trim(), { fill: '#e2e8f0', fontSize: 11, textAnchor: 'middle' });
    }

    // Connection
    r.rect(80, 195, 540, 50, { fill: '#374151', rx: 6 });
    r.text(350, 213, 'Resonance Connection:', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(350, 232, app.connection, {
      fill: app.color,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.addButton({ id: 'nav_test', label: 'Test Your Knowledge', variant: 'primary' });
  }

  private renderTest(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    const question = testQuestions[this.testIndex];
    const answered = this.testAnswers[this.testIndex] !== null;

    // Header
    r.text(100, 20, 'KNOWLEDGE CHECK', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold' });
    r.text(600, 20, `${this.testIndex + 1}/${testQuestions.length}`, {
      fill: '#94a3b8',
      fontSize: 12,
      textAnchor: 'end'
    });

    // Progress bar
    r.rect(50, 35, 600, 6, { fill: '#374151', rx: 3 });
    r.rect(50, 35, 600 * ((this.testIndex + (answered ? 1 : 0)) / testQuestions.length), 6, {
      fill: '#ef4444',
      rx: 3
    });

    // Scenario
    r.rect(50, 50, 600, 35, { fill: '#1e3a5f', rx: 6 });
    r.text(350, 72, question.scenario.slice(0, 80), {
      fill: '#93c5fd',
      fontSize: 10,
      textAnchor: 'middle'
    });

    // Question
    r.text(350, 105, question.question, {
      fill: '#ffffff',
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Options
    question.options.forEach((opt, i) => {
      const y = 120 + i * 38;
      const isSelected = this.testAnswers[this.testIndex] === i;
      const isCorrect = question.correct === i;

      let bgColor = '#1e293b';
      let borderColor = '#334155';

      if (answered) {
        if (isCorrect) {
          bgColor = '#052e16';
          borderColor = '#22c55e';
        } else if (isSelected) {
          bgColor = '#450a0a';
          borderColor = '#ef4444';
        }
      }

      r.rect(80, y, 540, 32, { fill: bgColor, rx: 6, stroke: borderColor, strokeWidth: 2 });

      const letter = String.fromCharCode(65 + i);
      r.circle(100, y + 16, 10, {
        fill: answered && isCorrect ? '#22c55e' : answered && isSelected ? '#ef4444' : '#374151'
      });
      r.text(100, y + 16, answered ? (isCorrect ? '✓' : isSelected ? '✗' : letter) : letter, {
        fill: '#ffffff',
        fontSize: 10,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });

      r.text(120, y + 16, opt, { fill: '#e2e8f0', fontSize: 10 });

      if (!answered) {
        r.addButton({ id: `answer_${i}`, label: letter, variant: 'secondary' });
      }
    });

    // Explanation
    if (this.showExplanation) {
      r.rect(50, 280, 600, 40, { fill: '#3d1f0d', rx: 6 });
      r.text(350, 303, question.explanation.slice(0, 85) + '...', {
        fill: '#fcd34d',
        fontSize: 10,
        textAnchor: 'middle'
      });

      r.addButton({
        id: 'next_question',
        label: this.testIndex < testQuestions.length - 1 ? 'Next Question' : 'See Results',
        variant: 'primary'
      });
    }

    // Score
    r.text(350, 340, `Score: ${this.testScore}/${this.testIndex + (answered ? 1 : 0)}`, {
      fill: '#64748b',
      fontSize: 11,
      textAnchor: 'middle'
    });
  }

  private renderMastery(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    const percentage = Math.round((this.testScore / testQuestions.length) * 100);
    const passed = percentage >= 70;

    r.text(350, 40, passed ? 'RESONANCE MASTER!' : 'KEEP LEARNING!', {
      fill: passed ? '#22c55e' : '#f59e0b',
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Score
    r.rect(250, 60, 200, 50, { fill: '#1e293b', rx: 10 });
    r.text(350, 90, `${this.testScore}/${testQuestions.length} (${percentage}%)`, {
      fill: '#ffffff',
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Key concepts
    r.rect(50, 125, 600, 85, { fill: '#1e293b', rx: 10 });
    r.text(350, 150, 'KEY CONCEPTS MASTERED', { fill: '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const concepts = [
      '• Resonance: max amplitude when ω = ω₀',
      '• Amplitude: A = F₀/√[(k-mω²)²+(cω)²]',
      '• Q factor determines resonance sharpness'
    ];
    concepts.forEach((c, i) => {
      r.text(100, 175 + i * 17, c, { fill: '#e2e8f0', fontSize: 11 });
    });

    // Applications mastered
    r.rect(50, 225, 600, 45, { fill: '#7f1d1d', rx: 8 });
    r.text(350, 252, 'Radio tuning • MRI imaging • Musical instruments • Earthquake engineering', {
      fill: '#fca5a5',
      fontSize: 11,
      textAnchor: 'middle'
    });

    if (!passed) {
      r.addButton({ id: 'retry_test', label: 'Try Again', variant: 'primary' });
    }
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      selectedApp: this.selectedApp,
      testIndex: this.testIndex,
      testScore: this.testScore,
      testAnswers: this.testAnswers,
      showExplanation: this.showExplanation,
      drivingFrequency: this.drivingFrequency,
      isAnimating: this.isAnimating,
      time: this.time,
      displacement: this.displacement,
      amplitude: this.amplitude
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.prediction !== undefined) this.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.selectedApp !== undefined) this.selectedApp = state.selectedApp as number;
    if (state.testIndex !== undefined) this.testIndex = state.testIndex as number;
    if (state.testScore !== undefined) this.testScore = state.testScore as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as (number | null)[];
    if (state.showExplanation !== undefined) this.showExplanation = state.showExplanation as boolean;
    if (state.drivingFrequency !== undefined) this.drivingFrequency = state.drivingFrequency as number;
    if (state.isAnimating !== undefined) this.isAnimating = state.isAnimating as boolean;
    if (state.time !== undefined) this.time = state.time as number;
    if (state.displacement !== undefined) this.displacement = state.displacement as number;
    if (state.amplitude !== undefined) this.amplitude = state.amplitude as number;
  }
}

export function createForcedOscillationsGame(sessionId: string): ForcedOscillationsGame {
  return new ForcedOscillationsGame(sessionId);
}
