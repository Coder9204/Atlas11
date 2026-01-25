import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// MAGNETIC MAPPING GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: B = (mu0/4pi) * (3(m·r)r/r^5 - m/r^3) - Magnetic dipole field
// Field lines: N to S outside magnet, S to N inside
// Field strength proportional to line density
// Lines never cross (unique direction at each point)
// ============================================================================

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface Magnet {
  x: number;
  y: number;
  angle: number;
  strength: number;
}

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
}

// Physics constants (PROTECTED - calculations done server-side only)
const MU_0 = 4 * Math.PI * 1e-7; // Permeability of free space

export class MagneticMappingGame extends BaseGame {
  readonly gameType = 'magnetic_mapping';
  readonly gameTitle = 'Magnetic Field Mapping: Seeing the Invisible';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation state
  private magnets: Magnet[] = [{ x: 200, y: 140, angle: 0, strength: 100 }];
  private showFieldLines = true;
  private showCompassGrid = false;
  private selectedMagnetIndex: number | null = null;
  private showEarthField = false;
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
      question: "Which way do magnetic field lines point?",
      options: [
        "From south to north, inside the magnet",
        "From north to south, outside the magnet",
        "Randomly in all directions",
        "Straight up and down only"
      ],
      correctIndex: 1,
      explanation: "Outside a magnet, field lines point from North (N) pole to South (S) pole. Inside the magnet, they continue from S to N, forming closed loops."
    },
    {
      question: "What does it mean when field lines are close together?",
      options: [
        "The field is weak",
        "The magnet is broken",
        "The field is strong",
        "The temperature is high"
      ],
      correctIndex: 2,
      explanation: "Line density represents field strength. Close lines = strong field (near poles). Spread out lines = weaker field (far from magnet)."
    },
    {
      question: "Why can't magnetic field lines ever cross?",
      options: [
        "They repel each other",
        "A point can only have one field direction",
        "The magnet would break",
        "It would create infinite energy"
      ],
      correctIndex: 1,
      explanation: "At any point in space, the magnetic field has exactly one direction. If lines crossed, that point would have two directions simultaneously, which is physically impossible."
    },
    {
      question: "How does a compass work?",
      options: [
        "It measures electric current",
        "Its magnetic needle aligns with field lines",
        "It detects gravity",
        "It uses GPS satellites"
      ],
      correctIndex: 1,
      explanation: "A compass needle is a small magnet. It aligns with the local magnetic field direction, with its north end pointing along the field lines."
    },
    {
      question: "What happens when two magnets are placed near each other with like poles facing?",
      options: [
        "Field lines connect the poles",
        "Field lines repel and curve away",
        "The magnets become stronger",
        "The field disappears"
      ],
      correctIndex: 1,
      explanation: "Like poles repel. Field lines from both north poles curve away from each other, creating a neutral point between them where the field is very weak."
    },
    {
      question: "Why does Earth have a magnetic field?",
      options: [
        "Iron ore deposits create it",
        "Convecting molten iron in the outer core",
        "Solar wind magnetizes the crust",
        "Earth's rotation creates static electricity"
      ],
      correctIndex: 1,
      explanation: "Earth's magnetic field is generated by the 'geodynamo' - convecting currents of molten iron in the outer core create electrical currents that produce the field."
    },
    {
      question: "What is magnetic declination?",
      options: [
        "The strength of a magnet",
        "The angle between magnetic north and true north",
        "The field strength at the equator",
        "The rate of magnetic pole movement"
      ],
      correctIndex: 1,
      explanation: "Magnetic declination is the angle between magnetic north (where a compass points) and true geographic north. It varies by location and changes over time."
    },
    {
      question: "How strong is Earth's magnetic field compared to a refrigerator magnet?",
      options: [
        "Much stronger (100x)",
        "About the same",
        "Much weaker (about 1/100)",
        "It varies by hemisphere"
      ],
      correctIndex: 2,
      explanation: "Earth's field is about 25-65 microtesla, roughly 100 times weaker than a typical refrigerator magnet. Yet it's enough to deflect compass needles and shield us from solar wind."
    },
    {
      question: "Iron filings sprinkled around a magnet form patterns because:",
      options: [
        "They are repelled by the magnet",
        "Each filing becomes magnetized and aligns with the local field",
        "They are attracted only to the poles",
        "Static electricity arranges them"
      ],
      correctIndex: 1,
      explanation: "Each iron filing becomes temporarily magnetized (induced magnetic dipole) and aligns with the local field direction, revealing the field line pattern."
    },
    {
      question: "If Earth's magnetic field suddenly disappeared, which would be most affected?",
      options: [
        "Gravity would decrease",
        "Compasses would stop working and solar radiation would increase",
        "Ocean tides would stop",
        "Day and night cycles would change"
      ],
      correctIndex: 1,
      explanation: "Without the magnetic field, compasses would be useless, and the magnetosphere that shields Earth from harmful solar radiation would collapse, allowing more cosmic rays to reach the surface."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "🧭",
      title: "Compass Navigation",
      description: "Compass needles are tiny magnets that align with Earth's field, pointing toward magnetic north."
    },
    {
      icon: "🏥",
      title: "MRI Machines",
      description: "Powerful magnets create precise fields. Field mapping ensures accurate medical imaging."
    },
    {
      icon: "⚛️",
      title: "Particle Accelerators",
      description: "Mapped magnetic fields steer particles at near-light speeds in exact circular paths."
    },
    {
      icon: "🛡️",
      title: "Magnetic Shielding",
      description: "Understanding field patterns helps design shields for sensitive electronics."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate magnetic field at a point (dipole approximation)
  private calculateFieldAt(px: number, py: number): { bx: number; by: number } {
    let bx = 0;
    let by = 0;

    for (const m of this.magnets) {
      const dx = px - m.x;
      const dy = py - m.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r < 10) continue; // Avoid singularity at magnet center

      const r3 = r * r * r;
      const mx = Math.cos(m.angle * Math.PI / 180) * m.strength;
      const my = Math.sin(m.angle * Math.PI / 180) * m.strength;

      // Dipole field formula
      const dot = mx * dx + my * dy;
      bx += (3 * dx * dot / (r3 * r * r) - mx / r3) * 1000;
      by += (3 * dy * dot / (r3 * r * r) - my / r3) * 1000;
    }

    return { bx, by };
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
      this.handleSliderChange(input.id, input.value as number);
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
        if (buttonId === 'toggle_field_lines') {
          this.showFieldLines = !this.showFieldLines;
        } else if (buttonId === 'toggle_compass') {
          this.showCompassGrid = !this.showCompassGrid;
        } else if (buttonId === 'add_magnet') {
          if (this.magnets.length < 3) {
            this.magnets.push({
              x: 100 + Math.random() * 200,
              y: 80 + Math.random() * 120,
              angle: Math.random() * 360,
              strength: 80
            });
          }
        } else if (buttonId === 'rotate_left' && this.selectedMagnetIndex !== null) {
          this.magnets[this.selectedMagnetIndex].angle = (this.magnets[this.selectedMagnetIndex].angle - 30 + 360) % 360;
        } else if (buttonId === 'rotate_right' && this.selectedMagnetIndex !== null) {
          this.magnets[this.selectedMagnetIndex].angle = (this.magnets[this.selectedMagnetIndex].angle + 30) % 360;
        } else if (buttonId === 'remove_magnet' && this.selectedMagnetIndex !== null) {
          this.magnets.splice(this.selectedMagnetIndex, 1);
          this.selectedMagnetIndex = null;
        } else if (buttonId.startsWith('select_magnet_')) {
          this.selectedMagnetIndex = parseInt(buttonId.split('_')[2]);
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
        if (buttonId === 'toggle_earth_field') {
          this.showEarthField = !this.showEarthField;
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

  private handleSliderChange(sliderId: string, value: number): void {
    // For future use - magnet strength adjustment, etc.
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
    this.magnets = [{ x: 200, y: 140, angle: 0, strength: 100 }];
    this.showFieldLines = true;
    this.showCompassGrid = false;
    this.selectedMagnetIndex = null;
    this.showEarthField = false;
    this.testAnswers = Array(10).fill(-1);
    this.currentQuestionIndex = 0;
    this.showTestResults = false;
    this.activeAppIndex = 0;
    this.completedApps.clear();
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;
  }

  render(): GameFrame {
    const r = new CommandRenderer(400, 700);

    // Dark gradient background
    r.clear('#0a0f1a');

    // Subtle background orbs
    r.circle(100, 100, 150, { fill: 'rgba(239, 68, 68, 0.03)' });
    r.circle(300, 600, 150, { fill: 'rgba(59, 130, 246, 0.03)' });

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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(239, 68, 68, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#ef4444', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'Seeing the Invisible', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'How can we map forces we cannot see?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Magnet icon
    r.text(200, 250, '🧲', { fontSize: 72, textAnchor: 'middle' });

    // Fact card
    r.roundRect(40, 310, 320, 130, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 345, 'Magnetic fields are invisible,', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 370, 'yet we can map them perfectly!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 410, 'Iron filings and tiny compasses', { fill: '#ef4444', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 430, 'reveal the hidden architecture!', { fill: '#ef4444', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA Button
    r.addButton({ id: 'discover', label: 'Discover the Secret', variant: 'primary' });

    r.setCoachMessage('Explore how we visualize invisible magnetic fields!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 100, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'If you sprinkle iron filings around', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'a bar magnet, what pattern will form?', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Options
    const options = [
      'Random scattered pattern',
      'Curved lines from N to S pole',
      'A perfect circle around the magnet',
      'Straight parallel lines'
    ];

    options.forEach((option, i) => {
      const y = 220 + i * 60;
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
        bgColor = 'rgba(239, 68, 68, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 480, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      r.text(200, 510, 'Correct! Field lines curve from N to S!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 540, 'Each filing aligns with local field direction.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Explore the Physics', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 55, 'Magnetic Field Mapper', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Field visualization area
    r.roundRect(20, 80, 360, 250, 16, { fill: 'rgba(17, 24, 39, 0.8)' });

    // Draw magnets
    this.magnets.forEach((m, i) => {
      const isSelected = i === this.selectedMagnetIndex;

      // Magnet body (red = N, blue = S)
      const rad = (m.angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      // North pole (red)
      r.roundRect(m.x + 20 - 30 + cos * 15, m.y + 80 - 12 + sin * 15, 30, 24, 4, { fill: '#ef4444' });
      // South pole (blue)
      r.roundRect(m.x + 20 - cos * 15, m.y + 80 - 12 - sin * 15, 30, 24, 4, { fill: '#3b82f6' });

      r.text(m.x + 20, m.y + 85, 'N', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      if (isSelected) {
        r.circle(m.x + 20, m.y + 80, 35, { fill: 'none', stroke: '#fbbf24', strokeWidth: 2 });
      }
    });

    // Draw field lines (simplified representation)
    if (this.showFieldLines) {
      for (const m of this.magnets) {
        // Draw curved field lines emanating from north pole
        for (let angle = -60; angle <= 60; angle += 20) {
          const startAngle = (m.angle + angle) * Math.PI / 180;
          const startX = m.x + 20 + Math.cos(startAngle) * 30;
          const startY = m.y + 80 + Math.sin(startAngle) * 30;

          r.circle(startX, startY, 3, { fill: '#60a5fa' });
        }
      }
    }

    // Draw compass grid
    if (this.showCompassGrid) {
      for (let x = 50; x < 360; x += 50) {
        for (let y = 110; y < 300; y += 50) {
          const { bx, by } = this.calculateFieldAt(x - 20, y - 80);
          const angle = Math.atan2(by, bx);

          r.line(x - 8, y, x + 8, y, { stroke: '#ef4444', strokeWidth: 2 });
          r.circle(x, y, 2, { fill: '#fbbf24' });
        }
      }
    }

    // Control buttons
    r.addButton({ id: 'toggle_field_lines', label: this.showFieldLines ? 'Hide Lines' : 'Show Lines', variant: 'secondary' });
    r.addButton({ id: 'toggle_compass', label: this.showCompassGrid ? 'Hide Compass' : 'Show Compass', variant: 'secondary' });
    r.addButton({ id: 'add_magnet', label: '+ Add Magnet', variant: 'secondary' });

    if (this.selectedMagnetIndex !== null) {
      r.addButton({ id: 'rotate_left', label: 'Rotate Left', variant: 'secondary' });
      r.addButton({ id: 'rotate_right', label: 'Rotate Right', variant: 'secondary' });
      r.addButton({ id: 'remove_magnet', label: 'Remove', variant: 'secondary' });
    }

    // Info card
    r.roundRect(20, 400, 360, 80, 12, { fill: 'rgba(239, 68, 68, 0.1)' });
    r.text(200, 425, 'Field lines: N to S outside, density = strength', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 450, 'Lines never cross! Each point has one direction.', { fill: '#f97316', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review the Physics', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'Reading Magnetic Field Maps', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Field line rules
    r.roundRect(25, 85, 350, 130, 16, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 110, 'Field Line Rules', { fill: '#60a5fa', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 135, 'Lines point from N to S outside the magnet', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 155, 'Lines NEVER cross (unique direction)', { fill: '#fbbf24', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 175, 'Closer lines = stronger field', { fill: '#22c55e', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 195, 'Lines form closed loops', { fill: '#a855f7', fontSize: 11, textAnchor: 'middle' });

    // Visualization methods
    r.roundRect(25, 230, 170, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(110, 260, '🧲', { fontSize: 24, textAnchor: 'middle' });
    r.text(110, 290, 'Iron Filings', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 310, 'Align with local field', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(205, 230, 170, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(290, 260, '🧭', { fontSize: 24, textAnchor: 'middle' });
    r.text(290, 290, 'Compass Array', { fill: '#ffffff', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 310, 'Point along field', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Key insight
    r.roundRect(25, 350, 350, 80, 12, { fill: 'rgba(251, 191, 36, 0.15)' });
    r.text(200, 375, 'Key Insight', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 400, 'Field lines are visualization tools, not physical objects.', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 420, 'But the patterns they reveal are REAL!', { fill: '#22c55e', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: "Earth's Giant Magnet", variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Earth Question', { fill: '#f59e0b', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'Earth has a magnetic field that', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'compasses detect. Which way does', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 175, 'a compass needle point?', { fill: '#f59e0b', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'Toward true geographic north',
      'Toward magnetic north (slightly different!)',
      'Toward the sun',
      'Random direction based on location'
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
        bgColor = 'rgba(245, 158, 11, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 440, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      r.text(200, 470, 'Correct! Magnetic north differs from geographic!', { fill: '#34d399', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 495, 'This difference is called magnetic declination.', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 520, 'It varies by location and changes over time!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: "See Earth's Field", variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 55, "Earth's Magnetic Field", { fill: '#f59e0b', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Earth visualization
    r.roundRect(20, 85, 360, 250, 16, { fill: 'rgba(15, 23, 42, 0.8)' });

    // Stars
    for (let i = 0; i < 20; i++) {
      const x = 30 + Math.random() * 340;
      const y = 95 + Math.random() * 230;
      r.circle(x, y, 1, { fill: 'rgba(255, 255, 255, 0.5)' });
    }

    // Earth
    r.circle(200, 210, 80, { fill: '#1e40af' });
    // Continents (simplified)
    r.circle(180, 190, 15, { fill: 'rgba(34, 197, 94, 0.6)' });
    r.circle(220, 220, 20, { fill: 'rgba(34, 197, 94, 0.6)' });

    // Magnetic poles
    r.circle(200, 140, 5, { fill: '#3b82f6' });
    r.text(200, 125, 'Magnetic S', { fill: '#3b82f6', fontSize: 9, textAnchor: 'middle' });
    r.circle(200, 280, 5, { fill: '#ef4444' });
    r.text(200, 295, 'Magnetic N', { fill: '#ef4444', fontSize: 9, textAnchor: 'middle' });

    // Field lines
    if (this.showEarthField) {
      // Simplified dipole field lines
      r.text(200, 340, '(Field lines extend into space)', { fill: '#60a5fa', fontSize: 10, textAnchor: 'middle' });
    }

    // Compass
    r.circle(120, 210, 15, { fill: '#1f2937' });
    r.line(120, 220, 120, 200, { stroke: '#ef4444', strokeWidth: 2 });
    r.text(120, 240, 'Compass', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });

    // Info box
    r.roundRect(280, 95, 90, 70, 8, { fill: 'rgba(30, 41, 59, 0.9)' });
    r.text(325, 115, "Earth's Field", { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(325, 135, '~25-65 uT', { fill: '#22d3ee', fontSize: 11, textAnchor: 'middle' });
    r.text(325, 155, '(very weak!)', { fill: '#6b7280', fontSize: 9, textAnchor: 'middle' });

    r.addButton({ id: 'toggle_earth_field', label: this.showEarthField ? 'Hide Field Lines' : 'Show Field Lines', variant: 'secondary' });

    // Explanation
    r.roundRect(20, 360, 360, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 385, 'Earth acts like a giant bar magnet!', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 410, 'Magnetic poles are offset from geographic poles.', { fill: '#fbbf24', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: "Understand Earth's Field", variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, "Earth's Magnetic Shield", { fill: '#f59e0b', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Geodynamo
    r.roundRect(25, 85, 350, 110, 16, { fill: 'rgba(34, 197, 94, 0.15)' });
    r.text(200, 110, 'The Geodynamo', { fill: '#22c55e', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 135, "Earth's field is generated by convecting", { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 155, 'molten iron in the outer core.', { fill: '#fbbf24', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 175, 'This shields us from solar wind!', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Two info cards
    r.roundRect(25, 210, 170, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(110, 235, 'Magnetic Declination', { fill: '#22d3ee', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 260, 'Angle between magnetic', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 278, 'and true north.', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 296, 'Can be 20+ degrees!', { fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(205, 210, 170, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(290, 235, 'Field Strength', { fill: '#a855f7', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 260, '25-65 microtesla', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 278, '~100x weaker than', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 296, 'fridge magnet!', { fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' });

    // Fun fact
    r.roundRect(25, 325, 350, 60, 12, { fill: 'rgba(251, 191, 36, 0.15)' });
    r.text(200, 350, 'Fun Fact: Poles flip every few hundred thousand years!', { fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 370, "We're in a long 'normal' period, but the field is weakening.", { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'See Real Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

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
    r.roundRect(25, 140, 350, 200, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    // Description (wrapped)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 210;
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

    // Mark understood button
    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: 'Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 320, 'Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    // Progress
    r.text(200, 380, `Progress: ${this.completedApps.size}/4 applications`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

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

      // Question
      r.roundRect(25, 100, 350, 70, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 140, question.question, { fill: '#ef4444', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 185 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 45, 8, { fill: bgColor });
        r.text(40, y + 27, `${String.fromCharCode(65 + i)}. ${option.substring(0, 48)}${option.length > 48 ? '...' : ''}`, { fill: isSelected ? '#60a5fa' : '#e2e8f0', fontSize: 10 });

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
        r.text(200, 420, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? 'Excellent! You understand magnetic fields!' : 'Keep studying and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Trophy
    r.text(200, 120, '🧲', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Magnetic Mapping Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, "You've mastered magnetic field visualization!", { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '🧭', label: 'N to S Field Lines' },
      { icon: '⚡', label: 'Density = Strength' },
      { icon: '🌍', label: 'Geodynamo' },
      { icon: '🔬', label: 'Lines Never Cross' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 275 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 440, 300, 70, 12, { fill: 'rgba(239, 68, 68, 0.2)' });
    r.text(200, 465, 'Key Principle', { fill: '#ef4444', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 492, 'B field: N to S outside, closed loops', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering magnetic field mapping!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      magnets: this.magnets,
      showFieldLines: this.showFieldLines,
      showCompassGrid: this.showCompassGrid,
      selectedMagnetIndex: this.selectedMagnetIndex,
      showEarthField: this.showEarthField,
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
    if (state.magnets) this.magnets = state.magnets as Magnet[];
    if (state.showFieldLines !== undefined) this.showFieldLines = state.showFieldLines as boolean;
    if (state.showCompassGrid !== undefined) this.showCompassGrid = state.showCompassGrid as boolean;
    if (state.selectedMagnetIndex !== undefined) this.selectedMagnetIndex = state.selectedMagnetIndex as number | null;
    if (state.showEarthField !== undefined) this.showEarthField = state.showEarthField as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createMagneticMappingGame(sessionId: string): MagneticMappingGame {
  return new MagneticMappingGame(sessionId);
}
