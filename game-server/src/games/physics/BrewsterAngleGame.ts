/**
 * Brewster's Angle Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Brewster's angle formula: theta_B = arctan(n2/n1)
 * - Polarization calculations at Brewster's angle
 * - Reflectance formulas (Fresnel equations simplified)
 * - Refractive indices: glass=1.52, water=1.33, diamond=2.42
 * - P-polarized vs S-polarized light behavior
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// === PROTECTED GAME STATE (never sent to client) ===

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

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

// === TEST QUESTIONS (PROTECTED - never sent to client) ===
const testQuestions: TestQuestion[] = [
  {
    question: 'What is Brewster\'s angle?',
    options: ['Angle where all light absorbed', 'Angle where reflected light is completely polarized', 'Angle where light splits into colors', 'Angle of total internal reflection'],
    correctIndex: 1,
  },
  {
    question: 'What is the formula for Brewster\'s angle?',
    options: ['theta_B = sin^-1(n2/n1)', 'theta_B = cos^-1(n2/n1)', 'theta_B = tan^-1(n2/n1)', 'theta_B = n1/n2'],
    correctIndex: 2,
  },
  {
    question: 'For glass (n=1.52) in air, Brewster\'s angle is approximately:',
    options: ['35 deg', '42 deg', '53 deg', '57 deg'],
    correctIndex: 3,
  },
  {
    question: 'At Brewster\'s angle, reflected and refracted rays are:',
    options: ['Parallel', 'Perpendicular (90 deg apart)', 'Same intensity', 'Same wavelength'],
    correctIndex: 1,
  },
  {
    question: 'Why do photographers use polarizing filters with glass?',
    options: ['Make glass darker', 'Change reflection color', 'Eliminate or control reflections at Brewster\'s angle', 'Make glass appear thicker'],
    correctIndex: 2,
  },
  {
    question: 'Why do gas lasers use Brewster windows?',
    options: ['Focus beam better', 'Change laser color', 'Zero reflection for p-polarized light = 100% transmission', 'Make laser safer'],
    correctIndex: 2,
  },
  {
    question: 'At Brewster\'s angle, reflected light is:',
    options: ['Circular polarized', 'Unpolarized', 'S-polarized (parallel to surface)', 'P-polarized (perpendicular to surface)'],
    correctIndex: 2,
  },
  {
    question: 'Why are polarized sunglasses effective for road glare?',
    options: ['Roads are special material', 'Headlights are polarized', 'Road reflections are near Brewster\'s angle, horizontally polarized', 'Lenses are thicker'],
    correctIndex: 2,
  },
  {
    question: 'If refractive index increases, Brewster\'s angle:',
    options: ['Decreases', 'Increases', 'Stays same', 'Becomes undefined'],
    correctIndex: 1,
  },
  {
    question: 'What percentage of p-polarized light reflects at Brewster\'s angle?',
    options: ['100%', '50%', '25%', '0%'],
    correctIndex: 3,
  },
];

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#60a5fa',
  primaryDark: '#3b82f6',
  accent: '#818cf8',
  accentDark: '#6366f1',
  warning: '#fbbf24',
  success: '#34d399',
  danger: '#f472b6',
  bgDark: '#0a0f1a',
  bgCard: '#141e2c',
  bgCardLight: '#1e293b',
  border: '#1e3a5f',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  lightRay: '#fbbf24',
  reflectedRay: '#f472b6',
  refractedRay: '#34d399',
  surface: '#3b82f6',
};

// === MATERIAL DATA ===
interface Material {
  name: string;
  n: number;
  color: string;
}

const materials: Record<string, Material> = {
  glass: { name: 'Glass', n: 1.52, color: '#88c0d0' },
  water: { name: 'Water', n: 1.33, color: '#5e81ac' },
  diamond: { name: 'Diamond', n: 2.42, color: '#d8dee9' },
  plastic: { name: 'Acrylic', n: 1.49, color: '#a3be8c' },
};

// === APPLICATION DATA ===
interface Application {
  title: string;
  icon: string;
  description: string;
  details: string;
}

const applications: Application[] = [
  {
    title: 'Photography',
    icon: 'camera',
    description: 'Circular polarizing filters at Brewster\'s angle eliminate or enhance reflections.',
    details: 'Position at 56 deg to glass with polarizer rotated - reflections vanish!',
  },
  {
    title: 'Sunglasses',
    icon: 'sunglasses',
    description: 'Polarized lenses block horizontally polarized road/water glare near Brewster\'s angle.',
    details: 'Morning/evening sun creates most polarized glare - when polarized glasses help most!',
  },
  {
    title: 'Laser Windows',
    icon: 'laser',
    description: 'Brewster windows allow 100% transmission for p-polarized laser light.',
    details: 'HeNe laser tubes use Brewster windows - that\'s why laser output is polarized!',
  },
  {
    title: 'Displays',
    icon: 'display',
    description: 'Engineers design anti-reflective coatings considering Brewster\'s angle.',
    details: 'E-readers with matte screens consider typical viewing angles and Brewster reflection.',
  },
];

// === MAIN GAME CLASS ===

export class BrewsterAngleGame extends BaseGame {
  readonly gameType = 'brewster_angle';
  readonly gameTitle = 'Brewster\'s Angle';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  // Simulation state
  private incidentAngle = 45; // degrees
  private selectedMaterial = 'glass';
  private showPolarization = true;
  private showAngles = true;
  private filterAngle = 0; // polarizer rotation
  private time = 0;

  // Test state
  private testQuestion = 0;
  private testAnswers: (number | null)[] = Array(10).fill(null);
  private testSubmitted = false;

  // Transfer phase state
  private selectedApp = 0;
  private completedApps = [false, false, false, false];

  // Navigation
  private lastNavTime = 0;
  private isNavigating = false;
  private guidedMode = true;

  // Phase configuration
  private readonly phaseOrder: GamePhase[] = [
    'hook',
    'predict',
    'play',
    'review',
    'twist_predict',
    'twist_play',
    'twist_review',
    'transfer',
    'test',
    'mastery',
  ];

  private readonly phaseLabels: Record<GamePhase, string> = {
    hook: 'Hook',
    predict: 'Predict',
    play: 'Lab',
    review: 'Review',
    twist_predict: 'Twist Predict',
    twist_play: 'Twist Lab',
    twist_review: 'Twist Review',
    transfer: 'Transfer',
    test: 'Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'At one magic angle, polarized sunglasses can COMPLETELY eliminate water glare!',
    predict: 'Think about what makes light at a certain angle special...',
    play: 'Adjust the incident angle. Find where reflected light becomes fully polarized!',
    review: 'At Brewster\'s angle, theta_B = arctan(n2/n1), reflection is 100% polarized.',
    twist_predict: 'Photographers can dial reflections from 0% to maximum. How?',
    twist_play: 'Rotate the polarizing filter and watch the reflection intensity change!',
    twist_review: 'Rotating the polarizer controls how much polarized light passes through.',
    transfer: 'From cameras to lasers - Brewster\'s angle has surprising applications!',
    test: 'Test your understanding of polarization and Brewster\'s angle!',
    mastery: 'Congratulations! You understand Brewster\'s angle!',
  };

  constructor(sessionId: string) {
    super(sessionId);
  }

  initialize(config: SessionConfig): void {
    super.initialize(config);
    this.guidedMode = config.guidedMode ?? true;

    if (config.resumePhase && this.phaseOrder.includes(config.resumePhase as GamePhase)) {
      this.phase = config.resumePhase as GamePhase;
    }

    this.emitCoachEvent('game_started', {
      phase: this.phase,
      phaseLabel: this.phaseLabels[this.phase],
      message: 'Brewster\'s Angle lesson started',
    });
  }

  // === INPUT HANDLING ===

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click':
        this.handleButtonClick(input.id!);
        break;
      case 'slider_change':
        this.handleSliderChange(input.id!, input.value);
        break;
      case 'toggle_change':
        this.handleToggleChange(input.id!, input.value);
        break;
      case 'progress_click':
        this.handleProgressClick(input.index!);
        break;
      case 'hint_request':
        this.handleHintRequest();
        break;
    }
  }

  private handleButtonClick(id: string): void {
    if (id === 'next') {
      this.goNext();
      return;
    }
    if (id === 'back') {
      this.goBack();
      return;
    }

    // Predictions - correct is C
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }

    // Twist predictions - correct is B
    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
      this.emitCoachEvent('prediction_made', { twistPrediction: this.twistPrediction });
      return;
    }

    // Material selection
    if (id.startsWith('material_')) {
      this.selectedMaterial = id.replace('material_', '');
      return;
    }

    // Test answers
    if (id.startsWith('answer_')) {
      this.testAnswers[this.testQuestion] = parseInt(id.replace('answer_', ''), 10);
      return;
    }

    // Test navigation
    if (id === 'test_next' && this.testQuestion < testQuestions.length - 1) {
      this.testQuestion++;
      return;
    }
    if (id === 'test_prev' && this.testQuestion > 0) {
      this.testQuestion--;
      return;
    }
    if (id === 'test_submit') {
      this.testSubmitted = true;
      this.emitCoachEvent('test_completed', { score: this.calculateTestScore() });
      return;
    }

    // App tabs
    if (id.startsWith('app_')) {
      const appIndex = parseInt(id.replace('app_', ''), 10);
      this.selectedApp = appIndex;
      this.completedApps[appIndex] = true;
      return;
    }

    // Snap to Brewster's angle
    if (id === 'snap_brewster') {
      this.incidentAngle = this.calculateBrewsterAngle();
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'incident_angle') {
      this.incidentAngle = value;
      return;
    }
    if (id === 'filter_angle') {
      this.filterAngle = value;
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'show_polarization') {
      this.showPolarization = value;
      return;
    }
    if (id === 'show_angles') {
      this.showAngles = value;
      return;
    }
  }

  private handleProgressClick(index: number): void {
    const currentIdx = this.phaseOrder.indexOf(this.phase);
    if (index < currentIdx) {
      this.goToPhase(this.phaseOrder[index]);
    }
  }

  private handleHintRequest(): void {
    this.emitCoachEvent('hint_requested', { phase: this.phase });
  }

  // === NAVIGATION ===

  private goToPhase(newPhase: GamePhase): void {
    const now = Date.now();
    if (now - this.lastNavTime < 200 || this.isNavigating) return;

    this.lastNavTime = now;
    this.isNavigating = true;
    this.phase = newPhase;

    this.emitCoachEvent('phase_changed', {
      phase: newPhase,
      phaseLabel: this.phaseLabels[newPhase],
    });

    setTimeout(() => {
      this.isNavigating = false;
    }, 400);
  }

  private goNext(): void {
    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx < this.phaseOrder.length - 1) {
      this.goToPhase(this.phaseOrder[idx + 1]);
    }
  }

  private goBack(): void {
    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx > 0) {
      this.goToPhase(this.phaseOrder[idx - 1]);
    }
  }

  // === PHYSICS SIMULATION (PROTECTED - runs on server only) ===

  /**
   * PROTECTED: Calculate Brewster's angle
   * theta_B = arctan(n2/n1) where n1 = 1 (air)
   */
  private calculateBrewsterAngle(): number {
    const n = materials[this.selectedMaterial].n;
    return Math.atan(n) * (180 / Math.PI); // Convert to degrees
  }

  /**
   * PROTECTED: Calculate refraction angle using Snell's law
   * n1*sin(theta1) = n2*sin(theta2)
   */
  private calculateRefractionAngle(): number {
    const n = materials[this.selectedMaterial].n;
    const thetaRad = this.incidentAngle * (Math.PI / 180);
    const sinTheta2 = Math.sin(thetaRad) / n;
    if (Math.abs(sinTheta2) > 1) return 90; // Total internal reflection
    return Math.asin(sinTheta2) * (180 / Math.PI);
  }

  /**
   * PROTECTED: Calculate polarization percentage at current angle
   * At Brewster's angle, p-polarized reflection goes to 0
   */
  private calculatePolarization(): number {
    const brewster = this.calculateBrewsterAngle();
    const diff = Math.abs(this.incidentAngle - brewster);
    // Simplified model: polarization peaks near Brewster's angle
    return Math.max(0, 100 - diff * 5);
  }

  /**
   * PROTECTED: Calculate reflectance for s and p polarizations (simplified Fresnel)
   */
  private calculateReflectances(): { Rs: number; Rp: number } {
    const n = materials[this.selectedMaterial].n;
    const theta1 = this.incidentAngle * (Math.PI / 180);
    const theta2 = this.calculateRefractionAngle() * (Math.PI / 180);

    const cosTheta1 = Math.cos(theta1);
    const cosTheta2 = Math.cos(theta2);

    // Fresnel equations (simplified)
    const Rs = Math.pow((cosTheta1 - n * cosTheta2) / (cosTheta1 + n * cosTheta2), 2);
    const Rp = Math.pow((n * cosTheta1 - cosTheta2) / (n * cosTheta1 + cosTheta2), 2);

    return { Rs: Math.min(1, Math.abs(Rs)) * 100, Rp: Math.min(1, Math.abs(Rp)) * 100 };
  }

  /**
   * PROTECTED: Check if at Brewster's angle (within tolerance)
   */
  private isAtBrewsterAngle(): boolean {
    const brewster = this.calculateBrewsterAngle();
    return Math.abs(this.incidentAngle - brewster) < 2;
  }

  update(deltaTime: number): void {
    this.time += deltaTime / 1000;
  }

  // === TEST SCORING (PROTECTED) ===

  private calculateTestScore(): number {
    let correct = 0;
    for (let i = 0; i < testQuestions.length; i++) {
      if (this.testAnswers[i] === testQuestions[i].correctIndex) {
        correct++;
      }
    }
    return correct;
  }

  // === RENDERING ===

  render(): GameFrame {
    const r = new CommandRenderer(this.viewport.width, this.viewport.height);
    r.reset();

    r.setViewport(700, 500);

    this.renderBackground(r);

    switch (this.phase) {
      case 'hook':
        this.renderHookPhase(r);
        break;
      case 'predict':
        this.renderPredictPhase(r);
        break;
      case 'play':
        this.renderPlayPhase(r);
        break;
      case 'review':
        this.renderReviewPhase(r);
        break;
      case 'twist_predict':
        this.renderTwistPredictPhase(r);
        break;
      case 'twist_play':
        this.renderTwistPlayPhase(r);
        break;
      case 'twist_review':
        this.renderTwistReviewPhase(r);
        break;
      case 'transfer':
        this.renderTransferPhase(r);
        break;
      case 'test':
        this.renderTestPhase(r);
        break;
      case 'mastery':
        this.renderMasteryPhase(r);
        break;
    }

    this.renderUIState(r);

    return r.toFrame(this.nextFrame());
  }

  private renderBackground(r: CommandRenderer): void {
    r.clear(colors.bgDark);

    r.circle(175, 0, 200, { fill: colors.primary, opacity: 0.03 });
    r.circle(525, 500, 200, { fill: colors.accent, opacity: 0.03 });
  }

  // --- LIGHT REFLECTION RENDERER ---

  private renderLightReflection(r: CommandRenderer, centerX: number, centerY: number, width: number, height: number): void {
    const surfaceY = centerY + 30;
    const material = materials[this.selectedMaterial];
    const brewsterAngle = this.calculateBrewsterAngle();
    const refractionAngle = this.calculateRefractionAngle();
    const reflectances = this.calculateReflectances();
    const atBrewster = this.isAtBrewsterAngle();

    // Background
    r.rect(centerX - width / 2, centerY - height / 2, width, height, {
      fill: colors.bgCard,
      stroke: colors.border,
      rx: 16,
    });

    // Air region (top)
    r.rect(centerX - width / 2 + 5, centerY - height / 2 + 5, width - 10, surfaceY - (centerY - height / 2), {
      fill: '#1e3a5f20',
      rx: 12,
    });
    r.text(centerX - width / 2 + 40, centerY - height / 2 + 25, 'AIR (n=1)', {
      fill: colors.textMuted,
      fontSize: 10,
    });

    // Material region (bottom)
    r.rect(centerX - width / 2 + 5, surfaceY, width - 10, (centerY + height / 2) - surfaceY - 5, {
      fill: material.color,
      opacity: 0.3,
      rx: 12,
    });
    r.text(centerX - width / 2 + 40, surfaceY + 20, `${material.name} (n=${material.n})`, {
      fill: colors.textMuted,
      fontSize: 10,
    });

    // Surface line
    r.line(centerX - width / 2 + 20, surfaceY, centerX + width / 2 - 20, surfaceY, {
      stroke: colors.surface,
      strokeWidth: 3,
    });

    // Normal line (dashed)
    r.line(centerX, surfaceY - 80, centerX, surfaceY + 80, {
      stroke: colors.textMuted,
      strokeWidth: 1,
      strokeDasharray: '5,5',
    });

    // Incident ray
    const incidentRad = (90 - this.incidentAngle) * (Math.PI / 180);
    const incidentLength = 100;
    const incStartX = centerX - Math.cos(incidentRad) * incidentLength;
    const incStartY = surfaceY - Math.sin(incidentRad) * incidentLength;

    r.line(incStartX, incStartY, centerX, surfaceY, {
      stroke: colors.lightRay,
      strokeWidth: 4,
    });
    // Arrow head
    r.circle(centerX - 15, surfaceY - 15 * Math.tan(incidentRad), 4, { fill: colors.lightRay });

    // Reflected ray
    const reflectedRad = (90 + this.incidentAngle) * (Math.PI / 180);
    const refEndX = centerX + Math.cos(reflectedRad) * incidentLength * 0.8;
    const refEndY = surfaceY - Math.sin(reflectedRad) * incidentLength * 0.8;

    r.line(centerX, surfaceY, refEndX, refEndY, {
      stroke: atBrewster ? colors.success : colors.reflectedRay,
      strokeWidth: atBrewster ? 2 : 3,
      opacity: atBrewster ? 0.4 : 1,
    });

    // Refracted ray
    const refractedRad = (90 - refractionAngle) * (Math.PI / 180);
    const refractEndX = centerX + Math.cos(refractedRad) * incidentLength * 0.6;
    const refractEndY = surfaceY + Math.sin(refractedRad) * incidentLength * 0.6;

    r.line(centerX, surfaceY, refractEndX, refractEndY, {
      stroke: colors.refractedRay,
      strokeWidth: 3,
    });

    // Angle labels
    if (this.showAngles) {
      r.text(centerX - 30, surfaceY - 50, `${this.incidentAngle.toFixed(0)} deg`, {
        fill: colors.lightRay,
        fontSize: 11,
        fontWeight: 'bold',
      });

      r.text(centerX + 25, surfaceY - 50, `${this.incidentAngle.toFixed(0)} deg`, {
        fill: colors.reflectedRay,
        fontSize: 11,
      });

      r.text(centerX + 25, surfaceY + 40, `${refractionAngle.toFixed(0)} deg`, {
        fill: colors.refractedRay,
        fontSize: 11,
      });
    }

    // Brewster angle indicator
    r.rect(centerX + 80, surfaceY - 100, 110, 60, { fill: colors.bgCardLight, rx: 8 });
    r.text(centerX + 135, surfaceY - 85, 'Brewster\'s Angle', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
    r.text(centerX + 135, surfaceY - 65, `${brewsterAngle.toFixed(1)} deg`, {
      fill: atBrewster ? colors.success : colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(centerX + 135, surfaceY - 50, atBrewster ? 'MATCH!' : `Diff: ${Math.abs(this.incidentAngle - brewsterAngle).toFixed(1)} deg`, {
      fill: atBrewster ? colors.success : colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle',
    });

    // Polarization indicator
    if (this.showPolarization) {
      const pol = this.calculatePolarization();
      r.rect(centerX - width / 2 + 20, surfaceY + 50, 120, 50, { fill: colors.bgCardLight, rx: 8 });
      r.text(centerX - width / 2 + 80, surfaceY + 68, 'Polarization', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
      r.text(centerX - width / 2 + 80, surfaceY + 88, `${pol.toFixed(0)}%`, {
        fill: pol > 90 ? colors.success : colors.textPrimary,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
    }

    // Reflectance stats
    r.rect(centerX + 60, surfaceY + 50, 130, 50, { fill: colors.bgCardLight, rx: 8 });
    r.text(centerX + 125, surfaceY + 65, 'Reflectance', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
    r.text(centerX + 100, surfaceY + 85, `S: ${reflectances.Rs.toFixed(1)}%`, { fill: colors.reflectedRay, fontSize: 10, textAnchor: 'middle' });
    r.text(centerX + 150, surfaceY + 85, `P: ${reflectances.Rp.toFixed(1)}%`, {
      fill: atBrewster ? colors.success : colors.textSecondary,
      fontSize: 10,
      fontWeight: atBrewster ? 'bold' : 'normal',
      textAnchor: 'middle',
    });
  }

  // --- PHASE RENDERERS ---

  private renderHookPhase(r: CommandRenderer): void {
    r.rect(280, 30, 140, 28, { fill: colors.primary, opacity: 0.1, rx: 14, stroke: colors.primary, strokeWidth: 1 });
    r.text(350, 49, 'OPTICS EXPLORATION', {
      fill: colors.primary,
      fontSize: 10,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 100, 'Brewster\'s Angle', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 135, 'The magic angle that eliminates glare', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    r.rect(160, 160, 380, 200, { fill: colors.bgCard, stroke: colors.border, rx: 20 });

    r.text(350, 200, 'You\'re at a lake wearing polarized sunglasses.', {
      fill: colors.textPrimary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 230, 'At one specific angle, the water glare', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 260, 'COMPLETELY disappears - not just reduced!', {
      fill: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 310, 'Why does this magic angle exist?', {
      fill: colors.warning,
      fontSize: 14,
      textAnchor: 'middle',
    });
  }

  private renderPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 80, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 115, 'At Brewster\'s angle, glare is COMPLETELY eliminated.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 145, 'What\'s special about light reflected at this angle?', {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (this.prediction) {
      const isCorrect = this.prediction === 'C';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(
        350,
        375,
        isCorrect
          ? 'Correct! At Brewster\'s angle, reflected light is 100% polarized!'
          : 'Think about what property of light polarized sunglasses block.',
        {
          fill: isCorrect ? colors.success : colors.danger,
          fontSize: 13,
          fontWeight: 'bold',
          textAnchor: 'middle',
        }
      );
    }
  }

  private renderPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Polarization Lab', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    this.renderLightReflection(r, 350, 220, 450, 300);

    // Formula
    r.rect(100, 400, 500, 55, { fill: colors.bgCardLight, rx: 12 });
    r.text(350, 420, 'Brewster\'s Angle: theta_B = arctan(n2/n1)', {
      fill: colors.primary,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(350, 440, 'At this angle, p-polarized reflection goes to ZERO!', {
      fill: colors.textSecondary,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Brewster\'s Angle', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 290, 140, { fill: '#60a5fa40', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'The Physics', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const physicsInfo = [
      'theta_B = arctan(n2/n1)',
      'At Brewster\'s angle: reflected is 90 deg from refracted',
      'P-polarized reflection = 0',
    ];
    physicsInfo.forEach((line, i) => {
      r.text(70, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 10 });
    });

    r.rect(360, 70, 290, 140, { fill: '#818cf840', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Polarization', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    const polInfo = [
      'S-polarized: parallel to surface',
      'P-polarized: perpendicular to surface',
      'At Brewster: only S-polarized reflects',
    ];
    polInfo.forEach((line, i) => {
      r.text(380, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 10 });
    });

    r.rect(50, 230, 600, 80, { fill: '#34d39940', stroke: colors.success, rx: 16 });
    r.text(350, 255, 'Key Insight', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 280, 'Polarized sunglasses block horizontally polarized light. At Brewster\'s angle,', {
      fill: colors.textPrimary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(350, 298, 'reflection is 100% horizontally polarized - so it\'s completely blocked!', {
      fill: colors.textPrimary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Photographer\'s Trick', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 120, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'Photographers can make reflections appear or disappear', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 155, 'by rotating their polarizing filter.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 185, 'What determines if they see MORE or LESS reflection?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'B';
      r.rect(100, 340, 500, 60, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 12,
      });
      r.text(
        350,
        375,
        isCorrect
          ? 'Correct! Rotating the filter aligns it to pass or block polarized light!'
          : 'Think about how a polarizing filter interacts with polarized light.',
        {
          fill: isCorrect ? colors.success : colors.danger,
          fontSize: 13,
          fontWeight: 'bold',
          textAnchor: 'middle',
        }
      );
    }
  }

  private renderTwistPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Polarizer Control', {
      fill: colors.warning,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    this.renderLightReflection(r, 350, 200, 400, 260);

    // Filter angle visualization
    const filterIntensity = Math.cos(this.filterAngle * Math.PI / 180);
    const transmittedPercent = Math.pow(filterIntensity, 2) * 100;

    r.rect(120, 360, 460, 80, { fill: colors.bgCardLight, rx: 12 });
    r.text(350, 385, 'Polarizer Filter', { fill: colors.warning, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(250, 415, `Filter Angle: ${this.filterAngle} deg`, { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(450, 415, `Transmission: ${transmittedPercent.toFixed(0)}%`, {
      fill: transmittedPercent < 20 ? colors.success : colors.textPrimary,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Malus\'s Law', {
      fill: colors.warning,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(100, 90, 500, 180, { fill: '#fbbf2430', stroke: colors.warning, rx: 16 });
    r.text(350, 120, 'Controlling Polarized Light', {
      fill: colors.warning,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 160, 'I = I_0 * cos^2(theta)', {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(200, 200, 'Filter at 0 deg: 100% passes', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    r.text(500, 200, 'Filter at 90 deg: 0% passes', { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });

    r.text(350, 245, 'Photographers have a "reflection volume knob"!', {
      fill: colors.success,
      fontSize: 13,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
  }

  private renderTransferPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Real-World Applications', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const tabWidth = 140;
    applications.forEach((app, i) => {
      const isSelected = i === this.selectedApp;
      const isCompleted = this.completedApps[i];
      const x = 80 + i * (tabWidth + 15);

      r.rect(x, 70, tabWidth, 40, {
        fill: isSelected ? colors.primary : colors.bgCard,
        stroke: isCompleted ? colors.success : colors.border,
        rx: 8,
      });
      r.text(x + tabWidth / 2, 95, app.title.split(' ')[0], {
        fill: isSelected ? colors.textPrimary : colors.textSecondary,
        fontSize: 12,
        textAnchor: 'middle',
      });
    });

    const app = applications[this.selectedApp];
    r.rect(80, 130, 540, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });

    r.text(350, 165, app.title, {
      fill: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 200, app.description, {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });

    r.text(350, 260, app.details, {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });

    r.text(350, 360, `Progress: ${this.completedApps.filter((c) => c).length}/4`, {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });

    applications.forEach((_, i) => {
      r.circle(310 + i * 25, 385, 6, {
        fill: this.completedApps[i] ? colors.success : colors.bgCardLight,
      });
    });
  }

  private renderTestPhase(r: CommandRenderer): void {
    if (this.testSubmitted) {
      this.renderTestResults(r);
      return;
    }

    const q = testQuestions[this.testQuestion];

    r.text(350, 40, `Question ${this.testQuestion + 1} of ${testQuestions.length}`, {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });

    r.text(350, 80, q.question, {
      fill: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    q.options.forEach((option, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;

      r.rect(100, 110 + i * 55, 500, 45, {
        fill: isSelected ? colors.primary + '40' : colors.bgCard,
        stroke: isSelected ? colors.primary : colors.border,
        rx: 8,
      });
      r.text(350, 138 + i * 55, option, {
        fill: isSelected ? colors.primary : colors.textSecondary,
        fontSize: 13,
        textAnchor: 'middle',
      });
    });
  }

  private renderTestResults(r: CommandRenderer): void {
    const score = this.calculateTestScore();
    const passed = score >= 7;

    r.text(350, 100, passed ? 'Congratulations!' : 'Keep Learning!', {
      fill: passed ? colors.success : colors.warning,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 160, `Score: ${score} / ${testQuestions.length}`, {
      fill: colors.textPrimary,
      fontSize: 24,
      textAnchor: 'middle',
    });

    r.text(350, 200, passed ? 'Excellent! You understand Brewster\'s angle!' : 'Keep studying! Review and try again.', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });
  }

  private renderMasteryPhase(r: CommandRenderer): void {
    r.rect(150, 80, 400, 340, { fill: colors.bgCard, stroke: colors.border, rx: 24 });

    r.text(350, 130, 'Polarization Master!', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, 'You have mastered Brewster\'s angle!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    const badges = [
      { icon: 'theta_B', label: 'Brewster Angle' },
      { icon: 'pol', label: 'Polarization' },
      { icon: 'camera', label: 'Photography' },
      { icon: 'laser', label: 'Laser Optics' },
    ];

    badges.forEach((badge, i) => {
      const x = 180 + (i % 2) * 170;
      const y = 200 + Math.floor(i / 2) * 80;
      r.rect(x, y, 150, 60, { fill: colors.bgCardLight, rx: 12 });
      r.text(x + 75, y + 25, badge.icon, { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x + 75, y + 45, badge.label, { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    });
  }

  // --- UI STATE ---

  private renderUIState(r: CommandRenderer): void {
    r.setHeader(this.gameTitle, this.phaseLabels[this.phase]);

    r.setProgress({
      id: 'phase_progress',
      current: this.phaseOrder.indexOf(this.phase) + 1,
      total: this.phaseOrder.length,
      labels: this.phaseOrder.map((p) => this.phaseLabels[p]),
      color: colors.primary,
    });

    if (this.guidedMode) {
      r.setCoachMessage(this.coachMessages[this.phase]);
    }

    const idx = this.phaseOrder.indexOf(this.phase);

    if (idx > 0) {
      r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });
    }

    switch (this.phase) {
      case 'hook':
        r.addButton({ id: 'next', label: 'Discover the Secret', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Sunglasses focus at that spot', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Water surface is different', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Light is perfectly polarized', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. Eyes adjust at that angle', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Explore the Physics', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({ id: 'incident_angle', label: 'Incident Angle (deg)', value: this.incidentAngle, min: 10, max: 80, step: 1 });
        r.addButton({ id: 'material_glass', label: 'Glass', variant: this.selectedMaterial === 'glass' ? 'primary' : 'ghost' });
        r.addButton({ id: 'material_water', label: 'Water', variant: this.selectedMaterial === 'water' ? 'primary' : 'ghost' });
        r.addButton({ id: 'material_diamond', label: 'Diamond', variant: this.selectedMaterial === 'diamond' ? 'primary' : 'ghost' });
        r.addButton({ id: 'snap_brewster', label: 'Snap to Brewster', variant: 'warning' });
        r.addButton({ id: 'next', label: 'Review Concepts', variant: 'primary' });
        break;

      case 'review':
        r.addButton({ id: 'next', label: 'Try the Photographer Challenge', variant: 'warning' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Filter thickness', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Filter rotation angle', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Distance to subject', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D. Light color', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See the Control', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addSlider({ id: 'incident_angle', label: 'Incident Angle', value: this.incidentAngle, min: 10, max: 80, step: 1 });
        r.addSlider({ id: 'filter_angle', label: 'Filter Rotation', value: this.filterAngle, min: 0, max: 90, step: 5 });
        r.addButton({ id: 'snap_brewster', label: 'Snap to Brewster', variant: 'warning' });
        r.addButton({ id: 'next', label: 'See Why', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'next', label: 'Real-World Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Photos', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Glasses', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Lasers', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Displays', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every((c) => c)) {
          r.addButton({ id: 'next', label: 'Take Knowledge Test', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= testQuestions.length - 1 });
          if (this.testAnswers.every((a) => a !== null)) {
            r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
          }
        } else {
          const score = this.calculateTestScore();
          if (score >= 7) {
            r.addButton({ id: 'next', label: 'Claim Your Badge', variant: 'success' });
          } else {
            r.addButton({ id: 'back', label: 'Review & Try Again', variant: 'secondary' });
          }
        }
        break;

      case 'mastery':
        r.addButton({ id: 'back', label: 'Explore Again', variant: 'secondary' });
        break;
    }
  }

  // === STATE MANAGEMENT ===

  getCurrentPhase(): string {
    return this.phase;
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      incidentAngle: this.incidentAngle,
      selectedMaterial: this.selectedMaterial,
      showPolarization: this.showPolarization,
      showAngles: this.showAngles,
      filterAngle: this.filterAngle,
      testQuestion: this.testQuestion,
      testAnswers: this.testAnswers,
      testSubmitted: this.testSubmitted,
      selectedApp: this.selectedApp,
      completedApps: this.completedApps,
      guidedMode: this.guidedMode,
    };
  }

  restoreState(state: Record<string, unknown>): void {
    this.phase = (state.phase as GamePhase) || 'hook';
    this.prediction = (state.prediction as string) || null;
    this.twistPrediction = (state.twistPrediction as string) || null;
    this.incidentAngle = (state.incidentAngle as number) || 45;
    this.selectedMaterial = (state.selectedMaterial as string) || 'glass';
    this.showPolarization = (state.showPolarization as boolean) ?? true;
    this.showAngles = (state.showAngles as boolean) ?? true;
    this.filterAngle = (state.filterAngle as number) || 0;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

// === FACTORY FUNCTION ===
export function createBrewsterAngleGame(sessionId: string): BrewsterAngleGame {
  return new BrewsterAngleGame(sessionId);
}
