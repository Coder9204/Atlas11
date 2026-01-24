// ============================================================================
// STATIC VS KINETIC FRICTION GAME - Server-Side Implementation
// ============================================================================
// Physics: Static friction (mu_s) vs Kinetic friction (mu_k)
// Formula: f_static_max = mu_s * N, f_kinetic = mu_k * N
// Key concept: mu_s > mu_k (harder to start than to keep moving)
// ============================================================================

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// TYPES
// ============================================================================
type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

type Surface = 'wood' | 'rubber' | 'ice';

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number;  // PROTECTED: Never sent to client
  explanation: string;   // PROTECTED: Never sent to client
}

interface SurfaceProperties {
  staticCoef: number;
  kineticCoef: number;
  color: string;
  name: string;
}

// ============================================================================
// CONSTANTS - Protected Server-Side Physics Data
// ============================================================================

// Surface friction coefficients (mu values)
const SURFACE_PROPERTIES: Record<Surface, SurfaceProperties> = {
  wood: { staticCoef: 0.5, kineticCoef: 0.3, color: '#8b7355', name: 'Wood' },
  rubber: { staticCoef: 0.9, kineticCoef: 0.6, color: '#2d2d2d', name: 'Rubber' },
  ice: { staticCoef: 0.1, kineticCoef: 0.03, color: '#a8d5e5', name: 'Ice' }
};

// Block properties
const BLOCK_MASS = 1; // kg
const GRAVITY = 10; // m/s^2 (simplified)
const NORMAL_FORCE = BLOCK_MASS * GRAVITY; // N = mg = 10 N

// Test questions - PROTECTED IP (correctIndex and explanation never sent to client)
const TEST_QUESTIONS: TestQuestion[] = [
  {
    question: "Why does the force needed to START moving a block exceed the force to KEEP it moving?",
    options: [
      "The block gets lighter once moving",
      "Static friction > kinetic friction due to surface interlocking",
      "Air resistance helps once moving",
      "Gravity changes direction"
    ],
    correctIndex: 1,
    explanation: "At rest, surfaces interlock more completely. Once sliding, the microscopic bonds keep breaking before they fully form, resulting in lower kinetic friction."
  },
  {
    question: "Static friction is:",
    options: [
      "Always equal to applied force up to a maximum",
      "Always at its maximum value",
      "Zero until the object moves",
      "Greater than kinetic friction always"
    ],
    correctIndex: 0,
    explanation: "Static friction matches the applied force exactly (preventing motion) until the maximum static friction is reached - then the object slips."
  },
  {
    question: "When a heavy box finally starts sliding, you notice:",
    options: [
      "You need to push harder to keep it moving",
      "You can push lighter to keep it moving",
      "The force stays exactly the same",
      "The box accelerates infinitely"
    ],
    correctIndex: 1,
    explanation: "Once the box breaks free (overcomes static friction), kinetic friction takes over, which is lower. You need less force to maintain motion."
  },
  {
    question: "Why does rubber have higher friction coefficients than ice?",
    options: [
      "Rubber is heavier",
      "Rubber deforms and interlocks with surfaces more",
      "Ice is colder",
      "Rubber is stickier due to glue"
    ],
    correctIndex: 1,
    explanation: "Rubber is soft and deforms around surface irregularities, creating more contact area and mechanical interlocking. Ice is hard and smooth with minimal interlocking."
  },
  {
    question: "If you double the weight on a block, friction force:",
    options: [
      "Stays the same",
      "Doubles (proportional to normal force)",
      "Halves",
      "Becomes zero"
    ],
    correctIndex: 1,
    explanation: "Friction force = mu * Normal force. Doubling the weight doubles the normal force, which doubles the friction force (both static and kinetic)."
  },
  {
    question: "Anti-lock brakes (ABS) work by:",
    options: [
      "Increasing kinetic friction",
      "Keeping tires at static friction (not sliding)",
      "Heating up the brakes",
      "Making tires lighter"
    ],
    correctIndex: 1,
    explanation: "ABS prevents wheels from locking (sliding). Static friction between tire and road is higher than kinetic, giving better stopping power."
  },
  {
    question: "The coefficient of friction is:",
    options: [
      "Always greater than 1",
      "A ratio of friction force to normal force",
      "Measured in Newtons",
      "The same for all materials"
    ],
    correctIndex: 1,
    explanation: "The friction coefficient (mu) is the ratio of friction force to normal force: mu = f/N. It's dimensionless and depends on the materials in contact."
  },
  {
    question: "Oil reduces friction by:",
    options: [
      "Making surfaces heavier",
      "Preventing direct surface contact",
      "Cooling the surfaces",
      "Increasing the normal force"
    ],
    correctIndex: 1,
    explanation: "Oil creates a thin layer between surfaces, preventing the microscopic interlocking that causes friction. This is called lubrication."
  },
  {
    question: "On a force-time graph during a pull test, the peak represents:",
    options: [
      "Kinetic friction",
      "Maximum static friction (just before slip)",
      "The weight of the object",
      "Air resistance"
    ],
    correctIndex: 1,
    explanation: "The peak in the force-time graph is the moment static friction reaches its maximum, just before the object starts to slide."
  },
  {
    question: "Walking relies on friction. Without it, you would:",
    options: [
      "Walk faster",
      "Slip backward when pushing off",
      "Float upward",
      "Walk normally"
    ],
    correctIndex: 1,
    explanation: "When you push backward with your foot, friction pushes you forward. Without friction (like on ice), your foot slides back and you can't walk."
  }
];

// Real-world applications
const APPLICATIONS = [
  {
    title: "Car Tires & Grip",
    description: "Tire tread patterns maximize friction with road surfaces. Racing slicks use smooth rubber for max contact on dry tracks, while treaded tires channel water for wet grip.",
    stats: "mu rubber-asphalt = 0.7-0.9"
  },
  {
    title: "Sports Footwear",
    description: "Basketball shoes maximize court grip for quick stops and pivots. Different sports require different friction profiles - spikes for grass, smooth soles for courts.",
    stats: "Court shoes: mu = 0.8+"
  },
  {
    title: "Brake Systems",
    description: "Brake pads convert kinetic energy to heat through friction. ABS keeps tires in static friction regime - wheels roll rather than slide for maximum stopping power.",
    stats: "Brake pad mu = 0.35-0.45"
  },
  {
    title: "Rock Climbing",
    description: "Climbers use chalk to increase hand-rock friction. Climbing shoes have sticky rubber compounds with friction coefficients exceeding 1.0 on textured rock.",
    stats: "Climbing rubber mu > 1.0"
  }
];

// ============================================================================
// MAIN GAME CLASS
// ============================================================================
export class StaticKineticFrictionGame extends BaseGame {
  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private surface: Surface = 'wood';
  private isPulling: boolean = false;
  private hasSlipped: boolean = false;
  private currentForce: number = 0;
  private blockPosition: number = 0;
  private forceHistory: number[] = [];
  private peakForce: number = 0;
  private steadyForce: number = 0;
  private experimentCount: number = 0;
  private animationTime: number = 0;

  // Test state
  private currentQuestion: number = 0;
  private selectedAnswer: number | null = null;
  private showExplanation: boolean = false;
  private correctAnswers: number = 0;
  private answeredQuestions: Set<number> = new Set();

  // Transfer state
  private activeApp: number = 0;
  private completedApps: Set<number> = new Set();

  // UI state
  private hoveredElement: string | null = null;
  private lastInteractionTime: number = 0;

  constructor(sessionId: string, config?: SessionConfig) {
    super(sessionId, config);
  }

  // ============================================================================
  // PROTECTED PHYSICS CALCULATIONS (Never sent to client)
  // ============================================================================

