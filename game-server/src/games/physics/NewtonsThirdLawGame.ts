// ============================================================================
// NEWTON'S THIRD LAW GAME - Server-Side Implementation
// ============================================================================
// Physics: For every action, there is an equal and opposite reaction
// F_action = -F_reaction (Third Law Pair)
// Impulse = Force x Time (explains balloon travel distance)
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
    question: "According to Newton's Third Law, when you push against a wall, what happens?",
    options: ["Nothing, the wall doesn't move", "The wall pushes back on you with equal force", "The wall absorbs your force", "Your force disappears"],
    correctIndex: 1
  },
  {
    question: "Why does a balloon rocket move forward when air escapes backward?",
    options: ["The air pushes on the ground", "The air resistance pulls it forward", "The escaping air pushes the balloon forward (reaction)", "Magic"],
    correctIndex: 2
  },
  {
    question: "If a larger balloon has more air, what happens compared to a smaller balloon?",
    options: ["It goes slower", "It goes the same distance", "It can travel farther due to longer thrust", "Size doesn't matter"],
    correctIndex: 2
  },
  {
    question: "When you swim, you push water backward. What is the reaction force?",
    options: ["The water disappears", "The water pushes you forward", "Gravity pulls you down", "Nothing happens"],
    correctIndex: 1
  },
  {
    question: "A gun recoils (kicks back) when fired because:",
    options: ["The gun is afraid of the noise", "The bullet pushes the gun backward (reaction)", "Air pressure pushes the gun", "The explosion happens twice"],
    correctIndex: 1
  },
  {
    question: "Why do rockets work in the vacuum of space where there's nothing to push against?",
    options: ["They can't work in space", "They push against their own exhaust gases", "Space isn't really a vacuum", "They use solar wind"],
    correctIndex: 1
  },
  {
    question: "If action and reaction forces are equal, why do objects move?",
    options: ["They're not really equal", "The forces act on different objects", "One force is always stronger", "Movement is an illusion"],
    correctIndex: 1
  },
  {
    question: "When a bird flaps its wings downward, what is the reaction?",
    options: ["The air pushes the bird up", "The bird gets tired", "Nothing, birds are too light", "Gravity increases"],
    correctIndex: 0
  },
  {
    question: "A person standing on a skateboard throws a heavy ball forward. What happens?",
    options: ["Nothing", "The person rolls backward", "The ball stops mid-air", "The skateboard breaks"],
    correctIndex: 1
  },
  {
    question: "If you're floating in space and throw your tool kit away from you, what happens?",
    options: ["You stay still", "You move in the opposite direction", "You start spinning randomly", "The tool kit comes back"],
    correctIndex: 1
  }
];

// ============================================================================
// GAME CLASS
// ============================================================================

export class NewtonsThirdLawGame extends BaseGame {
  // Game state
  private phase: GamePhase = 'hook';
  private hookStep: number = 0;
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Play phase - balloon rocket
  private balloonSize: number = 50;
  private balloonX: number = 80;
  private isLaunched: boolean = false;
  private airRemaining: number = 100;

  // Twist play - size comparison
  private smallBalloonX: number = 80;
  private largeBalloonX: number = 80;
  private twistLaunched: boolean = false;
  private smallAir: number = 100;
  private largeAir: number = 100;

  // Review/Test
  private reviewStep: number = 0;
  private twistReviewStep: number = 0;
  private testQuestionIndex: number = 0;
  private testScore: number = 0;
  private testAnswered: boolean = false;
  private showExplanation: boolean = false;

  // Transfer
  private activeApp: number = 0;
  private completedApps: Set<number> = new Set();

  // Premium color palette
  private readonly colors = {
    primary: '#ef4444',
    secondary: '#f97316',
    accent: '#fbbf24',
    success: '#22c55e',
    background: '#0a0f1a',
    cardBg: 'rgba(30, 41, 59, 0.5)',
    text: '#ffffff',
    textMuted: '#94a3b8'
  };

