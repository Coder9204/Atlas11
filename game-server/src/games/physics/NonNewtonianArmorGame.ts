// ============================================================================
// NON-NEWTONIAN ARMOR GAME - Server-Side Implementation
// ============================================================================
// Physics: Shear-thickening fluids (STF) increase viscosity under stress
// eta(gamma_dot) = eta_0 * (1 + (lambda * gamma_dot)^n)
// Particle jamming creates solid-like response at high shear rates
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
    question: "What is a non-Newtonian fluid?",
    options: ["A fluid that only flows in space", "A fluid whose viscosity changes with applied stress", "A fluid that is always solid", "A fluid discovered by Isaac Newton"],
    correctIndex: 1
  },
  {
    question: "What happens when you slowly push your finger into oobleck?",
    options: ["It shatters like glass", "It heats up significantly", "Your finger sinks in easily like a liquid", "It immediately hardens"],
    correctIndex: 2
  },
  {
    question: "Why does oobleck become solid-like when hit quickly?",
    options: ["The water evaporates instantly", "The starch particles jam together, unable to move", "Chemical bonds form", "The impact creates an electric charge"],
    correctIndex: 1
  },
  {
    question: "What type of non-Newtonian behavior does oobleck exhibit?",
    options: ["Shear-thinning (viscosity decreases)", "Shear-thickening (viscosity increases)", "Thixotropic (decreases over time)", "Rheopectic (increases over time)"],
    correctIndex: 1
  },
  {
    question: "If you stand on oobleck, what determines whether you sink?",
    options: ["Only your total weight", "The color of the oobleck", "How quickly you shift your weight", "The temperature of the room"],
    correctIndex: 2
  },
  {
    question: "What gives cornstarch-water its special properties?",
    options: ["Salt dissolved in water", "Microscopic starch granules suspended in water", "Air bubbles trapped in mixture", "Heat from mixing"],
    correctIndex: 1
  },
  {
    question: "How might shear-thickening fluids be used in body armor?",
    options: ["As a cooling system", "Stays flexible but hardens on impact", "Makes armor lighter", "Conducts electricity to shock attackers"],
    correctIndex: 1
  },
  {
    question: "What ratio of cornstarch to water creates the best oobleck?",
    options: ["Equal parts (1:1)", "More water than cornstarch (1:2)", "About 2 parts cornstarch to 1 part water", "Only a tiny bit of cornstarch"],
    correctIndex: 2
  },
  {
    question: "What happens to oobleck on a vibrating speaker?",
    options: ["It melts from the energy", "It forms tendrils and fingers that dance", "It separates into components", "It becomes permanently solid"],
    correctIndex: 1
  },
  {
    question: "Why is understanding non-Newtonian fluids important for engineering?",
    options: ["Only for kitchen gadgets", "For protective gear, dampers, and smart materials", "They don't exist in real applications", "Only for entertainment"],
    correctIndex: 1
  }
];

// ============================================================================
// GAME CLASS
// ============================================================================

export class NonNewtonianArmorGame extends BaseGame {
  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Play phase - oobleck simulation
  private pokeSpeed: 'slow' | 'fast' | null = null;
  private pokeDepth: number = 0;
  private isPoking: boolean = false;
  private animPhase: number = 0;

  // Twist play - ratio experiment
  private starchRatio: number = 2; // Parts starch per 1 part water

  // Review/Test
  private testAnswers: number[] = Array(10).fill(-1);
  private showTestResults: boolean = false;

  // Transfer
  private activeAppTab: number = 0;
  private completedApps: Set<number> = new Set();

  // Premium color palette
  private readonly colors = {
    primary: '#f59e0b',
    secondary: '#f97316',
    accent: '#ef4444',
    success: '#22c55e',
    background: '#0a0f1a',
    cardBg: 'rgba(30, 41, 59, 0.5)',
    text: '#ffffff',
    textMuted: '#94a3b8'
  };

