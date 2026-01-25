// ============================================================================
// StrawInstrumentGame - Standing Waves and Pipe Resonance
// Physics: f = v/(2L) for open pipes - shorter tube = higher frequency
// ============================================================================

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// Protected physics constants - NEVER sent to client
const SOUND_SPEED = 343; // m/s in air at room temperature
const SEMITONE_RATIO = Math.pow(2, 1/12); // ~1.0595

// C Major scale straw lengths (cm) - starting from C4
const SCALE_STRAW_LENGTHS = [20, 17.8, 15.9, 15, 13.4, 11.9, 10.6, 10];
const SCALE_NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B', "C'"];

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

const PHASES: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

interface StrawInstrumentState {
  phase: Phase;
  prediction: string | null;
  twistPrediction: string | null;
  strawLength: number;
  hasPlayed: boolean;
  showResult: boolean;
  showTwistResult: boolean;
  activeStraw: number | null;
  testAnswers: Record<number, number>;
  testSubmitted: boolean;
  completedApps: number[];
  sessionId: string;
}

// Test questions - correctIndex is PROTECTED (never sent to client)
const TEST_QUESTIONS = [
  {
    question: "What happens to pitch when you cut a straw shorter?",
    options: [
      "Pitch gets lower",
      "Pitch gets higher",
      "Pitch stays the same",
      "The straw stops making sound"
    ],
    correctIndex: 1,
    explanation: "Shorter tubes produce higher pitches. The wavelength that fits in the tube is shorter, meaning higher frequency and higher pitch."
  },
  {
    question: "What creates the sound in a straw instrument?",
    options: [
      "Air molecules splitting",
      "Standing waves (resonance) in the tube",
      "Static electricity",
      "Air pressure outside the tube"
    ],
    correctIndex: 1,
    explanation: "Sound is created by standing waves - patterns where certain wavelengths resonate and reinforce themselves within the tube, amplifying the sound."
  },
  {
    question: "For an open pipe, the fundamental frequency formula is:",
    options: [
      "f = v / L",
      "f = v / (2L)",
      "f = v / (4L)",
      "f = 2v / L"
    ],
    correctIndex: 1,
    explanation: "For an open pipe, one complete wavelength spans twice the tube length: lambda = 2L. Since f = v/lambda, we get f = v/(2L)."
  },
  {
    question: "If a 20 cm straw produces 850 Hz, what frequency would a 10 cm straw produce?",
    options: [
      "425 Hz",
      "850 Hz",
      "1700 Hz",
      "340 Hz"
    ],
    correctIndex: 2,
    explanation: "Halving the length doubles the frequency. Since f = v/(2L), if L is halved, f doubles: from 850 Hz to 1700 Hz."
  },
  {
    question: "Why do pan flutes have tubes of different lengths?",
    options: [
      "For decoration",
      "Each length produces a different note",
      "Longer tubes are louder",
      "They contain different materials"
    ],
    correctIndex: 1,
    explanation: "Each tube length resonates at a specific frequency, producing a different musical note. Shorter tubes make higher notes, longer tubes make lower notes."
  },
  {
    question: "What are the nodes in a standing wave?",
    options: [
      "Points of maximum vibration",
      "Points of no vibration",
      "The ends of the tube",
      "Where sound escapes"
    ],
    correctIndex: 1,
    explanation: "Nodes are points in a standing wave where there is no displacement - the wave cancels itself. Anti-nodes are points of maximum displacement."
  },
  {
    question: "How does a closed pipe differ from an open pipe?",
    options: [
      "Closed pipes are quieter",
      "Closed pipes only produce odd harmonics",
      "Closed pipes produce lower frequencies",
      "No difference in sound"
    ],
    correctIndex: 1,
    explanation: "Closed pipes (one end blocked) only produce odd harmonics (1st, 3rd, 5th...) because of the boundary condition at the closed end. Open pipes produce all harmonics."
  },
  {
    question: "What is resonance in the context of musical instruments?",
    options: [
      "When sound bounces back",
      "When certain frequencies are amplified by constructive interference",
      "When air gets compressed",
      "When the tube vibrates visibly"
    ],
    correctIndex: 1,
    explanation: "Resonance occurs when a frequency matches the natural frequency of the system, causing constructive interference and amplification. This is what makes instruments loud."
  },
  {
    question: "If you blow harder into a straw, what primarily changes?",
    options: [
      "Pitch increases significantly",
      "Volume increases (pitch may rise slightly)",
      "Wavelength changes",
      "Nothing changes"
    ],
    correctIndex: 1,
    explanation: "Blowing harder primarily increases volume (amplitude). Pitch may increase slightly due to higher harmonics becoming more prominent, but the fundamental stays roughly the same."
  },
  {
    question: "Why does a straw with a flattened end (like a reed) make sound easier?",
    options: [
      "Air flows faster",
      "The vibrating reed creates regular pressure pulses",
      "The straw gets longer",
      "Air becomes denser"
    ],
    correctIndex: 1,
    explanation: "A flattened end acts like a double reed, vibrating rapidly to create regular pressure pulses that excite the air column. This is how oboes and bassoons work!"
  }
];

