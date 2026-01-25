/**
 * Damped Oscillations Game - Server-side Implementation
 *
 * Physics: m(d²x/dt²) + c(dx/dt) + kx = 0
 * Damping ratio: ζ = c / (2√(mk))
 * Underdamped (ζ<1): oscillates with decay
 * Critically damped (ζ=1): fastest return without oscillation
 * Overdamped (ζ>1): slow return without oscillation
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
  howItWorks: string;
  stats: { value: string; label: string }[];
  examples: string[];
  color: string;
}

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PHASES: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

const colors = {
  bg: '#0a0f1a',
  text: '#ffffff',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  primary: '#06b6d4',
  primaryDark: '#0891b2',
  secondary: '#3b82f6',
  accent: '#f59e0b',
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  panel: '#1e293b',
  panelDark: '#0f172a',
  border: '#334155',
  criticalDamping: '#22c55e',
  underDamping: '#06b6d4',
  overDamping: '#f59e0b',
};

export class DampedOscillationsGame extends BaseGame {
  readonly gameType = 'damped_oscillations';
  readonly gameTitle = 'Damped Oscillations';

  private phase: Phase = 'hook';
  private frameCount = 0;
  private width = 700;
  private height = 350;

  // Animation state
  private dampingRatio = 0.2; // ζ
  private displacement = 100;
  private isAnimating = false;
  private time = 0;
  private regime: 'under' | 'critical' | 'over' = 'under';

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
      scenario: "A car drives over a speed bump, compressing its suspension springs.",
      question: "What type of damping do car suspensions typically use?",
      options: [
        "No damping - to feel every bump",
        "Underdamped - for a slightly bouncy ride",
        "Critically damped - returns quickly without bouncing",
        "Overdamped - for maximum stability"
      ],
      correctIndex: 2,
      explanation: "Car suspensions are designed to be critically damped (or slightly underdamped for sportier feel). Critical damping returns the car to equilibrium fastest without oscillating."
    },
    {
      scenario: "You pull down on a mass attached to a spring and release it in a system with ζ = 0.3.",
      question: "How will the mass behave after release?",
      options: [
        "Return directly to equilibrium without oscillating",
        "Oscillate with decreasing amplitude until it stops",
        "Oscillate forever with constant amplitude",
        "Move extremely slowly toward equilibrium"
      ],
      correctIndex: 1,
      explanation: "With ζ = 0.3 (less than 1), the system is underdamped. The mass oscillates back and forth with exponentially decreasing amplitude due to energy loss through damping."
    },
    {
      scenario: "An engineer designs a door closer with a very high damping coefficient.",
      question: "With ζ = 3, how will the door behave?",
      options: [
        "Slam shut quickly",
        "Oscillate back and forth before closing",
        "Close very slowly without oscillating",
        "Stay exactly where you leave it"
      ],
      correctIndex: 2,
      explanation: "With ζ = 3 (overdamped), the door returns to closed position without oscillating, but very slowly. The high damping resists motion."
    },
    {
      scenario: "A seismometer must stop oscillating quickly after detecting an earthquake.",
      question: "Which damping ratio allows the instrument to settle fastest?",
      options: [
        "ζ = 0.1 (very underdamped)",
        "ζ = 0.5 (moderately underdamped)",
        "ζ = 1.0 (critically damped)",
        "ζ = 5.0 (heavily overdamped)"
      ],
      correctIndex: 2,
      explanation: "Critical damping (ζ = 1) is the 'sweet spot' that returns to equilibrium in the minimum possible time without any overshoot."
    },
    {
      scenario: "In the equation m(d²x/dt²) + c(dx/dt) + kx = 0, you increase the damping coefficient c.",
      question: "What happens to the damping ratio ζ?",
      options: [
        "It decreases",
        "It stays the same",
        "It increases",
        "It becomes negative"
      ],
      correctIndex: 2,
      explanation: "The damping ratio ζ = c / (2√(mk)). Since c is in the numerator, increasing c directly increases ζ."
    },
    {
      scenario: "A grandfather clock pendulum swings in air with very light damping.",
      question: "Why does the pendulum eventually stop if not wound?",
      options: [
        "Air resistance removes energy each swing (underdamped decay)",
        "Gravity pulls it to rest",
        "The spring wears out",
        "It runs out of momentum"
      ],
      correctIndex: 0,
      explanation: "Air resistance acts as light damping (ζ << 1), slowly removing energy each oscillation. The amplitude decreases exponentially until the pendulum stops."
    },
    {
      scenario: "A diving board vibrates after a diver jumps off.",
      question: "The board oscillates several times before stopping. This indicates:",
      options: [
        "The board is critically damped",
        "The board is overdamped",
        "The board is underdamped",
        "The board has no damping"
      ],
      correctIndex: 2,
      explanation: "Multiple oscillations with decreasing amplitude is the signature of an underdamped system (ζ < 1)."
    },
    {
      scenario: "An analog meter needle moves to show a new reading.",
      question: "Why do quality meters have ζ ≈ 0.7 rather than ζ = 1?",
      options: [
        "To make readings more dramatic",
        "One small overshoot helps the eye track the final position",
        "Critical damping is too expensive",
        "They couldn't achieve critical damping"
      ],
      correctIndex: 1,
      explanation: "Slightly underdamped response (ζ ≈ 0.7) creates one small overshoot that helps users identify exactly where the needle settles."
    },
    {
      scenario: "You're designing a building's earthquake dampers in a seismic zone.",
      question: "What happens if you accidentally make them overdamped?",
      options: [
        "The building responds too slowly to ground motion",
        "The building oscillates dangerously",
        "The dampers work perfectly",
        "The building becomes more rigid"
      ],
      correctIndex: 0,
      explanation: "Overdamped systems respond slowly. During an earthquake, if dampers are overdamped, the building can't dissipate energy fast enough."
    },
    {
      scenario: "A smartphone screen protector absorbs impact when you drop your phone.",
      question: "The protector works by providing:",
      options: [
        "More mass to slow the fall",
        "Damping to absorb and dissipate impact energy",
        "Spring force to bounce the phone",
        "Friction against your hand"
      ],
      correctIndex: 1,
      explanation: "Screen protectors provide damping that converts impact kinetic energy into heat, reducing the peak force transmitted to the screen."
    }
  ];

  private readonly transferApps: TransferApp[] = [
    {
      title: "Automotive Suspension Systems",
      short: "Car Suspension",
      tagline: "Turning bumpy roads into smooth rides",
      description: "Every car relies on damped oscillation principles to provide a comfortable, controlled ride over uneven surfaces.",
      connection: "Car shock absorbers are carefully tuned dampers that work with springs to dissipate road vibration energy.",
      howItWorks: "When a wheel hits a bump, the spring compresses storing energy. The shock absorber (damper) converts this energy to heat through fluid friction. The system is designed near critical damping.",
      stats: [
        { value: "~0.7-1.0", label: "Damping ratio" },
        { value: "200-400", label: "N·s/m typical" },
        { value: "1-2 sec", label: "Settling time" },
        { value: "85%", label: "Energy absorbed" }
      ],
      examples: ["MacPherson struts", "Double-wishbone suspension", "Air suspension systems"],
      color: colors.secondary
    },
    {
      title: "Building Earthquake Dampers",
      short: "Seismic Dampers",
      tagline: "Protecting skyscrapers from seismic destruction",
      description: "Tall buildings use massive damping systems to absorb earthquake energy and prevent structural damage.",
      connection: "Buildings are essentially giant mass-spring-damper systems. Earthquake dampers add controlled energy dissipation.",
      howItWorks: "Tuned Mass Dampers (TMDs) are huge masses suspended in buildings. When the building sways, the mass moves opposite, providing damping. Viscous dampers between floors also dissipate energy.",
      stats: [
        { value: "300-700", label: "Tons (TMD)" },
        { value: "10-40%", label: "Sway reduction" },
        { value: "$1-5M", label: "System cost" },
        { value: "~0.8-1.0", label: "Target ζ" }
      ],
      examples: ["Taipei 101's 730-ton pendulum", "Shanghai Tower damper", "Yokohama active damper"],
      color: colors.accent
    },
    {
      title: "Smartphone Accelerometers",
      short: "MEMS Sensors",
      tagline: "Sensing motion in microscopic springs",
      description: "Every smartphone contains tiny damped oscillators that detect motion, orientation, and acceleration.",
      connection: "MEMS accelerometers use microscopic mass-spring-damper systems to measure acceleration forces.",
      howItWorks: "A tiny proof mass is suspended by silicon springs. When you move the phone, the mass deflects. Capacitive plates measure this displacement. Squeeze-film air damping provides near-critical damping.",
      stats: [
        { value: "~100 μm", label: "Proof mass size" },
        { value: "0.5-0.8", label: "Damping ratio" },
        { value: "±16g", label: "Range" },
        { value: "1-10 kHz", label: "Bandwidth" }
      ],
      examples: ["Screen rotation", "Step counting", "Airbag sensors", "Drone stabilization"],
      color: colors.success
    },
    {
      title: "Precision Instrument Movements",
      short: "Meter Damping",
      tagline: "Making needles settle where you need them",
      description: "Analog meters, scales, and gauges use carefully calibrated damping to display readings quickly and accurately.",
      connection: "The meter needle is a torsional oscillator. Damping ensures it settles on the correct reading without bouncing.",
      howItWorks: "Analog meters use air damping, fluid damping (silicone oil), or eddy current damping. The damping is tuned to ζ ≈ 0.6-0.8 for optimal response.",
      stats: [
        { value: "0.6-0.8", label: "Optimal ζ" },
        { value: "0.5-2 sec", label: "Settling time" },
        { value: "1-5%", label: "Overshoot" },
        { value: "Class 0.5", label: "Accuracy" }
      ],
      examples: ["Analog multimeters", "Laboratory balances", "Pressure gauges", "Speedometers"],
      color: colors.primary
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
    // Animation is handled in render()
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
    if (id === 'release_mass') {
      this.time = 0;
      this.displacement = 100;
      this.isAnimating = true;
      return;
    }

    if (id === 'stop_animation') {
      this.isAnimating = false;
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
    if (id === 'damping_ratio') {
      this.dampingRatio = value;
      this.updateRegime();
    }
  }

  private handleToggleChange(_id: string, _value: boolean): void {
    // No toggles in this game
  }

  private updateRegime(): void {
    if (this.dampingRatio < 0.95) {
      this.regime = 'under';
    } else if (this.dampingRatio > 1.05) {
      this.regime = 'over';
    } else {
      this.regime = 'critical';
    }
  }

  private advancePhase(): void {
    const currentIndex = PHASES.indexOf(this.phase);
    if (currentIndex < PHASES.length - 1) {
      this.phase = PHASES[currentIndex + 1];
    }
  }

  private resetGameState(): void {
    this.dampingRatio = 0.2;
    this.displacement = 100;
    this.isAnimating = false;
    this.time = 0;
    this.regime = 'under';
    this.selectedPrediction = null;
    this.showPredictionFeedback = false;
    this.twistPrediction = null;
    this.showTwistFeedback = false;
    this.activeAppTab = 0;
    this.completedApps.clear();
    this.testAnswers = Array(10).fill(-1);
    this.showTestResults = false;
  }

  private calculateDisplacement(t: number, zeta: number, x0: number): number {
    const omega_n = 2; // Natural frequency

    if (zeta < 1) {
      // Underdamped
      const omega_d = omega_n * Math.sqrt(1 - zeta * zeta);
      return x0 * Math.exp(-zeta * omega_n * t) * Math.cos(omega_d * t);
    } else if (zeta === 1 || Math.abs(zeta - 1) < 0.05) {
      // Critically damped
      return x0 * (1 + omega_n * t) * Math.exp(-omega_n * t);
    } else {
      // Overdamped
      const s1 = -omega_n * (zeta - Math.sqrt(zeta * zeta - 1));
      const s2 = -omega_n * (zeta + Math.sqrt(zeta * zeta - 1));
      const A = x0 * s2 / (s2 - s1);
      const B = -x0 * s1 / (s2 - s1);
      return A * Math.exp(s1 * t) + B * Math.exp(s2 * t);
    }
  }

  private getTestScore(): number {
    return this.testAnswers.reduce((score, answer, index) => {
      return score + (answer === this.testQuestions[index].correctIndex ? 1 : 0);
    }, 0);
  }

  render(): GameFrame {
    if (this.isAnimating) {
      this.time += 0.05;
      this.displacement = this.calculateDisplacement(this.time, this.dampingRatio, 100);

      // Stop when settled
      if (Math.abs(this.displacement) < 1 && this.time > 2) {
        this.isAnimating = false;
      }
      if (this.time > 15) {
        this.isAnimating = false;
      }
    }

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
    r.setHeader('Damped Oscillations', 'Why don\'t car rides feel like trampolines?');

    const cx = this.width / 2;

    // Car and suspension visualization
    const carY = 80;

    // Road
    r.rect(0, carY + 90, this.width, 40, { fill: '#374151' });
    r.rect(0, carY + 90, this.width, 4, { fill: colors.accent });

    // Speed bump
    r.ellipse(cx, carY + 90, 40, 15, { fill: '#4b5563' });

    // Car body
    const carX = cx - 60;
    r.rect(carX, carY + 30, 120, 45, { fill: colors.secondary, rx: 8 });
    r.rect(carX + 20, carY + 5, 80, 35, { fill: '#60a5fa', rx: 6 });

    // Windows
    r.rect(carX + 25, carY + 10, 30, 22, { fill: '#bfdbfe', rx: 3 });
    r.rect(carX + 60, carY + 10, 30, 22, { fill: '#bfdbfe', rx: 3 });

    // Wheels
    r.circle(carX + 25, carY + 75, 18, { fill: '#1f2937' });
    r.circle(carX + 25, carY + 75, 10, { fill: colors.textMuted });
    r.circle(carX + 95, carY + 75, 18, { fill: '#1f2937' });
    r.circle(carX + 95, carY + 75, 10, { fill: colors.textMuted });

    // Suspension springs (animated wiggle)
    const wiggle = Math.sin(this.frameCount * 0.1) * 3;
    const springPath1 = `M${carX + 25} ${carY + 55} Q${carX + 15 + wiggle} ${carY + 65}, ${carX + 25} ${carY + 70}`;
    const springPath2 = `M${carX + 95} ${carY + 55} Q${carX + 105 + wiggle} ${carY + 65}, ${carX + 95} ${carY + 70}`;
    r.path(springPath1, { stroke: colors.accent, strokeWidth: 3 });
    r.path(springPath2, { stroke: colors.accent, strokeWidth: 3 });

    // Text content
    r.text(cx, 200, 'Springs compress when you hit bumps,', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle'
    });
    r.text(cx, 220, 'but why doesn\'t your car keep bouncing?', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle'
    });

    r.text(cx, 260, 'What invisible force turns oscillation into smooth motion?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.setCoachMessage('Springs store energy, but something must dissipate it. Click Continue to discover the physics of damping!');
    r.addButton({ id: 'next', label: 'Discover the Physics', variant: 'primary' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.setHeader('Make Your Prediction', 'What stops the oscillation?');

    r.text(this.width / 2, 40, 'You pull a mass down on a spring and release it.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle'
    });
    r.text(this.width / 2, 60, 'After a few bounces, it stops. What mechanism removes energy?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const options = [
      { id: 'A', text: 'Gravity eventually overcomes spring force' },
      { id: 'B', text: 'Damping forces convert energy to heat' },
      { id: 'C', text: 'The spring loses elasticity over time' },
      { id: 'D', text: 'Air pressure pushes mass to equilibrium' }
    ];

    const startY = 90;
    options.forEach((opt, i) => {
      const y = startY + i * 45;
      const isSelected = this.selectedPrediction === opt.id;
      const isCorrect = opt.id === 'B';

      let bgColor = colors.panel;
      if (this.showPredictionFeedback) {
        if (isSelected && isCorrect) bgColor = '#166534';
        else if (isSelected && !isCorrect) bgColor = '#991b1b';
        else if (isCorrect) bgColor = '#166534';
      }

      r.rect(50, y, this.width - 100, 38, { fill: bgColor, rx: 8 });
      r.text(70, y + 24, `${opt.id}.`, { fill: colors.text, fontSize: 14, fontWeight: 'bold' });
      r.text(95, y + 24, opt.text, { fill: colors.text, fontSize: 13 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `pred_${opt.id}`, label: opt.id, variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.rect(50, 280, this.width - 100, 50, { fill: colors.panelDark, rx: 8 });
      r.text(this.width / 2, 305, 'Correct! Damping is the key to stopping oscillations!', {
        fill: colors.success,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });
      r.text(this.width / 2, 322, 'Dampers convert kinetic energy to heat through friction.', {
        fill: colors.textSecondary,
        fontSize: 12,
        textAnchor: 'middle'
      });
      r.addButton({ id: 'next', label: 'Explore the Physics', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.setHeader('Damped Oscillation Lab', 'Explore the three damping regimes');

    // Visualization area
    const vizX = 20;
    const vizW = this.width - 200;
    const vizH = 180;

    // Ceiling
    r.rect(vizX, 30, vizW, 20, { fill: '#374151' });

    // Spring
    const springX = vizX + vizW / 2;
    const massY = 100 - this.displacement * 0.4;
    const springHeight = massY - 50;

    // Draw spring coils
    let springPath = `M${springX} 50`;
    const coils = 8;
    for (let i = 0; i < coils; i++) {
      const y1 = 50 + (i + 0.5) * (springHeight / coils);
      const x1 = springX + (i % 2 === 0 ? 15 : -15);
      const y2 = 50 + (i + 1) * (springHeight / coils);
      springPath += ` Q${x1} ${y1}, ${springX} ${y2}`;
    }
    r.path(springPath, { stroke: colors.accent, strokeWidth: 3 });

    // Damper cylinder
    const damperX = springX + 40;
    r.rect(damperX - 8, 50, 16, springHeight - 20, { fill: colors.textMuted });
    r.rect(damperX - 12, massY - 25, 24, 15, { fill: colors.textSecondary });

    // Mass block
    const regimeColor = this.regime === 'under' ? colors.underDamping :
                        this.regime === 'critical' ? colors.criticalDamping : colors.overDamping;
    r.rect(springX - 30, massY, 60, 40, { fill: regimeColor, rx: 5 });
    r.text(springX, massY + 25, this.displacement.toFixed(0), {
      fill: colors.text,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Equilibrium line
    r.line(vizX + 50, 100, vizX + vizW - 50, 100, { stroke: colors.textMuted, strokeWidth: 1 });
    r.text(vizX + vizW - 40, 104, 'Eq.', { fill: colors.textMuted, fontSize: 10 });

    // Mini graph
    const graphX = this.width - 160;
    const graphY = 30;
    const graphW = 140;
    const graphH = 100;

    r.rect(graphX, graphY, graphW, graphH, { fill: colors.panelDark, rx: 5 });
    r.line(graphX + 10, graphY + graphH / 2, graphX + graphW - 10, graphY + graphH / 2, { stroke: colors.border, strokeWidth: 1 });

    // Draw regime-specific curve
    let curvePath: string;
    if (this.regime === 'under') {
      curvePath = `M${graphX + 10} ${graphY + 20} Q${graphX + 30} ${graphY + 80}, ${graphX + 50} ${graphY + 30} Q${graphX + 70} ${graphY + 60}, ${graphX + 90} ${graphY + 45} Q${graphX + 110} ${graphY + 55}, ${graphX + 130} ${graphY + 50}`;
    } else if (this.regime === 'critical') {
      curvePath = `M${graphX + 10} ${graphY + 20} Q${graphX + 60} ${graphY + 40}, ${graphX + 100} ${graphY + 48} L${graphX + 130} ${graphY + 50}`;
    } else {
      curvePath = `M${graphX + 10} ${graphY + 20} Q${graphX + 50} ${graphY + 30}, ${graphX + 90} ${graphY + 42} L${graphX + 130} ${graphY + 48}`;
    }
    r.path(curvePath, { stroke: regimeColor, strokeWidth: 2 });

    r.text(graphX + graphW / 2, graphY + graphH + 15, 'Time →', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Info panel
    const regimeLabel = this.regime === 'under' ? 'Underdamped' :
                        this.regime === 'critical' ? 'Critically Damped' : 'Overdamped';

    r.rect(20, 220, this.width - 40, 60, { fill: colors.panel, rx: 8 });
    r.text(40, 245, `ζ = ${this.dampingRatio.toFixed(2)}`, {
      fill: regimeColor,
      fontSize: 16,
      fontWeight: 'bold'
    });
    r.text(120, 245, regimeLabel, { fill: regimeColor, fontSize: 14 });
    r.text(40, 265, `Time: ${this.time.toFixed(1)}s`, { fill: colors.textSecondary, fontSize: 12 });

    // Regime descriptions
    const descY = 290;
    const regimes = [
      { label: 'ζ < 1', name: 'Under', desc: 'Oscillates', color: colors.underDamping },
      { label: 'ζ = 1', name: 'Critical', desc: 'Fastest', color: colors.criticalDamping },
      { label: 'ζ > 1', name: 'Over', desc: 'Sluggish', color: colors.overDamping }
    ];

    regimes.forEach((reg, i) => {
      const x = 50 + i * (this.width - 100) / 3;
      const isActive = (reg.name === 'Under' && this.regime === 'under') ||
                       (reg.name === 'Critical' && this.regime === 'critical') ||
                       (reg.name === 'Over' && this.regime === 'over');

      r.rect(x, descY, 140, 35, {
        fill: isActive ? reg.color + '30' : colors.panelDark,
        stroke: isActive ? reg.color : 'transparent',
        strokeWidth: 2,
        rx: 5
      });
      r.text(x + 10, descY + 15, reg.label, { fill: reg.color, fontSize: 11, fontWeight: 'bold' });
      r.text(x + 70, descY + 15, reg.desc, { fill: colors.textSecondary, fontSize: 10 });
    });

    // Controls
    r.addSlider({ id: 'damping_ratio', label: 'Damping Ratio (ζ)', value: this.dampingRatio, min: 0.05, max: 2.0, step: 0.05 });

    if (this.isAnimating) {
      r.addButton({ id: 'stop_animation', label: 'Stop', variant: 'secondary' });
    } else {
      r.addButton({ id: 'release_mass', label: 'Release Mass', variant: 'primary' });
    }
    r.addButton({ id: 'next', label: 'Continue', variant: 'success' });

    r.setCoachMessage('Adjust ζ to see different damping behaviors. Critical damping (ζ=1) returns fastest without oscillating!');
  }

  private renderReview(r: CommandRenderer): void {
    r.setHeader('Understanding Damped Oscillations', 'The physics of energy dissipation');

    const cardW = (this.width - 80) / 2;
    const cardH = 130;

    // Governing equation card
    r.rect(30, 40, cardW, cardH, { fill: colors.panel, rx: 10 });
    r.text(30 + cardW / 2, 65, 'The Governing Equation', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.rect(40, 80, cardW - 20, 30, { fill: colors.panelDark, rx: 5 });
    r.text(30 + cardW / 2, 100, 'm(d²x/dt²) + c(dx/dt) + kx = 0', {
      fill: colors.text,
      fontSize: 12,
      textAnchor: 'middle'
    });
    r.text(45, 130, 'm = mass, c = damping, k = spring', {
      fill: colors.textSecondary,
      fontSize: 10
    });
    r.text(45, 145, 'Damping term opposes velocity', {
      fill: colors.textMuted,
      fontSize: 10
    });

    // Damping ratio card
    r.rect(50 + cardW, 40, cardW, cardH, { fill: colors.panel, rx: 10 });
    r.text(50 + cardW + cardW / 2, 65, 'The Damping Ratio', {
      fill: colors.success,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.rect(60 + cardW, 80, cardW - 20, 30, { fill: colors.panelDark, rx: 5 });
    r.text(50 + cardW + cardW / 2, 100, 'ζ = c / (2√(mk))', {
      fill: colors.text,
      fontSize: 12,
      textAnchor: 'middle'
    });
    r.text(65 + cardW, 130, 'ζ<1: Underdamped (oscillates)', { fill: colors.underDamping, fontSize: 10 });
    r.text(65 + cardW, 145, 'ζ=1: Critical (fastest)', { fill: colors.criticalDamping, fontSize: 10 });
    r.text(65 + cardW, 160, 'ζ>1: Overdamped (sluggish)', { fill: colors.overDamping, fontSize: 10 });

    // Energy dissipation card
    r.rect(30, 180, this.width - 60, 90, { fill: colors.panel, rx: 10 });
    r.text(this.width / 2, 205, 'Energy Dissipation', {
      fill: '#ec4899',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(50, 230, 'Without damping: Energy oscillates between kinetic (½mv²) and potential (½kx²)', {
      fill: colors.textSecondary,
      fontSize: 11
    });
    r.text(50, 250, 'With damping: Power dissipated = c × v² → converted to heat', {
      fill: colors.primary,
      fontSize: 11
    });

    r.setCoachMessage('The damping ratio ζ is the key parameter that determines system behavior!');
    r.addButton({ id: 'next', label: 'Discover a Twist', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.setHeader('The Twist Challenge', 'Why not always use critical damping?');

    r.text(this.width / 2, 50, 'You\'re designing a precision voltmeter needle.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle'
    });
    r.text(this.width / 2, 75, 'Why do engineers often choose ζ ≈ 0.7 instead of exactly ζ = 1?', {
      fill: '#a855f7',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const options = [
      { id: 'A', text: 'Critical damping is too expensive to achieve' },
      { id: 'B', text: 'Underdamping allows needle to move faster' },
      { id: 'C', text: 'Slight overshoot helps eye track final position' },
      { id: 'D', text: 'Overdamping looks more professional' }
    ];

    const startY = 100;
    options.forEach((opt, i) => {
      const y = startY + i * 45;
      const isSelected = this.twistPrediction === opt.id;
      const isCorrect = opt.id === 'C';

      let bgColor = colors.panel;
      if (this.showTwistFeedback) {
        if (isSelected && isCorrect) bgColor = '#166534';
        else if (isSelected && !isCorrect) bgColor = '#991b1b';
        else if (isCorrect) bgColor = '#166534';
      }

      r.rect(50, y, this.width - 100, 38, { fill: bgColor, rx: 8 });
      r.text(70, y + 24, `${opt.id}.`, { fill: colors.text, fontSize: 14, fontWeight: 'bold' });
      r.text(95, y + 24, opt.text, { fill: colors.text, fontSize: 13 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `twist_pred_${opt.id}`, label: opt.id, variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.rect(50, 285, this.width - 100, 50, { fill: colors.panelDark, rx: 8 });
      r.text(this.width / 2, 305, 'The slight overshoot is actually useful!', {
        fill: colors.success,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });
      r.text(this.width / 2, 325, 'Human perception benefits from seeing where the needle settles.', {
        fill: colors.textSecondary,
        fontSize: 12,
        textAnchor: 'middle'
      });
      r.addButton({ id: 'next', label: 'See the Difference', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.setHeader('Optimal vs. Critical Damping', 'The 4% overshoot rule');

    const graphW = (this.width - 80) / 2;
    const graphH = 120;
    const graphY = 50;

    // Critical damping graph
    r.text(40 + graphW / 2, graphY - 10, 'Critical Damping (ζ = 1)', {
      fill: colors.criticalDamping,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.rect(30, graphY, graphW, graphH, { fill: colors.panelDark, rx: 8 });

    // Target line
    r.line(40, graphY + 30, 30 + graphW - 10, graphY + 30, { stroke: colors.criticalDamping, strokeWidth: 1 });

    // Critical response curve
    r.path(`M40 ${graphY + 100} Q${40 + graphW * 0.4} ${graphY + 50}, ${40 + graphW * 0.7} ${graphY + 35} L${30 + graphW - 10} ${graphY + 32}`, {
      stroke: colors.criticalDamping,
      strokeWidth: 2
    });
    r.text(40 + graphW / 2, graphY + graphH + 15, 'Approaches smoothly', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Optimal damping graph
    const graph2X = 50 + graphW;
    r.text(graph2X + graphW / 2, graphY - 10, 'Optimal Damping (ζ ≈ 0.7)', {
      fill: colors.primary,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.rect(graph2X, graphY, graphW, graphH, { fill: colors.panelDark, rx: 8 });

    // Target line
    r.line(graph2X + 10, graphY + 30, graph2X + graphW - 10, graphY + 30, { stroke: colors.primary, strokeWidth: 1 });

    // Optimal response curve with overshoot
    r.path(`M${graph2X + 10} ${graphY + 100} Q${graph2X + graphW * 0.3} ${graphY + 35}, ${graph2X + graphW * 0.45} ${graphY + 22} Q${graph2X + graphW * 0.6} ${graphY + 20}, ${graph2X + graphW * 0.7} ${graphY + 28} Q${graph2X + graphW * 0.85} ${graphY + 32}, ${graph2X + graphW - 10} ${graphY + 30}`, {
      stroke: colors.primary,
      strokeWidth: 2
    });

    // Overshoot marker
    r.circle(graph2X + graphW * 0.5, graphY + 22, 4, { fill: colors.accent });
    r.text(graph2X + graphW * 0.5, graphY + 12, 'Overshoot!', { fill: colors.accent, fontSize: 9, textAnchor: 'middle' });
    r.text(graph2X + graphW / 2, graphY + graphH + 15, 'Eye tracks final position', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Explanation box
    r.rect(30, 200, this.width - 60, 100, { fill: colors.panel, rx: 10 });
    r.text(this.width / 2, 225, 'The 4% Overshoot Rule:', {
      fill: '#a855f7',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const bullets = [
      '• At ζ ≈ 0.7, overshoot is about 4-5% of the step change',
      '• Small enough not to mislead, but visible enough to help',
      '• Rise time is actually faster than critical damping!'
    ];
    bullets.forEach((text, i) => {
      r.text(50, 250 + i * 18, text, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.setCoachMessage('"Optimal" depends on the application - for humans watching needles, slight underdamping is preferred!');
    r.addButton({ id: 'next', label: 'Continue', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.setHeader('Key Discovery', 'Context determines optimal damping');

    r.rect(30, 40, this.width - 60, 240, { fill: colors.panel, rx: 12 });

    r.text(this.width / 2, 70, 'Context Determines "Optimal" Damping!', {
      fill: '#a855f7',
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Two columns
    const colW = (this.width - 100) / 2;

    // Critical damping column
    r.rect(45, 95, colW, 120, { fill: colors.panelDark, rx: 8 });
    r.text(45 + colW / 2, 115, 'Use Critical (ζ = 1):', {
      fill: colors.criticalDamping,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    const criticalUses = ['Automated control systems', 'Digital sensor readings', 'Robotic positioning', 'Emergency shutoffs'];
    criticalUses.forEach((text, i) => {
      r.text(55, 140 + i * 18, '• ' + text, { fill: colors.textSecondary, fontSize: 10 });
    });

    // Optimal damping column
    r.rect(55 + colW, 95, colW, 120, { fill: colors.panelDark, rx: 8 });
    r.text(55 + colW + colW / 2, 115, 'Use Slight Under (ζ ≈ 0.7):', {
      fill: colors.primary,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    const optimalUses = ['Analog meter needles', 'UI animations', 'Vehicle suspension feel', 'Audio speaker response'];
    optimalUses.forEach((text, i) => {
      r.text(65 + colW, 140 + i * 18, '• ' + text, { fill: colors.textSecondary, fontSize: 10 });
    });

    r.text(this.width / 2, 250, 'Engineering is about choosing the right trade-off!', {
      fill: colors.success,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.setCoachMessage('Now explore real-world applications of damped oscillations!');
    r.addButton({ id: 'next', label: 'Explore Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.setHeader('Real-World Applications', 'Damped oscillations everywhere');

    // Tab buttons area
    const tabY = 35;
    const tabW = (this.width - 60) / 4;
    this.transferApps.forEach((app, i) => {
      const isActive = this.activeAppTab === i;
      const isComplete = this.completedApps.has(i);

      r.rect(30 + i * tabW, tabY, tabW - 5, 30, {
        fill: isActive ? app.color : (isComplete ? colors.success + '40' : colors.panel),
        rx: 5
      });
      r.text(30 + i * tabW + (tabW - 5) / 2, tabY + 20, app.short, {
        fill: isActive ? colors.text : colors.textSecondary,
        fontSize: 10,
        fontWeight: isActive ? 'bold' : 'normal',
        textAnchor: 'middle'
      });

      r.addButton({ id: `app_tab_${i}`, label: app.short, variant: 'secondary' });
    });

    const app = this.transferApps[this.activeAppTab];
    const contentY = 75;

    // Main content card
    r.rect(30, contentY, this.width - 60, 200, { fill: colors.panel, rx: 10 });

    // Title and tagline
    r.text(50, contentY + 25, app.title, { fill: colors.text, fontSize: 14, fontWeight: 'bold' });
    r.text(50, contentY + 45, app.tagline, { fill: app.color, fontSize: 11 });

    // Description
    r.text(50, contentY + 70, app.description.substring(0, 80) + '...', { fill: colors.textSecondary, fontSize: 10 });

    // Physics connection
    r.rect(40, contentY + 85, this.width - 100, 40, { fill: colors.panelDark, rx: 5 });
    r.text(50, contentY + 100, 'Physics: ' + app.connection.substring(0, 70) + '...', {
      fill: colors.primary,
      fontSize: 9
    });

    // Stats
    const statsY = contentY + 135;
    app.stats.slice(0, 4).forEach((stat, i) => {
      const x = 50 + i * (this.width - 120) / 4;
      r.rect(x, statsY, 60, 40, { fill: colors.panelDark, rx: 5 });
      r.text(x + 30, statsY + 18, stat.value, { fill: colors.text, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x + 30, statsY + 32, stat.label, { fill: colors.textMuted, fontSize: 7, textAnchor: 'middle' });
    });

    // Examples
    r.text(50, contentY + 190, 'Examples: ' + app.examples.slice(0, 2).join(', '), {
      fill: colors.textSecondary,
      fontSize: 9
    });

    // Progress indicator
    const progressY = 285;
    r.text(30, progressY, 'Progress:', { fill: colors.textMuted, fontSize: 11 });
    this.transferApps.forEach((_, i) => {
      r.circle(90 + i * 20, progressY - 3, 6, {
        fill: this.completedApps.has(i) ? colors.success : colors.border
      });
    });
    r.text(180, progressY, `${this.completedApps.size}/4`, { fill: colors.textSecondary, fontSize: 11 });

    // Mark complete button
    if (!this.completedApps.has(this.activeAppTab)) {
      r.addButton({ id: `complete_app_${this.activeAppTab}`, label: 'Mark as Understood', variant: 'success' });
    }

    // Continue button when all complete
    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'next', label: 'Take the Test', variant: 'primary' });
    }

    r.setCoachMessage(`Explore all 4 applications and mark them as understood to continue.`);
  }

  private renderTest(r: CommandRenderer): void {
    r.setHeader('Knowledge Assessment', `Question ${Math.min(this.testAnswers.findIndex(a => a === -1) + 1, 10)} of 10`);

    if (!this.showTestResults) {
      // Find first unanswered question
      let currentQ = this.testAnswers.findIndex(a => a === -1);
      if (currentQ === -1) currentQ = 9; // All answered, show last

      const q = this.testQuestions[currentQ];

      // Scenario
      r.rect(30, 35, this.width - 60, 35, { fill: colors.panelDark, rx: 8 });
      r.text(45, 58, q.scenario, { fill: colors.primary, fontSize: 11, fontStyle: 'italic' });

      // Question
      r.text(30, 90, `${currentQ + 1}. ${q.question}`, { fill: colors.text, fontSize: 13, fontWeight: 'bold' });

      // Options
      q.options.forEach((opt, i) => {
        const y = 110 + i * 45;
        const isSelected = this.testAnswers[currentQ] === i;

        r.rect(30, y, this.width - 60, 38, {
          fill: isSelected ? colors.primary + '40' : colors.panel,
          stroke: isSelected ? colors.primary : 'transparent',
          strokeWidth: 2,
          rx: 8
        });
        r.text(50, y + 24, opt, { fill: colors.text, fontSize: 11 });

        r.addButton({ id: `test_q${currentQ}_a${i}`, label: `Option ${i + 1}`, variant: 'secondary' });
      });

      // Progress dots
      const dotsY = 300;
      this.testQuestions.forEach((_, i) => {
        const answered = this.testAnswers[i] !== -1;
        const isCurrent = i === currentQ;
        r.circle(this.width / 2 - 50 + i * 12, dotsY, 4, {
          fill: isCurrent ? colors.primary : (answered ? colors.success : colors.border)
        });
      });

      // Submit button when all answered
      if (!this.testAnswers.includes(-1)) {
        r.addButton({ id: 'submit_test', label: 'Submit Answers', variant: 'success' });
      }
    } else {
      // Results
      const score = this.getTestScore();
      const passed = score >= 7;

      r.text(this.width / 2, 60, passed ? 'Excellent!' : 'Keep Studying', {
        fill: passed ? colors.success : colors.warning,
        fontSize: 24,
        fontWeight: 'bold',
        textAnchor: 'middle'
      });

      r.text(this.width / 2, 95, `Score: ${score}/10`, {
        fill: colors.text,
        fontSize: 18,
        textAnchor: 'middle'
      });

      // Show summary
      r.rect(30, 115, this.width - 60, 150, { fill: colors.panel, rx: 10 });

      // Mini result indicators
      this.testQuestions.forEach((q, i) => {
        const correct = this.testAnswers[i] === q.correctIndex;
        const x = 50 + (i % 5) * 120;
        const y = 135 + Math.floor(i / 5) * 70;

        r.circle(x, y, 8, { fill: correct ? colors.success : colors.error });
        r.text(x + 15, y + 5, `Q${i + 1}`, { fill: colors.textSecondary, fontSize: 10 });
      });

      if (passed) {
        r.addButton({ id: 'next', label: 'Claim Mastery Badge', variant: 'success' });
      } else {
        r.addButton({ id: 'retry_test', label: 'Review & Try Again', variant: 'primary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.setHeader('Congratulations!', 'Damped Oscillations Master');

    const cx = this.width / 2;

    // Badge
    r.circle(cx, 100, 50, { fill: colors.primary + '30', stroke: colors.primary, strokeWidth: 3 });
    r.text(cx, 90, '🎛️', { fill: colors.text, fontSize: 40, textAnchor: 'middle' });

    r.text(cx, 170, 'Damped Oscillations Master!', {
      fill: colors.text,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(cx, 195, 'You\'ve mastered the physics of damped oscillations', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle'
    });

    // Skills grid
    const skills = [
      { icon: '📉', label: 'Damping Ratio' },
      { icon: '⚡', label: 'Energy Dissipation' },
      { icon: '🚗', label: 'Suspension Design' },
      { icon: '🏗️', label: 'Seismic Protection' }
    ];

    skills.forEach((skill, i) => {
      const x = 80 + i * 140;
      const y = 220;
      r.rect(x, y, 120, 50, { fill: colors.panel, rx: 8 });
      r.text(x + 60, y + 22, skill.icon, { fill: colors.text, fontSize: 18, textAnchor: 'middle' });
      r.text(x + 60, y + 42, skill.label, { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    });

    // Key insight
    r.rect(50, 285, this.width - 100, 40, { fill: colors.panelDark, rx: 8 });
    r.text(cx, 310, 'ζ = c/(2√(mk)) determines: oscillate, fast settle, or sluggish', {
      fill: colors.primary,
      fontSize: 11,
      textAnchor: 'middle'
    });

    r.setCoachMessage('Amazing work! You now understand how damping controls oscillating systems.');
    r.addButton({ id: 'back_to_start', label: 'Explore Again', variant: 'secondary' });
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      dampingRatio: this.dampingRatio,
      displacement: this.displacement,
      isAnimating: this.isAnimating,
      time: this.time,
      regime: this.regime,
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
    if (state.dampingRatio !== undefined) this.dampingRatio = state.dampingRatio as number;
    if (state.displacement !== undefined) this.displacement = state.displacement as number;
    if (state.isAnimating !== undefined) this.isAnimating = state.isAnimating as boolean;
    if (state.time !== undefined) this.time = state.time as number;
    if (state.regime) this.regime = state.regime as 'under' | 'critical' | 'over';
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
export function createDampedOscillationsGame(sessionId: string, config?: SessionConfig): DampedOscillationsGame {
  return new DampedOscillationsGame(sessionId, config);
}
