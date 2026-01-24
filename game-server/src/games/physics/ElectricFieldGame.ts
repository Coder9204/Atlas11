/**
 * Electric Field Game - Server-Side Implementation
 *
 * ALL GAME LOGIC LIVES HERE ON THE SERVER.
 * Client receives ONLY draw commands - no formulas, no algorithms.
 *
 * PROTECTED IP:
 * - Electric field: E = kQ/r^2
 * - Force on charge: F = qE
 * - Coulomb's law: F = kq1q2/r^2
 * - Field line generation algorithm
 * - Test questions and answers
 */

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer, clamp } from '../../renderer/CommandRenderer.js';

// === PROTECTED CONSTANTS (never sent to client) ===

// Coulomb's constant: k = 8.99 x 10^9 N*m^2/C^2
const COULOMB_K = 8.99e9;

// === GAME PHASES ===

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

// === PROTECTED TYPES ===

interface SourceCharge {
  id: number;
  x: number;
  y: number;
  q: number; // charge in microcoulombs
}

interface FieldVector {
  x: number;
  y: number;
  Ex: number;
  Ey: number;
  E: number;
}

interface FieldLinePoint {
  x: number;
  y: number;
}

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
  howItWorks: string;
  stats: string[];
  examples: string[];
  companies: string[];
  futureImpact: string;
}

// === PREMIUM COLOR PALETTE ===

const colors = {
  primary: '#06b6d4',
  primaryDark: '#0891b2',
  accent: '#a855f7',
  accentDark: '#9333ea',
  warning: '#f59e0b',
  success: '#10b981',
  danger: '#ef4444',
  positive: '#ef4444', // Red for positive charges
  negative: '#3b82f6', // Blue for negative charges
  testCharge: '#22c55e', // Green for test charge
  fieldVector: '#22c55e',
  bgDark: '#020617',
  bgCard: '#0f172a',
  bgCardLight: '#1e293b',
  border: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
};

// === PROTECTED TEST QUESTIONS (never sent to client) ===

const testQuestions: TestQuestion[] = [
  {
    scenario: 'A small positive test charge is placed near a large positive source charge. The test charge experiences a force pushing it away.',
    question: 'What is the direction of the electric field at the test charge location?',
    options: [
      'Toward the source charge',
      'Away from the source charge',
      'Perpendicular to the line between charges',
      'The field has no direction',
    ],
    correctIndex: 1,
    explanation: 'Electric field direction is defined as the direction a positive test charge would be pushed. Since like charges repel, the field points away from positive charges. E = F/q, and when q is positive and F points away, E points away.',
  },
  {
    scenario: 'An electron (negative charge) is placed in a uniform electric field pointing to the right with magnitude 1000 N/C.',
    question: 'In which direction will the electron accelerate?',
    options: [
      'To the right (same as E)',
      'To the left (opposite to E)',
      'The electron will not move',
      'Perpendicular to E',
    ],
    correctIndex: 1,
    explanation: 'The force on a charge in an electric field is F = qE. For a negative charge (electron), the force is opposite to the field direction. Since E points right, the force (and acceleration) on the electron points left.',
  },
  {
    scenario: 'A physics student observes electric field lines around two equal positive charges placed side by side.',
    question: 'What happens to the field lines between the two charges?',
    options: [
      'They connect the two charges directly',
      'They curve away from both charges, leaving a null point between them',
      'They form closed loops around each charge',
      'The field is strongest between the charges',
    ],
    correctIndex: 1,
    explanation: 'Like charges repel, so their fields push against each other between them. Field lines curve away from both charges, creating a point of zero field exactly midway between them where the two fields cancel. This is called a saddle point or null point.',
  },
  {
    scenario: 'Inside a hollow conducting sphere that has been given a positive charge, a student wants to measure the electric field.',
    question: 'What will the student find for the electric field inside the conductor?',
    options: [
      'Very strong, pointing toward the center',
      'Very strong, pointing outward',
      'Zero everywhere inside',
      'It varies depending on position',
    ],
    correctIndex: 2,
    explanation: 'Inside a conductor in electrostatic equilibrium, the electric field is always zero. Free charges in the conductor redistribute until they completely cancel any internal field. This is the basis for electrostatic shielding (Faraday cage).',
  },
  {
    scenario: 'Two parallel plates are charged, with the top plate positive (+) and bottom plate negative (-). The separation is 5 mm and the voltage difference is 1000 V.',
    question: 'What is the electric field magnitude between the plates?',
    options: [
      '200 N/C',
      '5000 N/C',
      '200,000 N/C (or 200 kV/m)',
      '1,000,000 N/C',
    ],
    correctIndex: 2,
    explanation: 'For a uniform field between parallel plates, E = V/d. Here E = 1000 V / 0.005 m = 200,000 V/m = 200,000 N/C. The field is uniform between the plates and points from + to - (top to bottom).',
  },
  {
    scenario: 'A charge of +2 uC creates an electric field. At a distance of 3 m from this charge, you measure the field strength.',
    question: 'What is the approximate electric field magnitude at this point?',
    options: [
      '2000 N/C',
      '6000 N/C',
      '18,000 N/C',
      '600 N/C',
    ],
    correctIndex: 0,
    explanation: 'E = kq/r^2 = (8.99x10^9)(2x10^-6)/(3)^2 = (8.99x10^9)(2x10^-6)/9 = 2000 N/C. The field points radially outward from the positive charge at every point.',
  },
  {
    scenario: 'An electric dipole consists of a +Q and -Q charge separated by a small distance. You observe the field far away from the dipole.',
    question: 'How does the field strength vary with distance r from a dipole?',
    options: [
      'It falls off as 1/r (linear)',
      'It falls off as 1/r^2 (inverse square)',
      'It falls off as 1/r^3 (inverse cube)',
      'It remains constant with distance',
    ],
    correctIndex: 2,
    explanation: 'Unlike a single charge (1/r^2), a dipole field falls off as 1/r^3. This is because the fields from the + and - charges largely cancel at large distances. The dipole field is weaker and decays faster than a monopole field.',
  },
  {
    scenario: 'Electric field lines are drawn around a negative point charge.',
    question: 'Which statement correctly describes these field lines?',
    options: [
      'They point radially outward from the charge',
      'They point radially inward toward the charge',
      'They form circles around the charge',
      'There are no field lines around negative charges',
    ],
    correctIndex: 1,
    explanation: 'Electric field lines always point in the direction a positive test charge would move. A positive test charge would be attracted to (move toward) a negative charge, so field lines point inward toward negative charges and outward from positive charges.',
  },
  {
    scenario: 'A proton and an electron are placed in the same uniform electric field of 500 N/C.',
    question: 'How do their accelerations compare?',
    options: [
      'Same magnitude, same direction',
      'Same magnitude, opposite directions',
      'Different magnitudes, opposite directions (electron accelerates ~1836x faster)',
      'Different magnitudes, same direction',
    ],
    correctIndex: 2,
    explanation: 'Force F = qE is the same magnitude for both (same |q|). But a = F/m, and the electron mass is ~1836 times smaller than the proton. So the electron accelerates ~1836 times faster. They accelerate in opposite directions because their charges have opposite signs.',
  },
  {
    scenario: 'In a cathode ray tube, electrons are accelerated through a potential difference of 10,000 V and then deflected by electric fields between parallel plates.',
    question: 'Why do CRT displays use electric fields for electron beam control?',
    options: [
      'Electric fields only affect electrons, not protons',
      'Electric fields can precisely control charged particle trajectories',
      'Magnetic fields do not work on moving charges',
      'Electric fields are cheaper to produce',
    ],
    correctIndex: 1,
    explanation: 'Electric fields exert precise, controllable forces on charged particles (F = qE). By varying the voltage on deflection plates, the electron beam can be steered to any point on the screen. This principle is also used in oscilloscopes, mass spectrometers, and particle accelerators.',
  },
];