// Transfer applications
const APPLICATIONS = [
  {
    title: "Pan Flute",
    description: "Ancient multi-tube instrument",
    detail: "The pan flute dates back thousands of years. Each tube is a different length, producing a different note. Players blow across the top of tubes to create music."
  },
  {
    title: "Organ Pipes",
    description: "Church organs with hundreds of pipes",
    detail: "Pipe organs contain thousands of metal pipes of different lengths. The largest may be 32 feet long (producing frequencies below human hearing), the smallest just inches."
  },
  {
    title: "Clarinet & Oboe",
    description: "Reed instruments with holes",
    detail: "Instead of cutting tubes, these instruments use finger holes to effectively change the tube length. Closing holes makes the tube 'longer' (lower pitch)."
  },
  {
    title: "Car Exhaust Tuning",
    description: "Engineering for desired sound",
    detail: "Car exhausts are tuned using pipe length and resonance. Sports cars have specific pipe lengths to create their distinctive sound while managing back-pressure."
  }
];

export class StrawInstrumentGame extends BaseGame {
  readonly gameType = 'straw_instrument';
  readonly gameTitle = 'Straw Instrument: Standing Waves and Pipe Resonance';

  private state: StrawInstrumentState;

  constructor(sessionId: string, _config?: SessionConfig) {
    super(sessionId);
    this.state = {
      phase: 'hook',
      prediction: null,
      twistPrediction: null,
      strawLength: 20,
      hasPlayed: false,
      showResult: false,
      showTwistResult: false,
      activeStraw: null,
      testAnswers: {},
      testSubmitted: false,
      completedApps: [],
      sessionId
    };
  }

  // PROTECTED: Calculate frequency from length (open pipe formula)
  private calculateFrequency(lengthCm: number): number {
    const lengthM = lengthCm / 100;
    return SOUND_SPEED / (2 * lengthM);
  }

  // PROTECTED: Get note name from frequency
  private frequencyToNote(freq: number): string {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const A4 = 440;
    const halfSteps = Math.round(12 * Math.log2(freq / A4));
    const noteIndex = ((halfSteps % 12) + 12 + 9) % 12;
    const octave = Math.floor((halfSteps + 9) / 12) + 4;
    return notes[noteIndex] + octave;
  }

  // PROTECTED: Calculate test score
  private calculateScore(): number {
    let correct = 0;
    for (let i = 0; i < TEST_QUESTIONS.length; i++) {
      if (this.state.testAnswers[i] === TEST_QUESTIONS[i].correctIndex) {
        correct++;
      }
    }
    return correct;
  }

