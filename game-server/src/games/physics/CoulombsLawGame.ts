/**
 * Coulomb's Law Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * What an attacker sees: circles at coordinates, lines, text
 * What they DON'T see: Coulomb's law calculations, force formulas, scoring
 *
 * PROTECTED IP:
 * - Coulomb's constant: k = 8.99 x 10^9 N*m^2/C^2
 * - Force formula: F = k * q1 * q2 / r^2
 * - Superposition principle for multiple charges
 * - Electric field calculations
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

// === PROTECTED PHYSICS CONSTANTS (never sent to client) ===
const COULOMB_CONSTANT = 8.99e9; // N*m^2/C^2 - Coulomb's constant k

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

interface Charge {
  id: number;
  x: number;
  y: number;
  q: number; // charge in microcoulombs
}

interface TestQuestion {
  scenario: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

// === PREMIUM COLOR PALETTE ===
const colors = {
  primary: '#06b6d4',
  primaryDark: '#0891b2',
  accent: '#a855f7',
  accentDark: '#9333ea',
  positive: '#ef4444',  // Red for positive charges
  negative: '#3b82f6',  // Blue for negative charges
  force: '#22c55e',     // Green for force vectors
  warning: '#f59e0b',
  success: '#10b981',
  danger: '#ef4444',
  bgDark: '#020617',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
};

// === TEST QUESTIONS (PROTECTED IP - never sent to client) ===
const testQuestions: TestQuestion[] = [
  {
    scenario: 'A physics student places two identical metal spheres, each with +3 uC charge, 10 cm apart on an insulating surface.',
    question: 'What happens when the student releases the spheres?',
    options: [
      'They move toward each other',
      'They move away from each other',
      'They remain stationary',
      'They orbit around each other',
    ],
    correctIndex: 1,
    explanation: 'Like charges repel. Both spheres have positive charge, so they experience a repulsive force pushing them apart.',
  },
  {
    scenario: 'An engineer doubles the distance between two charged particles from 1m to 2m while keeping the charges constant.',
    question: 'How does the electrostatic force change?',
    options: [
      'It doubles',
      'It halves',
      'It becomes one-fourth as strong',
      'It quadruples',
    ],
    correctIndex: 2,
    explanation: 'Coulomb\'s Law has an inverse-square relationship with distance: F is proportional to 1/r^2. When distance doubles (2x), force becomes (1/2)^2 = 1/4 of the original.',
  },
  {
    scenario: 'A charged balloon sticks to a neutral wall. The balloon has a negative charge of -2 uC.',
    question: 'How can a charged object attract a neutral object?',
    options: [
      'The wall becomes permanently charged',
      'Gravity assists the attraction',
      'The balloon induces polarization in the wall surface',
      'Neutral objects are always attracted to charges',
    ],
    correctIndex: 2,
    explanation: 'The negative balloon repels electrons in the wall\'s surface, leaving positive charges closer to the balloon. Since Coulomb force is stronger at shorter distances, the attraction to nearby positive charges exceeds the repulsion from farther negative charges. This is called polarization or induction.',
  },
  {
    scenario: 'In a hydrogen atom, the electron (q = -1.6x10^-19 C) orbits the proton (q = +1.6x10^-19 C) at approximately 5.3x10^-11 m.',
    question: 'What is the approximate Coulomb force between them?',
    options: [
      'About 8.2 x 10^-8 N',
      'About 8.2 x 10^-15 N',
      'About 9.0 x 10^9 N',
      'About 1.6 x 10^-19 N',
    ],
    correctIndex: 0,
    explanation: 'F = kq1q2/r^2 = (8.99x10^9)(1.6x10^-19)^2/(5.3x10^-11)^2 = 8.2x10^-8 N. This seems tiny, but for the electron\'s mass (~10^-30 kg), this produces enormous acceleration!',
  },
  {
    scenario: 'A technician compares two setups: Setup A has charges +4uC and -2uC at 5cm apart. Setup B has charges +2uC and -1uC at 5cm apart.',
    question: 'How do the forces in Setup A and Setup B compare?',
    options: [
      'Force A = Force B',
      'Force A = 2 x Force B',
      'Force A = 4 x Force B',
      'Force A = 8 x Force B',
    ],
    correctIndex: 2,
    explanation: 'Force is proportional to q1*q2. Setup A: |4x(-2)| = 8 uC^2. Setup B: |2x(-1)| = 2 uC^2. The ratio is 8/2 = 4, so Force A is 4 times greater than Force B.',
  },
  {
    scenario: 'Three charges are placed in a line: +Q at x=0, +Q at x=d, and a test charge +q at x=d/2.',
    question: 'What is the net force on the test charge?',
    options: [
      'Net force points left',
      'Net force points right',
      'Net force is zero',
      'Net force points up',
    ],
    correctIndex: 2,
    explanation: 'By symmetry, the test charge +q is equidistant from both +Q charges. Each +Q exerts an equal-magnitude repulsive force on +q, but in opposite directions (left and right). The forces cancel, resulting in zero net force - but this is unstable equilibrium!',
  },
  {
    scenario: 'A lightning rod has a sharp pointed tip rather than a rounded end.',
    question: 'Why does the sharp point help with lightning protection?',
    options: [
      'Sharp points are cheaper to manufacture',
      'Points create stronger electric fields that ionize air more easily',
      'Points attract lightning directly by being taller',
      'The shape doesn\'t matter, only the material',
    ],
    correctIndex: 1,
    explanation: 'Charge concentrates at sharp points, creating intense local electric fields. This ionizes air molecules, creating a conductive path that allows gradual charge dissipation through corona discharge.',
  },
  {
    scenario: 'In a Van de Graaff generator, a rubber belt carries positive charges from the base to a metal dome.',
    question: 'Why do the charges spread over the dome\'s outer surface?',
    options: [
      'The charges are attracted to the air outside',
      'Gravity pulls them to the bottom',
      'Like charges repel, maximizing distance by spreading to the surface',
      'Metal conducts charges to the outside automatically',
    ],
    correctIndex: 2,
    explanation: 'Like charges repel each other. In a conductor, charges can move freely and arrange themselves to minimize potential energy. This happens when they spread as far apart as possible - on the outer surface of the conductor.',
  },
  {
    scenario: 'An inkjet printer uses charged ink droplets that pass between deflection plates with voltages of +/-1500V.',
    question: 'How does this system direct ink to the correct position on paper?',
    options: [
      'Magnetic fields guide the droplets',
      'The electric field between plates exerts Coulomb force on charged droplets',
      'Air pressure pushes the droplets',
      'Gravity curves the droplet paths',
    ],
    correctIndex: 1,
    explanation: 'Charged droplets experience Coulomb force F = qE in the electric field between the plates. The field E = V/d creates a force perpendicular to the droplet\'s motion, deflecting it precisely.',
  },
  {
    scenario: 'Electrostatic precipitators in power plants use high-voltage wires (-50,000V) to charge smoke particles, which then stick to grounded collection plates.',
    question: 'Why do the charged particles move toward the grounded plates?',
    options: [
      'The particles become magnetic when charged',
      'Wind blows them toward the plates',
      'Negatively charged particles are attracted to the relatively positive plates',
      'The particles become heavier when charged',
    ],
    correctIndex: 2,
    explanation: 'The corona discharge gives smoke particles a negative charge. The grounded plates (at 0V potential) are more positive than the -50,000V wires, creating an electric field that pulls negatively charged particles toward the plates.',
  },
];

// === TRANSFER APPLICATIONS (protected content) ===
interface TransferApp {
  icon: string;
  title: string;
  short: string;
  tagline: string;
  description: string;
  connection: string;
  howItWorks: string;
  stats: string[];
  examples: string[];
  companies: string[];
  futureImpact: string;
}

const transferApps: TransferApp[] = [
  {
    icon: '(factory)',
    title: 'Electrostatic Precipitators',
    short: 'Clean Air',
    tagline: 'Capturing particles with electric fields',
    description: 'Coulomb\'s Law enables the removal of 99%+ of particulate matter from industrial exhaust, preventing air pollution.',
    connection: 'Charged particles experience Coulomb force in electric fields, moving toward collection plates where they accumulate.',
    howItWorks: 'High-voltage corona wires ionize air molecules, which transfer charge to passing particles. The charged particles then migrate to grounded collection plates.',
    stats: ['Remove 99.9% of particles', 'Handle temps up to 450C', 'Process millions of m^3/hour', 'Capture particles down to 0.01 um'],
    examples: ['Coal power plant fly ash', 'Cement kiln dust collection', 'Steel mill emission control', 'Paper mill recovery boilers'],
    companies: ['GE Power', 'Babcock & Wilcox', 'Mitsubishi Power', 'Siemens'],
    futureImpact: 'Next-generation precipitators with pulsed power systems will achieve even higher efficiency while reducing energy consumption.',
  },
  {
    icon: '(printer)',
    title: 'Xerography & Laser Printing',
    short: 'Printing',
    tagline: 'Printing with charged particles',
    description: 'Every laser printer and photocopier uses Coulomb\'s Law to precisely place toner particles and create sharp images.',
    connection: 'Toner particles with specific charges are attracted or repelled by charged regions on a photoconductor drum.',
    howItWorks: 'A laser discharges specific areas on a charged photoconductor drum. Oppositely charged toner particles stick only to the remaining charged areas.',
    stats: ['Resolution up to 4800 DPI', 'Toner particles ~5-10 um', 'Drum voltage ~1000V', 'Millions of pages per drum'],
    examples: ['Office laser printers', 'High-speed commercial printing', 'Photocopiers', 'Digital press systems'],
    companies: ['Xerox', 'HP', 'Canon', 'Ricoh'],
    futureImpact: 'Electrostatic printing is enabling 3D printing of complex materials with charged particle deposition.',
  },
  {
    icon: '(paint)',
    title: 'Electrostatic Coating',
    short: 'Coating',
    tagline: 'Coulomb force for perfect finishes',
    description: 'Electrostatic spray systems use charge attraction to achieve 95%+ transfer efficiency, reducing waste and creating uniform coatings.',
    connection: 'Charged paint particles are attracted to grounded objects by Coulomb force, wrapping around edges and reaching recessed areas.',
    howItWorks: 'Paint particles are charged at 60-100 kV as they leave the spray gun. The grounded workpiece attracts the charged particles uniformly.',
    stats: ['95% transfer efficiency (vs 30% conventional)', 'Coating thickness: 25-75 um', 'Reduces overspray by 90%', 'VOC reduction up to 80%'],
    examples: ['Automotive body painting', 'Appliance powder coating', 'Furniture finishing', 'Aerospace component coating'],
    companies: ['Graco', 'Nordson', 'Wagner', 'SAMES KREMLIN'],
    futureImpact: 'Smart electrostatic systems with real-time charge control will enable single-coat finishes with gradient properties.',
  },
  {
    icon: '(lightning)',
    title: 'Lightning Protection Systems',
    short: 'Lightning',
    tagline: 'Taming nature\'s electricity',
    description: 'Lightning rods and protection systems use principles of charge distribution and Coulomb\'s Law to safely channel massive electrical discharges.',
    connection: 'Sharp points concentrate charge and create strong local electric fields, enabling controlled corona discharge.',
    howItWorks: 'Lightning rods create a region of ionized air through corona discharge, providing a low-resistance path for lightning safely to ground.',
    stats: ['Lightning carries ~1-5 coulombs', 'Peak current up to 200 kA', 'Strike duration ~0.5 ms', 'Protection zone ~45 degree cone'],
    examples: ['Building lightning rods', 'Aircraft static dischargers', 'Wind turbine protection', 'Rocket launch pads'],
    companies: ['Lightning Protection International', 'ERICO', 'Pentair', 'East Coast Lightning Equipment'],
    futureImpact: 'Laser-triggered lightning protection may enable precise control of lightning strike locations.',
  },
];

// === MAIN GAME CLASS ===

export class CoulombsLawGame extends BaseGame {
  readonly gameType = 'coulombs_law';
  readonly gameTitle = 'Coulomb\'s Law';

  // --- PROTECTED GAME STATE ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private time = 0;

  // Charge simulation state
  private charges: Charge[] = [
    { id: 1, x: 150, y: 175, q: 5 },
    { id: 2, x: 350, y: 175, q: -5 },
  ];
  private selectedChargeId: number | null = null;
  private charge1Magnitude = 5;
  private charge2Magnitude = -5;
  private separation = 200;
  private showFieldLines = true;
  private showForceVectors = true;

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
    'hook', 'predict', 'play', 'review',
    'twist_predict', 'twist_play', 'twist_review',
    'transfer', 'test', 'mastery',
  ];

  private readonly phaseLabels: Record<GamePhase, string> = {
    hook: 'Introduction',
    predict: 'Predict',
    play: 'Experiment',
    review: 'Understanding',
    twist_predict: 'New Variable',
    twist_play: 'Explore',
    twist_review: 'Deep Insight',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Welcome! Let\'s explore the invisible force between electric charges.',
    predict: 'What do you think will happen between these two charges?',
    play: 'Adjust the charges and distance to see how the force changes.',
    review: 'You\'ve discovered the inverse-square law! F = kq1q2/r^2',
    twist_predict: 'What happens when a charged object approaches something neutral?',
    twist_play: 'Watch how polarization creates attraction to neutral objects!',
    twist_review: 'Polarization explains static cling, dust attraction, and more!',
    transfer: 'Coulomb\'s Law powers technologies from printers to pollution control.',
    test: 'Time to test your understanding of electrostatic forces!',
    mastery: 'Congratulations! You\'ve mastered Coulomb\'s Law!',
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
      message: 'Coulomb\'s Law lesson started',
    });
  }

  // === INPUT HANDLING ===

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click':
        this.handleButtonClick(input.id!);
        break;
      case 'toggle_change':
        this.handleToggleChange(input.id!, input.value);
        break;
      case 'slider_change':
        this.handleSliderChange(input.id!, input.value);
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
    // Navigation
    if (id === 'next') { this.goNext(); return; }
    if (id === 'back') { this.goBack(); return; }

    // Predictions
    if (id.startsWith('predict_')) {
      this.prediction = id.replace('predict_', '');
      this.emitCoachEvent('prediction_made', { prediction: this.prediction });
      return;
    }
    if (id.startsWith('twist_')) {
      this.twistPrediction = id.replace('twist_', '');
      this.emitCoachEvent('prediction_made', { twistPrediction: this.twistPrediction });
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

    // Reset simulation
    if (id === 'reset') {
      this.resetSimulation();
      return;
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    if (id === 'field_lines') {
      this.showFieldLines = value;
      return;
    }
    if (id === 'force_vectors') {
      this.showForceVectors = value;
      return;
    }
    if (id === 'guided_mode') {
      this.guidedMode = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    if (id === 'charge1') {
      this.charge1Magnitude = value;
      this.updateCharges();
      this.emitCoachEvent('value_changed', { charge1: value });
      return;
    }
    if (id === 'charge2') {
      this.charge2Magnitude = value;
      this.updateCharges();
      this.emitCoachEvent('value_changed', { charge2: value });
      return;
    }
    if (id === 'separation') {
      this.separation = value;
      this.updateChargePositions();
      this.emitCoachEvent('value_changed', { separation: value });
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

  // === CHARGE MANAGEMENT ===

  private updateCharges(): void {
    this.charges = this.charges.map((c, i) => ({
      ...c,
      q: i === 0 ? this.charge1Magnitude : this.charge2Magnitude,
    }));
  }

  private updateChargePositions(): void {
    const centerX = 250;
    this.charges = this.charges.map((c, i) => ({
      ...c,
      x: i === 0 ? centerX - this.separation / 2 : centerX + this.separation / 2,
    }));
  }

  private resetSimulation(): void {
    this.charge1Magnitude = 5;
    this.charge2Magnitude = -5;
    this.separation = 200;
    this.charges = [
      { id: 1, x: 150, y: 175, q: 5 },
      { id: 2, x: 350, y: 175, q: -5 },
    ];
    this.time = 0;
  }

  // === NAVIGATION ===

  private goToPhase(newPhase: GamePhase): void {
    const now = Date.now();
    if (now - this.lastNavTime < 200 || this.isNavigating) return;

    this.lastNavTime = now;
    this.isNavigating = true;
    this.phase = newPhase;

    // Reset simulation when entering play phases
    if (newPhase === 'play' || newPhase === 'twist_play') {
      this.resetSimulation();
    }

    this.emitCoachEvent('phase_changed', {
      phase: newPhase,
      phaseLabel: this.phaseLabels[newPhase],
    });

    setTimeout(() => { this.isNavigating = false; }, 400);
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

  // === PROTECTED PHYSICS CALCULATIONS (never sent to client) ===

  /**
   * Calculate electrostatic force between two charges using Coulomb's Law
   * F = k * q1 * q2 / r^2
   *
   * @param q1 - First charge in microcoulombs
   * @param q2 - Second charge in microcoulombs
   * @param r - Distance in pixels (1 pixel = 1mm in our scale)
   * @returns Force in Newtons
   */
  private calculateForce(q1: number, q2: number, r: number): number {
    // Convert microcoulombs to coulombs
    const q1_C = q1 * 1e-6;
    const q2_C = q2 * 1e-6;
    // Convert pixels to meters (1 pixel = 1mm)
    const r_m = r * 0.001;

    if (r_m === 0) return 0;

    // PROTECTED FORMULA: Coulomb's Law
    // F = k * q1 * q2 / r^2
    return COULOMB_CONSTANT * q1_C * q2_C / (r_m * r_m);
  }

  /**
   * Calculate electric field at a point due to all charges
   * E = k * q / r^2 (magnitude)
   *
   * @param x - X coordinate of point
   * @param y - Y coordinate of point
   * @returns Electric field vector {Ex, Ey}
   */
  private calculateElectricField(x: number, y: number): { Ex: number; Ey: number } {
    let Ex = 0;
    let Ey = 0;

    for (const charge of this.charges) {
      const dx = x - charge.x;
      const dy = y - charge.y;
      const r = Math.sqrt(dx * dx + dy * dy);

      if (r < 10) continue; // Avoid singularity near charge

      // Electric field points away from positive, toward negative
      const sign = charge.q > 0 ? 1 : -1;
      const E = sign / (r * r); // Normalized field magnitude

      Ex += E * dx / r;
      Ey += E * dy / r;
    }

    return { Ex, Ey };
  }

  /**
   * Calculate force vectors on each charge using superposition principle
   * F_net = sum of F from all other charges
   */
  private calculateForceVectors(): Array<{ x: number; y: number; fx: number; fy: number }> {
    const vectors: Array<{ x: number; y: number; fx: number; fy: number }> = [];

    for (let i = 0; i < this.charges.length; i++) {
      let Fx = 0;
      let Fy = 0;

      for (let j = 0; j < this.charges.length; j++) {
        if (i === j) continue;

        const dx = this.charges[j].x - this.charges[i].x;
        const dy = this.charges[j].y - this.charges[i].y;
        const r = Math.sqrt(dx * dx + dy * dy);

        if (r < 1) continue;

        // Force direction: opposite charges attract, like charges repel
        const forceMag = this.charges[i].q * this.charges[j].q;
        const direction = forceMag < 0 ? 1 : -1; // Negative product = attraction

        // Superposition: add force components
        Fx += direction * Math.abs(forceMag) * dx / (r * r * r) * 1000;
        Fy += direction * Math.abs(forceMag) * dy / (r * r * r) * 1000;
      }

      vectors.push({
        x: this.charges[i].x,
        y: this.charges[i].y,
        fx: Fx,
        fy: Fy,
      });
    }

    return vectors;
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

  // === SIMULATION UPDATE ===

  update(deltaTime: number): void {
    if (this.phase !== 'play' && this.phase !== 'twist_play') return;

    this.time += deltaTime / 1000;
  }

  // === RENDERING ===

  render(): GameFrame {
    const r = new CommandRenderer(700, 350);
    r.reset();

    // Background
    r.clear(colors.bgDark);

    // Subtle grid
    for (let x = 0; x < 700; x += 25) {
      r.line(x, 0, x, 350, { stroke: '#1e293b', strokeWidth: 0.5, opacity: 0.3 });
    }
    for (let y = 0; y < 350; y += 25) {
      r.line(0, y, 700, y, { stroke: '#1e293b', strokeWidth: 0.5, opacity: 0.3 });
    }

    // Phase-specific content
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

    // UI state
    this.renderUI(r);

    return r.toFrame(this.nextFrame());
  }

  // --- PHASE RENDERERS ---

  private renderHook(r: CommandRenderer): void {
    // Title
    r.text(350, 50, 'Coulomb\'s Law', {
      fill: colors.textPrimary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 80, 'The invisible force between electric charges', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Animated charges visualization
    const pulseOffset = Math.sin(this.time * 2) * 3;

    // Positive charge (red)
    r.circle(200, 180, 35 + pulseOffset, { fill: colors.positive + '30' });
    r.circle(200, 180, 30, { fill: colors.positive, stroke: '#fca5a5', strokeWidth: 2 });
    r.text(200, 188, '+', { fill: 'white', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });

    // Negative charge (blue)
    r.circle(500, 180, 35 + pulseOffset, { fill: colors.negative + '30' });
    r.circle(500, 180, 30, { fill: colors.negative, stroke: '#93c5fd', strokeWidth: 2 });
    r.text(500, 188, '-', { fill: 'white', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });

    // Force arrows (attraction)
    r.line(235, 180, 295, 180, { stroke: colors.force, strokeWidth: 3 });
    r.polygon([295, 175, 305, 180, 295, 185], { fill: colors.force });

    r.line(465, 180, 405, 180, { stroke: colors.force, strokeWidth: 3 });
    r.polygon([405, 175, 395, 180, 405, 185], { fill: colors.force });

    // Formula
    r.text(350, 260, 'F = k * q1 * q2 / r^2', {
      fill: colors.primary,
      fontSize: 18,
      textAnchor: 'middle',
    });

    r.text(350, 290, 'k = 8.99 x 10^9 N*m^2/C^2', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(350, 40, 'Make Your Prediction', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Scenario description
    r.rect(50, 60, 600, 60, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
    r.text(350, 85, 'Two charged particles: +4 uC and -2 uC, separated by 10 cm', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 105, 'What forces will these charges experience?', {
      fill: colors.primary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Visual representation
    r.circle(200, 170, 25, { fill: colors.positive, stroke: '#fca5a5', strokeWidth: 2 });
    r.text(200, 178, '+', { fill: 'white', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 210, '+4 uC', { fill: '#fca5a5', fontSize: 12, textAnchor: 'middle' });

    r.circle(500, 170, 25, { fill: colors.negative, stroke: '#93c5fd', strokeWidth: 2 });
    r.text(500, 178, '-', { fill: 'white', fontSize: 24, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(500, 210, '-2 uC', { fill: '#93c5fd', fontSize: 12, textAnchor: 'middle' });

    // Distance marker
    r.line(225, 145, 475, 145, { stroke: colors.textMuted, strokeWidth: 1 });
    r.line(225, 140, 225, 150, { stroke: colors.textMuted, strokeWidth: 1 });
    r.line(475, 140, 475, 150, { stroke: colors.textMuted, strokeWidth: 1 });
    r.text(350, 138, '10 cm', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });

    // Question marks
    r.text(300, 175, '?', { fill: colors.force, fontSize: 24, textAnchor: 'middle' });
    r.text(400, 175, '?', { fill: colors.force, fontSize: 24, textAnchor: 'middle' });

    // Feedback if prediction made
    if (this.prediction) {
      const isCorrect = this.prediction === 'attract';
      r.rect(50, 240, 600, 70, {
        fill: isCorrect ? colors.success + '20' : colors.danger + '20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 8,
      });
      r.text(350, 265, isCorrect ? 'Correct! Opposite charges attract each other!' : 'Not quite. Think about the charge signs...', {
        fill: isCorrect ? colors.success : colors.danger,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
      if (isCorrect) {
        r.text(350, 290, 'F = k|q1||q2|/r^2 = 7.2 N (attractive force)', {
          fill: colors.textSecondary,
          fontSize: 12,
          textAnchor: 'middle',
        });
      }
    }
  }

  private renderPlay(r: CommandRenderer): void {
    r.text(350, 25, 'Coulomb\'s Law Lab', {
      fill: colors.textPrimary,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Simulation area
    r.rect(50, 50, 400, 200, { fill: colors.bgCard, stroke: colors.border, rx: 8 });

    // Grid in simulation area
    for (let x = 50; x <= 450; x += 50) {
      r.line(x, 50, x, 250, { stroke: '#334155', strokeWidth: 0.5 });
    }
    for (let y = 50; y <= 250; y += 50) {
      r.line(50, y, 450, y, { stroke: '#334155', strokeWidth: 0.5 });
    }

    // Render field lines if enabled
    if (this.showFieldLines) {
      this.renderFieldLines(r);
    }

    // Render force vectors if enabled
    if (this.showForceVectors) {
      this.renderForceVectorsVisual(r);
    }

    // Render charges
    for (const charge of this.charges) {
      const isPositive = charge.q > 0;
      const radius = 20 + Math.abs(charge.q) * 1.5;
      const baseColor = isPositive ? colors.positive : colors.negative;
      const glowColor = isPositive ? '#fca5a5' : '#93c5fd';

      // Glow
      r.circle(charge.x, charge.y + 50, radius + 5, { fill: baseColor + '30' });
      // Main circle
      r.circle(charge.x, charge.y + 50, radius, { fill: baseColor, stroke: glowColor, strokeWidth: 2 });
      // Symbol
      r.text(charge.x, charge.y + 55, isPositive ? '+' : '-', {
        fill: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
    }

    // Distance line
    const c1 = this.charges[0];
    const c2 = this.charges[1];
    const distance = Math.sqrt(Math.pow(c2.x - c1.x, 2) + Math.pow(c2.y - c1.y, 2));

    r.line(c1.x, c1.y + 50, c2.x, c2.y + 50, {
      stroke: colors.textMuted,
      strokeWidth: 1,
      strokeDasharray: '5,5',
    });
    r.text((c1.x + c2.x) / 2, (c1.y + c2.y) / 2 + 40, `r = ${(distance * 0.001).toFixed(3)} m`, {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });

    // Force calculation display
    const force = this.calculateForce(c1.q, c2.q, distance);
    const isAttractive = c1.q * c2.q < 0;

    r.rect(470, 50, 210, 100, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
    r.text(575, 75, 'Electrostatic Force:', {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(575, 105, `${Math.abs(force).toExponential(2)} N`, {
      fill: colors.primary,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });
    r.text(575, 135, isAttractive ? 'ATTRACTIVE' : 'REPULSIVE', {
      fill: isAttractive ? colors.success : colors.danger,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Parameter labels
    r.text(575, 180, `q1 = ${this.charge1Magnitude > 0 ? '+' : ''}${this.charge1Magnitude} uC`, {
      fill: colors.positive,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(575, 200, `q2 = ${this.charge2Magnitude > 0 ? '+' : ''}${this.charge2Magnitude} uC`, {
      fill: colors.negative,
      fontSize: 12,
      textAnchor: 'middle',
    });
    r.text(575, 220, `d = ${this.separation} mm`, {
      fill: colors.force,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Formula reminder
    r.text(575, 260, 'F = k*q1*q2/r^2', {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderFieldLines(r: CommandRenderer): void {
    const numLines = 8;

    for (const charge of this.charges) {
      if (charge.q === 0) continue;

      for (let i = 0; i < numLines; i++) {
        const startAngle = (2 * Math.PI * i) / numLines;
        const points: Array<{ x: number; y: number }> = [];

        let x = charge.x + Math.cos(startAngle) * 25;
        let y = charge.y + 50 + Math.sin(startAngle) * 25;

        const direction = charge.q > 0 ? 1 : -1;

        for (let step = 0; step < 30; step++) {
          if (x < 50 || x > 450 || y < 50 || y > 250) break;

          points.push({ x, y });

          const field = this.calculateElectricField(x, y - 50);
          const Emag = Math.sqrt(field.Ex * field.Ex + field.Ey * field.Ey);
          if (Emag < 0.0001) break;

          x += direction * (field.Ex / Emag) * 8;
          y += direction * (field.Ey / Emag) * 8;
        }

        // Draw field line
        if (points.length > 2) {
          const lineColor = charge.q > 0 ? '#fca5a5' : '#93c5fd';
          for (let j = 1; j < points.length; j++) {
            r.line(points[j - 1].x, points[j - 1].y, points[j].x, points[j].y, {
              stroke: lineColor,
              strokeWidth: 1,
              opacity: 0.4,
            });
          }
        }
      }
    }
  }

  private renderForceVectorsVisual(r: CommandRenderer): void {
    const vectors = this.calculateForceVectors();

    for (const v of vectors) {
      const Fmag = Math.sqrt(v.fx * v.fx + v.fy * v.fy);
      if (Fmag > 1) {
        const scale = Math.min(40, Fmag * 3);
        const endX = v.x + (v.fx / Fmag) * scale;
        const endY = v.y + 50 + (v.fy / Fmag) * scale;

        r.line(v.x, v.y + 50, endX, endY, {
          stroke: colors.force,
          strokeWidth: 3,
        });

        // Arrowhead
        const angle = Math.atan2(v.fy, v.fx);
        const arrowSize = 8;
        r.polygon([
          endX,
          endY,
          endX - arrowSize * Math.cos(angle - 0.5),
          endY - arrowSize * Math.sin(angle - 0.5),
          endX - arrowSize * Math.cos(angle + 0.5),
          endY - arrowSize * Math.sin(angle + 0.5),
        ], { fill: colors.force });
      }
    }
  }

  private renderReview(r: CommandRenderer): void {
    r.text(350, 40, 'Coulomb\'s Law Fundamentals', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Key concept cards
    const concepts = [
      { title: 'Inverse Square Law', desc: 'F = kq1q2/r^2', detail: 'Double distance = 1/4 force', color: colors.positive },
      { title: 'Charge Interactions', desc: '+ + repel, - - repel, + - attract', detail: 'Opposite charges attract', color: colors.negative },
      { title: 'Coulomb\'s Constant', desc: 'k = 8.99x10^9 N*m^2/C^2', detail: '~10^40 times stronger than gravity!', color: colors.accent },
      { title: 'Superposition', desc: 'F_net = F1 + F2 + F3 + ...', detail: 'Forces add as vectors', color: colors.primary },
    ];

    concepts.forEach((concept, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 80 + col * 280;
      const y = 70 + row * 120;

      r.rect(x, y, 260, 100, { fill: colors.bgCard, stroke: concept.color + '60', rx: 8 });
      r.text(x + 130, y + 25, concept.title, {
        fill: concept.color,
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
      r.text(x + 130, y + 50, concept.desc, {
        fill: colors.textPrimary,
        fontSize: 12,
        textAnchor: 'middle',
      });
      r.text(x + 130, y + 75, concept.detail, {
        fill: colors.textMuted,
        fontSize: 11,
        textAnchor: 'middle',
      });
    });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 40, 'The Twist Challenge', {
      fill: colors.accent,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 60, 600, 80, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
    r.text(350, 90, 'A negatively charged balloon is brought near a NEUTRAL wall.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });
    r.text(350, 115, 'The wall has no net electric charge.', {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Visual: balloon and wall
    r.ellipse(150, 200, 40, 50, { fill: colors.negative, stroke: '#93c5fd', strokeWidth: 2 });
    r.text(150, 190, '- -', { fill: 'white', fontSize: 16, textAnchor: 'middle' });
    r.text(150, 210, '- -', { fill: 'white', fontSize: 16, textAnchor: 'middle' });
    r.text(150, 270, 'Charged', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
    r.text(150, 285, 'Balloon', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });

    r.rect(400, 150, 20, 130, { fill: '#64748b', stroke: colors.border });
    r.text(480, 215, 'Neutral', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
    r.text(480, 230, 'Wall', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });

    // Question mark
    r.text(280, 210, '?', { fill: colors.force, fontSize: 32, textAnchor: 'middle' });

    r.text(350, 320, 'What will happen when the balloon gets close to the wall?', {
      fill: colors.primary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Feedback if prediction made
    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'attract';
      r.rect(50, 300, 600, 40, {
        fill: isCorrect ? colors.success + '20' : colors.danger + '20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 8,
      });
      r.text(350, 325, isCorrect ? 'Correct! The balloon will stick to the wall!' : 'Not quite - think about what happens to the wall\'s electrons...', {
        fill: isCorrect ? colors.success : colors.danger,
        fontSize: 13,
        textAnchor: 'middle',
      });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(350, 30, 'Electrostatic Induction', {
      fill: colors.accent,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Animation based on time
    const balloonX = 120 + Math.sin(this.time) * 20;
    const polarizationOffset = Math.sin(this.time * 2) * 3;

    // Balloon
    r.ellipse(balloonX, 150, 45, 55, { fill: colors.negative, stroke: '#93c5fd', strokeWidth: 2 });
    r.text(balloonX, 135, '- - -', { fill: 'white', fontSize: 14, textAnchor: 'middle' });
    r.text(balloonX, 155, '- - -', { fill: 'white', fontSize: 14, textAnchor: 'middle' });
    r.polygon([balloonX, 205, balloonX - 10, 230, balloonX + 10, 230], { fill: colors.negative });

    // Wall with polarization
    r.rect(280, 70, 100, 180, { fill: '#475569', rx: 4 });

    // Polarized charges in wall
    for (let i = 0; i < 5; i++) {
      const y = 90 + i * 35;
      // Positive charges (attracted) - left side
      r.circle(295 + polarizationOffset, y, 8, { fill: colors.positive, opacity: 0.8 });
      r.text(295 + polarizationOffset, y + 4, '+', { fill: 'white', fontSize: 12, textAnchor: 'middle' });
      // Negative charges (repelled) - right side
      r.circle(365 - polarizationOffset, y, 8, { fill: colors.negative, opacity: 0.8 });
      r.text(365 - polarizationOffset, y + 4, '-', { fill: 'white', fontSize: 10, textAnchor: 'middle' });
    }

    // Attraction arrow
    r.line(180, 150, 260, 150, { stroke: colors.force, strokeWidth: 3 });
    r.polygon([260, 145, 275, 150, 260, 155], { fill: colors.force });
    r.text(220, 135, 'F_attraction', { fill: colors.force, fontSize: 11, textAnchor: 'middle' });

    // Labels
    r.text(balloonX, 260, 'Charged Balloon', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
    r.text(330, 270, 'Neutral Wall (Polarized)', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });

    // Explanation steps
    const steps = [
      { num: '1', text: 'Balloon repels wall electrons', color: colors.negative },
      { num: '2', text: 'Positive charges left closer', color: colors.positive },
      { num: '3', text: 'Closer charges = stronger force', color: colors.force },
      { num: '4', text: 'Net attraction pulls balloon to wall', color: colors.success },
    ];

    r.rect(420, 70, 250, 180, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
    steps.forEach((step, i) => {
      r.circle(445, 100 + i * 40, 12, { fill: step.color });
      r.text(445, 105 + i * 40, step.num, { fill: 'white', fontSize: 11, fontWeight: 'bold', textAnchor: 'middle' });
      r.text(465, 105 + i * 40, step.text, { fill: colors.textSecondary, fontSize: 11 });
    });
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(350, 40, 'Key Discovery: Polarization', {
      fill: colors.accent,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 70, 600, 120, { fill: colors.bgCard, stroke: colors.accent + '40', rx: 12 });

    r.text(350, 100, 'Coulomb\'s Law Reveals Hidden Attractions!', {
      fill: colors.accent,
      fontSize: 16,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const insights = [
      'The inverse-square law (F proportional to 1/r^2) means nearby charges dominate',
      'Polarization creates unequal distances, leading to net force',
      'Even neutral objects can be attracted to charges',
      'Attraction to polarized neutral objects falls off as 1/r^4!',
    ];

    insights.forEach((insight, i) => {
      r.text(350, 125 + i * 18, '* ' + insight, {
        fill: colors.textSecondary,
        fontSize: 11,
        textAnchor: 'middle',
      });
    });

    // Real-world examples
    r.text(350, 220, 'Real-World Examples:', {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const examples = [
      { icon: '(balloon)', label: 'Balloon on Wall' },
      { icon: '(sock)', label: 'Static Cling' },
      { icon: '(water)', label: 'Water Bending' },
    ];

    examples.forEach((ex, i) => {
      r.rect(100 + i * 180, 240, 160, 60, { fill: colors.bgCardLight, stroke: colors.border, rx: 8 });
      r.text(180 + i * 180, 260, ex.icon, { fill: colors.textSecondary, fontSize: 20, textAnchor: 'middle' });
      r.text(180 + i * 180, 285, ex.label, { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });
    });
  }

  private renderTransfer(r: CommandRenderer): void {
    const apps = transferApps;

    r.text(350, 35, 'Real-World Applications', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // App tabs
    apps.forEach((app, i) => {
      const isSelected = i === this.selectedApp;
      const isCompleted = this.completedApps[i];

      r.rect(60 + i * 160, 55, 145, 35, {
        fill: isSelected ? colors.primary : colors.bgCard,
        stroke: isCompleted ? colors.success : colors.border,
        rx: 8,
      });
      r.text(132 + i * 160, 78, app.short, {
        fill: isSelected ? colors.textPrimary : colors.textSecondary,
        fontSize: 12,
        fontWeight: isSelected ? 'bold' : 'normal',
        textAnchor: 'middle',
      });
    });

    // Selected app content
    const app = apps[this.selectedApp];

    r.rect(50, 100, 600, 220, { fill: colors.bgCard, stroke: colors.border, rx: 12 });

    r.text(80, 125, app.icon + ' ' + app.title, {
      fill: colors.primary,
      fontSize: 16,
      fontWeight: 'bold',
    });
    r.text(80, 145, app.tagline, {
      fill: colors.textMuted,
      fontSize: 11,
    });

    r.text(80, 175, app.description, {
      fill: colors.textSecondary,
      fontSize: 11,
    });

    // Physics connection
    r.rect(60, 195, 280, 55, { fill: colors.bgCardLight, rx: 6 });
    r.text(70, 215, 'Physics Connection:', { fill: colors.primary, fontSize: 10, fontWeight: 'bold' });
    r.text(70, 235, app.connection.substring(0, 50) + '...', { fill: colors.textMuted, fontSize: 9 });

    // Stats
    r.rect(360, 195, 280, 55, { fill: colors.bgCardLight, rx: 6 });
    r.text(370, 215, 'Key Stats:', { fill: colors.success, fontSize: 10, fontWeight: 'bold' });
    r.text(370, 235, app.stats[0], { fill: colors.textMuted, fontSize: 9 });

    // Companies
    r.text(80, 280, 'Companies: ' + app.companies.join(', '), {
      fill: colors.textMuted,
      fontSize: 10,
    });

    // Progress indicator
    r.text(350, 330, `Progress: ${this.completedApps.filter(c => c).length}/4 applications explored`, {
      fill: colors.textSecondary,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  private renderTest(r: CommandRenderer): void {
    if (this.testSubmitted) {
      this.renderTestResults(r);
      return;
    }

    const q = testQuestions[this.testQuestion];

    r.text(350, 30, `Question ${this.testQuestion + 1} of ${testQuestions.length}`, {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });

    // Scenario
    r.rect(50, 45, 600, 50, { fill: colors.bgCardLight, stroke: colors.border, rx: 8 });
    r.text(350, 75, q.scenario.length > 80 ? q.scenario.substring(0, 80) + '...' : q.scenario, {
      fill: colors.primary,
      fontSize: 11,
      textAnchor: 'middle',
    });

    // Question
    r.text(350, 115, q.question, {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Answer options
    q.options.forEach((option, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;

      r.rect(100, 135 + i * 45, 500, 38, {
        fill: isSelected ? colors.primary + '30' : colors.bgCard,
        stroke: isSelected ? colors.primary : colors.border,
        rx: 8,
      });
      r.text(350, 160 + i * 45, option, {
        fill: isSelected ? colors.primary : colors.textSecondary,
        fontSize: 12,
        textAnchor: 'middle',
      });
    });

    // Question progress dots
    for (let i = 0; i < testQuestions.length; i++) {
      const answered = this.testAnswers[i] !== null;
      const isCurrent = i === this.testQuestion;
      r.circle(200 + i * 30, 330, 6, {
        fill: isCurrent ? colors.primary : answered ? colors.success : colors.bgCardLight,
        stroke: isCurrent ? colors.primary : colors.border,
        strokeWidth: isCurrent ? 2 : 1,
      });
    }
  }

  private renderTestResults(r: CommandRenderer): void {
    const score = this.calculateTestScore();
    const passed = score >= 7;

    r.text(350, 80, passed ? 'Excellent!' : 'Keep Learning!', {
      fill: passed ? colors.success : colors.warning,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 130, `Score: ${score} / ${testQuestions.length}`, {
      fill: colors.textPrimary,
      fontSize: 24,
      textAnchor: 'middle',
    });

    r.text(350, 170, passed ? 'You\'ve mastered Coulomb\'s Law!' : 'Review the concepts and try again.', {
      fill: colors.textSecondary,
      fontSize: 16,
      textAnchor: 'middle',
    });

    // Score visualization
    for (let i = 0; i < testQuestions.length; i++) {
      const isCorrect = this.testAnswers[i] === testQuestions[i].correctIndex;
      r.circle(150 + i * 40, 220, 15, {
        fill: isCorrect ? colors.success : colors.danger,
      });
      r.text(150 + i * 40, 225, isCorrect ? '/' : 'X', {
        fill: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
    }

    // Encouragement message
    if (passed) {
      r.text(350, 280, 'You understand electrostatic forces, polarization, and real-world applications!', {
        fill: colors.success,
        fontSize: 12,
        textAnchor: 'middle',
      });
    }
  }

  private renderMastery(r: CommandRenderer): void {
    // Celebration
    r.text(350, 70, '(lightning)', { fontSize: 50, textAnchor: 'middle' });

    r.text(350, 130, 'Coulomb\'s Law Master!', {
      fill: colors.primary,
      fontSize: 28,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 165, 'You\'ve mastered the fundamental law of electrostatic force!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Achievement badges
    const achievements = [
      { icon: '+/-', label: 'Charge Interactions' },
      { icon: '1/r^2', label: 'Inverse Square Law' },
      { icon: '~', label: 'Polarization' },
      { icon: '*', label: 'Applications' },
    ];

    achievements.forEach((ach, i) => {
      r.rect(100 + i * 140, 200, 120, 70, { fill: colors.bgCard, stroke: colors.primary + '40', rx: 12 });
      r.text(160 + i * 140, 230, ach.icon, { fill: colors.primary, fontSize: 18, textAnchor: 'middle' });
      r.text(160 + i * 140, 255, ach.label, { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    });

    // Formula summary
    r.rect(150, 290, 400, 45, { fill: colors.bgCardLight, stroke: colors.primary, rx: 8 });
    r.text(350, 310, 'F = k * q1 * q2 / r^2', {
      fill: colors.primary,
      fontSize: 16,
      textAnchor: 'middle',
    });
    r.text(350, 328, 'k = 8.99 x 10^9 N*m^2/C^2', {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  // --- UI STATE ---

  private renderUI(r: CommandRenderer): void {
    r.setHeader(this.gameTitle, this.phaseLabels[this.phase]);

    r.setProgress({
      id: 'phase_progress',
      current: this.phaseOrder.indexOf(this.phase) + 1,
      total: this.phaseOrder.length,
      labels: this.phaseOrder.map(p => this.phaseLabels[p]),
      color: colors.primary,
    });

    if (this.guidedMode) {
      r.setCoachMessage(this.coachMessages[this.phase]);
    }

    const idx = this.phaseOrder.indexOf(this.phase);

    // Back button
    if (idx > 0) {
      r.addButton({ id: 'back', label: '<- Back', variant: 'secondary' });
    }

    // Phase-specific controls
    switch (this.phase) {
      case 'predict':
        r.addButton({
          id: 'predict_attract',
          label: 'Attract (Pull Together)',
          variant: this.prediction === 'attract' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_repel',
          label: 'Repel (Push Apart)',
          variant: this.prediction === 'repel' ? 'primary' : 'secondary',
        });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Continue ->', variant: 'success' });
        }
        break;

      case 'play':
        r.addSlider({
          id: 'charge1',
          label: 'Charge 1 (uC)',
          value: this.charge1Magnitude,
          min: -10,
          max: 10,
          step: 1,
        });
        r.addSlider({
          id: 'charge2',
          label: 'Charge 2 (uC)',
          value: this.charge2Magnitude,
          min: -10,
          max: 10,
          step: 1,
        });
        r.addSlider({
          id: 'separation',
          label: 'Separation (mm)',
          value: this.separation,
          min: 50,
          max: 350,
          step: 10,
        });
        r.addToggle({
          id: 'field_lines',
          label: 'Field Lines',
          value: this.showFieldLines,
          onLabel: 'ON',
          offLabel: 'OFF',
        });
        r.addToggle({
          id: 'force_vectors',
          label: 'Force Vectors',
          value: this.showForceVectors,
          onLabel: 'ON',
          offLabel: 'OFF',
        });
        r.addButton({ id: 'reset', label: 'Reset', variant: 'secondary' });
        r.addButton({ id: 'next', label: 'Continue ->', variant: 'success' });
        break;

      case 'twist_predict':
        r.addButton({
          id: 'twist_nothing',
          label: 'Nothing happens',
          variant: this.twistPrediction === 'nothing' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_repel',
          label: 'Repelled from wall',
          variant: this.twistPrediction === 'repel' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_attract',
          label: 'Attracted to wall',
          variant: this.twistPrediction === 'attract' ? 'primary' : 'secondary',
        });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Continue ->', variant: 'success' });
        }
        break;

      case 'twist_play':
        r.addButton({ id: 'next', label: 'Continue ->', variant: 'success' });
        break;

      case 'transfer':
        r.addButton({ id: 'app_0', label: 'Clean Air', variant: this.selectedApp === 0 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_1', label: 'Printing', variant: this.selectedApp === 1 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_2', label: 'Coating', variant: this.selectedApp === 2 ? 'primary' : 'ghost' });
        r.addButton({ id: 'app_3', label: 'Lightning', variant: this.selectedApp === 3 ? 'primary' : 'ghost' });
        if (this.completedApps.every(c => c)) {
          r.addButton({ id: 'next', label: 'Take Quiz ->', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: '<- Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next ->', variant: 'ghost', disabled: this.testQuestion >= testQuestions.length - 1 });
          // Answer buttons
          for (let i = 0; i < 4; i++) {
            r.addButton({
              id: `answer_${i}`,
              label: String.fromCharCode(65 + i),
              variant: this.testAnswers[this.testQuestion] === i ? 'primary' : 'secondary',
            });
          }
          if (this.testAnswers.every(a => a !== null)) {
            r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
          }
        } else {
          const score = this.calculateTestScore();
          r.addButton({
            id: score >= 7 ? 'next' : 'back',
            label: score >= 7 ? 'Complete! ->' : 'Review Concepts',
            variant: score >= 7 ? 'success' : 'secondary',
          });
        }
        break;

      default:
        r.addButton({ id: 'next', label: 'Continue ->', variant: 'primary' });
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
      time: this.time,
      charge1Magnitude: this.charge1Magnitude,
      charge2Magnitude: this.charge2Magnitude,
      separation: this.separation,
      showFieldLines: this.showFieldLines,
      showForceVectors: this.showForceVectors,
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
    this.time = (state.time as number) || 0;
    this.charge1Magnitude = (state.charge1Magnitude as number) || 5;
    this.charge2Magnitude = (state.charge2Magnitude as number) || -5;
    this.separation = (state.separation as number) || 200;
    this.showFieldLines = state.showFieldLines !== false;
    this.showForceVectors = state.showForceVectors !== false;
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = state.guidedMode !== false;

    // Rebuild charge state
    this.updateCharges();
    this.updateChargePositions();
  }
}

// === FACTORY FUNCTION ===
// Register this in server.ts: registry.register('coulombs_law', createCoulombsLawGame);
export function createCoulombsLawGame(sessionId: string): CoulombsLawGame {
  return new CoulombsLawGame(sessionId);
}
