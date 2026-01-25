// ============================================================================
// TorqueGame - Torque and Lever Arms
// Physics: torque = Force x Lever arm (perpendicular distance)
// ============================================================================

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// Protected physics constants - NEVER sent to client
const SMOOTH_HINGE_TORQUE = 15; // N-m
const STICKY_HINGE_TORQUE = 30; // N-m (with friction)

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PHASES: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

interface TorqueState {
  phase: Phase;
  prediction: string | null;
  twistPrediction: string | null;
  pushPosition: number; // 0.1 to 1.0 (fraction of door length)
  hasFriction: boolean;
  isPushing: boolean;
  doorAngle: number;
  experimentCount: number;
  showForceVector: boolean;
  activeApp: number;
  completedApps: Set<number>;
  currentQuestion: number;
  selectedAnswer: number | null;
  correctAnswers: number;
  answeredQuestions: Set<number>;
  sessionId: string;
}

// Test questions - correctIndex is PROTECTED
const TEST_QUESTIONS = [
  {
    question: "Why is it easier to open a door by pushing at the handle (far from hinge)?",
    options: [
      "The handle is smoother",
      "Larger lever arm = less force needed",
      "The door is lighter there",
      "It's not actually easier"
    ],
    correctIndex: 1,
    explanation: "Torque = Force x Lever arm. With a larger lever arm (distance from hinge), you need less force to create the same torque."
  },
  {
    question: "What is the correct formula for torque?",
    options: [
      "torque = F + r",
      "torque = F x r",
      "torque = F / r",
      "torque = F - r"
    ],
    correctIndex: 1,
    explanation: "Torque (torque) equals force (F) times the perpendicular distance (r) from the pivot point: torque = F x r"
  },
  {
    question: "If you push a door at half the distance from the hinge, you need:",
    options: [
      "Half the force",
      "The same force",
      "Twice the force",
      "Four times the force"
    ],
    correctIndex: 2,
    explanation: "Since torque = F x r, halving r means you need to double F to maintain the same torque."
  },
  {
    question: "Door handles are placed far from hinges because:",
    options: [
      "It looks better aesthetically",
      "Maximizes lever arm, minimizing force needed",
      "It's where the door is strongest",
      "There's no particular reason"
    ],
    correctIndex: 1,
    explanation: "Engineers place handles far from hinges to maximize the lever arm, making doors easy to open with minimal force."
  },
  {
    question: "A sticky hinge increases the force needed because:",
    options: [
      "It adds friction resistance to overcome",
      "It makes the door heavier",
      "It changes the lever arm length",
      "It doesn't affect the force needed"
    ],
    correctIndex: 0,
    explanation: "Friction at the hinge creates a resisting torque that must be overcome in addition to the torque needed to accelerate the door."
  },
  {
    question: "A wrench with a longer handle:",
    options: [
      "Is always heavier to use",
      "Provides more torque for the same force",
      "Provides less torque overall",
      "Doesn't affect the torque"
    ],
    correctIndex: 1,
    explanation: "A longer wrench handle increases the lever arm, so the same force produces more torque."
  },
  {
    question: "To balance a seesaw with unequal weights:",
    options: [
      "Put the heavier weight in the middle",
      "Put the heavier weight closer to pivot",
      "Put the lighter weight closer to pivot",
      "It cannot be balanced"
    ],
    correctIndex: 1,
    explanation: "For balance, torques must be equal: W1 x r1 = W2 x r2. The heavier weight needs a shorter lever arm."
  },
  {
    question: "Why do doorstops work best when placed far from the hinge?",
    options: [
      "They're easier to see there",
      "Maximum leverage prevents door motion",
      "The door is thinner there",
      "Position doesn't matter"
    ],
    correctIndex: 1,
    explanation: "Placing a doorstop far from the hinge maximizes the resisting moment arm, making it harder to push the door open."
  },
  {
    question: "A torque wrench is designed to measure:",
    options: [
      "The weight of the wrench",
      "Rotational force being applied",
      "The length of the wrench",
      "The turning speed"
    ],
    correctIndex: 1,
    explanation: "A torque wrench measures the rotational force (torque) being applied to a fastener, ensuring proper tightening."
  },
  {
    question: "If torque = 20 N-m and lever arm = 0.5 m, what force is applied?",
    options: [
      "10 N",
      "40 N",
      "20 N",
      "0.025 N"
    ],
    correctIndex: 1,
    explanation: "Using torque = F x r: 20 = F x 0.5, solving for F gives F = 40 N."
  }
];

