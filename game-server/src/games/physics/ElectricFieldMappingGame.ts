import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// ELECTRIC FIELD MAPPING GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Coulomb's Law - E = kq/r²
// Electric field vectors point from + to -
// Field lines never cross, density indicates strength
// Superposition: fields from multiple charges add vectorially
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

interface Charge {
  x: number;
  y: number;
  polarity: 'positive' | 'negative';
  magnitude: number;
}

// Physics constants (PROTECTED - never sent to client)
const COULOMB_CONSTANT = 8.99e9; // N·m²/C²
const ELEMENTARY_CHARGE = 1.6e-19; // Coulombs
const FIELD_SCALE = 5000; // For visualization

export class ElectricFieldMappingGame extends BaseGame {
  readonly gameType = 'electric_field_mapping';
  readonly gameTitle = 'Electric Field Mapping: Invisible Forces';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private charges: Charge[] = [{ x: 200, y: 200, polarity: 'positive', magnitude: 1 }];
  private probeX = 150;
  private probeY = 200;
  private showFieldLines = true;
  private showVectors = true;
  private animationTime = 0;

  // Dipole configuration for twist
  private dipoleCharges: Charge[] = [
    { x: 150, y: 200, polarity: 'positive', magnitude: 1 },
    { x: 250, y: 200, polarity: 'negative', magnitude: 1 }
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
      scenario: "A positive test charge is placed near a positive source charge.",
      question: "In which direction does the electric field point?",
      options: [
        "Toward the source charge",
        "Away from the source charge",
        "In a circular path",
        "There is no field"
      ],
      correctIndex: 1,
      explanation: "Electric field vectors point in the direction a positive test charge would be pushed. Positive repels positive, so the field points AWAY from positive charges."
    },
    {
      scenario: "The electric field follows an inverse-square law: E = kq/r²",
      question: "If you double the distance from a charge, how does the field strength change?",
      options: [
        "It doubles",
        "It halves",
        "It becomes 1/4 as strong",
        "It stays the same"
      ],
      correctIndex: 2,
      explanation: "With r² in the denominator, doubling r means E becomes 1/4 as strong. This is the inverse-square law - same as gravity!"
    },
    {
      scenario: "You're mapping the electric field around a positive charge.",
      question: "What do the field lines look like?",
      options: [
        "Circles around the charge",
        "Straight lines pointing toward the charge",
        "Straight lines radiating outward from the charge",
        "Random patterns"
      ],
      correctIndex: 2,
      explanation: "Field lines start on positive charges and point radially outward in all directions. They represent the direction a positive test charge would move."
    },
    {
      scenario: "Electric field lines from two nearby charges are being mapped.",
      question: "Can field lines ever cross each other?",
      options: [
        "Yes, at the charges",
        "Yes, at the midpoint",
        "No, field lines never cross",
        "Only for opposite charges"
      ],
      correctIndex: 2,
      explanation: "Field lines NEVER cross because the field can only have one direction at any point. If lines crossed, a test charge wouldn't know which way to go!"
    },
    {
      scenario: "A dipole consists of a positive and negative charge separated by some distance.",
      question: "Where is the electric field strongest in a dipole?",
      options: [
        "Far from both charges",
        "At the midpoint between charges",
        "Close to either charge",
        "The field is uniform everywhere"
      ],
      correctIndex: 2,
      explanation: "Field strength follows E = kq/r². Close to either charge, r is small, making E large. The field is weaker at the midpoint where contributions partially cancel."
    },
    {
      scenario: "Two positive charges are placed near each other.",
      question: "What happens to the field lines between them?",
      options: [
        "They connect the charges",
        "They repel and curve away",
        "They cross in the middle",
        "They disappear"
      ],
      correctIndex: 1,
      explanation: "Like charges repel. The field lines from each positive charge curve away from each other because they both point outward and cannot cross."
    },
    {
      scenario: "The spacing of field lines represents field strength.",
      question: "What do closely-spaced field lines indicate?",
      options: [
        "Weak field",
        "Strong field",
        "Zero field",
        "Changing field direction"
      ],
      correctIndex: 1,
      explanation: "Denser field lines = stronger field. Think of it like the lines-per-area representing 'force density.' More lines through an area means more force."
    },
    {
      scenario: "A uniform electric field exists between two parallel charged plates.",
      question: "What do the field lines look like between the plates?",
      options: [
        "Curved toward the center",
        "Radial from each plate",
        "Parallel straight lines",
        "Spiral patterns"
      ],
      correctIndex: 2,
      explanation: "Between parallel plates, the field is uniform - same strength and direction everywhere. The lines are parallel, straight, and evenly spaced."
    },
    {
      scenario: "The principle of superposition applies to electric fields.",
      question: "What does superposition mean for multiple charges?",
      options: [
        "Only the strongest charge matters",
        "Fields cancel out completely",
        "Fields add vectorially at each point",
        "Charges must be separated by 1 meter"
      ],
      correctIndex: 2,
      explanation: "Superposition means the total field at any point is the vector sum of fields from all charges. You add the field vectors, considering both magnitude AND direction."
    },
    {
      scenario: "You place a positive charge inside a hollow conducting sphere.",
      question: "What is the electric field inside the conductor?",
      options: [
        "Very strong, pointing inward",
        "Zero everywhere inside",
        "Same as outside the sphere",
        "Depends on the charge's position"
      ],
      correctIndex: 1,
      explanation: "This is electrostatic shielding! Inside a conductor in equilibrium, charges redistribute to make E = 0 inside. The charge on the inner surface induces charges that cancel the field."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "⚡",
      title: "Capacitors",
      tagline: "Storing energy in fields",
      description: "Capacitors store energy in the uniform electric field between parallel plates. The field strength determines energy storage capacity.",
      connection: "A 1-farad capacitor at 1 volt stores 0.5 joules in its electric field. Your phone battery uses supercapacitors for quick charging!"
    },
    {
      icon: "🌩️",
      title: "Lightning Rods",
      tagline: "Controlling electric fields",
      description: "Pointed conductors concentrate electric field lines at tips, creating paths for lightning to safely discharge to ground.",
      connection: "Field lines crowd at sharp points, creating fields strong enough to ionize air. This is why lightning strikes tall, pointed objects."
    },
    {
      icon: "📺",
      title: "Old CRT Displays",
      tagline: "Steering electrons with fields",
      description: "Cathode ray tubes used electric fields between charged plates to deflect electron beams, painting images on phosphor screens.",
      connection: "Horizontal and vertical deflection plates created perpendicular fields that precisely controlled where electrons hit the screen."
    },
    {
      icon: "🔬",
      title: "Particle Accelerators",
      tagline: "Accelerating matter to light speed",
      description: "Particle accelerators use strong electric fields to accelerate charged particles to near-light speeds for physics research.",
      connection: "The Large Hadron Collider uses electric fields to accelerate protons to 99.9999991% of light speed!"
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate electric field at a point
  private calculateFieldAt(x: number, y: number, chargeList: Charge[]): { ex: number; ey: number; magnitude: number } {
    let ex = 0;
    let ey = 0;

    for (const charge of chargeList) {
      const dx = x - charge.x;
      const dy = y - charge.y;
      const r = Math.sqrt(dx * dx + dy * dy);

      if (r < 5) continue; // Avoid singularity

      // E = kq/r² direction normalized
      const eMag = (FIELD_SCALE * charge.magnitude) / (r * r);
      const sign = charge.polarity === 'positive' ? 1 : -1;

      ex += sign * eMag * (dx / r);
      ey += sign * eMag * (dy / r);
    }

    const magnitude = Math.sqrt(ex * ex + ey * ey);
    return { ex, ey, magnitude };
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
      if (input.id === 'probe_x') {
        this.probeX = input.value;
      } else if (input.id === 'probe_y') {
        this.probeY = input.value;
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
        if (buttonId === 'toggle_lines') {
          this.showFieldLines = !this.showFieldLines;
        } else if (buttonId === 'toggle_vectors') {
          this.showVectors = !this.showVectors;
        } else if (buttonId === 'add_positive') {
          if (this.charges.length < 4) {
            this.charges.push({ x: 150 + Math.random() * 100, y: 150 + Math.random() * 100, polarity: 'positive', magnitude: 1 });
          }
        } else if (buttonId === 'add_negative') {
          if (this.charges.length < 4) {
            this.charges.push({ x: 150 + Math.random() * 100, y: 150 + Math.random() * 100, polarity: 'negative', magnitude: 1 });
          }
        } else if (buttonId === 'reset_charges') {
          this.charges = [{ x: 200, y: 200, polarity: 'positive', magnitude: 1 }];
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
        if (buttonId === 'toggle_lines') {
          this.showFieldLines = !this.showFieldLines;
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
    this.charges = [{ x: 200, y: 200, polarity: 'positive', magnitude: 1 }];
    this.probeX = 150;
    this.probeY = 200;
    this.showFieldLines = true;
    this.showVectors = true;
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
    r.clear('#0f172a');
    r.circle(100, 100, 150, { fill: 'rgba(59, 130, 246, 0.05)' });
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

  private renderFieldVisualization(r: CommandRenderer, chargeList: Charge[], offsetY: number = 0): void {
    // Draw field lines
    if (this.showFieldLines) {
      for (const charge of chargeList) {
        const numLines = 8;
        for (let i = 0; i < numLines; i++) {
          const angle = (2 * Math.PI * i) / numLines;
          let x = charge.x + 15 * Math.cos(angle);
          let y = charge.y + offsetY + 15 * Math.sin(angle);

          // Trace field line
          const points: { x: number; y: number }[] = [{ x, y }];
          for (let step = 0; step < 30; step++) {
            const field = this.calculateFieldAt(x, y - offsetY, chargeList);
            if (field.magnitude < 0.1) break;

            const dir = charge.polarity === 'positive' ? 1 : -1;
            x += dir * (field.ex / field.magnitude) * 8;
            y += dir * (field.ey / field.magnitude) * 8;

            if (x < 30 || x > 370 || y < offsetY + 30 || y > offsetY + 270) break;
            points.push({ x, y });
          }

          // Draw the line
          if (points.length > 1) {
            for (let j = 0; j < points.length - 1; j++) {
              const opacity = 0.4 - (j / points.length) * 0.3;
              r.line(points[j].x, points[j].y, points[j + 1].x, points[j + 1].y, {
                stroke: charge.polarity === 'positive' ? `rgba(59, 130, 246, ${opacity})` : `rgba(239, 68, 68, ${opacity})`,
                strokeWidth: 1
              });
            }
          }
        }
      }
    }

    // Draw charges
    for (const charge of chargeList) {
      const color = charge.polarity === 'positive' ? '#ef4444' : '#3b82f6';
      r.circle(charge.x, charge.y + offsetY, 15, { fill: color });
      r.text(charge.x, charge.y + offsetY + 5, charge.polarity === 'positive' ? '+' : '-', {
        fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle'
      });
    }
  }

  private renderHook(r: CommandRenderer): void {
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(59, 130, 246, 0.1)' });
    r.text(200, 80, 'PHYSICS EXPLORATION', { fill: '#60a5fa', fontSize: 10, textAnchor: 'middle' });

    r.text(200, 130, 'The Invisible Force Field', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'How do charges affect space around them?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Visualization of field around charge
    r.roundRect(50, 190, 300, 200, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Draw simple field lines radiating out
    const cx = 200;
    const cy = 290;
    r.circle(cx, cy, 20, { fill: '#ef4444' });
    r.text(cx, cy + 5, '+', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    for (let i = 0; i < 8; i++) {
      const angle = (2 * Math.PI * i) / 8;
      const x1 = cx + 25 * Math.cos(angle);
      const y1 = cy + 25 * Math.sin(angle);
      const x2 = cx + 80 * Math.cos(angle);
      const y2 = cy + 80 * Math.sin(angle);
      r.line(x1, y1, x2, y2, { stroke: 'rgba(59, 130, 246, 0.5)', strokeWidth: 2 });

      // Arrow head
      const ax = cx + 70 * Math.cos(angle);
      const ay = cy + 70 * Math.sin(angle);
      r.circle(ax, ay, 4, { fill: '#3b82f6' });
    }

    r.roundRect(40, 410, 320, 80, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 440, 'Charges create electric fields that', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 465, 'exert forces on other charges!', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'discover', label: 'Explore Electric Fields', variant: 'primary' });

    r.setCoachMessage('Electric fields surround every charge. Let us map them!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 70, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 100, 340, 90, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 130, 'A positive test charge is placed near', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 155, 'a positive source charge.', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 180, 'What direction does the field point?', { fill: '#60a5fa', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      'Toward the source charge',
      'Away from the source charge',
      'In a circular path around',
      'There is no field'
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
        bgColor = 'rgba(59, 130, 246, 0.3)';
      }

      r.roundRect(30, y, 340, 50, 10, { fill: bgColor });
      r.text(50, y + 30, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 13 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 460, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      r.text(200, 495, 'Like charges repel!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 525, 'The field points away from positive charges', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Map Electric Fields', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 45, 'Electric Field Lab', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization area
    r.roundRect(20, 70, 360, 250, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    this.renderFieldVisualization(r, this.charges, 70);

    // Probe position and field info
    const field = this.calculateFieldAt(this.probeX, this.probeY, this.charges);
    r.roundRect(30, 340, 340, 60, 10, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 360, `Field at probe: ${field.magnitude.toFixed(1)} units`, { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 385, `Direction: (${(field.ex / (field.magnitude || 1)).toFixed(2)}, ${(field.ey / (field.magnitude || 1)).toFixed(2)})`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Controls
    r.addButton({ id: 'toggle_lines', label: this.showFieldLines ? 'Hide Lines' : 'Show Lines', variant: 'secondary' });
    r.addButton({ id: 'add_positive', label: '+', variant: 'secondary' });
    r.addButton({ id: 'add_negative', label: '-', variant: 'secondary' });
    r.addButton({ id: 'reset_charges', label: 'Reset', variant: 'secondary' });

    // Sliders for probe position
    r.addSlider({ id: 'probe_x', label: 'Probe X', min: 40, max: 360, step: 5, value: this.probeX });
    r.addSlider({ id: 'probe_y', label: 'Probe Y', min: 20, max: 240, step: 5, value: this.probeY });

    r.addButton({ id: 'continue', label: 'Understand the Physics', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, "Coulomb's Law & Field Lines", { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Main formula
    r.roundRect(30, 85, 340, 100, 16, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 115, 'Electric Field Strength', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(70, 130, 260, 40, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 157, 'E = kq/r²', { fill: '#ffffff', fontSize: 20, textAnchor: 'middle' });

    // Key concepts
    r.roundRect(30, 200, 340, 130, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 230, 'Field Line Rules', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 260, '1. Lines start on + and end on -', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 285, '2. Lines NEVER cross each other', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 310, '3. Denser lines = stronger field', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    // Inverse square note
    r.roundRect(30, 345, 340, 70, 16, { fill: 'rgba(251, 191, 36, 0.1)' });
    r.text(200, 375, 'Inverse Square Law', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 400, 'Double the distance → 1/4 the field strength', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore Dipoles', variant: 'secondary' });

    r.setCoachMessage('The inverse-square law governs electromagnetic forces!');
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 60, 'The Twist: Electric Dipole', { fill: '#a78bfa', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(30, 95, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 125, 'A positive and negative charge are', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 150, 'placed close together (a dipole).', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 180, 'What do the field lines look like?', { fill: '#a78bfa', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      'Parallel straight lines',
      'Lines go from + to -, curving around',
      'Circular loops around both charges',
      'No field lines exist'
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
        bgColor = 'rgba(168, 85, 247, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 12 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 445, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      r.text(200, 480, 'Field lines connect + to -!', { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 510, 'They leave the + and curve to reach the -', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Visualize the Dipole', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 45, 'Dipole Field Visualization', { fill: '#a78bfa', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Visualization area
    r.roundRect(20, 70, 360, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    this.renderFieldVisualization(r, this.dipoleCharges, 100);

    // Description
    r.roundRect(30, 370, 340, 80, 12, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 400, 'Field lines connect + to -', { fill: '#a78bfa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 425, 'The field is strongest near the charges', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'toggle_lines', label: this.showFieldLines ? 'Hide Lines' : 'Show Lines', variant: 'secondary' });
    r.addButton({ id: 'continue', label: 'Learn About Superposition', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Superposition of Fields', { fill: '#a78bfa', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Superposition explanation
    r.roundRect(30, 85, 340, 120, 16, { fill: 'rgba(168, 85, 247, 0.2)' });
    r.text(200, 115, 'The Superposition Principle', { fill: '#a78bfa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 145, 'Total field = vector sum of all fields', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.roundRect(70, 160, 260, 35, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 183, 'E_total = E₁ + E₂ + E₃ + ...', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    // Dipole properties
    r.roundRect(30, 220, 340, 100, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 250, 'Dipole Properties', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 280, 'At the midpoint, horizontal components add', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 300, 'but vertical components cancel!', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Field never crosses
    r.roundRect(30, 335, 340, 80, 16, { fill: 'rgba(239, 68, 68, 0.1)' });
    r.text(200, 365, 'Field Lines Never Cross!', { fill: '#f87171', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 395, 'The field has only one direction at each point', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Electric Fields in Action', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

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

    r.roundRect(40, 320, 320, 70, 10, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 345, 'Physics Connection', { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
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

      r.text(200, 200, question.question, { fill: '#60a5fa', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

      question.options.forEach((option, i) => {
        const y = 230 + i * 50;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 42, 8, { fill: bgColor });
        r.text(40, y + 25, `${String.fromCharCode(65 + i)}. ${option}`, { fill: isSelected ? '#60a5fa' : '#e2e8f0', fontSize: 11 });

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
      r.text(200, 225, score >= 7 ? "Excellent! You've mastered electric fields!" : 'Keep studying! Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      if (score >= 7) {
        r.addButton({ id: 'continue', label: 'Claim Mastery Badge', variant: 'primary' });
      } else {
        r.addButton({ id: 'continue', label: 'Review & Try Again', variant: 'secondary' });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 120, '🏆', { fontSize: 72, textAnchor: 'middle' });

    r.text(200, 200, 'Electric Field Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand how charges create fields!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    const concepts = [
      { icon: '⚡', label: 'E = kq/r²' },
      { icon: '📐', label: 'Field Lines' },
      { icon: '➕➖', label: 'Dipoles' },
      { icon: '∑', label: 'Superposition' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 280 + Math.floor(i / 2) * 70;
      r.roundRect(x, y, 135, 55, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 67, y + 22, concept.icon, { fontSize: 18, textAnchor: 'middle' });
      r.text(x + 67, y + 44, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    r.roundRect(50, 440, 300, 70, 12, { fill: 'rgba(59, 130, 246, 0.2)' });
    r.text(200, 468, 'Key Formula', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 495, 'E = kq/r² (inverse square law)', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering electric field mapping!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      charges: this.charges,
      probeX: this.probeX,
      probeY: this.probeY,
      showFieldLines: this.showFieldLines,
      showVectors: this.showVectors,
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
    if (state.charges) this.charges = state.charges as Charge[];
    if (state.probeX !== undefined) this.probeX = state.probeX as number;
    if (state.probeY !== undefined) this.probeY = state.probeY as number;
    if (state.showFieldLines !== undefined) this.showFieldLines = state.showFieldLines as boolean;
    if (state.showVectors !== undefined) this.showVectors = state.showVectors as boolean;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createElectricFieldMappingGame(sessionId: string): ElectricFieldMappingGame {
  return new ElectricFieldMappingGame(sessionId);
}
