import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// CAVITATION GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Cavitation occurs when local pressure drops below vapor pressure
// Bubbles form in low-pressure zones, then collapse violently in high-pressure zones
// Collapse creates extreme temperatures (5000C+) and pressures (1000+ atm)
// Used destructively (erosion) and constructively (cleaning, medical)
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

interface Bubble {
  id: number;
  x: number;
  y: number;
  radius: number;
  growing: boolean;
  collapsing: boolean;
  collapsed: boolean;
}

// Physics constants (PROTECTED - never sent to client)
const WATER_VAPOR_PRESSURE = 2.3; // kPa at 20C
const COLLAPSE_TEMPERATURE = 5000; // Kelvin
const COLLAPSE_PRESSURE = 1000; // atm
const MANTIS_SHRIMP_SPEED = 23; // m/s
const MANTIS_SHRIMP_ACCELERATION = 10000; // g

export class CavitationGame extends BaseGame {
  readonly gameType = 'cavitation';
  readonly gameTitle = 'Cavitation: Explosive Bubbles';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Hook animation
  private hookBubbleSize = 30;
  private hookCollapsing = false;

  // Simulation parameters - propeller
  private propellerSpeed = 0;
  private propellerAngle = 0;
  private bubbles: Bubble[] = [];
  private damageLevel = 0;
  private bubbleIdCounter = 0;
  private animationTime = 0;

