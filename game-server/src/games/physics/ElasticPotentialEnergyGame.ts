/**
 * Elastic Potential Energy Game - Server-side implementation
 *
 * PROTECTED PHYSICS:
 * - PE = ½kx² (elastic potential energy)
 * - Energy grows with displacement SQUARED
 * - Work = ∫F·dx = ∫kx·dx = ½kx²
 * - Energy conservation: PE ↔ KE
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

const testQuestions: TestQuestion[] = [
  {
    scenario: "You compress a spring by 5 cm and it stores 2 Joules of energy.",
    question: "If you compress the same spring by 10 cm, how much energy?",
    options: ["2 J (same)", "4 J (double)", "8 J (quadruple)", "16 J"],
    correctIndex: 2,
    explanation: "PE = ½kx². Doubling x → (2)² = 4× energy. 2J × 4 = 8J."
  },
  {
    scenario: "A bow stores 50 Joules when drawn back 0.5 meters.",
    question: "What is the effective spring constant of the bow?",
    options: ["100 N/m", "200 N/m", "400 N/m", "800 N/m"],
    correctIndex: 2,
    explanation: "PE = ½kx²: 50 = ½ × k × 0.25, so k = 400 N/m."
  },
  {
    scenario: "A car's suspension spring (k=50,000 N/m) compresses 4 cm.",
    question: "How much energy does the spring absorb?",
    options: ["4 J", "40 J", "400 J", "4000 J"],
    correctIndex: 1,
    explanation: "PE = ½ × 50,000 × (0.04)² = 40 Joules."
  },
  {
    scenario: "A compressed spring is released and launches a ball.",
    question: "Where does the elastic potential energy go?",
    options: ["It disappears", "Kinetic energy of ball", "Stays in spring", "Becomes heat only"],
    correctIndex: 1,
    explanation: "Energy is conserved! PE converts to KE (½mv²)."
  },
  {
    scenario: "Spring A compressed 10 cm, Spring B compressed 20 cm (same k).",
    question: "Ratio of energy in B to A?",
    options: ["1:1", "2:1", "4:1", "8:1"],
    correctIndex: 2,
    explanation: "PE ∝ x². (20/10)² = 4. Spring B has 4× energy."
  },
  {
    scenario: "Pogo stick compresses 8 cm under 40 kg child.",
    question: "What is the spring constant k?",
    options: ["500 N/m", "5,000 N/m", "50,000 N/m", "400 N/m"],
    correctIndex: 1,
    explanation: "F = kx: 400N = k × 0.08m, so k = 5,000 N/m."
  },
  {
    scenario: "Toy gun stores 0.5 J. Dart mass is 10 grams.",
    question: "What is the dart's launch speed?",
    options: ["1 m/s", "5 m/s", "10 m/s", "50 m/s"],
    correctIndex: 2,
    explanation: "½mv² = 0.5J → v = √(1/0.01) = 10 m/s."
  },
  {
    scenario: "Bow stores 80 J, arrow leaves with 70 J of KE.",
    question: "Where did the missing 10 J go?",
    options: ["Violated conservation", "Heat, sound, vibration", "Stayed in bow", "Gravity took it"],
    correctIndex: 1,
    explanation: "10 J went to bow vibration, sound, and friction heat."
  },
  {
    scenario: "Bungee cord stretches 20m for 60 kg person at lowest point.",
    question: "What is the cord's spring constant?",
    options: ["3 N/m", "30 N/m", "300 N/m", "3000 N/m"],
    correctIndex: 1,
    explanation: "kx = mg → k = (60×10)/20 = 30 N/m."
  },
  {
    scenario: "A compressed spring is locked and then heated.",
    question: "Does the stored elastic PE change?",
    options: ["Yes, heat adds", "No, PE depends on k and x", "All becomes heat", "Spring explodes"],
    correctIndex: 1,
    explanation: "Elastic PE = ½kx² depends on k and x, not temperature."
  }
];

const transferApps: TransferApp[] = [
  {
    icon: "🏹",
    title: "Archery & Crossbows",
    short: "Archery",
    tagline: "Ancient energy storage",
    description: "Bows store elastic PE when drawn, converting to arrow KE upon release.",
    connection: "A drawn bow stores energy as PE = ½kx². Upon release, energy transfers to the arrow.",
    stats: [
      { value: "40-50 J", label: "Olympic bow" },
      { value: "90+ m/s", label: "Arrow speed" },
      { value: "70-85%", label: "Efficiency" }
    ]
  },
  {
    icon: "🚗",
    title: "Vehicle Suspension",
    short: "Suspension",
    tagline: "Smooth rides",
    description: "Car springs absorb bump energy, storing it as elastic PE.",
    connection: "Spring compression stores energy as PE = ½kx². Dampers then convert to heat.",
    stats: [
      { value: "50,000", label: "N/m typical" },
      { value: "10-100 J", label: "Per bump" },
      { value: "100+/s", label: "F1 cycles" }
    ]
  },
  {
    icon: "🎾",
    title: "Sports Equipment",
    short: "Sports",
    tagline: "Energy return",
    description: "Tennis rackets, running shoes engineered for energy return.",
    connection: "Ball/shoe compression stores PE = ½kx². Maximum return when released in phase.",
    stats: [
      { value: "10-20 J", label: "Tennis stroke" },
      { value: "60-90%", label: "Shoe return" },
      { value: "1000+ J", label: "Pole vault" }
    ]
  },
  {
    icon: "⚡",
    title: "Energy Storage",
    short: "Energy",
    tagline: "Mechanical batteries",
    description: "Springs store energy for later use as mechanical batteries.",
    connection: "Mainspring stores energy as PE = ½kθ². Released slowly to power mechanisms.",
    stats: [
      { value: "1-2 J", label: "Watch spring" },
      { value: "100+ kWh", label: "Hybrid sys" },
      { value: "50+ yrs", label: "Lifespan" }
    ]
  }
];

const colors = {
  primary: '#10b981',
  primaryDark: '#059669',
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

export class ElasticPotentialEnergyGame extends BaseGame {
  readonly gameType = 'elastic_potential_energy';
  readonly gameTitle = 'Elastic Potential Energy';

  private phase: GamePhase = 'hook';
  private springConstant = 100;      // N/m
  private displacement = 0.1;        // meters
  private isAnimating = false;
  private animationTime = 0;
  private releaseMode = false;
  private showEnergyBars = true;
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private testQuestion = 0;
  private testAnswers: (number | null)[] = Array(10).fill(null);
  private testSubmitted = false;
  private selectedApp = 0;
  private completedApps = [false, false, false, false];
  private lastNavTime = 0;

  private readonly phaseOrder: GamePhase[] = [
    'hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'
  ];

  // PROTECTED: Physics calculations - never sent to client
  private calculateElasticPE(k: number, x: number): number {
    return 0.5 * k * x * x;
  }

  private calculateOscillationFrequency(k: number, m: number): number {
    return Math.sqrt(k / m);
  }

  private calculateDampedDisplacement(x0: number, damping: number, omega: number, t: number): number {
    return x0 * Math.exp(-damping * t) * Math.cos(omega * t);
  }

  constructor(sessionId: string) {
    super(sessionId);
  }

  initialize(config: SessionConfig): void {
    super.initialize(config);
    if (config.resumePhase && this.phaseOrder.includes(config.resumePhase as GamePhase)) {
      this.phase = config.resumePhase as GamePhase;
    }
    this.emitCoachEvent('game_started', { phase: this.phase, message: 'Elastic Potential Energy lesson started' });
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

    // Predictions
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction, correct: this.prediction === 'C' });
      return;
    }
    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
      this.emitCoachEvent('twist_prediction_made', { prediction: this.twistPrediction, correct: this.twistPrediction === 'B' });
      return;
    }

    // Test answers
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

    // Apps
    if (id.startsWith('app_')) {
      const appIndex = parseInt(id.replace('app_', ''), 10);
      this.selectedApp = appIndex;
      this.completedApps[appIndex] = true;
      return;
    }

    // Spring controls
    if (id === 'release') {
      this.releaseMode = true;
      this.animationTime = 0;
      this.isAnimating = true;
      this.emitCoachEvent('spring_released', { displacement: this.displacement, energy: this.calculateElasticPE(this.springConstant, this.displacement) });
      return;
    }
    if (id === 'compress') {
      this.displacement = Math.min(0.3, this.displacement + 0.05);
      this.emitCoachEvent('spring_compressed', { displacement: this.displacement });
      return;
    }
    if (id === 'reset') {
      this.isAnimating = false;
      this.releaseMode = false;
      this.displacement = 0.1;
      this.animationTime = 0;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'spring_constant') {
      this.springConstant = clamp(value, 50, 300);
      this.emitCoachEvent('parameter_changed', { springConstant: this.springConstant });
      return;
    }
    if (id === 'displacement') {
      this.displacement = clamp(value, 0, 0.3);
      this.emitCoachEvent('spring_compressed', { displacement: this.displacement });
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'show_energy') {
      this.showEnergyBars = value;
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
    if (this.isAnimating && this.releaseMode) {
      this.animationTime += deltaTime / 1000;
      const damping = Math.exp(-0.5 * this.animationTime);
      if (damping < 0.05) {
        this.isAnimating = false;
        this.releaseMode = false;
        this.animationTime = 0;
      }
    }
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
    r.text(20, 25, 'Elastic PE', { fill: colors.textMuted, fontSize: 11 });

    for (let i = 0; i < this.phaseOrder.length; i++) {
      const x = 180 + i * 20;
      r.circle(x, 20, 6, { fill: i <= idx ? colors.primary : colors.border });
    }
  }

  private renderSpringVisualization(r: CommandRenderer, x: number, y: number, width: number, height: number): void {
    r.rect(x, y, width, height, { fill: colors.bgCard, rx: 12 });

    const pivotX = x + width / 2;
    const pivotY = y + 40;
    const baseLength = 80;

    // Current displacement
    const omega = this.calculateOscillationFrequency(this.springConstant, 1);
    let currentDisp = this.displacement;
    if (this.releaseMode && this.isAnimating) {
      currentDisp = this.calculateDampedDisplacement(this.displacement, 0.5, omega, this.animationTime);
    }

    const compressionPixels = currentDisp * 300;
    const springLength = baseLength + compressionPixels;
    const coils = 10;
    const coilHeight = springLength / coils;
    const amplitude = 20;

    // Wall mount
    r.rect(pivotX - 35, y + 15, 70, 20, { fill: colors.bgCardLight, rx: 4 });

    // Draw spring coils
    for (let i = 0; i < coils; i++) {
      const y1 = pivotY + i * coilHeight;
      const y2 = pivotY + i * coilHeight + coilHeight / 2;
      const y3 = pivotY + (i + 1) * coilHeight;
      r.line(pivotX, y1, pivotX + amplitude * (i % 2 === 0 ? 1 : -1), y2, { stroke: colors.primary, strokeWidth: 3 });
      r.line(pivotX + amplitude * (i % 2 === 0 ? 1 : -1), y2, pivotX, y3, { stroke: colors.primary, strokeWidth: 3 });
    }

    // Mass block
    r.rect(pivotX - 25, pivotY + springLength, 50, 35, { fill: '#f59e0b', rx: 6 });
    r.text(pivotX, pivotY + springLength + 22, '1 kg', { fill: colors.bgDark, fontSize: 11, textAnchor: 'middle' });

    // PROTECTED: Calculate energy
    const currentPE = this.calculateElasticPE(this.springConstant, Math.abs(currentDisp));
    const maxPE = this.calculateElasticPE(this.springConstant, 0.3);
    const pePercent = maxPE > 0 ? Math.min(100, (currentPE / maxPE) * 100) : 0;

    // Displacement indicator
    if (Math.abs(currentDisp) > 0.01) {
      r.text(pivotX + 50, pivotY + springLength / 2, `x = ${(currentDisp * 100).toFixed(1)} cm`, { fill: colors.primary, fontSize: 10 });
    }

    // Energy bar
    if (this.showEnergyBars) {
      r.rect(x + 10, y + height - 55, 90, 45, { fill: colors.bgCardLight, rx: 8 });
      r.text(x + 55, y + height - 40, 'Elastic PE', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
      r.rect(x + 18, y + height - 32, 74, 10, { fill: colors.border, rx: 3 });
      r.rect(x + 18, y + height - 32, 74 * pePercent / 100, 10, { fill: colors.primary, rx: 3 });
      r.text(x + 55, y + height - 15, `${currentPE.toFixed(2)} J`, { fill: colors.primary, fontSize: 11, textAnchor: 'middle' });
    }

    // Formula
    r.text(x + width - 15, y + 25, 'PE = ½kx²', { fill: colors.textMuted, fontSize: 10, textAnchor: 'end' });
  }

  private renderHook(r: CommandRenderer): void {
    // Badge
    r.rect(130, 50, 140, 24, { fill: 'rgba(16, 185, 129, 0.1)', rx: 12 });
    r.text(200, 66, 'Physics Exploration', { fill: colors.primary, fontSize: 11, textAnchor: 'middle' });

    // Title
    r.text(200, 100, 'The Hidden Power of Springs', { fill: colors.accent, fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 120, 'Discover elastic potential energy', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });

    // Spring visualization
    this.renderSpringVisualization(r, 50, 140, 300, 230);

    // Buttons
    r.rect(70, 385, 110, 36, { fill: colors.primaryDark, rx: 8 });
    r.text(125, 408, 'Compress', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });

    r.rect(220, 385, 110, 36, { fill: this.displacement >= 0.05 ? '#d97706' : colors.border, rx: 8 });
    r.text(275, 408, 'Release!', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });

    // Next button
    r.rect(100, 435, 200, 40, { fill: colors.primaryDark, rx: 10 });
    r.text(200, 460, 'Discover the Formula →', { fill: colors.textPrimary, fontSize: 13, textAnchor: 'middle' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 65, 'Make Your Prediction', { fill: colors.textPrimary, fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });

    // Scenario
    r.rect(25, 85, 350, 70, { fill: colors.bgCardLight, rx: 12 });
    r.text(200, 108, 'You compress a spring by 10 cm (stores 5 J).', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(200, 128, 'If you compress it by 20 cm, how much energy?', { fill: colors.primary, fontSize: 12, textAnchor: 'middle' });

    // Options
    const options = ['A. 5 J (same)', 'B. 10 J (double)', 'C. 20 J (quadruple)', 'D. 2.5 J (half)'];
    options.forEach((opt, i) => {
      const yPos = 170 + i * 45;
      const optId = opt[0];
      const isSelected = this.prediction === optId;
      const isCorrect = optId === 'C';

      let fill = colors.bgCardLight;
      if (this.prediction) {
        if (isSelected) fill = isCorrect ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
        else if (isCorrect) fill = 'rgba(16, 185, 129, 0.4)';
      }

      r.rect(25, yPos, 350, 38, { fill, rx: 10 });
      r.text(200, yPos + 24, opt, { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
    });

    if (this.prediction) {
      r.rect(25, 360, 350, 70, { fill: colors.bgCardLight, rx: 12 });
      r.text(200, 385, '✓ Energy goes up with the SQUARE!', { fill: colors.success, fontSize: 12, textAnchor: 'middle' });
      r.text(200, 405, '2× compression = 2² = 4× energy', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

      r.rect(100, 440, 200, 40, { fill: colors.primaryDark, rx: 10 });
      r.text(200, 465, 'Explore the Physics →', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 60, 'Elastic Energy Laboratory', { fill: colors.textPrimary, fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });

    // Spring visualization
    this.renderSpringVisualization(r, 20, 80, 180, 200);

    // Controls
    r.rect(210, 80, 170, 200, { fill: colors.bgCardLight, rx: 12 });

    // Spring constant slider
    r.text(295, 105, `k: ${this.springConstant} N/m`, { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.rect(220, 115, 150, 8, { fill: colors.border, rx: 4 });
    const kPos = ((this.springConstant - 50) / 250) * 150;
    r.rect(220, 115, kPos, 8, { fill: colors.primary, rx: 4 });

    // Displacement slider
    r.text(295, 150, `x: ${(this.displacement * 100).toFixed(0)} cm`, { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.rect(220, 160, 150, 8, { fill: colors.border, rx: 4 });
    const xPos = (this.displacement / 0.3) * 150;
    r.rect(220, 160, xPos, 8, { fill: colors.primary, rx: 4 });

    // Energy calculation
    const pe = this.calculateElasticPE(this.springConstant, this.displacement);
    r.rect(220, 185, 150, 80, { fill: 'rgba(16, 185, 129, 0.15)', rx: 8 });
    r.text(295, 205, 'Energy Calculation', { fill: colors.primary, fontSize: 11, textAnchor: 'middle' });
    r.text(295, 225, 'PE = ½ × k × x²', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(295, 245, `= ½ × ${this.springConstant} × ${this.displacement.toFixed(2)}²`, { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });
    r.text(295, 260, `PE = ${pe.toFixed(3)} J`, { fill: colors.primary, fontSize: 13, textAnchor: 'middle', fontWeight: 'bold' });

    // Key insight
    r.rect(20, 295, 360, 50, { fill: 'rgba(16, 185, 129, 0.15)', rx: 10 });
    r.text(200, 315, 'Key: PE = ½kx² — Energy grows with x²!', { fill: colors.primary, fontSize: 11, textAnchor: 'middle' });
    r.text(200, 333, 'Double compression = 4× energy', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });

    // Buttons
    r.rect(30, 360, 140, 36, { fill: this.displacement >= 0.03 ? '#d97706' : colors.border, rx: 8 });
    r.text(100, 383, '🚀 Release', { fill: colors.textPrimary, fontSize: 11, textAnchor: 'middle' });

    r.rect(230, 360, 140, 36, { fill: colors.primaryDark, rx: 8 });
    r.text(300, 383, 'Review →', { fill: colors.textPrimary, fontSize: 11, textAnchor: 'middle' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 60, 'Elastic PE Explained', { fill: colors.textPrimary, fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });

    // Formula box
    r.rect(20, 80, 175, 100, { fill: 'rgba(16, 185, 129, 0.15)', rx: 12 });
    r.text(107, 100, '📐 The Formula', { fill: colors.primary, fontSize: 11, textAnchor: 'middle' });
    r.rect(30, 110, 155, 25, { fill: colors.bgCardLight, rx: 6 });
    r.text(107, 128, 'PE = ½kx²', { fill: colors.textPrimary, fontSize: 13, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(107, 150, 'k = spring constant (N/m)', { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });
    r.text(107, 165, 'x = displacement (m)', { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });

    // x² effect
    r.rect(205, 80, 175, 100, { fill: 'rgba(34, 211, 238, 0.15)', rx: 12 });
    r.text(292, 100, '📊 The x² Effect', { fill: colors.accent, fontSize: 11, textAnchor: 'middle' });
    r.text(292, 120, '2× compression → 4× energy', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(292, 138, '3× compression → 9× energy', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(292, 156, '10× compression → 100× energy', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(292, 174, 'Energy grows fast!', { fill: colors.accent, fontSize: 10, textAnchor: 'middle' });

    // Energy conservation
    r.rect(20, 190, 175, 90, { fill: 'rgba(245, 158, 11, 0.15)', rx: 12 });
    r.text(107, 210, '⚡ Conservation', { fill: '#f59e0b', fontSize: 11, textAnchor: 'middle' });
    r.text(107, 230, 'Elastic PE ↔ Kinetic Energy', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(107, 248, 'KE = ½mv² when released', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(107, 266, 'Total energy conserved!', { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle' });

    // Work connection
    r.rect(205, 190, 175, 90, { fill: 'rgba(168, 85, 247, 0.15)', rx: 12 });
    r.text(292, 210, '🔧 Work-Energy', { fill: '#a855f7', fontSize: 11, textAnchor: 'middle' });
    r.text(292, 230, 'Work = Force × Distance', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(292, 248, 'W = ∫kx·dx = ½kx²', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(292, 266, 'Work → Stored PE', { fill: '#a855f7', fontSize: 10, textAnchor: 'middle' });

    // Next button
    r.rect(100, 300, 200, 40, { fill: '#9333ea', rx: 10 });
    r.text(200, 325, 'Discover the Twist →', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist Challenge', { fill: '#a855f7', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });

    // Scenario
    r.rect(25, 85, 350, 75, { fill: colors.bgCardLight, rx: 12 });
    r.text(200, 108, 'A very stiff spring: 1 mm compression = 50 J!', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(200, 130, 'To compress to 2 mm, is it twice as hard?', { fill: colors.accent, fontSize: 12, textAnchor: 'middle' });

    // Options
    const options = ['A. Yes, exactly 2× force', 'B. No, requires 4× work', 'C. No, requires 8× force', 'D. Actually easier'];
    options.forEach((opt, i) => {
      const yPos = 175 + i * 45;
      const optId = opt[0];
      const isSelected = this.twistPrediction === optId;
      const isCorrect = optId === 'B';

      let fill = colors.bgCardLight;
      if (this.twistPrediction) {
        if (isSelected) fill = isCorrect ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
        else if (isCorrect) fill = 'rgba(16, 185, 129, 0.4)';
      }

      r.rect(25, yPos, 350, 38, { fill, rx: 10 });
      r.text(200, yPos + 24, opt, { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
    });

    if (this.twistPrediction) {
      r.rect(25, 365, 350, 60, { fill: colors.bgCardLight, rx: 12 });
      r.text(200, 388, '✓ 4× energy requires 4× work!', { fill: colors.success, fontSize: 12, textAnchor: 'middle' });
      r.text(200, 408, 'Force doubles, distance doubles → 4× work', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

      r.rect(100, 435, 200, 40, { fill: '#9333ea', rx: 10 });
      r.text(200, 460, 'Explore This →', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 60, 'Work-Energy Deep Dive', { fill: '#a855f7', fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });

    // Graph
    r.rect(20, 85, 170, 130, { fill: colors.bgCardLight, rx: 12 });
    r.text(105, 105, 'Force vs Displacement', { fill: colors.accent, fontSize: 10, textAnchor: 'middle' });

    // Axes
    r.line(40, 195, 175, 195, { stroke: colors.border, strokeWidth: 2 });
    r.line(40, 195, 40, 115, { stroke: colors.border, strokeWidth: 2 });
    r.text(180, 198, 'x', { fill: colors.textMuted, fontSize: 9 });
    r.text(35, 112, 'F', { fill: colors.textMuted, fontSize: 9 });

    // F = kx line
    r.line(40, 195, 165, 120, { stroke: colors.primary, strokeWidth: 3 });
    r.text(145, 125, 'F=kx', { fill: colors.primary, fontSize: 9 });

    // Shaded area
    r.text(90, 175, 'Work = Area', { fill: colors.success, fontSize: 9, textAnchor: 'middle' });

    // Explanation
    r.rect(200, 85, 180, 130, { fill: colors.bgCardLight, rx: 12 });
    r.text(290, 105, 'Why x²?', { fill: '#a855f7', fontSize: 12, textAnchor: 'middle' });
    r.text(290, 128, 'Work = ∫F·dx from 0 to x', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(290, 148, 'Since F = kx:', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.rect(210, 155, 160, 22, { fill: colors.bgCard, rx: 4 });
    r.text(290, 171, 'W = ∫kx·dx = ½kx²', { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });
    r.text(290, 195, 'Triangle: ½ × base × height', { fill: '#a855f7', fontSize: 9, textAnchor: 'middle' });

    // Summary
    r.rect(30, 225, 340, 70, { fill: 'rgba(168, 85, 247, 0.15)', rx: 12 });
    r.text(200, 248, 'The Calculus Behind PE = ½kx²', { fill: '#a855f7', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 268, 'Force increases linearly, work integrates to quadratic!', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(200, 285, 'Integration of linear → quadratic', { fill: colors.success, fontSize: 10, textAnchor: 'middle' });

    r.rect(100, 310, 200, 36, { fill: '#9333ea', rx: 10 });
    r.text(200, 333, 'Review Discovery →', { fill: colors.textPrimary, fontSize: 11, textAnchor: 'middle' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 60, 'Key Discovery', { fill: '#a855f7', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });

    r.rect(30, 90, 340, 170, { fill: 'rgba(168, 85, 247, 0.15)', rx: 16 });
    r.text(200, 118, 'The Power of the Square', { fill: '#a855f7', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });

    r.text(200, 145, "The x² in PE = ½kx² isn't just math -", { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(200, 163, 'it has profound implications:', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });

    r.text(200, 190, '• Small extra compression stores', { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });
    r.text(200, 205, '  disproportionately more energy', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });

    r.text(200, 225, '• Highly compressed springs', { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });
    r.text(200, 240, '  store enormous energy!', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });

    r.rect(100, 275, 200, 40, { fill: colors.primaryDark, rx: 10 });
    r.text(200, 300, 'Explore Applications →', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 60, 'Real-World Applications', { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });

    // App tabs
    transferApps.forEach((app, i) => {
      const tabX = 25 + i * 90;
      const isActive = this.selectedApp === i;
      const isCompleted = this.completedApps[i];

      r.rect(tabX, 80, 80, 28, {
        fill: isActive ? colors.primaryDark : (isCompleted ? 'rgba(16, 185, 129, 0.3)' : colors.bgCardLight),
        rx: 8
      });
      r.text(tabX + 40, 98, `${app.icon} ${app.short}`, { fill: colors.textPrimary, fontSize: 9, textAnchor: 'middle' });
    });

    const app = transferApps[this.selectedApp];

    // Content
    r.rect(20, 120, 360, 200, { fill: colors.bgCardLight, rx: 12 });

    r.text(40, 145, app.icon, { fontSize: 20 });
    r.text(70, 140, app.title, { fill: colors.textPrimary, fontSize: 12 });
    r.text(70, 157, app.tagline, { fill: colors.textMuted, fontSize: 9 });

    r.text(200, 180, app.description, { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });

    // Connection
    r.rect(30, 195, 170, 50, { fill: colors.bgCard, rx: 8 });
    r.text(115, 210, 'Physics Connection', { fill: colors.primary, fontSize: 9, textAnchor: 'middle' });
    r.text(115, 228, app.connection.substring(0, 45), { fill: colors.textMuted, fontSize: 8, textAnchor: 'middle' });

    // Stats
    r.rect(210, 195, 160, 50, { fill: colors.bgCard, rx: 8 });
    r.text(290, 210, 'Key Stats', { fill: colors.accent, fontSize: 9, textAnchor: 'middle' });
    app.stats.slice(0, 2).forEach((stat, i) => {
      r.text(290, 225 + i * 12, `${stat.value} ${stat.label}`, { fill: colors.textMuted, fontSize: 8, textAnchor: 'middle' });
    });

    // Mark complete
    if (!this.completedApps[this.selectedApp]) {
      r.rect(100, 260, 200, 32, { fill: colors.primaryDark, rx: 8 });
      r.text(200, 281, 'Mark Understood', { fill: colors.textPrimary, fontSize: 11, textAnchor: 'middle' });
    }

    // Progress
    const completedCount = this.completedApps.filter(c => c).length;
    r.text(200, 310, `Progress: ${completedCount}/4`, { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    transferApps.forEach((_, i) => {
      r.circle(160 + i * 25, 325, 5, { fill: this.completedApps[i] ? colors.primary : colors.border });
    });

    if (completedCount >= 4) {
      r.rect(100, 345, 200, 36, { fill: colors.primaryDark, rx: 10 });
      r.text(200, 368, 'Take the Test →', { fill: colors.textPrimary, fontSize: 11, textAnchor: 'middle' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    r.text(200, 55, 'Knowledge Assessment', { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });

    if (!this.testSubmitted) {
      // Question indicator
      r.text(200, 80, `Question ${this.testQuestion + 1}/10`, { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

      const q = testQuestions[this.testQuestion];

      r.rect(20, 95, 360, 65, { fill: colors.bgCardLight, rx: 10 });
      r.text(200, 115, q.scenario.substring(0, 55), { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });
      r.text(200, 135, q.question.substring(0, 55), { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });

      // Options
      q.options.forEach((opt, i) => {
        const yPos = 170 + i * 38;
        const isSelected = this.testAnswers[this.testQuestion] === i;
        r.rect(25, yPos, 350, 32, { fill: isSelected ? 'rgba(16, 185, 129, 0.3)' : colors.bgCardLight, rx: 8 });
        r.text(200, yPos + 20, opt.substring(0, 45), { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });
      });

      // Navigation
      r.rect(30, 330, 100, 32, { fill: this.testQuestion > 0 ? colors.bgCardLight : colors.border, rx: 8 });
      r.text(80, 351, '← Prev', { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });

      r.rect(270, 330, 100, 32, { fill: this.testQuestion < 9 ? colors.bgCardLight : colors.border, rx: 8 });
      r.text(320, 351, 'Next →', { fill: colors.textPrimary, fontSize: 10, textAnchor: 'middle' });

      // Submit
      const allAnswered = this.testAnswers.every(a => a !== null);
      r.rect(100, 375, 200, 40, { fill: allAnswered ? colors.primaryDark : colors.border, rx: 10 });
      r.text(200, 400, 'Submit Answers', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
    } else {
      // Results
      const score = this.calculateScore();

      r.rect(80, 90, 240, 100, { fill: colors.bgCardLight, rx: 16 });
      r.text(200, 120, score >= 7 ? '🎉' : '📚', { fontSize: 28, textAnchor: 'middle' });
      r.text(200, 155, `Score: ${score}/10`, { fill: colors.textPrimary, fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });
      r.text(200, 178, score >= 7 ? "Excellent! You've mastered Elastic PE!" : 'Review and try again.', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

      // Question summary
      for (let i = 0; i < 10; i++) {
        const col = i % 5;
        const row = Math.floor(i / 5);
        const x = 50 + col * 65;
        const y = 210 + row * 45;

        const isCorrect = this.testAnswers[i] === testQuestions[i].correctIndex;
        r.rect(x, y, 55, 35, { fill: isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)', rx: 6 });
        r.text(x + 27, y + 15, `Q${i + 1}`, { fill: isCorrect ? colors.success : colors.danger, fontSize: 9, textAnchor: 'middle' });
        r.text(x + 27, y + 28, isCorrect ? '✓' : '✗', { fill: isCorrect ? colors.success : colors.danger, fontSize: 11, textAnchor: 'middle' });
      }

      if (score >= 7) {
        r.rect(100, 320, 200, 40, { fill: colors.primaryDark, rx: 10 });
        r.text(200, 345, 'Claim Mastery →', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
      } else {
        r.rect(100, 320, 200, 40, { fill: colors.primaryDark, rx: 10 });
        r.text(200, 345, 'Review & Retry', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Background glow
    r.rect(50, 80, 300, 280, { fill: 'rgba(16, 185, 129, 0.15)', rx: 24 });

    // Trophy
    r.text(200, 130, '🔋', { fontSize: 48, textAnchor: 'middle' });

    // Title
    r.text(200, 175, 'Elastic Energy Master!', { fill: colors.textPrimary, fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 200, "You've mastered elastic potential energy!", { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });

    // Badges
    const badges = [
      { icon: '📐', label: 'PE=½kx²' },
      { icon: '📊', label: 'Quadratic' },
      { icon: '⚡', label: 'Storage' },
      { icon: '🔄', label: 'Conserve' }
    ];

    badges.forEach((badge, i) => {
      const x = 75 + i * 65;
      r.rect(x, 220, 55, 50, { fill: colors.bgCardLight, rx: 8 });
      r.text(x + 27, 242, badge.icon, { fontSize: 16, textAnchor: 'middle' });
      r.text(x + 27, 260, badge.label, { fill: colors.textSecondary, fontSize: 8, textAnchor: 'middle' });
    });

    r.rect(120, 290, 160, 36, { fill: colors.bgCardLight, rx: 10 });
    r.text(200, 313, '↺ Explore Again', { fill: colors.textPrimary, fontSize: 11, textAnchor: 'middle' });

    r.text(200, 355, 'Certified in Elastic Potential Energy!', { fill: colors.primary, fontSize: 11, textAnchor: 'middle' });
  }

  getCurrentPhase(): string {
    return this.phase;
  }

  getState(): object {
    return {
      phase: this.phase,
      springConstant: this.springConstant,
      displacement: this.displacement,
      isAnimating: this.isAnimating,
      animationTime: this.animationTime,
      releaseMode: this.releaseMode,
      showEnergyBars: this.showEnergyBars,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      testQuestion: this.testQuestion,
      testAnswers: [...this.testAnswers],
      testSubmitted: this.testSubmitted,
      selectedApp: this.selectedApp,
      completedApps: [...this.completedApps]
    };
  }

  restoreState(state: Record<string, unknown>): void {
    this.phase = state.phase as GamePhase;
    this.springConstant = state.springConstant as number;
    this.displacement = state.displacement as number;
    this.isAnimating = state.isAnimating as boolean;
    this.animationTime = state.animationTime as number;
    this.releaseMode = state.releaseMode as boolean;
    this.showEnergyBars = state.showEnergyBars as boolean;
    this.prediction = state.prediction as string | null;
    this.twistPrediction = state.twistPrediction as string | null;
    this.testQuestion = state.testQuestion as number;
    this.testAnswers = [...(state.testAnswers as (number | null)[])];
    this.testSubmitted = state.testSubmitted as boolean;
    this.selectedApp = state.selectedApp as number;
    this.completedApps = [...(state.completedApps as boolean[])];
  }
}

export function createElasticPotentialEnergyGame(sessionId: string) {
  return new ElasticPotentialEnergyGame(sessionId);
}
