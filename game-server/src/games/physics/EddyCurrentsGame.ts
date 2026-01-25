import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// EDDY CURRENTS GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Faraday's Law + Lenz's Law
// Changing magnetic flux induces currents that oppose the change
// EMF = -dΦ/dt (Faraday's Law)
// Braking force ∝ velocity × conductivity (electromagnetic braking)
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
const CONDUCTIVITY_COPPER = 1.0;
const CONDUCTIVITY_ALUMINUM = 0.6;
const CONDUCTIVITY_AIR = 0;
const GRAVITY = 9.81; // m/s²
const EDDY_BRAKING_COEFFICIENT = 0.15;

export class EddyCurrentsGame extends BaseGame {
  readonly gameType = 'eddy_currents';
  readonly gameTitle = 'Eddy Currents: Invisible Brakes';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters - falling magnet
  private magnetY = 50; // position (0-230)
  private magnetVelocity = 0;
  private conductorType: 'copper' | 'aluminum' | 'air' = 'copper';
  private isDropping = false;
  private eddyStrength = 0;
  private animationTime = 0;

  // Twist simulation - pendulum damping
  private pendulumAngle = 60; // degrees
  private pendulumVelocity = 0;
  private dampingEnabled = false;
  private isPendulumRunning = false;
  private swingCount = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "A strong magnet is dropped through a copper tube. You observe it falling very slowly compared to free fall.",
      question: "What causes the magnet to slow down?",
      options: [
        "Air resistance inside the tube",
        "Friction against the tube walls",
        "Eddy currents creating an opposing magnetic field",
        "The copper tube is magnetic"
      ],
      correctIndex: 2,
      explanation: "The falling magnet induces eddy currents in the copper, which create their own magnetic field that opposes the magnet's motion (Lenz's Law)."
    },
    {
      scenario: "According to Lenz's Law, when a magnet approaches a conductor, the induced currents create a field that...",
      question: "What does the induced field do?",
      options: [
        "Enhances the magnet's motion",
        "Opposes the change that created it",
        "Has no effect on the magnet",
        "Points in a random direction"
      ],
      correctIndex: 1,
      explanation: "Lenz's Law states induced currents always create fields that oppose the change in magnetic flux. This is a consequence of energy conservation."
    },
    {
      scenario: "You have identical tubes of copper, aluminum, and plastic. You drop the same magnet through each.",
      question: "In which tube does the magnet fall fastest?",
      options: [
        "Copper (best conductor)",
        "Aluminum (medium conductor)",
        "Plastic (non-conductor)",
        "All tubes have the same falling speed"
      ],
      correctIndex: 2,
      explanation: "Plastic is a non-conductor, so no eddy currents form. The magnet falls at near free-fall speed. Better conductors create stronger braking."
    },
    {
      scenario: "Eddy current brakes are used in roller coasters and trains. They have no physical contact with the braking surface.",
      question: "What is a major advantage of electromagnetic brakes?",
      options: [
        "They are lighter than friction brakes",
        "They don't wear out from contact",
        "They only work at low speeds",
        "They generate electricity"
      ],
      correctIndex: 1,
      explanation: "No physical contact means no wear on brake pads. Electromagnetic brakes are ideal for frequent, reliable braking applications."
    },
    {
      scenario: "When the same magnet moves FASTER through a copper tube, you observe...",
      question: "How does speed affect the braking force?",
      options: [
        "Faster motion means weaker braking",
        "Speed has no effect on braking",
        "Faster motion creates stronger braking",
        "The magnet accelerates more"
      ],
      correctIndex: 2,
      explanation: "Faster motion = faster change in magnetic flux = stronger induced currents = stronger braking force. This is why eddy brakes are speed-dependent."
    },
    {
      scenario: "Transformers are designed with laminated (layered) iron cores instead of solid metal cores.",
      question: "Why do engineers use laminated cores?",
      options: [
        "Solid cores are too expensive",
        "Laminations reduce unwanted eddy currents",
        "Laminations increase conductivity",
        "Solid cores don't conduct magnetism"
      ],
      correctIndex: 1,
      explanation: "Laminated cores break up the paths for eddy currents, reducing energy loss as heat. Each thin layer has its own small eddy currents."
    },
    {
      scenario: "An induction cooktop rapidly alternates its magnetic field to heat metal pots directly.",
      question: "How do induction cooktops heat the pot?",
      options: [
        "Hot air from the cooktop",
        "Direct contact with heating elements",
        "Eddy currents in the metal pot generate heat",
        "Microwaves penetrate the pot"
      ],
      correctIndex: 2,
      explanation: "The changing magnetic field induces eddy currents in the metal pot. The pot's resistance converts these currents to heat directly in the cookware."
    },
    {
      scenario: "Lenz's Law states that induced currents always oppose the change that created them.",
      question: "This law is a consequence of which fundamental principle?",
      options: [
        "Newton's Laws of Motion",
        "Conservation of Energy",
        "Theory of Relativity",
        "Quantum Mechanics"
      ],
      correctIndex: 1,
      explanation: "If induced currents enhanced motion instead of opposing it, we could create energy from nothing. Lenz's Law ensures energy is conserved."
    },
    {
      scenario: "Metal detectors at airports use eddy currents to detect hidden metal objects.",
      question: "How do metal detectors sense objects?",
      options: [
        "They measure the object's weight",
        "They detect changes in induced currents",
        "They use X-rays",
        "They detect temperature differences"
      ],
      correctIndex: 1,
      explanation: "The detector creates a changing magnetic field. Metal objects induce eddy currents that alter the field, which the detector senses."
    },
    {
      scenario: "A copper pendulum swings between the poles of a strong electromagnet. When the magnet is turned on...",
      question: "What happens to the pendulum?",
      options: [
        "It swings faster",
        "It quickly comes to rest",
        "Nothing changes",
        "It starts spinning"
      ],
      correctIndex: 1,
      explanation: "Eddy currents induced in the copper pendulum create opposing forces that quickly damp its motion, converting kinetic energy to heat."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🎢",
      title: "Roller Coaster Brakes",
      tagline: "Smooth stops at high speeds",
      description: "Many modern roller coasters use eddy current brakes. Metal fins on the train pass between magnets, creating braking forces without wear.",
      connection: "The faster the coaster, the stronger the braking force. No friction means no worn brake pads - maintenance-free stopping power."
    },
    {
      icon: "🔌",
      title: "Induction Cooktops",
      tagline: "Heating pans, not the stove",
      description: "Induction cooktops use rapidly alternating magnetic fields to induce eddy currents directly in metal cookware, heating it efficiently.",
      connection: "The pot itself generates heat through eddy current resistance. The cooktop stays cool - only the metal pan heats up."
    },
    {
      icon: "🔍",
      title: "Metal Detectors",
      tagline: "Finding hidden treasures and threats",
      description: "Metal detectors emit changing magnetic fields that induce eddy currents in nearby metal objects, altering the field pattern.",
      connection: "The detector senses how eddy currents change its magnetic field. Different metals create different signatures."
    },
    {
      icon: "🚄",
      title: "Maglev Trains",
      tagline: "Floating and braking with magnets",
      description: "High-speed maglev trains use eddy currents for both levitation and braking, achieving speeds over 600 km/h with no wheel friction.",
      connection: "Motion through magnetic fields induces currents that both lift the train and provide braking when needed."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate eddy braking force
  private calculateEddyBraking(velocity: number, conductivity: number): number {
    // F_eddy ∝ v × σ (proportional to velocity and conductivity)
    return velocity * conductivity * EDDY_BRAKING_COEFFICIENT;
  }

  // PROTECTED: Get conductivity for material
  private getConductivity(material: 'copper' | 'aluminum' | 'air'): number {
    const conductivities = {
      copper: CONDUCTIVITY_COPPER,
      aluminum: CONDUCTIVITY_ALUMINUM,
      air: CONDUCTIVITY_AIR
    };
    return conductivities[material];
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
        if (!this.showPredictionFeedback) {
          if (buttonId.startsWith('option_')) {
            this.prediction = parseInt(buttonId.split('_')[1]);
            this.showPredictionFeedback = true;
          }
        } else if (buttonId === 'continue') {
          this.phase = 'play';
          this.showPredictionFeedback = false;
          this.resetMagnet();
        }
        break;

      case 'play':
        if (buttonId === 'drop_magnet') {
          this.isDropping = true;
        } else if (buttonId === 'reset') {
          this.resetMagnet();
        } else if (buttonId === 'switch_copper') {
          this.conductorType = 'copper';
          this.resetMagnet();
        } else if (buttonId === 'switch_aluminum') {
          this.conductorType = 'aluminum';
          this.resetMagnet();
        } else if (buttonId === 'switch_air') {
          this.conductorType = 'air';
          this.resetMagnet();
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
          this.resetPendulum();
        }
        break;

      case 'twist_play':
        if (buttonId === 'start_pendulum') {
          this.isPendulumRunning = true;
        } else if (buttonId === 'toggle_damping') {
          this.dampingEnabled = !this.dampingEnabled;
        } else if (buttonId === 'reset_pendulum') {
          this.resetPendulum();
        } else if (buttonId === 'continue') {
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

  private resetMagnet(): void {
    this.magnetY = 50;
    this.magnetVelocity = 0;
    this.isDropping = false;
    this.eddyStrength = 0;
  }

  private resetPendulum(): void {
    this.pendulumAngle = 60;
    this.pendulumVelocity = 0;
    this.isPendulumRunning = false;
    this.swingCount = 0;
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.resetMagnet();
    this.resetPendulum();
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Update falling magnet simulation
    if (this.phase === 'play' && this.isDropping && this.magnetY < 230) {
      const conductivity = this.getConductivity(this.conductorType);
      const eddyBrake = this.calculateEddyBraking(this.magnetVelocity, conductivity);
      this.eddyStrength = Math.abs(eddyBrake) * 10;

      // Update velocity: gravity - eddy braking
      this.magnetVelocity += (0.2 - eddyBrake) * deltaTime * 60;

      // Update position
      this.magnetY += this.magnetVelocity;

      // Check bounds
      if (this.magnetY >= 230) {
        this.magnetY = 230;
        this.isDropping = false;
        this.magnetVelocity = 0;
      }
    }

    // Update pendulum simulation
    if (this.phase === 'twist_play' && this.isPendulumRunning) {
      // Angular acceleration from gravity
      const gravity = -0.5 * Math.sin(this.pendulumAngle * Math.PI / 180);

      // Damping from eddy currents
      const damping = this.dampingEnabled
        ? -this.pendulumVelocity * 0.08
        : -this.pendulumVelocity * 0.005;

      // Update velocity
      this.pendulumVelocity += (gravity + damping) * deltaTime * 60;

      // Track swings
      const oldAngle = this.pendulumAngle;
      this.pendulumAngle += this.pendulumVelocity;

      if (oldAngle > 0 && this.pendulumAngle <= 0) {
        this.swingCount++;
      }

      // Stop if nearly stopped
      if (Math.abs(this.pendulumAngle) < 0.5 && Math.abs(this.pendulumVelocity) < 0.1) {
        this.isPendulumRunning = false;
        this.pendulumAngle = 0;
        this.pendulumVelocity = 0;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0f0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(99, 102, 241, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(239, 68, 68, 0.05)' });

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
    // Badge
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(99, 102, 241, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#818cf8', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Invisible Brake', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'How can magnets slow things without touching?', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    // Falling magnet illustration
    r.roundRect(140, 190, 120, 180, 12, { fill: 'rgba(148, 163, 184, 0.2)' });
    r.text(200, 210, 'COPPER', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 225, 'TUBE', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Magnet with motion lines
    const magnetY = 260 + Math.sin(this.animationTime * 2) * 10;
    r.roundRect(175, magnetY, 50, 25, 4, { fill: '#ef4444' });
    r.text(200, magnetY + 16, 'N  S', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    // Swirl lines for eddy currents
    r.circle(170, magnetY + 12, 8, { fill: 'rgba(59, 130, 246, 0.3)' });
    r.circle(230, magnetY + 12, 8, { fill: 'rgba(59, 130, 246, 0.3)' });

    // Fact card
    r.roundRect(40, 390, 320, 130, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 420, 'Drop a magnet through a copper tube...', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 445, 'It falls in SLOW MOTION!', { fill: '#ef4444', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 480, 'No friction, no contact. Just invisible', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 500, 'forces created by changing magnetic fields.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'discover', label: 'Discover Eddy Currents', variant: 'primary' });

    r.setCoachMessage('Learn how changing magnetic fields create invisible braking forces!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'A strong magnet is dropped through', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'a copper tube (non-magnetic metal).', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 185, 'What happens to the magnet?', { fill: '#818cf8', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Falls at normal speed (free fall)',
      'Falls slowly, as if through honey',
      'Sticks to the copper tube',
      'Bounces back up'
    ];

    options.forEach((option, i) => {
      const y = 215 + i * 58;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (i === 1) { // Correct
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.prediction) {
        bgColor = 'rgba(99, 102, 241, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 13 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 475, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Exactly right!' : 'It falls slowly!';
      r.text(200, 505, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 535, 'The changing magnetic field creates', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 555, 'invisible braking forces called eddy currents!', { fill: '#818cf8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See the Experiment', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Magnetic Braking Lab', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Tube visualization
    const tubeColor = this.conductorType === 'copper' ? '#c2410c'
                    : this.conductorType === 'aluminum' ? '#94a3b8'
                    : 'rgba(148, 163, 184, 0.2)';
    const tubeLabel = this.conductorType === 'copper' ? 'COPPER'
                    : this.conductorType === 'aluminum' ? 'ALUMINUM'
                    : 'AIR (no tube)';

    r.roundRect(140, 80, 120, 200, 12, { fill: tubeColor });
    r.text(200, 100, tubeLabel, { fill: '#ffffff', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    // Magnet
    r.roundRect(175, this.magnetY, 50, 25, 4, { fill: '#ef4444' });
    r.text(200, this.magnetY + 16, 'N  S', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    // Eddy current visualization
    if (this.isDropping && this.conductorType !== 'air') {
      const intensity = Math.min(1, this.eddyStrength / 3);
      r.circle(155, this.magnetY + 12, 15, { fill: `rgba(59, 130, 246, ${intensity * 0.5})` });
      r.circle(245, this.magnetY + 12, 15, { fill: `rgba(59, 130, 246, ${intensity * 0.5})` });
    }

    // Speed indicator
    r.roundRect(280, 90, 100, 80, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(330, 115, 'Speed', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(330, 145, `${Math.abs(this.magnetVelocity).toFixed(1)}`, { fill: '#ef4444', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(330, 165, 'units/s', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Eddy strength indicator
    r.roundRect(20, 90, 100, 80, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(70, 115, 'Eddy Force', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(70, 145, `${this.eddyStrength.toFixed(1)}`, { fill: '#3b82f6', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(70, 165, 'units', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Material selector
    r.text(200, 310, 'Select Material:', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.addButton({ id: 'switch_copper', label: 'Copper', variant: this.conductorType === 'copper' ? 'primary' : 'secondary' });
    r.addButton({ id: 'switch_aluminum', label: 'Aluminum', variant: this.conductorType === 'aluminum' ? 'primary' : 'secondary' });
    r.addButton({ id: 'switch_air', label: 'Air', variant: this.conductorType === 'air' ? 'primary' : 'secondary' });

    // Drop/Reset buttons
    if (!this.isDropping && this.magnetY < 230) {
      r.addButton({ id: 'drop_magnet', label: 'Drop Magnet', variant: 'primary' });
    }
    r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });

    // Status
    if (this.magnetY >= 230) {
      r.roundRect(100, 380, 200, 40, 10, { fill: 'rgba(16, 185, 129, 0.2)' });
      r.text(200, 405, 'Reached bottom!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, "Faraday's Law & Lenz's Law", { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Faraday's Law
    r.roundRect(30, 85, 340, 100, 16, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 110, "Faraday's Law", { fill: '#818cf8', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(70, 125, 260, 35, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 148, 'EMF = -dΦ/dt', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });
    r.text(200, 175, 'Changing magnetic flux induces current', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Lenz's Law
    r.roundRect(30, 200, 340, 100, 16, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(200, 225, "Lenz's Law", { fill: '#f87171', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 255, 'Induced currents OPPOSE the change', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 280, 'that created them!', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    // How it creates braking
    r.roundRect(30, 315, 340, 130, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 345, 'How Eddy Braking Works:', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 375, '1. Magnet moves → flux changes', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 395, '2. Copper induces swirling currents (eddies)', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 415, '3. Currents create opposing magnetic field', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 435, '4. Opposing field slows the magnet!', { fill: '#34d399', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Try the Pendulum Twist', variant: 'secondary' });

    r.setCoachMessage("Now let's see eddy currents damp a swinging pendulum...");
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist: Pendulum Damping', { fill: '#a78bfa', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 110, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'A copper pendulum swings between', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'the poles of a strong electromagnet.', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 185, 'When we turn ON the magnet...', { fill: '#a78bfa', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Pendulum swings faster',
      'Pendulum quickly stops',
      'Nothing changes',
      'Pendulum starts spinning'
    ];

    options.forEach((option, i) => {
      const y = 215 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (i === 1) { // Correct
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.twistPrediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.twistPrediction) {
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 13 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 450, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 1 ? 'Correct!' : 'The pendulum quickly stops!';
      r.text(200, 480, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 510, 'Eddy currents in the copper convert', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 530, 'kinetic energy to heat, damping the motion.', { fill: '#a78bfa', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See the Pendulum', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Eddy Current Damping', { fill: '#a78bfa', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Magnet poles
    r.roundRect(80, 150, 40, 150, 8, { fill: this.dampingEnabled ? '#ef4444' : '#64748b' });
    r.text(100, 225, 'N', { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(280, 150, 40, 150, 8, { fill: this.dampingEnabled ? '#3b82f6' : '#64748b' });
    r.text(300, 225, 'S', { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Pendulum pivot
    r.circle(200, 120, 8, { fill: '#94a3b8' });

    // Pendulum arm and bob
    const pivotX = 200;
    const pivotY = 120;
    const armLength = 100;
    const bobX = pivotX + armLength * Math.sin(this.pendulumAngle * Math.PI / 180);
    const bobY = pivotY + armLength * Math.cos(this.pendulumAngle * Math.PI / 180);

    r.line(pivotX, pivotY, bobX, bobY, { stroke: '#94a3b8', strokeWidth: 3 });
    r.roundRect(bobX - 20, bobY - 10, 40, 50, 6, { fill: '#c2410c' });
    r.text(bobX, bobY + 10, 'Cu', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Eddy current visualization when damping enabled
    if (this.dampingEnabled && this.isPendulumRunning) {
      const intensity = Math.min(1, Math.abs(this.pendulumVelocity) / 5);
      r.circle(bobX - 25, bobY + 10, 12, { fill: `rgba(59, 130, 246, ${intensity * 0.6})` });
      r.circle(bobX + 25, bobY + 10, 12, { fill: `rgba(59, 130, 246, ${intensity * 0.6})` });
    }

    // Status panel
    r.roundRect(30, 320, 340, 60, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(110, 345, `Swings: ${this.swingCount}`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(290, 345, `Magnet: ${this.dampingEnabled ? 'ON' : 'OFF'}`, { fill: this.dampingEnabled ? '#34d399' : '#f87171', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 365, `Angle: ${this.pendulumAngle.toFixed(1)}°`, { fill: '#a78bfa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Controls
    r.addButton({ id: 'toggle_damping', label: this.dampingEnabled ? 'Turn Magnet OFF' : 'Turn Magnet ON', variant: this.dampingEnabled ? 'primary' : 'secondary' });

    if (!this.isPendulumRunning) {
      r.addButton({ id: 'start_pendulum', label: 'Release Pendulum', variant: 'primary' });
    }
    r.addButton({ id: 'reset_pendulum', label: 'Reset', variant: 'secondary' });

    r.addButton({ id: 'continue', label: 'Learn More', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Energy Conversion', { fill: '#a78bfa', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Energy flow diagram
    r.roundRect(30, 90, 340, 150, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 120, 'Where Does the Energy Go?', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(50, 140, 80, 40, 8, { fill: 'rgba(59, 130, 246, 0.3)' });
    r.text(90, 165, 'Kinetic', { fill: '#3b82f6', fontSize: 11, textAnchor: 'middle' });

    r.text(145, 160, '→', { fill: '#94a3b8', fontSize: 20, textAnchor: 'middle' });

    r.roundRect(160, 140, 80, 40, 8, { fill: 'rgba(168, 85, 247, 0.3)' });
    r.text(200, 165, 'Eddy I', { fill: '#a78bfa', fontSize: 11, textAnchor: 'middle' });

    r.text(255, 160, '→', { fill: '#94a3b8', fontSize: 20, textAnchor: 'middle' });

    r.roundRect(270, 140, 80, 40, 8, { fill: 'rgba(239, 68, 68, 0.3)' });
    r.text(310, 165, 'Heat', { fill: '#f87171', fontSize: 11, textAnchor: 'middle' });

    r.text(200, 215, 'Motion → Electrical current → Thermal energy', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Key insight
    r.roundRect(30, 260, 340, 80, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 290, 'Conservation of Energy', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 320, 'Kinetic energy is never "lost" - it converts to heat!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Speed dependence
    r.roundRect(30, 360, 340, 80, 16, { fill: 'rgba(251, 191, 36, 0.1)' });
    r.text(200, 390, 'Speed-Dependent Braking', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 420, 'Faster motion = stronger currents = stronger braking', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Eddy Currents in Action', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#6366f1';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.tagline, { fill: '#818cf8', fontSize: 11, textAnchor: 'middle' });

    // Description (multi-line)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 230;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 48) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Physics connection
    r.roundRect(40, 320, 320, 70, 10, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 345, 'Physics Connection', { fill: '#818cf8', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 370, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 420, '✓ Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 460, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

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
      r.roundRect(25, 100, 350, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 130, question.scenario.substring(0, 50), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 148, question.scenario.substring(50, 100), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      // Question
      r.text(200, 200, question.question, { fill: '#818cf8', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 230 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 42, 8, { fill: bgColor });
        r.text(40, y + 25, `${String.fromCharCode(65 + i)}. ${option}`, { fill: isSelected ? '#818cf8' : '#e2e8f0', fontSize: 11 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      // Navigation
      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: '← Previous', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next →', variant: 'secondary' });
      }

      // Submit button
      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      } else {
        r.text(200, 480, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🎉' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "Excellent! You've mastered eddy currents!" : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 120, '🏆', { fontSize: 72, textAnchor: 'middle' });

    r.text(200, 200, 'Eddy Currents Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand electromagnetic braking!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '⚡', label: "Faraday's Law" },
      { icon: '🔄', label: "Lenz's Law" },
      { icon: '🧲', label: 'Magnetic Braking' },
      { icon: '🔥', label: 'Energy → Heat' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 280 + Math.floor(i / 2) * 70;
      r.roundRect(x, y, 135, 55, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 67, y + 22, concept.icon, { fontSize: 18, textAnchor: 'middle' });
      r.text(x + 67, y + 44, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 440, 300, 70, 12, { fill: 'rgba(99, 102, 241, 0.2)' });
    r.text(200, 468, 'Key Principle', { fill: '#818cf8', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 495, 'Induced currents oppose the change', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering eddy currents!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      magnetY: this.magnetY,
      magnetVelocity: this.magnetVelocity,
      conductorType: this.conductorType,
      isDropping: this.isDropping,
      eddyStrength: this.eddyStrength,
      pendulumAngle: this.pendulumAngle,
      pendulumVelocity: this.pendulumVelocity,
      dampingEnabled: this.dampingEnabled,
      isPendulumRunning: this.isPendulumRunning,
      swingCount: this.swingCount,
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
    if (state.magnetY !== undefined) this.magnetY = state.magnetY as number;
    if (state.magnetVelocity !== undefined) this.magnetVelocity = state.magnetVelocity as number;
    if (state.conductorType !== undefined) this.conductorType = state.conductorType as 'copper' | 'aluminum' | 'air';
    if (state.isDropping !== undefined) this.isDropping = state.isDropping as boolean;
    if (state.eddyStrength !== undefined) this.eddyStrength = state.eddyStrength as number;
    if (state.pendulumAngle !== undefined) this.pendulumAngle = state.pendulumAngle as number;
    if (state.pendulumVelocity !== undefined) this.pendulumVelocity = state.pendulumVelocity as number;
    if (state.dampingEnabled !== undefined) this.dampingEnabled = state.dampingEnabled as boolean;
    if (state.isPendulumRunning !== undefined) this.isPendulumRunning = state.isPendulumRunning as boolean;
    if (state.swingCount !== undefined) this.swingCount = state.swingCount as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createEddyCurrentsGame(sessionId: string): EddyCurrentsGame {
  return new EddyCurrentsGame(sessionId);
}
