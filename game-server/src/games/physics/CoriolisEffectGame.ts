/**
 * Coriolis Effect Game - Server-side implementation
 *
 * Physics: F_Coriolis = -2m(ω × v) - Apparent deflection in rotating frames
 * Northern Hemisphere: deflects RIGHT, Southern Hemisphere: deflects LEFT
 *
 * PROTECTED FORMULAS - Never exposed to client:
 * - Coriolis Force: F = -2m(ω × v)
 * - Angular velocity of Earth: ω = 7.29 × 10⁻⁵ rad/s
 * - Latitude dependence: F ∝ sin(φ)
 */

import { BaseGame } from '../../types/GameInstance.js';
import { UserInput } from '../../types/UserInput.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

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
  short: string;
  tagline: string;
  description: string;
  connection: string;
}

const colors = {
  bgDark: '#0a0f1a',
  bgCard: '#1a1f2e',
  bgPanel: '#141824',
  border: '#2a3040',
  text: '#ffffff',
  textMuted: '#94a3b8',
  primary: '#0ea5e9',
  primaryLight: '#38bdf8',
  secondary: '#22c55e',
  accent: '#f97316',
  danger: '#ef4444',
  success: '#22c55e',
  warning: '#eab308',
  purple: '#a855f7',
};

const testQuestions: TestQuestion[] = [
  {
    scenario: "A meteorology student studies why storms rotate in opposite directions in different hemispheres.",
    question: "What is the Coriolis effect?",
    options: [
      "A real force that pushes objects sideways",
      "An apparent deflection of moving objects in a rotating reference frame",
      "A type of wind created by mountains",
      "The gravitational force that causes ocean tides"
    ],
    correctIndex: 1,
    explanation: "The Coriolis effect is not a real force but an apparent deflection arising from observing motion from Earth's rotating reference frame."
  },
  {
    scenario: "A pilot flying from the North Pole toward the equator notices the aircraft drifting off course.",
    question: "In which direction are objects deflected in the Northern Hemisphere?",
    options: [
      "To the left of their motion",
      "Straight up away from Earth's surface",
      "To the right of their motion",
      "Downward toward the equator"
    ],
    correctIndex: 2,
    explanation: "In the Northern Hemisphere, the Coriolis effect deflects moving objects to the RIGHT of their direction of travel."
  },
  {
    scenario: "A weather forecaster explains why Hurricane Maria spins counterclockwise approaching Florida.",
    question: "Why do hurricanes spin counterclockwise in the Northern Hemisphere?",
    options: [
      "Hot air rises rapidly creating a spinning vacuum",
      "The Moon's gravity pulls the storm in that direction",
      "Air rushing toward the low-pressure center is deflected right, creating rotation",
      "It's random - hurricanes spin both ways equally often"
    ],
    correctIndex: 2,
    explanation: "Air rushes toward a hurricane's low-pressure center. Coriolis deflects this air to the right, creating counterclockwise rotation."
  },
  {
    scenario: "A geophysicist calculates Coriolis effects at different locations.",
    question: "At which latitude is the Coriolis effect strongest?",
    options: [
      "At the equator (0°)",
      "At the poles (90°)",
      "At the tropics (23.5°)",
      "It's the same everywhere on Earth"
    ],
    correctIndex: 1,
    explanation: "Coriolis force depends on sin(latitude). At poles (90°), sin(90°) = 1 (maximum). At equator (0°), sin(0°) = 0 (none)."
  },
  {
    scenario: "A tourist asks if toilets really drain opposite directions in different hemispheres.",
    question: "Does the Coriolis effect determine which way toilets drain?",
    options: [
      "Yes, always counterclockwise in Northern Hemisphere",
      "Yes, always clockwise in Northern Hemisphere",
      "No - the effect is far too weak at such small scales",
      "Only in coastal areas near the ocean"
    ],
    correctIndex: 2,
    explanation: "This is a myth! At sink/toilet scales, Coriolis is about 10 million times weaker than basin shape and water motion."
  },
  {
    scenario: "A physics professor explains forces that appear only in non-inertial frames.",
    question: "What is a 'fictitious force' (pseudo-force)?",
    options: [
      "A force that doesn't exist and is purely imaginary",
      "An apparent force arising from observing motion in a non-inertial frame",
      "A force that only acts on fictional objects",
      "Any force weaker than gravity"
    ],
    correctIndex: 1,
    explanation: "Fictitious forces appear when analyzing motion from a non-inertial (rotating) reference frame. They disappear from an inertial frame."
  },
  {
    scenario: "A climate scientist models global atmospheric circulation.",
    question: "How does the Coriolis effect influence global wind patterns?",
    options: [
      "It has no measurable effect on winds",
      "It causes all winds to blow eastward",
      "It deflects winds, creating distinct belts like trade winds and westerlies",
      "It only affects winds over oceans"
    ],
    correctIndex: 2,
    explanation: "Coriolis creates Earth's major wind belts: Trade winds, Westerlies, and Polar easterlies through deflection patterns."
  },
  {
    scenario: "A military ballistics expert trains artillery crews to account for Earth's rotation.",
    question: "Why must long-range artillery account for the Coriolis effect?",
    options: [
      "It doesn't - shells travel too fast for Coriolis to matter",
      "Shells travel far and long enough for deflection to be significant",
      "The cannons rotate during firing",
      "Targets are always moving due to Earth's rotation"
    ],
    correctIndex: 1,
    explanation: "Artillery shells traveling 20+ km over 30+ seconds experience several meters of Coriolis deflection."
  },
  {
    scenario: "An engineering student derives the Coriolis force equation.",
    question: "What happens to the Coriolis force as an object moves faster?",
    options: [
      "It decreases because faster objects resist deflection",
      "It stays the same regardless of velocity",
      "It increases proportionally to velocity (F = 2mωv)",
      "It reverses direction at high velocities"
    ],
    correctIndex: 2,
    explanation: "The Coriolis force F = 2m(ω × v) is directly proportional to velocity. Faster objects experience greater deflection."
  },
  {
    scenario: "A teacher wants examples of where Coriolis is significant versus negligible.",
    question: "Which is NOT significantly affected by the Coriolis effect?",
    options: [
      "Ocean currents spanning thousands of kilometers",
      "Hurricane rotation and storm tracks",
      "Water draining from a bathtub or sink",
      "Global atmospheric wind patterns"
    ],
    correctIndex: 2,
    explanation: "Bathtubs are far too small for Coriolis. It only matters for phenomena spanning hundreds of kilometers or lasting hours."
  }
];

