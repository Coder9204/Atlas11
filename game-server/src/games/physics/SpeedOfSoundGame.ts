// ============================================================================
// SPEED OF SOUND GAME - Server-Side Implementation
// ============================================================================
// Physics: v = d/t, speed of sound ~ 343 m/s at 20C
// Temperature dependence: v = 331 + 0.6T (m/s)
// Methods: echo timing, two microphones, resonance tube

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// PROTECTED PHYSICS CONSTANTS - Server-side only, never sent to client
// ============================================================================
const PHYSICS = {
  // Speed of sound formula: v = 331 + 0.6T (m/s)
  BASE_SPEED: 331,           // Speed at 0C in m/s
  TEMP_COEFFICIENT: 0.6,     // m/s per degree Celsius
  SPEED_AT_20C: 343,         // Standard reference speed at 20C

  // Speed comparison data (protected)
  SPEED_IN_WATER: 1500,      // m/s
  SPEED_IN_STEEL: 5100,      // m/s
  SPEED_OF_LIGHT: 300000000, // m/s (for comparison)

  // Echo calculation
  calculateSpeedAtTemp: (tempC: number): number => {
    return PHYSICS.BASE_SPEED + PHYSICS.TEMP_COEFFICIENT * tempC;
  },

  calculateEchoTime: (distance: number, tempC: number): number => {
    const speed = PHYSICS.calculateSpeedAtTemp(tempC);
    return (2 * distance) / speed; // Round trip time
  },

  calculateSpeedFromEcho: (distance: number, time: number): number => {
    return (2 * distance) / time;
  },

  // Storm distance estimate
  calculateStormDistance: (delaySeconds: number): number => {
    return delaySeconds * PHYSICS.SPEED_AT_20C; // Distance in meters
  }
} as const;

// ============================================================================
// TYPES
// ============================================================================
type Phase =
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

interface SpeedOfSoundState {
  phase: Phase;
  prediction: string | null;
  twistPrediction: string | null;

  // Echo measurement simulation
  distance: number;           // meters to wall
  soundWavePos: number;       // -1 = not visible
  echoWavePos: number;        // -1 = not visible
  measuring: boolean;
  elapsedTime: number;
  calculatedSpeed: number;
  hasMeasured: boolean;
  measurementStartTime: number;

  // Twist - temperature effect
  temperature: number;        // degrees C
  twistMeasuring: boolean;
  twistTime: number;
  twistSpeed: number;

  // Results
  showResult: boolean;
  showTwistResult: boolean;

  // Transfer
  completedApps: number[];

  // Test
  testAnswers: Record<number, number>;
  testSubmitted: boolean;
}

