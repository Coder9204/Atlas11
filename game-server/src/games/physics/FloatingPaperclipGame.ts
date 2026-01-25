import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// FLOATING PAPERCLIP GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Surface tension creates a "skin" supporting heavy objects
// Steel paperclip floats despite being 8x denser than water
// Force balance: Weight = Surface tension * perimeter * sin(theta)
// gamma_water = 0.073 N/m (surface tension coefficient)
// ============================================================================

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion {
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number; // PROTECTED: Never sent to client
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  tagline: string;
  description: string;
  connection: string;
}

// Physics constants (PROTECTED - never sent to client)
const SURFACE_TENSION_WATER = 0.073; // N/m
const SURFACE_TENSION_SOAP = 0.025; // N/m (~65% reduction)
const STEEL_DENSITY = 7850; // kg/m^3
const WATER_DENSITY = 1000; // kg/m^3
const DENSITY_RATIO = STEEL_DENSITY / WATER_DENSITY; // ~7.85x

export class FloatingPaperclipGame extends BaseGame {
  readonly gameType = 'floating_paperclip';
  readonly gameTitle = 'Floating Paperclip: Surface Tension';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private showResult = false;
  private showTwistResult = false;

  // Simulation parameters
  private clipState: 'hovering' | 'floating' | 'sinking' = 'hovering';
  private clipY = 30;
  private dropMethod: 'gentle' | 'dropped' = 'gentle';
  private dimpleDepth = 0;
  private hasDropped = false;
  private animationTime = 0;

