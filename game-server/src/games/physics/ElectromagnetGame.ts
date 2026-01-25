import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// ELECTROMAGNET GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: B = μ₀ × n × I (magnetic field in a solenoid)
// Key concepts: Current creates magnetic field, iron cores amplify 1000x
// Reversing current reverses polarity, AC creates rotating fields
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
const PERMEABILITY_FREE_SPACE = 4 * Math.PI * 1e-7; // μ₀ in H/m
const IRON_CORE_MULTIPLIER = 1000; // Relative permeability of iron
const FIELD_SCALE = 0.001; // For visualization

export class ElectromagnetGame extends BaseGame {
  readonly gameType = 'electromagnet';
  readonly gameTitle = 'Electromagnets: Switchable Magnetism';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private current = 0; // Amperes (-5 to 5)
  private coilTurns = 10; // Number of turns
  private hasCore = false; // Iron core present
  private animationTime = 0;

  // Twist simulation - AC vs DC
  private isAC = false;
  private acPhase = 0;
  private twistCurrent = 3;

  // Paper clip attraction simulation
  private paperClips: { x: number; y: number; attracted: boolean }[] = [
    { x: 50, y: 150, attracted: false },
    { x: 350, y: 150, attracted: false },
    { x: 100, y: 220, attracted: false },
    { x: 300, y: 220, attracted: false }
  ];

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "You wind wire around a nail and connect it to a battery.",
      question: "What creates the magnetic field in an electromagnet?",
      options: [
        "The iron core itself",
        "Electric current flowing through the wire",
        "Static electricity buildup",
        "The battery's chemical reactions"
      ],
      correctIndex: 1,
      explanation: "Moving electric charges (current) create magnetic fields. Oersted discovered this in 1820 when a compass needle deflected near a current-carrying wire."
    },
    {
      scenario: "An electromagnet with an iron core is 1000x stronger than one without.",
      question: "Why does an iron core strengthen an electromagnet?",
      options: [
        "Iron is heavier, adding mass",
        "Iron conducts electricity better",
        "Iron's atomic magnets align with the field, amplifying it",
        "Iron generates its own independent field"
      ],
      correctIndex: 2,
      explanation: "Iron is ferromagnetic - its atomic magnetic domains align with the external field, adding their fields to the coil's field. This is called magnetic amplification."
    },
    {
      scenario: "You reverse the connections on your electromagnet's battery.",
      question: "What happens to the magnetic field?",
      options: [
        "The field disappears entirely",
        "The field doubles in strength",
        "The field stays exactly the same",
        "The north and south poles swap positions"
      ],
      correctIndex: 3,
      explanation: "Reversing current reverses the magnetic field direction. North becomes South and vice versa. The right-hand rule determines polarity from current direction."
    },
    {
      scenario: "You want to make your electromagnet stronger.",
      question: "Which change will NOT increase field strength?",
      options: [
        "Increase the current",
        "Add more coil turns",
        "Add an iron core",
        "Use thinner wire"
      ],
      correctIndex: 3,
      explanation: "B = μ₀nI. More current (I) or more turns per length (n) increases field. Iron increases μ. Thinner wire might limit current due to resistance!"
    },
    {
      scenario: "The formula for electromagnet field strength is B = μ₀ × n × I.",
      question: "If you double both the current AND the number of turns, the field becomes:",
      options: [
        "2× stronger",
        "3× stronger",
        "4× stronger",
        "The same strength"
      ],
      correctIndex: 2,
      explanation: "B = μ₀ × n × I. If both n and I double: B = μ₀ × (2n) × (2I) = 4 × μ₀nI. The field is 4× stronger!"
    },
    {
      scenario: "You connect an electromagnet to an AC (alternating current) power source.",
      question: "What happens to the magnetic field?",
      options: [
        "It stays constant",
        "It disappears",
        "It rapidly switches north-south polarity",
        "It becomes circular"
      ],
      correctIndex: 2,
      explanation: "AC current alternates direction, so the magnetic field polarity alternates too. In the US, this happens 60 times per second (60 Hz)!"
    },
    {
      scenario: "An electric motor needs to spin continuously.",
      question: "How do AC motors use alternating magnetic fields?",
      options: [
        "They don't - motors only use DC",
        "The changing field creates a 'rotating' magnetic force",
        "AC prevents the motor from overheating",
        "The alternation provides better sparks"
      ],
      correctIndex: 1,
      explanation: "By using multiple coils with phase-shifted AC currents, a rotating magnetic field is created. This 'pulls' the rotor around in a circle - pure electromagnetic rotation!"
    },
    {
      scenario: "MRI machines use superconducting electromagnets.",
      question: "Why are MRI magnets so powerful (1.5-7 Tesla)?",
      options: [
        "They use radioactive materials",
        "Superconductors carry huge currents with zero resistance",
        "MRI magnets are permanent magnets",
        "They use special magnetic metals"
      ],
      correctIndex: 1,
      explanation: "Superconducting wire at near-absolute-zero has zero electrical resistance, allowing enormous currents to flow. More current = stronger field (B = μ₀nI)."
    },
    {
      scenario: "Scrapyard electromagnets lift heavy cars and metal debris.",
      question: "What happens when the operator turns off the power?",
      options: [
        "The car stays attached by residual magnetism",
        "The magnetic field vanishes and the car falls",
        "The polarity reverses",
        "Nothing - the magnet is always on"
      ],
      correctIndex: 1,
      explanation: "Unlike permanent magnets, electromagnets can be switched off! No current = no field = the load drops. This is the key advantage of electromagnets."
    },
    {
      scenario: "Maglev trains float on magnetic fields from electromagnets.",
      question: "How do the trains levitate AND move forward?",
      options: [
        "Wheels provide propulsion, magnets only lift",
        "Electromagnets along the track pull/push the train forward",
        "Rocket boosters hidden underneath",
        "Gravity is turned off in the guideway"
      ],
      correctIndex: 1,
      explanation: "Maglev trains use electromagnets for BOTH levitation AND propulsion. Sequentially energizing track magnets creates a traveling magnetic wave that pulls the train along."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "⚡",
      title: "Electric Motors",
      tagline: "Converting electricity to motion",
      description: "Electric motors use electromagnets to create rotating magnetic fields that push against permanent magnets, converting electrical energy to mechanical rotation.",
      connection: "Every electric car uses this principle - Tesla vehicles have motors producing 1000+ lb-ft of torque from electromagnetic forces alone."
    },
    {
      icon: "🏥",
      title: "MRI Machines",
      tagline: "Seeing inside the body",
      description: "MRI uses superconducting electromagnets 60,000× stronger than Earth's field to align hydrogen atoms in your body for detailed imaging.",
      connection: "The coils carry 400+ amps with zero resistance. This creates fields strong enough to pull metal objects across the room!"
    },
    {
      icon: "🏗️",
      title: "Scrapyard Cranes",
      tagline: "Pick up cars, drop them on command",
      description: "Giant electromagnets on cranes lift tons of scrap metal. The key advantage: turn off the current and the load drops instantly.",
      connection: "Unlike permanent magnets, electromagnets are switchable. Perfect for moving magnetic materials to precise locations."
    },
    {
      icon: "🚄",
      title: "Maglev Trains",
      tagline: "Floating at 600+ km/h",
      description: "Magnetic levitation trains use electromagnets to both levitate above the track AND propel forward with no wheels, friction, or contact.",
      connection: "The Shanghai Maglev reaches 430 km/h using precisely timed electromagnetic pulses that create a traveling magnetic wave."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate magnetic field strength
  private calculateFieldStrength(current: number, turns: number, hasCore: boolean): number {
    // B = μ₀ × n × I (simplified for solenoid)
    const coreMultiplier = hasCore ? IRON_CORE_MULTIPLIER : 1;
    return Math.abs(current) * turns * coreMultiplier * FIELD_SCALE;
  }

  // PROTECTED: Get polarity based on current direction
  private getPolarity(current: number): string {
    if (current === 0) return 'OFF';
    return current > 0 ? 'N-S' : 'S-N';
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
      if (input.id === 'current') {
        this.current = input.value;
      } else if (input.id === 'turns') {
        this.coilTurns = input.value;
      } else if (input.id === 'twist_current') {
        this.twistCurrent = input.value;
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
        if (buttonId === 'toggle_core') {
          this.hasCore = !this.hasCore;
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
          this.isAC = false;
        }
        break;

      case 'twist_play':
        if (buttonId === 'switch_dc') {
          this.isAC = false;
        } else if (buttonId === 'switch_ac') {
          this.isAC = true;
        } else if (buttonId === 'continue') {
          this.phase = 'twist_review';
          this.isAC = false;
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
    this.current = 0;
    this.coilTurns = 10;
    this.hasCore = false;
    this.paperClips = [
      { x: 50, y: 150, attracted: false },
      { x: 350, y: 150, attracted: false },
      { x: 100, y: 220, attracted: false },
      { x: 300, y: 220, attracted: false }
    ];
  }

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.resetSimulation();
    this.isAC = false;
    this.acPhase = 0;
    this.twistCurrent = 3;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Update AC phase
    if (this.isAC && this.phase === 'twist_play') {
      this.acPhase += deltaTime * 10; // 10 rad/s
      if (this.acPhase > 2 * Math.PI) {
        this.acPhase -= 2 * Math.PI;
      }
    }

    // Update paper clip positions based on field strength
    if (this.phase === 'play') {
      const fieldStrength = this.calculateFieldStrength(this.current, this.coilTurns, this.hasCore);
      const attractionRadius = Math.min(100, fieldStrength * 10);
      const centerX = 200;
      const centerY = 140;

      this.paperClips = this.paperClips.map(clip => {
        const dist = Math.sqrt(Math.pow(clip.x - centerX, 2) + Math.pow(clip.y - centerY, 2));

        if (fieldStrength > 0 && dist < attractionRadius + 50 && dist > 30) {
          const angle = Math.atan2(centerY - clip.y, centerX - clip.x);
          const speed = fieldStrength * 0.5 * deltaTime * 60;
          return {
            x: clip.x + Math.cos(angle) * speed,
            y: clip.y + Math.sin(angle) * speed,
            attracted: dist < 50
          };
        }
        return clip;
      });
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    r.clear('#111827');
    r.circle(100, 100, 150, { fill: 'rgba(167, 139, 250, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(59, 130, 246, 0.05)' });

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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(167, 139, 250, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#a78bfa', fontSize: 10, textAnchor: 'middle' });

    r.text(200, 130, 'How Do Motors Spin?', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'The secret of switchable magnets', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Electromagnet illustration
    r.roundRect(120, 200, 160, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Coil windings
    for (let i = 0; i < 8; i++) {
      r.ellipse(155 + i * 12, 250, 8, 18, { fill: 'none', stroke: '#f59e0b', strokeWidth: 3 });
    }

    // Field lines
    const pulse = Math.sin(this.animationTime * 3) * 0.3 + 0.7;
    r.ellipse(200, 250, 100 * pulse, 50 * pulse, { fill: 'none', stroke: 'rgba(59, 130, 246, 0.3)', strokeWidth: 1 });
    r.ellipse(200, 250, 80 * pulse, 40 * pulse, { fill: 'none', stroke: 'rgba(59, 130, 246, 0.4)', strokeWidth: 1 });

    r.roundRect(40, 320, 320, 110, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 350, 'Electric motors, MRI machines, maglev trains...', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 380, 'all rely on the ELECTROMAGNET:', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 410, 'A magnet you can turn ON and OFF!', { fill: '#a78bfa', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'discover', label: 'Discover the Secret', variant: 'primary' });

    r.setCoachMessage('Electric current creates magnetic fields - switchable magnetism!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 100, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'If you pass electric current through', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'a coil of wire, what will happen?', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });

    const options = [
      "Nothing - wire isn't magnetic",
      "The wire will create a magnetic field",
      "The wire will get hot but not magnetic",
      "The wire will repel all metals"
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 58;
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
        bgColor = 'rgba(167, 139, 250, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 455, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      r.text(200, 490, 'Current creates magnetism!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 520, 'Discovered by Oersted in 1820', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Build an Electromagnet', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 45, 'Electromagnet Lab', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization area
    r.roundRect(20, 70, 360, 200, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    const fieldStrength = this.calculateFieldStrength(this.current, this.coilTurns, this.hasCore);
    const fieldRadius = Math.min(80, fieldStrength * 8);

    // Magnetic field lines
    if (this.current !== 0) {
      for (let i = 0; i < 6; i++) {
        const scale = 0.5 + i * 0.15;
        const opacity = 0.6 - i * 0.1;
        r.ellipse(200, 160, 40 * scale + fieldRadius, 20 * scale + fieldRadius / 2, {
          fill: 'none',
          stroke: this.current > 0 ? `rgba(59, 130, 246, ${opacity})` : `rgba(239, 68, 68, ${opacity})`,
          strokeWidth: 1
        });
      }
    }

    // Coil windings
    const numWindings = Math.min(this.coilTurns / 2.5, 20);
    for (let i = 0; i < numWindings; i++) {
      r.ellipse(160 + i * 4, 160, 10, 25, { fill: 'none', stroke: '#f59e0b', strokeWidth: 3 });
    }

    // Iron core
    if (this.hasCore) {
      r.rect(155, 140, numWindings * 4 + 10, 40, { fill: '#4b5563', stroke: '#6b7280', strokeWidth: 2 });
    }

    // Pole indicators
    if (this.current !== 0) {
      r.circle(140, 160, 15, { fill: this.current > 0 ? '#ef4444' : '#3b82f6' });
      r.text(140, 165, this.current > 0 ? 'N' : 'S', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

      r.circle(260, 160, 15, { fill: this.current > 0 ? '#3b82f6' : '#ef4444' });
      r.text(260, 165, this.current > 0 ? 'S' : 'N', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Paper clips
    this.paperClips.forEach(clip => {
      const color = clip.attracted ? '#22c55e' : '#9ca3af';
      r.line(clip.x - 8, clip.y - 5, clip.x + 8, clip.y - 5, { stroke: color, strokeWidth: 2 });
      r.line(clip.x + 8, clip.y - 5, clip.x + 8, clip.y + 5, { stroke: color, strokeWidth: 2 });
      r.line(clip.x + 8, clip.y + 5, clip.x - 5, clip.y + 5, { stroke: color, strokeWidth: 2 });
    });

    // Field strength meter
    r.roundRect(20, 290, 170, 60, 10, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(105, 315, 'Field Strength', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(105, 340, `${fieldStrength.toFixed(3)} T`, { fill: '#a78bfa', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Polarity indicator
    r.roundRect(210, 290, 170, 60, 10, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(295, 315, 'Polarity', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(295, 340, this.getPolarity(this.current), {
      fill: this.current === 0 ? '#6b7280' : this.current > 0 ? '#3b82f6' : '#ef4444',
      fontSize: 16, fontWeight: 'bold', textAnchor: 'middle'
    });

    // Core with note
    if (this.hasCore) {
      r.text(200, 380, '1000x boost with iron core!', { fill: '#22c55e', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Sliders
    r.addSlider({ id: 'current', label: 'Current (A)', min: -5, max: 5, step: 0.5, value: this.current });
    r.addSlider({ id: 'turns', label: 'Coil Turns', min: 5, max: 50, step: 5, value: this.coilTurns });

    r.addButton({ id: 'toggle_core', label: this.hasCore ? 'Remove Iron Core' : 'Add Iron Core', variant: this.hasCore ? 'primary' : 'secondary' });
    r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, "Oersted's Discovery", { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Electricity creates magnetism
    r.roundRect(30, 85, 340, 100, 16, { fill: 'rgba(167, 139, 250, 0.2)' });
    r.text(200, 115, 'Electricity Creates Magnetism', { fill: '#a78bfa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 145, 'In 1820, Oersted discovered that current', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 165, 'flowing through wire creates a magnetic field.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Three factors
    r.text(200, 200, 'Three Ways to Increase Field Strength:', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const factors = [
      { icon: '⚡', label: 'More Current', effect: 'Stronger' },
      { icon: '🔄', label: 'More Turns', effect: 'Stronger' },
      { icon: '🧲', label: 'Iron Core', effect: '1000× Stronger!' }
    ];

    factors.forEach((f, i) => {
      const x = 55 + i * 110;
      r.roundRect(x, 220, 100, 70, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 50, 245, f.icon, { fontSize: 18, textAnchor: 'middle' });
      r.text(x + 50, 268, f.label, { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
      r.text(x + 50, 285, f.effect, { fill: '#a78bfa', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    });

    // Formula
    r.roundRect(30, 310, 340, 80, 16, { fill: 'rgba(251, 191, 36, 0.1)' });
    r.text(200, 335, 'Key Equation', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(70, 350, 260, 30, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 372, 'B = μ × n × I', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    // Iron core explanation
    r.roundRect(30, 405, 340, 70, 16, { fill: 'rgba(59, 130, 246, 0.1)' });
    r.text(200, 430, 'Why Iron Helps', { fill: '#3b82f6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 455, 'Iron atoms align with the field = "ferromagnetism"', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'What if We Reverse Current?', variant: 'secondary' });

    r.setCoachMessage('Coiling the wire concentrates the magnetic field!');
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Motor Question', { fill: '#a78bfa', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'If we rapidly switch current direction', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'back and forth (AC current)...', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 180, 'What happens to the magnetic field?', { fill: '#a78bfa', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      'The field will disappear',
      'The field stays the same direction',
      'The field flips north/south rapidly',
      'The field becomes twice as strong'
    ];

    options.forEach((option, i) => {
      const y = 210 + i * 55;
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

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 13 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 445, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      r.text(200, 480, 'The poles flip rapidly!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 510, 'This creates a "rotating" magnetic field', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 530, 'that makes motors spin!', { fill: '#a78bfa', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See DC vs AC', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 45, 'AC vs DC: Making Motors Spin', { fill: '#a78bfa', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Motor visualization
    r.roundRect(50, 80, 300, 220, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Stator (outer ring)
    r.circle(200, 180, 80, { fill: 'none', stroke: '#4b5563', strokeWidth: 8 });

    // Electromagnet coils on stator
    const angles = [0, 90, 180, 270];
    angles.forEach((angle, i) => {
      const rad = (angle * Math.PI) / 180;
      const x = 200 + Math.cos(rad) * 60;
      const y = 180 + Math.sin(rad) * 60;

      const isActive = this.isAC
        ? Math.abs(Math.sin(this.acPhase + i * Math.PI / 2)) > 0.5
        : this.twistCurrent > 0;

      r.rect(x - 12, y - 12, 24, 24, { fill: isActive ? '#f59e0b' : '#374151', stroke: '#6b7280', strokeWidth: 2 });

      if (isActive) {
        r.circle(x, y, 18, { fill: 'none', stroke: i % 2 === 0 ? '#3b82f6' : '#ef4444', strokeWidth: 1 });
      }
    });

    // Rotor
    const rotorAngle = this.isAC ? this.acPhase * 2 : 0;
    const nx = 200 + 30 * Math.sin(rotorAngle);
    const ny = 180 - 30 * Math.cos(rotorAngle);
    const sx = 200 - 30 * Math.sin(rotorAngle);
    const sy = 180 + 30 * Math.cos(rotorAngle);

    r.circle(200, 180, 35, { fill: '#374151', stroke: '#6b7280', strokeWidth: 2 });
    r.circle(nx, ny, 12, { fill: '#ef4444' });
    r.text(nx, ny + 4, 'N', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    r.circle(sx, sy, 12, { fill: '#3b82f6' });
    r.text(sx, sy + 4, 'S', { fill: '#ffffff', fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });

    // Current waveform display
    r.roundRect(55, 85, 90, 45, 8, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(100, 102, this.isAC ? 'AC Current' : 'DC Current', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    if (this.isAC) {
      // Draw sine wave
      for (let i = 0; i < 15; i++) {
        const x = 65 + i * 5;
        const y = 120 + Math.sin(i / 3 + this.acPhase) * 8;
        r.circle(x, y, 2, { fill: '#22c55e' });
      }
    } else {
      r.line(65, 120, 135, 120, { stroke: '#22c55e', strokeWidth: 2 });
    }

    // Mode indicator
    r.roundRect(255, 85, 90, 45, 8, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(300, 102, 'Motor Mode', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(300, 122, this.isAC ? 'ROTATING' : 'STATIC', {
      fill: this.isAC ? '#22c55e' : '#f59e0b',
      fontSize: 12, fontWeight: 'bold', textAnchor: 'middle'
    });

    // Explanation
    r.roundRect(30, 320, 340, 60, 12, { fill: 'rgba(30, 41, 59, 0.8)' });
    if (this.isAC) {
      r.text(200, 345, 'AC creates a rotating magnetic field!', { fill: '#22c55e', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 365, 'The rotor chases the field, causing spin.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    } else {
      r.text(200, 345, 'DC creates a static field.', { fill: '#f59e0b', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 365, 'Rotor aligns once, then stops.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    }

    r.addButton({ id: 'switch_dc', label: 'DC (Static)', variant: !this.isAC ? 'primary' : 'secondary' });
    r.addButton({ id: 'switch_ac', label: 'AC (Rotating)', variant: this.isAC ? 'primary' : 'secondary' });
    r.addButton({ id: 'continue', label: 'Understand Motor Physics', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'How Motors Work', { fill: '#a78bfa', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Rotating field principle
    r.roundRect(30, 85, 340, 100, 16, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 115, 'The Rotating Field Principle', { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 145, 'Reversing current reverses the poles.', { fill: '#fbbf24', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 170, 'Rapid alternation creates a "rotating" field!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // DC vs AC motors
    r.roundRect(30, 200, 165, 130, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(112, 225, 'DC Motors', { fill: '#f59e0b', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(112, 250, 'Need brushes to', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(112, 265, 'switch current', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(112, 290, 'Simple speed control', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });
    r.text(112, 310, 'Brushes wear out', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });

    r.roundRect(205, 200, 165, 130, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(287, 225, 'AC Motors', { fill: '#22c55e', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(287, 250, 'No brushes needed', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(287, 265, '(grid is already AC)', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(287, 290, 'Very reliable', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });
    r.text(287, 310, 'Long-lasting', { fill: '#cbd5e1', fontSize: 9, textAnchor: 'middle' });

    // Tesla fact
    r.roundRect(30, 350, 340, 70, 16, { fill: 'rgba(251, 191, 36, 0.1)' });
    r.text(200, 375, 'Nikola Tesla invented the AC motor in 1887!', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 400, 'The rotating field induces current in the rotor.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Electromagnets in Action', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#8b5cf6';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 300, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.tagline, { fill: '#a78bfa', fontSize: 11, textAnchor: 'middle' });

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

    r.roundRect(40, 320, 320, 70, 10, { fill: 'rgba(167, 139, 250, 0.2)' });
    r.text(200, 345, 'Physics Connection', { fill: '#a78bfa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 370, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 420, '✓ Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    r.text(200, 460, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      r.roundRect(25, 100, 350, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 130, question.scenario.substring(0, 50), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 148, question.scenario.substring(50, 100), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      r.text(200, 200, question.question, { fill: '#a78bfa', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      question.options.forEach((option, i) => {
        const y = 230 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(167, 139, 250, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 42, 8, { fill: bgColor });
        r.text(40, y + 25, `${String.fromCharCode(65 + i)}. ${option}`, { fill: isSelected ? '#a78bfa' : '#e2e8f0', fontSize: 11 });

        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      if (this.currentQuestionIndex > 0) {
        r.addButton({ id: 'prev_question', label: '← Previous', variant: 'secondary' });
      }
      if (this.currentQuestionIndex < 9) {
        r.addButton({ id: 'next_question', label: 'Next →', variant: 'secondary' });
      }

      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) {
        r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      } else {
        r.text(200, 480, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🎉' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? "Excellent! You've mastered electromagnets!" : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 120, '🏆', { fontSize: 72, textAnchor: 'middle' });

    r.text(200, 200, 'Electromagnet Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand switchable magnetism!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    const concepts = [
      { icon: '⚡', label: 'Current → Field' },
      { icon: '🔄', label: 'Coils Concentrate' },
      { icon: '🧲', label: 'Iron Core 1000×' },
      { icon: '🔃', label: 'AC Rotating Field' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 280 + Math.floor(i / 2) * 70;
      r.roundRect(x, y, 135, 55, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 67, y + 22, concept.icon, { fontSize: 18, textAnchor: 'middle' });
      r.text(x + 67, y + 44, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    r.roundRect(50, 440, 300, 70, 12, { fill: 'rgba(167, 139, 250, 0.2)' });
    r.text(200, 468, 'Key Equation', { fill: '#a78bfa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 495, 'B = μ₀ × n × I', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Electromagnets are switchable magnets - turn on current, get magnetism!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      current: this.current,
      coilTurns: this.coilTurns,
      hasCore: this.hasCore,
      isAC: this.isAC,
      acPhase: this.acPhase,
      twistCurrent: this.twistCurrent,
      paperClips: this.paperClips,
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
    if (state.current !== undefined) this.current = state.current as number;
    if (state.coilTurns !== undefined) this.coilTurns = state.coilTurns as number;
    if (state.hasCore !== undefined) this.hasCore = state.hasCore as boolean;
    if (state.isAC !== undefined) this.isAC = state.isAC as boolean;
    if (state.acPhase !== undefined) this.acPhase = state.acPhase as number;
    if (state.twistCurrent !== undefined) this.twistCurrent = state.twistCurrent as number;
    if (state.paperClips) this.paperClips = state.paperClips as { x: number; y: number; attracted: boolean }[];
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createElectromagnetGame(sessionId: string): ElectromagnetGame {
  return new ElectromagnetGame(sessionId);
}