  /**
   * Calculate maximum static friction force
   * f_s_max = mu_s * N = mu_s * m * g
   */
  private calculateStaticFrictionMax(surface: Surface): number {
    const props = SURFACE_PROPERTIES[surface];
    return props.staticCoef * NORMAL_FORCE;
  }

  /**
   * Calculate kinetic friction force
   * f_k = mu_k * N = mu_k * m * g
   */
  private calculateKineticFriction(surface: Surface): number {
    const props = SURFACE_PROPERTIES[surface];
    return props.kineticCoef * NORMAL_FORCE;
  }

  /**
   * Calculate static/kinetic friction ratio
   * ratio = mu_s / mu_k
   */
  private calculateFrictionRatio(surface: Surface): number {
    const props = SURFACE_PROPERTIES[surface];
    return props.staticCoef / props.kineticCoef;
  }

  /**
   * Check if object will slip given applied force
   * Slips when F_applied > f_s_max
   */
  private willSlip(appliedForce: number, surface: Surface): boolean {
    const staticMax = this.calculateStaticFrictionMax(surface);
    return appliedForce >= staticMax;
  }

  /**
   * Get surface properties
   */
  private getSurfaceProperties(surface: Surface): SurfaceProperties {
    return SURFACE_PROPERTIES[surface];
  }

  // ============================================================================
  // GAME LOGIC
  // ============================================================================

  handleInput(input: UserInput): void {
    const now = Date.now();
    if (now - this.lastInteractionTime < 100) return;
    this.lastInteractionTime = now;

    const { type, payload } = input;

    if (type === 'click') {
      this.handleClick(payload?.element as string, payload);
    } else if (type === 'hover') {
      this.hoveredElement = payload?.element as string || null;
    } else if (type === 'answer') {
      this.handleAnswer(payload?.answerIndex as number);
    }
  }

  private handleClick(element: string, payload?: Record<string, unknown>): void {
    switch (element) {
      // Navigation
      case 'start':
      case 'next_phase':
        this.advancePhase();
        break;
      case 'back':
        this.goBack();
        break;

      // Predictions
      case 'prediction':
        if (payload?.value) {
          this.prediction = payload.value as string;
        }
        break;
      case 'twist_prediction':
        if (payload?.value) {
          this.twistPrediction = payload.value as string;
        }
        break;

      // Simulation controls
      case 'start_pull':
        this.startPulling();
        break;
      case 'reset':
        this.resetExperiment();
        break;
      case 'surface_wood':
        this.setSurface('wood');
        break;
      case 'surface_rubber':
        this.setSurface('rubber');
        break;
      case 'surface_ice':
        this.setSurface('ice');
        break;

      // Test navigation
      case 'next_question':
        if (this.currentQuestion < TEST_QUESTIONS.length - 1) {
          this.currentQuestion++;
          this.selectedAnswer = null;
          this.showExplanation = this.answeredQuestions.has(this.currentQuestion);
        }
        break;
      case 'prev_question':
        if (this.currentQuestion > 0) {
          this.currentQuestion--;
          this.selectedAnswer = null;
          this.showExplanation = this.answeredQuestions.has(this.currentQuestion);
        }
        break;

      // Transfer tabs
      case 'app_tab':
        if (payload?.index !== undefined) {
          const idx = payload.index as number;
          if (idx === 0 || this.completedApps.has(idx - 1)) {
            this.activeApp = idx;
          }
        }
        break;
      case 'mark_read':
        this.completedApps.add(this.activeApp);
        if (this.activeApp < APPLICATIONS.length - 1) {
          this.activeApp++;
        }
        break;

      // Restart
      case 'restart':
        this.resetGame();
        break;
    }
  }

  private handleAnswer(answerIndex: number): void {
    if (this.phase !== 'test' || this.answeredQuestions.has(this.currentQuestion)) {
      return;
    }

    this.selectedAnswer = answerIndex;
    this.showExplanation = true;
    this.answeredQuestions.add(this.currentQuestion);

    // Check answer server-side (correctIndex never sent to client)
    if (answerIndex === TEST_QUESTIONS[this.currentQuestion].correctIndex) {
      this.correctAnswers++;
    }
  }

  private advancePhase(): void {
    const phases: GamePhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phases.indexOf(this.phase);
    if (currentIndex < phases.length - 1) {
      this.phase = phases[currentIndex + 1];
    }
  }

  private goBack(): void {
    const phases: GamePhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phases.indexOf(this.phase);
    if (currentIndex > 0) {
      this.phase = phases[currentIndex - 1];
    }
  }

  private startPulling(): void {
    if (this.isPulling) return;
    this.isPulling = true;
    this.hasSlipped = false;
    this.currentForce = 0;
    this.blockPosition = 0;
    this.forceHistory = [];
    this.peakForce = 0;
    this.steadyForce = 0;
    this.animationTime = 0;
  }

  private resetExperiment(): void {
    this.isPulling = false;
    this.hasSlipped = false;
    this.currentForce = 0;
    this.blockPosition = 0;
    this.forceHistory = [];
    this.peakForce = 0;
    this.steadyForce = 0;
    this.animationTime = 0;
  }

  private setSurface(surface: Surface): void {
    if (this.isPulling) return;
    this.surface = surface;
    this.resetExperiment();
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.surface = 'wood';
    this.resetExperiment();
    this.experimentCount = 0;
    this.currentQuestion = 0;
    this.selectedAnswer = null;
    this.showExplanation = false;
    this.correctAnswers = 0;
    this.answeredQuestions = new Set();
    this.activeApp = 0;
    this.completedApps = new Set();
  }

  update(deltaTime: number): void {
    if (!this.isPulling) return;

    this.animationTime += deltaTime;

    const staticMax = this.calculateStaticFrictionMax(this.surface);
    const kineticFriction = this.calculateKineticFriction(this.surface);

    if (!this.hasSlipped) {
      // Gradually increase applied force
      this.currentForce += 0.15 * (deltaTime / 16);

      if (this.currentForce >= staticMax) {
        // Object slips!
        this.hasSlipped = true;
        this.peakForce = this.currentForce;
        this.currentForce = kineticFriction + 0.5;
        this.steadyForce = kineticFriction;
      }
    } else {
      // Object is sliding - maintain kinetic friction with some variation
      this.blockPosition += 0.8 * (deltaTime / 16);
      this.currentForce = kineticFriction + Math.sin(this.blockPosition * 0.1) * 0.3 + 0.3;
    }

    this.forceHistory.push(this.currentForce);
    if (this.forceHistory.length > 200) {
      this.forceHistory.shift();
    }

    // Check if experiment complete
    if (this.blockPosition >= 100) {
      this.isPulling = false;
      this.experimentCount++;
    }
  }

