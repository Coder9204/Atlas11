import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// LAW OF REFLECTION GAME - SERVER-SIDE OPTICS SIMULATION
// ============================================================================
// Physics: Angle of Incidence = Angle of Reflection (theta_i = theta_r)
// Both angles measured from the normal to the surface
// Works for all reflective surfaces (mirrors, water, metal)
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

export class LawOfReflectionGame extends BaseGame {
  readonly gameType = 'law_of_reflection';
  readonly gameTitle = 'Law of Reflection: Light Bounces Back';

  // Game state
  private phase: GamePhase = 'hook';
  private prediction: number | null = null;
  private twistPrediction: number | null = null;
  private showPredictionFeedback = false;
  private showTwistFeedback = false;

  // Simulation parameters
  private incidentAngle = 45; // degrees from normal
  private showNormal = true;
  private showAngles = true;
  private surfaceType: 'smooth' | 'rough' = 'smooth';
  private animationTime = 0;

  // Corner reflector mode
  private cornerReflectorMode = false;
  private numReflections = 2;

  // Test and transfer state
  private testAnswers: number[] = Array(10).fill(-1);
  private currentQuestionIndex = 0;
  private showTestResults = false;
  private activeAppIndex = 0;
  private completedApps: Set<number> = new Set();

  // Test questions with PROTECTED correct answers
  private readonly testQuestions: TestQuestion[] = [
    {
      scenario: "You're standing in front of a flat bathroom mirror, 1 meter away from it. Your eyes are at the same height as a point on the mirror.",
      question: "At what angle should light leave your face to hit that point and reflect back to your eyes?",
      options: [
        "0 degrees from normal - light must hit perpendicular to return",
        "45 degrees - halfway between horizontal and vertical",
        "90 degrees - light travels parallel to the mirror",
        "Any angle works for a flat mirror"
      ],
      correctIndex: 0,
      explanation: "For light to return to your eyes from a flat mirror, it must hit perpendicular (0 degrees from normal). At any other angle, theta_i = theta_r means light reflects away at the same angle on the other side."
    },
    {
      scenario: "A submarine uses a periscope with two mirrors, each angled at 45 degrees to the vertical, to see above the water surface.",
      question: "Why must both mirrors be at exactly 45 degrees for the periscope to work correctly?",
      options: [
        "45 degree mirrors turn light exactly 90 degrees (theta_i = theta_r = 45 deg)",
        "45 degrees is the critical angle for total internal reflection",
        "Other angles would make the image too dim",
        "45 degrees prevents the glass from shattering underwater"
      ],
      correctIndex: 0,
      explanation: "At 45 degrees incidence, light reflects at 45 degrees on the other side of the normal. The total deviation is 90 degrees, making the light travel horizontally then vertically (or vice versa)."
    },
    {
      scenario: "A laser beam hits a plane mirror. The incident ray makes a 30 degree angle with the mirror surface (not the normal).",
      question: "At what angle from the mirror surface does the reflected ray travel?",
      options: [
        "30 degrees from the surface (60 degrees from normal reflects to 60 degrees)",
        "60 degrees from the surface (opposite of incident)",
        "90 degrees minus 30 degrees = 60 degrees from surface",
        "30 degrees from the surface because angles are measured from surface"
      ],
      correctIndex: 0,
      explanation: "If the incident ray is 30 degrees from the surface, it's 60 degrees from the normal. By theta_i = theta_r, it reflects 60 degrees from normal on the other side, which is also 30 degrees from the surface."
    },
    {
      scenario: "A corner reflector (two perpendicular mirrors) is used on the Moon for laser ranging experiments. Earth scientists aim a laser at it.",
      question: "Why does a corner reflector always send light back to its source, regardless of the incoming angle?",
      options: [
        "Two reflections off perpendicular surfaces reverse the light direction",
        "The Moon's gravity bends light back",
        "Special coatings redirect the laser",
        "Only works at specific angles"
      ],
      correctIndex: 0,
      explanation: "A 2D corner reflector (or 3D retroreflector) works because each reflection adds an angle change. With perpendicular mirrors, two reflections always produce exactly 180 degrees total deviation, sending light back parallel to incoming."
    },
    {
      scenario: "You see your reflection in a calm lake. The Sun appears as a bright spot on the water some distance away from you.",
      question: "If you move 2 meters further from the lake, what happens to the Sun's reflection position?",
      options: [
        "The reflection moves further from you too - the geometry changes",
        "The reflection stays in exactly the same spot on the water",
        "The reflection gets dimmer but stays in place",
        "The reflection disappears completely"
      ],
      correctIndex: 0,
      explanation: "The position where you see the Sun's reflection depends on the geometry of your eyes, the water surface, and the Sun. As you move, the reflection point on the water surface that satisfies theta_i = theta_r changes."
    },
    {
      scenario: "A beam of white light hits a silver mirror at 35 degrees from the normal.",
      question: "At what angle do the different colors (red, green, blue) in the white light reflect?",
      options: [
        "All colors reflect at exactly 35 degrees - reflection doesn't depend on wavelength",
        "Red reflects at larger angles because it has longer wavelength",
        "Blue reflects at larger angles because it has more energy",
        "Colors separate like in a prism"
      ],
      correctIndex: 0,
      explanation: "The law of reflection (theta_i = theta_r) is independent of wavelength. All colors reflect at exactly the same angle. Dispersion (color separation) only occurs with refraction, not reflection."
    },
    {
      scenario: "A security guard uses a mirror angled at 45 degrees in a hallway corner to see around it. A thief approaches from a corridor perpendicular to the guard's view.",
      question: "At what angle must light from the thief hit the mirror to reach the guard's eyes?",
      options: [
        "45 degrees from normal on the thief's side, reflecting 45 degrees toward the guard",
        "0 degrees - light must hit straight on",
        "90 degrees - light grazes the mirror",
        "The guard cannot see the thief with a single mirror"
      ],
      correctIndex: 0,
      explanation: "For the guard to see down the perpendicular corridor, light must turn 90 degrees. With a 45 degree mirror, light hitting at 45 degrees from normal reflects 45 degrees on the other side, total turn = 90 degrees."
    },
    {
      scenario: "You hold two flat mirrors at an angle to each other and look at your reflection. You notice you see multiple images of yourself.",
      question: "How does the number of reflections relate to the angle between the mirrors?",
      options: [
        "More images form with smaller angles: n = 360/theta - 1 (for even result)",
        "Larger angles create more images due to more surface area",
        "The number is always exactly 2, one per mirror",
        "Images only form when mirrors are perpendicular"
      ],
      correctIndex: 0,
      explanation: "The formula n = (360/theta) - 1 gives the number of images when 360/theta is even. At 90 degrees: 360/90 - 1 = 3 images. At 60 degrees: 360/60 - 1 = 5 images. Each image is from a different reflection path."
    },
    {
      scenario: "A photographer wants to take a photo of themselves in a mirror. They stand 2 meters from the mirror.",
      question: "Where must they focus their camera to get a sharp image of their reflection?",
      options: [
        "4 meters away - the image appears as far behind the mirror as they are in front",
        "2 meters - focus on the mirror surface",
        "1 meter - halfway to the mirror",
        "Infinity - reflections are always in focus"
      ],
      correctIndex: 0,
      explanation: "A plane mirror creates a virtual image that appears the same distance behind the mirror as the object is in front. At 2m from mirror, the image appears 2m behind it, so total distance = 4m."
    },
    {
      scenario: "An engineer designs a solar cooker using a parabolic mirror. Sunlight comes in nearly parallel rays.",
      question: "How does the law of reflection help concentrate sunlight at the focal point?",
      options: [
        "Each part of the curved surface reflects light (theta_i = theta_r) toward the focus",
        "The mirror absorbs light and redirects it chemically",
        "Only the center of the mirror matters for focusing",
        "Parabolic mirrors refract rather than reflect"
      ],
      correctIndex: 0,
      explanation: "A parabolic mirror is shaped so that for every point on the surface, parallel rays hitting at some theta_i reflect at theta_r toward the same focal point. The law applies locally at each infinitesimal surface patch."
    }
  ];

