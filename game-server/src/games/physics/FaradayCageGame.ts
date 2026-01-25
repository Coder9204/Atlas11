import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// FARADAY CAGE GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Electromagnetic shielding by conducting enclosures
// Free electrons redistribute to cancel external fields inside
// Mesh holes must be smaller than wavelength for effective shielding
// Shield effectiveness: SE = 20 * log10(E_incident / E_transmitted) in dB
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
const MICROWAVE_WAVELENGTH_MM = 122; // 2.45 GHz = 122mm wavelength
const WIFI_WAVELENGTH_MM = 120; // 2.4 GHz similar
const CELL_WAVELENGTH_MM = 340; // ~900 MHz = 340mm

export class FaradayCageGame extends BaseGame {
  readonly gameType = 'faraday_cage';
  readonly gameTitle = 'Faraday Cage: The Invisible Shield';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private cageEnabled = false;
  private signalStrength = 100;
  private wavePhase = 0;
  private meshSize: 'small' | 'medium' | 'large' = 'small';
  private wavelength: 'long' | 'short' = 'long';
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
      scenario: "You put your phone inside a metal box.",
      question: "Why does a Faraday cage block electromagnetic waves?",
      options: ["It absorbs all the energy as heat", "Free electrons move to cancel the field inside", "The metal reflects all radiation like a mirror", "It converts EM waves to sound"],
      correctIndex: 1,
      explanation: "Free electrons in the conductor redistribute to cancel the external field inside."
    },
    {
      scenario: "You step into an elevator and your phone loses signal.",
      question: "Your phone loses signal in an elevator because:",
      options: ["Elevators are too high up", "The metal walls act as a Faraday cage", "The motor creates interference", "Buildings block GPS"],
      correctIndex: 1,
      explanation: "The metal elevator walls form a Faraday cage that blocks radio signals."
    },
    {
      scenario: "A microwave oven has a mesh door you can see through.",
      question: "Why does mesh work for shielding even though it has holes?",
      options: ["The holes let heat escape", "Mesh is cheaper than solid metal", "Holes smaller than the wavelength still block waves", "The holes are filled with invisible glass"],
      correctIndex: 2,
      explanation: "Waves can't 'see' holes much smaller than their wavelength - they diffract around."
    },
    {
      scenario: "The microwave mesh has ~1mm holes. Microwaves are 122mm wavelength.",
      question: "What would happen if the holes were much larger (50mm)?",
      options: ["Food would cook faster", "Microwaves could leak out and be dangerous", "The oven would be more efficient", "You couldn't see the food"],
      correctIndex: 1,
      explanation: "Large holes would let microwaves escape - holes must be << wavelength."
    },
    {
      scenario: "Lightning strikes a car with people inside.",
      question: "Why are people inside safe during a lightning strike?",
      options: ["Rubber tires insulate the car", "The metal body conducts electricity around the occupants", "Lightning can't penetrate glass", "Cars are grounded to the Earth"],
      correctIndex: 1,
      explanation: "The metal car body acts as a Faraday cage, routing current around passengers."
    },
    {
      scenario: "An engineer needs to shield sensitive electronics from radio interference.",
      question: "What determines the minimum mesh hole size for effective shielding?",
      options: ["The thickness of the wire", "The wavelength of the interference", "The conductivity of the metal", "The size of the equipment"],
      correctIndex: 1,
      explanation: "Holes must be much smaller than the wavelength to be shielded."
    },
    {
      scenario: "MRI rooms are specially shielded.",
      question: "Why do MRI rooms use Faraday cage shielding?",
      options: ["To keep the magnetic field inside", "To prevent RF signals from interfering with imaging", "To protect patients from X-rays", "To amplify the MRI signal"],
      correctIndex: 1,
      explanation: "RF shielding prevents external signals from corrupting sensitive MRI data."
    },
    {
      scenario: "WiFi (2.4 GHz) has wavelength ~120mm. Compare to microwaves (122mm).",
      question: "Would a microwave oven's mesh door also block WiFi?",
      options: ["No - WiFi is different from microwaves", "Yes - similar wavelengths, same mesh works", "Only partially - WiFi is weaker", "WiFi passes through any metal"],
      correctIndex: 1,
      explanation: "Similar wavelengths mean the same mesh effectiveness. 1mm holes block both."
    },
    {
      scenario: "An RFID-blocking wallet claims to protect credit cards.",
      question: "How do RFID-blocking wallets work?",
      options: ["They use magnets to scramble signals", "A conductive mesh blocks the radio waves", "They absorb all incoming radiation", "Special chemicals neutralize RFID"],
      correctIndex: 1,
      explanation: "Metallic mesh or foil creates a Faraday cage around the cards."
    },
    {
      scenario: "Compare: 1mm mesh vs. 10mm mesh for blocking 100mm wavelength waves.",
      question: "Which provides better shielding?",
      options: ["10mm mesh - larger wires", "1mm mesh - smaller holes relative to wavelength", "They're equal", "Neither works for that wavelength"],
      correctIndex: 1,
      explanation: "Smaller holes (1mm << 100mm) provide much better shielding than 10mm."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🍿",
      title: "Microwave Ovens",
      tagline: "Safe cooking with RF",
      description: "The mesh door keeps 2.45 GHz microwaves inside while letting visible light through. Holes are ~1mm, wavelength is 122mm!",
      connection: "Holes 120x smaller than wavelength = essentially perfect shielding."
    },
    {
      icon: "🏥",
      title: "MRI Rooms",
      tagline: "Medical imaging protection",
      description: "Entire rooms are shielded with copper mesh or solid plates. This keeps external RF out and strong MRI fields contained.",
      connection: "Multi-frequency shielding requires solid or very fine mesh construction."
    },
    {
      icon: "⚡",
      title: "EMP Protection",
      tagline: "Infrastructure defense",
      description: "Critical electronics in military and infrastructure use Faraday enclosures to survive electromagnetic pulses from nuclear events or solar flares.",
      connection: "Complete shielding requires continuous conductive enclosure with no gaps."
    },
    {
      icon: "💳",
      title: "RFID Blocking Wallets",
      tagline: "Personal security",
      description: "Metal-lined wallets and passport holders block the radio signals used to wirelessly read contactless cards, preventing wireless theft.",
      connection: "Thin metallic fabric creates portable Faraday cage for your cards."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate shielding effectiveness
  private calculateShieldingEffectiveness(meshSizeMM: number, wavelengthMM: number): number {
    const ratio = meshSizeMM / wavelengthMM;
    if (ratio < 0.01) return 99;
    if (ratio < 0.05) return 95;
    if (ratio < 0.1) return 85;
    if (ratio < 0.2) return 60;
    if (ratio < 0.5) return 30;
    return 10;
  }

  // PROTECTED: Get mesh size in mm
  private getMeshSizeMM(size: 'small' | 'medium' | 'large'): number {
    const sizes = { small: 8, medium: 20, large: 40 };
    return sizes[size];
  }

  // PROTECTED: Get wavelength in mm
  private getWavelengthMM(wave: 'long' | 'short'): number {
    return wave === 'long' ? 60 : 15;
  }

  // Get current shielding effectiveness as percentage
  private getShieldingEffectiveness(): number {
    const meshMM = this.getMeshSizeMM(this.meshSize);
    const waveMM = this.getWavelengthMM(this.wavelength);
    return this.calculateShieldingEffectiveness(meshMM, waveMM);
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
        }
        break;

      case 'play':
        if (buttonId === 'toggle_cage') {
          this.cageEnabled = !this.cageEnabled;
          this.signalStrength = this.cageEnabled ? 5 : 100;
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
        if (buttonId.startsWith('mesh_')) {
          this.meshSize = buttonId.split('_')[1] as 'small' | 'medium' | 'large';
        } else if (buttonId.startsWith('wave_')) {
          this.wavelength = buttonId.split('_')[1] as 'long' | 'short';
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

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.cageEnabled = false;
    this.signalStrength = 100;
    this.meshSize = 'small';
    this.wavelength = 'long';
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;
    this.wavePhase = (this.wavePhase + deltaTime * 2) % (Math.PI * 2);
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    r.clear('#0a0f1a');

    r.circle(100, 100, 150, { fill: 'rgba(245, 158, 11, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(251, 191, 36, 0.05)' });

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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(245, 158, 11, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle' });

    r.text(200, 130, 'The Invisible Shield', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Why does your phone lose signal in elevators?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    r.text(200, 250, '📱🛡️', { fill: '#f59e0b', fontSize: 48, textAnchor: 'middle' });

    r.roundRect(40, 300, 320, 160, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 335, 'Step into a metal elevator...', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 360, 'and your phone signal vanishes.', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 395, 'Step out, and it returns!', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 430, 'The metal box acts like a magical', { fill: '#f59e0b', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 455, 'shield against radio waves!', { fill: '#f59e0b', fontSize: 14, textAnchor: 'middle' });

    r.addButton({ id: 'discover', label: 'Discover the Secret', variant: 'primary' });

    r.setCoachMessage('Explore how metal blocks electromagnetic waves!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 100, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'Why does a metal enclosure', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 150, 'block electromagnetic waves?', { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      'Metal absorbs all the wave energy as heat',
      'Free electrons in metal move to cancel the field',
      'Metal is simply too dense for waves to pass',
      'The waves bounce back like light off a mirror'
    ];

    options.forEach((option, i) => {
      const y = 200 + i * 55;
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
        bgColor = 'rgba(245, 158, 11, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 430, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      r.text(200, 460, 'Correct! Free electrons redistribute', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 485, 'to cancel the incoming electromagnetic field!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Explore the Physics', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Faraday Cage Simulator', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Main visualization
    r.roundRect(20, 80, 360, 220, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Radio tower
    r.rect(45, 140, 10, 120, { fill: '#6b7280' });
    r.line(35, 140, 55, 100, { stroke: '#6b7280', strokeWidth: 3 });
    r.line(55, 100, 75, 140, { stroke: '#6b7280', strokeWidth: 3 });
    r.circle(55, 95, 8, { fill: '#ef4444' });
    r.text(55, 275, 'Signal', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // EM waves
    for (let i = 0; i < 5; i++) {
      const x = 90 + i * 40;
      const blocked = this.cageEnabled && x > 200;
      const opacity = blocked ? 0.2 : 1 - i * 0.15;
      const color = blocked ? '#ef4444' : '#fbbf24';

      const waveTop = 120 + Math.sin(this.wavePhase + i) * 25;
      const waveBot = 220 + Math.sin(this.wavePhase + i) * 25;

      r.line(x, waveTop - 20, x + 20, waveTop, { stroke: color, strokeWidth: 3, opacity });
      r.line(x + 20, waveTop, x + 40, waveTop - 20, { stroke: color, strokeWidth: 3, opacity });
      r.line(x, waveBot - 20, x + 20, waveBot, { stroke: color, strokeWidth: 3, opacity });
      r.line(x + 20, waveBot, x + 40, waveBot - 20, { stroke: color, strokeWidth: 3, opacity });
    }

    // Faraday cage
    if (this.cageEnabled) {
      r.roundRect(200, 100, 140, 170, 8, { fill: 'none', stroke: '#f59e0b', strokeWidth: 4 });
      // Mesh lines
      for (let i = 0; i < 7; i++) {
        r.line(210 + i * 20, 100, 210 + i * 20, 270, { stroke: '#f59e0b', strokeWidth: 1 });
      }
      for (let i = 0; i < 9; i++) {
        r.line(200, 110 + i * 18, 340, 110 + i * 18, { stroke: '#f59e0b', strokeWidth: 1 });
      }
      // Electron indicators
      for (let i = 0; i < 4; i++) {
        const ex = 203 + Math.sin(this.wavePhase * 2 + i) * 3;
        r.circle(ex, 120 + i * 40, 4, { fill: '#3b82f6' });
        r.circle(337 + Math.sin(this.wavePhase * 2 + i + Math.PI) * 3, 120 + i * 40, 4, { fill: '#3b82f6' });
      }
    }

    // Phone inside cage position
    const phoneX = 245;
    const phoneY = 150;
    r.roundRect(phoneX, phoneY, 40, 70, 6, { fill: '#374151', stroke: '#6b7280', strokeWidth: 2 });
    r.rect(phoneX + 5, phoneY + 8, 30, 45, { fill: '#1f2937' });

    // Signal bars
    for (let i = 0; i < 4; i++) {
      const barHeight = 5 + i * 4;
      const barStrength = (i + 1) * 25;
      const visible = this.signalStrength >= barStrength;
      r.rect(phoneX + 8 + i * 7, phoneY + 35 - barHeight, 5, barHeight, { fill: visible ? '#22c55e' : '#4b5563' });
    }
    r.text(phoneX + 20, phoneY + 62, this.signalStrength > 50 ? 'OK' : 'X', { fill: this.signalStrength > 50 ? '#22c55e' : '#ef4444', fontSize: 10, textAnchor: 'middle' });

    // Status displays
    r.roundRect(30, 95, 90, 40, 8, { fill: 'rgba(15, 23, 42, 0.7)' });
    r.text(75, 110, 'Inside Signal', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(75, 128, `${this.signalStrength}%`, { fill: this.signalStrength > 50 ? '#22c55e' : '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(280, 95, 90, 40, 8, { fill: 'rgba(15, 23, 42, 0.7)' });
    r.text(325, 110, 'Cage', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(325, 128, this.cageEnabled ? 'ON' : 'OFF', { fill: this.cageEnabled ? '#f59e0b' : '#6b7280', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Control button
    r.addButton({ id: 'toggle_cage', label: this.cageEnabled ? 'Disable Cage' : 'Enable Cage', variant: 'primary' });

    // Explanation
    r.roundRect(30, 340, 340, 60, 10, { fill: 'rgba(245, 158, 11, 0.2)' });
    if (this.cageEnabled) {
      r.text(200, 365, 'Signal blocked! Free electrons redistribute', { fill: '#f59e0b', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 385, 'to cancel the incoming field.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    } else {
      r.text(200, 365, 'Full signal! EM waves pass freely', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 385, 'to the phone inside.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    }

    r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'secondary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Shielding Principle', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 85, 340, 110, 12, { fill: 'rgba(245, 158, 11, 0.2)' });
    r.text(200, 110, 'How It Works', { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 135, 'When an EM wave hits a conductor,', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 155, 'it pushes free electrons around. These electrons', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 175, 'redistribute instantly to create an opposing field!', { fill: '#22d3ee', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 210, 160, 100, 10, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(110, 235, 'External Wave', { fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 260, 'Oscillating E and B fields', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });
    r.text(110, 278, 'Pushes electrons in metal', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });
    r.text(110, 296, 'Creates surface currents', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });

    r.roundRect(210, 210, 160, 100, 10, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(290, 235, 'Inside', { fill: '#10b981', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 260, 'Surface currents make', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });
    r.text(290, 278, 'opposing field', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });
    r.text(290, 296, 'Fields cancel: NET = 0!', { fill: '#22c55e', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 325, 340, 70, 12, { fill: 'rgba(147, 51, 234, 0.2)' });
    r.text(200, 350, 'Key Insight', { fill: '#a855f7', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 375, "The cage doesn't need to be solid! As long as holes", { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 393, 'are smaller than the wavelength, it still works.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'What About Mesh?', variant: 'secondary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Mesh Question', { fill: '#f59e0b', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 95, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 120, 'A Faraday cage with large holes is exposed', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 140, 'to waves with wavelength SHORTER than holes.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 160, 'What happens?', { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      "Still blocks everything - holes don't matter",
      'Blocks half the wave',
      "Waves leak through - holes are too big!",
      'Converts the wave to a different frequency'
    ];

    options.forEach((option, i) => {
      const y = 195 + i * 55;
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
        bgColor = 'rgba(245, 158, 11, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 430, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      r.text(200, 460, 'Correct! When holes are larger than', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 485, 'wavelength, waves can leak through!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See What Happens', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Mesh Size vs Wavelength', { fill: '#f59e0b', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization
    r.roundRect(20, 80, 360, 180, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Mesh grid
    const meshSizePx = this.meshSize === 'small' ? 8 : this.meshSize === 'medium' ? 16 : 28;
    r.roundRect(180, 95, 120, 150, 4, { fill: 'none', stroke: '#6b7280', strokeWidth: 2 });

    const numCells = Math.floor(120 / meshSizePx);
    for (let i = 0; i <= numCells; i++) {
      for (let j = 0; j <= Math.floor(150 / meshSizePx); j++) {
        r.rect(180 + i * meshSizePx + 2, 95 + j * meshSizePx + 2, meshSizePx - 4, meshSizePx - 4, { fill: '#0a0f1a', stroke: '#f59e0b', strokeWidth: 1 });
      }
    }

    // Incoming waves
    const wavePx = this.wavelength === 'long' ? 40 : 12;
    for (let i = 0; i < 3; i++) {
      const x = 50 + i * 35;
      const y1 = 170 - wavePx / 2;
      const y2 = 170 + wavePx / 2;
      r.line(x, y1, x + 20, y2, { stroke: '#3b82f6', strokeWidth: 3, opacity: 1 - i * 0.2 });
      r.line(x + 20, y2, x + 40, y1, { stroke: '#3b82f6', strokeWidth: 3, opacity: 1 - i * 0.2 });
    }

    // Calculate if penetrates
    const effectiveness = this.getShieldingEffectiveness();
    const penetrates = effectiveness < 50;

    // Show penetrating waves or blocked indicator
    if (penetrates) {
      const y1 = 170 - wavePx / 4;
      const y2 = 170 + wavePx / 4;
      r.line(200, y1, 240, y2, { stroke: '#ef4444', strokeWidth: 2, opacity: 0.7 });
      r.line(240, y2, 280, y1, { stroke: '#ef4444', strokeWidth: 2, opacity: 0.7 });
    } else {
      r.circle(240, 170, 20, { fill: 'rgba(34, 197, 94, 0.2)' });
      r.text(240, 175, 'OK', { fill: '#22c55e', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Labels
    r.text(100, 260, `Wave: ${this.wavelength === 'long' ? '60mm' : '15mm'}`, { fill: '#3b82f6', fontSize: 10, textAnchor: 'middle' });
    r.text(240, 260, `Mesh: ${this.getMeshSizeMM(this.meshSize)}mm holes`, { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle' });

    // Comparison stats
    r.roundRect(30, 275, 140, 55, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(100, 295, 'Hole vs Wavelength', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    const meshMM = this.getMeshSizeMM(this.meshSize);
    const waveMM = this.getWavelengthMM(this.wavelength);
    const blocked = meshMM < waveMM;
    r.text(100, 318, blocked ? 'BLOCKED' : 'LEAKS', { fill: blocked ? '#22c55e' : '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(230, 275, 140, 55, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(300, 295, 'Shielding', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    const effColor = effectiveness > 80 ? '#22c55e' : effectiveness > 40 ? '#fbbf24' : '#ef4444';
    r.text(300, 318, `${effectiveness}%`, { fill: effColor, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Controls
    r.text(200, 355, 'Mesh Hole Size:', { fill: '#f59e0b', fontSize: 12, textAnchor: 'middle' });
    const meshSizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
    meshSizes.forEach((size, i) => {
      const x = 80 + i * 80;
      const isActive = this.meshSize === size;
      r.roundRect(x, 365, 70, 32, 6, { fill: isActive ? '#f59e0b' : 'rgba(51, 65, 85, 0.5)' });
      r.text(x + 35, 385, size === 'small' ? '8mm' : size === 'medium' ? '20mm' : '40mm', { fill: isActive ? '#ffffff' : '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.addButton({ id: `mesh_${size}`, label: '', variant: 'secondary' });
    });

    r.text(200, 415, 'Wavelength:', { fill: '#3b82f6', fontSize: 12, textAnchor: 'middle' });
    const wavelengths: Array<'long' | 'short'> = ['long', 'short'];
    wavelengths.forEach((wave, i) => {
      const x = 120 + i * 80;
      const isActive = this.wavelength === wave;
      r.roundRect(x, 425, 70, 32, 6, { fill: isActive ? '#3b82f6' : 'rgba(51, 65, 85, 0.5)' });
      r.text(x + 35, 445, wave === 'long' ? '60mm' : '15mm', { fill: isActive ? '#ffffff' : '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.addButton({ id: `wave_${wave}`, label: '', variant: 'secondary' });
    });

    // Rule explanation
    const ruleColor = effectiveness > 80 ? 'rgba(34, 197, 94, 0.2)' : effectiveness > 40 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)';
    r.roundRect(30, 470, 340, 45, 10, { fill: ruleColor });
    r.text(200, 498, 'Rule: Hole size must be much smaller than wavelength', { fill: effColor, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Understand the Rule', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Wavelength Rule', { fill: '#f59e0b', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 85, 340, 100, 12, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 110, 'The Key Principle', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 135, 'EM waves can only "see" obstacles comparable', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 155, 'to their wavelength. If a hole is much smaller,', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 175, "the wave diffracts around - can't pass!", { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 200, 160, 90, 10, { fill: 'rgba(6, 182, 212, 0.2)' });
    r.text(110, 225, 'Microwave Oven', { fill: '#22d3ee', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 248, 'Microwaves: 122mm', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });
    r.text(110, 263, 'Mesh holes: 1-2mm', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });
    r.text(110, 278, 'Safe! Waves blocked', { fill: '#22c55e', fontSize: 9, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(210, 200, 160, 90, 10, { fill: 'rgba(147, 51, 234, 0.2)' });
    r.text(290, 225, 'WiFi Through Walls', { fill: '#a855f7', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 248, 'WiFi: 120mm', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });
    r.text(290, 263, 'Wall gaps: ~400mm', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });
    r.text(290, 278, 'WiFi passes through!', { fill: '#f59e0b', fontSize: 9, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 305, 340, 70, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 330, 'Real Example: Cars', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 352, 'Your car is a Faraday cage for radio waves', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 370, '(metal body), but cell signals enter through windows!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Real Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#f59e0b';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 170, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 195, app.tagline, { fill: '#f59e0b', fontSize: 11, textAnchor: 'middle' });

    const words = app.description.split(' ');
    let line = '';
    let lineY = 225;
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

    r.roundRect(40, 310, 320, 60, 10, { fill: 'rgba(245, 158, 11, 0.2)' });
    r.text(200, 335, 'Physics Connection', { fill: '#f59e0b', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 358, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 400, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    r.text(200, 440, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      r.roundRect(25, 100, 350, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 125, question.scenario.substring(0, 50), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 145, question.scenario.substring(50, 100) || '', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      r.text(200, 190, question.question, { fill: '#f59e0b', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      question.options.forEach((option, i) => {
        const y = 215 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(245, 158, 11, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 45, 8, { fill: bgColor });
        r.text(40, y + 27, `${String.fromCharCode(65 + i)}. ${option.substring(0, 45)}${option.length > 45 ? '...' : ''}`, { fill: isSelected ? '#f59e0b' : '#e2e8f0', fontSize: 11 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

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

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🛡️' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? 'Faraday Cage Master!' : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.roundRect(30, 280, 340, 120, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts:', { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 340, 'Electrons redistribute to cancel fields', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 360, 'Mesh holes << wavelength for shielding', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 380, 'Microwaves: 122mm, mesh: 1mm', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 100, '🛡️', { fontSize: 72, textAnchor: 'middle' });

    r.text(200, 180, 'Faraday Cage Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 215, "You've mastered electromagnetic", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 238, 'shielding principles!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    const concepts = [
      { icon: '⚡', label: 'Electron Motion' },
      { icon: '🔲', label: 'Mesh vs Wave' },
      { icon: '🍿', label: 'Microwave Safety' },
      { icon: '📱', label: 'Signal Blocking' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 275 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    r.roundRect(50, 440, 300, 70, 12, { fill: 'rgba(245, 158, 11, 0.2)' });
    r.text(200, 468, 'Key Rule', { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 495, 'Hole Size << Wavelength = Blocked', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering Faraday cage shielding!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      cageEnabled: this.cageEnabled,
      signalStrength: this.signalStrength,
      wavePhase: this.wavePhase,
      meshSize: this.meshSize,
      wavelength: this.wavelength,
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
    if (state.cageEnabled !== undefined) this.cageEnabled = state.cageEnabled as boolean;
    if (state.signalStrength !== undefined) this.signalStrength = state.signalStrength as number;
    if (state.wavePhase !== undefined) this.wavePhase = state.wavePhase as number;
    if (state.meshSize) this.meshSize = state.meshSize as 'small' | 'medium' | 'large';
    if (state.wavelength) this.wavelength = state.wavelength as 'long' | 'short';
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createFaradayCageGame(sessionId: string): FaradayCageGame {
  return new FaradayCageGame(sessionId);
}