  // Applications
  private readonly applications = [
    {
      title: "Liquid Body Armor",
      icon: "shield",
      description: "Military researchers develop fabric infused with shear-thickening fluid. Flexible for movement, but hardens instantly on impact!"
    },
    {
      title: "Smart Speed Bumps",
      icon: "car",
      description: "Speed bumps filled with non-Newtonian fluid stay flat for slow cars but become rigid for speeding vehicles."
    },
    {
      title: "Protective Sports Gear",
      icon: "helmet",
      description: "Helmets and pads using D3O remain soft and comfortable until impact, then harden to protect."
    },
    {
      title: "Industrial Dampers",
      icon: "gear",
      description: "Shock absorbers that adapt their resistance based on impact force, protecting machinery."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // ============================================================================
  // PROTECTED: Physics Calculations (NEVER sent to client)
  // ============================================================================

  private calculateViscosity(shearRate: number, starchRatio: number): number {
    // Simplified Cross model for shear-thickening
    // eta = eta_0 * (1 + (lambda * gamma_dot)^n)
    const eta_0 = 1; // Base viscosity
    const lambda = 0.1 * starchRatio; // Time constant
    const n = 2; // Power law index for shear-thickening

    return eta_0 * (1 + Math.pow(lambda * shearRate, n));
  }

  private calculatePenetrationDepth(speed: 'slow' | 'fast', starchRatio: number): number {
    // Fast poke = high shear rate = high viscosity = low penetration
    // Slow poke = low shear rate = low viscosity = high penetration
    if (speed === 'slow') {
      return 70 + (3 - starchRatio) * 20; // More penetration with less starch
    } else {
      return Math.max(5, 30 - starchRatio * 10); // Less penetration with more starch
    }
  }

  private calculateParticleJamming(starchRatio: number, shearRate: number): boolean {
    // Jamming threshold depends on particle volume fraction
    const volumeFraction = starchRatio / 3; // Simplified
    const jammingThreshold = 100 / (volumeFraction + 0.5);
    return shearRate > jammingThreshold;
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
        this.prediction = value as string;
        break;
      case 'submit_prediction':
        if (this.prediction) {
          this.phase = 'play';
        }
        break;
      case 'poke_slow':
        this.pokeSpeed = 'slow';
        this.pokeDepth = 0;
        this.isPoking = true;
        this.simulatePoke();
        break;
      case 'poke_fast':
        this.pokeSpeed = 'fast';
        this.pokeDepth = 0;
        this.isPoking = true;
        this.simulatePoke();
        break;
      case 'reset_poke':
        this.pokeSpeed = null;
        this.pokeDepth = 0;
        this.isPoking = false;
        break;
      case 'continue_to_review':
        this.phase = 'review';
        break;
      case 'continue_to_twist':
        this.phase = 'twist_predict';
        break;
      case 'select_twist_prediction':
        this.twistPrediction = value as string;
        break;
      case 'submit_twist_prediction':
        if (this.twistPrediction) {
          this.phase = 'twist_play';
        }
        break;
      case 'select_ratio':
        this.starchRatio = value as number;
        this.pokeSpeed = null;
        this.pokeDepth = 0;
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
    if (id === 'starch_ratio') {
      this.starchRatio = value as number;
    }
  }

  private simulatePoke(): void {
    if (!this.pokeSpeed) return;

    const targetDepth = this.calculatePenetrationDepth(this.pokeSpeed, this.starchRatio);
    const speed = this.pokeSpeed === 'slow' ? 2 : 15;

    const animate = () => {
      if (this.pokeDepth < targetDepth) {
        this.pokeDepth = Math.min(this.pokeDepth + speed, targetDepth);
        this.markDirty();
        setTimeout(animate, 50);
      }
    };
    animate();
  }

  private resetPhaseState(): void {
    if (this.phase === 'play' || this.phase === 'twist_play') {
      this.pokeSpeed = null;
      this.pokeDepth = 0;
      this.isPoking = false;
    }
  }

  private resetAllState(): void {
    this.prediction = null;
    this.twistPrediction = null;
    this.pokeSpeed = null;
    this.pokeDepth = 0;
    this.isPoking = false;
    this.starchRatio = 2;
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
    renderer.drawEllipse(700, 0, 300, 300, 'rgba(245, 158, 11, 0.1)');
    renderer.drawEllipse(100, 600, 300, 300, 'rgba(249, 115, 22, 0.1)');

    // Update animation phase
    this.animPhase = (this.animPhase + 0.05) % (Math.PI * 2);

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
    renderer.drawText("Non-Newtonian Fluids", 20, 30, this.colors.text, 14, 'bold');

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

  private renderHook(renderer: CommandRenderer): void {
    // Badge
    renderer.drawRoundedRectangle(340, 80, 120, 30, 15, 'rgba(245, 158, 11, 0.1)');
    renderer.drawText("MATERIAL SCIENCE", 360, 100, this.colors.primary, 10, 'bold');

    // Title
    renderer.drawText("Liquid Armor?!", 400, 180, this.colors.text, 40, 'bold');
    renderer.drawText("Can you walk on a liquid?", 400, 230, this.colors.textMuted, 18);

    // Premium card
    renderer.drawRoundedRectangle(200, 280, 400, 150, 16, this.colors.cardBg);
    renderer.drawText("Bowl + Goo", 400, 330, this.colors.primary, 40, 'bold');
    renderer.drawText("What if a substance could be liquid one moment", 400, 370, this.colors.text, 14);
    renderer.drawText("and solid the next?", 400, 390, this.colors.text, 14);

    // CTA Button
    renderer.addInteractiveElement({
      id: 'continue_hook',
      type: 'button_click',
      x: 300,
      y: 470,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(300, 470, 200, 50, 12, this.colors.primary);
    renderer.drawText("Let's Find Out!", 400, 500, this.colors.text, 14, 'bold');
  }

  private renderPredict(renderer: CommandRenderer): void {
    renderer.drawText("Make Your Prediction", 400, 100, this.colors.text, 28, 'bold');
    renderer.drawText("You have a bowl of oobleck (cornstarch + water).", 400, 140, this.colors.textMuted, 14);
    renderer.drawText("What happens when you poke it?", 400, 160, this.colors.textMuted, 14);

    const predictions = [
      { id: 'same', label: "Same result whether slow or fast - it's just a liquid" },
      { id: 'slow_resist', label: 'Slow poke meets resistance; fast goes through' },
      { id: 'fast_resist', label: 'Fast poke meets resistance; slow sinks in' },
      { id: 'always_solid', label: "It's always solid - cornstarch makes it firm" }
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
        isSelected ? 'rgba(245, 158, 11, 0.2)' : this.colors.cardBg);
      if (isSelected) {
        renderer.drawRoundedRectangle(150, y, 500, 60, 12, 'transparent', this.colors.primary, 2);
      }
      renderer.drawText(pred.label, 400, y + 35, this.colors.text, 12);
    });

    if (this.prediction) {
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
    renderer.drawText("Poke the Oobleck!", 400, 80, this.colors.text, 24, 'bold');

    // Bowl visualization
    renderer.drawEllipse(400, 350, 150, 30, '#334155');
    renderer.drawRoundedRectangle(250, 200, 300, 150, 10, '#1e293b');
    renderer.drawEllipse(400, 200, 140, 25, this.colors.primary);

    // Oobleck particles
    for (let i = 0; i < 40; i++) {
      const baseX = 280 + (i % 8) * 35;
      const baseY = 230 + Math.floor(i / 8) * 25;
      const offset = this.pokeSpeed === 'fast' ? 0 : Math.sin(this.animPhase + i) * 3;
      const isNearFinger = this.pokeDepth > 10 && Math.abs(baseX - 400) < 50 && baseY < 230 + this.pokeDepth;

      const particleColor = isNearFinger && this.pokeSpeed === 'fast' ? this.colors.accent : '#fcd34d';
      renderer.drawEllipse(baseX + offset, baseY + offset, 4, 4, particleColor);
    }

    // Finger
    if (this.pokeSpeed) {
      renderer.drawEllipse(400, 140 + this.pokeDepth, 15, 25, '#d4a574');
      renderer.drawEllipse(400, 120 + this.pokeDepth, 12, 10, '#d4a574');
    }

    // State indicator
    if (this.pokeSpeed) {
      const stateLabel = this.pokeSpeed === 'fast' ? 'SOLID-LIKE' : 'LIQUID';
      const stateColor = this.pokeSpeed === 'fast' ? this.colors.accent : this.colors.success;
      renderer.drawRoundedRectangle(550, 150, 100, 40, 8, `${stateColor}20`);
      renderer.drawText(stateLabel, 600, 175, stateColor, 12, 'bold');
      renderer.drawText(`Penetration: ${this.pokeDepth.toFixed(0)}mm`, 400, 400, this.colors.textMuted, 12);
    }

    // Control buttons
    renderer.addInteractiveElement({
      id: 'poke_slow',
      type: 'button_click',
      x: 200,
      y: 430,
      width: 120,
      height: 45
    });
    renderer.drawRoundedRectangle(200, 430, 120, 45, 10,
      this.pokeSpeed === 'slow' ? this.colors.success : '#475569');
    renderer.drawText("Slow Poke", 260, 457, this.colors.text, 12, 'bold');

    renderer.addInteractiveElement({
      id: 'poke_fast',
      type: 'button_click',
      x: 340,
      y: 430,
      width: 120,
      height: 45
    });
    renderer.drawRoundedRectangle(340, 430, 120, 45, 10,
      this.pokeSpeed === 'fast' ? this.colors.accent : '#475569');
    renderer.drawText("Fast Punch", 400, 457, this.colors.text, 12, 'bold');

    renderer.addInteractiveElement({
      id: 'reset_poke',
      type: 'button_click',
      x: 480,
      y: 430,
      width: 120,
      height: 45
    });
    renderer.drawRoundedRectangle(480, 430, 120, 45, 10, '#475569');
    renderer.drawText("Reset", 540, 457, this.colors.text, 12, 'bold');

    // Continue
    renderer.addInteractiveElement({
      id: 'continue_to_review',
      type: 'button_click',
      x: 300,
      y: 500,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(300, 500, 200, 50, 12, this.colors.primary);
    renderer.drawText("Understand Why", 400, 530, this.colors.text, 14, 'bold');
  }

  private renderReview(renderer: CommandRenderer): void {
    const wasCorrect = this.prediction === 'fast_resist';

    renderer.drawText("Shear-Thickening Fluid", 400, 80, this.colors.text, 24, 'bold');

    renderer.drawRoundedRectangle(150, 120, 500, 250, 16, this.colors.cardBg);

    // Steps
    const steps = [
      { num: 1, title: "Particle Suspension", desc: "Cornstarch particles float in water, able to slide past each other", color: this.colors.primary },
      { num: 2, title: "Slow Stress = Flow", desc: "Gentle force allows particles time to rearrange and flow", color: this.colors.secondary },
      { num: 3, title: "Fast Stress = JAM!", desc: "Sudden force doesn't give particles time to move - they lock!", color: this.colors.accent }
    ];

    steps.forEach((step, i) => {
      const y = 150 + i * 70;
      renderer.drawEllipse(190, y + 20, 20, 20, step.color);
      renderer.drawText(step.num.toString(), 190, y + 27, this.colors.text, 14, 'bold');
      renderer.drawText(step.title, 220, y + 15, this.colors.text, 14, 'bold');
      renderer.drawText(step.desc, 220, y + 35, this.colors.textMuted, 11);
    });

    // Feedback
    renderer.drawRoundedRectangle(200, 390, 400, 50, 10, 'rgba(245, 158, 11, 0.2)');
    renderer.drawText("Shear-Thickening: Viscosity INCREASES with shear rate!", 400, 420, this.colors.primary, 12, 'bold');

    // Result
    renderer.drawText(`Your prediction: ${wasCorrect ? '✓ Correct!' : '✗ Fast poke meets resistance!'}`, 400, 470,
      wasCorrect ? this.colors.success : this.colors.accent, 14);

    renderer.addInteractiveElement({
      id: 'continue_to_twist',
      type: 'button_click',
      x: 300,
      y: 500,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(300, 500, 200, 50, 12, this.colors.secondary);
    renderer.drawText("Change the Recipe?", 400, 530, this.colors.text, 14, 'bold');
  }

  private renderTwistPredict(renderer: CommandRenderer): void {
    renderer.drawText("The Twist!", 400, 80, this.colors.secondary, 28, 'bold');
    renderer.drawText("What if we change the RATIO of cornstarch to water?", 400, 120, this.colors.textMuted, 14);

    const predictions = [
      { id: 'more_starch', label: 'More starch = stronger armor effect (harder to penetrate)' },
      { id: 'less_starch', label: 'Less starch = stronger armor (better jamming)' },
      { id: 'same', label: "Ratio doesn't matter - any mixture works the same" },
      { id: 'middle', label: "There's a perfect middle ratio - too much/little reduces effect" }
    ];

    predictions.forEach((pred, i) => {
      const y = 160 + i * 70;
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
        isSelected ? 'rgba(249, 115, 22, 0.2)' : this.colors.cardBg);
      if (isSelected) {
        renderer.drawRoundedRectangle(150, y, 500, 60, 12, 'transparent', this.colors.secondary, 2);
      }
      renderer.drawText(pred.label, 400, y + 35, this.colors.text, 12);
    });

    if (this.twistPrediction) {
      renderer.addInteractiveElement({
        id: 'submit_twist_prediction',
        type: 'button_click',
        x: 300,
        y: 470,
        width: 200,
        height: 50
      });
      renderer.drawRoundedRectangle(300, 470, 200, 50, 12, this.colors.secondary);
      renderer.drawText("Test Different Ratios!", 400, 500, this.colors.text, 14, 'bold');
    }
  }

  private renderTwistPlay(renderer: CommandRenderer): void {
    renderer.drawText("Ratio Experiment", 400, 80, this.colors.secondary, 24, 'bold');

    // Three bowls showing different ratios
    [1, 2, 3].forEach((ratio, idx) => {
      const xOffset = 150 + idx * 200;
      const isActive = ratio === this.starchRatio;
      const color = ratio === 1 ? '#60a5fa' : ratio === 2 ? this.colors.primary : this.colors.accent;

      // Bowl
      renderer.drawEllipse(xOffset, 280, 50, 15, '#334155');
      renderer.drawRoundedRectangle(xOffset - 45, 180, 90, 100, 8, '#1e293b');
      renderer.drawEllipse(xOffset, 180, 42, 12, color);

      // Active indicator
      if (isActive) {
        renderer.drawRoundedRectangle(xOffset - 50, 170, 100, 130, 10, 'transparent', color, 3);

        // Show finger if poking
        if (this.pokeSpeed) {
          const penetration = this.calculatePenetrationDepth(this.pokeSpeed, this.starchRatio);
          renderer.drawEllipse(xOffset, 140 + penetration * 0.5, 10, 18, '#d4a574');
        }
      }

      // Label
      renderer.drawText(`${ratio}:1 ratio`, xOffset, 310, this.colors.textMuted, 10);
      renderer.drawText(ratio === 1 ? 'Runny' : ratio === 2 ? 'Standard' : 'Thick', xOffset, 325,
        isActive ? this.colors.primary : '#6b7280', 10);

      // Ratio button
      renderer.addInteractiveElement({
        id: 'select_ratio',
        type: 'button_click',
        x: xOffset - 45,
        y: 340,
        width: 90,
        height: 35,
        value: ratio
      });
      renderer.drawRoundedRectangle(xOffset - 45, 340, 90, 35, 8,
        isActive ? this.colors.primary : '#475569');
      renderer.drawText(`${ratio}:1`, xOffset, 362, this.colors.text, 12, 'bold');
    });

    // Poke controls
    renderer.addInteractiveElement({
      id: 'poke_slow',
      type: 'button_click',
      x: 250,
      y: 400,
      width: 100,
      height: 40
    });
    renderer.drawRoundedRectangle(250, 400, 100, 40, 8,
      this.pokeSpeed === 'slow' ? this.colors.success : '#475569');
    renderer.drawText("Slow", 300, 425, this.colors.text, 12);

    renderer.addInteractiveElement({
      id: 'poke_fast',
      type: 'button_click',
      x: 450,
      y: 400,
      width: 100,
      height: 40
    });
    renderer.drawRoundedRectangle(450, 400, 100, 40, 8,
      this.pokeSpeed === 'fast' ? this.colors.accent : '#475569');
    renderer.drawText("Fast", 500, 425, this.colors.text, 12);

    // Observation
    renderer.drawRoundedRectangle(200, 460, 400, 50, 10, 'rgba(249, 115, 22, 0.2)');
    renderer.drawText("More starch = stronger shear-thickening! 2:1 is the sweet spot.", 400, 490, this.colors.secondary, 11);

    // Continue
    renderer.addInteractiveElement({
      id: 'continue_twist_review',
      type: 'button_click',
      x: 300,
      y: 530,
      width: 200,
      height: 45
    });
    renderer.drawRoundedRectangle(300, 530, 200, 45, 10, this.colors.secondary);
    renderer.drawText("Continue", 400, 557, this.colors.text, 14, 'bold');
  }

  private renderTwistReview(renderer: CommandRenderer): void {
    renderer.drawText("The Perfect Recipe", 400, 80, this.colors.secondary, 24, 'bold');

    renderer.drawRoundedRectangle(150, 120, 500, 250, 16, this.colors.cardBg);
    renderer.drawText("The ratio matters because:", 400, 160, this.colors.text, 14);

    const ratios = [
      { label: 'Too Little Starch (1:1)', desc: 'Not enough particles to jam - acts like muddy water', color: '#60a5fa' },
      { label: 'Optimal Ratio (~2:1)', desc: 'Perfect particle density for dramatic shear-thickening', color: this.colors.primary },
      { label: 'Too Much Starch (3:1+)', desc: 'Already dense and paste-like, less dramatic response', color: this.colors.accent }
    ];

    ratios.forEach((r, i) => {
      const y = 190 + i * 60;
      renderer.drawRoundedRectangle(200, y, 400, 50, 10, `${r.color}20`);
      renderer.drawText(r.label, 400, y + 18, r.color, 12, 'bold');
      renderer.drawText(r.desc, 400, y + 38, this.colors.textMuted, 10);
    });

    const wasCorrect = this.twistPrediction === 'more_starch' || this.twistPrediction === 'middle';
    renderer.drawText(`Your prediction: ${wasCorrect ? '✓ On the right track!' : '✗ More starch = stronger effect (to a point)'}`, 400, 400,
      wasCorrect ? this.colors.success : this.colors.primary, 12);

    renderer.addInteractiveElement({
      id: 'continue_to_transfer',
      type: 'button_click',
      x: 300,
      y: 450,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(300, 450, 200, 50, 12, this.colors.accent);
    renderer.drawText("See Applications", 400, 480, this.colors.text, 14, 'bold');
  }

  private renderTransfer(renderer: CommandRenderer): void {
    renderer.drawText("Real-World Applications", 400, 70, this.colors.text, 24, 'bold');
    renderer.drawText("Explore all 4 applications to unlock the quiz", 400, 100, this.colors.textMuted, 12);

    // App tabs
    this.applications.forEach((app, i) => {
      const x = 120 + i * 160;
      const isActive = this.activeAppTab === i;
      const isCompleted = this.completedApps.has(i);

      renderer.addInteractiveElement({
        id: 'select_app',
        type: 'button_click',
        x: x,
        y: 130,
        width: 140,
        height: 50,
        value: i
      });

      let bgColor = '#475569';
      if (isActive) bgColor = this.colors.primary;
      else if (isCompleted) bgColor = 'rgba(34, 197, 94, 0.3)';

      renderer.drawRoundedRectangle(x, 130, 140, 50, 12, bgColor);
      renderer.drawText(isCompleted ? '✓' : '', x + 15, 160, this.colors.success, 12);
      renderer.drawText(app.title.split(' ')[0], x + 70, 160, this.colors.text, 11);
    });

    // Current app detail
    const app = this.applications[this.activeAppTab];
    renderer.drawRoundedRectangle(150, 200, 500, 200, 16, this.colors.cardBg);
    renderer.drawText(app.title, 400, 250, this.colors.text, 20, 'bold');
    renderer.drawText(app.description, 400, 320, this.colors.text, 12);

    // Progress
    renderer.drawText(`Progress: ${this.completedApps.size}/4`, 400, 440, this.colors.textMuted, 12);

    if (this.completedApps.size >= 4) {
      renderer.addInteractiveElement({
        id: 'start_test',
        type: 'button_click',
        x: 300,
        y: 480,
        width: 200,
        height: 50
      });
      renderer.drawRoundedRectangle(300, 480, 200, 50, 12, this.colors.success);
      renderer.drawText("Take the Quiz", 400, 510, this.colors.text, 14, 'bold');
    }
  }

  private renderTest(renderer: CommandRenderer): void {
    if (this.showTestResults) {
      const score = this.calculateScore();
      const passed = score >= 7;

      renderer.drawText("Quiz Complete!", 400, 150, this.colors.text, 32, 'bold');
      renderer.drawText(`You scored ${score}/10`, 400, 220, passed ? this.colors.success : this.colors.primary, 24);
      renderer.drawText(passed ? "Excellent! You understand non-Newtonian fluids!" : "Review the concepts and try again!", 400, 270, this.colors.textMuted, 14);

      renderer.addInteractiveElement({
        id: 'continue_from_test',
        type: 'button_click',
        x: 300,
        y: 350,
        width: 200,
        height: 50
      });
      renderer.drawRoundedRectangle(300, 350, 200, 50, 12, passed ? this.colors.success : this.colors.secondary);
      renderer.drawText(passed ? "Continue to Mastery!" : "Try Again", 400, 380, this.colors.text, 14, 'bold');
      return;
    }

    renderer.drawText("Knowledge Check", 400, 70, this.colors.text, 24, 'bold');
    renderer.drawText("Answer all 10 questions (70% to pass)", 400, 100, this.colors.textMuted, 12);

    // Progress bar
    const answeredCount = this.testAnswers.filter(a => a !== -1).length;
    renderer.drawRoundedRectangle(150, 120, 500, 10, 5, '#475569');
    renderer.drawRoundedRectangle(150, 120, (answeredCount / 10) * 500, 10, 5, this.colors.primary);
    renderer.drawText(`${answeredCount}/10`, 670, 128, this.colors.textMuted, 12);

    // Show current unanswered question or first question
    let currentQ = this.testAnswers.findIndex(a => a === -1);
    if (currentQ === -1) currentQ = 0;

    const question = TEST_QUESTIONS[currentQ];

    renderer.drawRoundedRectangle(100, 150, 600, 80, 12, this.colors.cardBg);
    renderer.drawText(`${currentQ + 1}. ${question.question}`, 400, 195, this.colors.text, 12);

    question.options.forEach((option, oIndex) => {
      const y = 250 + oIndex * 55;
      const isSelected = this.testAnswers[currentQ] === oIndex;
      const isCorrect = oIndex === question.correctIndex;

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
        value: `${currentQ}_${oIndex}`
      });

      renderer.drawRoundedRectangle(100, y, 600, 45, 8, bgColor);
      renderer.drawText(option, 400, y + 27, this.colors.text, 11);
    });

    // Submit button when all answered
    if (answeredCount === 10) {
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
    renderer.drawText("TROPHY", 400, 120, this.colors.primary, 60, 'bold');
    renderer.drawText("Non-Newtonian Fluid Master!", 400, 200, this.colors.text, 28, 'bold');

    renderer.drawRoundedRectangle(200, 250, 400, 200, 16, 'rgba(245, 158, 11, 0.2)');
    renderer.drawText("You now understand:", 400, 290, this.colors.primary, 14, 'bold');

    const achievements = [
      "✓ Shear-thickening fluids increase viscosity under stress",
      "✓ Particle jamming creates the 'solid' response",
      "✓ The ratio of particles to liquid matters",
      "✓ Real applications: armor, dampers, protective gear"
    ];

    achievements.forEach((a, i) => {
      renderer.drawText(a, 400, 330 + i * 25, this.colors.text, 11);
    });

    renderer.drawText("You can now walk on oobleck... if you run fast enough!", 400, 480, this.colors.textMuted, 12);

    renderer.addInteractiveElement({
      id: 'complete_mastery',
      type: 'button_click',
      x: 300,
      y: 520,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(300, 520, 200, 50, 12, this.colors.success);
    renderer.drawText("Complete!", 400, 550, this.colors.text, 14, 'bold');
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      pokeSpeed: this.pokeSpeed,
      pokeDepth: this.pokeDepth,
      isPoking: this.isPoking,
      starchRatio: this.starchRatio,
      testAnswers: this.testAnswers,
      showTestResults: this.showTestResults,
      activeAppTab: this.activeAppTab,
      completedApps: Array.from(this.completedApps)
    };
  }

  restoreState(state: Record<string, unknown>): void {
    this.phase = state.phase as GamePhase;
    this.prediction = state.prediction as string | null;
    this.twistPrediction = state.twistPrediction as string | null;
    this.pokeSpeed = state.pokeSpeed as 'slow' | 'fast' | null;
    this.pokeDepth = state.pokeDepth as number;
    this.isPoking = state.isPoking as boolean;
    this.starchRatio = state.starchRatio as number;
    this.testAnswers = state.testAnswers as number[];
    this.showTestResults = state.showTestResults as boolean;
    this.activeAppTab = state.activeAppTab as number;
    this.completedApps = new Set(state.completedApps as number[]);
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createNonNewtonianArmorGame(sessionId: string): NonNewtonianArmorGame {
  return new NonNewtonianArmorGame(sessionId);
}
