/**
 * Convection Game - Server-side implementation
 *
 * Physics: Heat transfer through fluid motion (Q = hAΔT)
 * Hot fluid rises (less dense), cold fluid sinks (more dense) - creating circulation
 *
 * PROTECTED FORMULAS - Never exposed to client:
 * - Heat transfer: Q = h × A × ΔT
 * - Buoyancy force: F_b = ρ × V × g × β × ΔT
 * - Density variation: ρ(T) = ρ₀ × (1 - β × (T - T₀))
 */

import { BaseGame } from '../../types/GameInstance.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// Phase type for the 10-phase structure
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

// Particle interface for convection simulation
interface Particle {
  id: number;
  x: number;
  y: number;
  temp: number;
  vx: number;
  vy: number;
}

// Test question interface
interface TestQuestion {
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

// Transfer application interface
interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
}

// Colors
const colors = {
  bgDark: '#0a0f1a',
  bgCard: '#1a1f2e',
  bgPanel: '#141824',
  bgCardLight: '#1e293b',
  border: '#2a3040',
  text: '#ffffff',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  primary: '#f97316',
  primaryDark: '#ea580c',
  secondary: '#ef4444',
  accent: '#3b82f6',
  success: '#22c55e',
  warning: '#eab308',
  purple: '#a855f7',
};

// Test questions
const testQuestions: TestQuestion[] = [
  {
    scenario: "You're boiling water for pasta and notice bubbles rising from the bottom.",
    question: "Why do the heated bubbles rise instead of staying at the bottom?",
    options: [
      "The bubbles are pushed up by steam pressure",
      "Heated fluid expands and becomes less dense",
      "Gravity pulls cold water down, pushing hot up",
      "Bubbles are attracted to the surface"
    ],
    correctIndex: 1,
    explanation: "When fluid is heated, it expands and becomes less dense, so buoyancy forces push it upward."
  },
  {
    scenario: "An architect places radiators near the floor instead of near the ceiling.",
    question: "Why is this placement more effective for heating?",
    options: [
      "Heat radiates better from lower positions",
      "Hot air rises, creating circulation throughout the room",
      "Cold air is lighter and stays at the bottom",
      "The floor absorbs and re-radiates heat better"
    ],
    correctIndex: 1,
    explanation: "Hot air from the radiator rises, displacing cooler air at the top, which sinks down to be heated."
  },
  {
    scenario: "Sea breezes blow from ocean to land during day but reverse at night.",
    question: "What causes this daily reversal?",
    options: [
      "Earth's rotation changes the wind pattern",
      "Tides push air back and forth",
      "Land heats/cools faster than water, creating reversing convection",
      "Barometric pressure changes between day and night"
    ],
    correctIndex: 2,
    explanation: "Land heats up faster during the day creating rising air, while at night land cools faster reversing the pattern."
  },
  {
    scenario: "A CPU runs hot at 90°C. Adding a fan dramatically improves cooling.",
    question: "Why does the fan improve cooling if air temperature is the same?",
    options: [
      "The fan creates colder air by compressing it",
      "Forced convection removes heat much faster than natural convection",
      "The fan blocks heat radiation from other components",
      "Moving air has less heat capacity"
    ],
    correctIndex: 1,
    explanation: "A fan dramatically increases the convective heat transfer coefficient (h in Q=hAΔT). Forced convection can be 5-50x more effective."
  },
  {
    scenario: "A convection oven cooks chicken 25% faster than a regular oven at the same temperature.",
    question: "What makes convection ovens cook faster?",
    options: [
      "Convection ovens have stronger heating elements",
      "A fan circulates hot air, improving heat transfer",
      "Convection ovens use microwave energy too",
      "The food cooks from inside out"
    ],
    correctIndex: 1,
    explanation: "The fan eliminates the cool boundary layer around food, bringing fresh hot air to the surface continuously."
  },
  {
    scenario: "The deep ocean circulates in a 'conveyor belt' taking 1,000 years to complete.",
    question: "What drives this global thermohaline circulation?",
    options: [
      "Wind pushing surface water around",
      "The moon's gravitational pull",
      "Temperature and salinity differences creating density variations",
      "Underwater volcanic activity"
    ],
    correctIndex: 2,
    explanation: "Cold salty water (dense) sinks at poles while warm water (less dense) stays at surface near the equator, driving global circulation."
  },
  {
    scenario: "A fan makes you feel cooler but the thermometer shows air at 30°C regardless.",
    question: "Why does the fan provide a cooling sensation?",
    options: [
      "The fan creates a psychological placebo effect",
      "Moving air removes the warm boundary layer and speeds evaporation",
      "The fan motor absorbs heat from the air",
      "Wind chill affects thermometers differently"
    ],
    correctIndex: 1,
    explanation: "The fan removes warm air next to your skin and speeds up sweat evaporation, which absorbs heat from your body."
  },
  {
    scenario: "Earth's mantle slowly circulates despite being mostly solid rock.",
    question: "How can solid rock exhibit convection over millions of years?",
    options: [
      "The rock melts completely due to core heat",
      "Rock under extreme pressure behaves as viscous fluid over long timescales",
      "Earthquakes shake the rock into motion",
      "Underground magma rivers carry the rock"
    ],
    correctIndex: 1,
    explanation: "Under immense pressure, rock flows like an extremely viscous fluid over millions of years, driving plate tectonics."
  },
  {
    scenario: "Data centers use hot/cold aisle separation to improve cooling by 30%.",
    question: "Why does separating hot and cold airflow improve efficiency?",
    options: [
      "It prevents hot air from being recirculated to server intakes",
      "Cold aisles trap cold air due to higher density",
      "Hot aisles radiate heat to the ceiling better",
      "Temperature difference creates stronger natural convection"
    ],
    correctIndex: 0,
    explanation: "Hot/cold aisle containment ensures servers always intake the coldest available air without mixing."
  },
  {
    scenario: "A student notes that doubling ΔT should double heat transfer in Q=hAΔT.",
    question: "What other factors affect convective heat transfer rate?",
    options: [
      "Only the color of the surfaces",
      "Surface area (A) and coefficient (h) which depends on fluid velocity",
      "Only the specific heat capacity of the fluid",
      "Thermal radiation from nearby objects"
    ],
    correctIndex: 1,
    explanation: "Q = hAΔT shows all three factors: temperature difference, surface area, and h which depends on fluid properties and velocity."
  }
];

