// ============================================================================
// TwoBallCollisionGame - Elastic and Inelastic Collisions
// Physics: Momentum conservation (always), Energy conservation (elastic only)
// Elastic: v1f = ((m1-m2)/(m1+m2))v1i + (2m2/(m1+m2))v2i
// Inelastic: v1f = v2f = (m1*v1i + m2*v2i)/(m1+m2)
// ============================================================================

import { BaseGame } from '../../types/GameInstance.js';
import { GameFrame } from '../../types/DrawCommand.js';
import { UserInput, SessionConfig } from '../../types/UserInput.js';
import { CommandRenderer } from '../../renderer/CommandRenderer.js';

type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';
type CollisionType = 'elastic' | 'inelastic';
type MassRatio = 'equal' | 'heavy_light' | 'light_heavy';

const PHASES: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];

interface CollisionState {
  phase: Phase;
  prediction: string | null;
  twistPrediction: string | null;
  collisionType: CollisionType;
  massRatio: MassRatio;
  isAnimating: boolean;
  animationPhase: 'before' | 'collision' | 'after';
  ball1Pos: number;
  ball2Pos: number;
  ball1Vel: number;
  ball2Vel: number;
  experimentsRun: number;
  twistExperimentsRun: number;
  completedApps: number;
  testAnswers: (number | null)[];
  showTestResults: boolean;
  testScore: number;
  sessionId: string;
}

// Test questions - correctIndex is PROTECTED
const TEST_QUESTIONS = [
  {
    scenario: 'Two identical billiard balls collide head-on. Ball A is moving, Ball B is stationary.',
    question: 'In a perfectly elastic collision, what happens?',
    options: [
      'Both balls move forward together',
      "Ball A stops, Ball B moves with Ball A's original speed",
      'Both balls bounce backward',
      'Ball B stays still, Ball A bounces back'
    ],
    correctIndex: 1,
    explanation: "In elastic collisions between equal masses, momentum and energy conservation require complete velocity exchange-Ball A stops, Ball B moves with A's original velocity."
  },
  {
    scenario: 'A golf ball and a bowling ball collide head-on, both moving at the same speed.',
    question: 'After collision, which experiences the greater speed change?',
    options: [
      'The bowling ball (more mass means more change)',
      'The golf ball (lighter objects change more)',
      'Both change equally (same initial speed)',
      'Neither changes (momentum cancels)'
    ],
    correctIndex: 1,
    explanation: 'Momentum conservation requires mv changes balance. Since m is smaller for the golf ball, v must change more to keep momentum equal but opposite.'
  },
  {
    scenario: 'Two cars of equal mass collide and stick together.',
    question: 'This is called:',
    options: [
      'An elastic collision',
      'A perfectly inelastic collision',
      'An impossible collision',
      'A momentum-violating collision'
    ],
    correctIndex: 1,
    explanation: "When objects stick together after collision, it's a perfectly inelastic collision-maximum kinetic energy is lost while momentum is still conserved."
  },
  {
    scenario: 'In a particle accelerator, two protons collide and create a new particle.',
    question: 'Which quantity is NOT necessarily conserved?',
    options: [
      'Momentum',
      'Kinetic energy (it becomes mass!)',
      'Total energy',
      'Electric charge'
    ],
    correctIndex: 1,
    explanation: 'When new particles are created, kinetic energy converts to mass (E=mc^2). Total energy and momentum are conserved, but kinetic energy alone is not.'
  },
  {
    scenario: "A Newton's cradle has 5 steel balls. You pull back and release 2 balls.",
    question: 'What happens on the other side?',
    options: [
      '1 ball swings out twice as high',
      '2 balls swing out at the same speed',
      '3 balls swing out at lower speed',
      '5 balls move slightly'
    ],
    correctIndex: 1,
    explanation: 'Both momentum AND energy must be conserved. Only 2 balls out at the same speed satisfies both conditions. Other options violate one or both laws.'
  },
  {
    scenario: 'A 2kg ball moving at 3m/s hits a stationary 1kg ball elastically.',
    question: 'What is the total momentum before and after?',
    options: [
      'Before: 6 kg-m/s, After: 3 kg-m/s',
      'Before: 6 kg-m/s, After: 6 kg-m/s',
      'Before: 3 kg-m/s, After: 6 kg-m/s',
      'It depends on the collision angle'
    ],
    correctIndex: 1,
    explanation: 'Momentum is ALWAYS conserved: p = mv = 2kg x 3m/s = 6 kg-m/s, and this exact amount exists after the collision, just distributed differently.'
  },
  {
    scenario: "A car crash test shows the vehicle's front end crumples significantly.",
    question: 'Why is this considered a safety feature?',
    options: [
      'It makes the car lighter',
      'It converts kinetic energy to deformation energy',
      "It increases the car's momentum",
      'It reflects the impact force backward'
    ],
    correctIndex: 1,
    explanation: 'The crumpling converts passenger kinetic energy into work done deforming metal. This inelastic process protects occupants by absorbing energy that would otherwise harm them.'
  },
  {
    scenario: 'A super ball vs a clay ball, same mass, dropped from same height onto concrete.',
    question: 'Which exerts more force on the ground?',
    options: [
      'Clay ball (inelastic means more force)',
      'Super ball (bounces, so more momentum change)',
      'Same force (same mass and drop height)',
      "Neither exerts force (momentum is conserved)"
    ],
    correctIndex: 1,
    explanation: 'The super ball reverses direction, so its momentum change is 2mv (stops then rebounds) vs mv for clay (just stops). More momentum change means more force!'
  },
  {
    scenario: 'In elastic collision, a small ball hits a large stationary ball.',
    question: 'The small ball bounces back. What happened to its kinetic energy?',
    options: [
      'It was destroyed',
      'Most transferred to the large ball',
      'The small ball keeps most of it (reversed direction)',
      'Converted to potential energy'
    ],
    correctIndex: 2,
    explanation: 'Since the large ball barely moves, it gains little kinetic energy. The small ball reverses direction but keeps most of its speed, thus most of its kinetic energy.'
  },
  {
    scenario: 'A hockey puck slides on ice and hits the boards, sticking momentarily before falling.',
    question: 'What type of collision is this?',
    options: [
      'Elastic (ice has low friction)',
      "Inelastic (puck doesn't bounce back)",
      "Neither (momentum wasn't conserved)",
      'Super-elastic (energy was added)'
    ],
    correctIndex: 1,
    explanation: 'The puck sticks and stops, converting all kinetic energy to sound, heat, and deformation. This is an inelastic collision-momentum transferred to the entire rink!'
  }
];