const transferApps: TransferApp[] = [
  {
    icon: "🌀",
    title: "Hurricane Formation",
    short: "Hurricanes",
    tagline: "Nature's most powerful storms",
    description: "Hurricanes draw energy from warm ocean water. Coriolis is essential for their rotation - without it, air would rush straight into the low-pressure center without spinning.",
    connection: "Air rushing toward a low-pressure center is deflected by Coriolis, creating the characteristic spin."
  },
  {
    icon: "🌬️",
    title: "Global Wind Patterns",
    short: "Wind",
    tagline: "Earth's air conditioning system",
    description: "The Coriolis effect shapes Earth's major wind belts - trade winds, westerlies, and polar easterlies that have guided sailors for centuries.",
    connection: "As air rises at the equator and flows toward poles, Coriolis deflection creates distinct circulation cells."
  },
  {
    icon: "🌊",
    title: "Ocean Currents",
    short: "Currents",
    tagline: "The ocean's great conveyor belts",
    description: "Large-scale ocean currents form circular gyres - clockwise in the Northern Hemisphere, counterclockwise in the Southern.",
    connection: "Wind-driven surface currents are deflected by Coriolis, creating massive rotating gyre systems."
  },
  {
    icon: "🎯",
    title: "Long-Range Ballistics",
    short: "Ballistics",
    tagline: "When Earth's rotation affects your aim",
    description: "At long ranges, Coriolis causes measurable deflection of projectiles. Military snipers and artillery must account for this.",
    connection: "Bullets and shells traveling over seconds to minutes experience significant lateral deflection."
  }
];

export class CoriolisEffectGame extends BaseGame {
  readonly gameType = 'coriolis_effect';
  readonly gameTitle = 'Coriolis Effect';

  private phase: Phase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private testQuestion: number = 0;
  private testAnswers: (number | null)[] = new Array(10).fill(null);
  private testSubmitted: boolean = false;
  private selectedApp: number = 0;
  private completedApps: boolean[] = [false, false, false, false];

  // Simulation state
  private hemisphere: 'north' | 'south' = 'north';
  private ballLaunched: boolean = false;
  private animationTime: number = 0;

  private readonly phases: Phase[] = [
    'hook', 'predict', 'play', 'review', 'twist_predict',
    'twist_play', 'twist_review', 'transfer', 'test', 'mastery'
  ];

  private readonly phaseLabels: Record<Phase, string> = {
    hook: 'Hook',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Review',
    twist_predict: 'Twist Predict',
    twist_play: 'Twist Demo',
    twist_review: 'Twist Review',
    transfer: 'Transfer',
    test: 'Test',
    mastery: 'Mastery'
  };