// === TRANSFER APPLICATIONS ===

const transferApps: TransferApp[] = [
  {
    icon: 'A',
    title: 'Particle Accelerators',
    short: 'Accelerators',
    tagline: 'Accelerating particles to near light speed',
    description: 'Electric fields accelerate charged particles to incredible energies, enabling discoveries in fundamental physics.',
    connection: 'Particles gain kinetic energy by moving through electric potential differences. Work W = qV converts to kinetic energy, allowing particles to reach relativistic speeds.',
    howItWorks: 'Linear accelerators (linacs) use a series of drift tubes with alternating electric fields. Particles are accelerated in the gaps between tubes. Circular accelerators like synchrotrons use electric fields for acceleration and magnetic fields for steering.',
    stats: ['LHC: 6.5 TeV per beam', 'Particles reach 99.9999991% speed of light', 'Electric fields up to 50 MV/m', 'SLAC linac: 3.2 km long'],
    examples: ['Large Hadron Collider (CERN)', 'SLAC National Accelerator Laboratory', 'Fermilab particle physics', 'Medical proton therapy accelerators'],
    companies: ['CERN', 'Fermilab', 'SLAC', 'DESY'],
    futureImpact: 'Plasma wakefield accelerators use intense laser pulses to create electric fields 1000x stronger than conventional accelerators, potentially shrinking kilometer-scale machines to tabletop size.',
  },
  {
    icon: 'S',
    title: 'Electrostatic Shielding',
    short: 'Faraday Cages',
    tagline: 'Protection through field cancellation',
    description: 'The principle that E = 0 inside conductors protects sensitive electronics and people from external electric fields and electromagnetic interference.',
    connection: 'Free charges in conductors redistribute to cancel internal fields. This means external electric fields cannot penetrate a conducting enclosure - the famous Faraday cage effect.',
    howItWorks: 'A conducting enclosure (mesh or solid) allows charges to redistribute on its surface in response to external fields. The redistributed charges create an opposing field that exactly cancels the external field inside. The interior remains field-free.',
    stats: ['Can block millions of volts', 'Protects against lightning strikes', '60+ dB electromagnetic shielding', 'Mesh openings < 1/10 wavelength'],
    examples: ['Aircraft fuselage (lightning protection)', 'MRI room RF shielding', 'Microwave oven enclosure', 'EMP protection for electronics'],
    companies: ['Boeing', 'Holland Shielding', 'Spira Manufacturing', 'Leader Tech'],
    futureImpact: 'Advanced metamaterial shields may provide frequency-selective protection, allowing certain signals through while blocking harmful interference - smart shielding for the IoT age.',
  },
  {
    icon: 'T',
    title: 'Electron Beam Steering',
    short: 'CRT & Beam',
    tagline: 'Precise control of charged particles',
    description: 'Electric fields steer electron beams with micrometer precision, from classic CRT displays to modern electron microscopes.',
    connection: 'A charged particle in an electric field experiences force F = qE. By controlling E with voltage on deflection plates, particle trajectories can be precisely steered.',
    howItWorks: 'Parallel plate electrodes create uniform electric fields. As electrons pass between plates, they experience constant transverse acceleration, curving their path. The deflection angle depends on field strength, plate length, and electron energy.',
    stats: ['Deflection accuracy: <1 um', 'Scanning rates: MHz', 'Electron microscope resolution: 0.05 nm', 'Oscilloscope bandwidth: GHz'],
    examples: ['Electron microscopes', 'Oscilloscope CRTs', 'Mass spectrometers', 'Electron beam lithography'],
    companies: ['JEOL', 'Thermo Fisher', 'Zeiss', 'Tektronix'],
    futureImpact: 'Ultrafast electron diffraction using femtosecond electron pulses, steered by precisely timed electric fields, will enable molecular movies showing chemical reactions in real-time.',
  },
  {
    icon: 'E',
    title: 'Electrophoresis',
    short: 'Molecular Sep',
    tagline: 'Sorting molecules by charge and size',
    description: 'Electric fields drive charged biomolecules through gels, separating DNA, RNA, and proteins by size and charge for analysis.',
    connection: 'Charged molecules in solution experience force F = qE. Different molecules have different charge-to-friction ratios, causing them to migrate at different speeds through the gel.',
    howItWorks: 'A gel matrix (agarose or polyacrylamide) acts as a molecular sieve. When voltage is applied, negatively charged DNA moves toward the positive electrode. Smaller fragments move faster through the gel pores, creating size-based separation.',
    stats: ['DNA separation: 10 bp to 50 kbp', 'Typical voltage: 5-10 V/cm', 'Run times: 30 min to hours', 'Resolution: single base pair'],
    examples: ['DNA fingerprinting forensics', 'PCR product analysis', 'Protein western blots', 'Clinical hemoglobin analysis'],
    companies: ['Bio-Rad', 'Thermo Fisher', 'Agilent', 'QIAGEN'],
    futureImpact: 'Nanopore sequencing uses electric fields to drive DNA through protein pores. As each base passes, it briefly blocks ion current differently, enabling real-time sequencing without amplification.',
  },
];