// ============================================================================
// TEST QUESTIONS - correctIndex is PROTECTED (server-side only)
// ============================================================================
const TEST_QUESTIONS = [
  {
    q: "What is the approximate speed of sound in air at 20C?",
    options: ["100 m/s", "343 m/s", "768 m/s", "1,000 m/s"],
    correctIndex: 1,
    explanation: "Sound travels at approximately 343 m/s in air at 20C."
  },
  {
    q: "How does temperature affect the speed of sound in air?",
    options: [
      "No effect at all",
      "Higher temperature = faster sound",
      "Higher temperature = slower sound",
      "Only affects volume, not speed"
    ],
    correctIndex: 1,
    explanation: "Higher temperature makes air molecules move faster, allowing sound waves to propagate faster. v = 331 + 0.6T m/s."
  },
  {
    q: "To measure sound speed using an echo, you need:",
    options: [
      "Just the distance to the wall",
      "Distance to wall and round-trip time",
      "Only the time for echo to return",
      "The frequency of the sound"
    ],
    correctIndex: 1,
    explanation: "Speed = distance/time. For an echo: speed = (2 x distance to wall) / round-trip time."
  },
  {
    q: "Why can you see lightning before you hear thunder?",
    options: [
      "Thunder is quieter than lightning",
      "Light is much faster than sound",
      "Thunder travels through ground",
      "Lightning heats the air"
    ],
    correctIndex: 1,
    explanation: "Light travels at ~300,000,000 m/s while sound travels at ~343 m/s. Light is nearly a million times faster."
  },
  {
    q: "Approximately how far away is a storm if thunder arrives 5 seconds after lightning?",
    options: [
      "About 500 meters",
      "About 1 mile (1.6 km)",
      "About 5 miles",
      "About 10 km"
    ],
    correctIndex: 1,
    explanation: "Sound travels 343 m/s x 5 s = 1,715 m ~ 1 mile. The rule '5 seconds = 1 mile' is a good approximation."
  },
  {
    q: "In which medium does sound travel fastest?",
    options: ["Air", "Water", "Steel", "Vacuum"],
    correctIndex: 2,
    explanation: "Sound travels fastest in solids (~5,100 m/s in steel), slower in liquids (~1,500 m/s in water), slowest in gases (~343 m/s in air). Cannot travel through vacuum."
  },
  {
    q: "Why does sound travel faster in solids than in gases?",
    options: [
      "Solids are denser",
      "Molecules are closer together and more tightly bonded",
      "Solids have more air pockets",
      "Gravity is stronger in solids"
    ],
    correctIndex: 1,
    explanation: "In solids, molecules are tightly bonded and close together, allowing vibrations to transfer quickly. High stiffness is the key factor."
  },
  {
    q: "What is the 'flash-to-bang' method?",
    options: [
      "Creating sound with explosions",
      "Counting seconds between lightning and thunder to estimate distance",
      "Measuring brightness of lightning",
      "A type of sound recording"
    ],
    correctIndex: 1,
    explanation: "The flash-to-bang method uses time delay between lightning (flash) and thunder (bang) to estimate storm distance. ~3 seconds = 1 km."
  },
  {
    q: "If sound speed is 343 m/s and you hear an echo 2 seconds after clapping, how far is the wall?",
    options: ["171.5 meters", "343 meters", "686 meters", "34.3 meters"],
    correctIndex: 1,
    explanation: "In 2 seconds, sound travels 343 x 2 = 686 m total. But that's round trip! The wall is at 686 / 2 = 343 meters."
  },
  {
    q: "Why might your measured speed of sound differ from the textbook value?",
    options: [
      "Textbooks are always wrong",
      "Temperature, humidity, and measurement errors",
      "Sound changes speed randomly",
      "Distance doesn't matter"
    ],
    correctIndex: 1,
    explanation: "Temperature significantly affects sound speed. Humidity has a small effect. Plus, timing and distance measurement errors add uncertainty."
  }
];

// ============================================================================
// TRANSFER APPLICATIONS
// ============================================================================
const APPLICATIONS = [
  {
    id: 'storm',
    title: 'Storm Distance',
    description: 'Lightning-thunder delay',
    detail: 'Count seconds between lightning flash and thunder, divide by 3 for km or 5 for miles. Light is nearly instant while sound takes about 3 seconds per kilometer.',
    icon: 'storm'
  },
  {
    id: 'sonar',
    title: 'Sonar Navigation',
    description: 'Submarines and depth finding',
    detail: 'Sonar sends sound pulses and times echoes. Knowing sound speed in water (~1,500 m/s), submarines can map ocean floors and detect objects. Dolphins use the same principle!',
    icon: 'ship'
  },
  {
    id: 'ultrasound',
    title: 'Ultrasound Imaging',
    description: 'Medical imaging',
    detail: 'Medical ultrasound uses high-frequency sound waves. By timing echoes from body tissues (which have different speeds), doctors create detailed images of organs and babies.',
    icon: 'medical'
  },
  {
    id: 'thermometry',
    title: 'Acoustic Thermometry',
    description: 'Temperature from sound speed',
    detail: 'Since sound speed depends on temperature, measuring sound speed precisely can determine temperature. Used in ocean monitoring and industrial processes.',
    icon: 'thermometer'
  }
];

// ============================================================================
// SPEED OF SOUND GAME CLASS
// ============================================================================
export class SpeedOfSoundGame extends BaseGame {
  readonly gameType = 'speed_of_sound';
  readonly gameTitle = 'Speed of Sound: Echo Measurement';

  private state: SpeedOfSoundState;
  private lastUpdateTime: number;

  constructor(sessionId: string) {
    super(sessionId);
    this.lastUpdateTime = Date.now();
    this.state = this.getInitialState();
  }

  private getInitialState(): SpeedOfSoundState {
    return {
      phase: 'hook',
      prediction: null,
      twistPrediction: null,

      distance: 170,
      soundWavePos: -1,
      echoWavePos: -1,
      measuring: false,
      elapsedTime: 0,
      calculatedSpeed: 0,
      hasMeasured: false,
      measurementStartTime: 0,

      temperature: 20,
      twistMeasuring: false,
      twistTime: 0,
      twistSpeed: 0,

      showResult: false,
      showTwistResult: false,

      completedApps: [],

      testAnswers: {},
      testSubmitted: false
    };
  }