// Transfer applications
const APPLICATIONS = [
  {
    id: 'wrench',
    title: "Wrench & Bolts",
    description: "Longer wrenches provide more torque with less effort. Mechanics use breaker bars for stubborn bolts - maximum leverage from extended handles!",
    formula: "torque = F x r",
    insight: "2x handle length = 2x torque"
  },
  {
    id: 'steering',
    title: "Steering Wheels",
    description: "Large steering wheels require less force to turn. Power steering reduces the torque needed at your hands, making driving effortless.",
    formula: "F = torque / r",
    insight: "Larger radius = less effort"
  },
  {
    id: 'seesaw',
    title: "Seesaw Balance",
    description: "Torque balance determines equilibrium. A heavier child sits closer to the pivot to balance a lighter child sitting farther away.",
    formula: "m1*r1 = m2*r2",
    insight: "Balance point shifts with mass"
  },
  {
    id: 'bicycle',
    title: "Bicycle Pedals",
    description: "The crank arm length affects your torque output. Longer cranks provide more leverage but require greater leg movement per rotation.",
    formula: "torque = F x crank length",
    insight: "Typical crank: 170-175mm"
  }
];

export class TorqueGame extends BaseGame {
  readonly gameType = 'torque';
  readonly gameTitle = 'Torque and Lever Arms';

  private state: TorqueState;

  constructor(sessionId: string, _config?: SessionConfig) {
    super(sessionId);
    this.state = {
      phase: 'hook',
      prediction: null,
      twistPrediction: null,
      pushPosition: 0.8,
      hasFriction: false,
      isPushing: false,
      doorAngle: 0,
      experimentCount: 0,
      showForceVector: true,
      activeApp: 0,
      completedApps: new Set(),
      currentQuestion: 0,
      selectedAnswer: null,
      correctAnswers: 0,
      answeredQuestions: new Set(),
      sessionId
    };
  }

  // PROTECTED: Calculate required torque based on friction
  private getRequiredTorque(): number {
    return this.state.hasFriction ? STICKY_HINGE_TORQUE : SMOOTH_HINGE_TORQUE;
  }

  // PROTECTED: Calculate required force based on position and torque
  private calculateRequiredForce(): number {
    const torque = this.getRequiredTorque();
    const leverArm = Math.max(0.1, this.state.pushPosition);
    return torque / leverArm;
  }

  // PROTECTED: Calculate test score
  private calculateScore(): number {
    let correct = 0;
    for (const qIndex of this.state.answeredQuestions) {
      const savedAnswer = this.getAnswerForQuestion(qIndex);
      if (savedAnswer === TEST_QUESTIONS[qIndex].correctIndex) {
        correct++;
      }
    }
    return correct;
  }

  // Helper to store answers
  private answers: Map<number, number> = new Map();

  private getAnswerForQuestion(qIndex: number): number | undefined {
    return this.answers.get(qIndex);
  }

  private setAnswerForQuestion(qIndex: number, aIndex: number): void {
    this.answers.set(qIndex, aIndex);
  }