  private readonly coachMessages: Record<Phase, string> = {
    hook: 'Why do hurricanes spin differently in each hemisphere?',
    predict: 'What happens when you throw a ball on a spinning platform?',
    play: 'Watch how the ball curves on the merry-go-round!',
    review: 'The Coriolis effect explains this apparent deflection.',
    twist_predict: 'Does the toilet drain myth hold up to science?',
    twist_play: 'Scale matters! Coriolis is negligible at small scales.',
    twist_review: 'The toilet myth is BUSTED!',
    transfer: 'Coriolis shapes hurricanes, winds, and ocean currents!',
    test: 'Apply your knowledge of Coriolis!',
    mastery: 'You understand why hurricanes spin!'
  };

  constructor(sessionId: string) {
    super(sessionId);
  }

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click':
        this.handleButtonClick(input.id!);
        break;
      case 'toggle_change':
        this.handleToggleChange(input.id!, input.value as boolean);
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

    // Predictions
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }
    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
      return;
    }

    // Hemisphere toggle
    if (id === 'hemisphere_north') {
      this.hemisphere = 'north';
      this.ballLaunched = false;
      return;
    }
    if (id === 'hemisphere_south') {
      this.hemisphere = 'south';
      this.ballLaunched = false;
      return;
    }

    // Launch ball
    if (id === 'launch_ball') {
      this.ballLaunched = true;
      this.animationTime = 0;
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
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'hemisphere') {
      this.hemisphere = value ? 'north' : 'south';
      this.ballLaunched = false;
    }
  }

  private goNext(): void {
    const idx = this.phases.indexOf(this.phase);
    if (idx < this.phases.length - 1) {
      this.phase = this.phases[idx + 1];
      this.emitCoachEvent('phase_started', { phase: this.phase });
    }
  }

  private goBack(): void {
    const idx = this.phases.indexOf(this.phase);
    if (idx > 0) {
      this.phase = this.phases[idx - 1];
    }
  }

  private calculateTestScore(): number {
    let correct = 0;
    for (let i = 0; i < testQuestions.length; i++) {
      if (this.testAnswers[i] === testQuestions[i].correctIndex) {
        correct++;
      }
    }
    return correct;
  }

  update(deltaTime: number): void {
    this.animationTime += deltaTime;
  }

  render(): GameFrame {
    const r = new CommandRenderer(this.viewport.width, this.viewport.height);
    r.reset();
    r.setViewport(700, 400);
    r.clear(colors.bgDark);

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

    this.renderUI(r);
    return r.toFrame(this.nextFrame());
  }

  private renderHook(r: CommandRenderer): void {
    r.text(350, 45, 'The Hurricane Spin Mystery', {
      fill: colors.text,
      fontSize: 26,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 75, 'Why do storms spin differently in each hemisphere?', {
      fill: colors.textMuted,
      fontSize: 14,
      textAnchor: 'middle'
    });

    // Earth visualization
    r.rect(100, 100, 500, 180, { fill: colors.bgCard, rx: 12 });

    // Earth
    r.circle(350, 190, 80, { fill: '#0369a1', stroke: '#0ea5e9', strokeWidth: 2 });
    r.ellipse(350, 190, 80, 25, { fill: '#22c55e', opacity: 0.3 });

    // Northern Hemisphere hurricane (CCW)
    const nhX = 280;
    const nhY = 140;
    r.circle(nhX, nhY, 25, { fill: colors.bgDark, stroke: colors.primaryLight, strokeWidth: 2 });
    r.text(nhX, nhY + 5, 'CCW', { fill: colors.primaryLight, fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(nhX, nhY + 40, 'Northern', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Southern Hemisphere hurricane (CW)
    const shX = 420;
    const shY = 240;
    r.circle(shX, shY, 25, { fill: colors.bgDark, stroke: colors.accent, strokeWidth: 2 });
    r.text(shX, shY + 5, 'CW', { fill: colors.accent, fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(shX, shY + 40, 'Southern', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Question
    r.text(350, 300, 'Why do they spin opposite ways?', {
      fill: colors.warning,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.rect(200, 320, 300, 40, { fill: colors.primary + '20', rx: 8 });
    r.text(350, 345, 'The answer lies in Earth\'s rotation...', {
      fill: colors.primary,
      fontSize: 12,
      textAnchor: 'middle'
    });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(350, 40, 'Make Your Prediction', {
      fill: colors.text,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 70, 'You\'re on a spinning merry-go-round. You throw a ball', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle'
    });
    r.text(350, 87, 'STRAIGHT to a friend across from you. What happens?', {
      fill: colors.primary,
      fontSize: 12,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Diagram
    r.circle(350, 165, 50, { fill: colors.bgPanel, stroke: colors.border, strokeWidth: 2 });
    r.circle(350, 115, 10, { fill: colors.primary });
    r.text(350, 105, 'You', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
    r.circle(350, 215, 10, { fill: colors.secondary });
    r.text(350, 228, 'Friend', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });
    r.line(350, 125, 350, 205, { stroke: colors.textMuted, strokeWidth: 2, strokeDasharray: '4,2' });

    const options = ['A', 'B', 'C', 'D'];
    const optionTexts = [
      'Goes straight to friend',
      'Curves away from path',
      'Speeds up as it travels',
      'Stops mid-air'
    ];

    options.forEach((opt, i) => {
      const y = 245 + i * 35;
      const selected = this.prediction === opt;
      r.rect(150, y, 400, 30, {
        fill: selected ? colors.primary + '30' : colors.bgCard,
        stroke: selected ? colors.primary : colors.border,
        rx: 6
      });
      r.circle(175, y + 15, 10, { fill: selected ? colors.primary : colors.bgPanel });
      r.text(175, y + 20, opt, { fill: colors.text, fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(195, y + 20, optionTexts[i], { fill: colors.textMuted, fontSize: 11 });
    });
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(350, 35, 'The Merry-Go-Round Experiment', {
      fill: colors.text,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Merry-go-round visualization
    const centerX = 250;
    const centerY = 170;
    const radius = 80;
    const rotation = (this.animationTime / 50) % 360;

    // Platform (rotating)
    r.circle(centerX, centerY, radius, { fill: colors.bgPanel, stroke: colors.border, strokeWidth: 3 });

    // Radial lines
    for (let i = 0; i < 8; i++) {
      const angle = (rotation + i * 45) * Math.PI / 180;
      r.line(
        centerX,
        centerY,
        centerX + Math.cos(angle) * (radius - 5),
        centerY + Math.sin(angle) * (radius - 5),
        { stroke: colors.border, strokeWidth: 1 }
      );
    }

    // You (thrower)
    const youAngle = (rotation + 90) * Math.PI / 180;
    const youX = centerX + Math.cos(youAngle) * 55;
    const youY = centerY + Math.sin(youAngle) * 55;
    r.circle(youX, youY, 12, { fill: colors.primary, stroke: colors.primaryLight, strokeWidth: 2 });
    r.text(youX, youY + 4, 'You', { fill: colors.text, fontSize: 8, textAnchor: 'middle' });

    // Friend (target)
    const friendAngle = (rotation + 270) * Math.PI / 180;
    const friendX = centerX + Math.cos(friendAngle) * 55;
    const friendY = centerY + Math.sin(friendAngle) * 55;
    r.circle(friendX, friendY, 12, { fill: colors.secondary, stroke: '#4ade80', strokeWidth: 2 });
    r.text(friendX, friendY + 4, 'Friend', { fill: colors.text, fontSize: 7, textAnchor: 'middle' });

    // Ball trajectory (if launched)
    if (this.ballLaunched) {
      const progress = Math.min((this.animationTime % 2000) / 2000, 1);
      const deflection = this.hemisphere === 'north' ? 1 : -1;
      const ballAngle = (rotation + 90 + deflection * progress * 50) * Math.PI / 180;
      const ballDist = 55 - progress * 60;
      const ballX = centerX + Math.cos(ballAngle) * Math.abs(ballDist);
      const ballY = centerY + Math.sin(ballAngle) * Math.abs(ballDist);

      // Intended path (dashed)
      r.line(youX, youY, friendX, friendY, { stroke: colors.textMuted, strokeWidth: 1, strokeDasharray: '4,2' });

      // Ball
      if (progress < 0.9) {
        r.circle(ballX, ballY, 8, { fill: colors.warning, stroke: '#f59e0b', strokeWidth: 2 });
      }

      // Result text
      if (progress >= 0.8) {
        r.text(centerX, centerY + radius + 30, `Ball curves ${this.hemisphere === 'north' ? 'RIGHT' : 'LEFT'}!`, {
          fill: colors.warning,
          fontSize: 12,
          fontWeight: 'bold',
          textAnchor: 'middle'
        });
      }
    }

    // Hemisphere indicator
    r.rect(380, 90, 180, 100, { fill: colors.bgCard, rx: 10 });
    r.text(470, 115, 'Hemisphere', { fill: colors.text, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(470, 140, this.hemisphere === 'north' ? 'NORTHERN' : 'SOUTHERN', {
      fill: this.hemisphere === 'north' ? colors.primary : colors.accent,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });
    r.text(470, 160, `Rotation: ${this.hemisphere === 'north' ? 'CCW ↺' : 'CW ↻'}`, {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle'
    });
    r.text(470, 175, `Deflects ${this.hemisphere === 'north' ? 'RIGHT' : 'LEFT'}`, {
      fill: colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle'
    });

    // Instructions
    r.rect(100, 280, 500, 60, { fill: colors.bgCard, rx: 8 });
    r.text(350, 305, this.ballLaunched
      ? 'The ball curves due to the Coriolis effect! Try the other hemisphere.'
      : 'Select a hemisphere and press "Throw Ball" to see the effect.',
      { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' }
    );
    r.text(350, 325, 'From your rotating perspective, the ball appears to deflect.',
      { fill: colors.primary, fontSize: 10, textAnchor: 'middle' }
    );
  }

  private renderReview(r: CommandRenderer): void {
    r.text(350, 35, 'The Science Revealed', {
      fill: colors.text,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const correct = this.prediction === 'B';
    r.rect(150, 55, 400, 35, {
      fill: correct ? colors.success + '20' : colors.warning + '20',
      stroke: correct ? colors.success : colors.warning,
      strokeWidth: 1,
      rx: 8
    });
    r.text(350, 78, correct ? '✓ Your prediction was correct!' : 'The ball curves away from its path!', {
      fill: correct ? colors.success : colors.warning,
      fontSize: 12,
      textAnchor: 'middle'
    });

    // Key concepts
    r.rect(50, 100, 290, 100, { fill: colors.bgCard, rx: 10 });
    r.text(195, 120, 'Earth Is a Merry-Go-Round', { fill: colors.primary, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(65, 140, '• Earth rotates once per day', { fill: colors.textMuted, fontSize: 10 });
    r.text(65, 158, '• From space: objects move straight', { fill: colors.textMuted, fontSize: 10 });
    r.text(65, 176, '• From Earth: they appear to curve', { fill: colors.textMuted, fontSize: 10 });

    r.rect(360, 100, 290, 100, { fill: colors.bgCard, rx: 10 });
    r.text(505, 120, 'The Coriolis Force', { fill: colors.primaryLight, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.rect(380, 135, 250, 25, { fill: colors.bgPanel, rx: 4 });
    r.text(505, 152, 'F = -2m(ω × v)', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(505, 178, 'A "fictitious force" - apparent deflection', { fill: colors.textMuted, fontSize: 9, textAnchor: 'middle' });

    // Direction rules
    r.rect(100, 210, 500, 90, { fill: colors.bgCard, rx: 10 });
    r.text(350, 230, 'Direction Rules', { fill: colors.text, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });

    // Northern
    r.rect(120, 245, 220, 45, { fill: colors.bgPanel, rx: 6 });
    r.text(230, 262, 'Northern Hemisphere', { fill: colors.secondary, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(230, 280, 'Deflects RIGHT → CCW hurricanes', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Southern
    r.rect(360, 245, 220, 45, { fill: colors.bgPanel, rx: 6 });
    r.text(470, 262, 'Southern Hemisphere', { fill: colors.danger, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(470, 280, 'Deflects LEFT → CW hurricanes', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    r.text(350, 315, 'At the equator (0°): No Coriolis effect because sin(0°) = 0', {
      fill: colors.textMuted,
      fontSize: 10,
      textAnchor: 'middle'
    });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 40, 'The Twist: Toilet Drains', {
      fill: colors.purple,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.rect(150, 60, 400, 60, { fill: colors.bgCard, rx: 10 });
    r.text(350, 85, 'Popular myth: Toilets drain in opposite directions', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle'
    });
    r.text(350, 105, 'in each hemisphere due to the Coriolis effect.', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle'
    });

    r.text(350, 140, 'Is this actually true?', {
      fill: colors.purple,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const options = ['A', 'B', 'C', 'D'];
    const optionTexts = [
      'Yes - CCW in Northern, CW in Southern',
      'Yes - CW in Northern, CCW in Southern',
      'No - Coriolis is too weak at small scales',
      'No - only works at the equator'
    ];

    options.forEach((opt, i) => {
      const y = 160 + i * 42;
      const selected = this.twistPrediction === opt;
      r.rect(150, y, 400, 36, {
        fill: selected ? colors.purple + '30' : colors.bgCard,
        stroke: selected ? colors.purple : colors.border,
        rx: 8
      });
      r.circle(175, y + 18, 12, { fill: selected ? colors.purple : colors.bgPanel });
      r.text(175, y + 23, opt, { fill: colors.text, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(200, y + 23, optionTexts[i], { fill: colors.textMuted, fontSize: 11 });
    });
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(350, 35, 'The Scale Problem', {
      fill: colors.purple,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.text(350, 60, 'Coriolis Force vs. Scale', {
      fill: colors.textMuted,
      fontSize: 13,
      textAnchor: 'middle'
    });

    // Hurricane (large scale)
    r.rect(80, 85, 220, 170, { fill: colors.bgCard, rx: 12 });
    r.text(190, 110, 'Hurricane', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(190, 128, '(~500 km)', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Hurricane spiral
    r.circle(190, 180, 40, { fill: colors.bgPanel, stroke: colors.primary, strokeWidth: 2 });
    r.circle(190, 180, 25, { fill: colors.bgPanel, stroke: colors.primary, strokeWidth: 1, opacity: 0.7 });
    r.circle(190, 180, 10, { fill: colors.bgDark });

    r.text(190, 235, '✓ STRONG', { fill: colors.success, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(190, 250, 'Hours to form', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Sink (small scale)
    r.rect(400, 85, 220, 170, { fill: colors.bgCard, rx: 12 });
    r.text(510, 110, 'Sink Drain', { fill: colors.textMuted, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(510, 128, '(~30 cm)', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Sink
    r.ellipse(510, 175, 45, 25, { fill: colors.bgPanel, stroke: colors.border, strokeWidth: 2 });
    r.circle(510, 185, 10, { fill: colors.bgDark });

    r.text(510, 235, '✗ NEGLIGIBLE', { fill: colors.danger, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(510, 250, 'Seconds to drain', { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });

    // Math box
    r.rect(150, 275, 400, 65, { fill: colors.warning + '15', stroke: colors.warning, strokeWidth: 1, rx: 10 });
    r.text(350, 295, 'The Math:', { fill: colors.warning, fontSize: 12, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 315, 'For a sink: Coriolis ≈ 10⁻⁵ m/s²', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
    r.text(350, 332, 'That\'s 10 MILLION times weaker than other effects!', { fill: colors.warning, fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(350, 40, 'Myth Busted!', {
      fill: colors.purple,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    const correct = this.twistPrediction === 'C';
    r.rect(150, 60, 400, 35, {
      fill: correct ? colors.success + '20' : colors.warning + '20',
      stroke: correct ? colors.success : colors.warning,
      strokeWidth: 1,
      rx: 8
    });
    r.text(350, 82, correct ? '✓ You saw through the myth!' : 'The Coriolis effect is FAR too weak at sink scales!', {
      fill: correct ? colors.success : colors.warning,
      fontSize: 11,
      textAnchor: 'middle'
    });

    // The Myth
    r.rect(100, 105, 240, 90, { fill: colors.bgCard, rx: 10 });
    r.text(220, 125, '❌ The Myth', { fill: colors.danger, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(115, 145, '"Water drains counterclockwise', { fill: colors.textMuted, fontSize: 10 });
    r.text(115, 160, 'in Northern Hemisphere and', { fill: colors.textMuted, fontSize: 10 });
    r.text(115, 175, 'clockwise in Southern."', { fill: colors.textMuted, fontSize: 10 });

    // The Truth
    r.rect(360, 105, 240, 90, { fill: colors.bgCard, rx: 10 });
    r.text(480, 125, '✓ The Truth', { fill: colors.success, fontSize: 13, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(375, 145, 'At sink scale, Coriolis is', { fill: colors.textMuted, fontSize: 10 });
    r.text(375, 160, '10 million times weaker than', { fill: colors.textMuted, fontSize: 10 });
    r.text(375, 175, 'basin shape & water motion.', { fill: colors.textMuted, fontSize: 10 });

    // Scale matters
    r.rect(100, 205, 500, 80, { fill: colors.primary + '15', stroke: colors.primary, strokeWidth: 1, rx: 10 });
    r.text(350, 230, 'Scale Matters!', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 255, 'Coriolis only dominates for large-scale (100+ km),', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
    r.text(350, 273, 'long-duration phenomena - not your bathroom!', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(350, 35, 'Real-World Applications', {
      fill: colors.text,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // App tabs
    transferApps.forEach((app, i) => {
      const x = 90 + i * 145;
      const selected = this.selectedApp === i;
      r.rect(x, 55, 130, 30, {
        fill: selected ? colors.primary : colors.bgCard,
        rx: 15
      });
      r.text(x + 65, 75, `${app.icon} ${app.short}`, {
        fill: selected ? colors.text : colors.textMuted,
        fontSize: 11,
        textAnchor: 'middle'
      });
    });

    // Selected app
    const app = transferApps[this.selectedApp];
    r.rect(50, 95, 600, 200, { fill: colors.bgCard, rx: 12 });

    // Header
    r.rect(50, 95, 600, 45, { fill: colors.primary, rx: 12 });
    r.rect(50, 120, 600, 20, { fill: colors.primary });

    r.text(90, 125, app.icon, { fill: colors.text, fontSize: 24 });
    r.text(125, 118, app.title, { fill: colors.text, fontSize: 15, fontWeight: 'bold' });
    r.text(125, 133, app.tagline, { fill: colors.text, fontSize: 10, opacity: 0.8 });

    r.text(70, 165, app.description, { fill: colors.textMuted, fontSize: 10 });

    r.rect(60, 185, 580, 50, { fill: colors.bgPanel, rx: 8 });
    r.text(350, 205, 'Coriolis Connection', { fill: colors.primary, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(70, 225, app.connection, { fill: colors.textMuted, fontSize: 10 });

    // Completed indicator
    const allDone = this.completedApps.filter(c => c).length >= 3;
    if (allDone) {
      r.text(350, 280, '✓ Explore at least 3 applications to continue!', { fill: colors.success, fontSize: 11, textAnchor: 'middle' });
    } else {
      r.text(350, 280, `Explored: ${this.completedApps.filter(c => c).length} / 3 minimum`, { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    if (this.testSubmitted) {
      this.renderTestResults(r);
      return;
    }

    const q = testQuestions[this.testQuestion];

    r.text(200, 35, 'Knowledge Test', { fill: colors.text, fontSize: 16, fontWeight: 'bold' });
    r.text(550, 35, `Question ${this.testQuestion + 1} of 10`, { fill: colors.textMuted, fontSize: 12 });

    // Progress
    r.rect(50, 50, 600, 6, { fill: colors.bgPanel, rx: 3 });
    const progress = ((this.testQuestion + 1) / 10) * 600;
    r.rect(50, 50, progress, 6, { fill: colors.primary, rx: 3 });

    // Scenario
    r.rect(50, 65, 600, 40, { fill: colors.primary + '20', rx: 8 });
    r.text(70, 90, q.scenario.substring(0, 90), { fill: colors.textMuted, fontSize: 10 });

    // Question
    r.rect(50, 115, 600, 35, { fill: colors.bgCard, rx: 8 });
    r.text(70, 138, q.question, { fill: colors.text, fontSize: 11, fontWeight: 'bold' });

    // Options
    q.options.forEach((opt, i) => {
      const y = 158 + i * 36;
      const selected = this.testAnswers[this.testQuestion] === i;
      r.rect(50, y, 600, 30, {
        fill: selected ? colors.primary + '30' : colors.bgCard,
        stroke: selected ? colors.primary : colors.border,
        rx: 6
      });
      const letter = String.fromCharCode(65 + i);
      r.circle(75, y + 15, 10, { fill: selected ? colors.primary : colors.bgPanel });
      r.text(75, y + 20, letter, { fill: colors.text, fontSize: 10, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(95, y + 20, opt.substring(0, 75), { fill: colors.textMuted, fontSize: 10 });
    });

    r.text(350, 315, `Answered: ${this.testAnswers.filter(a => a !== null).length} / 10`, {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle'
    });
  }

  private renderTestResults(r: CommandRenderer): void {
    const score = this.calculateTestScore();
    const percentage = Math.round((score / 10) * 100);
    const passed = percentage >= 70;

    r.text(350, 60, 'Test Results', { fill: colors.text, fontSize: 22, fontWeight: 'bold', textAnchor: 'middle' });

    r.rect(250, 90, 200, 70, { fill: passed ? colors.success + '30' : colors.danger + '30', rx: 12 });
    r.text(350, 125, `${score} / 10`, { fill: passed ? colors.success : colors.danger, fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 150, `${percentage}%`, { fill: colors.textMuted, fontSize: 14, textAnchor: 'middle' });

    r.text(350, 190, passed ? 'Great job! You understand the Coriolis effect!' : 'Keep learning and try again.', {
      fill: passed ? colors.success : colors.textMuted,
      fontSize: 14,
      textAnchor: 'middle'
    });
  }

  private renderMastery(r: CommandRenderer): void {
    const score = this.calculateTestScore();
    const percentage = Math.round((score / 10) * 100);
    const passed = percentage >= 70;

    r.text(350, 50, '🏆', { fontSize: 40, textAnchor: 'middle' });
    r.text(350, 95, passed ? 'Coriolis Effect Master!' : 'Keep Learning!', {
      fill: colors.text,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    r.rect(250, 110, 200, 40, { fill: colors.primary, rx: 10 });
    r.text(350, 135, `Score: ${score} / 10 (${percentage}%)`, {
      fill: colors.text,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle'
    });

    // Key concepts
    r.rect(100, 165, 500, 140, { fill: colors.bgCard, rx: 10 });
    r.text(350, 190, 'What You\'ve Mastered', { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    const concepts = [
      '✓ Coriolis is an apparent deflection in rotating frames',
      '✓ Northern Hemisphere: deflects RIGHT',
      '✓ Southern Hemisphere: deflects LEFT',
      '✓ F = 2m(ω × v) - The Coriolis force formula',
      '✓ Only significant at large scales (100+ km)',
      '✓ The toilet drain myth is BUSTED!'
    ];

    concepts.forEach((c, i) => {
      r.text(130, 215 + i * 15, c, { fill: colors.textMuted, fontSize: 10 });
    });
  }

  private renderUI(r: CommandRenderer): void {
    r.setHeader(this.gameTitle, this.phaseLabels[this.phase]);

    r.setProgress({
      id: 'phase_progress',
      current: this.phases.indexOf(this.phase) + 1,
      total: this.phases.length
    });

    r.setCoachMessage(this.coachMessages[this.phase]);

    switch (this.phase) {
      case 'hook':
        r.addButton({ id: 'next', label: 'Discover Coriolis', variant: 'primary' });
        break;

      case 'predict':
        r.addButton({ id: 'predict_A', label: 'A', variant: this.prediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_B', label: 'B', variant: this.prediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_C', label: 'C', variant: this.prediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'predict_D', label: 'D', variant: this.prediction === 'D' ? 'primary' : 'secondary' });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'See It In Action', variant: 'success' });
        }
        break;

      case 'play':
        r.addButton({ id: 'hemisphere_north', label: 'North', variant: this.hemisphere === 'north' ? 'primary' : 'secondary' });
        r.addButton({ id: 'hemisphere_south', label: 'South', variant: this.hemisphere === 'south' ? 'primary' : 'secondary' });
        r.addButton({ id: 'launch_ball', label: 'Throw Ball!', variant: 'warning' });
        r.addButton({ id: 'next', label: 'Understand Physics', variant: 'success' });
        break;

      case 'review':
        r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });
        r.addButton({ id: 'next', label: 'Explore Twist', variant: 'primary' });
        break;

      case 'twist_predict':
        r.addButton({ id: 'twist_A', label: 'A', variant: this.twistPrediction === 'A' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_B', label: 'B', variant: this.twistPrediction === 'B' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_C', label: 'C', variant: this.twistPrediction === 'C' ? 'primary' : 'secondary' });
        r.addButton({ id: 'twist_D', label: 'D', variant: this.twistPrediction === 'D' ? 'primary' : 'secondary' });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'See Why', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addButton({ id: 'next', label: 'Learn the Truth', variant: 'primary' });
        break;

      case 'twist_review':
        r.addButton({ id: 'back', label: 'Back', variant: 'secondary' });
        r.addButton({ id: 'next', label: 'Applications', variant: 'primary' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Hurricanes', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Wind', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Currents', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Ballistics', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.filter(c => c).length >= 3) {
          r.addButton({ id: 'next', label: 'Take Quiz', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: 'Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next', variant: 'ghost', disabled: this.testQuestion >= 9 });
          for (let i = 0; i < 4; i++) {
            r.addButton({
              id: `answer_${i}`,
              label: String.fromCharCode(65 + i),
              variant: this.testAnswers[this.testQuestion] === i ? 'primary' : 'secondary'
            });
          }
          if (this.testAnswers.every(a => a !== null)) {
            r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
          }
        } else {
          const score = this.calculateTestScore();
          r.addButton({
            id: score >= 7 ? 'next' : 'back',
            label: score >= 7 ? 'Complete!' : 'Review',
            variant: score >= 7 ? 'success' : 'secondary'
          });
        }
        break;

      case 'mastery':
        r.addButton({ id: 'back', label: 'Review', variant: 'secondary' });
        break;
    }
  }

  getCurrentPhase(): string {
    return this.phase;
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.phase,
      prediction: this.prediction,
      twistPrediction: this.twistPrediction,
      testQuestion: this.testQuestion,
      testAnswers: this.testAnswers,
      testSubmitted: this.testSubmitted,
      selectedApp: this.selectedApp,
      completedApps: this.completedApps,
      hemisphere: this.hemisphere,
      ballLaunched: this.ballLaunched
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase) this.phase = state.phase as Phase;
    if (state.prediction !== undefined) this.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.twistPrediction = state.twistPrediction as string | null;
    if (state.testQuestion !== undefined) this.testQuestion = state.testQuestion as number;
    if (state.testAnswers) this.testAnswers = state.testAnswers as (number | null)[];
    if (state.testSubmitted !== undefined) this.testSubmitted = state.testSubmitted as boolean;
    if (state.selectedApp !== undefined) this.selectedApp = state.selectedApp as number;
    if (state.completedApps) this.completedApps = state.completedApps as boolean[];
    if (state.hemisphere) this.hemisphere = state.hemisphere as 'north' | 'south';
    if (state.ballLaunched !== undefined) this.ballLaunched = state.ballLaunched as boolean;
  }
}

export function createCoriolisEffectGame(sessionId: string): CoriolisEffectGame {
  return new CoriolisEffectGame(sessionId);
}
