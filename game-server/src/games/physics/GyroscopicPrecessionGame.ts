import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// GYROSCOPIC PRECESSION GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Omega = tau / L where L = I * omega
// Precession rate inversely proportional to angular momentum
// Torque changes direction of angular momentum, not magnitude
// Response is 90 degrees perpendicular to applied torque
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
  stats: { value: string; label: string; icon: string }[];
  examples: string[];
}

// Physics constants (PROTECTED - never sent to client)
const MOMENT_OF_INERTIA = 0.1; // kg*m^2 (typical spinning wheel)

export class GyroscopicPrecessionGame extends BaseGame {
  readonly gameType = 'gyroscopic_precession';
  readonly gameTitle = 'Gyroscopic Precession: The Spinning Wheel Mystery';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private spinSpeed = 5; // rad/s
  private isSpinning = false;
  private precessionAngle = 0;
  private wheelAngle = 0;
  private animationTime = 0;
  private experimentCount = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "You're holding a spinning bike wheel by its axle, and you try to tilt it downward.",
      question: "Instead of tilting down, the wheel moves sideways. Why?",
      options: [
        "Air resistance pushes it sideways",
        "Torque changes the direction of angular momentum",
        "The wheel is magnetically attracted",
        "Gravity affects spinning objects differently"
      ],
      correctIndex: 1,
      explanation: "When you apply a torque, it changes the DIRECTION of the angular momentum vector, not its magnitude. The wheel moves perpendicular to both the torque and spin axis - this is precession!"
    },
    {
      scenario: "A toy gyroscope is spinning fast. You push down on one end of its axle.",
      question: "What happens to the gyroscope?",
      options: [
        "It tips over immediately",
        "It spins faster",
        "It precesses - moving in a slow circle",
        "It stops spinning"
      ],
      correctIndex: 2,
      explanation: "The push (torque) causes the gyroscope to precess - its axis slowly rotates in a circle. The faster it spins, the slower the precession."
    },
    {
      scenario: "Wheel A spins at 10 rad/s, Wheel B at 5 rad/s. You apply the same torque to both.",
      question: "Which wheel precesses faster?",
      options: [
        "Wheel A (faster spin)",
        "Wheel B (slower spin)",
        "Both same rate",
        "Neither will precess"
      ],
      correctIndex: 1,
      explanation: "Precession rate Omega = tau/L. With same torque, the slower wheel has less angular momentum, so it precesses FASTER."
    },
    {
      scenario: "A spinning top starts to wobble as it slows down.",
      question: "Why does the wobbling get worse as it slows?",
      options: [
        "The top becomes heavier",
        "Lower L means gravity causes faster precession",
        "Air becomes thicker",
        "It's running out of energy"
      ],
      correctIndex: 1,
      explanation: "As spin decreases, angular momentum L decreases. Since Omega = tau/L, lower L means faster precession and larger wobble."
    },
    {
      scenario: "A helicopter's main rotor spins counterclockwise viewed from above.",
      question: "Without a tail rotor, what would happen to the body?",
      options: [
        "Nothing - too heavy",
        "Body spins clockwise",
        "Body precesses sideways",
        "Helicopter rises faster"
      ],
      correctIndex: 1,
      explanation: "Angular momentum conservation! The rotor spins one way, so without the tail rotor, the body would spin opposite."
    },
    {
      scenario: "Spacecraft use spinning reaction wheels to orient themselves.",
      question: "How do reaction wheels work?",
      options: [
        "Push against solar wind",
        "Speed changes make spacecraft rotate opposite",
        "Create artificial gravity",
        "Emit particles"
      ],
      correctIndex: 1,
      explanation: "Conservation of angular momentum! If a wheel speeds up one direction, the spacecraft rotates opposite. No fuel needed!"
    },
    {
      scenario: "A figure skater tilts their head while spinning.",
      question: "What gyroscopic effect might they experience?",
      options: [
        "No effect - humans too light",
        "Pulled sideways due to precession",
        "Immediately stop spinning",
        "Spin faster"
      ],
      correctIndex: 1,
      explanation: "Their body acts as a gyroscope! Tilting while spinning creates precession forces. Experienced skaters learn to anticipate these."
    },
    {
      scenario: "A motorcycle is leaning into a turn at high speed.",
      question: "How do the spinning wheels affect stability?",
      options: [
        "Make it unstable",
        "Gyroscopic effect resists changes, increasing stability",
        "No effect",
        "Make it go straight"
      ],
      correctIndex: 1,
      explanation: "The wheels' angular momentum resists tilting and turning. This gyroscopic stability helps keep the bike upright."
    },
    {
      scenario: "Earth's axis slowly traces a circle in space over 26,000 years.",
      question: "What causes this slow precession?",
      options: [
        "Sun's pull on Earth's equatorial bulge",
        "Moon pushing Earth sideways",
        "Solar wind pressure",
        "Dark matter"
      ],
      correctIndex: 0,
      explanation: "Earth bulges at the equator. The Sun and Moon exert torque on this bulge, causing Earth's axis to precess slowly."
    },
    {
      scenario: "An engineer designs a ship stabilizer using a massive spinning flywheel.",
      question: "How would this reduce ship roll in waves?",
      options: [
        "Absorbs wave energy",
        "Precession generates counter-torques",
        "Adds weight to bottom",
        "Pushes water away"
      ],
      correctIndex: 1,
      explanation: "When waves try to roll the ship, the flywheel precesses. This generates torques opposing the roll, keeping the ship stable."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "helicopter",
      title: "Helicopter Dynamics",
      tagline: "Tail Rotor & Gyroscopic Effects",
      description: "Helicopter rotors are massive spinning disks with significant angular momentum. The tail rotor counteracts torque, and gyroscopic effects influence maneuverability.",
      connection: "Just like a spinning wheel resists tilting, the helicopter's rotor resists orientation changes. Pilots must account for 90 degree phase lag in their inputs.",
      stats: [{ value: '400+', label: 'RPM typical', icon: 'rotate' }, { value: '90 deg', label: 'Phase lag', icon: 'angle' }, { value: '1944', label: 'First practical', icon: 'calendar' }],
      examples: ['Tail rotor prevents body rotation', 'Cyclic inputs account for precession', 'Autorotation uses stored momentum', 'Blade flapping compensates']
    },
    {
      icon: "satellite",
      title: "Spacecraft Control",
      tagline: "Reaction Wheels & CMGs",
      description: "Satellites use spinning reaction wheels and control moment gyroscopes (CMGs) to orient precisely in space - without fuel.",
      connection: "When a reaction wheel speeds up, the spacecraft rotates opposite (conservation). CMGs use precession for large torques.",
      stats: [{ value: '4+', label: 'Wheels on ISS', icon: 'wheel' }, { value: '0', label: 'Fuel used', icon: 'fuel' }, { value: '0.001 deg', label: 'Accuracy', icon: 'target' }],
      examples: ['Hubble precision pointing', 'ISS uses CMGs', 'Mars rovers orient antennas', 'GPS satellites stay Earth-facing']
    },
    {
      icon: "motorcycle",
      title: "Motorcycle Dynamics",
      tagline: "Countersteering & Stability",
      description: "Motorcycle wheels act as gyroscopes, providing inherent stability. Countersteering is necessary because of gyroscopic precession.",
      connection: "The spinning front wheel resists tilting. To lean for turning, riders briefly steer AWAY - using precession to tip the bike.",
      stats: [{ value: '20+', label: 'mph for effect', icon: 'speed' }, { value: '2x', label: 'Stability boost', icon: 'chart' }, { value: '~1s', label: 'Response time', icon: 'clock' }],
      examples: ['Countersteering all turns', 'Hands-free stability', 'Weave damping', 'Racing lean angles 60 deg']
    },
    {
      icon: "earth",
      title: "Earth's Precession",
      tagline: "26,000 Year Wobble",
      description: "Earth's axis precesses like a slow-motion top, tracing a circle in space over 26,000 years, changing which star is the North Star.",
      connection: "Earth's equatorial bulge experiences gravitational torque from Sun and Moon. Combined with spin, this causes slow precession.",
      stats: [{ value: '26,000', label: 'Years per cycle', icon: 'rotate' }, { value: '23.4 deg', label: 'Axial tilt', icon: 'angle' }, { value: '50"', label: 'Arc-sec/year', icon: 'star' }],
      examples: ["Polaris wasn't always North Star", "Vega will be in ~12,000 years", "Milankovitch climate cycles", "Ancient alignments shift"]
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate precession rate
  private calculatePrecessionRate(spinSpeed: number): number {
    // Omega_precession = tau / L where L = I * omega
    // For simplicity, assume constant torque from gravity
    const angularMomentum = MOMENT_OF_INERTIA * spinSpeed;
    return spinSpeed > 0 ? 0.5 / angularMomentum : 0;
  }

  // PROTECTED: Calculate angular momentum
  private calculateAngularMomentum(spinSpeed: number): number {
    return MOMENT_OF_INERTIA * spinSpeed;
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
    } else if (input.type === 'slider_change') {
      if (input.id === 'spin_speed') {
        this.spinSpeed = Math.max(1, Math.min(10, input.value));
      }
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
        }
        break;

      case 'play':
        if (buttonId === 'spin') {
          this.isSpinning = !this.isSpinning;
          if (this.isSpinning) {
            this.experimentCount++;
          }
        } else if (buttonId === 'continue' && this.experimentCount >= 1) {
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
        if (buttonId === 'spin') {
          this.isSpinning = !this.isSpinning;
          if (this.isSpinning) {
            this.experimentCount++;
          }
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
        } else if (buttonId === 'next_app') {
          if (this.activeAppIndex < this.transferApps.length - 1) {
            this.completedApps.add(this.activeAppIndex);
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

  processInput(input: UserInput, config: SessionConfig): void {
    this.handleInput(input);
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.spinSpeed = 5;
    this.isSpinning = false;
    this.precessionAngle = 0;
    this.wheelAngle = 0;
    this.experimentCount = 0;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Update spinning wheel physics
    if (this.isSpinning && (this.phase === 'play' || this.phase === 'twist_play')) {
      this.wheelAngle = (this.wheelAngle + this.spinSpeed * 3 * deltaTime * 60) % 360;
      const precessionRate = this.calculatePrecessionRate(this.spinSpeed);
      this.precessionAngle = (this.precessionAngle + precessionRate * 2 * deltaTime * 60) % 360;
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(6, 182, 212, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(59, 130, 246, 0.05)' });

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
    r.roundRect(115, 60, 170, 30, 8, { fill: 'rgba(6, 182, 212, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#22d3ee', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Spinning Wheel Mystery', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Push down... but it moves sideways?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Wheel illustration
    r.text(200, 260, '[ wheel ]', { fill: '#22d3ee', fontSize: 48, textAnchor: 'middle' });

    // Feature cards
    r.roundRect(50, 320, 90, 70, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(95, 350, 'Spin', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(95, 375, '& Push', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.roundRect(155, 320, 90, 70, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 350, '90 deg', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 375, 'Response', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.roundRect(260, 320, 90, 70, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(305, 350, 'Real', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(305, 375, 'Uses', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 410, 320, 120, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 445, "It's just a spinning bike wheel - but", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 470, 'push one end down and it moves', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 495, 'SIDEWAYS instead!', { fill: '#22d3ee', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Make a Prediction', variant: 'primary' });

    r.setCoachMessage('Discover the physics behind gyroscopic precession!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 95, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'You hold a fast-spinning bike wheel,', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'then push one end DOWN.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 175, 'The wheel will...', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Tip DOWNWARD (direction I push)',
      'Tip UPWARD (opposite to push)',
      'Move SIDEWAYS (perpendicular)',
      'Stay perfectly still'
    ];

    options.forEach((option, i) => {
      const y = 205 + i * 60;
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
        bgColor = 'rgba(6, 182, 212, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 480, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 2 ? 'Exactly right!' : 'The wheel moves SIDEWAYS!';
      r.text(200, 510, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 535, 'This counterintuitive behavior is called', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 555, 'GYROSCOPIC PRECESSION', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test It', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Spin the Wheel & Push', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 75, 'Watch what happens when you apply torque!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Gyroscope visualization
    this.renderGyroscope(r, 200, 220, true);

    // Physics info box
    const L = this.calculateAngularMomentum(this.spinSpeed);
    const precRate = this.calculatePrecessionRate(this.spinSpeed);

    r.roundRect(30, 380, 160, 70, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(110, 405, `Spin: ${this.spinSpeed.toFixed(1)} rad/s`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 425, `L = ${L.toFixed(2)} kg*m^2/s`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 445, `Omega = ${precRate.toFixed(2)} rad/s`, { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });

    // Slider for spin speed
    r.addSlider({
      id: 'spin_speed',
      label: 'Spin Speed',
      min: 1,
      max: 10,
      step: 0.5,
      value: this.spinSpeed
    });

    // Spin button
    r.addButton({
      id: 'spin',
      label: this.isSpinning ? 'Stop & Reset' : 'Spin Wheel & Apply Torque',
      variant: this.isSpinning ? 'secondary' : 'primary'
    });

    // Observation note
    if (this.isSpinning) {
      r.roundRect(30, 530, 340, 60, 10, { fill: 'rgba(16, 185, 129, 0.2)' });
      r.text(200, 555, 'Watch: The wheel moves SIDEWAYS, not down!', { fill: '#34d399', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 575, 'This is precession in action.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    }

    if (this.experimentCount >= 1) {
      r.addButton({ id: 'continue', label: 'Understand Why', variant: 'primary' });
    }
  }

  private renderGyroscope(r: CommandRenderer, cx: number, cy: number, interactive: boolean): void {
    const precX = Math.sin(this.precessionAngle * Math.PI / 180) * 25;
    const precY = Math.cos(this.precessionAngle * Math.PI / 180) * 8;

    // Background grid pattern
    r.roundRect(30, 100, 340, 260, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Hand
    r.ellipse(cx - 90 + precX, cy + precY, 22, 32, { fill: '#78716c' });

    // Axle
    r.line(cx - 70 + precX, cy + precY, cx + 70 + precX, cy + precY, { stroke: '#94a3b8', strokeWidth: 6 });

    // Wheel
    const wheelX = cx + 70 + precX;
    const wheelY = cy + precY;
    r.circle(wheelX, wheelY, 50, { fill: 'none', stroke: '#f97316', strokeWidth: 10 });

    // Wheel spokes
    for (let a = 0; a < 360; a += 45) {
      const angle = (a + this.wheelAngle) * Math.PI / 180;
      const endX = wheelX + Math.cos(angle) * 40;
      const endY = wheelY + Math.sin(angle) * 40;
      r.line(wheelX, wheelY, endX, endY, { stroke: '#64748b', strokeWidth: 2 });
    }

    // Hub
    r.circle(wheelX, wheelY, 10, { fill: '#475569' });

    // Angular momentum vector L
    r.line(wheelX, wheelY, wheelX, wheelY - 80, { stroke: '#a855f7', strokeWidth: 3 });
    r.polygon([
      { x: wheelX - 5, y: wheelY - 80 },
      { x: wheelX + 5, y: wheelY - 80 },
      { x: wheelX, y: wheelY - 90 }
    ], { fill: '#a855f7' });
    r.text(wheelX + 12, wheelY - 70, 'L', { fill: '#a855f7', fontSize: 13, fontWeight: 'bold' });

    // Torque arrow (if spinning)
    if (this.isSpinning) {
      r.line(wheelX, wheelY + 60, wheelX, wheelY + 95, { stroke: '#ef4444', strokeWidth: 3 });
      r.polygon([
        { x: wheelX - 5, y: wheelY + 95 },
        { x: wheelX + 5, y: wheelY + 95 },
        { x: wheelX, y: wheelY + 105 }
      ], { fill: '#ef4444' });
      r.text(wheelX + 15, wheelY + 85, 'tau', { fill: '#ef4444', fontSize: 11, fontWeight: 'bold' });

      // Precession indicator
      r.text(cx, cy - 70, 'PRECESSION', { fill: '#22c55e', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
      r.arc(cx, cy - 55, 25, Math.PI, 0, { fill: 'none', stroke: '#22c55e', strokeWidth: 2 });
    }
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'Why 90 Degrees Sideways?', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Key insight cards
    r.roundRect(30, 90, 340, 80, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(50, 115, 'Torque Changes L Direction', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold' });
    r.text(200, 145, 'Applied torque changes the DIRECTION of angular', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 162, 'momentum. Change is perpendicular to both!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.roundRect(30, 185, 340, 80, 12, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(50, 210, 'The Right-Hand Rule', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold' });
    r.text(200, 240, 'Point fingers along omega (spin), curl toward tau.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 257, 'Your thumb points where L moves - 90 deg sideways!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.roundRect(30, 280, 340, 80, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(50, 305, 'Precession Rate: Omega = tau/L', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold' });
    r.text(200, 335, 'More spin (bigger L) = SLOWER precession', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 352, 'More torque = faster precession', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Key equation
    r.roundRect(80, 380, 240, 60, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
    r.text(200, 400, 'THE PRECESSION EQUATION', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 425, 'Omega = tau / (I * omega)', { fill: '#f97316', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(200, 470, 'Higher spin (omega) leads to lower precession (Omega)', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Try a Challenge', variant: 'primary' });
    r.setCoachMessage('Now let\'s see what happens with different spin speeds...');
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'New Variable', { fill: '#a855f7', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 90, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 120, 'What if you spin at HALF the speed?', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'Original: 10 rad/s | New: 5 rad/s', { fill: '#fbbf24', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 175, 'Same push force applied.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Question
    r.text(200, 210, 'The precession will be...', { fill: '#a855f7', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'FASTER precession (less resistance)',
      'SLOWER precession (weaker effect)',
      'SAME rate (speed doesn\'t matter)',
      'OPPOSITE direction (slow reverses)'
    ];

    options.forEach((option, i) => {
      const y = 235 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (i === 0) {
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
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 0 ? 'Exactly right!' : 'FASTER precession!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 525, 'Less spin = less angular momentum = faster wobble.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 548, 'This is why a slowing top wobbles more!', { fill: '#22d3ee', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Test It', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Adjust Spin Speed', { fill: '#a855f7', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 75, 'See how precession rate changes!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    // Gyroscope visualization
    this.renderGyroscope(r, 200, 220, true);

    // Comparison boxes
    r.roundRect(30, 380, 165, 65, 10, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(112, 400, 'HIGH SPIN', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(112, 425, 'Slow Precession', { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(205, 380, 165, 65, 10, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(287, 400, 'LOW SPIN', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(287, 425, 'Fast Precession', { fill: '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Slider for spin speed
    r.addSlider({
      id: 'spin_speed',
      label: 'Spin Speed (rad/s)',
      min: 1,
      max: 10,
      step: 0.5,
      value: this.spinSpeed
    });

    // Control buttons
    r.addButton({
      id: 'spin',
      label: this.isSpinning ? 'Stop & Reset' : 'Spin Wheel',
      variant: this.isSpinning ? 'secondary' : 'primary'
    });

    r.addButton({ id: 'continue', label: 'Deep Insight', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Angular Momentum as Stability', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Main insight card
    r.roundRect(30, 85, 340, 100, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 120, 'A spinning object has angular momentum along its', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 145, 'spin axis. This creates "directional memory" -', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 170, 'the object resists having its axis tilted.', { fill: '#f97316', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Examples
    r.roundRect(30, 200, 340, 75, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(50, 225, 'Spinning Tops', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold' });
    r.text(200, 250, 'A fast top stays upright. As it slows, precession', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 268, 'speeds up until it falls.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.roundRect(30, 290, 340, 75, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(50, 315, "Earth's Axis", { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold' });
    r.text(200, 340, "Earth's spin resists changes. Yet Sun and Moon's", { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 358, 'gravity slowly causes 26,000-year precession!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.roundRect(30, 380, 340, 75, 12, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(50, 405, 'Spacecraft', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold' });
    r.text(200, 430, 'Reaction wheels and CMGs use precession physics', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 448, 'for fuel-free orientation control.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real World Apps', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 50, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Progress indicator
    r.text(200, 75, `Application ${this.activeAppIndex + 1} of ${this.transferApps.length}`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 30 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#0891b2';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 90, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 118, app.icon === 'helicopter' ? 'Heli' : app.icon === 'satellite' ? 'Space' : app.icon === 'motorcycle' ? 'Moto' : 'Earth', { fontSize: 11, textAnchor: 'middle', fill: isActive ? '#ffffff' : '#94a3b8' });

      if (isCompleted && !isActive) {
        r.text(x + 70, 100, '✓', { fill: '#22c55e', fontSize: 12 });
      }

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 150, 350, 340, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 180, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.tagline, { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });

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
    r.roundRect(40, 320, 320, 70, 10, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 345, 'Physics Connection', { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 370, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Examples
    r.text(50, 410, 'Examples:', { fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' });
    app.examples.slice(0, 3).forEach((ex, i) => {
      r.text(50, 430 + i * 18, `* ${ex}`, { fill: '#cbd5e1', fontSize: 10 });
    });

    // Navigation buttons
    const isLast = this.activeAppIndex === this.transferApps.length - 1;
    if (isLast) {
      if (!this.completedApps.has(this.activeAppIndex)) {
        r.addButton({ id: 'mark_understood', label: 'Complete & Take Quiz', variant: 'primary' });
      }
    } else {
      r.addButton({ id: 'next_app', label: 'Next Application', variant: 'primary' });
    }

    // Continue to test if all completed
    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take the Quiz', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 50, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 75, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Scenario
      r.roundRect(25, 95, 350, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      const scenarioWords = question.scenario.split(' ');
      let scenarioLine = '';
      let scenarioY = 115;
      scenarioWords.forEach(word => {
        if ((scenarioLine + word).length > 50) {
          r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
          scenarioLine = word + ' ';
          scenarioY += 16;
        } else {
          scenarioLine += word + ' ';
        }
      });
      if (scenarioLine) r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      // Question
      r.text(200, 195, question.question, { fill: '#22d3ee', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 220 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(6, 182, 212, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${option.substring(0, 45)}${option.length > 45 ? '...' : ''}`, { fill: isSelected ? '#22d3ee' : '#e2e8f0', fontSize: 11 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      // Navigation
      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: '< Prev', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next >', variant: 'secondary' });
      }

      // Submit button
      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      } else {
        r.text(200, 475, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? 'trophy' : 'book', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "Excellent! You've mastered precession!" : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 160, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'Omega = tau/L (precession rate)',
        'L = I*omega (angular momentum)',
        '90-degree perpendicular response',
        'Higher spin = slower precession'
      ];
      concepts.forEach((concept, i) => {
        r.text(200, 340 + i * 22, concept, { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Complete!', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review Material', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Trophy
    r.text(200, 120, 'trophy', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Mastery Achieved!', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand gyroscopic precession -', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'helicopters, spacecraft, motorcycles, Earth!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { label: 'Omega = tau/L' },
      { label: 'L = I*omega' },
      { label: '90 deg Precession' },
      { label: 'Angular Momentum' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 300 + Math.floor(i / 2) * 65;
      r.roundRect(x, y, 140, 50, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 30, concept.label, { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });
    });

    r.addButton({ id: 'restart', label: 'Play Again', variant: 'secondary' });
    r.setCoachMessage('Congratulations on mastering gyroscopic precession!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      spinSpeed: this.spinSpeed,
      isSpinning: this.isSpinning,
      precessionAngle: this.precessionAngle,
      wheelAngle: this.wheelAngle,
      animationTime: this.animationTime,
      experimentCount: this.experimentCount,
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
    if (state.spinSpeed !== undefined) this.spinSpeed = state.spinSpeed as number;
    if (state.isSpinning !== undefined) this.isSpinning = state.isSpinning as boolean;
    if (state.precessionAngle !== undefined) this.precessionAngle = state.precessionAngle as number;
    if (state.wheelAngle !== undefined) this.wheelAngle = state.wheelAngle as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.experimentCount !== undefined) this.experimentCount = state.experimentCount as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createGyroscopicPrecessionGame(sessionId: string): GyroscopicPrecessionGame {
  return new GyroscopicPrecessionGame(sessionId);
}
