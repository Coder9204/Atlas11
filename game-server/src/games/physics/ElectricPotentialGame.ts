/**
 * Electric Potential Game - Server-Side Implementation
 *
 * Physics: V = W/q (work per unit charge), V = kq/r (point charge potential)
 * Key concept: Electric potential is potential energy per unit charge
 * Relationship: E = -dV/dr (field is negative gradient of potential)
 * Units: Volts (V) = Joules per Coulomb (J/C)
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

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

// Coulomb's constant
const k = 8.99e9;

// Test questions
const testQuestions: TestQuestion[] = [
  {
    scenario: "A +2μC charge is at a point where V = 500V.",
    question: "What is the potential energy of the charge?",
    options: [
      { text: "250 J", correct: false },
      { text: "1 mJ (1000 μJ)", correct: true },
      { text: "500 J", correct: false },
      { text: "2500 J", correct: false }
    ],
    explanation: "U = qV = (2×10⁻⁶ C)(500 V) = 1×10⁻³ J = 1 mJ."
  },
  {
    scenario: "An electron moves from V = -100V to V = 0V.",
    question: "How much kinetic energy does it gain?",
    options: [
      { text: "100 eV", correct: true },
      { text: "-100 eV", correct: false },
      { text: "0 eV", correct: false },
      { text: "1.6×10⁻¹⁷ J", correct: false }
    ],
    explanation: "ΔKE = -qΔV = -(-e)(0-(-100)) = +100 eV. The electron gains energy."
  },
  {
    scenario: "A +5μC charge creates V = 900 kV at distance r.",
    question: "What is the distance r?",
    options: [
      { text: "1 cm", correct: false },
      { text: "5 cm", correct: true },
      { text: "10 cm", correct: false },
      { text: "50 cm", correct: false }
    ],
    explanation: "V = kq/r, so r = kq/V = (8.99×10⁹)(5×10⁻⁶)/(9×10⁵) = 0.05 m = 5 cm."
  },
  {
    scenario: "Parallel plates separated by 2mm with 200V between them.",
    question: "What is the electric field magnitude?",
    options: [
      { text: "100 V/m", correct: false },
      { text: "400 V/m", correct: false },
      { text: "100,000 V/m", correct: true },
      { text: "200 V/m", correct: false }
    ],
    explanation: "E = V/d = 200 V / 0.002 m = 100,000 V/m. Uniform field between plates."
  },
  {
    scenario: "A proton and electron start from rest in a 1000V potential difference.",
    question: "Which gains more kinetic energy?",
    options: [
      { text: "Proton (heavier)", correct: false },
      { text: "Electron (lighter)", correct: false },
      { text: "Both gain the same", correct: true },
      { text: "Neither gains energy", correct: false }
    ],
    explanation: "Both gain KE = |q|ΔV = 1000 eV. Energy depends on charge, not mass."
  },
  {
    scenario: "A test charge moves along an equipotential from A to B.",
    question: "How much work is done by the field?",
    options: [
      { text: "Maximum work", correct: false },
      { text: "Depends on path", correct: false },
      { text: "Zero", correct: true },
      { text: "Negative work", correct: false }
    ],
    explanation: "W = qΔV. Along an equipotential, ΔV = 0, so W = 0."
  },
  {
    scenario: "+4μC and -4μC charges form a dipole, 10cm apart.",
    question: "What is the potential at the exact midpoint?",
    options: [
      { text: "Very high positive", correct: false },
      { text: "Very high negative", correct: false },
      { text: "Zero", correct: true },
      { text: "Undefined", correct: false }
    ],
    explanation: "V = k(+q)/r + k(-q)/r = 0. The potentials cancel exactly."
  },
  {
    scenario: "A Van de Graaff charges a sphere to 500,000V.",
    question: "Why might a spark be harmless despite high voltage?",
    options: [
      { text: "High voltage = high current", correct: false },
      { text: "Body is an insulator", correct: false },
      { text: "Limited charge = limited energy", correct: true },
      { text: "Voltage doesn't affect body", correct: false }
    ],
    explanation: "Energy = qV. High V but tiny q means small total energy."
  },
  {
    scenario: "A 12V battery moves charges from - to + terminal internally.",
    question: "What does the battery do to these charges?",
    options: [
      { text: "Nothing", correct: false },
      { text: "Increases their potential energy", correct: true },
      { text: "Removes their energy", correct: false },
      { text: "Changes their mass", correct: false }
    ],
    explanation: "The battery does work to raise charge potential by 12 eV per electron."
  },
  {
    scenario: "Lightning: 100 million volts across a 1km gap.",
    question: "What field strength causes air breakdown?",
    options: [
      { text: "1,000 V/m", correct: false },
      { text: "10,000 V/m", correct: false },
      { text: "100,000 V/m", correct: true },
      { text: "1 billion V/m", correct: false }
    ],
    explanation: "E = V/d = 10⁸ V / 10³ m = 10⁵ V/m = 100 kV/m."
  }
];

// Transfer applications
const transferApps: TransferApp[] = [
  {
    icon: "battery",
    title: "Batteries & Power Supplies",
    short: "Batteries",
    tagline: "Portable potential difference",
    description: "Batteries create constant voltage through chemical reactions, enabling portable electronics.",
    connection: "Chemical energy maintains fixed potential difference between terminals.",
    stats: [
      { value: "1.5V", label: "AA cell" },
      { value: "400V", label: "EV pack" },
      { value: "3.7V", label: "Li-ion" },
      { value: "12V", label: "Car battery" }
    ],
    color: "#22c55e"
  },
  {
    icon: "zap",
    title: "Capacitors & Energy Storage",
    short: "Capacitors",
    tagline: "Storing charge at voltage",
    description: "Capacitors store energy by accumulating charge on plates: U = ½CV².",
    connection: "Energy stored in the electric field between plates depends on voltage squared.",
    stats: [
      { value: "μF-mF", label: "Typical" },
      { value: "3000F", label: "Supercap" },
      { value: "50kV", label: "HV caps" },
      { value: "μs", label: "Discharge" }
    ],
    color: "#f59e0b"
  },
  {
    icon: "monitor",
    title: "Electron Beam Technology",
    short: "E-Beams",
    tagline: "Accelerating electrons with voltage",
    description: "High voltage accelerates electrons to precise energies: KE = eV.",
    connection: "Electron energy is directly set by the accelerating potential difference.",
    stats: [
      { value: "30-150kV", label: "Welding" },
      { value: "200kV", label: "TEM" },
      { value: "50kV", label: "Lithography" },
      { value: "0.999c", label: "Near light" }
    ],
    color: "#3b82f6"
  },
  {
    icon: "shield",
    title: "Faraday Cage Shielding",
    short: "Shielding",
    tagline: "Constant potential protection",
    description: "Inside a conductor, E = 0 and V = constant, blocking external fields.",
    connection: "Free charges redistribute until internal field vanishes completely.",
    stats: [
      { value: "100%", label: "Field block" },
      { value: "EMC", label: "Compliance" },
      { value: "MRI", label: "Rooms" },
      { value: "Cars", label: "Lightning safe" }
    ],
    color: "#a855f7"
  }
];

export class ElectricPotentialGame extends BaseGame {
  readonly gameType = 'electric_potential';
  readonly gameTitle = 'Electric Potential';

  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private selectedApp = 0;
  private testIndex = 0;
  private testScore = 0;
  private testAnswers: (number | null)[] = new Array(10).fill(null);
  private showExplanation = false;

  // Simulation state
  private chargeQ = 5; // μC
  private testChargeX = 250;
  private testChargeY = 150;
  private showEquipotentials = true;
  private configType: 'single' | 'dipole' | 'parallel' = 'single';
  private plateVoltage = 100;

  constructor(sessionId: string) {
    super(sessionId);
  }

  initialize(config: SessionConfig): void {
    super.initialize(config);
    if (config.resumePhase) {
      this.phase = config.resumePhase as GamePhase;
    }
  }

  private calculatePotential(x: number, y: number): number {
    if (this.configType === 'parallel') {
      const left = 100, right = 300;
      if (x <= left) return this.plateVoltage;
      if (x >= right) return 0;
      return this.plateVoltage * (1 - (x - left) / (right - left));
    }

    const charges = this.configType === 'single'
      ? [{ x: 150, y: 150, q: this.chargeQ }]
      : [{ x: 100, y: 150, q: this.chargeQ }, { x: 200, y: 150, q: -this.chargeQ }];

    let V = 0;
    for (const charge of charges) {
      const dx = x - charge.x;
      const dy = y - charge.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r < 15) continue;

      const q_C = charge.q * 1e-6;
      const r_m = r * 0.001;
      V += k * q_C / r_m;
    }
    return V;
  }

  private formatVoltage(v: number): string {
    const absV = Math.abs(v);
    if (absV >= 1e6) return (v / 1e6).toFixed(1) + ' MV';
    if (absV >= 1e3) return (v / 1e3).toFixed(1) + ' kV';
    if (absV >= 1) return v.toFixed(0) + ' V';
    return (v * 1e3).toFixed(1) + ' mV';
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

    // Config type
    else if (id === 'config_single') {
      this.configType = 'single';
    } else if (id === 'config_dipole') {
      this.configType = 'dipole';
    } else if (id === 'config_parallel') {
      this.configType = 'parallel';
    }

    // Toggle equipotentials
    else if (id === 'toggle_equipotentials') {
      this.showEquipotentials = !this.showEquipotentials;
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
    if (id === 'charge') {
      this.chargeQ = value;
    } else if (id === 'test_x') {
      this.testChargeX = value;
    } else if (id === 'test_y') {
      this.testChargeY = value;
    } else if (id === 'plate_voltage') {
      this.plateVoltage = value;
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
    // Potential field is static - no continuous updates needed
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

    r.text(350, 35, 'ELECTRIC POTENTIAL', {
      fill: '#f59e0b',
      fontSize: 26,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 60, 'The energy landscape that drives current', {
      fill: '#94a3b8',
      fontSize: 14,
      textAnchor: 'middle'
    });

    // Potential field visualization
    r.rect(150, 85, 400, 160, { fill: '#1e293b', rx: 10 });

    // Gradient from red (high V) to green (low V)
    for (let i = 0; i < 20; i++) {
      const x = 160 + i * 19;
      const red = Math.floor(255 - i * 12);
      const green = Math.floor(i * 12);
      r.rect(x, 95, 18, 140, { fill: `rgb(${red}, ${green}, 60)`, opacity: 0.4 });
    }

    // Positive charge (high potential source)
    r.circle(200, 165, 25, { fill: '#ef4444', stroke: '#ffffff', strokeWidth: 2 });
    r.text(200, 172, '+', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 220, 'High V', { fill: '#ef4444', fontSize: 11, textAnchor: 'middle' });

    // Test charge
    r.circle(450, 165, 18, { fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 });
    r.text(450, 172, 'q', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(450, 220, 'Low V', { fill: '#22c55e', fontSize: 11, textAnchor: 'middle' });

    // Arrow showing energy flow
    r.line(250, 165, 400, 165, { stroke: '#22c55e', strokeWidth: 3 });
    r.text(325, 145, 'Work = qΔV', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(350, 270, 'Just like a ball rolls downhill due to gravity,', {
      fill: '#e2e8f0',
      fontSize: 13,
      textAnchor: 'middle'
    });
    r.text(350, 290, 'charges "roll" from high to low electric potential!', {
      fill: '#f59e0b',
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.addButton({ id: 'nav_predict', label: 'Explore Electric Potential', variant: 'primary' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 30, 'MAKE YOUR PREDICTION', {
      fill: '#ffffff',
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 55, 'A positive charge is released from rest at high potential (1000V)', {
      fill: '#e2e8f0',
      fontSize: 12,
      textAnchor: 'middle'
    });
    r.text(350, 72, 'and moves freely to low potential (0V).', {
      fill: '#e2e8f0',
      fontSize: 12,
      textAnchor: 'middle'
    });

    // Visual
    r.rect(150, 85, 400, 50, { fill: '#1e293b', rx: 5 });
    r.circle(180, 110, 15, { fill: '#ef4444' });
    r.text(180, 116, 'A', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(180, 145, '1000V', { fill: '#ef4444', fontSize: 10, textAnchor: 'middle' });

    r.line(200, 110, 490, 110, { stroke: '#ffffff', strokeWidth: 2 });

    r.circle(520, 110, 15, { fill: '#22c55e' });
    r.text(520, 116, 'B', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(520, 145, '0V', { fill: '#22c55e', fontSize: 10, textAnchor: 'middle' });

    r.text(350, 175, 'What happens to the charge\'s kinetic energy?', {
      fill: '#3b82f6',
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const options = [
      { id: 'A', text: 'Slows down (loses KE)' },
      { id: 'B', text: 'Speeds up (gains KE)' },
      { id: 'C', text: 'Constant speed' },
      { id: 'D', text: 'Stops at midpoint' }
    ];

    options.forEach((opt, i) => {
      const y = 195 + i * 35;
      const isSelected = this.prediction === opt.id;
      const isCorrect = opt.id === 'B';

      let bgColor = '#1e293b';
      if (this.prediction) {
        if (isCorrect) bgColor = '#052e16';
        else if (isSelected) bgColor = '#450a0a';
      } else if (isSelected) {
        bgColor = '#1e40af';
      }

      r.rect(150, y, 400, 30, { fill: bgColor, rx: 6, stroke: isSelected ? '#3b82f6' : '#334155', strokeWidth: 2 });
      r.text(350, y + 20, `${opt.id}. ${opt.text}`, {
        fill: '#e2e8f0',
        fontSize: 12,
        textAnchor: 'middle'
      });

      r.addButton({ id: `predict_${opt.id}`, label: opt.id, variant: 'secondary' });
    });

    if (this.prediction) {
      r.addButton({ id: 'nav_play', label: 'Explore the Simulation', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 22, 'ELECTRIC POTENTIAL LAB', {
      fill: '#ffffff',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Config buttons
    const configs = [
      { id: 'single', label: 'Single' },
      { id: 'dipole', label: 'Dipole' },
      { id: 'parallel', label: 'Plates' }
    ];
    configs.forEach((cfg, i) => {
      const x = 150 + i * 80;
      r.rect(x, 35, 70, 25, {
        fill: this.configType === cfg.id ? '#f59e0b' : '#374151',
        rx: 12
      });
      r.text(x + 35, 52, cfg.label, {
        fill: '#ffffff',
        fontSize: 10,
        fontWeight: this.configType === cfg.id ? 'bold' : 'normal',
        textAnchor: 'middle'
      });
      r.addButton({ id: `config_${cfg.id}`, label: cfg.label, variant: 'secondary' });
    });

    // Potential field visualization
    r.rect(50, 70, 300, 200, { fill: '#1e293b', rx: 8 });

    // Draw potential colors
    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 10; j++) {
        const x = 60 + i * 19;
        const y = 80 + j * 19;
        const V = this.calculatePotential(x + 10, y + 10);
        const normalized = Math.tanh(V / 1e6);
        const red = normalized > 0 ? Math.floor(normalized * 200) : 50;
        const blue = normalized < 0 ? Math.floor(-normalized * 200) : 50;
        r.rect(x, y, 18, 18, { fill: `rgb(${red}, 50, ${blue})`, opacity: 0.5 });
      }
    }

    // Source charges
    if (this.configType === 'single') {
      r.circle(150, 170, 20, { fill: '#ef4444', stroke: '#ffffff', strokeWidth: 2 });
      r.text(150, 177, '+', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    } else if (this.configType === 'dipole') {
      r.circle(100, 170, 18, { fill: '#ef4444', stroke: '#ffffff', strokeWidth: 2 });
      r.text(100, 177, '+', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
      r.circle(200, 170, 18, { fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 });
      r.text(200, 177, '−', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    } else {
      // Parallel plates
      r.rect(95, 90, 8, 160, { fill: '#ef4444', rx: 2 });
      r.rect(245, 90, 8, 160, { fill: '#3b82f6', rx: 2 });
      r.text(99, 80, `+${this.plateVoltage}V`, { fill: '#ef4444', fontSize: 9, textAnchor: 'middle' });
      r.text(249, 80, '0V', { fill: '#3b82f6', fontSize: 9, textAnchor: 'middle' });
    }

    // Test charge
    const tcX = 50 + (this.testChargeX / 400) * 300;
    const tcY = 70 + (this.testChargeY / 250) * 200;
    r.circle(tcX, tcY, 10, { fill: '#22c55e', stroke: '#ffffff', strokeWidth: 2 });
    r.text(tcX, tcY + 4, '+q', { fill: '#ffffff', fontSize: 8, fontWeight: 'bold', textAnchor: 'middle' });

    // Stats panel
    const currentV = this.calculatePotential(this.testChargeX, this.testChargeY);

    r.rect(370, 70, 150, 50, { fill: '#3d1f0d', rx: 6 });
    r.text(445, 88, 'Potential at test charge', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(445, 110, this.formatVoltage(currentV), {
      fill: '#f59e0b',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.rect(530, 70, 150, 50, { fill: '#1e3a5f', rx: 6 });
    r.text(605, 88, 'Position', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(605, 110, `(${this.testChargeX}, ${this.testChargeY})`, {
      fill: '#3b82f6',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Sliders
    r.addSlider({ id: 'test_x', label: `X Position: ${this.testChargeX}`, value: this.testChargeX, min: 50, max: 350, step: 10 });
    r.addSlider({ id: 'test_y', label: `Y Position: ${this.testChargeY}`, value: this.testChargeY, min: 50, max: 200, step: 10 });

    if (this.configType === 'parallel') {
      r.addSlider({ id: 'plate_voltage', label: `Plate Voltage: ${this.plateVoltage}V`, value: this.plateVoltage, min: 10, max: 500, step: 10 });
    }

    // Key insight
    r.rect(370, 190, 310, 70, { fill: '#052e16', rx: 8 });
    r.text(525, 210, 'KEY PHYSICS', { fill: '#22c55e', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(525, 230, 'V = kq/r (point charge)', { fill: '#e2e8f0', fontSize: 10, textAnchor: 'middle' });
    r.text(525, 248, 'E = -dV/dr (field = -gradient)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'nav_review', label: 'Review the Concepts', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 28, 'UNDERSTANDING ELECTRIC POTENTIAL', {
      fill: '#f59e0b',
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const correct = this.prediction === 'B';
    r.text(350, 52, correct
      ? 'Correct! Charges gain KE moving to lower potential.'
      : 'Answer: B - Positive charges gain KE moving to lower V.', {
      fill: correct ? '#22c55e' : '#f59e0b',
      fontSize: 12,
      textAnchor: 'middle'
    });

    // Key equations
    r.rect(50, 70, 200, 70, { fill: '#1e3a5f', rx: 8 });
    r.text(150, 95, 'V = W/q', { fill: '#3b82f6', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(150, 115, 'Potential = Work/Charge', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(150, 130, 'Units: Volts (J/C)', { fill: '#64748b', fontSize: 8, textAnchor: 'middle' });

    r.rect(260, 70, 180, 70, { fill: '#052e16', rx: 8 });
    r.text(350, 95, 'V = kq/r', { fill: '#22c55e', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 115, 'Point charge potential', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(350, 130, 'k = 8.99×10⁹ N·m²/C²', { fill: '#64748b', fontSize: 8, textAnchor: 'middle' });

    r.rect(450, 70, 200, 70, { fill: '#2e1065', rx: 8 });
    r.text(550, 95, 'E = -dV/dr', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(550, 115, 'Field-Potential relation', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(550, 130, 'Field points high→low V', { fill: '#64748b', fontSize: 8, textAnchor: 'middle' });

    // Energy equation
    r.rect(150, 155, 200, 55, { fill: '#3d1f0d', rx: 8 });
    r.text(250, 180, 'W = qΔV', { fill: '#f59e0b', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(250, 200, 'Work done on charge', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.rect(360, 155, 200, 55, { fill: '#1e293b', rx: 8 });
    r.text(460, 180, 'E = V/d', { fill: '#e2e8f0', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(460, 200, 'Uniform field (plates)', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Key insights
    r.rect(50, 225, 600, 50, { fill: '#1e293b', rx: 8 });
    r.text(350, 245, 'Equipotential surfaces are always perpendicular to field lines.', {
      fill: '#e2e8f0',
      fontSize: 11,
      textAnchor: 'middle'
    });
    r.text(350, 265, 'Moving along an equipotential requires ZERO work (ΔV = 0).', {
      fill: '#3b82f6',
      fontSize: 11,
      textAnchor: 'middle'
    });

    r.addButton({ id: 'nav_twist_predict', label: 'Discover a Twist', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 30, 'THE HOLLOW CONDUCTOR PUZZLE', {
      fill: '#a855f7',
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Hollow sphere illustration
    r.circle(350, 140, 80, { fill: 'none', stroke: '#f59e0b', strokeWidth: 6 });
    r.circle(350, 140, 65, { fill: '#1e293b' });

    // Charges on surface
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * 2 * Math.PI;
      const x = 350 + 77 * Math.cos(angle);
      const y = 140 + 77 * Math.sin(angle);
      r.circle(x, y, 5, { fill: '#ef4444' });
    }

    // Question mark in center
    r.text(350, 148, '?', { fill: '#3b82f6', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 235, 'Surface charged to +10,000V', { fill: '#f59e0b', fontSize: 11, textAnchor: 'middle' });

    r.text(350, 260, 'What is the potential INSIDE the hollow sphere?', {
      fill: '#ffffff',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const options = [
      { id: 'A', text: 'Zero (no charge inside)' },
      { id: 'B', text: 'Higher than surface' },
      { id: 'C', text: 'Same as surface (10,000V)' },
      { id: 'D', text: 'Varies with position' }
    ];

    options.forEach((opt, i) => {
      const y = 280 + i * 18;
      const isSelected = this.twistPrediction === opt.id;

      r.rect(150, y, 400, 16, {
        fill: isSelected ? '#581c87' : '#1e293b',
        rx: 4,
        stroke: isSelected ? '#a855f7' : '#334155',
        strokeWidth: 1
      });

      r.text(350, y + 12, `${opt.id}. ${opt.text}`, {
        fill: '#e2e8f0',
        fontSize: 10,
        textAnchor: 'middle'
      });

      r.addButton({ id: `twist_predict_${opt.id}`, label: opt.id, variant: 'secondary' });
    });

    if (this.twistPrediction) {
      r.addButton({ id: 'nav_twist_play', label: 'See the Answer', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 28, 'POTENTIAL INSIDE CONDUCTORS', {
      fill: '#a855f7',
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const correct = this.twistPrediction === 'C';
    r.text(350, 50, correct
      ? 'Correct! The potential is CONSTANT inside!'
      : 'Answer: C - V is constant throughout the interior!', {
      fill: correct ? '#22c55e' : '#f59e0b',
      fontSize: 12,
      textAnchor: 'middle'
    });

    // Conductor illustration
    r.circle(200, 150, 80, { fill: '#f59e0b', opacity: 0.2 });
    r.circle(200, 150, 80, { fill: 'none', stroke: '#f59e0b', strokeWidth: 6 });
    r.circle(200, 150, 60, { fill: '#f59e0b', opacity: 0.1 });

    r.text(200, 145, 'V = V₀', { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 165, 'everywhere', { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 195, 'E = 0 inside', { fill: '#ef4444', fontSize: 10, textAnchor: 'middle' });

    // Explanation
    r.rect(310, 80, 340, 150, { fill: '#1e293b', rx: 8 });

    r.text(480, 100, 'WHY IS V CONSTANT INSIDE?', { fill: '#a855f7', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    const explanations = [
      '1. E = 0 inside (charges redistribute)',
      '2. E = -dV/dr, so if E = 0, dV = 0',
      '3. No change in V = constant V',
      '4. Interior V = surface V = V₀'
    ];

    explanations.forEach((exp, i) => {
      r.text(325, 125 + i * 22, exp, { fill: '#e2e8f0', fontSize: 10 });
    });

    // Applications
    r.rect(50, 255, 600, 45, { fill: '#052e16', rx: 8 });
    r.text(350, 273, 'FARADAY CAGE EFFECT', { fill: '#22c55e', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 293, 'Cars, MRI rooms, electronic shielding - all use this principle!', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'nav_twist_review', label: 'Review This Discovery', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 28, 'KEY FACTS ABOUT CONDUCTORS', {
      fill: '#a855f7',
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const facts = [
      { num: '1', title: 'E = 0 inside', desc: 'Free charges redistribute until internal field vanishes' },
      { num: '2', title: 'V = constant inside', desc: 'The entire conductor is an equipotential' },
      { num: '3', title: 'All charge on surface', desc: 'Excess charge resides only on the outer surface' }
    ];

    facts.forEach((fact, i) => {
      const y = 60 + i * 55;
      r.rect(50, y, 600, 48, { fill: '#1e1b4b', rx: 8 });
      r.circle(85, y + 24, 15, { fill: '#a855f7' });
      r.text(85, y + 29, fact.num, { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(115, y + 20, fact.title, { fill: '#a855f7', fontSize: 13, fontWeight: 'bold' });
      r.text(115, y + 38, fact.desc, { fill: '#94a3b8', fontSize: 10 });
    });

    // Applications grid
    r.text(350, 235, 'PRACTICAL APPLICATIONS', { fill: '#f59e0b', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    const apps = ['🚗 Cars in lightning', '🔬 MRI shielding', '📱 EMC protection', '⚡ HV safety'];
    apps.forEach((app, i) => {
      const x = 90 + i * 140;
      r.rect(x - 50, 250, 120, 40, { fill: '#1e293b', rx: 6 });
      r.text(x + 10, 275, app, { fill: '#e2e8f0', fontSize: 10, textAnchor: 'middle' });
    });

    r.addButton({ id: 'nav_transfer', label: 'See Real Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.rect(0, 0, 700, 350, { fill: '#0f172a' });

    r.text(350, 25, 'ELECTRIC POTENTIAL IN ACTION', {
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

    r.text(350, 108, app.title, {
      fill: app.color,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(350, 125, app.tagline, {
      fill: '#94a3b8',
      fontSize: 11,
      textAnchor: 'middle'
    });

    r.text(350, 148, app.description, {
      fill: '#e2e8f0',
      fontSize: 10,
      textAnchor: 'middle'
    });

    // Connection
    r.rect(70, 160, 560, 30, { fill: '#374151', rx: 5 });
    r.text(350, 180, app.connection, {
      fill: '#94a3b8',
      fontSize: 9,
      textAnchor: 'middle'
    });

    // Stats
    app.stats.forEach((stat, i) => {
      const x = 125 + i * 130;
      r.rect(x - 50, 200, 100, 40, { fill: '#0f172a', rx: 5 });
      r.text(x, 218, stat.value, {
        fill: app.color,
        fontSize: 12,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });
      r.text(x, 235, stat.label, {
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
      fill: '#f59e0b',
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

    r.text(350, 40, passed ? 'ELECTRIC POTENTIAL MASTERED!' : 'KEEP LEARNING!', {
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

    // Key equations
    const equations = [
      { eq: 'V = kq/r', label: 'Point charge' },
      { eq: 'E = -dV/dr', label: 'Field-Potential' },
      { eq: 'W = qΔV', label: 'Work done' },
      { eq: 'V = const', label: 'Inside conductor' }
    ];

    equations.forEach((item, i) => {
      const x = 100 + i * 135;
      r.rect(x - 50, 125, 110, 50, { fill: '#1e293b', rx: 8 });
      r.text(x + 5, 147, item.eq, { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x + 5, 168, item.label, { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    });

    // Summary
    r.rect(50, 190, 600, 70, { fill: '#1e1b4b', rx: 10 });
    r.text(350, 210, 'YOU NOW UNDERSTAND', { fill: '#a855f7', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 230, 'Electric potential is the energy landscape for charges', { fill: '#e2e8f0', fontSize: 11, textAnchor: 'middle' });
    r.text(350, 248, 'Voltage drives current like height drives a rolling ball', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

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
      chargeQ: this.chargeQ,
      testChargeX: this.testChargeX,
      testChargeY: this.testChargeY,
      showEquipotentials: this.showEquipotentials,
      configType: this.configType,
      plateVoltage: this.plateVoltage
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
    if (state.chargeQ !== undefined) this.chargeQ = state.chargeQ as number;
    if (state.testChargeX !== undefined) this.testChargeX = state.testChargeX as number;
    if (state.testChargeY !== undefined) this.testChargeY = state.testChargeY as number;
    if (state.showEquipotentials !== undefined) this.showEquipotentials = state.showEquipotentials as boolean;
    if (state.configType !== undefined) this.configType = state.configType as 'single' | 'dipole' | 'parallel';
    if (state.plateVoltage !== undefined) this.plateVoltage = state.plateVoltage as number;
  }
}

export function createElectricPotentialGame(sessionId: string): ElectricPotentialGame {
  return new ElectricPotentialGame(sessionId);
}
