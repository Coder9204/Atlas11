/**
 * Camera Obscura Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Pinhole image formation: h_image/h_object = d_image/d_object
 * - Image inversion principle (light travels in straight lines)
 * - Aperture vs brightness/sharpness trade-off
 * - F-stop calculations and depth of field
 * - Similar triangles in optical systems
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

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

const testQuestions: TestQuestion[] = [
  {
    question: 'Why is the image in a pinhole camera upside down?',
    options: ['Pinhole flips light', 'Light travels in straight lines (top to bottom)', 'Lens inside box', 'Optical illusion'],
    correctIndex: 1,
  },
  {
    question: 'What happens if you make the pinhole larger?',
    options: ['Sharper only', 'Dimmer only', 'Brighter but blurrier', 'Nothing changes'],
    correctIndex: 2,
  },
  {
    question: 'What happens if you move the object closer to the pinhole?',
    options: ['Image gets smaller', 'Image gets larger', 'Image stays same', 'Image disappears'],
    correctIndex: 1,
  },
  {
    question: 'Why do you squint to see more clearly?',
    options: ['Changes focal length', 'Just a habit', 'Creates smaller aperture, increasing sharpness', 'Filters blue light'],
    correctIndex: 2,
  },
  {
    question: 'Relationship between pinhole size and brightness:',
    options: ['No relationship', 'Smaller = brighter', 'Larger = brighter', 'Only color affected'],
    correctIndex: 2,
  },
  {
    question: 'What does f/2 mean compared to f/16?',
    options: ['f/2 is smaller aperture', 'f/2 is larger aperture (more light)', 'They are the same', 'f/16 lets in more light'],
    correctIndex: 1,
  },
  {
    question: 'How does your eye create a focused image?',
    options: ['Pupil flips image', 'Light through pupil, lens focuses onto retina', 'Brain creates image', 'Eyes don\'t focus light'],
    correctIndex: 1,
  },
  {
    question: 'Why do tree leaves create crescents during solar eclipse?',
    options: ['Leaves change shape', 'Gaps act as pinholes projecting sun\'s shape', 'Reflected sunlight', 'Illusion'],
    correctIndex: 1,
  },
  {
    question: 'Moving the screen farther from pinhole:',
    options: ['Smaller and brighter', 'Larger and dimmer', 'Stays same', 'Disappears'],
    correctIndex: 1,
  },
  {
    question: 'Artists like Vermeer may have used camera obscuras to:',
    options: ['Project colors', 'Trace scenes with photographic accuracy', 'Make paint dry faster', 'Create 3D effects'],
    correctIndex: 1,
  },
];

const colors = {
  primary: '#60a5fa',
  primaryDark: '#3b82f6',
  accent: '#f472b6',
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#ef4444',
  bgDark: '#0a0f1a',
  bgCard: '#141e2c',
  bgCardLight: '#1e293b',
  border: '#1e3a5f',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  lightRay: '#fbbf24',
  object: '#ef4444',
  image: '#3b82f6',
};

const applications = [
  {
    title: 'Your Eyes',
    icon: 'eye',
    description: 'Your eye works like a camera obscura! Light enters through the pupil, and an inverted image forms on your retina.',
    details: 'Squinting creates a smaller aperture that increases depth of field and sharpness.',
  },
  {
    title: 'Camera Aperture',
    icon: 'camera',
    description: 'F-stops control aperture size. f/2 = bright, shallow focus. f/16 = dim, everything sharp.',
    details: 'Portrait mode on phones simulates large aperture blur artificially.',
  },
  {
    title: 'Eclipse Viewing',
    icon: 'eclipse',
    description: 'During eclipses, tree leaves create thousands of pinholes projecting crescent suns!',
    details: 'Make a safe eclipse viewer from a cardboard box and a pinhole.',
  },
  {
    title: 'Historical Art',
    icon: 'art',
    description: 'Artists like Vermeer may have used camera obscura rooms to trace scenes with photographic accuracy.',
    details: 'The Camera Obscura in Edinburgh projects a live panoramic view of the city.',
  },
];

export class CameraObscuraGame extends BaseGame {
  readonly gameType = 'camera_obscura';
  readonly gameTitle = 'Camera Obscura';

  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;

  private pinholeSize = 10;
  private objectDistance = 150;
  private screenDistance = 100;
  private showRays = true;
  private time = 0;

  private testQuestion = 0;
  private testAnswers: (number | null)[] = Array(10).fill(null);
  private testSubmitted = false;

  private selectedApp = 0;
  private completedApps = [false, false, false, false];

  private lastNavTime = 0;
  private isNavigating = false;
  private guidedMode = true;

  private readonly phaseOrder: GamePhase[] = [
    'hook', 'predict', 'play', 'review', 'twist_predict',
    'twist_play', 'twist_review', 'transfer', 'test', 'mastery',
  ];

  private readonly phaseLabels: Record<GamePhase, string> = {
    hook: 'Hook', predict: 'Predict', play: 'Lab', review: 'Review',
    twist_predict: 'Twist', twist_play: 'Demo', twist_review: 'Discovery',
    transfer: 'Apply', test: 'Test', mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Poke a tiny hole in a dark box. Point it at a candle. What do you see inside?',
    predict: 'Think about how light travels through a tiny hole...',
    play: 'Adjust pinhole size and distances. Watch how the image changes!',
    review: 'Light travels in straight lines through the pinhole - top goes to bottom!',
    twist_predict: 'What if you make the pinhole LARGER?',
    twist_play: 'See the trade-off between brightness and sharpness!',
    twist_review: 'Larger hole = more light but overlapping rays cause blur.',
    transfer: 'From eyes to cameras to eclipse viewing!',
    test: 'Test your understanding of pinhole optics!',
    mastery: 'You understand the camera obscura!',
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
    this.emitCoachEvent('game_started', { phase: this.phase });
  }

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click': this.handleButtonClick(input.id!); break;
      case 'slider_change': this.handleSliderChange(input.id!, input.value); break;
      case 'toggle_change': this.handleToggleChange(input.id!, input.value); break;
      case 'progress_click': this.handleProgressClick(input.index!); break;
    }
  }

  private handleButtonClick(id: string): void {
    if (id === 'next') { this.goNext(); return; }
    if (id === 'back') { this.goBack(); return; }

    if (id.startsWith('predict_')) { this.prediction = id.replace('predict_', ''); return; }
    if (id.startsWith('twist_')) { this.twistPrediction = id.replace('twist_', ''); return; }
    if (id.startsWith('answer_')) { this.testAnswers[this.testQuestion] = parseInt(id.replace('answer_', ''), 10); return; }
    if (id === 'test_next' && this.testQuestion < 9) { this.testQuestion++; return; }
    if (id === 'test_prev' && this.testQuestion > 0) { this.testQuestion--; return; }
    if (id === 'test_submit') { this.testSubmitted = true; return; }
    if (id.startsWith('app_')) { const idx = parseInt(id.replace('app_', ''), 10); this.selectedApp = idx; this.completedApps[idx] = true; return; }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'pinhole_size') { this.pinholeSize = value; }
    if (id === 'object_distance') { this.objectDistance = value; }
    if (id === 'screen_distance') { this.screenDistance = value; }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'show_rays') { this.showRays = value; }
  }

  private handleProgressClick(index: number): void {
    const currentIdx = this.phaseOrder.indexOf(this.phase);
    if (index < currentIdx) { this.goToPhase(this.phaseOrder[index]); }
  }

  private goToPhase(newPhase: GamePhase): void {
    const now = Date.now();
    if (now - this.lastNavTime < 200 || this.isNavigating) return;
    this.lastNavTime = now;
    this.isNavigating = true;
    this.phase = newPhase;
    this.emitCoachEvent('phase_changed', { phase: newPhase });
    setTimeout(() => { this.isNavigating = false; }, 400);
  }

  private goNext(): void {
    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx < this.phaseOrder.length - 1) this.goToPhase(this.phaseOrder[idx + 1]);
  }

  private goBack(): void {
    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx > 0) this.goToPhase(this.phaseOrder[idx - 1]);
  }

  /**
   * PROTECTED: Calculate image size using similar triangles
   * h_image/h_object = d_screen/d_object
   */
  private calculateImageSize(objectHeight: number = 60): number {
    return objectHeight * (this.screenDistance / this.objectDistance);
  }

  /**
   * PROTECTED: Calculate image brightness (proportional to aperture area)
   */
  private calculateBrightness(): number {
    return Math.min(100, (this.pinholeSize * this.pinholeSize) / 2);
  }

  /**
   * PROTECTED: Calculate sharpness (inversely proportional to aperture)
   */
  private calculateSharpness(): number {
    return Math.max(0, 100 - this.pinholeSize * 5);
  }

  update(deltaTime: number): void {
    this.time += deltaTime / 1000;
  }

  private calculateTestScore(): number {
    let correct = 0;
    for (let i = 0; i < testQuestions.length; i++) {
      if (this.testAnswers[i] === testQuestions[i].correctIndex) correct++;
    }
    return correct;
  }

  render(): GameFrame {
    const r = new CommandRenderer(this.viewport.width, this.viewport.height);
    r.reset();
    r.setViewport(700, 500);
    r.clear(colors.bgDark);

    switch (this.phase) {
      case 'hook': this.renderHookPhase(r); break;
      case 'predict': this.renderPredictPhase(r); break;
      case 'play': this.renderPlayPhase(r); break;
      case 'review': this.renderReviewPhase(r); break;
      case 'twist_predict': this.renderTwistPredictPhase(r); break;
      case 'twist_play': this.renderTwistPlayPhase(r); break;
      case 'twist_review': this.renderTwistReviewPhase(r); break;
      case 'transfer': this.renderTransferPhase(r); break;
      case 'test': this.renderTestPhase(r); break;
      case 'mastery': this.renderMasteryPhase(r); break;
    }

    this.renderUIState(r);
    return r.toFrame(this.nextFrame());
  }

  private renderCameraObscura(r: CommandRenderer, centerX: number, centerY: number, w: number, h: number): void {
    // Dark box
    r.rect(centerX - w/2, centerY - h/2, w, h, { fill: colors.bgCard, stroke: colors.border, rx: 12 });

    const boxLeft = centerX - w/2;
    const boxRight = centerX + w/2;
    const pinholeX = boxLeft + w * 0.4;

    // Object (candle on the left)
    const objectX = boxLeft + 40;
    const objectY = centerY;
    const objectHeight = 60;

    // Candle
    r.rect(objectX - 5, objectY - objectHeight/2, 10, objectHeight, { fill: '#fbbf24' });
    r.ellipse(objectX, objectY - objectHeight/2 - 10, 8, 12, { fill: '#ef4444' });

    // Pinhole wall
    r.rect(pinholeX - 5, centerY - h/2 + 10, 10, h - 20, { fill: colors.bgCardLight });
    // Pinhole opening
    const holeSize = Math.max(3, this.pinholeSize);
    r.rect(pinholeX - 2, centerY - holeSize/2, 4, holeSize, { fill: colors.bgDark });

    // Screen
    const screenX = boxRight - 50;
    r.rect(screenX - 3, centerY - h/2 + 20, 6, h - 40, { fill: '#f8fafc', opacity: 0.8 });

    // Image (inverted!)
    const imageHeight = this.calculateImageSize(objectHeight);
    r.rect(screenX - 8, centerY - imageHeight/2, 10, imageHeight, { fill: colors.image, opacity: 0.7 });

    // Light rays
    if (this.showRays) {
      // Top of object -> bottom of image
      r.line(objectX, objectY - objectHeight/2, pinholeX, centerY, { stroke: colors.lightRay, strokeWidth: 2, opacity: 0.6 });
      r.line(pinholeX, centerY, screenX, centerY + imageHeight/2, { stroke: colors.lightRay, strokeWidth: 2, opacity: 0.6 });

      // Bottom of object -> top of image
      r.line(objectX, objectY + objectHeight/2, pinholeX, centerY, { stroke: colors.lightRay, strokeWidth: 2, opacity: 0.4 });
      r.line(pinholeX, centerY, screenX, centerY - imageHeight/2, { stroke: colors.lightRay, strokeWidth: 2, opacity: 0.4 });
    }

    // Labels
    r.text(objectX, centerY + 60, 'Object', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(pinholeX, centerY + 60, 'Pinhole', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    r.text(screenX, centerY + 60, 'Image', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Stats
    r.rect(centerX + 100, centerY - h/2 + 10, 120, 80, { fill: colors.bgCardLight, rx: 8 });
    r.text(centerX + 160, centerY - h/2 + 30, `Pinhole: ${this.pinholeSize}mm`, { fill: colors.textSecondary, fontSize: 10, textAnchor: 'middle' });
    r.text(centerX + 160, centerY - h/2 + 50, `Brightness: ${this.calculateBrightness().toFixed(0)}%`, { fill: colors.warning, fontSize: 10, textAnchor: 'middle' });
    r.text(centerX + 160, centerY - h/2 + 70, `Sharpness: ${this.calculateSharpness().toFixed(0)}%`, { fill: colors.success, fontSize: 10, textAnchor: 'middle' });
  }

  private renderHookPhase(r: CommandRenderer): void {
    r.text(350, 100, 'Camera Obscura', { fill: colors.textPrimary, fontSize: 32, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 135, 'The ancient technology behind all cameras', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });

    r.rect(160, 160, 380, 200, { fill: colors.bgCard, stroke: colors.border, rx: 20 });
    r.text(350, 200, 'Poke a tiny hole in one side of a dark box.', { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 230, 'Point it at a candle.', { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 270, 'What does the candle look like on the opposite wall?', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
  }

  private renderPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', { fill: colors.textPrimary, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(100, 80, 500, 80, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 115, 'Light from a candle passes through a tiny pinhole.', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 140, 'What does the image on the screen look like?', { fill: colors.textPrimary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    if (this.prediction) {
      const isCorrect = this.prediction === 'B';
      r.rect(100, 340, 500, 60, { fill: isCorrect ? '#065f4620' : '#7f1d1d20', stroke: isCorrect ? colors.success : colors.danger, rx: 12 });
      r.text(350, 375, isCorrect ? 'Correct! The image is upside down because light travels in straight lines!' : 'Think about how light rays cross through a tiny hole.', {
        fill: isCorrect ? colors.success : colors.danger, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle',
      });
    }
  }

  private renderPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Pinhole Camera Lab', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    this.renderCameraObscura(r, 280, 200, 400, 250);

    r.rect(100, 360, 500, 60, { fill: colors.bgCardLight, rx: 12 });
    r.text(350, 385, 'Image Size = Object Size x (Screen Distance / Object Distance)', { fill: colors.primary, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 405, 'The image is always INVERTED due to straight-line light propagation.', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
  }

  private renderReviewPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Understanding Pinhole Imaging', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(50, 70, 290, 130, { fill: '#60a5fa40', stroke: colors.primary, rx: 16 });
    r.text(195, 95, 'Why Inverted?', { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    ['Light travels in straight lines', 'Top rays go to bottom', 'Bottom rays go to top'].forEach((line, i) => {
      r.text(70, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(360, 70, 290, 130, { fill: '#f472b640', stroke: colors.accent, rx: 16 });
    r.text(505, 95, 'Similar Triangles', { fill: colors.accent, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    ['h_image / h_object = d_screen / d_object', 'Closer object = larger image', 'Farther screen = larger image'].forEach((line, i) => {
      r.text(380, 120 + i * 22, '* ' + line, { fill: colors.textSecondary, fontSize: 11 });
    });

    r.rect(50, 220, 600, 70, { fill: '#34d39940', stroke: colors.success, rx: 16 });
    r.text(350, 245, 'Historical Significance', { fill: colors.success, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 270, 'This principle was known for millennia and led to the invention of photography!', { fill: colors.textPrimary, fontSize: 12, textAnchor: 'middle' });
  }

  private renderTwistPredictPhase(r: CommandRenderer): void {
    r.text(350, 50, 'The Aperture Trade-off', { fill: colors.accent, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(100, 90, 500, 100, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 125, 'The image is dim with a tiny pinhole.', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 155, 'What happens if you make the pinhole LARGER?', { fill: colors.textPrimary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'B';
      r.rect(100, 340, 500, 60, { fill: isCorrect ? '#065f4620' : '#7f1d1d20', stroke: isCorrect ? colors.success : colors.danger, rx: 12 });
      r.text(350, 375, isCorrect ? 'Right! Brighter but blurrier - overlapping rays cause blur!' : 'Think about what happens when multiple rays can pass through.', {
        fill: isCorrect ? colors.success : colors.danger, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle',
      });
    }
  }

  private renderTwistPlayPhase(r: CommandRenderer): void {
    r.text(350, 30, 'Aperture Lab', { fill: colors.accent, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });
    this.renderCameraObscura(r, 280, 200, 400, 250);

    r.rect(100, 360, 500, 60, { fill: colors.bgCardLight, rx: 12 });
    r.text(350, 385, 'The Trade-off: Brightness vs Sharpness', { fill: colors.accent, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 405, 'Small hole = sharp but dim. Large hole = bright but blurry.', { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
  }

  private renderTwistReviewPhase(r: CommandRenderer): void {
    r.text(350, 50, 'F-Stops and Aperture', { fill: colors.accent, fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(100, 90, 500, 150, { fill: '#f472b630', stroke: colors.accent, rx: 16 });
    r.text(350, 120, 'Camera F-Numbers', { fill: colors.accent, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 155, 'f/2 (big hole) = bright, shallow focus', { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 180, 'f/16 (small hole) = dim, everything sharp', { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle' });
    r.text(350, 215, 'This is exactly the same physics as the pinhole camera!', { fill: colors.success, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
  }

  private renderTransferPhase(r: CommandRenderer): void {
    r.text(350, 40, 'Real-World Applications', { fill: colors.textPrimary, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    applications.forEach((app, i) => {
      const x = 80 + i * 155;
      r.rect(x, 70, 140, 40, {
        fill: i === this.selectedApp ? colors.primary : colors.bgCard,
        stroke: this.completedApps[i] ? colors.success : colors.border, rx: 8,
      });
      r.text(x + 70, 95, app.title.split(' ')[0], {
        fill: i === this.selectedApp ? colors.textPrimary : colors.textSecondary, fontSize: 11, textAnchor: 'middle',
      });
    });

    const app = applications[this.selectedApp];
    r.rect(80, 130, 540, 200, { fill: colors.bgCard, stroke: colors.border, rx: 16 });
    r.text(350, 165, app.title, { fill: colors.textPrimary, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 200, app.description, { fill: colors.textSecondary, fontSize: 13, textAnchor: 'middle' });
    r.text(350, 260, app.details, { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });

    r.text(350, 360, `Progress: ${this.completedApps.filter(c => c).length}/4`, { fill: colors.textSecondary, fontSize: 12, textAnchor: 'middle' });
    applications.forEach((_, i) => { r.circle(310 + i * 25, 385, 6, { fill: this.completedApps[i] ? colors.success : colors.bgCardLight }); });
  }

  private renderTestPhase(r: CommandRenderer): void {
    if (this.testSubmitted) {
      const score = this.calculateTestScore();
      const passed = score >= 7;
      r.text(350, 100, passed ? 'Congratulations!' : 'Keep Learning!', { fill: passed ? colors.success : colors.warning, fontSize: 32, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(350, 160, `Score: ${score} / 10`, { fill: colors.textPrimary, fontSize: 24, textAnchor: 'middle' });
      return;
    }

    const q = testQuestions[this.testQuestion];
    r.text(350, 40, `Question ${this.testQuestion + 1} of 10`, { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });
    r.text(350, 80, q.question, { fill: colors.textPrimary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });

    q.options.forEach((opt, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;
      r.rect(100, 110 + i * 55, 500, 45, { fill: isSelected ? colors.primary + '40' : colors.bgCard, stroke: isSelected ? colors.primary : colors.border, rx: 8 });
      r.text(350, 138 + i * 55, opt, { fill: isSelected ? colors.primary : colors.textSecondary, fontSize: 13, textAnchor: 'middle' });
    });
  }

  private renderMasteryPhase(r: CommandRenderer): void {
    r.rect(150, 80, 400, 340, { fill: colors.bgCard, stroke: colors.border, rx: 24 });
    r.text(350, 130, 'Optics Master!', { fill: colors.textPrimary, fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 165, 'You understand the camera obscura!', { fill: colors.textSecondary, fontSize: 14, textAnchor: 'middle' });

    const badges = [{ icon: 'pinhole', label: 'Pinhole Optics' }, { icon: 'invert', label: 'Image Inversion' }, { icon: 'f-stop', label: 'Aperture' }, { icon: 'eye', label: 'Human Eye' }];
    badges.forEach((badge, i) => {
      const x = 180 + (i % 2) * 170;
      const y = 200 + Math.floor(i / 2) * 80;
      r.rect(x, y, 150, 60, { fill: colors.bgCardLight, rx: 12 });
      r.text(x + 75, y + 25, badge.icon, { fill: colors.primary, fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(x + 75, y + 45, badge.label, { fill: colors.textSecondary, fontSize: 11, textAnchor: 'middle' });
    });
  }

  private renderUIState(r: CommandRenderer): void {
    r.setHeader(this.gameTitle, this.phaseLabels[this.phase]);
    r.setProgress({ id: 'progress', current: this.phaseOrder.indexOf(this.phase) + 1, total: 10, labels: this.phaseOrder.map(p => this.phaseLabels[p]), color: colors.primary });
    if (this.guidedMode) r.setCoachMessage(this.coachMessages[this.phase]);

    const idx = this.phaseOrder.indexOf(this.phase);
    if (idx > 0) r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });

    switch (this.phase) {
      case 'hook':
        r.addButton({ id: 'next', label: 'Make a Prediction', variant: 'primary' });
        break;
      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A. Same size, right-side up', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B. Smaller, upside down', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C. Larger, upside down', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D. Just a blurry spot', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) r.addButton({ id: 'next', label: 'See the Lab', variant: 'success' });
        break;
      case 'play':
        r.addSlider({ id: 'pinhole_size', label: 'Pinhole Size (mm)', value: this.pinholeSize, min: 1, max: 20, step: 1 });
        r.addSlider({ id: 'object_distance', label: 'Object Distance', value: this.objectDistance, min: 50, max: 250, step: 10 });
        r.addSlider({ id: 'screen_distance', label: 'Screen Distance', value: this.screenDistance, min: 50, max: 200, step: 10 });
        r.addToggle({ id: 'show_rays', label: 'Show Light Rays', value: this.showRays });
        r.addButton({ id: 'next', label: 'Review', variant: 'primary' });
        break;
      case 'review':
        r.addButton({ id: 'next', label: 'Try the Aperture Challenge', variant: 'warning' });
        break;
      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A. Sharper and clearer', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B. Brighter but blurrier', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C. Stays the same', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D. Image disappears', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) r.addButton({ id: 'next', label: 'See It', variant: 'success' });
        break;
      case 'twist_play':
        r.addSlider({ id: 'pinhole_size', label: 'Aperture Size', value: this.pinholeSize, min: 1, max: 20, step: 1 });
        r.addButton({ id: 'next', label: 'See Why', variant: 'primary' });
        break;
      case 'twist_review':
        r.addButton({ id: 'next', label: 'Applications', variant: 'primary' });
        break;
      case 'transfer':
        applications.forEach((_, i) => r.addButton({ id: `app_${i}`, label: applications[i].title.split(' ')[0], variant: i === this.selectedApp ? 'primary' : 'ghost' }));
        if (this.completedApps.every(c => c)) r.addButton({ id: 'next', label: 'Take Test', variant: 'success' });
        break;
      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= 9 });
          if (this.testAnswers.every(a => a !== null)) r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
        } else {
          if (this.calculateTestScore() >= 7) r.addButton({ id: 'next', label: 'Claim Badge', variant: 'success' });
          else r.addButton({ id: 'back', label: 'Review', variant: 'secondary' });
        }
        break;
      case 'mastery':
        r.addButton({ id: 'back', label: 'Explore Again', variant: 'secondary' });
        break;
    }
  }

  getCurrentPhase(): string { return this.phase; }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase, prediction: this.prediction, twistPrediction: this.twistPrediction,
      pinholeSize: this.pinholeSize, objectDistance: this.objectDistance, screenDistance: this.screenDistance,
      showRays: this.showRays, testQuestion: this.testQuestion, testAnswers: this.testAnswers,
      testSubmitted: this.testSubmitted, selectedApp: this.selectedApp, completedApps: this.completedApps, guidedMode: this.guidedMode,
    };
  }

  restoreState(state: Record<string, unknown>): void {
    this.phase = (state.phase as GamePhase) || 'hook';
    this.prediction = (state.prediction as string) || null;
    this.twistPrediction = (state.twistPrediction as string) || null;
    this.pinholeSize = (state.pinholeSize as number) || 10;
    this.objectDistance = (state.objectDistance as number) || 150;
    this.screenDistance = (state.screenDistance as number) || 100;
    this.showRays = (state.showRays as boolean) ?? true;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;
  }
}

export function createCameraObscuraGame(sessionId: string): CameraObscuraGame {
  return new CameraObscuraGame(sessionId);
}
