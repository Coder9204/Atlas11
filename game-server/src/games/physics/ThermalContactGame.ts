// ============================================================================
// ThermalContactGame - Thermal Contact Resistance and Heat Transfer
// Physics: Q = kA(T1-T2)/d - Fourier's Law of Heat Conduction
// ============================================================================

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// Protected physics constants - NEVER sent to client
const THERMAL_CONDUCTIVITIES = {
  air: 0.026,        // W/m-K
  bare_contact: 2.5, // W/m-K (effective)
  thermal_paste: 8.5, // W/m-K
  copper: 400        // W/m-K (reference)
};

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
type InterfaceType = 'air_gap' | 'bare_contact' | 'thermal_paste';

const PHASES: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

interface InterfaceOption {
  type: InterfaceType;
  name: string;
  conductivity: number;
  description: string;
}

const INTERFACE_OPTIONS: InterfaceOption[] = [
  { type: 'air_gap', name: 'Air Gap (1mm)', conductivity: 0.026, description: 'Air trapped between surfaces' },
  { type: 'bare_contact', name: 'Bare Metal Contact', conductivity: 2.5, description: 'Direct contact with microscopic air pockets' },
  { type: 'thermal_paste', name: 'Thermal Paste', conductivity: 8.5, description: 'Paste fills gaps, maximizing contact' }
];

interface ThermalContactState {
  phase: Phase;
  prediction: string | null;
  twistPrediction: string | null;
  interfaceType: InterfaceType;
  hotBlockTemp: number;
  coldBlockTemp: number;
  simRunning: boolean;
  simTime: number;
  showMicroscopic: boolean;
  cpuTemp: number;
  coolerType: 'no_paste' | 'with_paste';
  cpuSimRunning: boolean;
  testAnswers: Record<number, number>;
  testSubmitted: boolean;
  completedApps: number[];
  sessionId: string;
}

// Test questions - correctIndex is PROTECTED
const TEST_QUESTIONS = [
  {
    question: "What causes thermal contact resistance?",
    options: [
      "The materials repelling each other",
      "Microscopic air gaps between imperfectly smooth surfaces",
      "Magnetic fields at the interface",
      "Chemical reactions between surfaces"
    ],
    correctIndex: 1,
    explanation: "Even polished surfaces have microscopic roughness. When pressed together, only peaks touch, leaving tiny air gaps. Air is a poor thermal conductor."
  },
  {
    question: "Why is air such a poor thermal conductor?",
    options: [
      "Air is too cold",
      "Air molecules are far apart, limiting heat transfer by collision",
      "Air absorbs heat instead of conducting it",
      "Air is invisible"
    ],
    correctIndex: 1,
    explanation: "In gases, molecules are far apart and transfer heat slowly via random collisions. Air's thermal conductivity is ~0.026 W/m-K vs copper's ~400 W/m-K."
  },
  {
    question: "Thermal paste works by:",
    options: [
      "Generating its own heat",
      "Cooling surfaces chemically",
      "Filling microscopic gaps to displace air",
      "Increasing the air gap"
    ],
    correctIndex: 2,
    explanation: "Thermal paste fills the microscopic valleys between surfaces. Even though paste isn't as conductive as metal, it's far better than air."
  },
  {
    question: "What happens if you use too much thermal paste?",
    options: [
      "Better cooling",
      "No difference",
      "Excess paste can act as an insulating layer",
      "The CPU runs faster"
    ],
    correctIndex: 2,
    explanation: "Too much paste creates a thick layer between surfaces. Thermal paste is less conductive than metal, so excess paste increases resistance."
  },
  {
    question: "Thermal conductivity of copper is ~400 W/m-K. Air is ~0.026 W/m-K. Copper conducts heat:",
    options: [
      "About 4 times better",
      "About 150 times better",
      "About 15,000 times better",
      "About the same"
    ],
    correctIndex: 2,
    explanation: "400 / 0.026 = 15,000. Copper conducts heat about 15,000 times better than air. This is why even tiny air gaps are problematic."
  },
  {
    question: "When mounting a CPU cooler, you should apply thermal paste:",
    options: [
      "In a thick layer covering the entire IHS",
      "A thin layer or small amount in the center",
      "Only on the cooler, never on the CPU",
      "No paste is needed with modern coolers"
    ],
    correctIndex: 1,
    explanation: "A pea-sized dot in center or thin layer is ideal. Mounting pressure spreads it. Too much creates insulating layer; too little leaves air gaps."
  },
  {
    question: "Why do heat sinks have flat, polished bases?",
    options: [
      "For aesthetics",
      "To minimize air gaps when contacting the heat source",
      "To reflect heat radiation",
      "Flat bases are cheaper to make"
    ],
    correctIndex: 1,
    explanation: "Flatter surfaces mean more direct metal-to-metal contact and fewer air gaps. High-quality coolers have mirror-polished bases."
  },
  {
    question: "Thermal pads (used for VRMs, M.2 drives) differ from paste because:",
    options: [
      "Pads are better conductors",
      "Pads bridge larger gaps and are easier to apply",
      "Pads don't need contact pressure",
      "Pads are cheaper"
    ],
    correctIndex: 1,
    explanation: "Thermal pads are thicker and conform to irregular surfaces. They're ideal for components with varying heights or where precise paste application is difficult."
  },
  {
    question: "In the formula Q = kA(T1-T2)/d, what does 'd' represent?",
    options: [
      "Density",
      "Diameter",
      "Thickness/distance through which heat flows",
      "Duration"
    ],
    correctIndex: 2,
    explanation: "In Fourier's Law of heat conduction, d is the thickness of the material. Thicker barriers (including thick paste layers) reduce heat flow."
  },
  {
    question: "A laptop throttles (slows down) when hot. Better thermal paste could help by:",
    options: [
      "Making the CPU generate less heat",
      "Reducing thermal resistance to the cooler, lowering CPU temperature",
      "Making the fan spin faster",
      "Cooling the battery"
    ],
    correctIndex: 1,
    explanation: "Better thermal interface allows heat to transfer faster from CPU to cooler. Lower CPU temps mean less throttling and better sustained performance."
  }
];