  render(): GameFrame {
    const renderer = new CommandRenderer(400, 500);

    switch (this.phase) {
      case 'hook':
        this.renderHook(renderer);
        break;
      case 'predict':
        this.renderPredict(renderer);
        break;
      case 'play':
        this.renderPlay(renderer);
        break;
      case 'review':
        this.renderReview(renderer);
        break;
      case 'twist_predict':
        this.renderTwistPredict(renderer);
        break;
      case 'twist_play':
        this.renderTwistPlay(renderer);
        break;
      case 'twist_review':
        this.renderTwistReview(renderer);
        break;
      case 'transfer':
        this.renderTransfer(renderer);
        break;
      case 'test':
        this.renderTest(renderer);
        break;
      case 'mastery':
        this.renderMastery(renderer);
        break;
    }

    return renderer.getFrame();
  }

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  private renderHook(renderer: CommandRenderer): void {
    // Background
    renderer.drawRect(0, 0, 400, 500, { fillColor: '#0c0a0e' });

    // Gradient overlay
    renderer.drawRect(0, 0, 400, 250, {
      fillColor: 'rgba(245, 158, 11, 0.08)'
    });

    // Title icon (box)
    renderer.drawRect(165, 80, 70, 55, {
      fillColor: '#6366f1',
      cornerRadius: 8
    });
    renderer.drawText('1 kg', 200, 115, {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: 'bold',
      align: 'center'
    });

    // Arrow showing motion attempt
    renderer.drawLine(235, 107, 280, 107, {
      strokeColor: '#f59e0b',
      strokeWidth: 3
    });
    renderer.drawLine(270, 100, 280, 107, {
      strokeColor: '#f59e0b',
      strokeWidth: 3
    });
    renderer.drawLine(270, 114, 280, 107, {
      strokeColor: '#f59e0b',
      strokeWidth: 3
    });

    // Friction arrow
    renderer.drawLine(165, 135, 120, 135, {
      strokeColor: '#ef4444',
      strokeWidth: 2
    });
    renderer.drawText('friction', 143, 150, {
      color: '#ef4444',
      fontSize: 11,
      align: 'center'
    });

    // Title
    renderer.drawText('The Friction Force Jump', 200, 200, {
      color: '#f8f6fa',
      fontSize: 26,
      fontWeight: 'bold',
      align: 'center'
    });

    // Subtitle
    renderer.drawText('Pull a heavy box across the floor.', 200, 235, {
      color: '#a8a0b4',
      fontSize: 15,
      align: 'center'
    });
    renderer.drawText('Something strange happens when it starts sliding...', 200, 255, {
      color: '#a8a0b4',
      fontSize: 15,
      align: 'center'
    });

    // Key question box
    renderer.drawRect(40, 290, 320, 60, {
      fillColor: 'rgba(120, 53, 15, 0.4)',
      strokeColor: 'rgba(245, 158, 11, 0.3)',
      cornerRadius: 12
    });
    renderer.drawText('"Is it harder to START sliding', 200, 315, {
      color: '#fbbf24',
      fontSize: 16,
      fontWeight: '600',
      align: 'center'
    });
    renderer.drawText('or to KEEP sliding?"', 200, 335, {
      color: '#fbbf24',
      fontSize: 16,
      fontWeight: '600',
      align: 'center'
    });

    // Start button
    const startHovered = this.hoveredElement === 'start';
    renderer.drawRect(120, 380, 160, 50, {
      fillColor: startHovered ? '#fbbf24' : '#f59e0b',
      cornerRadius: 12
    });
    renderer.drawText("Let's Find Out", 200, 412, {
      color: '#000000',
      fontSize: 16,
      fontWeight: 'bold',
      align: 'center'
    });
    renderer.addInteractiveElement('start', { x: 120, y: 380, width: 160, height: 50 });

    // Footer
    renderer.drawText('Static vs Kinetic Friction', 200, 465, {
      color: '#685c78',
      fontSize: 12,
      align: 'center'
    });
  }

  private renderPredict(renderer: CommandRenderer): void {
    renderer.drawRect(0, 0, 400, 500, { fillColor: '#0c0a0e' });

    // Icon
    renderer.drawText('?', 200, 70, {
      color: '#f59e0b',
      fontSize: 48,
      fontWeight: 'bold',
      align: 'center'
    });

    // Title
    renderer.drawText('Make Your Prediction', 200, 120, {
      color: '#f8f6fa',
      fontSize: 22,
      fontWeight: 'bold',
      align: 'center'
    });

    renderer.drawText('When pulling a block, which requires more force?', 200, 150, {
      color: '#a8a0b4',
      fontSize: 14,
      align: 'center'
    });

    // Prediction options
    const options = [
      { id: 'start_harder', label: 'Starting to slide requires more force', icon: 'A' },
      { id: 'keep_harder', label: 'Keeping it sliding requires more force', icon: 'B' },
      { id: 'same', label: 'Both require the same force', icon: 'C' }
    ];

    options.forEach((option, idx) => {
      const y = 190 + idx * 70;
      const isSelected = this.prediction === option.id;
      const isHovered = this.hoveredElement === `prediction_${option.id}`;

      renderer.drawRect(40, y, 320, 55, {
        fillColor: isSelected ? 'rgba(120, 53, 15, 0.5)' : (isHovered ? '#1c1622' : '#141018'),
        strokeColor: isSelected ? '#f59e0b' : 'rgba(168, 160, 180, 0.12)',
        strokeWidth: isSelected ? 2 : 1,
        cornerRadius: 10
      });

      renderer.drawText(option.icon, 70, y + 34, {
        color: isSelected ? '#f59e0b' : '#a8a0b4',
        fontSize: 18,
        fontWeight: 'bold',
        align: 'center'
      });

      renderer.drawText(option.label, 210, y + 34, {
        color: '#f8f6fa',
        fontSize: 14,
        align: 'center'
      });

      renderer.addInteractiveElement(`prediction_${option.id}`, {
        x: 40, y, width: 320, height: 55
      }, { element: 'prediction', value: option.id });
    });

    // Continue button
    if (this.prediction) {
      const btnHovered = this.hoveredElement === 'next_phase';
      renderer.drawRect(120, 420, 160, 45, {
        fillColor: btnHovered ? '#fbbf24' : '#f59e0b',
        cornerRadius: 10
      });
      renderer.drawText('Test It!', 200, 450, {
        color: '#000000',
        fontSize: 15,
        fontWeight: 'bold',
        align: 'center'
      });
      renderer.addInteractiveElement('next_phase', { x: 120, y: 420, width: 160, height: 45 });
    }
  }

  private renderPlay(renderer: CommandRenderer): void {
    renderer.drawRect(0, 0, 400, 500, { fillColor: '#0c0a0e' });

    // Render simulation
    this.renderSimulation(renderer, 0);

    // Controls section
    renderer.drawRect(0, 290, 400, 210, {
      fillColor: '#141018',
      strokeColor: 'rgba(168, 160, 180, 0.12)'
    });

    // Friction values display
    const staticMax = this.calculateStaticFrictionMax(this.surface);
    const kineticFriction = this.calculateKineticFriction(this.surface);

    renderer.drawText('Static Max', 120, 320, {
      color: '#ef4444',
      fontSize: 11,
      fontWeight: '600',
      align: 'center'
    });
    renderer.drawText(`${staticMax.toFixed(1)}N`, 120, 340, {
      color: '#ef4444',
      fontSize: 20,
      fontWeight: 'bold',
      align: 'center'
    });

    renderer.drawText('Kinetic', 280, 320, {
      color: '#f59e0b',
      fontSize: 11,
      fontWeight: '600',
      align: 'center'
    });
    renderer.drawText(`${kineticFriction.toFixed(1)}N`, 280, 340, {
      color: '#f59e0b',
      fontSize: 20,
      fontWeight: 'bold',
      align: 'center'
    });

    // Action buttons
    if (!this.isPulling && this.blockPosition === 0) {
      const pullHovered = this.hoveredElement === 'start_pull';
      renderer.drawRect(140, 370, 120, 40, {
        fillColor: pullHovered ? '#22c55e' : '#16a34a',
        cornerRadius: 8
      });
      renderer.drawText('Start Pulling!', 200, 396, {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold',
        align: 'center'
      });
      renderer.addInteractiveElement('start_pull', { x: 140, y: 370, width: 120, height: 40 });
    } else {
      const resetHovered = this.hoveredElement === 'reset';
      renderer.drawRect(140, 370, 120, 40, {
        fillColor: resetHovered ? '#1c1622' : '#141018',
        strokeColor: 'rgba(168, 160, 180, 0.12)',
        cornerRadius: 8
      });
      renderer.drawText('Reset', 200, 396, {
        color: '#a8a0b4',
        fontSize: 14,
        fontWeight: '600',
        align: 'center'
      });
      renderer.addInteractiveElement('reset', { x: 140, y: 370, width: 120, height: 40 });
    }

    // Hint text
    renderer.drawText('Watch the force graph! Notice the peak then drop.', 200, 430, {
      color: '#685c78',
      fontSize: 12,
      align: 'center'
    });

    // Continue button after experiments
    if (this.experimentCount >= 2) {
      const nextHovered = this.hoveredElement === 'next_phase';
      renderer.drawRect(120, 455, 160, 35, {
        fillColor: nextHovered ? '#fbbf24' : '#f59e0b',
        cornerRadius: 8
      });
      renderer.drawText('I see the pattern!', 200, 478, {
        color: '#000000',
        fontSize: 13,
        fontWeight: 'bold',
        align: 'center'
      });
      renderer.addInteractiveElement('next_phase', { x: 120, y: 455, width: 160, height: 35 });
    }
  }