  // Applications
  private readonly applications = [
    {
      title: "Rocket Propulsion",
      icon: "rocket",
      description: "Rockets work by pushing exhaust gases out the back at high speed. The gases push back on the rocket, propelling it forward.",
      fact: "The Saturn V rocket produced 7.5 million pounds of thrust by expelling exhaust at 10,000+ mph!"
    },
    {
      title: "Swimming",
      icon: "swimmer",
      description: "When you swim, you push water backward with your arms and legs. The water pushes you forward in response!",
      fact: "Olympic swimmers can push against 60+ pounds of water with each stroke!"
    },
    {
      title: "Gun Recoil",
      icon: "target",
      description: "When a gun fires, the explosive gases push the bullet forward. The bullet pushes the gun backward - this is recoil.",
      fact: "A .50 caliber rifle can recoil with over 100 foot-pounds of energy!"
    },
    {
      title: "Walking",
      icon: "footprints",
      description: "You walk by pushing backward against the ground. The ground pushes forward on you, propelling you forward!",
      fact: "Every step involves pushing against the Earth with hundreds of pounds of force!"
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // ============================================================================
  // PROTECTED: Physics Calculations (NEVER sent to client)
  // ============================================================================

  private calculateThrust(balloonSize: number, airRemaining: number): number {
    // F = ma, thrust proportional to air flow rate
    return (balloonSize / 50) * (airRemaining / 100) * 2;
  }

  private calculateDistance(balloonSize: number, startAir: number): number {
    // Integrate thrust over time until air depletes
    // Larger balloon = more air = longer thrust duration = more distance
    let distance = 0;
    let air = startAir;
    const depleteRate = balloonSize / 30;

    while (air > 0) {
      const thrust = this.calculateThrust(balloonSize, air);
      distance += thrust;
      air -= depleteRate;
    }

    return Math.min(distance, 700);
  }

  private calculateImpulse(force: number, duration: number): number {
    // Impulse = Force x Time
    // Change in momentum
    return force * duration;
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
      case 'next_hook':
        if (this.hookStep < 2) {
          this.hookStep++;
        } else {
          this.phase = 'predict';
        }
        break;
      case 'hook_dot':
        this.hookStep = value as number;
        break;
      case 'select_prediction':
        this.prediction = value as string;
        break;
      case 'submit_prediction':
        if (this.prediction) {
          this.phase = 'play';
        }
        break;
      case 'launch_balloon':
        if (!this.isLaunched) {
          this.isLaunched = true;
          this.simulateBalloonFlight();
        }
        break;
      case 'reset_balloon':
        this.resetBalloon();
        break;
      case 'continue_to_review':
        this.phase = 'review';
        break;
      case 'next_review':
        if (this.reviewStep < 2) {
          this.reviewStep++;
        } else {
          this.phase = 'twist_predict';
        }
        break;
      case 'review_dot':
        this.reviewStep = value as number;
        break;
      case 'select_twist_prediction':
        this.twistPrediction = value as string;
        break;
      case 'submit_twist_prediction':
        if (this.twistPrediction) {
          this.phase = 'twist_play';
        }
        break;
      case 'start_race':
        if (!this.twistLaunched) {
          this.twistLaunched = true;
          this.simulateBalloonRace();
        }
        break;
      case 'continue_twist_review':
        this.phase = 'twist_review';
        break;
      case 'next_twist_review':
        if (this.twistReviewStep < 2) {
          this.twistReviewStep++;
        } else {
          this.phase = 'transfer';
        }
        break;
      case 'twist_review_dot':
        this.twistReviewStep = value as number;
        break;
      case 'select_app':
        this.activeApp = value as number;
        break;
      case 'mark_app_read':
        this.completedApps.add(this.activeApp);
        if (this.activeApp < this.applications.length - 1) {
          this.activeApp++;
        }
        break;
      case 'start_test':
        this.phase = 'test';
        this.testQuestionIndex = 0;
        this.testScore = 0;
        break;
      case 'select_answer':
        if (!this.testAnswered) {
          this.testAnswered = true;
          const answerIndex = value as number;
          if (answerIndex === TEST_QUESTIONS[this.testQuestionIndex].correctIndex) {
            this.testScore++;
          }
          this.showExplanation = true;
        }
        break;
      case 'next_question':
        if (this.testQuestionIndex < TEST_QUESTIONS.length - 1) {
          this.testQuestionIndex++;
          this.testAnswered = false;
          this.showExplanation = false;
        } else {
          const passed = this.testScore >= 7;
          if (passed) {
            this.phase = 'mastery';
          } else {
            this.phase = 'review';
          }
        }
        break;
      case 'explore_again':
        this.phase = 'hook';
        this.resetAllState();
        break;
    }
  }

  private handleSliderChange(id: string, value?: string | number | boolean): void {
    if (id === 'balloon_size' && !this.isLaunched) {
      this.balloonSize = value as number;
    }
  }

  private simulateBalloonFlight(): void {
    // Simulate balloon flight physics
    const animate = () => {
      if (this.airRemaining <= 0) return;

      const thrust = this.calculateThrust(this.balloonSize, this.airRemaining);
      this.balloonX = Math.min(this.balloonX + thrust, 700);
      this.airRemaining = Math.max(0, this.airRemaining - (this.balloonSize / 30));

      if (this.airRemaining > 0) {
        setTimeout(animate, 50);
      }
      this.markDirty();
    };
    animate();
  }

  private simulateBalloonRace(): void {
    const animate = () => {
      if (this.smallAir <= 0 && this.largeAir <= 0) return;

      // Small balloon depletes faster
      if (this.smallAir > 0) {
        this.smallBalloonX = Math.min(this.smallBalloonX + 1.5, 700);
        this.smallAir = Math.max(0, this.smallAir - 3);
      }

      // Large balloon has more air, thrust for longer
      if (this.largeAir > 0) {
        this.largeBalloonX = Math.min(this.largeBalloonX + 2, 700);
        this.largeAir = Math.max(0, this.largeAir - 1.5);
      }

      if (this.smallAir > 0 || this.largeAir > 0) {
        setTimeout(animate, 50);
      }
      this.markDirty();
    };
    animate();
  }

  private resetBalloon(): void {
    this.balloonX = 80;
    this.isLaunched = false;
    this.airRemaining = 100;
  }

  private resetPhaseState(): void {
    if (this.phase === 'play') {
      this.resetBalloon();
    } else if (this.phase === 'twist_play') {
      this.smallBalloonX = 80;
      this.largeBalloonX = 80;
      this.twistLaunched = false;
      this.smallAir = 100;
      this.largeAir = 100;
    }
  }

  private resetAllState(): void {
    this.hookStep = 0;
    this.prediction = null;
    this.twistPrediction = null;
    this.resetBalloon();
    this.smallBalloonX = 80;
    this.largeBalloonX = 80;
    this.twistLaunched = false;
    this.smallAir = 100;
    this.largeAir = 100;
    this.reviewStep = 0;
    this.twistReviewStep = 0;
    this.testQuestionIndex = 0;
    this.testScore = 0;
    this.testAnswered = false;
    this.showExplanation = false;
    this.activeApp = 0;
    this.completedApps.clear();
  }

  // ============================================================================
  // RENDERING
  // ============================================================================

  render(): GameFrame {
    const renderer = new CommandRenderer();

    // Background
    renderer.drawRectangle(0, 0, 800, 600, this.colors.background);

    // Ambient gradients
    renderer.drawEllipse(200, 0, 300, 300, 'rgba(239, 68, 68, 0.05)');
    renderer.drawEllipse(600, 600, 300, 300, 'rgba(249, 115, 22, 0.05)');

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
    renderer.drawText("Newton's Third Law", 20, 30, this.colors.text, 14, 'bold');

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
    const hookContent = [
      { title: "The Balloon Rocket", visual: "balloon", content: "Have you ever let go of an inflated balloon and watched it zoom across the room?" },
      { title: "Action and Reaction", visual: "lightning", content: "300 years ago, Isaac Newton discovered a law that explains everything from rockets to swimming!" },
      { title: "From Balloons to Rockets", visual: "rocket", content: "The same principle that makes a balloon zoom makes rockets fly to space!" }
    ];

    const current = hookContent[this.hookStep];

    // Badge
    renderer.drawRoundedRectangle(320, 80, 160, 30, 15, 'rgba(239, 68, 68, 0.1)');
    renderer.drawText("PHYSICS EXPLORATION", 340, 100, this.colors.primary, 10, 'bold');

    // Visual icon
    renderer.drawText(this.hookStep === 0 ? "B" : this.hookStep === 1 ? "A" : "R", 400, 180, this.colors.accent, 60, 'bold');

    // Title
    renderer.drawText(current.title, 400, 250, this.colors.text, 32, 'bold');

    // Content
    renderer.drawText(current.content, 400, 300, this.colors.textMuted, 16);

    // Dots
    hookContent.forEach((_, i) => {
      renderer.addInteractiveElement({
        id: 'hook_dot',
        type: 'button_click',
        x: 380 + i * 20,
        y: 350,
        width: 10,
        height: 10,
        value: i
      });
      renderer.drawEllipse(385 + i * 20, 355, i === this.hookStep ? 8 : 4, i === this.hookStep ? 8 : 4,
        i === this.hookStep ? this.colors.primary : '#475569');
    });

    // Continue button
    renderer.addInteractiveElement({
      id: 'next_hook',
      type: 'button_click',
      x: 300,
      y: 400,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(300, 400, 200, 50, 12, this.colors.primary);
    renderer.drawText(this.hookStep < 2 ? "Continue" : "Make a Prediction", 400, 430, this.colors.text, 14, 'bold');
  }

  private renderPredict(renderer: CommandRenderer): void {
    renderer.drawText("Make Your Prediction", 400, 100, this.colors.text, 28, 'bold');
    renderer.drawText("Why does a balloon zoom forward when you let it go?", 400, 140, this.colors.textMuted, 14);

    const predictions = [
      { id: 'air_push', label: 'The air rushing out pushes the balloon forward' },
      { id: 'lighter', label: 'The balloon gets lighter and floats up' },
      { id: 'pressure', label: 'The pressure inside makes it explode forward' },
      { id: 'magic', label: 'The balloon just wants to move' }
    ];

    predictions.forEach((pred, i) => {
      const y = 180 + i * 70;
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
        isSelected ? 'rgba(239, 68, 68, 0.2)' : this.colors.cardBg);
      if (isSelected) {
        renderer.drawRoundedRectangle(150, y, 500, 60, 12, 'transparent', this.colors.primary, 2);
      }
      renderer.drawText(pred.label, 400, y + 35, this.colors.text, 14);
    });

    if (this.prediction) {
      renderer.addInteractiveElement({
        id: 'submit_prediction',
        type: 'button_click',
        x: 300,
        y: 480,
        width: 200,
        height: 50
      });
      renderer.drawRoundedRectangle(300, 480, 200, 50, 12, this.colors.primary);
      renderer.drawText("Test My Prediction", 400, 510, this.colors.text, 14, 'bold');
    }
  }

  private renderPlay(renderer: CommandRenderer): void {
    renderer.drawText("Balloon Rocket Launch", 400, 80, this.colors.text, 24, 'bold');

    // Track
    renderer.drawLine(80, 250, 700, 250, 'rgba(255, 255, 255, 0.3)', 2);

    // Distance markers
    for (let d = 0; d <= 600; d += 100) {
      renderer.drawText(`${d}cm`, 80 + d, 280, this.colors.textMuted, 10);
    }

    // Balloon
    const displaySize = 20 + (this.airRemaining / 100) * (this.balloonSize / 100) * 20;
    renderer.drawEllipse(this.balloonX + displaySize/2, 250, displaySize, displaySize * 0.8, this.colors.primary);

    // Force arrows when launched
    if (this.isLaunched && this.airRemaining > 0) {
      renderer.drawLine(this.balloonX - 30, 250, this.balloonX - 60, 250, '#93c5fd', 3);
      renderer.drawText("AIR (Action)", this.balloonX - 45, 230, '#93c5fd', 10, 'bold');
      renderer.drawLine(this.balloonX + displaySize + 10, 250, this.balloonX + displaySize + 50, 250, this.colors.primary, 3);
      renderer.drawText("BALLOON (Reaction)", this.balloonX + displaySize + 30, 230, this.colors.primary, 10, 'bold');
    }

    // Controls
    renderer.drawText(`Balloon Size: ${this.balloonSize}%`, 200, 350, this.colors.textMuted, 12);
    renderer.addInteractiveElement({
      id: 'balloon_size',
      type: 'slider_change',
      x: 150,
      y: 370,
      width: 200,
      height: 20,
      min: 20,
      max: 100,
      value: this.balloonSize
    });
    renderer.drawRoundedRectangle(150, 370, 200, 10, 5, '#475569');
    renderer.drawRoundedRectangle(150, 370, (this.balloonSize - 20) * 2.5, 10, 5, this.colors.primary);

    // Stats
    renderer.drawText(`Distance: ${Math.round(this.balloonX - 80)} cm`, 500, 350, this.colors.primary, 18, 'bold');
    renderer.drawText(`Air: ${Math.round(this.airRemaining)}%`, 500, 380, this.colors.textMuted, 12);

    // Launch button
    renderer.addInteractiveElement({
      id: this.isLaunched ? 'reset_balloon' : 'launch_balloon',
      type: 'button_click',
      x: 250,
      y: 420,
      width: 150,
      height: 45
    });
    renderer.drawRoundedRectangle(250, 420, 150, 45, 10, this.isLaunched ? '#475569' : this.colors.primary);
    renderer.drawText(this.isLaunched ? "Reset" : "Launch!", 325, 447, this.colors.text, 14, 'bold');

    // Continue button
    renderer.addInteractiveElement({
      id: 'continue_to_review',
      type: 'button_click',
      x: 420,
      y: 420,
      width: 150,
      height: 45
    });
    renderer.drawRoundedRectangle(420, 420, 150, 45, 10, this.colors.primary);
    renderer.drawText("See Results", 495, 447, this.colors.text, 14, 'bold');
  }

  private renderReview(renderer: CommandRenderer): void {
    const wasCorrect = this.prediction === 'air_push';

    const reviewContent = [
      { title: "Newton's Third Law", content: "For every ACTION, there is an equal and opposite REACTION." },
      { title: "Action-Reaction Pairs", content: "The forces act on DIFFERENT objects. Balloon pushes air, air pushes balloon." },
      { title: "Why Movement Occurs", content: "The air zooms backward, the balloon zooms forward. Each responds to the force on IT." }
    ];

    const current = reviewContent[this.reviewStep];

    renderer.drawText("Understanding Action & Reaction", 400, 80, this.colors.text, 24, 'bold');

    renderer.drawRoundedRectangle(150, 120, 500, 200, 16, this.colors.cardBg);
    renderer.drawText(current.title, 400, 160, this.colors.primary, 20, 'bold');
    renderer.drawText(current.content, 400, 220, this.colors.text, 14);

    if (this.reviewStep === 0 && wasCorrect) {
      renderer.drawRoundedRectangle(200, 260, 400, 40, 8, 'rgba(34, 197, 94, 0.2)');
      renderer.drawText("Great thinking! You correctly identified the reaction force.", 400, 285, this.colors.success, 12);
    }

    // Dots
    reviewContent.forEach((_, i) => {
      renderer.addInteractiveElement({
        id: 'review_dot',
        type: 'button_click',
        x: 380 + i * 20,
        y: 340,
        width: 10,
        height: 10,
        value: i
      });
      renderer.drawEllipse(385 + i * 20, 345, i === this.reviewStep ? 8 : 4, i === this.reviewStep ? 8 : 4,
        i === this.reviewStep ? this.colors.primary : '#475569');
    });

    renderer.addInteractiveElement({
      id: 'next_review',
      type: 'button_click',
      x: 300,
      y: 400,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(300, 400, 200, 50, 12, this.colors.primary);
    renderer.drawText(this.reviewStep < 2 ? "Continue" : "New Variable", 400, 430, this.colors.text, 14, 'bold');
  }

  private renderTwistPredict(renderer: CommandRenderer): void {
    renderer.drawText("The Twist: Balloon Size", 400, 100, this.colors.accent, 24, 'bold');
    renderer.drawText("If we race a small vs large balloon, which travels farther?", 400, 140, this.colors.textMuted, 14);

    const predictions = [
      { id: 'small_wins', label: "SMALLER balloon travels farther (it's lighter!)" },
      { id: 'large_wins', label: 'LARGER balloon travels farther (more air!)' },
      { id: 'same_distance', label: 'Both travel the same distance' },
      { id: 'neither', label: "Neither will move - size doesn't matter" }
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
        isSelected ? 'rgba(251, 191, 36, 0.2)' : this.colors.cardBg);
      if (isSelected) {
        renderer.drawRoundedRectangle(150, y, 500, 60, 12, 'transparent', this.colors.accent, 2);
      }
      renderer.drawText(pred.label, 400, y + 35, this.colors.text, 14);
    });

    if (this.twistPrediction) {
      renderer.addInteractiveElement({
        id: 'submit_twist_prediction',
        type: 'button_click',
        x: 300,
        y: 480,
        width: 200,
        height: 50
      });
      renderer.drawRoundedRectangle(300, 480, 200, 50, 12, this.colors.accent);
      renderer.drawText("Test It", 400, 510, this.colors.text, 14, 'bold');
    }
  }

  private renderTwistPlay(renderer: CommandRenderer): void {
    renderer.drawText("Balloon Race!", 400, 70, this.colors.accent, 24, 'bold');

    // Tracks
    renderer.drawLine(80, 150, 700, 150, 'rgba(255, 255, 255, 0.2)', 1);
    renderer.drawLine(80, 250, 700, 250, 'rgba(255, 255, 255, 0.2)', 1);

    renderer.drawText("Small", 50, 155, this.colors.textMuted, 12);
    renderer.drawText("Large", 50, 255, this.colors.textMuted, 12);

    // Small balloon
    renderer.drawEllipse(this.smallBalloonX + 10, 150, 15, 12, '#3b82f6');

    // Large balloon
    renderer.drawEllipse(this.largeBalloonX + 15, 250, 25, 20, this.colors.primary);

    // Results
    if (this.smallAir <= 0 && this.largeAir <= 0) {
      const winner = this.largeBalloonX > this.smallBalloonX ? 'Large Wins!' : 'Small Wins!';
      renderer.drawText(winner, 600, 200, this.colors.success, 16, 'bold');
    }

    // Stats
    renderer.drawRoundedRectangle(100, 320, 200, 80, 10, 'rgba(59, 130, 246, 0.1)');
    renderer.drawText("Small Balloon", 200, 345, '#3b82f6', 14, 'bold');
    renderer.drawText(`${Math.round(this.smallBalloonX - 80)} cm`, 200, 370, this.colors.text, 18, 'bold');
    renderer.drawText(`Air: ${Math.round(this.smallAir)}%`, 200, 390, this.colors.textMuted, 10);

    renderer.drawRoundedRectangle(500, 320, 200, 80, 10, 'rgba(239, 68, 68, 0.1)');
    renderer.drawText("Large Balloon", 600, 345, this.colors.primary, 14, 'bold');
    renderer.drawText(`${Math.round(this.largeBalloonX - 80)} cm`, 600, 370, this.colors.text, 18, 'bold');
    renderer.drawText(`Air: ${Math.round(this.largeAir)}%`, 600, 390, this.colors.textMuted, 10);

    // Race button
    renderer.addInteractiveElement({
      id: 'start_race',
      type: 'button_click',
      x: 325,
      y: 340,
      width: 150,
      height: 45
    });
    renderer.drawRoundedRectangle(325, 340, 150, 45, 10, this.twistLaunched ? '#475569' : this.colors.accent);
    renderer.drawText(this.twistLaunched ? "Racing!" : "Start Race!", 400, 367, this.colors.text, 14, 'bold');

    // Continue
    renderer.addInteractiveElement({
      id: 'continue_twist_review',
      type: 'button_click',
      x: 300,
      y: 440,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(300, 440, 200, 50, 12, this.colors.accent);
    renderer.drawText("Understand Results", 400, 470, this.colors.text, 14, 'bold');
  }

  private renderTwistReview(renderer: CommandRenderer): void {
    const wasCorrect = this.twistPrediction === 'large_wins';

    const content = [
      { title: "More Air = More Thrust Time", content: "The larger balloon travels farther because it can provide thrust for LONGER." },
      { title: "Impulse: Force x Time", content: "Both balloons push with similar force, but the larger one pushes for longer = more impulse." },
      { title: "Real Rockets Use This", content: "More fuel means longer burn time, more total impulse, higher final speed!" }
    ];

    const current = content[this.twistReviewStep];

    renderer.drawText("Size Analysis", 400, 80, this.colors.accent, 24, 'bold');

    renderer.drawRoundedRectangle(150, 120, 500, 200, 16, this.colors.cardBg);
    renderer.drawText(current.title, 400, 160, this.colors.accent, 20, 'bold');
    renderer.drawText(current.content, 400, 220, this.colors.text, 14);

    if (this.twistReviewStep === 0 && wasCorrect) {
      renderer.drawRoundedRectangle(200, 260, 400, 40, 8, 'rgba(34, 197, 94, 0.2)');
      renderer.drawText("Excellent reasoning! More air means longer thrust.", 400, 285, this.colors.success, 12);
    }

    // Dots
    content.forEach((_, i) => {
      renderer.addInteractiveElement({
        id: 'twist_review_dot',
        type: 'button_click',
        x: 380 + i * 20,
        y: 340,
        width: 10,
        height: 10,
        value: i
      });
      renderer.drawEllipse(385 + i * 20, 345, i === this.twistReviewStep ? 8 : 4, i === this.twistReviewStep ? 8 : 4,
        i === this.twistReviewStep ? this.colors.accent : '#475569');
    });

    renderer.addInteractiveElement({
      id: 'next_twist_review',
      type: 'button_click',
      x: 300,
      y: 400,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(300, 400, 200, 50, 12, this.colors.accent);
    renderer.drawText(this.twistReviewStep < 2 ? "Continue" : "Real-World Examples", 400, 430, this.colors.text, 14, 'bold');
  }

  private renderTransfer(renderer: CommandRenderer): void {
    renderer.drawText("Newton's Third Law Everywhere", 400, 70, this.colors.text, 24, 'bold');
    renderer.drawText(`Explore all ${this.applications.length} applications to unlock the quiz`, 400, 100, this.colors.textMuted, 12);

    // App tabs
    this.applications.forEach((app, i) => {
      const x = 150 + i * 130;
      const isActive = this.activeApp === i;
      const isCompleted = this.completedApps.has(i);

      renderer.addInteractiveElement({
        id: 'select_app',
        type: 'button_click',
        x: x,
        y: 130,
        width: 120,
        height: 40,
        value: i
      });

      let bgColor = '#475569';
      if (isActive) bgColor = this.colors.primary;
      else if (isCompleted) bgColor = 'rgba(34, 197, 94, 0.3)';

      renderer.drawRoundedRectangle(x, 130, 120, 40, 20, bgColor);
      renderer.drawText(isCompleted ? `V ${app.title.split(' ')[0]}` : app.title.split(' ')[0], x + 60, 155, this.colors.text, 12);
    });

    // Current app detail
    const app = this.applications[this.activeApp];
    renderer.drawRoundedRectangle(150, 190, 500, 200, 16, this.colors.cardBg);
    renderer.drawText(app.title, 400, 230, this.colors.text, 20, 'bold');
    renderer.drawText(app.description, 400, 280, this.colors.text, 12);

    renderer.drawRoundedRectangle(200, 310, 400, 60, 10, 'rgba(239, 68, 68, 0.1)');
    renderer.drawText("Fun Fact:", 220, 330, this.colors.primary, 12, 'bold');
    renderer.drawText(app.fact, 400, 350, this.colors.textMuted, 10);

    if (!this.completedApps.has(this.activeApp)) {
      renderer.addInteractiveElement({
        id: 'mark_app_read',
        type: 'button_click',
        x: 300,
        y: 410,
        width: 200,
        height: 45
      });
      renderer.drawRoundedRectangle(300, 410, 200, 45, 10, this.colors.primary);
      renderer.drawText("Mark as Read", 400, 437, this.colors.text, 14, 'bold');
    }

    // Progress
    renderer.drawText(`Progress: ${this.completedApps.size}/${this.applications.length}`, 400, 480, this.colors.textMuted, 12);

    if (this.completedApps.size === this.applications.length) {
      renderer.addInteractiveElement({
        id: 'start_test',
        type: 'button_click',
        x: 300,
        y: 510,
        width: 200,
        height: 50
      });
      renderer.drawRoundedRectangle(300, 510, 200, 50, 12, this.colors.success);
      renderer.drawText("Take the Quiz", 400, 540, this.colors.text, 14, 'bold');
    }
  }

  private renderTest(renderer: CommandRenderer): void {
    const question = TEST_QUESTIONS[this.testQuestionIndex];

    renderer.drawText(`Question ${this.testQuestionIndex + 1} of ${TEST_QUESTIONS.length}`, 200, 80, this.colors.textMuted, 14);
    renderer.drawText(`Score: ${this.testScore}`, 600, 80, this.colors.success, 14, 'bold');

    renderer.drawRoundedRectangle(100, 110, 600, 100, 16, this.colors.cardBg);
    renderer.drawText(question.question, 400, 160, this.colors.text, 14);

    question.options.forEach((option, i) => {
      const y = 230 + i * 60;
      const isCorrect = i === question.correctIndex;
      const isSelected = this.testAnswered && this.showExplanation;

      let bgColor = this.colors.cardBg;
      let borderColor = 'transparent';

      if (isSelected) {
        if (isCorrect) {
          bgColor = 'rgba(34, 197, 94, 0.2)';
          borderColor = this.colors.success;
        } else {
          bgColor = 'rgba(239, 68, 68, 0.2)';
          borderColor = this.colors.primary;
        }
      }

      renderer.addInteractiveElement({
        id: 'select_answer',
        type: 'button_click',
        x: 100,
        y: y,
        width: 600,
        height: 50,
        value: i
      });

      renderer.drawRoundedRectangle(100, y, 600, 50, 10, bgColor);
      if (borderColor !== 'transparent') {
        renderer.drawRoundedRectangle(100, y, 600, 50, 10, 'transparent', borderColor, 2);
      }
      renderer.drawText(option, 400, y + 30, this.colors.text, 12);
    });

    if (this.showExplanation) {
      renderer.addInteractiveElement({
        id: 'next_question',
        type: 'button_click',
        x: 300,
        y: 500,
        width: 200,
        height: 50
      });
      renderer.drawRoundedRectangle(300, 500, 200, 50, 12, this.colors.primary);
      const buttonText = this.testQuestionIndex < TEST_QUESTIONS.length - 1 ? "Next Question" : "See Results";
      renderer.drawText(buttonText, 400, 530, this.colors.text, 14, 'bold');
    }
  }

  private renderMastery(renderer: CommandRenderer): void {
    const percentage = Math.round((this.testScore / TEST_QUESTIONS.length) * 100);

    // Trophy
    renderer.drawEllipse(400, 150, 60, 60, this.colors.primary);
    renderer.drawText("T", 400, 165, this.colors.text, 40, 'bold');

    renderer.drawText("Action-Reaction Master!", 400, 250, this.colors.text, 32, 'bold');
    renderer.drawText(`Final Score: ${this.testScore}/${TEST_QUESTIONS.length} (${percentage}%)`, 400, 300, this.colors.success, 18);

    // Key concepts
    const concepts = ["Equal & Opposite", "Air Pushes Balloon", "Rockets in Space", "Swimming & Walking"];
    concepts.forEach((concept, i) => {
      const x = 150 + (i % 2) * 250;
      const y = 350 + Math.floor(i / 2) * 60;
      renderer.drawRoundedRectangle(x, y, 200, 50, 10, this.colors.cardBg);
      renderer.drawText(concept, x + 100, y + 30, this.colors.textMuted, 12);
    });

    renderer.addInteractiveElement({
      id: 'explore_again',
      type: 'button_click',
      x: 300,
      y: 500,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(300, 500, 200, 50, 12, this.colors.success);
    renderer.drawText("Explore Again", 400, 530, this.colors.text, 14, 'bold');
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      hookStep: this.hookStep,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      balloonSize: this.balloonSize,
      balloonX: this.balloonX,
      isLaunched: this.isLaunched,
      airRemaining: this.airRemaining,
      smallBalloonX: this.smallBalloonX,
      largeBalloonX: this.largeBalloonX,
      twistLaunched: this.twistLaunched,
      smallAir: this.smallAir,
      largeAir: this.largeAir,
      reviewStep: this.reviewStep,
      twistReviewStep: this.twistReviewStep,
      testQuestionIndex: this.testQuestionIndex,
      testScore: this.testScore,
      testAnswered: this.testAnswered,
      showExplanation: this.showExplanation,
      activeApp: this.activeApp,
      completedApps: Array.from(this.completedApps)
    };
  }

  restoreState(state: Record<string, unknown>): void {
    this.phase = state.phase as GamePhase;
    this.hookStep = state.hookStep as number;
    this.prediction = state.prediction as string | null;
    this.twistPrediction = state.twistPrediction as string | null;
    this.balloonSize = state.balloonSize as number;
    this.balloonX = state.balloonX as number;
    this.isLaunched = state.isLaunched as boolean;
    this.airRemaining = state.airRemaining as number;
    this.smallBalloonX = state.smallBalloonX as number;
    this.largeBalloonX = state.largeBalloonX as number;
    this.twistLaunched = state.twistLaunched as boolean;
    this.smallAir = state.smallAir as number;
    this.largeAir = state.largeAir as number;
    this.reviewStep = state.reviewStep as number;
    this.twistReviewStep = state.twistReviewStep as number;
    this.testQuestionIndex = state.testQuestionIndex as number;
    this.testScore = state.testScore as number;
    this.testAnswered = state.testAnswered as boolean;
    this.showExplanation = state.showExplanation as boolean;
    this.activeApp = state.activeApp as number;
    this.completedApps = new Set(state.completedApps as number[]);
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createNewtonsThirdLawGame(sessionId: string): NewtonsThirdLawGame {
  return new NewtonsThirdLawGame(sessionId);
}
