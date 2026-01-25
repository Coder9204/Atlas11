import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// PHONE SEISMOMETER GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: MEMS accelerometer detection of seismic waves
// F = ma: Proof mass deflection proportional to acceleration
// Capacitance change: C = epsilon * A / d (distance change detection)
// Seismic wave propagation and distributed sensor networks
// ============================================================================

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number; // PROTECTED: Never sent to client
  explanation: string;
}

interface TransferApp {
  icon: string;
  title: string;
  description: string;
  connection: string;
}

export class PhoneSeismometerGame extends BaseGame {
  readonly gameType = 'phone_seismometer';
  readonly gameTitle = 'Phone Seismometer';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private vibrationSource: 'none' | 'footstep' | 'door' | 'earthquake' = 'none';
  private signalHistory: number[] = Array(100).fill(0);
  private massPosition = 0;
  private isRecording = true;
  private animationTime = 0;

  // Twist state - distributed network
  private phoneCount = 1;
  private earthquakeStrength = 0;
  private earthquakeActive = false;
  private phoneDetections: boolean[] = [false];

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // PROTECTED: Test questions with correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      question: "How does a MEMS accelerometer in your phone detect motion?",
      options: [
        "Using GPS signals from satellites",
        "A tiny mass on springs moves relative to the chip, changing capacitance",
        "It senses air pressure changes from movement",
        "Magnetic fields interact with phone motion"
      ],
      correctIndex: 1,
      explanation: "MEMS accelerometers use a microscopic proof mass on silicon springs. When the phone accelerates, the mass moves, changing the capacitance between electrodes."
    },
    {
      question: "Why can your phone detect an earthquake even though it's not a scientific seismometer?",
      options: [
        "Phones are more sensitive than real seismometers",
        "Earthquakes create vibrations that accelerometers can measure",
        "Phones connect to earthquake warning systems via internet",
        "Only special earthquake apps can detect quakes"
      ],
      correctIndex: 1,
      explanation: "MEMS accelerometers are sensitive enough to detect the ground vibrations from earthquakes, even though they're primarily designed for screen rotation and gaming."
    },
    {
      question: "What does the accelerometer actually measure?",
      options: [
        "Speed (velocity)",
        "Position (location)",
        "Acceleration (rate of velocity change)",
        "Distance traveled"
      ],
      correctIndex: 2,
      explanation: "Accelerometers measure acceleration - the rate of change of velocity. From this, velocity and position can be calculated through integration."
    },
    {
      question: "Why do many phones together make better earthquake detectors than one?",
      options: [
        "They share battery power",
        "Distributed sensors provide location triangulation and noise averaging",
        "More phones means louder sound detection",
        "They boost each other's signals"
      ],
      correctIndex: 1,
      explanation: "Multiple phones allow triangulation of the earthquake's epicenter and help distinguish real earthquakes from false alarms (like dropping a phone)."
    },
    {
      question: "What principle allows the proof mass to detect acceleration?",
      options: [
        "Conservation of energy",
        "Newton's First Law - inertia causes mass to resist acceleration",
        "Coulomb's law of electric charge",
        "Wave interference patterns"
      ],
      correctIndex: 1,
      explanation: "Inertia (Newton's First Law) causes the proof mass to 'lag behind' when the chip accelerates, creating a measurable displacement."
    },
    {
      question: "What is the typical sensitivity of a phone accelerometer?",
      options: [
        "About 0.001g (1/1000th of Earth's gravity)",
        "About 0.1g (1/10th of gravity)",
        "About 1g (Earth's gravity)",
        "About 10g (ten times gravity)"
      ],
      correctIndex: 0,
      explanation: "Modern MEMS accelerometers can detect accelerations as small as 0.001g, making them sensitive enough for seismic detection."
    },
    {
      question: "How does a distributed phone network provide early earthquake warning?",
      options: [
        "Phones predict earthquakes before they happen",
        "Phones near the epicenter detect shaking first and alert phones farther away",
        "The network strengthens individual sensor signals",
        "GPS triangulation predicts wave arrival"
      ],
      correctIndex: 1,
      explanation: "Seismic waves take time to travel. Phones near the epicenter detect shaking seconds before it reaches phones farther away, enabling early warning."
    },
    {
      question: "What physical quantity changes when the proof mass moves?",
      options: [
        "Resistance between electrodes",
        "Capacitance between the mass and fixed electrodes",
        "Inductance of coils",
        "Temperature of the sensor"
      ],
      correctIndex: 1,
      explanation: "Capacitance C = epsilon * A / d changes as the gap 'd' between the proof mass and fixed electrodes changes with acceleration."
    },
    {
      question: "Why does the accelerometer measure 1g when the phone is stationary?",
      options: [
        "It's calibration error",
        "It detects Earth's gravitational acceleration",
        "Background electrical noise",
        "Quantum effects at small scales"
      ],
      correctIndex: 1,
      explanation: "Even when stationary, the phone experiences Earth's gravitational acceleration (9.8 m/s^2 = 1g). This is how the phone knows which way is 'down' for screen rotation."
    },
    {
      question: "What is the MyShake app's primary innovation?",
      options: [
        "More sensitive sensors than professional equipment",
        "Turning millions of smartphones into a distributed seismic network",
        "Predicting earthquakes days in advance",
        "Measuring earthquake depth precisely"
      ],
      correctIndex: 1,
      explanation: "MyShake uses crowdsourced phone data to create a massive distributed seismic network, providing broader coverage than traditional seismometer networks."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "📱",
      title: "MyShake App",
      description: "Turns millions of phones into a distributed earthquake early warning network! Phones detect P-waves and alert users before damaging S-waves arrive.",
      connection: "Crowdsourced MEMS sensors provide dense coverage that traditional seismometer networks cannot match."
    },
    {
      icon: "👟",
      title: "Step Counting",
      description: "Pedometers use accelerometer patterns to detect walking, running, and climbing stairs. Each step creates a characteristic acceleration signature.",
      connection: "Pattern recognition algorithms identify the periodic acceleration spikes from footfall impacts."
    },
    {
      icon: "🔄",
      title: "Screen Rotation",
      description: "Accelerometer detects gravity direction to know which way is 'down' for your display. This works because gravity causes constant 1g acceleration.",
      connection: "The accelerometer measures the gravity vector component on each axis to determine phone orientation."
    },
    {
      icon: "🚗",
      title: "Crash Detection",
      description: "Sudden high-G deceleration triggers automatic emergency calls in modern phones and cars. Impacts create distinctive acceleration signatures.",
      connection: "Crash detection uses threshold crossing and impact duration analysis to distinguish crashes from normal use."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Generate vibration signal based on source
  private getVibrationSignal(source: string, t: number): number {
    switch (source) {
      case 'footstep':
        // Periodic sharp impacts
        const footPhase = t % 1;
        return footPhase < 0.1 ? Math.sin(footPhase * Math.PI * 10) * 0.6 * Math.exp(-footPhase * 30) : 0;
      case 'door':
        // Single sharp impact that decays
        if (t < 2) {
          return Math.sin(t * 50) * Math.exp(-t * 3) * 0.8;
        }
        return 0;
      case 'earthquake':
        // Complex low frequency vibration
        return (Math.sin(t * 3) * 0.4 + Math.sin(t * 7) * 0.3 + Math.sin(t * 11) * 0.2) *
          (1 + Math.sin(t * 0.5) * 0.5);
      default:
        // Noise floor
        return (Math.random() - 0.5) * 0.05;
    }
  }

  // PROTECTED: Calculate network detection probability
  private calculateDetectionProbability(magnitude: number, phoneCount: number): number {
    const baseProb = magnitude / 10;
    const networkBonus = phoneCount > 1 ? 0.2 : 0;
    return Math.min(0.95, baseProb + networkBonus);
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
      if (input.id === 'phone_count') {
        this.phoneCount = Math.floor(input.value);
        this.phoneDetections = Array(this.phoneCount).fill(false);
      }
    }
  }

  private handleButtonClick(buttonId: string): void {
    switch (this.phase) {
      case 'hook':
        if (buttonId === 'investigate') {
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
        if (buttonId === 'source_none') {
          this.vibrationSource = 'none';
        } else if (buttonId === 'source_footstep') {
          this.vibrationSource = 'footstep';
        } else if (buttonId === 'source_door') {
          this.vibrationSource = 'door';
        } else if (buttonId === 'source_earthquake') {
          this.vibrationSource = 'earthquake';
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
          this.phoneCount = 1;
          this.phoneDetections = [false];
        }
        break;

      case 'twist_play':
        if (buttonId === 'trigger_earthquake') {
          this.earthquakeStrength = 4 + Math.random() * 3;
          this.earthquakeActive = true;
          // Simulate detection across network
          const detectionProb = this.calculateDetectionProbability(this.earthquakeStrength, this.phoneCount);
          this.phoneDetections = Array(this.phoneCount).fill(false).map(() =>
            Math.random() < detectionProb
          );
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

  private resetSimulation(): void {
    this.vibrationSource = 'none';
    this.signalHistory = Array(100).fill(0);
    this.massPosition = 0;
    this.isRecording = true;
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
    this.resetSimulation();
    this.phoneCount = 1;
    this.earthquakeStrength = 0;
    this.earthquakeActive = false;
    this.phoneDetections = [false];
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Update signal history
    if (this.phase === 'play' && this.isRecording) {
      const signal = this.getVibrationSignal(this.vibrationSource, this.animationTime);
      this.massPosition = signal * 30;
      this.signalHistory = [...this.signalHistory.slice(1), signal];
    }

    // Earthquake decay
    if (this.earthquakeActive) {
      this.earthquakeStrength *= 0.99;
      if (this.earthquakeStrength < 0.5) {
        this.earthquakeActive = false;
        this.earthquakeStrength = 0;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(16, 185, 129, 0.05)' });
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
    r.roundRect(125, 60, 150, 30, 8, { fill: 'rgba(16, 185, 129, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#34d399', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'Your Phone is a Seismometer!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Discover the motion sensors in your pocket', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    // Phone + earthquake icon
    r.text(200, 250, '📱🌋', { fontSize: 56, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 300, 320, 180, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 335, 'That chip that rotates your screen?', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 365, "It's a vibration sensor sensitive enough", { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 390, 'to detect earthquakes, footsteps,', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 415, 'even your heartbeat through a table!', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 460, 'How does a tiny chip detect motion?', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'investigate', label: 'Investigate', variant: 'primary' });

    r.setCoachMessage('Explore how MEMS accelerometers work!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 100, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, "Your phone detects tilt and shake.", { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 155, "What's inside the accelerometer chip?", { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      "A tiny mass on springs that changes capacitance",
      "A fluid that sloshes around in the chip",
      "A spinning disk that resists rotation",
      "Magnets that sense magnetic field changes"
    ];

    options.forEach((option, i) => {
      const y = 195 + i * 65;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (i === 0) {
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.prediction) {
        bgColor = 'rgba(16, 185, 129, 0.3)';
      }

      r.roundRect(30, y, 340, 55, 10, { fill: bgColor });
      r.text(50, y + 32, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 470, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 0 ? 'Exactly right!' : 'A proof mass on springs!';
      r.text(200, 500, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 528, "Mass movement changes capacitance between electrodes.", { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See It Work', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 45, 'MEMS Accelerometer', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // MEMS chip diagram
    r.roundRect(30, 70, 150, 120, 12, { fill: 'rgba(30, 41, 59, 0.6)' });
    r.text(105, 90, 'Inside Your Phone', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Chip housing
    r.roundRect(45, 100, 120, 70, 5, { fill: '#1f2937' });

    // Fixed frame
    r.roundRect(55, 110, 100, 50, 3, { fill: '#374151' });

    // Springs (simplified)
    r.line(70, 135, 85, 135, { stroke: '#60a5fa', strokeWidth: 2 });
    r.line(115, 135, 130, 135, { stroke: '#60a5fa', strokeWidth: 2 });

    // Proof mass (moves with acceleration)
    const massX = 90 + this.massPosition;
    r.roundRect(massX, 120, 20, 30, 2, { fill: '#f59e0b' });

    // Capacitor plates
    r.rect(75, 118, 3, 34, { fill: '#22c55e' });
    r.rect(122, 118, 3, 34, { fill: '#22c55e' });

    // Signal graph
    r.roundRect(200, 70, 170, 120, 12, { fill: 'rgba(30, 41, 59, 0.6)' });
    r.text(285, 90, 'Accelerometer Signal', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Graph background
    r.roundRect(210, 100, 150, 80, 4, { fill: '#0f172a' });

    // Zero line
    r.line(210, 140, 360, 140, { stroke: '#4b5563', strokeWidth: 1 });

    // Signal trace
    const signalPath = this.signalHistory.map((v, i) => {
      const x = 210 + (i / 100) * 150;
      const y = 140 - v * 35;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    r.path(signalPath, { stroke: '#22c55e', strokeWidth: 2, fill: 'none' });

    // Vibration source buttons
    r.text(200, 215, 'Select Vibration Source:', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    const sources = [
      { id: 'source_none', label: 'None', active: this.vibrationSource === 'none' },
      { id: 'source_footstep', label: 'Footsteps', active: this.vibrationSource === 'footstep' },
      { id: 'source_door', label: 'Door', active: this.vibrationSource === 'door' },
      { id: 'source_earthquake', label: 'Earthquake', active: this.vibrationSource === 'earthquake' }
    ];

    sources.forEach((source, i) => {
      const x = 45 + i * 85;
      const bgColor = source.active ? 'rgba(16, 185, 129, 0.5)' : 'rgba(51, 65, 85, 0.5)';
      r.roundRect(x, 230, 75, 35, 8, { fill: bgColor });
      r.text(x + 37, 252, source.label, { fill: '#ffffff', fontSize: 10, textAnchor: 'middle' });
      r.addButton({ id: source.id, label: '', variant: 'secondary' });
    });

    // Explanation
    r.roundRect(30, 280, 340, 90, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 305, 'MEMS = Micro-Electro-Mechanical System', { fill: '#34d399', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 330, 'Tiny proof mass (~microgram) on silicon springs.', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 350, 'Acceleration causes mass to lag, changing capacitance.', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'primary' });

    r.setCoachMessage('Try different vibration sources and watch the signal pattern!');
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'How MEMS Accelerometers Work', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Steps
    const steps = [
      { num: 1, title: 'Proof Mass on Springs', desc: 'Tiny silicon mass suspended by microscopic springs', color: '#10b981' },
      { num: 2, title: 'Capacitive Sensing', desc: 'Mass movement changes gap to electrodes', color: '#14b8a6' },
      { num: 3, title: '3-Axis Detection', desc: 'Three masses measure X, Y, Z acceleration', color: '#06b6d4' }
    ];

    steps.forEach((step, i) => {
      const y = 90 + i * 85;
      r.roundRect(30, y, 340, 75, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.circle(60, y + 37, 18, { fill: step.color });
      r.text(60, y + 42, String(step.num), { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(90, y + 30, step.title, { fill: '#ffffff', fontSize: 13, fontWeight: 'bold' });
      r.text(90, y + 50, step.desc, { fill: '#94a3b8', fontSize: 10 });
    });

    // Newton's law
    r.roundRect(30, 355, 340, 80, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 380, "Newton's Second Law at Work", { fill: '#34d399', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 405, 'F = ma: Acceleration deflects mass against springs.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 425, 'Sensitivity: ~0.001g (1/1000th of gravity!)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Prediction result
    r.text(200, 465, `Your prediction: ${this.prediction === 0 ? 'Correct!' : 'Not quite'}`, { fill: this.prediction === 0 ? '#34d399' : '#f87171', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'But wait...', variant: 'secondary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist!', { fill: '#14b8a6', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 95, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'One phone can detect an earthquake.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 150, 'What if MILLIONS worked together?', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      "Triangulate location and reject false alarms",
      "Make the signal louder by adding them",
      "Share battery to keep sensors running",
      "No benefit - one good sensor is enough"
    ];

    options.forEach((option, i) => {
      const y = 190 + i * 60;
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
        bgColor = 'rgba(20, 184, 166, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 450, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 0 ? 'Exactly right!' : 'Distributed networks triangulate and verify!';
      r.text(200, 480, message, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 508, "Many phones distinguish real quakes from dropped phones.", { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See the Network', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Distributed Seismometer Network', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Map visualization
    r.roundRect(30, 75, 340, 200, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Region ellipse
    r.ellipse(200, 175, 140, 80, { fill: 'rgba(30, 58, 95, 0.5)', stroke: '#1e3a5f', strokeWidth: 1 });

    // Earthquake epicenter
    if (this.earthquakeActive) {
      const waveRadius = (this.animationTime * 30) % 80;
      r.circle(200, 175, waveRadius, { fill: 'none', stroke: '#ef4444', strokeWidth: 2 });
      r.circle(200, 175, 10, { fill: '#ef4444' });
      r.text(200, 150, `M${this.earthquakeStrength.toFixed(1)}`, { fill: '#f87171', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Phone icons
    for (let i = 0; i < this.phoneCount; i++) {
      const angle = (i / this.phoneCount) * Math.PI * 2;
      const radius = 50 + (i % 3) * 25;
      const x = 200 + Math.cos(angle) * radius;
      const y = 175 + Math.sin(angle) * radius * 0.6;
      const detected = this.phoneDetections[i];

      const phoneColor = detected ? '#22c55e' : '#4b5563';
      r.roundRect(x - 8, y - 12, 16, 24, 2, { fill: phoneColor });
      r.roundRect(x - 6, y - 8, 12, 16, 1, { fill: detected ? '#86efac' : '#1f2937' });

      if (detected) {
        r.circle(x, y, 18, { fill: 'none', stroke: '#22c55e', strokeWidth: 1 });
      }
    }

    // Stats panel
    r.roundRect(40, 85, 100, 60, 6, { fill: 'rgba(31, 41, 55, 0.9)' });
    r.text(50, 105, `Phones: ${this.phoneCount}`, { fill: '#e2e8f0', fontSize: 10 });
    const detectedCount = this.phoneDetections.filter(d => d).length;
    r.text(50, 125, `Detected: ${detectedCount}/${this.phoneCount}`, { fill: '#e2e8f0', fontSize: 10 });
    const confidence = this.phoneCount > 0 ? Math.round((detectedCount / this.phoneCount) * 100) : 0;
    r.text(50, 145, `Confidence: ${confidence}%`, { fill: confidence > 50 ? '#34d399' : '#fbbf24', fontSize: 10 });

    // Phone count slider
    r.text(200, 300, `Phones in Network: ${this.phoneCount}`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.addSlider({ id: 'phone_count', label: 'Phone Count', min: 1, max: 20, step: 1, value: this.phoneCount });

    // Trigger button
    r.addButton({ id: 'trigger_earthquake', label: this.earthquakeActive ? 'Detecting...' : 'Simulate Earthquake', variant: this.earthquakeActive ? 'secondary' : 'primary' });

    // Explanation
    r.roundRect(30, 370, 340, 70, 12, { fill: 'rgba(20, 184, 166, 0.2)' });
    r.text(200, 395, 'MyShake and similar apps', { fill: '#14b8a6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 420, 'turn phones into a global seismic network.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Benefits', variant: 'secondary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Crowdsourced Seismology', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    const benefits = [
      { title: 'Triangulation', desc: 'Multiple detection times calculate epicenter', color: '#10b981', icon: '📍' },
      { title: 'False Alarm Rejection', desc: 'One phone shaking != earthquake', color: '#14b8a6', icon: '🚫' },
      { title: 'Early Warning', desc: 'Near phones alert far phones BEFORE shaking', color: '#06b6d4', icon: '⏰' }
    ];

    benefits.forEach((benefit, i) => {
      const y = 90 + i * 95;
      r.roundRect(30, y, 340, 85, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(50, y + 35, benefit.icon, { fontSize: 24 });
      r.text(85, y + 30, benefit.title, { fill: benefit.color, fontSize: 13, fontWeight: 'bold' });
      r.text(85, y + 55, benefit.desc, { fill: '#94a3b8', fontSize: 10 });
    });

    // Real-world impact
    r.roundRect(30, 385, 340, 80, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 410, 'Real-World Impact', { fill: '#fbbf24', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 435, 'Millions of phones provide dense coverage', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 455, 'that traditional seismometer networks cannot match!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#10b981';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Description
    const words = app.description.split(' ');
    let line = '';
    let lineY = 210;
    words.forEach(word => {
      if ((line + word).length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else {
        line += word + ' ';
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Physics connection
    r.roundRect(40, 300, 320, 70, 10, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 325, 'Physics Connection', { fill: '#34d399', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 350, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    // Mark understood
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 400, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 440, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Question
      r.roundRect(25, 100, 350, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 140, question.question.substring(0, 55), { fill: '#e2e8f0', fontSize: 11, textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 185 + i * 55;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 48, 8, { fill: bgColor });
        r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${option.substring(0, 48)}${option.length > 48 ? '...' : ''}`, { fill: isSelected ? '#34d399' : '#e2e8f0', fontSize: 10 });

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
        r.text(200, 450, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 160, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 180, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 215, score >= 7 ? "Excellent! You understand MEMS sensors!" : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: score >= 7 ? 'Claim Mastery Badge' : 'Review & Try Again', variant: 'primary' });
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 120, '🏆', { fontSize: 64, textAnchor: 'middle' });

    r.text(200, 195, 'MEMS Sensor Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 225, 'You understand phone accelerometers!', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });

    // Achievements
    r.roundRect(40, 260, 320, 180, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 290, 'You now understand:', { fill: '#34d399', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    const achievements = [
      'MEMS accelerometers use proof mass on springs',
      'Capacitive sensing detects tiny movements',
      'Phones detect earthquakes, steps, impacts',
      'Distributed networks enable early warning'
    ];

    achievements.forEach((achievement, i) => {
      r.text(60, 320 + i * 25, `✓ ${achievement}`, { fill: '#cbd5e1', fontSize: 11 });
    });

    r.text(200, 470, 'Your pocket holds a science instrument!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering MEMS accelerometer physics!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      vibrationSource: this.vibrationSource,
      signalHistory: this.signalHistory,
      massPosition: this.massPosition,
      phoneCount: this.phoneCount,
      earthquakeStrength: this.earthquakeStrength,
      earthquakeActive: this.earthquakeActive,
      phoneDetections: this.phoneDetections,
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
    if (state.vibrationSource) this.vibrationSource = state.vibrationSource as typeof this.vibrationSource;
    if (state.signalHistory) this.signalHistory = state.signalHistory as number[];
    if (state.massPosition !== undefined) this.massPosition = state.massPosition as number;
    if (state.phoneCount !== undefined) this.phoneCount = state.phoneCount as number;
    if (state.earthquakeStrength !== undefined) this.earthquakeStrength = state.earthquakeStrength as number;
    if (state.earthquakeActive !== undefined) this.earthquakeActive = state.earthquakeActive as boolean;
    if (state.phoneDetections) this.phoneDetections = state.phoneDetections as boolean[];
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createPhoneSeismometerGame(sessionId: string): PhoneSeismometerGame {
  return new PhoneSeismometerGame(sessionId);
}