  private renderSimulation(renderer: CommandRenderer, yOffset: number): void {
    const surfaceY = 160 + yOffset;
    const blockWidth = 60;
    const blockHeight = 45;
    const blockX = 80 + this.blockPosition * 1.5;

    const props = this.getSurfaceProperties(this.surface);

    // Surface
    renderer.drawRect(20, surfaceY, 360, 18, {
      fillColor: props.color,
      cornerRadius: 3
    });
    renderer.drawText(props.name, 370, surfaceY + 32, {
      color: '#685c78',
      fontSize: 11,
      align: 'end'
    });

    // Block
    renderer.drawRect(blockX, surfaceY - blockHeight, blockWidth, blockHeight, {
      fillColor: '#6366f1',
      cornerRadius: 6
    });
    renderer.drawText('1 kg', blockX + blockWidth / 2, surfaceY - blockHeight / 2 + 5, {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: 'bold',
      align: 'center'
    });

    // Spring/Pull mechanism
    const springStartX = blockX + blockWidth;
    const springEndX = springStartX + 60 + this.currentForce * 2;

    // Draw spring coils
    for (let i = 0; i < 8; i++) {
      const x1 = springStartX + 10 + i * 6;
      const x2 = springStartX + 16 + i * 6;
      const y1 = surfaceY - blockHeight / 2 + (i % 2 === 0 ? -8 : 8);
      const y2 = surfaceY - blockHeight / 2 + (i % 2 === 0 ? 8 : -8);
      renderer.drawLine(x1, y1, x2, y2, {
        strokeColor: '#22c55e',
        strokeWidth: 3
      });
    }

    // Pull handle
    renderer.drawCircle(springEndX, surfaceY - blockHeight / 2, 14, {
      fillColor: '#f59e0b',
      strokeColor: '#ffffff',
      strokeWidth: 2
    });

    // Force display
    renderer.drawText(`${this.currentForce.toFixed(1)}N`, springEndX, surfaceY - blockHeight / 2 - 25, {
      color: '#f59e0b',
      fontSize: 13,
      fontWeight: 'bold',
      align: 'center'
    });

    // Friction arrow when force applied
    if (this.currentForce > 0) {
      const arrowLength = Math.min(this.currentForce * 3, 45);
      renderer.drawLine(blockX, surfaceY - 5, blockX - arrowLength, surfaceY - 5, {
        strokeColor: this.hasSlipped ? '#f59e0b' : '#ef4444',
        strokeWidth: 3
      });
      renderer.drawText(this.hasSlipped ? 'Kinetic' : 'Static', blockX - arrowLength / 2, surfaceY - 18, {
        color: this.hasSlipped ? '#f59e0b' : '#ef4444',
        fontSize: 10,
        fontWeight: '600',
        align: 'center'
      });
    }

    // Force-Time Graph
    const graphY = surfaceY + 40;
    const graphHeight = 80;
    const graphWidth = 340;

    renderer.drawRect(30, graphY, graphWidth, graphHeight, {
      fillColor: '#141018',
      strokeColor: 'rgba(168, 160, 180, 0.12)',
      cornerRadius: 8
    });

    renderer.drawText('Force (N)', 40, graphY + 14, {
      color: '#a8a0b4',
      fontSize: 9
    });
    renderer.drawText('Time', graphWidth + 10, graphY + graphHeight - 10, {
      color: '#a8a0b4',
      fontSize: 9,
      align: 'end'
    });

    const staticMax = this.calculateStaticFrictionMax(this.surface);
    const kineticFriction = this.calculateKineticFriction(this.surface);

    // Static friction reference line
    const staticLineY = graphY + graphHeight - (staticMax / 10) * (graphHeight - 20) - 10;
    renderer.drawLine(38, staticLineY, graphWidth + 22, staticLineY, {
      strokeColor: 'rgba(239, 68, 68, 0.4)',
      strokeWidth: 1
    });
    renderer.drawText('mus', graphWidth + 15, staticLineY - 5, {
      color: '#ef4444',
      fontSize: 8,
      align: 'end'
    });

    // Kinetic friction reference line
    const kineticLineY = graphY + graphHeight - (kineticFriction / 10) * (graphHeight - 20) - 10;
    renderer.drawLine(38, kineticLineY, graphWidth + 22, kineticLineY, {
      strokeColor: 'rgba(245, 158, 11, 0.4)',
      strokeWidth: 1
    });
    renderer.drawText('muk', graphWidth + 15, kineticLineY - 5, {
      color: '#f59e0b',
      fontSize: 8,
      align: 'end'
    });

    // Force trace
    if (this.forceHistory.length > 1) {
      for (let i = 1; i < this.forceHistory.length; i++) {
        const x1 = 38 + ((i - 1) / 150) * (graphWidth - 16);
        const x2 = 38 + (i / 150) * (graphWidth - 16);
        const y1 = graphY + graphHeight - (this.forceHistory[i - 1] / 10) * (graphHeight - 20) - 10;
        const y2 = graphY + graphHeight - (this.forceHistory[i] / 10) * (graphHeight - 20) - 10;
        renderer.drawLine(x1, y1, x2, y2, {
          strokeColor: '#22c55e',
          strokeWidth: 2
        });
      }
    }

    // Peak marker
    if (this.peakForce > 0 && this.forceHistory.length > 0) {
      const maxForceIdx = this.forceHistory.indexOf(Math.max(...this.forceHistory));
      const peakX = 38 + (maxForceIdx / 150) * (graphWidth - 16);
      const peakY = graphY + graphHeight - (this.peakForce / 10) * (graphHeight - 20) - 10;
      renderer.drawCircle(peakX, peakY, 5, {
        fillColor: '#ef4444'
      });
      renderer.drawText('Peak!', peakX, peakY - 12, {
        color: '#ef4444',
        fontSize: 9,
        fontWeight: 'bold',
        align: 'center'
      });
    }
  }

