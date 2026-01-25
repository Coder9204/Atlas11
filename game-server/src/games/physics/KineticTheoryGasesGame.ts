/**
 * Kinetic Theory of Gases Game - Server-Side Implementation
 *
 * Physics: PV = NkT, v_rms = sqrt(3kT/m), KE_avg = (3/2)kT
 * Key insight: Temperature IS molecular motion
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface Molecule {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
}

interface TestQuestion {
  scenario: string;
  question: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  stats: { value: string; label: string }[];
  color: string;
}

// Boltzmann constant
const k_B = 1.38e-23; // J/K

// Test questions
const testQuestions: TestQuestion[] = [
  {
    scenario: "A sealed balloon is taken from 300 K to 330 K (10% hotter).",
    question: "How does the average molecular speed change?",
    options: [
      { text: "Increases by about 5%", correct: true },
      { text: "Increases by about 10%", correct: false },
      { text: "Stays the same", correct: false },
      { text: "Doubles", correct: false }
    ],
    explanation: "v_rms is proportional to sqrt(T). When T increases 10%, v increases by sqrt(1.1) = 1.05, or about 5%."
  },
  {
    scenario: "Two containers at the same temperature: helium (mass 4 u) and argon (mass 40 u).",
    question: "How does helium's RMS speed compare to argon?",
    options: [
      { text: "Helium is sqrt(10) = 3.2x faster", correct: true },
      { text: "Helium is 10x faster", correct: false },
      { text: "Same speed (same temperature)", correct: false },
      { text: "Argon is faster (heavier)", correct: false }
    ],
    explanation: "v_rms = sqrt(3kT/m). Lighter molecules move faster: v_He/v_Ar = sqrt(40/4) = 3.2."
  },
  {
    scenario: "A gas is compressed to half volume at constant temperature.",
    question: "What happens to the pressure?",
    options: [
      { text: "Doubles", correct: true },
      { text: "Quadruples", correct: false },
      { text: "Stays the same", correct: false },
      { text: "Halves", correct: false }
    ],
    explanation: "PV = NkT. At constant T and N, halving V doubles P. Molecules hit walls twice as often."
  },
  {
    scenario: "Oxygen molecules at room temp move at ~480 m/s.",
    question: "Why don't we feel this 'molecular wind'?",
    options: [
      { text: "Random directions average to zero", correct: true },
      { text: "Molecules are too small", correct: false },
      { text: "Air pressure cancels it", correct: false },
      { text: "Our nerves can't detect it", correct: false }
    ],
    explanation: "Molecules move randomly in all directions. Equal numbers left/right, up/down = zero net momentum."
  },
  {
    scenario: "Tire at 20°C reads 32 psi. After driving, it's 50°C.",
    question: "What's the approximate new pressure?",
    options: [
      { text: "About 35 psi", correct: true },
      { text: "About 40 psi", correct: false },
      { text: "Still 32 psi", correct: false },
      { text: "About 48 psi", correct: false }
    ],
    explanation: "P/T = constant. P2 = 32 × (323K/293K) = 35.3 psi. 10% T increase = 10% P increase."
  },
  {
    scenario: "Maxwell-Boltzmann distribution has peak, average, and RMS speeds.",
    question: "What's the correct ordering from lowest to highest?",
    options: [
      { text: "Peak < Average < RMS", correct: true },
      { text: "RMS < Average < Peak", correct: false },
      { text: "Average < Peak < RMS", correct: false },
      { text: "All equal", correct: false }
    ],
    explanation: "The distribution is asymmetric with a high-speed tail, skewing average above peak, and RMS highest."
  },
  {
    scenario: "A mixture of N2, O2, and CO2 at thermal equilibrium.",
    question: "Which statement about average kinetic energy is true?",
    options: [
      { text: "All have the same average KE", correct: true },
      { text: "CO2 has highest KE (largest)", correct: false },
      { text: "N2 has highest KE (fastest)", correct: false },
      { text: "O2 has highest KE (most reactive)", correct: false }
    ],
    explanation: "KE_avg = (3/2)kT depends ONLY on temperature. At equilibrium, all species have same KE."
  },
  {
    scenario: "Classical kinetic theory predicts zero motion at 0 K.",
    question: "Why is absolute zero impossible to reach?",
    options: [
      { text: "Removing last bit of energy requires infinite work", correct: true },
      { text: "Molecules always vibrate from bonds", correct: false },
      { text: "Container walls transfer heat", correct: false },
      { text: "Gravity prevents complete stop", correct: false }
    ],
    explanation: "Third law: absolute zero can't be reached in finite steps. Each joule requires more work as T→0."
  },
  {
    scenario: "Scuba tank at 200 atm decompresses rapidly to 1 atm.",
    question: "Why does rapid expansion cause cooling?",
    options: [
      { text: "Gas does work expanding, losing internal energy", correct: true },
      { text: "Lower pressure means lower temperature", correct: false },
      { text: "Friction with tank walls", correct: false },
      { text: "Heat absorbed by tank", correct: false }
    ],
    explanation: "Expansion does work (W = PΔV). This comes from internal energy, reducing KE and temperature."
  },
  {
    scenario: "Graham's Law: effusion rate ∝ 1/sqrt(molecular mass).",
    question: "This is a consequence of which kinetic theory principle?",
    options: [
      { text: "Lighter molecules move faster at same temperature", correct: true },
      { text: "Lighter molecules have more KE", correct: false },
      { text: "Smaller molecules fit through holes", correct: false },
      { text: "Lighter molecules collide less", correct: false }
    ],
    explanation: "Effusion depends on speed. Since v_rms ∝ 1/sqrt(m), lighter gases effuse faster."
  }
];

// Transfer applications
const transferApps: TransferApp[] = [
  {
    icon: "rocket",
    title: "Aerospace Engineering",
    short: "Rocket Propulsion",
    tagline: "Molecular speeds become rocket speeds",
    description: "Rocket exhaust velocity depends on temperature and molecular mass - lighter, hotter = faster thrust.",
    connection: "Rocket nozzles convert random thermal motion into directed kinetic energy (thrust).",
    stats: [
      { value: "3000°C", label: "Exhaust temp" },
      { value: "3 km/s", label: "Exhaust speed" },
      { value: "30 km/s", label: "Ion thruster" },
      { value: "11.2 km/s", label: "Escape vel" }
    ],
    color: "#f97316"
  },
  {
    icon: "wind",
    title: "HVAC & Refrigeration",
    short: "Climate Control",
    tagline: "Molecular motion management",
    description: "Cooling systems cycle refrigerants through compression and expansion phases.",
    connection: "PV = NkT governs refrigeration: compress to heat, expand to cool.",
    stats: [
      { value: "$240B", label: "Market size" },
      { value: "6%", label: "US electricity" },
      { value: "300-400%", label: "Heat pump COP" },
      { value: "10°C", label: "Temp swing" }
    ],
    color: "#0ea5e9"
  },
  {
    icon: "flask",
    title: "Chemical Engineering",
    short: "Industrial Reactions",
    tagline: "Controlling molecular collisions",
    description: "Reaction rates depend on collision frequency and energy distribution.",
    connection: "Higher T = more collisions + more high-energy collisions = faster reactions.",
    stats: [
      { value: "450°C", label: "Haber process" },
      { value: "200 atm", label: "Ammonia synthesis" },
      { value: "2x rate", label: "Per 10°C rise" },
      { value: "$4T", label: "Refining industry" }
    ],
    color: "#8b5cf6"
  },
  {
    icon: "microscope",
    title: "Vacuum Technology",
    short: "Ultra-High Vacuum",
    tagline: "The art of removing molecules",
    description: "At ultra-high vacuum, molecules travel meters between collisions.",
    connection: "Mean free path increases as pressure decreases, enabling precision manufacturing.",
    stats: [
      { value: "10⁻⁹ torr", label: "Semiconductor fab" },
      { value: "100 m", label: "Mean free path" },
      { value: "10⁻¹⁰ torr", label: "LHC beam pipe" },
      { value: "LIGO", label: "Gravity waves" }
    ],
    color: "#06b6d4"
  }
];

export class KineticTheoryGasesGame extends BaseGame {
  readonly gameType = 'kinetic_theory_gases';
  readonly gameTitle = 'Kinetic Theory of Gases';

  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private selectedApp = 0;
  private testIndex = 0;
  private testScore = 0;
  private testAnswers: (number | null)[] = new Array(10).fill(null);
  private showExplanation = false;

  // Simulation state
  private temperature = 300; // Kelvin
  private volume = 100; // Arbitrary units
  private particleCount = 30;
  private molecules: Molecule[] = [];
  private wallCollisions = 0;
  private pressure = 0;
  private lastUpdateTime = 0;

  constructor(sessionId: string) {
    super(sessionId);
  }

  initialize(config: SessionConfig): void {
    super.initialize(config);
    if (config.resumePhase) {
      this.phase = config.resumePhase as GamePhase;
    }
    this.initializeMolecules();
  }

  private calculateRmsSpeed(temp: number): number {
    const mass = 4.65e-26; // Nitrogen molecule mass
    return Math.sqrt((3 * k_B * temp) / mass);
  }

  private calculateAvgKE(temp: number): number {
    return (3 / 2) * k_B * temp;
  }

  private getSpeedColor(speedFactor: number): string {
    if (speedFactor < 0.7) return '#3b82f6'; // Blue - slow
    if (speedFactor < 1.0) return '#22c55e'; // Green - medium
    if (speedFactor < 1.3) return '#f59e0b'; // Orange - fast
    return '#ef4444'; // Red - very fast
  }

  private initializeMolecules(): void {
    const containerSize = 250;
    this.molecules = [];
    const baseSpeed = this.calculateRmsSpeed(this.temperature);
    const scaleFactor = 0.00001;

    for (let i = 0; i < this.particleCount; i++) {
      const speedFactor = 0.5 + Math.random() * 1.5;
      const speed = baseSpeed * scaleFactor * speedFactor;
      const angle = Math.random() * 2 * Math.PI;

      this.molecules.push({
        id: i,
        x: 20 + Math.random() * (containerSize - 40),
        y: 20 + Math.random() * (containerSize - 40),
        vx: speed * Math.cos(angle),
        vy: speed * Math.sin(angle),
        color: this.getSpeedColor(speedFactor)
      });
    }

    this.wallCollisions = 0;
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
      this.initializeMolecules();
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
    if (id === 'temperature') {
      this.temperature = value;
      this.initializeMolecules();
    } else if (id === 'volume') {
      this.volume = value;
    } else if (id === 'particles') {
      this.particleCount = value;
      this.initializeMolecules();
    }
  }

  private handleTestAnswer(optionIndex: number): void {
    if (this.testAnswers[this.testIndex] !== null) return;

    this.testAnswers[this.testIndex] = optionIndex;
    const isCorrect = testQuestions[this.testIndex].options[optionIndex].correct;

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
    // Update molecule positions
    if (this.phase === 'play' || this.phase === 'twist_play') {
      const now = Date.now();
      const dt = (now - this.lastUpdateTime) / 1000;
      this.lastUpdateTime = now;

      if (dt > 0 && dt < 0.1) {
        const containerSize = Math.min(this.volume * 2.5, 250);
        let newCollisions = 0;

        this.molecules = this.molecules.map(mol => {
          let newX = mol.x + mol.vx * dt * 60;
          let newY = mol.y + mol.vy * dt * 60;
          let newVx = mol.vx;
          let newVy = mol.vy;

          if (newX <= 4 || newX >= containerSize - 4) {
            newX = Math.max(4, Math.min(containerSize - 4, newX));
            newVx = -newVx;
            newCollisions++;
          }

          if (newY <= 4 || newY >= containerSize - 4) {
            newY = Math.max(4, Math.min(containerSize - 4, newY));
            newVy = -newVy;
            newCollisions++;
          }

          return { ...mol, x: newX, y: newY, vx: newVx, vy: newVy };
        });

        this.wallCollisions += newCollisions;
        this.pressure = (this.particleCount * this.temperature) / this.volume;
      }
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

    r.text(350, 35, 'THE INVISIBLE STORM', {
      fill: '#f97316',
      fontSize: 26,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 65, 'Temperature IS molecular motion', {
      fill: '#94a3b8',
      fontSize: 14,
      textAnchor: 'middle'
    });

    // Animated container visualization
    r.rect(200, 90, 300, 150, { fill: '#1e293b', rx: 10 });

    // Draw molecules at random positions
    for (let i = 0; i < 25; i++) {
      const x = 220 + Math.random() * 260;
      const y = 110 + Math.random() * 110;
      const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];
      r.circle(x, y, 4, { fill: colors[i % 4], opacity: 0.8 });
    }

    r.text(350, 265, 'Air molecules bombard your skin at', {
      fill: '#e2e8f0',
      fontSize: 13,
      textAnchor: 'middle'
    });
    r.text(350, 285, '500 meters per second - faster than a bullet!', {
      fill: '#f97316',
      fontSize: 15,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(350, 310, 'Yet you only feel gentle air pressure. Why?', {
      fill: '#94a3b8',
      fontSize: 12,
      textAnchor: 'middle'
    });

    r.addButton({ id: 'nav_predict', label: 'Discover Why', variant: 'primary' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 30, 'MAKE YOUR PREDICTION', {
      fill: '#ffffff',
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 55, 'If you DOUBLE the temperature (in Kelvin),', {
      fill: '#e2e8f0',
      fontSize: 13,
      textAnchor: 'middle'
    });
    r.text(350, 75, 'how will the average molecular speed change?', {
      fill: '#f59e0b',
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const options = [
      { id: 'double', text: 'Speed doubles (2x)' },
      { id: 'root2', text: 'Speed increases by sqrt(2) = 1.41x' },
      { id: 'quadruple', text: 'Speed quadruples (4x)' },
      { id: 'same', text: 'Speed stays the same' }
    ];

    options.forEach((opt, i) => {
      const y = 100 + i * 50;
      const isSelected = this.prediction === opt.id;

      r.rect(120, y, 460, 40, {
        fill: isSelected ? '#1e40af' : '#1e293b',
        rx: 8,
        stroke: isSelected ? '#3b82f6' : '#334155',
        strokeWidth: 2
      });

      r.text(350, y + 25, opt.text, {
        fill: '#e2e8f0',
        fontSize: 14,
        textAnchor: 'middle'
      });

      r.addButton({ id: `predict_${opt.id}`, label: opt.id, variant: 'secondary' });
    });

    if (this.prediction) {
      r.addButton({ id: 'nav_play', label: 'Run the Experiment', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 22, 'MOLECULAR MOTION SIMULATION', {
      fill: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Container for molecules
    const containerSize = Math.min(this.volume * 2.5, 250);
    r.rect(50, 45, containerSize, containerSize, { fill: '#0a0f1a', rx: 5, stroke: '#4b5563', strokeWidth: 2 });

    // Draw molecules
    this.molecules.forEach(mol => {
      if (mol.x > 0 && mol.y > 0) {
        r.circle(50 + mol.x, 45 + mol.y, 4, { fill: mol.color, opacity: 0.9 });
      }
    });

    // Speed legend
    r.rect(320, 50, 100, 80, { fill: '#1e293b', rx: 5 });
    r.text(370, 65, 'Speed', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.circle(335, 80, 4, { fill: '#3b82f6' });
    r.text(360, 83, 'Slow', { fill: '#94a3b8', fontSize: 9 });
    r.circle(335, 95, 4, { fill: '#22c55e' });
    r.text(360, 98, 'Medium', { fill: '#94a3b8', fontSize: 9 });
    r.circle(335, 110, 4, { fill: '#f59e0b' });
    r.text(360, 113, 'Fast', { fill: '#94a3b8', fontSize: 9 });
    r.circle(335, 125, 4, { fill: '#ef4444' });
    r.text(360, 128, 'Very Fast', { fill: '#94a3b8', fontSize: 9 });

    // Stats panel
    const rmsSpeed = this.calculateRmsSpeed(this.temperature);
    const avgKE = this.calculateAvgKE(this.temperature);

    r.rect(440, 50, 120, 45, { fill: '#3d1f0d', rx: 5 });
    r.text(500, 65, 'RMS Speed', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(500, 85, `${rmsSpeed.toFixed(0)} m/s`, { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(570, 50, 120, 45, { fill: '#1e3a5f', rx: 5 });
    r.text(630, 65, 'Pressure', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(630, 85, `${this.pressure.toFixed(1)}`, { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(440, 105, 120, 45, { fill: '#2e1065', rx: 5 });
    r.text(500, 120, 'Avg KE', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(500, 140, `${(avgKE * 1e21).toFixed(2)}×10⁻²¹ J`, { fill: '#a855f7', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(570, 105, 120, 45, { fill: '#052e16', rx: 5 });
    r.text(630, 120, 'Collisions', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(630, 140, `${this.wallCollisions}`, { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Sliders
    r.addSlider({
      id: 'temperature',
      label: `Temperature: ${this.temperature} K`,
      value: this.temperature,
      min: 100,
      max: 600,
      step: 10
    });

    r.addSlider({
      id: 'volume',
      label: `Volume: ${this.volume} units`,
      value: this.volume,
      min: 50,
      max: 150,
      step: 10
    });

    // Result box
    if (this.prediction) {
      const correct = this.prediction === 'root2';
      r.rect(320, 170, 370, 50, { fill: correct ? '#052e16' : '#3d1f0d', rx: 8 });
      r.text(505, 195, correct
        ? 'Correct! v_rms ∝ sqrt(T), so 2T gives sqrt(2)× speed'
        : 'v_rms ∝ sqrt(T), so doubling T gives sqrt(2)× = 1.41× speed', {
        fill: correct ? '#22c55e' : '#f59e0b',
        fontSize: 11,
        textAnchor: 'middle'
      });
    }

    r.addButton({ id: 'nav_review', label: 'See the Physics', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 28, 'THE KINETIC THEORY EQUATIONS', {
      fill: '#f97316',
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Equation 1: Ideal Gas Law
    r.rect(50, 50, 200, 80, { fill: '#1e3a5f', rx: 8 });
    r.text(150, 75, 'PV = NkT', { fill: '#3b82f6', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(150, 100, 'Ideal Gas Law', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(150, 120, 'Pressure × Volume = N × Boltzmann × Temp', { fill: '#64748b', fontSize: 8, textAnchor: 'middle' });

    // Equation 2: RMS Speed
    r.rect(260, 50, 200, 80, { fill: '#052e16', rx: 8 });
    r.text(360, 75, 'v = √(3kT/m)', { fill: '#22c55e', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(360, 100, 'RMS Speed', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(360, 120, 'Speed ∝ √T, Speed ∝ 1/√m', { fill: '#64748b', fontSize: 8, textAnchor: 'middle' });

    // Equation 3: Average KE
    r.rect(470, 50, 200, 80, { fill: '#2e1065', rx: 8 });
    r.text(570, 75, 'KE = (3/2)kT', { fill: '#a855f7', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(570, 100, 'Average Kinetic Energy', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(570, 120, 'KE depends ONLY on temperature', { fill: '#64748b', fontSize: 8, textAnchor: 'middle' });

    // Key insights
    r.rect(50, 145, 600, 60, { fill: '#3d1f0d', rx: 8 });
    r.text(350, 165, 'WHY √T FOR SPEED?', { fill: '#f59e0b', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 185, 'KE = ½mv². Since KE ∝ T, and m is constant, v² ∝ T, so v ∝ √T.', { fill: '#e2e8f0', fontSize: 11, textAnchor: 'middle' });
    r.text(350, 200, 'Doubling temperature doubles KE but only increases speed by √2.', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.rect(50, 215, 600, 50, { fill: '#1e293b', rx: 8 });
    r.text(350, 235, 'Temperature isn\'t just correlated with motion - it IS motion.', { fill: '#f8fafc', fontSize: 12, textAnchor: 'middle' });
    r.text(350, 255, 'Heat flow is the transfer of kinetic energy from faster to slower molecules.', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'nav_twist_predict', label: 'Ready for a Twist?', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 30, 'THE MASS PARADOX', {
      fill: '#a855f7',
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 60, 'Two containers at the same temperature:', {
      fill: '#e2e8f0',
      fontSize: 14,
      textAnchor: 'middle'
    });
    r.text(350, 85, 'Helium (mass 4) vs Argon (mass 40)', {
      fill: '#f59e0b',
      fontSize: 15,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 115, 'Which gas has molecules moving faster?', {
      fill: '#ffffff',
      fontSize: 14,
      textAnchor: 'middle'
    });

    const options = [
      { id: 'helium', text: 'Helium moves √10 = 3.2× faster' },
      { id: 'argon', text: 'Argon moves faster (heavier = more momentum)' },
      { id: 'same', text: 'Same speed (same temperature)' },
      { id: 'helium10x', text: 'Helium moves 10× faster' }
    ];

    options.forEach((opt, i) => {
      const y = 140 + i * 45;
      const isSelected = this.twistPrediction === opt.id;

      r.rect(100, y, 500, 38, {
        fill: isSelected ? '#581c87' : '#1e293b',
        rx: 6,
        stroke: isSelected ? '#a855f7' : '#334155',
        strokeWidth: 2
      });

      r.text(350, y + 23, opt.text, {
        fill: '#e2e8f0',
        fontSize: 12,
        textAnchor: 'middle'
      });

      r.addButton({ id: `twist_predict_${opt.id}`, label: opt.id, variant: 'secondary' });
    });

    if (this.twistPrediction) {
      r.addButton({ id: 'nav_twist_play', label: 'See the Comparison', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 25, 'HELIUM vs ARGON AT SAME TEMPERATURE', {
      fill: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Helium container (left)
    r.rect(50, 55, 280, 150, { fill: '#1e293b', rx: 8 });
    r.text(190, 75, 'HELIUM (mass 4)', { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Fast-moving helium molecules (spread out, implied fast)
    for (let i = 0; i < 15; i++) {
      const x = 80 + Math.random() * 220;
      const y = 95 + Math.random() * 90;
      r.circle(x, y, 3, { fill: '#22c55e', opacity: 0.8 });
    }

    const heSpeed = Math.sqrt((3 * k_B * 300) / (4 * 1.66e-27));
    r.text(190, 220, `v_rms = ${(heSpeed / 1000).toFixed(1)} km/s`, {
      fill: '#22c55e',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Argon container (right)
    r.rect(370, 55, 280, 150, { fill: '#1e293b', rx: 8 });
    r.text(510, 75, 'ARGON (mass 40)', { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Slower argon molecules (larger, clustered)
    for (let i = 0; i < 15; i++) {
      const x = 400 + Math.random() * 220;
      const y = 95 + Math.random() * 90;
      r.circle(x, y, 5, { fill: '#3b82f6', opacity: 0.8 });
    }

    const arSpeed = Math.sqrt((3 * k_B * 300) / (40 * 1.66e-27));
    r.text(510, 220, `v_rms = ${(arSpeed / 1000).toFixed(1)} km/s`, {
      fill: '#3b82f6',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Ratio
    r.rect(200, 250, 300, 50, { fill: '#052e16', rx: 8 });
    r.text(350, 270, `Helium is ${(heSpeed / arSpeed).toFixed(1)}× faster!`, {
      fill: '#22c55e',
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(350, 290, 'v_He/v_Ar = √(m_Ar/m_He) = √(40/4) = √10 = 3.16', {
      fill: '#94a3b8',
      fontSize: 10,
      textAnchor: 'middle'
    });

    r.addButton({ id: 'nav_twist_review', label: 'Understand Why', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 30, 'SAME ENERGY, DIFFERENT SPEEDS', {
      fill: '#a855f7',
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const correctTwist = this.twistPrediction === 'helium';
    r.text(350, 55, correctTwist
      ? 'Correct! Lighter molecules move faster at the same temperature.'
      : 'At same T, all molecules have same KE, but lighter ones move faster!', {
      fill: correctTwist ? '#22c55e' : '#f59e0b',
      fontSize: 12,
      textAnchor: 'middle'
    });

    // Physics explanation
    r.rect(50, 75, 300, 100, { fill: '#1e3a5f', rx: 8 });
    r.text(200, 95, 'Same Average Kinetic Energy', { fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 120, 'KE = (3/2)kT', { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 145, 'KE only depends on T, not mass', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 165, 'Helium KE = Argon KE (same T)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.rect(370, 75, 300, 100, { fill: '#052e16', rx: 8 });
    r.text(520, 95, 'Different Speeds', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(520, 120, 'v = √(3kT/m)', { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(520, 145, 'Speed ∝ 1/√m', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(520, 165, 'Lighter → Faster', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Real-world implication
    r.rect(50, 190, 600, 65, { fill: '#3d1f0d', rx: 8 });
    r.text(350, 210, 'WHY EARTH LOST ITS HYDROGEN', { fill: '#f59e0b', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 230, 'Hydrogen molecules move so fast (v_rms = 1.9 km/s at 300K)', { fill: '#e2e8f0', fontSize: 11, textAnchor: 'middle' });
    r.text(350, 248, 'that some exceed escape velocity (11.2 km/s) and leave our atmosphere!', { fill: '#e2e8f0', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'nav_transfer', label: 'See Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 25, 'KINETIC THEORY IN ACTION', {
      fill: '#ffffff',
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // App selector tabs
    transferApps.forEach((app, i) => {
      const tx = 100 + i * 130;
      const isSelected = this.selectedApp === i;

      r.rect(tx - 55, 45, 110, 30, {
        fill: isSelected ? app.color : '#1e293b',
        rx: 15
      });
      r.text(tx, 63, app.short, {
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

    r.text(350, 108, app.title, {
      fill: app.color,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(350, 128, app.tagline, {
      fill: '#94a3b8',
      fontSize: 11,
      textAnchor: 'middle'
    });

    r.text(350, 150, app.description, {
      fill: '#e2e8f0',
      fontSize: 10,
      textAnchor: 'middle'
    });

    // Connection
    r.rect(70, 165, 560, 30, { fill: '#374151', rx: 5 });
    r.text(350, 183, app.connection, {
      fill: '#94a3b8',
      fontSize: 9,
      textAnchor: 'middle'
    });

    // Stats
    app.stats.forEach((stat, i) => {
      const sx = 125 + i * 130;
      r.rect(sx - 50, 205, 100, 40, { fill: '#0f172a', rx: 5 });
      r.text(sx, 222, stat.value, {
        fill: app.color,
        fontSize: 12,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });
      r.text(sx, 238, stat.label, {
        fill: '#64748b',
        fontSize: 8,
        textAnchor: 'middle'
      });
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
      fill: '#f97316',
      rx: 3
    });

    // Scenario
    r.rect(50, 50, 600, 35, { fill: '#1e3a5f', rx: 6 });
    r.text(350, 72, question.scenario, {
      fill: '#93c5fd',
      fontSize: 11,
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
      const isCorrect = opt.correct;

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

      r.text(120, y + 16, opt.text, {
        fill: '#e2e8f0',
        fontSize: 11
      });

      if (!answered) {
        r.addButton({ id: `answer_${i}`, label: letter, variant: 'secondary' });
      }
    });

    // Explanation
    if (this.showExplanation) {
      r.rect(50, 280, 600, 40, { fill: '#3d1f0d', rx: 6 });
      r.text(350, 303, question.explanation.slice(0, 90) + '...', {
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

    r.text(350, 35, passed ? 'KINETIC THEORY MASTERED!' : 'KEEP EXPLORING!', {
      fill: passed ? '#22c55e' : '#f59e0b',
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Score display
    r.rect(250, 55, 200, 50, { fill: '#1e293b', rx: 10 });
    r.text(350, 85, `${this.testScore}/${testQuestions.length} (${percentage}%)`, {
      fill: '#ffffff',
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Key equations
    r.rect(50, 120, 200, 55, { fill: '#1e3a5f', rx: 8 });
    r.text(150, 145, 'PV = NkT', { fill: '#3b82f6', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(150, 165, 'Ideal Gas Law', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.rect(260, 120, 180, 55, { fill: '#052e16', rx: 8 });
    r.text(350, 145, 'v = √(3kT/m)', { fill: '#22c55e', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 165, 'RMS Speed', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.rect(450, 120, 200, 55, { fill: '#2e1065', rx: 8 });
    r.text(550, 145, 'KE = (3/2)kT', { fill: '#a855f7', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(550, 165, 'Average KE', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Big picture
    r.rect(50, 190, 600, 70, { fill: '#3d1f0d', rx: 10 });
    r.text(350, 210, 'THE BIG PICTURE', { fill: '#f59e0b', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 230, 'Temperature is the average kinetic energy of molecular motion.', { fill: '#e2e8f0', fontSize: 11, textAnchor: 'middle' });
    r.text(350, 248, 'Every gas law emerges from countless molecules in chaotic dance.', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

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
      temperature: this.temperature,
      volume: this.volume,
      particleCount: this.particleCount,
      wallCollisions: this.wallCollisions,
      pressure: this.pressure
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
    if (state.temperature !== undefined) this.temperature = state.temperature as number;
    if (state.volume !== undefined) this.volume = state.volume as number;
    if (state.particleCount !== undefined) this.particleCount = state.particleCount as number;
    if (state.wallCollisions !== undefined) this.wallCollisions = state.wallCollisions as number;
    if (state.pressure !== undefined) this.pressure = state.pressure as number;
  }
}

export function createKineticTheoryGasesGame(sessionId: string): KineticTheoryGasesGame {
  return new KineticTheoryGasesGame(sessionId);
}