  handleInput(input: UserInput): void {
    if (input.type === 'button_click') {
      switch (input.id) {
        case 'start':
          this.state.phase = 'predict';
          break;
        case 'predict_near':
          this.state.prediction = 'near_hinge';
          break;
        case 'predict_middle':
          this.state.prediction = 'middle';
          break;
        case 'predict_far':
          this.state.prediction = 'far_edge';
          break;
        case 'test_it':
          if (this.state.prediction) this.state.phase = 'play';
          break;
        case 'push_door':
          if (!this.state.isPushing) {
            this.state.isPushing = true;
            this.state.doorAngle = 0;
            // Animation will happen in update
          }
          break;
        case 'reset_door':
          this.state.isPushing = false;
          this.state.doorAngle = 0;
          break;
        case 'toggle_vectors':
          this.state.showForceVector = !this.state.showForceVector;
          break;
        case 'see_pattern':
          this.state.phase = 'review';
          break;
        case 'try_twist':
          this.state.phase = 'twist_predict';
          break;
        case 'twist_same':
          this.state.twistPrediction = 'same';
          break;
        case 'twist_more':
          this.state.twistPrediction = 'more';
          break;
        case 'twist_less':
          this.state.twistPrediction = 'less';
          break;
        case 'test_sticky':
          if (this.state.twistPrediction) {
            this.state.hasFriction = true;
            this.state.doorAngle = 0;
            this.state.phase = 'twist_play';
          }
          break;
        case 'toggle_friction':
          this.state.hasFriction = !this.state.hasFriction;
          this.state.doorAngle = 0;
          break;
        case 'understand':
          this.state.phase = 'twist_review';
          break;
        case 'see_applications':
          this.state.phase = 'transfer';
          break;
        case 'prev_app':
          this.state.activeApp = Math.max(0, this.state.activeApp - 1);
          break;
        case 'next_app':
          if (this.state.completedApps.has(this.state.activeApp)) {
            this.state.activeApp = Math.min(APPLICATIONS.length - 1, this.state.activeApp + 1);
          }
          break;
        case 'mark_complete':
          this.state.completedApps.add(this.state.activeApp);
          if (this.state.activeApp < APPLICATIONS.length - 1) {
            this.state.activeApp++;
          }
          break;
        case 'take_test':
          this.state.phase = 'test';
          break;
        case 'prev_question':
          if (this.state.currentQuestion > 0) {
            this.state.currentQuestion--;
            this.state.selectedAnswer = this.getAnswerForQuestion(this.state.currentQuestion) ?? null;
          }
          break;
        case 'next_question':
          if (this.state.currentQuestion < TEST_QUESTIONS.length - 1) {
            this.state.currentQuestion++;
            this.state.selectedAnswer = this.getAnswerForQuestion(this.state.currentQuestion) ?? null;
          }
          break;
        case 'complete_test':
          if (this.state.answeredQuestions.size === TEST_QUESTIONS.length) {
            this.state.correctAnswers = this.calculateScore();
            this.state.phase = 'mastery';
          }
          break;
        case 'play_again':
          this.resetGame();
          break;
      }

      // Handle test answer buttons
      if (input.id.startsWith('answer_')) {
        const answerIndex = parseInt(input.id.replace('answer_', ''));
        if (!this.state.answeredQuestions.has(this.state.currentQuestion)) {
          this.state.selectedAnswer = answerIndex;
          this.setAnswerForQuestion(this.state.currentQuestion, answerIndex);
          this.state.answeredQuestions.add(this.state.currentQuestion);
          // Check if correct
          if (answerIndex === TEST_QUESTIONS[this.state.currentQuestion].correctIndex) {
            this.state.correctAnswers++;
          }
        }
      }
    }

    if (input.type === 'slider_change') {
      if (input.id === 'push_position') {
        this.state.pushPosition = input.value as number;
        this.state.doorAngle = 0;
        this.state.isPushing = false;
      }
    }
  }

  getCurrentPhase(): string {
    return this.state.phase;
  }