  // Twist - mantis shrimp
  private shrimpStrike = false;
  private showSecondBubble = false;
  private strikeTimer = 0;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "Water flows rapidly through a pipe with a constriction.",
      question: "Cavitation occurs when local pressure drops below:",
      options: [
        "Atmospheric pressure",
        "The liquid's vapor pressure",
        "Zero pressure",
        "The critical pressure"
      ],
      correctIndex: 1,
      explanation: "Cavitation occurs when pressure drops below the liquid's vapor pressure (~2.3 kPa for water at 20C), causing the liquid to 'boil' into vapor bubbles."
    },
    {
      scenario: "A cavitation bubble collapses violently against a metal surface.",
      question: "Why is cavitation damage so severe?",
      options: [
        "Bubbles are toxic",
        "Collapse creates extreme local temperatures and pressures",
        "Air corrodes metal",
        "Bubbles are radioactive"
      ],
      correctIndex: 1,
      explanation: "Bubble collapse concentrates energy into a tiny point, reaching 5000C and 1000+ atm - hot enough to pit hardened steel."
    },
    {
      scenario: "A ship propeller operates at high speed in water.",
      question: "Where do cavitation bubbles typically form on a propeller?",
      options: [
        "On the hub",
        "On the low-pressure (suction) side of blades",
        "At the tips only",
        "On the shaft"
      ],
      correctIndex: 1,
      explanation: "Fast-moving blades create low-pressure zones on their suction side. When pressure drops below vapor pressure, bubbles form."
    },
    {
      scenario: "A mantis shrimp strikes at prey with incredible speed.",
      question: "The mantis shrimp's strike creates cavitation by:",
      options: [
        "Heating the water",
        "Moving its claw so fast it creates low pressure",
        "Chemical reaction",
        "Electrical discharge"
      ],
      correctIndex: 1,
      explanation: "The shrimp's club accelerates at 10,000g, creating a vacuum wake where pressure drops below vapor pressure, forming a cavitation bubble."
    },
    {
      scenario: "Scientists observe a cavitation bubble collapsing.",
      question: "At what approximate temperature can the center of a collapsing bubble reach?",
      options: [
        "100C",
        "500C",
        "5,000C or higher",
        "Only room temperature"
      ],
      correctIndex: 2,
      explanation: "The rapid compression during collapse concentrates energy so intensely that temperatures can reach 5,000C or higher - hotter than the sun's surface!"
    },
    {
      scenario: "Light is observed emanating from collapsing bubbles.",
      question: "Sonoluminescence is:",
      options: [
        "Sound from collapsing bubbles",
        "Light emitted from collapsing bubbles",
        "Ultrasound imaging",
        "Laser-induced cavitation"
      ],
      correctIndex: 1,
      explanation: "Sonoluminescence is the emission of light from collapsing bubbles. The extreme compression heats gases to plasma temperatures, causing them to glow."
    },
    {
      scenario: "An engineer is designing a pump that operates at high speed.",
      question: "To prevent cavitation in a pump, you should:",
      options: [
        "Run it faster",
        "Increase suction pressure or reduce speed",
        "Use hotter liquid",
        "Add air bubbles"
      ],
      correctIndex: 1,
      explanation: "Increasing inlet pressure or reducing speed keeps local pressure above vapor pressure, preventing cavitation."
    },
    {
      scenario: "A ship's propeller makes unusual noises at high speed.",
      question: "Why do ship propellers sometimes make a 'singing' noise?",
      options: [
        "Motor vibration only",
        "Cavitation bubble collapse creates sound",
        "Wind noise",
        "Hull resonance"
      ],
      correctIndex: 1,
      explanation: "Cavitation bubble collapse produces sharp pressure waves that create crackling or singing sounds, indicating the propeller is cavitating."
    },
    {
      scenario: "A jewelry cleaning device uses high-frequency sound waves.",
      question: "Ultrasonic cleaning uses cavitation to:",
      options: [
        "Heat the water",
        "Create bubbles that scrub surfaces",
        "Dissolve dirt chemically",
        "Magnetize particles"
      ],
      correctIndex: 1,
      explanation: "Ultrasonic transducers create millions of tiny cavitation bubbles that implode against surfaces, scrubbing away contamination."
    },
    {
      scenario: "A propeller shows signs of wear after extended use.",
      question: "Cavitation damage appears as:",
      options: [
        "Rust spots",
        "Pitted, cratered surface (looks like tiny explosions)",
        "Smooth wear",
        "Color change only"
      ],
      correctIndex: 1,
      explanation: "Each bubble collapse acts like a tiny explosion, creating a pitted, cratered surface characteristic of cavitation erosion."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🚢",
      title: "Ship Propellers",
      tagline: "The destroyer of blades",
      description: "Ship propellers operating at high speeds create low-pressure zones that trigger cavitation, eroding blade surfaces over time.",
      connection: "Fast-moving blades create suction that drops pressure below water's vapor pressure, forming bubbles that collapse violently against the metal."
    },
    {
      icon: "🦐",
      title: "Mantis Shrimp",
      tagline: "Nature's weapon",
      description: "Mantis shrimp strike so fast they create cavitation bubbles. When prey survives the punch, the bubble collapse delivers a second blow!",
      connection: "The shrimp's club accelerates at 10,000g, fast enough to create a vacuum wake that forms a cavitation bubble."
    },
    {
      icon: "🧹",
      title: "Ultrasonic Cleaning",
      tagline: "Bubble scrubbing",
      description: "Ultrasonic cleaners generate millions of tiny cavitation bubbles that implode against surfaces, scrubbing away contamination.",
      connection: "High-frequency sound waves (20-40 kHz) create rapid pressure cycles that nucleate and collapse bubbles thousands of times per second."
    },
    {
      icon: "💊",
      title: "Medical Applications",
      tagline: "Therapeutic cavitation",
      description: "Controlled cavitation is used medically for lithotripsy (kidney stones), drug delivery, and tumor ablation.",
      connection: "Focused ultrasound creates cavitation at precise locations inside the body, breaking up stones or releasing drugs from microbubbles."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate pressure based on propeller speed
  private calculateLocalPressure(speed: number): number {
    // Bernoulli: higher speed = lower pressure
    const basePressure = 101.3; // kPa (1 atm)
    const pressureDrop = (speed / 100) * 100; // kPa
    return Math.max(0, basePressure - pressureDrop);
  }

  // PROTECTED: Check if cavitation occurs
  private isCavitating(speed: number): boolean {
    return this.calculateLocalPressure(speed) < WATER_VAPOR_PRESSURE;
  }

  // PROTECTED: Calculate collapse energy
  private calculateCollapseEnergy(bubbleRadius: number): number {
    // Energy proportional to bubble volume
    return (4/3) * Math.PI * Math.pow(bubbleRadius, 3) * COLLAPSE_PRESSURE;
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
      if (input.id === 'propeller_speed') {
        this.propellerSpeed = Math.max(0, Math.min(100, input.value));
      }
    }
  }

  private handleButtonClick(buttonId: string): void {
    switch (this.phase) {
      case 'hook':
        if (buttonId === 'collapse') {
          this.hookCollapsing = true;
        } else if (buttonId === 'continue' && this.hookBubbleSize <= 0) {
          this.phase = 'predict';
          this.hookBubbleSize = 30;
          this.hookCollapsing = false;
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
        if (buttonId === 'reset') {
          this.damageLevel = 0;
          this.bubbles = [];
        } else if (buttonId === 'continue' && this.damageLevel > 30) {
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
        if (buttonId === 'strike') {
          this.triggerShrimpStrike();
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
        } else if (buttonId === 'next_app' && this.activeAppIndex < 3) {
          this.completedApps.add(this.activeAppIndex);
          this.activeAppIndex++;
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

  private triggerShrimpStrike(): void {
    if (this.shrimpStrike) return;
    this.shrimpStrike = true;
    this.strikeTimer = 0;
  }

  processInput(input: UserInput, config: SessionConfig): void {
    this.handleInput(input);
  }

  private resetSimulation(): void {
    this.propellerSpeed = 0;
    this.propellerAngle = 0;
    this.bubbles = [];
    this.damageLevel = 0;
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.hookBubbleSize = 30;
    this.hookCollapsing = false;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
    this.resetSimulation();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Hook bubble collapse animation
    if (this.phase === 'hook' && this.hookCollapsing) {
      this.hookBubbleSize *= 0.85;
      if (this.hookBubbleSize < 2) {
        this.hookBubbleSize = 0;
      }
    }

    // Propeller simulation
    if (this.phase === 'play' && this.propellerSpeed > 0) {
      this.propellerAngle = (this.propellerAngle + this.propellerSpeed * deltaTime * 10) % 360;

      // Generate cavitation bubbles at high speed
      if (this.propellerSpeed > 50 && Math.random() < this.propellerSpeed / 200) {
        const angle = Math.random() * 360 * Math.PI / 180;
        const radius = 50 + Math.random() * 30;
        this.bubbles.push({
          id: this.bubbleIdCounter++,
          x: 200 + radius * Math.cos(angle),
          y: 150 + radius * Math.sin(angle),
          radius: 3 + Math.random() * 5,
          growing: true,
          collapsing: false,
          collapsed: false
        });

        // Limit bubbles
        if (this.bubbles.length > 30) {
          this.bubbles = this.bubbles.slice(-30);
        }
      }

      // Animate bubbles
      this.bubbles = this.bubbles.map(b => {
        if (b.collapsed) return b;

        if (b.growing) {
          const newRadius = b.radius + 0.3;
          if (newRadius > 12) {
            return { ...b, growing: false, collapsing: true };
          }
          return { ...b, radius: newRadius };
        }

        if (b.collapsing) {
          const newRadius = b.radius * 0.8;
          if (newRadius < 1) {
            if (this.propellerSpeed > 70) {
              this.damageLevel = Math.min(100, this.damageLevel + 0.5);
            }
            return { ...b, radius: 0, collapsed: true };
          }
          return { ...b, radius: newRadius };
        }

        return b;
      }).filter(b => !b.collapsed || Math.random() > 0.1);
    }

    // Mantis shrimp strike animation
    if (this.phase === 'twist_play' && this.shrimpStrike) {
      this.strikeTimer += deltaTime;

      if (this.strikeTimer > 0.2 && !this.showSecondBubble) {
        this.showSecondBubble = true;
      }

      if (this.strikeTimer > 1.5) {
        this.shrimpStrike = false;
        this.showSecondBubble = false;
        this.strikeTimer = 0;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0f0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(59, 130, 246, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(139, 92, 246, 0.05)' });

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
    r.roundRect(130, 50, 140, 30, 8, { fill: 'rgba(59, 130, 246, 0.1)' });
    r.text(200, 70, 'PHYSICS EXPLORATION', { fill: '#60a5fa', fontSize: 10, textAnchor: 'middle' });

    r.text(200, 120, 'Explosive Bubbles', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 150, 'When water boils... and implodes', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Bubble visualization
    r.roundRect(50, 180, 300, 200, 16, { fill: 'rgba(26, 58, 92, 0.8)' });

    if (this.hookBubbleSize > 0) {
      // Growing/stable bubble
      r.circle(200, 280, this.hookBubbleSize, { fill: 'rgba(96, 165, 250, 0.4)' });
      r.circle(200, 280, this.hookBubbleSize * 0.7, { fill: 'rgba(96, 165, 250, 0.6)' });
      r.ellipse(190, 270, this.hookBubbleSize * 0.2, this.hookBubbleSize * 0.15, { fill: 'rgba(255, 255, 255, 0.5)' });

      r.text(200, 370, 'Vapor bubble (low pressure zone)', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    } else {
      // Collapsed - show shockwave
      r.circle(200, 280, 5, { fill: '#f97316' });
      r.circle(200, 280, 20, { fill: 'none', stroke: '#f97316', strokeWidth: 2 });
      r.circle(200, 280, 35, { fill: 'none', stroke: '#f97316', strokeWidth: 1 });
      r.text(200, 340, '5,000C!', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Explanation
    r.roundRect(40, 400, 320, 100, 12, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 430, 'Inside that collapse:', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 455, 'Temperatures hotter than the', { fill: '#f97316', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 478, 'surface of the sun!', { fill: '#f97316', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    if (this.hookBubbleSize > 0) {
      r.addButton({ id: 'collapse', label: 'Collapse Bubble', variant: 'primary' });
    } else {
      r.addButton({ id: 'continue', label: 'Discover More', variant: 'primary' });
    }

    r.setCoachMessage('Watch what happens when a cavitation bubble collapses!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 100, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'A vapor bubble collapses in less than', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'a microsecond. Energy concentrates...', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 178, 'What extreme condition is created?', { fill: '#60a5fa', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      'Extreme cold - expansion absorbs heat',
      'Extreme heat - 5000C+ from compression',
      'Perfect vacuum - all matter expelled',
      'Nothing special - just water'
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 60;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (i === 1) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.prediction) {
        bgColor = 'rgba(59, 130, 246, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      const displayText = option.length > 40 ? option.substring(0, 37) + '...' : option;
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${displayText}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 470, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 1 ? 'Exactly right!' : 'Surprising answer!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 525, 'Collapse creates 5,000C and 1,000 atm -', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 545, 'hot enough to emit light!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See Propeller Cavitation', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Propeller Cavitation', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Water background
    r.roundRect(25, 80, 350, 250, 12, { fill: 'rgba(26, 58, 92, 0.8)' });

    // Propeller hub
    const cx = 200, cy = 180;
    r.circle(cx, cy, 20, { fill: '#666666' });

    // Propeller blades (rotating)
    for (let i = 0; i < 3; i++) {
      const bladeAngle = (this.propellerAngle + i * 120) * Math.PI / 180;
      const bx = cx + 60 * Math.cos(bladeAngle);
      const by = cy + 60 * Math.sin(bladeAngle);
      r.ellipse(bx, by, 25, 10, { fill: '#888888' });

      // Low pressure zone indicator
      if (this.propellerSpeed > 30) {
        const opacity = this.propellerSpeed / 200;
        r.ellipse(bx + 10 * Math.cos(bladeAngle + 0.5), by + 10 * Math.sin(bladeAngle + 0.5), 15, 8, { fill: `rgba(96, 165, 250, ${opacity})` });
      }
    }

    // Cavitation bubbles
    this.bubbles.forEach(b => {
      const color = b.collapsing ? '#f97316' : '#60a5fa';
      r.circle(b.x, b.y, b.radius, { fill: color, opacity: b.collapsing ? 0.8 : 0.5 });
    });

    // Speed indicator
    r.text(60, 100, `Speed: ${this.propellerSpeed} RPM`, { fill: '#ffffff', fontSize: 12 });

    // Cavitation status
    const statusColor = this.propellerSpeed < 30 ? '#22c55e' : this.propellerSpeed < 70 ? '#fbbf24' : '#ef4444';
    const statusText = this.propellerSpeed < 30 ? 'No cavitation' : this.propellerSpeed < 70 ? 'Minor cavitation' : 'Severe cavitation!';
    r.text(60, 310, statusText, { fill: statusColor, fontSize: 11 });

    // Damage indicator
    if (this.damageLevel > 0) {
      r.roundRect(280, 90, 80, 20, 4, { fill: '#333333' });
      r.rect(280, 90, this.damageLevel * 0.8, 20, { fill: '#ef4444' });
      r.text(320, 104, `${this.damageLevel.toFixed(0)}%`, { fill: '#ffffff', fontSize: 9, textAnchor: 'middle' });
    }

    // Slider
    r.addSlider({
      id: 'propeller_speed',
      label: 'Propeller Speed',
      min: 0,
      max: 100,
      step: 5,
      value: this.propellerSpeed
    });

    // Physics explanation
    r.roundRect(40, 390, 320, 70, 10, { fill: 'rgba(96, 165, 250, 0.1)' });
    r.text(200, 415, 'Where cavitation occurs:', { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 440, 'Fast blades create low-pressure zones.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'reset', label: 'Reset Damage', variant: 'secondary' });

    if (this.damageLevel > 30) {
      r.addButton({ id: 'continue', label: 'Review Physics', variant: 'primary' });
    }
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'Cavitation Physics', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    const steps = [
      { title: '1. Bubble Formation', text: 'Pressure drops below vapor pressure (~2.3 kPa)', color: '#60a5fa', icon: 'O' },
      { title: '2. Bubble Growth', text: 'Bubbles expand in low-pressure zone', color: '#22d3ee', icon: 'o' },
      { title: '3. Violent Collapse', text: 'Bubbles collapse in microseconds', color: '#fbbf24', icon: '*' },
      { title: '4. Extreme Conditions', text: '~5,000C, ~1,000 atm at center', color: '#f97316', icon: '!' }
    ];

    steps.forEach((step, i) => {
      const y = 90 + i * 85;
      r.roundRect(30, y, 340, 75, 12, { fill: `${step.color}15` });
      r.rect(30, y, 4, 75, { fill: step.color });
      r.text(55, y + 25, step.title, { fill: step.color, fontSize: 13, fontWeight: 'bold' });
      r.text(55, y + 50, step.text, { fill: '#94a3b8', fontSize: 11 });
    });

    // Sonoluminescence note
    r.roundRect(30, 440, 340, 80, 12, { fill: 'rgba(251, 191, 36, 0.15)' });
    r.text(200, 465, 'Sonoluminescence: Light from Sound', { fill: '#fbbf24', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 490, 'Some collapsing bubbles emit brief flashes', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 508, 'of light from plasma temperatures!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Discover Nature\'s Weapon', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'The Twist: Mantis Shrimp', { fill: '#10b981', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 90, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 115, 'The mantis shrimp punches at 23 m/s', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 140, '(acceleration: 10,000g) - creating a', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 165, 'cavitation bubble!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 185, 'If the punch misses, what does the bubble do?', { fill: '#10b981', fontSize: 13, textAnchor: 'middle' });

    const options = [
      'Nothing - bubbles are harmless',
      'Delivers a SECOND strike!',
      'Creates a defensive shield',
      'Just makes noise to distract'
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 55;
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
        bgColor = 'rgba(16, 185, 129, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 440, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 1 ? 'Exactly!' : 'The bubble collapse is a second strike!';
      r.text(200, 470, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 495, 'The mantis shrimp evolved to weaponize', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 515, 'cavitation - a "phantom punch"!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Watch the Strike', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Mantis Shrimp Strike', { fill: '#10b981', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Water background
    r.roundRect(25, 80, 350, 220, 12, { fill: 'rgba(26, 58, 92, 0.8)' });

    // Mantis shrimp
    const shrimpX = this.shrimpStrike ? 150 : 80;

    // Body
    r.ellipse(shrimpX - 30, 180, 40, 20, { fill: '#ff6b6b' });
    // Eye
    r.circle(shrimpX - 50, 165, 8, { fill: '#333333' });
    r.circle(shrimpX - 50, 165, 4, { fill: '#00ff00' });
    // Club/claw
    const clawX = this.shrimpStrike ? shrimpX + 50 : shrimpX;
    r.polygon([[clawX, 170], [clawX + 50, 165], [clawX + 55, 180], [clawX + 50, 195], [clawX, 190]], { fill: '#ff8888' });

    // Prey (snail)
    r.ellipse(280, 180, 35, 30, { fill: '#8b7355' });
    r.ellipse(280, 180, 35, 30, { fill: 'none', stroke: '#5c4a37', strokeWidth: 3 });

    // First impact
    if (this.shrimpStrike && !this.showSecondBubble) {
      r.circle(210, 180, 15, { fill: 'rgba(251, 191, 36, 0.6)' });
      r.text(210, 155, 'PUNCH!', { fill: '#fbbf24', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Cavitation bubble collapse
    if (this.showSecondBubble) {
      r.circle(230, 180, 5, { fill: '#f97316' });
      r.circle(230, 180, 20, { fill: 'none', stroke: '#f97316', strokeWidth: 2 });
      r.circle(230, 180, 35, { fill: 'none', stroke: '#f97316', strokeWidth: 1 });
      r.text(230, 145, 'CAVITATION!', { fill: '#f97316', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(300, 180, 'CRACK!', { fill: '#ef4444', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Speed indicator
    if (this.shrimpStrike) {
      r.text(150, 130, '23 m/s - 10,000g', { fill: '#fbbf24', fontSize: 12 });
    }

    // Labels
    r.text(70, 240, 'Mantis Shrimp', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(280, 240, 'Prey', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Explanation
    r.roundRect(30, 320, 340, 90, 12, { fill: 'rgba(16, 185, 129, 0.15)' });
    r.text(200, 345, 'Double Impact Weapon:', { fill: '#10b981', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 370, '1. Physical punch at 23 m/s', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 390, '2. Cavitation bubble collapse delivers second blow!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'strike', label: this.shrimpStrike ? 'Striking...' : 'Trigger Strike!', variant: 'primary', disabled: this.shrimpStrike });
    r.addButton({ id: 'continue', label: 'Continue', variant: 'secondary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Biomimetic Inspiration', { fill: '#10b981', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Mantis shrimp advantages
    r.roundRect(30, 85, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 110, 'The Mantis Shrimp\'s Advantages', { fill: '#ef4444', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 135, 'Fastest punch in the animal kingdom (23 m/s).', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 155, 'Even if it misses, cavitation stuns prey.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 175, 'Its club resists its own impact force!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Research applications
    r.roundRect(30, 200, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 225, 'Research Applications', { fill: '#60a5fa', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 250, 'Scientists study mantis shrimp to develop:', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 270, 'Impact-resistant armor, underwater weapons,', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 285, 'and extreme-stress materials.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Pistol shrimp
    r.roundRect(30, 305, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 330, 'Pistol Shrimp: The Sound Maker', { fill: '#22c55e', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 355, 'Creates cavitation with claw snap -', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 375, '210 decibel shockwave! So loud it', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 390, 'interferes with submarine sonar.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Cavitation Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
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

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.tagline, { fill: '#60a5fa', fontSize: 11, textAnchor: 'middle' });

    // Description
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
    r.roundRect(40, 320, 320, 70, 10, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 345, 'Physics Connection', { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    const connText = app.connection.length > 55 ? app.connection.substring(0, 52) + '...' : app.connection;
    r.text(200, 370, connText, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark understood / next app
    if (!this.completedApps.has(this.activeAppIndex)) {
      if (this.activeAppIndex < 3) {
        r.addButton({ id: 'next_app', label: `Next: ${this.transferApps[this.activeAppIndex + 1].icon}`, variant: 'secondary' });
      } else {
        r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
      }
    } else {
      r.text(200, 420, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 460, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Knowledge Check', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Scenario
      r.roundRect(25, 100, 350, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      const scenarioText = question.scenario.length > 60 ? question.scenario.substring(0, 57) + '...' : question.scenario;
      r.text(200, 140, scenarioText, { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      // Question
      const questionText = question.question.length > 55 ? question.question.substring(0, 52) + '...' : question.question;
      r.text(200, 190, questionText, { fill: '#60a5fa', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 210 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        const optionText = option.length > 50 ? option.substring(0, 47) + '...' : option;
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${optionText}`, { fill: isSelected ? '#60a5fa' : '#e2e8f0', fontSize: 11 });

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
        r.text(200, 485, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? 'Cavitation Expert!' : 'Keep studying bubble physics!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 140, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts:', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'Vapor pressure threshold',
        'Violent collapse physics',
        'Extreme temperatures (5000C+)',
        'Natural & industrial applications'
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
    r.text(200, 120, '💥🎓', { fontSize: 64, textAnchor: 'middle' });

    r.text(200, 200, 'Cavitation Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand the explosive physics', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'of collapsing bubbles!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: 'O', label: 'Vapor Pressure' },
      { icon: '💥', label: 'Violent Collapse' },
      { icon: '🦐', label: "Nature's Weapon" }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + i * 110;
      r.roundRect(x, 290, 100, 70, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 50, 320, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 50, 350, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 380, 300, 70, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 408, 'Key Insight', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 435, 'P_local < P_vapor -> Cavitation', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('You now understand one of fluid dynamics\' most violent phenomena!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      hookBubbleSize: this.hookBubbleSize,
      hookCollapsing: this.hookCollapsing,
      propellerSpeed: this.propellerSpeed,
      propellerAngle: this.propellerAngle,
      damageLevel: this.damageLevel,
      animationTime: this.animationTime,
      shrimpStrike: this.shrimpStrike,
      showSecondBubble: this.showSecondBubble,
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
    if (state.hookBubbleSize !== undefined) this.hookBubbleSize = state.hookBubbleSize as number;
    if (state.hookCollapsing !== undefined) this.hookCollapsing = state.hookCollapsing as boolean;
    if (state.propellerSpeed !== undefined) this.propellerSpeed = state.propellerSpeed as number;
    if (state.propellerAngle !== undefined) this.propellerAngle = state.propellerAngle as number;
    if (state.damageLevel !== undefined) this.damageLevel = state.damageLevel as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.shrimpStrike !== undefined) this.shrimpStrike = state.shrimpStrike as boolean;
    if (state.showSecondBubble !== undefined) this.showSecondBubble = state.showSecondBubble as boolean;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createCavitationGame(sessionId: string): CavitationGame {
  return new CavitationGame(sessionId);
}