// Transfer applications
const APPLICATIONS = [
  {
    title: "Computer CPU Cooling",
    description: "CPUs generate 65-300W in a tiny area. Thermal paste between the CPU and heatsink is critical. Poor contact can mean 20-30C higher temps, causing throttling or damage."
  },
  {
    title: "LED Lighting",
    description: "High-power LEDs convert 30-50% of energy to heat. Thermal interface materials bond LED chips to heat sinks. Without proper thermal management, LEDs dim rapidly and fail early."
  },
  {
    title: "Electric Vehicle Batteries",
    description: "EV battery packs use thermal pads between cells and cooling plates. Uniform thermal contact ensures even cell temperatures, maximizing range, charging speed, and battery lifespan."
  },
  {
    title: "Spacecraft Electronics",
    description: "In space, there's no air for convection. Electronics rely entirely on conduction to radiators. Thermal interface materials must be perfect - there's no repair possible once launched."
  }
];

export class ThermalContactGame extends BaseGame {
  readonly gameType = 'thermal_contact';
  readonly gameTitle = 'Thermal Contact Resistance and Heat Transfer';

  private state: ThermalContactState;

  constructor(sessionId: string, _config?: SessionConfig) {
    super(sessionId);
    this.state = {
      phase: 'hook',
      prediction: null,
      twistPrediction: null,
      interfaceType: 'bare_contact',
      hotBlockTemp: 80,
      coldBlockTemp: 20,
      simRunning: false,
      simTime: 0,
      showMicroscopic: false,
      cpuTemp: 90,
      coolerType: 'no_paste',
      cpuSimRunning: false,
      testAnswers: {},
      testSubmitted: false,
      completedApps: [],
      sessionId
    };
  }

  // PROTECTED: Calculate heat flow rate
  private calculateHeatFlow(): number {
    const k = THERMAL_CONDUCTIVITIES[this.state.interfaceType === 'air_gap' ? 'air' :
                                     this.state.interfaceType === 'bare_contact' ? 'bare_contact' : 'thermal_paste'];
    const tempDiff = this.state.hotBlockTemp - this.state.coldBlockTemp;
    return tempDiff * k * 0.1; // Simplified heat flow calculation
  }

  // PROTECTED: Simulate heat transfer
  private simulateHeatTransfer(): void {
    if (!this.state.simRunning) return;

    const interfaceOption = INTERFACE_OPTIONS.find(o => o.type === this.state.interfaceType);
    const conductivity = interfaceOption?.conductivity || 1;
    const heatRate = conductivity * 0.02;
    const tempDiff = this.state.hotBlockTemp - this.state.coldBlockTemp;

    if (tempDiff > 1) {
      this.state.hotBlockTemp = Math.max(this.state.coldBlockTemp, this.state.hotBlockTemp - heatRate * tempDiff * 0.1);
      this.state.coldBlockTemp = Math.min(this.state.hotBlockTemp, this.state.coldBlockTemp + heatRate * tempDiff * 0.1);
    }
    this.state.simTime++;
  }

