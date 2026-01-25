// ============================================================================
// ORBITAL MECHANICS GAME - Server-Side Implementation
// ============================================================================
// Physics: v_orbital = sqrt(GM/r) - circular orbital velocity
// Gravity provides centripetal acceleration: F = GMm/r^2
// Free fall = apparent weightlessness (microgravity)
// ============================================================================

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// TYPES
// ============================================================================

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

type GamePhase =
  | 'hook'
  | 'predict'
  | 'play'
  | 'review'
  | 'twist_predict'
  | 'twist_play'
  | 'twist_review'
  | 'transfer'
  | 'test'
  | 'mastery';

// ============================================================================
// PROTECTED: Test Questions (NEVER sent to client)
// ============================================================================

const TEST_QUESTIONS: TestQuestion[] = [
  {
    question: "What keeps the ISS in orbit around Earth?",
    options: ["Rocket engines firing continuously", "It's outside Earth's gravity", "It's falling toward Earth but moving sideways fast enough to miss", "Magnetic repulsion from Earth's core"],
    correctIndex: 2
  },
  {
    question: "If you throw a ball horizontally on Earth, why doesn't it orbit?",
    options: ["Balls can't orbit", "It doesn't have enough horizontal speed - it hits the ground", "Air pushes it down", "Gravity is too strong at ground level"],
    correctIndex: 1
  },
  {
    question: "Why do astronauts float inside the ISS?",
    options: ["There's no gravity in space", "The ISS has anti-gravity generators", "They're falling at the same rate as the station (free fall)", "They're too far from Earth for gravity"],
    correctIndex: 2
  },
  {
    question: "To orbit higher, a satellite needs to:",
    options: ["Move faster", "Move slower (orbital velocity decreases with altitude)", "Weigh less", "Be larger"],
    correctIndex: 1
  },
  {
    question: "What is the orbital velocity at Earth's surface (if there were no air)?",
    options: ["About 1 km/s", "About 4 km/s", "About 8 km/s (28,000 km/h)", "About 20 km/s"],
    correctIndex: 2
  },
  {
    question: "The ISS orbits at 400 km altitude. Gravity there is:",
    options: ["Zero - that's why astronauts float", "About 10% of surface gravity", "About 90% of surface gravity", "Stronger than at surface"],
    correctIndex: 2
  },
  {
    question: "What happens if you throw a ball forward inside a space station?",
    options: ["It falls to the floor", "It flies straight until hitting a wall", "It spirals due to rotation", "It floats upward"],
    correctIndex: 1
  },
  {
    question: "Geostationary satellites orbit at 35,786 km altitude. Their orbital period is:",
    options: ["90 minutes (like ISS)", "12 hours", "24 hours (same as Earth rotation)", "1 month"],
    correctIndex: 2
  },
  {
    question: "What is escape velocity from Earth?",
    options: ["About 8 km/s", "About 11.2 km/s", "About 25 km/s", "It depends on the object's mass"],
    correctIndex: 1
  },
  {
    question: "Why is it called 'microgravity' instead of 'zero gravity'?",
    options: ["Marketing - it sounds more scientific", "There are tiny residual accelerations (air drag, tidal forces)", "Micro means 'in space'", "The ISS has small gravity generators"],
    correctIndex: 1
  }
];

// ============================================================================
// GAME CLASS
// ============================================================================

export class OrbitalMechanicsGame extends BaseGame {
  // Game state
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Play phase - Newton's cannonball
  private launchSpeed: number = 5; // km/s scale
  private isLaunched: boolean = false;
  private projectilePos: { x: number; y: number } = { x: 0, y: 0 };
  private projectileVel: { x: number; y: number } = { x: 0, y: 0 };
  private trail: { x: number; y: number }[] = [];
  private outcome: 'none' | 'crash' | 'orbit' | 'escape' = 'none';
  private animPhase: number = 0;

  // Twist play - ISS visualization
  private issAngle: number = 0;

  // Constants
  private readonly EARTH_RADIUS = 80;
  private readonly EARTH_CENTER = { x: 200, y: 250 };

  // Review/Test
  private testAnswers: number[] = [];
  private completedApps: Set<number> = new Set();
  private activeApp: number = 0;

  // Premium color palette
  private readonly colors = {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#06b6d4',
    success: '#22c55e',
    warning: '#f59e0b',
    background: '#0a0f1a',
    cardBg: 'rgba(30, 41, 59, 0.5)',
    text: '#ffffff',
    textMuted: '#94a3b8'
  };

  // Applications
  private readonly applications = [
    {
      title: "GPS Satellites",
      icon: "satellite",
      description: "~20,200 km altitude, ~14,000 km/h. Higher orbit = slower speed, longer orbital period (12 hours)."
    },
    {
      title: "Geostationary Orbit",
      icon: "broadcast",
      description: "35,786 km up, orbits in exactly 24 hours - appears stationary over one spot! Used for TV satellites."
    },
    {
      title: "Vomit Comet",
      icon: "plane",
      description: "Parabolic flights create ~25 seconds of free fall to simulate microgravity for training and research."
    },
    {
      title: "Escape Velocity",
      icon: "rocket",
      description: "At 11.2 km/s horizontal, you escape Earth entirely - no more 'falling around'! Apollo missions did this."
    }
  ];

