/**
 * Capacitive Touch Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Capacitive coupling principles
 * - Grid intersection detection algorithms
 * - Human body as capacitor (finger capacitance ~100pF)
 * - Self vs mutual capacitance sensing
 * - Touch detection threshold calculations
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

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

interface TouchPoint {
  x: number;
  y: number;
  detected: boolean;
}

const testQuestions: TestQuestion[] = [
  { question: 'What does your finger change when touching a capacitive screen?', options: ['Temperature', 'Local capacitance', 'Brightness', 'Resistance'], correctIndex: 1 },
  { question: 'Why don\'t regular gloves work on touchscreens?', options: ['Too thick', 'Block capacitive coupling', 'Create static', 'Can\'t sense warmth'], correctIndex: 1 },
  { question: 'How does the screen know WHERE you touched?', options: ['Camera watches', 'Pressure sensors', 'Grid detects which intersection changed', 'Sound waves'], correctIndex: 2 },
  { question: 'Why can capacitive screens detect multiple touches?', options: ['Multiple pressure sensors', 'Each touch changes capacitance at different grid location', 'Multiple layers', 'Fast CPU'], correctIndex: 1 },
  { question: 'What makes capacitive gloves work?', options: ['Thinner material', 'Conductive threads allow capacitive coupling', 'Built-in heaters', 'Special coating'], correctIndex: 1 },
  { question: 'Your finger acts as what in the circuit?', options: ['Resistor', 'One plate of a capacitor', 'Inductor', 'Ground wire'], correctIndex: 1 },
  { question: 'Projected capacitive touch (PCT) measures:', options: ['Pressure', 'Temperature', 'Changes in mutual capacitance between electrodes', 'Color'], correctIndex: 2 },
  { question: 'Why doesn\'t a plastic stylus work on capacitive screens?', options: ['Too light', 'Plastic is an insulator - no capacitive coupling', 'Wrong color', 'Too smooth'], correctIndex: 1 },
  { question: 'What frequency does capacitive sensing typically use?', options: ['1 Hz', '10-100 kHz', '1 GHz', 'DC only'], correctIndex: 1 },
  { question: 'Water on a screen causes problems because:', options: ['It\'s cold', 'Water conducts and creates false capacitance changes', 'It\'s transparent', 'It\'s heavy'], correctIndex: 1 },
];

const colors = {
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  accent: '#22c55e',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  bgDark: '#0a0f1a',
  bgCard: '#1a1a2e',
  bgCardLight: '#252542',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  gridBlue: '#3b82f6',
  gridGreen: '#22c55e',
  touchActive: '#3b82f6',
  touchInactive: '#ef4444',
};

const applications = [
  { title: 'Smartphones', icon: 'phone', description: 'Projected capacitive touch enables multi-touch gestures like pinch-to-zoom.', details: 'Modern phones sense up to 10 simultaneous touches with high accuracy.' },
  { title: 'Touch Gloves', icon: 'gloves', description: 'Conductive threads in fingertips allow capacitive coupling through the material.', details: 'Silver or copper threads woven into fabric maintain conductivity.' },
  { title: 'Stylus Pens', icon: 'stylus', description: 'Active styluses have electronics that mimic finger capacitance.', details: 'Apple Pencil uses both touch and hover detection for precise drawing.' },
  { title: 'Car Displays', icon: 'car', description: 'Infotainment systems use capacitive touch with haptic feedback.', details: 'Some cars add vibration motors to simulate button feel on flat screens.' },
];

export class CapacitiveTouchGame extends BaseGame {
  readonly gameType = 'capacitive_touch';
  readonly gameTitle = 'Capacitive Touch';

  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  private touchPoints: TouchPoint[] = [];
  private touchMode: 'finger' | 'glove' | 'stylus' = 'finger';
  private showGrid = true;
  private time = 0;

  private testQuestion = 0;
  private testAnswers: (number | null)[] = Array(10).fill(null);
  private testSubmitted = false;

  private selectedApp = 0;
  private completedApps = [false, false, false, false];

  private lastNavTime = 0;
  private isNavigating = false;
  private guidedMode = true;

  private readonly phaseOrder: GamePhase[] = [
    'hook', 'predict', 'play', 'review', 'twist_predict',
    'twist_play', 'twist_review', 'transfer', 'test', 'mastery',
  ];

  private readonly phaseLabels: Record<GamePhase, string> = {
    hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review',
    twist_predict: 'Twist', twist_play: 'Demo', twist_review: 'Discovery',
    transfer: 'Apply', test: 'Test', mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Your phone knows exactly where you touch it. How does glass sense your finger?',
    predict: 'Think about what makes your finger special compared to other objects...',
    play: 'Touch the screen! Watch how the capacitive grid detects your finger.',
    review: 'Your finger forms a capacitor with the screen electrodes!',
    twist_predict: 'Why don\'t regular gloves work, but special touch gloves do?',
    twist_play: 'Compare finger, glove, and capacitive glove touches!',
    twist_review: 'Conductive gloves maintain the capacitive coupling your body provides.',
    transfer: 'From phones to cars - capacitive touch is everywhere!',
    test: 'Test your understanding of capacitive sensing!',
    mastery: 'You understand capacitive touch!',
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
    this.emitCoachEvent('game_started', { phase: this.phase });
  }

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click': this.handleButtonClick(input.id!); break;
      case 'toggle_change': this.handleToggleChange(input.id!, input.value); break;
      case 'progress_click': this.handleProgressClick(input.index!); break;
      case 'touch':
        if (input.x !== undefined && input.y !== undefined) {
          this.handleTouch(input.x, input.y);
        }
        break;
    }
  }

  private handleButtonClick(id: string): void {
    if (id === 'next') { this.goNext(); return; }
    if (id === 'back') { this.goBack(); return; }

    if (id.startsWith('predict_')) { this.prediction = id.replace('predict_', ''); return; }
    if (id.startsWith('twist_')) { this.twistPrediction = id.replace('twist_', ''); return; }
    if (id.startsWith('answer_')) { this.testAnswers[this.testQuestion] = parseInt(id.replace('answer_', ''), 10); return; }
    if (id === 'test_next' && this.testQuestion < 9) { this.testQuestion++; return; }
    if (id === 'test_prev' && this.testQuestion > 0) { this.testQuestion--; return; }
    if (id === 'test_submit') { this.testSubmitted = true; return; }
    if (id.startsWith('app_')) { const idx = parseInt(id.replace('app_', ''), 10); this.selectedApp = idx; this.completedApps[idx] = true; return; }

    if (id === 'mode_finger') { this.touchMode = 'finger'; this.touchPoints = []; return; }
    if (id === 'mode_glove') { this.touchMode = 'glove'; this.touchPoints = []; return; }
    if (id === 'mode_stylus') { this.touchMode = 'stylus'; this.touchPoints = []; return; }
    if (id === 'clear_touches') { this.touchPoints = []; return; }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'show_grid') { this.showGrid = value; }
  }

  private handleProgressClick(index: number): void {
    const currentIdx = this.phaseOrder.indexOf(this.phase);
    if (index < currentIdx) { this.goToPhase(this.phaseOrder[index]); }
  }

  private handleTouch(x: number, y: number): void {
    if (this.phase !== 'play' && this.phase !== 'twist_play') return;

    const detected = this.touchMode === 'finger' || this.touchMode === 'stylus';
    this.touchPoints.push({ x, y, detected });

    if (this.touchPoints.length > 5) {
      this.touchPoints.shift();
    }
  }

  private goToPhase(newPhase: GamePhase): void {
    const now = Date.now();
    if (now - this.lastNavTime < 200 || this.isNavigating) return;
    this.lastNavTime = now;
    this.isNavigating = true;
    this.phase = newPhase;
    this.touchPoints = [];
    this.emitCoachEvent('phase_changed', { phase: newPhase });
    setTimeout(() => { this.isNavigating = false; }, 400);
  }

  private goNext(): void {
    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx < this.phaseOrder.length - 1) this.goToPhase(this.phaseOrder[idx + 1]);
  }

  private goBack(): void {
    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx > 0) this.goToPhase(this.phaseOrder[idx - 1]);
  }

  /** PROTECTED: Calculate capacitance change from finger */
  private calculateCapacitanceChange(): number {
    if (this.touchMode === 'glove') return 0;
    return 15; // ~15pF typical finger contribution
  }

  /** PROTECTED: Determine if touch is detected based on mode */
  private isTouchDetected(): boolean {
    return this.touchMode === 'finger' || this.touchMode === 'stylus';
  }

  update(deltaTime: number): void {
    this.time += deltaTime / 1000;
  }

  private calculateTestScore(): number {
    let correct = 0;
    for (let i = 0; i < testQuestions.length; i++) {
      if (this.testAnswers[i] === testQuestions[i].correctIndex) correct++;
    }
    return correct;
  }

  render(): GameFrame {
    const r = new CommandRenderer(this.viewport.width, this.viewport.height);
    r.reset();
    r.setViewport(700, 500);
    r.clear(colors.bgDark);

    switch (this.phase) {
      case 'hook': this.renderHookPhase(r); break;
      case 'predict': this.renderPredictPhase(r); break;
      case 'play': this.renderPlayPhase(r); break;
      case 'review': this.renderReviewPhase(r); break;
      case 'twist_predict': this.renderTwistPredictPhase(r); break;
      case 'twist_play': this.renderTwistPlayPhase(r); break;
      case 'twist_review': this.renderTwistReviewPhase(r); break;
      case 'transfer': this.renderTransferPhase(r); break;
      case 'test': this.renderTestPhase(r); break;
      case 'mastery': this.renderMasteryPhase(r); break;
    }

    this.renderUIState(r);
    return r.toFrame(this.nextFrame());
  }

  private renderTouchScreen(r: CommandRenderer, centerX: number, centerY: number, w: number, h: number): void {
    r.rect(centerX - w/2, centerY - h/2, w, h, { fill: colors.bgCard, stroke: colors.border, rx: 12 });

    const gridSize = 8;
    const cellW = w / gridSize;
    const cellH = h / gridSize;
    const startX = centerX - w/2;
    const startY = centerY - h/2;

    // Grid
    if (this.showGrid) {
      for (let i = 0; i <= gridSize; i++) {
        r.line(startX, startY + i * cellH, startX + w, startY + i * cellH, { stroke: colors.gridBlue, strokeWidth: 1, opacity: 0.3 });
        r.line(startX + i * cellW, startY, startX + i * cellW, startY + h, { stroke: colors.gridGreen, strokeWidth: 1, opacity: 0.3 });
      }

      // Grid intersections
      for (let i = 0; i <= gridSize; i++) {
        for (let j = 0; j <= gridSize; j++) {
          r.circle(startX + i * cellW, startY + j * cellH, 3, { fill: colors.border });
        }
      }
    }

    // Touch points
    this.touchPoints.forEach((point) => {
      const detected = this.isTouchDetected();
      r.circle(point.x, point.y, 25, {
        fill: detected ? colors.touchActive + '40' : colors.touchInactive + '40',
        stroke: detected ? colors.touchActive : colors.touchInactive,
        strokeWidth: 2,
      });

      // Highlight affected grid nodes
      if (detected && this.showGrid) {
        const gridX = Math.round((point.x - startX) / cellW);
        const gridY = Math.round((point.y - startY) / cellH);
        if (gridX >= 0 && gridX <= gridSize && gridY >= 0 && gridY <= gridSize) {
          r.circle(startX + gridX * cellW, startY + gridY * cellH, 8, {
            fill: colors.success,
            opacity: 0.8,
          });
        }
      }
    });

    // Mode indicator
    r.rect(centerX + w/2 - 100, centerY - h/2 + 10, 90, 30, { fill: colors.bgCardLight, rx: 6 });
    r.text(centerX + w/2 - 55, centerY - h/2 + 30, this.touchMode.toUpperCase(), {
      fill: this.isTouchDetected() ? colors.success : colors.danger,
      fontSize: 11,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Capacitance readout
    const deltaC = this.touchPoints.length > 0 ? this.calculateCapacitanceChange() : 0;
    r.rect(startX + 10, startY + h - 40, 120, 30, { fill: colors.bgCardLight, rx: 6 });
    r.text(startX + 70, startY + h - 20, `dC: ${deltaC} pF`, {
      fill: deltaC > 0 ? colors.success : colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderHookPhase(r: CommandRenderer): void {
    r.text(350, 100, 'Capacitive Touch', { fill: colors.textPrimary, fontSize: 32, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 135, 'How does your phone know where you touch?', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });

    r.rect(160, 160, 380, 200, { fill: colors.bgCard, stroke: colors.border, rx: 20 });
    r.text(350, 200, 'A touchscreen is just glass with no buttons.', { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 230, 'Yet it knows exactly where you tap.', { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 270, 'How does it sense your finger?', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
  }

  private renderPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', { fill: colors.textPrimary, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(100, 80, 500, 80, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 115, 'Your finger can activate a touchscreen, but a pencil eraser can\'t.', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 140, 'What property of your finger does the screen detect?', { fill: colors.textPrimary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    if (this.prediction) {
      const isCorrect = this.prediction === 'B';
      r.rect(100, 340, 500, 60, { fill: isCorrect ? '#065f4620' : '#7f1d1d20', stroke: isCorrect ? colors.success : colors.danger, rx: 12 });
      r.text(350, 375, isCorrect ? 'Correct! Your conductive body changes the local capacitance!' : 'Think about what makes human bodies different from plastic.', {
        fill: isCorrect ? colors.success : colors.danger, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle',
      });
    }
  }

  private renderPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Capacitive Touch Lab', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    this.renderTouchScreen(r, 280, 200, 350, 250);

    r.rect(100, 360, 500, 70, { fill: colors.bgCardLight, rx: 12 });
    r.text(350, 385, 'Your finger forms a capacitor with the electrode grid', { fill: colors.primary, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 410, 'The screen detects which intersection\'s capacitance changed!', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Capacitive Touch', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(50, 70, 290, 130, { fill: '#3b82f640', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'How It Works', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    ['Grid of transparent electrodes', 'Finger = conductor with capacitance', 'Touch changes local C at intersection'].forEach((line, i) => {
      r.text(70, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 130, { fill: '#22c55e40', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Multi-Touch', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    ['Each touch affects different grid point', 'Controller scans entire grid rapidly', 'Multiple changes = multiple touches'].forEach((line, i) => {
      r.text(380, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(50, 220, 600, 70, { fill: '#f59e0b40', stroke: colors.warning, rx: 16 });
    r.text(350, 245, 'Key Insight', { fill: colors.warning, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 270, 'Your body is a capacitor! It stores charge that the screen detects.', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Glove Challenge', { fill: colors.accent, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'Regular gloves don\'t work on touchscreens.', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 155, 'But special "touch gloves" do. What\'s different about them?', { fill: colors.textPrimary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'B';
      r.rect(100, 340, 500, 60, { fill: isCorrect ? '#065f4620' : '#7f1d1d20', stroke: isCorrect ? colors.success : colors.danger, rx: 12 });
      r.text(350, 375, isCorrect ? 'Right! Conductive threads maintain capacitive coupling through the fabric!' : 'Think about what property needs to reach the screen.', {
        fill: isCorrect ? colors.success : colors.danger, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle',
      });
    }
  }

  private renderTwistPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Touch Mode Comparison', { fill: colors.accent, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    this.renderTouchScreen(r, 280, 200, 350, 250);

    r.rect(100, 360, 500, 70, { fill: colors.bgCardLight, rx: 12 });
    const modeText = this.touchMode === 'finger' ? 'Finger: conductive - DETECTED' :
                     this.touchMode === 'glove' ? 'Regular glove: insulating - NOT detected' :
                     'Capacitive stylus: conductive tip - DETECTED';
    r.text(350, 395, modeText, {
      fill: this.isTouchDetected() ? colors.success : colors.danger,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Conductive Coupling', { fill: colors.accent, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(100, 90, 500, 150, { fill: '#22c55e30', stroke: colors.accent, rx: 16 });
    r.text(350, 120, 'Why Touch Gloves Work', { fill: colors.accent, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 155, 'Conductive threads (silver/copper) woven into fingertips', { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 180, 'Connect your body\'s capacitance through the fabric', { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 215, 'Screen sees the same capacitance change as bare skin!', { fill: colors.success, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
  }

  private renderTransferPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Real-World Applications', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    applications.forEach((app, i) => {
      const x = 80 + i * 155;
      r.rect(x, 70, 140, 40, {
        fill: i === this.selectedApp ? colors.primary : colors.bgCard,
        stroke: this.completedApps[i] ? colors.success : colors.border, rx: 8,
      });
      r.text(x + 70, 95, app.title.split(' ')[0], {
        fill: i === this.selectedApp ? colors.textPrimary : colors.textSecondary, fontSize: 11, textAnchor: 'middle',
      });
    });

    const app = applications[this.selectedApp];
    r.rect(80, 130, 540, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 165, app.title, { fill: colors.textPrimary, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 200, app.description, { fill: colors.textSecondary, fontSize: 13, textAnchor: 'middle' });
    r.text(350, 260, app.details, { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });

    r.text(350, 360, `Progress: ${this.completedApps.filter(c => c).length}/4`, { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    applications.forEach((_, i) => { r.circle(310 + i * 25, 385, 6, { fill: this.completedApps[i] ? colors.success : colors.bgCardLight }); });
  }

  private renderTestPhase(r: CommandRenderer): void {
    if (this.testSubmitted) {
      const score = this.calculateTestScore();
      const passed = score >= 7;
      r.text(350, 100, passed ? 'Congratulations!' : 'Keep Learning!', { fill: passed ? colors.success : colors.warning, fontSize: 32, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(350, 160, `Score: ${score} / 10`, { fill: colors.textPrimary, fontSize: 24, textAnchor: 'middle' });
      return;
    }

    const q = testQuestions[this.testQuestion];
    r.text(350, 40, `Question ${this.testQuestion + 1} of 10`, { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 80, q.question, { fill: colors.textPrimary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    q.options.forEach((opt, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;
      r.rect(100, 110 + i * 55, 500, 45, { fill: isSelected ? colors.primary + '40' : colors.bgCard, stroke: isSelected ? colors.primary : colors.border, rx: 8 });
      r.text(350, 138 + i * 55, opt, { fill: isSelected ? colors.primary : colors.textSecondary, fontSize: 13, textAnchor: 'middle' });
    });
  }

  private renderMasteryPhase(r: CommandRenderer): void {
    r.rect(150, 80, 400, 340, { fill: colors.bgCard, stroke: colors.border, rx: 24 });
    r.text(350, 130, 'Touch Technology Master!', { fill: colors.textPrimary, fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 165, 'You understand capacitive touch!', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });

    const badges = [{ icon: 'grid', label: 'Electrode Grid' }, { icon: 'C', label: 'Capacitance' }, { icon: 'multi', label: 'Multi-Touch' }, { icon: 'phone', label: 'Applications' }];
    badges.forEach((badge, i) => {
      const x = 180 + (i % 2) * 170;
      const y = 200 + Math.floor(i / 2) * 80;
      r.rect(x, y, 150, 60, { fill: colors.bgCardLight, rx: 12 });
      r.text(x + 75, y + 25, badge.icon, { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x + 75, y + 45, badge.label, { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    });
  }

  private renderUIState(r: CommandRenderer): void {
    r.setHeader(this.gameTitle, this.phaseLabels[this.phase]);
    r.setProgress({ id: 'progress', current: this.phaseOrder.indexOf(this.phase) + 1, total: 10, labels: this.phaseOrder.map(p => this.phaseLabels[p]), color: colors.primary });
    if (this.guidedMode) r.setCoachMessage(this.coachMessages[this.phase]);

    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx > 0) r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });

    switch (this.phase) {
      case 'hook': r.addButton({ id: 'next', label: 'Make a Prediction', variant: 'primary' }); break;
      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Temperature', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Electrical capacitance', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Pressure', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. Color', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) r.addButton({ id: 'next', label: 'See the Lab', variant: 'success' });
        break;
      case 'play':
        r.addToggle({ id: 'show_grid', label: 'Show Grid', value: this.showGrid });
        r.addButton({ id: 'clear_touches', label: 'Clear', variant: 'ghost' });
        r.addButton({ id: 'next', label: 'Review', variant: 'primary' });
        break;
      case 'review': r.addButton({ id: 'next', label: 'Try Glove Challenge', variant: 'warning' }); break;
      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Thinner material', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Conductive threads', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Warmer fabric', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        if (this.twistPrediction) r.addButton({ id: 'next', label: 'Compare Modes', variant: 'success' });
        break;
      case 'twist_play':
        r.addButton({ id: 'mode_finger', label: 'Finger', variant: this.touchMode === 'finger' ? 'primary' : 'ghost' });
        r.addButton({ id: 'mode_glove', label: 'Regular Glove', variant: this.touchMode === 'glove' ? 'primary' : 'ghost' });
        r.addButton({ id: 'mode_stylus', label: 'Capacitive Stylus', variant: this.touchMode === 'stylus' ? 'primary' : 'ghost' });
        r.addButton({ id: 'next', label: 'See Why', variant: 'primary' });
        break;
      case 'twist_review': r.addButton({ id: 'next', label: 'Applications', variant: 'primary' }); break;
      case 'transfer':
        applications.forEach((_, i) => r.addButton({ id: `app_${i}`, label: applications[i].title.split(' ')[0], variant: i === this.selectedApp ? 'primary' : 'ghost' }));
        if (this.completedApps.every(c => c)) r.addButton({ id: 'next', label: 'Take Test', variant: 'success' });
        break;
      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= 9 });
          if (this.testAnswers.every(a => a !== null)) r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
        } else {
          if (this.calculateTestScore() >= 7) r.addButton({ id: 'next', label: 'Claim Badge', variant: 'success' });
          else r.addButton({ id: 'back', label: 'Review', variant: 'secondary' });
        }
        break;
      case 'mastery': r.addButton({ id: 'back', label: 'Explore Again', variant: 'secondary' }); break;
    }
  }

  getCurrentPhase(): string { return this.phase; }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase, prediction: this.prediction, twistPrediction: this.twistPrediction,
      touchMode: this.touchMode, showGrid: this.showGrid,
      testQuestion: this.testQuestion, testAnswers: this.testAnswers, testSubmitted: this.testSubmitted,
      selectedApp: this.selectedApp, completedApps: this.completedApps, guidedMode: this.guidedMode,
    };
  }

  restoreState(state: Record<string, unknown>): void {
    this.phase = (state.phase as GamePhase) || 'hook';
    this.prediction = (state.prediction as string) || null;
    this.twistPrediction = (state.twistPrediction as string) || null;
    this.touchMode = (state.touchMode as 'finger' | 'glove' | 'stylus') || 'finger';
    this.showGrid = (state.showGrid as boolean) ?? true;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

export function createCapacitiveTouchGame(sessionId: string): CapacitiveTouchGame {
  return new CapacitiveTouchGame(sessionId);
}
