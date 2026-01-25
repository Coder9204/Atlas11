/**
 * Total Internal Reflection Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Critical angle formula: sin(theta_c) = n2/n1
 * - Snell's law: n1*sin(theta1) = n2*sin(theta2)
 * - TIR occurs when angle > critical angle AND going from higher to lower n
 * - Light trapped in water stream (fiber optic principle)
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
    question: 'What is the critical angle for total internal reflection?',
    options: [
      'The angle at which light refracts at 90 degrees',
      'The minimum angle for any refraction to occur',
      'The angle at which all light reflects back into the denser medium',
      '45 degrees for all materials',
    ],
    correctIndex: 2,
  },
  {
    question: 'Total internal reflection can ONLY occur when light travels:',
    options: [
      'From a less dense to a more dense medium',
      'From a more dense (higher n) to a less dense (lower n) medium',
      'Perpendicular to the surface',
      'Through a vacuum',
    ],
    correctIndex: 1,
  },
  {
    question: 'What is the critical angle for water (n=1.33) to air (n=1.0)?',
    options: [
      'About 23 degrees',
      'About 49 degrees',
      'About 67 degrees',
      '90 degrees',
    ],
    correctIndex: 1,
  },
  {
    question: 'How do fiber optic cables trap light inside?',
    options: [
      'Mirrors at each end reflect light back',
      'The glass absorbs all escaping light',
      'Total internal reflection keeps light bouncing inside the core',
      'Magnetic fields guide the light',
    ],
    correctIndex: 2,
  },
  {
    question: 'Why does light stay trapped in a curved water stream?',
    options: [
      'Water molecules absorb and re-emit the light',
      'Total internal reflection at the water-air boundary keeps light inside',
      'The water acts like a lens focusing light forward',
      'Gravity bends the light to follow the water',
    ],
    correctIndex: 1,
  },
  {
    question: "If a material's refractive index increases, its critical angle:",
    options: [
      'Increases',
      'Decreases (allowing TIR at smaller angles)',
      'Stays the same',
      'Becomes undefined',
    ],
    correctIndex: 1,
  },
  {
    question: 'Diamonds sparkle intensely because:',
    options: [
      'They have a very high refractive index (n=2.42) giving a small critical angle',
      'They are transparent',
      'They are cut with many flat surfaces',
      'They emit light from within',
    ],
    correctIndex: 0,
  },
  {
    question: "Snell's law states that:",
    options: [
      'Light always travels in straight lines',
      'n1 * sin(theta1) = n2 * sin(theta2)',
      'The critical angle is always 42 degrees',
      'Reflection angle equals refraction angle',
    ],
    correctIndex: 1,
  },
  {
    question: 'A prism can create a rainbow because:',
    options: [
      'Each color has a different refractive index',
      'Light is absorbed and re-emitted at different angles',
      'The prism rotates light',
      'Total internal reflection separates colors',
    ],
    correctIndex: 0,
  },
  {
    question: 'Medical endoscopes use total internal reflection to:',
    options: [
      'Sterilize instruments',
      'Transmit images through flexible fiber optic bundles',
      'Heat tissue for surgery',
      'Create X-ray images',
    ],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
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
  waterGlow: 'rgba(56, 189, 248, 0.3)',
  light: '#22d3ee',
  lightGlow: 'rgba(34, 211, 238, 0.5)',
  trapped: '#f472b6',
  glass: '#a5f3fc',
};

// === APPLICATION DATA ===
interface Application {
  title: string;
  icon: string;
  description: string;
}

const applications: Application[] = [
  {
    title: 'Fiber Optics',
    icon: 'cable',
    description: 'Internet data travels as light trapped inside glass fibers through total internal reflection.',
  },
  {
    title: 'Diamond Brilliance',
    icon: 'gem',
    description: "Diamond's high refractive index (2.42) creates a small critical angle, trapping light inside.",
  },
  {
    title: 'Endoscopes',
    icon: 'medical',
    description: 'Doctors see inside the body using fiber optic bundles that transmit light through TIR.',
  },
  {
    title: 'Reflective Prisms',
    icon: 'prism',
    description: 'Binoculars use prisms with TIR instead of mirrors for sharper, brighter images.',
  },
];

// === MAIN GAME CLASS ===

export class TotalInternalReflectionGame extends BaseGame {
  readonly gameType = 'total_internal_reflection';
  readonly gameTitle = 'Total Internal Reflection';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private testAnswers: number[] = [];
  private completedApps: Set<number> = new Set();

  // --- SIMULATION STATE ---
  private incidentAngle: number = 30;
  private mediumType: 'water' | 'glass' | 'diamond' = 'water';
  private showTrappedLight: boolean = false;
  private waterFlowing: boolean = false;
  private animationTime: number = 0;

  // === PROTECTED PHYSICS METHODS ===

  // PROTECTED: Refractive indices (never sent to client)
  private getRefractiveIndex(medium: string): number {
    const indices: Record<string, number> = {
      air: 1.0,
      water: 1.33,
      glass: 1.5,
      diamond: 2.42,
    };
    return indices[medium] || 1.0;
  }

  // PROTECTED: Calculate critical angle (hidden from client)
  private getCriticalAngle(medium: string): number {
    const n1 = this.getRefractiveIndex(medium);
    const n2 = 1.0; // air
    // sin(theta_c) = n2/n1
    return (Math.asin(n2 / n1) * 180) / Math.PI;
  }

  // PROTECTED: Calculate refraction angle using Snell's law
  private getRefractionAngle(incidentAngle: number, n1: number, n2: number): number | null {
    const sinTheta2 = (n1 * Math.sin((incidentAngle * Math.PI) / 180)) / n2;
    if (Math.abs(sinTheta2) > 1) return null; // TIR
    return (Math.asin(sinTheta2) * 180) / Math.PI;
  }

  // PROTECTED: Check if TIR occurs
  private isTotalInternalReflection(): boolean {
    const criticalAngle = this.getCriticalAngle(this.mediumType);
    return this.incidentAngle > criticalAngle;
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
      incidentAngle: this.incidentAngle,
      mediumType: this.mediumType,
      showTrappedLight: this.showTrappedLight,
      waterFlowing: this.waterFlowing,
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.prediction !== undefined) this.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
    if (state.incidentAngle !== undefined) this.incidentAngle = state.incidentAngle as number;
    if (state.mediumType) this.mediumType = state.mediumType as 'water' | 'glass' | 'diamond';
    if (state.showTrappedLight !== undefined) this.showTrappedLight = state.showTrappedLight as boolean;
    if (state.waterFlowing !== undefined) this.waterFlowing = state.waterFlowing as boolean;
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

      case 'set_angle':
        if (input.payload?.angle !== undefined) {
          this.incidentAngle = Math.max(0, Math.min(90, input.payload.angle as number));
        }
        break;

      case 'set_medium':
        if (input.payload?.medium) {
          this.mediumType = input.payload.medium as 'water' | 'glass' | 'diamond';
        }
        break;

      case 'toggle_water_flow':
        this.waterFlowing = !this.waterFlowing;
        break;

      case 'toggle_trapped_light':
        this.showTrappedLight = !this.showTrappedLight;
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
    renderer.drawText('Total Internal Reflection', 20, 30, colors.textSecondary, '14px');

    // Phase dots
    const dotStartX = 400;
    phases.forEach((_, i) => {
      const x = dotStartX + i * 20;
      const color = i < currentIndex ? colors.success : i === currentIndex ? colors.accent : colors.border;
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
    renderer.drawText(phaseNames[this.phase], 700, 30, colors.accent, '14px');
  }

  private renderHook(renderer: CommandRenderer): void {
    // Badge
    renderer.drawText('OPTICS', 400, 100, colors.accent, '14px', { align: 'center' });

    // Title
    renderer.drawText('Light Trapped in Water', 400, 150, colors.textPrimary, '32px', { align: 'center', fontWeight: 'bold' });

    // Subtitle
    renderer.drawText('How can light follow a curved path?', 400, 190, colors.textSecondary, '18px', { align: 'center' });

    // Animated water stream with light
    this.renderWaterStreamDemo(renderer);

    // Hook text
    renderer.drawRect(200, 400, 400, 80, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('Light traveling through a water stream stays', 400, 430, colors.textSecondary, '14px', { align: 'center' });
    renderer.drawText('INSIDE - even when the stream curves!', 400, 455, colors.trapped, '16px', { align: 'center', fontWeight: 'bold' });

    // CTA Button
    renderer.drawRect(300, 500, 200, 50, colors.primary, { filled: true, borderRadius: 12 });
    renderer.drawText('Discover How', 400, 530, colors.textPrimary, '16px', { align: 'center', fontWeight: 'bold' });
  }

  private renderWaterStreamDemo(renderer: CommandRenderer): void {
    const time = this.animationTime / 1000;

    // Faucet
    renderer.drawRect(200, 220, 60, 40, colors.bgCardLight, { filled: true, borderRadius: 4 });

    // Water stream (curved path)
    const streamPoints: [number, number][] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const x = 230 + t * 200;
      const y = 260 + Math.pow(t, 2) * 100;
      streamPoints.push([x, y]);
    }

    // Draw water stream
    renderer.drawPath(streamPoints, colors.water, { strokeWidth: 25, alpha: 0.6 });

    // Light beam inside water
    const lightOffset = (time * 50) % 200;
    for (let i = 0; i < 5; i++) {
      const offset = (lightOffset + i * 40) % 200;
      const t = offset / 200;
      if (t < 1) {
        const x = 230 + t * 200;
        const y = 260 + Math.pow(t, 2) * 100;
        renderer.drawEllipse(x, y, 8, 8, colors.trapped, { filled: true, alpha: 0.9 });
        renderer.drawEllipse(x, y, 12, 12, colors.trapped, { filled: true, alpha: 0.3 });
      }
    }
  }

  private renderPredict(renderer: CommandRenderer): void {
    renderer.drawText('Make Your Prediction', 400, 100, colors.textPrimary, '28px', { align: 'center', fontWeight: 'bold' });

    // Question card
    renderer.drawRect(100, 140, 600, 100, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('When light hits a water surface from inside at a steep angle,', 400, 175, colors.textSecondary, '16px', { align: 'center' });
    renderer.drawText('what happens to the light?', 400, 205, colors.textSecondary, '16px', { align: 'center' });

    // Options
    const options = [
      { id: 'A', text: 'It always passes through to the air' },
      { id: 'B', text: 'It reflects back into the water' },
      { id: 'C', text: 'It disappears (absorbed)' },
      { id: 'D', text: 'It slows down and stops' },
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
      const isCorrect = this.prediction === 'B';
      const feedbackColor = isCorrect ? colors.success : colors.accent;
      renderer.drawRect(150, 520, 500, 60, colors.bgCard, { filled: true, borderRadius: 12 });
      renderer.drawText(
        isCorrect ? 'Correct! This is total internal reflection!' : 'This is called total internal reflection',
        400, 555,
        feedbackColor, '14px', { align: 'center' }
      );
    }
  }

  private renderPlay(renderer: CommandRenderer): void {
    renderer.drawText('TIR Simulator', 400, 80, colors.textPrimary, '24px', { align: 'center', fontWeight: 'bold' });

    // Medium selection
    const mediums = [
      { id: 'water', label: 'Water (n=1.33)', angle: 49 },
      { id: 'glass', label: 'Glass (n=1.5)', angle: 42 },
      { id: 'diamond', label: 'Diamond (n=2.42)', angle: 24 },
    ];

    mediums.forEach((m, i) => {
      const x = 150 + i * 180;
      const isSelected = this.mediumType === m.id;
      renderer.drawRect(x, 110, 160, 40, isSelected ? colors.primary : colors.bgCardLight, { filled: true, borderRadius: 8 });
      renderer.drawText(m.label, x + 80, 135, colors.textPrimary, '12px', { align: 'center' });
    });

    // Main simulation area
    renderer.drawRect(100, 170, 600, 300, colors.bgCard, { filled: true, borderRadius: 12 });

    // Medium (bottom half)
    const mediumColor = this.mediumType === 'water' ? colors.water :
                        this.mediumType === 'glass' ? colors.glass :
                        '#a78bfa'; // diamond
    renderer.drawRect(100, 320, 600, 150, mediumColor, { filled: true, alpha: 0.4 });

    // Interface line
    renderer.drawLine(100, 320, 700, 320, colors.textMuted, 2);
    renderer.drawText('Interface', 720, 325, colors.textMuted, '12px');

    // Normal line (dashed)
    renderer.drawLine(400, 170, 400, 470, colors.textMuted, 1, { dashed: true });
    renderer.drawText('Normal', 410, 180, colors.textMuted, '10px');

    // Critical angle indicator
    const criticalAngle = this.getCriticalAngle(this.mediumType);
    const criticalRad = (criticalAngle * Math.PI) / 180;
    renderer.drawArc(400, 320, 60, Math.PI / 2, Math.PI / 2 + criticalRad, colors.warning, 2);
    renderer.drawText(`Critical: ${criticalAngle.toFixed(1)}deg`, 480, 350, colors.warning, '12px');

    // Incident ray
    const incidentRad = (this.incidentAngle * Math.PI) / 180;
    const rayLength = 120;
    const startX = 400 - Math.sin(incidentRad) * rayLength;
    const startY = 320 + Math.cos(incidentRad) * rayLength;
    renderer.drawLine(startX, startY, 400, 320, colors.light, 4);

    // Arrow on incident ray
    renderer.drawEllipse(400, 320, 5, 5, colors.light, { filled: true });

    // Reflected/refracted ray
    const isTIR = this.isTotalInternalReflection();
    if (isTIR) {
      // Total internal reflection
      const reflectX = 400 + Math.sin(incidentRad) * rayLength;
      const reflectY = 320 + Math.cos(incidentRad) * rayLength;
      renderer.drawLine(400, 320, reflectX, reflectY, colors.trapped, 4);
      renderer.drawText('TOTAL INTERNAL REFLECTION!', 400, 500, colors.trapped, '18px', { align: 'center', fontWeight: 'bold' });
    } else {
      // Refraction
      const n1 = this.getRefractiveIndex(this.mediumType);
      const refractionAngle = this.getRefractionAngle(this.incidentAngle, n1, 1.0);
      if (refractionAngle !== null) {
        const refractRad = (refractionAngle * Math.PI) / 180;
        const refractX = 400 + Math.sin(refractRad) * rayLength;
        const refractY = 320 - Math.cos(refractRad) * rayLength;
        renderer.drawLine(400, 320, refractX, refractY, colors.accent, 3);

        // Partial reflection
        const partialReflectX = 400 + Math.sin(incidentRad) * (rayLength * 0.5);
        const partialReflectY = 320 + Math.cos(incidentRad) * (rayLength * 0.5);
        renderer.drawLine(400, 320, partialReflectX, partialReflectY, colors.light, 2, { alpha: 0.3 });
      }
      renderer.drawText('Partial refraction + reflection', 400, 500, colors.accent, '14px', { align: 'center' });
    }

    // Angle slider display
    renderer.drawText(`Incident Angle: ${this.incidentAngle.toFixed(0)}deg`, 400, 530, colors.textPrimary, '16px', { align: 'center' });

    // Angle arc indicator
    renderer.drawArc(400, 320, 40, Math.PI / 2, Math.PI / 2 + incidentRad, colors.light, 2);
  }

  private renderReview(renderer: CommandRenderer): void {
    renderer.drawText('The Physics of Total Internal Reflection', 400, 80, colors.textPrimary, '24px', { align: 'center', fontWeight: 'bold' });

    // Snell's Law card
    renderer.drawRect(50, 120, 340, 150, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText("Snell's Law", 220, 155, colors.accent, '18px', { align: 'center', fontWeight: 'bold' });
    renderer.drawRect(100, 175, 240, 40, colors.bgDark, { filled: true, borderRadius: 8 });
    renderer.drawText('n1 sin(th1) = n2 sin(th2)', 220, 200, colors.light, '16px', { align: 'center' });
    renderer.drawText('Light bends when entering a new medium', 220, 250, colors.textSecondary, '12px', { align: 'center' });

    // Critical Angle card
    renderer.drawRect(410, 120, 340, 150, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('Critical Angle', 580, 155, colors.warning, '18px', { align: 'center', fontWeight: 'bold' });
    renderer.drawRect(460, 175, 240, 40, colors.bgDark, { filled: true, borderRadius: 8 });
    renderer.drawText('sin(thc) = n2/n1', 580, 200, colors.warning, '16px', { align: 'center' });
    renderer.drawText('Beyond this angle = 100% reflection', 580, 250, colors.textSecondary, '12px', { align: 'center' });

    // Requirements
    renderer.drawRect(100, 290, 600, 120, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('TIR Requirements:', 400, 325, colors.trapped, '18px', { align: 'center', fontWeight: 'bold' });
    renderer.drawText('1. Light travels from HIGH to LOW refractive index', 400, 360, colors.textSecondary, '14px', { align: 'center' });
    renderer.drawText('2. Angle of incidence > Critical angle', 400, 390, colors.textSecondary, '14px', { align: 'center' });

    // Critical angles for different materials
    renderer.drawRect(100, 430, 600, 100, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('Critical Angles (to air):', 400, 460, colors.textPrimary, '16px', { align: 'center' });

    const materials = [
      { name: 'Water', angle: '49deg', color: colors.water },
      { name: 'Glass', angle: '42deg', color: colors.glass },
      { name: 'Diamond', angle: '24deg', color: '#a78bfa' },
    ];

    materials.forEach((m, i) => {
      const x = 200 + i * 200;
      renderer.drawText(m.name, x, 490, m.color, '14px', { align: 'center' });
      renderer.drawText(m.angle, x, 515, colors.textMuted, '12px', { align: 'center' });
    });
  }

  private renderTwistPredict(renderer: CommandRenderer): void {
    renderer.drawText('The Twist: Light in a Fiber', 400, 100, colors.textPrimary, '28px', { align: 'center', fontWeight: 'bold' });

    renderer.drawRect(100, 150, 600, 100, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('A fiber optic cable is bent into a curve.', 400, 185, colors.textSecondary, '16px', { align: 'center' });
    renderer.drawText('What happens to the light inside?', 400, 220, colors.textSecondary, '16px', { align: 'center' });

    const options = [
      { id: 'A', text: 'Light follows the curve - stays trapped inside' },
      { id: 'B', text: 'Light escapes at the bend' },
      { id: 'C', text: 'Light reflects backward' },
      { id: 'D', text: 'Light stops at the curve' },
    ];

    options.forEach((opt, i) => {
      const y = 280 + i * 60;
      const isSelected = this.twistPrediction === opt.id;
      const bgColor = isSelected ? colors.primary : colors.bgCardLight;
      renderer.drawRect(150, y, 500, 50, bgColor, { filled: true, borderRadius: 8 });
      renderer.drawText(`${opt.id}. ${opt.text}`, 400, y + 30, colors.textPrimary, '14px', { align: 'center' });
    });

    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'A';
      renderer.drawRect(150, 530, 500, 50, colors.bgCard, { filled: true, borderRadius: 12 });
      renderer.drawText(
        isCorrect ? 'Correct! TIR keeps light trapped even in curves!' : 'TIR keeps light inside regardless of bends!',
        400, 560,
        isCorrect ? colors.success : colors.accent, '14px', { align: 'center' }
      );
    }
  }

  private renderTwistPlay(renderer: CommandRenderer): void {
    renderer.drawText('Fiber Optic Demonstration', 400, 80, colors.textPrimary, '24px', { align: 'center', fontWeight: 'bold' });

    // Draw curved fiber
    renderer.drawRect(100, 120, 600, 300, colors.bgCard, { filled: true, borderRadius: 12 });

    // Fiber optic cable (curved path)
    const fiberPoints: [number, number][] = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      const x = 150 + t * 500;
      const y = 270 + Math.sin(t * Math.PI * 2) * 80;
      fiberPoints.push([x, y]);
    }

    // Outer cladding
    renderer.drawPath(fiberPoints, colors.bgCardLight, { strokeWidth: 30 });
    // Inner core
    renderer.drawPath(fiberPoints, colors.glass, { strokeWidth: 20, alpha: 0.6 });

    // Light pulses traveling through fiber
    const time = this.animationTime / 1000;
    for (let i = 0; i < 5; i++) {
      const offset = ((time * 0.5 + i * 0.2) % 1);
      const x = 150 + offset * 500;
      const y = 270 + Math.sin(offset * Math.PI * 2) * 80;
      renderer.drawEllipse(x, y, 8, 8, colors.light, { filled: true });
      renderer.drawEllipse(x, y, 12, 12, colors.light, { filled: true, alpha: 0.4 });
    }

    // Arrows showing TIR bounces
    renderer.drawText('Light bounces inside via TIR', 400, 450, colors.light, '16px', { align: 'center' });

    // Info panel
    renderer.drawRect(150, 470, 500, 80, colors.bgCardLight, { filled: true, borderRadius: 12 });
    renderer.drawText('Each bounce is a total internal reflection', 400, 495, colors.textSecondary, '14px', { align: 'center' });
    renderer.drawText('Light travels miles with minimal loss!', 400, 525, colors.success, '14px', { align: 'center' });
  }

  private renderTwistReview(renderer: CommandRenderer): void {
    renderer.drawText('Why Fiber Optics Work', 400, 80, colors.textPrimary, '24px', { align: 'center', fontWeight: 'bold' });

    // Core vs Cladding
    renderer.drawRect(50, 120, 340, 200, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('Fiber Structure', 220, 155, colors.accent, '18px', { align: 'center', fontWeight: 'bold' });

    // Simple fiber cross-section
    renderer.drawEllipse(220, 230, 60, 60, colors.bgCardLight, { filled: true });
    renderer.drawEllipse(220, 230, 40, 40, colors.glass, { filled: true, alpha: 0.7 });
    renderer.drawText('Core (high n)', 220, 300, colors.glass, '12px', { align: 'center' });
    renderer.drawText('Cladding (low n)', 310, 230, colors.textMuted, '10px');

    // TIR explanation
    renderer.drawRect(410, 120, 340, 200, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('How It Works', 580, 155, colors.trapped, '18px', { align: 'center', fontWeight: 'bold' });
    renderer.drawText('Core has higher refractive index', 580, 195, colors.textSecondary, '12px', { align: 'center' });
    renderer.drawText('Light hits cladding at steep angle', 580, 225, colors.textSecondary, '12px', { align: 'center' });
    renderer.drawText('TIR bounces light back into core', 580, 255, colors.textSecondary, '12px', { align: 'center' });
    renderer.drawText('Repeats billions of times!', 580, 285, colors.success, '12px', { align: 'center', fontWeight: 'bold' });

    // Applications preview
    renderer.drawRect(100, 350, 600, 150, colors.bgCard, { filled: true, borderRadius: 12 });
    renderer.drawText('Applications of TIR:', 400, 385, colors.textPrimary, '18px', { align: 'center', fontWeight: 'bold' });

    const apps = ['Internet', 'Medical Scopes', 'Sensors', 'Displays'];
    apps.forEach((app, i) => {
      const x = 180 + i * 150;
      renderer.drawEllipse(x, 440, 30, 30, colors.primary, { filled: true, alpha: 0.3 });
      renderer.drawText(app, x, 480, colors.textSecondary, '12px', { align: 'center' });
    });
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
      renderer.drawText(line1.trim(), x + 140, y + 80, colors.textSecondary, '12px', { align: 'center' });
      renderer.drawText(line2.trim(), x + 140, y + 100, colors.textSecondary, '12px', { align: 'center' });

      if (isCompleted) {
        renderer.drawText('Completed', x + 140, y + 130, colors.success, '12px', { align: 'center' });
      }
    });

    // Progress
    renderer.drawText(`Completed: ${this.completedApps.size}/${applications.length}`, 400, 520, colors.textSecondary, '14px', { align: 'center' });

    if (this.completedApps.size >= 3) {
      renderer.drawRect(300, 540, 200, 40, colors.success, { filled: true, borderRadius: 8 });
      renderer.drawText('Take the Test', 400, 565, colors.textPrimary, '14px', { align: 'center', fontWeight: 'bold' });
    }
  }

  private renderTest(renderer: CommandRenderer): void {
    renderer.drawText('Knowledge Test', 400, 60, colors.textPrimary, '24px', { align: 'center', fontWeight: 'bold' });

    const answeredCount = this.testAnswers.filter(a => a !== undefined && a >= 0).length;
    renderer.drawText(`Questions Answered: ${answeredCount}/${testQuestions.length}`, 400, 90, colors.textSecondary, '14px', { align: 'center' });

    // Show current question (simplified view - showing first unanswered)
    const currentQ = this.testAnswers.findIndex(a => a === undefined || a < 0);
    const qIndex = currentQ >= 0 ? currentQ : 0;

    if (qIndex < testQuestions.length) {
      const q = testQuestions[qIndex];

      renderer.drawRect(50, 120, 700, 100, colors.bgCard, { filled: true, borderRadius: 12 });
      renderer.drawText(`Q${qIndex + 1}: ${q.question}`, 400, 175, colors.textPrimary, '14px', { align: 'center' });

      q.options.forEach((opt, i) => {
        const y = 250 + i * 55;
        const isSelected = this.testAnswers[qIndex] === i;
        renderer.drawRect(100, y, 600, 45, isSelected ? colors.primary : colors.bgCardLight, { filled: true, borderRadius: 8 });
        renderer.drawText(opt, 400, y + 28, colors.textPrimary, '12px', { align: 'center' });
      });
    }

    // Show score if all answered
    if (answeredCount === testQuestions.length) {
      const score = this.testAnswers.reduce((acc, ans, i) => acc + (ans === testQuestions[i].correctIndex ? 1 : 0), 0);
      renderer.drawRect(250, 500, 300, 80, colors.bgCard, { filled: true, borderRadius: 12 });
      renderer.drawText(`Score: ${score}/${testQuestions.length}`, 400, 535, score >= 7 ? colors.success : colors.warning, '24px', { align: 'center', fontWeight: 'bold' });

      if (score >= 7) {
        renderer.drawText('Great job! Proceed to Mastery', 400, 560, colors.success, '14px', { align: 'center' });
      }
    }
  }

  private renderMastery(renderer: CommandRenderer): void {
    // Trophy
    renderer.drawText('TIR Master!', 400, 150, colors.textPrimary, '36px', { align: 'center', fontWeight: 'bold' });

    renderer.drawRect(150, 200, 500, 250, colors.bgCard, { filled: true, borderRadius: 16 });

    renderer.drawText("You've mastered:", 400, 240, colors.textSecondary, '16px', { align: 'center' });

    const mastered = [
      'Critical angle formula: sin(thc) = n2/n1',
      'TIR requires high-to-low refractive index',
      "Snell's law: n1*sin(th1) = n2*sin(th2)",
      'Fiber optics use TIR for data transmission',
      'Diamonds sparkle due to high n & small critical angle',
    ];

    mastered.forEach((item, i) => {
      renderer.drawText(`* ${item}`, 400, 280 + i * 30, colors.success, '12px', { align: 'center' });
    });

    // Key insight
    renderer.drawRect(150, 470, 500, 60, colors.primary, { filled: true, borderRadius: 12, alpha: 0.3 });
    renderer.drawText('Light can be trapped and guided through total internal reflection!', 400, 505, colors.light, '14px', { align: 'center', fontWeight: 'bold' });

    // Restart button
    renderer.drawRect(300, 550, 200, 40, colors.primary, { filled: true, borderRadius: 8 });
    renderer.drawText('Explore Again', 400, 575, colors.textPrimary, '14px', { align: 'center' });
  }

  // === UI STATE FOR CLIENT ===

  private getUIState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      testAnswersCount: this.testAnswers.filter(a => a !== undefined && a >= 0).length,
      completedAppsCount: this.completedApps.size,
      incidentAngle: this.incidentAngle,
      mediumType: this.mediumType,
      isTIR: this.isTotalInternalReflection(),
      criticalAngle: this.getCriticalAngle(this.mediumType),
      showTrappedLight: this.showTrappedLight,
      waterFlowing: this.waterFlowing,
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

export function createTotalInternalReflectionGame(sessionId: string): TotalInternalReflectionGame {
  return new TotalInternalReflectionGame(sessionId);
}