// Transfer applications
const APPLICATIONS = [
  {
    icon: 'pool',
    title: 'Pool & Billiards',
    short: 'Game Physics',
    tagline: 'The perfect collision laboratory',
    description: 'Pool is one of the closest real-world examples to ideal elastic collisions. Players must intuitively understand momentum transfer.',
    connection: "A straight shot where the cue ball stops and the target ball moves forward is elastic collision between equal masses-complete momentum transfer!",
    stats: [
      { value: '95%', label: 'Energy conserved' },
      { value: '0.92', label: 'Elasticity coefficient' },
      { value: '20mph', label: 'Typical break speed' }
    ]
  },
  {
    icon: 'car',
    title: 'Car Crash Physics',
    short: 'Safety Engineering',
    tagline: 'Making inelastic collisions save lives',
    description: 'Car crashes are highly inelastic-kinetic energy is deliberately converted to deformation energy to protect occupants.',
    connection: 'Unlike pool balls, we WANT car collisions to be inelastic! The energy "lost" to crushing metal is energy NOT transferred to passengers.',
    stats: [
      { value: '70%', label: 'Energy absorbed' },
      { value: '50ms', label: 'Crash duration' },
      { value: '90%', label: 'Fatality reduction' }
    ]
  },
  {
    icon: 'atom',
    title: 'Particle Physics',
    short: 'Subatomic World',
    tagline: "Collisions reveal the universe's secrets",
    description: 'Particle accelerators smash particles at near light-speed. Collision products reveal fundamental particles and forces.',
    connection: 'Particle collisions can create NEW particles from pure energy (E=mc^2). Momentum is always conserved, even when new matter appears!',
    stats: [
      { value: '99.999%', label: 'Speed of light' },
      { value: '13 TeV', label: 'Collision energy' },
      { value: '600M', label: 'Collisions/sec' }
    ]
  },
  {
    icon: 'golf',
    title: 'Golf Impact Physics',
    short: 'Sports Equipment',
    tagline: 'Maximizing energy transfer',
    description: 'Golf club-ball collision is engineered for maximum energy transfer. The "sweet spot" represents optimal elastic collision.',
    connection: 'A well-struck golf shot approaches perfect elastic collision-nearly all clubhead energy transfers to the ball.',
    stats: [
      { value: '0.83', label: 'COR limit' },
      { value: '1.5x', label: 'Ball/club speed' },
      { value: '180mph', label: 'Pro ball speed' }
    ]
  }
];

export class TwoBallCollisionGame extends BaseGame {
  readonly gameType = 'two_ball_collision';
  readonly gameTitle = 'Two Ball Collision: Momentum and Energy';

  private state: CollisionState;
  private animationTimer: number = 0;

  constructor(sessionId: string, _config?: SessionConfig) {
    super(sessionId);
    this.state = {
      phase: 'hook',
      prediction: null,
      twistPrediction: null,
      collisionType: 'elastic',
      massRatio: 'equal',
      isAnimating: false,
      animationPhase: 'before',
      ball1Pos: 50,
      ball2Pos: 250,
      ball1Vel: 0,
      ball2Vel: 0,
      experimentsRun: 0,
      twistExperimentsRun: 0,
      completedApps: 0,
      testAnswers: Array(10).fill(null),
      showTestResults: false,
      testScore: 0,
      sessionId
    };
  }

