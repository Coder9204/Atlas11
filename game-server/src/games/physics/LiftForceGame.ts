import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// LIFT FORCE (Angular Momentum Transfer) GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: L = I * omega (Angular momentum = Moment of inertia * Angular velocity)
// Cat righting reflex demonstrates conservation of angular momentum
// By changing moment of inertia distribution, cats rotate without external torque
// L_total = 0 always, but asymmetric I allows net rotation
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
const CAT_RIGHTING_TIME = 0.3; // seconds to complete rotation
const MIN_FALL_HEIGHT = 0.3; // meters (~1 foot)
const MOMENT_INERTIA_RATIO = 3; // Extended vs tucked limbs

export class LiftForceGame extends BaseGame {
  readonly gameType = 'lift_force';
  readonly gameTitle = 'Angular Momentum Transfer: The Cat Righting Reflex';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Animation parameters
  private animationTime = 0;
  private fallProgress = 0;
  private catRotation = 180; // Starts upside down
  private frontLegsExtended = false;
  private backLegsExtended = true;
  private isAnimating = false;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "A cat is dropped upside down from a height of 1 meter.",
      question: "How can a cat rotate in mid-air without external torque?",
      options: [
        "It pushes against the air",
        "It transfers angular momentum between body parts",
        "Gravity helps it rotate",
        "Cats have a special anti-gravity organ"
      ],
      correctIndex: 1,
      explanation: "Cats transfer angular momentum between body segments. By tucking one half (small I, fast rotation) while extending the other (large I, slow counter-rotation), they achieve net rotation while conserving total angular momentum at zero."
    },
    {
      scenario: "During the righting reflex, a cat tucks its front legs while extending its back legs.",
      question: "When a cat extends one set of legs while tucking the other, which part rotates more?",
      options: [
        "Both halves rotate the same amount",
        "The tucked half rotates more",
        "The extended half rotates more",
        "Neither half rotates"
      ],
      correctIndex: 1,
      explanation: "The tucked half has smaller moment of inertia (I), so for the same angular momentum (L = I * omega), it must have higher angular velocity. The tucked portion rotates faster and more than the extended portion."
    },
    {
      scenario: "A physicist analyzes the total angular momentum during a cat's fall.",
      question: "During the righting reflex, the total angular momentum of the cat is:",
      options: [
        "Constantly increasing",
        "Constantly decreasing",
        "Zero (or constant)",
        "Negative"
      ],
      correctIndex: 2,
      explanation: "Angular momentum is conserved. Starting with zero angular momentum (dropped without spin), the total must remain zero. Internal redistribution allows rotation without violating conservation."
    },
    {
      scenario: "A student compares the moment of inertia of extended vs tucked limbs.",
      question: "The moment of inertia of extended legs compared to tucked legs is:",
      options: [
        "Smaller",
        "Larger",
        "The same",
        "Undefined"
      ],
      correctIndex: 1,
      explanation: "Moment of inertia I = sum(m*r^2). Extended legs have mass further from the rotation axis (larger r), so I is larger. This is why ice skaters spin faster when they pull in their arms."
    },
    {
      scenario: "An engineer is designing a falling robot that needs to self-right.",
      question: "If a body part has lower moment of inertia, it can rotate:",
      options: [
        "Slower",
        "Faster for the same angular momentum",
        "Not at all",
        "Only backward"
      ],
      correctIndex: 1,
      explanation: "From L = I * omega, if L is constant and I decreases, omega must increase. Lower moment of inertia means faster rotation for the same angular momentum transfer."
    },
    {
      scenario: "An astronaut floating in the International Space Station needs to reorient.",
      question: "Astronauts can self-rotate in space using the same principle by:",
      options: [
        "Swimming through air",
        "Extending and retracting their limbs asymmetrically",
        "Using jet packs only",
        "Pushing off walls only"
      ],
      correctIndex: 1,
      explanation: "Astronauts use the exact same physics as cats! By asymmetrically moving their limbs (arm circles, bicycle legs), they can reorient without grabbing anything or using thrusters."
    },
    {
      scenario: "A veterinarian is studying cat physiology and safety.",
      question: "The minimum height for a cat to right itself is approximately:",
      options: [
        "1 centimeter",
        "30 centimeters (about 1 foot)",
        "5 meters",
        "Any height works"
      ],
      correctIndex: 1,
      explanation: "Cats need about 0.3 seconds to complete the righting reflex. From physics, falling 30 cm takes about 0.25 seconds (h = 0.5*g*t^2), giving them just enough time to rotate."
    },
    {
      scenario: "A physics student is analyzing conservation laws during free fall.",
      question: "If a falling object has zero initial angular momentum, its final angular momentum will be:",
      options: [
        "Positive",
        "Negative",
        "Zero",
        "Depends on shape"
      ],
      correctIndex: 2,
      explanation: "Angular momentum is conserved in the absence of external torque. If initial L = 0, final L = 0. Internal motions can change orientation but cannot create net angular momentum."
    },
    {
      scenario: "A historian of science is researching early motion studies.",
      question: "The cat righting problem was famously studied using:",
      options: [
        "Slow motion photography",
        "Computer simulations only",
        "Mathematical theory only",
        "It has never been studied"
      ],
      correctIndex: 0,
      explanation: "Etienne-Jules Marey used chronophotography (slow-motion photography) in 1894 to capture the cat righting sequence. This was groundbreaking work in understanding animal motion."
    },
    {
      scenario: "An Olympic diving coach is training athletes for twist dives.",
      question: "A diver performing twists uses the same principle by:",
      options: [
        "Flapping their arms like wings",
        "Asymmetrically moving arms and legs",
        "Holding completely still",
        "Spinning before jumping"
      ],
      correctIndex: 1,
      explanation: "Divers initiate and control twists through asymmetric arm and leg movements. They can add rotations after leaving the board using angular momentum transfer between body parts."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🏊",
      title: "Diving & Gymnastics",
      tagline: "Mid-air rotational control",
      description: "Divers and gymnasts use asymmetric arm and leg movements to control twists in mid-air, adding rotations after leaving the platform.",
      connection: "A diver can initiate a twist by dropping one shoulder and asymmetrically moving their arms - the same physics that rights a cat."
    },
    {
      icon: "🚀",
      title: "Space Operations",
      tagline: "Astronaut self-rotation techniques",
      description: "Astronauts use self-rotation techniques during spacewalks and inside spacecraft without grabbing surfaces.",
      connection: "NASA trains astronauts in these maneuvers. Being able to reorient without grabbing anything can be crucial during EVAs."
    },
    {
      icon: "🤖",
      title: "Falling Robots",
      tagline: "Robotic self-righting systems",
      description: "Aerial drones and falling robots use reaction wheels and limb movements to self-right during falls.",
      connection: "Boston Dynamics robots use rapid limb movements to reorient during falls. Some drones have internal reaction wheels."
    },
    {
      icon: "⛸️",
      title: "Ice Skating Spins",
      tagline: "Spin direction control",
      description: "Skaters use arm and leg positions not just for speed, but also to initiate and control twist direction.",
      connection: "A skater can start a spin in one direction, then use asymmetric movements to reverse it or add twisting rotations."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate rotation physics
  private calculateRotation(frontTucked: boolean, backTucked: boolean): { frontRotation: number; backRotation: number } {
    // I_tucked = I_base, I_extended = I_base * RATIO
    // L_front + L_back = 0
    // I_front * omega_front + I_back * omega_back = 0
    const I_front = frontTucked ? 1 : MOMENT_INERTIA_RATIO;
    const I_back = backTucked ? 1 : MOMENT_INERTIA_RATIO;

    // For equal angular momentum transfer, rotation is inversely proportional to I
    const totalI = I_front + I_back;
    const frontRotation = (I_back / totalI) * 90; // Front gets more rotation if back is extended
    const backRotation = (I_front / totalI) * 90;

    return { frontRotation, backRotation };
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
        } else if (buttonId === 'watch_fall') {
          this.isAnimating = true;
          this.fallProgress = 0;
          this.catRotation = 180;
        }
        break;

      case 'predict':
        if (!this.showPredictionFeedback) {
          if (buttonId.startsWith('option_')) {
            this.prediction = parseInt(buttonId.split('_')[1]);
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
        }
        break;

      case 'play':
        if (buttonId === 'start_animation') {
          this.isAnimating = true;
          this.fallProgress = 0;
          this.catRotation = 180;
          this.frontLegsExtended = false;
          this.backLegsExtended = true;
        } else if (buttonId === 'continue') {
          this.phase = 'review';
        }
        break;

      case 'review':
        if (buttonId === 'continue') {
          this.phase = 'twist_predict';
        }
        break;

      case 'twist_predict':
        if (!this.showTwistFeedback) {
          if (buttonId.startsWith('option_')) {
            this.twistPrediction = parseInt(buttonId.split('_')[1]);
            this.showTwistFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'twist_play';
          this.showTwistFeedback = false;
        }
        break;

      case 'twist_play':
        if (buttonId === 'continue') {
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

  processInput(input: UserInput, config: SessionConfig): void {
    this.handleInput(input);
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.fallProgress = 0;
    this.catRotation = 180;
    this.frontLegsExtended = false;
    this.backLegsExtended = true;
    this.isAnimating = false;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Cat righting animation
    if (this.isAnimating) {
      this.fallProgress += deltaTime * 200; // Progress in percent

      if (this.fallProgress < 30) {
        // Phase 1: Front legs tuck, back legs extend
        this.frontLegsExtended = false;
        this.backLegsExtended = true;
        this.catRotation = 180 - (this.fallProgress / 30) * 90;
      } else if (this.fallProgress < 60) {
        // Phase 2: Swap - front extend, back tuck
        this.frontLegsExtended = true;
        this.backLegsExtended = false;
        this.catRotation = 90 - ((this.fallProgress - 30) / 30) * 90;
      } else if (this.fallProgress < 100) {
        // Phase 3: Both extend for landing
        this.frontLegsExtended = true;
        this.backLegsExtended = true;
        this.catRotation = Math.max(0, 0 - ((this.fallProgress - 60) / 40) * 5);
      } else {
        this.isAnimating = false;
        this.fallProgress = 0;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(249, 115, 22, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(251, 191, 36, 0.05)' });

    // Render phase-specific content
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

    // Progress indicator
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

  private renderCat(r: CommandRenderer, x: number, y: number, rotation: number, frontExt: boolean, backExt: boolean): void {
    // Transform origin at center
    const rad = (rotation * Math.PI) / 180;

    // Cat body (simplified representation)
    r.roundRect(x - 30, y - 15, 60, 30, 10, { fill: '#f97316' });

    // Head
    r.circle(x - 35, y, 12, { fill: '#fb923c' });

    // Ears
    r.polygon([
      { x: x - 42, y: y - 8 },
      { x: x - 45, y: y - 20 },
      { x: x - 35, y: y - 10 }
    ], { fill: '#ea580c' });
    r.polygon([
      { x: x - 28, y: y - 8 },
      { x: x - 25, y: y - 20 },
      { x: x - 35, y: y - 10 }
    ], { fill: '#ea580c' });

    // Eyes
    r.circle(x - 40, y - 2, 2, { fill: '#1e293b' });
    r.circle(x - 30, y - 2, 2, { fill: '#1e293b' });

    // Front legs
    if (frontExt) {
      r.rect(x - 25, y + 10, 6, 20, { fill: '#ea580c' });
      r.rect(x - 15, y + 10, 6, 20, { fill: '#ea580c' });
    } else {
      r.rect(x - 23, y + 10, 5, 10, { fill: '#ea580c' });
      r.rect(x - 15, y + 10, 5, 10, { fill: '#ea580c' });
    }

    // Back legs
    if (backExt) {
      r.rect(x + 10, y + 10, 6, 20, { fill: '#ea580c' });
      r.rect(x + 20, y + 10, 6, 20, { fill: '#ea580c' });
    } else {
      r.rect(x + 12, y + 10, 5, 10, { fill: '#ea580c' });
      r.rect(x + 20, y + 10, 5, 10, { fill: '#ea580c' });
    }

    // Tail
    r.roundRect(x + 30, y - 5, 25, 6, 3, { fill: '#ea580c' });

    // Rotation indicator
    r.text(x, y + 45, `Rotation: ${Math.round(180 - rotation)}deg`, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
  }

  private renderHook(r: CommandRenderer): void {
    // Badge
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(249, 115, 22, 0.1)' });
    r.text(200, 80, 'ANGULAR MOMENTUM', { fill: '#f97316', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Cat Righting Reflex', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'How do cats always land on their feet?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Cat visualization
    this.renderCat(r, 200, 280, this.catRotation, this.frontLegsExtended, this.backLegsExtended);

    // Fact card
    r.roundRect(40, 350, 320, 120, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 385, 'Cats can rotate their bodies', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 410, 'in mid-air with ZERO external torque!', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 445, 'The physics is pure angular momentum transfer.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Buttons
    r.addButton({ id: 'watch_fall', label: 'Watch Cat Fall', variant: 'secondary' });
    r.addButton({ id: 'discover', label: 'Discover the Secret', variant: 'primary' });

    r.setCoachMessage('Explore how angular momentum transfer allows cats to self-right!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'A cat is dropped upside down in free fall.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'How does it rotate to land on its feet?', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'It pushes against the air like swimming',
      'Gravity pulls one side down first',
      'It redistributes angular momentum between body parts',
      'Cats have a special anti-gravity organ'
    ];

    options.forEach((option, i) => {
      const y = 220 + i * 65;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (i === 2) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.prediction) {
        bgColor = 'rgba(249, 115, 22, 0.3)';
      }

      r.roundRect(30, y, 340, 55, 10, { fill: bgColor });
      r.text(50, y + 32, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 500, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 2 ? 'Excellent intuition!' : 'The answer: Angular momentum transfer!';
      r.text(200, 530, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 560, 'Cats swap between extended/tucked limbs to rotate.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See How It Works', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 60, 'Cat Righting Lab', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization area
    r.roundRect(20, 90, 360, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Cat at current state
    this.renderCat(r, 200, 220, this.catRotation, this.frontLegsExtended, this.backLegsExtended);

    // Phase indicator
    let phaseText = 'Ready';
    if (this.isAnimating) {
      if (this.fallProgress < 30) {
        phaseText = 'Phase 1: Front tucks, back extends';
      } else if (this.fallProgress < 60) {
        phaseText = 'Phase 2: Front extends, back tucks';
      } else {
        phaseText = 'Phase 3: Landing preparation';
      }
    }
    r.text(200, 340, phaseText, { fill: '#f97316', fontSize: 12, textAnchor: 'middle' });

    // Progress bar
    r.roundRect(50, 360, 300, 8, 4, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.roundRect(50, 360, Math.min(300, this.fallProgress * 3), 8, 4, { fill: '#f97316' });

    // Explanation
    r.roundRect(20, 390, 360, 120, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 415, 'The Two-Phase Righting Reflex', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 445, 'Phase 1: Tucked front rotates fast,', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 465, 'extended back rotates slow (counter).', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 490, 'Phase 2: Swap! Back catches up. Result: 180deg!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'start_animation', label: 'Start Cat Drop', variant: 'secondary' });
    r.addButton({ id: 'continue', label: 'Review the Physics', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 60, 'Angular Momentum Transfer', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Core principle card
    r.roundRect(30, 90, 340, 140, 16, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(200, 120, 'The Core Principle', { fill: '#f97316', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 150, 'L = I x omega', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 175, 'Angular momentum = Moment of inertia x Angular velocity', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 200, 'Total L = 0, but internal redistribution allows rotation!', { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });

    // Cat anatomy card
    r.roundRect(30, 245, 340, 120, 16, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(200, 275, "Cat's Flexible Spine", { fill: '#22d3ee', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 305, '30+ vertebrae allow front/back to rotate', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 325, 'almost independently. No collarbone!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 350, 'Complete reflex in under 0.3 seconds', { fill: '#fbbf24', fontSize: 11, textAnchor: 'middle' });

    // The math
    r.roundRect(30, 380, 340, 100, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 410, 'The Math', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 435, 'L_front + L_back = 0 (always)', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 455, 'Tucked part: small I, large omega (fast rotation)', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 475, 'Extended part: large I, small omega (slow rotation)', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Discover the Twist', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist Challenge', { fill: '#a855f7', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'An astronaut floats in the middle of a', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'space station, not touching anything.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 180, 'Can they rotate to face a different direction?', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'No - without something to push, rotation is impossible',
      'Yes - they can use the same technique as cats',
      'Only if they throw something',
      'Only with special equipment'
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (i === 1) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.twistPrediction) {
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 1 ? 'Exactly right!' : 'Astronauts CAN self-rotate!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 530, "Same physics as cats - it's slower but works!", { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 550, 'NASA trains astronauts in these techniques.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See How', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Astronaut Self-Rotation', { fill: '#a855f7', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Comparison cards
    r.roundRect(25, 90, 170, 180, 12, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(110, 115, 'Cat Method', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 145, 'Flexible spine allows', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 165, 'front/back independent', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 185, 'rotation in milliseconds', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 215, '< 0.3 seconds', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(205, 90, 170, 180, 12, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(290, 115, 'Astronaut Method', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 145, 'Asymmetric arm circles,', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 165, 'bicycle legs, hip rotation', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 185, '- much slower but works!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 215, 'Several seconds', { fill: '#eab308', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Techniques list
    r.roundRect(25, 285, 350, 150, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 315, 'Astronaut Techniques', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 345, 'Arm circles: Extend one, circle while other tucked', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 365, 'Bicycle legs: Asymmetric pedaling motion', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 385, 'Hula motion: Rotate hips with fixed shoulders', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 415, 'Same physics - humans are just less flexible!', { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review the Discovery', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Key Discovery', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Main insight
    r.roundRect(25, 85, 350, 180, 16, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 115, 'Angular Momentum Transfer', { fill: '#a855f7', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 140, 'Is Universal!', { fill: '#a855f7', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(200, 175, 'Any object with movable parts can change', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 195, 'orientation without external forces by:', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 225, '1. Changing moment of inertia distribution', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 245, '2. Rotating different sections at different rates', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Applications preview
    r.roundRect(25, 280, 350, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 310, 'This works everywhere:', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 340, 'Space, underwater, mid-air - anywhere!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 365, 'No magic required, just physics!', { fill: '#fbbf24', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#f97316';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.tagline, { fill: '#f97316', fontSize: 11, textAnchor: 'middle' });

    // Description (wrapped)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 230;
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

    // Physics connection
    r.roundRect(40, 320, 320, 60, 10, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(200, 345, 'Physics Connection', { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 368, app.connection.substring(0, 50) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 400, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 440, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Continue button
    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Scenario
      r.roundRect(25, 100, 350, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 125, question.scenario.substring(0, 55), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
      r.text(200, 145, question.scenario.substring(55), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

      // Question
      r.text(200, 195, question.question, { fill: '#f97316', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 220 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(249, 115, 22, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 45, 8, { fill: bgColor });
        r.text(40, y + 27, `${String.fromCharCode(65 + i)}. ${option.substring(0, 42)}${option.length > 42 ? '...' : ''}`, { fill: isSelected ? '#f97316' : '#e2e8f0', fontSize: 10 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      // Navigation
      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: 'Previous', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next', variant: 'secondary' });
      }

      // Submit button
      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      } else {
        r.text(200, 450, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "You've mastered angular momentum!" : 'Keep studying and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Trophy
    r.text(200, 120, '🐱', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Angular Momentum Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, "You've mastered the cat righting reflex", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'and angular momentum transfer!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '🔄', label: 'L = I x omega' },
      { icon: '🐱', label: 'Righting Reflex' },
      { icon: '🚀', label: 'Space Maneuvers' },
      { icon: '⚖️', label: 'Moment of Inertia' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 295 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 460, 300, 70, 12, { fill: 'rgba(249, 115, 22, 0.2)' });
    r.text(200, 488, 'Key Formula', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 515, 'L = I * omega (L_total = 0)', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering angular momentum transfer!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      animationTime: this.animationTime,
      fallProgress: this.fallProgress,
      catRotation: this.catRotation,
      frontLegsExtended: this.frontLegsExtended,
      backLegsExtended: this.backLegsExtended,
      isAnimating: this.isAnimating,
      testAnswers: this.testAnswers,
      currentQuestionIndex: this.currentQuestionIndex,
      showTestResults: this.showTestResults,
      activeAppIndex: this.activeAppIndex,
      completedApps: Array.from(this.completedApps)
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as GamePhase;
    if (state.prediction !== undefined) this.prediction = state.prediction as number | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as number | null;
    if (state.showPredictionFeedback !== undefined) this.showPredictionFeedback = state.showPredictionFeedback as boolean;
    if (state.showTwistFeedback !== undefined) this.showTwistFeedback = state.showTwistFeedback as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.fallProgress !== undefined) this.fallProgress = state.fallProgress as number;
    if (state.catRotation !== undefined) this.catRotation = state.catRotation as number;
    if (state.frontLegsExtended !== undefined) this.frontLegsExtended = state.frontLegsExtended as boolean;
    if (state.backLegsExtended !== undefined) this.backLegsExtended = state.backLegsExtended as boolean;
    if (state.isAnimating !== undefined) this.isAnimating = state.isAnimating as boolean;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createLiftForceGame(sessionId: string): LiftForceGame {
  return new LiftForceGame(sessionId);
}