  handleInput(input: UserInput): void {
    if (input.type === 'button_click') {
      this.handleButtonClick(input.id);
    } else if (input.type === 'slider_change') {
      if (input.id === 'distance') {
        this.state.distance = Math.max(50, Math.min(500, input.value || 170));
        this.resetMeasurement();
      } else if (input.id === 'temperature') {
        this.state.temperature = Math.max(-20, Math.min(45, input.value || 20));
      }
    }
  }

  private handleButtonClick(buttonId: string): void {
    // Phase navigation
    if (buttonId === 'start') {
      this.state.phase = 'predict';
      return;
    }
    if (buttonId === 'next' || buttonId === 'measure-it') {
      this.state.phase = 'play';
      return;
    }
    if (buttonId === 'learn') {
      this.state.phase = 'review';
      return;
    }
    if (buttonId === 'twist') {
      this.state.phase = 'twist_predict';
      return;
    }
    if (buttonId === 'test-it') {
      this.state.phase = 'twist_play';
      return;
    }
    if (buttonId === 'understand') {
      this.state.phase = 'twist_review';
      return;
    }
    if (buttonId === 'transfer') {
      this.state.phase = 'transfer';
      return;
    }
    if (buttonId === 'take-test') {
      this.state.phase = 'test';
      return;
    }
    if (buttonId === 'complete') {
      this.state.phase = 'mastery';
      return;
    }
    if (buttonId === 'play-again') {
      this.state = this.getInitialState();
      return;
    }

    // Predictions
    if (buttonId.startsWith('predict-')) {
      this.state.prediction = buttonId.split('-')[1];
      return;
    }
    if (buttonId.startsWith('twist-predict-')) {
      this.state.twistPrediction = buttonId.split('-')[2];
      return;
    }

    // Measurement controls
    if (buttonId === 'clap') {
      if (!this.state.measuring) {
        this.state.measuring = true;
        this.state.hasMeasured = true;
        this.state.soundWavePos = 0;
        this.state.echoWavePos = -1;
        this.state.elapsedTime = 0;
        this.state.measurementStartTime = Date.now();
      }
      return;
    }
    if (buttonId === 'reset') {
      this.resetMeasurement();
      return;
    }
    if (buttonId === 'see-result') {
      this.state.showResult = true;
      return;
    }
    if (buttonId === 'see-twist-result') {
      this.state.showTwistResult = true;
      return;
    }

    // Transfer applications
    if (buttonId.startsWith('app-')) {
      const appIndex = parseInt(buttonId.split('-')[1]);
      if (!isNaN(appIndex) && !this.state.completedApps.includes(appIndex)) {
        this.state.completedApps.push(appIndex);
      }
      return;
    }

    // Test answers
    if (buttonId.startsWith('q') && buttonId.includes('-a')) {
      const parts = buttonId.match(/q(\d+)-a(\d+)/);
      if (parts) {
        const questionIndex = parseInt(parts[1]);
        const answerIndex = parseInt(parts[2]);
        this.state.testAnswers[questionIndex] = answerIndex;
      }
      return;
    }
    if (buttonId === 'submit-test') {
      this.state.testSubmitted = true;
      return;
    }
  }

  private resetMeasurement(): void {
    this.state.soundWavePos = -1;
    this.state.echoWavePos = -1;
    this.state.elapsedTime = 0;
    this.state.calculatedSpeed = 0;
    this.state.hasMeasured = false;
    this.state.measuring = false;
  }

  getCurrentPhase(): string {
    return this.state.phase;
  }