  handleInput(input: UserInput): void {
    if (input.type === 'button_click') {
      switch (input.id) {
        case 'start':
          this.state.phase = 'predict';
          break;
        case 'prediction_a':
          this.state.prediction = 'a';
          break;
        case 'prediction_b':
          this.state.prediction = 'b';
          break;
        case 'prediction_c':
          this.state.prediction = 'c';
          break;
        case 'test_prediction':
          if (this.state.prediction) this.state.phase = 'play';
          break;
        case 'play_straw':
          this.state.hasPlayed = true;
          break;
        case 'see_results':
          this.state.showResult = true;
          break;
        case 'learn_physics':
          this.state.phase = 'review';
          break;
        case 'twist_a':
          this.state.twistPrediction = 'a';
          break;
        case 'twist_b':
          this.state.twistPrediction = 'b';
          break;
        case 'twist_c':
          this.state.twistPrediction = 'c';
          break;
        case 'build_scale':
          if (this.state.twistPrediction) this.state.phase = 'twist_play';
          break;
        case 'see_twist_results':
          this.state.showTwistResult = true;
          break;
        case 'understand_why':
          this.state.phase = 'twist_review';
          break;
        case 'see_applications':
          this.state.phase = 'transfer';
          break;
        case 'try_twist':
          this.state.phase = 'twist_predict';
          break;
        case 'take_test':
          this.state.phase = 'test';
          break;
        case 'submit_test':
          if (Object.keys(this.state.testAnswers).length >= TEST_QUESTIONS.length) {
            this.state.testSubmitted = true;
          }
          break;
        case 'complete_journey':
          this.state.phase = 'mastery';
          break;
        case 'play_again':
          this.resetGame();
          break;
      }

      // Handle straw clicks (twist_play phase)
      if (input.id.startsWith('straw_')) {
        const index = parseInt(input.id.replace('straw_', ''));
        this.state.activeStraw = index;
        setTimeout(() => { this.state.activeStraw = null; }, 400);
      }

      // Handle transfer app clicks
      if (input.id.startsWith('app_')) {
        const index = parseInt(input.id.replace('app_', ''));
        if (!this.state.completedApps.includes(index)) {
          this.state.completedApps.push(index);
        }
      }

      // Handle test answers
      if (input.id.startsWith('test_')) {
        const parts = input.id.split('_');
        const qIndex = parseInt(parts[1]);
        const aIndex = parseInt(parts[2]);
        if (!this.state.testSubmitted) {
          this.state.testAnswers[qIndex] = aIndex;
        }
      }
    }

    if (input.type === 'slider_change' && input.id === 'straw_length') {
      this.state.strawLength = input.value as number;
    }
  }

  getCurrentPhase(): string {
    return this.state.phase;
  }

  update(_deltaTime: number): void {
    // No continuous updates needed for this game
  }

