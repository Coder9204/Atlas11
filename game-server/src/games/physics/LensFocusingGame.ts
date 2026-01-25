import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// LENS FOCUSING GAME - SERVER-SIDE PHYSICS SIMULATION
// ============================================================================
// Physics: Thin Lens Equation: 1/f = 1/do + 1/di
// Magnification: M = -di/do = hi/ho
// Converging (convex) lens: f > 0, Diverging (concave) lens: f < 0
// Real image: di > 0 (opposite side), Virtual image: di < 0 (same side)
// ============================================================================

type GamePhase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface TestQuestion {
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number;
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
const DEFAULT_FOCAL_LENGTH = 100; // mm

export class LensFocusingGame extends BaseGame {
  readonly gameType = 'lens_focusing';
  readonly gameTitle = 'Lens Focusing: The Thin Lens Equation';

  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  private focalLength = 100; // mm
  private objectDistance = 200; // mm
  private animationTime = 0;

  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "A photographer is taking a portrait and wants the subject's face to fill more of the frame without moving closer.",
      question: "What should they do to magnify the image?",
      options: [
        "Use a lens with a shorter focal length",
        "Use a lens with a longer focal length",
        "Move the camera farther from the subject",
        "Use a smaller aperture"
      ],
      correctIndex: 1,
      explanation: "A longer focal length lens provides greater magnification. Telephoto lenses (long f) magnify distant subjects."
    },
    {
      scenario: "An optometrist is fitting glasses for a nearsighted patient who can only focus on objects within 50cm.",
      question: "What type of lens correction is needed?",
      options: [
        "Converging lens to add focusing power",
        "Diverging lens to reduce focusing power",
        "Cylindrical lens for astigmatism",
        "No lens - just eye exercises"
      ],
      correctIndex: 1,
      explanation: "Nearsightedness (myopia) means the eye focuses images in front of the retina. Diverging lenses (negative power) spread light before it enters the eye."
    },
    {
      scenario: "A scientist uses a magnifying glass (f = 10cm) to examine a specimen. The specimen is placed 5cm from the lens.",
      question: "What kind of image will form?",
      options: [
        "Real, inverted, smaller image",
        "Real, inverted, larger image",
        "Virtual, upright, larger image",
        "No image forms"
      ],
      correctIndex: 2,
      explanation: "When object distance < focal length, the lens creates a virtual, upright, magnified image. This is how magnifying glasses work!"
    },
    {
      scenario: "A projector needs to display a small slide as a large image on a distant screen.",
      question: "Where should the slide be placed relative to the lens focal point?",
      options: [
        "At the focal point",
        "Between the lens and focal point",
        "Just beyond the focal point",
        "Very far from the lens"
      ],
      correctIndex: 2,
      explanation: "Placing the object just beyond f creates a real, inverted, magnified image at a large distance. This is the projector principle."
    },
    {
      scenario: "A camera has an autofocus system that adjusts the lens position to create sharp images.",
      question: "What is the autofocus actually doing?",
      options: [
        "Changing the lens focal length",
        "Adjusting lens position so 1/f = 1/do + 1/di is satisfied with di at the sensor",
        "Changing the sensor size",
        "Adjusting the aperture size"
      ],
      correctIndex: 1,
      explanation: "Autofocus moves the lens so that for the current object distance, the image forms exactly at the sensor plane."
    },
    {
      scenario: "A farsighted person (+2.0 diopter prescription) can't focus on nearby objects.",
      question: "What is their glasses' focal length?",
      options: [
        "2.0 meters (converging)",
        "0.5 meters (converging)",
        "-0.5 meters (diverging)",
        "-2.0 meters (diverging)"
      ],
      correctIndex: 1,
      explanation: "Diopters = 1/focal length in meters. +2.0 D means f = 1/2 = 0.5m converging lens to help focus near objects."
    },
    {
      scenario: "A telescope uses two lenses: an objective (large f) and an eyepiece (small f).",
      question: "Why does this combination magnify distant objects?",
      options: [
        "The large lens collects more light",
        "Angular magnification = f_objective / f_eyepiece",
        "The lenses cancel out aberrations",
        "Two lenses are always better than one"
      ],
      correctIndex: 1,
      explanation: "Telescope magnification equals the ratio of focal lengths. A 1000mm objective with 10mm eyepiece gives 100x magnification."
    },
    {
      scenario: "A microscope creates highly magnified images of tiny specimens.",
      question: "How does it achieve such high magnification?",
      options: [
        "Uses a single very powerful lens",
        "Objective creates magnified real image, eyepiece magnifies that further",
        "Uses mirrors instead of lenses",
        "The specimen is placed at infinity"
      ],
      correctIndex: 1,
      explanation: "Compound microscopes use two-stage magnification: objective lens (placed just beyond f from specimen) creates enlarged real image, eyepiece acts as magnifier."
    },
    {
      scenario: "A reading glass has focal length f = 25cm. You hold a book 20cm from the lens.",
      question: "Where does the virtual image appear?",
      options: [
        "100cm on the same side as the book",
        "100cm on the opposite side",
        "At infinity",
        "No image forms"
      ],
      correctIndex: 0,
      explanation: "Using 1/f = 1/do + 1/di: 1/25 = 1/20 + 1/di, so 1/di = 1/25 - 1/20 = -1/100, di = -100cm (virtual, same side)."
    },
    {
      scenario: "Laser eye surgery reshapes the cornea to change its focusing power.",
      question: "For a nearsighted person, what change is made?",
      options: [
        "Cornea is made more curved (stronger focusing)",
        "Cornea is flattened (weaker focusing)",
        "Cornea thickness is increased",
        "The lens inside the eye is removed"
      ],
      correctIndex: 1,
      explanation: "LASIK flattens the cornea for myopia, reducing its focusing power so images form on (not in front of) the retina."
    }
  ];

  private readonly transferApps: TransferApp[] = [
    {
      icon: "👓",
      title: "Eyeglasses & Contact Lenses",
      tagline: "Correcting vision with precise focal lengths",
      description: "Glasses add or subtract focusing power to shift images onto the retina. Power is measured in diopters (1/f in meters).",
      connection: "A -3D prescription means f = -33cm diverging lens for nearsightedness."
    },
    {
      icon: "📷",
      title: "Camera Lenses",
      tagline: "Focal length controls field of view and magnification",
      description: "50mm is 'normal' (like human vision). 24mm is wide-angle. 200mm telephoto magnifies distant subjects.",
      connection: "Autofocus adjusts lens position to satisfy 1/f = 1/do + 1/di at the sensor."
    },
    {
      icon: "🔬",
      title: "Microscopes",
      tagline: "Two-stage magnification reveals the invisible",
      description: "Objective lens creates magnified real image, eyepiece magnifies further. Total magnification = M_obj × M_eye.",
      connection: "Specimen placed just beyond objective's focal point creates large intermediate image."
    },
    {
      icon: "🔭",
      title: "Telescopes",
      tagline: "Bringing distant worlds into view",
      description: "Large objective focal length divided by small eyepiece focal length gives angular magnification.",
      connection: "M = f_objective / f_eyepiece. A 1000mm/10mm system gives 100x magnification."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate image distance using thin lens equation
  private calculateImageDistance(objectDist: number, focalLen: number): number {
    // 1/f = 1/do + 1/di => di = (f * do) / (do - f)
    if (objectDist === focalLen) return Infinity;
    return (focalLen * objectDist) / (objectDist - focalLen);
  }

  // PROTECTED: Calculate magnification
  private calculateMagnification(objectDist: number, imageDist: number): number {
    return -imageDist / objectDist;
  }

  private checkAnswer(questionIndex: number, answerIndex: number): boolean {
    return this.testQuestions[questionIndex].correctIndex === answerIndex;
  }

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
      if (input.id === 'object_distance') {
        this.objectDistance = Math.max(20, Math.min(400, input.value));
      } else if (input.id === 'focal_length') {
        this.focalLength = Math.max(30, Math.min(200, input.value));
      }
    }
  }

  private handleButtonClick(buttonId: string): void {
    switch (this.phase) {
      case 'hook':
        if (buttonId === 'discover') this.phase = 'predict';
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
        if (buttonId === 'continue') this.phase = 'review';
        break;
      case 'review':
        if (buttonId === 'continue') this.phase = 'twist_predict';
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
        if (buttonId === 'continue') this.phase = 'twist_review';
        break;
      case 'twist_review':
        if (buttonId === 'continue') this.phase = 'transfer';
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
            this.testAnswers[this.currentQuestionIndex] = parseInt(buttonId.split('_')[1]);
          } else if (buttonId === 'next_question' && this.currentQuestionIndex < 9) {
            this.currentQuestionIndex++;
          } else if (buttonId === 'prev_question' && this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
          } else if (buttonId === 'submit' && !this.testAnswers.includes(-1)) {
            this.showTestResults = true;
          }
        } else if (buttonId === 'continue') {
          if (this.calculateScore() >= 7) {
            this.phase = 'mastery';
          } else {
            this.showTestResults = false;
            this.testAnswers = Array(10).fill(-1);
            this.currentQuestionIndex = 0;
            this.phase = 'review';
          }
        }
        break;
      case 'mastery':
        if (buttonId === 'restart') this.resetGame();
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
    this.objectDistance = 200;
    this.focalLength = 100;
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
    r.clear('#0a0f1a');
    r.circle(100, 100, 150, { fill: 'rgba(96, 165, 250, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(129, 140, 248, 0.05)' });

    switch (this.phase) {
      case 'hook': this.renderHook(r); break;
      case 'predict': this.renderPredict(r); break;
      case 'play': this.renderPlay(r); break;
      case 'review': this.renderReview(r); break;
      case 'twist_predict': this.renderTwistPredict(r); break;
      case 'twist_play': this.renderTwistPlay(r); break;
      case 'twist_review': this.renderTwistReview(r); break;
      case 'transfer': this.renderTransfer(r); break;
      case 'test': this.renderTest(r); break;
      case 'mastery': this.renderMastery(r); break;
    }

    this.renderProgress(r);
    return r.toFrame(Math.floor(this.animationTime * 60));
  }

  private renderProgress(r: CommandRenderer): void {
    const phases: GamePhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    r.setProgress({
      id: 'phase_progress',
      current: phases.indexOf(this.phase) + 1,
      total: phases.length,
      labels: phases
    });
  }

  private renderHook(r: CommandRenderer): void {
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(96, 165, 250, 0.1)' });
    r.text(200, 80, 'OPTICS EXPLORATION', { fill: '#60a5fa', fontSize: 10, textAnchor: 'middle' });

    r.text(200, 130, 'The Magic of Lenses', { fill: '#ffffff', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'How do lenses create images?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    r.text(200, 240, '🔍', { fontSize: 64, textAnchor: 'middle' });

    r.roundRect(40, 290, 320, 160, 16, { fill: 'rgba(30, 41, 59, 0.8)' });
    r.text(200, 325, 'A simple magnifying glass can:', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 355, 'Project images • Magnify objects', { fill: '#60a5fa', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 385, 'Start fires • Correct vision', { fill: '#60a5fa', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 420, 'All from a curved piece of glass!', { fill: '#94a3b8', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 445, 'What equation governs it all?', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'discover', label: 'Discover Lens Physics', variant: 'primary' });
    r.setCoachMessage('Learn how lenses bend light to create images!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 60, 'Make Your Prediction', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(25, 90, 350, 85, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 115, 'You hold a magnifying glass between', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 135, 'a candle and a wall. When is the', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 158, 'image on the wall sharpest?', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const options = [
      'Lens exactly halfway between candle and wall',
      'At a distance depending on focal length',
      'Any distance works equally well',
      'Closer to candle is always sharper'
    ];

    options.forEach((opt, i) => {
      const y = 190 + i * 58;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';
      if (this.showPredictionFeedback) {
        if (i === 1) { bgColor = 'rgba(16, 185, 129, 0.3)'; textColor = '#34d399'; }
        else if (i === this.prediction) { bgColor = 'rgba(239, 68, 68, 0.3)'; textColor = '#f87171'; }
      } else if (i === this.prediction) {
        bgColor = 'rgba(96, 165, 250, 0.3)';
      }
      r.roundRect(25, y, 350, 50, 10, { fill: bgColor });
      r.text(40, y + 30, `${String.fromCharCode(65 + i)}. ${opt}`, { fill: textColor, fontSize: 12 });
      if (!this.showPredictionFeedback) r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
    });

    if (this.showPredictionFeedback) {
      r.roundRect(25, 430, 350, 85, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const msg = this.prediction === 1 ? 'Exactly right!' : 'The answer depends on focal length!';
      r.text(200, 458, msg, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 485, 'The thin lens equation determines', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 502, 'exactly where images form!', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.addButton({ id: 'continue', label: 'Explore the Lens', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Lens Ray Diagram', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    const di = this.calculateImageDistance(this.objectDistance, this.focalLength);
    const mag = this.calculateMagnification(this.objectDistance, di);
    const isReal = di > 0 && isFinite(di);

    // Visualization area
    r.roundRect(15, 80, 370, 220, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Optical axis
    r.line(30, 190, 370, 190, { stroke: '#475569', strokeWidth: 1 });

    // Lens
    const lensX = 200;
    r.ellipse(lensX, 190, 8, 60, { fill: 'rgba(96, 165, 250, 0.3)', stroke: '#60a5fa', strokeWidth: 2 });

    // Focal points
    r.circle(lensX - this.focalLength * 0.4, 190, 4, { fill: '#fbbf24' });
    r.circle(lensX + this.focalLength * 0.4, 190, 4, { fill: '#fbbf24' });
    r.text(lensX - this.focalLength * 0.4, 210, 'F', { fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' });
    r.text(lensX + this.focalLength * 0.4, 210, "F'", { fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' });

    // Object
    const objX = lensX - this.objectDistance * 0.4;
    const objHeight = 40;
    r.line(objX, 190, objX, 190 - objHeight, { stroke: '#34d399', strokeWidth: 3 });
    r.polygon([[objX - 6, 190 - objHeight + 8], [objX + 6, 190 - objHeight + 8], [objX, 190 - objHeight]], { fill: '#34d399' });

    // Image (if real)
    if (isReal && di < 500) {
      const imgX = lensX + di * 0.4;
      const imgHeight = Math.abs(mag) * objHeight;
      if (imgX < 380) {
        r.line(imgX, 190, imgX, 190 + Math.min(imgHeight, 50), { stroke: '#f472b6', strokeWidth: 3 });
        r.text(imgX, 250, 'Image', { fill: '#f472b6', fontSize: 10, textAnchor: 'middle' });
      }
    }

    // Ray traces (simplified)
    if (isReal && di < 500 && di > 0) {
      const imgX = Math.min(lensX + di * 0.4, 370);
      // Parallel ray through F'
      r.line(objX, 190 - objHeight, lensX, 190 - objHeight, { stroke: 'rgba(96, 165, 250, 0.5)', strokeWidth: 1 });
      r.line(lensX, 190 - objHeight, imgX, 190 + Math.abs(mag) * objHeight * 0.8, { stroke: 'rgba(96, 165, 250, 0.5)', strokeWidth: 1 });
    }

    // Sliders
    r.addSlider({ id: 'object_distance', label: 'Object Distance (mm)', min: 20, max: 400, step: 10, value: this.objectDistance });
    r.addSlider({ id: 'focal_length', label: 'Focal Length (mm)', min: 30, max: 200, step: 10, value: this.focalLength });

    // Results
    r.roundRect(25, 360, 170, 80, 10, { fill: 'rgba(96, 165, 250, 0.1)' });
    r.text(110, 385, 'Image Distance', { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    const diText = isFinite(di) ? `${di.toFixed(0)} mm` : '∞';
    r.text(110, 415, diText, { fill: '#60a5fa', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 435, isReal ? 'Real' : 'Virtual', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(205, 360, 170, 80, 10, { fill: 'rgba(244, 114, 182, 0.1)' });
    r.text(290, 385, 'Magnification', { fill: '#f472b6', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 415, isFinite(mag) ? `${mag.toFixed(2)}×` : '∞', { fill: '#f472b6', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 435, mag < 0 ? 'Inverted' : 'Upright', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Understand the Equation', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 55, 'The Thin Lens Equation', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(25, 80, 350, 130, 16, { fill: 'rgba(96, 165, 250, 0.2)' });
    r.text(200, 110, 'Thin Lens Equation', { fill: '#60a5fa', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.roundRect(60, 125, 280, 40, 8, { fill: 'rgba(15, 23, 42, 0.6)' });
    r.text(200, 152, '1/f = 1/dₒ + 1/dᵢ', { fill: '#ffffff', fontSize: 18, textAnchor: 'middle' });
    r.text(80, 190, 'f = focal length', { fill: '#cbd5e1', fontSize: 11 });
    r.text(220, 190, 'dₒ = object distance', { fill: '#cbd5e1', fontSize: 11 });

    r.roundRect(25, 220, 350, 80, 16, { fill: 'rgba(244, 114, 182, 0.2)' });
    r.text(200, 248, 'Magnification', { fill: '#f472b6', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 278, 'M = -dᵢ/dₒ = hᵢ/hₒ', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.roundRect(25, 315, 350, 120, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 343, 'Sign Conventions', { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 370, 'dᵢ > 0: Real image (opposite side)', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 390, 'dᵢ < 0: Virtual image (same side)', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 410, 'M < 0: Inverted | M > 0: Upright', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore the Twist', variant: 'secondary' });
    r.setCoachMessage("Now let's see what happens inside the focal length...");
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'The Twist: Inside Focal Length', { fill: '#818cf8', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(25, 85, 350, 90, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 115, 'What happens when you place an object', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 138, 'CLOSER than the focal length?', { fill: '#818cf8', fontSize: 15, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, '(Like using a magnifying glass)', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    const options = [
      'No image forms at all',
      'A smaller, inverted image forms',
      'A larger, upright virtual image forms',
      'The image catches fire'
    ];

    options.forEach((opt, i) => {
      const y = 190 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';
      if (this.showTwistFeedback) {
        if (i === 2) { bgColor = 'rgba(16, 185, 129, 0.3)'; textColor = '#34d399'; }
        else if (i === this.twistPrediction) { bgColor = 'rgba(239, 68, 68, 0.3)'; textColor = '#f87171'; }
      } else if (i === this.twistPrediction) {
        bgColor = 'rgba(129, 140, 248, 0.3)';
      }
      r.roundRect(25, y, 350, 48, 10, { fill: bgColor });
      r.text(40, y + 28, `${String.fromCharCode(65 + i)}. ${opt}`, { fill: textColor, fontSize: 12 });
      if (!this.showTwistFeedback) r.addButton({ id: `option_${i}`, label: '', variant: 'secondary' });
    });

    if (this.showTwistFeedback) {
      r.roundRect(25, 420, 350, 85, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const msg = this.twistPrediction === 2 ? 'Correct!' : 'A virtual magnified image!';
      r.text(200, 448, msg, { fill: '#34d399', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 475, "This is how magnifying glasses work!", { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
      r.addButton({ id: 'continue', label: 'See the Virtual Image', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Virtual Image Formation', { fill: '#818cf8', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Set object inside focal length
    const insideF = this.focalLength * 0.6;
    const di = this.calculateImageDistance(insideF, this.focalLength);
    const mag = this.calculateMagnification(insideF, di);

    r.roundRect(15, 75, 370, 200, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Optical axis
    r.line(30, 175, 370, 175, { stroke: '#475569', strokeWidth: 1 });

    // Lens
    const lensX = 200;
    r.ellipse(lensX, 175, 8, 50, { fill: 'rgba(129, 140, 248, 0.3)', stroke: '#818cf8', strokeWidth: 2 });

    // Focal points
    r.circle(lensX - this.focalLength * 0.35, 175, 4, { fill: '#fbbf24' });
    r.text(lensX - this.focalLength * 0.35, 195, 'F', { fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' });

    // Object (inside focal length)
    const objX = lensX - insideF * 0.35;
    const objHeight = 30;
    r.line(objX, 175, objX, 175 - objHeight, { stroke: '#34d399', strokeWidth: 3 });
    r.text(objX, 215, 'Object', { fill: '#34d399', fontSize: 9, textAnchor: 'middle' });

    // Virtual image (same side, larger)
    const imgX = lensX + di * 0.2; // di is negative, so this goes left
    const imgHeight = Math.abs(mag) * objHeight;
    r.line(imgX, 175, imgX, 175 - Math.min(imgHeight, 60), { stroke: '#f472b6', strokeWidth: 2, strokeDasharray: '4,4' });
    r.text(imgX, 215, 'Virtual Image', { fill: '#f472b6', fontSize: 9, textAnchor: 'middle' });

    // Key insight
    r.roundRect(25, 290, 350, 70, 12, { fill: 'rgba(129, 140, 248, 0.2)' });
    r.text(200, 315, 'Object inside focal length:', { fill: '#818cf8', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 340, 'Virtual • Upright • Magnified', { fill: '#ffffff', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Results
    r.roundRect(25, 375, 170, 70, 10, { fill: 'rgba(129, 140, 248, 0.1)' });
    r.text(110, 400, 'Image Distance', { fill: '#818cf8', fontSize: 11, textAnchor: 'middle' });
    r.text(110, 425, `${di.toFixed(0)} mm`, { fill: '#818cf8', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    r.roundRect(205, 375, 170, 70, 10, { fill: 'rgba(244, 114, 182, 0.1)' });
    r.text(290, 400, 'Magnification', { fill: '#f472b6', fontSize: 11, textAnchor: 'middle' });
    r.text(290, 425, `+${Math.abs(mag).toFixed(1)}×`, { fill: '#f472b6', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Understand Virtual Images', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 55, 'Real vs Virtual Images', { fill: '#818cf8', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Real image card
    r.roundRect(25, 85, 170, 140, 12, { fill: 'rgba(96, 165, 250, 0.2)' });
    r.text(110, 110, 'Real Image', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 135, 'dₒ > f', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });
    r.text(110, 160, 'Can project on screen', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 180, 'Inverted', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 200, 'dᵢ > 0', { fill: '#60a5fa', fontSize: 11, textAnchor: 'middle' });

    // Virtual image card
    r.roundRect(205, 85, 170, 140, 12, { fill: 'rgba(244, 114, 182, 0.2)' });
    r.text(290, 110, 'Virtual Image', { fill: '#f472b6', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 135, 'dₒ < f', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });
    r.text(290, 160, "Can't project - only seen", { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 180, 'through lens', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 200, 'dᵢ < 0 (Upright)', { fill: '#f472b6', fontSize: 11, textAnchor: 'middle' });

    // Applications
    r.roundRect(25, 240, 350, 110, 16, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 268, 'Applications', { fill: '#fbbf24', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 295, 'Real: Projectors, Cameras, Eyes', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 320, 'Virtual: Magnifying glass, Reading glasses', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 55, 'Real-World Applications', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#60a5fa';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';
      r.roundRect(x, 80, 80, 45, 8, { fill: bgColor });
      r.text(x + 40, 108, app.icon, { fontSize: 20, textAnchor: 'middle' });
      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 140, 350, 280, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 175, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 200, app.tagline, { fill: '#60a5fa', fontSize: 11, textAnchor: 'middle' });

    const words = app.description.split(' ');
    let line = '', lineY = 230;
    words.forEach(word => {
      if ((line + word).length > 45) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else line += word + ' ';
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.roundRect(40, 310, 320, 60, 10, { fill: 'rgba(96, 165, 250, 0.2)' });
    r.text(200, 335, 'Physics Connection', { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 358, app.connection.substring(0, 50) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

    if (!this.completedApps.has(this.activeAppIndex)) {
      r.addButton({ id: 'mark_understood', label: '✓ Mark as Understood', variant: 'secondary' });
    } else {
      r.text(200, 400, '✓ Completed!', { fill: '#10b981', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    }

    r.text(200, 440, `Progress: ${this.completedApps.size}/4`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

    if (this.completedApps.size >= 4) {
      r.addButton({ id: 'continue', label: 'Take Knowledge Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (!this.showTestResults) {
      r.text(200, 55, 'Knowledge Assessment', { fill: '#ffffff', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 82, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const q = this.testQuestions[this.currentQuestionIndex];
      r.roundRect(25, 100, 350, 80, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

      const scenarioWords = q.scenario.split(' ');
      let sLine = '', sY = 120;
      scenarioWords.forEach(w => {
        if ((sLine + w).length > 50) {
          r.text(200, sY, sLine.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
          sLine = w + ' ';
          sY += 16;
        } else sLine += w + ' ';
      });
      if (sLine) r.text(200, sY, sLine.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

      r.text(200, 200, q.question, { fill: '#60a5fa', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      q.options.forEach((opt, i) => {
        const y = 225 + i * 50;
        const selected = this.testAnswers[this.currentQuestionIndex] === i;
        r.roundRect(25, y, 350, 44, 8, { fill: selected ? 'rgba(96, 165, 250, 0.3)' : 'rgba(51, 65, 85, 0.5)' });
        r.text(40, y + 26, `${String.fromCharCode(65 + i)}. ${opt.substring(0, 42)}${opt.length > 42 ? '...' : ''}`, { fill: selected ? '#60a5fa' : '#e2e8f0', fontSize: 11 });
        r.addButton({ id: `answer_${i}`, label: '', variant: 'secondary' });
      });

      if (this.currentQuestionIndex > 0) r.addButton({ id: 'prev_question', label: '← Previous', variant: 'secondary' });
      if (this.currentQuestionIndex < 9) r.addButton({ id: 'next_question', label: 'Next →', variant: 'secondary' });

      const answered = this.testAnswers.filter(a => a !== -1).length;
      if (answered === 10) r.addButton({ id: 'submit', label: 'Submit Answers', variant: 'primary' });
      else r.text(200, 470, `${answered}/10 answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    } else {
      const score = this.calculateScore();
      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? '🏆' : '📚', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? 'You understand lens optics!' : 'Review and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      r.roundRect(30, 280, 340, 130, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 308, 'Key Concepts:', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 335, '1/f = 1/dₒ + 1/dᵢ', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 358, 'Real vs Virtual images', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 381, 'Magnification = -dᵢ/dₒ', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: score >= 7 ? 'Claim Mastery Badge' : 'Review & Try Again', variant: score >= 7 ? 'primary' : 'secondary' });
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 100, '🔍', { fontSize: 72, textAnchor: 'middle' });
    r.text(200, 180, 'Lens Optics Master!', { fill: '#ffffff', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 215, 'You understand how lenses bend light', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 238, 'to create images!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    const badges = [
      { icon: '📐', label: '1/f = 1/dₒ + 1/dᵢ' },
      { icon: '🔍', label: 'Magnification' },
      { icon: '👁️', label: 'Real vs Virtual' },
      { icon: '📷', label: 'Camera Optics' }
    ];
    badges.forEach((b, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 280 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, b.icon, { fontSize: 20, textAnchor: 'middle' });
      r.text(x + 70, y + 48, b.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    r.roundRect(50, 445, 300, 65, 12, { fill: 'rgba(96, 165, 250, 0.2)' });
    r.text(200, 470, 'Key Formula', { fill: '#60a5fa', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 495, '1/f = 1/dₒ + 1/dᵢ', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });
    r.setCoachMessage('Congratulations on mastering lens optics!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      objectDistance: this.objectDistance,
      focalLength: this.focalLength,
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
    if (state.objectDistance !== undefined) this.objectDistance = state.objectDistance as number;
    if (state.focalLength !== undefined) this.focalLength = state.focalLength as number;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createLensFocusingGame(sessionId: string): LensFocusingGame {
  return new LensFocusingGame(sessionId);
}