  update(deltaTime: number): void {
    // Update echo measurement animation
    if (this.state.measuring) {
      const actualSpeed = PHYSICS.calculateSpeedAtTemp(20);
      const roundTripDistance = this.state.distance * 2;
      const totalTime = roundTripDistance / actualSpeed;

      this.state.elapsedTime += deltaTime / 1000;
      const progress = this.state.elapsedTime / totalTime;

      if (progress < 0.5) {
        this.state.soundWavePos = progress * 2 * 100;
        this.state.echoWavePos = -1;
      } else if (progress < 1.0) {
        this.state.soundWavePos = -1;
        this.state.echoWavePos = 100 - (progress - 0.5) * 2 * 100;
      } else {
        this.state.soundWavePos = -1;
        this.state.echoWavePos = -1;
        this.state.measuring = false;
        // PROTECTED: Server calculates exact speed
        this.state.calculatedSpeed = PHYSICS.calculateSpeedFromEcho(this.state.distance, this.state.elapsedTime);
      }
    }

    // Update twist measurement
    if (this.state.twistMeasuring) {
      const actualSpeed = PHYSICS.calculateSpeedAtTemp(this.state.temperature);
      const roundTripDistance = 340; // Fixed distance
      const totalTime = roundTripDistance / actualSpeed;

      this.state.twistTime += deltaTime / 1000;

      if (this.state.twistTime >= totalTime) {
        this.state.twistMeasuring = false;
        // PROTECTED: Server calculates exact speed
        this.state.twistSpeed = PHYSICS.calculateSpeedFromEcho(170, this.state.twistTime);
      }
    }

    this.lastUpdateTime = Date.now();
  }

