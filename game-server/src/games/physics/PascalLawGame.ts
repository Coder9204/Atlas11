// ============================================================================
// PASCAL'S LAW GAME - Server-Side Implementation
// ============================================================================
// Physics: F1/A1 = F2/A2 = P (Pressure is constant in confined fluid)
// Force multiplication: F2 = F1 x (A2/A1)
// Work conservation: Work_in = Work_out (F1 x d1 = F2 x d2)
// ============================================================================

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// TYPES
// ============================================================================

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

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

// ============================================================================
// PROTECTED: Test Questions (NEVER sent to client)
// ============================================================================

const TEST_QUESTIONS: TestQuestion[] = [
  {
    question: "A car lift has small piston (5 cm^2) and large piston (500 cm^2). If 200 N is applied, what force lifts the car?",
    options: ["200 N - pressure doesn't multiply", "2,000 N - 10x multiplication", "20,000 N - 100x multiplication", "100,000 N - 500x multiplication"],
    correctIndex: 2
  },
  {
    question: "Hydraulic brakes: master cylinder (1 cm^2) connects to brake calipers (10 cm^2 each). If 50 N is applied, what happens at each wheel?",
    options: ["Each wheel gets 5 N", "Each wheel gets 50 N", "Each wheel gets 500 N", "Total 500 N split between wheels"],
    correctIndex: 2
  },
  {
    question: "A hydraulic press needs 1,000,000 N output from 1,000 N input. What area ratio is needed?",
    options: ["10:1", "100:1", "1000:1", "10000:1"],
    correctIndex: 2
  },
  {
    question: "A jack multiplies force 25x. To lift a car 30 cm, how far must the handle move?",
    options: ["1.2 cm (30 / 25)", "30 cm (same)", "7.5 meters (30 x 25)", "75 cm (30 x 2.5)"],
    correctIndex: 2
  },
  {
    question: "Why do hydraulic systems use oil instead of air?",
    options: ["Oil is lighter", "Liquids are incompressible - transmit pressure instantly", "Oil is cheaper", "Air would be too cold"],
    correctIndex: 1
  },
  {
    question: "Air bubbles in brake fluid cause 'spongy' brakes because:",
    options: ["Air increases friction", "Air is compressible, absorbing energy instead of transmitting pressure", "Air makes fluid flow faster", "Bubbles block the flow"],
    correctIndex: 1
  },
  {
    question: "A dental chair with 50 cm^2 piston and 2 cm^2 foot pump supports 980 N patient. What force per pump?",
    options: ["980 N (same)", "196 N (divided by 5)", "39.2 N (divided by 25)", "4.9 N (divided by 200)"],
    correctIndex: 2
  },
  {
    question: "Why are hydraulic rescue tools (Jaws of Life) more practical than mechanical alternatives?",
    options: ["Hydraulics are lighter", "Force transmits through flexible hoses and multiplies at tool head", "Hydraulic fluid is stronger than steel", "Mechanical cutters can't cut metal"],
    correctIndex: 1
  },
  {
    question: "Aircraft hydraulic systems use synthetic fluids because:",
    options: ["Standard oil would boil at altitude", "Synthetic fluids maintain viscosity across extreme temperatures (-65C to +135C)", "Synthetic is less flammable", "Regular oil expands at altitude"],
    correctIndex: 1
  },
  {
    question: "Pascal's barrel experiment: 10m tall narrow tube (1 cm^2) attached to barrel (1000 cm^2). What happens with 1 liter of water?",
    options: ["Nothing - too little water", "Barrel experiences massive pressure and may burst", "Water flows back up", "Barrel floats"],
    correctIndex: 1
  }
];

// ============================================================================
// GAME CLASS
// ============================================================================

export class PascalLawGame extends BaseGame {
  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;

  // Play phase - hydraulic system
  private inputForce: number = 100; // Newtons
  private smallPistonArea: number = 1; // cm^2
  private largePistonArea: number = 10; // cm^2
  private isAnimating: boolean = false;
  private animationProgress: number = 0;

  // Review/Test
  private testAnswers: number[] = Array(10).fill(-1);
  private showTestResults: boolean = false;

  // Transfer
  private activeAppTab: number = 0;
  private completedApps: Set<number> = new Set();

  // Premium color palette
  private readonly colors = {
    primary: '#10b981',
    secondary: '#14b8a6',
    accent: '#06b6d4',
    fluid: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
    background: '#0a0f1a',
    cardBg: 'rgba(30, 41, 59, 0.5)',
    text: '#ffffff',
    textMuted: '#94a3b8'
  };

