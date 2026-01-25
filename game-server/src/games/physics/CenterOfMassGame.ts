import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// CENTER OF MASS GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Center of Mass (COM) determines stability
// Stable equilibrium when COM is below pivot point
// Unstable equilibrium when COM is above pivot point
// Adding mass shifts COM location
// ============================================================================

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number; // PROTECTED: Never sent to client
  explanation: string;
}

interface TransferApp {
  id: string;
  title: string;
  description: string;
  formula: string;
  insight: string;
  color: string;
}

// Physics constants (PROTECTED - never sent to client)
const BASE_COM_Y = -0.3; // Fork side pulls COM below pivot
const CLAY_EFFECT = 0.5; // How much clay shifts COM
const STABILITY_THRESHOLD = 0.1; // COM must be below this to be stable

export class CenterOfMassGame extends BaseGame {
  readonly gameType = 'center_of_mass';
  readonly gameTitle = 'Center of Mass: The Impossible Balance';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation parameters
  private clayPosition = 0; // -1 (fork side) to 1 (other side)
  private hasClayAdded = false;
  private isBalanced = true;
  private tiltAngle = 0;
  private showCOM = true;
  private experimentCount = 0;
  private isAnimating = false;
  private animationTime = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      question: "Why does the fork-toothpick system balance on the glass rim?",
      options: ["The fork is very light", "Center of mass is below the pivot point", "Magic holds it in place", "The glass surface is sticky"],
      correctIndex: 1,
      explanation: "The system balances because its center of mass lies below the pivot point. This creates stable equilibrium where gravity provides a restoring torque."
    },
    {
      question: "What happens if you move the center of mass above the pivot?",
      options: ["System becomes more stable", "System becomes unstable and falls", "Nothing changes at all", "It starts to float"],
      correctIndex: 1,
      explanation: "When COM is above the pivot, any small disturbance causes gravity to tip it further (unstable equilibrium). It will fall over."
    },
    {
      question: "Adding clay to the fork end (lower side) would:",
      options: ["Make it more stable", "Make it less stable", "Have no effect on stability", "Make it lighter"],
      correctIndex: 0,
      explanation: "Adding weight to the fork end (which hangs low) shifts the COM even lower, making the system more stable."
    },
    {
      question: "A tightrope walker holds a long pole because:",
      options: ["For exercise during the walk", "To lower their overall center of mass", "To wave at the crowd below", "The pole has no purpose"],
      correctIndex: 1,
      explanation: "The heavy pole bends downward, lowering the walker's overall center of mass below the rope, creating stability."
    },
    {
      question: "Where is the center of mass of a donut shape?",
      options: ["In the dough material", "In the empty hole at center", "Nowhere specific", "At the outer edge"],
      correctIndex: 1,
      explanation: "A donut's center of mass is in the hole - the geometric center - even though there's no material there!"
    },
    {
      question: "To balance a ruler on your finger, where should you place it?",
      options: ["At one end of the ruler", "At its center of mass", "Anywhere works the same", "At both ends simultaneously"],
      correctIndex: 1,
      explanation: "You must place your finger under the center of mass. For a uniform ruler, that's the geometric center."
    },
    {
      question: "Why do racing cars have low centers of mass?",
      options: ["To go faster in a straight line", "To be more stable in turns", "Only for aerodynamics", "To use less fuel"],
      correctIndex: 1,
      explanation: "A low COM means the car is less likely to tip over during sharp turns. The lower the COM, the more it can lean before tipping."
    },
    {
      question: "A bird perches on a branch by:",
      options: ["Gripping with claws only", "Keeping its COM over the branch", "Birds cannot balance well", "The branch helps them"],
      correctIndex: 1,
      explanation: "Birds constantly adjust their body position to keep their center of mass directly over the branch (support point)."
    },
    {
      question: "If you lean too far forward while standing, you fall because:",
      options: ["Your legs are too weak", "Your COM moves outside your base of support", "Gravity suddenly increases", "Wind pushes you over"],
      correctIndex: 1,
      explanation: "When your COM moves outside the area between your feet (base of support), gravity creates an unbalanced torque and you fall."
    },
    {
      question: "A Weeble toy always rights itself because:",
      options: ["It contains magnets", "Its center of mass is very low", "It is filled with water", "It is perfectly round"],
      correctIndex: 1,
      explanation: "Weebles have a heavy, rounded bottom that keeps the COM very low. Any tilt creates a restoring torque from gravity."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      id: 'tightrope',
      title: "Tightrope Walking",
      description: "Performers use long, curved poles that dip below the rope. This lowers their overall center of mass below the rope, creating remarkable stability.",
      formula: "Stable when COM < pivot height",
      insight: "Poles: 10-12m, 10-15kg",
      color: '#10b981'
    },
    {
      id: 'ship',
      title: "Ship Stability",
      description: "Ships have heavy ballast at the bottom to keep the center of mass low. This prevents capsizing even in rough seas and high waves.",
      formula: "Metacentric height = GM",
      insight: "GM: 0.5-2m for stability",
      color: '#0ea5e9'
    },
    {
      id: 'wine',
      title: "Wine Glass Balance",
      description: "A wine glass with liquid is more stable than when empty because the liquid lowers the center of mass closer to the wide base.",
      formula: "Lower COM = wider stability zone",
      insight: "COM drops ~2cm when filled",
      color: '#a855f7'
    },
    {
      id: 'standing',
      title: "Human Balance",
      description: "We constantly adjust our body position to keep our center of mass over our feet. That's why it's hard to stand still with eyes closed!",
      formula: "COM must stay over base of support",
      insight: "COM: ~55% of standing height",
      color: '#f59e0b'
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate balance based on clay position
  private calculateBalance(clayPos: number): { comY: number; stable: boolean } {
    const clayEffect = clayPos * CLAY_EFFECT;
    const finalCOM = BASE_COM_Y + clayEffect;
    return { comY: finalCOM, stable: finalCOM < STABILITY_THRESHOLD };
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
          this.prediction = buttonId.replace('pred_', '');
        } else if (buttonId === 'continue' && this.prediction) {
          this.phase = 'play';
        }
        break;

      case 'play':
        if (buttonId === 'toggle_com') {
          this.showCOM = !this.showCOM;
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
        if (buttonId.startsWith('twist_')) {
          this.twistPrediction = buttonId.replace('twist_', '');
        } else if (buttonId === 'continue' && this.twistPrediction) {
          this.phase = 'twist_play';
          this.resetExperiment();
        }
        break;

      case 'twist_play':
        if (buttonId === 'clay_fork') {
          this.addClay(-0.8);
        } else if (buttonId === 'clay_middle') {
          this.addClay(0);
        } else if (buttonId === 'clay_other') {
          this.addClay(0.8);
        } else if (buttonId === 'reset') {
          this.resetExperiment();
        } else if (buttonId === 'continue' && this.experimentCount >= 2) {
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
        } else if (buttonId === 'mark_read') {
          this.completedApps.add(this.activeAppIndex);
          if (this.activeAppIndex < 3) {
            this.activeAppIndex++;
          }
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

  private addClay(position: number): void {
    if (this.isAnimating || this.hasClayAdded) return;

    this.hasClayAdded = true;
    this.clayPosition = position;
    const { stable, comY } = this.calculateBalance(position);
    this.isBalanced = stable;

    if (!stable) {
      this.isAnimating = true;
    } else {
      this.tiltAngle = 0;
      this.experimentCount++;
    }
  }

  private resetExperiment(): void {
    this.hasClayAdded = false;
    this.clayPosition = 0;
    this.isBalanced = true;
    this.tiltAngle = 0;
    this.isAnimating = false;
  }

  processInput(input: UserInput, config: SessionConfig): void {
    this.handleInput(input);
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
    this.experimentCount = 0;
    this.resetExperiment();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Animate tipping if unstable
    if (this.isAnimating && !this.isBalanced) {
      const direction = this.clayPosition > 0 ? 2 : -2;
      this.tiltAngle += direction;

      if (Math.abs(this.tiltAngle) >= 45) {
        this.isAnimating = false;
        this.experimentCount++;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(16, 185, 129, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(6, 182, 212, 0.05)' });

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

  private renderHook(r: CommandRenderer): void {
    r.roundRect(120, 50, 160, 30, 8, { fill: 'rgba(16, 185, 129, 0.1)' });
    r.text(200, 70, 'PHYSICS EXPLORATION', { fill: '#10b981', fontSize: 10, textAnchor: 'middle' });

    r.text(200, 120, 'The Impossible Balance', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 155, 'A toothpick with forks hangs off', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 175, 'the edge of a glass... and balances!', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Balance illustration
    r.text(200, 280, '...', { fill: '#10b981', fontSize: 64, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 330, 320, 130, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 365, '"How can something hang off', { fill: '#cbd5e1', fontSize: 15, textAnchor: 'middle' });
    r.text(200, 390, 'a table without falling?"', { fill: '#cbd5e1', fontSize: 15, textAnchor: 'middle' });
    r.text(200, 425, 'The answer lies in CENTER OF MASS', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'discover', label: 'Discover the Secret', variant: 'primary' });

    r.setCoachMessage('Learn the physics of balance!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 95, "Why doesn't the fork-toothpick", { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 115, 'system fall off the glass?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    const options = [
      { id: 'light', text: 'The toothpick is very light', icon: '' },
      { id: 'com_below', text: 'Center of mass is below pivot', icon: '' },
      { id: 'friction', text: 'Friction holds it in place', icon: '' }
    ];

    options.forEach((opt, i) => {
      const y = 160 + i * 70;
      const isSelected = this.prediction === opt.id;
      const bgColor = isSelected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(51, 65, 85, 0.5)';

      r.roundRect(40, y, 320, 60, 12, { fill: bgColor });
      if (isSelected) {
        r.roundRect(40, y, 320, 60, 12, { fill: 'none', stroke: '#10b981', strokeWidth: 2 });
      }
      r.text(60, y + 35, `${opt.icon} ${opt.text}`, { fill: '#e2e8f0', fontSize: 14 });

      r.addButton({ id: `pred_${opt.id}`, label: '', variant: 'secondary' });
    });

    if (this.prediction) {
      r.addButton({ id: 'continue', label: 'See It In Action', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Balance Demonstration', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization area
    r.roundRect(30, 80, 340, 280, 16, { fill: 'rgba(15, 23, 42, 0.8)' });

    // Table surface
    r.rect(30, 290, 340, 70, { fill: '#2d1f14' });
    r.rect(30, 290, 340, 4, { fill: '#4a3525' });

    // Glass
    const glassX = 200;
    const glassY = 200;
    r.polygon([[glassX - 28, glassY + 90], [glassX - 22, glassY - 30], [glassX + 22, glassY - 30], [glassX + 28, glassY + 90]], { fill: 'rgba(125, 211, 252, 0.3)', stroke: '#7dd3fc', strokeWidth: 2 });

    // Pivot point
    const pivotY = glassY - 35;

    // Fork-toothpick system (rotated by tiltAngle)
    const centerX = glassX;
    const centerY = pivotY;

    // Toothpick
    r.roundRect(centerX - 85, centerY - 4, 170, 8, 4, { fill: '#d4a574' });

    // Left fork (hanging down)
    r.roundRect(centerX - 76, centerY, 12, 55, 3, { fill: '#b8c4c0' });
    r.ellipse(centerX - 70, centerY + 60, 16, 7, { fill: '#d4dcd8' });
    [-10, -3.5, 3.5, 10].forEach(offset => {
      r.rect(centerX - 70 + offset - 2.5, centerY + 60, 5, 22, { fill: '#e5e7eb' });
    });

    // Right fork (mirrored)
    r.roundRect(centerX + 64, centerY, 12, 55, 3, { fill: '#b8c4c0' });
    r.ellipse(centerX + 70, centerY + 60, 16, 7, { fill: '#d4dcd8' });
    [-10, -3.5, 3.5, 10].forEach(offset => {
      r.rect(centerX + 70 + offset - 2.5, centerY + 60, 5, 22, { fill: '#e5e7eb' });
    });

    // Center of mass indicator
    if (this.showCOM) {
      const { comY } = this.calculateBalance(0);
      const comScreenY = centerY + comY * 80;
      r.circle(centerX, comScreenY, 10, { fill: '#ef4444' });
      r.circle(centerX, comScreenY, 5, { fill: '#ffffff', opacity: 0.4 });
      r.text(centerX + 20, comScreenY + 4, 'COM', { fill: '#ef4444', fontSize: 11, fontWeight: 'bold' });
    }

    // Pivot point marker
    r.circle(centerX, centerY, 5, { fill: '#ffffff', stroke: '#10b981', strokeWidth: 2 });

    // Status badge
    r.roundRect(40, 95, 95, 34, 8, { fill: 'rgba(34, 197, 94, 0.15)', stroke: '#22c55e', strokeWidth: 1 });
    r.text(87, 117, 'Balanced', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // COM position indicator
    if (this.showCOM) {
      r.roundRect(265, 95, 95, 34, 8, { fill: 'rgba(30, 41, 59, 0.8)', stroke: '#334155', strokeWidth: 1 });
      r.text(312, 108, 'COM Position', { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });
      r.text(312, 122, 'Below pivot', { fill: '#22c55e', fontSize: 11, textAnchor: 'middle' });
    }

    // Toggle COM button
    r.addButton({ id: 'toggle_com', label: `Show COM: ${this.showCOM ? 'ON' : 'OFF'}`, variant: this.showCOM ? 'primary' : 'secondary' });

    // Explanation
    r.roundRect(40, 400, 320, 70, 12, { fill: 'rgba(16, 185, 129, 0.1)' });
    r.text(200, 425, 'The center of mass (red dot) is', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 445, 'BELOW the pivot. This creates stability!', { fill: '#10b981', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'I Understand', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Secret: Center of Mass', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 90, 340, 80, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 120, 'COM below pivot = Stable equilibrium', { fill: '#10b981', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 145, 'Gravity creates a restoring torque!', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });

    // Stable vs Unstable
    r.roundRect(30, 190, 165, 100, 12, { fill: 'rgba(16, 185, 129, 0.1)', stroke: '#10b981', strokeWidth: 1 });
    r.text(112, 220, 'STABLE', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(112, 245, 'COM below pivot', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(112, 265, 'Tilt it, gravity pulls back', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(205, 190, 165, 100, 12, { fill: 'rgba(239, 68, 68, 0.1)', stroke: '#ef4444', strokeWidth: 1 });
    r.text(287, 220, 'UNSTABLE', { fill: '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(287, 245, 'COM above pivot', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(287, 265, 'Tilt it, gravity tips more', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Prediction feedback
    const correct = this.prediction === 'com_below';
    r.roundRect(40, 320, 320, 50, 10, { fill: correct ? 'rgba(16, 185, 129, 0.2)' : 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 350, correct ? 'Your prediction was correct!' : 'Now you understand why!', { fill: correct ? '#10b981' : '#fbbf24', fontSize: 13, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Can We Break It?', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'Plot Twist: Add Clay!', { fill: '#f59e0b', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 90, 'If we stick clay on the toothpick,', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 110, 'where should we put it?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    const options = [
      { id: 'fork_side', text: 'Near the forks (left) - more stable' },
      { id: 'middle', text: 'In the middle - no change' },
      { id: 'other_side', text: 'Away from forks (right) - might fall!' }
    ];

    options.forEach((opt, i) => {
      const y = 150 + i * 70;
      const isSelected = this.twistPrediction === opt.id;
      const bgColor = isSelected ? 'rgba(245, 158, 11, 0.3)' : 'rgba(51, 65, 85, 0.5)';

      r.roundRect(30, y, 340, 60, 12, { fill: bgColor });
      if (isSelected) {
        r.roundRect(30, y, 340, 60, 12, { fill: 'none', stroke: '#f59e0b', strokeWidth: 2 });
      }
      r.text(50, y + 35, opt.text, { fill: '#e2e8f0', fontSize: 13 });

      r.addButton({ id: `twist_${opt.id}`, label: '', variant: 'secondary' });
    });

    if (this.twistPrediction) {
      r.addButton({ id: 'continue', label: 'Experiment!', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Clay Experiment', { fill: '#f59e0b', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization area
    r.roundRect(30, 80, 340, 250, 16, { fill: 'rgba(15, 23, 42, 0.8)' });

    // Table
    r.rect(30, 270, 340, 60, { fill: '#2d1f14' });

    // Glass and system (similar to play phase but with clay)
    const glassX = 200;
    const glassY = 180;
    r.polygon([[glassX - 28, glassY + 80], [glassX - 22, glassY - 30], [glassX + 22, glassY - 30], [glassX + 28, glassY + 80]], { fill: 'rgba(125, 211, 252, 0.3)', stroke: '#7dd3fc', strokeWidth: 2 });

    const pivotY = glassY - 35;
    const centerX = glassX;
    const centerY = pivotY;

    // Apply tilt if unstable
    const tiltRad = this.tiltAngle * Math.PI / 180;

    // Toothpick (would be rotated in real animation)
    r.roundRect(centerX - 85, centerY - 4, 170, 8, 4, { fill: '#d4a574' });

    // Forks
    r.roundRect(centerX - 76, centerY, 12, 55, 3, { fill: '#b8c4c0' });
    r.roundRect(centerX + 64, centerY, 12, 55, 3, { fill: '#b8c4c0' });

    // Clay ball if added
    if (this.hasClayAdded) {
      const clayScreenX = centerX + this.clayPosition * 65;
      r.circle(clayScreenX, centerY, 14, { fill: '#d97706', stroke: '#92400e', strokeWidth: 2 });
    }

    // Center of mass
    const { comY } = this.calculateBalance(this.clayPosition);
    const comScreenY = centerY + comY * 80;
    r.circle(centerX, comScreenY, 10, { fill: '#ef4444' });
    r.text(centerX + 20, comScreenY + 4, 'COM', { fill: '#ef4444', fontSize: 10, fontWeight: 'bold' });

    // Status
    const statusColor = this.isBalanced ? '#22c55e' : '#ef4444';
    const statusText = this.isBalanced ? 'Balanced' : 'Falling!';
    r.roundRect(40, 95, 95, 34, 8, { fill: this.isBalanced ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', stroke: statusColor, strokeWidth: 1 });
    r.text(87, 117, statusText, { fill: statusColor, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Clay placement buttons
    r.text(200, 365, 'Where do you want to add clay?', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    if (!this.hasClayAdded && !this.isAnimating) {
      r.addButton({ id: 'clay_fork', label: 'Fork side', variant: 'secondary' });
      r.addButton({ id: 'clay_middle', label: 'Middle', variant: 'secondary' });
      r.addButton({ id: 'clay_other', label: 'Other side', variant: 'secondary' });
    }

    if (this.hasClayAdded) {
      r.addButton({ id: 'reset', label: 'Reset & Try Again', variant: 'secondary' });
    }

    r.text(200, 440, `Experiments: ${this.experimentCount}`, { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });

    if (this.experimentCount >= 2) {
      r.addButton({ id: 'continue', label: 'I See the Pattern!', variant: 'primary' });
    }
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Shifting the Center of Mass', { fill: '#f59e0b', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 90, 340, 120, 16, { fill: 'rgba(245, 158, 11, 0.1)' });
    r.text(200, 125, 'Adding weight on the fork side', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 145, 'lowers the COM = more stable', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 175, 'Adding weight on the other side', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 195, 'raises the COM = unstable, falls!', { fill: '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // The rule
    r.roundRect(30, 230, 340, 70, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 265, 'The Rule: Keep COM over (or below)', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 285, 'your support point!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Prediction feedback
    const correct = this.twistPrediction === 'other_side';
    r.text(200, 340, correct ? 'Your prediction was correct!' : 'Now you see why!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Real-World Examples', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Center of Mass in Action', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Progress dots
    this.transferApps.forEach((_, i) => {
      const x = 140 + i * 40;
      const color = this.completedApps.has(i) ? '#10b981' : (i === this.activeAppIndex ? '#10b981' : '#334155');
      r.circle(x, 85, 6, { fill: color });
    });

    // Tab buttons
    this.transferApps.forEach((app, i) => {
      const x = 45 + i * 90;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = 'rgba(16, 185, 129, 0.3)';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.15)';

      r.roundRect(x, 100, 80, 35, 8, { fill: bgColor });
      const label = app.title.split(' ')[0];
      r.text(x + 40, 122, label, { fill: isActive || isCompleted ? '#10b981' : '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(30, 150, 340, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 185, app.title, { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Description (word wrap)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 220;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 20;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Formula and insight boxes
    r.roundRect(45, 310, 150, 50, 8, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.text(120, 328, 'Principle', { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });
    r.text(120, 348, app.formula, { fill: '#ffffff', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(205, 310, 150, 50, 8, { fill: 'rgba(51, 65, 85, 0.5)' });
    r.text(280, 328, 'Real Data', { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });
    r.text(280, 348, app.insight, { fill: '#ffffff', fontSize: 10, textAnchor: 'middle' });

    // Mark as read button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_read', label: 'Mark as Read', variant: 'secondary' });
    } else {
      r.text(200, 400, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Continue button
    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take the Quiz', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Knowledge Check', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Question
      const qText = question.question.length > 55 ? question.question.substring(0, 52) + '...' : question.question;
      r.text(200, 130, qText, { fill: '#10b981', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 160 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        const optionText = option.length > 45 ? option.substring(0, 42) + '...' : option;
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${optionText}`, { fill: isSelected ? '#10b981' : '#e2e8f0', fontSize: 11 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      // Navigation
      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: 'Previous', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next', variant: 'secondary' });
      }

      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      } else {
        r.text(200, 430, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      const score = this.calculateScore();
      const percentage = Math.round((score / 10) * 100);

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '' : '', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, `${percentage}%`, { fill: '#10b981', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 140, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Takeaways:', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'COM below pivot = stable',
        'COM above pivot = unstable',
        'Adding weight shifts COM',
        'Keep COM over support'
      ];
      concepts.forEach((concept, i) => {
        r.text(200, 340 + i * 22, concept, { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Complete Journey', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 120, '', { fontSize: 72, textAnchor: 'middle' });

    r.text(200, 200, 'Balance Master!', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });

    const score = this.calculateScore();
    r.text(200, 240, `${Math.round((score / 10) * 100)}%`, { fill: '#10b981', fontSize: 36, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 270, `${score}/10 correct answers`, { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Key takeaways
    r.roundRect(40, 300, 320, 150, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 330, 'Key Takeaways', { fill: '#10b981', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    const takeaways = [
      'COM below pivot = stable equilibrium',
      'COM above pivot = unstable, falls',
      'Adding weight shifts the COM',
      'Keep COM over support to balance'
    ];
    takeaways.forEach((item, i) => {
      r.text(200, 360 + i * 22, item, { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    });

    r.addButton({ id: 'restart', label: 'Play Again', variant: 'secondary' });

    r.setCoachMessage('You now understand the physics of balance!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      clayPosition: this.clayPosition,
      hasClayAdded: this.hasClayAdded,
      isBalanced: this.isBalanced,
      tiltAngle: this.tiltAngle,
      showCOM: this.showCOM,
      experimentCount: this.experimentCount,
      isAnimating: this.isAnimating,
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
    if (state.clayPosition !== undefined) this.clayPosition = state.clayPosition as number;
    if (state.hasClayAdded !== undefined) this.hasClayAdded = state.hasClayAdded as boolean;
    if (state.isBalanced !== undefined) this.isBalanced = state.isBalanced as boolean;
    if (state.tiltAngle !== undefined) this.tiltAngle = state.tiltAngle as number;
    if (state.showCOM !== undefined) this.showCOM = state.showCOM as boolean;
    if (state.experimentCount !== undefined) this.experimentCount = state.experimentCount as number;
    if (state.isAnimating !== undefined) this.isAnimating = state.isAnimating as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createCenterOfMassGame(sessionId: string): CenterOfMassGame {
  return new CenterOfMassGame(sessionId);
}