// Transfer applications
const transferApps: TransferApp[] = [
  {
    icon: "🏠",
    title: "Home HVAC",
    short: "HVAC",
    tagline: "Circulating comfort",
    description: "HVAC systems use forced convection to distribute heated or cooled air throughout buildings efficiently.",
    connection: "Convection transports heat energy via moving fluid rather than slow conduction."
  },
  {
    icon: "🌊",
    title: "Climate Systems",
    short: "Climate",
    tagline: "Planetary convection",
    description: "Earth's climate is driven by massive convection in oceans and atmosphere, distributing heat globally.",
    connection: "The Gulf Stream carries warm water to Europe via convection on a planetary scale."
  },
  {
    icon: "💻",
    title: "Electronics Cooling",
    short: "Cooling",
    tagline: "Keeping CPUs cool",
    description: "Modern CPUs generate over 300W. Convection cooling via heatsinks and fans is essential.",
    connection: "Heatsinks increase surface area (A), fans increase coefficient (h) through forced convection."
  },
  {
    icon: "🍳",
    title: "Cooking",
    short: "Cooking",
    tagline: "Heat for food",
    description: "Convection ovens, fryers, and boiling pots rely on convection to transfer heat to food.",
    connection: "Moving hot fluid replaces the cool boundary layer, dramatically increasing heat transfer."
  }
];

export class ConvectionGame extends BaseGame {
  readonly gameType = 'convection';
  readonly gameTitle = 'Convection';

  private phase: Phase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private testQuestion: number = 0;
  private testAnswers: (number | null)[] = new Array(10).fill(null);
  private testSubmitted: boolean = false;
  private selectedApp: number = 0;
  private completedApps: boolean[] = [false, false, false, false];

  // Simulation state
  private particles: Particle[] = [];
  private heatIntensity: number = 50;
  private isHeating: boolean = true;
  private showFlowLines: boolean = true;
  private fanSpeed: number = 0;
  private animationTime: number = 0;

  private readonly phases: Phase[] = [
    'hook', 'predict', 'play', 'review', 'twist_predict',
    'twist_play', 'twist_review', 'transfer', 'test', 'mastery'
  ];

  private readonly phaseLabels: Record<Phase, string> = {
    hook: 'Hook',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Review',
    twist_predict: 'Twist Predict',
    twist_play: 'Twist Play',
    twist_review: 'Twist Review',
    transfer: 'Transfer',
    test: 'Test',
    mastery: 'Mastery'
  };

  private readonly coachMessages: Record<Phase, string> = {
    hook: 'Heat naturally rises - let\'s explore why!',
    predict: 'What happens when you heat water from below?',
    play: 'Adjust the heat to see convection in action!',
    review: 'Density differences drive the convection cycle.',
    twist_predict: 'A puzzle about forced convection...',
    twist_play: 'See how fans enhance convection!',
    twist_review: 'Forced convection can be 5-50x more efficient!',
    transfer: 'Convection shapes weather, cooling, and more!',
    test: 'Apply what you\'ve learned!',
    mastery: 'Convection mastery achieved!'
  };

  constructor(sessionId: string) {
    super(sessionId);
    this.initializeParticles();
  }

