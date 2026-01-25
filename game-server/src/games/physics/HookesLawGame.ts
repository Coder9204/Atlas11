/**
 * Hooke's Law Game - Server-side Implementation
 *
 * Physics: F = kx
 * Where:
 * - F = restoring force (N)
 * - k = spring constant (N/m)
 * - x = displacement from equilibrium (m)
 *
 * Also covers:
 * - Elastic potential energy: PE = ½kx²
 * - Elastic limit and plastic deformation
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
  stats: { value: string; label: string }[];
  color: string;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PHASES: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const colors = {
  bg: '#0a0f1a',
  text: '#ffffff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  primary: '#22c55e',
  primaryDark: '#16a34a',
  secondary: '#14b8a6',
  accent: '#f59e0b',
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  panel: '#1e293b',
  panelDark: '#0f172a',
  border: '#334155',
  spring: '#22c55e',
  weight: '#ef4444',
  restoring: '#22c55e',
};

export class HookesLawGame extends BaseGame {
  readonly gameType = 'hookes_law';
  readonly gameTitle = "Hooke's Law";

  private phase: Phase = 'hook';
  private frameCount = 0;
  private width = 700;
  private height = 350;

  // Spring simulation state
  private springConstant = 50; // N/m
  private appliedForce = 10; // N
  private isOscillating = false;
  private showForceArrows = true;
  private time = 0;

  // Prediction state
  private selectedPrediction: string | null = null;
  private showPredictionFeedback = false;
  private twistPrediction: string | null = null;
  private showTwistFeedback = false;

  // Transfer state
  private activeAppTab = 0;
  private completedApps = new Set<number>();

  // Test state
  private testAnswers: number[] = Array(10).fill(-1);
  private showTestResults = false;

  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "Spring A stretches 2 cm when you hang a 100g weight. Spring B stretches 4 cm with the same weight.",
      question: "Which spring has the higher spring constant k?",
      options: [
        "Spring A (stiffer, smaller stretch)",
        "Spring B (stretches more)",
        "They have the same k",
        "Cannot determine"
      ],
      correctIndex: 0,
      explanation: "From k = F/x, Spring A has double the spring constant because it stretches half as much under the same force."
    },
    {
      scenario: "A bungee cord (k = 50 N/m) stretches 12 meters at maximum extension.",
      question: "What is the restoring force?",
      options: ["50 N", "600 N", "4.2 N", "720 N"],
      correctIndex: 1,
      explanation: "F = kx = 50 N/m × 12 m = 600 N"
    },
    {
      scenario: "A car suspension spring compresses 5 cm when a 200 kg load is placed on it.",
      question: "What is the spring constant?",
      options: ["1,000 N/m", "4,000 N/m", "40,000 N/m", "400,000 N/m"],
      correctIndex: 2,
      explanation: "F = mg = 2000 N. k = F/x = 2000 N / 0.05 m = 40,000 N/m"
    },
    {
      scenario: "You stretch a spring beyond its elastic limit. It doesn't return to original length.",
      question: "What happened to the spring?",
      options: [
        "It gained energy",
        "It underwent plastic deformation",
        "It lost its spring constant",
        "Temperature affected it"
      ],
      correctIndex: 1,
      explanation: "Beyond the elastic limit, plastic deformation occurs - molecular bonds break and reform in new positions."
    },
    {
      scenario: "Two identical springs (k = 100 N/m) are connected in SERIES. A 10 N force is applied.",
      question: "What is the total stretch?",
      options: ["5 cm", "10 cm", "20 cm", "2.5 cm"],
      correctIndex: 2,
      explanation: "In series, each spring feels the full 10 N. Each stretches 10 cm, total = 20 cm."
    },
    {
      scenario: "Same two springs now in PARALLEL with 10 N applied.",
      question: "What is the total stretch now?",
      options: ["20 cm", "10 cm", "5 cm", "2.5 cm"],
      correctIndex: 2,
      explanation: "In parallel, k_total = 200 N/m. x = F/k = 10 N / 200 N/m = 0.05 m = 5 cm."
    },
    {
      scenario: "A spring (k = 500 N/m) is compressed by 0.1 m.",
      question: "How much elastic potential energy is stored?",
      options: ["50 J", "25 J", "2.5 J", "5 J"],
      correctIndex: 2,
      explanation: "PE = ½kx² = ½ × 500 × (0.1)² = 2.5 J"
    },
    {
      scenario: "A kitchen scale spring compresses 1 mm per 100 grams.",
      question: "How much does it compress for a 1.5 kg object?",
      options: ["1.5 mm", "15 mm", "150 mm", "0.15 mm"],
      correctIndex: 1,
      explanation: "Linear relationship! 1.5 kg = 15 × 100 g, so 15 × 1 mm = 15 mm."
    },
    {
      scenario: "A child bounces on a trampoline, going higher each time.",
      question: "When is the net force on the child greatest?",
      options: [
        "At highest point",
        "Moving up through equilibrium",
        "At maximum compression",
        "Force is constant"
      ],
      correctIndex: 2,
      explanation: "F = kx means maximum force at maximum displacement (greatest compression)."
    },
    {
      scenario: "Engineers design earthquake base isolation with giant springs.",
      question: "Should these springs be stiff or soft?",
      options: [
        "Very stiff - prevent movement",
        "Relatively soft - controlled movement",
        "Infinitely stiff - rigid",
        "Stiffness doesn't matter"
      ],
      correctIndex: 1,
      explanation: "Soft springs allow the ground to move while the building stays relatively stationary."
    }
  ];

  private readonly transferApps: TransferApp[] = [
    {
      title: "Vehicle Suspension",
      short: "Cars",
      tagline: "Springs absorb the road",
      description: "Every vehicle uses spring-based suspension to absorb bumps and provide comfortable rides.",
      connection: "Car engineers tune suspension springs to balance comfort (soft k) and handling (stiff k).",
      stats: [
        { value: "40,000", label: "N/m typical" },
        { value: "10 cm", label: "Travel" },
        { value: "$45B", label: "Market" }
      ],
      color: colors.primary
    },
    {
      title: "Mechanical Watches",
      short: "Watches",
      tagline: "Springs measure time",
      description: "Mechanical watches use a hairspring whose oscillations follow Hooke's Law for accurate timekeeping.",
      connection: "The period T = 2π√(m/k) means spring stiffness determines how fast the watch ticks.",
      stats: [
        { value: "0.05mm", label: "Hairspring" },
        { value: "±2 sec", label: "Daily accuracy" },
        { value: "$50B", label: "Luxury market" }
      ],
      color: colors.secondary
    },
    {
      title: "Structural Engineering",
      short: "Buildings",
      tagline: "Elastic design saves lives",
      description: "Hooke's Law governs how buildings respond to loads. Engineers ensure elastic behavior under normal forces.",
      connection: "Structures are designed with safety factors to always stay within the elastic limit.",
      stats: [
        { value: "200 GPa", label: "Steel modulus" },
        { value: "2-3x", label: "Safety factor" },
        { value: "$12T", label: "Construction" }
      ],
      color: colors.accent
    },
    {
      title: "Sports Equipment",
      short: "Sports",
      tagline: "Energy return systems",
      description: "From running shoes to pole vaults, athletic equipment exploits elastic energy storage.",
      connection: "PE = ½kx² shows how compressed materials store energy returned to athletes.",
      stats: [
        { value: "85%+", label: "Energy return" },
        { value: "6m+", label: "Pole vault" },
        { value: "$180B", label: "Sports market" }
      ],
      color: colors.secondary
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
    // Animation updates
    if (this.isOscillating) {
      this.time += 0.05;
    }
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

    // Oscillation toggle
    if (id === 'toggle_oscillation') {
      this.isOscillating = !this.isOscillating;
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

  private handleSliderChange(id: string, value: number): void {
    if (id === 'spring_constant') {
      this.springConstant = value;
    } else if (id === 'applied_force') {
      this.appliedForce = value;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'show_forces') {
      this.showForceArrows = value;
    }
  }

  private advancePhase(): void {
    const currentIndex = PHASES.indexOf(this.phase);
    if (currentIndex < PHASES.length - 1) {
      this.phase = PHASES[currentIndex + 1];
    }
  }

  private resetGameState(): void {
    this.springConstant = 50;
    this.appliedForce = 10;
    this.isOscillating = false;
    this.showForceArrows = true;
    this.time = 0;
    this.selectedPrediction = null;
    this.showPredictionFeedback = false;
    this.twistPrediction = null;
    this.showTwistFeedback = false;
    this.activeAppTab = 0;
    this.completedApps.clear();
    this.testAnswers = Array(10).fill(-1);
    this.showTestResults = false;
  }

  private getDisplacement(): number {
    return this.appliedForce / this.springConstant;
  }

  private getOscillatingDisplacement(): number {
    const baseDisp = this.getDisplacement();
    return this.isOscillating ? baseDisp * Math.sin(this.time * 5) : baseDisp;
  }

  private getElasticPE(): number {
    const x = this.getDisplacement();
    return 0.5 * this.springConstant * x * x;
  }

  private getTestScore(): number {
    return this.testAnswers.reduce((score, answer, index) => {
      return score + (answer === this.testQuestions[index].correctIndex ? 1 : 0);
    }, 0);
  }

  render(): GameFrame {
    this.update(0.05);

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
    r.setHeader("Hooke's Law: F = kx", 'The simple law that governs all springs');

    const cx = this.width / 2;

    // Animated spring illustration
    const baseY = 60;
    const restLength = 100;
    const animDisp = 30 * Math.sin(this.frameCount * 0.05);
    const currentLength = restLength + animDisp;

    // Ceiling
    r.rect(cx - 50, baseY - 15, 100, 15, { fill: colors.textMuted });

    // Draw spring coils
    this.drawSpring(r, cx, baseY, currentLength, colors.spring);

    // Weight block
    r.rect(cx - 30, baseY + currentLength, 60, 40, { fill: colors.panel, stroke: colors.spring, strokeWidth: 2, rx: 5 });
    r.text(cx, baseY + currentLength + 25, 'Mass', { fill: colors.text, fontSize: 11, textAnchor: 'middle' });

    // Info cards
    const cardY = 210;
    const cardW = 180;
    const cards = [
      { icon: '🔧', label: 'Spring Lab' },
      { icon: '📐', label: 'F = kx' },
      { icon: '🚗', label: 'Real World' }
    ];

    cards.forEach((card, i) => {
      const x = cx - (cards.length * cardW + (cards.length - 1) * 15) / 2 + i * (cardW + 15);
      r.rect(x, cardY, cardW, 55, { fill: colors.panel, rx: 8 });
      r.text(x + cardW / 2, cardY + 22, card.icon, { fill: colors.text, fontSize: 18, textAnchor: 'middle' });
      r.text(x + cardW / 2, cardY + 42, card.label, { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    });

    r.text(cx, 285, 'Springs are everywhere - discover the beautifully simple law!', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle'
    });

    r.setCoachMessage("Hooke's Law describes how springs respond to force. Let's explore!");
    r.addButton({ id: 'next', label: 'Discover the Law', variant: 'primary' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.setHeader('Make Your Prediction', 'How do springs respond to force?');

    r.text(this.width / 2, 50, 'You hang 1 kg on a spring and it stretches 5 cm.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle'
    });
    r.text(this.width / 2, 70, 'If you hang 2 kg, how much will it stretch?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const options = [
      { id: 'half', text: '2.5 cm (half as much)' },
      { id: 'same', text: '5 cm (same amount)' },
      { id: 'double', text: '10 cm (double the stretch)' },
      { id: 'quad', text: '20 cm (quadruple)' }
    ];

    const startY = 95;
    options.forEach((opt, i) => {
      const y = startY + i * 42;
      const isSelected = this.selectedPrediction === opt.id;
      const isCorrect = opt.id === 'double';

      let bgColor = colors.panel;
      if (this.showPredictionFeedback) {
        if (isSelected && isCorrect) bgColor = '#166534';
        else if (isSelected && !isCorrect) bgColor = '#991b1b';
        else if (isCorrect) bgColor = '#166534';
      }

      r.rect(100, y, this.width - 200, 36, { fill: bgColor, rx: 8 });
      r.text(120, y + 22, opt.text, { fill: colors.text, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `pred_${opt.id}`, label: opt.id, variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.rect(100, 275, this.width - 200, 50, { fill: colors.panelDark, rx: 8 });
      r.text(this.width / 2, 295, 'Double the force = Double the stretch!', {
        fill: colors.success,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });
      r.text(this.width / 2, 315, "This is Hooke's Law: F = kx (force proportional to displacement)", {
        fill: colors.textSecondary,
        fontSize: 11,
        textAnchor: 'middle'
      });
      r.addButton({ id: 'next', label: 'Test the Spring', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.setHeader("Hooke's Law Explorer", 'Experiment with force and spring constant');

    const springX = 180;
    const baseY = 50;
    const restLength = 80;
    const displacement = this.getOscillatingDisplacement();
    const currentLength = restLength + displacement * 150;

    // Ceiling
    r.rect(springX - 40, baseY - 10, 80, 12, { fill: colors.textMuted });

    // Draw spring
    this.drawSpring(r, springX, baseY, currentLength, colors.spring);

    // Weight block
    const weightY = baseY + currentLength;
    r.rect(springX - 30, weightY, 60, 35, { fill: colors.panel, stroke: colors.spring, strokeWidth: 2, rx: 5 });
    r.text(springX, weightY + 22, `${(this.appliedForce / 10).toFixed(1)} kg`, { fill: colors.text, fontSize: 10, textAnchor: 'middle' });

    // Force arrows
    if (this.showForceArrows && !this.isOscillating) {
      // Gravity (red down)
      const gravLen = Math.min(this.appliedForce * 1.5, 50);
      r.line(springX, weightY + 40, springX, weightY + 40 + gravLen, { stroke: colors.weight, strokeWidth: 3 });
      r.polygon([
        [springX, weightY + 48 + gravLen],
        [springX - 5, weightY + 40 + gravLen],
        [springX + 5, weightY + 40 + gravLen]
      ], { fill: colors.weight });
      r.text(springX + 25, weightY + 55, `W = ${this.appliedForce.toFixed(0)} N`, { fill: colors.weight, fontSize: 9 });

      // Spring force (green up)
      r.line(springX, weightY - 5, springX, weightY - 5 - gravLen, { stroke: colors.restoring, strokeWidth: 3 });
      r.polygon([
        [springX, weightY - 13 - gravLen],
        [springX - 5, weightY - 5 - gravLen],
        [springX + 5, weightY - 5 - gravLen]
      ], { fill: colors.restoring });
      r.text(springX + 25, weightY - 35, `F = kx`, { fill: colors.restoring, fontSize: 9 });
    }

    // Rest position line
    r.line(springX + 50, baseY + restLength, springX + 100, baseY + restLength, { stroke: colors.textMuted, strokeWidth: 1 });
    r.text(springX + 105, baseY + restLength + 4, 'Rest', { fill: colors.textMuted, fontSize: 8 });

    // Current position line
    if (displacement > 0.02) {
      r.line(springX + 50, weightY + 17, springX + 100, weightY + 17, { stroke: colors.secondary, strokeWidth: 1 });
      r.line(springX + 75, baseY + restLength, springX + 75, weightY + 17, { stroke: colors.secondary, strokeWidth: 2 });
      r.text(springX + 105, weightY + 20, `x = ${(displacement * 100).toFixed(1)} cm`, { fill: colors.secondary, fontSize: 9 });
    }

    // Stats panel
    r.rect(350, 50, 300, 120, { fill: colors.panel, rx: 10 });
    r.text(370, 75, 'Spring Constant (k):', { fill: colors.textSecondary, fontSize: 11 });
    r.text(530, 75, `${this.springConstant} N/m`, { fill: colors.primary, fontSize: 12, fontWeight: 'bold' });

    r.text(370, 100, 'Displacement (x):', { fill: colors.textSecondary, fontSize: 11 });
    r.text(530, 100, `${(this.getDisplacement() * 100).toFixed(1)} cm`, { fill: colors.secondary, fontSize: 12, fontWeight: 'bold' });

    r.text(370, 125, 'Elastic PE:', { fill: colors.textSecondary, fontSize: 11 });
    r.text(530, 125, `${this.getElasticPE().toFixed(3)} J`, { fill: colors.accent, fontSize: 12, fontWeight: 'bold' });

    r.text(370, 155, 'Formula: F = kx', { fill: colors.primary, fontSize: 13, fontWeight: 'bold' });

    // Controls
    r.addSlider({ id: 'applied_force', label: 'Applied Force (N)', value: this.appliedForce, min: 0, max: 50, step: 1 });
    r.addSlider({ id: 'spring_constant', label: 'Spring Constant (N/m)', value: this.springConstant, min: 20, max: 200, step: 5 });
    r.addToggle({ id: 'show_forces', label: 'Show Forces', value: this.showForceArrows });
    r.addButton({ id: 'toggle_oscillation', label: this.isOscillating ? 'Stop Oscillation' : 'Start Oscillation', variant: 'secondary' });
    r.addButton({ id: 'next', label: 'Continue', variant: 'primary' });

    r.setCoachMessage('Adjust force and spring constant to see how F = kx works. Higher k = stiffer spring!');
  }

  private renderReview(r: CommandRenderer): void {
    r.setHeader('Understanding the Physics', "Hooke's Law explained");

    const cx = this.width / 2;
    const userCorrect = this.selectedPrediction === 'double';

    r.text(cx, 50, userCorrect ? 'Exactly Right!' : 'The Linear Relationship!', {
      fill: colors.success,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Main formula card
    r.rect(100, 75, this.width - 200, 55, { fill: colors.panelDark, rx: 10 });
    r.text(cx, 100, 'F = kx', { fill: colors.primary, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(cx, 120, 'Force = Spring Constant × Displacement', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });

    // Key concepts
    const concepts = [
      { icon: '📏', title: 'Linearity', desc: 'Double force = double stretch' },
      { icon: '🔧', title: 'Spring Constant k', desc: 'High k = hard to stretch' },
      { icon: '⚠️', title: 'Elastic Limit', desc: 'Only works up to a point!' }
    ];

    const cardW = (this.width - 140) / 3;
    concepts.forEach((c, i) => {
      const x = 60 + i * (cardW + 10);
      r.rect(x, 145, cardW, 75, { fill: colors.panel, rx: 8 });
      r.text(x + 15, 170, c.icon, { fill: colors.text, fontSize: 18 });
      r.text(x + 40, 170, c.title, { fill: colors.text, fontSize: 12, fontWeight: 'bold' });
      r.text(x + 10, 195, c.desc, { fill: colors.textSecondary, fontSize: 10 });
    });

    // Energy formula
    r.rect(100, 235, this.width - 200, 45, { fill: colors.accent + '20', rx: 8 });
    r.text(cx, 255, 'Elastic Potential Energy: PE = ½kx²', {
      fill: colors.accent,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(cx, 272, 'Energy stored increases with the SQUARE of displacement', {
      fill: colors.textSecondary,
      fontSize: 10,
      textAnchor: 'middle'
    });

    r.setCoachMessage("Now let's explore what happens when you stretch a spring TOO far...");
    r.addButton({ id: 'next', label: 'The Elastic Limit', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.setHeader('The Twist Challenge', 'What happens beyond the limit?');

    r.text(this.width / 2, 50, 'You keep adding weight to a spring, stretching it more and more.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle'
    });
    r.text(this.width / 2, 75, 'What happens when you exceed the elastic limit?', {
      fill: colors.accent,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const options = [
      { id: 'break', text: 'The spring breaks immediately' },
      { id: 'same', text: 'Nothing - springs can stretch infinitely' },
      { id: 'deform', text: 'Spring deforms permanently - won\'t return to original' },
      { id: 'stronger', text: 'The spring becomes stronger' }
    ];

    const startY = 100;
    options.forEach((opt, i) => {
      const y = startY + i * 42;
      const isSelected = this.twistPrediction === opt.id;
      const isCorrect = opt.id === 'deform';

      let bgColor = colors.panel;
      if (this.showTwistFeedback) {
        if (isSelected && isCorrect) bgColor = '#166534';
        else if (isSelected && !isCorrect) bgColor = '#991b1b';
        else if (isCorrect) bgColor = '#166534';
      }

      r.rect(80, y, this.width - 160, 36, { fill: bgColor, rx: 8 });
      r.text(100, y + 22, opt.text, { fill: colors.text, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `twist_pred_${opt.id}`, label: opt.id, variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.rect(80, 280, this.width - 160, 45, { fill: colors.panelDark, rx: 8 });
      r.text(this.width / 2, 300, 'Plastic Deformation!', {
        fill: colors.success,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });
      r.text(this.width / 2, 318, 'Beyond the elastic limit, molecular bonds break and reform in new positions.', {
        fill: colors.textSecondary,
        fontSize: 10,
        textAnchor: 'middle'
      });
      r.addButton({ id: 'next', label: 'See What Happens', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.setHeader('Stress-Strain Curve', 'Elastic vs. Plastic regions');

    // Draw stress-strain curve
    const graphX = 80;
    const graphY = 50;
    const graphW = this.width - 160;
    const graphH = 160;

    // Background
    r.rect(graphX, graphY, graphW, graphH, { fill: colors.panelDark, rx: 8 });

    // Axes
    r.line(graphX + 30, graphY + graphH - 20, graphX + graphW - 20, graphY + graphH - 20, { stroke: colors.border, strokeWidth: 2 });
    r.line(graphX + 30, graphY + graphH - 20, graphX + 30, graphY + 20, { stroke: colors.border, strokeWidth: 2 });

    // Labels
    r.text(graphX + graphW / 2, graphY + graphH - 5, 'Strain (Displacement)', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(graphX + 15, graphY + graphH / 2, 'Stress', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Linear region (Hooke's Law)
    const linearEndX = graphX + 150;
    const linearEndY = graphY + 70;
    r.line(graphX + 30, graphY + graphH - 20, linearEndX, linearEndY, { stroke: colors.primary, strokeWidth: 3 });
    r.text(graphX + 90, graphY + 100, 'Linear', { fill: colors.primary, fontSize: 10, fontWeight: 'bold' });
    r.text(graphX + 90, graphY + 112, "(Hooke's Law)", { fill: colors.primary, fontSize: 8 });

    // Elastic limit point
    r.circle(linearEndX, linearEndY, 6, { fill: colors.accent });
    r.text(linearEndX, linearEndY - 12, 'Elastic Limit', { fill: colors.accent, fontSize: 9, fontWeight: 'bold', textAnchor: 'middle' });

    // Plastic region
    r.path(`M${linearEndX} ${linearEndY} Q${graphX + 250} ${graphY + 50} ${graphX + 350} ${graphY + 55}`, {
      stroke: colors.error,
      strokeWidth: 3
    });
    r.text(graphX + 280, graphY + 40, 'Plastic', { fill: colors.error, fontSize: 10, fontWeight: 'bold' });

    // Fracture point
    r.circle(graphX + 350, graphY + 55, 6, { fill: colors.error });
    r.text(graphX + 350, graphY + 42, 'Fracture', { fill: colors.error, fontSize: 9, fontWeight: 'bold', textAnchor: 'middle' });

    // Permanent deformation line
    r.line(graphX + 200, graphY + 65, graphX + 100, graphY + graphH - 20, { stroke: colors.textMuted, strokeWidth: 1 });
    r.text(graphX + 150, graphY + 130, 'Permanent', { fill: colors.textMuted, fontSize: 8, textAnchor: 'middle' });
    r.text(graphX + 150, graphY + 140, 'deformation', { fill: colors.textMuted, fontSize: 8, textAnchor: 'middle' });

    // Explanation cards
    const cardY = 230;
    r.rect(graphX, cardY, (graphW - 20) / 2, 60, { fill: colors.primary + '20', rx: 8 });
    r.text(graphX + 15, cardY + 20, 'Elastic Region', { fill: colors.primary, fontSize: 12, fontWeight: 'bold' });
    r.text(graphX + 15, cardY + 38, 'F = kx applies.', { fill: colors.textSecondary, fontSize: 10 });
    r.text(graphX + 15, cardY + 52, 'Returns to original shape.', { fill: colors.textSecondary, fontSize: 10 });

    r.rect(graphX + (graphW + 20) / 2, cardY, (graphW - 20) / 2, 60, { fill: colors.error + '20', rx: 8 });
    r.text(graphX + (graphW + 20) / 2 + 15, cardY + 20, 'Plastic Region', { fill: colors.error, fontSize: 12, fontWeight: 'bold' });
    r.text(graphX + (graphW + 20) / 2 + 15, cardY + 38, 'Permanent deformation.', { fill: colors.textSecondary, fontSize: 10 });
    r.text(graphX + (graphW + 20) / 2 + 15, cardY + 52, 'Bonds break and reform.', { fill: colors.textSecondary, fontSize: 10 });

    r.setCoachMessage('The elastic limit is the boundary where Hooke\'s Law stops working!');
    r.addButton({ id: 'next', label: 'Key Insight', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.setHeader('Key Discovery', 'Elastic vs. Plastic behavior');

    const cx = this.width / 2;
    const userCorrect = this.twistPrediction === 'deform';

    r.text(cx, 50, userCorrect ? 'Exactly!' : 'Elastic vs Plastic', {
      fill: userCorrect ? colors.success : colors.accent,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const insights = [
      { icon: '🔬', title: 'Molecular Basis', desc: 'Elastic: bonds stretch. Plastic: bonds break and reform.' },
      { icon: '🏗️', title: 'Engineering Design', desc: 'Structures must stay well within elastic limits.' },
      { icon: '🔨', title: 'Useful Deformation', desc: 'Sometimes we WANT plastic: bending metal, crumple zones.' }
    ];

    insights.forEach((item, i) => {
      const y = 85 + i * 70;
      r.rect(80, y, this.width - 160, 60, { fill: colors.panel, rx: 10 });
      r.text(100, y + 25, item.icon, { fill: colors.text, fontSize: 20 });
      r.text(130, y + 25, item.title, { fill: colors.text, fontSize: 13, fontWeight: 'bold' });
      r.text(100, y + 45, item.desc, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.setCoachMessage('Now explore real-world applications of Hooke\'s Law!');
    r.addButton({ id: 'next', label: 'Real World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.setHeader('Real-World Applications', 'Springs everywhere');

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
    r.rect(30, 70, this.width - 60, 175, { fill: colors.panel, rx: 10 });

    r.text(50, 95, app.title, { fill: colors.text, fontSize: 14, fontWeight: 'bold' });
    r.text(50, 115, app.tagline, { fill: app.color, fontSize: 11 });
    r.text(50, 140, app.description.substring(0, 80), { fill: colors.textSecondary, fontSize: 10 });
    if (app.description.length > 80) {
      r.text(50, 155, app.description.substring(80), { fill: colors.textSecondary, fontSize: 10 });
    }

    // Physics connection
    r.rect(40, 170, this.width - 100, 40, { fill: colors.panelDark, rx: 5 });
    r.text(50, 190, 'Physics: ' + app.connection.substring(0, 70), { fill: colors.primary, fontSize: 9 });
    r.text(50, 205, app.connection.substring(70), { fill: colors.primary, fontSize: 9 });

    // Stats
    app.stats.forEach((stat, i) => {
      const x = 50 + i * 100;
      r.text(x, 230, stat.value, { fill: app.color, fontSize: 12, fontWeight: 'bold' });
      r.text(x, 245, stat.label, { fill: colors.textMuted, fontSize: 9 });
    });

    // Mark complete button
    if (!this.completedApps.has(this.activeAppTab)) {
      r.addButton({ id: `complete_app_${this.activeAppTab}`, label: 'Mark as Understood', variant: 'success' });
    }

    // Progress
    r.text(30, 275, 'Progress:', { fill: colors.textMuted, fontSize: 11 });
    this.transferApps.forEach((_, i) => {
      r.circle(90 + i * 20, 272, 6, { fill: this.completedApps.has(i) ? colors.success : colors.border });
    });
    r.text(170, 275, `${this.completedApps.size}/4`, { fill: colors.textSecondary, fontSize: 11 });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'next', label: 'Take the Quiz', variant: 'primary' });
    }

    r.setCoachMessage('Explore all 4 applications to continue.');
  }

  private renderTest(r: CommandRenderer): void {
    r.setHeader('Knowledge Check', `Question ${Math.min(this.testAnswers.findIndex(a => a === -1) + 1, 10)} of 10`);

    if (!this.showTestResults) {
      let currentQ = this.testAnswers.findIndex(a => a === -1);
      if (currentQ === -1) currentQ = 9;

      const q = this.testQuestions[currentQ];

      // Scenario
      r.rect(30, 35, this.width - 60, 35, { fill: colors.panelDark, rx: 8 });
      r.text(45, 57, q.scenario.substring(0, 90), { fill: colors.primary, fontSize: 10, fontStyle: 'italic' });

      // Question
      r.text(30, 90, `${currentQ + 1}. ${q.question}`, { fill: colors.text, fontSize: 12, fontWeight: 'bold' });

      // Options
      q.options.forEach((opt, i) => {
        const y = 105 + i * 40;
        const isSelected = this.testAnswers[currentQ] === i;

        r.rect(30, y, this.width - 60, 34, {
          fill: isSelected ? colors.primary + '40' : colors.panel,
          stroke: isSelected ? colors.primary : 'transparent',
          strokeWidth: 2,
          rx: 8
        });
        r.text(50, y + 22, opt, { fill: colors.text, fontSize: 11 });

        r.addButton({ id: `test_q${currentQ}_a${i}`, label: `Option ${i + 1}`, variant: 'secondary' });
      });

      // Progress dots
      const dotsY = 280;
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

      r.text(this.width / 2, 70, passed ? 'Excellent!' : 'Keep Learning', {
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
    r.setHeader('Congratulations!', 'Elasticity Master');

    const cx = this.width / 2;

    // Badge
    r.circle(cx, 90, 45, { fill: colors.primary + '30', stroke: colors.primary, strokeWidth: 3 });
    r.text(cx, 82, '🏆', { fill: colors.text, fontSize: 36, textAnchor: 'middle' });

    r.text(cx, 155, 'Elasticity Master!', {
      fill: colors.text,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(cx, 180, "You've mastered Hooke's Law and elastic limits!", {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle'
    });

    // Achievements
    const achievements = [
      { icon: '🔩', label: 'Spring Expert' },
      { icon: '📐', label: 'F = kx Master' },
      { icon: '⚡', label: 'Energy Guru' }
    ];

    achievements.forEach((a, i) => {
      const x = 120 + i * 160;
      r.rect(x, 200, 130, 50, { fill: colors.panel, rx: 8 });
      r.text(x + 65, 222, a.icon, { fill: colors.text, fontSize: 18, textAnchor: 'middle' });
      r.text(x + 65, 242, a.label, { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.rect(150, 270, this.width - 300, 40, { fill: colors.panelDark, rx: 8 });
    r.text(cx, 295, 'Key Formula Mastered: F = kx', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.setCoachMessage('Amazing work mastering the physics of springs!');
    r.addButton({ id: 'back_to_start', label: 'Explore Again', variant: 'secondary' });
  }

  private drawSpring(r: CommandRenderer, x: number, baseY: number, length: number, color: string): void {
    const coils = 10;
    const coilHeight = length / coils;
    const amplitude = 15;

    let path = `M${x} ${baseY}`;
    for (let i = 0; i < coils; i++) {
      const y1 = baseY + i * coilHeight + coilHeight * 0.25;
      const y2 = baseY + i * coilHeight + coilHeight * 0.5;
      const y3 = baseY + i * coilHeight + coilHeight * 0.75;
      const y4 = baseY + (i + 1) * coilHeight;
      path += ` Q${x + amplitude} ${y1} ${x} ${y2}`;
      path += ` Q${x - amplitude} ${y3} ${x} ${y4}`;
    }

    r.path(path, { stroke: color, strokeWidth: 3 });
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      springConstant: this.springConstant,
      appliedForce: this.appliedForce,
      isOscillating: this.isOscillating,
      showForceArrows: this.showForceArrows,
      time: this.time,
      selectedPrediction: this.selectedPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      twistPrediction: this.twistPrediction,
      showTwistFeedback: this.showTwistFeedback,
      activeAppTab: this.activeAppTab,
      completedApps: Array.from(this.completedApps),
      testAnswers: this.testAnswers,
      showTestResults: this.showTestResults
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as Phase;
    if (state.springConstant !== undefined) this.springConstant = state.springConstant as number;
    if (state.appliedForce !== undefined) this.appliedForce = state.appliedForce as number;
    if (state.isOscillating !== undefined) this.isOscillating = state.isOscillating as boolean;
    if (state.showForceArrows !== undefined) this.showForceArrows = state.showForceArrows as boolean;
    if (state.time !== undefined) this.time = state.time as number;
    if (state.selectedPrediction !== undefined) this.selectedPrediction = state.selectedPrediction as string | null;
    if (state.showPredictionFeedback !== undefined) this.showPredictionFeedback = state.showPredictionFeedback as boolean;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.showTwistFeedback !== undefined) this.showTwistFeedback = state.showTwistFeedback as boolean;
    if (state.activeAppTab !== undefined) this.activeAppTab = state.activeAppTab as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
  }
}

// Factory function
export function createHookesLawGame(sessionId: string, config?: SessionConfig): HookesLawGame {
  return new HookesLawGame(sessionId, config);
}