  // Transfer applications
  private readonly transferApps: TransferApp[] = [
    {
      icon: "mirror",
      title: "Bathroom Mirrors",
      tagline: "Why your reflection seems to be behind the mirror",
      description: "When you look in a mirror, light from your face hits the surface and reflects back to your eyes following theta_i = theta_r. Your brain traces these rays backward in straight lines, perceiving the image behind the mirror.",
      connection: "The 'virtual image' appears exactly as far behind the mirror as you stand in front of it. This is why you can never touch your reflection - it's a geometric projection, not a physical object."
    },
    {
      icon: "periscope",
      title: "Periscopes",
      tagline: "Seeing around corners since submarines started diving",
      description: "Periscopes use two 45-degree mirrors to redirect light 90 degrees twice, allowing submariners to see above the water while staying hidden below.",
      connection: "Each mirror applies theta_i = theta_r: light hitting at 45 degrees from normal reflects at 45 degrees on the other side. Two such reflections turn the light path 90 + 90 = 180 degrees total, but in offset parallel planes."
    },
    {
      icon: "reflector",
      title: "Road Safety Reflectors",
      tagline: "Corner cubes send light back to car headlights",
      description: "Retroreflectors on road signs and bicycle reflectors use corner cube geometry (three perpendicular mirrors) to send headlight beams back toward the driver, not scattered in all directions.",
      connection: "Three perpendicular reflections (theta_i = theta_r applied three times) perfectly reverse any incoming light direction. This is why reflectors 'glow' in headlights - they return light efficiently to the source."
    },
    {
      icon: "kaleidoscope",
      title: "Kaleidoscopes",
      tagline: "Infinite beauty from finite pieces",
      description: "Kaleidoscopes use multiple mirrors at specific angles to create symmetrical patterns. The angle between mirrors determines how many reflections you see.",
      connection: "With mirrors at 60 degrees, you see 5 images (360/60 - 1). At 45 degrees, 7 images. The law of reflection applies at each mirror surface, creating the beautiful symmetric patterns from a few random objects."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // PROTECTED: Calculate reflected angle (always equals incident angle from normal)
  private calculateReflectedAngle(): number {
    return this.incidentAngle; // theta_r = theta_i
  }

  // PROTECTED: Calculate multiple reflection path for corner reflector
  private calculateCornerReflectionPath(): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    // Start point
    let x = 50;
    let y = 50;
    let angleRad = (this.incidentAngle * Math.PI) / 180;

    points.push({ x, y });

    for (let i = 0; i < this.numReflections; i++) {
      // Move toward next mirror
      const dx = Math.cos(angleRad) * 100;
      const dy = Math.sin(angleRad) * 100;
      x += dx;
      y += dy;
      points.push({ x, y });

      // Reflect (flip angle component)
      if (i % 2 === 0) {
        // Reflect off horizontal surface
        angleRad = -angleRad;
      } else {
        // Reflect off vertical surface
        angleRad = Math.PI - angleRad;
      }
    }

    // Final exit ray
    const dx = Math.cos(angleRad) * 80;
    const dy = Math.sin(angleRad) * 80;
    points.push({ x: x + dx, y: y + dy });

    return points;
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
      if (input.id === 'incident_angle') {
        this.incidentAngle = Math.max(0, Math.min(85, input.value));
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
        if (buttonId === 'toggle_normal') {
          this.showNormal = !this.showNormal;
        } else if (buttonId === 'toggle_angles') {
          this.showAngles = !this.showAngles;
        } else if (buttonId === 'surface_smooth') {
          this.surfaceType = 'smooth';
        } else if (buttonId === 'surface_rough') {
          this.surfaceType = 'rough';
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
          this.cornerReflectorMode = true;
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

  private resetGame(): void {
    this.phase = 'hook';
    this.prediction = null;
    this.twistPrediction = null;
    this.showPredictionFeedback = false;
    this.showTwistFeedback = false;
    this.incidentAngle = 45;
    this.showNormal = true;
    this.showAngles = true;
    this.surfaceType = 'smooth';
    this.cornerReflectorMode = false;
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
    r.circle(100, 100, 150, { fill: 'rgba(251, 191, 36, 0.05)' });
    r.circle(300, 600, 150, { fill: 'rgba(245, 158, 11, 0.05)' });

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
    r.roundRect(130, 60, 140, 30, 8, { fill: 'rgba(251, 191, 36, 0.1)' });
    r.text(200, 80, 'OPTICS FUNDAMENTALS', { fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' });

    // Title
    r.text(200, 130, 'Law of Reflection', { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 160, 'Why mirrors show you...you', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Mirror visual
    r.roundRect(40, 190, 320, 180, 16, { fill: 'rgba(30, 41, 59, 0.8)' });

    // Mirror surface
    r.rect(100, 280, 200, 8, { fill: '#94a3b8' });

    // Incident ray
    const incidentEndX = 200;
    const incidentEndY = 280;
    const incidentStartX = 100;
    const incidentStartY = 200;
    r.line(incidentStartX, incidentStartY, incidentEndX, incidentEndY, { stroke: '#fbbf24', strokeWidth: 3 });

    // Reflected ray
    const reflectedEndX = 300;
    const reflectedEndY = 200;
    r.line(incidentEndX, incidentEndY, reflectedEndX, reflectedEndY, { stroke: '#f59e0b', strokeWidth: 3 });

    // Normal line
    r.line(200, 280, 200, 210, { stroke: '#64748b', strokeWidth: 2, strokeDasharray: '5,5' });

    r.text(200, 340, 'theta_i = theta_r', { fill: '#fbbf24', fontSize: 20, fontWeight: 'bold', textAnchor: 'middle' });

    // Fun fact
    r.roundRect(40, 390, 320, 80, 16, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 420, 'This simple law explains everything from', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 445, 'bathroom mirrors to laser range finding!', { fill: '#fbbf24', fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // CTA button
    r.addButton({ id: 'discover', label: 'Explore Reflection', variant: 'primary' });

    r.setCoachMessage('Discover the beautiful simplicity of how light bounces!');
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 55, 'Make Your Prediction', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario card
    r.roundRect(30, 85, 340, 110, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 115, 'A laser beam hits a mirror at 30 degrees', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 135, 'from the normal (perpendicular) line.', { fill: '#cbd5e1', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 175, 'At what angle does the beam reflect?', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      '30 degrees on the other side of normal',
      '60 degrees (90 - 30)',
      '15 degrees (30 / 2)',
      'Depends on the color of the laser'
    ];

    options.forEach((option, i) => {
      const y = 205 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showPredictionFeedback) {
        if (i === 0) { // Correct answer
          bgColor = 'rgba(16, 185, 129, 0.3)';
          textColor = '#34d399';
        } else if (i === this.prediction) {
          bgColor = 'rgba(239, 68, 68, 0.3)';
          textColor = '#f87171';
        }
      } else if (i === this.prediction) {
        bgColor = 'rgba(251, 191, 36, 0.3)';
      }

      r.roundRect(30, y, 340, 48, 10, { fill: bgColor });
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showPredictionFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showPredictionFeedback) {
      r.roundRect(30, 440, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.prediction === 0 ? 'Perfect! You understand the law of reflection.' : 'Not quite. The reflected angle equals the incident angle!';
      r.text(200, 470, message, { fill: this.prediction === 0 ? '#34d399' : '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 500, 'theta_i = theta_r (both measured from normal)', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 520, 'This is true for ALL colors and surfaces!', { fill: '#fbbf24', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'Explore the Mirror', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(200, 45, 'Reflection Lab', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    const reflectedAngle = this.calculateReflectedAngle();

    // Mirror visualization
    r.roundRect(20, 65, 360, 200, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Mirror surface
    const mirrorY = 200;
    r.rect(50, mirrorY, 300, 10, { fill: '#94a3b8' });

    // Center point
    const centerX = 200;
    const centerY = mirrorY;

    // Normal line (if enabled)
    if (this.showNormal) {
      r.line(centerX, centerY, centerX, centerY - 110, { stroke: '#64748b', strokeWidth: 2, strokeDasharray: '5,5' });
      r.text(centerX + 10, centerY - 100, 'Normal', { fill: '#64748b', fontSize: 10 });
    }

    // Calculate ray endpoints
    const rayLength = 120;
    const incidentRad = (this.incidentAngle * Math.PI) / 180;

    // Incident ray (from upper left toward center)
    const incidentStartX = centerX - rayLength * Math.sin(incidentRad);
    const incidentStartY = centerY - rayLength * Math.cos(incidentRad);
    r.line(incidentStartX, incidentStartY, centerX, centerY, { stroke: '#fbbf24', strokeWidth: 3 });
    // Arrowhead for incident
    r.circle(centerX - 10 * Math.sin(incidentRad), centerY - 10 * Math.cos(incidentRad), 4, { fill: '#fbbf24' });

    // Reflected ray (from center toward upper right)
    const reflectedRad = (reflectedAngle * Math.PI) / 180;
    const reflectedEndX = centerX + rayLength * Math.sin(reflectedRad);
    const reflectedEndY = centerY - rayLength * Math.cos(reflectedRad);
    r.line(centerX, centerY, reflectedEndX, reflectedEndY, { stroke: '#f59e0b', strokeWidth: 3 });
    // Arrowhead for reflected
    r.circle(reflectedEndX, reflectedEndY, 5, { fill: '#f59e0b' });

    // Angle arcs and labels (if enabled)
    if (this.showAngles) {
      // Incident angle arc
      r.arc(centerX, centerY, 30, -Math.PI / 2 - incidentRad, -Math.PI / 2, { stroke: '#fbbf24', strokeWidth: 2, fill: 'transparent' });
      r.text(centerX - 45, centerY - 40, `${this.incidentAngle}deg`, { fill: '#fbbf24', fontSize: 11 });

      // Reflected angle arc
      r.arc(centerX, centerY, 35, -Math.PI / 2, -Math.PI / 2 + reflectedRad, { stroke: '#f59e0b', strokeWidth: 2, fill: 'transparent' });
      r.text(centerX + 35, centerY - 40, `${reflectedAngle}deg`, { fill: '#f59e0b', fontSize: 11 });
    }

    // Labels
    r.text(incidentStartX - 10, incidentStartY - 5, 'Incident', { fill: '#fbbf24', fontSize: 10 });
    r.text(reflectedEndX + 5, reflectedEndY - 5, 'Reflected', { fill: '#f59e0b', fontSize: 10 });

    // Result display
    r.roundRect(100, 230, 200, 30, 8, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 250, `theta_i = theta_r = ${this.incidentAngle}deg`, { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Slider
    r.addSlider({ id: 'incident_angle', label: 'Incident Angle (degrees)', min: 0, max: 85, step: 5, value: this.incidentAngle });

    // Toggle buttons
    r.addButton({ id: 'toggle_normal', label: this.showNormal ? 'Hide Normal' : 'Show Normal', variant: 'secondary' });
    r.addButton({ id: 'toggle_angles', label: this.showAngles ? 'Hide Angles' : 'Show Angles', variant: 'secondary' });

    // Surface type
    r.text(200, 380, 'Surface Type:', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    const surfaces = [
      { id: 'smooth', label: 'Smooth Mirror', x: 120 },
      { id: 'rough', label: 'Rough Surface', x: 280 }
    ];
    surfaces.forEach(s => {
      const isSelected = this.surfaceType === s.id;
      r.roundRect(s.x - 60, 395, 120, 30, 8, { fill: isSelected ? '#f59e0b' : 'rgba(51, 65, 85, 0.5)' });
      r.text(s.x, 415, s.label, { fill: '#ffffff', fontSize: 11, textAnchor: 'middle' });
      r.addButton({ id: `surface_${s.id}`, label: '', variant: 'secondary' });
    });

    if (this.surfaceType === 'rough') {
      r.text(200, 450, 'Rough surfaces scatter light in many directions', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
      r.text(200, 465, '(diffuse reflection) but law still applies locally!', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    }

    r.addButton({ id: 'continue', label: 'Learn the Physics', variant: 'primary' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 50, 'The Law of Reflection', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Main equation
    r.roundRect(50, 75, 300, 70, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 100, 'theta_i = theta_r', { fill: '#fbbf24', fontSize: 26, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 130, 'Angle of incidence = Angle of reflection', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Key points
    r.roundRect(30, 160, 340, 150, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 185, 'Key Points', { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    const points = [
      { text: 'Both angles measured from the NORMAL (perpendicular)', color: '#22d3ee' },
      { text: 'Works for ALL wavelengths (colors) equally', color: '#4ade80' },
      { text: 'Works for ALL reflective surfaces', color: '#f472b6' },
      { text: 'Incident ray, normal, and reflected ray are coplanar', color: '#fbbf24' }
    ];
    points.forEach((p, i) => {
      r.text(200, 215 + i * 25, p.text, { fill: p.color, fontSize: 11, textAnchor: 'middle' });
    });

    // Virtual image explanation
    r.roundRect(30, 325, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 350, 'Why Mirrors Show Images', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 380, 'Your brain traces reflected rays backward', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 400, 'in straight lines, perceiving a "virtual image"', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Explore the Twist', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 55, 'Challenge: Corner Reflector', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Scenario
    r.roundRect(30, 85, 340, 120, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 110, 'Two mirrors are placed perpendicular to each', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 130, "other (90 degree angle). You shine a laser at", { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 150, 'the corner from any angle...', { fill: '#cbd5e1', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 180, 'Where does the reflected beam go?', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Options
    const options = [
      'It always returns parallel to where it came from',
      'It scatters randomly into the room',
      'It gets trapped between the mirrors forever',
      'It only reflects once and exits at 90 degrees'
    ];

    options.forEach((option, i) => {
      const y = 215 + i * 55;
      let bgColor = 'rgba(51, 65, 85, 0.5)';
      let textColor = '#e2e8f0';

      if (this.showTwistFeedback) {
        if (i === 0) { // Correct answer
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
      r.text(50, y + 28, `${String.fromCharCode(65 + i)}. ${option}`, { fill: textColor, fontSize: 11 });

      if (!this.showTwistFeedback) {
        r.addButton({ id: `option_${i}`, label: '', variant: 'secondary', disabled: false });
      }
    });

    if (this.showTwistFeedback) {
      r.roundRect(30, 450, 340, 100, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
      const message = this.twistPrediction === 0 ? 'Exactly! This is called retroreflection!' : 'The answer: Light always returns toward its source!';
      r.text(200, 480, message, { fill: this.twistPrediction === 0 ? '#34d399' : '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 510, 'Two 90 degree reflections = 180 degree turn', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 530, "This is how Moon laser ranging works!", { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'continue', label: 'See How It Works', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 50, 'Corner Reflector / Retroreflector', { fill: '#a855f7', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Corner reflector visualization
    r.roundRect(20, 75, 360, 200, 12, { fill: 'rgba(30, 41, 59, 0.5)' });

    // Draw the corner (two perpendicular mirrors)
    const cornerX = 200;
    const cornerY = 220;

    // Horizontal mirror
    r.line(100, cornerY, cornerX, cornerY, { stroke: '#94a3b8', strokeWidth: 4 });
    // Vertical mirror
    r.line(cornerX, cornerY, cornerX, 120, { stroke: '#94a3b8', strokeWidth: 4 });

    // Incident ray
    const angle1 = 30; // degrees from horizontal
    const rad1 = (angle1 * Math.PI) / 180;
    const startX = 80;
    const startY = cornerY - 60;
    // Ray 1: to horizontal mirror
    const hitX1 = 150;
    const hitY1 = cornerY;
    r.line(startX, startY, hitX1, hitY1, { stroke: '#fbbf24', strokeWidth: 3 });
    r.text(startX - 5, startY - 10, 'IN', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold' });

    // Ray 2: from horizontal to vertical (reflected up)
    const hitX2 = cornerX;
    const hitY2 = cornerY - 50;
    r.line(hitX1, hitY1, hitX2, hitY2, { stroke: '#f59e0b', strokeWidth: 3 });

    // Ray 3: from vertical mirror back out (parallel to incoming)
    const endX = 80;
    const endY = hitY2 - 40;
    r.line(hitX2, hitY2, endX, endY, { stroke: '#ef4444', strokeWidth: 3 });
    r.text(endX - 5, endY - 10, 'OUT', { fill: '#ef4444', fontSize: 12, fontWeight: 'bold' });

    // Angle annotations
    r.text(hitX1, hitY1 + 15, 'Reflection 1', { fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' });
    r.text(hitX2 + 30, hitY2, 'Reflection 2', { fill: '#94a3b8', fontSize: 9 });

    // Explanation
    r.roundRect(25, 290, 350, 120, 12, { fill: 'rgba(30, 41, 59, 0.7)' });
    r.text(200, 315, 'How Retroreflection Works', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const explanations = [
      'First reflection: theta_i1 = theta_r1',
      'Second reflection: theta_i2 = theta_r2',
      'With 90 degree corners: total turn = 180 degrees',
      'Light returns parallel to its source!'
    ];
    explanations.forEach((exp, i) => {
      r.text(200, 340 + i * 18, exp, { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    });

    // Applications
    r.roundRect(40, 420, 320, 50, 10, { fill: 'rgba(16, 185, 129, 0.2)' });
    r.text(200, 445, 'Used in: Road signs, bike reflectors, Moon mirrors', { fill: '#34d399', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Review Summary', variant: 'primary' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 50, 'Summary: Law of Reflection', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Core law
    r.roundRect(25, 80, 350, 80, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 110, 'Core Law: theta_i = theta_r', { fill: '#fbbf24', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 140, 'Simple but explains all reflection phenomena', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Key applications
    r.roundRect(25, 175, 170, 120, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(110, 200, 'Plane Mirrors', { fill: '#22d3ee', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(110, 225, 'Virtual images', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 242, 'Same distance behind', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(110, 259, 'as object in front', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    r.roundRect(205, 175, 170, 120, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(290, 200, 'Retroreflectors', { fill: '#a855f7', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(290, 225, 'Corner cubes', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 242, 'Return light to source', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });
    r.text(290, 259, 'regardless of angle', { fill: '#94a3b8', fontSize: 10, textAnchor: 'middle' });

    // Universal properties
    r.roundRect(25, 310, 350, 90, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
    r.text(200, 335, 'Universal Properties', { fill: '#4ade80', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 360, 'Works for all wavelengths (no color dispersion)', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 380, 'Works for all reflective materials', { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'continue', label: 'Real-World Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 50, 'Real-World Applications', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // App tabs
    this.transferApps.forEach((app, i) => {
      const x = 35 + i * 88;
      const isActive = i === this.activeAppIndex;
      const isCompleted = this.completedApps.has(i);

      let bgColor = 'rgba(51, 65, 85, 0.5)';
      if (isActive) bgColor = '#f59e0b';
      else if (isCompleted) bgColor = 'rgba(16, 185, 129, 0.3)';

      r.roundRect(x, 75, 80, 45, 8, { fill: bgColor });
      const icons: Record<string, string> = { mirror: '[]', periscope: '|/', reflector: '<>', kaleidoscope: '*' };
      r.text(x + 40, 103, icons[app.icon] || '?', { fontSize: 18, textAnchor: 'middle' });

      r.addButton({ id: `app_${i}`, label: '', variant: 'secondary' });
    });

    // Active app content
    const app = this.transferApps[this.activeAppIndex];
    r.roundRect(25, 135, 350, 310, 16, { fill: 'rgba(30, 41, 59, 0.5)' });

    r.text(200, 165, app.title, { fill: '#ffffff', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 188, app.tagline, { fill: '#fbbf24', fontSize: 11, textAnchor: 'middle' });

    // Description (multi-line)
    const words = app.description.split(' ');
    let line = '';
    let lineY = 218;
    words.forEach(word => {
      const testLine = line + word + ' ';
      if (testLine.length > 50) {
        r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });
        line = word + ' ';
        lineY += 18;
      } else {
        line = testLine;
      }
    });
    if (line) r.text(200, lineY, line.trim(), { fill: '#cbd5e1', fontSize: 11, textAnchor: 'middle' });

    // Physics connection
    r.roundRect(40, 310, 320, 80, 10, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 335, 'Physics Connection', { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 360, app.connection.substring(0, 55) + '...', { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

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
      r.text(200, 50, 'Knowledge Test', { fill: '#ffffff', fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 75, `Question ${this.currentQuestionIndex + 1} of 10`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      const question = this.testQuestions[this.currentQuestionIndex];

      // Scenario
      r.roundRect(25, 95, 350, 85, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      const scenarioWords = question.scenario.split(' ');
      let scenarioLine = '';
      let scenarioY = 115;
      scenarioWords.forEach(word => {
        if ((scenarioLine + word).length > 55) {
          r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
          scenarioLine = word + ' ';
          scenarioY += 15;
        } else {
          scenarioLine += word + ' ';
        }
      });
      if (scenarioLine) r.text(200, scenarioY, scenarioLine.trim(), { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });

      // Question
      r.text(200, 200, question.question.substring(0, 55) + (question.question.length > 55 ? '...' : ''), { fill: '#fbbf24', fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });

      // Options
      question.options.forEach((option, i) => {
        const y = 225 + i * 52;
        const isSelected = this.testAnswers[this.currentQuestionIndex] === i;
        const bgColor = isSelected ? 'rgba(251, 191, 36, 0.3)' : 'rgba(51, 65, 85, 0.5)';

        r.roundRect(25, y, 350, 45, 8, { fill: bgColor });
        r.text(40, y + 27, `${String.fromCharCode(65 + i)}. ${option.substring(0, 48)}${option.length > 48 ? '...' : ''}`, { fill: isSelected ? '#fbbf24' : '#e2e8f0', fontSize: 10 });

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
        r.text(200, 455, `${answered}/10 questions answered`, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
      }
    } else {
      // Show results
      const score = this.calculateScore();

      r.roundRect(60, 80, 280, 180, 20, { fill: 'rgba(30, 41, 59, 0.8)' });
      r.text(200, 130, score >= 7 ? 'trophy' : 'book', { fontSize: 48, textAnchor: 'middle' });
      r.text(200, 190, `Score: ${score}/10`, { fill: '#ffffff', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, 225, score >= 7 ? 'Optics Expert!' : 'Review the concepts and try again.', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });

      // Key concepts
      r.roundRect(30, 280, 340, 150, 12, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(200, 310, 'Key Concepts Tested:', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      const concepts = [
        'Law of reflection: theta_i = theta_r',
        'Angles measured from normal',
        'Virtual images in plane mirrors',
        'Retroreflectors and corner reflectors'
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
    r.text(200, 120, 'mirror', { fontSize: 72, textAnchor: 'middle' });

    // Title
    r.text(200, 200, 'Reflection Master!', { fill: '#ffffff', fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 235, 'You understand how light bounces', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
    r.text(200, 258, 'off mirrors and surfaces!', { fill: '#cbd5e1', fontSize: 14, textAnchor: 'middle' });

    // Concept badges
    const concepts = [
      { icon: '=', label: 'theta_i = theta_r' },
      { icon: '|', label: 'Normal Line' },
      { icon: '<>', label: 'Retroreflectors' },
      { icon: '[]', label: 'Virtual Images' }
    ];

    concepts.forEach((concept, i) => {
      const x = 55 + (i % 2) * 155;
      const y = 295 + Math.floor(i / 2) * 75;
      r.roundRect(x, y, 140, 60, 10, { fill: 'rgba(30, 41, 59, 0.5)' });
      r.text(x + 70, y + 25, concept.icon, { fontSize: 18, textAnchor: 'middle' });
      r.text(x + 70, y + 48, concept.label, { fill: '#cbd5e1', fontSize: 10, textAnchor: 'middle' });
    });

    // Key formula
    r.roundRect(50, 460, 300, 70, 12, { fill: 'rgba(251, 191, 36, 0.2)' });
    r.text(200, 488, 'Key Law', { fill: '#fbbf24', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 515, 'theta_i = theta_r (from normal)', { fill: '#ffffff', fontSize: 16, textAnchor: 'middle' });

    r.addButton({ id: 'restart', label: 'Explore Again', variant: 'secondary' });

    r.setCoachMessage('Congratulations on mastering the law of reflection!');
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      showPredictionFeedback: this.showPredictionFeedback,
      showTwistFeedback: this.showTwistFeedback,
      incidentAngle: this.incidentAngle,
      showNormal: this.showNormal,
      showAngles: this.showAngles,
      surfaceType: this.surfaceType,
      cornerReflectorMode: this.cornerReflectorMode,
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
    if (state.incidentAngle !== undefined) this.incidentAngle = state.incidentAngle as number;
    if (state.showNormal !== undefined) this.showNormal = state.showNormal as boolean;
    if (state.showAngles !== undefined) this.showAngles = state.showAngles as boolean;
    if (state.surfaceType !== undefined) this.surfaceType = state.surfaceType as 'smooth' | 'rough';
    if (state.cornerReflectorMode !== undefined) this.cornerReflectorMode = state.cornerReflectorMode as boolean;
    if (state.animationTime !== undefined) this.animationTime = state.animationTime as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as number[];
    if (state.currentQuestionIndex !== undefined) this.currentQuestionIndex = state.currentQuestionIndex as number;
    if (state.showTestResults !== undefined) this.showTestResults = state.showTestResults as boolean;
    if (state.activeAppIndex !== undefined) this.activeAppIndex = state.activeAppIndex as number;
    if (state.completedApps) this.completedApps = new Set(state.completedApps as number[]);
  }
}

export function createLawOfReflectionGame(sessionId: string): LawOfReflectionGame {
  return new LawOfReflectionGame(sessionId);
}
