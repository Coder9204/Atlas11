/**
 * Drag Force Game - Server-side Implementation
 *
 * Physics: F_d = ½ρv²C_dA
 * Where:
 * - ρ = air density (kg/m³)
 * - v = velocity (m/s)
 * - C_d = drag coefficient (shape-dependent)
 * - A = cross-sectional area (m²)
 *
 * Key concept: Drag increases with velocity SQUARED
 */

import { BaseGame } from '../../types/GameInstance.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

interface TestQuestion {
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface TransferApp {
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  color: string;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PHASES: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const colors = {
  bg: '#0a0f1a',
  text: '#ffffff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  primary: '#0ea5e9',
  primaryDark: '#0284c7',
  secondary: '#3b82f6',
  accent: '#f59e0b',
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  panel: '#1e293b',
  panelDark: '#0f172a',
  border: '#334155',
  sky: '#87ceeb',
  ground: '#2d5a27',
  gravity: '#ff4444',
  drag: '#00ff00',
  skydiver: '#ff6600',
};

export class DragForceGame extends BaseGame {
  readonly gameType = 'drag_force';
  readonly gameTitle = 'Drag Force';

  private phase: Phase = 'hook';
  private frameCount = 0;
  private width = 700;
  private height = 350;

  // Simulation state
  private skydiverY = 50;
  private skydiverVelocity = 0;
  private skydiverShape: 'spread' | 'tucked' = 'spread';
  private isSimulating = false;
  private currentDrag = 0;
  private currentGravity = 0;
  private timeElapsed = 0;
  private showVectors = true;

  // Prediction state
  private selectedPrediction: string | null = null;
  private showPredictionFeedback = false;
  private twistPrediction: string | null = null;
  private showTwistFeedback = false;

  // Transfer state
  private activeAppTab = 0;
  private completedApps = new Set<number>();

  // Golf ball animation
  private smoothBallX = 50;
  private dimpledBallX = 50;
  private golfAnimating = false;
  private golfTime = 0;

  // Test state
  private testAnswers: number[] = Array(10).fill(-1);
  private showTestResults = false;

  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "A skydiver doubles their falling speed from 50 m/s to 100 m/s.",
      question: "What happens to the drag force?",
      options: ["It doubles", "It quadruples", "It stays the same", "It halves"],
      correctIndex: 1,
      explanation: "Drag force depends on v². When velocity doubles, drag quadruples (2² = 4)."
    },
    {
      scenario: "A skydiver is falling and wants to slow down.",
      question: "Which body position creates MORE air resistance?",
      options: ["Tucked ball", "Head-first dive", "Spread eagle", "All the same"],
      correctIndex: 2,
      explanation: "Spread eagle position has the largest cross-sectional area, creating maximum drag."
    },
    {
      scenario: "In the drag equation F = ½ρv²CdA, consider what A represents.",
      question: "What does A represent in the drag equation?",
      options: ["Cross-sectional area", "Altitude", "Acceleration", "Air mass"],
      correctIndex: 0,
      explanation: "A is the cross-sectional area - the silhouette facing the airflow."
    },
    {
      scenario: "Golf balls have dimples despite making the surface rougher.",
      question: "Why do golf balls have dimples?",
      options: ["To look cool", "To reduce drag via turbulent flow", "To add weight", "To improve grip"],
      correctIndex: 1,
      explanation: "Dimples create turbulent flow that stays attached longer, reducing the wake and overall drag."
    },
    {
      scenario: "A car is cruising at highway speeds (60+ mph).",
      question: "What percent of a car's energy fights air resistance at highway speeds?",
      options: ["About 10%", "About 25%", "About 50% or more", "Less than 5%"],
      correctIndex: 2,
      explanation: "At highway speeds, over half of a car's energy is spent overcoming air resistance."
    },
    {
      scenario: "Engineers are designing an aerodynamic vehicle.",
      question: "What shape has the lowest drag coefficient?",
      options: ["Teardrop/streamlined", "Cube", "Flat plate", "Cylinder"],
      correctIndex: 0,
      explanation: "Teardrop shapes minimize flow separation and have Cd values as low as 0.04."
    },
    {
      scenario: "A plane flies from sea level to high altitude where air is thinner.",
      question: "How does air density affect drag force?",
      options: ["No effect", "Higher density = more drag", "Higher density = less drag", "Only affects fast objects"],
      correctIndex: 1,
      explanation: "Drag is proportional to air density (ρ). Thicker air creates more resistance."
    },
    {
      scenario: "Two objects of the same size move through air at the same speed.",
      question: "What is the drag coefficient (Cd) a measure of?",
      options: ["Object's weight", "Object's speed", "Object's shape efficiency", "Air temperature"],
      correctIndex: 2,
      explanation: "Cd measures how aerodynamically efficient a shape is - lower is better."
    },
    {
      scenario: "A cyclist is competing in a time trial race.",
      question: "Why do cyclists tuck during time trials?",
      options: ["To look professional", "To reduce frontal area and drag", "To pedal faster", "To stay warm"],
      correctIndex: 1,
      explanation: "Tucking reduces the frontal area (A in the equation), dramatically reducing drag."
    },
    {
      scenario: "A dimpled golf ball flies farther than a smooth one.",
      question: "What creates the 'drag crisis' effect with dimpled surfaces?",
      options: ["Turbulent flow delaying separation", "Less friction", "Lighter weight", "More spin"],
      correctIndex: 0,
      explanation: "Turbulent boundary layers stay attached longer, creating a smaller wake and less drag."
    }
  ];

