/**
 * Hydrostatic Pressure Game - Server-side implementation
 *
 * PROTECTED PHYSICS:
 * - P = ρgh (hydrostatic pressure equation)
 * - Pascal's Paradox: pressure depends only on depth, not volume
 * - Pascal's Principle: pressure transmits equally in fluids
 * - Force multiplication: F₂ = F₁ × (A₂/A₁)
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer, clamp } from '../../renderer/CommandRenderer.js';

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion {
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number;
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
}

// PROTECTED: Physics constants
const GRAVITY = 9.81;
const ATM_PRESSURE = 101325;

const testQuestions: TestQuestion[] = [
  {
    scenario: "Underwater station at 20m depth in fresh water.",
    question: "What is the total pressure on the station walls?",
    options: ["~3 atm (surface + water)", "~1 atm", "~20 atm", "~2 atm"],
    correctIndex: 0,
    explanation: "P = ρgh = 1000 × 9.81 × 20 ≈ 2 atm + 1 atm surface = 3 atm total."
  },
  {
    scenario: "Tank A: 50m wide, 5m tall. Tank B: 5m wide, 50m tall.",
    question: "Which provides higher pressure at the base?",
    options: ["Tank B - height matters", "Tank A - more volume", "Equal", "Cannot determine"],
    correctIndex: 0,
    explanation: "Hydrostatic Paradox: P = ρgh. Only height matters, not volume."
  },
  {
    scenario: "Scuba diver at 30m with 200 bar tank.",
    question: "Why must divers ascend slowly?",
    options: ["Nitrogen forms bubbles if pressure drops fast", "Tank pressure decreases", "Temperature changes", "Buoyancy issues"],
    correctIndex: 0,
    explanation: "At 30m (4 atm), nitrogen dissolves at 4× rate. Rapid ascent causes 'the bends'."
  },
  {
    scenario: "Hoover Dam: 200m thick at base, 14m at top.",
    question: "Why is the dam thicker at the bottom?",
    options: ["Pressure increases with depth", "More weight needed", "Construction limits", "Faster water flow"],
    correctIndex: 0,
    explanation: "At 180m, pressure is ~18 atm (1.8 MPa). P = ρgh increases linearly with depth."
  },
  {
    scenario: "Astronaut in ISS has puffy face and thin legs.",
    question: "What causes this in microgravity?",
    options: ["No hydrostatic gradient", "Space radiation", "Lower air pressure", "Lack of exercise"],
    correctIndex: 0,
    explanation: "Without gravity, no ρgh gradient keeps blood in lower body."
  },
  {
    scenario: "Hydraulic lift: 50N on small piston (0.01 m²), large piston (0.5 m²).",
    question: "Maximum weight the lift can support?",
    options: ["2,500 N", "50 N", "25 N", "5,000 N"],
    correctIndex: 0,
    explanation: "F₂ = F₁ × (A₂/A₁) = 50 × (0.5/0.01) = 2,500 N."
  },
  {
    scenario: "Submarine at Mariana Trench (10,900m).",
    question: "Approximate pressure at this depth?",
    options: ["~1,100 atm", "~110 atm", "~10,900 atm", "~100 atm"],
    correctIndex: 0,
    explanation: "P = 1025 × 9.81 × 10900 ≈ 110 MPa ≈ 1,086 atm."
  },
  {
    scenario: "40m water tower, 10th floor building (30m high).",
    question: "Will water reach the 10th floor without pumps?",
    options: ["Yes - 10m head difference", "No - water can't flow up", "Only with large pipes", "Only at low demand"],
    correctIndex: 0,
    explanation: "10m head = ρgh ≈ 98 kPa ≈ 1 atm driving pressure."
  },
  {
    scenario: "Blood pressure 120/80 mmHg at arm level.",
    question: "How would ankle reading change (1m below heart)?",
    options: ["Increase ~75 mmHg", "Decrease", "Stay same", "Increase ~10 mmHg"],
    correctIndex: 0,
    explanation: "Blood column: P = 1060 × 9.81 × 1 ≈ 78 mmHg increase."
  },
  {
    scenario: "Pascal's 1646 barrel with 10m thin tube.",
    question: "What happened when he poured cups of water?",
    options: ["Barrel burst - height creates pressure", "Nothing - too little volume", "Slow leak", "Tube overflowed"],
    correctIndex: 0,
    explanation: "10m column = 100 kPa ≈ 1 atm regardless of tube volume."
  }
];

const transferApps: TransferApp[] = [
  {
    icon: "🏗️",
    title: "Dam Engineering",
    short: "Dams",
    tagline: "Holding back millions of tons",
    description: "Dams are designed with P = ρgh at every level. Wall thickness increases with depth.",
    connection: "Pressure increases linearly with depth, requiring progressively thicker walls at the base.",
    stats: [
      { value: "1.8 MPa", label: "180m depth" },
      { value: "200m", label: "Hoover base" },
      { value: "6.6M tons", label: "Three Gorges" }
    ]
  },
  {
    icon: "🤿",
    title: "Scuba Diving",
    short: "Diving",
    tagline: "The pressure frontier",
    description: "Every 10m adds ~1 atm. Understanding P = ρgh is life-or-death for divers.",
    connection: "Divers breathe compressed air at ambient pressure, managing gas dissolution.",
    stats: [
      { value: "40m", label: "Rec limit" },
      { value: "332m", label: "World record" },
      { value: "1,100 atm", label: "Trench depth" }
    ]
  },
  {
    icon: "🗼",
    title: "Water Towers",
    short: "Water",
    tagline: "Gravity-powered delivery",
    description: "Tower height creates pressure P = ρgh. 30m tower ≈ 3 atm delivery pressure.",
    connection: "Elevated storage converts to pressure via P = ρgh, no electricity needed.",
    stats: [
      { value: "30-50m", label: "Tower height" },
      { value: "3-5 atm", label: "Pressure" },
      { value: "99.9%", label: "Reliability" }
    ]
  },
  {
    icon: "🚗",
    title: "Hydraulic Systems",
    short: "Hydraulics",
    tagline: "Pascal's principle",
    description: "Pressure transmits equally, enabling force multiplication in brakes and lifts.",
    connection: "F₂ = F₁ × (A₂/A₁) - small forces can lift tons through area ratios.",
    stats: [
      { value: "50:1", label: "Force multiply" },
      { value: "700 bar", label: "Industrial" },
      { value: "100+ tons", label: "Press capacity" }
    ]
  }
];

const colors = {
  primary: '#06b6d4',
  primaryDark: '#0891b2',
  accent: '#22d3ee',
  success: '#10b981',
  danger: '#ef4444',
  bgDark: '#0a0f1a',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b'
};

export class HydrostaticPressureGame extends BaseGame {
  readonly gameType = 'hydrostatic_pressure';
  readonly gameTitle = 'Hydrostatic Pressure';

  private phase: GamePhase = 'hook';
  private depth = 10;           // meters
  private fluidDensity = 1000;  // kg/m³ (water)
  private showPressureArrows = true;
  private animationOffset = 0;
  private prediction: string | null = null;
  private paradoxPrediction: string | null = null;
  private testQuestion = 0;
  private testAnswers: (number | null)[] = Array(10).fill(null);
  private testSubmitted = false;
  private selectedApp = 0;
  private completedApps = [false, false, false, false];
  private lastNavTime = 0;

  private readonly phaseOrder: GamePhase[] = [
    'hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'
  ];

  // PROTECTED: Physics calculations
  private calculateHydrostaticPressure(density: number, depth: number): number {
    return density * GRAVITY * depth;
  }

  private calculateTotalPressure(density: number, depth: number): number {
    return ATM_PRESSURE + this.calculateHydrostaticPressure(density, depth);
  }

  private calculatePressureInAtm(density: number, depth: number): number {
    return this.calculateTotalPressure(density, depth) / ATM_PRESSURE;
  }

  constructor(sessionId: string) {
    super(sessionId);
  }

  initialize(config: SessionConfig): void {
    super.initialize(config);
    if (config.resumePhase && this.phaseOrder.includes(config.resumePhase as GamePhase)) {
      this.phase = config.resumePhase as GamePhase;
    }
    this.emitCoachEvent('game_started', { phase: this.phase, message: 'Hydrostatic Pressure lesson started' });
  }

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click':
        this.handleButtonClick(input.id!);
        break;
      case 'slider_change':
        this.handleSliderChange(input.id!, input.value);
        break;
      case 'toggle_change':
        this.handleToggleChange(input.id!, input.value);
        break;
      case 'progress_click':
        this.handleProgressClick(input.index!);
        break;
    }
  }

  private handleButtonClick(id: string): void {
    if (id === 'next') { this.goNext(); return; }
    if (id === 'back') { this.goBack(); return; }

    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction, correct: this.prediction === 'B' });
      return;
    }
    if (id.startsWith('paradox_')) {
      this.paradoxPrediction = id.replace('paradox_', '');
      this.emitCoachEvent('paradox_discovered', { prediction: this.paradoxPrediction, correct: this.paradoxPrediction === 'C' });
      return;
    }

    if (id.startsWith('answer_')) {
      this.testAnswers[this.testQuestion] = parseInt(id.replace('answer_', ''), 10);
      return;
    }
    if (id === 'test_next' && this.testQuestion < testQuestions.length - 1) { this.testQuestion++; return; }
    if (id === 'test_prev' && this.testQuestion > 0) { this.testQuestion--; return; }
    if (id === 'test_submit') {
      this.testSubmitted = true;
      this.emitCoachEvent('test_completed', { score: this.calculateScore() });
      return;
    }

    if (id.startsWith('app_')) {
      const appIndex = parseInt(id.replace('app_', ''), 10);
      this.selectedApp = appIndex;
      this.completedApps[appIndex] = true;
      return;
    }

    if (id === 'toggle_arrows') {
      this.showPressureArrows = !this.showPressureArrows;
      return;
    }

    // Fluid selection
    if (id === 'fluid_water') { this.fluidDensity = 1000; return; }
    if (id === 'fluid_sea') { this.fluidDensity = 1025; return; }
    if (id === 'fluid_mercury') { this.fluidDensity = 13600; return; }
    if (id === 'fluid_ethanol') { this.fluidDensity = 789; return; }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'depth') {
      this.depth = clamp(value, 0, 50);
      this.emitCoachEvent('depth_changed', { depth: this.depth });
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'arrows') {
      this.showPressureArrows = value;
      return;
    }
  }

  private handleProgressClick(index: number): void {
    const currentIdx = this.phaseOrder.indexOf(this.phase);
    if (index < currentIdx) {
      this.phase = this.phaseOrder[index];
      this.emitCoachEvent('phase_changed', { phase: this.phase });
    }
  }

  private goNext(): void {
    const now = Date.now();
    if (now - this.lastNavTime < 200) return;
    this.lastNavTime = now;

    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx < this.phaseOrder.length - 1) {
      this.phase = this.phaseOrder[idx + 1];
      this.emitCoachEvent('phase_changed', { phase: this.phase });
    }
  }

  private goBack(): void {
    const now = Date.now();
    if (now - this.lastNavTime < 200) return;
    this.lastNavTime = now;

    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx > 0) {
      this.phase = this.phaseOrder[idx - 1];
      this.emitCoachEvent('phase_changed', { phase: this.phase });
    }
  }

  private calculateScore(): number {
    let correct = 0;
    for (let i = 0; i < testQuestions.length; i++) {
      if (this.testAnswers[i] === testQuestions[i].correctIndex) correct++;
    }
    return correct;
  }

  update(deltaTime: number): void {
    this.animationOffset = (this.animationOffset + deltaTime / 50) % 60;
  }

  render(): GameFrame {
    const r = new CommandRenderer(this.viewport.width, this.viewport.height);
    r.reset();
    r.setViewport(400, 500);
    r.clear(colors.bgDark);

    switch (this.phase) {
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

    this.renderProgressBar(r);
    return r.toFrame(this.nextFrame());
  }

  private renderProgressBar(r: CommandRenderer): void {
    const idx = this.phaseOrder.indexOf(this.phase);
    r.rect(0, 0, 400, 40, { fill: colors.bgCard });
    r.text(20, 25, 'Hydrostatic', { fill: colors.textMuted, fontSize: 11 });

    for (let i = 0; i < this.phaseOrder.length; i++) {
      const x = 180 + i * 20;
      r.circle(x, 20, 6, { fill: i <= idx ? colors.primary : colors.border });
    }
  }

  private renderPressureTank(r: CommandRenderer, x: number, y: number, width: number, height: number): void {
    r.rect(x, y, width, height, { fill: colors.bgCard, rx: 12 });

    const tankLeft = x + 30;
    const tankTop = y + 30;
    const tankWidth = 120;
    const tankHeight = 150;
    const depthRatio = this.depth / 50;
    const objectY = tankTop + depthRatio * tankHeight;

    // Tank
    r.rect(tankLeft, tankTop, tankWidth, tankHeight, { fill: '#0369a1', rx: 8, opacity: 0.6 });

    // Surface line
    r.line(tankLeft, tankTop + 5, tankLeft + tankWidth, tankTop + 5, { stroke: '#7dd3fc', strokeWidth: 1 });
    r.text(tankLeft - 5, tankTop + 8, 'Surface', { fill: '#7dd3fc', fontSize: 8, textAnchor: 'end' });

    // Depth markers
    [0, 10, 20, 30, 40, 50].forEach(d => {
      const markerY = tankTop + (d / 50) * tankHeight;
      r.line(tankLeft - 5, markerY, tankLeft, markerY, { stroke: colors.textMuted, strokeWidth: 1 });
      r.text(tankLeft - 8, markerY + 3, `${d}m`, { fill: colors.textMuted, fontSize: 8, textAnchor: 'end' });
    });

    // Object/diver
    const objY = Math.min(objectY, tankTop + tankHeight - 15);
    r.circle(tankLeft + tankWidth / 2, objY, 14, { fill: '#fbbf24', stroke: '#f59e0b', strokeWidth: 2 });
    r.text(tankLeft + tankWidth / 2, objY + 4, `${this.depth}m`, { fill: colors.bgDark, fontSize: 8, textAnchor: 'middle' });

    // Pressure arrows
    if (this.showPressureArrows) {
      const arrowLength = 15 + (this.depth / 50) * 20;
      [0, 60, 120, 180, 240, 300].forEach(angle => {
        const rad = (angle * Math.PI) / 180;
        const x1 = Math.cos(rad) * 18;
        const y1 = Math.sin(rad) * 18;
        const x2 = Math.cos(rad) * (18 + arrowLength);
        const y2 = Math.sin(rad) * (18 + arrowLength);
        r.line(
          tankLeft + tankWidth / 2 + x2, objY + y2,
          tankLeft + tankWidth / 2 + x1, objY + y1,
          { stroke: colors.success, strokeWidth: 2 }
        );
      });
    }

    // Bubbles
    [1, 2, 3].forEach(i => {
      const bubbleY = tankTop + tankHeight - ((this.animationOffset * 2 + i * 40) % tankHeight);
      const bubbleX = tankLeft + 20 + i * 30;
      r.circle(bubbleX, bubbleY, 2 + i, { fill: 'white', opacity: 0.3 });
    });

    // PROTECTED: Pressure calculations
    const hydroP = this.calculateHydrostaticPressure(this.fluidDensity, this.depth);
    const totalAtm = this.calculatePressureInAtm(this.fluidDensity, this.depth);

    // Pressure panel
    r.rect(x + width - 105, y + 30, 95, 100, { fill: colors.bgCardLight, rx: 8 });
    r.text(x + width - 57, y + 48, 'PRESSURE', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });

    r.text(x + width - 57, y + 72, (hydroP / 1000).toFixed(1), { fill: colors.success, fontSize: 16, textAnchor: 'middle' });
    r.text(x + width - 57, y + 86, 'kPa (hydro)', { fill: colors.textMuted, fontSize: 8, textAnchor: 'middle' });

    r.text(x + width - 57, y + 110, totalAtm.toFixed(2), { fill: colors.primary, fontSize: 16, textAnchor: 'middle' });
    r.text(x + width - 57, y + 124, 'atm (total)', { fill: colors.textMuted, fontSize: 8, textAnchor: 'middle' });

    // Formula
    r.text(x + width / 2, y + height - 25, `P = ρgh = ${this.fluidDensity} × 9.81 × ${this.depth}`, { fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' });
    r.text(x + width / 2, y + height - 10, `= ${(hydroP / 1000).toFixed(1)} kPa`, { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
  }

  private renderHook(r: CommandRenderer): void {
    r.rect(130, 50, 140, 24, { fill: 'rgba(6, 182, 212, 0.1)', rx: 12 });
    r.text(200, 66, 'Fluid Mechanics', { fill: colors.primary, fontSize: 11, textAnchor: 'middle' });

    r.text(200, 100, 'Hydrostatic Pressure', { fill: colors.accent, fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 120, 'Why the ocean depths are crushing', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });

    // Simple pool visualization
    r.rect(60, 150, 280, 160, { fill: colors.bgCard, rx: 12 });
    r.rect(80, 170, 240, 120, { fill: '#0369a1', rx: 8, opacity: 0.5 });

    // Surface diver
    r.circle(120, 185, 12, { fill: '#fbbf24' });
    r.text(170, 185, 'Surface: 1 atm', { fill: colors.textSecondary, fontSize: 10 });

    // Deep diver
    r.circle(200, 265, 12, { fill: '#fbbf24' });
    r.text(230, 265, '10m: 2 atm!', { fill: colors.danger, fontSize: 10, fontWeight: 'bold' });

    r.text(200, 330, 'Why do your ears hurt when diving deep?', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
    r.text(200, 350, 'At just 10m, pressure DOUBLES!', { fill: colors.primary, fontSize: 13, textAnchor: 'middle' });

    r.rect(100, 380, 200, 44, { fill: colors.primaryDark, rx: 12 });
    r.text(200, 407, 'Discover the Science →', { fill: colors.textPrimary, fontSize: 13, textAnchor: 'middle' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Make Your Prediction', { fill: colors.textPrimary, fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });

    r.rect(25, 80, 350, 70, { fill: colors.bgCardLight, rx: 12 });
    r.text(200, 105, 'Why does pressure increase with depth?', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
    r.text(200, 125, 'Think about what physically pushes on you underwater...', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });

    const options = ['A. Water gets colder/denser', 'B. Weight of water above', 'C. Gravity is stronger', 'D. Light adds pressure'];
    options.forEach((opt, i) => {
      const yPos = 165 + i * 45;
      const optId = opt[0];
      const isSelected = this.prediction === optId;
      const isCorrect = optId === 'B';

      let fill = colors.bgCardLight;
      if (this.prediction) {
        if (isSelected) fill = isCorrect ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
        else if (isCorrect) fill = 'rgba(16, 185, 129, 0.4)';
      }

      r.rect(25, yPos, 350, 38, { fill, rx: 10 });
      r.text(200, yPos + 24, opt, { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
    });

    if (this.prediction) {
      r.rect(25, 355, 350, 70, { fill: colors.bgCardLight, rx: 12 });
      r.text(200, 380, this.prediction === 'B' ? '✓ Correct! Weight of water creates pressure.' : '✗ Think about what physically pushes down.', { fill: this.prediction === 'B' ? colors.success : '#f59e0b', fontSize: 12, textAnchor: 'middle' });

      r.rect(100, 435, 200, 40, { fill: colors.primaryDark, rx: 10 });
      r.text(200, 460, 'Explore the Physics →', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Hydrostatic Pressure Lab', { fill: colors.textPrimary, fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });

    this.renderPressureTank(r, 15, 75, 250, 210);

    // Controls
    r.rect(275, 75, 115, 140, { fill: colors.bgCardLight, rx: 10 });

    r.text(332, 95, `Depth: ${this.depth}m`, { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.rect(285, 105, 95, 6, { fill: colors.border, rx: 3 });
    r.rect(285, 105, (this.depth / 50) * 95, 6, { fill: colors.primary, rx: 3 });

    r.text(332, 135, 'Fluid Type', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.rect(285, 145, 95, 24, { fill: colors.bgCard, rx: 6 });
    const fluidLabel = this.fluidDensity === 1000 ? 'Water' : this.fluidDensity === 1025 ? 'Sea' : this.fluidDensity === 13600 ? 'Mercury' : 'Ethanol';
    r.text(332, 162, fluidLabel, { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });

    r.rect(285, 180, 95, 28, { fill: this.showPressureArrows ? colors.primary : colors.bgCard, rx: 8 });
    r.text(332, 199, this.showPressureArrows ? 'Arrows ON' : 'Arrows OFF', { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });

    // Key observations
    r.rect(20, 295, 360, 65, { fill: 'rgba(6, 182, 212, 0.15)', rx: 10 });
    r.text(200, 315, 'Key: Pressure increases linearly with depth', { fill: colors.primary, fontSize: 11, textAnchor: 'middle' });
    r.text(200, 333, 'Every 10m of water ≈ +1 atmosphere', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(200, 350, 'Pressure acts equally in ALL directions', { fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' });

    r.rect(100, 375, 200, 40, { fill: colors.primaryDark, rx: 10 });
    r.text(200, 400, 'Learn the Formula →', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Hydrostatic Equation', { fill: colors.textPrimary, fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });

    r.rect(50, 80, 300, 100, { fill: 'rgba(6, 182, 212, 0.2)', rx: 16 });
    r.rect(90, 100, 220, 40, { fill: colors.bgCardLight, rx: 8 });
    r.text(200, 128, 'P = ρgh', { fill: colors.primary, fontSize: 28, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 165, 'Hydrostatic Pressure Equation', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Variables
    r.rect(30, 195, 85, 60, { fill: colors.bgCardLight, rx: 8 });
    r.text(72, 215, 'P', { fill: colors.primary, fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(72, 235, 'Pressure', { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });
    r.text(72, 248, '(Pascals)', { fill: colors.textMuted, fontSize: 8, textAnchor: 'middle' });

    r.rect(125, 195, 85, 60, { fill: colors.bgCardLight, rx: 8 });
    r.text(167, 215, 'ρ', { fill: '#f59e0b', fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(167, 235, 'Density', { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });
    r.text(167, 248, '(kg/m³)', { fill: colors.textMuted, fontSize: 8, textAnchor: 'middle' });

    r.rect(220, 195, 70, 60, { fill: colors.bgCardLight, rx: 8 });
    r.text(255, 215, 'g', { fill: colors.success, fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(255, 235, '9.81', { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });
    r.text(255, 248, 'm/s²', { fill: colors.textMuted, fontSize: 8, textAnchor: 'middle' });

    r.rect(300, 195, 70, 60, { fill: colors.bgCardLight, rx: 8 });
    r.text(335, 215, 'h', { fill: '#a855f7', fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(335, 235, 'Depth', { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });
    r.text(335, 248, '(meters)', { fill: colors.textMuted, fontSize: 8, textAnchor: 'middle' });

    // Quick reference
    r.text(200, 280, 'Quick Reference:', { fill: colors.success, fontSize: 12, textAnchor: 'middle' });
    const refs = [{ d: '0m', p: '1 atm' }, { d: '10m', p: '2 atm' }, { d: '30m', p: '4 atm' }, { d: '11km', p: '~1,100!' }];
    refs.forEach((ref, i) => {
      const x = 60 + i * 80;
      r.rect(x, 295, 70, 40, { fill: colors.bgCardLight, rx: 6 });
      r.text(x + 35, 312, ref.d, { fill: colors.primary, fontSize: 11, textAnchor: 'middle' });
      r.text(x + 35, 328, ref.p, { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });
    });

    r.rect(100, 355, 200, 40, { fill: '#9333ea', rx: 10 });
    r.text(200, 380, 'Discover the Paradox →', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'The Hydrostatic Paradox', { fill: '#a855f7', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });

    // Three containers visualization
    r.rect(30, 80, 340, 110, { fill: colors.bgCard, rx: 12 });

    // Wide tank
    r.rect(50, 100, 60, 60, { fill: '#3b82f6', opacity: 0.5, rx: 4 });
    r.text(80, 175, 'Wide', { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });
    r.text(80, 95, '1000 L', { fill: colors.textPrimary, fontSize: 9, textAnchor: 'middle' });

    // Medium tube
    r.rect(170, 100, 30, 60, { fill: '#3b82f6', opacity: 0.5, rx: 4 });
    r.text(185, 175, 'Tube', { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });
    r.text(185, 95, '10 L', { fill: colors.textPrimary, fontSize: 9, textAnchor: 'middle' });

    // Thin tube
    r.rect(295, 100, 8, 60, { fill: '#3b82f6', opacity: 0.5, rx: 2 });
    r.text(299, 175, 'Thin', { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });
    r.text(299, 95, '0.1 L', { fill: colors.textPrimary, fontSize: 9, textAnchor: 'middle' });

    // Height indicator
    r.line(340, 100, 340, 160, { stroke: '#fbbf24', strokeWidth: 2 });
    r.text(355, 130, 'Same', { fill: '#fbbf24', fontSize: 8 });
    r.text(355, 142, 'height!', { fill: '#fbbf24', fontSize: 8 });

    r.text(200, 205, 'Which has highest pressure at bottom?', { fill: '#a855f7', fontSize: 12, textAnchor: 'middle' });

    const options = ['A. Wide tank - most water', 'B. Thin tube - concentrated', 'C. All equal! Only height matters', 'D. Cannot determine'];
    options.forEach((opt, i) => {
      const yPos = 225 + i * 42;
      const optId = opt[0];
      const isSelected = this.paradoxPrediction === optId;
      const isCorrect = optId === 'C';

      let fill = colors.bgCardLight;
      if (this.paradoxPrediction) {
        if (isSelected) fill = isCorrect ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
        else if (isCorrect) fill = 'rgba(16, 185, 129, 0.4)';
      }

      r.rect(25, yPos, 350, 36, { fill, rx: 10 });
      r.text(200, yPos + 23, opt, { fill: colors.textPrimary, fontSize: 11, textAnchor: 'middle' });
    });

    if (this.paradoxPrediction) {
      r.rect(100, 400, 200, 40, { fill: '#9333ea', rx: 10 });
      r.text(200, 425, 'See Pascal\'s Proof →', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, "Pascal's Barrel (1646)", { fill: '#a855f7', fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });

    // Visualization of Pascal's experiment
    r.rect(30, 75, 340, 150, { fill: colors.bgCard, rx: 12 });

    // Building
    r.rect(50, 100, 50, 110, { fill: '#64748b' });
    r.rect(85, 115, 25, 8, { fill: '#94a3b8' });

    // Pascal
    r.circle(95, 110, 6, { fill: '#fcd9b6' });

    // Thin tube
    r.line(95, 118, 95, 85, { stroke: '#60a5fa', strokeWidth: 3 });

    // Barrel
    r.rect(200, 165, 80, 45, { fill: '#8b4513' });

    // Connection
    r.line(95, 85, 95, 95, { stroke: '#60a5fa', strokeWidth: 3 });
    r.line(95, 95, 240, 95, { stroke: '#60a5fa', strokeWidth: 3 });
    r.line(240, 95, 240, 165, { stroke: '#60a5fa', strokeWidth: 3 });

    // Explosion
    r.text(240, 190, '💥', { fontSize: 16, textAnchor: 'middle' });
    r.text(240, 215, 'BURST!', { fill: colors.danger, fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });

    // Explanation
    r.rect(30, 235, 340, 95, { fill: 'rgba(168, 85, 247, 0.15)', rx: 12 });
    r.text(200, 255, 'What Happened:', { fill: '#a855f7', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 275, '• Pascal attached a thin 10m tube to a barrel', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(200, 292, '• Poured just a few cups of water into the tube', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(200, 309, '• The barrel BURST! Height creates pressure,', { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });
    r.text(200, 323, 'NOT volume!', { fill: colors.primary, fontSize: 10, textAnchor: 'middle' });

    r.rect(100, 345, 200, 40, { fill: colors.success, rx: 10 });
    r.text(200, 370, 'Review Summary →', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Summary: Hydrostatic Pressure', { fill: colors.textPrimary, fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });

    // Core equation
    r.rect(30, 80, 165, 100, { fill: 'rgba(6, 182, 212, 0.2)', rx: 12 });
    r.text(112, 100, 'Core Equation', { fill: colors.primary, fontSize: 11, textAnchor: 'middle' });
    r.text(112, 130, 'P = ρgh', { fill: colors.textPrimary, fontSize: 22, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(112, 155, '10m water ≈ +1 atm', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(112, 170, 'Height matters, not volume!', { fill: colors.accent, fontSize: 9, textAnchor: 'middle' });

    // Key principles
    r.rect(205, 80, 165, 100, { fill: 'rgba(168, 85, 247, 0.2)', rx: 12 });
    r.text(287, 100, 'Key Principles', { fill: '#a855f7', fontSize: 11, textAnchor: 'middle' });
    r.text(287, 125, '• Pressure = all directions', { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });
    r.text(287, 142, '• Pascal\'s Principle', { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });
    r.text(287, 159, '• Hydrostatic Paradox', { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });
    r.text(287, 176, '• Force multiplication', { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });

    // Applications
    r.rect(30, 195, 340, 80, { fill: 'rgba(16, 185, 129, 0.15)', rx: 12 });
    r.text(200, 215, 'Applications', { fill: colors.success, fontSize: 12, textAnchor: 'middle' });
    const apps = ['🏗️ Dams', '🤿 Diving', '🗼 Water', '🚗 Hydraulics'];
    apps.forEach((app, i) => {
      const x = 60 + i * 80;
      r.text(x, 250, app, { fill: colors.textPrimary, fontSize: 11, textAnchor: 'middle' });
    });

    r.rect(100, 295, 200, 40, { fill: colors.primaryDark, rx: 10 });
    r.text(200, 320, 'Explore Applications →', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });

    // App tabs
    transferApps.forEach((app, i) => {
      const tabX = 25 + i * 90;
      const isActive = this.selectedApp === i;
      const isCompleted = this.completedApps[i];

      r.rect(tabX, 75, 80, 28, {
        fill: isActive ? colors.primaryDark : (isCompleted ? 'rgba(6, 182, 212, 0.3)' : colors.bgCardLight),
        rx: 8
      });
      r.text(tabX + 40, 93, `${app.icon} ${app.short}`, { fill: colors.textPrimary, fontSize: 9, textAnchor: 'middle' });
    });

    const app = transferApps[this.selectedApp];

    r.rect(20, 115, 360, 200, { fill: colors.bgCardLight, rx: 12 });

    r.text(40, 140, app.icon, { fontSize: 20 });
    r.text(70, 135, app.title, { fill: colors.textPrimary, fontSize: 12 });
    r.text(70, 152, app.tagline, { fill: colors.textMuted, fontSize: 9 });

    r.text(200, 175, app.description, { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });

    // Connection
    r.rect(30, 190, 170, 50, { fill: colors.bgCard, rx: 8 });
    r.text(115, 205, 'Physics Connection', { fill: colors.primary, fontSize: 9, textAnchor: 'middle' });
    r.text(115, 225, app.connection.substring(0, 45), { fill: colors.textMuted, fontSize: 8, textAnchor: 'middle' });

    // Stats
    r.rect(210, 190, 160, 50, { fill: colors.bgCard, rx: 8 });
    r.text(290, 205, 'Key Stats', { fill: colors.accent, fontSize: 9, textAnchor: 'middle' });
    app.stats.slice(0, 2).forEach((stat, i) => {
      r.text(290, 220 + i * 12, `${stat.value} ${stat.label}`, { fill: colors.textMuted, fontSize: 8, textAnchor: 'middle' });
    });

    // Mark complete
    if (!this.completedApps[this.selectedApp]) {
      r.rect(100, 255, 200, 32, { fill: colors.primaryDark, rx: 8 });
      r.text(200, 276, 'Mark Understood', { fill: colors.textPrimary, fontSize: 11, textAnchor: 'middle' });
    }

    // Progress
    const completedCount = this.completedApps.filter(c => c).length;
    r.text(200, 305, `Progress: ${completedCount}/4`, { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    transferApps.forEach((_, i) => {
      r.circle(160 + i * 25, 320, 5, { fill: this.completedApps[i] ? colors.primary : colors.border });
    });

    if (completedCount >= 4) {
      r.rect(100, 340, 200, 36, { fill: colors.primaryDark, rx: 10 });
      r.text(200, 363, 'Take the Test →', { fill: colors.textPrimary, fontSize: 11, textAnchor: 'middle' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    r.text(200, 50, 'Knowledge Assessment', { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });

    if (!this.testSubmitted) {
      r.text(200, 75, `Question ${this.testQuestion + 1}/10`, { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

      const q = testQuestions[this.testQuestion];

      r.rect(20, 90, 360, 60, { fill: colors.bgCardLight, rx: 10 });
      r.text(200, 110, q.scenario.substring(0, 50), { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });
      r.text(200, 130, q.question.substring(0, 50), { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });

      q.options.forEach((opt, i) => {
        const yPos = 160 + i * 38;
        const isSelected = this.testAnswers[this.testQuestion] === i;
        r.rect(25, yPos, 350, 32, { fill: isSelected ? 'rgba(6, 182, 212, 0.3)' : colors.bgCardLight, rx: 8 });
        r.text(200, yPos + 20, opt.substring(0, 45), { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });
      });

      r.rect(30, 320, 100, 32, { fill: this.testQuestion > 0 ? colors.bgCardLight : colors.border, rx: 8 });
      r.text(80, 341, '← Prev', { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });

      r.rect(270, 320, 100, 32, { fill: this.testQuestion < 9 ? colors.bgCardLight : colors.border, rx: 8 });
      r.text(320, 341, 'Next →', { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });

      const allAnswered = this.testAnswers.every(a => a !== null);
      r.rect(100, 365, 200, 40, { fill: allAnswered ? colors.primaryDark : colors.border, rx: 10 });
      r.text(200, 390, 'Submit Answers', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
    } else {
      const score = this.calculateScore();

      r.rect(80, 85, 240, 100, { fill: colors.bgCardLight, rx: 16 });
      r.text(200, 115, score >= 7 ? '🌊' : '📚', { fontSize: 28, textAnchor: 'middle' });
      r.text(200, 150, `Score: ${score}/10`, { fill: colors.textPrimary, fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });
      r.text(200, 173, score >= 7 ? 'Hydrostatic Pressure Master!' : 'Review and try again.', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

      for (let i = 0; i < 10; i++) {
        const col = i % 5;
        const row = Math.floor(i / 5);
        const x = 50 + col * 65;
        const y = 200 + row * 45;

        const isCorrect = this.testAnswers[i] === testQuestions[i].correctIndex;
        r.rect(x, y, 55, 35, { fill: isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)', rx: 6 });
        r.text(x + 27, y + 15, `Q${i + 1}`, { fill: isCorrect ? colors.success : colors.danger, fontSize: 9, textAnchor: 'middle' });
        r.text(x + 27, y + 28, isCorrect ? '✓' : '✗', { fill: isCorrect ? colors.success : colors.danger, fontSize: 11, textAnchor: 'middle' });
      }

      if (score >= 7) {
        r.rect(100, 310, 200, 40, { fill: colors.primaryDark, rx: 10 });
        r.text(200, 335, 'Claim Mastery →', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
      } else {
        r.rect(100, 310, 200, 40, { fill: colors.primaryDark, rx: 10 });
        r.text(200, 335, 'Review & Retry', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.rect(50, 80, 300, 280, { fill: 'rgba(6, 182, 212, 0.15)', rx: 24 });

    r.text(200, 130, '🌊', { fontSize: 48, textAnchor: 'middle' });

    r.text(200, 175, 'Hydrostatic Master!', { fill: colors.textPrimary, fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 200, "You've mastered fluid pressure physics!", { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });

    const badges = [
      { icon: '📐', label: 'P=ρgh' },
      { icon: '🎯', label: 'Paradox' },
      { icon: '🏗️', label: 'Dams' },
      { icon: '🚗', label: 'Hydraulics' }
    ];

    badges.forEach((badge, i) => {
      const x = 75 + i * 65;
      r.rect(x, 220, 55, 50, { fill: colors.bgCardLight, rx: 8 });
      r.text(x + 27, 242, badge.icon, { fontSize: 16, textAnchor: 'middle' });
      r.text(x + 27, 260, badge.label, { fill: colors.textSecondary, fontSize: 8, textAnchor: 'middle' });
    });

    r.rect(120, 290, 160, 36, { fill: colors.bgCardLight, rx: 10 });
    r.text(200, 313, '↺ Explore Again', { fill: colors.textPrimary, fontSize: 11, textAnchor: 'middle' });

    r.text(200, 355, 'Certified in Hydrostatic Pressure!', { fill: colors.primary, fontSize: 11, textAnchor: 'middle' });
  }

  getCurrentPhase(): string {
    return this.phase;
  }

  getState(): object {
    return {
      phase: this.phase,
      depth: this.depth,
      fluidDensity: this.fluidDensity,
      showPressureArrows: this.showPressureArrows,
      prediction: this.prediction,
      paradoxPrediction: this.paradoxPrediction,
      testQuestion: this.testQuestion,
      testAnswers: [...this.testAnswers],
      testSubmitted: this.testSubmitted,
      selectedApp: this.selectedApp,
      completedApps: [...this.completedApps]
    };
  }

  restoreState(state: Record<string, unknown>): void {
    this.phase = state.phase as GamePhase;
    this.depth = state.depth as number;
    this.fluidDensity = state.fluidDensity as number;
    this.showPressureArrows = state.showPressureArrows as boolean;
    this.prediction = state.prediction as string | null;
    this.paradoxPrediction = state.paradoxPrediction as string | null;
    this.testQuestion = state.testQuestion as number;
    this.testAnswers = [...(state.testAnswers as (number | null)[])];
    this.testSubmitted = state.testSubmitted as boolean;
    this.selectedApp = state.selectedApp as number;
    this.completedApps = [...(state.completedApps as boolean[])];
  }
}

export function createHydrostaticPressureGame(sessionId: string) {
  return new HydrostaticPressureGame(sessionId);
}
