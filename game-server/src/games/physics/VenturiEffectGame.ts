/**
 * Venturi Effect Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Continuity equation: A1*v1 = A2*v2 (mass conservation)
 * - Bernoulli's principle: P + 0.5*rho*v^2 = constant (energy conservation)
 * - Pressure drop at constriction: P2 = P1 - 0.5*rho*(v2^2 - v1^2)
 * - Area ratio determines velocity ratio
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
    question: 'When air flows through a narrower pipe section at the same flow rate, what happens to its velocity?',
    options: [
      'Velocity decreases proportionally to the area reduction',
      'Velocity increases to maintain constant flow rate',
      'Velocity stays the same but pressure increases',
      'Flow reverses direction in the narrow section',
    ],
    correctIndex: 1,
  },
  {
    question: 'The continuity equation A1*v1 = A2*v2 represents conservation of what quantity?',
    options: [
      'Mass (volumetric flow rate for incompressible fluids)',
      'Energy in the fluid system',
      'Momentum of the flowing fluid',
      'Static pressure at all points',
    ],
    correctIndex: 0,
  },
  {
    question: 'In a Venturi tube, where is the static pressure LOWEST?',
    options: [
      'At the wide entrance section',
      'At the wide exit section',
      'At the narrow middle section (throat)',
      'Pressure is equal at all locations',
    ],
    correctIndex: 2,
  },
  {
    question: 'Why does water spray farther when you partially cover a garden hose opening?',
    options: [
      'The hose pressure increases dramatically',
      'Reducing the opening area increases exit velocity',
      'Water becomes lighter and travels farther',
      'Air resistance is reduced at the nozzle',
    ],
    correctIndex: 1,
  },
  {
    question: 'When you blow air between two parallel papers, they move together because:',
    options: [
      'Moving air creates low pressure between the papers',
      'The air pushes the papers outward',
      'Static electricity attracts the papers',
      'Gravity pulls them toward the air stream',
    ],
    correctIndex: 0,
  },
  {
    question: 'A carburetor uses the Venturi effect primarily to:',
    options: [
      'Cool the incoming air charge',
      'Filter particles from the air',
      'Draw fuel into the air stream for mixing',
      'Increase air pressure before the engine',
    ],
    correctIndex: 2,
  },
  {
    question: 'If pipe cross-sectional area is halved (A2 = A1/2), the fluid velocity at the narrow section:',
    options: [
      'Halves to maintain equilibrium',
      'Doubles to conserve mass flow',
      'Quadruples due to pressure effects',
      'Remains the same throughout',
    ],
    correctIndex: 1,
  },
  {
    question: 'The Venturi effect is a direct consequence of:',
    options: [
      "Bernoulli's principle relating pressure and velocity",
      "Newton's third law of action-reaction",
      "Archimedes' principle of buoyancy",
      "Hooke's law of elasticity",
    ],
    correctIndex: 0,
  },
  {
    question: "A Bunsen burner's air intake collar uses the Venturi effect to:",
    options: [
      'Preheat the gas before combustion',
      'Cool the burner barrel',
      'Draw in air for premixed combustion',
      'Reduce gas consumption significantly',
    ],
    correctIndex: 2,
  },
  {
    question: 'How does a water aspirator create vacuum without electricity?',
    options: [
      'Water has special chemical properties that absorb air',
      'Fast water through a Venturi creates low pressure that pulls air',
      'The weight of falling water pulls air downward',
      'Evaporating water removes air from the system',
    ],
    correctIndex: 1,
  },
];

// === PHYSICS CONSTANTS (PROTECTED) ===
const AIR_DENSITY = 1.2; // kg/m^3 at sea level
const REFERENCE_PRESSURE = 100; // kPa

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#14b8a6',
  primaryDark: '#0d9488',
  accent: '#22d3ee',
  accentDark: '#06b6d4',
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
  water: '#38bdf8',
  flow: '#00ccff',
  pressure: {
    high: '#ef4444',
    low: '#3b82f6',
  },
  velocity: '#22c55e',
};

// === APPLICATION DATA ===
interface Application {
  title: string;
  icon: string;
  tagline: string;
  description: string;
}

const applications: Application[] = [
  {
    title: 'Automotive Carburetors',
    icon: 'car',
    tagline: 'Mixing Fuel and Air Since 1893',
    description: 'Air flows through a Venturi throat, creating low pressure that draws fuel from the float bowl through calibrated jets.',
  },
  {
    title: 'Medical Venturi Masks',
    icon: 'medical',
    tagline: 'Precise Oxygen Therapy Through Physics',
    description: 'Pure oxygen jets through a narrow orifice, creating low pressure that entrains exact amounts of room air.',
  },
  {
    title: 'Bunsen Burners',
    icon: 'flame',
    tagline: 'Venturi-Powered Combustion Since 1855',
    description: 'Gas flowing up the barrel creates low pressure at the air intake collar, drawing in air for premixed combustion.',
  },
  {
    title: 'Water Aspirators',
    icon: 'vacuum',
    tagline: 'Creating Vacuum with Running Water',
    description: 'Water accelerating through a narrow throat creates low pressure that can pull air from flasks and vessels.',
  },
];

// === MAIN GAME CLASS ===

export class VenturiEffectGame extends BaseGame {
  readonly gameType = 'venturi_effect';
  readonly gameTitle = 'Venturi Effect';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private testAnswers: number[] = [];
  private completedApps: Set<number> = new Set();

  // --- SIMULATION STATE ---
  private flowRate: number = 50; // 0-100%
  private constrictionSize: number = 50; // 20-80% of original
  private showPressure: boolean = true;
  private showVelocity: boolean = true;
  private isFlowing: boolean = true;
  private animationTime: number = 0;

  // Twist demo state
  private paperGap: number = 40;
  private isBlowing: boolean = false;

  // === PROTECTED PHYSICS METHODS ===

  // PROTECTED: Calculate wide section velocity
  private getWideVelocity(): number {
    return (this.flowRate / 100) * 5; // m/s at wide section
  }

  // PROTECTED: Calculate area ratio
  private getAreaRatio(): number {
    return 100 / this.constrictionSize; // A1/A2
  }

  // PROTECTED: Calculate narrow section velocity using continuity
  private getNarrowVelocity(): number {
    // Continuity: A1*v1 = A2*v2 -> v2 = v1 * (A1/A2)
    return this.getWideVelocity() * this.getAreaRatio();
  }

  // PROTECTED: Calculate pressure at wide section
  private getWidePressure(): number {
    return REFERENCE_PRESSURE; // kPa
  }

  // PROTECTED: Calculate pressure drop using Bernoulli
  private getNarrowPressure(): number {
    const v1 = this.getWideVelocity();
    const v2 = this.getNarrowVelocity();
    // Bernoulli: P1 + 0.5*rho*v1^2 = P2 + 0.5*rho*v2^2
    // P2 = P1 - 0.5*rho*(v2^2 - v1^2)
    const pressureDrop = 0.5 * AIR_DENSITY * (v2 * v2 - v1 * v1) / 1000; // kPa
    return Math.max(this.getWidePressure() - pressureDrop, 10);
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
      flowRate: this.flowRate,
      constrictionSize: this.constrictionSize,
      showPressure: this.showPressure,
      showVelocity: this.showVelocity,
      isFlowing: this.isFlowing,
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.prediction !== undefined) this.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
    if (state.flowRate !== undefined) this.flowRate = state.flowRate as number;
    if (state.constrictionSize !== undefined) this.constrictionSize = state.constrictionSize as number;
    if (state.showPressure !== undefined) this.showPressure = state.showPressure as boolean;
    if (state.showVelocity !== undefined) this.showVelocity = state.showVelocity as boolean;
    if (state.isFlowing !== undefined) this.isFlowing = state.isFlowing as boolean;
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

      case 'set_flow_rate':
        if (input.payload?.rate !== undefined) {
          this.flowRate = Math.max(20, Math.min(100, input.payload.rate as number));
        }
        break;

      case 'set_constriction':
        if (input.payload?.size !== undefined) {
          this.constrictionSize = Math.max(20, Math.min(80, input.payload.size as number));
        }
        break;

      case 'toggle_pressure':
        this.showPressure = !this.showPressure;
        break;

      case 'toggle_velocity':
        this.showVelocity = !this.showVelocity;
        break;

      case 'toggle_flow':
        this.isFlowing = !this.isFlowing;
        break;

      case 'start_blowing':
        this.isBlowing = true;
        this.paperGap = 40;
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

    // Update paper gap animation for twist demo
    if (this.isBlowing) {
      const t = (this.animationTime % 1500) / 1500 * Math.PI;
      this.paperGap = 40 - Math.sin(t) * 28;
      if (this.animationTime % 1500 > 1400) {
        this.isBlowing = false;
        this.paperGap = 40;
      }
    }

    const renderer = new CommandRenderer();

    // Background
    renderer.drawRect(0, 0, 800, 600, colors.bgDark, { filled: true });

    // Ambient glow effects
    renderer.drawEllipse(200, 150, 200, 200, colors.primary, { filled: true, alpha: 0.05 });
    renderer.drawEllipse(600, 450, 200, 200, colors.accent, { filled: true, alpha: 0.05 });

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
    renderer.drawText('Venturi Effect', 20, 30, colors.textSecondary, '14px');

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
      play: 'Explore',
      review: 'Review',
      twist_predict: 'Twist Predict',
      twist_play: 'Twist Demo',
      twist_review: 'Twist Review',
      transfer: 'Transfer',
      test: 'Test',
      mastery: 'Mastery',
    };
    renderer.drawText(phaseNames[this.phase], 700, 30, colors.primary, '14px');
  }

  private renderHook(renderer: CommandRenderer): void {
    // Badge
    renderer.drawText('FLUID DYNAMICS', 400, 100, colors.primary, '14px', { align: 'center' });

    // Title
    renderer.drawText('The Garden Hose Trick', 400, 150, colors.textPrimary, '32px', { align: 'center', fontWeight: 'bold' });

    // Subtitle
    renderer.drawText('Why does water shoot farther when you cover the nozzle?', 400, 190, colors.textSecondary, '16px', { align: 'center' });

    // Animated garden hose demo
    this.renderGardenHoseDemo(renderer);

    // Hook card
    renderer.drawRect(150, 430, 500, 80, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('You cover part of a garden hose with your thumb.', 400, 460, colors.textSecondary, '14px', { align: 'center' });
    renderer.drawText('The water shoots out faster and reaches farther!', 400, 485, colors.primary, '14px', { align: 'center', fontWeight: 'bold' });

    // CTA Button
    renderer.drawRect(300, 530, 200, 50, colors.primary, { filled: true, borderRadius: 12 });
    renderer.drawText('Discover the Venturi Effect', 400, 560, colors.textPrimary, '14px', { align: 'center', fontWeight: 'bold' });
  }

  private renderGardenHoseDemo(renderer: CommandRenderer): void {
    const time = this.animationTime / 1000;

    // Ground
    renderer.drawRect(0, 380, 800, 50, '#2d5a27', { filled: true });

    // Person (simplified)
    renderer.drawEllipse(200, 280, 25, 30, '#ffcc99', { filled: true }); // Head
    renderer.drawRect(175, 310, 50, 60, '#3366cc', { filled: true, borderRadius: 8 }); // Body

    // Hose
    const hosePoints: [number, number][] = [
      [225, 340],
      [280, 330],
      [340, 310],
      [400, 300],
    ];
    renderer.drawPath(hosePoints, '#228B22', { strokeWidth: 12 });

    // Hose nozzle
    renderer.drawRect(395, 295, 30, 14, '#444', { filled: true, borderRadius: 2 });

    // Water spray (animated)
    const sprayOffset = (time * 100) % 100;
    for (let i = 0; i < 8; i++) {
      const t = ((sprayOffset + i * 12) % 100) / 100;
      const x = 425 + t * 150;
      const y = 302 + Math.pow(t, 1.5) * 80;

      renderer.drawEllipse(x, y, 4, 4, colors.flow, { filled: true, alpha: 1 - t });
    }

    // Arrow showing powerful spray
    renderer.drawLine(430, 295, 550, 340, colors.flow, 3);
    renderer.drawText('Fast!', 560, 340, colors.flow, '14px', { fontWeight: 'bold' });
  }

  private renderPredict(renderer: CommandRenderer): void {
    renderer.drawText('Make Your Prediction', 400, 100, colors.textPrimary, '28px', { align: 'center', fontWeight: 'bold' });

    // Question card
    renderer.drawRect(100, 140, 600, 100, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('Water flows through a pipe that narrows in the middle.', 400, 170, colors.textSecondary, '14px', { align: 'center' });
    renderer.drawText('If the SAME AMOUNT of water must pass through both sections', 400, 195, colors.textSecondary, '14px', { align: 'center' });
    renderer.drawText('every second, what happens to the water SPEED in the narrow section?', 400, 220, colors.textSecondary, '14px', { align: 'center' });

    // Options
    const options = [
      { id: 'A', text: 'Speed stays the same - water is incompressible' },
      { id: 'B', text: 'Speed increases - same volume, smaller area' },
      { id: 'C', text: 'Speed decreases - narrow section slows flow' },
      { id: 'D', text: 'Water stops flowing at the narrow section' },
    ];

    options.forEach((opt, i) => {
      const y = 260 + i * 60;
      const isSelected = this.prediction === opt.id;
      const bgColor = isSelected ? colors.primary : colors.bgCardLight;
      renderer.drawRect(150, y, 500, 50, bgColor, { filled: true, borderRadius: 8 });
      renderer.drawText(`${opt.id}. ${opt.text}`, 400, y + 30, colors.textPrimary, '13px', { align: 'center' });
    });

    // Feedback
    if (this.prediction) {
      const isCorrect = this.prediction === 'B';
      renderer.drawRect(150, 510, 500, 70, colors.bgCard, { filled: true, borderRadius: 12 });
      renderer.drawText(
        isCorrect ? 'Correct! This is the continuity equation!' : 'This is the continuity equation: A1*v1 = A2*v2',
        400, 540,
        isCorrect ? colors.success : colors.primary, '14px', { align: 'center' }
      );
      renderer.drawText('Smaller area means higher velocity to maintain the same flow rate.', 400, 565, colors.textSecondary, '12px', { align: 'center' });
    }
  }

  private renderPlay(renderer: CommandRenderer): void {
    renderer.drawText('Venturi Tube Simulator', 400, 80, colors.textPrimary, '24px', { align: 'center', fontWeight: 'bold' });

    // Venturi tube visualization
    this.renderVenturiTube(renderer, 100, 140, 600, 200);

    // Controls
    renderer.drawRect(100, 360, 280, 70, colors.bgCard, { filled: true, borderRadius: 8 });
    renderer.drawText(`Flow Rate: ${this.flowRate}%`, 240, 390, colors.textSecondary, '14px', { align: 'center' });
    renderer.drawText('Slider: 20-100', 240, 415, colors.textMuted, '11px', { align: 'center' });

    renderer.drawRect(420, 360, 280, 70, colors.bgCard, { filled: true, borderRadius: 8 });
    renderer.drawText(`Constriction: ${this.constrictionSize}% of original`, 560, 390, colors.textSecondary, '14px', { align: 'center' });
    renderer.drawText('Slider: 20-80', 560, 415, colors.textMuted, '11px', { align: 'center' });

    // Stats display
    const wideV = this.getWideVelocity();
    const narrowV = this.getNarrowVelocity();
    const wideP = this.getWidePressure();
    const narrowP = this.getNarrowPressure();

    renderer.drawRect(100, 450, 150, 80, colors.bgCard, { filled: true, borderRadius: 8 });
    renderer.drawText('v1 (Wide)', 175, 475, colors.textMuted, '12px', { align: 'center' });
    renderer.drawText(`${wideV.toFixed(1)} m/s`, 175, 510, colors.velocity, '18px', { align: 'center', fontWeight: 'bold' });

    renderer.drawRect(270, 450, 150, 80, colors.bgCard, { filled: true, borderRadius: 8 });
    renderer.drawText('v2 (Narrow)', 345, 475, colors.textMuted, '12px', { align: 'center' });
    renderer.drawText(`${narrowV.toFixed(1)} m/s`, 345, 510, colors.accent, '18px', { align: 'center', fontWeight: 'bold' });

    renderer.drawRect(440, 450, 150, 80, colors.bgCard, { filled: true, borderRadius: 8 });
    renderer.drawText('P1 (Wide)', 515, 475, colors.textMuted, '12px', { align: 'center' });
    renderer.drawText(`${wideP.toFixed(0)} kPa`, 515, 510, colors.pressure.high, '18px', { align: 'center', fontWeight: 'bold' });

    renderer.drawRect(610, 450, 150, 80, colors.bgCard, { filled: true, borderRadius: 8 });
    renderer.drawText('P2 (Narrow)', 685, 475, colors.textMuted, '12px', { align: 'center' });
    renderer.drawText(`${narrowP.toFixed(0)} kPa`, 685, 510, colors.pressure.low, '18px', { align: 'center', fontWeight: 'bold' });

    // Toggle buttons
    renderer.drawRect(200, 550, 120, 35, this.showPressure ? colors.primary : colors.bgCardLight, { filled: true, borderRadius: 6 });
    renderer.drawText('Pressure', 260, 572, colors.textPrimary, '12px', { align: 'center' });

    renderer.drawRect(340, 550, 120, 35, this.showVelocity ? colors.primary : colors.bgCardLight, { filled: true, borderRadius: 6 });
    renderer.drawText('Velocity', 400, 572, colors.textPrimary, '12px', { align: 'center' });

    renderer.drawRect(480, 550, 120, 35, this.isFlowing ? colors.danger : colors.success, { filled: true, borderRadius: 6 });
    renderer.drawText(this.isFlowing ? 'Stop' : 'Start', 540, 572, colors.textPrimary, '12px', { align: 'center' });
  }

  private renderVenturiTube(renderer: CommandRenderer, x: number, y: number, width: number, height: number): void {
    const centerY = y + height / 2;
    const tubeHeight = 80;
    const throatReduction = (100 - this.constrictionSize) / 100 * tubeHeight / 2;

    // Tube shape (simplified as path description)
    // Wide section -> throat -> wide section
    renderer.drawRect(x, centerY - tubeHeight / 2, width * 0.3, tubeHeight, '#3a5a7c', { filled: true });

    // Throat (narrow section)
    const throatX = x + width * 0.35;
    const throatWidth = width * 0.3;
    renderer.drawRect(throatX, centerY - tubeHeight / 2 + throatReduction, throatWidth, tubeHeight - throatReduction * 2, '#3a5a7c', { filled: true });

    // Exit wide section
    renderer.drawRect(x + width * 0.7, centerY - tubeHeight / 2, width * 0.3, tubeHeight, '#3a5a7c', { filled: true });

    // Flow lines (animated)
    if (this.isFlowing) {
      const time = this.animationTime / 500;

      // Wide section flow (slow)
      for (let i = 0; i < 5; i++) {
        const offset = (time + i * 0.2) % 1;
        const flowX = x + 20 + offset * (width * 0.25);
        renderer.drawLine(flowX, centerY - 10, flowX + 20, centerY - 10, colors.flow, 3);
        renderer.drawLine(flowX, centerY + 10, flowX + 20, centerY + 10, colors.flow, 3);
      }

      // Throat flow (fast, compressed)
      for (let i = 0; i < 8; i++) {
        const offset = (time * 2 + i * 0.12) % 1;
        const flowX = throatX + offset * throatWidth;
        const halfHeight = (tubeHeight - throatReduction * 2) / 2 - 5;
        renderer.drawLine(flowX, centerY - halfHeight, flowX + 10, centerY - halfHeight, colors.accent, 2);
        renderer.drawLine(flowX, centerY + halfHeight, flowX + 10, centerY + halfHeight, colors.accent, 2);
      }

      // Exit wide section flow (slow again)
      for (let i = 0; i < 5; i++) {
        const offset = (time + i * 0.2) % 1;
        const flowX = x + width * 0.72 + offset * (width * 0.25);
        renderer.drawLine(flowX, centerY - 10, flowX + 20, centerY - 10, colors.flow, 3);
        renderer.drawLine(flowX, centerY + 10, flowX + 20, centerY + 10, colors.flow, 3);
      }
    }

    // Pressure indicators (manometer tubes)
    if (this.showPressure) {
      const wideP = this.getWidePressure();
      const narrowP = this.getNarrowPressure();

      // Left manometer
      renderer.drawRect(x + 40, y - 10, 20, 60, '#224466', { filled: true, borderRadius: 2 });
      renderer.drawRect(x + 43, y + 50 - wideP * 0.4, 14, wideP * 0.4, colors.pressure.high, { filled: true });
      renderer.drawText('P1', x + 50, y - 20, colors.pressure.high, '11px', { align: 'center' });

      // Middle manometer (at throat)
      const throatMidX = throatX + throatWidth / 2;
      renderer.drawRect(throatMidX - 10, y - 30, 20, 70, '#224466', { filled: true, borderRadius: 2 });
      renderer.drawRect(throatMidX - 7, y + 40 - Math.max(narrowP, 10) * 0.45, 14, Math.max(narrowP, 10) * 0.45, colors.pressure.low, { filled: true });
      renderer.drawText('P2', throatMidX, y - 40, colors.pressure.low, '11px', { align: 'center' });

      // Right manometer
      renderer.drawRect(x + width - 60, y - 10, 20, 60, '#224466', { filled: true, borderRadius: 2 });
      renderer.drawRect(x + width - 57, y + 50 - wideP * 0.4, 14, wideP * 0.4, colors.pressure.high, { filled: true });
      renderer.drawText('P3', x + width - 50, y - 20, colors.pressure.high, '11px', { align: 'center' });
    }

    // Velocity arrows
    if (this.showVelocity) {
      const wideV = this.getWideVelocity();
      const narrowV = Math.min(this.getNarrowVelocity(), 20);

      // Wide section velocity arrow
      renderer.drawLine(x + 30, y + height + 20, x + 30 + wideV * 15, y + height + 20, colors.velocity, 4);
      renderer.drawText(`v1=${wideV.toFixed(1)}`, x + 60, y + height + 45, colors.velocity, '11px', { align: 'center' });

      // Throat velocity arrow
      const throatMidX = throatX + throatWidth / 2;
      renderer.drawLine(throatMidX - narrowV * 4, y + height + 20, throatMidX + narrowV * 4, y + height + 20, colors.accent, 4);
      renderer.drawText(`v2=${this.getNarrowVelocity().toFixed(1)}`, throatMidX, y + height + 45, colors.accent, '11px', { align: 'center' });

      // Exit velocity arrow
      renderer.drawLine(x + width - 80, y + height + 20, x + width - 80 + wideV * 15, y + height + 20, colors.velocity, 4);
      renderer.drawText(`v3=${wideV.toFixed(1)}`, x + width - 50, y + height + 45, colors.velocity, '11px', { align: 'center' });
    }

    // Section labels
    renderer.drawText('Wide', x + width * 0.15, y + height + 70, colors.textMuted, '12px', { align: 'center' });
    renderer.drawText('Narrow', throatX + throatWidth / 2, y + height + 70, colors.textMuted, '12px', { align: 'center' });
    renderer.drawText('Wide', x + width * 0.85, y + height + 70, colors.textMuted, '12px', { align: 'center' });
  }

  private renderReview(renderer: CommandRenderer): void {
    renderer.drawText('The Venturi Effect Explained', 400, 80, colors.textPrimary, '24px', { align: 'center', fontWeight: 'bold' });

    // Continuity equation card
    renderer.drawRect(50, 120, 340, 140, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('Continuity Equation', 220, 150, colors.velocity, '18px', { align: 'center', fontWeight: 'bold' });
    renderer.drawRect(100, 170, 240, 40, colors.bgDark, { filled: true, borderRadius: 8 });
    renderer.drawText('A1 * v1 = A2 * v2', 220, 195, colors.primary, '18px', { align: 'center', fontWeight: 'bold' });
    renderer.drawText('Mass conservation: If area decreases,', 220, 230, colors.textSecondary, '12px', { align: 'center' });
    renderer.drawText('velocity must increase.', 220, 250, colors.textSecondary, '12px', { align: 'center' });

    // Bernoulli card
    renderer.drawRect(410, 120, 340, 140, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText("Bernoulli's Principle", 580, 150, colors.pressure.low, '18px', { align: 'center', fontWeight: 'bold' });
    renderer.drawRect(460, 170, 240, 40, colors.bgDark, { filled: true, borderRadius: 8 });
    renderer.drawText('P + 0.5*rho*v^2 = const', 580, 195, colors.accent, '18px', { align: 'center', fontWeight: 'bold' });
    renderer.drawText('Energy conservation: Higher velocity', 580, 230, colors.textSecondary, '12px', { align: 'center' });
    renderer.drawText('means lower pressure.', 580, 250, colors.textSecondary, '12px', { align: 'center' });

    // Complete picture
    renderer.drawRect(100, 280, 600, 180, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('The Complete Picture', 400, 310, colors.primary, '18px', { align: 'center', fontWeight: 'bold' });

    // Three sections visualization
    const sections = [
      { label: 'Wide Section', velocity: 'Slow velocity', pressure: 'High pressure', color: colors.pressure.high },
      { label: 'Narrow Section', velocity: 'Fast velocity', pressure: 'Low pressure', color: colors.pressure.low },
      { label: 'Wide Section', velocity: 'Slow velocity', pressure: 'High pressure', color: colors.pressure.high },
    ];

    sections.forEach((s, i) => {
      const x = 180 + i * 170;
      renderer.drawEllipse(x, 370, 40, 40, colors.bgCardLight, { filled: true });
      renderer.drawEllipse(x, 370, i === 1 ? 15 : 30, 30, s.color, { filled: true, alpha: 0.4 });
      renderer.drawText(s.label, x, 420, colors.textPrimary, '11px', { align: 'center' });
      renderer.drawText(s.velocity, x, 435, colors.velocity, '10px', { align: 'center' });
      renderer.drawText(s.pressure, x, 450, s.color, '10px', { align: 'center' });
    });

    // Arrows between sections
    renderer.drawText('->', 290, 370, colors.textMuted, '24px', { align: 'center' });
    renderer.drawText('->', 460, 370, colors.textMuted, '24px', { align: 'center' });

    // Application hint
    renderer.drawRect(150, 480, 500, 50, colors.bgCardLight, { filled: true, borderRadius: 8 });
    renderer.drawText('The low pressure at the narrow section can be used to draw in other fluids -', 400, 505, colors.textSecondary, '12px', { align: 'center' });
    renderer.drawText('the basis for carburetors, aspirators, and more!', 400, 520, colors.primary, '12px', { align: 'center' });
  }

  private renderTwistPredict(renderer: CommandRenderer): void {
    renderer.drawText('The Twist: Two Sheets of Paper', 400, 100, colors.textPrimary, '28px', { align: 'center', fontWeight: 'bold' });

    renderer.drawRect(100, 150, 600, 100, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('You hold two sheets of paper parallel to each other,', 400, 180, colors.textSecondary, '14px', { align: 'center' });
    renderer.drawText('about an inch apart, and blow BETWEEN them.', 400, 205, colors.textSecondary, '14px', { align: 'center' });
    renderer.drawText('What happens to the papers?', 400, 235, colors.accent, '16px', { align: 'center', fontWeight: 'bold' });

    const options = [
      { id: 'A', text: 'They move TOGETHER - low pressure between them' },
      { id: 'B', text: 'They move APART - air pushes them away' },
      { id: 'C', text: 'They stay still - air goes straight through' },
      { id: 'D', text: 'Only the front paper moves' },
    ];

    options.forEach((opt, i) => {
      const y = 270 + i * 60;
      const isSelected = this.twistPrediction === opt.id;
      const bgColor = isSelected ? colors.primary : colors.bgCardLight;
      renderer.drawRect(150, y, 500, 50, bgColor, { filled: true, borderRadius: 8 });
      renderer.drawText(`${opt.id}. ${opt.text}`, 400, y + 30, colors.textPrimary, '13px', { align: 'center' });
    });

    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'A';
      renderer.drawRect(150, 520, 500, 60, colors.bgCard, { filled: true, borderRadius: 12 });
      renderer.drawText(
        isCorrect ? 'Correct! Fast air = low pressure!' : 'Counter-intuitive, but true!',
        400, 545,
        isCorrect ? colors.success : colors.primary, '14px', { align: 'center' }
      );
      renderer.drawText('The Venturi effect creates low pressure between the papers.', 400, 570, colors.textSecondary, '12px', { align: 'center' });
    }
  }

  private renderTwistPlay(renderer: CommandRenderer): void {
    renderer.drawText('Papers Pulled Together', 400, 80, colors.textPrimary, '24px', { align: 'center', fontWeight: 'bold' });

    // Paper demo visualization
    renderer.drawRect(100, 130, 600, 250, colors.bgCard, { filled: true, borderRadius: 12 });

    // Face blowing
    renderer.drawEllipse(200, 260, 40, 50, '#ffcc99', { filled: true }); // Head
    renderer.drawEllipse(185, 245, 6, 8, '#333', { filled: true }); // Left eye
    renderer.drawEllipse(210, 245, 6, 8, '#333', { filled: true }); // Right eye
    // Puckered lips
    renderer.drawEllipse(245, 260, 10, 6, '#cc8877', { filled: true });

    // Air stream
    if (this.isBlowing) {
      renderer.drawLine(260, 260, 550, 260, colors.flow, 12, { alpha: 0.3 });
      renderer.drawLine(260, 260, 550, 260, colors.accent, 6, { alpha: 0.5 });
    }

    // Papers
    const topY = 260 - this.paperGap;
    const bottomY = 260 + this.paperGap - 6;

    renderer.drawRect(350, topY, 150, 6, colors.textPrimary, { filled: true, borderRadius: 2 });
    renderer.drawRect(350, bottomY, 150, 6, colors.textPrimary, { filled: true, borderRadius: 2 });

    // Pressure labels when blowing
    if (this.isBlowing) {
      renderer.drawText('LOW P', 425, 262, colors.pressure.low, '12px', { align: 'center', fontWeight: 'bold' });
      renderer.drawText('HIGH P', 425, topY - 15, colors.pressure.high, '10px', { align: 'center' });
      renderer.drawText('HIGH P', 425, bottomY + 20, colors.pressure.high, '10px', { align: 'center' });
    }

    // Instruction
    if (!this.isBlowing) {
      renderer.drawText('Click to blow!', 550, 260, colors.textMuted, '14px', { align: 'center' });
    }

    // Blow button
    renderer.drawRect(300, 400, 200, 45, this.isBlowing ? colors.bgCardLight : colors.accent, { filled: true, borderRadius: 8 });
    renderer.drawText(this.isBlowing ? 'Blowing...' : 'Blow Between Papers', 400, 427, colors.textPrimary, '14px', { align: 'center', fontWeight: 'bold' });

    // Explanation
    renderer.drawText('The papers come together - not apart!', 400, 470, colors.textSecondary, '14px', { align: 'center' });
  }

  private renderTwistReview(renderer: CommandRenderer): void {
    renderer.drawText('The Venturi Effect Everywhere', 400, 80, colors.textPrimary, '24px', { align: 'center', fontWeight: 'bold' });

    // Pressure difference explanation
    renderer.drawRect(100, 120, 600, 200, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('Pressure Difference in Action', 400, 155, colors.accent, '18px', { align: 'center', fontWeight: 'bold' });

    // Three zones
    renderer.drawRect(150, 180, 200, 60, colors.bgCardLight, { filled: true, borderRadius: 8 });
    renderer.drawText('Between the papers:', 250, 200, colors.pressure.low, '12px', { align: 'center', fontWeight: 'bold' });
    renderer.drawText('Fast air = Low pressure', 250, 225, colors.textSecondary, '11px', { align: 'center' });

    renderer.drawRect(450, 180, 200, 60, colors.bgCardLight, { filled: true, borderRadius: 8 });
    renderer.drawText('Outside the papers:', 550, 200, colors.pressure.high, '12px', { align: 'center', fontWeight: 'bold' });
    renderer.drawText('Still air = High pressure', 550, 225, colors.textSecondary, '11px', { align: 'center' });

    renderer.drawRect(250, 260, 300, 50, colors.success, { filled: true, borderRadius: 8, alpha: 0.2 });
    renderer.drawText('Result: Higher outside pressure', 400, 280, colors.success, '12px', { align: 'center', fontWeight: 'bold' });
    renderer.drawText('pushes papers inward!', 400, 300, colors.success, '12px', { align: 'center' });

    // Additional examples
    renderer.drawRect(100, 340, 600, 120, colors.bgCardLight, { filled: true, borderRadius: 12 });
    renderer.drawText('Same principle explains:', 400, 370, colors.textPrimary, '16px', { align: 'center', fontWeight: 'bold' });
    renderer.drawText('* Trains create suction as they pass', 400, 400, colors.textSecondary, '13px', { align: 'center' });
    renderer.drawText('* Shower curtains blow inward', 400, 425, colors.textSecondary, '13px', { align: 'center' });
    renderer.drawText('* Airplane wings generate lift', 400, 450, colors.textSecondary, '13px', { align: 'center' });
  }

  private renderTransfer(renderer: CommandRenderer): void {
    renderer.drawText('Real-World Applications', 400, 80, colors.textPrimary, '24px', { align: 'center', fontWeight: 'bold' });

    applications.forEach((app, i) => {
      const x = 100 + (i % 2) * 320;
      const y = 130 + Math.floor(i / 2) * 180;
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

      renderer.drawText(app.title, x + 140, y + 35, colors.textPrimary, '14px', { align: 'center', fontWeight: 'bold' });
      renderer.drawText(app.tagline, x + 140, y + 55, colors.textMuted, '10px', { align: 'center' });

      // Word wrap description
      const words = app.description.split(' ');
      let line1 = '';
      let line2 = '';
      let line3 = '';
      words.forEach(word => {
        if ((line1 + word).length < 35) {
          line1 += word + ' ';
        } else if ((line2 + word).length < 35) {
          line2 += word + ' ';
        } else {
          line3 += word + ' ';
        }
      });
      renderer.drawText(line1.trim(), x + 140, y + 85, colors.textSecondary, '11px', { align: 'center' });
      renderer.drawText(line2.trim(), x + 140, y + 100, colors.textSecondary, '11px', { align: 'center' });
      renderer.drawText(line3.trim(), x + 140, y + 115, colors.textSecondary, '11px', { align: 'center' });

      if (isCompleted) {
        renderer.drawText('Understood', x + 140, y + 135, colors.success, '11px', { align: 'center' });
      }
    });

    // Progress
    renderer.drawText(`Completed: ${this.completedApps.size}/${applications.length}`, 400, 520, colors.textSecondary, '14px', { align: 'center' });

    if (this.completedApps.size >= 3) {
      renderer.drawRect(300, 545, 200, 40, colors.success, { filled: true, borderRadius: 8 });
      renderer.drawText('Take the Knowledge Test', 400, 570, colors.textPrimary, '12px', { align: 'center', fontWeight: 'bold' });
    }
  }

  private renderTest(renderer: CommandRenderer): void {
    renderer.drawText('Knowledge Test', 400, 60, colors.textPrimary, '24px', { align: 'center', fontWeight: 'bold' });

    const answeredCount = this.testAnswers.filter(a => a !== undefined && a >= 0).length;
    renderer.drawText(`Questions Answered: ${answeredCount}/${testQuestions.length}`, 400, 90, colors.textSecondary, '14px', { align: 'center' });

    // Show current question
    const currentQ = this.testAnswers.findIndex(a => a === undefined || a < 0);
    const qIndex = currentQ >= 0 ? currentQ : 0;

    if (qIndex < testQuestions.length) {
      const q = testQuestions[qIndex];

      renderer.drawRect(50, 120, 700, 70, colors.bgCard, { filled: true, borderRadius: 12 });
      renderer.drawText(`Q${qIndex + 1}: ${q.question}`, 400, 160, colors.textPrimary, '13px', { align: 'center' });

      q.options.forEach((opt, i) => {
        const y = 210 + i * 55;
        const isSelected = this.testAnswers[qIndex] === i;
        renderer.drawRect(100, y, 600, 45, isSelected ? colors.primary : colors.bgCardLight, { filled: true, borderRadius: 8 });

        // Truncate long options
        const displayText = opt.length > 65 ? opt.substring(0, 62) + '...' : opt;
        renderer.drawText(displayText, 400, y + 28, colors.textPrimary, '11px', { align: 'center' });
      });
    }

    // Show score if all answered
    if (answeredCount === testQuestions.length) {
      const score = this.testAnswers.reduce((acc, ans, i) => acc + (ans === testQuestions[i].correctIndex ? 1 : 0), 0);
      renderer.drawRect(250, 480, 300, 80, colors.bgCard, { filled: true, borderRadius: 12 });
      renderer.drawText(`Score: ${score}/${testQuestions.length}`, 400, 515, score >= 7 ? colors.success : colors.warning, '24px', { align: 'center', fontWeight: 'bold' });

      if (score >= 7) {
        renderer.drawText('Great job! Claim Your Mastery Badge!', 400, 545, colors.success, '14px', { align: 'center' });
      }
    }
  }

  private renderMastery(renderer: CommandRenderer): void {
    // Trophy icon placeholder
    renderer.drawText('Venturi Effect Master!', 400, 140, colors.textPrimary, '36px', { align: 'center', fontWeight: 'bold' });

    renderer.drawRect(150, 180, 500, 280, colors.bgCard, { filled: true, borderRadius: 16 });

    renderer.drawText("You've mastered:", 400, 220, colors.textSecondary, '16px', { align: 'center' });

    const mastered = [
      'A1*v1 = A2*v2 - Continuity (mass conservation)',
      'Narrow section = faster velocity',
      'P + 0.5*rho*v^2 = const - Bernoulli principle',
      'Faster velocity = lower pressure',
      'Applications: carburetors, aspirators, masks, burners',
    ];

    mastered.forEach((item, i) => {
      renderer.drawText(`* ${item}`, 400, 260 + i * 30, colors.success, '12px', { align: 'center' });
    });

    // Key insight
    renderer.drawRect(150, 480, 500, 60, colors.primary, { filled: true, borderRadius: 12, alpha: 0.3 });
    renderer.drawText('Now you understand why covering a hose makes water shoot farther!', 400, 515, colors.primary, '14px', { align: 'center', fontWeight: 'bold' });

    // Action buttons
    renderer.drawRect(200, 560, 150, 35, colors.bgCardLight, { filled: true, borderRadius: 8 });
    renderer.drawText('Start Over', 275, 582, colors.textPrimary, '12px', { align: 'center' });

    renderer.drawRect(450, 560, 150, 35, colors.primary, { filled: true, borderRadius: 8 });
    renderer.drawText('Explore More', 525, 582, colors.textPrimary, '12px', { align: 'center' });
  }

  // === UI STATE FOR CLIENT ===

  private getUIState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      testAnswersCount: this.testAnswers.filter(a => a !== undefined && a >= 0).length,
      completedAppsCount: this.completedApps.size,
      flowRate: this.flowRate,
      constrictionSize: this.constrictionSize,
      showPressure: this.showPressure,
      showVelocity: this.showVelocity,
      isFlowing: this.isFlowing,
      wideVelocity: this.getWideVelocity(),
      narrowVelocity: this.getNarrowVelocity(),
      widePressure: this.getWidePressure(),
      narrowPressure: this.getNarrowPressure(),
      areaRatio: this.getAreaRatio(),
      isBlowing: this.isBlowing,
      paperGap: this.paperGap,
      canProceedToTest: this.completedApps.size >= 3,
      testScore: this.testAnswers.filter(a => a !== undefined && a >= 0).length === testQuestions.length
        ? this.testAnswers.reduce((acc, ans, i) => acc + (ans === testQuestions[i].correctIndex ? 1 : 0), 0)
        : null,
      canProceedToMastery: this.testAnswers.filter(a => a !== undefined && a >= 0).length === testQuestions.length &&
        this.testAnswers.reduce((acc, ans, i) => acc + (ans === testQuestions[i].correctIndex ? 1 : 0), 0) >= 7,
    };
  }
}

// === FACTORY FUNCTION ===

export function createVenturiEffectGame(sessionId: string): VenturiEffectGame {
  return new VenturiEffectGame(sessionId);
}