  private readonly transferApps: TransferApp[] = [
    {
      title: "Vehicle Aerodynamics",
      short: "Cars",
      tagline: "Millions spent on drag reduction",
      description: "Car designers optimize shapes to reduce drag coefficients. A 10% drag reduction can improve fuel efficiency by 5%.",
      connection: "Spoilers, smooth underbodies, and teardrop shapes minimize the v² penalty at highway speeds.",
      color: colors.secondary
    },
    {
      title: "Cycling Time Trials",
      short: "Cycling",
      tagline: "90% of effort fights air",
      description: "At 30 mph, 90% of a cyclist's effort fights air resistance! Aero helmets and tucked positions save minutes.",
      connection: "Reducing frontal area (A) and using aerodynamic equipment drops Cd dramatically.",
      color: colors.accent
    },
    {
      title: "Swimsuit Technology",
      short: "Swimming",
      tagline: "Shark skin inspiration",
      description: "High-tech swimsuits use textured surfaces like shark skin to reduce drag. Some were so effective they were banned!",
      connection: "Texture creates micro-turbulence that reduces overall drag, similar to golf ball dimples.",
      color: colors.primary
    },
    {
      title: "Building Wind Loads",
      short: "Buildings",
      tagline: "Skyscrapers vs. wind",
      description: "Tall buildings must withstand enormous wind forces. Engineers use rounded corners and tapered shapes.",
      connection: "Reducing drag prevents dangerous swaying and reduces structural stress from v² wind loads.",
      color: colors.textMuted
    }
  ];