  // Twist simulation - soap effect
  private soapAdded = false;
  private twistClipY = 60;
  private twistClipState: 'floating' | 'sinking' | 'sunk' = 'floating';

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "A steel paperclip is carefully placed on water.",
      question: "Why does a steel paperclip float on water?",
      options: ["Steel is less dense than water", "Surface tension supports it", "Air bubbles hold it up", "The paperclip is hollow"],
      correctIndex: 1,
      explanation: "Surface tension creates a supportive 'skin' that can support objects heavier than water."
    },
    {
      scenario: "You observe a floating paperclip closely.",
      question: "What visible feature shows surface tension supporting the paperclip?",
      options: ["Bubbles around the clip", "Color change in water", "A dimple in the water surface", "Ripples spreading outward"],
      correctIndex: 2,
      explanation: "The water surface bends down (dimples) under the weight, like a stretched membrane."
    },
    {
      scenario: "Compare dropping vs gently placing a paperclip.",
      question: "Why does a dropped paperclip sink but a gently placed one floats?",
      options: ["Dropped clip is heavier", "Gentle placement allows surface tension to form gradually", "Water temperature changes", "Air pressure pushes it down"],
      correctIndex: 1,
      explanation: "Dropping breaks through the surface before tension can support it."
    },
    {
      scenario: "A paperclip is floating on water. You add soap.",
      question: "What happens when you add soap to water with a floating paperclip?",
      options: ["The clip floats higher", "Nothing changes", "The clip immediately sinks", "The water turns cloudy"],
      correctIndex: 2,
      explanation: "Soap reduces surface tension by ~65%, breaking the supportive 'skin'."
    },
    {
      scenario: "An engineer calculates surface tension force.",
      question: "Which formula relates surface tension force to contact angle?",
      options: ["F = mg", "F = gamma * L * sin(theta)", "F = rho*g*h", "F = ma"],
      correctIndex: 1,
      explanation: "Surface tension force depends on tension coefficient, perimeter, and contact angle."
    },
    {
      scenario: "Water striders walk effortlessly on pond surfaces.",
      question: "Why can water striders walk on water?",
      options: ["They are very light", "Their legs have oils and hairs that don't break surface tension", "They move too fast to sink", "Water pushes them up"],
      correctIndex: 1,
      explanation: "Hydrophobic hairs distribute weight and prevent breaking surface tension."
    },
    {
      scenario: "Steel vs water density comparison.",
      question: "What is the approximate density ratio of steel to water?",
      options: ["1:1 (same density)", "2:1", "5:1", "8:1"],
      correctIndex: 3,
      explanation: "Steel is ~7850 kg/m^3, water is ~1000 kg/m^3, ratio is about 8:1."
    },
    {
      scenario: "Designing objects to float on surface tension.",
      question: "What determines the maximum weight surface tension can support?",
      options: ["Water depth", "Contact perimeter and contact angle", "Water color", "Container shape"],
      correctIndex: 1,
      explanation: "F = gamma * L * sin(theta) - perimeter L and angle theta matter most."
    },
    {
      scenario: "Testing needles of different orientations.",
      question: "Why does a needle float better when placed parallel to the water surface?",
      options: ["It's lighter that way", "More contact length means more surface tension force", "The needle is magnetic", "Air gets trapped underneath"],
      correctIndex: 1,
      explanation: "Longer contact perimeter provides more upward surface tension force."
    },
    {
      scenario: "Observing insects and their larvae on ponds.",
      question: "What natural phenomenon uses surface tension for survival?",
      options: ["Birds flying", "Fish swimming", "Insects walking on water", "Plants absorbing sunlight"],
      correctIndex: 2,
      explanation: "Many insects (water striders, mosquito larvae) rely on surface tension."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🦟",
      title: "Water Striders",
      tagline: "Nature's surface walkers",
      description: "Water striders have hydrophobic (water-repelling) hairs on their legs that distribute weight over large areas without breaking surface tension.",
      connection: "Each leg creates a dimple, just like the paperclip!"
    },
    {
      icon: "🧭",
      title: "Floating Needle Compass",
      tagline: "Ancient navigation",
      description: "Sailors magnetized needles and floated them on water to create makeshift compasses. The needle aligns with Earth's magnetic field.",
      connection: "Surface tension keeps the needle afloat while it rotates freely."
    },
    {
      icon: "🥚",
      title: "Mosquito Egg Rafts",
      tagline: "Aquatic reproduction",
      description: "Mosquitoes lay eggs in floating rafts on water surfaces. The eggs are water-repellent and stick together for stability.",
      connection: "Surface tension keeps the raft afloat until larvae hatch."
    },
    {
      icon: "🔬",
      title: "Microfluidics",
      tagline: "Lab-on-a-chip technology",
      description: "At microscale, surface tension dominates. Engineers use it to move tiny droplets in medical diagnostic chips.",
      connection: "Same physics, controlled precisely at micro scale."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate surface tension force
  private calculateSurfaceTensionForce(perimeter: number, angle: number, gamma: number = SURFACE_TENSION_WATER): number {
    return gamma * perimeter * Math.sin(angle);
  }

  // PROTECTED: Check if object can float
  private canFloat(weight: number, perimeter: number, gamma: number = SURFACE_TENSION_WATER): boolean {
    const maxForce = this.calculateSurfaceTensionForce(perimeter, Math.PI / 4, gamma);
    return maxForce >= weight;
  }

  // PROTECTED: Check test answer
  private checkAnswer(questionIndex: number, answerIndex: number): boolean {
    return this.testQuestions[questionIndex].correctIndex === answerIndex;
  }

  // Calculate test score
  private calculateScore(): number {
    return this.testAnswers.reduce((score, answer, index) => {
      return score + (this.checkAnswer(index, answer) ? 1 : 0);
    }, 0);
  }

  getCurrentPhase(): string {
    return this.phase;
  }

  handleInput(input: UserInput): void {
    if (input.type === 'button_click') {
      this.handleButtonClick(input.id);
    }
  }

  private handleButtonClick(buttonId: string): void {
    switch (this.phase) {
      case 'hook':
        if (buttonId === 'discover') {
          this.phase = 'predict';
        }
        break;

      case 'predict':
        if (buttonId.startsWith('pred_')) {
          this.prediction = buttonId.split('_')[1];
        } else if (buttonId === 'test_it' && this.prediction) {
          this.phase = 'play';
        }
        break;

      case 'play':
        if (buttonId === 'gentle') {
          this.dropMethod = 'gentle';
        } else if (buttonId === 'dropped') {
          this.dropMethod = 'dropped';
        } else if (buttonId === 'drop_clip' && !this.hasDropped) {
          this.dropClip();
        } else if (buttonId === 'reset') {
          this.resetSimulation();
        } else if (buttonId === 'see_results' && this.hasDropped) {
          this.showResult = true;
        } else if (buttonId === 'continue' && this.showResult) {
          this.phase = 'review';
        }
        break;

      case 'review':
        if (buttonId === 'continue') {
          this.phase = 'twist_predict';
        }
        break;

      case 'twist_predict':
        if (buttonId.startsWith('twist_')) {
          this.twistPrediction = buttonId.split('_')[1];
        } else if (buttonId === 'add_soap' && this.twistPrediction) {
          this.phase = 'twist_play';
        }
        break;

      case 'twist_play':
        if (buttonId === 'add_soap_now' && !this.soapAdded) {
          this.addSoap();
        } else if (buttonId === 'reset_twist') {
          this.resetTwist();
        } else if (buttonId === 'see_twist_results' && this.twistClipState === 'sunk') {
          this.showTwistResult = true;
        } else if (buttonId === 'continue' && this.showTwistResult) {
          this.phase = 'twist_review';
        }
        break;

      case 'twist_review':
        if (buttonId === 'continue') {
          this.phase = 'transfer';
        }
        break;

      case 'transfer':
        if (buttonId.startsWith('app_')) {
          this.activeAppIndex = parseInt(buttonId.split('_')[1]);
        } else if (buttonId === 'mark_understood') {
          this.completedApps.add(this.activeAppIndex);
        } else if (buttonId === 'continue' && this.completedApps.size >= 4) {
          this.phase = 'test';
        }
        break;

      case 'test':
        if (!this.showTestResults) {
          if (buttonId.startsWith('answer_')) {
            const answerIndex = parseInt(buttonId.split('_')[1]);
            this.testAnswers[this.currentQuestionIndex] = answerIndex;
          } else if (buttonId === 'next_question' && this.currentQuestionIndex < 9) {
            this.currentQuestionIndex++;
          } else if (buttonId === 'prev_question' && this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
          } else if (buttonId === 'submit' && !this.testAnswers.includes(-1)) {
            this.showTestResults = true;
          }
        } else {
          if (buttonId === 'continue') {
            if (this.calculateScore() >= 7) {
              this.phase = 'mastery';
            } else {
              this.showTestResults = false;
              this.testAnswers = Array(10).fill(-1);
              this.currentQuestionIndex = 0;
              this.phase = 'review';
            }
          }
        }
        break;

      case 'mastery':
        if (buttonId === 'restart') {
          this.resetGame();
        }
        break;
    }
  }

  private dropClip(): void {
    this.hasDropped = true;
    this.clipState = 'floating';

    if (this.dropMethod === 'gentle') {
      // Gentle placement - will float
      this.clipState = 'floating';
    } else {
      // Dropped - will sink
      this.clipState = 'sinking';
    }
  }

  private addSoap(): void {
    this.soapAdded = true;
    this.twistClipState = 'sinking';
  }

  private resetSimulation(): void {
    this.clipState = 'hovering';
    this.clipY = 30;
    this.dimpleDepth = 0;
    this.hasDropped = false;
    this.showResult = false;
  }

  private resetTwist(): void {
    this.soapAdded = false;
    this.twistClipY = 60;
    this.twistClipState = 'floating';
    this.showTwistResult = false;
  }

  processInput(input: UserInput, config: SessionConfig): void {
    this.handleInput(input);
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showResult = false;
    this.showTwistResult = false;
    this.resetSimulation();
    this.resetTwist();
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Animate clip falling/floating
    if (this.hasDropped) {
      if (this.dropMethod === 'gentle') {
        // Gently float down to surface
        if (this.clipY < 95) {
          this.clipY += deltaTime * 40;
        } else {
          this.clipY = 95;
          // Build dimple
          if (this.dimpleDepth < 8) {
            this.dimpleDepth += deltaTime * 16;
          }
        }
      } else {
        // Sink
        if (this.clipY < 180) {
          this.clipY += deltaTime * 80;
        }
      }
    }

    // Twist animation - soap makes clip sink
    if (this.soapAdded && this.twistClipState === 'sinking') {
      if (this.twistClipY < 180) {
        this.twistClipY += deltaTime * 60;
      } else {
        this.twistClipState = 'sunk';
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    r.clear('#0a0f1a');

    r.circle(100, 100, 150, { fill: 'rgba(59, 130, 246, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(56, 189, 248, 0.05)' });

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

    this.renderProgress(r);

    return r.toFrame(Math.floor(this.animationTime * 60));
  }

  private renderProgress(r: CommandRenderer): void {
    const phases: GamePhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phases.indexOf(this.phase);

    r.setProgress({
      id: 'phase_progress',
      current: currentIndex + 1,
      total: phases.length,
      labels: phases
    });
  }

  private renderPaperclip(r: CommandRenderer, x: number, y: number, scale: number = 1): void {
    // Simplified paperclip shape
    const w = 50 * scale;
    const h = 20 * scale;
    r.roundRect(x, y, w, h, 4 * scale, { fill: 'none', stroke: '#94a3b8', strokeWidth: 3 * scale });
    r.line(x + 5 * scale, y + h / 2, x + 10 * scale, y + h / 2, { stroke: '#e2e8f0', strokeWidth: 2 * scale });
  }

  private renderHook(r: CommandRenderer): void {
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(59, 130, 246, 0.1)' });
    r.text(200, 80, 'SURFACE PHYSICS', { fill: '#3b82f6', fontSize: 10, textAnchor: 'middle' });

    r.text(200, 130, 'Steel That Floats?', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Steel is 8x denser than water. It should sink...', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Water container
    r.roundRect(70, 200, 260, 150, 8, { fill: 'rgba(30, 58, 95, 0.6)' });
    r.roundRect(75, 205, 250, 140, 6, { fill: '#3b82f6' });

    // Paperclip floating
    this.renderPaperclip(r, 175, 195, 1);

    // Surface dimple
    r.ellipse(200, 212, 35, 6, { fill: 'rgba(29, 78, 216, 0.5)' });

    // Question marks
    r.text(130, 190, '?', { fill: '#fbbf24', fontSize: 24, fontWeight: 'bold' });
    r.text(270, 190, '?', { fill: '#fbbf24', fontSize: 24, fontWeight: 'bold' });

    r.text(200, 245, 'A steel paperclip floating on water!', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Density comparison
    r.roundRect(90, 280, 60, 25, 4, { fill: '#64748b' });
    r.text(120, 297, 'Steel: 7850', { fill: '#ffffff', fontSize: 8, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(250, 280, 60, 25, 4, { fill: '#3b82f6' });
    r.text(280, 297, 'Water: 1000', { fill: '#ffffff', fontSize: 8, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(200, 320, 'kg/m^3', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'discover', label: 'Discover the Secret', variant: 'primary' });

    r.setCoachMessage('Explore how surface tension defies density!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 100, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'You have a paperclip and a bowl of water.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 150, 'What happens when you gently place the clip?', { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      { id: 'a', text: 'Sinks immediately (steel is too dense)' },
      { id: 'b', text: 'Floats on the surface' },
      { id: 'c', text: 'Bobs up and down, then sinks' }
    ];

    options.forEach((option, i) => {
      const y = 200 + i * 55;
      const isSelected = this.prediction === option.id;
      const bgColor = isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(51, 65, 85, 0.5)';

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, option.text, { fill: isSelected ? '#60a5fa' : '#e2e8f0', fontSize: 12 });

      r.addButton({ id: `pred_${option.id}`, label: '', variant: 'secondary' });
    });

    if (this.prediction) {
      r.addButton({ id: 'test_it', label: 'Test It!', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Floating Paperclip Experiment', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 80, 'Choose how to place the paperclip on water', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Water container
    r.roundRect(50, 100, 300, 150, 8, { fill: 'rgba(30, 78, 144, 0.6)' });
    r.roundRect(55, 105, 290, 140, 6, { fill: '#3b82f6' });

    // Water surface
    if (this.clipState === 'floating') {
      const dimple = Math.min(this.dimpleDepth, 8);
      r.ellipse(200, 105 + dimple, 35, dimple, { fill: '#60a5fa', opacity: 0.6 });
    }

    // Paperclip
    this.renderPaperclip(r, 175, this.clipY, 1);

    // Status
    if (this.clipState === 'floating' && this.clipY > 90) {
      r.text(200, 90, 'It floats!', { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    } else if (this.clipState === 'sinking' && this.clipY > 100) {
      r.text(200, 90, 'It sinks!', { fill: '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Method selection
    if (!this.hasDropped) {
      r.roundRect(80, 270, 100, 35, 6, { fill: this.dropMethod === 'gentle' ? '#10b981' : 'rgba(51, 65, 85, 0.5)' });
      r.text(130, 292, 'Gentle Place', { fill: '#ffffff', fontSize: 11, textAnchor: 'middle' });
      r.addButton({ id: 'gentle', label: '', variant: 'secondary' });

      r.roundRect(220, 270, 100, 35, 6, { fill: this.dropMethod === 'dropped' ? '#ef4444' : 'rgba(51, 65, 85, 0.5)' });
      r.text(270, 292, 'Drop It', { fill: '#ffffff', fontSize: 11, textAnchor: 'middle' });
      r.addButton({ id: 'dropped', label: '', variant: 'secondary' });
    }

    // Action buttons
    if (!this.hasDropped) {
      r.addButton({ id: 'drop_clip', label: this.dropMethod === 'gentle' ? 'Place Gently' : 'Drop!', variant: 'primary' });
    } else {
      r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });

      if ((this.clipState === 'floating' && this.dimpleDepth > 6) || this.clipY > 150) {
        if (!this.showResult) {
          r.addButton({ id: 'see_results', label: 'See Results', variant: 'primary' });
        }
      }
    }

    // Results feedback
    if (this.showResult) {
      const correct = this.prediction === 'b';
      r.roundRect(30, 360, 340, 120, 12, { fill: correct ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)' });
      r.text(200, 390, correct ? 'Correct!' : "Surprising, right?", { fill: correct ? '#10b981' : '#f59e0b', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 420, 'When gently placed, the paperclip floats!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 445, "Surface tension creates an invisible 'skin'", { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 465, 'supporting the clip despite steel being 8x denser!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Learn the Physics', variant: 'primary' });
    }
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Physics of Surface Support', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 85, 340, 140, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 110, 'Why It Floats', { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Force diagram (simplified)
    r.rect(140, 135, 60, 12, { fill: '#64748b' });
    r.text(170, 143, 'Clip', { fill: '#ffffff', fontSize: 8, textAnchor: 'middle' });

    // Weight arrow down
    r.line(170, 155, 170, 185, { stroke: '#ef4444', strokeWidth: 3 });
    r.text(185, 180, 'W', { fill: '#ef4444', fontSize: 10, fontWeight: 'bold' });

    // Surface tension arrows up
    r.line(145, 150, 125, 130, { stroke: '#22c55e', strokeWidth: 2 });
    r.line(195, 150, 215, 130, { stroke: '#22c55e', strokeWidth: 2 });
    r.text(100, 125, 'F = gamma*L*sin(theta)', { fill: '#22c55e', fontSize: 8 });

    r.text(200, 215, 'Vertical components balance weight!', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 235, 340, 70, 10, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 260, 'F_vertical = gamma * L * sin(theta)', { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 285, 'gamma = surface tension, L = perimeter, theta = contact angle', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.text(200, 325, 'When F_vertical >= Weight, the object floats!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    r.roundRect(30, 350, 340, 70, 12, { fill: 'rgba(245, 158, 11, 0.2)' });
    r.text(200, 375, 'Why Dropping Fails', { fill: '#f59e0b', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 400, 'When dropped, the clip punches through the', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 418, 'surface before tension can support it.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Try a Twist!', variant: 'secondary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Soap Test', { fill: '#f59e0b', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 95, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 120, 'A paperclip is floating on water.', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 145, 'What happens if you add a drop of dish soap?', { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      { id: 'a', text: "Floats higher (soap makes water 'slippery')" },
      { id: 'b', text: "Nothing changes (soap doesn't affect floating)" },
      { id: 'c', text: 'Sinks immediately' }
    ];

    options.forEach((option, i) => {
      const y = 195 + i * 55;
      const isSelected = this.twistPrediction === option.id;
      const bgColor = isSelected ? 'rgba(245, 158, 11, 0.3)' : 'rgba(51, 65, 85, 0.5)';

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, option.text, { fill: isSelected ? '#fbbf24' : '#e2e8f0', fontSize: 11 });

      r.addButton({ id: `twist_${option.id}`, label: '', variant: 'secondary' });
    });

    if (this.twistPrediction) {
      r.addButton({ id: 'add_soap', label: 'Add the Soap!', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'The Soap Experiment', { fill: '#f59e0b', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 80, 'The paperclip is floating. Add soap to see what happens!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Water container
    const waterColor = this.soapAdded ? '#a855f7' : '#3b82f6';
    r.roundRect(50, 100, 300, 150, 8, { fill: 'rgba(30, 78, 144, 0.6)' });
    r.roundRect(55, 105, 290, 140, 6, { fill: waterColor });

    // Floating surface (if not sunk)
    if (this.twistClipState === 'floating') {
      r.ellipse(200, 105 + 7, 35, 7, { fill: '#60a5fa', opacity: 0.5 });
    }

    // Paperclip
    this.renderPaperclip(r, 175, this.twistClipY, 1);

    // Soap bottle
    if (!this.soapAdded) {
      r.roundRect(60, 110, 35, 50, 5, { fill: '#a855f7' });
      r.roundRect(65, 95, 25, 20, 3, { fill: '#7c3aed' });
      r.text(77, 140, 'SOAP', { fill: '#ffffff', fontSize: 7, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(77, 175, 'Click to add!', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
      r.addButton({ id: 'add_soap_now', label: '', variant: 'secondary' });
    }

    // Status
    if (this.twistClipState === 'sunk') {
      r.text(200, 90, 'SUNK!', { fill: '#ef4444', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Buttons
    if (this.soapAdded) {
      r.addButton({ id: 'reset_twist', label: 'Reset', variant: 'secondary' });
    }

    if (this.twistClipState === 'sunk' && !this.showTwistResult) {
      r.addButton({ id: 'see_twist_results', label: 'See Results', variant: 'primary' });
    }

    // Results
    if (this.showTwistResult) {
      const correct = this.twistPrediction === 'c';
      r.roundRect(30, 290, 340, 120, 12, { fill: correct ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)' });
      r.text(200, 320, correct ? 'Correct!' : "Dramatic, isn't it?", { fill: correct ? '#10b981' : '#f59e0b', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 350, 'The paperclip sinks immediately!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 375, 'Soap is a surfactant that breaks the', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 395, 'hydrogen bonds creating surface tension.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Understand Why', variant: 'primary' });
    }
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Surface Tension: Make-or-Break', { fill: '#f59e0b', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 85, 340, 130, 12, { fill: 'rgba(245, 158, 11, 0.2)' });
    r.text(200, 110, 'Before vs After Soap', { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Clean water box
    r.roundRect(45, 125, 140, 70, 8, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(115, 145, 'Clean Water', { fill: '#10b981', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(115, 165, 'gamma = 0.073 N/m', { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(115, 185, 'Strong surface tension', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Soapy water box
    r.roundRect(215, 125, 140, 70, 8, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(285, 145, 'Soapy Water', { fill: '#ef4444', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(285, 165, 'gamma ~ 0.025 N/m', { fill: '#f87171', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(285, 185, '~65% reduction!', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    r.roundRect(30, 230, 340, 60, 10, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 255, 'gamma_soap * L * sin(theta) < Weight', { fill: '#ef4444', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 280, 'Surface tension force can no longer support the clip', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(30, 310, 340, 90, 12, { fill: 'rgba(147, 51, 234, 0.2)' });
    r.text(200, 335, 'How Soap Works', { fill: '#a855f7', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 360, 'Soap molecules have hydrophobic tails that', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 380, 'insert between water molecules, disrupting', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 400, 'hydrogen bonds that create surface tension.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Real Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#3b82f6';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 170, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 195, app.tagline, { fill: '#3b82f6', fontSize: 11, textAnchor: 'middle' });

    const words = app.description.split(' ');
    let line = '';
    let lineY = 225;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.roundRect(40, 310, 320, 60, 10, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 335, 'Physics Connection', { fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 358, app.connection, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 400, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    r.text(200, 440, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take the Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Surface Tension Mastery Test', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      r.roundRect(25, 100, 350, 55, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 132, question.question.substring(0, 55) + (question.question.length > 55 ? '...' : ''), { fill: '#3b82f6', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

      question.options.forEach((option, i) => {
        const y = 170 + i * 48;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 42, 8, { fill: bgColor });
        r.text(40, y + 26, `${String.fromCharCode(65 + i)}. ${option.substring(0, 48)}${option.length > 48 ? '...' : ''}`, { fill: isSelected ? '#60a5fa' : '#e2e8f0', fontSize: 10 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: 'Previous', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next', variant: 'secondary' });
      }

      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Test', variant: 'primary' });
      } else {
        r.text(200, 400, `${answered}/10 answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? 'Surface tension mastered!' : 'Keep studying!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.roundRect(30, 280, 340, 120, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Takeaways:', { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 335, 'Surface tension creates supportive "skin"', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 355, 'F = gamma * L * sin(theta)', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 375, 'Soap breaks hydrogen bonds -> sinking', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Complete Journey', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 100, '📎💧', { fontSize: 56, textAnchor: 'middle' });

    r.text(200, 180, 'Surface Tension Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 215, "You understand how water's invisible 'skin'", { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 238, 'can support objects denser than itself!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    const concepts = [
      { icon: '💧', label: 'Surface Tension' },
      { icon: '📎', label: '8x Density Float' },
      { icon: '🧼', label: 'Soap Effect' },
      { icon: '🦟', label: 'Water Striders' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 275 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    r.roundRect(50, 440, 300, 70, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 468, 'Key Formula', { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 495, 'F = gamma * L * sin(theta)', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering surface tension physics!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showResult: this.showResult,
      showTwistResult: this.showTwistResult,
      clipState: this.clipState,
      clipY: this.clipY,
      dropMethod: this.dropMethod,
      dimpleDepth: this.dimpleDepth,
      hasDropped: this.hasDropped,
      soapAdded: this.soapAdded,
      twistClipY: this.twistClipY,
      twistClipState: this.twistClipState,
      animationTime: this.animationTime,
      testAnswers: this.testAnswers,
      currentQuestionIndex: this.currentQuestionIndex,
      showTestResults: this.showTestResults,
      activeAppIndex: this.activeAppIndex,
      completedApps: Array.from(this.completedApps)
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.prediction !== undefined) this.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.showResult !== undefined) this.showResult = state.showResult as boolean;
    if (state.showTwistResult !== undefined) this.showTwistResult = state.showTwistResult as boolean;
    if (state.clipState) this.clipState = state.clipState as 'hovering' | 'floating' | 'sinking';
    if (state.clipY !== undefined) this.clipY = state.clipY as number;
    if (state.dropMethod) this.dropMethod = state.dropMethod as 'gentle' | 'dropped';
    if (state.dimpleDepth !== undefined) this.dimpleDepth = state.dimpleDepth as number;
    if (state.hasDropped !== undefined) this.hasDropped = state.hasDropped as boolean;
    if (state.soapAdded !== undefined) this.soapAdded = state.soapAdded as boolean;
    if (state.twistClipY !== undefined) this.twistClipY = state.twistClipY as number;
    if (state.twistClipState) this.twistClipState = state.twistClipState as 'floating' | 'sinking' | 'sunk';
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createFloatingPaperclipGame(sessionId: string): FloatingPaperclipGame {
  return new FloatingPaperclipGame(sessionId);
}
