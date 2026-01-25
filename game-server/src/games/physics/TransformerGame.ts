/**
 * Transformer Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Voltage ratio formula: V2/V1 = N2/N1 (turns ratio)
 * - Current ratio: I2/I1 = N1/N2 (inverse of voltage ratio)
 * - Power conservation: P_in = P_out (ideal transformer)
 * - AC requirement: Transformers need changing flux (DC creates static field)
 * - Power transmission: High voltage = low current = less I^2*R losses
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// === PROTECTED GAME STATE (never sent to client) ===

type GamePhase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

// === TEST QUESTIONS (PROTECTED - never sent to client) ===
const testQuestions: TestQuestion[] = [
  {
    question: 'What determines the voltage ratio in a transformer?',
    options: [
      'The thickness of the wire',
      'The ratio of turns in primary to secondary coils',
      'The speed of the AC current',
      'The size of the iron core',
    ],
    correctIndex: 1,
  },
  {
    question: "Why don't transformers work with DC (direct current)?",
    options: [
      'DC is too weak',
      'DC flows in the wrong direction',
      'DC creates a static field - no changing flux to induce current',
      'DC would melt the transformer',
    ],
    correctIndex: 2,
  },
  {
    question: 'A transformer steps up voltage from 100V to 1000V. What happens to current?',
    options: [
      'Current increases 10x',
      'Current stays the same',
      'Current decreases to 1/10',
      'Current becomes DC',
    ],
    correctIndex: 2,
  },
  {
    question: 'Why do power lines use high voltage for transmission?',
    options: [
      'High voltage travels faster',
      'High voltage looks more impressive',
      'Lower current means less I^2*R heat loss in wires',
      'High voltage is safer',
    ],
    correctIndex: 2,
  },
  {
    question: 'An ideal transformer has 100 primary turns and 500 secondary turns. If input is 120V, output is:',
    options: [
      '24V',
      '120V',
      '600V',
      '2400V',
    ],
    correctIndex: 2,
  },
  {
    question: 'What is the function of the iron core in a transformer?',
    options: [
      'To generate electricity',
      'To conduct magnetic flux efficiently between coils',
      'To increase resistance',
      'To convert AC to DC',
    ],
    correctIndex: 1,
  },
  {
    question: 'A step-down transformer:',
    options: [
      'Has more secondary turns than primary',
      'Has fewer secondary turns than primary',
      'Has equal turns on both coils',
      'Works only with DC',
    ],
    correctIndex: 1,
  },
  {
    question: 'Why did AC win the "War of Currents" over DC?',
    options: [
      'AC is safer',
      'AC looks better on oscilloscopes',
      'AC can be easily transformed for efficient long-distance transmission',
      'Edison preferred AC',
    ],
    correctIndex: 2,
  },
  {
    question: 'If a transformer has a 10:1 turns ratio (step-down), and input power is 1000W, output power is:',
    options: [
      '100W',
      '1000W (power is conserved)',
      '10,000W',
      '10W',
    ],
    correctIndex: 1,
  },
  {
    question: 'Phone chargers typically contain transformers that:',
    options: [
      'Step up voltage from 5V to 120V',
      'Step down voltage from 120V to around 5V',
      'Convert AC to DC only',
      'Store energy for later',
    ],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#f59e0b',
  primaryDark: '#d97706',
  accent: '#ef4444',
  accentDark: '#dc2626',
  secondary: '#22c55e',
  warning: '#f59e0b',
  success: '#10b981',
  danger: '#ef4444',
  bgDark: '#0a0f1a',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  primaryCoil: '#ef4444',
  secondaryCoil: '#22c55e',
  core: '#6b7280',
  flux: '#3b82f6',
  wire: '#fbbf24',
};

// === APPLICATION DATA ===
interface Application {
  title: string;
  icon: string;
  description: string;
}

const applications: Application[] = [
  {
    title: 'Power Grid',
    icon: 'bolt',
    description: 'Power plants step up to 400kV for transmission, then step down to 240V for homes.',
  },
  {
    title: 'Phone Chargers',
    icon: 'phone',
    description: 'Your charger contains a transformer to convert 120/240V to the 5V your phone needs.',
  },
  {
    title: 'Welding Equipment',
    icon: 'tool',
    description: 'Arc welders step down voltage but massively increase current to melt steel.',
  },
  {
    title: 'Microwave Ovens',
    icon: 'microwave',
    description: 'A transformer steps up 120V to 4000V to power the magnetron.',
  },
];

// === MAIN GAME CLASS ===

export class TransformerGame extends BaseGame {
  readonly gameType = 'transformer';
  readonly gameTitle = 'Transformers';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private testAnswers: number[] = [];
  private completedApps: Set<number> = new Set();

  // --- SIMULATION STATE ---
  private primaryTurns: number = 100;
  private secondaryTurns: number = 200;
  private inputVoltage: number = 120;
  private isAC: boolean = true;
  private acPhase: number = 0;
  private twistMode: 'ac' | 'dc' = 'ac';
  private animationTime: number = 0;

  // === PROTECTED PHYSICS METHODS ===

  // PROTECTED: Calculate turns ratio (hidden from client)
  private getTurnsRatio(): number {
    return this.secondaryTurns / this.primaryTurns;
  }

  // PROTECTED: Calculate output voltage (hidden from client)
  private getOutputVoltage(): number {
    if (!this.isAC && this.phase !== 'twist_play') return 0;
    if (this.phase === 'twist_play' && this.twistMode === 'dc') return 0;
    return this.inputVoltage * this.getTurnsRatio();
  }

  // PROTECTED: Calculate output current (hidden from client)
  private getOutputCurrent(inputCurrent: number = 1): number {
    if (!this.isAC && this.phase !== 'twist_play') return 0;
    if (this.phase === 'twist_play' && this.twistMode === 'dc') return 0;
    return inputCurrent / this.getTurnsRatio();
  }

  // PROTECTED: Get transformer type
  private getTransformerType(): 'step-up' | 'step-down' | 'isolation' {
    const ratio = this.getTurnsRatio();
    if (ratio > 1) return 'step-up';
    if (ratio < 1) return 'step-down';
    return 'isolation';
  }

  // PROTECTED: Calculate power loss in transmission
  private calculateTransmissionEfficiency(useHighVoltage: boolean): number {
    const power = 240; // Watts
    const wireResistance = 10; // ohms
    const transmissionVoltage = useHighVoltage ? 400000 : 240;
    const current = power / transmissionVoltage;
    const powerLoss = current * current * wireResistance;
    return ((power - powerLoss) / power) * 100;
  }

  constructor(sessionId: string) {
    super(sessionId);
  }

  // === GAME STATE MANAGEMENT ===

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      testAnswers: this.testAnswers,
      completedApps: Array.from(this.completedApps),
      primaryTurns: this.primaryTurns,
      secondaryTurns: this.secondaryTurns,
      inputVoltage: this.inputVoltage,
      isAC: this.isAC,
      twistMode: this.twistMode,
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.prediction !== undefined) this.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
    if (state.primaryTurns !== undefined) this.primaryTurns = state.primaryTurns as number;
    if (state.secondaryTurns !== undefined) this.secondaryTurns = state.secondaryTurns as number;
    if (state.inputVoltage !== undefined) this.inputVoltage = state.inputVoltage as number;
    if (state.isAC !== undefined) this.isAC = state.isAC as boolean;
    if (state.twistMode !== undefined) this.twistMode = state.twistMode as 'ac' | 'dc';
  }

  // === INPUT HANDLING ===

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'phase_change':
        if (input.payload?.phase) {
          this.phase = input.payload.phase as GamePhase;
        }
        break;

      case 'prediction':
        if (input.payload?.prediction) {
          this.prediction = input.payload.prediction as string;
        }
        break;

      case 'twist_prediction':
        if (input.payload?.prediction) {
          this.twistPrediction = input.payload.prediction as string;
        }
        break;

      case 'set_primary_turns':
        if (input.payload?.turns !== undefined) {
          this.primaryTurns = Math.max(50, Math.min(200, input.payload.turns as number));
        }
        break;

      case 'set_secondary_turns':
        if (input.payload?.turns !== undefined) {
          this.secondaryTurns = Math.max(50, Math.min(500, input.payload.turns as number));
        }
        break;

      case 'set_input_voltage':
        if (input.payload?.voltage !== undefined) {
          this.inputVoltage = Math.max(12, Math.min(240, input.payload.voltage as number));
        }
        break;

      case 'set_twist_mode':
        if (input.payload?.mode) {
          this.twistMode = input.payload.mode as 'ac' | 'dc';
        }
        break;

      case 'toggle_ac':
        this.isAC = !this.isAC;
        break;

      case 'test_answer':
        if (input.payload?.questionIndex !== undefined && input.payload?.answerIndex !== undefined) {
          const qIndex = input.payload.questionIndex as number;
          const aIndex = input.payload.answerIndex as number;
          this.testAnswers[qIndex] = aIndex;
        }
        break;

      case 'complete_app':
        if (input.payload?.appIndex !== undefined) {
          this.completedApps.add(input.payload.appIndex as number);
        }
        break;

      case 'next_phase':
        this.advancePhase();
        break;
    }
  }

  private advancePhase(): void {
    const phases: GamePhase[] = [
      'hook', 'predict', 'play', 'review',
      'twist_predict', 'twist_play', 'twist_review',
      'transfer', 'test', 'mastery',
    ];
    const currentIndex = phases.indexOf(this.phase);
    if (currentIndex < phases.length - 1) {
      this.phase = phases[currentIndex + 1];
    }
  }

  // === FRAME RENDERING ===

  tick(deltaMs: number): GameFrame {
    this.animationTime += deltaMs;
    this.acPhase += deltaMs * 0.003; // AC oscillation

    const renderer = new CommandRenderer();

    // Background
    renderer.drawRect(0, 0, 800, 600, colors.bgDark, { filled: true });

    // Ambient glow effects
    renderer.drawEllipse(200, 150, 200, 200, colors.primary, { filled: true, alpha: 0.05 });
    renderer.drawEllipse(600, 450, 200, 200, colors.secondary, { filled: true, alpha: 0.05 });

    // Render phase-specific content
    switch (this.phase) {
      case 'hook':
        this.renderHook(renderer);
        break;
      case 'predict':
        this.renderPredict(renderer);
        break;
      case 'play':
        this.renderPlay(renderer);
        break;
      case 'review':
        this.renderReview(renderer);
        break;
      case 'twist_predict':
        this.renderTwistPredict(renderer);
        break;
      case 'twist_play':
        this.renderTwistPlay(renderer);
        break;
      case 'twist_review':
        this.renderTwistReview(renderer);
        break;
      case 'transfer':
        this.renderTransfer(renderer);
        break;
      case 'test':
        this.renderTest(renderer);
        break;
      case 'mastery':
        this.renderMastery(renderer);
        break;
    }

    // Progress bar at top
    this.renderProgressBar(renderer);

    return {
      commands: renderer.getCommands(),
      sounds: [],
      uiState: this.getUIState(),
    };
  }

  private renderProgressBar(renderer: CommandRenderer): void {
    const phases: GamePhase[] = [
      'hook', 'predict', 'play', 'review',
      'twist_predict', 'twist_play', 'twist_review',
      'transfer', 'test', 'mastery',
    ];
    const currentIndex = phases.indexOf(this.phase);

    // Header background
    renderer.drawRect(0, 0, 800, 50, colors.bgCard, { filled: true, alpha: 0.9 });
    renderer.drawLine(0, 50, 800, 50, colors.border, 1);

    // Title
    renderer.drawText('Transformers', 20, 30, colors.textSecondary, '14px');

    // Phase dots
    const dotStartX = 400;
    phases.forEach((_, i) => {
      const x = dotStartX + i * 20;
      const color = i < currentIndex ? colors.success : i === currentIndex ? colors.primary : colors.border;
      const radius = i === currentIndex ? 6 : 4;
      renderer.drawEllipse(x, 25, radius, radius, color, { filled: true });
    });

    // Phase name
    const phaseNames: Record<GamePhase, string> = {
      hook: 'Hook',
      predict: 'Predict',
      play: 'Lab',
      review: 'Review',
      twist_predict: 'Twist Predict',
      twist_play: 'Twist Lab',
      twist_review: 'Twist Review',
      transfer: 'Transfer',
      test: 'Test',
      mastery: 'Mastery',
    };
    renderer.drawText(phaseNames[this.phase], 700, 30, colors.primary, '14px');
  }

  private renderHook(renderer: CommandRenderer): void {
    // Badge
    renderer.drawText('PHYSICS EXPLORATION', 400, 100, colors.primary, '14px', { align: 'center' });

    // Title
    renderer.drawText('The Power Grid Mystery', 400, 150, colors.textPrimary, '32px', { align: 'center', fontWeight: 'bold' });

    // Subtitle
    renderer.drawText('Discover why 400,000 volts flow through power lines', 400, 190, colors.textSecondary, '16px', { align: 'center' });
    renderer.drawText('yet your home only uses 120V', 400, 215, colors.textSecondary, '16px', { align: 'center' });

    // Main hook card
    renderer.drawRect(150, 250, 500, 150, colors.bgCard, { filled: true, borderRadius: 16 });

    // Lightning bolt icon (simplified)
    renderer.drawText('*', 400, 300, colors.primary, '48px', { align: 'center' });

    renderer.drawText('If you tried to send household current through', 400, 340, colors.textSecondary, '14px', { align: 'center' });
    renderer.drawText("long wires, they'd glow red hot!", 400, 365, colors.textSecondary, '14px', { align: 'center' });

    // Key question
    renderer.drawRect(200, 420, 400, 50, colors.bgCardLight, { filled: true, borderRadius: 8 });
    renderer.drawText('Why did AC win the "War of Currents"?', 400, 450, colors.primary, '16px', { align: 'center', fontWeight: 'bold' });

    // CTA Button
    renderer.drawRect(300, 500, 200, 50, colors.primary, { filled: true, borderRadius: 12 });
    renderer.drawText('Discover the Secret', 400, 530, colors.textPrimary, '16px', { align: 'center', fontWeight: 'bold' });
  }

  private renderPredict(renderer: CommandRenderer): void {
    renderer.drawText('Make Your Prediction', 400, 100, colors.textPrimary, '28px', { align: 'center', fontWeight: 'bold' });

    // Question card
    renderer.drawRect(100, 140, 600, 100, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('A transformer has two coils wound around an iron core.', 400, 175, colors.textSecondary, '14px', { align: 'center' });
    renderer.drawText('If the secondary coil has TWICE as many turns as the primary,', 400, 200, colors.textSecondary, '14px', { align: 'center' });
    renderer.drawText('what happens to the output voltage?', 400, 225, colors.textSecondary, '14px', { align: 'center' });

    // Options
    const options = [
      { id: 'A', text: 'Output voltage is halved' },
      { id: 'B', text: 'Output voltage stays the same' },
      { id: 'C', text: 'Output voltage doubles' },
      { id: 'D', text: 'No current flows at all' },
    ];

    options.forEach((opt, i) => {
      const y = 270 + i * 60;
      const isSelected = this.prediction === opt.id;
      const bgColor = isSelected ? colors.primary : colors.bgCardLight;
      renderer.drawRect(150, y, 500, 50, bgColor, { filled: true, borderRadius: 8 });
      renderer.drawText(`${opt.id}. ${opt.text}`, 400, y + 30, colors.textPrimary, '14px', { align: 'center' });
    });

    // Feedback
    if (this.prediction) {
      const isCorrect = this.prediction === 'C';
      const feedbackColor = isCorrect ? colors.success : colors.primary;
      renderer.drawRect(150, 520, 500, 60, colors.bgCard, { filled: true, borderRadius: 12 });
      renderer.drawText(
        isCorrect ? 'Correct! The voltage ratio equals the turns ratio!' : 'The voltage ratio equals the turns ratio!',
        400, 555,
        feedbackColor, '14px', { align: 'center' }
      );
    }
  }

  private renderPlay(renderer: CommandRenderer): void {
    renderer.drawText('Transformer Simulator', 400, 80, colors.textPrimary, '24px', { align: 'center', fontWeight: 'bold' });

    // Transformer visualization
    this.renderTransformerDiagram(renderer, 150, 130, 500, 200);

    // Controls
    renderer.drawRect(100, 350, 250, 80, colors.bgCard, { filled: true, borderRadius: 8 });
    renderer.drawText(`Primary Turns: ${this.primaryTurns}`, 225, 375, colors.primaryCoil, '14px', { align: 'center' });
    renderer.drawText('Slider: 50-200', 225, 410, colors.textMuted, '12px', { align: 'center' });

    renderer.drawRect(450, 350, 250, 80, colors.bgCard, { filled: true, borderRadius: 8 });
    renderer.drawText(`Secondary Turns: ${this.secondaryTurns}`, 575, 375, colors.secondaryCoil, '14px', { align: 'center' });
    renderer.drawText('Slider: 50-500', 575, 410, colors.textMuted, '12px', { align: 'center' });

    // Input voltage control
    renderer.drawRect(100, 450, 600, 50, colors.bgCard, { filled: true, borderRadius: 8 });
    renderer.drawText(`Input Voltage: ${this.inputVoltage}V`, 400, 480, colors.primary, '14px', { align: 'center' });

    // Results panel
    const outputVoltage = this.getOutputVoltage();
    const ratio = this.getTurnsRatio();
    const type = this.getTransformerType();

    renderer.drawRect(150, 520, 500, 60, colors.bgCardLight, { filled: true, borderRadius: 12 });
    renderer.drawText(
      `Turns Ratio: ${ratio.toFixed(2)}:1 | Output: ${outputVoltage.toFixed(0)}V | Type: ${type}`,
      400, 555,
      colors.textPrimary, '14px', { align: 'center' }
    );
  }

  private renderTransformerDiagram(renderer: CommandRenderer, x: number, y: number, width: number, height: number): void {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const acIntensity = this.isAC ? Math.abs(Math.sin(this.acPhase)) : 0;

    // Iron core (rectangle with hole)
    renderer.drawRect(centerX - 80, y + 20, 160, height - 40, colors.core, { filled: true, borderRadius: 8 });
    renderer.drawRect(centerX - 60, y + 40, 120, height - 80, colors.bgDark, { filled: true, borderRadius: 4 });

    // Magnetic flux visualization (if AC)
    if (this.isAC) {
      renderer.drawRect(centerX - 60, y + 42, 120, 10, colors.flux, { filled: true, alpha: acIntensity * 0.8 });
      renderer.drawRect(centerX - 60, y + height - 52, 120, 10, colors.flux, { filled: true, alpha: acIntensity * 0.8 });
    }

    // Primary coil (left side)
    const primaryCoilCount = Math.min(Math.floor(this.primaryTurns / 10), 10);
    for (let i = 0; i < primaryCoilCount; i++) {
      const coilY = y + 50 + i * 15;
      const alpha = this.isAC ? 0.5 + acIntensity * 0.5 : 0.3;
      renderer.drawEllipse(centerX - 80, coilY, 20, 8, colors.primaryCoil, { filled: false, alpha });
    }
    renderer.drawText('Primary', centerX - 80, y + height - 10, colors.primaryCoil, '12px', { align: 'center' });
    renderer.drawText(`${this.primaryTurns} turns`, centerX - 80, y + height + 10, colors.textMuted, '10px', { align: 'center' });

    // Secondary coil (right side)
    const secondaryCoilCount = Math.min(Math.floor(this.secondaryTurns / 10), 15);
    for (let i = 0; i < secondaryCoilCount; i++) {
      const coilY = y + 45 + i * 10;
      const outputV = this.getOutputVoltage();
      const alpha = outputV > 0 ? 0.5 + acIntensity * 0.5 : 0.3;
      renderer.drawEllipse(centerX + 80, coilY, 20, 6, colors.secondaryCoil, { filled: false, alpha });
    }
    renderer.drawText('Secondary', centerX + 80, y + height - 10, colors.secondaryCoil, '12px', { align: 'center' });
    renderer.drawText(`${this.secondaryTurns} turns`, centerX + 80, y + height + 10, colors.textMuted, '10px', { align: 'center' });

    // Input/Output indicators
    const outputV = this.getOutputVoltage();

    renderer.drawRect(x - 20, centerY - 40, 80, 80, colors.bgCardLight, { filled: true, borderRadius: 8 });
    renderer.drawText('Input', x + 20, centerY - 20, colors.textMuted, '10px', { align: 'center' });
    renderer.drawText(`${this.inputVoltage}V`, x + 20, centerY + 5, colors.primaryCoil, '16px', { align: 'center', fontWeight: 'bold' });
    renderer.drawText(this.isAC ? 'AC' : 'DC', x + 20, centerY + 25, this.isAC ? colors.primary : colors.textMuted, '12px', { align: 'center' });

    renderer.drawRect(x + width - 60, centerY - 40, 80, 80, colors.bgCardLight, { filled: true, borderRadius: 8 });
    renderer.drawText('Output', x + width - 20, centerY - 20, colors.textMuted, '10px', { align: 'center' });
    renderer.drawText(`${outputV.toFixed(0)}V`, x + width - 20, centerY + 5, outputV > 0 ? colors.secondaryCoil : colors.danger, '16px', { align: 'center', fontWeight: 'bold' });
    renderer.drawText(outputV > 0 ? 'AC' : 'NONE', x + width - 20, centerY + 25, outputV > 0 ? colors.primary : colors.danger, '12px', { align: 'center' });

    // Transformer type label
    const type = this.getTransformerType();
    const typeColor = type === 'step-up' ? colors.secondaryCoil : type === 'step-down' ? colors.primary : colors.flux;
    renderer.drawRect(centerX - 60, y - 10, 120, 30, colors.bgCardLight, { filled: true, borderRadius: 8 });
    renderer.drawText(type.toUpperCase(), centerX, y + 10, typeColor, '14px', { align: 'center', fontWeight: 'bold' });
  }

  private renderReview(renderer: CommandRenderer): void {
    renderer.drawText('The Magic of Magnetic Coupling', 400, 80, colors.textPrimary, '24px', { align: 'center', fontWeight: 'bold' });

    // How transformers work
    renderer.drawRect(100, 120, 600, 100, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('How Transformers Work', 400, 150, colors.primary, '18px', { align: 'center', fontWeight: 'bold' });
    renderer.drawText('AC current in primary creates a changing magnetic flux in the iron core.', 400, 180, colors.textSecondary, '12px', { align: 'center' });
    renderer.drawText("This flux passes through secondary and induces voltage by Faraday's law!", 400, 200, colors.textSecondary, '12px', { align: 'center' });

    // Formula card
    renderer.drawRect(250, 240, 300, 60, colors.bgDark, { filled: true, borderRadius: 8 });
    renderer.drawText('V2/V1 = N2/N1', 400, 275, colors.primary, '20px', { align: 'center', fontWeight: 'bold' });

    // Step-up vs Step-down
    renderer.drawRect(100, 320, 280, 120, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('Step-Up', 240, 350, colors.secondaryCoil, '16px', { align: 'center', fontWeight: 'bold' });
    renderer.drawText('More secondary turns', 240, 380, colors.textSecondary, '12px', { align: 'center' });
    renderer.drawText('Higher voltage, lower current', 240, 400, colors.textSecondary, '12px', { align: 'center' });
    renderer.drawText('Used for: Power transmission', 240, 420, colors.textMuted, '11px', { align: 'center' });

    renderer.drawRect(420, 320, 280, 120, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('Step-Down', 560, 350, colors.primary, '16px', { align: 'center', fontWeight: 'bold' });
    renderer.drawText('Fewer secondary turns', 560, 380, colors.textSecondary, '12px', { align: 'center' });
    renderer.drawText('Lower voltage, higher current', 560, 400, colors.textSecondary, '12px', { align: 'center' });
    renderer.drawText('Used for: Chargers, doorbells', 560, 420, colors.textMuted, '11px', { align: 'center' });

    // Power conservation note
    renderer.drawRect(150, 460, 500, 60, colors.flux, { filled: true, borderRadius: 12, alpha: 0.2 });
    renderer.drawText('Conservation of Energy: Power in = Power out', 400, 490, colors.flux, '14px', { align: 'center', fontWeight: 'bold' });
    renderer.drawText("If voltage goes up 10x, current goes down 10x. You can't create free energy!", 400, 510, colors.textSecondary, '11px', { align: 'center' });
  }

  private renderTwistPredict(renderer: CommandRenderer): void {
    renderer.drawText('The DC Question', 400, 100, colors.textPrimary, '28px', { align: 'center', fontWeight: 'bold' });

    renderer.drawRect(100, 150, 600, 80, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('What happens if you connect a battery (DC)', 400, 185, colors.textSecondary, '16px', { align: 'center' });
    renderer.drawText('to the primary coil of a transformer?', 400, 210, colors.textSecondary, '16px', { align: 'center' });

    const options = [
      { id: 'A', text: 'The transformer works normally' },
      { id: 'B', text: 'The output voltage is doubled' },
      { id: 'C', text: 'No output voltage - DC creates a static field' },
      { id: 'D', text: 'The transformer becomes a motor' },
    ];

    options.forEach((opt, i) => {
      const y = 260 + i * 60;
      const isSelected = this.twistPrediction === opt.id;
      const bgColor = isSelected ? colors.primary : colors.bgCardLight;
      renderer.drawRect(150, y, 500, 50, bgColor, { filled: true, borderRadius: 8 });
      renderer.drawText(`${opt.id}. ${opt.text}`, 400, y + 30, colors.textPrimary, '14px', { align: 'center' });
    });

    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'C';
      renderer.drawRect(150, 520, 500, 60, colors.bgCard, { filled: true, borderRadius: 12 });
      renderer.drawText(
        isCorrect ? 'Correct! DC creates a static magnetic field!' : 'DC creates a static field - no induction!',
        400, 555,
        isCorrect ? colors.success : colors.primary, '14px', { align: 'center' }
      );
    }
  }

  private renderTwistPlay(renderer: CommandRenderer): void {
    renderer.drawText('AC vs DC: The Critical Difference', 400, 80, colors.textPrimary, '24px', { align: 'center', fontWeight: 'bold' });

    // Mode toggle buttons
    renderer.drawRect(250, 110, 120, 40, this.twistMode === 'ac' ? colors.secondaryCoil : colors.bgCardLight, { filled: true, borderRadius: 8 });
    renderer.drawText('AC Input', 310, 135, colors.textPrimary, '14px', { align: 'center' });

    renderer.drawRect(430, 110, 120, 40, this.twistMode === 'dc' ? colors.danger : colors.bgCardLight, { filled: true, borderRadius: 8 });
    renderer.drawText('DC Input', 490, 135, colors.textPrimary, '14px', { align: 'center' });

    // Simplified transformer diagram
    const isACMode = this.twistMode === 'ac';
    this.renderTwistTransformer(renderer, 150, 170, 500, 180, isACMode);

    // Explanation panel
    const bgColor = isACMode ? colors.secondaryCoil : colors.danger;
    renderer.drawRect(150, 380, 500, 100, bgColor, { filled: true, borderRadius: 12, alpha: 0.2 });

    if (isACMode) {
      renderer.drawText('AC: Constantly changing current -> changing flux -> induced EMF!', 400, 410, colors.secondaryCoil, '14px', { align: 'center', fontWeight: 'bold' });
      renderer.drawText('Output: 240V AC', 400, 445, colors.textSecondary, '14px', { align: 'center' });
    } else {
      renderer.drawText('DC: Constant current -> static flux -> NO induction!', 400, 410, colors.danger, '14px', { align: 'center', fontWeight: 'bold' });
      renderer.drawText('Output: 0V (nothing happens after initial moment)', 400, 445, colors.textSecondary, '14px', { align: 'center' });
    }
  }

  private renderTwistTransformer(renderer: CommandRenderer, x: number, y: number, width: number, height: number, isAC: boolean): void {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const intensity = isAC ? Math.abs(Math.sin(this.acPhase)) : 0;

    // Iron core
    renderer.drawRect(centerX - 60, y + 20, 120, height - 40, colors.core, { filled: true, borderRadius: 8 });
    renderer.drawRect(centerX - 40, y + 40, 80, height - 80, colors.bgDark, { filled: true, borderRadius: 4 });

    // Flux (only visible for AC)
    if (isAC) {
      renderer.drawRect(centerX - 40, y + 42, 80, 8, colors.flux, { filled: true, alpha: intensity * 0.8 });
      renderer.drawRect(centerX - 40, y + height - 50, 80, 8, colors.flux, { filled: true, alpha: intensity * 0.8 });
    }

    // Primary coil (simple representation)
    for (let i = 0; i < 6; i++) {
      const alpha = isAC ? 0.5 + intensity * 0.5 : 0.3;
      renderer.drawEllipse(centerX - 60, y + 50 + i * 15, 15, 6, colors.primaryCoil, { filled: false, alpha });
    }

    // Secondary coil
    for (let i = 0; i < 8; i++) {
      const alpha = isAC ? 0.5 + intensity * 0.5 : 0.2;
      renderer.drawEllipse(centerX + 60, y + 45 + i * 12, 15, 5, colors.secondaryCoil, { filled: false, alpha });
    }

    // Output indicator
    const outputColor = isAC ? colors.secondaryCoil : colors.danger;
    const outputText = isAC ? '240V' : '0V';
    renderer.drawText(outputText, centerX + 120, centerY, outputColor, '24px', { align: 'center', fontWeight: 'bold' });
  }

  private renderTwistReview(renderer: CommandRenderer): void {
    renderer.drawText('Why AC Won the War of Currents', 400, 80, colors.textPrimary, '24px', { align: 'center', fontWeight: 'bold' });

    // Tesla's triumph card
    renderer.drawRect(100, 120, 600, 100, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText("Tesla's Triumph", 400, 150, colors.secondaryCoil, '18px', { align: 'center', fontWeight: 'bold' });
    renderer.drawText('In the 1880s, Edison promoted DC while Tesla/Westinghouse championed AC.', 400, 180, colors.textSecondary, '12px', { align: 'center' });
    renderer.drawText('AC won because transformers work! Step up for transmission, down for use.', 400, 200, colors.primary, '12px', { align: 'center', fontWeight: 'bold' });

    // Power comparison
    renderer.drawRect(100, 240, 600, 180, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('Power Loss Comparison', 400, 270, colors.textPrimary, '16px', { align: 'center', fontWeight: 'bold' });

    // High voltage transmission (good)
    renderer.drawRect(120, 300, 250, 50, colors.secondaryCoil, { filled: true, borderRadius: 8, alpha: 0.2 });
    renderer.drawText('High Voltage (AC + Transformers)', 245, 320, colors.secondaryCoil, '12px', { align: 'center' });
    renderer.drawText(`Efficiency: ${this.calculateTransmissionEfficiency(true).toFixed(1)}%`, 245, 340, colors.success, '11px', { align: 'center' });

    // Low voltage transmission (bad)
    renderer.drawRect(430, 300, 250, 50, colors.danger, { filled: true, borderRadius: 8, alpha: 0.2 });
    renderer.drawText('Low Voltage (DC, no transformers)', 555, 320, colors.danger, '12px', { align: 'center' });
    renderer.drawText(`Efficiency: ${this.calculateTransmissionEfficiency(false).toFixed(1)}%`, 555, 340, colors.danger, '11px', { align: 'center' });

    renderer.drawText('Massive heat loss!', 555, 380, colors.danger, '10px', { align: 'center' });

    // The math
    renderer.drawRect(150, 440, 500, 80, colors.primary, { filled: true, borderRadius: 12, alpha: 0.2 });
    renderer.drawText('The Math: Power loss = I^2 * R', 400, 470, colors.primary, '16px', { align: 'center', fontWeight: 'bold' });
    renderer.drawText('If voltage goes up 1000x, current drops 1000x, losses drop by 1,000,000x!', 400, 500, colors.textSecondary, '12px', { align: 'center' });
  }

  private renderTransfer(renderer: CommandRenderer): void {
    renderer.drawText('Real-World Transformers', 400, 80, colors.textPrimary, '24px', { align: 'center', fontWeight: 'bold' });
    renderer.drawText('Explore how transformers power modern life', 400, 110, colors.textSecondary, '14px', { align: 'center' });

    applications.forEach((app, i) => {
      const x = 100 + (i % 2) * 320;
      const y = 150 + Math.floor(i / 2) * 180;
      const isCompleted = this.completedApps.has(i);

      renderer.drawRect(x, y, 280, 150, isCompleted ? colors.success : colors.bgCard, {
        filled: true,
        borderRadius: 12,
        alpha: isCompleted ? 0.3 : 1,
      });
      renderer.drawRect(x, y, 280, 150, isCompleted ? colors.success : colors.border, {
        filled: false,
        borderRadius: 12,
      });

      renderer.drawText(app.title, x + 140, y + 40, colors.textPrimary, '16px', { align: 'center', fontWeight: 'bold' });

      // Word wrap description
      const words = app.description.split(' ');
      let line1 = '';
      let line2 = '';
      words.forEach(word => {
        if ((line1 + word).length < 35) {
          line1 += word + ' ';
        } else {
          line2 += word + ' ';
        }
      });
      renderer.drawText(line1.trim(), x + 140, y + 80, colors.textSecondary, '11px', { align: 'center' });
      renderer.drawText(line2.trim(), x + 140, y + 100, colors.textSecondary, '11px', { align: 'center' });

      if (isCompleted) {
        renderer.drawText('Explored', x + 140, y + 130, colors.success, '12px', { align: 'center' });
      }
    });

    // Progress and proceed button
    if (this.completedApps.size >= 4) {
      renderer.drawRect(300, 540, 200, 40, colors.success, { filled: true, borderRadius: 8 });
      renderer.drawText('Take the Test', 400, 565, colors.textPrimary, '14px', { align: 'center', fontWeight: 'bold' });
    } else {
      renderer.drawText(`Explore ${4 - this.completedApps.size} more to continue`, 400, 550, colors.textMuted, '14px', { align: 'center' });
    }
  }

  private renderTest(renderer: CommandRenderer): void {
    renderer.drawText('Knowledge Check', 400, 60, colors.textPrimary, '24px', { align: 'center', fontWeight: 'bold' });

    const answeredCount = this.testAnswers.filter(a => a !== undefined && a >= 0).length;
    renderer.drawText(`Answered: ${answeredCount}/${testQuestions.length}`, 400, 90, colors.textSecondary, '14px', { align: 'center' });

    // Show current question
    const currentQ = this.testAnswers.findIndex(a => a === undefined || a < 0);
    const qIndex = currentQ >= 0 ? currentQ : 0;

    if (qIndex < testQuestions.length) {
      const q = testQuestions[qIndex];

      renderer.drawRect(50, 120, 700, 80, colors.bgCard, { filled: true, borderRadius: 12 });
      renderer.drawText(`Q${qIndex + 1}: ${q.question}`, 400, 165, colors.textPrimary, '14px', { align: 'center' });

      q.options.forEach((opt, i) => {
        const y = 220 + i * 55;
        const isSelected = this.testAnswers[qIndex] === i;
        renderer.drawRect(100, y, 600, 45, isSelected ? colors.primary : colors.bgCardLight, { filled: true, borderRadius: 8 });

        // Truncate long options
        const displayText = opt.length > 60 ? opt.substring(0, 57) + '...' : opt;
        renderer.drawText(displayText, 400, y + 28, colors.textPrimary, '12px', { align: 'center' });
      });
    }

    // Show score if all answered
    if (answeredCount === testQuestions.length) {
      const score = this.testAnswers.reduce((acc, ans, i) => acc + (ans === testQuestions[i].correctIndex ? 1 : 0), 0);
      renderer.drawRect(250, 480, 300, 80, colors.bgCard, { filled: true, borderRadius: 12 });
      renderer.drawText(`Score: ${score}/${testQuestions.length}`, 400, 515, score >= 7 ? colors.success : colors.warning, '24px', { align: 'center', fontWeight: 'bold' });

      if (score >= 7) {
        renderer.drawText('Excellent! Proceed to Mastery', 400, 545, colors.success, '14px', { align: 'center' });
      }
    }
  }

  private renderMastery(renderer: CommandRenderer): void {
    // Trophy icon
    renderer.drawText('Transformer Master!', 400, 140, colors.textPrimary, '36px', { align: 'center', fontWeight: 'bold' });

    renderer.drawRect(150, 180, 500, 280, colors.bgCard, { filled: true, borderRadius: 16 });

    renderer.drawText("You've mastered:", 400, 220, colors.textSecondary, '16px', { align: 'center' });

    const mastered = [
      'Voltage ratio = turns ratio (V2/V1 = N2/N1)',
      'Transformers need AC (changing flux)',
      'Power conservation: V x I = constant',
      'Why high voltage reduces transmission losses',
      'Step-up and step-down applications',
    ];

    mastered.forEach((item, i) => {
      renderer.drawText(`* ${item}`, 400, 260 + i * 30, colors.success, '12px', { align: 'center' });
    });

    // Key insight
    renderer.drawRect(150, 470, 500, 60, colors.primary, { filled: true, borderRadius: 12, alpha: 0.3 });
    renderer.drawText('Transformers make our power grid possible -', 400, 495, colors.primary, '14px', { align: 'center', fontWeight: 'bold' });
    renderer.drawText('step up for transmission, step down for safe use!', 400, 515, colors.primary, '14px', { align: 'center', fontWeight: 'bold' });

    // Badge button
    renderer.drawRect(300, 550, 200, 40, colors.primary, { filled: true, borderRadius: 8 });
    renderer.drawText('Claim Your Badge', 400, 575, colors.textPrimary, '14px', { align: 'center' });
  }

  // === UI STATE FOR CLIENT ===

  private getUIState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      testAnswersCount: this.testAnswers.filter(a => a !== undefined && a >= 0).length,
      completedAppsCount: this.completedApps.size,
      primaryTurns: this.primaryTurns,
      secondaryTurns: this.secondaryTurns,
      inputVoltage: this.inputVoltage,
      isAC: this.isAC,
      twistMode: this.twistMode,
      turnsRatio: this.getTurnsRatio(),
      outputVoltage: this.getOutputVoltage(),
      transformerType: this.getTransformerType(),
      canProceedToTest: this.completedApps.size >= 4,
      testScore: this.testAnswers.filter(a => a !== undefined && a >= 0).length === testQuestions.length
        ? this.testAnswers.reduce((acc, ans, i) => acc + (ans === testQuestions[i].correctIndex ? 1 : 0), 0)
        : null,
      canProceedToMastery: this.testAnswers.filter(a => a !== undefined && a >= 0).length === testQuestions.length &&
        this.testAnswers.reduce((acc, ans, i) => acc + (ans === testQuestions[i].correctIndex ? 1 : 0), 0) >= 7,
    };
  }
}

// === FACTORY FUNCTION ===

export function createTransformerGame(sessionId: string): TransformerGame {
  return new TransformerGame(sessionId);
}
