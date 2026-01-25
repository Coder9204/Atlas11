// ============================================================================
// STANDING WAVES GAME - Server-Side Implementation
// ============================================================================
// Physics: Standing waves form when a wave reflects and interferes with itself
// Key concepts: Harmonics, nodes, antinodes, resonance
// Formula: f_n = n * f_1 = (n/2L) * sqrt(T/mu)

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// ============================================================================
// PROTECTED PHYSICS CONSTANTS - Server-side only, never sent to client
// ============================================================================
const PHYSICS = {
  // Standing wave formula: f_n = (n/2L) * sqrt(T/mu)
  // For a string: v = sqrt(T/mu) where T is tension, mu is linear mass density

  // Calculate frequency for nth harmonic
  calculateHarmonicFrequency: (baseFrequency: number, n: number): number => {
    return baseFrequency * n;
  },

  // Calculate wave speed from tension
  calculateWaveSpeed: (tension: number, linearDensity: number): number => {
    return Math.sqrt(tension / linearDensity);
  },

  // Calculate fundamental frequency
  calculateFundamental: (length: number, waveSpeed: number): number => {
    return waveSpeed / (2 * length);
  },

  // Calculate number of nodes for nth harmonic (including endpoints)
  calculateNodes: (n: number): number => {
    return n + 1;
  },

  // Calculate number of antinodes for nth harmonic
  calculateAntinodes: (n: number): number => {
    return n;
  },

  // Calculate wavelength for nth harmonic
  calculateWavelength: (length: number, n: number): number => {
    return (2 * length) / n;
  },

  // Base frequency calculation (simplified model)
  getBaseFrequency: (tension: number): number => {
    // 80 + tension * 3.2 gives a reasonable range
    return 80 + tension * 3.2;
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

interface StandingWavesState {
  phase: Phase;
  prediction: string | null;
  twistPrediction: string | null;

  // Simulation parameters
  harmonic: number;           // 1-6
  tension: number;            // 10-100%
  time: number;               // Animation time

  // Discovery tracking
  discoveredHarmonics: number[];

  // Transfer
  activeApp: number;
  completedApps: number[];

  // Test
  testIndex: number;
  answers: (number | null)[];
  showResult: boolean;
}

// ============================================================================
// TEST QUESTIONS - correctIndex is PROTECTED (server-side only)
// ============================================================================
const TEST_QUESTIONS = [
  {
    q: "A rope fixed at both ends is shaken. When do stable standing wave patterns form?",
    options: ["Any frequency", "Only resonant frequencies fitting whole half-wavelengths", "Only low frequencies", "Only high frequencies"],
    correctIndex: 1,
    explanation: "Standing waves form only at resonant frequencies where whole numbers of half-wavelengths fit between the fixed ends."
  },
  {
    q: "If the fundamental frequency is 100 Hz, what is the 3rd harmonic?",
    options: ["150 Hz", "200 Hz", "300 Hz", "400 Hz"],
    correctIndex: 2,
    explanation: "Harmonics are integer multiples of the fundamental: 3rd harmonic = 3 x 100 Hz = 300 Hz."
  },
  {
    q: "How does increasing rope tension affect wave speed?",
    options: ["No effect", "Increases speed", "Decreases speed", "Depends on frequency"],
    correctIndex: 1,
    explanation: "Wave speed v = sqrt(T/mu). Higher tension = faster waves = higher resonant frequencies."
  },
  {
    q: "At a node in a standing wave, what do you observe?",
    options: ["Maximum motion", "Zero motion", "Half maximum", "Random motion"],
    correctIndex: 1,
    explanation: "Nodes are points of destructive interference where the string stays stationary."
  },
  {
    q: "A string's 2nd harmonic is 330 Hz. What's the fundamental frequency?",
    options: ["110 Hz", "165 Hz", "220 Hz", "660 Hz"],
    correctIndex: 1,
    explanation: "Fundamental = 2nd harmonic / 2 = 330 / 2 = 165 Hz."
  },
  {
    q: "What creates a standing wave on a fixed rope?",
    options: ["Two separate wave sources", "A wave interfering with its reflection", "Air resonance", "Natural vibration"],
    correctIndex: 1,
    explanation: "Standing waves form when a traveling wave reflects off a fixed end and interferes with itself."
  },
  {
    q: "To raise a string's pitch without changing its length, you should:",
    options: ["Loosen the string", "Tighten the string", "Use a thicker string", "It's impossible"],
    correctIndex: 1,
    explanation: "Increasing tension increases wave speed and therefore frequency (pitch)."
  },
  {
    q: "A standing wave has 4 nodes (including both ends). Which harmonic is this?",
    options: ["2nd harmonic", "3rd harmonic", "4th harmonic", "5th harmonic"],
    correctIndex: 1,
    explanation: "The nth harmonic has (n+1) nodes including the endpoints. 4 nodes means n = 3 (3rd harmonic)."
  },
  {
    q: "Why do different instruments playing the same note sound different?",
    options: ["Different volumes", "Different harmonic mixtures (timbre)", "Different wave speeds", "Room acoustics only"],
    correctIndex: 1,
    explanation: "Timbre comes from unique combinations of harmonics each instrument produces."
  },
  {
    q: "If you double the frequency while keeping wave speed constant, wavelength:",
    options: ["Doubles", "Halves", "Stays the same", "Quadruples"],
    correctIndex: 1,
    explanation: "From v = f*lambda, if v is constant and f doubles, lambda must halve."
  }
];

// ============================================================================
// TRANSFER APPLICATIONS
// ============================================================================
const APPLICATIONS = [
  {
    id: 'guitar',
    title: 'Guitar Strings',
    subtitle: 'The Physics of Music',
    description: 'When you pluck a guitar string, it vibrates at specific frequencies determined by length, tension, and mass. Pressing frets shortens the vibrating length, raising pitch.',
    formula: 'f = (1/2L)sqrt(T/mu)'
  },
  {
    id: 'laser',
    title: 'Laser Cavities',
    subtitle: 'Standing Light Waves',
    description: 'Lasers use mirrors to create standing light waves. Only wavelengths that form exact standing wave patterns are amplified, producing coherent, monochromatic light.',
    formula: 'L = n*lambda/2'
  },
  {
    id: 'quantum',
    title: 'Electron Orbitals',
    subtitle: 'Quantum Standing Waves',
    description: 'Electrons in atoms behave as standing waves around the nucleus. Only whole-number wavelengths fit the orbit, explaining why only certain energy levels are allowed.',
    formula: 'n*lambda = 2*pi*r'
  },
  {
    id: 'acoustics',
    title: 'Room Acoustics',
    subtitle: 'Architectural Resonance',
    description: 'Parallel walls create standing waves called "room modes." Acoustic engineers use diffusers and absorbers to minimize problematic resonances in concert halls.',
    formula: 'f = c/(2L)'
  }
];

// ============================================================================
// STANDING WAVES GAME CLASS
// ============================================================================
export class StandingWavesGame extends BaseGame {
  readonly gameType = 'standing_waves';
  readonly gameTitle = 'Standing Waves: The Physics of Music';

  private state: StandingWavesState;

  constructor(sessionId: string) {
    super(sessionId);
    this.state = this.getInitialState();
  }

  private getInitialState(): StandingWavesState {
    return {
      phase: 'hook',
      prediction: null,
      twistPrediction: null,

      harmonic: 1,
      tension: 50,
      time: 0,

      discoveredHarmonics: [1],

      activeApp: 0,
      completedApps: [],

      testIndex: 0,
      answers: new Array(10).fill(null),
      showResult: false
    };
  }

  handleInput(input: UserInput): void {
    if (input.type === 'button_click') {
      this.handleButtonClick(input.id);
    } else if (input.type === 'slider_change') {
      if (input.id === 'harmonic') {
        const h = Math.max(1, Math.min(6, input.value));
        this.state.harmonic = h;
        // Track discovered harmonics
        if (!this.state.discoveredHarmonics.includes(h)) {
          this.state.discoveredHarmonics.push(h);
          this.state.discoveredHarmonics.sort((a, b) => a - b);
        }
      } else if (input.id === 'tension') {
        this.state.tension = Math.max(10, Math.min(100, input.value));
      }
    }
  }

  private handleButtonClick(buttonId: string): void {
    // Phase navigation
    if (buttonId === 'start') {
      this.state.phase = 'predict';
    } else if (buttonId === 'next' || buttonId === 'continue') {
      this.advancePhase();
    } else if (buttonId === 'twist') {
      this.state.phase = 'twist_predict';
    } else if (buttonId === 'test-it') {
      this.state.phase = 'twist_play';
    } else if (buttonId === 'transfer') {
      this.state.phase = 'transfer';
    } else if (buttonId === 'take-quiz') {
      this.state.phase = 'test';
    } else if (buttonId === 'complete') {
      this.state.phase = 'mastery';
    } else if (buttonId === 'replay') {
      this.state = this.getInitialState();
    } else if (buttonId === 'explore') {
      this.state.phase = 'play';
    }
    // Prediction options
    else if (buttonId.startsWith('predict-')) {
      this.state.prediction = buttonId.replace('predict-', '');
    } else if (buttonId.startsWith('twist-predict-')) {
      this.state.twistPrediction = buttonId.replace('twist-predict-', '');
    }
    // Transfer apps
    else if (buttonId.startsWith('tab-')) {
      this.state.activeApp = parseInt(buttonId.replace('tab-', ''));
    } else if (buttonId === 'mark-read') {
      if (!this.state.completedApps.includes(this.state.activeApp)) {
        this.state.completedApps.push(this.state.activeApp);
        // Auto-advance to next app
        if (this.state.activeApp < APPLICATIONS.length - 1) {
          this.state.activeApp = this.state.activeApp + 1;
        }
      }
    }
    // Test navigation
    else if (buttonId === 'prev') {
      this.state.testIndex = Math.max(0, this.state.testIndex - 1);
    } else if (buttonId === 'see-results') {
      this.state.showResult = true;
    } else if (buttonId.startsWith('answer-')) {
      const answerIndex = parseInt(buttonId.replace('answer-', ''));
      this.state.answers[this.state.testIndex] = answerIndex;
    }
  }

  private advancePhase(): void {
    const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
    const currentIndex = phaseOrder.indexOf(this.state.phase);
    if (currentIndex < phaseOrder.length - 1) {
      this.state.phase = phaseOrder[currentIndex + 1];
    }
  }

  getCurrentPhase(): string {
    return this.state.phase;
  }

  update(deltaTime: number): void {
    // Animate the wave
    const speedFactor = 1.5 + this.state.tension / 100;
    this.state.time += (deltaTime / 1000) * speedFactor;
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

    return r.toFrame(Math.floor(this.state.time * 60));
  }

  private renderHook(r: CommandRenderer): void {
    r.text(400, 60, 'Standing Waves', { fill: '#ffffff', fontSize: 36, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 100, 'Why do guitar strings only produce certain musical notes?', {
      fill: '#f59e0b', fontSize: 18, textAnchor: 'middle'
    });
    r.text(400, 130, 'Discover harmonics, nodes, and the physics of music', {
      fill: '#64748b', fontSize: 14, textAnchor: 'middle'
    });

    // Animated standing wave icon
    this.renderWaveIcon(r, 400, 220, 100, this.state.time);

    // Feature cards
    const features = [
      { icon: 'music', label: 'Harmonics' },
      { icon: 'science', label: 'Physics' },
      { icon: 'guitar', label: 'Music' }
    ];

    features.forEach((f, i) => {
      const x = 250 + i * 150;
      r.rect(x - 50, 310, 100, 70, { fill: '#1e293b', rx: 12, stroke: '#334155', strokeWidth: 1 });
      r.text(x, 340, f.icon === 'music' ? 'Note' : f.icon === 'science' ? 'Lab' : 'Guitar', {
        fill: '#f59e0b', fontSize: 20, textAnchor: 'middle'
      });
      r.text(x, 365, f.label, { fill: '#64748b', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });
    });

    r.addButton({ id: 'start', label: 'Start Learning', variant: 'primary' });
    r.text(400, 450, '~5 minutes - Interactive simulation', { fill: '#475569', fontSize: 11, textAnchor: 'middle' });
  }

  private renderWaveIcon(r: CommandRenderer, cx: number, cy: number, width: number, time: number): void {
    // Simple animated standing wave
    const n = 2;
    const amp = 30;
    const omega = 4;

    // Draw wave path
    let pathData = '';
    for (let i = 0; i <= 40; i++) {
      const x = cx - width / 2 + (i / 40) * width;
      const relX = i / 40;
      const envelope = Math.sin(Math.PI * n * relX);
      const y = cy + amp * envelope * Math.sin(omega * time);
      pathData += (i === 0 ? 'M' : 'L') + ` ${x},${y}`;
    }

    r.path(pathData, { stroke: '#f59e0b', strokeWidth: 3, fill: 'none' });

    // Fixed endpoints
    r.circle(cx - width / 2, cy, 5, { fill: '#fbbf24' });
    r.circle(cx + width / 2, cy, 5, { fill: '#fbbf24' });

    // Center node
    r.circle(cx, cy, 4, { fill: '#10b981' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(400, 40, 'Predict', { fill: '#f59e0b', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 70, 'What happens when you increase frequency?', {
      fill: '#ffffff', fontSize: 26, textAnchor: 'middle', fontWeight: 'bold'
    });
    r.text(400, 105, 'Imagine a guitar string fixed at both ends.', {
      fill: '#94a3b8', fontSize: 14, textAnchor: 'middle'
    });
    r.text(400, 125, 'You start shaking it slowly, then faster and faster.', {
      fill: '#94a3b8', fontSize: 14, textAnchor: 'middle'
    });

    const options = [
      { id: 'same', text: 'The same single loop, just faster' },
      { id: 'more', text: 'More loops appear at specific frequencies' },
      { id: 'random', text: 'Completely random patterns' },
      { id: 'disappear', text: 'The wave disappears completely' }
    ];

    options.forEach((opt, i) => {
      const y = 170 + i * 55;
      const isSelected = this.state.prediction === opt.id;
      r.rect(150, y, 500, 45, {
        fill: isSelected ? '#f59e0b15' : '#1e293b',
        rx: 10,
        stroke: isSelected ? '#f59e0b' : '#334155',
        strokeWidth: 2
      });
      r.text(400, y + 28, opt.text, {
        fill: isSelected ? '#ffffff' : '#94a3b8', fontSize: 14, textAnchor: 'middle'
      });
      r.addButton({
        id: `predict-${opt.id}`,
        label: '',
        variant: 'secondary'
      });
    });

    if (this.state.prediction) {
      r.addButton({
        id: 'next',
        label: "Let's Find Out",
        variant: 'primary'
      });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    // PROTECTED: Server calculates frequency based on harmonic and tension
    const baseFrequency = PHYSICS.getBaseFrequency(this.state.tension);
    const frequency = PHYSICS.calculateHarmonicFrequency(baseFrequency, this.state.harmonic);
    const numNodes = PHYSICS.calculateNodes(this.state.harmonic);
    const numAntinodes = PHYSICS.calculateAntinodes(this.state.harmonic);

    // Render standing wave visualization
    this.renderStandingWave(r, this.state.harmonic, this.state.time, frequency, numNodes, numAntinodes);

    // Controls section
    r.rect(50, 320, 700, 130, { fill: '#0f172a', rx: 12 });

    // Harmonic slider
    r.text(100, 345, 'Harmonic Mode', { fill: '#94a3b8', fontSize: 12, textAnchor: 'start', fontWeight: 'bold' });
    r.text(700, 345, `n = ${this.state.harmonic}`, { fill: '#f59e0b', fontSize: 12, textAnchor: 'end', fontWeight: 'bold' });
    r.addSlider({ id: 'harmonic', label: 'Harmonic', min: 1, max: 6, step: 1, value: this.state.harmonic });

    // Discovered harmonics indicator
    r.text(100, 390, 'Discovered:', { fill: '#64748b', fontSize: 11, textAnchor: 'start' });
    for (let h = 1; h <= 6; h++) {
      const x = 180 + (h - 1) * 40;
      const isDiscovered = this.state.discoveredHarmonics.includes(h);
      const isActive = h === this.state.harmonic;
      r.rect(x - 15, 377, 30, 25, {
        fill: isDiscovered ? '#10b981' : '#1e293b',
        rx: 6,
        stroke: isActive ? '#f59e0b' : 'none',
        strokeWidth: isActive ? 2 : 0
      });
      r.text(x, 394, String(h), {
        fill: isDiscovered ? '#ffffff' : '#475569', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold'
      });
    }

    // Continue button
    const discoveredCount = this.state.discoveredHarmonics.length;
    if (discoveredCount >= 3) {
      r.addButton({ id: 'continue', label: 'Continue', variant: 'primary' });
    } else {
      r.text(600, 390, `Discover ${3 - discoveredCount} more`, { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });
    }
  }

  private renderStandingWave(r: CommandRenderer, n: number, time: number, frequency: number, nodes: number, antinodes: number): void {
    const stringLength = 500;
    const stringY = 180;
    const startX = 150;
    const amp = 60 * (1 - n * 0.05);
    const omega = n * 0.05 * (80 + 50 * 3.2); // Simplified omega calculation

    // Background
    r.rect(100, 80, 600, 220, { fill: '#05060a', rx: 12 });

    // Grid lines
    for (let i = 0; i < 5; i++) {
      r.line(150, 100 + i * 40, 650, 100 + i * 40, { stroke: '#1e293b', strokeWidth: 1 });
    }

    // Equilibrium line
    r.line(startX, stringY, startX + stringLength, stringY, { stroke: '#334155', strokeWidth: 1, strokeDasharray: '4,4' });

    // Fixed end supports
    r.rect(startX - 20, stringY - 30, 20, 60, { fill: '#1e293b', rx: 4 });
    r.rect(startX + stringLength, stringY - 30, 20, 60, { fill: '#1e293b', rx: 4 });

    // Draw vibrating string
    let pathData = '';
    for (let i = 0; i <= 100; i++) {
      const x = startX + (i / 100) * stringLength;
      const relX = i / 100;
      const envelope = Math.sin(Math.PI * n * relX);
      const y = stringY + amp * envelope * Math.sin(omega * time);
      pathData += (i === 0 ? 'M' : 'L') + ` ${x},${y}`;
    }
    r.path(pathData, { stroke: '#f59e0b', strokeWidth: 4, fill: 'none' });

    // Draw nodes (stationary points)
    for (let i = 0; i <= n; i++) {
      const x = startX + (i / n) * stringLength;
      r.circle(x, stringY, 8, { fill: '#ef4444' });
      r.circle(x, stringY, 3, { fill: '#fecaca' });
    }

    // Draw antinodes (maximum amplitude points)
    for (let i = 0; i < n; i++) {
      const x = startX + ((i + 0.5) / n) * stringLength;
      r.line(x, stringY - amp - 10, x, stringY + amp + 10, { stroke: '#10b981', strokeWidth: 1, strokeDasharray: '3,3' });
      r.circle(x, stringY, 6, { fill: '#10b981' });
    }

    // Info panel
    r.rect(540, 90, 150, 80, { fill: '#0f172a', rx: 8, stroke: '#1e293b', strokeWidth: 1 });
    r.text(550, 110, `HARMONIC #${n}`, { fill: '#64748b', fontSize: 9, textAnchor: 'start', fontWeight: 'bold' });
    r.text(550, 135, `${Math.round(frequency)} Hz`, { fill: '#f59e0b', fontSize: 20, textAnchor: 'start', fontWeight: 'bold' });
    r.text(550, 155, `${nodes} nodes - ${antinodes} antinodes`, { fill: '#64748b', fontSize: 9, textAnchor: 'start' });
  }

  private renderReview(r: CommandRenderer): void {
    r.text(400, 40, 'Understanding', { fill: '#10b981', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 70, 'The Physics of Standing Waves', { fill: '#ffffff', fontSize: 26, textAnchor: 'middle', fontWeight: 'bold' });

    // Concept cards
    const concepts = [
      { icon: '~', title: 'Standing Waves', desc: 'Form when a wave reflects and interferes with itself' },
      { icon: 'o', title: 'Nodes', desc: 'Points of zero motion (destructive interference)' },
      { icon: '*', title: 'Antinodes', desc: 'Points of maximum amplitude (constructive interference)' },
      { icon: '#', title: 'Harmonics', desc: 'Integer multiples of the fundamental frequency' }
    ];

    concepts.forEach((c, i) => {
      const x = 200 + (i % 2) * 210;
      const y = 110 + Math.floor(i / 2) * 90;
      r.rect(x - 90, y, 180, 75, { fill: '#1e293b', rx: 10, stroke: '#334155', strokeWidth: 1 });
      r.text(x, y + 25, c.title, { fill: '#ffffff', fontSize: 13, textAnchor: 'middle', fontWeight: 'bold' });
      r.text(x, y + 50, c.desc.substring(0, 35) + '...', { fill: '#64748b', fontSize: 9, textAnchor: 'middle' });
    });

    // Formula box
    r.rect(150, 300, 500, 80, { fill: '#f59e0b15', rx: 12, stroke: '#f59e0b30', strokeWidth: 1 });
    r.text(400, 320, 'KEY FORMULA', { fill: '#f59e0b', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 350, 'f_n = n x f_1 = (n/2L)sqrt(T/mu)', { fill: '#ffffff', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 375, 'Frequency depends on harmonic number, length, tension, and mass density', {
      fill: '#94a3b8', fontSize: 11, textAnchor: 'middle'
    });

    r.addButton({ id: 'twist', label: 'Continue', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(400, 40, 'New Variable', { fill: '#8b5cf6', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 70, 'What happens when you increase string tension?', {
      fill: '#ffffff', fontSize: 24, textAnchor: 'middle', fontWeight: 'bold'
    });
    r.text(400, 105, 'Think about tuning a guitar - what happens when you tighten the tuning peg?', {
      fill: '#94a3b8', fontSize: 14, textAnchor: 'middle'
    });

    const options = [
      { id: 'nothing', text: "Nothing changes - frequency stays the same" },
      { id: 'higher', text: 'All frequencies increase proportionally' },
      { id: 'lower', text: 'All frequencies decrease' },
      { id: 'random', text: 'Changes unpredictably' }
    ];

    options.forEach((opt, i) => {
      const y = 150 + i * 55;
      const isSelected = this.state.twistPrediction === opt.id;
      r.rect(150, y, 500, 45, {
        fill: isSelected ? '#8b5cf615' : '#1e293b',
        rx: 10,
        stroke: isSelected ? '#8b5cf6' : '#334155',
        strokeWidth: 2
      });
      r.text(400, y + 28, opt.text, {
        fill: isSelected ? '#ffffff' : '#94a3b8', fontSize: 14, textAnchor: 'middle'
      });
      r.addButton({
        id: `twist-predict-${opt.id}`,
        label: '',
        variant: 'secondary'
      });
    });

    if (this.state.twistPrediction) {
      r.addButton({
        id: 'test-it',
        label: 'Test It',
        variant: 'primary'
      });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    // PROTECTED: Server calculates frequency with tension
    const baseFrequency = PHYSICS.getBaseFrequency(this.state.tension);
    const frequency = PHYSICS.calculateHarmonicFrequency(baseFrequency, this.state.harmonic);
    const numNodes = PHYSICS.calculateNodes(this.state.harmonic);
    const numAntinodes = PHYSICS.calculateAntinodes(this.state.harmonic);

    // Render standing wave
    this.renderStandingWave(r, this.state.harmonic, this.state.time, frequency, numNodes, numAntinodes);

    // Controls section
    r.rect(50, 320, 700, 150, { fill: '#0f172a', rx: 12 });

    // Tension slider
    r.text(100, 345, 'String Tension', { fill: '#94a3b8', fontSize: 12, textAnchor: 'start', fontWeight: 'bold' });
    r.text(700, 345, `${this.state.tension}%`, { fill: '#8b5cf6', fontSize: 12, textAnchor: 'end', fontWeight: 'bold' });
    r.addSlider({ id: 'tension', label: 'Tension', min: 10, max: 100, step: 5, value: this.state.tension });

    // Harmonic slider
    r.text(100, 390, 'Harmonic', { fill: '#94a3b8', fontSize: 12, textAnchor: 'start', fontWeight: 'bold' });
    r.text(700, 390, `n = ${this.state.harmonic}`, { fill: '#f59e0b', fontSize: 12, textAnchor: 'end', fontWeight: 'bold' });
    r.addSlider({ id: 'harmonic', label: 'Harmonic', min: 1, max: 6, step: 1, value: this.state.harmonic });

    // Frequency display
    r.rect(200, 420, 150, 40, { fill: '#1e293b', rx: 8 });
    r.text(220, 445, 'Frequency:', { fill: '#64748b', fontSize: 11, textAnchor: 'start' });
    r.text(340, 445, `${Math.round(frequency)} Hz`, { fill: '#f59e0b', fontSize: 14, textAnchor: 'end', fontWeight: 'bold' });

    r.addButton({
      id: 'continue',
      label: 'Continue',
      variant: 'primary'
    });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(400, 40, 'Deep Insight', { fill: '#10b981', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 70, "You've Mastered the Variables!", { fill: '#ffffff', fontSize: 26, textAnchor: 'middle', fontWeight: 'bold' });

    r.rect(150, 110, 500, 180, { fill: '#1e293b', rx: 12, stroke: '#334155', strokeWidth: 1 });
    r.text(400, 140, 'Standing wave frequency depends on four key variables:', {
      fill: '#94a3b8', fontSize: 13, textAnchor: 'middle'
    });

    const variables = [
      { name: 'Harmonic number (n)', desc: 'Integer multiples of fundamental', color: '#f59e0b' },
      { name: 'Tension (T)', desc: 'Higher tension = higher frequency', color: '#8b5cf6' },
      { name: 'Length (L)', desc: 'Shorter string = higher frequency', color: '#10b981' },
      { name: 'Mass density (mu)', desc: 'Lighter string = higher frequency', color: '#ec4899' }
    ];

    variables.forEach((v, i) => {
      const y = 170 + i * 28;
      r.text(200, y, v.name, { fill: v.color, fontSize: 12, textAnchor: 'start', fontWeight: 'bold' });
      r.text(400, y, '-', { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });
      r.text(600, y, v.desc, { fill: '#ffffff', fontSize: 11, textAnchor: 'end' });
    });

    r.addButton({
      id: 'transfer',
      label: 'See Real Applications',
      variant: 'primary'
    });
  }

  private renderTransfer(r: CommandRenderer): void {
    const app = APPLICATIONS[this.state.activeApp];
    const allCompleted = this.state.completedApps.length >= APPLICATIONS.length;

    // Progress header
    r.text(400, 30, `Application ${this.state.activeApp + 1} of ${APPLICATIONS.length}`, {
      fill: '#64748b', fontSize: 12, textAnchor: 'middle'
    });

    // Progress dots
    APPLICATIONS.forEach((_, i) => {
      const x = 320 + i * 40;
      const isCompleted = this.state.completedApps.includes(i);
      const isActive = i === this.state.activeApp;
      r.circle(x, 50, 6, { fill: isCompleted ? '#10b981' : isActive ? '#f59e0b' : '#334155' });
    });

    r.text(520, 55, `(${this.state.completedApps.length}/${APPLICATIONS.length} read)`, {
      fill: '#475569', fontSize: 10, textAnchor: 'start'
    });

    // Tab buttons
    APPLICATIONS.forEach((a, i) => {
      const x = 100 + i * 150;
      const isCompleted = this.state.completedApps.includes(i);
      const isActive = i === this.state.activeApp;
      r.rect(x, 70, 140, 30, {
        fill: isActive ? '#1e293b' : isCompleted ? '#10b98120' : '#0f172a',
        rx: 8,
        stroke: isActive ? '#334155' : isCompleted ? '#10b981' : 'none',
        strokeWidth: 1
      });
      r.text(x + 70, 90, (isCompleted && !isActive ? '+ ' : '') + a.title.substring(0, 10), {
        fill: isActive ? '#ffffff' : isCompleted ? '#10b981' : '#475569',
        fontSize: 10, textAnchor: 'middle', fontWeight: isActive ? 'bold' : 'normal'
      });
      if (isCompleted || i === this.state.activeApp) {
        r.addButton({
          id: `tab-${i}`,
          label: '',
          variant: 'secondary'
        });
      }
    });

    // Application content
    r.rect(100, 120, 600, 200, { fill: '#0f172a', rx: 12, stroke: '#1e293b', strokeWidth: 1 });

    r.text(400, 150, app.title, { fill: '#ffffff', fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 175, app.subtitle, { fill: '#f59e0b', fontSize: 12, textAnchor: 'middle' });

    // Description (wrapped)
    const descLines = this.wrapText(app.description, 70);
    descLines.forEach((line, i) => {
      r.text(400, 205 + i * 18, line, { fill: '#94a3b8', fontSize: 12, textAnchor: 'middle' });
    });

    // Formula
    r.rect(250, 270, 300, 40, { fill: '#f59e0b15', rx: 8, stroke: '#f59e0b30', strokeWidth: 1 });
    r.text(400, 295, app.formula, { fill: '#ffffff', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });

    // Mark as read button
    if (!this.state.completedApps.includes(this.state.activeApp)) {
      r.addButton({
        id: 'mark-read',
        label: `Mark "${app.title}" as Read`,
        variant: 'secondary'
      });
    } else {
      r.rect(200, 340, 400, 40, { fill: '#10b98120', rx: 10, stroke: '#10b98130', strokeWidth: 1 });
      r.text(400, 365, 'Completed', { fill: '#10b981', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });
    }

    // Bottom navigation
    if (allCompleted) {
      r.text(400, 420, `All ${APPLICATIONS.length} applications read!`, {
        fill: '#10b981', fontSize: 13, textAnchor: 'middle', fontWeight: 'bold'
      });
      r.addButton({
        id: 'take-quiz',
        label: 'Take the Quiz',
        variant: 'primary'
      });
    } else {
      r.text(400, 420, `Read all ${APPLICATIONS.length} applications to unlock the quiz (${this.state.completedApps.length}/${APPLICATIONS.length} completed)`, {
        fill: '#475569', fontSize: 11, textAnchor: 'middle'
      });
    }
  }

  private wrapText(text: string, maxLength: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxLength) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  private renderTest(r: CommandRenderer): void {
    if (this.state.showResult) {
      // Calculate score - PROTECTED: Server calculates
      let score = 0;
      TEST_QUESTIONS.forEach((q, i) => {
        if (this.state.answers[i] === q.correctIndex) {
          score++;
        }
      });

      r.text(400, 100, score >= 8 ? 'Trophy' : score >= 6 ? 'Star' : 'Book', {
        fill: '#f59e0b', fontSize: 48, textAnchor: 'middle'
      });
      r.text(400, 170, `${score}/10 Correct`, { fill: '#ffffff', fontSize: 32, textAnchor: 'middle', fontWeight: 'bold' });
      r.text(400, 210,
        score >= 8 ? "Excellent! You've truly mastered standing waves!" :
        score >= 6 ? "Good job! Review the concepts you missed." :
        "Keep practicing! Review the material and try again.",
        { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' }
      );

      r.addButton({
        id: 'complete',
        label: 'Complete Lesson',
        variant: 'primary'
      });
      return;
    }

    const q = TEST_QUESTIONS[this.state.testIndex];
    const answered = this.state.answers[this.state.testIndex] !== null;

    // Progress header
    r.text(200, 40, `Question ${this.state.testIndex + 1} of 10`, {
      fill: '#64748b', fontSize: 12, textAnchor: 'start', fontWeight: 'bold'
    });

    // Progress dots
    for (let i = 0; i < 10; i++) {
      const x = 450 + i * 20;
      const ans = this.state.answers[i];
      let color = '#334155';
      if (ans !== null) {
        color = ans === TEST_QUESTIONS[i].correctIndex ? '#10b981' : '#ef4444';
      } else if (i === this.state.testIndex) {
        color = '#f59e0b';
      }
      r.circle(x, 35, 5, { fill: color });
    }

    // Question
    r.text(400, 90, q.q, { fill: '#ffffff', fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });

    // Options
    q.options.forEach((opt, i) => {
      const y = 130 + i * 55;
      const isSelected = this.state.answers[this.state.testIndex] === i;
      const isCorrect = i === q.correctIndex;

      let fill = '#1e293b';
      let stroke = '#334155';

      if (answered) {
        if (isCorrect) {
          fill = '#10b98120';
          stroke = '#10b981';
        } else if (isSelected) {
          fill = '#ef444420';
          stroke = '#ef4444';
        }
      } else if (isSelected) {
        fill = '#f59e0b20';
        stroke = '#f59e0b';
      }

      r.rect(150, y, 500, 45, { fill, rx: 10, stroke, strokeWidth: 2 });
      r.text(400, y + 28, opt, { fill: '#ffffff', fontSize: 13, textAnchor: 'middle' });

      if (!answered) {
        r.addButton({
          id: `answer-${i}`,
          label: '',
          variant: 'secondary'
        });
      }
    });

    // Explanation (if answered)
    if (answered) {
      const isCorrect = this.state.answers[this.state.testIndex] === q.correctIndex;
      r.rect(150, 360, 500, 50, {
        fill: isCorrect ? '#10b98120' : '#ef444420',
        rx: 10,
        stroke: isCorrect ? '#10b98130' : '#ef444430',
        strokeWidth: 1
      });
      r.text(180, 385, isCorrect ? 'Correct!' : 'Not quite.', {
        fill: isCorrect ? '#10b981' : '#ef4444', fontSize: 12, textAnchor: 'start', fontWeight: 'bold'
      });
      r.text(400, 395, q.explanation.substring(0, 70) + '...', {
        fill: '#ffffff', fontSize: 10, textAnchor: 'middle'
      });
    }

    // Navigation
    if (this.state.testIndex > 0) {
      r.addButton({
        id: 'prev',
        label: 'Previous',
        variant: 'secondary'
      });
    }

    if (answered) {
      if (this.state.testIndex < 9) {
        r.addButton({
          id: 'next',
          label: 'Next Question',
          variant: 'primary'
        });
      } else {
        r.addButton({
          id: 'see-results',
          label: 'See Results',
          variant: 'primary'
        });
      }
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Calculate final score - PROTECTED
    let score = 0;
    TEST_QUESTIONS.forEach((q, i) => {
      if (this.state.answers[i] === q.correctIndex) {
        score++;
      }
    });

    r.circle(400, 100, 50, { fill: '#10b981', stroke: '#f59e0b', strokeWidth: 4 });
    r.text(400, 110, 'Grad', { fill: '#ffffff', fontSize: 32, textAnchor: 'middle' });

    r.text(400, 180, 'Congratulations!', { fill: '#ffffff', fontSize: 32, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(400, 215, "You've mastered Standing Waves!", { fill: '#94a3b8', fontSize: 14, textAnchor: 'middle' });
    r.text(400, 235, 'You now understand the physics behind every musical instrument.', {
      fill: '#94a3b8', fontSize: 14, textAnchor: 'middle'
    });

    // Score display
    r.rect(300, 260, 200, 60, { fill: '#1e293b', rx: 12, stroke: '#334155', strokeWidth: 1 });
    r.text(400, 280, 'Quiz Score', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });
    r.text(400, 310, `${score}/10`, {
      fill: score >= 8 ? '#10b981' : '#f59e0b', fontSize: 28, textAnchor: 'middle', fontWeight: 'bold'
    });

    // Topics learned
    r.rect(150, 340, 500, 80, { fill: '#10b98120', rx: 12, stroke: '#10b98130', strokeWidth: 1 });
    r.text(400, 360, 'WHAT YOU LEARNED', { fill: '#10b981', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });

    const topics = ['Harmonics', 'Nodes', 'Antinodes', 'Tension', 'Frequency', 'Music Physics'];
    topics.forEach((t, i) => {
      const x = 180 + (i % 3) * 140;
      const y = 385 + Math.floor(i / 3) * 25;
      r.rect(x - 50, y - 12, 100, 22, { fill: '#1e293b', rx: 11 });
      r.text(x, y + 2, t, { fill: '#ffffff', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });
    });

    r.addButton({
      id: 'replay',
      label: 'Replay Lesson',
      variant: 'secondary'
    });

    r.addButton({
      id: 'explore',
      label: 'Free Exploration',
      variant: 'primary'
    });
  }

  getState(): StandingWavesState {
    return { ...this.state };
  }

  restoreState(state: StandingWavesState): void {
    this.state = { ...state };
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================
export function createStandingWavesGame(sessionId: string): StandingWavesGame {
  return new StandingWavesGame(sessionId);
}