  render(): GameFrame {
    const r = new CommandRenderer();

    // Progress bar
    const phases: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phases.indexOf(this.state.phase);
    r.setProgress({
      id: 'phase-progress',
      current: currentIndex + 1,
      total: phases.length,
      labels: ['Hook', 'Predict', 'Lab', 'Review', 'Twist Predict', 'Twist Lab', 'Twist Review', 'Transfer', 'Test', 'Mastery']
    });

    switch (this.state.phase) {
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

    return r.toFrame(Date.now());
  }

  private renderHook(r: CommandRenderer): void {
    r.text(400, 60, 'How Fast Is Sound?', { fill: '#ffffff', fontSize: 32, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 100, 'You see the lightning... 1... 2... 3... BOOM! The thunder arrives.', {
      fill: '#94a3b8', fontSize: 16, textAnchor: 'middle'
    });
    r.text(400, 125, 'Can we use this to measure how fast sound travels?', {
      fill: '#94a3b8', fontSize: 16, textAnchor: 'middle'
    });

    // Lightning scene
    r.rect(100, 160, 600, 180, { fill: '#1e293b', rx: 12 });

    // Lightning bolt
    r.path('M 400,180 L 380,220 L 400,220 L 370,280 L 390,280 L 350,340', {
      stroke: '#fbbf24', strokeWidth: 4, fill: 'none'
    });

    // Ground
    r.rect(100, 340, 600, 40, { fill: '#166534' });

    // Person
    r.circle(650, 300, 12, { fill: '#fed7aa' });
    r.rect(642, 312, 16, 25, { fill: '#3b82f6', rx: 3 });

    // Sound waves hint
    r.text(400, 370, 'Sound takes time to travel...', { fill: '#22c55e', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 390, 'But how much time? And how fast?', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });

    r.addButton({ id: 'start', label: 'Measure Sound Speed', variant: 'primary' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(400, 50, 'Make Your Prediction', { fill: '#ffffff', fontSize: 28, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 85, 'You are standing 170 meters from a large wall.', { fill: '#94a3b8', fontSize: 16, textAnchor: 'middle' });
    r.text(400, 110, 'You clap your hands and wait for the echo. How fast is sound?', { fill: '#94a3b8', fontSize: 16, textAnchor: 'middle' });

    // Diagram
    r.rect(100, 140, 600, 100, { fill: '#1e3a5f', rx: 8 });

    // Person
    r.circle(150, 180, 10, { fill: '#fed7aa' });
    r.rect(144, 190, 12, 20, { fill: '#3b82f6', rx: 2 });

    // Wall
    r.rect(680, 150, 15, 80, { fill: '#64748b' });

    // Distance arrow
    r.path('M 170,220 L 670,220', { stroke: '#22c55e', strokeWidth: 2, fill: 'none' });
    r.text(420, 240, '170 meters', { fill: '#22c55e', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });

    // Options
    const options = [
      { id: 'a', text: 'About 34 m/s (walking pace)' },
      { id: 'b', text: 'About 343 m/s (faster than a jet plane!)' },
      { id: 'c', text: 'About 3,400 m/s (like a bullet)' }
    ];

    options.forEach((opt, i) => {
      const y = 280 + i * 50;
      const isSelected = this.state.prediction === opt.id;
      r.rect(150, y, 500, 40, { fill: isSelected ? '#3b82f6' : '#1e293b', rx: 8, stroke: isSelected ? '#3b82f6' : '#334155', strokeWidth: 2 });
      r.text(400, y + 25, opt.text, { fill: isSelected ? '#ffffff' : '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
      r.addButton({ id: `predict-${opt.id}`, label: '', variant: 'secondary' });
    });

    if (this.state.prediction) {
      r.addButton({ id: 'next', label: 'Measure It!', variant: 'primary' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(400, 40, 'Echo Measurement', { fill: '#ffffff', fontSize: 24, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 65, 'Clap to send a sound wave and time the echo!', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Measurement scene
    r.rect(50, 90, 700, 140, { fill: '#0f172a', rx: 8 });

    // Person
    r.circle(100, 150, 15, { fill: '#fed7aa' });
    r.rect(90, 165, 20, 30, { fill: '#3b82f6', rx: 3 });

    // Wall
    r.rect(700, 100, 30, 120, { fill: '#475569', rx: 3 });

    // Sound wave going out
    if (this.state.soundWavePos >= 0) {
      const waveX = 120 + this.state.soundWavePos * 5.5;
      r.circle(waveX, 150, 15, { fill: 'none', stroke: '#f59e0b', strokeWidth: 3 });
      r.text(waveX, 125, 'CLAP ->', { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle' });
    }

    // Echo wave coming back
    if (this.state.echoWavePos >= 0) {
      const waveX = 120 + this.state.echoWavePos * 5.5;
      r.circle(waveX, 150, 15, { fill: 'none', stroke: '#22c55e', strokeWidth: 3 });
      r.text(waveX, 125, '<- ECHO', { fill: '#22c55e', fontSize: 10, textAnchor: 'middle' });
    }

    // Distance label
    r.text(400, 220, `${this.state.distance} m to wall (round trip: ${this.state.distance * 2} m)`, {
      fill: '#64748b', fontSize: 11, textAnchor: 'middle'
    });

    // Timer
    r.rect(320, 80, 160, 35, { fill: '#1e293b', rx: 5 });
    r.text(400, 105, `${this.state.elapsedTime.toFixed(3)} s`, { fill: '#22c55e', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });

    // Results
    if (this.state.calculatedSpeed > 0) {
      r.rect(150, 250, 500, 80, { fill: '#052e16', rx: 12 });
      r.text(400, 275, `Round trip distance: ${this.state.distance * 2} m`, { fill: '#22c55e', fontSize: 12, textAnchor: 'middle' });
      r.text(400, 295, `Time measured: ${this.state.elapsedTime.toFixed(3)} seconds`, { fill: '#22c55e', fontSize: 12, textAnchor: 'middle' });
      r.text(400, 320, `Speed = ${this.state.calculatedSpeed.toFixed(0)} m/s`, { fill: '#22c55e', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });
    }

    // Distance slider
    r.text(250, 360, `Distance to wall: ${this.state.distance} m`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.addSlider({ id: 'distance', label: 'Distance', min: 50, max: 500, step: 10, value: this.state.distance });

    // Control buttons
    if (!this.state.measuring) {
      r.addButton({ id: 'clap', label: 'CLAP!', variant: 'primary' });
    }

    if (this.state.hasMeasured && !this.state.measuring) {
      r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
    }

    if (this.state.calculatedSpeed > 0 && !this.state.showResult) {
      r.addButton({ id: 'see-result', label: 'See Results', variant: 'primary' });
    }

    if (this.state.showResult) {
      const isCorrect = this.state.prediction === 'b';
      r.rect(150, 400, 500, 80, { fill: isCorrect ? '#052e16' : '#431407', rx: 12 });
      r.text(400, 425, isCorrect ? 'Correct!' : 'Now you know!', { fill: isCorrect ? '#22c55e' : '#f97316', fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });
      r.text(400, 450, 'Sound travels at about 343 m/s in air at room temperature.', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });
      r.text(400, 470, "That's faster than most jet airplanes but much slower than light!", { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'learn', label: 'Learn the Physics', variant: 'primary' });
    }
  }

  private renderReview(r: CommandRenderer): void {
    r.text(400, 50, 'The Physics of Sound Speed', { fill: '#ffffff', fontSize: 28, textAnchor: 'middle', fontWeight: 'bold' });

    // Formula box
    r.rect(150, 80, 500, 100, { fill: '#1e3a5f', rx: 12 });
    r.text(400, 105, 'The Formula', { fill: '#60a5fa', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 135, 'v = d / t', { fill: '#ffffff', fontSize: 24, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 165, 'Speed = Distance / Time', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Echo method
    r.rect(150, 195, 500, 70, { fill: '#0f172a', rx: 8 });
    r.text(400, 220, 'For the echo method:', { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(400, 245, 'v = 2 x distance / echo time', { fill: '#60a5fa', fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });

    // Speed comparison table
    r.text(400, 290, 'Speed Comparison', { fill: '#fbbf24', fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });

    const comparisons = [
      { label: 'Walking', speed: '~1.5 m/s' },
      { label: 'Car (highway)', speed: '~30 m/s' },
      { label: 'Sound in air', speed: '~343 m/s', highlight: true },
      { label: 'Commercial jet', speed: '~250 m/s' },
      { label: 'Sound in water', speed: '~1,500 m/s' },
      { label: 'Sound in steel', speed: '~5,100 m/s' }
    ];

    comparisons.forEach((item, i) => {
      const y = 315 + i * 25;
      r.text(250, y, item.label, { fill: item.highlight ? '#22c55e' : '#94a3b8', fontSize: 12, textAnchor: 'start', fontWeight: item.highlight ? 'bold' : 'normal' });
      r.text(550, y, item.speed, { fill: item.highlight ? '#22c55e' : '#ffffff', fontSize: 12, textAnchor: 'end', fontWeight: item.highlight ? 'bold' : 'normal' });
    });

    r.addButton({ id: 'twist', label: 'Try a Twist!', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(400, 50, 'Temperature Challenge', { fill: '#ffffff', fontSize: 28, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 85, "It's a hot summer day (35C) vs a cold winter night (-10C).", { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
    r.text(400, 105, 'How does temperature affect sound speed?', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Temperature comparison
    r.rect(120, 130, 150, 100, { fill: '#fef3c7', rx: 10 });
    r.text(195, 165, '35C', { fill: '#92400e', fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(195, 190, 'HOT', { fill: '#92400e', fontSize: 14, textAnchor: 'middle' });

    r.text(400, 175, 'vs', { fill: '#64748b', fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });

    r.rect(530, 130, 150, 100, { fill: '#dbeafe', rx: 10 });
    r.text(605, 165, '-10C', { fill: '#1d4ed8', fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(605, 190, 'COLD', { fill: '#1d4ed8', fontSize: 14, textAnchor: 'middle' });

    // Options
    const options = [
      { id: 'a', text: "Same speed - temperature doesn't matter" },
      { id: 'b', text: 'Faster in hot air (molecules move faster)' },
      { id: 'c', text: 'Faster in cold air (denser = better conductor)' }
    ];

    options.forEach((opt, i) => {
      const y = 260 + i * 50;
      const isSelected = this.state.twistPrediction === opt.id;
      r.rect(150, y, 500, 40, { fill: isSelected ? '#f59e0b' : '#1e293b', rx: 8, stroke: isSelected ? '#f59e0b' : '#334155', strokeWidth: 2 });
      r.text(400, y + 25, opt.text, { fill: isSelected ? '#ffffff' : '#cbd5e1', fontSize: 14, textAnchor: 'middle' });
      r.addButton({ id: `twist-predict-${opt.id}`, label: '', variant: 'secondary' });
    });

    if (this.state.twistPrediction) {
      r.addButton({ id: 'test-it', label: 'Test It!', variant: 'primary' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(400, 40, 'Temperature Effect on Sound Speed', { fill: '#ffffff', fontSize: 24, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 65, 'Adjust temperature and observe sound speed', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // PROTECTED: Server calculates actual speed based on temperature
    const expectedSpeed = PHYSICS.calculateSpeedAtTemp(this.state.temperature);

    // Temperature display
    r.rect(250, 90, 100, 150, { fill: '#e2e8f0', rx: 8 });
    const tempHeight = Math.max(10, (this.state.temperature + 20) * 2);
    const tempFill = this.state.temperature > 20 ? '#ef4444' : '#3b82f6';
    r.rect(270, 220 - tempHeight, 60, tempHeight, { fill: tempFill, rx: 5 });
    r.circle(300, 230, 15, { fill: tempFill });

    // Speed display
    r.rect(420, 100, 180, 100, { fill: '#0f172a', rx: 12 });
    r.text(510, 130, `At ${this.state.temperature}C:`, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    r.text(510, 165, `${expectedSpeed.toFixed(0)} m/s`, { fill: '#ffffff', fontSize: 24, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(510, 190, 'Formula: v = 331 + 0.6T', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });

    // Temperature slider
    r.text(400, 270, `Temperature: ${this.state.temperature}C`, { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
    r.addSlider({ id: 'temperature', label: 'Temperature', min: -20, max: 45, step: 1, value: this.state.temperature });

    // Speed at different temperatures (bar chart)
    r.text(400, 320, 'Speed at different temperatures:', { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });

    const temps = [-10, 0, 20, 35];
    temps.forEach((t, i) => {
      const y = 345 + i * 25;
      const speed = PHYSICS.calculateSpeedAtTemp(t);
      const barWidth = (speed - 300) * 1.5;
      const isActive = t === this.state.temperature;

      r.text(200, y + 5, `${t}C:`, { fill: '#ffffff', fontSize: 11, textAnchor: 'end' });
      r.rect(210, y - 8, barWidth, 16, { fill: isActive ? '#3b82f6' : '#334155', rx: 3 });
      r.text(220 + barWidth, y + 5, `${speed.toFixed(0)} m/s`, { fill: '#ffffff', fontSize: 10, textAnchor: 'start' });
    });

    r.addButton({ id: 'see-twist-result', label: 'See Results', variant: 'primary' });

    if (this.state.showTwistResult) {
      const isCorrect = this.state.twistPrediction === 'b';
      r.rect(100, 450, 600, 80, { fill: isCorrect ? '#052e16' : '#431407', rx: 12 });
      r.text(400, 475, isCorrect ? 'Correct!' : 'Temperature matters!', { fill: isCorrect ? '#22c55e' : '#f97316', fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });
      r.text(400, 500, 'Sound travels faster in hot air! Each 1C increase adds about 0.6 m/s.', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });

      r.addButton({ id: 'understand', label: 'Understand Why', variant: 'primary' });
    }
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(400, 50, 'Temperature and Sound Speed', { fill: '#ffffff', fontSize: 28, textAnchor: 'middle', fontWeight: 'bold' });

    // Formula box
    r.rect(150, 80, 500, 80, { fill: '#fef9c3', rx: 12 });
    r.text(400, 105, 'The Temperature Formula', { fill: '#ca8a04', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 135, 'v = 331 + 0.6T (m/s)', { fill: '#1e293b', fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 155, 'T = temperature in Celsius', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    // Explanation
    r.rect(150, 180, 500, 120, { fill: '#0f172a', rx: 12 });
    r.text(400, 205, 'Why hotter = faster?', { fill: '#f59e0b', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 235, '- Higher temperature = faster molecule motion', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });
    r.text(400, 260, '- Faster molecules collide more frequently', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });
    r.text(400, 285, '- Sound waves (pressure waves) propagate faster', { fill: '#ffffff', fontSize: 12, textAnchor: 'middle' });

    // Practical impact
    r.rect(150, 320, 500, 60, { fill: '#052e16', rx: 12 });
    r.text(400, 345, 'Practical Impact', { fill: '#22c55e', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 368, 'Outdoor concerts sound different on hot vs cold days!', { fill: '#ffffff', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'transfer', label: 'See Real Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(400, 40, 'Sound Speed in the Real World', { fill: '#ffffff', fontSize: 24, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 65, 'Explore each application to unlock the test', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Application cards
    APPLICATIONS.forEach((app, i) => {
      const x = 150 + (i % 2) * 260;
      const y = 100 + Math.floor(i / 2) * 120;
      const isCompleted = this.state.completedApps.includes(i);

      r.rect(x, y, 240, 100, {
        fill: isCompleted ? '#052e16' : '#1e293b',
        rx: 12,
        stroke: isCompleted ? '#22c55e' : '#334155',
        strokeWidth: 2
      });
      r.text(x + 120, y + 30, app.title + (isCompleted ? ' (done)' : ''), {
        fill: '#ffffff', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold'
      });
      r.text(x + 120, y + 50, app.description, { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

      if (isCompleted) {
        r.text(x + 120, y + 75, app.detail.substring(0, 60) + '...', { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });
      }

      if (!isCompleted) {
        r.addButton({ id: `app-${i}`, label: 'Explore', variant: 'secondary' });
      }
    });

    r.text(400, 370, `${this.state.completedApps.length} / ${APPLICATIONS.length} applications explored`, {
      fill: '#64748b', fontSize: 12, textAnchor: 'middle'
    });

    if (this.state.completedApps.length >= APPLICATIONS.length) {
      r.addButton({ id: 'take-test', label: 'Take the Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    r.text(400, 40, 'Speed of Sound Mastery Test', { fill: '#ffffff', fontSize: 24, textAnchor: 'middle', fontWeight: 'bold' });

    if (!this.state.testSubmitted) {
      // Show questions
      TEST_QUESTIONS.forEach((q, qi) => {
        const qY = 80 + qi * 35;
        const answered = this.state.testAnswers[qi] !== undefined;
        r.text(100, qY, `${qi + 1}. ${q.q.substring(0, 50)}...`, {
          fill: answered ? '#22c55e' : '#94a3b8', fontSize: 11, textAnchor: 'start'
        });

        // Mini buttons for each option
        q.options.forEach((opt, oi) => {
          const isSelected = this.state.testAnswers[qi] === oi;
          r.addButton({
            id: `q${qi}-a${oi}`,
            label: String.fromCharCode(65 + oi),
            variant: isSelected ? 'primary' : 'secondary'
          });
        });
      });

      const answeredCount = Object.keys(this.state.testAnswers).length;
      r.text(400, 450, `Answered: ${answeredCount}/${TEST_QUESTIONS.length}`, { fill: '#64748b', fontSize: 14, textAnchor: 'middle' });

      if (answeredCount === TEST_QUESTIONS.length) {
        r.addButton({ id: 'submit-test', label: 'Submit Test', variant: 'primary' });
      }
    } else {
      // Show results - PROTECTED: Server calculates score
      let score = 0;
      TEST_QUESTIONS.forEach((q, qi) => {
        if (this.state.testAnswers[qi] === q.correctIndex) {
          score++;
        }
      });

      r.text(400, 120, `Score: ${score}/${TEST_QUESTIONS.length}`, {
        fill: score >= 7 ? '#22c55e' : '#f59e0b', fontSize: 32, textAnchor: 'middle', fontWeight: 'bold'
      });
      r.text(400, 160, `${Math.round(score / TEST_QUESTIONS.length * 100)}%`, {
        fill: '#94a3b8', fontSize: 18, textAnchor: 'middle'
      });

      // Show explanations for wrong answers
      TEST_QUESTIONS.forEach((q, qi) => {
        const y = 200 + qi * 25;
        const isCorrect = this.state.testAnswers[qi] === q.correctIndex;
        r.text(100, y, `${qi + 1}. ${isCorrect ? 'Correct' : 'Incorrect'}: ${q.explanation.substring(0, 60)}...`, {
          fill: isCorrect ? '#22c55e' : '#ef4444', fontSize: 10, textAnchor: 'start'
        });
      });

      r.addButton({ id: 'complete', label: 'Complete Journey', variant: 'primary' });
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(400, 80, 'Sound Speed Master!', { fill: '#ffffff', fontSize: 36, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 120, 'You can now calculate storm distances and understand', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
    r.text(400, 140, 'how temperature affects the speed of sound!', { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });

    // Achievement badges
    r.rect(200, 170, 400, 120, { fill: '#1e3a5f', rx: 16 });
    r.text(400, 200, 'Your Achievements', { fill: '#60a5fa', fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });

    // Calculate final score
    let score = 0;
    TEST_QUESTIONS.forEach((q, qi) => {
      if (this.state.testAnswers[qi] === q.correctIndex) {
        score++;
      }
    });

    r.text(300, 240, `${score}/${TEST_QUESTIONS.length}`, { fill: '#ffffff', fontSize: 28, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(300, 260, 'Test Score', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.text(500, 240, '4', { fill: '#ffffff', fontSize: 28, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(500, 260, 'Applications', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    // Key takeaways
    r.rect(150, 310, 500, 100, { fill: '#0f172a', rx: 12 });
    r.text(400, 335, 'Key Takeaways:', { fill: '#ffffff', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 360, '- Sound speed = 343 m/s at 20C', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(400, 380, '- v = 331 + 0.6T (temperature effect)', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });
    r.text(400, 400, '- 5 seconds = 1 mile (storm distance rule)', { fill: '#94a3b8', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'play-again', label: 'Play Again', variant: 'primary' });
  }

  getState(): SpeedOfSoundState {
    return { ...this.state };
  }

  restoreState(state: SpeedOfSoundState): void {
    this.state = { ...state };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================
export function createSpeedOfSoundGame(sessionId: string): SpeedOfSoundGame {
  return new SpeedOfSoundGame(sessionId);
}