// === MAIN GAME CLASS ===

export class ElectricFieldGame extends BaseGame {
  readonly gameType = 'electric_field';
  readonly gameTitle = 'Electric Fields';

  // --- PROTECTED GAME STATE (never sent to client) ---
  private phase: GamePhase = 'hook';
  private prediction: string | null = null;
  private twistPrediction: string | null = null;
  private time = 0;

  // Simulation state
  private sourceCharges: SourceCharge[] = [{ id: 1, x: 250, y: 200, q: 5 }];
  private testChargePos = { x: 350, y: 200 };
  private selectedConfig: 'single' | 'dipole' | 'parallel' = 'single';
  private showFieldLines = true;
  private showFieldVectors = true;
  private isDragging = false;

  // Test state
  private testQuestion = 0;
  private testAnswers: (number | null)[] = Array(10).fill(null);
  private testSubmitted = false;

  // Transfer state
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
    play: 'Field Lab',
    review: 'Understanding',
    twist_predict: 'New Challenge',
    twist_play: 'Shielding',
    twist_review: 'Faraday Cage',
    transfer: 'Real World',
    test: 'Knowledge Test',
    mastery: 'Mastery',
  };

  private readonly coachMessages: Record<GamePhase, string> = {
    hook: 'Welcome! Let\'s explore the invisible force fields that surround every charge.',
    predict: 'A positive test charge is near a negative source. Which way does the field point?',
    play: 'Drag the test charge around to explore the field. Watch how it changes!',
    review: 'Great! You\'ve discovered how electric fields work around charges.',
    twist_predict: 'What happens to the electric field INSIDE a conductor?',
    twist_play: 'Observe how charges redistribute to cancel the internal field.',
    twist_review: 'You\'ve discovered electrostatic shielding - the Faraday cage effect!',
    transfer: 'Electric fields power many technologies. Explore these applications!',
    test: 'Time to test your understanding of electric fields!',
    mastery: 'Congratulations! You\'ve mastered electric fields!',
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
      message: 'Electric Fields lesson started',
    });
  }

  // === INPUT HANDLING ===

  handleInput(input: UserInput): void {
    switch (input.type) {
      case 'button_click':
        this.handleButtonClick(input.id!);
        break;
      case 'toggle_change':
        this.handleToggleChange(input.id!, input.value as boolean);
        break;
      case 'slider_change':
        this.handleSliderChange(input.id!, input.value as number);
        break;
      case 'drag':
        this.handleDrag(input.id!, input.x!, input.y!);
        break;
      case 'drag_start':
        this.handleDragStart(input.id!);
        break;
      case 'drag_end':
        this.handleDragEnd(input.id!);
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

    // Configuration buttons
    if (id === 'config_single') { this.setConfiguration('single'); return; }
    if (id === 'config_dipole') { this.setConfiguration('dipole'); return; }
    if (id === 'config_parallel') { this.setConfiguration('parallel'); return; }

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
    if (id === 'field_vectors') {
      this.showFieldVectors = value;
      return;
    }
    if (id === 'guided_mode') {
      this.guidedMode = value;
      return;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    // Could add charge magnitude slider if needed
  }

  private handleDrag(id: string, x: number, y: number): void {
    if (id === 'test_charge' && this.isDragging) {
      // Clamp to valid area
      this.testChargePos.x = clamp(x, 20, 480);
      this.testChargePos.y = clamp(y, 20, 380);
    }
  }

  private handleDragStart(id: string): void {
    if (id === 'test_charge') {
      this.isDragging = true;
    }
  }

  private handleDragEnd(id: string): void {
    if (id === 'test_charge') {
      this.isDragging = false;
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

  // === CONFIGURATION ===

  private setConfiguration(config: 'single' | 'dipole' | 'parallel'): void {
    this.selectedConfig = config;

    switch (config) {
      case 'single':
        this.sourceCharges = [{ id: 1, x: 250, y: 200, q: 5 }];
        this.testChargePos = { x: 350, y: 200 };
        break;
      case 'dipole':
        this.sourceCharges = [
          { id: 1, x: 180, y: 200, q: 5 },
          { id: 2, x: 320, y: 200, q: -5 },
        ];
        this.testChargePos = { x: 250, y: 120 };
        break;
      case 'parallel':
        this.sourceCharges = [
          { id: 1, x: 100, y: 100, q: 5 },
          { id: 2, x: 100, y: 150, q: 5 },
          { id: 3, x: 100, y: 200, q: 5 },
          { id: 4, x: 100, y: 250, q: 5 },
          { id: 5, x: 100, y: 300, q: 5 },
          { id: 6, x: 400, y: 100, q: -5 },
          { id: 7, x: 400, y: 150, q: -5 },
          { id: 8, x: 400, y: 200, q: -5 },
          { id: 9, x: 400, y: 250, q: -5 },
          { id: 10, x: 400, y: 300, q: -5 },
        ];
        this.testChargePos = { x: 250, y: 200 };
        break;
    }

    this.emitCoachEvent('config_changed', { config });
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

  private resetSimulation(): void {
    this.time = 0;
    this.setConfiguration('single');
  }

  // === PROTECTED PHYSICS CALCULATIONS ===

  /**
   * PROTECTED: Calculate electric field at a point
   *
   * E = kQ/r^2 for each source charge
   * Vector sum using superposition principle
   */
  private calculateField(x: number, y: number): { Ex: number; Ey: number; E: number } {
    let Ex = 0;
    let Ey = 0;

    this.sourceCharges.forEach(charge => {
      const dx = x - charge.x;
      const dy = y - charge.y;
      const r = Math.sqrt(dx * dx + dy * dy);

      if (r < 10) return; // Avoid singularity at charge location

      // E = kq/r^2 in direction away from positive charges
      const q_C = charge.q * 1e-6; // Convert microcoulombs to coulombs
      const r_m = r * 0.001; // pixels to meters (1px = 1mm)
      const E_mag = COULOMB_K * Math.abs(q_C) / (r_m * r_m);
      const direction = charge.q > 0 ? 1 : -1;

      Ex += direction * E_mag * (dx / r);
      Ey += direction * E_mag * (dy / r);
    });

    const E = Math.sqrt(Ex * Ex + Ey * Ey);
    return { Ex, Ey, E };
  }

  /**
   * PROTECTED: Calculate field line path from starting point
   */
  private calculateFieldLine(startX: number, startY: number, direction: number): FieldLinePoint[] {
    const points: FieldLinePoint[] = [];
    let x = startX;
    let y = startY;

    for (let step = 0; step < 80; step++) {
      if (x < 0 || x > 500 || y < 0 || y > 400) break;

      points.push({ x, y });

      const { Ex, Ey, E } = this.calculateField(x, y);
      if (E < 1e6) break; // Stop if field is too weak

      const stepSize = 4;
      x += direction * (Ex / E) * stepSize;
      y += direction * (Ey / E) * stepSize;

      // Check if reached another charge
      const nearCharge = this.sourceCharges.find(c =>
        Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2) < 15
      );
      if (nearCharge) break;
    }

    return points;
  }

  // === UPDATE ===

  update(deltaTime: number): void {
    if (this.phase !== 'play' && this.phase !== 'twist_play') return;
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
    const r = new CommandRenderer(700, 400);
    r.reset();
    r.setViewport(700, 400);

    // Background
    r.clear(colors.bgDark);
    this.renderBackground(r);

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

  private renderBackground(r: CommandRenderer): void {
    // Subtle grid
    for (let x = 0; x < 700; x += 40) {
      r.line(x, 0, x, 400, { stroke: '#334155', strokeWidth: 0.5, opacity: 0.3 });
    }
    for (let y = 0; y < 400; y += 40) {
      r.line(0, y, 700, y, { stroke: '#334155', strokeWidth: 0.5, opacity: 0.3 });
    }
  }

  // --- HOOK PHASE ---

  private renderHook(r: CommandRenderer): void {
    r.text(350, 60, 'Electric Fields', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 95, 'Visualize the invisible force that shapes our universe', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Animated visualization
    const pulseSize = 2 + Math.sin(this.time * 2) * 0.5;

    // Central positive charge
    r.circle(350, 200, 30, { fill: colors.positive, stroke: '#fca5a5', strokeWidth: 3 });
    r.text(350, 208, '+', { fill: 'white', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });

    // Field lines radiating outward
    const numLines = 8;
    for (let i = 0; i < numLines; i++) {
      const angle = (i * 45) * Math.PI / 180;
      const startR = 40;
      const endR = 100 + Math.sin(this.time * 2 + i * 0.5) * 10;

      r.line(
        350 + Math.cos(angle) * startR,
        200 + Math.sin(angle) * startR,
        350 + Math.cos(angle) * endR,
        200 + Math.sin(angle) * endR,
        { stroke: colors.positive, strokeWidth: 2, opacity: 0.7 }
      );
    }

    // Test charge being pushed
    const testX = 450 + Math.sin(this.time * 3) * 20;
    r.circle(testX, 200, 12, { fill: colors.testCharge, stroke: '#4ade80', strokeWidth: 2 });
    r.text(testX, 205, 'q', { fill: 'white', fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

    // Equation
    r.text(350, 320, 'E = F/q = kQ/r^2', {
      fill: colors.textMuted,
      fontSize: 18,
      textAnchor: 'middle',
    });
  }

  // --- PREDICT PHASE ---

  private renderPredict(r: CommandRenderer): void {
    r.text(350, 50, 'Make Your Prediction', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Scenario description
    r.rect(50, 80, 600, 60, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
    r.text(350, 105, 'A positive test charge is placed near a large negative source charge.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });
    r.text(350, 125, 'The test charge experiences a force pulling it toward the source.', {
      fill: colors.textSecondary,
      fontSize: 13,
      textAnchor: 'middle',
    });

    // Visualization
    // Negative source charge
    r.circle(200, 220, 30, { fill: colors.negative, stroke: '#93c5fd', strokeWidth: 2 });
    r.text(200, 228, '-', { fill: 'white', fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(200, 270, 'Source: -Q', { fill: '#93c5fd', fontSize: 11, textAnchor: 'middle' });

    // Positive test charge
    r.circle(450, 220, 15, { fill: colors.testCharge, stroke: '#4ade80', strokeWidth: 2 });
    r.text(450, 226, '+', { fill: 'white', fontSize: 16, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(450, 270, 'Test: +q', { fill: '#4ade80', fontSize: 11, textAnchor: 'middle' });

    // Force arrow pointing left (toward negative charge)
    r.line(420, 220, 280, 220, { stroke: '#4ade80', strokeWidth: 3 });
    r.text(350, 205, 'F', { fill: '#4ade80', fontSize: 14, textAnchor: 'middle' });

    // Question mark for field
    r.text(350, 330, 'What is the direction of the electric field?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Show feedback if prediction made
    if (this.prediction) {
      const isCorrect = this.prediction === 'toward';
      r.rect(50, 350, 600, 40, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 8,
      });
      r.text(350, 375, isCorrect ? 'Correct! E points toward negative charges.' : 'Not quite. Remember: E is defined by positive test charge motion.', {
        fill: isCorrect ? colors.success : colors.danger,
        fontSize: 12,
        textAnchor: 'middle',
      });
    }
  }

  // --- PLAY PHASE ---

  private renderPlay(r: CommandRenderer): void {
    r.text(350, 25, 'Electric Field Lab', {
      fill: colors.textPrimary,
      fontSize: 20,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Field visualization area
    r.rect(25, 45, 470, 310, { fill: '#0f172a', stroke: colors.border, rx: 8 });

    // Grid lines
    for (let x = 65; x < 480; x += 40) {
      r.line(x, 55, x, 345, { stroke: '#1e293b', strokeWidth: 0.5 });
    }
    for (let y = 85; y < 350; y += 40) {
      r.line(35, y, 485, y, { stroke: '#1e293b', strokeWidth: 0.5 });
    }

    // Render field lines (PROTECTED - client only sees resulting paths)
    if (this.showFieldLines) {
      this.renderFieldLines(r);
    }

    // Render field vectors
    if (this.showFieldVectors) {
      this.renderFieldVectors(r);
    }

    // Render source charges
    this.sourceCharges.forEach(charge => {
      const color = charge.q > 0 ? colors.positive : colors.negative;
      const borderColor = charge.q > 0 ? '#fca5a5' : '#93c5fd';
      const pulseSize = 20 + Math.sin(this.time * 3) * 2;

      r.circle(charge.x, charge.y, pulseSize, { fill: color, stroke: borderColor, strokeWidth: 2 });
      r.text(charge.x, charge.y + 7, charge.q > 0 ? '+' : '-', {
        fill: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        textAnchor: 'middle',
      });
    });

    // Render test charge (draggable)
    const { Ex, Ey, E } = this.calculateField(this.testChargePos.x, this.testChargePos.y);
    const tcBorder = this.isDragging ? '#fbbf24' : '#4ade80';
    const tcWidth = this.isDragging ? 4 : 2;

    r.circle(this.testChargePos.x, this.testChargePos.y, 15, {
      fill: colors.testCharge,
      stroke: tcBorder,
      strokeWidth: tcWidth,
      id: 'test_charge',
    });
    r.text(this.testChargePos.x, this.testChargePos.y + 5, 'q', {
      fill: 'white',
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Field vector at test charge
    if (E > 1e6) {
      const scale = 30;
      r.line(
        this.testChargePos.x,
        this.testChargePos.y,
        this.testChargePos.x + (Ex / E) * scale,
        this.testChargePos.y + (Ey / E) * scale,
        { stroke: '#fbbf24', strokeWidth: 3 }
      );
    }

    // Info panel on right
    r.rect(510, 45, 175, 310, { fill: colors.bgCard, stroke: colors.border, rx: 8 });

    // Field magnitude
    r.text(597, 75, 'Field Magnitude', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
    const eMag = E > 1e6 ? (E / 1e6).toFixed(1) + ' MN/C' : '~0 N/C';
    r.text(597, 100, eMag, { fill: colors.warning, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Field direction
    r.text(597, 135, 'Field Direction', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
    const angle = E > 1e6 ? (Math.atan2(Ey, Ex) * 180 / Math.PI).toFixed(0) + ' deg' : 'N/A';
    r.text(597, 160, angle, { fill: colors.primary, fontSize: 18, fontWeight: 'bold', textAnchor: 'middle' });

    // Position
    r.text(597, 195, 'Test Charge Position', { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
    r.text(597, 220, `(${this.testChargePos.x.toFixed(0)}, ${this.testChargePos.y.toFixed(0)})`, {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Formula reminder
    r.text(597, 270, 'E = kQ/r^2', { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });
    r.text(597, 290, 'E = V/d (plates)', { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });

    // Drag hint
    r.text(250, 370, 'Drag the test charge (q) to explore the field', {
      fill: colors.textMuted,
      fontSize: 11,
      textAnchor: 'middle',
    });
  }

  private renderFieldLines(r: CommandRenderer): void {
    const numLinesPerCharge = 12;

    this.sourceCharges.forEach(charge => {
      if (charge.q === 0) return;

      for (let i = 0; i < numLinesPerCharge; i++) {
        const angle = (2 * Math.PI * i) / numLinesPerCharge;
        const startX = charge.x + Math.cos(angle) * 15;
        const startY = charge.y + Math.sin(angle) * 15;
        const direction = charge.q > 0 ? 1 : -1;

        const points = this.calculateFieldLine(startX, startY, direction);

        if (points.length > 3) {
          const color = charge.q > 0 ? colors.positive : colors.negative;

          // Draw line segments
          for (let j = 1; j < points.length; j++) {
            r.line(points[j - 1].x, points[j - 1].y, points[j].x, points[j].y, {
              stroke: color,
              strokeWidth: 1.5,
              opacity: 0.6,
            });
          }
        }
      }
    });
  }

  private renderFieldVectors(r: CommandRenderer): void {
    const gridSize = 40;

    for (let x = gridSize; x < 500; x += gridSize) {
      for (let y = gridSize + 50; y < 360; y += gridSize) {
        // Skip if too close to a charge
        const tooClose = this.sourceCharges.some(c =>
          Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2) < 25
        );
        if (tooClose) continue;

        const { Ex, Ey, E } = this.calculateField(x, y);
        if (E < 1e6) continue;

        const scale = Math.min(15, Math.log10(E / 1e6) * 5);
        const endX = x + (Ex / E) * scale;
        const endY = y + (Ey / E) * scale;

        r.line(x, y, endX, endY, {
          stroke: colors.fieldVector,
          strokeWidth: 2,
          opacity: 0.7,
        });
      }
    }
  }

  // --- REVIEW PHASE ---

  private renderReview(r: CommandRenderer): void {
    r.text(350, 50, 'Electric Field Fundamentals', {
      fill: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Four concept cards
    const concepts = [
      { title: 'Field Definition', formula: 'E = F/q (N/C)', points: ['Force per unit positive test charge', 'Vector quantity (magnitude + direction)', 'Exists at every point in space'] },
      { title: 'Point Charge Field', formula: 'E = kQ/r^2', points: ['Radial field (outward from + or inward to -)', 'Inverse square law', 'k = 8.99 x 10^9 N*m^2/C^2'] },
      { title: 'Field Line Rules', formula: '', points: ['Start on +, end on -', 'Never cross', 'Denser = stronger field'] },
      { title: 'Uniform Field', formula: 'E = V/d', points: ['Between parallel plates', 'Constant magnitude and direction', 'Used in capacitors'] },
    ];

    concepts.forEach((c, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 60 + col * 295;
      const y = 90 + row * 150;

      r.rect(x, y, 280, 130, { fill: colors.bgCard, stroke: colors.border, rx: 10 });
      r.text(x + 140, y + 25, c.title, { fill: colors.primary, fontSize: 14, fontWeight: 'bold', textAnchor: 'middle' });

      if (c.formula) {
        r.text(x + 140, y + 50, c.formula, { fill: colors.warning, fontSize: 13, textAnchor: 'middle' });
      }

      c.points.forEach((point, pi) => {
        r.text(x + 15, y + 70 + pi * 18, '* ' + point, { fill: colors.textSecondary, fontSize: 11 });
      });
    });
  }

  // --- TWIST PREDICT PHASE ---

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(350, 50, 'The Twist Challenge', {
      fill: colors.accent,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Conducting sphere illustration
    r.circle(350, 200, 70, { fill: 'none', stroke: colors.textMuted, strokeWidth: 4 });
    r.circle(350, 200, 65, { fill: colors.bgCard });

    // Surface charges
    for (let i = 0; i < 8; i++) {
      const angle = (i * 45) * Math.PI / 180;
      r.circle(350 + Math.cos(angle) * 67, 200 + Math.sin(angle) * 67, 6, { fill: colors.positive });
    }

    // Question inside
    r.text(350, 208, 'E = ?', { fill: colors.testCharge, fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });

    r.text(350, 300, 'Charged conducting hollow sphere', { fill: colors.textMuted, fontSize: 12, textAnchor: 'middle' });

    r.text(350, 330, 'What is the electric field inside the hollow conductor?', {
      fill: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Feedback
    if (this.twistPrediction) {
      const isCorrect = this.twistPrediction === 'zero';
      r.rect(50, 350, 600, 40, {
        fill: isCorrect ? '#065f4620' : '#7f1d1d20',
        stroke: isCorrect ? colors.success : colors.danger,
        rx: 8,
      });
      r.text(350, 375, isCorrect ? 'Correct! E = 0 inside any conductor!' : 'Not quite. Think about what happens to free charges in a conductor.', {
        fill: isCorrect ? colors.success : colors.danger,
        fontSize: 12,
        textAnchor: 'middle',
      });
    }
  }

  // --- TWIST PLAY PHASE ---

  private renderTwistPlay(r: CommandRenderer): void {
    r.text(350, 35, 'Electrostatic Shielding', {
      fill: colors.accent,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Conductor sphere
    r.circle(350, 180, 100, { fill: 'none', stroke: colors.textMuted, strokeWidth: 6 });
    r.circle(350, 180, 90, { fill: colors.bgCard });

    // Surface charges with animation
    for (let i = 0; i < 16; i++) {
      const angle = (i * 22.5) * Math.PI / 180;
      const pulseOffset = Math.sin(this.time * 2 + i) * 3;
      r.circle(350 + Math.cos(angle) * (95 + pulseOffset), 180 + Math.sin(angle) * (95 + pulseOffset), 8, { fill: colors.positive });
    }

    // E = 0 inside
    r.text(350, 175, 'E = 0', { fill: colors.testCharge, fontSize: 28, fontWeight: 'bold', textAnchor: 'middle' });
    r.text(350, 200, 'everywhere inside', { fill: colors.testCharge, fontSize: 12, textAnchor: 'middle' });

    // External field arrows (blocked)
    for (let yOffset = -40; yOffset <= 40; yOffset += 40) {
      r.line(80, 180 + yOffset, 170, 180 + yOffset, { stroke: colors.warning, strokeWidth: 3, opacity: 0.7 });
      r.line(530, 180 + yOffset, 620, 180 + yOffset, { stroke: colors.warning, strokeWidth: 3, opacity: 0.7 });
    }

    r.text(125, 270, 'External Field', { fill: colors.warning, fontSize: 11, textAnchor: 'middle' });
    r.text(575, 270, 'External Field', { fill: colors.warning, fontSize: 11, textAnchor: 'middle' });

    // Explanation steps
    const steps = [
      { num: '1', text: 'External field applied, free electrons move' },
      { num: '2', text: 'Electrons redistribute to cancel internal field' },
      { num: '3', text: 'Equilibrium: E = 0 inside, charge on surface' },
      { num: '4', text: 'This happens at the speed of light!' },
    ];

    steps.forEach((step, i) => {
      const stepColors = [colors.danger, colors.warning, colors.success, colors.accent];
      r.rect(50 + i * 155, 310, 145, 45, { fill: colors.bgCard, stroke: stepColors[i], rx: 6 });
      r.text(70 + i * 155, 338, step.num, { fill: stepColors[i], fontSize: 14, fontWeight: 'bold' });
      r.text(90 + i * 155, 330, step.text.substring(0, 20), { fill: colors.textSecondary, fontSize: 9 });
      r.text(90 + i * 155, 345, step.text.substring(20), { fill: colors.textSecondary, fontSize: 9 });
    });
  }

  // --- TWIST REVIEW PHASE ---

  private renderTwistReview(r: CommandRenderer): void {
    r.text(350, 50, 'Key Discovery: Faraday Cage', {
      fill: colors.accent,
      fontSize: 24,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.rect(50, 80, 600, 150, { fill: colors.bgCard, stroke: colors.border, rx: 12 });

    r.text(350, 110, 'Inside Conductors: E = 0 Always!', {
      fill: colors.accent,
      fontSize: 18,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    const implications = [
      '* Any conductor shields its interior from external electric fields',
      '* Does not need to be solid - a mesh works if holes are small enough',
      '* Lightning strikes on airplanes leave passengers unharmed',
      '* Sensitive electronics are protected in metal enclosures',
    ];

    implications.forEach((imp, i) => {
      r.text(70, 140 + i * 22, imp, { fill: colors.textSecondary, fontSize: 12 });
    });

    // Quote
    r.rect(100, 250, 500, 50, { fill: '#0a0f1a', stroke: colors.border, rx: 8 });
    r.text(350, 275, '"Millions of volts outside, nothing inside - pure physics magic!"', {
      fill: colors.primary,
      fontSize: 13,
      textAnchor: 'middle',
    });

    // Application icons
    const apps = [
      { icon: 'Aircraft', label: 'Lightning Protection' },
      { icon: 'MRI', label: 'Room Shielding' },
      { icon: 'Phone', label: 'EMP Protection' },
    ];

    apps.forEach((app, i) => {
      r.rect(120 + i * 180, 320, 140, 60, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
      r.text(190 + i * 180, 345, app.icon, { fill: colors.textPrimary, fontSize: 14, textAnchor: 'middle' });
      r.text(190 + i * 180, 365, app.label, { fill: colors.textMuted, fontSize: 10, textAnchor: 'middle' });
    });
  }

  // --- TRANSFER PHASE ---

  private renderTransfer(r: CommandRenderer): void {
    r.text(350, 35, 'Real-World Applications', {
      fill: colors.textPrimary,
      fontSize: 22,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // App tabs
    transferApps.forEach((app, i) => {
      const isSelected = i === this.selectedApp;
      const isCompleted = this.completedApps[i];

      r.rect(50 + i * 160, 60, 150, 35, {
        fill: isSelected ? colors.primary : colors.bgCard,
        stroke: isCompleted ? colors.success : colors.border,
        rx: 8,
        id: `app_${i}`,
      });
      r.text(125 + i * 160, 82, app.short, {
        fill: isSelected ? colors.textPrimary : colors.textSecondary,
        fontSize: 11,
        textAnchor: 'middle',
      });
    });

    // Selected app content
    const app = transferApps[this.selectedApp];
    r.rect(50, 105, 600, 280, { fill: colors.bgCard, stroke: colors.border, rx: 12 });

    r.text(70, 135, `[${app.icon}] ${app.title}`, { fill: colors.textPrimary, fontSize: 16, fontWeight: 'bold' });
    r.text(70, 155, app.tagline, { fill: colors.textMuted, fontSize: 11 });

    // Description
    r.text(70, 185, app.description.substring(0, 80), { fill: colors.textSecondary, fontSize: 11 });
    if (app.description.length > 80) {
      r.text(70, 200, app.description.substring(80), { fill: colors.textSecondary, fontSize: 11 });
    }

    // Connection to physics
    r.text(70, 230, 'Physics Connection:', { fill: colors.primary, fontSize: 12, fontWeight: 'bold' });
    r.text(70, 248, app.connection.substring(0, 90), { fill: colors.textSecondary, fontSize: 10 });
    if (app.connection.length > 90) {
      r.text(70, 262, app.connection.substring(90, 180), { fill: colors.textSecondary, fontSize: 10 });
    }

    // Stats
    r.text(70, 290, 'Key Stats:', { fill: colors.success, fontSize: 12, fontWeight: 'bold' });
    app.stats.slice(0, 2).forEach((stat, i) => {
      r.text(70, 308 + i * 15, '* ' + stat, { fill: colors.textSecondary, fontSize: 10 });
    });

    // Examples
    r.text(380, 290, 'Examples:', { fill: colors.warning, fontSize: 12, fontWeight: 'bold' });
    app.examples.slice(0, 2).forEach((ex, i) => {
      r.text(380, 308 + i * 15, '* ' + ex, { fill: colors.textSecondary, fontSize: 10 });
    });

    // Companies
    r.text(70, 355, 'Companies: ' + app.companies.join(', '), { fill: colors.textMuted, fontSize: 10 });

    // Progress indicator
    r.text(600, 375, `${this.completedApps.filter(c => c).length}/4`, {
      fill: colors.textMuted,
      fontSize: 12,
      textAnchor: 'middle',
    });
  }

  // --- TEST PHASE ---

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
    r.rect(50, 50, 600, 50, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
    r.text(350, 70, q.scenario.substring(0, 80), { fill: colors.primary, fontSize: 11, textAnchor: 'middle' });
    if (q.scenario.length > 80) {
      r.text(350, 85, q.scenario.substring(80), { fill: colors.primary, fontSize: 11, textAnchor: 'middle' });
    }

    // Question
    r.text(350, 125, q.question, {
      fill: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    // Answer options
    q.options.forEach((option, i) => {
      const isSelected = this.testAnswers[this.testQuestion] === i;

      r.rect(100, 150 + i * 55, 500, 45, {
        fill: isSelected ? colors.primary + '40' : colors.bgCard,
        stroke: isSelected ? colors.primary : colors.border,
        rx: 8,
        id: `answer_${i}`,
      });

      // Truncate long options
      const displayText = option.length > 60 ? option.substring(0, 60) + '...' : option;
      r.text(350, 178 + i * 55, displayText, {
        fill: isSelected ? colors.primary : colors.textSecondary,
        fontSize: 12,
        textAnchor: 'middle',
      });
    });
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

    r.text(350, 140, `Score: ${score} / ${testQuestions.length}`, {
      fill: colors.textPrimary,
      fontSize: 24,
      textAnchor: 'middle',
    });

    r.text(350, 180, passed ? 'You have mastered Electric Fields!' : 'Review the concepts and try again.', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Show a few key formulas
    const formulas = ['E = F/q', 'E = kQ/r^2', 'F = qE', 'E = V/d'];
    formulas.forEach((f, i) => {
      r.rect(150 + i * 110, 220, 100, 40, { fill: colors.bgCard, stroke: colors.border, rx: 8 });
      r.text(200 + i * 110, 245, f, { fill: colors.warning, fontSize: 14, textAnchor: 'middle' });
    });
  }

  // --- MASTERY PHASE ---

  private renderMastery(r: CommandRenderer): void {
    r.text(350, 80, 'Electric Field Master!', {
      fill: colors.textPrimary,
      fontSize: 32,
      fontWeight: 'bold',
      textAnchor: 'middle',
    });

    r.text(350, 120, 'You have mastered the fundamental concept of electric fields!', {
      fill: colors.textSecondary,
      fontSize: 14,
      textAnchor: 'middle',
    });

    // Achievement badges
    const badges = [
      { icon: 'E=F/q', label: 'Field Definition' },
      { icon: 'Lines', label: 'Field Lines' },
      { icon: 'Shield', label: 'Faraday Cage' },
      { icon: 'Apps', label: 'Applications' },
    ];

    badges.forEach((badge, i) => {
      r.rect(110 + i * 145, 160, 130, 80, { fill: colors.bgCard, stroke: colors.success, rx: 12 });
      r.text(175 + i * 145, 195, badge.icon, { fill: colors.textPrimary, fontSize: 16, textAnchor: 'middle' });
      r.text(175 + i * 145, 220, badge.label, { fill: colors.textMuted, fontSize: 11, textAnchor: 'middle' });
    });

    // Final formulas
    r.rect(150, 270, 400, 60, { fill: colors.bgCard, stroke: colors.border, rx: 12 });
    r.text(350, 295, 'E = kQ/r^2  |  E = V/d', { fill: colors.warning, fontSize: 18, textAnchor: 'middle' });
    r.text(350, 315, 'Field direction: toward - charges, away from + charges', {
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
          id: 'predict_toward',
          label: 'Toward (-) charge',
          variant: this.prediction === 'toward' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'predict_away',
          label: 'Away from (-) charge',
          variant: this.prediction === 'away' ? 'primary' : 'secondary',
        });
        if (this.prediction) {
          r.addButton({ id: 'next', label: 'Continue ->', variant: 'success' });
        }
        break;

      case 'play':
        r.addButton({
          id: 'config_single',
          label: 'Single',
          variant: this.selectedConfig === 'single' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'config_dipole',
          label: 'Dipole',
          variant: this.selectedConfig === 'dipole' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'config_parallel',
          label: 'Plates',
          variant: this.selectedConfig === 'parallel' ? 'primary' : 'secondary',
        });
        r.addToggle({
          id: 'field_lines',
          label: 'Field Lines',
          value: this.showFieldLines,
        });
        r.addToggle({
          id: 'field_vectors',
          label: 'Vectors',
          value: this.showFieldVectors,
        });
        r.addButton({ id: 'next', label: 'Continue ->', variant: 'success' });
        break;

      case 'twist_predict':
        r.addButton({
          id: 'twist_zero',
          label: 'E = 0 everywhere inside',
          variant: this.twistPrediction === 'zero' ? 'primary' : 'secondary',
        });
        r.addButton({
          id: 'twist_strong',
          label: 'Very strong field',
          variant: this.twistPrediction === 'strong' ? 'primary' : 'secondary',
        });
        if (this.twistPrediction) {
          r.addButton({ id: 'next', label: 'Continue ->', variant: 'success' });
        }
        break;

      case 'twist_play':
      case 'twist_review':
        r.addButton({ id: 'next', label: 'Continue ->', variant: 'primary' });
        break;

      case 'transfer':
        transferApps.forEach((_, i) => {
          r.addButton({
            id: `app_${i}`,
            label: transferApps[i].short,
            variant: this.selectedApp === i ? 'primary' : 'ghost',
          });
        });
        if (this.completedApps.every(c => c)) {
          r.addButton({ id: 'next', label: 'Take Quiz ->', variant: 'success' });
        }
        break;

      case 'test':
        if (!this.testSubmitted) {
          r.addButton({ id: 'test_prev', label: '<- Prev', variant: 'ghost', disabled: this.testQuestion === 0 });
          r.addButton({ id: 'test_next', label: 'Next ->', variant: 'ghost', disabled: this.testQuestion >= testQuestions.length - 1 });
          if (this.testAnswers.every(a => a !== null)) {
            r.addButton({ id: 'test_submit', label: 'Submit', variant: 'success' });
          }
        } else {
          const score = this.calculateTestScore();
          r.addButton({
            id: score >= 7 ? 'next' : 'back',
            label: score >= 7 ? 'Complete! ->' : 'Review',
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
      selectedConfig: this.selectedConfig,
      showFieldLines: this.showFieldLines,
      showFieldVectors: this.showFieldVectors,
      testChargePos: this.testChargePos,
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
    this.selectedConfig = (state.selectedConfig as 'single' | 'dipole' | 'parallel') || 'single';
    this.showFieldLines = (state.showFieldLines as boolean) ?? true;
    this.showFieldVectors = (state.showFieldVectors as boolean) ?? true;
    this.testChargePos = (state.testChargePos as { x: number; y: number }) || { x: 350, y: 200 };
    this.testQuestion = (state.testQuestion as number) || 0;
    this.testAnswers = (state.testAnswers as (number | null)[]) || Array(10).fill(null);
    this.testSubmitted = (state.testSubmitted as boolean) || false;
    this.selectedApp = (state.selectedApp as number) || 0;
    this.completedApps = (state.completedApps as boolean[]) || [false, false, false, false];
    this.guidedMode = (state.guidedMode as boolean) ?? true;

    // Restore charge configuration
    this.setConfiguration(this.selectedConfig);
  }
}

// === FACTORY FUNCTION ===
// Register this in server.ts: registry.register('electric_field', createElectricFieldGame);

export function createElectricFieldGame(sessionId: string): ElectricFieldGame {
  return new ElectricFieldGame(sessionId);
}