  private renderReview(renderer: CommandRenderer): void {
    renderer.drawRect(0, 0, 400, 500, { fillColor: '#0c0a0e' });

    // Light bulb icon
    renderer.drawText('*', 200, 60, {
      color: '#fbbf24',
      fontSize: 48,
      align: 'center'
    });

    // Title
    renderer.drawText('Static > Kinetic Friction!', 200, 110, {
      color: '#f8f6fa',
      fontSize: 22,
      fontWeight: 'bold',
      align: 'center'
    });

    // Main insight box
    renderer.drawRect(30, 130, 340, 80, {
      fillColor: '#141018',
      strokeColor: 'rgba(168, 160, 180, 0.12)',
      cornerRadius: 12
    });
    renderer.drawText("It's harder to START sliding", 200, 160, {
      color: '#f59e0b',
      fontSize: 16,
      fontWeight: '600',
      align: 'center'
    });
    renderer.drawText('than to KEEP sliding!', 200, 185, {
      color: '#f59e0b',
      fontSize: 16,
      fontWeight: '600',
      align: 'center'
    });

    // Explanation
    renderer.drawText('When surfaces are at rest, they interlock', 200, 230, {
      color: '#a8a0b4',
      fontSize: 13,
      align: 'center'
    });
    renderer.drawText('more completely at the microscopic level.', 200, 248, {
      color: '#a8a0b4',
      fontSize: 13,
      align: 'center'
    });

    // Static friction box
    renderer.drawRect(30, 275, 340, 55, {
      fillColor: 'rgba(239, 68, 68, 0.1)',
      strokeColor: 'rgba(239, 68, 68, 0.3)',
      cornerRadius: 10
    });
    renderer.drawText('Static Friction:', 200, 298, {
      color: '#ef4444',
      fontSize: 13,
      fontWeight: '600',
      align: 'center'
    });
    renderer.drawText('Full interlocking -> Maximum resistance', 200, 318, {
      color: '#f8f6fa',
      fontSize: 12,
      align: 'center'
    });

    // Kinetic friction box
    renderer.drawRect(30, 340, 340, 55, {
      fillColor: 'rgba(245, 158, 11, 0.1)',
      strokeColor: 'rgba(245, 158, 11, 0.3)',
      cornerRadius: 10
    });
    renderer.drawText('Kinetic Friction:', 200, 363, {
      color: '#f59e0b',
      fontSize: 13,
      fontWeight: '600',
      align: 'center'
    });
    renderer.drawText('Bonds break before fully forming', 200, 383, {
      color: '#f8f6fa',
      fontSize: 12,
      align: 'center'
    });

    // Prediction feedback
    const wasCorrect = this.prediction === 'start_harder';
    renderer.drawText(
      wasCorrect ? 'Your prediction: Correct!' : 'Your prediction: Now you understand!',
      200, 420,
      {
        color: wasCorrect ? '#10b981' : '#a8a0b4',
        fontSize: 13,
        align: 'center'
      }
    );

    // Continue button
    const nextHovered = this.hoveredElement === 'next_phase';
    renderer.drawRect(80, 445, 240, 40, {
      fillColor: nextHovered ? '#fbbf24' : '#f59e0b',
      cornerRadius: 10
    });
    renderer.drawText('What About Different Surfaces?', 200, 472, {
      color: '#000000',
      fontSize: 13,
      fontWeight: 'bold',
      align: 'center'
    });
    renderer.addInteractiveElement('next_phase', { x: 80, y: 445, width: 240, height: 40 });
  }

  private renderTwistPredict(renderer: CommandRenderer): void {
    renderer.drawRect(0, 0, 400, 500, { fillColor: '#0c0a0e' });

    // Ice cube icon
    renderer.drawRect(175, 50, 50, 50, {
      fillColor: '#a8d5e5',
      cornerRadius: 8
    });
    renderer.drawText('ICE', 200, 82, {
      color: '#0c0a0e',
      fontSize: 12,
      fontWeight: 'bold',
      align: 'center'
    });

    // Title
    renderer.drawText('Plot Twist: Change the Surface!', 200, 130, {
      color: '#f8f6fa',
      fontSize: 20,
      fontWeight: 'bold',
      align: 'center'
    });

    renderer.drawText('How does the surface material', 200, 160, {
      color: '#a8a0b4',
      fontSize: 14,
      align: 'center'
    });
    renderer.drawText('affect the friction "jump"?', 200, 180, {
      color: '#a8a0b4',
      fontSize: 14,
      align: 'center'
    });

    // Options
    const options = [
      { id: 'same_ratio', label: 'Same ratio - all surfaces behave the same' },
      { id: 'different', label: 'Different surfaces have different ratios' },
      { id: 'ice_no_jump', label: 'Ice has almost no friction jump' }
    ];

    options.forEach((option, idx) => {
      const y = 210 + idx * 60;
      const isSelected = this.twistPrediction === option.id;
      const isHovered = this.hoveredElement === `twist_${option.id}`;

      renderer.drawRect(40, y, 320, 50, {
        fillColor: isSelected ? 'rgba(120, 53, 15, 0.5)' : (isHovered ? '#1c1622' : '#141018'),
        strokeColor: isSelected ? '#f59e0b' : 'rgba(168, 160, 180, 0.12)',
        strokeWidth: isSelected ? 2 : 1,
        cornerRadius: 10
      });

      renderer.drawText(option.label, 200, y + 32, {
        color: '#f8f6fa',
        fontSize: 13,
        align: 'center'
      });

      renderer.addInteractiveElement(`twist_${option.id}`, {
        x: 40, y, width: 320, height: 50
      }, { element: 'twist_prediction', value: option.id });
    });

    // Continue button
    if (this.twistPrediction) {
      const btnHovered = this.hoveredElement === 'next_phase';
      renderer.drawRect(120, 420, 160, 45, {
        fillColor: btnHovered ? '#fbbf24' : '#f59e0b',
        cornerRadius: 10
      });
      renderer.drawText('Compare Surfaces!', 200, 450, {
        color: '#000000',
        fontSize: 14,
        fontWeight: 'bold',
        align: 'center'
      });
      renderer.addInteractiveElement('next_phase', { x: 120, y: 420, width: 160, height: 45 });
    }
  }

  private renderTwistPlay(renderer: CommandRenderer): void {
    renderer.drawRect(0, 0, 400, 500, { fillColor: '#0c0a0e' });

    // Render simulation
    this.renderSimulation(renderer, 0);

    // Controls section
    renderer.drawRect(0, 290, 400, 210, {
      fillColor: '#141018',
      strokeColor: 'rgba(168, 160, 180, 0.12)'
    });

    // Surface selector
    const surfaces: Surface[] = ['wood', 'rubber', 'ice'];
    surfaces.forEach((s, idx) => {
      const x = 70 + idx * 100;
      const isSelected = this.surface === s;
      const isHovered = this.hoveredElement === `surface_${s}`;
      const props = SURFACE_PROPERTIES[s];

      renderer.drawRect(x, 305, 80, 35, {
        fillColor: isSelected ? props.color : (isHovered ? '#1c1622' : '#141018'),
        strokeColor: isSelected ? '#ffffff' : 'rgba(168, 160, 180, 0.12)',
        cornerRadius: 8
      });
      renderer.drawText(props.name, x + 40, 328, {
        color: isSelected ? '#ffffff' : '#a8a0b4',
        fontSize: 13,
        fontWeight: isSelected ? 'bold' : 'normal',
        align: 'center'
      });
      renderer.addInteractiveElement(`surface_${s}`, { x, y: 305, width: 80, height: 35 });
    });

    // Coefficient display
    const props = this.getSurfaceProperties(this.surface);
    const ratio = this.calculateFrictionRatio(this.surface);

    // mu_s display
    renderer.drawRect(50, 355, 70, 50, {
      fillColor: '#1c1622',
      cornerRadius: 8
    });
    renderer.drawText('mus', 85, 372, {
      color: '#685c78',
      fontSize: 10,
      align: 'center'
    });
    renderer.drawText(props.staticCoef.toString(), 85, 395, {
      color: '#ef4444',
      fontSize: 18,
      fontWeight: 'bold',
      align: 'center'
    });

    // mu_k display
    renderer.drawRect(165, 355, 70, 50, {
      fillColor: '#1c1622',
      cornerRadius: 8
    });
    renderer.drawText('muk', 200, 372, {
      color: '#685c78',
      fontSize: 10,
      align: 'center'
    });
    renderer.drawText(props.kineticCoef.toString(), 200, 395, {
      color: '#f59e0b',
      fontSize: 18,
      fontWeight: 'bold',
      align: 'center'
    });

    // Ratio display
    renderer.drawRect(280, 355, 70, 50, {
      fillColor: '#1c1622',
      cornerRadius: 8
    });
    renderer.drawText('Ratio', 315, 372, {
      color: '#685c78',
      fontSize: 10,
      align: 'center'
    });
    renderer.drawText(`${ratio.toFixed(1)}x`, 315, 395, {
      color: '#10b981',
      fontSize: 18,
      fontWeight: 'bold',
      align: 'center'
    });

    // Action buttons
    if (!this.isPulling && this.blockPosition === 0) {
      const pullHovered = this.hoveredElement === 'start_pull';
      renderer.drawRect(140, 420, 120, 35, {
        fillColor: pullHovered ? '#22c55e' : '#16a34a',
        cornerRadius: 8
      });
      renderer.drawText('Pull!', 200, 444, {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold',
        align: 'center'
      });
      renderer.addInteractiveElement('start_pull', { x: 140, y: 420, width: 120, height: 35 });
    } else {
      const resetHovered = this.hoveredElement === 'reset';
      renderer.drawRect(140, 420, 120, 35, {
        fillColor: resetHovered ? '#1c1622' : '#141018',
        strokeColor: 'rgba(168, 160, 180, 0.12)',
        cornerRadius: 8
      });
      renderer.drawText('Reset', 200, 444, {
        color: '#a8a0b4',
        fontSize: 14,
        fontWeight: '600',
        align: 'center'
      });
      renderer.addInteractiveElement('reset', { x: 140, y: 420, width: 120, height: 35 });
    }

    // Continue after enough experiments
    if (this.experimentCount >= 4) {
      const nextHovered = this.hoveredElement === 'next_phase';
      renderer.drawRect(120, 465, 160, 30, {
        fillColor: nextHovered ? '#fbbf24' : '#f59e0b',
        cornerRadius: 8
      });
      renderer.drawText('I understand!', 200, 485, {
        color: '#000000',
        fontSize: 12,
        fontWeight: 'bold',
        align: 'center'
      });
      renderer.addInteractiveElement('next_phase', { x: 120, y: 465, width: 160, height: 30 });
    }
  }