  render(): GameFrame {
    const r = new CommandRenderer();

    // Header with progress
    r.setProgress({
      id: 'phase_progress',
      current: PHASES.indexOf(this.state.phase),
      total: PHASES.length,
      labels: ['Hook', 'Predict', 'Play', 'Review', 'Twist', 'Twist Lab', 'Twist Review', 'Transfer', 'Test', 'Mastery']
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

    return r.toFrame(0);
  }

  private renderHook(r: CommandRenderer): void {
    r.text(200, 30, 'Music From a Straw!', { fill: '#1e293b', fontSize: 24, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 60, 'Can you turn a simple drinking straw into a musical instrument?', { fill: '#64748b', fontSize: 14, textAnchor: 'middle' });

    // Multiple straws visualization
    for (let i = 0; i < 8; i++) {
      const length = 180 - i * 18;
      const x = 50 + i * 40;
      const hue = 200 + i * 20;
      r.rect(x, 200 - length, 25, length, { fill: `hsl(${hue}, 70%, 50%)` });
    }

    r.text(200, 230, 'Different lengths = Different notes!', { fill: '#1e293b', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });

    r.addButton({ id: 'start', label: 'Explore Straw Music', variant: 'primary' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 30, 'Make Your Prediction', { fill: '#1e293b', fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 55, 'You have two straws: 20 cm and 10 cm long.', { fill: '#64748b', fontSize: 13, textAnchor: 'middle' });
    r.text(200, 75, 'Which produces the higher pitch?', { fill: '#64748b', fontSize: 13, textAnchor: 'middle' });

    // Visualization of two straws
    r.rect(70, 30, 25, 100, { fill: '#3b82f6' });
    r.text(82, 150, '20 cm', { fill: '#1e293b', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });

    r.rect(270, 80, 25, 50, { fill: '#ef4444' });
    r.text(282, 150, '10 cm', { fill: '#1e293b', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });

    // Prediction options
    const optA = this.state.prediction === 'a';
    const optB = this.state.prediction === 'b';
    const optC = this.state.prediction === 'c';

    r.addButton({ id: 'prediction_a', label: 'Long straw (20 cm) = higher pitch', variant: optA ? 'primary' : 'secondary' });
    r.addButton({ id: 'prediction_b', label: 'Short straw (10 cm) = higher pitch', variant: optB ? 'primary' : 'secondary' });
    r.addButton({ id: 'prediction_c', label: 'Both make the same pitch', variant: optC ? 'primary' : 'secondary' });

    if (this.state.prediction) {
      r.addButton({ id: 'test_prediction', label: 'Test It!', variant: 'success' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    const freq = this.calculateFrequency(this.state.strawLength);
    const note = this.frequencyToNote(freq);

    r.text(200, 25, 'Straw Instrument Lab', { fill: '#1e293b', fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 45, 'Adjust the straw length and listen to the pitch change!', { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });

    // Straw visualization
    const strawHeight = this.state.strawLength * 5;
    const hue = 200 + (30 - this.state.strawLength) * 5;
    r.rect(180, 180 - strawHeight, 40, strawHeight, { fill: `hsl(${hue}, 70%, 50%)` });

    r.text(200, 195, `Length: ${this.state.strawLength} cm`, { fill: '#1e293b', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });

    // Frequency display
    r.rect(280, 70, 90, 60, { fill: '#1e293b' });
    r.text(325, 95, `${freq.toFixed(0)} Hz`, { fill: '#22c55e', fontSize: 14, textAnchor: 'middle' });
    r.text(325, 118, note, { fill: '#fbbf24', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });

    // Slider
    r.addSlider({ id: 'straw_length', label: 'Straw Length (cm)', min: 5, max: 30, step: 1, value: this.state.strawLength });

    r.addButton({ id: 'play_straw', label: 'Blow!', variant: 'primary' });

    if (this.state.hasPlayed && !this.state.showResult) {
      r.addButton({ id: 'see_results', label: 'See Results', variant: 'secondary' });
    }

    if (this.state.showResult) {
      const isCorrect = this.state.prediction === 'b';
      r.rect(50, 230, 300, 80, { fill: isCorrect ? '#dcfce7' : '#fef3c7' });
      r.text(200, 255, isCorrect ? 'Correct!' : 'Shorter = Higher!', { fill: isCorrect ? '#166534' : '#92400e', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });
      r.text(200, 275, 'Shorter straws produce higher pitches!', { fill: '#1e293b', fontSize: 12, textAnchor: 'middle' });
      r.text(200, 295, 'Shorter tubes = shorter waves = higher frequency', { fill: '#1e293b', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'learn_physics', label: 'Learn the Physics', variant: 'primary' });
    }
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 25, 'The Physics of Pipe Resonance', { fill: '#1e293b', fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });

    // Standing wave visualization
    r.rect(30, 80, 240, 40, { fill: '#e2e8f0' });
    r.text(150, 70, 'Standing Waves', { fill: '#1d4ed8', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });

    // Formula box
    r.rect(100, 140, 200, 50, { fill: 'white' });
    r.text(200, 165, 'f = v / (2L)', { fill: '#1e293b', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 185, 'frequency = sound speed / (2 x tube length)', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });

    // Key insight
    r.text(200, 220, 'Key insight: Halve the length -> double the frequency!', { fill: '#1e293b', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 240, '20 cm straw -> ~858 Hz', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 255, '10 cm straw -> ~1,715 Hz (one octave higher)', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    r.addButton({ id: 'try_twist', label: 'Try a Twist!', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 25, 'Build a Musical Scale!', { fill: '#1e293b', fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 50, 'To make a C major scale (Do-Re-Mi...)', { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 70, 'how should the straw lengths relate?', { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });

    // Scale visualization
    const notes = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti', "Do'"];
    for (let i = 0; i < 8; i++) {
      const x = 45 + i * 40;
      const height = 15 + (i + 1) * 8;
      r.rect(x, 140 - height, 28, height, { fill: `hsl(${200 + i * 20}, 60%, 55%)` });
      r.text(x + 14, 155, notes[i], { fill: '#1e293b', fontSize: 9, textAnchor: 'middle' });
    }

    const optA = this.state.twistPrediction === 'a';
    const optB = this.state.twistPrediction === 'b';
    const optC = this.state.twistPrediction === 'c';

    r.addButton({ id: 'twist_a', label: 'Equal spacing (each 2 cm shorter)', variant: optA ? 'primary' : 'secondary' });
    r.addButton({ id: 'twist_b', label: 'Ratio spacing (each ~11% shorter)', variant: optB ? 'primary' : 'secondary' });
    r.addButton({ id: 'twist_c', label: 'Random lengths can make any scale', variant: optC ? 'primary' : 'secondary' });

    if (this.state.twistPrediction) {
      r.addButton({ id: 'build_scale', label: 'Build the Scale!', variant: 'success' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(200, 25, 'Your Straw Pan Flute', { fill: '#1e293b', fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 45, 'Click each straw to play a note!', { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });

    // Base
    r.rect(20, 190, 360, 20, { fill: '#854d0e' });

    // Straws
    for (let i = 0; i < 8; i++) {
      const length = SCALE_STRAW_LENGTHS[i];
      const x = 40 + i * 42;
      const height = length * 6;
      const isActive = this.state.activeStraw === i;
      const fill = isActive ? '#fbbf24' : `hsl(${200 + i * 20}, 60%, 55%)`;

      r.rect(x, 190 - height, 35, height, { fill });
      r.text(x + 17, 205, SCALE_NOTE_NAMES[i], { fill: 'white', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });
      r.text(x + 17, 175 - height, `${length.toFixed(1)}cm`, { fill: '#64748b', fontSize: 8, textAnchor: 'middle' });

      r.addButton({ id: `straw_${i}`, label: SCALE_NOTE_NAMES[i], variant: 'secondary' });
    }

    // Info box
    r.rect(50, 230, 300, 50, { fill: '#f8fafc' });
    r.text(200, 250, 'Each note is about ~11% shorter than the previous,', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 265, 'not a fixed amount shorter. This is RATIO spacing!', { fill: '#1e293b', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });

    r.addButton({ id: 'see_twist_results', label: 'See Results', variant: 'primary' });

    if (this.state.showTwistResult) {
      const isCorrect = this.state.twistPrediction === 'b';
      r.rect(50, 290, 300, 60, { fill: isCorrect ? '#dcfce7' : '#fef3c7' });
      r.text(200, 310, isCorrect ? 'Correct!' : "It's about ratios!", { fill: isCorrect ? '#166534' : '#92400e', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });
      r.text(200, 330, 'Musical scales use ratio spacing (2^(1/12) per semitone)', { fill: '#1e293b', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'understand_why', label: 'Understand Why', variant: 'primary' });
    }
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 25, 'Musical Math: Equal Temperament', { fill: '#1e293b', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });

    // The 12th root of 2
    r.rect(50, 60, 300, 80, { fill: '#fefce8' });
    r.text(200, 85, 'The 12th Root of 2', { fill: '#ca8a04', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 110, 'Semitone ratio = 12-th root of 2 = 1.0595', { fill: '#1e293b', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 130, '12 semitones = 1 octave = 2x frequency', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    // Why ratios
    r.rect(50, 155, 300, 70, { fill: '#f0fdf4' });
    r.text(200, 175, 'Why ratios, not fixed steps?', { fill: '#166534', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 195, 'Our ears perceive pitch logarithmically.', { fill: '#1e293b', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 210, '100->200 Hz sounds same as 500->1000 Hz (one octave)', { fill: '#1e293b', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'see_applications', label: 'See Real Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 25, 'Pipe Resonance in the Real World', { fill: '#1e293b', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 45, 'Explore each application to unlock the test', { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });

    // Application cards
    for (let i = 0; i < APPLICATIONS.length; i++) {
      const app = APPLICATIONS[i];
      const isComplete = this.state.completedApps.includes(i);
      const y = 70 + i * 55;
      const fill = isComplete ? '#dcfce7' : 'white';

      r.rect(30, y, 340, 50, { fill });
      r.text(50, y + 20, app.title, { fill: '#1e293b', fontSize: 13, textAnchor: 'start', fontWeight: 'bold' });
      r.text(50, y + 38, app.description, { fill: '#64748b', fontSize: 11, textAnchor: 'start' });
      if (isComplete) {
        r.text(350, y + 25, 'Done', { fill: '#22c55e', fontSize: 11, textAnchor: 'end', fontWeight: 'bold' });
      }

      r.addButton({ id: `app_${i}`, label: isComplete ? 'Reviewed' : 'Learn', variant: isComplete ? 'success' : 'secondary' });
    }

    r.text(200, 295, `${this.state.completedApps.length} / ${APPLICATIONS.length} applications explored`, { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });

    if (this.state.completedApps.length >= APPLICATIONS.length) {
      r.addButton({ id: 'take_test', label: 'Take the Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    r.text(200, 20, 'Pipe Resonance Mastery Test', { fill: '#1e293b', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });

    if (!this.state.testSubmitted) {
      // Show questions (simplified view - just count)
      const answered = Object.keys(this.state.testAnswers).length;
      r.text(200, 50, `Questions answered: ${answered} / ${TEST_QUESTIONS.length}`, { fill: '#64748b', fontSize: 14, textAnchor: 'middle' });

      // Display current question indicators
      for (let i = 0; i < TEST_QUESTIONS.length; i++) {
        const x = 60 + (i % 5) * 60;
        const y = 80 + Math.floor(i / 5) * 40;
        const hasAnswer = this.state.testAnswers[i] !== undefined;
        r.rect(x, y, 50, 30, { fill: hasAnswer ? '#22c55e' : '#e2e8f0' });
        r.text(x + 25, y + 20, `Q${i + 1}`, { fill: hasAnswer ? 'white' : '#64748b', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });

        // Answer buttons for each question
        for (let j = 0; j < 4; j++) {
          r.addButton({ id: `test_${i}_${j}`, label: `Q${i + 1} Opt ${j + 1}`, variant: this.state.testAnswers[i] === j ? 'primary' : 'secondary' });
        }
      }

      if (answered >= TEST_QUESTIONS.length) {
        r.addButton({ id: 'submit_test', label: `Submit Test (${answered}/${TEST_QUESTIONS.length})`, variant: 'primary' });
      }
    } else {
      const score = this.calculateScore();
      const percentage = Math.round((score / TEST_QUESTIONS.length) * 100);

      r.text(200, 80, `Score: ${score}/${TEST_QUESTIONS.length} (${percentage}%)`, { fill: score >= 7 ? '#22c55e' : '#f59e0b', fontSize: 24, textAnchor: 'middle', fontWeight: 'bold' });

      // Show results summary
      for (let i = 0; i < TEST_QUESTIONS.length; i++) {
        const isCorrect = this.state.testAnswers[i] === TEST_QUESTIONS[i].correctIndex;
        const x = 50 + (i % 5) * 65;
        const y = 130 + Math.floor(i / 5) * 35;
        r.rect(x, y, 55, 25, { fill: isCorrect ? '#dcfce7' : '#fee2e2' });
        r.text(x + 27, y + 17, `Q${i + 1}: ${isCorrect ? 'OK' : 'X'}`, { fill: isCorrect ? '#166534' : '#dc2626', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });
      }

      r.addButton({ id: 'complete_journey', label: 'Complete Journey', variant: 'success' });
    }
  }

  private renderMastery(r: CommandRenderer): void {
    const score = this.calculateScore();

    r.text(200, 30, 'Pipe Resonance Master!', { fill: '#1e293b', fontSize: 24, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 60, 'You understand how tube length creates musical notes!', { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });

    // Achievement box
    r.rect(80, 90, 240, 120, { fill: '#eff6ff' });
    r.text(200, 115, 'Your Achievements', { fill: '#1d4ed8', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });

    r.text(140, 145, `${score}/${TEST_QUESTIONS.length}`, { fill: '#1e293b', fontSize: 24, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(140, 165, 'Test Score', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    r.text(260, 145, '4', { fill: '#1e293b', fontSize: 24, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(260, 165, 'Applications', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    // Key takeaways
    r.rect(60, 220, 280, 80, { fill: 'white' });
    r.text(200, 240, 'Key Takeaways:', { fill: '#1e293b', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 260, 'f = v / (2L) for open pipes', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 275, 'Shorter = higher pitch | Half length = double frequency', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 290, 'Musical scales use ratio spacing', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });

    r.addButton({ id: 'play_again', label: 'Play Again', variant: 'primary' });
  }

  private resetGame(): void {
    this.state = {
      ...this.state,
      phase: 'hook',
      prediction: null,
      twistPrediction: null,
      strawLength: 20,
      hasPlayed: false,
      showResult: false,
      showTwistResult: false,
      activeStraw: null,
      testAnswers: {},
      testSubmitted: false,
      completedApps: []
    };
  }

  getState(): Record<string, unknown> {
    // Return state WITHOUT sensitive data (correctIndex values)
    return {
      phase: this.state.phase,
      prediction: this.state.prediction,
      twistPrediction: this.state.twistPrediction,
      strawLength: this.state.strawLength,
      hasPlayed: this.state.hasPlayed,
      showResult: this.state.showResult,
      showTwistResult: this.state.showTwistResult,
      activeStraw: this.state.activeStraw,
      testSubmitted: this.state.testSubmitted,
      completedApps: this.state.completedApps,
      testScore: this.state.testSubmitted ? this.calculateScore() : null,
      // Note: testAnswers sent but correctIndex never sent
      answeredQuestions: Object.keys(this.state.testAnswers).length
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase && PHASES.includes(state.phase as Phase)) {
      this.state.phase = state.phase as Phase;
    }
    if (state.prediction !== undefined) this.state.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.state.twistPrediction = state.twistPrediction as string | null;
    if (typeof state.strawLength === 'number') this.state.strawLength = state.strawLength;
    if (typeof state.hasPlayed === 'boolean') this.state.hasPlayed = state.hasPlayed;
    if (typeof state.showResult === 'boolean') this.state.showResult = state.showResult;
    if (typeof state.showTwistResult === 'boolean') this.state.showTwistResult = state.showTwistResult;
    if (typeof state.testSubmitted === 'boolean') this.state.testSubmitted = state.testSubmitted;
    if (Array.isArray(state.completedApps)) this.state.completedApps = state.completedApps as number[];
  }
}

// Factory function
export function createStrawInstrumentGame(sessionId: string, config?: SessionConfig): StrawInstrumentGame {
  return new StrawInstrumentGame(sessionId, config);
}