  constructor(sessionId: string) {
    super(sessionId);
  }

  // ============================================================================
  // PROTECTED: Physics Calculations (NEVER sent to client)
  // ============================================================================

  private calculateOrbitalVelocity(radius: number): number {
    // v = sqrt(GM/r)
    // Simplified for Earth: v ≈ 7.9 km/s at surface
    const GM = 3.986e14; // m^3/s^2
    const r = radius * 80000; // Scale factor
    return Math.sqrt(GM / r) / 1000; // km/s
  }

  private calculateGravityAcceleration(pos: { x: number; y: number }): { ax: number; ay: number } {
    const dx = this.EARTH_CENTER.x - pos.x;
    const dy = this.EARTH_CENTER.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.EARTH_RADIUS) {
      return { ax: 0, ay: 0 }; // Crashed
    }

    // Gravity strength (inverse square, simplified)
    const g = 300 / (dist * dist);
    return {
      ax: (dx / dist) * g,
      ay: (dy / dist) * g
    };
  }

  private calculateOrbitalPeriod(altitude: number): number {
    // T = 2π * sqrt(r^3 / GM)
    // ISS at 400 km: ~92 minutes
    // Geostationary at 35,786 km: 24 hours
    const r = 6371 + altitude; // km from Earth center
    const GM = 398600; // km^3/s^2
    return 2 * Math.PI * Math.sqrt(Math.pow(r, 3) / GM) / 60; // minutes
  }

  private calculateEscapeVelocity(radius: number): number {
    // v_escape = sqrt(2GM/r) = sqrt(2) * v_orbital ≈ 1.414 * v_orbital
    return this.calculateOrbitalVelocity(radius) * 1.414;
  }

  // ============================================================================
  // INPUT HANDLING
  // ============================================================================

  handleInput(input: UserInput): void {
    if (input.type === 'button_click') {
      this.handleButtonClick(input.id, input.value);
    } else if (input.type === 'slider_change') {
      this.handleSliderChange(input.id, input.value);
    } else if (input.type === 'progress_click') {
      const phaseIndex = input.value as number;
      const phases: GamePhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
      if (phaseIndex >= 0 && phaseIndex < phases.length) {
        this.phase = phases[phaseIndex];
        this.resetPhaseState();
      }
    }
    this.markDirty();
  }

  private handleButtonClick(id: string, value?: string | number | boolean): void {
    switch (id) {
      case 'continue_hook':
        this.phase = 'predict';
        break;
      case 'select_prediction':
        this.prediction = value as string;
        break;
      case 'submit_prediction':
        if (this.prediction) {
          this.phase = 'play';
        }
        break;
      case 'launch_cannon':
        if (!this.isLaunched) {
          this.launchProjectile();
        }
        break;
      case 'reset_launch':
        this.resetLaunch();
        break;
      case 'continue_to_review':
        this.phase = 'review';
        break;
      case 'continue_to_twist':
        this.phase = 'twist_predict';
        break;
      case 'select_twist_prediction':
        this.twistPrediction = value as string;
        break;
      case 'submit_twist_prediction':
        if (this.twistPrediction) {
          this.phase = 'twist_play';
        }
        break;
      case 'continue_twist_review':
        this.phase = 'twist_review';
        break;
      case 'continue_to_transfer':
        this.phase = 'transfer';
        break;
      case 'select_app':
        this.activeApp = value as number;
        this.completedApps.add(value as number);
        break;
      case 'start_test':
        this.phase = 'test';
        this.testAnswers = [];
        break;
      case 'select_answer':
        if (this.testAnswers.length < TEST_QUESTIONS.length) {
          this.testAnswers.push(value as number);
        }
        break;
      case 'continue_from_test':
        const score = this.calculateScore();
        if (score >= 7) {
          this.phase = 'mastery';
        } else {
          this.phase = 'review';
        }
        break;
      case 'complete_mastery':
        this.phase = 'hook';
        this.resetAllState();
        break;
    }
  }

  private handleSliderChange(id: string, value?: string | number | boolean): void {
    if (id === 'launch_speed' && !this.isLaunched) {
      this.launchSpeed = value as number;
    }
  }

  private launchProjectile(): void {
    const startX = this.EARTH_CENTER.x;
    const startY = this.EARTH_CENTER.y - this.EARTH_RADIUS - 10;

    this.projectilePos = { x: startX, y: startY };
    this.projectileVel = { x: this.launchSpeed * 3, y: 0 };
    this.trail = [{ x: startX, y: startY }];
    this.outcome = 'none';
    this.isLaunched = true;

    this.simulateProjectile();
  }

  private simulateProjectile(): void {
    const simulate = () => {
      if (this.outcome !== 'none') return;

      // Check for crash
      const dist = Math.sqrt(
        Math.pow(this.projectilePos.x - this.EARTH_CENTER.x, 2) +
        Math.pow(this.projectilePos.y - this.EARTH_CENTER.y, 2)
      );

      if (dist < this.EARTH_RADIUS) {
        this.outcome = 'crash';
        this.markDirty();
        return;
      }

      if (dist > 400) {
        this.outcome = 'escape';
        this.markDirty();
        return;
      }

      // Check for orbit (completed a loop)
      if (this.trail.length > 50 &&
          Math.abs(this.projectilePos.x - this.trail[0].x) < 20 &&
          Math.abs(this.projectilePos.y - this.trail[0].y) < 20) {
        this.outcome = 'orbit';
        this.markDirty();
        return;
      }

      // Calculate gravity
      const gravity = this.calculateGravityAcceleration(this.projectilePos);

      // Update velocity
      this.projectileVel.x += gravity.ax;
      this.projectileVel.y += gravity.ay;

      // Update position
      this.projectilePos.x += this.projectileVel.x;
      this.projectilePos.y += this.projectileVel.y;

      // Update trail
      this.trail.push({ ...this.projectilePos });
      if (this.trail.length > 200) {
        this.trail = this.trail.slice(-200);
      }

      this.markDirty();
      setTimeout(simulate, 30);
    };

    simulate();
  }

  private resetLaunch(): void {
    this.isLaunched = false;
    this.projectilePos = { x: 0, y: 0 };
    this.projectileVel = { x: 0, y: 0 };
    this.trail = [];
    this.outcome = 'none';
  }

  private resetPhaseState(): void {
    if (this.phase === 'play') {
      this.resetLaunch();
      this.launchSpeed = 5;
    } else if (this.phase === 'twist_play') {
      this.issAngle = 0;
    }
  }

  private resetAllState(): void {
    this.prediction = null;
    this.twistPrediction = null;
    this.resetLaunch();
    this.launchSpeed = 5;
    this.issAngle = 0;
    this.testAnswers = [];
    this.completedApps.clear();
    this.activeApp = 0;
  }

  private calculateScore(): number {
    return this.testAnswers.reduce((score, answer, index) => {
      return score + (answer === TEST_QUESTIONS[index].correctIndex ? 1 : 0);
    }, 0);
  }

  // ============================================================================
  // RENDERING
  // ============================================================================

  render(): GameFrame {
    const renderer = new CommandRenderer();

    // Background
    renderer.drawRectangle(0, 0, 800, 600, this.colors.background);

    // Stars
    for (let i = 0; i < 50; i++) {
      const x = (i * 37) % 800;
      const y = (i * 23) % 600;
      renderer.drawEllipse(x, y, 1, 1, 'rgba(255, 255, 255, 0.5)');
    }

    // Update animation phase
    this.animPhase = (this.animPhase + 0.02) % (Math.PI * 2);
    this.issAngle = (this.issAngle + 0.02) % (Math.PI * 2);

    // Render phase-specific content
    switch (this.phase) {
      case 'hook': this.renderHook(renderer); break;
      case 'predict': this.renderPredict(renderer); break;
      case 'play': this.renderPlay(renderer); break;
      case 'review': this.renderReview(renderer); break;
      case 'twist_predict': this.renderTwistPredict(renderer); break;
      case 'twist_play': this.renderTwistPlay(renderer); break;
      case 'twist_review': this.renderTwistReview(renderer); break;
      case 'transfer': this.renderTransfer(renderer); break;
      case 'test': this.renderTest(renderer); break;
      case 'mastery': this.renderMastery(renderer); break;
    }

    // Progress bar
    this.renderProgressBar(renderer);

    return renderer.getFrame();
  }

  private renderProgressBar(renderer: CommandRenderer): void {
    const phases: GamePhase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phases.indexOf(this.phase);

    renderer.drawRectangle(0, 0, 800, 50, 'rgba(15, 23, 42, 0.9)');
    renderer.drawText("Orbital Mechanics", 20, 30, this.colors.text, 14, 'bold');

    const startX = 300;
    const spacing = 20;

    phases.forEach((_, i) => {
      const x = startX + i * spacing;
      const isActive = i === currentIndex;
      const isCompleted = i < currentIndex;

      renderer.addInteractiveElement({
        id: `progress_${i}`,
        type: 'progress_click',
        x: x - 5,
        y: 20,
        width: isActive ? 20 : 10,
        height: 10,
        value: i
      });

      const color = isActive ? this.colors.primary : isCompleted ? this.colors.success : '#475569';
      renderer.drawEllipse(x, 25, isActive ? 10 : 4, isActive ? 10 : 4, color);
    });

    renderer.drawText(this.phase.replace('_', ' '), 700, 30, this.colors.primary, 12);
  }

  private renderHook(renderer: CommandRenderer): void {
    // Badge
    renderer.drawRoundedRectangle(320, 80, 160, 30, 15, 'rgba(59, 130, 246, 0.1)');
    renderer.drawText("PHYSICS EXPLORATION", 340, 100, this.colors.primary, 10, 'bold');

    // Title
    renderer.drawText("The Falling Satellite Paradox", 400, 160, this.colors.text, 28, 'bold');
    renderer.drawText("Discover how satellites orbit by perpetually falling", 400, 200, this.colors.textMuted, 14);

    // Card with Earth
    renderer.drawRoundedRectangle(200, 240, 400, 200, 16, this.colors.cardBg);

    // Earth
    renderer.drawEllipse(300, 340, 50, 50, '#1e40af');
    renderer.drawEllipse(290, 330, 8, 8, '#22c55e');
    renderer.drawEllipse(310, 350, 12, 6, '#22c55e');

    // ISS orbit
    renderer.drawEllipse(300, 340, 80, 25, 'transparent', '#4b5563', 1);

    // ISS icon
    const issX = 300 + Math.cos(this.animPhase) * 80;
    const issY = 340 + Math.sin(this.animPhase) * 25;
    renderer.drawRectangle(issX - 10, issY - 3, 20, 6, '#fbbf24');
    renderer.drawRectangle(issX - 4, issY - 5, 8, 10, '#9ca3af');

    // Content
    renderer.drawText("The ISS is falling toward Earth", 500, 310, this.colors.primary, 14, 'bold');
    renderer.drawText("at 28,000 km/h!", 500, 330, this.colors.primary, 14, 'bold');
    renderer.drawText("So why doesn't it crash?", 500, 370, this.colors.textMuted, 12);

    // CTA Button
    renderer.addInteractiveElement({
      id: 'continue_hook',
      type: 'button_click',
      x: 300,
      y: 480,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(300, 480, 200, 50, 12, this.colors.primary);
    renderer.drawText("Investigate!", 400, 510, this.colors.text, 14, 'bold');
  }

  private renderPredict(renderer: CommandRenderer): void {
    renderer.drawText("Make Your Prediction", 400, 100, this.colors.text, 28, 'bold');
    renderer.drawText("You fire a cannonball horizontally from a tall mountain.", 400, 140, this.colors.textMuted, 14);
    renderer.drawText("What determines if it orbits Earth?", 400, 160, this.colors.textMuted, 14);

    const predictions = [
      { id: 'fast', label: "Horizontal speed - fast enough to 'fall around' Earth's curve" },
      { id: 'up', label: 'Firing angle - must aim slightly upward to stay in space' },
      { id: 'mass', label: 'Mass of the cannonball - heavier objects orbit better' },
      { id: 'gravity', label: "Getting above Earth's gravity (impossible to orbit)" }
    ];

    predictions.forEach((pred, i) => {
      const y = 190 + i * 70;
      const isSelected = this.prediction === pred.id;

      renderer.addInteractiveElement({
        id: 'select_prediction',
        type: 'button_click',
        x: 150,
        y: y,
        width: 500,
        height: 60,
        value: pred.id
      });

      renderer.drawRoundedRectangle(150, y, 500, 60, 12,
        isSelected ? 'rgba(59, 130, 246, 0.2)' : this.colors.cardBg);
      if (isSelected) {
        renderer.drawRoundedRectangle(150, y, 500, 60, 12, 'transparent', this.colors.primary, 2);
      }
      renderer.drawText(pred.label, 400, y + 35, this.colors.text, 12);
    });

    if (this.prediction) {
      renderer.addInteractiveElement({
        id: 'submit_prediction',
        type: 'button_click',
        x: 300,
        y: 490,
        width: 200,
        height: 50
      });
      renderer.drawRoundedRectangle(300, 490, 200, 50, 12, this.colors.primary);
      renderer.drawText("Test It!", 400, 520, this.colors.text, 14, 'bold');
    }
  }

  private renderPlay(renderer: CommandRenderer): void {
    renderer.drawText("Newton's Cannonball", 400, 70, this.colors.text, 24, 'bold');

    // Earth
    renderer.drawEllipse(this.EARTH_CENTER.x, this.EARTH_CENTER.y, this.EARTH_RADIUS, this.EARTH_RADIUS, '#1e40af');
    renderer.drawEllipse(this.EARTH_CENTER.x, this.EARTH_CENTER.y, this.EARTH_RADIUS + 5, this.EARTH_RADIUS + 5, 'transparent', '#3b82f6', 3);

    // Mountain
    renderer.drawLine(this.EARTH_CENTER.x - 15, this.EARTH_CENTER.y - this.EARTH_RADIUS,
      this.EARTH_CENTER.x, this.EARTH_CENTER.y - this.EARTH_RADIUS - 15, '#6b7280', 2);
    renderer.drawLine(this.EARTH_CENTER.x + 15, this.EARTH_CENTER.y - this.EARTH_RADIUS,
      this.EARTH_CENTER.x, this.EARTH_CENTER.y - this.EARTH_RADIUS - 15, '#6b7280', 2);

    // Cannon
    renderer.drawRectangle(this.EARTH_CENTER.x, this.EARTH_CENTER.y - this.EARTH_RADIUS - 18, 30, 8, '#374151');

    // Trail
    if (this.trail.length > 1) {
      const trailColor = this.outcome === 'orbit' ? '#22c55e' :
                        this.outcome === 'crash' ? '#ef4444' : '#fbbf24';
      for (let i = 1; i < this.trail.length; i++) {
        renderer.drawLine(this.trail[i-1].x, this.trail[i-1].y, this.trail[i].x, this.trail[i].y, trailColor, 2);
      }
    }

    // Projectile
    if (this.isLaunched && this.outcome === 'none') {
      renderer.drawEllipse(this.projectilePos.x, this.projectilePos.y, 5, 5, '#fbbf24');
    }

    // Velocity indicator (before launch)
    if (!this.isLaunched) {
      const arrowEnd = this.EARTH_CENTER.x + 30 + this.launchSpeed * 6;
      renderer.drawLine(this.EARTH_CENTER.x + 30, this.EARTH_CENTER.y - this.EARTH_RADIUS - 14,
        arrowEnd, this.EARTH_CENTER.y - this.EARTH_RADIUS - 14, '#22c55e', 3);
      renderer.drawText(`${this.launchSpeed} km/s`, (this.EARTH_CENTER.x + 35 + arrowEnd) / 2,
        this.EARTH_CENTER.y - this.EARTH_RADIUS - 30, '#22c55e', 10);
    }

    // Outcome message
    if (this.outcome === 'crash') {
      renderer.drawText("Crashed! Not enough horizontal speed", 400, 100, '#ef4444', 14, 'bold');
    } else if (this.outcome === 'orbit') {
      renderer.drawText("Orbit achieved! Falling around Earth", 400, 100, '#22c55e', 14, 'bold');
    } else if (this.outcome === 'escape') {
      renderer.drawText("Escape velocity! Left Earth's gravity", 400, 100, '#8b5cf6', 14, 'bold');
    }

    // Speed slider
    renderer.drawText(`Launch Speed: ${this.launchSpeed} km/s`, 550, 200, this.colors.textMuted, 12);
    renderer.addInteractiveElement({
      id: 'launch_speed',
      type: 'slider_change',
      x: 500,
      y: 220,
      width: 200,
      height: 20,
      min: 2,
      max: 12,
      value: this.launchSpeed
    });
    renderer.drawRoundedRectangle(500, 220, 200, 10, 5, '#475569');
    renderer.drawRoundedRectangle(500, 220, (this.launchSpeed - 2) * 20, 10, 5, this.colors.primary);

    renderer.drawText("2 km/s (falls)", 500, 250, this.colors.textMuted, 10);
    renderer.drawText("~8 km/s (orbit)", 570, 250, this.colors.textMuted, 10);
    renderer.drawText("11+ km/s (escape)", 650, 250, this.colors.textMuted, 10);

    // Launch button
    renderer.addInteractiveElement({
      id: this.isLaunched ? 'reset_launch' : 'launch_cannon',
      type: 'button_click',
      x: 525,
      y: 300,
      width: 150,
      height: 45
    });
    renderer.drawRoundedRectangle(525, 300, 150, 45, 10,
      this.isLaunched ? '#475569' : this.colors.primary);
    renderer.drawText(this.isLaunched ? "Reset" : "Fire Cannon!", 600, 327, this.colors.text, 14, 'bold');

    // Insight box
    renderer.drawRoundedRectangle(450, 380, 300, 80, 10, 'rgba(59, 130, 246, 0.1)');
    renderer.drawText("Key insight: The cannonball always falls", 600, 405, this.colors.primary, 11);
    renderer.drawText("toward Earth. But if it's fast enough,", 600, 425, this.colors.primary, 11);
    renderer.drawText("Earth's surface curves away beneath it!", 600, 445, this.colors.primary, 11);

    // Continue
    renderer.addInteractiveElement({
      id: 'continue_to_review',
      type: 'button_click',
      x: 500,
      y: 480,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(500, 480, 200, 50, 12, this.colors.primary);
    renderer.drawText("Continue", 600, 510, this.colors.text, 14, 'bold');
  }

  private renderReview(renderer: CommandRenderer): void {
    const wasCorrect = this.prediction === 'fast';

    renderer.drawText("Orbiting = Falling + Missing", 400, 80, this.colors.text, 24, 'bold');

    renderer.drawRoundedRectangle(150, 120, 500, 220, 16, this.colors.cardBg);

    // Steps
    const steps = [
      { num: 1, title: "Gravity Always Pulls Down", desc: "Satellite accelerates toward Earth's center", color: this.colors.primary },
      { num: 2, title: "Horizontal Motion Continues", desc: "Nothing slows it sideways (no air in space)", color: this.colors.secondary },
      { num: 3, title: "Earth Curves Away", desc: "At ~8 km/s, fall rate matches Earth's curvature!", color: this.colors.success }
    ];

    steps.forEach((step, i) => {
      const y = 150 + i * 60;
      renderer.drawEllipse(195, y + 15, 15, 15, step.color);
      renderer.drawText(step.num.toString(), 195, y + 22, this.colors.text, 12, 'bold');
      renderer.drawText(step.title, 220, y + 10, this.colors.text, 14, 'bold');
      renderer.drawText(step.desc, 220, y + 30, this.colors.textMuted, 11);
    });

    // Formula
    renderer.drawRoundedRectangle(200, 360, 400, 60, 10, 'rgba(59, 130, 246, 0.2)');
    renderer.drawText("Orbital Velocity: v = sqrt(GM/r)", 400, 382, this.colors.primary, 14, 'bold');
    renderer.drawText("Approx 7.9 km/s at Earth's surface", 400, 405, this.colors.textMuted, 12);

    // Feedback
    renderer.drawText(`Your prediction: ${wasCorrect ? '✓ Correct!' : '✗ Not quite'}`, 400, 450,
      wasCorrect ? this.colors.success : this.colors.warning, 14);

    renderer.addInteractiveElement({
      id: 'continue_to_twist',
      type: 'button_click',
      x: 300,
      y: 480,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(300, 480, 200, 50, 12, this.colors.secondary);
    renderer.drawText("But wait...", 400, 510, this.colors.text, 14, 'bold');
  }

  private renderTwistPredict(renderer: CommandRenderer): void {
    renderer.drawText("The Twist!", 400, 80, this.colors.secondary, 28, 'bold');
    renderer.drawText("Astronauts on the ISS 'float' and experience 'weightlessness.'", 400, 120, this.colors.textMuted, 13);
    renderer.drawText("But gravity at ISS altitude (400 km) is still 90% of surface gravity!", 400, 145, this.colors.textMuted, 13);
    renderer.drawText("Why do they float?", 400, 175, '#fbbf24', 16, 'bold');

    const predictions = [
      { id: 'freefall', label: "They're in free fall WITH the station - everything falls together" },
      { id: 'nogravity', label: "There's no gravity in space - they're truly weightless" },
      { id: 'centrifugal', label: 'Centrifugal force cancels gravity exactly' },
      { id: 'vacuum', label: 'Vacuum of space prevents gravity from working' }
    ];

    predictions.forEach((pred, i) => {
      const y = 210 + i * 70;
      const isSelected = this.twistPrediction === pred.id;

      renderer.addInteractiveElement({
        id: 'select_twist_prediction',
        type: 'button_click',
        x: 150,
        y: y,
        width: 500,
        height: 60,
        value: pred.id
      });

      renderer.drawRoundedRectangle(150, y, 500, 60, 12,
        isSelected ? 'rgba(139, 92, 246, 0.2)' : this.colors.cardBg);
      if (isSelected) {
        renderer.drawRoundedRectangle(150, y, 500, 60, 12, 'transparent', this.colors.secondary, 2);
      }
      renderer.drawText(pred.label, 400, y + 35, this.colors.text, 12);
    });

    if (this.twistPrediction) {
      renderer.addInteractiveElement({
        id: 'submit_twist_prediction',
        type: 'button_click',
        x: 300,
        y: 510,
        width: 200,
        height: 50
      });
      renderer.drawRoundedRectangle(300, 510, 200, 50, 12, this.colors.secondary);
      renderer.drawText("Test It!", 400, 540, this.colors.text, 14, 'bold');
    }
  }

  private renderTwistPlay(renderer: CommandRenderer): void {
    renderer.drawText("Free Fall in Orbit", 400, 70, this.colors.secondary, 24, 'bold');

    // Earth (partial view from space)
    renderer.drawEllipse(400, 450, 180, 160, '#1e40af');
    renderer.drawEllipse(400, 450, 185, 165, 'transparent', '#60a5fa', 4);

    // Orbital path
    renderer.drawEllipse(400, 250, 120, 40, 'transparent', '#4b5563', 1);

    // ISS
    const issX = 400 + Math.cos(this.issAngle) * 120;
    const issY = 250 + Math.sin(this.issAngle) * 40;

    // Solar panels
    renderer.drawRectangle(issX - 25, issY - 3, 50, 6, '#fbbf24');
    // Main body
    renderer.drawRectangle(issX - 8, issY - 5, 16, 10, '#9ca3af');
    // Modules
    renderer.drawRectangle(issX - 12, issY - 3, 4, 6, '#6b7280');
    renderer.drawRectangle(issX + 8, issY - 3, 4, 6, '#6b7280');

    // Gravity arrow
    renderer.drawLine(issX, issY + 20, issX, issY + 45, '#ef4444', 2);
    renderer.drawText("Gravity", issX + 15, issY + 35, '#ef4444', 10);

    // Velocity arrow
    const velAngle = this.issAngle + Math.PI / 2;
    renderer.drawLine(issX, issY, issX + Math.cos(velAngle) * 30, issY + Math.sin(velAngle) * 10, '#22c55e', 2);
    renderer.drawText("Velocity", issX + Math.cos(velAngle) * 35, issY + Math.sin(velAngle) * 12 - 10, '#22c55e', 10);

    // Status panel
    renderer.drawRoundedRectangle(50, 100, 150, 80, 10, 'rgba(30, 41, 59, 0.9)');
    renderer.drawText("ISS Status:", 125, 125, this.colors.text, 12, 'bold');
    renderer.drawText("Falling at 7.66 km/s!", 125, 155, '#fbbf24', 11);

    // Astronaut panel
    renderer.drawRoundedRectangle(600, 100, 150, 80, 10, 'rgba(30, 41, 59, 0.9)');
    renderer.drawText("Inside ISS:", 675, 125, this.colors.text, 12, 'bold');
    renderer.drawText("Free floating!", 675, 155, '#22c55e', 11);

    // Explanation
    renderer.drawRoundedRectangle(200, 350, 400, 60, 10, 'rgba(139, 92, 246, 0.2)');
    renderer.drawText("The ISS AND astronauts fall at the same rate!", 400, 373, this.colors.secondary, 12);
    renderer.drawText("Like a falling elevator that never hits bottom.", 400, 393, this.colors.textMuted, 11);

    // Continue
    renderer.addInteractiveElement({
      id: 'continue_twist_review',
      type: 'button_click',
      x: 300,
      y: 430,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(300, 430, 200, 50, 12, this.colors.secondary);
    renderer.drawText("Continue", 400, 460, this.colors.text, 14, 'bold');
  }

  private renderTwistReview(renderer: CommandRenderer): void {
    const wasCorrect = this.twistPrediction === 'freefall';

    renderer.drawText('"Microgravity" Not "Zero Gravity"', 400, 80, this.colors.secondary, 24, 'bold');

    renderer.drawRoundedRectangle(150, 120, 500, 250, 16, this.colors.cardBg);
    renderer.drawText("Scientists say 'microgravity' because:", 400, 160, '#fbbf24', 14, 'bold');

    const reasons = [
      { check: true, text: "Gravity IS present (90% of surface)", color: this.colors.success },
      { check: true, text: "Free fall creates apparent weightlessness", color: this.colors.primary },
      { check: true, text: "Tiny residual accelerations exist (~10^-6 g)", color: '#fbbf24' }
    ];

    reasons.forEach((r, i) => {
      const y = 200 + i * 50;
      renderer.drawRoundedRectangle(200, y, 400, 40, 8, `${r.color}20`);
      renderer.drawText(`${r.check ? '✓' : '✗'} ${r.text}`, 400, y + 25, r.color, 12);
    });

    // Feedback
    renderer.drawText(`Your prediction: ${wasCorrect ? '✓ Correct!' : '✗ Free fall is the answer'}`, 400, 400,
      wasCorrect ? this.colors.success : this.colors.warning, 14);

    renderer.addInteractiveElement({
      id: 'continue_to_transfer',
      type: 'button_click',
      x: 300,
      y: 440,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(300, 440, 200, 50, 12, this.colors.accent);
    renderer.drawText("See Applications", 400, 470, this.colors.text, 14, 'bold');
  }

  private renderTransfer(renderer: CommandRenderer): void {
    renderer.drawText("Real-World Applications", 400, 70, this.colors.text, 24, 'bold');
    renderer.drawText("Explore all 4 applications to unlock the quiz", 400, 100, this.colors.textMuted, 12);

    this.applications.forEach((app, i) => {
      const x = 110 + i * 170;
      const isActive = this.activeApp === i;
      const isCompleted = this.completedApps.has(i);

      renderer.addInteractiveElement({
        id: 'select_app',
        type: 'button_click',
        x: x,
        y: 130,
        width: 150,
        height: 50,
        value: i
      });

      let bgColor = '#475569';
      if (isActive) bgColor = this.colors.primary;
      else if (isCompleted) bgColor = 'rgba(34, 197, 94, 0.3)';

      renderer.drawRoundedRectangle(x, 130, 150, 50, 12, bgColor);
      renderer.drawText(isCompleted ? '✓' : '', x + 15, 160, this.colors.success, 12);
      renderer.drawText(app.title.split(' ')[0], x + 75, 160, this.colors.text, 11);
    });

    // Current app detail
    const app = this.applications[this.activeApp];
    renderer.drawRoundedRectangle(150, 200, 500, 180, 16, this.colors.cardBg);
    renderer.drawText(app.title, 400, 240, this.colors.text, 20, 'bold');
    renderer.drawText(app.description, 400, 310, this.colors.text, 12);

    // Progress
    renderer.drawText(`Progress: ${this.completedApps.size}/4`, 400, 420, this.colors.textMuted, 12);

    if (this.completedApps.size >= 4) {
      renderer.addInteractiveElement({
        id: 'start_test',
        type: 'button_click',
        x: 300,
        y: 460,
        width: 200,
        height: 50
      });
      renderer.drawRoundedRectangle(300, 460, 200, 50, 12, this.colors.success);
      renderer.drawText("Take the Quiz", 400, 490, this.colors.text, 14, 'bold');
    }
  }

  private renderTest(renderer: CommandRenderer): void {
    const currentQ = this.testAnswers.length;

    if (currentQ >= TEST_QUESTIONS.length) {
      const score = this.calculateScore();
      const passed = score >= 7;

      renderer.drawText("Quiz Complete!", 400, 150, this.colors.text, 32, 'bold');
      renderer.drawText(`You scored ${score}/10`, 400, 220, passed ? this.colors.success : this.colors.warning, 24);
      renderer.drawText(passed ? "Excellent! You understand orbital mechanics!" : "Review the concepts and try again!", 400, 270, this.colors.textMuted, 14);

      renderer.addInteractiveElement({
        id: 'continue_from_test',
        type: 'button_click',
        x: 300,
        y: 350,
        width: 200,
        height: 50
      });
      renderer.drawRoundedRectangle(300, 350, 200, 50, 12, passed ? this.colors.success : this.colors.secondary);
      renderer.drawText(passed ? "Continue!" : "Review Again", 400, 380, this.colors.text, 14, 'bold');
      return;
    }

    const question = TEST_QUESTIONS[currentQ];

    renderer.drawText(`Question ${currentQ + 1} of ${TEST_QUESTIONS.length}`, 400, 80, this.colors.textMuted, 14);
    renderer.drawRoundedRectangle(100, 100, 600, 80, 12, this.colors.cardBg);
    renderer.drawText(question.question, 400, 145, this.colors.text, 13);

    question.options.forEach((option, i) => {
      const y = 200 + i * 60;

      renderer.addInteractiveElement({
        id: 'select_answer',
        type: 'button_click',
        x: 100,
        y: y,
        width: 600,
        height: 50,
        value: i
      });

      renderer.drawRoundedRectangle(100, y, 600, 50, 10, this.colors.cardBg);
      renderer.drawText(option, 400, y + 30, this.colors.text, 12);
    });
  }

  private renderMastery(renderer: CommandRenderer): void {
    renderer.drawText("TROPHY", 400, 100, this.colors.primary, 50, 'bold');
    renderer.drawText("Orbital Mechanics Master!", 400, 180, this.colors.text, 28, 'bold');

    renderer.drawRoundedRectangle(200, 220, 400, 200, 16, 'rgba(59, 130, 246, 0.2)');
    renderer.drawText("You now understand:", 400, 260, this.colors.primary, 14, 'bold');

    const achievements = [
      "✓ Orbiting = falling toward Earth + moving sideways",
      "✓ Orbital velocity ~7.9 km/s at surface",
      "✓ Astronauts float due to free fall",
      '✓ "Microgravity" is more accurate than "zero gravity"'
    ];

    achievements.forEach((a, i) => {
      renderer.drawText(a, 400, 300 + i * 25, this.colors.text, 11);
    });

    renderer.drawText("You understand what Newton imagined 350 years ago!", 400, 450, this.colors.textMuted, 12);

    renderer.addInteractiveElement({
      id: 'complete_mastery',
      type: 'button_click',
      x: 300,
      y: 490,
      width: 200,
      height: 50
    });
    renderer.drawRoundedRectangle(300, 490, 200, 50, 12, this.colors.success);
    renderer.drawText("Complete!", 400, 520, this.colors.text, 14, 'bold');
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      launchSpeed: this.launchSpeed,
      isLaunched: this.isLaunched,
      projectilePos: this.projectilePos,
      projectileVel: this.projectileVel,
      trail: this.trail,
      outcome: this.outcome,
      issAngle: this.issAngle,
      testAnswers: this.testAnswers,
      completedApps: Array.from(this.completedApps),
      activeApp: this.activeApp
    };
  }

  restoreState(state: Record<string, unknown>): void {
    this.phase = state.phase as GamePhase;
    this.prediction = state.prediction as string | null;
    this.twistPrediction = state.twistPrediction as string | null;
    this.launchSpeed = state.launchSpeed as number;
    this.isLaunched = state.isLaunched as boolean;
    this.projectilePos = state.projectilePos as { x: number; y: number };
    this.projectileVel = state.projectileVel as { x: number; y: number };
    this.trail = state.trail as { x: number; y: number }[];
    this.outcome = state.outcome as 'none' | 'crash' | 'orbit' | 'escape';
    this.issAngle = state.issAngle as number;
    this.testAnswers = state.testAnswers as number[];
    this.completedApps = new Set(state.completedApps as number[]);
    this.activeApp = state.activeApp as number;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createOrbitalMechanicsGame(sessionId: string): OrbitalMechanicsGame {
  return new OrbitalMechanicsGame(sessionId);
}