  private renderTwistReview(renderer: CommandRenderer): void {
    renderer.drawRect(0, 0, 400, 500, { fillColor: '#0c0a0e' });

    // Microscope icon
    renderer.drawText('M', 200, 60, {
      color: '#06b6d4',
      fontSize: 40,
      fontWeight: 'bold',
      align: 'center'
    });

    // Title
    renderer.drawText('Surface Material Matters!', 200, 100, {
      color: '#f8f6fa',
      fontSize: 22,
      fontWeight: 'bold',
      align: 'center'
    });

    // Material comparison
    renderer.drawRect(30, 130, 340, 100, {
      fillColor: '#141018',
      strokeColor: 'rgba(168, 160, 180, 0.12)',
      cornerRadius: 12
    });

    const materials = [
      { name: 'Rubber', color: '#2d2d2d', ratio: '1.5x', desc: 'High friction' },
      { name: 'Wood', color: '#8b7355', ratio: '1.7x', desc: 'Medium' },
      { name: 'Ice', color: '#a8d5e5', ratio: '3.3x', desc: 'HUGE ratio!' }
    ];

    materials.forEach((mat, idx) => {
      const y = 150 + idx * 25;
      renderer.drawCircle(60, y, 6, { fillColor: mat.color });
      renderer.drawText(`${mat.name}:`, 100, y + 4, {
        color: '#f8f6fa',
        fontSize: 12,
        fontWeight: '600'
      });
      renderer.drawText(mat.desc, 200, y + 4, {
        color: '#a8a0b4',
        fontSize: 12,
        align: 'center'
      });
      renderer.drawText(mat.ratio, 330, y + 4, {
        color: '#10b981',
        fontSize: 12,
        fontWeight: 'bold',
        align: 'end'
      });
    });

    // Key insight box
    renderer.drawRect(30, 250, 340, 80, {
      fillColor: 'rgba(245, 158, 11, 0.1)',
      strokeColor: 'rgba(245, 158, 11, 0.3)',
      cornerRadius: 12
    });
    renderer.drawText('Ice has low absolute friction,', 200, 275, {
      color: '#fbbf24',
      fontSize: 13,
      align: 'center'
    });
    renderer.drawText('but a HIGH static/kinetic ratio.', 200, 295, {
      color: '#fbbf24',
      fontSize: 13,
      align: 'center'
    });
    renderer.drawText("That's why once sliding on ice, you can't stop!", 200, 318, {
      color: '#a8a0b4',
      fontSize: 12,
      align: 'center'
    });

    // Prediction feedback
    const goodPrediction = this.twistPrediction === 'different' || this.twistPrediction === 'ice_no_jump';
    renderer.drawText(
      goodPrediction ? 'Your prediction: Good thinking!' : 'Your prediction: Now you see the pattern!',
      200, 360,
      {
        color: goodPrediction ? '#10b981' : '#a8a0b4',
        fontSize: 13,
        align: 'center'
      }
    );

    // Continue button
    const nextHovered = this.hoveredElement === 'next_phase';
    renderer.drawRect(110, 400, 180, 45, {
      fillColor: nextHovered ? '#fbbf24' : '#f59e0b',
      cornerRadius: 10
    });
    renderer.drawText('See Real Examples', 200, 430, {
      color: '#000000',
      fontSize: 14,
      fontWeight: 'bold',
      align: 'center'
    });
    renderer.addInteractiveElement('next_phase', { x: 110, y: 400, width: 180, height: 45 });
  }