  update(deltaTime: number): void {
    // Animate door opening
    if (this.state.isPushing && this.state.doorAngle < 60) {
      const requiredForce = this.calculateRequiredForce();
      const speed = 150 / requiredForce;
      this.state.doorAngle = Math.min(60, this.state.doorAngle + speed);

      if (this.state.doorAngle >= 60) {
        this.state.isPushing = false;
        this.state.experimentCount++;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer();

    r.setProgress({
      id: 'phase_progress',
      current: PHASES.indexOf(this.state.phase),
      total: PHASES.length,
      labels: ['Hook', 'Predict', 'Lab', 'Review', 'Twist', 'Twist Lab', 'Twist Review', 'Transfer', 'Test', 'Mastery']
    });

    switch (this.state.phase) {
      case 'hook': this.renderHook(r); break;
      case 'predict': this.renderPredict(r); break;
      case 'play': this.renderPlay(r); break;
      case 'review': this.renderReview(r); break;
      case 'twist_predict': this.renderTwistPredict(r); break;
      case 'twist_play': this.renderTwistPlay(r); break;
      case 'twist_review': this.renderTwistReview(r); break;
      case 'transfer': this.renderTransfer(r); break;
      case 'test': this.renderTest(r); break;
      case 'mastery': this.renderMastery(r); break;
    }

    return r.toFrame(Date.now());
  }

  private renderHook(r: CommandRenderer): void {
    r.text(200, 30, 'The Door Handle Mystery', { fill: '#1e293b', fontSize: 24, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 55, 'Have you ever tried to push a door near its hinges?', { fill: '#64748b', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 75, "It's surprisingly hard!", { fill: '#64748b', fontSize: 13, textAnchor: 'middle' });

    // Door visualization
    r.rect(50, 120, 150, 120, { fill: '#a08060' }); // Door
    r.circle(60, 180, 8, { fill: '#4a4a5a' }); // Hinge
    r.circle(185, 180, 10, { fill: '#c9a97c' }); // Handle

    r.text(200, 260, 'Where should you push to need the LEAST force?', { fill: '#a855f7', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });

    r.addButton({ id: 'start', label: "Let's Investigate", variant: 'primary' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 25, 'Make Your Prediction', { fill: '#1e293b', fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 50, 'To open a door with the least effort, where should you push?', { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });

    // Door with options
    r.rect(100, 80, 180, 80, { fill: '#a08060' });
    r.circle(105, 120, 6, { fill: '#4a4a5a' }); // Hinge
    r.text(110, 135, 'Hinge', { fill: '#64748b', fontSize: 9, textAnchor: 'start' });

    // Push positions
    r.circle(130, 120, 8, { fill: this.state.prediction === 'near_hinge' ? '#22c55e' : '#e2e8f0' });
    r.circle(185, 120, 8, { fill: this.state.prediction === 'middle' ? '#22c55e' : '#e2e8f0' });
    r.circle(260, 120, 8, { fill: this.state.prediction === 'far_edge' ? '#22c55e' : '#e2e8f0' });

    r.addButton({ id: 'predict_near', label: 'Near the hinge', variant: this.state.prediction === 'near_hinge' ? 'primary' : 'secondary' });
    r.addButton({ id: 'predict_middle', label: 'In the middle', variant: this.state.prediction === 'middle' ? 'primary' : 'secondary' });
    r.addButton({ id: 'predict_far', label: 'Far from hinge (handle)', variant: this.state.prediction === 'far_edge' ? 'primary' : 'secondary' });

    if (this.state.prediction) {
      r.addButton({ id: 'test_it', label: 'Test It!', variant: 'success' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    const requiredForce = this.calculateRequiredForce();
    const torque = this.getRequiredTorque();
    const posPercent = (this.state.pushPosition * 100).toFixed(0);

    r.text(200, 20, 'Torque Laboratory', { fill: '#1e293b', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });

    // Door visualization (top-down view)
    r.text(200, 45, 'Top-Down View (looking down at door)', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });

    // Wall
    r.rect(20, 80, 30, 100, { fill: '#4a4a5a' });

    // Door (rotated based on angle)
    const doorLength = 180;
    const hingeX = 50;
    const hingeY = 130;
    const angleRad = (this.state.doorAngle * Math.PI) / 180;
    const doorEndX = hingeX + doorLength * Math.cos(angleRad);
    const doorEndY = hingeY + doorLength * Math.sin(angleRad);

    // Simple door line representation
    r.rect(hingeX, hingeY - 10, doorLength - this.state.doorAngle, 20, { fill: '#a08060' });

    // Hinge
    r.circle(hingeX, hingeY, 10, { fill: this.state.hasFriction ? '#8b4513' : '#5a5a6a' });
    if (this.state.hasFriction) {
      r.text(hingeX, hingeY + 25, 'Sticky!', { fill: '#f97316', fontSize: 9, textAnchor: 'middle', fontWeight: 'bold' });
    }

    // Push position indicator
    const pushX = hingeX + this.state.pushPosition * (doorLength - 30);
    r.circle(pushX, hingeY, 8, { fill: '#22c55e' });

    // Force display
    if (this.state.showForceVector) {
      r.text(pushX, hingeY - 30, `F = ${requiredForce.toFixed(1)}N`, { fill: '#22c55e', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });
      r.text(hingeX + (this.state.pushPosition * doorLength) / 2, hingeY + 35, `r = ${posPercent}%`, { fill: '#3b82f6', fontSize: 10, textAnchor: 'middle' });
    }

    // Torque and Force meters
    r.rect(280, 70, 100, 40, { fill: '#181220' });
    r.text(330, 85, 'Required Force', { fill: '#7a6890', fontSize: 8, textAnchor: 'middle' });
    r.text(330, 100, `${requiredForce.toFixed(1)}N`, { fill: requiredForce > 100 ? '#ef4444' : '#22c55e', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });

    r.rect(280, 120, 100, 40, { fill: '#181220' });
    r.text(330, 135, 'Torque (F x r)', { fill: '#7a6890', fontSize: 8, textAnchor: 'middle' });
    r.text(330, 150, `${torque} N-m`, { fill: '#a855f7', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });

    // Slider
    r.addSlider({ id: 'push_position', label: `Push position: ${posPercent}% from hinge`, min: 0.1, max: 1, step: 0.05, value: this.state.pushPosition });

    // Buttons
    if (this.state.doorAngle === 0) {
      r.addButton({ id: 'push_door', label: 'Push Door!', variant: 'primary' });
    } else {
      r.addButton({ id: 'reset_door', label: 'Reset', variant: 'secondary' });
    }
    r.addButton({ id: 'toggle_vectors', label: this.state.showForceVector ? 'Vectors ON' : 'Vectors OFF', variant: 'secondary' });

    r.text(200, 230, `Experiments: ${this.state.experimentCount}`, { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    if (this.state.experimentCount >= 3) {
      r.addButton({ id: 'see_pattern', label: 'I see the pattern!', variant: 'success' });
    }
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 25, 'Torque = Force x Lever Arm', { fill: '#1e293b', fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });

    // Formula box
    r.rect(60, 50, 280, 60, { fill: '#f5f3ff' });
    r.text(200, 80, 'torque = F x r', { fill: '#a855f7', fontSize: 24, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 100, 'Same torque = big force + small r, OR small force + big r', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });

    // Explanation boxes
    r.rect(30, 125, 160, 60, { fill: '#dcfce7' });
    r.text(110, 145, 'Far from hinge (large r)', { fill: '#166534', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(110, 165, 'Small force gives enough torque', { fill: '#15803d', fontSize: 9, textAnchor: 'middle' });
    r.text(110, 180, 'Easy!', { fill: '#22c55e', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });

    r.rect(210, 125, 160, 60, { fill: '#fee2e2' });
    r.text(290, 145, 'Near hinge (small r)', { fill: '#dc2626', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(290, 165, 'Need huge force for same torque', { fill: '#b91c1c', fontSize: 9, textAnchor: 'middle' });
    r.text(290, 180, 'Hard!', { fill: '#ef4444', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });

    // Prediction result
    const isCorrect = this.state.prediction === 'far_edge';
    r.text(200, 210, `Your prediction: ${isCorrect ? 'Correct!' : 'Now you understand!'}`, { fill: isCorrect ? '#22c55e' : '#64748b', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'try_twist', label: 'What About a Sticky Hinge?', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 30, 'Plot Twist: Sticky Hinge!', { fill: '#f59e0b', fontSize: 22, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 55, 'What if the hinge is rusty and sticky?', { fill: '#64748b', fontSize: 13, textAnchor: 'middle' });

    // Prediction options
    r.addButton({ id: 'twist_same', label: "Same force - friction doesn't matter", variant: this.state.twistPrediction === 'same' ? 'primary' : 'secondary' });
    r.addButton({ id: 'twist_more', label: 'More force needed - must overcome friction', variant: this.state.twistPrediction === 'more' ? 'primary' : 'secondary' });
    r.addButton({ id: 'twist_less', label: 'Less force - friction helps somehow', variant: this.state.twistPrediction === 'less' ? 'primary' : 'secondary' });

    if (this.state.twistPrediction) {
      r.addButton({ id: 'test_sticky', label: 'Test Sticky Hinge!', variant: 'success' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    const requiredForce = this.calculateRequiredForce();
    const torque = this.getRequiredTorque();
    const posPercent = (this.state.pushPosition * 100).toFixed(0);

    r.text(200, 20, 'Friction Experiment', { fill: '#f59e0b', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });

    // Same door visualization as play phase but with friction indicator
    r.rect(20, 70, 30, 100, { fill: '#4a4a5a' }); // Wall
    r.rect(50, 120, 180, 20, { fill: '#a08060' }); // Door

    // Hinge with friction state
    r.circle(50, 130, 12, { fill: this.state.hasFriction ? '#8b4513' : '#5a5a6a' });
    r.text(50, 155, this.state.hasFriction ? 'STICKY' : 'Smooth', { fill: this.state.hasFriction ? '#f97316' : '#22c55e', fontSize: 9, textAnchor: 'middle', fontWeight: 'bold' });

    // Push position
    const pushX = 50 + this.state.pushPosition * 170;
    r.circle(pushX, 130, 8, { fill: '#22c55e' });

    // Metrics
    r.rect(270, 70, 110, 80, { fill: '#181220' });
    r.text(325, 90, `Force: ${requiredForce.toFixed(1)}N`, { fill: requiredForce > 100 ? '#ef4444' : '#22c55e', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(325, 115, `Torque: ${torque} N-m`, { fill: '#a855f7', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(325, 140, `Position: ${posPercent}%`, { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });

    // Friction toggle
    r.addButton({ id: 'toggle_friction', label: this.state.hasFriction ? 'Sticky Hinge' : 'Smooth Hinge', variant: this.state.hasFriction ? 'danger' : 'success' });

    // Slider
    r.addSlider({ id: 'push_position', label: `Push position: ${posPercent}%`, min: 0.1, max: 1, step: 0.05, value: this.state.pushPosition });

    // Push button
    if (this.state.doorAngle === 0) {
      r.addButton({ id: 'push_door', label: 'Push!', variant: 'primary' });
    } else {
      r.addButton({ id: 'reset_door', label: 'Reset', variant: 'secondary' });
    }

    r.text(200, 220, 'Compare smooth vs sticky hinge forces!', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    if (this.state.experimentCount >= 5) {
      r.addButton({ id: 'understand', label: 'I understand!', variant: 'success' });
    }
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 25, 'Friction Adds Resistance', { fill: '#f59e0b', fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });

    // Explanation
    r.rect(40, 55, 320, 70, { fill: '#fef3c7' });
    r.text(200, 80, 'Friction creates a resisting torque!', { fill: '#92400e', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 100, 'You need extra torque to overcome the friction at the hinge.', { fill: '#78350f', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 115, 'This means more force at any position!', { fill: '#78350f', fontSize: 11, textAnchor: 'middle' });

    // Comparison
    r.rect(40, 140, 150, 50, { fill: '#dcfce7' });
    r.text(115, 160, 'Smooth: 15 N-m', { fill: '#166534', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(115, 180, 'needed', { fill: '#166534', fontSize: 10, textAnchor: 'middle' });

    r.rect(210, 140, 150, 50, { fill: '#fee2e2' });
    r.text(285, 160, 'Sticky: 30 N-m', { fill: '#dc2626', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(285, 180, '(2x more!)', { fill: '#dc2626', fontSize: 10, textAnchor: 'middle' });

    // Result
    const isCorrect = this.state.twistPrediction === 'more';
    r.text(200, 215, `Your prediction: ${isCorrect ? 'Correct!' : 'Now you understand!'}`, { fill: isCorrect ? '#22c55e' : '#64748b', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'see_applications', label: 'See Real-World Examples', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    const app = APPLICATIONS[this.state.activeApp];
    const allComplete = this.state.completedApps.size >= APPLICATIONS.length;

    r.text(200, 20, 'Torque in the Real World', { fill: '#1e293b', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 40, `Application ${this.state.activeApp + 1} of ${APPLICATIONS.length} - ${this.state.completedApps.size} completed`, { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    // Progress dots
    for (let i = 0; i < APPLICATIONS.length; i++) {
      const x = 150 + i * 25;
      const fill = this.state.completedApps.has(i) ? '#22c55e' : i === this.state.activeApp ? '#a855f7' : '#e2e8f0';
      r.circle(x, 55, 6, { fill });
    }

    // Application card
    r.rect(30, 70, 340, 150, { fill: 'white' });
    r.text(200, 95, app.title, { fill: '#a855f7', fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 120, app.description, { fill: '#1e293b', fontSize: 10, textAnchor: 'middle' });

    // Formula and insight
    r.rect(50, 140, 130, 35, { fill: '#f8fafc' });
    r.text(115, 155, 'Formula', { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });
    r.text(115, 170, app.formula, { fill: '#1e293b', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });

    r.rect(220, 140, 130, 35, { fill: '#f8fafc' });
    r.text(285, 155, 'Insight', { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });
    r.text(285, 170, app.insight, { fill: '#1e293b', fontSize: 9, textAnchor: 'middle' });

    // Mark complete
    if (!this.state.completedApps.has(this.state.activeApp)) {
      r.addButton({ id: 'mark_complete', label: `Mark "${app.title}" as Read`, variant: 'success' });
    } else {
      r.rect(100, 185, 200, 25, { fill: '#dcfce7' });
      r.text(200, 200, 'Completed', { fill: '#22c55e', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });
    }

    // Navigation
    r.addButton({ id: 'prev_app', label: 'Previous', variant: 'secondary' });

    if (this.state.activeApp < APPLICATIONS.length - 1) {
      r.addButton({ id: 'next_app', label: 'Next', variant: this.state.completedApps.has(this.state.activeApp) ? 'secondary' : 'secondary' });
    } else if (allComplete) {
      r.addButton({ id: 'take_test', label: 'Take the Quiz', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    const q = TEST_QUESTIONS[this.state.currentQuestion];
    const isAnswered = this.state.answeredQuestions.has(this.state.currentQuestion);
    const selectedAnswer = this.getAnswerForQuestion(this.state.currentQuestion);

    r.text(200, 15, `Question ${this.state.currentQuestion + 1} of ${TEST_QUESTIONS.length}`, { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });
    r.text(350, 15, `Score: ${this.state.correctAnswers}/${this.state.answeredQuestions.size}`, { fill: '#22c55e', fontSize: 11, textAnchor: 'end', fontWeight: 'bold' });

    // Progress bar
    const progressWidth = ((this.state.currentQuestion + 1) / TEST_QUESTIONS.length) * 360;
    r.rect(20, 30, 360, 6, { fill: '#e2e8f0' });
    r.rect(20, 30, progressWidth, 6, { fill: '#a855f7' });

    // Question
    r.rect(20, 50, 360, 60, { fill: 'white' });
    r.text(200, 80, q.question, { fill: '#1e293b', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });

    // Options
    for (let i = 0; i < q.options.length; i++) {
      const y = 125 + i * 35;
      let fill = 'white';
      let textColor = '#1e293b';

      if (isAnswered) {
        if (i === q.correctIndex) {
          fill = '#dcfce7';
          textColor = '#166534';
        } else if (i === selectedAnswer && i !== q.correctIndex) {
          fill = '#fee2e2';
          textColor = '#dc2626';
        }
      } else if (this.state.selectedAnswer === i) {
        fill = '#eff6ff';
      }

      r.rect(30, y, 340, 30, { fill });
      r.text(200, y + 20, q.options[i], { fill: textColor, fontSize: 10, textAnchor: 'middle' });

      if (!isAnswered) {
        r.addButton({ id: `answer_${i}`, label: q.options[i], variant: 'secondary' });
      }
    }

    // Explanation
    if (isAnswered) {
      r.rect(30, 270, 340, 40, { fill: '#f5f3ff' });
      r.text(200, 295, q.explanation, { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });
    }

    // Navigation
    r.addButton({ id: 'prev_question', label: 'Back', variant: 'secondary' });

    if (this.state.currentQuestion < TEST_QUESTIONS.length - 1) {
      r.addButton({ id: 'next_question', label: 'Next', variant: 'secondary' });
    } else if (this.state.answeredQuestions.size === TEST_QUESTIONS.length) {
      r.addButton({ id: 'complete_test', label: 'Complete', variant: 'success' });
    }
  }

  private renderMastery(r: CommandRenderer): void {
    const percentage = Math.round((this.state.correctAnswers / TEST_QUESTIONS.length) * 100);

    r.text(200, 35, 'Torque Master!', { fill: '#1e293b', fontSize: 26, textAnchor: 'middle', fontWeight: 'bold' });

    r.text(200, 80, `${percentage}%`, { fill: '#22c55e', fontSize: 36, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 105, `${this.state.correctAnswers}/${TEST_QUESTIONS.length} correct`, { fill: '#64748b', fontSize: 14, textAnchor: 'middle' });

    // Key takeaways
    r.rect(50, 125, 300, 110, { fill: 'white' });
    r.text(200, 145, 'Key Takeaways', { fill: '#a855f7', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });

    const takeaways = [
      'torque = Force x Lever arm',
      'Longer lever arm = less force needed',
      'Door handles maximize leverage',
      'Friction requires extra torque'
    ];

    for (let i = 0; i < takeaways.length; i++) {
      r.text(200, 168 + i * 18, takeaways[i], { fill: '#1e293b', fontSize: 11, textAnchor: 'middle' });
    }

    r.addButton({ id: 'play_again', label: 'Play Again', variant: 'primary' });
  }

  private resetGame(): void {
    this.state = {
      ...this.state,
      phase: 'hook',
      prediction: null,
      twistPrediction: null,
      pushPosition: 0.8,
      hasFriction: false,
      isPushing: false,
      doorAngle: 0,
      experimentCount: 0,
      showForceVector: true,
      activeApp: 0,
      completedApps: new Set(),
      currentQuestion: 0,
      selectedAnswer: null,
      correctAnswers: 0,
      answeredQuestions: new Set()
    };
    this.answers.clear();
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.state.phase,
      prediction: this.state.prediction,
      twistPrediction: this.state.twistPrediction,
      pushPosition: this.state.pushPosition,
      hasFriction: this.state.hasFriction,
      doorAngle: this.state.doorAngle,
      experimentCount: this.state.experimentCount,
      showForceVector: this.state.showForceVector,
      activeApp: this.state.activeApp,
      completedApps: Array.from(this.state.completedApps),
      currentQuestion: this.state.currentQuestion,
      correctAnswers: this.state.correctAnswers,
      answeredCount: this.state.answeredQuestions.size,
      testScore: this.state.phase === 'mastery' ? this.state.correctAnswers : null
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase && PHASES.includes(state.phase as Phase)) {
      this.state.phase = state.phase as Phase;
    }
    if (state.prediction !== undefined) this.state.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.state.twistPrediction = state.twistPrediction as string | null;
    if (typeof state.pushPosition === 'number') this.state.pushPosition = state.pushPosition;
    if (typeof state.hasFriction === 'boolean') this.state.hasFriction = state.hasFriction;
    if (typeof state.doorAngle === 'number') this.state.doorAngle = state.doorAngle;
    if (typeof state.experimentCount === 'number') this.state.experimentCount = state.experimentCount;
    if (typeof state.showForceVector === 'boolean') this.state.showForceVector = state.showForceVector;
    if (typeof state.activeApp === 'number') this.state.activeApp = state.activeApp;
    if (Array.isArray(state.completedApps)) this.state.completedApps = new Set(state.completedApps as number[]);
    if (typeof state.currentQuestion === 'number') this.state.currentQuestion = state.currentQuestion;
    if (typeof state.correctAnswers === 'number') this.state.correctAnswers = state.correctAnswers;
  }
}

// Factory function
export function createTorqueGame(sessionId: string, config?: SessionConfig): TorqueGame {
  return new TorqueGame(sessionId, config);
}