  private initializeParticles(): void {
    this.particles = [];
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        id: i,
        x: 40 + Math.random() * 220,
        y: 40 + Math.random() * 180,
        temp: 0.3 + Math.random() * 0.4,
        vx: 0,
        vy: 0
      });
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

  private handleButtonClick(id: string): void {
    // Navigation
    if (id === 'next') {
      this.goNext();
      return;
    }
    if (id === 'back') {
      this.goBack();
      return;
    }

    // Predictions
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }
    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
      return;
    }

    // Test answers
    if (id.startsWith('answer_')) {
      this.testAnswers[this.testQuestion] = parseInt(id.replace('answer_', ''), 10);
      return;
    }

    // Test navigation
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

    // App tabs
    if (id.startsWith('app_')) {
      const appIndex = parseInt(id.replace('app_', ''), 10);
      this.selectedApp = appIndex;
      this.completedApps[appIndex] = true;
      return;
    }

    // Simulation controls
    if (id === 'reset') {
      this.initializeParticles();
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'heat') {
      this.heatIntensity = value;
    } else if (id === 'fan_speed') {
      this.fanSpeed = value;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'heating') {
      this.isHeating = value;
    } else if (id === 'flow_lines') {
      this.showFlowLines = value;
    }
  }

  private goNext(): void {
    const idx = this.phases.indexOf(this.phase);
    if (idx < this.phases.length - 1) {
      this.phase = this.phases[idx + 1];
      this.emitCoachEvent('phase_started', { phase: this.phase });
    }
  }

  private goBack(): void {
    const idx = this.phases.indexOf(this.phase);
    if (idx > 0) {
      this.phase = this.phases[idx - 1];
    }
  }

  private calculateTestScore(): number {
    let correct = 0;
    for (let i = 0; i < testQuestions.length; i++) {
      if (this.testAnswers[i] === testQuestions[i].correctIndex) {
        correct++;
      }
    }
    return correct;
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    if ((this.phase === 'play' || this.phase === 'twist_play') && this.isHeating) {
      this.updateParticles();
    }
  }

  private updateParticles(): void {
    this.particles = this.particles.map(p => {
      let newX = p.x;
      let newY = p.y;
      let newTemp = p.temp;
      let newVx = p.vx;
      let newVy = p.vy;

      // Heat from bottom
      if (p.y > 200) {
        newTemp = Math.min(1, p.temp + 0.02 * (this.heatIntensity / 50));
      }
      // Cool at top
      if (p.y < 60) {
        newTemp = Math.max(0, p.temp - 0.015);
      }

      // Buoyancy (hot rises, cold sinks)
      const buoyancy = (newTemp - 0.5) * -0.8 * (this.heatIntensity / 50);
      newVy += buoyancy;

      // Fan force
      if (this.fanSpeed > 0) {
        newVx += this.fanSpeed * 0.01;
      }

      // Drag
      newVx *= 0.95;
      newVy *= 0.95;

      // Turbulence
      newVx += (Math.random() - 0.5) * 0.2;
      newVy += (Math.random() - 0.5) * 0.2;

      // Update position
      newX += newVx;
      newY += newVy;

      // Boundaries
      if (newX < 40) { newX = 40; newVx *= -0.5; }
      if (newX > 260) { newX = 260; newVx *= -0.5; }
      if (newY < 40) { newY = 40; newVy *= -0.5; }
      if (newY > 220) { newY = 220; newVy *= -0.5; }

      return { ...p, x: newX, y: newY, temp: newTemp, vx: newVx, vy: newVy };
    });
  }

  private getParticleColor(temp: number): string {
    const r = Math.floor(temp * 255);
    const b = Math.floor((1 - temp) * 255);
    const g = Math.floor(temp * 100);
    return `rgb(${r}, ${g}, ${b})`;
  }

  render(): GameFrame {
    const r = new CommandRenderer(this.viewport.width, this.viewport.height);
    r.reset();
    r.setViewport(700, 400);
    r.clear(colors.bgDark);

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

    this.renderUI(r);
    return r.toFrame(this.nextFrame());
  }

  private renderHook(r: CommandRenderer): void {
    // Title
    r.text(350, 50, 'The Rising Heat Mystery', {
      fill: colors.text,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 80, 'Why does hot water rise while cold water sinks?', {
      fill: colors.textMuted,
      fontSize: 14,
      textAnchor: 'middle'
    });

    // Pot visualization
    const potX = 250;
    const potY = 120;

    // Pot body
    r.ellipse(potX + 100, potY + 100, 80, 15, { fill: '#64748b' });
    r.rect(potX + 20, potY + 30, 160, 70, { fill: '#475569', rx: 5 });
    r.ellipse(potX + 100, potY + 30, 80, 15, { fill: '#64748b' });

    // Water
    r.ellipse(potX + 100, potY + 35, 70, 12, { fill: colors.accent, opacity: 0.6 });

    // Rising bubbles
    for (let i = 0; i < 5; i++) {
      const bubbleY = potY + 80 - ((this.animationTime / 20 + i * 10) % 40);
      r.circle(potX + 50 + i * 25, bubbleY, 3 + (i % 2) * 2, {
        fill: '#ffffff',
        opacity: 0.7
      });
    }

    // Flame
    r.path(`M${potX + 60},${potY + 115} Q${potX + 80},${potY + 100} ${potX + 100},${potY + 115} Q${potX + 120},${potY + 100} ${potX + 140},${potY + 115}`, {
      fill: colors.secondary
    });

    // Info card
    r.rect(150, 260, 400, 60, { fill: colors.bgCard, rx: 12 });
    r.text(350, 290, 'This heat-driven fluid motion is CONVECTION', {
      fill: colors.textMuted,
      fontSize: 13,
      textAnchor: 'middle'
    });
    r.text(350, 310, 'It heats your home, drives weather, and moves tectonic plates!', {
      fill: colors.primary,
      fontSize: 12,
      textAnchor: 'middle'
    });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(350, 45, 'Make Your Prediction', {
      fill: colors.text,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 70, 'When you heat water from below, hot water rises to the top.', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle'
    });

    // Simple diagram
    r.rect(270, 90, 160, 70, { fill: colors.bgPanel, stroke: colors.accent, strokeWidth: 2, rx: 5 });
    r.rect(275, 130, 150, 25, { fill: colors.secondary, opacity: 0.3 });
    r.text(350, 145, 'HOT', { fill: '#fca5a5', fontSize: 10, textAnchor: 'middle' });
    r.rect(275, 95, 150, 30, { fill: colors.accent, opacity: 0.2 });
    r.text(350, 112, 'COLD', { fill: '#93c5fd', fontSize: 10, textAnchor: 'middle' });

    // Arrow
    r.line(350, 150, 350, 105, { stroke: colors.secondary, strokeWidth: 3 });
    r.polygon([[350, 100], [344, 110], [356, 110]], { fill: colors.secondary });

    r.text(350, 180, 'Why does hot water rise?', {
      fill: colors.text,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Options shown as visual indicators
    const options = ['A', 'B', 'C', 'D'];
    const optionTexts = [
      'Heat makes water lighter in color',
      'Hot water expands, becomes less dense',
      'Hot molecules push themselves up',
      'Steam bubbles carry water up'
    ];

    options.forEach((opt, i) => {
      const y = 200 + i * 40;
      const selected = this.prediction === opt;
      r.rect(150, y, 400, 35, {
        fill: selected ? colors.primary + '30' : colors.bgCard,
        stroke: selected ? colors.primary : colors.border,
        strokeWidth: selected ? 2 : 1,
        rx: 8
      });
      r.circle(175, y + 17, 12, { fill: selected ? colors.primary : colors.bgPanel });
      r.text(175, y + 22, opt, { fill: colors.text, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, y + 22, optionTexts[i], { fill: colors.textMuted, fontSize: 11 });
    });
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(350, 35, 'Convection Cell Lab', {
      fill: colors.text,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Tank
    this.renderConvectionTank(r, 100, 55, 300, 220);

    // Stats panel
    r.rect(430, 55, 150, 150, { fill: colors.bgCard, rx: 8 });
    const hotCount = this.particles.filter(p => p.temp > 0.6).length;
    const coldCount = this.particles.filter(p => p.temp < 0.4).length;

    r.text(505, 75, 'Stats', { fill: colors.text, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(505, 100, `Heat: ${this.heatIntensity}%`, { fill: colors.secondary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(505, 125, `Hot: ${hotCount}`, { fill: colors.primary, fontSize: 12, textAnchor: 'middle' });
    r.text(505, 150, `Cold: ${coldCount}`, { fill: colors.accent, fontSize: 12, textAnchor: 'middle' });
    r.text(505, 180, this.showFlowLines ? 'Flow: ON' : 'Flow: OFF', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });

    // Explanation
    r.rect(100, 285, 480, 70, { fill: colors.bgCard, rx: 8 });
    r.text(340, 305, 'The Convection Cycle:', { fill: colors.primary, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(340, 325, '1. Bottom heats → fluid expands → density decreases → hot fluid rises', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(340, 340, '2. Top cools → fluid contracts → density increases → cold fluid sinks → cycle repeats!', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
  }

  private renderConvectionTank(r: CommandRenderer, x: number, y: number, width: number, height: number): void {
    // Background
    r.rect(x, y, width, height, { fill: '#1e293b', rx: 12 });

    // Tank walls
    r.rect(x + 20, y + 15, width - 40, height - 40, { fill: '#0f172a', stroke: '#64748b', strokeWidth: 2, rx: 5 });

    // Heat source
    const heatR = Math.floor(this.heatIntensity * 2.5);
    const heatG = Math.floor(this.heatIntensity * 0.5);
    r.rect(x + 25, y + height - 35, width - 50, 10, { fill: `rgb(${heatR}, ${heatG}, 0)`, rx: 3 });

    // Flow arrows
    if (this.showFlowLines) {
      // Left down
      r.line(x + 40, y + 50, x + 40, y + height - 55, { stroke: colors.accent, strokeWidth: 2, opacity: 0.5 });
      // Bottom right
      r.line(x + 60, y + height - 45, x + width - 60, y + height - 45, { stroke: colors.secondary, strokeWidth: 2, opacity: 0.5 });
      // Right up
      r.line(x + width - 40, y + height - 55, x + width - 40, y + 50, { stroke: colors.secondary, strokeWidth: 2, opacity: 0.5 });
      // Top left
      r.line(x + width - 60, y + 35, x + 60, y + 35, { stroke: colors.accent, strokeWidth: 2, opacity: 0.5 });
    }

    // Particles
    this.particles.forEach(p => {
      const px = x + 10 + (p.x - 30) * (width - 40) / 250;
      const py = y + 10 + (p.y - 30) * (height - 50) / 200;
      r.circle(px, py, 5, { fill: this.getParticleColor(p.temp), opacity: 0.85 });
    });

    // Labels
    r.text(x + width / 2, y + height - 10, `HEAT (${this.heatIntensity}%)`, { fill: colors.secondary, fontSize: 9, textAnchor: 'middle' });
    r.text(x + width / 2, y + 10, 'COOLING', { fill: colors.accent, fontSize: 9, textAnchor: 'middle' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Convection', {
      fill: colors.text,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const correct = this.prediction === 'B';
    r.text(350, 65, correct ? '✓ Your prediction was correct!' : 'The answer was B — hot fluid becomes less dense!', {
      fill: correct ? colors.success : colors.primary,
      fontSize: 12,
      textAnchor: 'middle'
    });

    // Two cards
    r.rect(50, 85, 280, 120, { fill: colors.bgCard, rx: 10 });
    r.text(190, 105, 'Natural Convection', { fill: colors.primary, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(65, 125, '• Temperature creates density differences', { fill: colors.textMuted, fontSize: 10 });
    r.text(65, 142, '• Hot fluid rises (less dense)', { fill: colors.textMuted, fontSize: 10 });
    r.text(65, 159, '• Cold fluid sinks (more dense)', { fill: colors.textMuted, fontSize: 10 });
    r.text(65, 176, '• Gravity is essential', { fill: colors.textMuted, fontSize: 10 });
    r.text(65, 193, '• Creates self-sustaining circulation', { fill: colors.textMuted, fontSize: 10 });

    r.rect(370, 85, 280, 120, { fill: colors.bgCard, rx: 10 });
    r.text(510, 105, 'Heat Transfer Types', { fill: colors.accent, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(385, 125, '• Conduction: Through direct contact', { fill: colors.textMuted, fontSize: 10 });
    r.text(385, 145, '• Convection: Through fluid movement', { fill: colors.textMuted, fontSize: 10 });
    r.text(385, 165, '• Radiation: Through EM waves', { fill: colors.textMuted, fontSize: 10 });
    r.text(385, 190, 'Convection is often the most efficient!', { fill: colors.primary, fontSize: 10 });

    // Formula
    r.rect(150, 220, 400, 80, { fill: colors.bgCard, rx: 10 });
    r.text(350, 245, 'The Physics Formula', { fill: colors.purple, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(200, 255, 300, 30, { fill: colors.bgPanel, rx: 6 });
    r.text(350, 275, 'Q = h × A × ΔT', { fill: colors.purple, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 295, 'Heat rate = coefficient × area × temp difference', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 40, 'The Fan Paradox', {
      fill: colors.text,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 65, 'A fan blows 30°C air at you — the same temperature as still air.', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle'
    });
    r.text(350, 82, 'Why does the fan make you feel cooler?', {
      fill: colors.warning,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Fan diagram
    r.rect(200, 100, 300, 80, { fill: colors.bgCard, rx: 10 });
    r.circle(250, 140, 22, { fill: '#64748b', stroke: '#94a3b8', strokeWidth: 2 });
    r.line(250, 120, 250, 160, { stroke: colors.text, strokeWidth: 3 });
    r.line(230, 140, 270, 140, { stroke: colors.text, strokeWidth: 3 });

    // Air flow
    for (let i = 0; i < 3; i++) {
      r.line(280, 130 + i * 10, 380, 130 + i * 10, { stroke: colors.accent, strokeWidth: 2, strokeDasharray: '5,3', opacity: 0.7 });
    }

    // Person
    r.circle(420, 130, 12, { fill: '#fcd9b6' });
    r.rect(413, 142, 14, 25, { fill: colors.accent, rx: 3 });

    // Options
    const options = ['A', 'B', 'C', 'D'];
    const texts = [
      'The fan actually cools the air',
      'Psychological placebo effect',
      'Speeds up evaporation & convection',
      'Blocks heat radiation'
    ];

    options.forEach((opt, i) => {
      const y = 195 + i * 40;
      const selected = this.twistPrediction === opt;
      r.rect(150, y, 400, 35, {
        fill: selected ? colors.purple + '30' : colors.bgCard,
        stroke: selected ? colors.purple : colors.border,
        rx: 8
      });
      r.circle(175, y + 17, 12, { fill: selected ? colors.purple : colors.bgPanel });
      r.text(175, y + 22, opt, { fill: colors.text, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, y + 22, texts[i], { fill: colors.textMuted, fontSize: 11 });
    });
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(350, 35, 'Forced Convection Lab', {
      fill: colors.text,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Tank with fan
    this.renderConvectionTank(r, 100, 50, 300, 200);

    // Fan indicator on tank
    if (this.fanSpeed > 0) {
      r.rect(90, 130, 20, 40, { fill: '#475569', rx: 3 });
      r.circle(100, 150, 8, { fill: colors.success });
      r.text(100, 180, 'FAN', { fill: colors.textMuted, fontSize: 8, textAnchor: 'middle' });
    }

    // Stats
    r.rect(430, 50, 150, 90, { fill: colors.bgCard, rx: 8 });
    r.text(505, 75, `Fan: ${this.fanSpeed}%`, { fill: colors.purple, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(505, 100, `Type: ${this.fanSpeed > 0 ? 'Forced' : 'Natural'}`, {
      fill: this.fanSpeed > 0 ? colors.purple : colors.primary,
      fontSize: 12,
      textAnchor: 'middle'
    });
    r.text(505, 125, `Heat: ${this.heatIntensity}%`, { fill: colors.secondary, fontSize: 12, textAnchor: 'middle' });

    // Comparison
    r.rect(100, 265, 480, 80, { fill: colors.bgCard, rx: 10 });
    r.text(340, 285, 'Natural vs Forced Convection', { fill: colors.purple, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(230, 305, 'Natural', { fill: colors.primary, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(230, 320, 'Buoyancy-driven', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
    r.text(230, 332, 'Slower transfer', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });

    r.text(450, 305, 'Forced', { fill: colors.purple, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(450, 320, 'Fan/pump-driven', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
    r.text(450, 332, '5-50x faster!', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(350, 40, 'Forced Convection Discovery', {
      fill: colors.text,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const correct = this.twistPrediction === 'C';
    r.text(350, 65, correct ? '✓ Correct! Moving air enhances convection.' : 'Answer: C — Fan speeds evaporation and removes warm boundary layer!', {
      fill: correct ? colors.success : colors.purple,
      fontSize: 11,
      textAnchor: 'middle'
    });

    r.rect(100, 85, 500, 130, { fill: colors.bgCard, rx: 10 });
    r.text(350, 105, 'Why Fans Cool You (Without Cooling Air)', { fill: colors.purple, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    r.circle(130, 135, 12, { fill: colors.purple });
    r.text(130, 140, '1', { fill: colors.text, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(150, 140, 'Removes warm boundary layer next to your skin', { fill: colors.textMuted, fontSize: 11 });

    r.circle(130, 165, 12, { fill: colors.purple });
    r.text(130, 170, '2', { fill: colors.text, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(150, 170, 'Speeds evaporation of sweat (latent heat)', { fill: colors.textMuted, fontSize: 11 });

    r.circle(130, 195, 12, { fill: colors.purple });
    r.text(130, 200, '3', { fill: colors.text, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(150, 200, 'Increases h coefficient dramatically', { fill: colors.textMuted, fontSize: 11 });

    r.rect(150, 230, 400, 50, { fill: colors.success + '20', stroke: colors.success, strokeWidth: 1, rx: 10 });
    r.text(350, 250, 'Key Insight', { fill: colors.success, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 268, 'Forced convection increases heat transfer RATE, not air temperature!', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(350, 35, 'Convection in Action', {
      fill: colors.text,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // App tabs
    transferApps.forEach((app, i) => {
      const x = 90 + i * 145;
      const selected = this.selectedApp === i;
      r.rect(x, 55, 130, 30, {
        fill: selected ? colors.primary : colors.bgCard,
        rx: 15
      });
      r.text(x + 65, 75, `${app.icon} ${app.short}`, {
        fill: selected ? colors.text : colors.textMuted,
        fontSize: 11,
        textAnchor: 'middle'
      });
    });

    // Selected app details
    const app = transferApps[this.selectedApp];
    r.rect(50, 95, 600, 200, { fill: colors.bgCard, rx: 12 });

    // Header
    r.rect(50, 95, 600, 45, { fill: colors.primary, rx: 12 });
    r.rect(50, 120, 600, 20, { fill: colors.primary });

    r.text(90, 125, app.icon, { fill: colors.text, fontSize: 24 });
    r.text(125, 118, app.title, { fill: colors.text, fontSize: 15, fontWeight: 'bold' });
    r.text(125, 133, app.tagline, { fill: colors.text, fontSize: 10, opacity: 0.8 });

    r.text(70, 160, app.description, { fill: colors.textMuted, fontSize: 10 });

    r.rect(60, 175, 280, 50, { fill: colors.bgPanel, rx: 8 });
    r.text(200, 195, 'Convection Connection', { fill: colors.text, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(70, 215, app.connection.substring(0, 70), { fill: colors.textMuted, fontSize: 9 });

    r.rect(360, 175, 280, 50, { fill: colors.accent + '20', rx: 8 });
    r.text(500, 195, 'How It Works', { fill: colors.accent, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(370, 215, 'Uses Q = hAΔT to transfer heat efficiently', { fill: colors.textMuted, fontSize: 9 });

    // Completed indicator
    const allDone = this.completedApps.every(c => c);
    if (allDone) {
      r.text(350, 280, '✓ All applications explored!', { fill: colors.success, fontSize: 11, textAnchor: 'middle' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (this.testSubmitted) {
      this.renderTestResults(r);
      return;
    }

    const q = testQuestions[this.testQuestion];

    r.text(200, 35, 'Knowledge Check', { fill: colors.text, fontSize: 16, fontWeight: 'bold' });
    r.text(550, 35, `Question ${this.testQuestion + 1} of 10`, { fill: colors.textMuted, fontSize: 12 });

    // Progress bar
    r.rect(50, 50, 600, 6, { fill: colors.bgPanel, rx: 3 });
    const progress = ((this.testQuestion + 1) / 10) * 600;
    r.rect(50, 50, progress, 6, { fill: colors.primary, rx: 3 });

    // Scenario
    r.rect(50, 65, 600, 45, { fill: colors.primary + '20', rx: 8 });
    r.text(70, 85, 'Scenario:', { fill: colors.primary, fontSize: 10, fontWeight: 'bold' });
    r.text(70, 100, q.scenario.substring(0, 90), { fill: colors.textMuted, fontSize: 10 });

    // Question
    r.rect(50, 118, 600, 35, { fill: colors.bgCard, rx: 8 });
    r.text(70, 140, q.question, { fill: colors.text, fontSize: 11, fontWeight: 'bold' });

    // Options
    q.options.forEach((opt, i) => {
      const y = 160 + i * 38;
      const selected = this.testAnswers[this.testQuestion] === i;
      r.rect(50, y, 600, 32, {
        fill: selected ? colors.primary + '30' : colors.bgCard,
        stroke: selected ? colors.primary : colors.border,
        rx: 6
      });
      const letter = String.fromCharCode(65 + i);
      r.circle(75, y + 16, 10, { fill: selected ? colors.primary : colors.bgPanel });
      r.text(75, y + 21, letter, { fill: colors.text, fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(95, y + 21, opt, { fill: colors.textMuted, fontSize: 10 });
    });

    // Navigation info
    r.text(350, 325, `Answered: ${this.testAnswers.filter(a => a !== null).length} / 10`, {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle'
    });
  }

  private renderTestResults(r: CommandRenderer): void {
    const score = this.calculateTestScore();
    const percentage = Math.round((score / 10) * 100);
    const passed = percentage >= 70;

    r.text(350, 60, 'Test Results', { fill: colors.text, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Score display
    r.rect(250, 90, 200, 70, { fill: passed ? colors.success + '30' : colors.secondary + '30', rx: 12 });
    r.text(350, 125, `${score} / 10`, { fill: passed ? colors.success : colors.secondary, fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 150, `${percentage}%`, { fill: colors.textMuted, fontSize: 14, textAnchor: 'middle' });

    r.text(350, 190, passed ? 'Congratulations! You passed!' : 'Keep learning and try again.', {
      fill: passed ? colors.success : colors.textMuted,
      fontSize: 14,
      textAnchor: 'middle'
    });

    // Show missed questions
    if (!passed) {
      r.text(350, 220, 'Review these concepts:', { fill: colors.text, fontSize: 12, textAnchor: 'middle' });
      let yPos = 245;
      for (let i = 0; i < 10 && yPos < 310; i++) {
        if (this.testAnswers[i] !== testQuestions[i].correctIndex) {
          r.text(350, yPos, `• Q${i + 1}: ${testQuestions[i].explanation.substring(0, 60)}...`, {
            fill: colors.textMuted,
            fontSize: 9,
            textAnchor: 'middle'
          });
          yPos += 18;
        }
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    const score = this.calculateTestScore();
    const percentage = Math.round((score / 10) * 100);
    const passed = percentage >= 70;

    r.text(350, 50, passed ? '🔥' : '📚', { fontSize: 36, textAnchor: 'middle' });
    r.text(350, 95, passed ? 'Convection Mastered!' : 'Keep Learning!', {
      fill: colors.text,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.rect(275, 110, 150, 45, { fill: colors.primary, rx: 10 });
    r.text(350, 140, `${score} / 10 (${percentage}%)`, {
      fill: colors.text,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Key concepts
    r.rect(100, 170, 500, 130, { fill: colors.bgCard, rx: 10 });
    r.text(350, 190, 'Key Concepts', { fill: colors.primary, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    const concepts = [
      '✓ Hot fluid rises because it expands and becomes less dense',
      '✓ Convection cells create continuous circulation patterns',
      '✓ Forced convection (fans) is 5-50x more efficient',
      '✓ Q = hAΔT governs convective heat transfer',
      '✓ Convection drives weather, ocean currents, and tectonics'
    ];

    concepts.forEach((c, i) => {
      r.text(130, 215 + i * 18, c, { fill: colors.textMuted, fontSize: 10 });
    });

    // Formula
    r.rect(200, 315, 300, 50, { fill: colors.bgPanel, rx: 8 });
    r.text(350, 340, 'Q = h × A × ΔT', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 358, 'The convection heat transfer equation', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
  }

  private renderUI(r: CommandRenderer): void {
    r.setHeader(this.gameTitle, this.phaseLabels[this.phase]);

    r.setProgress({
      id: 'phase_progress',
      current: this.phases.indexOf(this.phase) + 1,
      total: this.phases.length
    });

    r.setCoachMessage(this.coachMessages[this.phase]);

    // Phase-specific controls
    switch (this.phase) {
      case 'hook':
        r.addButton({ id: 'next', label: 'Explore Convection', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Test Prediction', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'heat', label: 'Heat Intensity', value: this.heatIntensity, min: 0, max: 100 });
        r.addToggle({ id: 'heating', label: 'Heating', value: this.isHeating });
        r.addToggle({ id: 'flow_lines', label: 'Flow Lines', value: this.showFlowLines });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
        r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        break;

      case 'review':
        r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });
        r.addButton({ id: 'next', label: 'Twist Challenge', variant: 'primary' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Test It', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({ id: 'fan_speed', label: 'Fan Speed', value: this.fanSpeed, min: 0, max: 100 });
        r.addSlider({ id: 'heat', label: 'Heat Intensity', value: this.heatIntensity, min: 0, max: 100 });
        r.addButton({ id: 'next', label: 'Continue', variant: 'success' });
        break;

      case 'twist_review':
        r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });
        r.addButton({ id: 'next', label: 'Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'HVAC', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Climate', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Cooling', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Cooking', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every(c => c)) {
          r.addButton({ id: 'next', label: 'Take Quiz', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= 9 });
          for (let i = 0; i < 4; i++) {
            r.addButton({
              id: `answer_${i}`,
              label: String.fromCharCode(65 + i),
              variant: this.testAnswers[this.testQuestion] === i ? 'primary' : 'secondary'
            });
          }
          if (this.testAnswers.every(a => a !== null)) {
            r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
          }
        } else {
          const score = this.calculateTestScore();
          r.addButton({
            id: score >= 7 ? 'next' : 'back',
            label: score >= 7 ? 'Complete!' : 'Review',
            variant: score >= 7 ? 'success' : 'secondary'
          });
        }
        break;

      case 'mastery':
        r.addButton({ id: 'back', label: 'Review', variant: 'secondary' });
        break;
    }
  }

  getCurrentPhase(): string {
    return this.phase;
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      testQuestion: this.testQuestion,
      testAnswers: this.testAnswers,
      testSubmitted: this.testSubmitted,
      selectedApp: this.selectedApp,
      completedApps: this.completedApps,
      particles: this.particles,
      heatIntensity: this.heatIntensity,
      isHeating: this.isHeating,
      showFlowLines: this.showFlowLines,
      fanSpeed: this.fanSpeed
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as Phase;
    if (state.prediction !== undefined) this.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.testQuestion !== undefined) this.testQuestion = state.testQuestion as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as (number | null)[];
    if (state.testSubmitted !== undefined) this.testSubmitted = state.testSubmitted as boolean;
    if (state.selectedApp !== undefined) this.selectedApp = state.selectedApp as number;
    if (state.completedApps) this.completedApps = state.completedApps as boolean[];
    if (state.particles) this.particles = state.particles as Particle[];
    if (state.heatIntensity !== undefined) this.heatIntensity = state.heatIntensity as number;
    if (state.isHeating !== undefined) this.isHeating = state.isHeating as boolean;
    if (state.showFlowLines !== undefined) this.showFlowLines = state.showFlowLines as boolean;
    if (state.fanSpeed !== undefined) this.fanSpeed = state.fanSpeed as number;
  }
}

export function createConvectionGame(sessionId: string): ConvectionGame {
  return new ConvectionGame(sessionId);
}