  private renderTransfer(renderer: CommandRenderer): void {
    renderer.drawRect(0, 0, 400, 500, { fillColor: '#0c0a0e' });

    // Title
    renderer.drawText('Friction in the Real World', 200, 35, {
      color: '#f8f6fa',
      fontSize: 18,
      fontWeight: 'bold',
      align: 'center'
    });

    // Tab buttons
    const tabNames = ['Tires', 'Shoes', 'Brakes', 'Climb'];
    tabNames.forEach((name, idx) => {
      const x = 30 + idx * 90;
      const isActive = this.activeApp === idx;
      const isUnlocked = idx === 0 || this.completedApps.has(idx - 1);
      const isHovered = this.hoveredElement === `app_tab_${idx}`;

      renderer.drawRect(x, 55, 80, 30, {
        fillColor: isActive ? '#f59e0b' : (isHovered && isUnlocked ? '#1c1622' : 'transparent'),
        cornerRadius: 6
      });

      let tabLabel = name;
      if (this.completedApps.has(idx)) tabLabel = '* ' + name;

      renderer.drawText(tabLabel, x + 40, 75, {
        color: isActive ? '#000000' : (isUnlocked ? '#a8a0b4' : '#685c78'),
        fontSize: 11,
        fontWeight: isActive ? 'bold' : 'normal',
        align: 'center'
      });

      if (isUnlocked) {
        renderer.addInteractiveElement(`app_tab_${idx}`, {
          x, y: 55, width: 80, height: 30
        }, { element: 'app_tab', index: idx });
      }
    });

    // Content area
    const app = APPLICATIONS[this.activeApp];

    renderer.drawRect(20, 95, 360, 300, {
      fillColor: '#141018',
      strokeColor: 'rgba(168, 160, 180, 0.12)',
      cornerRadius: 12
    });

    // Application-specific icon area
    this.renderApplicationIcon(renderer, this.activeApp);

    // Title
    renderer.drawText(app.title, 200, 230, {
      color: '#f59e0b',
      fontSize: 16,
      fontWeight: 'bold',
      align: 'center'
    });

    // Description (wrapped)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 255;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 45) {
        renderer.drawText(line.trim(), 200, lineY, {
          color: '#a8a0b4',
          fontSize: 12,
          align: 'center'
        });
        line = word + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    });
    if (line.trim()) {
      renderer.drawText(line.trim(), 200, lineY, {
        color: '#a8a0b4',
        fontSize: 12,
        align: 'center'
      });
    }

    // Stats
    renderer.drawRect(60, 335, 280, 30, {
      fillColor: '#1c1622',
      cornerRadius: 8
    });
    renderer.drawText(app.stats, 200, 355, {
      color: '#fbbf24',
      fontSize: 12,
      fontWeight: '600',
      align: 'center'
    });

    // Mark as read button
    if (!this.completedApps.has(this.activeApp)) {
      const markHovered = this.hoveredElement === 'mark_read';
      renderer.drawRect(60, 375, 280, 35, {
        fillColor: markHovered ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
        strokeColor: '#10b981',
        cornerRadius: 8
      });
      renderer.drawText(`Mark "${app.title}" as Read`, 200, 398, {
        color: '#10b981',
        fontSize: 12,
        fontWeight: '600',
        align: 'center'
      });
      renderer.addInteractiveElement('mark_read', { x: 60, y: 375, width: 280, height: 35 });
    } else {
      renderer.drawText('Completed', 200, 398, {
        color: '#10b981',
        fontSize: 12,
        fontWeight: '600',
        align: 'center'
      });
    }

    // Progress / continue
    if (this.completedApps.size >= APPLICATIONS.length) {
      const quizHovered = this.hoveredElement === 'next_phase';
      renderer.drawRect(120, 450, 160, 40, {
        fillColor: quizHovered ? '#fbbf24' : '#f59e0b',
        cornerRadius: 10
      });
      renderer.drawText('Take the Quiz!', 200, 477, {
        color: '#000000',
        fontSize: 14,
        fontWeight: 'bold',
        align: 'center'
      });
      renderer.addInteractiveElement('next_phase', { x: 120, y: 450, width: 160, height: 40 });
    } else {
      renderer.drawText(`Read all ${APPLICATIONS.length} applications (${this.completedApps.size}/${APPLICATIONS.length})`, 200, 470, {
        color: '#685c78',
        fontSize: 12,
        align: 'center'
      });
    }
  }

  private renderApplicationIcon(renderer: CommandRenderer, appIndex: number): void {
    const centerX = 200;
    const centerY = 160;

    switch (appIndex) {
      case 0: // Car Tires
        // Road
        renderer.drawRect(50, 180, 300, 20, { fillColor: '#3a3a3a' });
        // Tire
        renderer.drawCircle(centerX, centerY - 20, 40, { fillColor: '#2d2d2d' });
        renderer.drawCircle(centerX, centerY - 20, 20, { fillColor: '#808080' });
        // Friction arrow
        renderer.drawLine(130, 178, 100, 178, { strokeColor: '#ef4444', strokeWidth: 2 });
        renderer.drawText('Grip', 90, 175, { color: '#ef4444', fontSize: 10 });
        break;

      case 1: // Sports Shoes
        // Court
        renderer.drawRect(50, 180, 300, 20, { fillColor: '#854d0e' });
        // Shoe shape
        renderer.drawRect(120, 145, 100, 35, { fillColor: '#3b82f6', cornerRadius: 8 });
        // Sole
        renderer.drawRect(115, 175, 110, 8, { fillColor: '#374151', cornerRadius: 3 });
        renderer.drawText('High Grip!', 300, 165, { color: '#f59e0b', fontSize: 10 });
        break;

      case 2: // Brake Systems
        // Disc
        renderer.drawCircle(centerX, centerY, 45, { fillColor: '#6b7280', strokeColor: '#9ca3af', strokeWidth: 2 });
        renderer.drawCircle(centerX, centerY, 18, { fillColor: '#374151' });
        // Caliper
        renderer.drawRect(175, 105, 50, 22, { fillColor: '#ef4444', cornerRadius: 4 });
        renderer.drawText('BRAKE', 200, 120, { color: '#ffffff', fontSize: 8, fontWeight: 'bold', align: 'center' });
        // Heat lines
        renderer.drawLine(250, 145, 265, 155, { strokeColor: '#f59e0b', strokeWidth: 2 });
        renderer.drawLine(255, 155, 270, 165, { strokeColor: '#f59e0b', strokeWidth: 2 });
        break;

      case 3: // Rock Climbing
        // Rock wall
        renderer.drawRect(80, 110, 240, 90, { fillColor: '#78716c', cornerRadius: 8 });
        // Climbing holds
        renderer.drawCircle(120, 140, 10, { fillColor: '#fbbf24' });
        renderer.drawCircle(180, 155, 12, { fillColor: '#fbbf24' });
        renderer.drawCircle(240, 135, 8, { fillColor: '#fbbf24' });
        renderer.drawCircle(280, 170, 10, { fillColor: '#fbbf24' });
        // Climbing shoe
        renderer.drawRect(165, 150, 30, 15, { fillColor: '#dc2626', cornerRadius: 4 });
        renderer.drawText('HIGH FRICTION', 60, 160, { color: '#10b981', fontSize: 9, fontWeight: '600' });
        break;
    }
  }

  private renderTest(renderer: CommandRenderer): void {
    renderer.drawRect(0, 0, 400, 500, { fillColor: '#0c0a0e' });

    const question = TEST_QUESTIONS[this.currentQuestion];
    const isAnswered = this.answeredQuestions.has(this.currentQuestion);

    // Header
    renderer.drawText(`Question ${this.currentQuestion + 1}/${TEST_QUESTIONS.length}`, 30, 30, {
      color: '#a8a0b4',
      fontSize: 12
    });
    renderer.drawText(`Score: ${this.correctAnswers}/${this.answeredQuestions.size}`, 370, 30, {
      color: '#10b981',
      fontSize: 12,
      fontWeight: 'bold',
      align: 'end'
    });

    // Progress bar
    renderer.drawRect(30, 45, 340, 4, {
      fillColor: '#1c1622',
      cornerRadius: 2
    });
    renderer.drawRect(30, 45, 340 * ((this.currentQuestion + 1) / TEST_QUESTIONS.length), 4, {
      fillColor: '#f59e0b',
      cornerRadius: 2
    });

    // Question text (wrapped)
    const qWords = question.question.split(' ');
    let qLine = '';
    let qLineY = 80;
    qWords.forEach(word => {
      const testLine = qLine + word + ' ';
      if (testLine.length > 42) {
        renderer.drawText(qLine.trim(), 200, qLineY, {
          color: '#f8f6fa',
          fontSize: 14,
          fontWeight: '600',
          align: 'center'
        });
        qLine = word + ' ';
        qLineY += 22;
      } else {
        qLine = testLine;
      }
    });
    if (qLine.trim()) {
      renderer.drawText(qLine.trim(), 200, qLineY, {
        color: '#f8f6fa',
        fontSize: 14,
        fontWeight: '600',
        align: 'center'
      });
    }

    // Answer options
    question.options.forEach((option, idx) => {
      const y = 150 + idx * 55;
      const isSelected = this.selectedAnswer === idx;
      const isHovered = this.hoveredElement === `answer_${idx}`;

      let bgColor = '#141018';
      let borderColor = 'rgba(168, 160, 180, 0.12)';

      if (isAnswered) {
        if (idx === question.correctIndex) {
          bgColor = 'rgba(16, 185, 129, 0.15)';
          borderColor = '#10b981';
        } else if (isSelected && idx !== question.correctIndex) {
          bgColor = 'rgba(239, 68, 68, 0.15)';
          borderColor = '#ef4444';
        }
      } else if (isHovered) {
        bgColor = '#1c1622';
      }

      renderer.drawRect(30, y, 340, 45, {
        fillColor: bgColor,
        strokeColor: borderColor,
        cornerRadius: 8
      });

      // Wrap option text
      const optWords = option.split(' ');
      let optLine = '';
      let optLineY = y + 20;
      let lineCount = 0;
      optWords.forEach(word => {
        const testLine = optLine + word + ' ';
        if (testLine.length > 45 && lineCount === 0) {
          renderer.drawText(optLine.trim(), 200, optLineY, {
            color: '#f8f6fa',
            fontSize: 12,
            align: 'center'
          });
          optLine = word + ' ';
          optLineY += 16;
          lineCount++;
        } else {
          optLine = testLine;
        }
      });
      if (optLine.trim()) {
        renderer.drawText(optLine.trim(), 200, lineCount === 0 ? y + 28 : optLineY, {
          color: '#f8f6fa',
          fontSize: 12,
          align: 'center'
        });
      }

      if (!isAnswered) {
        renderer.addInteractiveElement(`answer_${idx}`, {
          x: 30, y, width: 340, height: 45
        }, { answerIndex: idx });
      }
    });

    // Explanation (if answered)
    if (this.showExplanation) {
      renderer.drawRect(30, 375, 340, 60, {
        fillColor: 'rgba(245, 158, 11, 0.1)',
        strokeColor: 'rgba(245, 158, 11, 0.3)',
        cornerRadius: 8
      });

      // Wrap explanation
      const expWords = question.explanation.split(' ');
      let expLine = '';
      let expLineY = 395;
      expWords.forEach(word => {
        const testLine = expLine + word + ' ';
        if (testLine.length > 50) {
          renderer.drawText(expLine.trim(), 200, expLineY, {
            color: '#fbbf24',
            fontSize: 11,
            align: 'center'
          });
          expLine = word + ' ';
          expLineY += 14;
        } else {
          expLine = testLine;
        }
      });
      if (expLine.trim()) {
        renderer.drawText(expLine.trim(), 200, expLineY, {
          color: '#fbbf24',
          fontSize: 11,
          align: 'center'
        });
      }
    }

    // Navigation buttons
    if (this.currentQuestion > 0) {
      const backHovered = this.hoveredElement === 'prev_question';
      renderer.drawRect(30, 455, 80, 35, {
        fillColor: backHovered ? '#1c1622' : '#141018',
        strokeColor: 'rgba(168, 160, 180, 0.12)',
        cornerRadius: 8
      });
      renderer.drawText('< Back', 70, 478, {
        color: '#a8a0b4',
        fontSize: 12,
        align: 'center'
      });
      renderer.addInteractiveElement('prev_question', { x: 30, y: 455, width: 80, height: 35 });
    }

    if (this.currentQuestion < TEST_QUESTIONS.length - 1) {
      const nextHovered = this.hoveredElement === 'next_question';
      renderer.drawRect(290, 455, 80, 35, {
        fillColor: nextHovered ? '#1c1622' : '#141018',
        strokeColor: 'rgba(168, 160, 180, 0.12)',
        cornerRadius: 8
      });
      renderer.drawText('Next >', 330, 478, {
        color: '#a8a0b4',
        fontSize: 12,
        align: 'center'
      });
      renderer.addInteractiveElement('next_question', { x: 290, y: 455, width: 80, height: 35 });
    } else if (this.answeredQuestions.size === TEST_QUESTIONS.length) {
      const completeHovered = this.hoveredElement === 'next_phase';
      renderer.drawRect(150, 455, 100, 35, {
        fillColor: completeHovered ? '#fbbf24' : '#f59e0b',
        cornerRadius: 8
      });
      renderer.drawText('Complete!', 200, 478, {
        color: '#000000',
        fontSize: 13,
        fontWeight: 'bold',
        align: 'center'
      });
      renderer.addInteractiveElement('next_phase', { x: 150, y: 455, width: 100, height: 35 });
    }
  }

  private renderMastery(renderer: CommandRenderer): void {
    renderer.drawRect(0, 0, 400, 500, { fillColor: '#0c0a0e' });

    // Gradient overlay
    renderer.drawRect(0, 0, 400, 250, {
      fillColor: 'rgba(245, 158, 11, 0.1)'
    });

    // Trophy
    renderer.drawText('TROPHY', 200, 70, {
      color: '#fbbf24',
      fontSize: 12,
      align: 'center'
    });
    renderer.drawRect(170, 80, 60, 50, {
      fillColor: '#fbbf24',
      cornerRadius: 8
    });

    // Title
    renderer.drawText('Friction Master!', 200, 160, {
      color: '#f8f6fa',
      fontSize: 26,
      fontWeight: 'bold',
      align: 'center'
    });

    // Score
    const percentage = Math.round((this.correctAnswers / TEST_QUESTIONS.length) * 100);
    renderer.drawText(`${percentage}%`, 200, 210, {
      color: '#10b981',
      fontSize: 48,
      fontWeight: 'bold',
      align: 'center'
    });
    renderer.drawText(`${this.correctAnswers}/${TEST_QUESTIONS.length} correct answers`, 200, 240, {
      color: '#a8a0b4',
      fontSize: 14,
      align: 'center'
    });

    // Key takeaways
    renderer.drawRect(40, 270, 320, 140, {
      fillColor: '#141018',
      strokeColor: 'rgba(168, 160, 180, 0.12)',
      cornerRadius: 12
    });

    renderer.drawText('Key Takeaways:', 200, 295, {
      color: '#f59e0b',
      fontSize: 14,
      fontWeight: 'bold',
      align: 'center'
    });

    const takeaways = [
      'Static friction > kinetic friction',
      'Force peaks then drops at slip',
      'f = mu*N (friction = coef x normal)',
      'Surface material changes mu values'
    ];

    takeaways.forEach((item, idx) => {
      renderer.drawText(`* ${item}`, 200, 320 + idx * 22, {
        color: '#f8f6fa',
        fontSize: 12,
        align: 'center'
      });
    });

    // Play again button
    const restartHovered = this.hoveredElement === 'restart';
    renderer.drawRect(140, 430, 120, 40, {
      fillColor: restartHovered ? '#fbbf24' : '#f59e0b',
      cornerRadius: 10
    });
    renderer.drawText('Play Again', 200, 457, {
      color: '#000000',
      fontSize: 14,
      fontWeight: 'bold',
      align: 'center'
    });
    renderer.addInteractiveElement('restart', { x: 140, y: 430, width: 120, height: 40 });
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      surface: this.surface,
      isPulling: this.isPulling,
      hasSlipped: this.hasSlipped,
      currentForce: this.currentForce,
      blockPosition: this.blockPosition,
      peakForce: this.peakForce,
      steadyForce: this.steadyForce,
      experimentCount: this.experimentCount,
      currentQuestion: this.currentQuestion,
      answeredQuestions: Array.from(this.answeredQuestions),
      activeApp: this.activeApp,
      completedApps: Array.from(this.completedApps)
      // Note: correctAnswers and test question correctIndex are NEVER sent to client
    };
  }

  setState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.prediction !== undefined) this.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.surface) this.surface = state.surface as Surface;
    if (state.isPulling !== undefined) this.isPulling = state.isPulling as boolean;
    if (state.hasSlipped !== undefined) this.hasSlipped = state.hasSlipped as boolean;
    if (state.currentForce !== undefined) this.currentForce = state.currentForce as number;
    if (state.blockPosition !== undefined) this.blockPosition = state.blockPosition as number;
    if (state.peakForce !== undefined) this.peakForce = state.peakForce as number;
    if (state.steadyForce !== undefined) this.steadyForce = state.steadyForce as number;
    if (state.experimentCount !== undefined) this.experimentCount = state.experimentCount as number;
    if (state.currentQuestion !== undefined) this.currentQuestion = state.currentQuestion as number;
    if (state.answeredQuestions) this.answeredQuestions = new Set(state.answeredQuestions as number[]);
    if (state.activeApp !== undefined) this.activeApp = state.activeApp as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================
export function createStaticKineticFrictionGame(sessionId: string, config?: SessionConfig): StaticKineticFrictionGame {
  return new StaticKineticFrictionGame(sessionId, config);
}