  // PROTECTED: Calculate elastic collision final velocities
  private calculateElasticCollision(m1: number, m2: number, v1i: number, v2i: number): { v1f: number; v2f: number } {
    const v1f = ((m1 - m2) / (m1 + m2)) * v1i + ((2 * m2) / (m1 + m2)) * v2i;
    const v2f = ((2 * m1) / (m1 + m2)) * v1i + ((m2 - m1) / (m1 + m2)) * v2i;
    return { v1f, v2f };
  }

  // PROTECTED: Calculate inelastic collision final velocity
  private calculateInelasticCollision(m1: number, m2: number, v1i: number, v2i: number): number {
    return (m1 * v1i + m2 * v2i) / (m1 + m2);
  }

  // PROTECTED: Get masses based on ratio
  private getMasses(): { m1: number; m2: number } {
    switch (this.state.massRatio) {
      case 'heavy_light': return { m1: 3, m2: 1 };
      case 'light_heavy': return { m1: 1, m2: 3 };
      default: return { m1: 1, m2: 1 };
    }
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

  private runCollision(): void {
    if (this.state.isAnimating) return;

    // Reset positions
    this.state.ball1Pos = 50;
    this.state.ball2Pos = 250;
    this.state.animationPhase = 'before';
    this.state.isAnimating = true;
    this.animationTimer = 0;

    const { m1, m2 } = this.getMasses();
    const v1i = 4;
    const v2i = 0;

    // Pre-calculate final velocities (PROTECTED)
    if (this.state.collisionType === 'elastic') {
      const { v1f, v2f } = this.calculateElasticCollision(m1, m2, v1i, v2i);
      this.state.ball1Vel = v1f;
      this.state.ball2Vel = v2f;
    } else {
      const vf = this.calculateInelasticCollision(m1, m2, v1i, v2i);
      this.state.ball1Vel = vf;
      this.state.ball2Vel = vf;
    }
  }

  handleInput(input: UserInput): void {
    if (input.type === 'button_click') {
      switch (input.id) {
        case 'start':
          this.state.phase = 'predict';
          break;
        case 'predict_both':
          this.state.prediction = 'both_conserve';
          break;
        case 'predict_momentum':
          this.state.prediction = 'momentum_only';
          break;
        case 'predict_energy':
          this.state.prediction = 'energy_only';
          break;
        case 'predict_neither':
          this.state.prediction = 'neither';
          break;
        case 'start_experiments':
          if (this.state.prediction) this.state.phase = 'play';
          break;
        case 'type_elastic':
          if (!this.state.isAnimating) {
            this.state.collisionType = 'elastic';
            this.state.ball1Pos = 50;
            this.state.ball2Pos = 250;
            this.state.animationPhase = 'before';
          }
          break;
        case 'type_inelastic':
          if (!this.state.isAnimating) {
            this.state.collisionType = 'inelastic';
            this.state.ball1Pos = 50;
            this.state.ball2Pos = 250;
            this.state.animationPhase = 'before';
          }
          break;
        case 'run_collision':
          if (!this.state.isAnimating) {
            this.runCollision();
            this.state.experimentsRun++;
          }
          break;
        case 'understand_physics':
          this.state.phase = 'review';
          break;
        case 'try_mass_twist':
          this.state.phase = 'twist_predict';
          break;
        case 'twist_heavy':
          this.state.twistPrediction = 'heavy_wins';
          break;
        case 'twist_light':
          this.state.twistPrediction = 'light_wins';
          break;
        case 'twist_same':
          this.state.twistPrediction = 'same';
          break;
        case 'test_mass_ratios':
          if (this.state.twistPrediction) this.state.phase = 'twist_play';
          break;
        case 'mass_equal':
          if (!this.state.isAnimating) {
            this.state.massRatio = 'equal';
            this.state.ball1Pos = 50;
            this.state.ball2Pos = 250;
            this.state.animationPhase = 'before';
          }
          break;
        case 'mass_heavy_light':
          if (!this.state.isAnimating) {
            this.state.massRatio = 'heavy_light';
            this.state.ball1Pos = 50;
            this.state.ball2Pos = 250;
            this.state.animationPhase = 'before';
          }
          break;
        case 'mass_light_heavy':
          if (!this.state.isAnimating) {
            this.state.massRatio = 'light_heavy';
            this.state.ball1Pos = 50;
            this.state.ball2Pos = 250;
            this.state.animationPhase = 'before';
          }
          break;
        case 'run_twist_collision':
          if (!this.state.isAnimating) {
            this.runCollision();
            this.state.twistExperimentsRun++;
          }
          break;
        case 'review_findings':
          this.state.phase = 'twist_review';
          break;
        case 'see_applications':
          this.state.phase = 'transfer';
          break;
        case 'next_app':
          if (this.state.completedApps < APPLICATIONS.length) {
            this.state.completedApps++;
          }
          break;
        case 'take_test':
          this.state.phase = 'test';
          break;
        case 'submit_test':
          if (this.state.testAnswers.every(a => a !== null)) {
            this.state.testScore = this.calculateScore();
            this.state.showTestResults = true;
          }
          break;
        case 'complete_lesson':
          this.state.phase = 'mastery';
          break;
        case 'finish':
          // Could trigger completion callback
          break;
      }

      // Handle test answer buttons
      if (input.id.startsWith('test_')) {
        const parts = input.id.split('_');
        if (parts.length === 3) {
          const qIndex = parseInt(parts[1]);
          const aIndex = parseInt(parts[2]);
          this.state.testAnswers[qIndex] = aIndex;
        }
      }
    }
  }

  getCurrentPhase(): string {
    return this.state.phase;
  }

  update(deltaTime: number): void {
    if (!this.state.isAnimating) return;

    this.animationTimer += deltaTime;

    // Animation logic
    if (this.state.animationPhase === 'before') {
      // Move ball1 toward ball2
      this.state.ball1Pos += 3;
      if (this.state.ball1Pos >= 145) {
        this.state.animationPhase = 'collision';
        this.animationTimer = 0;
      }
    } else if (this.state.animationPhase === 'collision') {
      // Brief collision pause
      if (this.animationTimer > 0.3) {
        this.state.animationPhase = 'after';
        this.animationTimer = 0;
      }
    } else if (this.state.animationPhase === 'after') {
      // Move balls according to final velocities
      this.state.ball1Pos += this.state.ball1Vel * 2;
      this.state.ball2Pos += this.state.ball2Vel * 2;

      // Stop when ball2 exits or ball1 goes off screen
      if (this.state.ball2Pos > 350 || this.state.ball1Pos < 0) {
        this.state.isAnimating = false;
      }
    }
  }

  render(): GameFrame {
    const r = new CommandRenderer();

    r.setProgress({
      id: 'phase_progress',
      current: PHASES.indexOf(this.state.phase),
      total: PHASES.length,
      labels: ['Hook', 'Predict', 'Lab', 'Review', 'Twist', 'Twist Lab', 'Twist Review', 'Transfer', 'Test', 'Mastery']
    });

    switch (this.state.phase) {
      case 'hook': this.renderHook(r); break;
      case 'predict': this.renderPredict(r); break;
      case 'play': this.renderPlay(r); break;
      case 'review': this.renderReview(r); break;
      case 'twist_predict': this.renderTwistPredict(r); break;
      case 'twist_play': this.renderTwistPlay(r); break;
      case 'twist_review': this.renderTwistReview(r); break;
      case 'transfer': this.renderTransfer(r); break;
      case 'test': this.renderTest(r); break;
      case 'mastery': this.renderMastery(r); break;
    }

    return r.toFrame(Date.now());
  }

  private renderHook(r: CommandRenderer): void {
    r.text(200, 30, 'The Collision Mystery', { fill: '#1e293b', fontSize: 24, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 55, 'Why do some balls bounce and others stick together?', { fill: '#64748b', fontSize: 13, textAnchor: 'middle' });

    // Elastic scenario
    r.text(200, 85, 'SUPER BALL', { fill: '#22c55e', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });
    r.rect(40, 100, 320, 8, { fill: '#334155' }); // Track
    r.circle(100, 96, 18, { fill: '#3b82f6' }); // Ball 1
    r.circle(200, 96, 18, { fill: '#ef4444' }); // Ball 2

    // Inelastic scenario
    r.text(200, 150, 'CLAY BALL', { fill: '#f59e0b', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });
    r.rect(40, 165, 320, 8, { fill: '#334155' }); // Track
    r.circle(100, 161, 18, { fill: '#3b82f6' }); // Ball 1
    r.circle(200, 161, 18, { fill: '#f59e0b' }); // Ball 2

    r.text(200, 200, 'A super ball bounces back. Clay sticks together.', { fill: '#1e293b', fontSize: 12, textAnchor: 'middle' });
    r.text(200, 220, 'Both conserve momentum, but something is different...', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 245, 'Where does the missing energy go?', { fill: '#6366f1', fontSize: 13, textAnchor: 'middle', fontWeight: 'bold' });

    r.addButton({ id: 'start', label: 'Make Your Prediction', variant: 'primary' });
  }

  private renderPredict(r: CommandRenderer): void {
    r.text(200, 25, 'Your Prediction', { fill: '#1e293b', fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 50, "What's conserved in collisions?", { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });

    const options = [
      { id: 'predict_both', text: 'Both momentum and energy always conserved', selected: this.state.prediction === 'both_conserve' },
      { id: 'predict_momentum', text: 'Momentum always, energy sometimes', selected: this.state.prediction === 'momentum_only' },
      { id: 'predict_energy', text: 'Energy always, momentum sometimes', selected: this.state.prediction === 'energy_only' },
      { id: 'predict_neither', text: 'Neither is truly conserved', selected: this.state.prediction === 'neither' }
    ];

    for (let i = 0; i < options.length; i++) {
      r.addButton({ id: options[i].id, label: options[i].text, variant: options[i].selected ? 'primary' : 'secondary' });
    }

    if (this.state.prediction) {
      r.rect(50, 220, 300, 40, { fill: '#eff6ff' });
      r.text(200, 245, "Interesting hypothesis! Let's test with real collisions.", { fill: '#1d4ed8', fontSize: 11, textAnchor: 'middle' });
      r.addButton({ id: 'start_experiments', label: 'Start Experiments', variant: 'success' });
    }
  }

  private renderPlay(r: CommandRenderer): void {
    const { m1, m2 } = this.getMasses();
    const ball1Radius = m1 === 3 ? 26 : m1 === 1 && m2 === 3 ? 18 : 22;
    const ball2Radius = m2 === 3 ? 26 : m2 === 1 && m1 === 3 ? 18 : 22;

    r.text(200, 20, 'Collision Lab', { fill: '#1e293b', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 40, 'Compare elastic vs inelastic', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    // Track
    r.rect(20, 120, 360, 10, { fill: '#e2e8f0' });

    // Ball 1
    r.circle(this.state.ball1Pos, 105, ball1Radius, { fill: '#3b82f6' });
    r.text(this.state.ball1Pos, 110, 'm', { fill: 'white', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });

    // Ball 2
    const ball2Color = this.state.collisionType === 'elastic' ? '#ef4444' : '#f59e0b';
    r.circle(this.state.ball2Pos, 105, ball2Radius, { fill: ball2Color });
    r.text(this.state.ball2Pos, 110, 'm', { fill: 'white', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });

    // Collision effect
    if (this.state.animationPhase === 'collision') {
      r.circle(170, 105, 35, { fill: '#fcd34d' });
    }

    // Type label
    r.text(200, 155, this.state.collisionType === 'elastic' ? 'ELASTIC (Bouncy)' : 'INELASTIC (Sticky)', {
      fill: this.state.collisionType === 'elastic' ? '#22c55e' : '#f59e0b',
      fontSize: 11,
      textAnchor: 'middle',
      fontWeight: 'bold'
    });

    // Collision type selector
    r.text(200, 180, 'Select Collision Type:', { fill: '#1e293b', fontSize: 11, textAnchor: 'middle' });
    r.addButton({ id: 'type_elastic', label: 'Elastic (Bouncy)', variant: this.state.collisionType === 'elastic' ? 'success' : 'secondary' });
    r.addButton({ id: 'type_inelastic', label: 'Inelastic (Sticky)', variant: this.state.collisionType === 'inelastic' ? 'warning' : 'secondary' });

    // Run button
    r.addButton({ id: 'run_collision', label: this.state.isAnimating ? 'Colliding...' : 'Run Collision', variant: 'primary' });

    // Result
    if (this.state.animationPhase === 'after' && !this.state.isAnimating) {
      const message = this.state.collisionType === 'elastic'
        ? 'Elastic: Ball 1 bounces back, Ball 2 moves forward!'
        : 'Inelastic: Balls stick together and move as one!';
      r.rect(30, 230, 340, 40, { fill: this.state.collisionType === 'elastic' ? '#dcfce7' : '#fef3c7' });
      r.text(200, 255, message, { fill: this.state.collisionType === 'elastic' ? '#166534' : '#92400e', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });
    }

    r.text(200, 290, `Experiments run: ${this.state.experimentsRun} (try both types!)`, { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });

    if (this.state.experimentsRun >= 2) {
      r.addButton({ id: 'understand_physics', label: 'Understand the Physics', variant: 'success' });
    }
  }

  private renderReview(r: CommandRenderer): void {
    r.text(200, 25, 'Conservation Laws', { fill: '#1e293b', fontSize: 20, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 45, 'The fundamental rules of collisions', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    // Momentum (always conserved)
    r.rect(30, 65, 340, 50, { fill: '#f0fdf4' });
    r.text(200, 85, 'MOMENTUM (p = mv)', { fill: '#6366f1', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 105, 'p1i + p2i = p1f + p2f (ALWAYS CONSERVED!)', { fill: '#22c55e', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });

    // Energy (depends on collision type)
    r.rect(30, 125, 165, 60, { fill: '#dcfce7' });
    r.text(112, 145, 'Elastic:', { fill: '#166534', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(112, 165, 'Momentum + KE', { fill: '#15803d', fontSize: 9, textAnchor: 'middle' });
    r.text(112, 180, 'BOTH conserved', { fill: '#22c55e', fontSize: 9, textAnchor: 'middle', fontWeight: 'bold' });

    r.rect(205, 125, 165, 60, { fill: '#fef3c7' });
    r.text(287, 145, 'Inelastic:', { fill: '#92400e', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(287, 165, 'KE -> heat/deformation', { fill: '#78350f', fontSize: 9, textAnchor: 'middle' });
    r.text(287, 180, 'Only momentum conserved', { fill: '#f59e0b', fontSize: 9, textAnchor: 'middle', fontWeight: 'bold' });

    // Key insight
    r.rect(30, 200, 340, 50, { fill: '#fef3c7' });
    r.text(200, 220, 'The Key Difference', { fill: '#92400e', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 240, 'Momentum conservation is a LAW. Energy conservation in KE is a PROPERTY.', { fill: '#78350f', fontSize: 9, textAnchor: 'middle' });

    r.addButton({ id: 'try_mass_twist', label: 'Try Mass Twist', variant: 'primary' });
  }

  private renderTwistPredict(r: CommandRenderer): void {
    r.text(200, 30, 'The Mass Twist', { fill: '#8b5cf6', fontSize: 22, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 55, 'What if one ball is heavier?', { fill: '#64748b', fontSize: 13, textAnchor: 'middle' });

    r.rect(40, 75, 320, 50, { fill: '#f5f3ff' });
    r.text(200, 95, 'A heavy ball (3m) hits a light ball (m), or vice versa.', { fill: '#6d28d9', fontSize: 11, textAnchor: 'middle' });
    r.text(200, 115, 'What happens in an elastic collision?', { fill: '#6d28d9', fontSize: 11, textAnchor: 'middle', fontWeight: 'bold' });

    r.addButton({ id: 'twist_heavy', label: 'Heavy ball always pushes through, light bounces back', variant: this.state.twistPrediction === 'heavy_wins' ? 'primary' : 'secondary' });
    r.addButton({ id: 'twist_light', label: 'Light ball gains more speed after collision', variant: this.state.twistPrediction === 'light_wins' ? 'primary' : 'secondary' });
    r.addButton({ id: 'twist_same', label: "Mass doesn't affect the outcome", variant: this.state.twistPrediction === 'same' ? 'primary' : 'secondary' });

    if (this.state.twistPrediction) {
      r.addButton({ id: 'test_mass_ratios', label: 'Test Mass Ratios', variant: 'success' });
    }
  }

  private renderTwistPlay(r: CommandRenderer): void {
    const { m1, m2 } = this.getMasses();
    const ball1Radius = this.state.massRatio === 'heavy_light' ? 28 : this.state.massRatio === 'light_heavy' ? 16 : 22;
    const ball2Radius = this.state.massRatio === 'light_heavy' ? 28 : this.state.massRatio === 'heavy_light' ? 16 : 22;

    r.text(200, 20, 'Mass Ratio Lab', { fill: '#8b5cf6', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 40, 'Elastic collisions with different masses', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    // Track
    r.rect(20, 100, 360, 10, { fill: '#e2e8f0' });

    // Balls
    r.circle(this.state.ball1Pos, 85, ball1Radius, { fill: '#3b82f6' });
    r.text(this.state.ball1Pos, 90, this.state.massRatio === 'heavy_light' ? '3m' : 'm', { fill: 'white', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });

    r.circle(this.state.ball2Pos, 85, ball2Radius, { fill: '#ef4444' });
    r.text(this.state.ball2Pos, 90, this.state.massRatio === 'light_heavy' ? '3m' : 'm', { fill: 'white', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });

    // Mass selector
    r.text(200, 135, 'Select Mass Combination:', { fill: '#1e293b', fontSize: 11, textAnchor: 'middle' });
    r.addButton({ id: 'mass_equal', label: 'Equal (m vs m)', variant: this.state.massRatio === 'equal' ? 'primary' : 'secondary' });
    r.addButton({ id: 'mass_heavy_light', label: 'Heavy->Light (3m vs m)', variant: this.state.massRatio === 'heavy_light' ? 'primary' : 'secondary' });
    r.addButton({ id: 'mass_light_heavy', label: 'Light->Heavy (m vs 3m)', variant: this.state.massRatio === 'light_heavy' ? 'primary' : 'secondary' });

    r.addButton({ id: 'run_twist_collision', label: this.state.isAnimating ? 'Colliding...' : 'Run Collision', variant: 'primary' });

    // Result
    if (this.state.animationPhase === 'after' && !this.state.isAnimating) {
      let message = '';
      if (this.state.massRatio === 'equal') {
        message = 'Equal masses: Ball 1 stops, Ball 2 takes all velocity!';
      } else if (this.state.massRatio === 'heavy_light') {
        message = 'Heavy hits light: Heavy continues forward (slower), light zooms off!';
      } else {
        message = 'Light hits heavy: Light bounces back, heavy barely moves!';
      }
      r.rect(30, 210, 340, 40, { fill: '#f5f3ff' });
      r.text(200, 235, message, { fill: '#6d28d9', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });
    }

    r.text(200, 270, `Experiments: ${this.state.twistExperimentsRun} (try all three!)`, { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });

    if (this.state.twistExperimentsRun >= 2) {
      r.addButton({ id: 'review_findings', label: 'Review Findings', variant: 'success' });
    }
  }

  private renderTwistReview(r: CommandRenderer): void {
    r.text(200, 25, 'Mass Effects Explained', { fill: '#8b5cf6', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 45, 'How mass ratio changes outcomes', { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

    // Equal
    r.rect(30, 60, 340, 35, { fill: '#f8fafc' });
    r.text(200, 82, 'Equal: Complete velocity transfer (Ball 1 stops)', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });

    // Heavy -> Light
    r.rect(30, 105, 340, 35, { fill: '#f8fafc' });
    r.text(200, 127, 'Heavy->Light: Both move forward, light moves faster', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });

    // Light -> Heavy
    r.rect(30, 150, 340, 35, { fill: '#f8fafc' });
    r.text(200, 172, 'Light->Heavy: Light bounces back, heavy moves slowly', { fill: '#64748b', fontSize: 10, textAnchor: 'middle' });

    // Key insight
    r.rect(30, 200, 340, 60, { fill: '#fef3c7' });
    r.text(200, 220, 'Mass Ratio Rule', { fill: '#92400e', fontSize: 12, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 240, 'In elastic collisions, lighter objects change velocity more.', { fill: '#78350f', fontSize: 10, textAnchor: 'middle' });
    r.text(200, 255, 'Think: ping-pong ball vs bowling ball!', { fill: '#78350f', fontSize: 9, textAnchor: 'middle' });

    r.addButton({ id: 'see_applications', label: 'See Applications', variant: 'primary' });
  }

  private renderTransfer(r: CommandRenderer): void {
    r.text(200, 20, 'Real-World Collisions', { fill: '#1e293b', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });

    if (this.state.completedApps < APPLICATIONS.length) {
      const app = APPLICATIONS[this.state.completedApps];

      r.rect(20, 45, 360, 200, { fill: 'white' });
      r.text(200, 70, app.title, { fill: '#6366f1', fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });
      r.text(200, 90, app.tagline, { fill: '#64748b', fontSize: 11, textAnchor: 'middle' });

      r.text(200, 115, app.description, { fill: '#1e293b', fontSize: 10, textAnchor: 'middle' });

      r.rect(40, 130, 320, 50, { fill: '#eff6ff' });
      r.text(200, 150, 'Connection:', { fill: '#1d4ed8', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });
      r.text(200, 170, app.connection, { fill: '#1d4ed8', fontSize: 9, textAnchor: 'middle' });

      // Stats
      for (let i = 0; i < app.stats.length; i++) {
        const x = 80 + i * 100;
        r.text(x, 205, app.stats[i].value, { fill: '#6366f1', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });
        r.text(x, 220, app.stats[i].label, { fill: '#64748b', fontSize: 8, textAnchor: 'middle' });
      }

      r.addButton({ id: 'next_app', label: this.state.completedApps < APPLICATIONS.length - 1 ? 'Next Application' : 'Complete Applications', variant: 'primary' });
    } else {
      r.rect(50, 70, 300, 100, { fill: '#dcfce7' });
      r.text(200, 100, 'Applications Complete!', { fill: '#166534', fontSize: 16, textAnchor: 'middle', fontWeight: 'bold' });
      r.text(200, 125, 'From pool tables to particle accelerators,', { fill: '#15803d', fontSize: 11, textAnchor: 'middle' });
      r.text(200, 145, 'collision physics is everywhere!', { fill: '#15803d', fontSize: 11, textAnchor: 'middle' });

      r.addButton({ id: 'take_test', label: 'Take the Test', variant: 'primary' });
    }
  }

  private renderTest(r: CommandRenderer): void {
    r.text(200, 20, 'Knowledge Check', { fill: '#1e293b', fontSize: 18, textAnchor: 'middle', fontWeight: 'bold' });

    if (!this.state.showTestResults) {
      const answered = this.state.testAnswers.filter(a => a !== null).length;
      r.text(200, 45, `${answered}/${TEST_QUESTIONS.length} answered`, { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });

      // Question indicators
      for (let i = 0; i < TEST_QUESTIONS.length; i++) {
        const x = 50 + (i % 5) * 65;
        const y = 65 + Math.floor(i / 5) * 35;
        const fill = this.state.testAnswers[i] !== null ? '#22c55e' : '#e2e8f0';
        r.rect(x, y, 55, 25, { fill });
        r.text(x + 27, y + 17, `Q${i + 1}`, { fill: this.state.testAnswers[i] !== null ? 'white' : '#64748b', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });

        // Answer buttons for each question
        for (let j = 0; j < 4; j++) {
          r.addButton({ id: `test_${i}_${j}`, label: `Q${i + 1} Opt ${j + 1}`, variant: this.state.testAnswers[i] === j ? 'primary' : 'secondary' });
        }
      }

      if (answered >= TEST_QUESTIONS.length) {
        r.addButton({ id: 'submit_test', label: 'Submit Answers', variant: 'success' });
      }
    } else {
      const score = this.state.testScore;
      const percentage = score * 10;

      r.text(200, 70, `${score}/10 (${percentage}%)`, { fill: score >= 8 ? '#22c55e' : score >= 6 ? '#f59e0b' : '#ef4444', fontSize: 28, textAnchor: 'middle', fontWeight: 'bold' });
      r.text(200, 100, score >= 8 ? 'Excellent! Collision physics mastered!' : score >= 6 ? 'Good grasp of conservation laws!' : 'Review the concepts and try again!', { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });

      // Result summary
      for (let i = 0; i < TEST_QUESTIONS.length; i++) {
        const x = 50 + (i % 5) * 65;
        const y = 130 + Math.floor(i / 5) * 30;
        const isCorrect = this.state.testAnswers[i] === TEST_QUESTIONS[i].correctIndex;
        r.rect(x, y, 55, 22, { fill: isCorrect ? '#dcfce7' : '#fee2e2' });
        r.text(x + 27, y + 15, isCorrect ? 'OK' : 'X', { fill: isCorrect ? '#166534' : '#dc2626', fontSize: 10, textAnchor: 'middle', fontWeight: 'bold' });
      }

      r.addButton({ id: 'complete_lesson', label: 'Complete Lesson', variant: 'success' });
    }
  }

  private renderMastery(r: CommandRenderer): void {
    r.text(200, 30, 'Collision Physics Mastered!', { fill: '#1e293b', fontSize: 22, textAnchor: 'middle', fontWeight: 'bold' });
    r.text(200, 55, "You've conquered conservation laws!", { fill: '#64748b', fontSize: 12, textAnchor: 'middle' });

    // What you learned
    r.rect(40, 75, 320, 140, { fill: '#f5f3ff' });
    r.text(200, 95, 'What You Learned:', { fill: '#6366f1', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });

    const learnings = [
      'Momentum Conservation: p1i + p2i = p1f + p2f (ALWAYS!)',
      'Elastic: Both momentum AND KE conserved',
      'Inelastic: Only momentum; KE becomes heat/deformation',
      'Mass Effects: Lighter objects change velocity more'
    ];

    for (let i = 0; i < learnings.length; i++) {
      r.text(200, 120 + i * 22, learnings[i], { fill: '#4c1d95', fontSize: 10, textAnchor: 'middle' });
    }

    // Score
    r.rect(100, 225, 200, 50, { fill: '#dcfce7' });
    r.text(200, 250, `Test Score: ${this.state.testScore}/10 (${this.state.testScore * 10}%)`, { fill: '#166534', fontSize: 14, textAnchor: 'middle', fontWeight: 'bold' });

    r.addButton({ id: 'finish', label: 'Complete Lesson', variant: 'success' });
  }

  getState(): Record<string, unknown> {
    return {
      phase: this.state.phase,
      prediction: this.state.prediction,
      twistPrediction: this.state.twistPrediction,
      collisionType: this.state.collisionType,
      massRatio: this.state.massRatio,
      isAnimating: this.state.isAnimating,
      animationPhase: this.state.animationPhase,
      ball1Pos: this.state.ball1Pos,
      ball2Pos: this.state.ball2Pos,
      experimentsRun: this.state.experimentsRun,
      twistExperimentsRun: this.state.twistExperimentsRun,
      completedApps: this.state.completedApps,
      showTestResults: this.state.showTestResults,
      testScore: this.state.showTestResults ? this.state.testScore : null,
      answeredCount: this.state.testAnswers.filter(a => a !== null).length
    };
  }

  restoreState(state: Record<string, unknown>): void {
    if (state.phase && PHASES.includes(state.phase as Phase)) {
      this.state.phase = state.phase as Phase;
    }
    if (state.prediction !== undefined) this.state.prediction = state.prediction as string | null;
    if (state.twistPrediction !== undefined) this.state.twistPrediction = state.twistPrediction as string | null;
    if (state.collisionType !== undefined) this.state.collisionType = state.collisionType as CollisionType;
    if (state.massRatio !== undefined) this.state.massRatio = state.massRatio as MassRatio;
    if (typeof state.isAnimating === 'boolean') this.state.isAnimating = state.isAnimating;
    if (state.animationPhase !== undefined) this.state.animationPhase = state.animationPhase as 'before' | 'collision' | 'after';
    if (typeof state.ball1Pos === 'number') this.state.ball1Pos = state.ball1Pos;
    if (typeof state.ball2Pos === 'number') this.state.ball2Pos = state.ball2Pos;
    if (typeof state.experimentsRun === 'number') this.state.experimentsRun = state.experimentsRun;
    if (typeof state.twistExperimentsRun === 'number') this.state.twistExperimentsRun = state.twistExperimentsRun;
    if (typeof state.completedApps === 'number') this.state.completedApps = state.completedApps;
    if (typeof state.showTestResults === 'boolean') this.state.showTestResults = state.showTestResults;
    if (typeof state.testScore === 'number') this.state.testScore = state.testScore;
  }
}

// Factory function
export function createTwoBallCollisionGame(sessionId: string, config?: SessionConfig): TwoBallCollisionGame {
  return new TwoBallCollisionGame(sessionId, config);
}