  // PROTECTED: Simulate CPU cooling
  private simulateCPUCooling(): void {
    if (!this.state.cpuSimRunning) return;

    const coolingRate = this.state.coolerType === 'with_paste' ? 3.0 : 0.5;
    const targetTemp = this.state.coolerType === 'with_paste' ? 45 : 75;
    const diff = this.state.cpuTemp - targetTemp;

    if (Math.abs(diff) > 0.5) {
      this.state.cpuTemp -= diff * coolingRate * 0.02;
    } else {
      this.state.cpuTemp = targetTemp;
    }
  }

  // PROTECTED: Calculate test score
  private calculateScore(): number {
    let correct = 0;
    for (let i = 0; i < TEST_QUESTIONS.length; i++) {
      if (this.state.testAnswers[i] === TEST_QUESTIONS[i].correctIndex) {
        correct++;
      }
    }
    return correct;
  }

  // PROTECTED: Get temperature color
  private getTempColor(temp: number): string {
    if (temp < 30) return '#3b82f6';
    if (temp < 45) return '#22c55e';
    if (temp < 60) return '#eab308';
    if (temp < 75) return '#f97316';
    return '#ef4444';
  }

  handleInput(input: UserInput): void {
    if (input.type === 'button_click') {
      switch (input.id) {
        case 'start':
          this.state.phase = 'predict';
          break;
        case 'predict_nothing':
          this.state.prediction = 'nothing';
          break;
        case 'predict_air':
          this.state.prediction = 'air';
          break;
        case 'predict_metal':
          this.state.prediction = 'metal';
          break;
        case 'predict_heat':
          this.state.prediction = 'heat';
          break;
        case 'test_prediction':
          if (this.state.prediction) this.state.phase = 'play';
          break;
        case 'start_sim':
          this.state.hotBlockTemp = 80;
          this.state.coldBlockTemp = 20;
          this.state.simTime = 0;
          this.state.simRunning = true;
          break;
        case 'reset_sim':
          this.state.simRunning = false;
          this.state.hotBlockTemp = 80;
          this.state.coldBlockTemp = 20;
          this.state.simTime = 0;
          break;
        case 'toggle_microscopic':
          this.state.showMicroscopic = !this.state.showMicroscopic;
          break;
        case 'interface_air':
          this.state.interfaceType = 'air_gap';
          this.resetSimulation();
          break;
        case 'interface_bare':
          this.state.interfaceType = 'bare_contact';
          this.resetSimulation();
          break;
        case 'interface_paste':
          this.state.interfaceType = 'thermal_paste';
          this.resetSimulation();
          break;
        case 'learn_science':
          this.state.phase = 'review';
          break;
        case 'ready_twist':
          this.state.phase = 'twist_predict';
          break;
        case 'twist_same':
          this.state.twistPrediction = 'same';
          break;
        case 'twist_higher':
          this.state.twistPrediction = 'higher';
          break;
        case 'twist_lower':
          this.state.twistPrediction = 'lower';
          break;
        case 'twist_varies':
          this.state.twistPrediction = 'varies';
          break;
        case 'test_cpu':
          if (this.state.twistPrediction) this.state.phase = 'twist_play';
          break;
        case 'cooler_no_paste':
          this.state.coolerType = 'no_paste';
          this.state.cpuTemp = 90;
          this.state.cpuSimRunning = false;
          break;
        case 'cooler_with_paste':
          this.state.coolerType = 'with_paste';
          this.state.cpuTemp = 90;
          this.state.cpuSimRunning = false;
          break;
        case 'start_cpu_load':
          this.state.cpuTemp = 90;
          this.state.cpuSimRunning = true;
          break;
        case 'see_explanation':
          this.state.phase = 'twist_review';
          break;
        case 'see_applications':
          this.state.phase = 'transfer';
          break;
        case 'take_quiz':
          this.state.phase = 'test';
          break;
        case 'submit_test':
          if (Object.keys(this.state.testAnswers).length >= TEST_QUESTIONS.length) {
            this.state.testSubmitted = true;
          }
          break;
        case 'claim_mastery':
          this.state.phase = 'mastery';
          break;
        case 'review_again':
          this.state.testSubmitted = false;
          this.state.testAnswers = {};
          this.state.phase = 'review';
          break;
        case 'back_to_games':
          this.resetGame();
          break;
      }

      // Handle transfer app clicks
      if (input.id.startsWith('app_')) {
        const index = parseInt(input.id.replace('app_', ''));
        if (!this.state.completedApps.includes(index)) {
          this.state.completedApps.push(index);
        }
      }

      // Handle test answers
      if (input.id.startsWith('test_q')) {
        const parts = input.id.split('_');
        const qIndex = parseInt(parts[1].replace('q', ''));
        const aIndex = parseInt(parts[2].replace('a', ''));
        if (!this.state.testSubmitted) {
          this.state.testAnswers[qIndex] = aIndex;
        }
      }
    }
  }

