/**
 * Refrigeration Cycle Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - COP (Coefficient of Performance) formula: COP = Tc/(Th-Tc)
 * - Vapor compression cycle stages
 * - Carnot efficiency limits
 * - Enthalpy calculations
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
    question: 'The Coefficient of Performance (COP) for a refrigerator is:',
    options: ['Qh/W', 'Qc/W', 'W/Qc', '(Th-Tc)/Tc'],
    correctIndex: 1,
  },
  {
    question: 'A COP of 4 means the refrigerator:',
    options: ['Uses 4 units of work per unit of heat', 'Moves 4 units of heat per unit of work', 'Has 25% efficiency', 'Is 4 times better than Carnot'],
    correctIndex: 1,
  },
  {
    question: 'In the vapor compression cycle, the compressor:',
    options: ['Cools the refrigerant', 'Increases pressure and temperature', 'Removes heat to outside', 'Absorbs heat from inside'],
    correctIndex: 1,
  },
  {
    question: 'The expansion valve causes:',
    options: ['Pressure drop and cooling', 'Pressure increase', 'Temperature increase', 'Evaporation to liquid'],
    correctIndex: 0,
  },
  {
    question: 'Heat is released to the environment in the:',
    options: ['Evaporator', 'Condenser', 'Compressor', 'Expansion valve'],
    correctIndex: 1,
  },
  {
    question: 'The Carnot COP for cooling (Tc=250K, Th=300K) is:',
    options: ['1', '5', '50', '0.2'],
    correctIndex: 1,
  },
  {
    question: 'Refrigerants change phase because:',
    options: ['They are special chemicals', 'Pressure changes cause boiling point changes', 'The compressor heats them', 'They are pumped in a cycle'],
    correctIndex: 1,
  },
  {
    question: 'A heat pump heating a house has COP:',
    options: ['Always less than 1', 'Equal to refrigerator COP', 'Equal to refrigerator COP + 1', 'Unrelated to refrigerator COP'],
    correctIndex: 2,
  },
  {
    question: 'Real refrigerators have lower COP than Carnot because:',
    options: ['They use wrong refrigerants', 'Irreversibilities and friction exist', 'They run too fast', 'The cycle is different'],
    correctIndex: 1,
  },
  {
    question: 'The evaporator is located:',
    options: ['Outside the refrigerator', 'Inside where cooling is needed', 'At the back always', 'In the compressor'],
    correctIndex: 1,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#06b6d4',
  primaryDark: '#0891b2',
  accent: '#f97316',
  accentDark: '#ea580c',
  warning: '#eab308',
  success: '#22c55e',
  danger: '#ef4444',
  bgDark: '#0a0a0f',
  bgCard: '#12121a',
  bgCardLight: '#1e1e2e',
  border: '#2a2a3e',
  textPrimary: '#fafafa',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  cold: '#3b82f6',
  hot: '#ef4444',
  refrigerant: '#22c55e',
  compressor: '#8b5cf6',
};

// === APPLICATION DATA ===
interface Application {
  title: string;
  icon: string;
  description: string;
  details: string;
}

const applications: Application[] = [
  {
    title: 'Home Refrigerators',
    icon: 'fridge',
    description: 'Keep food fresh by moving heat from inside to outside.',
    details: 'Typical COP of 3-5, meaning 1 kW of electricity moves 3-5 kW of heat.',
  },
  {
    title: 'Air Conditioning',
    icon: 'ac',
    description: 'Cool buildings by removing heat to the outside.',
    details: 'Same cycle as refrigerators but larger scale. Efficiency drops in extreme heat.',
  },
  {
    title: 'Heat Pumps',
    icon: 'heat',
    description: 'Reverse the cycle to heat buildings efficiently.',
    details: 'COP of 3-4 means 3-4 units of heat delivered per unit of electricity - better than electric heating!',
  },
  {
    title: 'Industrial Cooling',
    icon: 'factory',
    description: 'Large-scale cooling for food processing and data centers.',
    details: 'Data centers use massive chillers - cooling is a major energy cost.',
  },
];

// === MAIN GAME CLASS ===

export class RefrigerationCycleGame extends BaseGame {
  readonly gameType = 'refrigeration_cycle';
  readonly gameTitle = 'Refrigeration Cycle';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private coldTemp = 255; // K (-18°C freezer)
  private hotTemp = 300; // K (27°C room)
  private workInput = 100; // W
  private cycleStage = 0; // 0-3 for four stages
  private isAnimating = true;
  private time = 0;
  private showFlow = true;

  // Test state
  private testQuestion = 0;
  private testAnswers: (number | null)[] = Array(10).fill(null);
  private testSubmitted = false;

  // Transfer phase state
  private selectedApp = 0;
  private completedApps = [false, false, false, false];

  // Navigation
  private lastNavTime = 0;
  private isNavigating = false;
  private guidedMode = true;

  // Phase configuration
  private readonly phaseOrder: GamePhase[] = [
    'hook', 'predict', 'play', 'review',
    'twist_predict', 'twist_play', 'twist_review',
    'transfer', 'test', 'mastery',
  ];

  private readonly phaseLabels: Record<GamePhase, string> = {
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

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'How does a refrigerator move heat from cold to hot? It seems to violate thermodynamics!',
    predict: 'If 1 kW powers a fridge, how much heat does it move from inside?',
    play: 'Watch the vapor compression cycle - compress, condense, expand, evaporate!',
    review: 'COP = Qc/W. Good refrigerators have COP of 3-5. That\'s 3-5x the heat per unit of work!',
    twist_predict: 'What limits how efficient a refrigerator can be?',
    twist_play: 'Explore the Carnot limit - the theoretical maximum efficiency!',
    twist_review: 'Carnot COP = Tc/(Th-Tc). Smaller temperature difference = higher efficiency!',
    transfer: 'From fridges to heat pumps to industrial chillers - the cycle is everywhere!',
    test: 'Time to test your understanding of refrigeration!',
    mastery: 'Congratulations! You\'ve mastered the refrigeration cycle!',
  };

  constructor(sessionId: string) {
    super(sessionId);
  }

  initialize(config: SessionConfig): void {
    super.initialize(config);
    this.guidedMode = config.guidedMode ?? true;

    if (config.resumePhase && this.phaseOrder.includes(config.resumePhase as GamePhase)) {
      this.phase = config.resumePhase as GamePhase;
    }

    this.emitCoachEvent('game_started', {
      phase: this.phase,
      phaseLabel: this.phaseLabels[this.phase],
      message: 'Refrigeration Cycle lesson started',
    });
  }

  // === INPUT HANDLING ===

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click':
        this.handleButtonClick(input.id!);
        break;
      case 'toggle_change':
        this.handleToggleChange(input.id!, input.value);
        break;
      case 'slider_change':
        this.handleSliderChange(input.id!, input.value);
        break;
      case 'progress_click':
        this.handleProgressClick(input.index!);
        break;
      case 'hint_request':
        this.handleHintRequest();
        break;
    }
  }

  private handleButtonClick(id: string): void {
    if (id === 'next') {
      this.goNext();
      return;
    }
    if (id === 'back') {
      this.goBack();
      return;
    }

    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }

    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
      this.emitCoachEvent('prediction_made', { twistPrediction: this.twistPrediction });
      return;
    }

    if (id.startsWith('answer_')) {
      this.testAnswers[this.testQuestion] = parseInt(id.replace('answer_', ''), 10);
      return;
    }

    if (id === 'test_next' && this.testQuestion < testQuestions.length - 1) {
      this.testQuestion++;
      return;
    }
    if (id === 'test_prev' && this.testQuestion > 0) {
      this.testQuestion--;
      return;
    }
    if (id === 'test_submit') {
      this.testSubmitted = true;
      this.emitCoachEvent('test_completed', { score: this.calculateTestScore() });
      return;
    }

    if (id.startsWith('app_')) {
      const appIndex = parseInt(id.replace('app_', ''), 10);
      this.selectedApp = appIndex;
      this.completedApps[appIndex] = true;
      return;
    }

    if (id === 'reset') {
      this.resetSimulation();
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'flow') {
      this.showFlow = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'cold_temp') {
      this.coldTemp = value;
      return;
    }
    if (id === 'hot_temp') {
      this.hotTemp = value;
      return;
    }
    if (id === 'work') {
      this.workInput = value;
      return;
    }
  }

  private handleProgressClick(index: number): void {
    const currentIdx = this.phaseOrder.indexOf(this.phase);
    if (index < currentIdx) {
      this.goToPhase(this.phaseOrder[index]);
    }
  }

  private handleHintRequest(): void {
    this.emitCoachEvent('hint_requested', { phase: this.phase });
  }

  // === NAVIGATION ===

  private goToPhase(newPhase: GamePhase): void {
    const now = Date.now();
    if (now - this.lastNavTime < 200 || this.isNavigating) return;

    this.lastNavTime = now;
    this.isNavigating = true;
    this.phase = newPhase;

    if (newPhase === 'play' || newPhase === 'twist_play') {
      this.resetSimulation();
    }

    this.emitCoachEvent('phase_changed', {
      phase: newPhase,
      phaseLabel: this.phaseLabels[newPhase],
    });

    setTimeout(() => {
      this.isNavigating = false;
    }, 400);
  }

  private goNext(): void {
    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx < this.phaseOrder.length - 1) {
      this.goToPhase(this.phaseOrder[idx + 1]);
    }
  }

  private goBack(): void {
    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx > 0) {
      this.goToPhase(this.phaseOrder[idx - 1]);
    }
  }

  // === PHYSICS SIMULATION (PROTECTED - runs on server only) ===

  /**
   * PROTECTED: Carnot COP for refrigeration
   * COP_carnot = Tc / (Th - Tc)
   */
  private calculateCarnotCOP(): number {
    const deltaT = this.hotTemp - this.coldTemp;
    if (deltaT <= 0) return Infinity;
    return this.coldTemp / deltaT;
  }

  /**
   * PROTECTED: Actual COP (assume 60% of Carnot)
   */
  private calculateActualCOP(): number {
    return this.calculateCarnotCOP() * 0.6;
  }

  /**
   * PROTECTED: Heat removed from cold reservoir
   * Qc = COP × W
   */
  private calculateHeatRemoved(): number {
    return this.calculateActualCOP() * this.workInput;
  }

  /**
   * PROTECTED: Heat rejected to hot reservoir
   * Qh = Qc + W
   */
  private calculateHeatRejected(): number {
    return this.calculateHeatRemoved() + this.workInput;
  }

  /**
   * PROTECTED: Convert Kelvin to Celsius
   */
  private kelvinToCelsius(k: number): number {
    return k - 273.15;
  }

  update(deltaTime: number): void {
    if (!this.isAnimating) return;
    if (this.phase !== 'play' && this.phase !== 'twist_play' && this.phase !== 'hook') return;

    this.time += deltaTime / 1000;

    // Cycle through stages
    this.cycleStage = Math.floor(this.time * 0.5) % 4;
  }

  private resetSimulation(): void {
    this.coldTemp = 255;
    this.hotTemp = 300;
    this.workInput = 100;
    this.cycleStage = 0;
    this.time = 0;
    this.isAnimating = true;
  }

  // === TEST SCORING (PROTECTED) ===

  private calculateTestScore(): number {
    let correct = 0;
    for (let i = 0; i < testQuestions.length; i++) {
      if (this.testAnswers[i] === testQuestions[i].correctIndex) {
        correct++;
      }
    }
    return correct;
  }

  // === RENDERING ===

  render(): GameFrame {
    const r = new CommandRenderer(this.viewport.width, this.viewport.height);
    r.reset();
    r.setViewport(700, 500);

    this.renderBackground(r);

    switch (this.phase) {
      case 'hook':
        this.renderHookPhase(r);
        break;
      case 'predict':
        this.renderPredictPhase(r);
        break;
      case 'play':
        this.renderPlayPhase(r);
        break;
      case 'review':
        this.renderReviewPhase(r);
        break;
      case 'twist_predict':
        this.renderTwistPredictPhase(r);
        break;
      case 'twist_play':
        this.renderTwistPlayPhase(r);
        break;
      case 'twist_review':
        this.renderTwistReviewPhase(r);
        break;
      case 'transfer':
        this.renderTransferPhase(r);
        break;
      case 'test':
        this.renderTestPhase(r);
        break;
      case 'mastery':
        this.renderMasteryPhase(r);
        break;
    }

    this.renderUIState(r);

    return r.toFrame(this.nextFrame());
  }

  private renderBackground(r: CommandRenderer): void {
    r.clear(colors.bgDark);
    r.circle(175, 0, 200, { fill: colors.cold, opacity: 0.03 });
    r.circle(525, 500, 200, { fill: colors.hot, opacity: 0.03 });
  }

  private renderRefrigerationCycle(r: CommandRenderer, centerX: number, centerY: number, scale: number = 1): void {
    const stageNames = ['Compression', 'Condensation', 'Expansion', 'Evaporation'];
    const stageColors = [colors.compressor, colors.hot, colors.warning, colors.cold];

    // Cycle diagram - rectangular path
    const boxW = 200 * scale;
    const boxH = 140 * scale;

    // Background boxes for hot and cold sides
    r.rect(centerX - boxW / 2, centerY - boxH / 2 - 30, boxW, 40, {
      fill: colors.hot,
      opacity: 0.2,
      rx: 8,
    });
    r.text(centerX, centerY - boxH / 2 - 15, `HOT SIDE: ${this.kelvinToCelsius(this.hotTemp).toFixed(0)}°C`, {
      fill: colors.hot,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(centerX - boxW / 2, centerY + boxH / 2 - 10, boxW, 40, {
      fill: colors.cold,
      opacity: 0.2,
      rx: 8,
    });
    r.text(centerX, centerY + boxH / 2 + 10, `COLD SIDE: ${this.kelvinToCelsius(this.coldTemp).toFixed(0)}°C`, {
      fill: colors.cold,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Four components
    const components = [
      { x: centerX + boxW / 2, y: centerY, label: 'Compressor', color: colors.compressor },
      { x: centerX, y: centerY - boxH / 2, label: 'Condenser', color: colors.hot },
      { x: centerX - boxW / 2, y: centerY, label: 'Expansion', color: colors.warning },
      { x: centerX, y: centerY + boxH / 2, label: 'Evaporator', color: colors.cold },
    ];

    // Draw connecting pipes
    r.line(centerX + boxW / 2, centerY - 20, centerX + 20, centerY - boxH / 2, {
      stroke: colors.refrigerant,
      strokeWidth: 4,
    });
    r.line(centerX - 20, centerY - boxH / 2, centerX - boxW / 2, centerY - 20, {
      stroke: colors.refrigerant,
      strokeWidth: 4,
    });
    r.line(centerX - boxW / 2, centerY + 20, centerX - 20, centerY + boxH / 2, {
      stroke: colors.refrigerant,
      strokeWidth: 4,
    });
    r.line(centerX + 20, centerY + boxH / 2, centerX + boxW / 2, centerY + 20, {
      stroke: colors.refrigerant,
      strokeWidth: 4,
    });

    // Draw components
    components.forEach((comp, i) => {
      const isActive = this.cycleStage === i;
      r.rect(comp.x - 30, comp.y - 20, 60, 40, {
        fill: comp.color,
        stroke: isActive ? colors.textPrimary : colors.border,
        strokeWidth: isActive ? 3 : 1,
        rx: 8,
        opacity: isActive ? 1 : 0.7,
      });
      r.text(comp.x, comp.y + 5, comp.label.substring(0, 6), {
        fill: colors.textPrimary,
        fontSize: 9,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
    });

    // Flow indicators
    if (this.showFlow) {
      const flowOffset = (this.time * 50) % 30;
      // Draw flow arrows
      r.text(centerX + boxW / 4 + flowOffset % 20, centerY - boxH / 4, '>', {
        fill: colors.refrigerant,
        fontSize: 14,
      });
      r.text(centerX - boxW / 4, centerY - boxH / 4 + flowOffset % 20, 'v', {
        fill: colors.refrigerant,
        fontSize: 14,
      });
    }

    // Current stage indicator
    r.text(centerX, centerY + boxH / 2 + 50, `Stage: ${stageNames[this.cycleStage]}`, {
      fill: stageColors[this.cycleStage],
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Work input arrow
    r.line(centerX + boxW / 2 + 30, centerY, centerX + boxW / 2 + 60, centerY, {
      stroke: colors.compressor,
      strokeWidth: 3,
    });
    r.text(centerX + boxW / 2 + 45, centerY - 15, `W = ${this.workInput}W`, {
      fill: colors.compressor,
      fontSize: 10,
      textAnchor: 'middle',
    });
  }

  private renderHookPhase(r: CommandRenderer): void {
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.text(350, 49, 'PHYSICS EXPLORATION', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, 'The Heat Pump Mystery', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, 'How can heat flow from cold to hot?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.rect(120, 160, 460, 220, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 20,
      opacity: 0.8,
    });

    this.renderRefrigerationCycle(r, 350, 280, 1);

    r.text(350, 400, 'Work input makes it possible - but how efficiently?', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });
  }

  private renderPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 80, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 115, 'A refrigerator uses 100 W of electrical power.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 140, 'How much heat can it remove from the cold compartment?', {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (this.prediction) {
      const isCorrect = this.prediction === 'C';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 375, isCorrect
        ? 'Correct! With COP of 3-4, it moves 300-400 W of heat!'
        : 'Good refrigerators have COP of 3-4, moving MORE heat than work input!',
        {
          fill: isCorrect ? colors.success : colors.danger,
          fontSize: 13,
          fontWeight: 'bold',
          textAnchor: 'middle',
        }
      );
    }
  }

  private renderPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Refrigeration Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 380, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderRefrigerationCycle(r, 270, 200, 1.1);

    // Stats panel
    r.rect(480, 50, 170, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    const cop = this.calculateActualCOP();
    const qCold = this.calculateHeatRemoved();
    const qHot = this.calculateHeatRejected();

    r.text(565, 80, 'Performance', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });

    r.rect(490, 100, 150, 50, { fill: '#22c55e30', rx: 8 });
    r.text(565, 120, 'COP (Actual)', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    r.text(565, 140, cop.toFixed(2), {
      fill: colors.success,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(490, 160, 150, 50, { fill: '#3b82f630', rx: 8 });
    r.text(565, 180, 'Heat Removed (Qc)', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(565, 200, `${qCold.toFixed(0)} W`, {
      fill: colors.cold,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(490, 220, 150, 50, { fill: '#ef444430', rx: 8 });
    r.text(565, 240, 'Heat Rejected (Qh)', { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(565, 260, `${qHot.toFixed(0)} W`, {
      fill: colors.hot,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 350, 570, 60, { fill: colors.bgCardLight, stroke: colors.border, rx: 12 });
    r.text(365, 375, 'COP = Qc/W - Heat moved per unit of work', {
      fill: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding COP', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 290, 150, { fill: '#06b6d440', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'The Cycle Stages', { fill: colors.primary, fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });
    const cycleInfo = [
      '1. Compress: Low→high pressure, heats up',
      '2. Condense: Release heat to hot side',
      '3. Expand: Pressure drop, cools down',
      '4. Evaporate: Absorb heat from cold side',
    ];
    cycleInfo.forEach((line, i) => {
      r.text(70, 120 + i * 25, line, { fill: colors.textSecondary, fontSize: 10 });
    });

    r.rect(360, 70, 290, 150, { fill: '#22c55e40', stroke: colors.success, rx: 16 });
    r.text(505, 95, 'COP Equations', { fill: colors.success, fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });
    const copInfo = [
      'COP = Qc / W (for cooling)',
      'Qh = Qc + W (energy balance)',
      'COP_heat = Qh / W = COP_cool + 1',
      'Higher COP = more efficient',
    ];
    copInfo.forEach((line, i) => {
      r.text(380, 120 + i * 25, line, { fill: colors.textSecondary, fontSize: 10 });
    });

    r.rect(50, 240, 600, 80, { fill: '#eab30840', stroke: colors.warning, rx: 16 });
    r.text(350, 265, 'Key Insight', { fill: colors.warning, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 290, 'Refrigerators are NOT about creating cold - they MOVE heat from cold to hot using work!', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Carnot Limit', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'Is there a maximum possible COP?', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 145, 'What sets the theoretical limit?', {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'B';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(350, 375, isCorrect
        ? 'Correct! Carnot COP = Tc/(Th-Tc). Smaller ΔT = higher COP!'
        : 'The Carnot limit depends on the temperature difference!',
        {
          fill: isCorrect ? colors.success : colors.danger,
          fontSize: 13,
          fontWeight: 'bold',
          textAnchor: 'middle',
        }
      );
    }
  }

  private renderTwistPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Carnot Limit Lab', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(80, 50, 540, 280, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    this.renderRefrigerationCycle(r, 350, 190, 1.3);

    const carnotCOP = this.calculateCarnotCOP();
    const actualCOP = this.calculateActualCOP();

    r.rect(80, 350, 540, 60, { fill: '#eab30830', stroke: colors.warning, rx: 12 });
    r.text(350, 370, `Carnot COP: ${carnotCOP.toFixed(2)} | Actual COP: ${actualCOP.toFixed(2)} (60% of Carnot)`, {
      fill: colors.warning,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 395, 'COP_carnot = Tc/(Th-Tc) - the theoretical maximum!', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Carnot Efficiency', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 120, 'The Ultimate Limit', {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const explanation = [
      '• Carnot COP = Tc / (Th - Tc)',
      '• Smaller temperature difference → higher COP',
      '• Real refrigerators reach 50-70% of Carnot',
      '• Irreversibilities: friction, heat leaks, finite-time processes',
      '• This is why AC is less efficient on very hot days!',
    ];

    explanation.forEach((line, i) => {
      r.text(120, 150 + i * 28, line, { fill: colors.textSecondary, fontSize: 12 });
    });
  }

  private renderTransferPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Real-World Applications', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const tabWidth = 140;
    applications.forEach((app, i) => {
      const isSelected = i === this.selectedApp;
      const isCompleted = this.completedApps[i];
      const x = 80 + i * (tabWidth + 15);

      r.rect(x, 70, tabWidth, 40, {
        fill: isSelected ? colors.primary : colors.bgCard,
        stroke: isCompleted ? colors.success : colors.border,
        rx: 8,
      });
      r.text(x + tabWidth / 2, 95, app.title.split(' ')[0], {
        fill: isSelected ? colors.textPrimary : colors.textSecondary,
        fontSize: 11,
        textAnchor: 'middle',
      });
    });

    const app = applications[this.selectedApp];
    r.rect(80, 130, 540, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    r.text(350, 165, app.title, {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 200, app.description, {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });

    r.text(350, 260, app.details, {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });

    r.text(350, 360, `Progress: ${this.completedApps.filter((c) => c).length}/4`, {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    applications.forEach((_, i) => {
      r.circle(310 + i * 25, 385, 6, {
        fill: this.completedApps[i] ? colors.success : colors.bgCardLight,
      });
    });
  }

  private renderTestPhase(r: CommandRenderer): void {
    if (this.testSubmitted) {
      this.renderTestResults(r);
      return;
    }

    const q = testQuestions[this.testQuestion];

    r.text(350, 40, `Question ${this.testQuestion + 1} of ${testQuestions.length}`, {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });

    r.text(350, 80, q.question, {
      fill: colors.textPrimary,
      fontSize: 15,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    q.options.forEach((option, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;

      r.rect(100, 110 + i * 55, 500, 45, {
        fill: isSelected ? colors.primary + '40' : colors.bgCard,
        stroke: isSelected ? colors.primary : colors.border,
        rx: 8,
      });
      r.text(350, 138 + i * 55, option, {
        fill: isSelected ? colors.primary : colors.textSecondary,
        fontSize: 13,
        textAnchor: 'middle',
      });
    });
  }

  private renderTestResults(r: CommandRenderer): void {
    const score = this.calculateTestScore();
    const passed = score >= 7;

    r.text(350, 100, passed ? 'Congratulations!' : 'Keep Learning!', {
      fill: passed ? colors.success : colors.warning,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 160, `Score: ${score} / ${testQuestions.length}`, {
      fill: colors.textPrimary,
      fontSize: 24,
      textAnchor: 'middle',
    });

    r.text(350, 200, passed ? 'You\'ve mastered refrigeration!' : 'Review the cycle and try again.', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });
  }

  private renderMasteryPhase(r: CommandRenderer): void {
    r.rect(150, 80, 400, 340, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 24,
    });

    r.text(350, 130, 'Refrigeration Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, 'You\'ve mastered the refrigeration cycle!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'COP', label: 'Efficiency' },
      { icon: '4', label: 'Cycle Stages' },
      { icon: 'Qc', label: 'Heat Transfer' },
      { icon: 'Tc/ΔT', label: 'Carnot Limit' },
    ];

    badges.forEach((badge, i) => {
      const x = 180 + (i % 2) * 170;
      const y = 200 + Math.floor(i / 2) * 80;
      r.rect(x, y, 150, 60, { fill: colors.bgCardLight, rx: 12 });
      r.text(x + 75, y + 25, badge.icon, { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x + 75, y + 45, badge.label, { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    });
  }

  private renderUIState(r: CommandRenderer): void {
    r.setHeader(this.gameTitle, this.phaseLabels[this.phase]);

    r.setProgress({
      id: 'phase_progress',
      current: this.phaseOrder.indexOf(this.phase) + 1,
      total: this.phaseOrder.length,
      labels: this.phaseOrder.map((p) => this.phaseLabels[p]),
      color: colors.primary,
    });

    if (this.guidedMode) {
      r.setCoachMessage(this.coachMessages[this.phase]);
    }

    const idx = this.phaseOrder.indexOf(this.phase);

    if (idx > 0) {
      r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });
    }

    switch (this.phase) {
      case 'hook':
        r.addButton({ id: 'next', label: 'Explore the Cycle', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Less than 100W', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Exactly 100W', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. 300-400W', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'See the Cycle', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'cold_temp', label: 'Cold Temp (K)', value: this.coldTemp, min: 230, max: 280 });
        r.addSlider({ id: 'hot_temp', label: 'Hot Temp (K)', value: this.hotTemp, min: 290, max: 330 });
        r.addSlider({ id: 'work', label: 'Work Input (W)', value: this.workInput, min: 50, max: 200 });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Carnot Limit', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. No limit', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Depends on temps', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Fixed at 5', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Explore Carnot', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({ id: 'cold_temp', label: 'Cold Temp (K)', value: this.coldTemp, min: 230, max: 290 });
        r.addSlider({ id: 'hot_temp', label: 'Hot Temp (K)', value: this.hotTemp, min: 290, max: 340 });
        r.addButton({ id: 'next', label: 'Understand Limits', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Fridge', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'AC', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Heat Pump', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Industrial', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every((c) => c)) {
          r.addButton({ id: 'next', label: 'Take Test', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= testQuestions.length - 1 });
          testQuestions[this.testQuestion].options.forEach((_, i) => {
            r.addButton({ id: `answer_${i}`, label: `Option ${String.fromCharCode(65 + i)}`, variant: this.testAnswers[this.testQuestion] === i ? 'primary' : 'secondary' });
          });
          if (this.testAnswers.every((a) => a !== null)) {
            r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
          }
        } else {
          const score = this.calculateTestScore();
          if (score >= 7) {
            r.addButton({ id: 'next', label: 'Claim Badge', variant: 'success' });
          } else {
            r.addButton({ id: 'back', label: 'Review Again', variant: 'secondary' });
          }
        }
        break;

      case 'mastery':
        r.addButton({ id: 'back', label: 'Explore Again', variant: 'secondary' });
        break;
    }
  }

  // === STATE MANAGEMENT ===

  getCurrentPhase(): string {
    return this.phase;
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      coldTemp: this.coldTemp,
      hotTemp: this.hotTemp,
      workInput: this.workInput,
      showFlow: this.showFlow,
      testQuestion: this.testQuestion,
      testAnswers: this.testAnswers,
      testSubmitted: this.testSubmitted,
      selectedApp: this.selectedApp,
      completedApps: this.completedApps,
      guidedMode: this.guidedMode,
    };
  }

  restoreState(state: Record<string, unknown>): void {
    this.phase = (state.phase as GamePhase) || 'hook';
    this.prediction = (state.prediction as string) || null;
    this.twistPrediction = (state.twistPrediction as string) || null;
    this.coldTemp = (state.coldTemp as number) || 255;
    this.hotTemp = (state.hotTemp as number) || 300;
    this.workInput = (state.workInput as number) || 100;
    this.showFlow = (state.showFlow as boolean) ?? true;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===

export function createRefrigerationCycleGame(sessionId: string): RefrigerationCycleGame {
  return new RefrigerationCycleGame(sessionId);
}
