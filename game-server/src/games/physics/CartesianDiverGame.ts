import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// CARTESIAN DIVER GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Boyle's Law (PV = constant) + Archimedes' Principle
// Squeezing increases pressure, compressing air bubble in diver
// Less buoyancy = diver sinks; release = diver rises
// Temperature also affects gas volume (Combined Gas Law: PV/T = constant)
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
const BASE_PRESSURE = 1.0; // atm
const BASE_TEMPERATURE = 293; // K (20C)
const SQUEEZE_PRESSURE = 1.5; // atm when squeezed
const NEUTRAL_BUOYANCY_BUBBLE = 0.85; // bubble volume for neutral buoyancy

export class CartesianDiverGame extends BaseGame {
  readonly gameType = 'cartesian_diver';
  readonly gameTitle = 'Cartesian Diver: Buoyancy Control';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private pressure = BASE_PRESSURE;
  private temperature = 20; // Celsius
  private diverPosition = 0.3; // 0 = top, 1 = bottom
  private diverVelocity = 0;
  private isSqueezing = false;
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
      scenario: "You have a sealed bottle with a Cartesian diver floating at the surface.",
      question: "What happens to the air bubble inside the diver when you squeeze the bottle?",
      options: [
        "It expands",
        "It compresses (gets smaller)",
        "It stays the same size",
        "It turns into water"
      ],
      correctIndex: 1,
      explanation: "Boyle's Law states PV = constant. When you squeeze (increase P), the volume must decrease."
    },
    {
      scenario: "A Cartesian diver is responding to pressure changes according to Boyle's Law.",
      question: "What gas law explains why the air bubble changes size under pressure?",
      options: [
        "Newton's Law",
        "Ohm's Law",
        "Boyle's Law (PV = constant)",
        "Murphy's Law"
      ],
      correctIndex: 2,
      explanation: "Boyle's Law (PV = constant) describes how gas volume changes inversely with pressure at constant temperature."
    },
    {
      scenario: "You compress the air bubble inside a Cartesian diver by squeezing the bottle.",
      question: "Why does compressing the air bubble make the diver sink?",
      options: [
        "The diver gets heavier",
        "Less displaced water means less buoyant force",
        "The water pushes it down",
        "Air becomes heavier under pressure"
      ],
      correctIndex: 1,
      explanation: "Archimedes' Principle: buoyant force equals weight of displaced water. Smaller bubble = less displacement = less buoyancy."
    },
    {
      scenario: "An object floats at a fixed depth without rising or sinking.",
      question: "What is the condition for neutral buoyancy (floating at a fixed depth)?",
      options: [
        "Object must be hollow",
        "Object density equals water density",
        "Object must be made of plastic",
        "Water must be cold"
      ],
      correctIndex: 1,
      explanation: "Neutral buoyancy occurs when object density equals fluid density, so buoyant force exactly balances weight."
    },
    {
      scenario: "A submarine needs to descend to a specific depth and hover there.",
      question: "How do submarines control their depth?",
      options: [
        "By spinning propellers faster",
        "By adjusting ballast tanks (water vs air)",
        "By changing shape",
        "By heating the water around them"
      ],
      correctIndex: 1,
      explanation: "Submarines fill ballast tanks with water to sink or pump in air to rise, controlling their overall density."
    },
    {
      scenario: "A scuba diver descends to 10 meters underwater.",
      question: "At 10 meters underwater, how does pressure compare to the surface?",
      options: [
        "Same pressure",
        "About double (2 atm total)",
        "Ten times higher",
        "Half the pressure"
      ],
      correctIndex: 1,
      explanation: "Water adds about 1 atm per 10 meters. At 10m: 1 atm (air) + 1 atm (water) = 2 atm total."
    },
    {
      scenario: "A scuba diver's BCD (buoyancy control device) compresses as they descend.",
      question: "Why do scuba divers need to add air to their BCD as they descend?",
      options: [
        "To breathe easier",
        "To compensate for air compression from increased pressure",
        "To stay warm",
        "To see better"
      ],
      correctIndex: 1,
      explanation: "Increased pressure compresses BCD air (Boyle's Law). Divers add air to maintain buoyancy as they go deeper."
    },
    {
      scenario: "A fish maintains its position in the water column without swimming.",
      question: "What does a fish's swim bladder do?",
      options: [
        "Helps the fish breathe",
        "Stores food",
        "Controls buoyancy by adjusting gas volume",
        "Makes the fish swim faster"
      ],
      correctIndex: 2,
      explanation: "Fish adjust gas in their swim bladder to control density and achieve neutral buoyancy at different depths."
    },
    {
      scenario: "You heat a Cartesian diver setup from 20C to 30C.",
      question: "If you heat a Cartesian diver setup, what happens?",
      options: [
        "The diver sinks (air contracts)",
        "The diver rises (air expands, more buoyancy)",
        "Nothing changes",
        "The diver spins"
      ],
      correctIndex: 1,
      explanation: "Heating expands the air bubble (Charles's Law). Larger bubble = more displaced water = more buoyancy = rises."
    },
    {
      scenario: "A deep-sea fish is brought rapidly to the surface.",
      question: "Why can't deep-sea fish survive if brought to the surface quickly?",
      options: [
        "They get cold",
        "It's too bright",
        "Their swim bladder expands rapidly and can rupture",
        "They can't breathe surface air"
      ],
      correctIndex: 2,
      explanation: "Rapid pressure decrease causes swim bladder gas to expand violently (Boyle's Law), potentially rupturing it."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🚢",
      title: "Submarines",
      tagline: "Controlling buoyancy with ballast tanks",
      description: "Submarines use the same principle as Cartesian divers! They have ballast tanks that can be filled with water (to sink) or compressed air (to rise).",
      connection: "Buoyancy = rho_water x V_displaced x g. Submarines adjust V_displaced by controlling air/water ratio in ballast tanks."
    },
    {
      icon: "🐟",
      title: "Fish Swim Bladders",
      tagline: "Nature's buoyancy control",
      description: "Most fish have a swim bladder - an internal air sac they can inflate or deflate. By adjusting gas volume, fish control buoyancy without constantly swimming.",
      connection: "Fish adjust V_bladder to achieve neutral buoyancy where their average density matches water density."
    },
    {
      icon: "🤿",
      title: "Scuba Diving",
      tagline: "BCD and pressure at depth",
      description: "Scuba divers wear a BCD (Buoyancy Control Device) - an inflatable vest. As divers descend, increasing pressure compresses air in their BCD.",
      connection: "P1V1 = P2V2 - At 10m depth (2 atm), BCD air volume halves. Divers add air to compensate."
    },
    {
      icon: "⚗️",
      title: "Density Columns",
      tagline: "Layered liquids and floating objects",
      description: "Objects float at the level where their density matches the surrounding liquid. A density column demonstrates this beautifully.",
      connection: "Object floats when rho_object < rho_liquid, sinks when rho_object > rho_liquid."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate bubble size using Boyle's Law and Charles's Law
  private calculateBubbleSize(): number {
    // Combined Gas Law: PV/T = constant
    const baseSize = 1.0;
    const currentTempK = this.temperature + 273;
    return baseSize * (BASE_PRESSURE / this.pressure) * (currentTempK / BASE_TEMPERATURE);
  }

  // PROTECTED: Calculate net buoyancy force
  private calculateNetForce(bubbleVolume: number): number {
    // Positive = rising, Negative = sinking
    return (bubbleVolume - NEUTRAL_BUOYANCY_BUBBLE) * 2.0;
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
      if (input.id === 'squeeze') {
        // Toggle squeeze on button click
        this.isSqueezing = !this.isSqueezing;
        this.pressure = this.isSqueezing ? SQUEEZE_PRESSURE : BASE_PRESSURE;
      } else {
        this.handleButtonClick(input.id);
      }
    } else if (input.type === 'slider_change') {
      if (input.id === 'temperature') {
        this.temperature = Math.max(5, Math.min(35, input.value));
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
          this.resetSimulation();
        }
        break;

      case 'play':
        if (buttonId === 'continue') {
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
          this.resetSimulation();
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

  private resetSimulation(): void {
    this.pressure = BASE_PRESSURE;
    this.temperature = 20;
    this.diverPosition = 0.3;
    this.diverVelocity = 0;
    this.isSqueezing = false;
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
    this.resetSimulation();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Physics simulation for play phases
    if (this.phase === 'play' || this.phase === 'twist_play') {
      const bubbleSize = this.calculateBubbleSize();
      const netForce = this.calculateNetForce(bubbleSize);
      const gravity = 0.001;
      const drag = 0.95;

      // Update velocity
      this.diverVelocity = (this.diverVelocity + netForce * 0.01 - gravity) * drag;
      this.diverVelocity = Math.max(-0.02, Math.min(0.02, this.diverVelocity));

      // Update position
      this.diverPosition -= this.diverVelocity;

      // Boundary collisions
      if (this.diverPosition < 0.05) {
        this.diverPosition = 0.05;
        this.diverVelocity = Math.abs(this.diverVelocity) * 0.3;
      }
      if (this.diverPosition > 0.9) {
        this.diverPosition = 0.9;
        this.diverVelocity = -Math.abs(this.diverVelocity) * 0.3;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(6, 182, 212, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(20, 184, 166, 0.05)' });

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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(6, 182, 212, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#22d3ee', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'The Cartesian Diver', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'A squeeze makes it sink. Release makes it rise.', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Diver illustration
    r.text(200, 250, '🧪', { fill: '#22d3ee', fontSize: 64, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 300, 320, 160, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 335, 'This 17th-century toy reveals', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 365, 'Boyle\'s Law in Action', { fill: '#22d3ee', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 400, 'The same physics lets submarines dive', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 420, 'and fish hover at any depth!', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 450, 'Squeeze to sink, release to rise - but why?', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Discover the Secret', variant: 'primary' });

    r.setCoachMessage('Learn how pressure controls buoyancy!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'A sealed bottle with a dropper inside.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'The dropper has an air bubble trapped in it.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 185, 'What happens when you squeeze hard?', { fill: '#22d3ee', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Nothing - it stays in place',
      'It rises to the top',
      'It sinks to the bottom',
      'It spins around'
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
        bgColor = 'rgba(6, 182, 212, 0.3)';
      }

      r.roundRect(30, y, 340, 55, 10, { fill: bgColor });
      r.text(50, y + 32, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 500, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 2 ? 'Correct!' : 'Not quite - it sinks!';
      r.text(200, 530, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 555, 'Squeezing compresses the air bubble...', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See It In Action', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Diver Lab', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    const bubbleSize = this.calculateBubbleSize();
    const netForce = this.calculateNetForce(bubbleSize);

    // Bottle visualization
    r.roundRect(100, 80, 200, 350, 20, { fill: 'rgba(136, 192, 208, 0.1)' });
    r.roundRect(105, 85, 190, 340, 18, { fill: 'rgba(14, 165, 233, 0.3)' });

    // Water
    r.rect(108, 90, 184, 330, { fill: 'rgba(14, 165, 233, 0.5)' });

    // Diver position
    const diverY = 100 + this.diverPosition * 280;

    // Diver body
    r.rect(190, diverY - 25, 20, 50, { fill: '#e5e7eb' });
    r.ellipse(200, diverY - 30, 12, 10, { fill: '#ef4444' });

    // Air bubble in diver (size based on pressure)
    const bubbleRadius = 8 + bubbleSize * 12;
    r.ellipse(200, diverY - 5, bubbleRadius * 0.5, bubbleRadius, { fill: 'rgba(255, 255, 255, 0.8)' });

    // Weight at bottom
    r.rect(195, diverY + 25, 10, 10, { fill: '#6b7280' });

    // Squeeze indicator
    if (this.isSqueezing) {
      r.text(200, 450, 'SQUEEZING!', { fill: '#f472b6', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      // Pressure arrows
      r.polygon([[85, 230], [100, 220], [100, 240]], { fill: '#f472b6' });
      r.polygon([[315, 230], [300, 220], [300, 240]], { fill: '#f472b6' });
    }

    // Data panel
    r.roundRect(40, 460, 100, 50, 8, { fill: 'rgba(15, 23, 42, 0.8)' });
    r.text(90, 480, 'Pressure', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(90, 500, `${this.pressure.toFixed(2)} atm`, { fill: '#f472b6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(150, 460, 100, 50, 8, { fill: 'rgba(15, 23, 42, 0.8)' });
    r.text(200, 480, 'Bubble', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 500, `${(bubbleSize * 100).toFixed(0)}%`, { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(260, 460, 100, 50, 8, { fill: 'rgba(15, 23, 42, 0.8)' });
    r.text(310, 480, 'Status', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(310, 500, netForce > 0 ? 'Rising' : 'Sinking', { fill: netForce > 0 ? '#22c55e' : '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Squeeze button (hold to squeeze)
    r.addButton({ id: 'squeeze', label: this.isSqueezing ? 'Squeezing!' : 'Hold to Squeeze', variant: this.isSqueezing ? 'secondary' : 'primary' });

    r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'secondary' });

    r.setCoachMessage('Hold the squeeze button and watch the diver respond!');
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 60, 'The Physics of Buoyancy', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Boyle's Law card
    r.roundRect(30, 90, 340, 130, 16, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 120, "Boyle's Law", { fill: '#22d3ee', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(70, 140, 260, 40, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 165, 'P1 x V1 = P2 x V2', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });
    r.text(200, 200, 'Pressure up = Volume down', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Archimedes card
    r.roundRect(30, 235, 340, 130, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 265, "Archimedes' Principle", { fill: '#34d399', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(70, 285, 260, 40, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 310, 'Fb = rho x g x V', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });
    r.text(200, 345, 'Less volume = Less buoyancy', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Connection
    r.roundRect(30, 380, 340, 100, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 410, 'The Connection', { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 440, 'Squeeze -> Compress bubble -> Less buoyancy', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 460, '-> Diver sinks!', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Temperature Effects', variant: 'secondary' });

    r.setCoachMessage('Now let\'s see what happens with temperature changes!');
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist: Temperature', { fill: '#a855f7', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'The diver floats perfectly neutral.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'Now the temperature drops by 10C...', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 180, 'What happens to the diver?', { fill: '#a855f7', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      "It stays perfectly neutral - temp doesn't matter",
      'It slowly sinks as water contracts',
      'It slowly rises as air contracts more than water',
      'It sinks because cold water is denser'
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (i === 2) {
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
      const displayText = option.length > 45 ? option.substring(0, 42) + '...' : option;
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${displayText}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 2 ? 'Counterintuitive but correct!' : 'Surprise - it actually SINKS!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 525, 'Gases contract MORE than liquids when cooled!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 545, 'Smaller bubble = less buoyancy = sinks.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Try Temperature Control', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Temperature & Buoyancy', { fill: '#a855f7', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    const bubbleSize = this.calculateBubbleSize();
    const netForce = this.calculateNetForce(bubbleSize);

    // Bottle visualization (similar to play but with temperature display)
    r.roundRect(100, 80, 200, 300, 20, { fill: 'rgba(136, 192, 208, 0.1)' });
    r.roundRect(105, 85, 190, 290, 18, { fill: 'rgba(14, 165, 233, 0.3)' });
    r.rect(108, 90, 184, 280, { fill: 'rgba(14, 165, 233, 0.5)' });

    // Diver
    const diverY = 100 + this.diverPosition * 230;
    r.rect(190, diverY - 25, 20, 50, { fill: '#e5e7eb' });
    r.ellipse(200, diverY - 30, 12, 10, { fill: '#ef4444' });
    const bubbleRadius = 8 + bubbleSize * 12;
    r.ellipse(200, diverY - 5, bubbleRadius * 0.5, bubbleRadius, { fill: 'rgba(255, 255, 255, 0.8)' });
    r.rect(195, diverY + 25, 10, 10, { fill: '#6b7280' });

    // Temperature indicator
    r.roundRect(320, 100, 60, 200, 8, { fill: 'rgba(15, 23, 42, 0.8)' });
    const tempFill = (this.temperature - 5) / 30; // 5-35 range
    const tempHeight = tempFill * 180;
    r.rect(330, 290 - tempHeight, 40, tempHeight, { fill: this.temperature > 20 ? '#ef4444' : '#3b82f6' });
    r.text(350, 320, `${this.temperature}C`, { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Data panels
    r.roundRect(40, 400, 150, 50, 8, { fill: 'rgba(15, 23, 42, 0.8)' });
    r.text(115, 420, 'Bubble Size', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(115, 440, `${(bubbleSize * 100).toFixed(0)}%`, { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(210, 400, 150, 50, 8, { fill: 'rgba(15, 23, 42, 0.8)' });
    r.text(285, 420, 'Buoyancy', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(285, 440, netForce > 0 ? 'Rising' : 'Sinking', { fill: netForce > 0 ? '#22c55e' : '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Temperature slider
    r.addSlider({
      id: 'temperature',
      label: 'Temperature (C)',
      min: 5,
      max: 35,
      step: 1,
      value: this.temperature
    });

    // Explanation
    r.roundRect(40, 520, 320, 60, 12, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 545, 'Combined Gas Law: PV/T = constant', { fill: '#a855f7', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 565, 'Cold contracts gas more than liquid!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review the Discovery', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Key Discovery: Gas vs Liquid', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Cold card
    r.roundRect(25, 85, 170, 140, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(110, 110, 'Cold Temperature', { fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 135, 'Gas contracts a LOT', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 155, 'Liquid barely contracts', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 185, 'Result: SINKS', { fill: '#3b82f6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Warm card
    r.roundRect(205, 85, 170, 140, 12, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(290, 110, 'Warm Temperature', { fill: '#ef4444', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 135, 'Gas expands a LOT', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 155, 'Liquid barely expands', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 185, 'Result: RISES', { fill: '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Real-world connection
    r.roundRect(25, 240, 350, 150, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 270, 'Real-World Impact', { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 300, 'Submarines encounter thermoclines -', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 320, 'invisible temperature layers that', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 340, 'unexpectedly change their buoyancy!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 370, 'Scuba divers face similar challenges.', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // Key takeaway
    r.roundRect(40, 410, 320, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 438, 'Gases respond much more to temperature', { fill: '#ffffff', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 460, 'changes than liquids do!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#0891b2';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.tagline, { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });

    // Description (word wrap simulation)
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
    const connText = app.connection.length > 55 ? app.connection.substring(0, 52) + '...' : app.connection;
    r.text(200, 370, connText, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 420, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
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
      r.roundRect(25, 100, 350, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      const scenarioText = question.scenario.length > 60 ? question.scenario.substring(0, 57) + '...' : question.scenario;
      r.text(200, 140, scenarioText, { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      // Question
      const questionText = question.question.length > 55 ? question.question.substring(0, 52) + '...' : question.question;
      r.text(200, 190, questionText, { fill: '#22d3ee', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 210 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(6, 182, 212, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        const optionText = option.length > 50 ? option.substring(0, 47) + '...' : option;
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${optionText}`, { fill: isSelected ? '#22d3ee' : '#e2e8f0', fontSize: 11 });

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
        r.text(200, 485, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "Excellent! You've mastered buoyancy!" : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 140, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        "Boyle's Law: PV = constant",
        "Archimedes' Principle",
        'Temperature effects on gases',
        'Real-world buoyancy control'
      ];
      concepts.forEach((concept, i) => {
        r.text(200, 340 + i * 22, concept, { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Trophy
    r.text(200, 120, '🧪', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Buoyancy Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand how pressure and', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'temperature control buoyancy!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '📐', label: "Boyle's Law: PV = k" },
      { icon: '⚖️', label: "Archimedes' Principle" },
      { icon: '🌡️', label: 'Temperature Effects' },
      { icon: '🚢', label: 'Real Applications' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 295 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 460, 300, 70, 12, { fill: 'rgba(8, 145, 178, 0.2)' });
    r.text(200, 488, 'Key Laws', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 515, 'PV = k and Fb = rho*g*V', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering the Cartesian Diver!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      pressure: this.pressure,
      temperature: this.temperature,
      diverPosition: this.diverPosition,
      diverVelocity: this.diverVelocity,
      isSqueezing: this.isSqueezing,
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
    if (state.prediction !== undefined) this.prediction = state.prediction as number | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as number | null;
    if (state.showPredictionFeedback !== undefined) this.showPredictionFeedback = state.showPredictionFeedback as boolean;
    if (state.showTwistFeedback !== undefined) this.showTwistFeedback = state.showTwistFeedback as boolean;
    if (state.pressure !== undefined) this.pressure = state.pressure as number;
    if (state.temperature !== undefined) this.temperature = state.temperature as number;
    if (state.diverPosition !== undefined) this.diverPosition = state.diverPosition as number;
    if (state.diverVelocity !== undefined) this.diverVelocity = state.diverVelocity as number;
    if (state.isSqueezing !== undefined) this.isSqueezing = state.isSqueezing as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createCartesianDiverGame(sessionId: string): CartesianDiverGame {
  return new CartesianDiverGame(sessionId);
}