  // Applications
  private readonly applications = [
    {
      title: "Automotive Hydraulics",
      icon: "car",
      description: "Brakes multiply pedal force 10-15x at each wheel. Power steering reduces effort by 80%. ABS modulates pressure 25 times/second."
    },
    {
      title: "Construction Equipment",
      icon: "crane",
      description: "Excavator bucket force: 15,000-50,000 lbs. Crane capacity: up to 1,200 tons. Systems run at 3,000-5,000 PSI."
    },
    {
      title: "Aircraft Systems",
      icon: "plane",
      description: "Boeing 747 has 2,400 gallons of hydraulic fluid. Control surfaces can resist 50,000+ lbs of aerodynamic force."
    },
    {
      title: "Industrial Presses",
      icon: "factory",
      description: "Forging presses generate up to 200,000 tons of force. Stamping presses cycle 30-60 times per minute with 0.001 inch accuracy."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // ============================================================================
  // PROTECTED: Physics Calculations (NEVER sent to client)
  // ============================================================================

  private calculatePressure(): number {
    // P = F1 / A1 (N/cm^2)
    return this.inputForce / this.smallPistonArea;
  }

  private calculateOutputForce(): number {
    // F2 = P x A2 = (F1/A1) x A2 = F1 x (A2/A1)
    const pressure = this.calculatePressure();
    return pressure * this.largePistonArea;
  }

  private calculateMechanicalAdvantage(): number {
    // MA = A2/A1 = F2/F1
    return this.largePistonArea / this.smallPistonArea;
  }

  private calculateOutputDistance(inputDistance: number): number {
    // Conservation of work: F1 x d1 = F2 x d2
    // d2 = d1 x (A1/A2)
    return inputDistance * (this.smallPistonArea / this.largePistonArea);
  }

  private calculateWork(): { input: number; output: number } {
    const inputDistance = 10; // Reference: 10 cm input stroke
    const outputDistance = this.calculateOutputDistance(inputDistance);
    return {
      input: this.inputForce * inputDistance,
      output: this.calculateOutputForce() * outputDistance
    };
  }

  // ============================================================================
  // INPUT HANDLING
  // ============================================================================

  handleInput(input: UserInput): void {
    if (input.type === 'button_click') {
      this.handleButtonClick(input.id, input.value);
    } else if (input.type === 'slider_change') {
      this.handleSliderChange(input.id, input.value);
    } else if (input.type === 'progress_click') {
      const phaseIndex = input.value as number;
      const phases: GamePhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
      if (phaseIndex >= 0 && phaseIndex < phases.length) {
        this.phase = phases[phaseIndex];
        this.resetPhaseState();
      }
    }
    this.markDirty();
  }

  private handleButtonClick(id: string, value?: string | number | boolean): void {
    switch (id) {
      case 'continue_hook':
        this.phase = 'predict';
        break;
      case 'select_prediction':
        this.prediction = value as number;
        break;
      case 'submit_prediction':
        if (this.prediction !== null) {
          this.phase = 'play';
        }
        break;
      case 'start_animation':
        if (!this.isAnimating) {
          this.isAnimating = true;
          this.animationProgress = 0;
          this.animateHydraulic();
        }
        break;
      case 'continue_to_review':
        this.phase = 'review';
        break;
      case 'continue_to_twist':
        this.phase = 'twist_predict';
        break;
      case 'select_twist_prediction':
        this.twistPrediction = value as number;
        break;
      case 'submit_twist_prediction':
        if (this.twistPrediction !== null) {
          this.phase = 'twist_play';
        }
        break;
      case 'continue_twist_review':
        this.phase = 'twist_review';
        break;
      case 'continue_to_transfer':
        this.phase = 'transfer';
        break;
      case 'select_app':
        this.activeAppTab = value as number;
        this.completedApps.add(value as number);
        break;
      case 'start_test':
        this.phase = 'test';
        this.testAnswers = Array(10).fill(-1);
        this.showTestResults = false;
        break;
      case 'select_answer':
        const [qIndex, aIndex] = (value as string).split('_').map(Number);
        if (this.testAnswers[qIndex] === -1) {
          this.testAnswers[qIndex] = aIndex;
        }
        break;
      case 'submit_test':
        this.showTestResults = true;
        break;
      case 'continue_from_test':
        const score = this.calculateScore();
        if (score >= 7) {
          this.phase = 'mastery';
        } else {
          this.testAnswers = Array(10).fill(-1);
          this.showTestResults = false;
          this.phase = 'review';
        }
        break;
      case 'complete_mastery':
        this.phase = 'hook';
        this.resetAllState();
        break;
    }
  }

  private handleSliderChange(id: string, value?: string | number | boolean): void {
    switch (id) {
      case 'input_force':
        this.inputForce = value as number;
        break;
      case 'small_area':
        this.smallPistonArea = value as number;
        break;
      case 'large_area':
        this.largePistonArea = value as number;
        break;
    }
  }

  private animateHydraulic(): void {
    const animate = () => {
      if (this.animationProgress >= 100) {
        this.isAnimating = false;
        this.animationProgress = 0;
        this.markDirty();
        return;
      }
      this.animationProgress += 2;
      this.markDirty();
      setTimeout(animate, 30);
    };
    animate();
  }

  private resetPhaseState(): void {
    if (this.phase === 'play') {
      this.isAnimating = false;
      this.animationProgress = 0;
    }
  }

  private resetAllState(): void {
    this.prediction = null;
    this.twistPrediction = null;
    this.inputForce = 100;
    this.smallPistonArea = 1;
    this.largePistonArea = 10;
    this.isAnimating = false;
    this.animationProgress = 0;
    this.testAnswers = Array(10).fill(-1);
    this.showTestResults = false;
    this.activeAppTab = 0;
    this.completedApps.clear();
  }

  private calculateScore(): number {
    return this.testAnswers.reduce((score, answer, index) => {
      return score + (answer === TEST_QUESTIONS[index].correctIndex ? 1 : 0);
    }, 0);
  }

  // ============================================================================
  // RENDERING
  // ============================================================================

  render(): GameFrame {
    const renderer = new CommandRenderer();

    // Background
    renderer.drawRectangle(0, 0, 800, 600, this.colors.background);

    // Ambient gradients
    renderer.drawEllipse(200, 0, 300, 300, 'rgba(16, 185, 129, 0.05)');
    renderer.drawEllipse(600, 600, 300, 300, 'rgba(20, 184, 166, 0.05)');

    // Render phase-specific content
    switch (this.phase) {
      case 'hook': this.renderHook(renderer); break;
      case 'predict': this.renderPredict(renderer); break;
      case 'play': this.renderPlay(renderer); break;
      case 'review': this.renderReview(renderer); break;
      case 'twist_predict': this.renderTwistPredict(renderer); break;
      case 'twist_play': this.renderTwistPlay(renderer); break;
      case 'twist_review': this.renderTwistReview(renderer); break;
      case 'transfer': this.renderTransfer(renderer); break;
      case 'test': this.renderTest(renderer); break;
      case 'mastery': this.renderMastery(renderer); break;
    }

    // Progress bar
    this.renderProgressBar(renderer);

    return renderer.getFrame();
  }

  private renderProgressBar(renderer: CommandRenderer): void {
    const phases: GamePhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phases.indexOf(this.phase);

    renderer.drawRectangle(0, 0, 800, 50, 'rgba(15, 23, 42, 0.9)');
    renderer.drawText("Pascal's Law", 20, 30, this.colors.text, 14, 'bold');

    const startX = 300;
    const spacing = 20;

    phases.forEach((_, i) => {
      const x = startX + i * spacing;
      const isActive = i === currentIndex;
      const isCompleted = i < currentIndex;

      renderer.addInteractiveElement({
        id: `progress_${i}`,
        type: 'progress_click',
        x: x - 5,
        y: 20,
        width: isActive ? 20 : 10,
        height: 10,
        value: i
      });

      const color = isActive ? this.colors.primary : isCompleted ? this.colors.success : '#475569';
      renderer.drawEllipse(x, 25, isActive ? 10 : 4, isActive ? 10 : 4, color);
    });

    renderer.drawText(this.phase.replace('_', ' '), 700, 30, this.colors.primary, 12);
  }

  private renderHydraulicSystem(renderer: CommandRenderer, x: number, y: number, showLabels: boolean = true): void {
    const progress = this.animationProgress / 100;
    const smallPistonY = y + 20 - progress * 30;
    const largePistonY = y + 20 - progress * (30 * this.smallPistonArea / this.largePistonArea);
    const ratio = Math.min(this.largePistonArea / this.smallPistonArea, 50);
    const largeWidth = Math.min(40 + ratio * 1.5, 100);

    // Fluid reservoir
    renderer.drawRoundedRectangle(x, y + 60, 300, 80, 5, this.colors.fluid);

    // Container border
    renderer.drawRoundedRectangle(x - 5, y + 55, 310, 90, 8, 'transparent', '#475569', 5);

    // Small piston cylinder
    renderer.drawRoundedRectangle(x + 15, y - 10, 50, 75, 2, '#1e293b');
    renderer.drawRoundedRectangle(x + 15, y - 10, 50, 75, 2, 'transparent', '#475569', 3);

    // Small piston
    renderer.drawRoundedRectangle(x + 18, smallPistonY, 44, 55, 3, '#94a3b8');
    renderer.drawRoundedRectangle(x + 18, smallPistonY, 44, 55, 3, 'transparent', '#475569', 2);

    // Large piston cylinder
    const largePistonX = x + 250 - largeWidth - 10;
    renderer.drawRoundedRectangle(largePistonX, y - 30, largeWidth + 10, 95, 2, '#1e293b');
    renderer.drawRoundedRectangle(largePistonX, y - 30, largeWidth + 10, 95, 2, 'transparent', '#475569', 3);

    // Large piston
    renderer.drawRoundedRectangle(largePistonX + 3, largePistonY, largeWidth + 4, 55, 3, '#94a3b8');
    renderer.drawRoundedRectangle(largePistonX + 3, largePistonY, largeWidth + 4, 55, 3, 'transparent', '#475569', 2);

    // Load on large piston
    renderer.drawRoundedRectangle(largePistonX + 8, largePistonY - 35, largeWidth - 6, 32, 5, '#f59e0b');
    renderer.drawRoundedRectangle(largePistonX + 8, largePistonY - 35, largeWidth - 6, 32, 5, 'transparent', '#d97706', 2);
    renderer.drawText("LOAD", largePistonX + largeWidth / 2 + 5, largePistonY - 14, '#1e293b', 10, 'bold');

    if (showLabels) {
      // Input force arrow
      renderer.drawLine(x + 40, smallPistonY - 35, x + 40, smallPistonY - 8, '#22c55e', 4);
      renderer.drawText(`F1 = ${this.inputForce} N`, x + 40, smallPistonY - 45, '#22c55e', 12, 'bold');

      // Output force arrow
      const outputForce = this.calculateOutputForce();
      renderer.drawLine(largePistonX + largeWidth / 2 + 5, largePistonY + 70, largePistonX + largeWidth / 2 + 5, largePistonY + 45, '#ef4444', 4);
      renderer.drawText(`F2 = ${outputForce.toFixed(0)} N`, largePistonX + largeWidth / 2 + 5, largePistonY + 85, '#ef4444', 12, 'bold');

      // Pressure label
      const pressure = this.calculatePressure();
      renderer.drawRoundedRectangle(x + 105, y + 72, 90, 28, 4, '#1e293b');
      renderer.drawText(`P = ${pressure.toFixed(0)} N/cm2`, x + 150, y + 91, '#fcd34d', 11, 'bold');

      // Area labels
      renderer.drawText(`A1 = ${this.smallPistonArea} cm2`, x + 40, y + 165, this.colors.textMuted, 10);
      renderer.drawText(`A2 = ${this.largePistonArea} cm2`, largePistonX + largeWidth / 2 + 5, y + 165, this.colors.textMuted, 10);
    }
  }

  private renderHook(renderer: CommandRenderer): void {
    // Badge
    renderer.drawRoundedRectangle(330, 70, 140, 30, 15, 'rgba(16, 185, 129, 0.1)');
    renderer.drawText("FLUID MECHANICS", 350, 90, this.colors.primary, 10, 'bold');

    // Title
    renderer.drawText("Pascal's Law", 400, 150, this.colors.text, 40, 'bold');
    renderer.drawText("Force multiplication through pressure", 400, 190, this.colors.textMuted, 16);

    // Card with hydraulic system
    renderer.drawRoundedRectangle(200, 220, 400, 220, 16, this.colors.cardBg);
    this.renderHydraulicSystem(renderer, 250, 270, false);

    renderer.drawText("A mechanic pushes with just 100 N...", 400, 470, this.colors.text, 14);
    renderer.drawText("and lifts a 2-ton car!", 400, 490, this.colors.primary, 14, 'bold');

    // Push button
    renderer.addInteractiveElement({
      id: 'start_animation',
      type: 'button_click',
      x: 250,
      y: 510,
      width: 150,
      height: 40
    });
    renderer.drawRoundedRectangle(250, 510, 150, 40, 10, '#475569');
    renderer.drawText("Push Piston", 325, 535, this.colors.text, 12, 'bold');

    // CTA
    renderer.addInteractiveElement({
      id: 'continue_hook',
      type: 'button_click',
      x: 420,
      y: 510,
      width: 150,
      height: 40
    });
    renderer.drawRoundedRectangle(420, 510, 150, 40, 10, this.colors.primary);
    renderer.drawText("Investigate!", 495, 535, this.colors.text, 12, 'bold');
  }

  private renderPredict(renderer: CommandRenderer): void {
    renderer.drawText("Make Your Prediction", 400, 100, this.colors.text, 28, 'bold');
    renderer.drawText("If you push with 100 N on a small piston (1 cm^2) connected to a large piston (10 cm^2),", 400, 140, this.colors.textMuted, 12);
    renderer.drawText("what force does the large piston exert?", 400, 160, this.colors.textMuted, 12);

    const predictions = [
      { id: 0, label: '100 N - Force stays the same' },
      { id: 1, label: '1,000 N - Force is multiplied by the area ratio (10x)' },
      { id: 2, label: '10 N - Force is divided by the area ratio' },
      { id: 3, label: 'It depends on the fluid used' }
    ];

    predictions.forEach((pred, i) => {
      const y = 190 + i * 70;
      const isSelected = this.prediction === pred.id;

      renderer.addInteractiveElement({
        id: 'select_prediction',
        type: 'button_click',
        x: 150,
        y: y,
        width: 500,
        height: 60,
        value: pred.id
      });

      renderer.drawRoundedRectangle(150, y, 500, 60, 12,
        isSelected ? 'rgba(16, 185, 129, 0.2)' : this.colors.cardBg);
      if (isSelected) {
        renderer.drawRoundedRectangle(150, y, 500, 60, 12, 'transparent', this.colors.primary, 2);
      }
      renderer.drawText(pred.label, 400, y + 35, this.colors.text, 12);
    });

    if (this.prediction !== null) {
      renderer.addInteractiveElement({
        id: 'submit_prediction',
        type: 'button_click',
        x: 300,
        y: 490,
        width: 200,
        height: 50
      });
      renderer.drawRoundedRectangle(300, 490, 200, 50, 12, this.colors.primary);
      renderer.drawText("Test It!", 400, 520, this.colors.text, 14, 'bold');
    }
  }

  private renderPlay(renderer: CommandRenderer): void {
    renderer.drawText("Hydraulic Force Multiplication", 400, 70, this.colors.text, 24, 'bold');

    this.renderHydraulicSystem(renderer, 200, 150, true);

    // Controls
    renderer.drawText(`Input Force: ${this.inputForce} N`, 150, 420, this.colors.textMuted, 12);
    renderer.addInteractiveElement({
      id: 'input_force',
      type: 'slider_change',
      x: 100,
      y: 435,
      width: 200,
      height: 20,
      min: 50,
      max: 500,
      value: this.inputForce
    });
    renderer.drawRoundedRectangle(100, 435, 200, 10, 5, '#475569');
    renderer.drawRoundedRectangle(100, 435, ((this.inputForce - 50) / 450) * 200, 10, 5, this.colors.primary);

    renderer.drawText(`Small Area: ${this.smallPistonArea} cm2`, 400, 420, this.colors.textMuted, 12);
    renderer.addInteractiveElement({
      id: 'small_area',
      type: 'slider_change',
      x: 350,
      y: 435,
      width: 150,
      height: 20,
      min: 1,
      max: 10,
      value: this.smallPistonArea
    });
    renderer.drawRoundedRectangle(350, 435, 150, 10, 5, '#475569');
    renderer.drawRoundedRectangle(350, 435, ((this.smallPistonArea - 1) / 9) * 150, 10, 5, this.colors.secondary);

    renderer.drawText(`Large Area: ${this.largePistonArea} cm2`, 630, 420, this.colors.textMuted, 12);
    renderer.addInteractiveElement({
      id: 'large_area',
      type: 'slider_change',
      x: 550,
      y: 435,
      width: 150,
      height: 20,
      min: 5,
      max: 100,
      value: this.largePistonArea
    });
    renderer.drawRoundedRectangle(550, 435, 150, 10, 5, '#475569');
    renderer.drawRoundedRectangle(550, 435, ((this.largePistonArea - 5) / 95) * 150, 10, 5, this.colors.accent);

    // Results
    const ma = this.calculateMechanicalAdvantage();
    const outputForce = this.calculateOutputForce();
    renderer.drawRoundedRectangle(200, 480, 400, 50, 10, 'rgba(16, 185, 129, 0.2)');
    renderer.drawText(`Mechanical Advantage: ${ma.toFixed(1)}x | Output Force: ${outputForce.toFixed(0)} N`, 400, 510, this.colors.primary, 13, 'bold');

    // Animate button
    renderer.addInteractiveElement({
      id: 'start_animation',
      type: 'button_click',
      x: 250,
      y: 545,
      width: 150,
      height: 40
    });
    renderer.drawRoundedRectangle(250, 545, 150, 40, 10, '#475569');
    renderer.drawText(this.isAnimating ? "Pressing..." : "Press Piston", 325, 570, this.colors.text, 12, 'bold');

    // Continue
    renderer.addInteractiveElement({
      id: 'continue_to_review',
      type: 'button_click',
      x: 420,
      y: 545,
      width: 150,
      height: 40
    });
    renderer.drawRoundedRectangle(420, 545, 150, 40, 10, this.colors.primary);
    renderer.drawText("Continue", 495, 570, this.colors.text, 12, 'bold');
  }

  private renderReview(renderer: CommandRenderer): void {
    const wasCorrect = this.prediction === 1;

    renderer.drawText("Pascal's Principle", 400, 80, this.colors.text, 24, 'bold');

    renderer.drawRoundedRectangle(150, 120, 500, 220, 16, this.colors.cardBg);

    // Key formula
    renderer.drawText("F1/A1 = F2/A2 = Pressure", 400, 160, this.colors.primary, 18, 'bold');
    renderer.drawText("Pressure transmits equally through the fluid", 400, 195, this.colors.textMuted, 13);

    // Steps
    const steps = [
      { num: 1, title: "Apply Force to Small Piston", desc: "Creates pressure P = F1/A1", color: '#22c55e' },
      { num: 2, title: "Pressure Transmits Through Fluid", desc: "Pascal's Law: pressure is uniform", color: '#fcd34d' },
      { num: 3, title: "Large Piston Multiplies Force", desc: "F2 = P x A2 = F1 x (A2/A1)", color: '#ef4444' }
    ];

    steps.forEach((step, i) => {
      const x = 180 + i * 160;
      renderer.drawEllipse(x, 250, 18, 18, step.color);
      renderer.drawText(step.num.toString(), x, 257, '#1e293b', 12, 'bold');
      renderer.drawText(step.title.split(' ').slice(0, 2).join(' '), x, 285, this.colors.text, 10, 'bold');
      renderer.drawText(step.desc.slice(0, 20), x, 305, this.colors.textMuted, 9);
    });

    // Feedback
    renderer.drawText(`Your prediction: ${wasCorrect ? '✓ Correct! Force multiplies by area ratio' : '✗ Force multiplies by area ratio (10x)'}`, 400, 370,
      wasCorrect ? this.colors.success : this.colors.warning, 14);

    renderer.addInteractiveElement({
      id: 'continue_to_twist',
      type: 'button_click',
      x: 300,
      y: 410,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(300, 410, 200, 50, 12, this.colors.secondary);
    renderer.drawText("But wait...", 400, 440, this.colors.text, 14, 'bold');
  }

  private renderTwistPredict(renderer: CommandRenderer): void {
    renderer.drawText("The Twist!", 400, 80, this.colors.secondary, 28, 'bold');
    renderer.drawText("If force is multiplied 10x, do we get free energy?", 400, 120, this.colors.textMuted, 14);
    renderer.drawText("What's the catch with hydraulic force multiplication?", 400, 145, '#fbbf24', 14, 'bold');

    const predictions = [
      { id: 0, label: 'There is no catch - we really do get more force for free' },
      { id: 1, label: 'The system heats up and loses energy to friction' },
      { id: 2, label: 'The small piston must move MORE distance to get more force' },
      { id: 3, label: 'Only special fluids can multiply force' }
    ];

    predictions.forEach((pred, i) => {
      const y = 180 + i * 70;
      const isSelected = this.twistPrediction === pred.id;

      renderer.addInteractiveElement({
        id: 'select_twist_prediction',
        type: 'button_click',
        x: 150,
        y: y,
        width: 500,
        height: 60,
        value: pred.id
      });

      renderer.drawRoundedRectangle(150, y, 500, 60, 12,
        isSelected ? 'rgba(20, 184, 166, 0.2)' : this.colors.cardBg);
      if (isSelected) {
        renderer.drawRoundedRectangle(150, y, 500, 60, 12, 'transparent', this.colors.secondary, 2);
      }
      renderer.drawText(pred.label, 400, y + 35, this.colors.text, 12);
    });

    if (this.twistPrediction !== null) {
      renderer.addInteractiveElement({
        id: 'submit_twist_prediction',
        type: 'button_click',
        x: 300,
        y: 480,
        width: 200,
        height: 50
      });
      renderer.drawRoundedRectangle(300, 480, 200, 50, 12, this.colors.secondary);
      renderer.drawText("Test It!", 400, 510, this.colors.text, 14, 'bold');
    }
  }

  private renderTwistPlay(renderer: CommandRenderer): void {
    renderer.drawText("Conservation of Energy", 400, 70, this.colors.secondary, 24, 'bold');

    const ma = this.calculateMechanicalAdvantage();
    const inputDist = 10; // cm
    const outputDist = this.calculateOutputDistance(inputDist);
    const work = this.calculateWork();

    // Work diagram
    renderer.drawRoundedRectangle(100, 120, 600, 150, 16, this.colors.cardBg);

    // Input side
    renderer.drawRoundedRectangle(130, 160, 80, 80, 5, '#1e293b');
    renderer.drawRoundedRectangle(140, 175, 60, 35, 3, '#94a3b8');
    renderer.drawLine(170, 200, 170, 235, '#22c55e', 3);
    renderer.drawText(`d1 = ${inputDist} cm`, 170, 255, '#22c55e', 10, 'bold');
    renderer.drawText(`F1 = ${this.inputForce} N`, 170, 150, '#22c55e', 10, 'bold');

    // Work equation
    renderer.drawRoundedRectangle(280, 165, 240, 60, 8, '#1e293b');
    renderer.drawText("Work In = Work Out", 400, 185, '#a855f7', 14, 'bold');
    renderer.drawText(`${this.inputForce}x${inputDist} = ${this.calculateOutputForce().toFixed(0)}x${outputDist.toFixed(1)}`, 400, 210, '#c084fc', 11);

    // Output side
    renderer.drawRoundedRectangle(590, 160, 100, 80, 5, '#1e293b');
    renderer.drawRoundedRectangle(600, 195, 80, 35, 3, '#94a3b8');
    renderer.drawLine(640, 220, 640, 230 + outputDist * 2, '#ef4444', 3);
    renderer.drawText(`d2 = ${outputDist.toFixed(1)} cm`, 640, 255, '#ef4444', 10, 'bold');
    renderer.drawText(`F2 = ${this.calculateOutputForce().toFixed(0)} N`, 640, 150, '#ef4444', 10, 'bold');

    // Explanation
    renderer.drawRoundedRectangle(200, 300, 400, 100, 10, 'rgba(20, 184, 166, 0.2)');
    renderer.drawText("The Tradeoff:", 400, 330, this.colors.secondary, 14, 'bold');
    renderer.drawText(`${ma.toFixed(0)}x MORE force, but ${ma.toFixed(0)}x LESS movement`, 400, 355, this.colors.text, 12);
    renderer.drawText(`Work = ${work.input} N-cm (same in both!)`, 400, 380, this.colors.textMuted, 11);

    renderer.addInteractiveElement({
      id: 'continue_twist_review',
      type: 'button_click',
      x: 300,
      y: 430,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(300, 430, 200, 50, 12, this.colors.secondary);
    renderer.drawText("Continue", 400, 460, this.colors.text, 14, 'bold');
  }

  private renderTwistReview(renderer: CommandRenderer): void {
    const wasCorrect = this.twistPrediction === 2;

    renderer.drawText("No Free Lunch!", 400, 80, this.colors.secondary, 24, 'bold');

    renderer.drawRoundedRectangle(150, 120, 500, 200, 16, this.colors.cardBg);
    renderer.drawText("Energy Conservation in Hydraulics:", 400, 160, '#fbbf24', 14, 'bold');

    const points = [
      { text: "Force CAN be multiplied (area ratio)", color: this.colors.success },
      { text: "Distance is REDUCED by same ratio", color: this.colors.warning },
      { text: "Work (Force x Distance) stays CONSTANT", color: '#a855f7' }
    ];

    points.forEach((p, i) => {
      const y = 195 + i * 40;
      renderer.drawText(`${i + 1}. ${p.text}`, 400, y, p.color, 12);
    });

    // Feedback
    renderer.drawText(`Your prediction: ${wasCorrect ? '✓ Correct! Distance is the tradeoff' : '✗ Distance is the tradeoff!'}`, 400, 350,
      wasCorrect ? this.colors.success : this.colors.warning, 14);

    renderer.addInteractiveElement({
      id: 'continue_to_transfer',
      type: 'button_click',
      x: 300,
      y: 400,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(300, 400, 200, 50, 12, this.colors.accent);
    renderer.drawText("See Applications", 400, 430, this.colors.text, 14, 'bold');
  }

  private renderTransfer(renderer: CommandRenderer): void {
    renderer.drawText("Real-World Applications", 400, 70, this.colors.text, 24, 'bold');
    renderer.drawText("Explore all 4 to unlock the quiz", 400, 100, this.colors.textMuted, 12);

    this.applications.forEach((app, i) => {
      const x = 110 + i * 170;
      const isActive = this.activeAppTab === i;
      const isCompleted = this.completedApps.has(i);

      renderer.addInteractiveElement({
        id: 'select_app',
        type: 'button_click',
        x: x,
        y: 130,
        width: 150,
        height: 50,
        value: i
      });

      let bgColor = '#475569';
      if (isActive) bgColor = this.colors.primary;
      else if (isCompleted) bgColor = 'rgba(34, 197, 94, 0.3)';

      renderer.drawRoundedRectangle(x, 130, 150, 50, 12, bgColor);
      renderer.drawText(isCompleted ? '✓' : '', x + 15, 160, this.colors.success, 12);
      renderer.drawText(app.title.split(' ')[0], x + 75, 160, this.colors.text, 11);
    });

    const app = this.applications[this.activeAppTab];
    renderer.drawRoundedRectangle(150, 200, 500, 180, 16, this.colors.cardBg);
    renderer.drawText(app.title, 400, 240, this.colors.text, 20, 'bold');
    renderer.drawText(app.description, 400, 310, this.colors.text, 11);

    renderer.drawText(`Progress: ${this.completedApps.size}/4`, 400, 420, this.colors.textMuted, 12);

    if (this.completedApps.size >= 4) {
      renderer.addInteractiveElement({
        id: 'start_test',
        type: 'button_click',
        x: 300,
        y: 460,
        width: 200,
        height: 50
      });
      renderer.drawRoundedRectangle(300, 460, 200, 50, 12, this.colors.success);
      renderer.drawText("Take the Quiz", 400, 490, this.colors.text, 14, 'bold');
    }
  }

  private renderTest(renderer: CommandRenderer): void {
    if (this.showTestResults) {
      const score = this.calculateScore();
      const passed = score >= 7;

      renderer.drawText("Quiz Complete!", 400, 150, this.colors.text, 32, 'bold');
      renderer.drawText(`You scored ${score}/10`, 400, 220, passed ? this.colors.success : this.colors.warning, 24);
      renderer.drawText(passed ? "Excellent! You understand Pascal's Law!" : "Review the concepts and try again!", 400, 270, this.colors.textMuted, 14);

      renderer.addInteractiveElement({
        id: 'continue_from_test',
        type: 'button_click',
        x: 300,
        y: 350,
        width: 200,
        height: 50
      });
      renderer.drawRoundedRectangle(300, 350, 200, 50, 12, passed ? this.colors.success : this.colors.secondary);
      renderer.drawText(passed ? "Continue!" : "Try Again", 400, 380, this.colors.text, 14, 'bold');
      return;
    }

    renderer.drawText("Knowledge Check", 400, 70, this.colors.text, 24, 'bold');
    renderer.drawText("Answer all 10 questions (70% to pass)", 400, 100, this.colors.textMuted, 12);

    // Progress
    const answered = this.testAnswers.filter(a => a !== -1).length;
    renderer.drawRoundedRectangle(150, 120, 500, 10, 5, '#475569');
    renderer.drawRoundedRectangle(150, 120, (answered / 10) * 500, 10, 5, this.colors.primary);
    renderer.drawText(`${answered}/10`, 670, 128, this.colors.textMuted, 12);

    // Current question
    let currentQ = this.testAnswers.findIndex(a => a === -1);
    if (currentQ === -1) currentQ = 0;

    const question = TEST_QUESTIONS[currentQ];

    renderer.drawRoundedRectangle(100, 150, 600, 70, 12, this.colors.cardBg);
    renderer.drawText(`${currentQ + 1}. ${question.question}`, 400, 190, this.colors.text, 11);

    question.options.forEach((option, i) => {
      const y = 240 + i * 55;
      const isSelected = this.testAnswers[currentQ] === i;
      const isCorrect = i === question.correctIndex;

      let bgColor = this.colors.cardBg;
      if (isSelected) {
        bgColor = isCorrect ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
      }

      renderer.addInteractiveElement({
        id: 'select_answer',
        type: 'button_click',
        x: 100,
        y: y,
        width: 600,
        height: 45,
        value: `${currentQ}_${i}`
      });

      renderer.drawRoundedRectangle(100, y, 600, 45, 8, bgColor);
      renderer.drawText(option, 400, y + 27, this.colors.text, 10);
    });

    if (answered === 10) {
      renderer.addInteractiveElement({
        id: 'submit_test',
        type: 'button_click',
        x: 300,
        y: 530,
        width: 200,
        height: 45
      });
      renderer.drawRoundedRectangle(300, 530, 200, 45, 10, this.colors.primary);
      renderer.drawText("Submit Answers", 400, 557, this.colors.text, 14, 'bold');
    }
  }

  private renderMastery(renderer: CommandRenderer): void {
    renderer.drawText("TROPHY", 400, 100, this.colors.primary, 50, 'bold');
    renderer.drawText("Pascal's Law Master!", 400, 180, this.colors.text, 28, 'bold');

    renderer.drawRoundedRectangle(200, 220, 400, 200, 16, 'rgba(16, 185, 129, 0.2)');
    renderer.drawText("You now understand:", 400, 260, this.colors.primary, 14, 'bold');

    const achievements = [
      "✓ F1/A1 = F2/A2 = Pressure (Pascal's Law)",
      "✓ Force multiplies by area ratio",
      "✓ Distance reduces by same ratio (energy conserved)",
      "✓ Real applications: brakes, lifts, presses, aircraft"
    ];

    achievements.forEach((a, i) => {
      renderer.drawText(a, 400, 300 + i * 25, this.colors.text, 11);
    });

    renderer.drawText("You can now design hydraulic systems!", 400, 450, this.colors.textMuted, 12);

    renderer.addInteractiveElement({
      id: 'complete_mastery',
      type: 'button_click',
      x: 300,
      y: 490,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(300, 490, 200, 50, 12, this.colors.success);
    renderer.drawText("Complete!", 400, 520, this.colors.text, 14, 'bold');
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      inputForce: this.inputForce,
      smallPistonArea: this.smallPistonArea,
      largePistonArea: this.largePistonArea,
      isAnimating: this.isAnimating,
      animationProgress: this.animationProgress,
      testAnswers: this.testAnswers,
      showTestResults: this.showTestResults,
      activeAppTab: this.activeAppTab,
      completedApps: Array.from(this.completedApps)
    };
  }

  restoreState(state: Record<string, unknown>): void {
    this.phase = state.phase as GamePhase;
    this.prediction = state.prediction as number | null;
    this.twistPrediction = state.twistPrediction as number | null;
    this.inputForce = state.inputForce as number;
    this.smallPistonArea = state.smallPistonArea as number;
    this.largePistonArea = state.largePistonArea as number;
    this.isAnimating = state.isAnimating as boolean;
    this.animationProgress = state.animationProgress as number;
    this.testAnswers = state.testAnswers as number[];
    this.showTestResults = state.showTestResults as boolean;
    this.activeAppTab = state.activeAppTab as number;
    this.completedApps = new Set(state.completedApps as number[]);
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createPascalLawGame(sessionId: string): PascalLawGame {
  return new PascalLawGame(sessionId);
}