  constructor(sessionId: string, _config?: SessionConfig) {
    super(sessionId);
    if (_config?.viewport) {
      this.width = _config.viewport.width || 700;
      this.height = _config.viewport.height || 350;
    }
  }

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click':
        this.handleButtonClick(input.id!);
        break;
      case 'slider_change':
        this.handleSliderChange(input.id!, input.value ?? 0);
        break;
      case 'toggle_change':
        this.handleToggleChange(input.id!, input.value as boolean);
        break;
    }
  }

  update(_deltaTime: number): void {
    // Animation updates handled in render
  }

  getCurrentPhase(): string {
    return this.phase;
  }

  private handleButtonClick(id: string): void {
    // Phase navigation
    if (id === 'next' || id === 'continue') {
      this.advancePhase();
      return;
    }

    if (id === 'back_to_start') {
      this.phase = 'hook';
      this.resetGameState();
      return;
    }

    if (id === 'retry_test') {
      this.testAnswers = Array(10).fill(-1);
      this.showTestResults = false;
      this.phase = 'review';
      return;
    }

    // Predictions
    if (id.startsWith('pred_')) {
      const prediction = id.replace('pred_', '');
      this.selectedPrediction = prediction;
      this.showPredictionFeedback = true;
      return;
    }

    if (id.startsWith('twist_pred_')) {
      const prediction = id.replace('twist_pred_', '');
      this.twistPrediction = prediction;
      this.showTwistFeedback = true;
      return;
    }

    // Simulation controls
    if (id === 'jump') {
      this.startSimulation();
      return;
    }

    if (id === 'reset_sim') {
      this.resetSimulation();
      return;
    }

    if (id === 'shape_spread') {
      this.skydiverShape = 'spread';
      this.resetSimulation();
      return;
    }

    if (id === 'shape_tucked') {
      this.skydiverShape = 'tucked';
      this.resetSimulation();
      return;
    }

    // Golf ball animation
    if (id === 'hit_balls') {
      this.startGolfAnimation();
      return;
    }

    // Transfer app tabs
    if (id.startsWith('app_tab_')) {
      this.activeAppTab = parseInt(id.replace('app_tab_', ''));
      return;
    }

    if (id.startsWith('complete_app_')) {
      const appIndex = parseInt(id.replace('complete_app_', ''));
      this.completedApps.add(appIndex);
      return;
    }

    // Test answers
    if (id.startsWith('test_q')) {
      const parts = id.replace('test_', '').split('_a');
      const qIndex = parseInt(parts[0].replace('q', ''));
      const aIndex = parseInt(parts[1]);
      this.testAnswers[qIndex] = aIndex;
      return;
    }

    if (id === 'submit_test') {
      this.showTestResults = true;
      return;
    }
  }

  private handleSliderChange(_id: string, _value: number): void {
    // No sliders in this game
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'show_vectors') {
      this.showVectors = value;
    }
  }

  private advancePhase(): void {
    const currentIndex = PHASES.indexOf(this.phase);
    if (currentIndex < PHASES.length - 1) {
      this.phase = PHASES[currentIndex + 1];
    }
  }

  private resetGameState(): void {
    this.skydiverY = 50;
    this.skydiverVelocity = 0;
    this.skydiverShape = 'spread';
    this.isSimulating = false;
    this.currentDrag = 0;
    this.currentGravity = 0;
    this.timeElapsed = 0;
    this.selectedPrediction = null;
    this.showPredictionFeedback = false;
    this.twistPrediction = null;
    this.showTwistFeedback = false;
    this.activeAppTab = 0;
    this.completedApps.clear();
    this.testAnswers = Array(10).fill(-1);
    this.showTestResults = false;
    this.smoothBallX = 50;
    this.dimpledBallX = 50;
    this.golfAnimating = false;
  }

  private startSimulation(): void {
    this.skydiverY = 50;
    this.skydiverVelocity = 0;
    this.currentDrag = 0;
    this.timeElapsed = 0;
    this.isSimulating = true;
  }

  private resetSimulation(): void {
    this.isSimulating = false;
    this.skydiverY = 50;
    this.skydiverVelocity = 0;
    this.currentDrag = 0;
    this.timeElapsed = 0;
  }

  private startGolfAnimation(): void {
    this.smoothBallX = 50;
    this.dimpledBallX = 50;
    this.golfTime = 0;
    this.golfAnimating = true;
  }

  private updateSimulation(): void {
    if (!this.isSimulating) return;

    const mass = 80; // kg
    const g = 9.8; // m/s²
    const gravity = mass * g;

    // Drag coefficient varies with body position
    const dragCoefficient = this.skydiverShape === 'spread' ? 1.0 : 0.4;
    const area = this.skydiverShape === 'spread' ? 0.8 : 0.3; // m²
    const airDensity = 1.2; // kg/m³

    // Drag force: F_d = 0.5 * ρ * v² * C_d * A
    const dragForce = 0.5 * airDensity * this.skydiverVelocity * this.skydiverVelocity * dragCoefficient * area;
    const netForce = gravity - dragForce;
    const acceleration = netForce / mass;

    this.skydiverVelocity += acceleration * 0.1;
    this.currentDrag = dragForce;
    this.currentGravity = gravity;
    this.timeElapsed += 0.1;

    // Convert to screen position (scaled)
    this.skydiverY += this.skydiverVelocity * 0.5;

    if (this.skydiverY >= 280) {
      this.isSimulating = false;
      this.skydiverY = 280;
    }
  }

  private updateGolfAnimation(): void {
    if (!this.golfAnimating) return;

    this.golfTime += 1;
    // Smooth ball slows down faster due to higher drag
    this.smoothBallX = 50 + this.golfTime * 4 * Math.exp(-this.golfTime * 0.03);
    // Dimpled ball goes much farther
    this.dimpledBallX = 50 + this.golfTime * 6 * Math.exp(-this.golfTime * 0.015);

    if (this.golfTime >= 60) {
      this.golfAnimating = false;
    }
  }

  private getTestScore(): number {
    return this.testAnswers.reduce((score, answer, index) => {
      return score + (answer === this.testQuestions[index].correctIndex ? 1 : 0);
    }, 0);
  }

  render(): GameFrame {
    // Update animations
    this.updateSimulation();
    this.updateGolfAnimation();

    const r = new CommandRenderer(this.width, this.height);
    r.clear(colors.bg);

    const phaseIndex = PHASES.indexOf(this.phase);
    r.setProgress({ id: 'phase_progress', current: phaseIndex + 1, total: PHASES.length });

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

    this.frameCount++;
    return r.toFrame(this.frameCount);
  }

  private renderHook(r: CommandRenderer): void {
    r.setHeader('Drag Force', 'The invisible force that shapes how things fall');

    const cx = this.width / 2;

    // Sky background
    r.rect(50, 40, this.width - 100, 180, { fill: colors.sky, opacity: 0.3, rx: 10 });

    // Clouds
    r.ellipse(120, 70, 35, 15, { fill: colors.text, opacity: 0.5 });
    r.ellipse(500, 90, 45, 20, { fill: colors.text, opacity: 0.4 });

    // Skydiver spread eagle
    const skyY = 140;
    // Body
    r.ellipse(cx, skyY, 30, 15, { fill: colors.skydiver });
    // Head
    r.circle(cx, skyY - 22, 12, { fill: '#ffcc99' });
    // Helmet
    r.ellipse(cx, skyY - 24, 14, 10, { fill: '#333' });
    // Arms spread
    r.line(cx - 30, skyY - 5, cx - 65, skyY - 15, { stroke: colors.skydiver, strokeWidth: 8 });
    r.line(cx + 30, skyY - 5, cx + 65, skyY - 15, { stroke: colors.skydiver, strokeWidth: 8 });
    // Legs spread
    r.line(cx - 10, skyY + 15, cx - 35, skyY + 45, { stroke: '#333', strokeWidth: 8 });
    r.line(cx + 10, skyY + 15, cx + 35, skyY + 45, { stroke: '#333', strokeWidth: 8 });

    // Force arrows
    // Drag (green up)
    r.line(cx, skyY - 45, cx, skyY - 75, { stroke: colors.drag, strokeWidth: 4 });
    r.polygon([[cx, skyY - 80], [cx - 6, skyY - 70], [cx + 6, skyY - 70]], { fill: colors.drag });
    r.text(cx, skyY - 90, 'Drag?', { fill: colors.drag, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Gravity (red down)
    r.line(cx, skyY + 55, cx, skyY + 85, { stroke: colors.gravity, strokeWidth: 4 });
    r.polygon([[cx, skyY + 95], [cx - 6, skyY + 85], [cx + 6, skyY + 85]], { fill: colors.gravity });
    r.text(cx, skyY + 110, 'Gravity', { fill: colors.gravity, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Question text
    r.text(cx, 255, 'A skydiver feels an invisible force pushing UP against them.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle'
    });
    r.text(cx, 275, 'What is this mysterious force fighting against gravity?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.setCoachMessage('Air resistance creates a force called DRAG that opposes motion. Click to discover how it works!');
    r.addButton({ id: 'next', label: 'Discover Drag Force', variant: 'primary' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.setHeader('Make Your Prediction', 'What happens when a skydiver tucks?');

    r.text(this.width / 2, 45, 'A skydiver can change their speed by changing body position.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle'
    });
    r.text(this.width / 2, 65, 'If they tuck into a ball (less surface area), what happens to drag?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const options = [
      { id: 'A', text: 'Drag force increases - more air hits the body' },
      { id: 'B', text: 'Drag force decreases - less surface area' },
      { id: 'C', text: 'Drag force stays the same - only speed matters' },
      { id: 'D', text: 'Drag force disappears - only gravity acts' }
    ];

    const startY = 90;
    options.forEach((opt, i) => {
      const y = startY + i * 42;
      const isSelected = this.selectedPrediction === opt.id;
      const isCorrect = opt.id === 'B';

      let bgColor = colors.panel;
      if (this.showPredictionFeedback) {
        if (isSelected && isCorrect) bgColor = '#166534';
        else if (isSelected && !isCorrect) bgColor = '#991b1b';
        else if (isCorrect) bgColor = '#166534';
      }

      r.rect(50, y, this.width - 100, 36, { fill: bgColor, rx: 8 });
      r.text(70, y + 22, `${opt.id}.`, { fill: colors.text, fontSize: 13, fontWeight: 'bold' });
      r.text(95, y + 22, opt.text, { fill: colors.text, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `pred_${opt.id}`, label: opt.id, variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.rect(50, 265, this.width - 100, 55, { fill: colors.panelDark, rx: 8 });
      r.text(this.width / 2, 287, 'Correct! Drag depends on surface area.', {
        fill: colors.success,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });
      r.text(this.width / 2, 307, 'Less area = less air resistance = faster falling.', {
        fill: colors.textSecondary,
        fontSize: 12,
        textAnchor: 'middle'
      });
      r.addButton({ id: 'next', label: 'Try the Simulation', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.setHeader('Drag Force Simulator', 'Watch how shape affects falling speed');

    // Sky area
    const simX = 50;
    const simW = this.width - 200;
    const simH = 250;

    // Sky gradient
    r.rect(simX, 35, simW, simH, { fill: colors.sky, opacity: 0.25, rx: 8 });

    // Clouds
    r.ellipse(simX + 60, 60, 30, 12, { fill: colors.text, opacity: 0.4 });
    r.ellipse(simX + simW - 80, 75, 40, 15, { fill: colors.text, opacity: 0.3 });

    // Ground
    r.rect(simX, simH + 35, simW, 30, { fill: colors.ground });

    // Altitude markers
    [100, 180, 230].forEach(y => {
      r.line(simX + 5, y, simX + 20, y, { stroke: colors.text, strokeWidth: 1, opacity: 0.4 });
      r.text(simX + 25, y + 4, `${Math.round((simH + 35 - y) / 2.5)}%`, { fill: colors.textMuted, fontSize: 9 });
    });

    // Skydiver
    const skyX = simX + simW / 2;
    if (this.skydiverShape === 'spread') {
      // Spread eagle
      r.ellipse(skyX, this.skydiverY, 25, 12, { fill: colors.skydiver });
      r.circle(skyX, this.skydiverY - 15, 10, { fill: '#ffcc99' });
      r.ellipse(skyX, this.skydiverY - 17, 12, 8, { fill: '#333' });
      r.line(skyX - 25, this.skydiverY, skyX - 55, this.skydiverY - 10, { stroke: colors.skydiver, strokeWidth: 6 });
      r.line(skyX + 25, this.skydiverY, skyX + 55, this.skydiverY - 10, { stroke: colors.skydiver, strokeWidth: 6 });
      r.line(skyX - 8, this.skydiverY + 12, skyX - 25, this.skydiverY + 35, { stroke: '#333', strokeWidth: 6 });
      r.line(skyX + 8, this.skydiverY + 12, skyX + 25, this.skydiverY + 35, { stroke: '#333', strokeWidth: 6 });
    } else {
      // Tucked ball
      r.ellipse(skyX, this.skydiverY, 15, 22, { fill: colors.skydiver });
      r.circle(skyX, this.skydiverY - 18, 10, { fill: '#ffcc99' });
      r.ellipse(skyX, this.skydiverY - 20, 12, 8, { fill: '#333' });
      r.ellipse(skyX, this.skydiverY + 15, 12, 8, { fill: '#333' });
    }

    // Force vectors
    if (this.showVectors && this.skydiverY < 270) {
      // Gravity (red down)
      const gravLen = Math.min(this.currentGravity / 20, 50);
      r.line(skyX, this.skydiverY + 40, skyX, this.skydiverY + 40 + gravLen, { stroke: colors.gravity, strokeWidth: 4 });
      r.polygon([
        [skyX, this.skydiverY + 48 + gravLen],
        [skyX - 5, this.skydiverY + 40 + gravLen],
        [skyX + 5, this.skydiverY + 40 + gravLen]
      ], { fill: colors.gravity });

      // Drag (green up)
      if (this.currentDrag > 0) {
        const dragLen = Math.min(this.currentDrag / 20, 45);
        r.line(skyX, this.skydiverY - 30, skyX, this.skydiverY - 30 - dragLen, { stroke: colors.drag, strokeWidth: 4 });
        r.polygon([
          [skyX, this.skydiverY - 38 - dragLen],
          [skyX - 5, this.skydiverY - 30 - dragLen],
          [skyX + 5, this.skydiverY - 30 - dragLen]
        ], { fill: colors.drag });
      }
    }

    // Stats panel
    const statsX = simX + simW + 15;
    r.rect(statsX, 35, 120, 95, { fill: colors.panelDark, rx: 8 });
    r.text(statsX + 10, 55, `Speed: ${this.skydiverVelocity.toFixed(1)} m/s`, { fill: colors.text, fontSize: 11 });
    r.text(statsX + 10, 75, `Gravity: ${this.currentGravity.toFixed(0)} N`, { fill: colors.gravity, fontSize: 11 });
    r.text(statsX + 10, 95, `Drag: ${this.currentDrag.toFixed(0)} N`, { fill: colors.drag, fontSize: 11 });
    r.text(statsX + 10, 115, `Time: ${this.timeElapsed.toFixed(1)}s`, { fill: colors.textSecondary, fontSize: 11 });

    // Shape indicator
    const shapeLabel = this.skydiverShape === 'spread' ? 'Spread Eagle' : 'Tucked Ball';
    const shapeColor = this.skydiverShape === 'spread' ? colors.success : colors.warning;
    r.text(statsX + 60, 145, shapeLabel, { fill: shapeColor, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Controls
    r.addButton({ id: 'shape_spread', label: 'Spread (High Drag)', variant: this.skydiverShape === 'spread' ? 'primary' : 'secondary' });
    r.addButton({ id: 'shape_tucked', label: 'Tucked (Low Drag)', variant: this.skydiverShape === 'tucked' ? 'primary' : 'secondary' });

    if (this.isSimulating) {
      r.addButton({ id: 'reset_sim', label: 'Reset', variant: 'secondary' });
    } else {
      r.addButton({ id: 'jump', label: 'Jump!', variant: 'success' });
    }

    r.addToggle({ id: 'show_vectors', label: 'Show Forces', value: this.showVectors });
    r.addButton({ id: 'next', label: 'Continue', variant: 'primary' });

    r.setCoachMessage('Try both positions! Notice how spread eagle falls slower due to higher drag.');
  }

  private renderReview(r: CommandRenderer): void {
    r.setHeader('The Physics of Drag', 'Understanding the drag equation');

    const cardW = (this.width - 80) / 2;
    const cardH = 115;

    // Drag equation card
    r.rect(30, 40, cardW, cardH, { fill: colors.panel, rx: 10 });
    r.text(30 + cardW / 2, 60, 'The Drag Equation', {
      fill: colors.primary,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.rect(40, 75, cardW - 20, 28, { fill: colors.panelDark, rx: 5 });
    r.text(30 + cardW / 2, 94, 'F_d = ½ρv²C_dA', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(45, 120, 'ρ = air density', { fill: colors.textSecondary, fontSize: 10 });
    r.text(45, 133, 'v² = velocity squared', { fill: colors.textSecondary, fontSize: 10 });
    r.text(45, 146, 'C_d = drag coefficient', { fill: colors.textSecondary, fontSize: 10 });

    // v² effect card
    r.rect(50 + cardW, 40, cardW, cardH, { fill: colors.panel, rx: 10 });
    r.text(50 + cardW + cardW / 2, 60, 'Key Insight: v² Effect', {
      fill: colors.success,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(60 + cardW, 85, 'Drag increases with velocity SQUARED!', { fill: colors.accent, fontSize: 11 });

    const speeds = [
      { speed: '10 m/s', drag: '1x' },
      { speed: '20 m/s', drag: '4x' },
      { speed: '30 m/s', drag: '9x' }
    ];
    speeds.forEach((s, i) => {
      r.text(70 + cardW, 105 + i * 15, `${s.speed} → Drag: ${s.drag}`, { fill: colors.textSecondary, fontSize: 10 });
    });

    // Shape comparison
    r.rect(30, 165, this.width - 60, 100, { fill: colors.panel, rx: 10 });
    r.text(this.width / 2, 185, 'Why Shape Matters', { fill: colors.primary, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Spread eagle
    r.circle(130, 230, 25, { fill: colors.skydiver, opacity: 0.3 });
    r.text(130, 210, 'Spread Eagle', { fill: colors.accent, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(130, 250, 'Area: ~0.8 m²', { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });

    // Tucked
    r.ellipse(this.width - 130, 230, 15, 25, { fill: colors.skydiver, opacity: 0.3 });
    r.text(this.width - 130, 210, 'Tucked Ball', { fill: '#a855f7', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(this.width - 130, 250, 'Area: ~0.3 m²', { fill: colors.textSecondary, fontSize: 9, textAnchor: 'middle' });

    // Arrow between
    r.line(200, 230, this.width - 200, 230, { stroke: colors.border, strokeWidth: 2 });
    r.text(this.width / 2, 225, 'Less area = Less drag', { fill: colors.success, fontSize: 10, textAnchor: 'middle' });

    r.setCoachMessage('Remember: drag depends on v², shape (C_d), and area (A). Now for a surprising twist!');
    r.addButton({ id: 'next', label: 'Ready for the Twist?', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.setHeader('The Twist: Golf Ball Dimples', 'Why rough surfaces fly farther');

    r.rect(50, 40, this.width - 100, 80, { fill: colors.panel, rx: 10 });
    r.text(this.width / 2, 65, 'Golf balls have DIMPLES that make the surface rougher.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle'
    });
    r.text(this.width / 2, 95, 'Why do golf balls fly FARTHER with a rough, dimpled surface?', {
      fill: '#a855f7',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const options = [
      { id: 'A', text: 'Dimples trap air and make the ball lighter' },
      { id: 'B', text: 'Dimples create more friction with the club' },
      { id: 'C', text: 'Dimples reduce drag by creating turbulent airflow' },
      { id: 'D', text: 'Dimples have no effect - it\'s just tradition' }
    ];

    const startY = 130;
    options.forEach((opt, i) => {
      const y = startY + i * 42;
      const isSelected = this.twistPrediction === opt.id;
      const isCorrect = opt.id === 'C';

      let bgColor = colors.panel;
      if (this.showTwistFeedback) {
        if (isSelected && isCorrect) bgColor = '#166534';
        else if (isSelected && !isCorrect) bgColor = '#991b1b';
        else if (isCorrect) bgColor = '#166534';
      }

      r.rect(50, y, this.width - 100, 36, { fill: bgColor, rx: 8 });
      r.text(70, y + 22, `${opt.id}.`, { fill: colors.text, fontSize: 13, fontWeight: 'bold' });
      r.text(95, y + 22, opt.text, { fill: colors.text, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `twist_pred_${opt.id}`, label: opt.id, variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.rect(50, 300, this.width - 100, 40, { fill: colors.panelDark, rx: 8 });
      r.text(this.width / 2, 318, 'Dimples create turbulent flow that stays attached, reducing wake drag!', {
        fill: colors.success,
        fontSize: 12,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });
      r.addButton({ id: 'next', label: 'See the Difference', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.setHeader('Smooth vs Dimpled Ball', 'Watch the difference in flight');

    // Golf course background
    r.rect(50, 50, this.width - 100, 160, { fill: colors.sky, opacity: 0.2, rx: 10 });
    r.rect(50, 170, this.width - 100, 40, { fill: colors.ground, rx: 5 });

    // Tee
    r.rect(75, 155, 6, 18, { fill: '#8b4513' });

    // Distance markers
    [200, 350, 500].forEach(x => {
      r.line(x, 165, x, 175, { stroke: colors.text, strokeWidth: 1, opacity: 0.4 });
      r.text(x, 190, `${x - 80}m`, { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
    });

    // Smooth ball (top)
    r.circle(this.smoothBallX, 90, 12, { fill: colors.text, stroke: '#ccc', strokeWidth: 1 });
    r.text(70, 95, 'Smooth', { fill: colors.error, fontSize: 10 });

    // Dimpled ball (bottom)
    r.circle(this.dimpledBallX, 140, 12, { fill: colors.text, stroke: '#ccc', strokeWidth: 1 });
    // Dimple pattern
    r.circle(this.dimpledBallX - 4, 137, 2, { fill: '#ddd' });
    r.circle(this.dimpledBallX + 4, 137, 2, { fill: '#ddd' });
    r.circle(this.dimpledBallX, 143, 2, { fill: '#ddd' });
    r.text(70, 145, 'Dimpled', { fill: colors.success, fontSize: 10 });

    // Wake visualization when animating
    if (this.golfAnimating) {
      // Large wake behind smooth ball
      r.ellipse(this.smoothBallX - 20, 90, 15, 10, { fill: colors.error, opacity: 0.3 });
      // Small wake behind dimpled ball
      r.ellipse(this.dimpledBallX - 12, 140, 8, 5, { fill: colors.success, opacity: 0.3 });
    }

    // Explanation
    r.text(this.width / 2, 230, 'Watch how the dimpled ball travels much farther!', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle'
    });
    r.text(this.width / 2, 250, 'The "rougher" surface actually creates LESS drag.', {
      fill: colors.primary,
      fontSize: 12,
      textAnchor: 'middle'
    });

    if (!this.golfAnimating) {
      r.addButton({ id: 'hit_balls', label: 'Hit Both Balls!', variant: 'success' });
    }
    r.addButton({ id: 'next', label: 'Understand Why', variant: 'primary' });

    r.setCoachMessage('A dimpled golf ball flies about 2x farther than a smooth one!');
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.setHeader('The Boundary Layer Secret', 'Laminar vs. Turbulent Flow');

    r.rect(50, 40, this.width - 100, 180, { fill: colors.panel, rx: 12 });

    // Title
    r.text(this.width / 2, 65, 'Laminar vs. Turbulent Flow', {
      fill: '#ec4899',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Two columns
    const colW = (this.width - 140) / 2;

    // Smooth ball column
    r.rect(70, 85, colW, 90, { fill: colors.panelDark, rx: 8 });
    r.circle(70 + colW / 2, 110, 15, { fill: colors.text });
    r.text(70 + colW / 2, 135, 'Smooth Ball', { fill: colors.error, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(70 + colW / 2, 150, 'Laminar flow separates early', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
    r.text(70 + colW / 2, 163, 'Large wake = High drag', { fill: colors.error, fontSize: 9, textAnchor: 'middle' });

    // Dimpled ball column
    r.rect(90 + colW, 85, colW, 90, { fill: colors.panelDark, rx: 8 });
    r.circle(90 + colW + colW / 2, 110, 15, { fill: colors.text });
    // Dimples
    r.circle(90 + colW + colW / 2 - 5, 107, 2, { fill: '#ddd' });
    r.circle(90 + colW + colW / 2 + 5, 107, 2, { fill: '#ddd' });
    r.circle(90 + colW + colW / 2, 113, 2, { fill: '#ddd' });
    r.text(90 + colW + colW / 2, 135, 'Dimpled Ball', { fill: colors.success, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(90 + colW + colW / 2, 150, 'Turbulent flow stays attached', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
    r.text(90 + colW + colW / 2, 163, 'Small wake = Low drag', { fill: colors.success, fontSize: 9, textAnchor: 'middle' });

    // Key insight
    r.rect(70, 185, this.width - 140, 30, { fill: colors.accent + '20', rx: 5 });
    r.text(this.width / 2, 205, 'This is called the "drag crisis" - rougher can mean less drag!', {
      fill: colors.accent,
      fontSize: 11,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.setCoachMessage('Sometimes counterintuitive physics leads to better engineering solutions!');
    r.addButton({ id: 'next', label: 'See Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.setHeader('Real-World Applications', 'Drag force engineering');

    // Tab buttons
    const tabY = 35;
    const tabW = (this.width - 60) / 4;
    this.transferApps.forEach((app, i) => {
      const isActive = this.activeAppTab === i;
      const isComplete = this.completedApps.has(i);

      r.rect(30 + i * tabW, tabY, tabW - 5, 28, {
        fill: isActive ? app.color : (isComplete ? colors.success + '40' : colors.panel),
        rx: 5
      });
      r.text(30 + i * tabW + (tabW - 5) / 2, tabY + 18, app.short, {
        fill: isActive ? colors.text : colors.textSecondary,
        fontSize: 10,
        fontWeight: isActive ? 'bold' : 'normal',
        textAnchor: 'middle'
      });

      r.addButton({ id: `app_tab_${i}`, label: app.short, variant: 'secondary' });
    });

    const app = this.transferApps[this.activeAppTab];

    // Content card
    r.rect(30, 70, this.width - 60, 180, { fill: colors.panel, rx: 10 });

    r.text(50, 95, app.title, { fill: colors.text, fontSize: 14, fontWeight: 'bold' });
    r.text(50, 115, app.tagline, { fill: app.color, fontSize: 11 });

    // Description (word wrapped manually)
    const desc = app.description;
    r.text(50, 140, desc.substring(0, 75), { fill: colors.textSecondary, fontSize: 11 });
    if (desc.length > 75) {
      r.text(50, 155, desc.substring(75), { fill: colors.textSecondary, fontSize: 11 });
    }

    // Physics connection box
    r.rect(40, 175, this.width - 100, 45, { fill: colors.panelDark, rx: 5 });
    r.text(50, 195, 'Physics: ' + app.connection.substring(0, 65), { fill: colors.primary, fontSize: 10 });
    r.text(50, 210, app.connection.substring(65), { fill: colors.primary, fontSize: 10 });

    // Mark complete button
    if (!this.completedApps.has(this.activeAppTab)) {
      r.addButton({ id: `complete_app_${this.activeAppTab}`, label: 'Mark as Understood', variant: 'success' });
    }

    // Progress
    r.text(30, 265, 'Progress:', { fill: colors.textMuted, fontSize: 11 });
    this.transferApps.forEach((_, i) => {
      r.circle(90 + i * 20, 262, 6, { fill: this.completedApps.has(i) ? colors.success : colors.border });
    });
    r.text(175, 265, `${this.completedApps.size}/4`, { fill: colors.textSecondary, fontSize: 11 });

    if (this.completedApps.size >= 3) {
      r.addButton({ id: 'next', label: 'Take the Quiz', variant: 'primary' });
    }

    r.setCoachMessage(`Explore all applications to understand how drag affects real engineering.`);
  }

  private renderTest(r: CommandRenderer): void {
    r.setHeader('Knowledge Check', `Question ${Math.min(this.testAnswers.findIndex(a => a === -1) + 1, 10)} of 10`);

    if (!this.showTestResults) {
      let currentQ = this.testAnswers.findIndex(a => a === -1);
      if (currentQ === -1) currentQ = 9;

      const q = this.testQuestions[currentQ];

      // Scenario
      r.rect(30, 35, this.width - 60, 32, { fill: colors.panelDark, rx: 8 });
      r.text(45, 55, q.scenario, { fill: colors.primary, fontSize: 10, fontStyle: 'italic' });

      // Question
      r.text(30, 85, `${currentQ + 1}. ${q.question}`, { fill: colors.text, fontSize: 12, fontWeight: 'bold' });

      // Options in 2x2 grid
      q.options.forEach((opt, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 30 + col * ((this.width - 70) / 2);
        const y = 100 + row * 50;
        const isSelected = this.testAnswers[currentQ] === i;

        r.rect(x, y, (this.width - 80) / 2, 42, {
          fill: isSelected ? colors.primary + '40' : colors.panel,
          stroke: isSelected ? colors.primary : 'transparent',
          strokeWidth: 2,
          rx: 8
        });
        r.text(x + 10, y + 26, opt, { fill: colors.text, fontSize: 10 });

        r.addButton({ id: `test_q${currentQ}_a${i}`, label: `Option ${i + 1}`, variant: 'secondary' });
      });

      // Progress dots
      const dotsY = 220;
      this.testQuestions.forEach((_, i) => {
        const answered = this.testAnswers[i] !== -1;
        const isCurrent = i === currentQ;
        r.circle(this.width / 2 - 55 + i * 12, dotsY, 4, {
          fill: isCurrent ? colors.primary : (answered ? colors.success : colors.border)
        });
      });

      if (!this.testAnswers.includes(-1)) {
        r.addButton({ id: 'submit_test', label: 'Submit Answers', variant: 'success' });
      }
    } else {
      const score = this.getTestScore();
      const passed = score >= 7;

      r.text(this.width / 2, 70, passed ? 'Excellent!' : 'Keep Practicing', {
        fill: passed ? colors.success : colors.warning,
        fontSize: 24,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });

      r.text(this.width / 2, 105, `Score: ${score}/10`, {
        fill: colors.text,
        fontSize: 18,
        textAnchor: 'middle'
      });

      // Mini results
      r.rect(30, 125, this.width - 60, 120, { fill: colors.panel, rx: 10 });
      this.testQuestions.forEach((q, i) => {
        const correct = this.testAnswers[i] === q.correctIndex;
        const x = 50 + (i % 5) * 120;
        const y = 150 + Math.floor(i / 5) * 50;

        r.circle(x, y, 8, { fill: correct ? colors.success : colors.error });
        r.text(x + 15, y + 4, `Q${i + 1}`, { fill: colors.textSecondary, fontSize: 10 });
      });

      if (passed) {
        r.addButton({ id: 'next', label: 'Claim Your Badge!', variant: 'success' });
      } else {
        r.addButton({ id: 'retry_test', label: 'Review & Try Again', variant: 'primary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.setHeader('Congratulations!', 'Drag Force Master');

    const cx = this.width / 2;

    // Badge
    r.circle(cx, 90, 45, { fill: colors.primary + '30', stroke: colors.primary, strokeWidth: 3 });
    r.text(cx, 82, '🪂', { fill: colors.text, fontSize: 36, textAnchor: 'middle' });

    r.text(cx, 155, 'Drag Force Master!', {
      fill: colors.text,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(cx, 180, 'You\'ve mastered the physics of drag force!', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle'
    });

    // Achievements
    const achievements = [
      '✓ Drag increases with v²',
      '✓ Shape and area determine C_d',
      '✓ Turbulent flow can reduce drag',
      '✓ Real-world aerodynamics'
    ];

    r.rect(100, 200, this.width - 200, 100, { fill: colors.panel, rx: 10 });
    achievements.forEach((text, i) => {
      r.text(120, 225 + i * 20, text, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.text(cx, 320, 'Now you understand why skydivers can control their speed!', {
      fill: colors.primary,
      fontSize: 12,
      textAnchor: 'middle'
    });

    r.setCoachMessage('Amazing work mastering drag force physics!');
    r.addButton({ id: 'back_to_start', label: 'Explore Again', variant: 'secondary' });
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      skydiverY: this.skydiverY,
      skydiverVelocity: this.skydiverVelocity,
      skydiverShape: this.skydiverShape,
      isSimulating: this.isSimulating,
      currentDrag: this.currentDrag,
      currentGravity: this.currentGravity,
      timeElapsed: this.timeElapsed,
      showVectors: this.showVectors,
      selectedPrediction: this.selectedPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      twistPrediction: this.twistPrediction,
      showTwistFeedback: this.showTwistFeedback,
      activeAppTab: this.activeAppTab,
      completedApps: Array.from(this.completedApps),
      smoothBallX: this.smoothBallX,
      dimpledBallX: this.dimpledBallX,
      golfAnimating: this.golfAnimating,
      testAnswers: this.testAnswers,
      showTestResults: this.showTestResults
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as Phase;
    if (state.skydiverY !== undefined) this.skydiverY = state.skydiverY as number;
    if (state.skydiverVelocity !== undefined) this.skydiverVelocity = state.skydiverVelocity as number;
    if (state.skydiverShape) this.skydiverShape = state.skydiverShape as 'spread' | 'tucked';
    if (state.isSimulating !== undefined) this.isSimulating = state.isSimulating as boolean;
    if (state.currentDrag !== undefined) this.currentDrag = state.currentDrag as number;
    if (state.currentGravity !== undefined) this.currentGravity = state.currentGravity as number;
    if (state.timeElapsed !== undefined) this.timeElapsed = state.timeElapsed as number;
    if (state.showVectors !== undefined) this.showVectors = state.showVectors as boolean;
    if (state.selectedPrediction !== undefined) this.selectedPrediction = state.selectedPrediction as string | null;
    if (state.showPredictionFeedback !== undefined) this.showPredictionFeedback = state.showPredictionFeedback as boolean;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.showTwistFeedback !== undefined) this.showTwistFeedback = state.showTwistFeedback as boolean;
    if (state.activeAppTab !== undefined) this.activeAppTab = state.activeAppTab as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
    if (state.smoothBallX !== undefined) this.smoothBallX = state.smoothBallX as number;
    if (state.dimpledBallX !== undefined) this.dimpledBallX = state.dimpledBallX as number;
    if (state.golfAnimating !== undefined) this.golfAnimating = state.golfAnimating as boolean;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
  }
}

// Factory function
export function createDragForceGame(sessionId: string, config?: SessionConfig): DragForceGame {
  return new DragForceGame(sessionId, config);
}