  private resetSimulation(): void {
    this.state.simRunning = false;
    this.state.hotBlockTemp = 80;
    this.state.coldBlockTemp = 20;
    this.state.simTime = 0;
  }

  getCurrentPhase(): string {
    return this.state.phase;
  }

  update(deltaTime: number): void {
    // Simulate heat transfer if running
    if (this.state.simRunning) {
      this.simulateHeatTransfer();
    }
    if (this.state.cpuSimRunning) {
      this.simulateCPUCooling();
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer();

    r.setProgress({
      id: 'phase_progress',
      current: PHASES.indexOf(this.state.phase),
      total: PHASES.length,
      labels: ['Hook', 'Predict', 'Lab', 'Review', 'Twist', 'Twist Lab', 'Twist Review', 'Transfer', 'Test', 'Mastery']
    });

    switch (this.state.phase) {
      case 'hook': this.renderHook(r); break;
      case 'predict': this.renderPredict(r); break;
      case 'play': this.renderPlay(r); break;
      case 'review': this.renderReview(r); break;
      case 'twist_predict': this.renderTwistPredict(r); break;
      case 'twist_play': this.renderTwistPlay(r); break;
      case 'twist_review': this.renderTwistReview(r); break;
      case 'transfer': this.renderTransfer(r); break;
      case 'test': this.renderTest(r); break;
      case 'mastery': this.renderMastery(r); break;
    }

    return r.toFrame(Date.now());
  }

  private renderHook(r: CommandRenderer): void {
    r.text(200, 30, 'The Hidden Heat Barrier', { fill: '#1e293b', fontSize: 24, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 55, 'Why microscopic gaps can block thermal energy flow', { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });

    // Heat transfer visualization
    r.text(100, 100, 'HOT', { fill: '#ef4444', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });
    r.rect(60, 110, 80, 60, { fill: '#ef4444' });

    r.text(200, 140, '<->', { fill: '#64748b', fontSize: 20, textAnchor: 'middle' });

    r.text(300, 100, 'COLD', { fill: '#3b82f6', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });
    r.rect(260, 110, 80, 60, { fill: '#3b82f6' });

    r.text(200, 200, 'You press two metal blocks together...', { fill: '#1e293b', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 220, 'Heat should flow freely, right?', { fill: '#64748b', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 250, 'But something invisible is blocking the way!', { fill: '#ef4444', fontSize: 13, textAnchor: 'middle', fontWeight: 'bold' });

    r.addButton({ id: 'start', label: 'Discover Thermal Contact', variant: 'primary' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 25, 'Make Your Prediction', { fill: '#1e293b', fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 50, 'Two polished metal blocks are pressed together.', { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 70, 'What fills the tiny gaps between the surfaces?', { fill: '#ef4444', fontSize: 13, textAnchor: 'middle', fontWeight: 'bold' });

    const opts = [
      { id: 'predict_nothing', text: "Nothing - it's a vacuum" },
      { id: 'predict_air', text: 'Air - a poor thermal conductor' },
      { id: 'predict_metal', text: 'Metal flows to fill the gaps' },
      { id: 'predict_heat', text: 'Heat itself fills the gaps' }
    ];

    for (let i = 0; i < opts.length; i++) {
      const isSelected = this.state.prediction === opts[i].id.replace('predict_', '');
      r.addButton({ id: opts[i].id, label: opts[i].text, variant: isSelected ? 'primary' : 'secondary' });
    }

    if (this.state.prediction) {
      const isCorrect = this.state.prediction === 'air';
      r.rect(50, 200, 300, 50, { fill: isCorrect ? '#dcfce7' : '#fef3c7' });
      r.text(200, 225, isCorrect ? 'Correct! Air is a terrible thermal conductor!' : 'Not quite - the gaps are filled with air.', { fill: isCorrect ? '#166534' : '#92400e', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
      r.addButton({ id: 'test_prediction', label: 'Test Your Prediction', variant: 'success' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 20, 'Thermal Contact Experiment', { fill: '#1e293b', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 40, 'Compare heat transfer through different interfaces', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    // Heat transfer visualization
    const hotColor = this.getTempColor(this.state.hotBlockTemp);
    const coldColor = this.getTempColor(this.state.coldBlockTemp);

    // Hot block
    r.rect(30, 80, 100, 100, { fill: hotColor });
    r.text(80, 125, `${this.state.hotBlockTemp.toFixed(1)}C`, { fill: 'white', fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(80, 145, 'HOT', { fill: 'white', fontSize: 10, textAnchor: 'middle' });

    // Interface
    const interfaceOption = INTERFACE_OPTIONS.find(o => o.type === this.state.interfaceType);
    r.rect(130, 80, 40, 100, { fill: '#e2e8f0' });
    r.text(150, 65, interfaceOption?.name || '', { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });
    r.text(150, 195, `k = ${interfaceOption?.conductivity} W/m-K`, { fill: '#64748b', fontSize: 8, textAnchor: 'middle' });

    // Cold block
    r.rect(170, 80, 100, 100, { fill: coldColor });
    r.text(220, 125, `${this.state.coldBlockTemp.toFixed(1)}C`, { fill: 'white', fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(220, 145, 'COLD', { fill: 'white', fontSize: 10, textAnchor: 'middle' });

    // Stats
    r.text(330, 100, `Temp Diff: ${(this.state.hotBlockTemp - this.state.coldBlockTemp).toFixed(1)}C`, { fill: '#64748b', fontSize: 10, textAnchor: 'start' });
    r.text(330, 120, `Time: ${(this.state.simTime / 10).toFixed(1)}s`, { fill: '#64748b', fontSize: 10, textAnchor: 'start' });
    r.text(330, 140, `Heat Flow: ${this.calculateHeatFlow().toFixed(1)} W`, { fill: '#64748b', fontSize: 10, textAnchor: 'start' });

    // Controls
    if (!this.state.simRunning) {
      r.addButton({ id: 'start_sim', label: 'Start Heat Transfer', variant: 'primary' });
    } else {
      r.addButton({ id: 'reset_sim', label: 'Reset', variant: 'secondary' });
    }

    r.addButton({ id: 'toggle_microscopic', label: this.state.showMicroscopic ? 'Hide Microscopic' : 'Show Microscopic', variant: 'secondary' });

    // Interface selector
    r.text(200, 230, 'Interface Type:', { fill: '#1e293b', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    r.addButton({ id: 'interface_air', label: 'Air Gap', variant: this.state.interfaceType === 'air_gap' ? 'primary' : 'secondary' });
    r.addButton({ id: 'interface_bare', label: 'Bare Contact', variant: this.state.interfaceType === 'bare_contact' ? 'primary' : 'secondary' });
    r.addButton({ id: 'interface_paste', label: 'Thermal Paste', variant: this.state.interfaceType === 'thermal_paste' ? 'primary' : 'secondary' });

    r.addButton({ id: 'learn_science', label: 'Learn the Science', variant: 'success' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 25, 'Thermal Contact Resistance', { fill: '#1e293b', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });

    // The problem
    r.rect(30, 50, 160, 80, { fill: '#fef2f2' });
    r.text(110, 70, 'The Microscopic Problem', { fill: '#dc2626', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(110, 90, 'Only ~1-2% actually touches', { fill: '#1e293b', fontSize: 9, textAnchor: 'middle' });
    r.text(110, 105, 'Rest filled with AIR', { fill: '#1e293b', fontSize: 9, textAnchor: 'middle' });
    r.text(110, 120, 'Air is 15,000x worse than copper!', { fill: '#dc2626', fontSize: 9, textAnchor: 'middle' });

    // The solution
    r.rect(210, 50, 160, 80, { fill: '#f0fdf4' });
    r.text(290, 70, 'The Solution', { fill: '#16a34a', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(290, 90, 'Thermal paste fills gaps', { fill: '#1e293b', fontSize: 9, textAnchor: 'middle' });
    r.text(290, 105, 'Paste 300x better than air', { fill: '#1e293b', fontSize: 9, textAnchor: 'middle' });
    r.text(290, 120, 'Reduces resistance 50-80%', { fill: '#16a34a', fontSize: 9, textAnchor: 'middle' });

    // Fourier's Law
    r.rect(60, 145, 280, 60, { fill: '#eff6ff' });
    r.text(200, 165, "Fourier's Law", { fill: '#1d4ed8', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 185, 'Q = k x A x (T1 - T2) / d', { fill: '#1e293b', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 200, 'Better interface = higher effective k', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });

    if (this.state.prediction === 'air') {
      r.rect(60, 215, 280, 30, { fill: '#dcfce7' });
      r.text(200, 235, 'Your prediction was correct!', { fill: '#166534', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    }

    r.addButton({ id: 'ready_twist', label: 'Ready for a Twist?', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 25, 'The CPU Twist', { fill: '#f59e0b', fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 50, 'A CPU generates 100W in an area smaller than a thumbnail.', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 70, 'What happens if you forget thermal paste?', { fill: '#f59e0b', fontSize: 13, textAnchor: 'middle', fontWeight: 'bold' });

    const opts = [
      { id: 'twist_same', text: "About the same - metal-to-metal is fine" },
      { id: 'twist_higher', text: 'Much higher - air gaps act as insulation' },
      { id: 'twist_lower', text: 'Actually lower - paste slows transfer' },
      { id: 'twist_varies', text: 'It depends on the weather' }
    ];

    for (const opt of opts) {
      const key = opt.id.replace('twist_', '');
      const isSelected = this.state.twistPrediction === key;
      r.addButton({ id: opt.id, label: opt.text, variant: isSelected ? 'primary' : 'secondary' });
    }

    if (this.state.twistPrediction) {
      const isCorrect = this.state.twistPrediction === 'higher';
      r.rect(50, 210, 300, 45, { fill: isCorrect ? '#dcfce7' : '#fef3c7' });
      r.text(200, 230, isCorrect ? 'Correct! Air gaps cause 20-30C higher temps!' : 'Not quite - air gaps act as insulation!', { fill: isCorrect ? '#166534' : '#92400e', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });
      r.addButton({ id: 'test_cpu', label: 'Test CPU Cooling', variant: 'success' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 20, 'CPU Thermal Paste Test', { fill: '#f59e0b', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });

    // CPU cooling visualization
    const cpuColor = this.getTempColor(this.state.cpuTemp);

    // Motherboard
    r.rect(50, 200, 300, 60, { fill: '#166534' });
    r.text(200, 235, 'MOTHERBOARD', { fill: '#a5d6a7', fontSize: 10, textAnchor: 'middle' });

    // CPU
    r.rect(150, 160, 100, 40, { fill: cpuColor });
    r.text(200, 185, `CPU ${this.state.cpuTemp.toFixed(0)}C`, { fill: 'white', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });

    // Thermal interface
    const interfaceColor = this.state.coolerType === 'with_paste' ? '#bdbdbd' : '#e3f2fd';
    r.rect(155, 155, 90, 5, { fill: interfaceColor });
    if (this.state.coolerType === 'no_paste') {
      r.text(200, 150, 'AIR GAPS!', { fill: '#ef4444', fontSize: 8, textAnchor: 'middle' });
    }

    // Heat sink
    r.rect(140, 70, 120, 85, { fill: '#78909c' });
    for (let i = 0; i < 8; i++) {
      r.rect(145 + i * 14, 20, 10, 50, { fill: '#90a4ae' });
    }

    // Temperature indicator
    r.rect(330, 80, 40, 100, { fill: '#1f2937' });
    const tempHeight = (this.state.cpuTemp - 30) * 1.2;
    r.rect(335, 175 - tempHeight, 30, tempHeight, { fill: cpuColor });
    r.text(350, 70, `${this.state.cpuTemp.toFixed(0)}C`, { fill: 'white', fontSize: 10, textAnchor: 'middle' });

    // Status
    const status = this.state.cpuTemp > 80 ? 'THROTTLING! Too Hot!' : this.state.cpuTemp > 60 ? 'Warm - Reduced Performance' : 'Cool - Full Performance';
    const statusColor = this.state.cpuTemp > 80 ? '#ef4444' : this.state.cpuTemp > 60 ? '#f59e0b' : '#22c55e';
    r.text(200, 275, status, { fill: statusColor, fontSize: 11, textAnchor: 'middle' });

    // Cooler type selector
    r.addButton({ id: 'cooler_no_paste', label: 'No Paste', variant: this.state.coolerType === 'no_paste' ? 'danger' : 'secondary' });
    r.addButton({ id: 'cooler_with_paste', label: 'With Paste', variant: this.state.coolerType === 'with_paste' ? 'success' : 'secondary' });

    r.addButton({ id: 'start_cpu_load', label: this.state.cpuSimRunning ? 'Cooling...' : 'Start CPU Load', variant: 'primary' });

    // Results comparison
    r.rect(50, 295, 130, 50, { fill: '#fef2f2' });
    r.text(115, 315, 'Without Paste', { fill: '#dc2626', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(115, 330, '~75-85C', { fill: '#dc2626', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });

    r.rect(220, 295, 130, 50, { fill: '#f0fdf4' });
    r.text(285, 315, 'With Paste', { fill: '#16a34a', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(285, 330, '~45-55C', { fill: '#16a34a', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });

    r.addButton({ id: 'see_explanation', label: 'See Explanation', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 25, 'Why Thermal Paste is Critical', { fill: '#f59e0b', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });

    // Without paste
    r.rect(30, 55, 160, 100, { fill: '#fef2f2' });
    r.text(110, 75, 'WITHOUT Paste', { fill: '#dc2626', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(110, 95, 'Air gaps trap heat', { fill: '#1e293b', fontSize: 9, textAnchor: 'middle' });
    r.text(110, 110, 'Only 1-2% contact', { fill: '#1e293b', fontSize: 9, textAnchor: 'middle' });
    r.text(110, 125, 'CPU: 75-85C', { fill: '#dc2626', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(110, 140, 'Throttling, risk of damage', { fill: '#dc2626', fontSize: 8, textAnchor: 'middle' });

    // With paste
    r.rect(210, 55, 160, 100, { fill: '#f0fdf4' });
    r.text(290, 75, 'WITH Paste', { fill: '#16a34a', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(290, 95, 'Paste fills all gaps', { fill: '#1e293b', fontSize: 9, textAnchor: 'middle' });
    r.text(290, 110, 'Effective 100% contact', { fill: '#1e293b', fontSize: 9, textAnchor: 'middle' });
    r.text(290, 125, 'CPU: 45-55C', { fill: '#16a34a', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(290, 140, 'Full performance', { fill: '#16a34a', fontSize: 8, textAnchor: 'middle' });

    // Application tips
    r.rect(60, 170, 280, 70, { fill: '#eff6ff' });
    r.text(200, 190, 'Application Tips', { fill: '#1d4ed8', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 208, 'Pea-sized dot in center, or thin X pattern', { fill: '#1e293b', fontSize: 9, textAnchor: 'middle' });
    r.text(200, 222, 'Too much = insulating layer (bad)', { fill: '#1e293b', fontSize: 9, textAnchor: 'middle' });
    r.text(200, 236, 'Replace every 3-5 years (paste dries out)', { fill: '#1e293b', fontSize: 9, textAnchor: 'middle' });

    if (this.state.twistPrediction === 'higher') {
      r.rect(60, 250, 280, 25, { fill: '#dcfce7' });
      r.text(200, 267, 'Your prediction was correct!', { fill: '#166534', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });
    }

    r.addButton({ id: 'see_applications', label: 'See Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 25, 'Thermal Contact in the Real World', { fill: '#1e293b', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });

    for (let i = 0; i < APPLICATIONS.length; i++) {
      const app = APPLICATIONS[i];
      const isComplete = this.state.completedApps.includes(i);
      const y = 55 + i * 55;
      const fill = isComplete ? '#dcfce7' : 'white';

      r.rect(30, y, 340, 50, { fill });
      r.text(50, y + 18, app.title, { fill: '#1e293b', fontSize: 12, textAnchor: 'start', fontWeight: 'bold' });
      r.text(50, y + 35, app.description.slice(0, 60) + '...', { fill: '#64748b', fontSize: 9, textAnchor: 'start' });
      if (isComplete) {
        r.text(355, y + 25, 'Done', { fill: '#22c55e', fontSize: 10, textAnchor: 'end', fontWeight: 'bold' });
      }
      r.addButton({ id: `app_${i}`, label: isComplete ? 'Reviewed' : 'Learn', variant: isComplete ? 'success' : 'secondary' });
    }

    r.text(200, 280, `Progress: ${this.state.completedApps.length}/${APPLICATIONS.length}`, { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });

    if (this.state.completedApps.length >= APPLICATIONS.length) {
      r.addButton({ id: 'take_quiz', label: 'Take the Quiz', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    r.text(200, 20, 'Test Your Knowledge', { fill: '#1e293b', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });

    if (!this.state.testSubmitted) {
      const answered = Object.keys(this.state.testAnswers).length;
      r.text(200, 45, `Questions answered: ${answered} / ${TEST_QUESTIONS.length}`, { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });

      // Question indicators
      for (let i = 0; i < TEST_QUESTIONS.length; i++) {
        const x = 60 + (i % 5) * 60;
        const y = 70 + Math.floor(i / 5) * 35;
        const hasAnswer = this.state.testAnswers[i] !== undefined;
        r.rect(x, y, 50, 25, { fill: hasAnswer ? '#22c55e' : '#e2e8f0' });
        r.text(x + 25, y + 17, `Q${i + 1}`, { fill: hasAnswer ? 'white' : '#64748b', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });

        // Answer buttons
        for (let j = 0; j < 4; j++) {
          r.addButton({ id: `test_q${i}_a${j}`, label: `Q${i + 1} Opt ${j + 1}`, variant: this.state.testAnswers[i] === j ? 'primary' : 'secondary' });
        }
      }

      if (answered >= TEST_QUESTIONS.length) {
        r.addButton({ id: 'submit_test', label: 'Submit Answers', variant: 'primary' });
      }
    } else {
      const score = this.calculateScore();
      const percentage = Math.round((score / TEST_QUESTIONS.length) * 100);

      r.text(200, 70, `${score} / ${TEST_QUESTIONS.length}`, { fill: score >= 7 ? '#22c55e' : '#f59e0b', fontSize: 32, textAnchor: 'middle', fontWeight: 'bold' });
      r.text(200, 95, score >= 7 ? 'Excellent! You understand thermal contact!' : 'Review the concepts and try again!', { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'claim_mastery', label: 'Claim Your Mastery!', variant: 'success' });
      } else {
        r.addButton({ id: 'review_again', label: 'Review and Try Again', variant: 'primary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 30, 'Thermal Contact Master!', { fill: '#1e293b', fontSize: 24, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 55, "You've mastered thermal contact resistance!", { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });

    // Achievement display
    r.rect(60, 80, 280, 140, { fill: '#fef2f2' });
    r.text(200, 110, 'Key Concepts Mastered:', { fill: '#1e293b', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });

    const concepts = [
      'Microscopic air gaps block heat flow',
      'Thermal paste fills gaps (300x better than air)',
      'Proper application: thin layer/pea-sized dot',
      "Fourier's Law: Q = kA(T1-T2)/d"
    ];

    for (let i = 0; i < concepts.length; i++) {
      r.text(200, 135 + i * 20, concepts[i], { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });
    }

    const score = this.calculateScore();
    r.rect(100, 230, 200, 50, { fill: '#dcfce7' });
    r.text(200, 255, `Test Score: ${score}/${TEST_QUESTIONS.length}`, { fill: '#166534', fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 275, `${Math.round((score / TEST_QUESTIONS.length) * 100)}%`, { fill: '#166534', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'back_to_games', label: 'Back to Games', variant: 'secondary' });
  }

  private resetGame(): void {
    this.state = {
      ...this.state,
      phase: 'hook',
      prediction: null,
      twistPrediction: null,
      interfaceType: 'bare_contact',
      hotBlockTemp: 80,
      coldBlockTemp: 20,
      simRunning: false,
      simTime: 0,
      showMicroscopic: false,
      cpuTemp: 90,
      coolerType: 'no_paste',
      cpuSimRunning: false,
      testAnswers: {},
      testSubmitted: false,
      completedApps: []
    };
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.state.phase,
      prediction: this.state.prediction,
      twistPrediction: this.state.twistPrediction,
      interfaceType: this.state.interfaceType,
      hotBlockTemp: this.state.hotBlockTemp,
      coldBlockTemp: this.state.coldBlockTemp,
      simRunning: this.state.simRunning,
      simTime: this.state.simTime,
      cpuTemp: this.state.cpuTemp,
      coolerType: this.state.coolerType,
      cpuSimRunning: this.state.cpuSimRunning,
      testSubmitted: this.state.testSubmitted,
      completedApps: this.state.completedApps,
      testScore: this.state.testSubmitted ? this.calculateScore() : null,
      answeredQuestions: Object.keys(this.state.testAnswers).length
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase && PHASES.includes(state.phase as Phase)) {
      this.state.phase = state.phase as Phase;
    }
    if (state.prediction !== undefined) this.state.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.state.twistPrediction = state.twistPrediction as string | null;
    if (state.interfaceType !== undefined) this.state.interfaceType = state.interfaceType as InterfaceType;
    if (typeof state.hotBlockTemp === 'number') this.state.hotBlockTemp = state.hotBlockTemp;
    if (typeof state.coldBlockTemp === 'number') this.state.coldBlockTemp = state.coldBlockTemp;
    if (typeof state.simRunning === 'boolean') this.state.simRunning = state.simRunning;
    if (typeof state.cpuTemp === 'number') this.state.cpuTemp = state.cpuTemp;
    if (state.coolerType !== undefined) this.state.coolerType = state.coolerType as 'no_paste' | 'with_paste';
    if (typeof state.testSubmitted === 'boolean') this.state.testSubmitted = state.testSubmitted;
    if (Array.isArray(state.completedApps)) this.state.completedApps = state.completedApps as number[];
  }
}

// Factory function
export function createThermalContactGame(sessionId: string, config?: SessionConfig): ThermalContactGame {
  return new ThermalContactGame(sessionId, config);
}
